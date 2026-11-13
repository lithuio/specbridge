import { sql } from 'drizzle-orm';
import type {
  WorkingDraftBody,
  WorkingDraftKind,
} from '../../requirements/working-draft.contract.js';
import {
  bigint,
  char,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type PgTableExtraConfigValue,
} from 'drizzle-orm/pg-core';

const id = () => uuid('id').defaultRandom().primaryKey();
const createdAt = () =>
  timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true }).defaultNow().notNull();

export const workspaceRole = pgEnum('workspace_role', ['OWNER', 'DEVELOPER']);
export const projectRole = pgEnum('project_role', ['DEVELOPER', 'CLIENT']);
export const projectStatus = pgEnum('project_status', ['ACTIVE', 'ARCHIVED']);
export const requirementStatus = pgEnum('requirement_status', [
  'DRAFT',
  'CLARIFYING',
  'READY',
]);
export const clarificationKind = pgEnum('clarification_kind', [
  'QUESTION',
  'ANSWER',
]);
export const changeRequestStatus = pgEnum('change_request_status', [
  'DRAFT',
  'SUBMITTED',
  'VENDOR_APPROVED',
  'APPROVED',
  'REJECTED',
]);
export const approvalStep = pgEnum('approval_step', ['VENDOR', 'CLIENT']);
export const approvalDecision = pgEnum('approval_decision', [
  'APPROVED',
  'REJECTED',
]);
export const deliveryStatus = pgEnum('delivery_status', [
  'SUBMITTED',
  'CHANGES_REQUESTED',
  'ACCEPTED',
]);
export const deliveryDecision = pgEnum('delivery_decision', [
  'ACCEPTED',
  'CHANGES_REQUESTED',
]);

// Identity and organization. A lowercase expression index avoids a citext extension.
export const users = pgTable(
  'users',
  {
    id: id(),
    email: text('email').notNull(),
    displayName: text('display_name').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('users_email_lower_unique').on(sql`lower(${t.email})`)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    tokenHash: char('token_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    unique('sessions_token_hash_unique').on(t.tokenHash),
    index('sessions_user_expiry_idx').on(t.userId, t.expiresAt),
    check('sessions_token_hash_format', sql`${t.tokenHash} ~ '^[0-9a-f]{64}$'`),
  ],
);

export const workspaces = pgTable('workspaces', {
  id: id(),
  name: text('name').notNull(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  createdAt: createdAt(),
});

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    role: workspaceRole('role').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('workspace_members_user_unique').on(t.workspaceId, t.userId),
    uniqueIndex('workspace_members_one_owner')
      .on(t.workspaceId)
      .where(sql`${t.role} = 'OWNER'`),
  ],
);

export const projects = pgTable(
  'projects',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    baselineScope: text('baseline_scope').notNull(),
    status: projectStatus('status').default('ACTIVE').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index('projects_workspace_status_idx').on(t.workspaceId, t.status),
    unique('projects_workspace_id_unique').on(t.workspaceId, t.id),
    check(
      'projects_baseline_scope_nonempty',
      sql`${t.baselineScope} ~ '[^[:space:]]'`,
    ),
  ],
);

