import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Pool } from 'pg';
import { AppModule } from '../../src/app.module.js';
import { DeliveriesService } from '../../src/deliveries/deliveries.service.js';
import { DeliveriesRepository } from '../../src/deliveries/deliveries.repository.js';
import { ChangesService } from '../../src/changes/changes.service.js';
import { RequirementsService } from '../../src/requirements/requirements.service.js';
import { AuthorizationRepository } from '../../src/authorization/authorization.repository.js';
import { AuditWriter } from '../../src/audit/audit.module.js';
import { openTestDatabase } from './helpers.js';
import { signal, waitForLock } from '../rbac/helpers.js';
import { setup as fixture, payload, snapshot } from '../deliveries/helpers.js';
let pool: Pool, module: TestingModule, service: DeliveriesService;
const page = { limit: 20, offset: 0 };
beforeAll(async () => {
  pool = await openTestDatabase();
  vi.stubEnv('DATABASE_URL', process.env.TEST_DATABASE_URL!);
  vi.stubEnv('OBSERVE_APP_KEY', '');
  vi.stubEnv('OBSERVE_APP_SECRET', '');
  module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  service = module.get(DeliveriesService);
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await module?.close();
  await pool?.end();
  vi.unstubAllEnvs();
});
const setup = (approved = true) => fixture(pool, module, approved);
async function race<T, U>(first: () => Promise<T>, second: () => Promise<U>) {
  const entered = signal(),
    release = signal(),
    audit = module.get(AuditWriter),
    original = audit.write.bind(audit);
  vi.spyOn(audit, 'write').mockImplementationOnce(async (...args) => {
    await original(...args);
    entered.resolve();
    await release.promise;
  });
  const a = first();
  await entered.promise;
  const b = second().then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  );
  try {
    await waitForLock(pool);
  } finally {
    release.resolve();
  }
  return { first: await a, second: await b };
}
it('preserves rejected attempts, increments numbers, accepts terminally and returns complete paginated history', async () => {
  const f = await setup();
  const parents = await snapshot(pool, f.project.id);
  expect((await service.history(f.client.id, f.cr.id, page)).data).toEqual([]);
  for (let number = 1; number <= 3; number++) {
    const row = await service.create(
      number === 1 ? f.owner.id : f.developer.id,
      f.cr.id,
      { ...payload, summary: `Attempt ${number}` },
    );
    expect(row).toMatchObject({
      deliveryNo: number,
      changeRequestVersionId: f.version.changeRequestVersionId,
      review: null,
    });
    await expect(
      service.create(f.owner.id, f.cr.id, payload),
    ).rejects.toMatchObject({ response: { code: 'DELIVERY_PENDING' } });
    const reviewed = await service.review(f.client.id, row.id, {
      decision: number === 3 ? 'ACCEPTED' : 'CHANGES_REQUESTED',
      comment: `Feedback ${number}`,
    });
    expect(reviewed.status).toBe(reviewed.review.decision);
    await expect(
      service.review(f.client.id, row.id, { decision: 'ACCEPTED' }),
    ).rejects.toMatchObject({ response: { code: 'ALREADY_REVIEWED' } });
  }
  await expect(
    service.create(f.owner.id, f.cr.id, payload),
  ).rejects.toMatchObject({ response: { code: 'DELIVERY_COMPLETED' } });
  const history = await service.history(f.client.id, f.cr.id, page);
  expect(history.data.map((d) => d.deliveryNo)).toEqual([3, 2, 1]);
  expect(history.data.map((d) => d.status)).toEqual([
    'ACCEPTED',
    'CHANGES_REQUESTED',
    'CHANGES_REQUESTED',
  ]);
  expect(history.data[2]).toMatchObject({
    summary: 'Attempt 1',
    review: { comment: 'Feedback 1' },
  });
  for (let offset = 0; offset < 3; offset++) {
    const result = await service.history(f.owner.id, f.cr.id, {
      limit: 1,
      offset,
    });
    expect(result.data).toEqual([history.data[offset]]);
    expect(result.hasMore).toBe(offset < 2);
  }
  const after = await snapshot(pool, f.project.id);
  for (const key of ['requirements', 'changes', 'versions', 'approvals'])
    expect(after[key]).toEqual(parents[key]);
  const events = after.audit.filter(
    (e: { entity_type: string }) => e.entity_type === 'delivery',
  );
  expect(events).toHaveLength(6);
  expect(JSON.stringify(events)).not.toMatch(/Feedback|Attempt|https:/);
  for (const command of [
    'UPDATE delivery_reviews SET comment=comment',
    'DELETE FROM delivery_reviews',
  ])
    await expect(
      pool.query(`${command} WHERE delivery_id=$1`, [history.data[2].id]),
    ).rejects.toMatchObject({ code: '23514' });
});
it.each(['DRAFT', 'SUBMITTED', 'VENDOR_APPROVED', 'REJECTED'])(
  'refuses delivery in %s without side effects',
  async (status) => {
    const f = await setup(false),
      changes = module.get(ChangesService);
    if (status === 'VENDOR_APPROVED')
      await changes.decision(f.owner.id, f.cr.id, 'VENDOR', {
        expectedVersion: 2,
        decision: 'APPROVED',
      });
    if (status === 'REJECTED' || status === 'DRAFT') {
      await changes.decision(f.owner.id, f.cr.id, 'VENDOR', {
        expectedVersion: 2,
        decision: 'REJECTED',
      });
      if (status === 'DRAFT')
        await changes.reopen(f.owner.id, f.cr.id, { expectedVersion: 3 });
    }
    const before = await snapshot(pool, f.project.id);
    await expect(
      service.create(f.owner.id, f.cr.id, payload),
    ).rejects.toMatchObject({ response: { code: 'INVALID_TRANSITION' } });
    expect(await snapshot(pool, f.project.id)).toEqual(before);
  },
);
it('checks project roles and cross-project identities on every operation', async () => {
  const f = await setup(),
    other = await setup();
  const row = await service.create(f.owner.id, f.cr.id, payload);
  const before = await snapshot(pool, f.project.id);
  await expect(
    service.create(f.client.id, f.cr.id, payload),
  ).rejects.toMatchObject({ status: 403 });
  for (const user of [f.owner, f.developer])
    await expect(
      service.review(user.id, row.id, { decision: 'ACCEPTED' }),
    ).rejects.toMatchObject({ status: 403 });
  for (const user of [other.owner, other.developer, other.client, f.outsider]) {
    await expect(
      service.create(user.id, f.cr.id, payload),
    ).rejects.toMatchObject({ status: 404 });
    await expect(service.history(user.id, f.cr.id, page)).rejects.toMatchObject(
      { status: 404 },
    );
    await expect(
      service.review(user.id, row.id, { decision: 'ACCEPTED' }),
    ).rejects.toMatchObject({ status: 404 });
  }
  expect(await snapshot(pool, f.project.id)).toEqual(before);
});
it('rolls back create and both review decisions, including an audit insert that then fails', async () => {
  const f = await setup(),
    audit = module.get(AuditWriter),
    original = audit.write.bind(audit);
  async function fails(action: () => Promise<unknown>) {
    const before = await snapshot(pool, f.project.id);
    vi.spyOn(audit, 'write').mockImplementationOnce(async (...args) => {
      await original(...args);
      throw new Error('Injected audit failure');
    });
    await expect(action()).rejects.toThrow('Injected audit failure');
    expect(await snapshot(pool, f.project.id)).toEqual(before);
  }
  await fails(() => service.create(f.owner.id, f.cr.id, payload));
  const row = await service.create(f.owner.id, f.cr.id, payload);
  expect(row.deliveryNo).toBe(1);
  for (const decision of ['ACCEPTED', 'CHANGES_REQUESTED'] as const)
    await fails(() =>
      service.review(f.client.id, row.id, { decision, comment: 'Feedback' }),
    );
  await service.review(f.client.id, row.id, {
    decision: 'CHANGES_REQUESTED',
    comment: 'Fix',
  });
  expect((await service.create(f.owner.id, f.cr.id, payload)).deliveryNo).toBe(
    2,
  );
});
it('serializes concurrent creations and conflicting reviews with one successful transaction', async () => {
  const f = await setup();
  const result = await race(
    () => service.create(f.owner.id, f.cr.id, payload),
    () => service.create(f.developer.id, f.cr.id, payload),
  );
  expect(result.second).toMatchObject({
    error: { response: { code: 'DELIVERY_PENDING' } },
  });
  const reviewed = await race(
    () =>
      service.review(f.client.id, result.first.id, { decision: 'ACCEPTED' }),
    () =>
      service.review(f.client.id, result.first.id, {
        decision: 'CHANGES_REQUESTED',
        comment: 'Race',
      }),
  );
  expect(reviewed.second).toMatchObject({
    error: { response: { code: 'ALREADY_REVIEWED' } },
  });
  const after = await snapshot(pool, f.project.id);
  expect(after.deliveries).toHaveLength(1);
  expect(after.reviews).toHaveLength(1);
  expect(
    after.audit.filter(
      (a: { entity_type: string }) => a.entity_type === 'delivery',
    ),
  ).toHaveLength(2);
});
it.each(['ACCEPTED', 'CHANGES_REQUESTED'] as const)(
  'coordinates %s review before concurrent creation',
  async (decision) => {
    const f = await setup(),
      row = await service.create(f.owner.id, f.cr.id, payload);
    const result = await race(
      () =>
        service.review(f.client.id, row.id, { decision, comment: 'Feedback' }),
      () => service.create(f.owner.id, f.cr.id, payload),
    );
    expect(result.second).toMatchObject(
      decision === 'ACCEPTED'
        ? { error: { response: { code: 'DELIVERY_COMPLETED' } } }
        : { value: { deliveryNo: 2, status: 'SUBMITTED' } },
    );
  },
);
it('refuses create-first while pending, then lets the waiting review proceed', async () => {
  const f = await setup(),
    row = await service.create(f.owner.id, f.cr.id, payload);
  const repo = module.get(DeliveriesRepository),
    original = repo.blocking.bind(repo),
    entered = signal(),
    release = signal();
  vi.spyOn(repo, 'blocking').mockImplementationOnce(async (...args) => {
    const value = await original(...args);
    entered.resolve();
    await release.promise;
    return value;
  });
  const creating = service
    .create(f.owner.id, f.cr.id, payload)
    .catch((error: unknown) => error);
  await entered.promise;
  const reviewing = service.review(f.client.id, row.id, {
    decision: 'ACCEPTED',
  });
  try {
    await waitForLock(pool);
  } finally {
    release.resolve();
  }
  expect(await creating).toMatchObject({
    response: { code: 'DELIVERY_PENDING' },
  });
  expect((await reviewing).status).toBe('ACCEPTED');
});
it('lets a waiting writer proceed after the lock holder audit rolls back', async () => {
  const f = await setup(),
    audit = module.get(AuditWriter),
    original = audit.write.bind(audit),
    entered = signal(),
    release = signal();
  vi.spyOn(audit, 'write').mockImplementationOnce(async (...args) => {
    await original(...args);
    entered.resolve();
    await release.promise;
    throw new Error('audit rollback');
  });
  const a = service
    .create(f.owner.id, f.cr.id, payload)
    .catch((error: unknown) => error);
  await entered.promise;
  const b = service.create(f.developer.id, f.cr.id, payload);
  try {
    await waitForLock(pool);
  } finally {
    release.resolve();
  }
  expect(await a).toBeInstanceOf(Error);
  expect((await b).deliveryNo).toBe(1);
  expect((await snapshot(pool, f.project.id)).deliveries).toHaveLength(1);
});
it.each(['revision-first', 'delivery-first'])(
  'preserves the approved historical revision during %s',
  async (order) => {
    const f = await setup(),
      requirements = module.get(RequirementsService);
    const revision = () =>
      requirements.revision(f.owner.id, f.requirement.id, {
        expectedVersion: 3,
        content: 'New scope',
        acceptanceCriteria: ['New result'],
      });
    const delivery = () => service.create(f.owner.id, f.cr.id, payload);
    const result =
      order === 'revision-first'
        ? await race(revision, delivery)
        : await race(delivery, revision);
    expect(result.second).toHaveProperty('value');
    const row = (await service.history(f.client.id, f.cr.id, page)).data[0];
    expect(row.changeRequestVersionId).toBe(f.version.changeRequestVersionId);
    await service.review(f.client.id, row.id, { decision: 'ACCEPTED' });
  },
);
it('waits for actual Client approval before creating delivery', async () => {
  const f = await setup(false),
    changes = module.get(ChangesService);
  await changes.decision(f.owner.id, f.cr.id, 'VENDOR', {
    expectedVersion: 2,
    decision: 'APPROVED',
  });
  const result = await race(
    () =>
      changes.decision(f.client.id, f.cr.id, 'CLIENT', {
        expectedVersion: 3,
        decision: 'APPROVED',
      }),
    () => service.create(f.owner.id, f.cr.id, payload),
  );
  expect(result.second).toMatchObject({ value: { deliveryNo: 1 } });
});
it('guards stored approval evidence, active pointers and number exhaustion', async () => {
  const missing = await setup(false);
  await pool.query("UPDATE change_requests SET status='APPROVED' WHERE id=$1", [
    missing.cr.id,
  ]);
  await expect(
    service.create(missing.owner.id, missing.cr.id, payload),
  ).rejects.toMatchObject({ status: 422 });
  const f = await setup();
  await pool.query(
    'UPDATE change_requests SET active_version_id=NULL WHERE id=$1',
    [f.cr.id],
  );
  await expect(
    service.create(f.owner.id, f.cr.id, payload),
  ).rejects.toMatchObject({ status: 422 });
  await pool.query(
    'UPDATE change_requests SET active_version_id=$1 WHERE id=$2',
    [f.version.changeRequestVersionId, f.cr.id],
  );
  // Explicit abnormal storage fixture, not a legitimate domain history.
  await pool.query(
    "INSERT INTO deliveries(change_request_version_id,delivery_no,artifact_url,summary,created_by,status) VALUES($1,2147483647,'https://example.test','boundary',$2,'CHANGES_REQUESTED')",
    [f.version.changeRequestVersionId, f.owner.id],
  );
  const before = await snapshot(pool, f.project.id);
  await expect(
    service.create(f.owner.id, f.cr.id, payload),
  ).rejects.toMatchObject({ status: 422 });
  expect(await snapshot(pool, f.project.id)).toEqual(before);
});
it('rolls back Review insertion if the conditional update matches no row', async () => {
  const f = await setup(),
    row = await service.create(f.owner.id, f.cr.id, payload),
    repo = module.get(DeliveriesRepository),
    original = repo.advance.bind(repo);
  vi.spyOn(repo, 'advance').mockImplementationOnce((tx, current, status) =>
    original(tx, { ...current, id: randomUUID() }, status),
  );
  const before = await snapshot(pool, f.project.id);
  await expect(
    service.review(f.client.id, row.id, { decision: 'ACCEPTED' }),
  ).rejects.toMatchObject({ status: 409 });
  expect(await snapshot(pool, f.project.id)).toEqual(before);
});
it('normalizes UUIDs and revalidates parent links after taking locks', async () => {
  const f = await setup(),
    row = await service.create(
      f.owner.id.toUpperCase(),
      f.cr.id.toUpperCase(),
      payload,
    );
  expect(
    (
      await service.history(
        f.client.id.toUpperCase(),
        f.cr.id.toUpperCase(),
        page,
      )
    ).data[0].id,
  ).toBe(row.id);
  const repo = module.get(DeliveriesRepository),
    original = repo.get.bind(repo);
  vi.spyOn(repo, 'get').mockImplementation(async (...args) => {
    const value = await original(...args);
    return args[2] ? { ...value, changeRequestVersionId: randomUUID() } : value;
  });
  const before = await snapshot(pool, f.project.id);
  await expect(
    service.review(f.client.id, row.id, { decision: 'ACCEPTED' }),
  ).rejects.toMatchObject({ status: 404 });
  expect(await snapshot(pool, f.project.id)).toEqual(before);
});
it('rechecks Client policy after acquiring the Delivery lock', async () => {
  const f = await setup(),
    row = await service.create(f.owner.id, f.cr.id, payload),
    auth = module.get(AuthorizationRepository),
    original = auth.project.bind(auth);
  let calls = 0;
  vi.spyOn(auth, 'project').mockImplementation(async (...args) => {
    const value = await original(...args);
    calls++;
    return calls === 3
      ? { ...value, projectRole: 'DEVELOPER' as const }
      : value;
  });
  const before = await snapshot(pool, f.project.id);
  await expect(
    service.review(f.client.id, row.id, { decision: 'ACCEPTED' }),
  ).rejects.toMatchObject({ status: 403 });
  expect(await snapshot(pool, f.project.id)).toEqual(before);
});
it('maps a real Review unique violation only after rolling back the entire transaction', async () => {
  const f = await setup(),
    row = await service.create(f.owner.id, f.cr.id, payload);
  const repo = module.get(DeliveriesRepository),
    original = repo.decide.bind(repo);
  vi.spyOn(repo, 'decide').mockImplementationOnce(async (tx, values) => {
    await original(tx, values);
    return original(tx, values); // Actual PostgreSQL 23505 through Drizzle cause.
  });
  const before = await snapshot(pool, f.project.id);
  await expect(
    service.review(f.client.id, row.id, { decision: 'ACCEPTED' }),
  ).rejects.toMatchObject({ response: { code: 'ALREADY_REVIEWED' } });
  expect(await snapshot(pool, f.project.id)).toEqual(before);
  expect(
    (await service.review(f.client.id, row.id, { decision: 'ACCEPTED' }))
      .status,
  ).toBe('ACCEPTED');
});
it('rejects identical concurrent reviews without duplicate audit or review', async () => {
  const f = await setup(),
    row = await service.create(f.owner.id, f.cr.id, payload);
  const review = () =>
    service.review(f.client.id, row.id, {
      decision: 'CHANGES_REQUESTED',
      comment: 'Fix',
    });
  expect((await race(review, review)).second).toMatchObject({
    error: { response: { code: 'ALREADY_REVIEWED' } },
  });
  expect((await snapshot(pool, f.project.id)).reviews).toHaveLength(1);
});
it('keeps Delivery and Review projection in the same read snapshot while review commits', async () => {
  const f = await setup(),
    row = await service.create(f.owner.id, f.cr.id, payload);
  const auth = module.get(AuthorizationRepository),
    original = auth.project.bind(auth),
    entered = signal(),
    release = signal();
  vi.spyOn(auth, 'project').mockImplementationOnce(async (...args) => {
    const value = await original(...args);
    entered.resolve();
    await release.promise;
    return value;
  });
  const reading = service.history(f.client.id, f.cr.id, page);
  await entered.promise;
  try {
    await service.review(f.client.id, row.id, { decision: 'ACCEPTED' });
  } finally {
    release.resolve();
  }
  expect((await reading).data[0]).toMatchObject({
    status: 'SUBMITTED',
    review: null,
  });
  expect(
    (await service.history(f.client.id, f.cr.id, page)).data[0],
  ).toMatchObject({ status: 'ACCEPTED', review: { decision: 'ACCEPTED' } });
});
it('rejects forged approved evidence and a non-latest active version without side effects', async () => {
  const f = await setup(false);
  await pool.query("UPDATE change_requests SET status='APPROVED' WHERE id=$1", [
    f.cr.id,
  ]);
  await pool.query(
    "INSERT INTO approvals(change_request_version_id,step,actor_id,decision) VALUES($1,'VENDOR',$2,'APPROVED'),($1,'CLIENT',$3,'APPROVED')",
    [f.version.changeRequestVersionId, f.developer.id, f.client.id],
  );
  const before = await snapshot(pool, f.project.id);
  await expect(
    service.create(f.owner.id, f.cr.id, payload),
  ).rejects.toMatchObject({ status: 422 });
  expect(await snapshot(pool, f.project.id)).toEqual(before);
  const g = await setup();
  await pool.query(
    `INSERT INTO change_request_versions(change_request_id,version_no,requirement_revision_id,scope_snapshot,estimate_hours,cost_delta_minor,currency,schedule_delta_days,acceptance_criteria,submitted_by)
    SELECT change_request_id,2,requirement_revision_id,scope_snapshot,estimate_hours,cost_delta_minor,currency,schedule_delta_days,acceptance_criteria,submitted_by FROM change_request_versions WHERE id=$1`,
    [g.version.changeRequestVersionId],
  );
  const prior = await snapshot(pool, g.project.id);
  await expect(
    service.create(g.owner.id, g.cr.id, payload),
  ).rejects.toMatchObject({ status: 422 });
  expect(await snapshot(pool, g.project.id)).toEqual(prior);
});
it('refuses create before approval, then permits the waiting actual Client approval', async () => {
  const f = await setup(false),
    changes = module.get(ChangesService);
  await changes.decision(f.owner.id, f.cr.id, 'VENDOR', {
    expectedVersion: 2,
    decision: 'APPROVED',
  });
  const auth = module.get(AuthorizationRepository),
    original = auth.projectWrite.bind(auth),
    entered = signal(),
    release = signal();
  vi.spyOn(auth, 'projectWrite').mockImplementationOnce(async (...args) => {
    const value = await original(...args);
    entered.resolve();
    await release.promise;
    return value;
  });
  const creating = service
    .create(f.owner.id, f.cr.id, payload)
    .catch((error: unknown) => error);
  await entered.promise;
  const approving = changes.decision(f.client.id, f.cr.id, 'CLIENT', {
    expectedVersion: 3,
    decision: 'APPROVED',
  });
  try {
    await waitForLock(pool);
  } finally {
    release.resolve();
  }
  expect(await creating).toMatchObject({
    response: { code: 'INVALID_TRANSITION' },
  });
  expect((await approving).status).toBe('APPROVED');
  expect((await snapshot(pool, f.project.id)).deliveries).toEqual([]);
});
