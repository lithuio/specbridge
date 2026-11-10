import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import {
  AuthorizationRepository,
  type Connection,
} from '../authorization/authorization.repository.js';
import { DatabaseService } from '../database/database.service.js';
import type { DashboardDto } from './dashboard.dto.js';
export type DashboardItem = {
  key: string;
  type: string;
  bucket: 'mine' | 'waiting' | 'completed';
  projectId: string;
  projectName: string;
  projectRole: 'OWNER' | 'DEVELOPER' | 'CLIENT';
  entityType: 'project' | 'requirement' | 'change_request' | 'delivery';
  entityId: string;
  requirementId: string | null;
  changeRequestId: string | null;
  changeRequestVersionId: string | null;
  versionNo: number | null;
  deliveryNo: number | null;
  title: string;
  occurredAt: string;
  action: 'OPEN_PROJECT' | 'OPEN_REQUIREMENT' | 'OPEN_CHANGE' | 'OPEN_DELIVERY';
};
export type DashboardSummary = {
  projectCount: number;
  requirementCounts: Record<'DRAFT' | 'CLARIFYING' | 'READY', number>;
  changeCounts: Record<
    'DRAFT' | 'SUBMITTED' | 'VENDOR_APPROVED' | 'APPROVED' | 'REJECTED',
    number
  >;
  deliveryCounts: Record<
    'SUBMITTED' | 'CHANGES_REQUESTED' | 'ACCEPTED',
    number
  >;
  buckets: Record<'mine' | 'waiting' | 'completed', number>;
};
@Injectable()
export class DashboardRepository {
  constructor(
    @Inject(DatabaseService) readonly database: DatabaseService,
    @Inject(AuthorizationRepository)
    private readonly authorization: AuthorizationRepository,
  ) {}
  async read(db: Connection, actor: string, input: DashboardDto) {
    // Each fact CTE has one row per primary key; joins cannot multiply summary counts.
    const result = await db.execute<{
      summary: DashboardSummary;
      items: DashboardItem[];
      asOf: Date;
    }>(sql`
      WITH p0 AS (
        SELECT p.*, w.owner_id,
          CASE WHEN w.owner_id=${actor} THEN 'OWNER' ELSE (SELECT pm.role::text FROM project_members pm WHERE pm.project_id=p.id AND pm.user_id=${actor}) END AS role,
          (SELECT pm.user_id FROM project_members pm WHERE pm.project_id=p.id AND pm.role='CLIENT') AS client_id,
          NOT EXISTS (SELECT 1 FROM project_members pm JOIN projects cp ON cp.id=pm.project_id WHERE cp.workspace_id=w.id AND pm.user_id=w.owner_id AND pm.role='CLIENT') AS owner_valid
        FROM projects p JOIN workspaces w ON w.id=p.workspace_id
        WHERE ${this.authorization.visibleProjects(actor)}
          ${input.projectId ? sql`AND p.id=${input.projectId.toLowerCase()}` : sql``}
          ${input.workspaceId ? sql`AND p.workspace_id=${input.workspaceId.toLowerCase()}` : sql``}
      ), r0 AS (
        SELECT r.*, p0.role,
          (SELECT min(q.created_at) FROM clarifications q WHERE q.requirement_id=r.id AND q.kind='QUESTION'
            AND NOT EXISTS (SELECT 1 FROM clarifications a WHERE a.requirement_id=r.id AND a.kind='ANSWER' AND a.parent_id=q.id AND length(trim(a.body))>0)) AS unanswered_at,
          EXISTS (SELECT 1 FROM change_requests c WHERE c.requirement_id=r.id AND c.status IN ('SUBMITTED','VENDOR_APPROVED')) AS pending,
          EXISTS (SELECT 1 FROM requirement_revisions v WHERE v.id=r.latest_revision_id AND v.requirement_id=r.id
            AND v.revision_no=(SELECT max(v2.revision_no) FROM requirement_revisions v2 WHERE v2.requirement_id=r.id)
            AND length(trim(v.content))>0 AND jsonb_array_length(v.acceptance_criteria)>0
            AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(v.acceptance_criteria) x WHERE length(trim(x))=0)) AS ready_revision,
          EXISTS (SELECT 1 FROM change_requests c WHERE c.requirement_id=r.id AND c.draft_requirement_revision_id=r.latest_revision_id)
            OR EXISTS (SELECT 1 FROM change_request_versions v JOIN change_requests c ON c.id=v.change_request_id WHERE c.requirement_id=r.id AND v.requirement_revision_id=r.latest_revision_id) AS assessed
        FROM requirements r JOIN p0 ON p0.id=r.project_id
      ), c0 AS (
        SELECT c.*, r0.project_id, r0.title, r0.role, v.version_no, v.submitted_at,
          v.id IS NOT NULL AND v.change_request_id=c.id AND v.version_no=(SELECT max(v2.version_no) FROM change_request_versions v2 WHERE v2.change_request_id=c.id)
          AND EXISTS (SELECT 1 FROM requirement_revisions rv WHERE rv.id=v.requirement_revision_id AND rv.requirement_id=c.requirement_id) AS valid_version,
          va.created_at AS vendor_at, ca.created_at AS client_at, va.id AS vendor_id, ca.id AS client_approval_id,
          va.decision='APPROVED' AND va.actor_id=p0.owner_id AND p0.owner_valid AS vendor_valid,
          ca.decision='APPROVED' AND ca.actor_id=p0.client_id AND p0.client_id<>p0.owner_id
            AND NOT EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=p0.workspace_id AND wm.user_id=p0.client_id) AS client_valid
        FROM change_requests c JOIN r0 ON r0.id=c.requirement_id JOIN p0 ON p0.id=r0.project_id
        LEFT JOIN change_request_versions v ON v.id=c.active_version_id
        LEFT JOIN approvals va ON va.change_request_version_id=v.id AND va.step='VENDOR'
        LEFT JOIN approvals ca ON ca.change_request_version_id=v.id AND ca.step='CLIENT'
      ), d0 AS (
        SELECT d.*, v.change_request_id, v.version_no, c0.project_id, c0.requirement_id, c0.title, c0.role,
          c0.status='APPROVED' AND c0.valid_version AND c0.vendor_valid AND c0.client_valid AND c0.active_version_id=v.id AS approved,
          rv.decision AS review_decision, rv.created_at AS review_at,
          rv.reviewer_id=p0.client_id AS review_valid
        FROM deliveries d JOIN change_request_versions v ON v.id=d.change_request_version_id
        JOIN c0 ON c0.id=v.change_request_id JOIN p0 ON p0.id=c0.project_id
        LEFT JOIN delivery_reviews rv ON rv.delivery_id=d.id
      ), candidates AS (
        SELECT 'BIND_CLIENT'::text AS type, 'mine'::text AS bucket, p.id AS project_id, 'project'::text AS entity_type, p.id AS entity_id,
          NULL::uuid AS requirement_id, NULL::uuid AS change_id, NULL::uuid AS version_id, NULL::integer AS version_no, NULL::integer AS delivery_no,
          p.name AS title, p.created_at AS occurred_at, 'OPEN_PROJECT'::text AS action
        FROM p0 p WHERE p.role='OWNER' AND p.client_id IS NULL
          AND NOT EXISTS (SELECT 1 FROM change_request_versions v JOIN change_requests c ON c.id=v.change_request_id JOIN requirements r ON r.id=c.requirement_id WHERE r.project_id=p.id)
        UNION ALL
        SELECT CASE WHEN r.unanswered_at IS NOT NULL THEN 'CLARIFY_REQUIREMENT' WHEN r.status='READY' THEN 'PREPARE_ASSESSMENT' WHEN r.ready_revision THEN 'MARK_READY' ELSE 'PREPARE_REVISION' END,
          CASE WHEN r.unanswered_at IS NOT NULL OR r.role<>'CLIENT' THEN 'mine' ELSE 'waiting' END,
          r.project_id,'requirement',r.id,r.id,NULL,NULL,NULL,NULL,r.title,coalesce(r.unanswered_at,r.updated_at),'OPEN_REQUIREMENT'
        FROM r0 r WHERE (r.status<>'READY' AND (r.unanswered_at IS NOT NULL OR NOT r.pending)) OR (r.status='READY' AND r.ready_revision AND NOT r.assessed)
        UNION ALL
        SELECT CASE c.status WHEN 'DRAFT' THEN 'COMPLETE_ASSESSMENT' WHEN 'REJECTED' THEN 'REVISE_ASSESSMENT' WHEN 'SUBMITTED' THEN 'VENDOR_APPROVAL' ELSE 'CLIENT_APPROVAL' END,
          CASE WHEN (c.status IN ('DRAFT','REJECTED') AND c.role<>'CLIENT') OR (c.status='SUBMITTED' AND c.role='OWNER') OR (c.status='VENDOR_APPROVED' AND c.role='CLIENT') THEN 'mine' ELSE 'waiting' END,
          c.project_id,'change_request',c.id,c.requirement_id,c.id,CASE WHEN c.valid_version THEN c.active_version_id ELSE NULL END,CASE WHEN c.valid_version THEN c.version_no ELSE NULL END,NULL,c.title,
          CASE c.status WHEN 'SUBMITTED' THEN c.submitted_at WHEN 'VENDOR_APPROVED' THEN c.vendor_at ELSE c.updated_at END,'OPEN_CHANGE'
        FROM c0 c WHERE (c.status='DRAFT' AND c.role<>'CLIENT') OR (c.status='REJECTED' AND c.valid_version)
          OR (c.status='SUBMITTED' AND c.valid_version AND c.vendor_id IS NULL AND c.client_approval_id IS NULL) OR (c.status='VENDOR_APPROVED' AND c.valid_version AND c.vendor_valid AND c.client_approval_id IS NULL)
        UNION ALL
        SELECT CASE WHEN last.id IS NULL THEN 'SUBMIT_DELIVERY' ELSE 'REVISE_DELIVERY' END,
          CASE WHEN c.role='CLIENT' THEN 'waiting' ELSE 'mine' END,c.project_id,'change_request',c.id,c.requirement_id,c.id,c.active_version_id,c.version_no,NULL,c.title,
          coalesce(last.review_at,c.client_at),'OPEN_CHANGE'
        FROM c0 c LEFT JOIN LATERAL (SELECT * FROM d0 d WHERE d.change_request_version_id=c.active_version_id ORDER BY d.delivery_no DESC LIMIT 1) last ON true
        WHERE c.status='APPROVED' AND c.valid_version AND c.vendor_valid AND c.client_valid
          AND NOT EXISTS (SELECT 1 FROM d0 d WHERE d.change_request_version_id=c.active_version_id AND d.status IN ('SUBMITTED','ACCEPTED'))
          AND (last.id IS NULL OR (last.status='CHANGES_REQUESTED' AND last.review_decision='CHANGES_REQUESTED' AND last.review_valid))
        UNION ALL
        SELECT CASE WHEN d.status='ACCEPTED' THEN 'ACCEPTED_DELIVERY' ELSE 'REVIEW_DELIVERY' END,
          CASE WHEN d.status='ACCEPTED' THEN 'completed' WHEN d.role='CLIENT' THEN 'mine' ELSE 'waiting' END,
          d.project_id,'delivery',d.id,d.requirement_id,d.change_request_id,d.change_request_version_id,d.version_no,d.delivery_no,d.title,
          CASE WHEN d.status='ACCEPTED' THEN d.review_at ELSE d.created_at END,'OPEN_DELIVERY'
        FROM d0 d WHERE d.approved AND ((d.status='SUBMITTED' AND d.review_decision IS NULL) OR (d.status='ACCEPTED' AND d.review_decision='ACCEPTED' AND d.review_valid))
      ), items AS (
        SELECT c.type||':'||c.entity_id AS key,c.type,c.bucket,c.project_id AS "projectId",p.name AS "projectName",p.role AS "projectRole",
          c.entity_type AS "entityType",c.entity_id AS "entityId",c.requirement_id AS "requirementId",c.change_id AS "changeRequestId",
          c.version_id AS "changeRequestVersionId",c.version_no AS "versionNo",c.delivery_no AS "deliveryNo",c.title,c.occurred_at AS "occurredAt",c.action
        FROM candidates c JOIN p0 p ON p.id=c.project_id
      )
      SELECT transaction_timestamp() AS "asOf", jsonb_build_object(
        'projectCount',(SELECT count(*) FROM p0),
        'requirementCounts',(SELECT jsonb_build_object('DRAFT',count(*) FILTER (WHERE status='DRAFT'),'CLARIFYING',count(*) FILTER (WHERE status='CLARIFYING'),'READY',count(*) FILTER (WHERE status='READY')) FROM r0),
        'changeCounts',(SELECT jsonb_build_object('DRAFT',count(*) FILTER (WHERE status='DRAFT'),'SUBMITTED',count(*) FILTER (WHERE status='SUBMITTED'),'VENDOR_APPROVED',count(*) FILTER (WHERE status='VENDOR_APPROVED'),'APPROVED',count(*) FILTER (WHERE status='APPROVED'),'REJECTED',count(*) FILTER (WHERE status='REJECTED')) FROM c0),
        'deliveryCounts',(SELECT jsonb_build_object('SUBMITTED',count(*) FILTER (WHERE status='SUBMITTED'),'CHANGES_REQUESTED',count(*) FILTER (WHERE status='CHANGES_REQUESTED'),'ACCEPTED',count(*) FILTER (WHERE status='ACCEPTED')) FROM d0),
        'buckets',(SELECT jsonb_build_object('mine',count(*) FILTER (WHERE bucket='mine'),'waiting',count(*) FILTER (WHERE bucket='waiting'),'completed',count(*) FILTER (WHERE bucket='completed')) FROM items)
      ) AS summary,
      (SELECT coalesce(jsonb_agg(to_jsonb(page) ORDER BY page."occurredAt" DESC,page.key COLLATE "C"),'[]') FROM
        (SELECT * FROM items WHERE bucket=${input.bucket} ORDER BY "occurredAt" DESC,key COLLATE "C" LIMIT ${input.limit + 1} OFFSET ${input.offset}) page) AS items
    `);
    const row = result.rows[0];
    return {
      ...row,
      asOf: new Date(row.asOf).toISOString(),
      items: row.items.map((item) => ({
        ...item,
        occurredAt: new Date(item.occurredAt).toISOString(),
      })),
    };
  }
}
