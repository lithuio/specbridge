// Unknown events and unknown metadata keys fail closed for every role.
export const auditPolicy = {
  'project.created': [false, []],
  'project.developer_added': [false, ['role']],
  'project.client_bound': [false, []],
  'project.client_replaced': [false, []],
  'requirement.created': [true, []],
  'requirement.draft_updated': [true, ['fields']],
  'clarification.question_added': [
    true,
    ['requirementId', 'parentId', 'fromStatus', 'toStatus'],
  ],
  'clarification.answer_added': [
    true,
    ['requirementId', 'parentId', 'fromStatus', 'toStatus'],
  ],
  'requirement.revision_created': [
    true,
    ['requirementId', 'draftVersion', 'fromStatus', 'toStatus'],
  ],
  'requirement.marked_ready': [true, ['revisionId', 'fromStatus', 'toStatus']],
  'change_request.created': [false, ['requirementId', 'revisionId', 'fields']],
  'change_request.draft_updated': [
    false,
    ['requirementId', 'revisionId', 'fields'],
  ],
  'change_request.reopened': [
    false,
    ['fromStatus', 'toStatus', 'previousVersionId'],
  ],
  'change_request.submitted': [
    true,
    [
      'fromStatus',
      'toStatus',
      'changeRequestVersionId',
      'versionNo',
      'revisionId',
    ],
  ],
  'change_request.vendor_decided': [
    true,
    [
      'fromStatus',
      'toStatus',
      'changeRequestVersionId',
      'versionNo',
      'approvalId',
      'step',
      'decision',
    ],
  ],
  'change_request.client_decided': [
    true,
    [
      'fromStatus',
      'toStatus',
      'changeRequestVersionId',
      'versionNo',
      'approvalId',
      'step',
      'decision',
    ],
  ],
  'delivery.submitted': [
    true,
    [
      'changeRequestId',
      'changeRequestVersionId',
      'versionNo',
      'fromStatus',
      'toStatus',
      'reviewId',
      'decision',
    ],
  ],
  'delivery.reviewed': [
    true,
    [
      'changeRequestId',
      'changeRequestVersionId',
      'versionNo',
      'fromStatus',
      'toStatus',
      'reviewId',
      'decision',
    ],
  ],
} as const;
export type AuditEventType = keyof typeof auditPolicy;
export const auditEventTypes = Object.keys(auditPolicy) as AuditEventType[];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function safeMetadata(
  event: AuditEventType,
  raw: Record<string, unknown>,
) {
  const result: Record<string, string | number | string[]> = {};
  for (const key of auditPolicy[event][1]) {
    const value = raw[key];
    if (key.endsWith('Id')) {
      if (typeof value === 'string' && uuid.test(value))
        result[key] = value.toLowerCase();
    } else if (key === 'versionNo' || key === 'draftVersion') {
      if (
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value > 0 &&
        value <= 2147483647
      )
        result[key] = value;
    } else if (key === 'fields') {
      const allowed = event.startsWith('requirement.')
        ? ['title', 'originalText']
        : [
            'requirementRevisionId',
            'scopeSummary',
            'estimateHours',
            'costDeltaMinor',
            'currency',
            'scheduleDeltaDays',
            'acceptanceCriteria',
          ];
      if (
        Array.isArray(value) &&
        value.every((v) => typeof v === 'string' && allowed.includes(v))
      )
        result[key] = value;
    } else {
      const choices =
        key === 'role'
          ? ['DEVELOPER']
          : key === 'step'
            ? ['VENDOR', 'CLIENT']
            : key === 'decision'
              ? event.startsWith('delivery.')
                ? ['ACCEPTED', 'CHANGES_REQUESTED']
                : ['APPROVED', 'REJECTED']
              : event.startsWith('delivery.')
                ? ['SUBMITTED', 'CHANGES_REQUESTED', 'ACCEPTED']
                : event.startsWith('change_request.')
                  ? [
                      'DRAFT',
                      'SUBMITTED',
                      'VENDOR_APPROVED',
                      'APPROVED',
                      'REJECTED',
                    ]
                  : ['DRAFT', 'CLARIFYING', 'READY'];
      if (typeof value === 'string' && choices.includes(value))
        result[key] = value;
    }
  }
  return result;
}
