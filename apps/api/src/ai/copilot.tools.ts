import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectsService } from '../projects/projects.service.js';
import { RequirementsService } from '../requirements/requirements.service.js';
import { ChangesService } from '../changes/changes.service.js';
import { DeliveriesService } from '../deliveries/deliveries.service.js';
import { DashboardService } from '../dashboard/dashboard.service.js';
import {
  toolSchemas,
  type CopilotInput,
  type Source,
  type ToolName,
} from './copilot.contract.js';

type Evidence = Omit<Source, 'key'>;
type ReadResult = { data: unknown; sources: Evidence[] };
@Injectable()
export class CopilotTools {
  constructor(
    @Inject(ProjectsService)
    private readonly projects: Pick<ProjectsService, 'detail'>,
    @Inject(RequirementsService)
    private readonly requirements: Pick<
      RequirementsService,
      'list' | 'detail' | 'revisionDetail'
    >,
    @Inject(ChangesService)
    private readonly changes: Pick<
      ChangesService,
      'list' | 'detail' | 'versionDetail'
    >,
    @Inject(DeliveriesService)
    private readonly deliveries: Pick<DeliveriesService, 'list' | 'detail'>,
    @Inject(DashboardService)
    private readonly dashboard: Pick<DashboardService, 'read'>,
  ) {}
  private parent(actual: string, projectId: string) {
    if (actual !== projectId) throw new NotFoundException();
  }
  async validatePage(
    actor: string,
    projectId: string,
    page: CopilotInput['page'],
  ) {
    // Check the actual parent before any page IDs enter the model context.
    // This only reads; it does not dispatch a user-defined function or forward its body.
    if (page.kind === 'requirement')
      await this.read(actor, projectId, 'get_requirement', page);
    else if (page.kind === 'change')
      await this.read(actor, projectId, 'get_change_request', page);
    else if (page.kind === 'delivery')
      await this.read(actor, projectId, 'get_delivery', page);
  }
  async read(
    actor: string,
    projectId: string,
    name: ToolName,
    input: unknown,
  ): Promise<ReadResult> {
    const readAt = new Date().toISOString();
    const base = `/app/projects/${projectId}`;
    const source = (
      type: Evidence['type'],
      id: string,
      title: string,
      version: string,
      path = '',
    ): Evidence => ({
      type,
      id,
      projectId,
      title: title.slice(0, 200),
      version,
      href: `${base}${path}`,
      readAt,
    });
    // Each branch calls the existing authorized read service. No dynamic property invocation.
    switch (name) {
      case 'get_project_overview': {
        const { bucket } = toolSchemas[name].parse(input);
        const p = await this.projects.detail(actor, projectId);
        const overview = await this.dashboard.read(actor, {
          projectId,
          bucket,
          limit: 20,
          offset: 0,
        });
        return {
          data: {
            project: {
              id: p.id,
              name: p.name,
              status: p.status,
              projectRole: p.projectRole,
              baselineScope: p.baselineScope,
              clientBound: p.members.some((m) => m.role === 'CLIENT'),
              clientAssignmentLocked: p.clientAssignmentLocked,
            },
            ...overview,
          },
          sources: [source('project', p.id, p.name, '实时项目快照')],
        };
      }
      case 'list_project_requirements': {
        const page = toolSchemas[name].parse(input);
        const rows = await this.requirements.list(actor, projectId, page);
        const items = rows.slice(0, page.limit);
        for (const item of items) this.parent(item.projectId, projectId);
        return {
          data: { items, ...page, hasMore: rows.length > page.limit },
          sources: [
            source(
              'project',
              projectId,
              '项目需求列表',
              '分页读取快照',
              '/requirements',
            ),
            ...items.map((r) =>
              source(
                'requirement',
                r.id,
                r.title,
                `编辑版本 ${r.draftVersion}`,
                `/requirements/${r.id}`,
              ),
            ),
          ],
        };
      }
      case 'get_requirement': {
        // Page validation has a kind field; only the explicitly selected IDs are used.
        const args = input as { id: string; revisionId?: string };
        const r = await this.requirements.detail(actor, args.id);
        this.parent(r.projectId, projectId);
        const revision = args.revisionId
          ? await this.requirements.revisionDetail(actor, r.id, args.revisionId)
          : r.latestRevision;
        const sources = [
          source(
            'requirement',
            r.id,
            r.title,
            `编辑版本 ${r.draftVersion}`,
            `/requirements/${r.id}`,
          ),
        ];
        if (revision)
          sources.push(
            source(
              'revision',
              revision.id,
              r.title,
              `Revision ${revision.revisionNo}`,
              `/requirements/${r.id}/revisions/${revision.id}`,
            ),
          );
        return {
          data: {
            id: r.id,
            title: r.title,
            status: r.status,
            draftVersion: r.draftVersion,
            originalText: r.originalText,
            capabilities: r.capabilities,
            clarifications: r.clarifications,
            revision,
            revisionIsLatest: revision?.id === r.latestRevisionId,
          },
          sources,
        };
      }
      case 'list_change_requests': {
        const page = toolSchemas[name].parse(input);
        const rows = await this.changes.list(actor, projectId, page);
        const items = rows.slice(0, page.limit);
        for (const item of items) this.parent(item.projectId, projectId);
        return {
          data: { items, ...page, hasMore: rows.length > page.limit },
          sources: [
            source(
              'project',
              projectId,
              '项目变更列表',
              '分页读取快照',
              '/changes',
            ),
            ...items.map((c) =>
              source(
                'change_request',
                c.id,
                c.requirementTitle,
                `编辑版本 ${c.lockVersion}`,
                `/changes/${c.id}`,
              ),
            ),
          ],
        };
      }
      case 'get_change_request': {
        const args = input as { id: string; versionId?: string };
        const { data: c } = await this.changes.detail(actor, args.id, {
          limit: 1,
          offset: 0,
        });
        this.parent(c.projectId, projectId);
        if (args.versionId) {
          const v = await this.changes.versionDetail(
            actor,
            c.id,
            args.versionId,
          );
          return {
            data: v,
            sources: [
              source(
                'change_version',
                v.id,
                '冻结变更版本',
                `v${v.versionNo}`,
                `/changes/${c.id}/versions/${v.id}`,
              ),
              source(
                'revision',
                v.requirementRevision.id,
                '冻结版本引用规格',
                `Revision ${v.requirementRevision.revisionNo}`,
                `/requirements/${c.requirementId}/revisions/${v.requirementRevision.id}`,
              ),
            ],
          };
        }
        const { versions: _versions, ...projection } = c;
        const sources = [
          source(
            'change_request',
            c.id,
            '变更与审批',
            `编辑版本 ${c.lockVersion} · ${c.status}`,
            `/changes/${c.id}`,
          ),
        ];
        if (c.activeVersion)
          sources.push(
            source(
              'change_version',
              c.activeVersion.id,
              '当前关联冻结版本（阶段见审批记录）',
              `v${c.activeVersion.versionNo}`,
              `/changes/${c.id}/versions/${c.activeVersion.id}`,
            ),
          );
        // Client's draft is absent in ChangesService; never reconstruct it here.
        return { data: projection, sources };
      }
      case 'list_deliveries': {
        const page = toolSchemas[name].parse(input);
        const rows = await this.deliveries.list(actor, projectId, page);
        const items = rows.slice(0, page.limit);
        for (const item of items) this.parent(item.projectId, projectId);
        return {
          data: { items, ...page, hasMore: rows.length > page.limit },
          sources: [
            source(
              'project',
              projectId,
              '项目交付列表',
              '分页读取快照',
              '/deliveries',
            ),
            ...items.map((d) =>
              source(
                'delivery',
                d.id,
                d.requirementTitle,
                `v${d.versionNo} / D${d.deliveryNo} · ${d.status}`,
                `/deliveries/${d.id}`,
              ),
            ),
          ],
        };
      }
      case 'get_delivery': {
        const args = input as { id: string };
        const d = await this.deliveries.detail(actor, args.id);
        this.parent(d.projectId, projectId);
        return {
          data: d,
          sources: [
            source(
              'delivery',
              d.id,
              d.requirementTitle,
              `v${d.versionNo} / D${d.deliveryNo} · ${d.status}`,
              `/deliveries/${d.id}`,
            ),
            source(
              'change_version',
              d.changeRequestVersionId,
              '交付关联冻结版本',
              `v${d.versionNo}`,
              `/changes/${d.changeRequestId}/versions/${d.changeRequestVersionId}`,
            ),
          ],
        };
      }
    }
  }
}
