import { HttpException, PayloadTooLargeException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  parsePublishWorkingDraft,
  parseSaveWorkingDraft,
} from './working-draft.contract.js';

const item = () => ({
  id: randomUUID(),
  body: '刷新后是否保留筛选？',
  reason: '原文未确认',
});
const clarify = () => ({
  kind: 'clarify',
  expectedDraftVersion: 0,
  draftId: null,
  baseRequirementVersion: 1,
  body: { questions: [item()], assumptions: [], risks: [] },
});
const specification = () => ({
  kind: 'specification',
  expectedDraftVersion: 0,
  draftId: null,
  baseRequirementVersion: 1,
  body: {
    content: '',
    acceptanceCriteria: [],
    openQuestions: [],
    assumptions: [],
    risks: [],
  },
});

it('accepts independent incomplete personal drafts without requiring a formal Revision', () => {
  expect(parseSaveWorkingDraft(clarify()).kind).toBe('clarify');
  expect(parseSaveWorkingDraft(specification()).body).toMatchObject({
    content: '',
  });
  expect(
    parseSaveWorkingDraft({
      ...clarify(),
      draftId: randomUUID(),
      expectedDraftVersion: 3,
    }).expectedDraftVersion,
  ).toBe(3);
});
it.each(['userId', 'projectId', 'publication', 'approved', 'revisionId'])(
  'rejects forged server field %s',
  (field) => {
    expect(() =>
      parseSaveWorkingDraft({ ...clarify(), [field]: randomUUID() }),
    ).toThrow(HttpException);
  },
);
it('rejects kind/body confusion, duplicate item identities and invalid versions', () => {
  const draft = clarify();
  for (const value of [
    { ...draft, kind: 'specification' },
    { ...draft, expectedDraftVersion: -1 },
    { ...draft, expectedDraftVersion: 1, draftId: null },
    { ...draft, expectedDraftVersion: 0, draftId: randomUUID() },
    { ...draft, expectedDraftVersion: '1' },
    { ...draft, baseRequirementVersion: 0 },
    {
      ...draft,
      body: {
        ...draft.body,
        questions: [draft.body.questions[0], draft.body.questions[0]],
      },
    },
    {
      ...draft,
      body: { ...draft.body, questions: [{ ...item(), body: ' ' }] },
    },
    {
      ...draft,
      body: { ...draft.body, questions: [{ ...item(), published: true }] },
    },
  ])
    expect(() => parseSaveWorkingDraft(value)).toThrow(HttpException);
});
it('bounds combined multibyte text rather than only each field', () => {
  const value = {
    ...specification(),
    body: {
      ...specification().body,
      content: '文'.repeat(20000),
      acceptanceCriteria: Array(100).fill('字'.repeat(1000)),
    },
  };
  expect(() => parseSaveWorkingDraft(value)).toThrow(PayloadTooLargeException);
});
it('requires explicit publish intent, fresh-version tokens and selected stable question IDs', () => {
  const request = {
    kind: 'clarify',
    operationId: randomUUID(),
    expectedVersion: 4,
    expectedDraftVersion: 2,
    draftId: randomUUID(),
    questionIds: [randomUUID()],
  };
  expect(parsePublishWorkingDraft(request)).toEqual(request);
  expect(
    parsePublishWorkingDraft({
      kind: 'specification',
      operationId: randomUUID(),
      expectedVersion: 4,
      expectedDraftVersion: 2,
      draftId: randomUUID(),
    }).kind,
  ).toBe('specification');
  for (const value of [
    { ...request, expectedDraftVersion: 0 },
    { ...request, questionIds: [] },
    {
      ...request,
      questionIds: [request.questionIds[0], request.questionIds[0]],
    },
    { ...request, body: 'unreviewed replacement' },
    { ...request, kind: 'approve' },
    { ...request, expectedVersion: null },
    { ...request, operationId: 'not-a-uuid' },
  ])
    expect(() => parsePublishWorkingDraft(value)).toThrow(HttpException);
});