export const projectMembers = pgTable(
  'project_members',
  {
    id: id(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    role: projectRole('role').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('project_members_user_unique').on(t.projectId, t.userId),
    uniqueIndex('project_members_one_client')
      .on(t.projectId)
      .where(sql`${t.role} = 'CLIENT'`),
  ],
);

// Project-scoped bearer credentials. The raw token is never persisted.
// Ownership, current project status and request scope are rechecked by the API.
export const apiTokens = pgTable(
  'api_tokens',
  {
    id: id(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    tokenHash: char('token_hash', { length: 64 }).notNull(),
    scopes: text('scopes').array().notNull(),
    createdAt: createdAt(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [
    unique('api_tokens_token_hash_unique').on(t.tokenHash),
    index('api_tokens_project_created_idx').on(
      t.projectId,
      t.createdAt.desc(),
      t.id.desc(),
    ),
    check(
      'api_tokens_name_valid',
      sql`char_length(${t.name}) BETWEEN 1 AND 100 AND ${t.name} ~ '[^[:space:]]'`,
    ),
    check(
      'api_tokens_token_hash_format',
      sql`${t.tokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    // Equality rejects extra/duplicate scopes, NULL elements and noncanonical dimensions.
    check(
      'api_tokens_scopes_read_only',
      sql`${t.scopes} = ARRAY['approved_specs:read']::text[]`,
    ),
    // Compare elapsed duration, independent of local calendar/DST boundaries.
    check(
      'api_tokens_expiry_window',
      sql`isfinite(${t.createdAt}) AND isfinite(${t.expiresAt}) AND ${t.expiresAt} - ${t.createdAt} BETWEEN interval '24 hours' AND interval '2160 hours'`,
    ),
    check(
      'api_tokens_revocation_time_valid',
      sql`${t.revokedAt} IS NULL OR (isfinite(${t.revokedAt}) AND ${t.revokedAt} >= ${t.createdAt})`,
    ),
  ],
);

// Explicit callback types break TypeScript's inference cycle for cached version pointers.
export const requirements = pgTable(
  'requirements',
  {
    id: id(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    originalText: text('original_text').notNull(),
    status: requirementStatus('status').default('DRAFT').notNull(),
    draftVersion: integer('draft_version').default(1).notNull(),
    latestRevisionId: uuid('latest_revision_id'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t): PgTableExtraConfigValue[] => [
    index('requirements_project_status_idx').on(t.projectId, t.status),
    check('requirements_draft_version_positive', sql`${t.draftVersion} > 0`),
    foreignKey({
      name: 'requirements_latest_revision_fk',
      columns: [t.id, t.latestRevisionId],
      foreignColumns: [
        requirementRevisions.requirementId,
        requirementRevisions.id,
      ],
    }).onDelete('restrict'),
  ],
);

export const clarifications = pgTable(
  'clarifications',
  {
    id: id(),
    requirementId: uuid('requirement_id')
      .notNull()
      .references(() => requirements.id, { onDelete: 'restrict' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    parentId: uuid('parent_id'),
    kind: clarificationKind('kind').notNull(),
    body: text('body').notNull(),
    createdAt: createdAt(),
  },
  (t): PgTableExtraConfigValue[] => [
    index('clarifications_requirement_created_idx').on(
      t.requirementId,
      t.createdAt,
    ),
    unique('clarifications_requirement_id_unique').on(t.requirementId, t.id),
    foreignKey({
      name: 'clarifications_parent_fk',
      columns: [t.requirementId, t.parentId],
      foreignColumns: [t.requirementId, t.id],
    }).onDelete('restrict'),
  ],
);

export const requirementRevisions = pgTable(
  'requirement_revisions',
  {
    id: id(),
    requirementId: uuid('requirement_id')
      .notNull()
      .references(() => requirements.id, { onDelete: 'restrict' }),
    revisionNo: integer('revision_no').notNull(),
    content: text('content').notNull(),
    acceptanceCriteria: jsonb('acceptance_criteria')
      .$type<string[]>()
      .notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
  },
  (t) => [
    unique('requirement_revisions_number_unique').on(
      t.requirementId,
      t.revisionNo,
    ),
    unique('requirement_revisions_requirement_id_unique').on(
      t.requirementId,
      t.id,
    ),
    check('requirement_revisions_number_positive', sql`${t.revisionNo} > 0`),
    check(
      'requirement_revisions_criteria_array',
      sql`jsonb_typeof(${t.acceptanceCriteria}) = 'array' AND NOT jsonb_path_exists(${t.acceptanceCriteria}, '$[*] ? (@.type() != "string")')`,
    ),
  ],
);

// Pending workflow upgrade: no route uses these tables until the reviewed
// migration is approved and the persistence/API/UI stage is integrated.
// Project/workspace are derived through Requirement, never supplied by a draft.
export const requirementWorkingDrafts = pgTable(
  'requirement_working_drafts',
  {
    id: id(),
    requirementId: uuid('requirement_id')
      .notNull()
      .references(() => requirements.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    kind: text('kind').$type<WorkingDraftKind>().notNull(),
    version: integer('version').default(1).notNull(),
    baseRequirementVersion: integer('base_requirement_version').notNull(),
    body: jsonb('body').$type<WorkingDraftBody['body']>().notNull(),
    // Only the service updates this metadata; clients cannot forge adoption state.
    publication: jsonb('publication')
      .$type<{
        questions?: { itemId: string; clarificationId: string }[];
        revision?: { revisionId: string; draftVersion: number };
      }>()
      .default({})
      .notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('requirement_working_drafts_author_kind_unique').on(
      t.requirementId,
      t.userId,
      t.kind,
    ),
    index('requirement_working_drafts_author_updated_idx').on(
      t.userId,
      t.updatedAt.desc(),
      t.id.desc(),
    ),
    check(
      'requirement_working_drafts_kind_valid',
      sql`${t.kind} IN ('clarify', 'specification')`,
    ),
    check(
      'requirement_working_drafts_versions_positive',
      sql`${t.version} > 0 AND ${t.baseRequirementVersion} > 0`,
    ),
    check(
      'requirement_working_drafts_body_object',
      sql`jsonb_typeof(${t.body}) = 'object' AND octet_length(${t.body}::text) <= 102400`,
    ),
    check(
      'requirement_working_drafts_publication_object',
      sql`jsonb_typeof(${t.publication}) = 'object' AND octet_length(${t.publication}::text) <= 16384`,
    ),
    check(
      'requirement_working_drafts_times_valid',
      sql`isfinite(${t.createdAt}) AND isfinite(${t.updatedAt}) AND ${t.updatedAt} >= ${t.createdAt}`,
    ),
  ],
);

// Minimal, body-free receipts survive deleting a personal draft. No draft FK:
// deleting work in progress must not erase the evidence of a committed publish.
export const requirementPublishReceipts = pgTable(
  'requirement_publish_receipts',
  {
    id: uuid('id').primaryKey(),
    requirementId: uuid('requirement_id')
      .notNull()
      .references(() => requirements.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    draftId: uuid('draft_id').notNull(),
    draftVersion: integer('draft_version').notNull(),
    kind: text('kind').$type<WorkingDraftKind>().notNull(),
    requestHash: char('request_hash', { length: 64 }).notNull(),
    result: jsonb('result')
      .$type<{
        requirementVersion: number;
        workingDraftVersion: number;
        clarificationIds?: string[];
        revisionId?: string;
      }>()
      .notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('requirement_publish_receipts_draft_version_unique').on(
      t.draftId,
      t.draftVersion,
    ),
    index('requirement_publish_receipts_author_requirement_idx').on(
      t.userId,
      t.requirementId,
      t.createdAt.desc(),
    ),
    check(
      'requirement_publish_receipts_kind_valid',
      sql`${t.kind} IN ('clarify', 'specification')`,
    ),
    check(
      'requirement_publish_receipts_version_positive',
      sql`${t.draftVersion} > 0`,
    ),
    check(
      'requirement_publish_receipts_hash_format',
      sql`${t.requestHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'requirement_publish_receipts_result_object',
      sql`jsonb_typeof(${t.result}) = 'object' AND octet_length(${t.result}::text) <= 8192`,
    ),
    check(
      'requirement_publish_receipts_time_finite',
      sql`isfinite(${t.createdAt})`,
    ),
  ],
);

export const changeRequests = pgTable(
  'change_requests',
  {
    id: id(),
    requirementId: uuid('requirement_id')
      .notNull()
      .references(() => requirements.id, { onDelete: 'restrict' }),
    status: changeRequestStatus('status').default('DRAFT').notNull(),
    lockVersion: integer('lock_version').default(0).notNull(),
    activeVersionId: uuid('active_version_id'),
    draftRequirementRevisionId: uuid('draft_requirement_revision_id')
      .notNull()
      .references(() => requirementRevisions.id, { onDelete: 'restrict' }),
    draftScopeSummary: text('draft_scope_summary'),
    draftEstimateHours: numeric('draft_estimate_hours', {
      precision: 8,
      scale: 2,
    }),
    draftCostDeltaMinor: bigint('draft_cost_delta_minor', { mode: 'bigint' }),
    draftCurrency: char('draft_currency', { length: 3 }),
    draftScheduleDeltaDays: integer('draft_schedule_delta_days'),
    draftAcceptanceCriteria: jsonb('draft_acceptance_criteria').$type<
      string[]
    >(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t): PgTableExtraConfigValue[] => [
    index('change_requests_requirement_status_idx').on(
      t.requirementId,
      t.status,
    ),
    check('change_requests_lock_nonnegative', sql`${t.lockVersion} >= 0`),
    check(
      'change_requests_hours_valid',
      sql`${t.draftEstimateHours} >= 0 AND ${t.draftEstimateHours} <> 'NaN'::numeric`,
    ),
    check(
      'change_requests_currency_format',
      sql`${t.draftCurrency} ~ '^[A-Z]{3}$'`,
    ),
    check(
      'change_requests_criteria_array',
      sql`jsonb_typeof(${t.draftAcceptanceCriteria}) = 'array' AND NOT jsonb_path_exists(${t.draftAcceptanceCriteria}, '$[*] ? (@.type() != "string")')`,
    ),
    foreignKey({
      name: 'change_requests_active_version_fk',
      columns: [t.id, t.activeVersionId],
      foreignColumns: [
        changeRequestVersions.changeRequestId,
        changeRequestVersions.id,
      ],
    }).onDelete('restrict'),
  ],
);

export const changeRequestVersions = pgTable(
  'change_request_versions',
  {
    id: id(),
    changeRequestId: uuid('change_request_id')
      .notNull()
      .references(() => changeRequests.id, { onDelete: 'restrict' }),
    versionNo: integer('version_no').notNull(),
    requirementRevisionId: uuid('requirement_revision_id')
      .notNull()
      .references(() => requirementRevisions.id, { onDelete: 'restrict' }),
    scopeSnapshot: text('scope_snapshot').notNull(),
    estimateHours: numeric('estimate_hours', {
      precision: 8,
      scale: 2,
    }).notNull(),
    costDeltaMinor: bigint('cost_delta_minor', { mode: 'bigint' }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),
    scheduleDeltaDays: integer('schedule_delta_days').notNull(),
    acceptanceCriteria: jsonb('acceptance_criteria')
      .$type<string[]>()
      .notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    submittedBy: uuid('submitted_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
  },
  (t) => [
    unique('change_request_versions_number_unique').on(
      t.changeRequestId,
      t.versionNo,
    ),
    unique('change_request_versions_request_id_unique').on(
      t.changeRequestId,
      t.id,
    ),
    check('change_request_versions_number_positive', sql`${t.versionNo} > 0`),
    check(
      'change_request_versions_hours_valid',
      sql`${t.estimateHours} >= 0 AND ${t.estimateHours} <> 'NaN'::numeric`,
    ),
    check(
      'change_request_versions_currency_format',
      sql`${t.currency} ~ '^[A-Z]{3}$'`,
    ),
    check(
      'change_request_versions_scope_nonempty',
      sql`${t.scopeSnapshot} ~ '[^[:space:]]'`,
    ),
    check(
      'change_request_versions_criteria_array',
      sql`CASE WHEN jsonb_typeof(${t.acceptanceCriteria}) = 'array' THEN jsonb_array_length(${t.acceptanceCriteria}) > 0 AND NOT jsonb_path_exists(${t.acceptanceCriteria}, '$[*] ? (@.type() != "string")') ELSE false END`,
    ),
  ],
);

export const approvals = pgTable(
  'approvals',
  {
    id: id(),
    changeRequestVersionId: uuid('change_request_version_id')
      .notNull()
      .references(() => changeRequestVersions.id, { onDelete: 'restrict' }),
    step: approvalStep('step').notNull(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    decision: approvalDecision('decision').notNull(),
    comment: text('comment'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('approvals_version_step_unique').on(
      t.changeRequestVersionId,
      t.step,
    ),
  ],
);

export const deliveries = pgTable(
  'deliveries',
  {
    id: id(),
    changeRequestVersionId: uuid('change_request_version_id')
      .notNull()
      .references(() => changeRequestVersions.id, { onDelete: 'restrict' }),
    deliveryNo: integer('delivery_no').notNull(),
    artifactUrl: text('artifact_url').notNull(),
    summary: text('summary').notNull(),
    evidenceLinks: jsonb('evidence_links')
      .$type<string[]>()
      .default([])
      .notNull(),
    status: deliveryStatus('status').default('SUBMITTED').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
  },
  (t) => [
    unique('deliveries_version_number_unique').on(
      t.changeRequestVersionId,
      t.deliveryNo,
    ),
    uniqueIndex('deliveries_one_submitted')
      .on(t.changeRequestVersionId)
      .where(sql`${t.status} = 'SUBMITTED'`),
    check('deliveries_number_positive', sql`${t.deliveryNo} > 0`),
    check(
      'deliveries_artifact_https',
      sql`${t.artifactUrl} ~ '^https://[^/[:space:]]+' AND ${t.artifactUrl} !~ '[[:space:]]'`,
    ),
    check(
      'deliveries_evidence_https_array',
      sql`jsonb_typeof(${t.evidenceLinks}) = 'array' AND NOT jsonb_path_exists(${t.evidenceLinks}, '$[*] ? (@.type() != "string" || !(@ like_regex "^https://[^/[:space:]]+[^[:space:]]*$"))')`,
    ),
  ],
);

export const deliveryReviews = pgTable(
  'delivery_reviews',
  {
    id: id(),
    deliveryId: uuid('delivery_id')
      .notNull()
      .references(() => deliveries.id, { onDelete: 'restrict' }),
    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    decision: deliveryDecision('decision').notNull(),
    comment: text('comment'),
    createdAt: createdAt(),
  },
  (t) => [
    unique('delivery_reviews_delivery_unique').on(t.deliveryId),
    check(
      'delivery_reviews_changes_comment',
      sql`${t.decision} <> 'CHANGES_REQUESTED' OR (${t.comment} IS NOT NULL AND ${t.comment} ~ '[^[:space:]]')`,
    ),
  ],
);

export const auditEvents = pgTable(
  'audit_events',
  {
    id: id(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'restrict' }),
    projectId: uuid('project_id'),
    actorId: uuid('actor_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    eventType: text('event_type').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    entityVersion: integer('entity_version'),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index('audit_events_project_created_idx').on(
      t.projectId,
      t.createdAt.desc(),
    ),
    foreignKey({
      name: 'audit_events_workspace_project_fk',
      columns: [t.workspaceId, t.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
    }).onDelete('restrict'),
    check(
      'audit_events_metadata_object',
      sql`jsonb_typeof(${t.metadata}) = 'object'`,
    ),
  ],
);

export const projectDocuments = pgTable(
  'project_documents',
  {
    id: id(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    status: text('status')
      .$type<'ACTIVE' | 'INACTIVE'>()
      .default('ACTIVE')
      .notNull(),
    version: integer('version').default(1).notNull(),
    currentVersionId: uuid('current_version_id'),
    // Sharing is explicit and version-specific. Uploading a replacement never shares it.
    sharedVersionId: uuid('shared_version_id'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t): PgTableExtraConfigValue[] => [
    unique('project_documents_project_id_unique').on(t.projectId, t.id),
    index('project_documents_project_updated_idx').on(
      t.projectId,
      t.status,
      t.updatedAt.desc(),
      t.id.desc(),
    ),
    check(
      'project_documents_title_valid',
      sql`char_length(${t.title}) BETWEEN 1 AND 200 AND ${t.title} ~ '[^[:space:]]'`,
    ),
    check(
      'project_documents_status_valid',
      sql`${t.status} IN ('ACTIVE', 'INACTIVE')`,
    ),
    check('project_documents_version_positive', sql`${t.version} > 0`),
    check(
      'project_documents_times_valid',
      sql`isfinite(${t.createdAt}) AND isfinite(${t.updatedAt}) AND ${t.updatedAt} >= ${t.createdAt}`,
    ),
    foreignKey({
      name: 'project_documents_current_version_fk',
      columns: [t.projectId, t.id, t.currentVersionId],
      foreignColumns: [
        projectDocumentVersions.projectId,
        projectDocumentVersions.documentId,
        projectDocumentVersions.id,
      ],
    }).onDelete('restrict'),
    foreignKey({
      name: 'project_documents_shared_version_fk',
      columns: [t.projectId, t.id, t.sharedVersionId],
      foreignColumns: [
        projectDocumentVersions.projectId,
        projectDocumentVersions.documentId,
        projectDocumentVersions.id,
      ],
    }).onDelete('restrict'),
  ],
);

export const projectDocumentVersions = pgTable(
  'project_document_versions',
  {
    id: id(),
    projectId: uuid('project_id').notNull(),
    documentId: uuid('document_id').notNull(),
    versionNo: integer('version_no').notNull(),
    originalName: text('original_name').notNull(),
    mediaType: text('media_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    blobId: uuid('blob_id').notNull(),
    sha256: char('sha256', { length: 64 }).notNull(),
    status: text('status')
      .$type<'PROCESSING' | 'READY' | 'FAILED'>()
      .default('PROCESSING')
      .notNull(),
    parserVersion: text('parser_version'),
    extractedChars: integer('extracted_chars').default(0).notNull(),
    errorCode: text('error_code').$type<
      | 'UNSUPPORTED_FILE'
      | 'INVALID_FILE'
      | 'NO_TEXT'
      | 'PARSE_LIMIT'
      | 'PARSE_TIMEOUT'
      | 'PARSE_FAILED'
      | 'INTERRUPTED'
    >(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t): PgTableExtraConfigValue[] => [
    unique('project_document_versions_number_unique').on(
      t.documentId,
      t.versionNo,
    ),
    unique('project_document_versions_parent_id_unique').on(
      t.projectId,
      t.documentId,
      t.id,
    ),
    unique('project_document_versions_blob_unique').on(t.blobId),
    index('project_document_versions_processing_idx').on(
      t.projectId,
      t.status,
      t.createdAt,
      t.id,
    ),
    foreignKey({
      name: 'project_document_versions_project_document_fk',
      columns: [t.projectId, t.documentId],
      foreignColumns: [projectDocuments.projectId, projectDocuments.id],
    }).onDelete('restrict'),
    check('project_document_versions_number_positive', sql`${t.versionNo} > 0`),
    check(
      'project_document_versions_name_valid',
      sql`char_length(${t.originalName}) BETWEEN 1 AND 255 AND ${t.originalName} ~ '[^[:space:]]' AND ${t.originalName} !~ '[[:cntrl:]]'`,
    ),
    check(
      'project_document_versions_media_valid',
      sql`${t.mediaType} IN ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown', 'text/plain')`,
    ),
    check(
      'project_document_versions_size_valid',
      sql`${t.sizeBytes} BETWEEN 1 AND 10485760`,
    ),
    check(
      'project_document_versions_sha256_valid',
      sql`${t.sha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'project_document_versions_status_valid',
      sql`${t.status} IN ('PROCESSING', 'READY', 'FAILED')`,
    ),
    check(
      'project_document_versions_parser_valid',
      sql`${t.parserVersion} IS NULL OR char_length(${t.parserVersion}) BETWEEN 1 AND 80`,
    ),
    check(
      'project_document_versions_chars_valid',
      sql`${t.extractedChars} BETWEEN 0 AND 500000`,
    ),
    check(
      'project_document_versions_error_valid',
      sql`${t.errorCode} IS NULL OR ${t.errorCode} IN ('UNSUPPORTED_FILE', 'INVALID_FILE', 'NO_TEXT', 'PARSE_LIMIT', 'PARSE_TIMEOUT', 'PARSE_FAILED', 'INTERRUPTED')`,
    ),
    check(
      'project_document_versions_result_valid',
      sql`(${t.status} = 'PROCESSING' AND ${t.completedAt} IS NULL AND ${t.errorCode} IS NULL AND ${t.extractedChars} = 0) OR (${t.status} = 'READY' AND ${t.completedAt} IS NOT NULL AND ${t.parserVersion} IS NOT NULL AND ${t.errorCode} IS NULL AND ${t.extractedChars} > 0) OR (${t.status} = 'FAILED' AND ${t.completedAt} IS NOT NULL AND ${t.errorCode} IS NOT NULL AND ${t.extractedChars} = 0)`,
    ),
    check(
      'project_document_versions_times_valid',
      sql`isfinite(${t.createdAt}) AND (${t.completedAt} IS NULL OR (isfinite(${t.completedAt}) AND ${t.completedAt} >= ${t.createdAt}))`,
    ),
  ],
);

export const projectDocumentChunks = pgTable(
  'project_document_chunks',
  {
    id: id(),
    projectId: uuid('project_id').notNull(),
    documentId: uuid('document_id').notNull(),
    versionId: uuid('version_id').notNull(),
    ordinal: integer('ordinal').notNull(),
    locatorKind: text('locator_kind').$type<'page' | 'paragraph'>().notNull(),
    locatorStart: integer('locator_start').notNull(),
    locatorEnd: integer('locator_end').notNull(),
    content: text('content').notNull(),
  },
  (t) => [
    unique('project_document_chunks_ordinal_unique').on(t.versionId, t.ordinal),
    index('project_document_chunks_project_version_idx').on(
      t.projectId,
      t.versionId,
      t.ordinal,
    ),
    foreignKey({
      name: 'project_document_chunks_version_fk',
      columns: [t.projectId, t.documentId, t.versionId],
      foreignColumns: [
        projectDocumentVersions.projectId,
        projectDocumentVersions.documentId,
        projectDocumentVersions.id,
      ],
    }).onDelete('restrict'),
    check(
      'project_document_chunks_ordinal_valid',
      sql`${t.ordinal} BETWEEN 1 AND 1000`,
    ),
    check(
      'project_document_chunks_locator_valid',
      sql`${t.locatorKind} IN ('page', 'paragraph') AND ${t.locatorStart} >= 1 AND ${t.locatorEnd} >= ${t.locatorStart} AND ${t.locatorEnd} <= CASE WHEN ${t.locatorKind} = 'page' THEN 500 ELSE 500000 END`,
    ),
    check(
      'project_document_chunks_text_valid',
      sql`char_length(${t.content}) BETWEEN 1 AND 2000 AND ${t.content} ~ '[^[:space:]]'`,
    ),
  ],
);

// Project and Workspace derive from Requirement; no client-supplied tenant column.
export const copilotProposals = pgTable(
  'copilot_proposals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    requirementId: uuid('requirement_id')
      .notNull()
      .references(() => requirements.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    kind: text('kind')
      .$type<
        | 'publish_questions'
        | 'create_revision'
        | 'create_change_draft'
        | 'update_change_draft'
      >()
      .notNull(),
    changeRequestId: uuid('change_request_id').references(
      () => changeRequests.id,
      { onDelete: 'restrict' },
    ),
    version: integer('version').default(1).notNull(),
    baseRequirementVersion: integer('base_requirement_version').notNull(),
    baseChangeVersion: integer('base_change_version'),
    status: text('status')
      .$type<'DRAFT' | 'EXECUTED'>()
      .default('DRAFT')
      .notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    sources: jsonb('sources').$type<Record<string, unknown>[]>().notNull(),
    operationId: uuid('operation_id'),
    requestHash: char('request_hash', { length: 64 }),
    result: jsonb('result').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    executedAt: timestamp('executed_at', { withTimezone: true }),
  },
  (t) => [
    unique('copilot_proposals_operation_unique').on(t.operationId),
    index('copilot_proposals_author_requirement_idx').on(
      t.userId,
      t.requirementId,
      t.createdAt.desc(),
      t.id.desc(),
    ),
    index('copilot_proposals_expiry_idx').on(t.status, t.expiresAt),
    check(
      'copilot_proposals_kind_valid',
      sql`${t.kind} IN ('publish_questions','create_revision','create_change_draft','update_change_draft')`,
    ),
    check(
      'copilot_proposals_versions_valid',
      sql`${t.version}>0 AND ${t.baseRequirementVersion}>0 AND (${t.baseChangeVersion} IS NULL OR ${t.baseChangeVersion}>=0)`,
    ),
    check(
      'copilot_proposals_target_valid',
      sql`(${t.kind}='update_change_draft' AND ${t.changeRequestId} IS NOT NULL AND ${t.baseChangeVersion} IS NOT NULL) OR (${t.kind}<>'update_change_draft' AND ${t.changeRequestId} IS NULL AND ${t.baseChangeVersion} IS NULL)`,
    ),
    check(
      'copilot_proposals_payload_valid',
      sql`jsonb_typeof(${t.payload})='object' AND octet_length(${t.payload}::text)<=98304`,
    ),
    check(
      'copilot_proposals_sources_valid',
      sql`jsonb_typeof(${t.sources})='array' AND octet_length(${t.sources}::text)<=16384`,
    ),
    check(
      'copilot_proposals_hash_valid',
      sql`${t.requestHash} IS NULL OR ${t.requestHash}~'^[0-9a-f]{64}$'`,
    ),
    check(
      'copilot_proposals_result_valid',
      sql`${t.result} IS NULL OR (jsonb_typeof(${t.result})='object' AND octet_length(${t.result}::text)<=8192)`,
    ),
    check(
      'copilot_proposals_state_valid',
      sql`(${t.status}='DRAFT' AND ${t.operationId} IS NULL AND ${t.requestHash} IS NULL AND ${t.result} IS NULL AND ${t.executedAt} IS NULL) OR (${t.status}='EXECUTED' AND ${t.operationId} IS NOT NULL AND ${t.requestHash} IS NOT NULL AND ${t.result} IS NOT NULL AND ${t.executedAt} IS NOT NULL)`,
    ),
    check(
      'copilot_proposals_time_valid',
      sql`isfinite(${t.createdAt}) AND isfinite(${t.updatedAt}) AND isfinite(${t.expiresAt}) AND ${t.updatedAt}>=${t.createdAt} AND ${t.expiresAt}>${t.createdAt} AND ${t.expiresAt}<=${t.createdAt}+interval '24 hours' AND (${t.executedAt} IS NULL OR (isfinite(${t.executedAt}) AND ${t.executedAt}>=${t.createdAt} AND ${t.executedAt}<=${t.expiresAt} AND ${t.updatedAt}>=${t.executedAt}))`,
    ),
  ],
);
