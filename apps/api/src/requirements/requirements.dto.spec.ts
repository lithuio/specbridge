import { dtoPipe } from '../authorization/rbac.dto.js';
import {
  CreateRequirementDto,
  PatchRequirementDto,
  RevisionDto,
  VersionDto,
} from './requirements.dto.js';
it('normalizes requirement text without losing internal newlines', async () => {
  expect(
    await dtoPipe(CreateRequirementDto).transform(
      { title: ' Title ', originalText: ' A\n B ' },
      { type: 'body' },
    ),
  ).toMatchObject({ title: 'Title', originalText: 'A\n B' });
  expect(
    await dtoPipe(RevisionDto).transform(
      { expectedVersion: 1, content: 'Text', acceptanceCriteria: [' A '] },
      { type: 'body' },
    ),
  ).toMatchObject({ acceptanceCriteria: ['A'] });
});
it('rejects null/blank/oversized text and injected identity/state', async () => {
  for (const title of [null, '', '  ', 42, 'x'.repeat(201)])
    await expect(
      dtoPipe(PatchRequirementDto).transform(
        { expectedVersion: 1, title },
        { type: 'body' },
      ),
    ).rejects.toMatchObject({ status: 400 });
  for (const extra of [
    { createdBy: 'actor' },
    { status: 'READY' },
    { latestRevisionId: 'revision' },
  ])
    await expect(
      dtoPipe(CreateRequirementDto).transform(
        { title: 'T', originalText: 'O', ...extra },
        { type: 'body' },
      ),
    ).rejects.toMatchObject({ status: 400 });
});
it('requires a positive int32 version and bounded nonblank string criteria', async () => {
  for (const expectedVersion of [undefined, null, 0, -1, 1.5, '1', 2147483648])
    await expect(
      dtoPipe(VersionDto).transform({ expectedVersion }, { type: 'body' }),
    ).rejects.toMatchObject({ status: 400 });
  for (const acceptanceCriteria of [
    null,
    {},
    [3],
    [' '],
    ['x'.repeat(1001)],
    Array(101).fill('x'),
  ])
    await expect(
      dtoPipe(RevisionDto).transform(
        { expectedVersion: 1, content: 'Text', acceptanceCriteria },
        { type: 'body' },
      ),
    ).rejects.toMatchObject({ status: 400 });
  await expect(
    dtoPipe(RevisionDto).transform(
      { expectedVersion: 1, content: 'Text', acceptanceCriteria: [] },
      { type: 'body' },
    ),
  ).resolves.toBeDefined();
});
