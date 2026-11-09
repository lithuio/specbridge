import { dtoPipe } from '../authorization/rbac.dto.js';
import { CreateDeliveryDto, ReviewDeliveryDto } from './deliveries.dto.js';
import { deliveryConflict } from './deliveries.service.js';
const parse = (type: new () => object, input: object) =>
  dtoPipe(type).transform(input, { type: 'body' });
const valid = {
  artifactUrl: 'https://example.test/result',
  summary: ' Result ',
};
it('accepts HTTPS and trims plain text; requires feedback only for changes', async () => {
  expect(
    await parse(CreateDeliveryDto, { ...valid, evidenceLinks: [] }),
  ).toMatchObject({ summary: 'Result', evidenceLinks: [] });
  await expect(
    parse(ReviewDeliveryDto, { decision: 'ACCEPTED' }),
  ).resolves.toBeDefined();
  expect(
    await parse(ReviewDeliveryDto, {
      decision: 'CHANGES_REQUESTED',
      comment: ' fix\nthis ',
    }),
  ).toMatchObject({ comment: 'fix\nthis' });
});
it.each([
  { artifactUrl: 'http://example.test' },
  { artifactUrl: 'javascript:alert(1)' },
  { artifactUrl: 'https://' },
  { artifactUrl: 'https:///example.test' },
  { artifactUrl: 'https://@example.test' },
  { artifactUrl: 'https://user:password@example.test/' },
  { artifactUrl: 'https://example.test/a b' },
  { artifactUrl: 'https://example.test/\n' },
  { artifactUrl: 'https://example.test/\\foo' },
  { artifactUrl: 'https://example.test/' + 'x'.repeat(2048) },
  { artifactUrl: null },
  { summary: ' ' },
  { summary: null },
  { summary: 'a'.repeat(20001) },
  { evidenceLinks: null },
  { evidenceLinks: 'https://example.test' },
  { evidenceLinks: [42] },
  { evidenceLinks: ['http://example.test'] },
  { evidenceLinks: Array(101).fill('https://example.test') },
  { expectedVersion: 0 },
  { changeRequestVersionId: 'forged' },
  { createdBy: 'forged' },
  { status: 'ACCEPTED' },
])('rejects invalid delivery fields %j', async (value) => {
  await expect(
    parse(CreateDeliveryDto, { ...valid, ...value }),
  ).rejects.toThrow();
});
it.each([
  { decision: 'APPROVED' },
  { decision: 'CHANGES_REQUESTED' },
  { decision: 'CHANGES_REQUESTED', comment: ' ' },
  { decision: 'ACCEPTED', comment: null },
  { decision: 'ACCEPTED', comment: 'a'.repeat(10001) },
  { decision: 'ACCEPTED', expectedVersion: 0 },
  { decision: 'ACCEPTED', reviewerId: 'forged' },
  { decision: 'ACCEPTED', createdAt: 'now' },
])('rejects invalid review fields %j', async (value) => {
  await expect(parse(ReviewDeliveryDto, value)).rejects.toThrow();
});
it('maps only exact unique violations, including Drizzle causes', () => {
  for (const [constraint, code] of [
    ['delivery_reviews_delivery_unique', 'ALREADY_REVIEWED'],
    ['deliveries_one_submitted', 'DELIVERY_PENDING'],
    ['deliveries_version_number_unique', 'CONFLICT'],
  ]) {
    try {
      deliveryConflict({ cause: { code: '23505', constraint } });
    } catch (error) {
      expect(error).toMatchObject({ status: 409, response: { code } });
    }
  }
  for (const error of [
    new Error('audit failure'),
    { code: '23505', constraint: 'unrelated' },
    { code: '23514', constraint: 'delivery_reviews_delivery_unique' },
  ]) {
    expect(() => deliveryConflict(error)).toThrow(
      expect.objectContaining(error),
    );
  }
});
