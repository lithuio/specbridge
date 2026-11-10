import type { SchemaObject } from '@nestjs/swagger';
import { reasonCodes } from '../http/capability.js';
import { auditEventTypes } from '../audit/audit-read.policy.js';
export type Schema = SchemaObject;
export const str: Schema = { type: 'string' },
  uuid: Schema = { type: 'string', format: 'uuid' },
  date: Schema = {
    type: 'string',
    format: 'date-time',
    pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$',
  },
  bool: Schema = { type: 'boolean' };
export const int = (minimum = 0, maximum = 2147483647): Schema => ({
  type: 'integer',
  minimum,
  maximum,
});
export const en = (...values: string[]): Schema => ({
  type: 'string',
  enum: values,
});
export const arr = (items: Schema): Schema => ({ type: 'array', items });
export const obj = (
  properties: Record<string, Schema>,
  optional: string[] = [],
): Schema => ({
  type: 'object',
  additionalProperties: false,
  properties,
  required: Object.keys(properties).filter((k) => !optional.includes(k)),
});
export const nullable = (schema: Schema): Schema => ({
  ...schema,
  nullable: true,
});
export const text = (maxLength: number): Schema => ({
  type: 'string',
  minLength: 1,
  maxLength,
});
const amount = int(-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
  hours: Schema = {
    type: 'string',
    pattern: '^(0|[1-9][0-9]{0,5})\\.[0-9]{2}$',
  };
const criteria = { ...arr(text(1000)), maxItems: 100 };
export const requirementStatus = en('DRAFT', 'CLARIFYING', 'READY'),
  changeStatus = en(
    'DRAFT',
    'SUBMITTED',
    'VENDOR_APPROVED',
    'APPROVED',
    'REJECTED',
  ),
  deliveryStatus = en('SUBMITTED', 'CHANGES_REQUESTED', 'ACCEPTED');
const role = en('OWNER', 'DEVELOPER', 'CLIENT');
const capability: Schema = {
  oneOf: [
    obj({ allowed: { type: 'boolean', enum: [true] } }),
    obj({
      allowed: { type: 'boolean', enum: [false] },
      reasonCode: en(...reasonCodes),
    }),
  ],
};
export const caps = (...keys: string[]) =>
  obj(Object.fromEntries(keys.map((k) => [k, capability])));
const person = { userId: uuid, displayName: str };
export const projectFields = {
  id: uuid,
  workspaceId: uuid,
  name: str,
  status: en('ACTIVE', 'ARCHIVED'),
  createdAt: date,
  projectRole: role,
};
const member = obj({ ...person, role });
const revision = {
  id: uuid,
  requirementId: uuid,
  revisionNo: int(1),
  content: str,
  acceptanceCriteria: criteria,
  createdBy: uuid,
  createdAt: date,
};
const clarification = {
  id: uuid,
  requirementId: uuid,
  authorId: uuid,
  kind: en('QUESTION', 'ANSWER'),
  body: str,
  parentId: nullable(uuid),
  createdAt: date,
};
export const requirement = {
  id: uuid,
  projectId: uuid,
  createdBy: uuid,
  title: str,
  originalText: str,
  status: requirementStatus,
  draftVersion: int(1),
  latestRevisionId: nullable(uuid),
  createdAt: date,
  updatedAt: date,
};
const aggregate = {
  requirementId: uuid,
  draftVersion: int(1),
  status: requirementStatus,
  latestRevisionId: nullable(uuid),
};
const approval = obj({
  id: uuid,
  changeRequestVersionId: uuid,
  step: en('VENDOR', 'CLIENT'),
  actorId: uuid,
  decision: en('APPROVED', 'REJECTED'),
  comment: nullable(str),
  createdAt: date,
});
const frozen = {
  id: uuid,
  changeRequestId: uuid,
  versionNo: int(1),
  requirementRevisionId: uuid,
  scopeSnapshot: str,
  estimateHours: hours,
  costDeltaMinor: amount,
  currency: { type: 'string', pattern: '^[A-Z]{3}$' } as Schema,
  scheduleDeltaDays: int(-2147483648),
  acceptanceCriteria: criteria,
  submittedAt: date,
  submittedBy: uuid,
  requirementRevision: obj(revision),
  approvals: arr(approval),
};
export const change = {
  id: uuid,
  requirementId: uuid,
  projectId: uuid,
  status: changeStatus,
  lockVersion: int(),
  activeVersionId: nullable(uuid),
  createdAt: date,
  updatedAt: date,
};
export const draftFields = {
  requirementRevisionId: uuid,
  scopeSummary: nullable(text(20000)),
  estimateHours: nullable(hours),
  costDeltaMinor: nullable(amount),
  currency: nullable(frozen.currency),
  scheduleDeltaDays: nullable(int(-2147483648)),
  acceptanceCriteria: nullable(criteria),
};
const review = obj({
  id: uuid,
  deliveryId: uuid,
  reviewerId: uuid,
  decision: en('ACCEPTED', 'CHANGES_REQUESTED'),
  comment: nullable(str),
  createdAt: date,
});
const delivery = {
  id: uuid,
  changeRequestId: uuid,
  changeRequestVersionId: uuid,
  versionNo: int(1),
  deliveryNo: int(1),
  artifactUrl: str,
  summary: str,
  evidenceLinks: arr(str),
  status: deliveryStatus,
  createdBy: uuid,
  createdAt: date,
  review: nullable(review),
};
const detail = {
  ...change,
  activeVersion: nullable(obj(frozen)),
  versions: arr(obj(frozen)),
  capabilities: caps(
    'editDraft',
    'submit',
    'reopen',
    'vendorDecision',
    'clientDecision',
    'createDelivery',
  ),
};
const target: Schema = {
  oneOf: [
    obj({ kind: en('project'), projectId: uuid }),
    obj(
      {
        kind: en('requirement'),
        projectId: uuid,
        requirementId: uuid,
        clarificationId: uuid,
      },
      ['clarificationId'],
    ),
    obj({
      kind: en('revision'),
      projectId: uuid,
      requirementId: uuid,
      revisionId: uuid,
    }),
    obj(
      {
        kind: en('change'),
        projectId: uuid,
        changeRequestId: uuid,
        versionId: uuid,
      },
      ['versionId'],
    ),
    obj({ kind: en('delivery'), projectId: uuid, deliveryId: uuid }),
    { type: 'object', nullable: true, enum: [null] },
  ],
};
const metadataFields = {
  role: en('DEVELOPER'),
  requirementId: uuid,
  parentId: uuid,
  revisionId: uuid,
  previousVersionId: uuid,
  changeRequestId: uuid,
  changeRequestVersionId: uuid,
  approvalId: uuid,
  reviewId: uuid,
  draftVersion: int(1),
  versionNo: int(1),
  fromStatus: en(
    'DRAFT',
    'CLARIFYING',
    'READY',
    'SUBMITTED',
    'VENDOR_APPROVED',
    'APPROVED',
    'REJECTED',
    'ACCEPTED',
    'CHANGES_REQUESTED',
  ),
  toStatus: en(
    'DRAFT',
    'CLARIFYING',
    'READY',
    'SUBMITTED',
    'VENDOR_APPROVED',
    'APPROVED',
    'REJECTED',
    'ACCEPTED',
    'CHANGES_REQUESTED',
  ),
  step: en('VENDOR', 'CLIENT'),
  decision: en('APPROVED', 'REJECTED', 'ACCEPTED', 'CHANGES_REQUESTED'),
  fields: arr(
    en(
      'title',
      'originalText',
      'requirementRevisionId',
      'scopeSummary',
      'estimateHours',
      'costDeltaMinor',
      'currency',
      'scheduleDeltaDays',
      'acceptanceCriteria',
    ),
  ),
};
const counts = (...keys: string[]) =>
  obj(
    Object.fromEntries(keys.map((k) => [k, int(0, Number.MAX_SAFE_INTEGER)])),
  );
const dashboardItem = obj({
  key: str,
  type: en(
    'BIND_CLIENT',
    'CLARIFY_REQUIREMENT',
    'PREPARE_REVISION',
    'MARK_READY',
    'PREPARE_ASSESSMENT',
    'COMPLETE_ASSESSMENT',
    'REVISE_ASSESSMENT',
    'VENDOR_APPROVAL',
    'CLIENT_APPROVAL',
    'SUBMIT_DELIVERY',
    'REVISE_DELIVERY',
    'REVIEW_DELIVERY',
    'ACCEPTED_DELIVERY',
  ),
  bucket: en('mine', 'waiting', 'completed'),
  projectId: uuid,
  projectName: str,
  projectRole: role,
  entityType: en('project', 'requirement', 'change_request', 'delivery'),
  entityId: uuid,
  requirementId: nullable(uuid),
  changeRequestId: nullable(uuid),
  changeRequestVersionId: nullable(uuid),
  versionNo: nullable(int(1)),
  deliveryNo: nullable(int(1)),
  title: str,
  occurredAt: date,
  action: en(
    'OPEN_PROJECT',
    'OPEN_REQUIREMENT',
    'OPEN_CHANGE',
    'OPEN_DELIVERY',
  ),
});
export const schemas = {
  User: obj({ id: uuid, email: str, displayName: str, createdAt: date }),
  Workspace: obj({
    id: uuid,
    name: str,
    createdAt: date,
    workspaceRole: en('OWNER', 'DEVELOPER'),
  }),
  WorkspaceMember: obj({
    id: uuid,
    ...person,
    email: str,
    role: en('OWNER', 'DEVELOPER'),
    createdAt: date,
  }),
  Project: obj(projectFields),
  ProjectCreated: obj({ ...projectFields, baselineScope: str }),
  Person: member,
  ProjectDetail: obj({
    ...projectFields,
    baselineScope: str,
    owner: member,
    members: arr(member),
    clientAssignmentLocked: bool,
    capabilities: caps('createRequirement', 'assignDeveloper', 'bindClient'),
  }),
  Requirement: obj(requirement),
  RequirementListItem: obj(
    Object.fromEntries(
      Object.entries({
        ...requirement,
        latestRevisionNo: nullable(int(1)),
      }).filter(([k]) => k !== 'originalText'),
    ),
  ),
  RequirementDetail: obj({
    ...requirement,
    clarifications: arr(obj(clarification)),
    latestRevision: nullable(obj(revision)),
    capabilities: caps(
      'editDraft',
      'askQuestion',
      'answerQuestion',
      'createRevision',
      'markReady',
      'createChangeRequest',
    ),
  }),
  Revision: obj(revision),
  RevisionDetail: obj({ ...revision, projectId: uuid }),
  RevisionCreated: obj({ ...revision, ...aggregate }),
  ClarificationCreated: obj({ ...clarification, ...aggregate }),
  ChangeSummary: obj(change),
  ChangeListItem: obj({
    ...change,
    requirementTitle: str,
    activeVersionNo: nullable(int(1)),
  }),
  ChangeDraft: obj({ ...change, draft: obj(draftFields) }),
  ChangeDetail: {
    oneOf: [obj({ ...detail, draft: obj(draftFields) }), obj(detail)],
  } as Schema,
  FrozenVersion: obj(frozen),
  VersionDetail: obj({ ...frozen, projectId: uuid, requirementId: uuid }),
  SubmittedChange: obj({
    changeRequestId: uuid,
    changeRequestVersionId: uuid,
    versionNo: int(1),
    status: en('SUBMITTED'),
    lockVersion: int(),
  }),
  ChangeDecision: obj(
    {
      changeRequestId: uuid,
      changeRequestVersionId: uuid,
      status: changeStatus,
      lockVersion: int(),
      approval,
      approvedVersionId: uuid,
    },
    ['approvedVersionId'],
  ),
  Delivery: obj(delivery),
  DeliveryListItem: obj({
    ...delivery,
    projectId: uuid,
    requirementId: uuid,
    requirementTitle: str,
  }),
  DeliveryDetail: obj({
    ...delivery,
    projectId: uuid,
    requirementId: uuid,
    requirementTitle: str,
    capabilities: caps('review'),
  }),
  AuditEvent: obj({
    id: uuid,
    projectId: uuid,
    actor: nullable(obj(person)),
    eventType: en(...auditEventTypes),
    entityType: en(
      'project',
      'requirement',
      'clarification',
      'requirement_revision',
      'change_request',
      'delivery',
    ),
    entityId: uuid,
    entityVersion: nullable(int()),
    createdAt: date,
    metadata: obj(metadataFields, Object.keys(metadataFields)),
    target,
  }),
  Dashboard: obj({
    scope: obj({ workspaceId: nullable(uuid), projectId: nullable(uuid) }),
    summary: obj({
      projectCount: int(0, Number.MAX_SAFE_INTEGER),
      requirementCounts: counts('DRAFT', 'CLARIFYING', 'READY'),
      changeCounts: counts(
        'DRAFT',
        'SUBMITTED',
        'VENDOR_APPROVED',
        'APPROVED',
        'REJECTED',
      ),
      deliveryCounts: counts('SUBMITTED', 'CHANGES_REQUESTED', 'ACCEPTED'),
      buckets: counts('mine', 'waiting', 'completed'),
    }),
    items: arr(dashboardItem),
  }),
  Error: obj({
    error: obj({
      code: str,
      message: str,
      requestId: uuid,
      details: { type: 'array', maxItems: 0, items: {} },
    }),
  }),
};
export function envelope(data: Schema, paged = false, dashboard = false) {
  return obj({
    data,
    meta: obj({
      requestId: uuid,
      ...(paged
        ? {
            limit: int(1, 100),
            offset: int(0, Number.MAX_SAFE_INTEGER),
            hasMore: bool,
          }
        : {}),
      ...(dashboard ? { asOf: date } : {}),
    }),
  });
}
