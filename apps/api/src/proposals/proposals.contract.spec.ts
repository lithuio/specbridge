import { randomUUID } from 'node:crypto';
import {
  parseProposal,
  prepareProposal,
  editProposal,
  executeProposal,
} from './proposals.contract.js';
import { parseTool } from '../ai/copilot.contract.js';
it('rejects unknown write commands, tenant injection and source/target ambiguity', () => {
  for (const extra of [
    { kind: 'approve' },
    { projectId: randomUUID() },
    { source: 'current' },
    { source: 'working_draft' },
    { url: '/approve' },
    { changeRequestId: randomUUID() },
  ])
    expect(() =>
      parseProposal(prepareProposal, {
        kind: 'publish_questions',
        source: 'generate',
        expectedVersion: 1,
        ...extra,
      }),
    ).toThrow();
  for (const tool of [
    'execute_proposal',
    'prepare_proposal',
    'submit',
    'mark_ready',
    'sql',
  ])
    expect(() => parseTool(tool, '{}')).toThrow();
});
it('binds confirmation to operation and versions, never accepts a replacement payload', () => {
  const body = {
    expectedProposalVersion: 1,
    expectedVersion: 1,
    operationId: randomUUID(),
  };
  expect(parseProposal(executeProposal, body)).toEqual(body);
  for (const extra of [
    { payload: {} },
    { userId: randomUUID() },
    { expectedVersion: '1' },
    { operationId: '' },
    { expectedProposalVersion: 0 },
  ])
    expect(() =>
      parseProposal(executeProposal, { ...body, ...extra }),
    ).toThrow();
});
it('bounds combined manual text and refuses unsafe commercial numbers', () => {
  const p = {
    requirementRevisionId: randomUUID(),
    scopeSummary: 'Scope',
    estimateHours: null,
    costDeltaMinor: null,
    currency: null,
    scheduleDeltaDays: null,
    acceptanceCriteria: ['Test'],
  };
  for (const extra of [
    { costDeltaMinor: Number.MAX_SAFE_INTEGER + 1 },
    { estimateHours: '1e10' },
    { currency: 'NOT_CURRENCY' },
    { scheduleDeltaDays: 1.5 },
  ])
    expect(() =>
      parseProposal(editProposal, {
        expectedProposalVersion: 1,
        content: { kind: 'create_change_draft', payload: { ...p, ...extra } },
      }),
    ).toThrow();
  expect(() =>
    parseProposal(editProposal, {
      expectedProposalVersion: 1,
      content: {
        kind: 'create_revision',
        payload: {
          content: 'x'.repeat(20000),
          acceptanceCriteria: Array.from({ length: 100 }, () =>
            'x'.repeat(1000),
          ),
          assumptions: [],
          risks: [],
          openQuestions: [],
        },
      },
    }),
  ).toThrow();
});
