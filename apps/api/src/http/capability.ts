export const reasonCodes = [
  'ROLE_FORBIDDEN',
  'INVALID_TRANSITION',
  'CLIENT_ASSIGNMENT_LOCKED',
  'REVIEW_IN_PROGRESS',
  'CLIENT_REQUIRED',
  'ROLE_CONFLICT',
  'REVISION_NOT_READY',
  'UNANSWERED_QUESTIONS',
  'ASSESSMENT_INCOMPLETE',
  'ALREADY_REVIEWED',
  'DELIVERY_PENDING',
  'DELIVERY_COMPLETED',
  'VERSION_EXHAUSTED',
  'BUSINESS_RULE_VIOLATION',
] as const;
export type ReasonCode = (typeof reasonCodes)[number];
export type Capability =
  { allowed: true } | { allowed: false; reasonCode: ReasonCode };
export function capability(reason?: ReasonCode): Capability {
  return reason ? { allowed: false, reasonCode: reason } : { allowed: true };
}
