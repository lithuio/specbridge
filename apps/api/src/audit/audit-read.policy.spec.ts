import { safeMetadata } from './audit-read.policy.js';
it('projects only typed event-specific metadata, never nested payloads or secrets', () => {
  expect(
    safeMetadata('change_request.submitted', {
      versionNo: -1,
      revisionId: 'not-an-id',
      fromStatus: 'READY',
      toStatus: 'SUBMITTED',
      clientId: 'private',
      comment: 'private',
      fields: ['scopeSummary'],
    }),
  ).toEqual({ toStatus: 'SUBMITTED' });
  expect(
    safeMetadata('requirement.draft_updated', {
      fields: ['title', { body: 'private' }],
    }),
  ).toEqual({});
  expect(
    safeMetadata('requirement.draft_updated', {
      fields: ['title', 'originalText'],
      costDeltaMinor: 100,
    }),
  ).toEqual({ fields: ['title', 'originalText'] });
  expect(
    safeMetadata('delivery.reviewed', {
      decision: 'APPROVED',
      versionNo: 1,
      fromStatus: 'SUBMITTED',
      toStatus: 'ACCEPTED',
      artifactUrl: 'private',
    }),
  ).toEqual({ versionNo: 1, fromStatus: 'SUBMITTED', toStatus: 'ACCEPTED' });
});
