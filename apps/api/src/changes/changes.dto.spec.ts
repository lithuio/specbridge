import { dtoPipe } from '../authorization/rbac.dto.js';
import {
  ChangeDecisionDto,
  ChangeVersionDto,
  CreateChangeDto,
  PatchChangeDto,
} from './changes.dto.js';
const parse = (type: new () => object, input: object) =>
  dtoPipe(type).transform(input, { type: 'body' });
it('accepts zero CR version, exact decimal strings, null clearing and safe negative deltas', async () => {
  expect(
    await parse(PatchChangeDto, {
      expectedVersion: 0,
      estimateHours: '999999.99',
      costDeltaMinor: -Number.MAX_SAFE_INTEGER,
      scheduleDeltaDays: -2147483648,
      currency: 'CNY',
      scopeSummary: ' text ',
      acceptanceCriteria: [' result '],
    }),
  ).toMatchObject({ scopeSummary: 'text', acceptanceCriteria: ['result'] });
  await expect(
    parse(PatchChangeDto, {
      expectedVersion: 0,
      estimateHours: null,
      acceptanceCriteria: [],
    }),
  ).resolves.toBeDefined();
});
it.each([
  { estimateHours: 1 },
  { estimateHours: '-1' },
  { estimateHours: '1e2' },
  { estimateHours: 'NaN' },
  { estimateHours: '1000000.00' },
  { estimateHours: '1.001' },
  { costDeltaMinor: Number.MAX_SAFE_INTEGER + 1 },
  { costDeltaMinor: '1' },
  { costDeltaMinor: 1.5 },
  { currency: 'ZZZ' },
  { currency: 'cny' },
  { scheduleDeltaDays: 2147483648 },
  { acceptanceCriteria: [' '] },
  { acceptanceCriteria: Array(101).fill('a') },
  { requirementRevisionId: null },
  { actorId: 'injected' },
  { scopeSummary: '' },
])('rejects invalid commercial input %j', async (value) => {
  await expect(
    parse(PatchChangeDto, { expectedVersion: 0, ...value }),
  ).rejects.toThrow();
});
it.each([-1, 2147483648, '0', 1.5, null])(
  'rejects invalid version %j',
  async (expectedVersion) => {
    await expect(
      parse(ChangeVersionDto, { expectedVersion }),
    ).rejects.toThrow();
  },
);
it('rejects forged creation and decision fields, and null comments', async () => {
  await expect(parse(CreateChangeDto, {})).resolves.toBeDefined();
  await expect(parse(CreateChangeDto, { actorId: 'x' })).rejects.toThrow();
  for (const extra of [
    { comment: null },
    { changeRequestVersionId: 'x' },
    { actorId: 'x' },
    { createdAt: 'now' },
  ])
    await expect(
      parse(ChangeDecisionDto, {
        expectedVersion: 0,
        decision: 'APPROVED',
        ...extra,
      }),
    ).rejects.toThrow();
});
