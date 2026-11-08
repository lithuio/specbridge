import { sql } from 'drizzle-orm';
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
    latestRevisionId: uuid('latest_revision_id'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t): PgTableExtraConfigValue[] => [
    index('requirements_project_status_idx').on(t.projectId, t.status),
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
