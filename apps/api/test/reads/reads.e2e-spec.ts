import { assertContract } from './contract.js';
import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import type { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/configure-app.js';
import { DeliveriesService } from '../../src/deliveries/deliveries.service.js';
import { WorkspacesService } from '../../src/workspaces/workspaces.service.js';
import { openTestDatabase } from '../database/helpers.js';
import { setup as fixture, payload, snapshot } from '../deliveries/helpers.js';
let pool: Pool, module: TestingModule, app: INestApplication, server: Server;
const headers = {
  Origin: 'http://localhost:3000',
  'X-CSRF-Protection': '1',
  'Sec-Fetch-Site': 'same-origin',
};
beforeAll(async () => {
  pool = await openTestDatabase();
  vi.stubEnv('DATABASE_URL', process.env.TEST_DATABASE_URL!);
  vi.stubEnv('AUTH_TRUSTED_ORIGINS', headers.Origin);
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('OBSERVE_APP_KEY', '');
  vi.stubEnv('OBSERVE_APP_SECRET', '');
  module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication();
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  server = app.getHttpServer() as Server;
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await app?.close();
  await pool?.end();
  vi.unstubAllEnvs();
});
const setup = () => fixture(pool, module);
const call = (
  method: 'get' | 'post' | 'patch',
  path: string,
  user: { cookie: string },
  body?: object,
) => {
  const req = request(server)
    [method](`/api/v1${path}`)
    .set(headers)
    .set('Cookie', user.cookie)
    .expect((res) => assertContract(path, method, res));
  return body === undefined ? req : req.send(body);
};
it('authorizes six reads using real parent chains and never writes business data', async () => {
  const f = await setup(),
    other = await setup();
  const row = await module
    .get(DeliveriesService)
    .create(f.owner.id, f.cr.id, payload);
  await module
    .get(WorkspacesService)
    .add(f.owner.id, f.workspace.id, f.outsider.email);
  const routes = [
    `/projects/${f.project.id}/change-requests`,
    `/projects/${f.project.id}/deliveries`,
    `/projects/${f.project.id}/audit-events`,
    `/requirements/${f.requirement.id}/revisions/${f.revision.id}`,
    `/change-requests/${f.cr.id}/versions/${f.version.changeRequestVersionId}`,
    `/deliveries/${row.id}`,
  ];
  const before = await snapshot(pool, f.project.id);
  for (const path of routes) {
    await request(server).get(`/api/v1${path}`).expect(401);
    for (const user of [other.owner, other.developer, other.client, f.outsider])
      await call('get', path, user).expect(404);
    for (const user of [f.owner, f.developer, f.client]) {
      const res = await call('get', path, user).expect(200);
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.body.meta.requestId).toBeTruthy();
      expect(JSON.stringify(res.body.data)).not.toMatch(
        /passwordHash|tokenHash|email|draftScope|draftEstimate/,
      );
    }
  }
  await call(
    'get',
    `/requirements/${f.requirement.id}/revisions/${other.revision.id}`,
    f.owner,
  ).expect(404);
  await call(
    'get',
    `/change-requests/${f.cr.id}/versions/${other.version.changeRequestVersionId}`,
    f.owner,
  ).expect(404);
  expect(await snapshot(pool, f.project.id)).toEqual(before);
});
it('paginates project lists after filters, preserves frozen values and scopes filter IDs', async () => {
  const f = await setup(),
    other = await setup();
  const one = await module
    .get(DeliveriesService)
    .create(f.owner.id, f.cr.id, payload);
  await module.get(DeliveriesService).review(f.client.id, one.id, {
    decision: 'CHANGES_REQUESTED',
    comment: 'Fix',
  });
  const two = await module
    .get(DeliveriesService)
    .create(f.owner.id, f.cr.id, payload);
  const path = `/projects/${f.project.id}/deliveries`;
  const first = await call('get', `${path}?limit=1`, f.client).expect(200);
  expect(first.body.data[0]).toMatchObject({
    id: two.id,
    requirementId: f.requirement.id,
    review: null,
  });
  expect(first.body.meta.hasMore).toBe(true);
  const second = await call('get', `${path}?limit=1&offset=1`, f.client).expect(
    200,
  );
  expect(second.body.data[0]).toMatchObject({
    id: one.id,
    review: { decision: 'CHANGES_REQUESTED' },
  });
  expect(second.body.meta.hasMore).toBe(false);
  for (const [url, filter] of [
    [path, `changeRequestId=${other.cr.id}`],
    [
      `/projects/${f.project.id}/change-requests`,
      `requirementId=${other.requirement.id}`,
    ],
  ]) {
    const empty = await call('get', `${url}?${filter}`, f.client).expect(200);
    expect(empty.body.data).toEqual([]);
    expect(empty.body.meta.hasMore).toBe(false);
  }
  const changes = await call(
    'get',
    `/projects/${f.project.id}/change-requests?status=APPROVED`,
    f.client,
  ).expect(200);
  expect(changes.body.data[0]).toMatchObject({
    id: f.cr.id,
    activeVersionNo: 1,
    requirementTitle: 'Change test',
  });
  expect(Object.keys(changes.body.data[0]).sort()).toEqual(
    [
      'id',
      'requirementId',
      'projectId',
      'status',
      'lockVersion',
      'activeVersionId',
      'createdAt',
      'updatedAt',
      'requirementTitle',
      'activeVersionNo',
    ].sort(),
  );
  const frozen = await call(
    'get',
    `/change-requests/${f.cr.id}/versions/${f.version.changeRequestVersionId}`,
    f.client,
  ).expect(200);
  expect(frozen.body.data).toMatchObject({
    costDeltaMinor: -500,
    estimateHours: '16.25',
    requirementRevision: { id: f.revision.id },
  });
  expect(frozen.body.data.approvals).toHaveLength(2);
  expect(frozen.body.data.submittedAt).toMatch(/Z$/);
  expect(frozen.body.data).not.toHaveProperty('draft');
});
it('filters audit before pagination, strips unsafe metadata, and verifies target ownership', async () => {
  const f = await setup(),
    other = await setup();
  const audit = async (
    event: string,
    entity: string,
    id: string,
    metadata: object,
  ) =>
    pool.query(
      'INSERT INTO audit_events(workspace_id,project_id,actor_id,event_type,entity_type,entity_id,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [f.workspace.id, f.project.id, f.owner.id, event, entity, id, metadata],
    );
  await audit('requirement.created', 'requirement', other.requirement.id, {
    email: 'private',
    body: 'private',
  });
  await audit('change_request.submitted', 'change_request', f.cr.id, {
    changeRequestVersionId: other.version.changeRequestVersionId,
    versionNo: 1,
    clientId: f.client.id,
    secret: 'private',
  });
  await audit('future.secret', 'project', f.project.id, { secret: 'private' });
  const path = `/projects/${f.project.id}/audit-events`;
  for (const user of [f.owner, f.client]) {
    const all = await call('get', `${path}?limit=100`, user).expect(200);
    expect(JSON.stringify(all.body.data)).not.toMatch(
      /private|future.secret|clientId|email/,
    );
    const foreign = all.body.data.find(
      (e: { entityId: string }) => e.entityId === other.requirement.id,
    );
    expect(foreign.target).toBeNull();
    const badVersion = all.body.data.find(
      (e: { metadata: { changeRequestVersionId?: string } }) =>
        e.metadata.changeRequestVersionId ===
        other.version.changeRequestVersionId,
    );
    expect(badVersion.target).toEqual({
      kind: 'change',
      projectId: f.project.id,
      changeRequestId: f.cr.id,
    });
    const paged = [];
    for (let offset = 0; offset < all.body.data.length; offset++) {
      const page = await call(
        'get',
        `${path}?limit=1&offset=${offset}`,
        user,
      ).expect(200);
      paged.push(page.body.data[0]);
      expect(page.body.meta.hasMore).toBe(offset + 1 < all.body.data.length);
    }
    expect(paged).toEqual(all.body.data);
  }
  const hidden = await call(
    'get',
    `${path}?eventType=project.created&limit=1`,
    f.client,
  ).expect(200);
  expect(hidden.body.data).toEqual([]);
  expect(hidden.body.meta.hasMore).toBe(false);
});
it('validates query scalars and denies unknown detail queries', async () => {
  const f = await setup();
  for (const suffix of [
    'limit=0',
    'limit=101',
    'offset=-1',
    'offset=9007199254740992',
    'limit=1&limit=2',
    'status=',
    'status=bogus',
    'sort=id',
    'requirementId=bad',
  ])
    await call(
      'get',
      `/projects/${f.project.id}/change-requests?${suffix}`,
      f.client,
    ).expect(400);
  for (const suffix of [
    'eventType=future.secret',
    'entityType=workspace',
    'entityId=bad',
  ])
    await call(
      'get',
      `/projects/${f.project.id}/audit-events?${suffix}`,
      f.client,
    ).expect(400);
  await call(
    'get',
    `/requirements/${f.requirement.id}/revisions/${f.revision.id}?limit=1`,
    f.client,
  ).expect(400);
  await call(
    'get',
    `/change-requests/${f.cr.id}/versions/${f.version.changeRequestVersionId}?actorId=${f.owner.id}`,
    f.client,
  ).expect(400);
});
it('reports review eligibility in the same snapshot without changing write decisions', async () => {
  const f = await setup();
  const row = await module
    .get(DeliveriesService)
    .create(f.owner.id, f.cr.id, payload);
  const path = `/deliveries/${row.id}`;
  expect(
    (await call('get', path, f.owner).expect(200)).body.data.capabilities
      .review,
  ).toEqual({ allowed: false, reasonCode: 'ROLE_FORBIDDEN' });
  expect(
    (await call('get', path, f.client).expect(200)).body.data.capabilities
      .review,
  ).toEqual({ allowed: true });
  await module
    .get(DeliveriesService)
    .review(f.client.id, row.id, { decision: 'ACCEPTED' });
  const accepted = await call('get', path, f.client).expect(200);
  expect(accepted.body.data.capabilities.review).toEqual({
    allowed: false,
    reasonCode: 'ALREADY_REVIEWED',
  });
  expect(accepted.body.data.review.decision).toBe('ACCEPTED');
  const before = await snapshot(pool, f.project.id);
  await call('post', `${path}/review`, f.client, {
    decision: 'ACCEPTED',
  }).expect(409);
  expect(await snapshot(pool, f.project.id)).toEqual(before);
});
it('derives dashboard buckets and uninflated counts from real workflow facts', async () => {
  const f = await setup(),
    other = await setup();
  const path = `/dashboard?projectId=${f.project.id}`;
  await request(server).get(`/api/v1${path}`).expect(401);
  for (const user of [other.owner, other.client, f.outsider])
    await call('get', path, user).expect(404);
  const get = async (user: { cookie: string }, query = '') =>
    (await call('get', path + query, user).expect(200)).body;
  const supplier = await get(f.developer);
  expect(supplier.data.summary).toEqual({
    projectCount: 1,
    requirementCounts: { DRAFT: 0, CLARIFYING: 0, READY: 1 },
    changeCounts: {
      DRAFT: 0,
      SUBMITTED: 0,
      VENDOR_APPROVED: 0,
      APPROVED: 1,
      REJECTED: 0,
    },
    deliveryCounts: { SUBMITTED: 0, CHANGES_REQUESTED: 0, ACCEPTED: 0 },
    buckets: { mine: 1, waiting: 0, completed: 0 },
  });
  expect(supplier.data.items.map((i: { type: string }) => i.type)).toEqual([
    'SUBMIT_DELIVERY',
  ]);
  expect((await get(f.client, '&bucket=waiting')).data.items[0].type).toBe(
    'SUBMIT_DELIVERY',
  );
  const one = await module
    .get(DeliveriesService)
    .create(f.owner.id, f.cr.id, payload);
  expect((await get(f.client)).data.items[0].type).toBe('REVIEW_DELIVERY');
  await module.get(DeliveriesService).review(f.client.id, one.id, {
    decision: 'CHANGES_REQUESTED',
    comment: 'Fix',
  });
  expect((await get(f.developer)).data.items[0].type).toBe('REVISE_DELIVERY');
  const two = await module
    .get(DeliveriesService)
    .create(f.owner.id, f.cr.id, payload);
  await module
    .get(DeliveriesService)
    .review(f.client.id, two.id, { decision: 'ACCEPTED' });
  for (const user of [f.owner, f.developer, f.client]) {
    const completed = await get(user, '&bucket=completed&limit=1');
    expect(completed.data.items[0]).toMatchObject({
      type: 'ACCEPTED_DELIVERY',
      entityId: two.id,
      deliveryNo: 2,
    });
    expect(completed.data.items[0].occurredAt).toMatch(/Z$/);
    expect(completed.meta.asOf).toMatch(/Z$/);
    expect(completed.data.summary.deliveryCounts).toEqual({
      SUBMITTED: 0,
      CHANGES_REQUESTED: 1,
      ACCEPTED: 1,
    });
    expect(completed.data.summary.buckets).toEqual({
      mine: 0,
      waiting: 0,
      completed: 1,
    });
    expect((await get(user, '&offset=100')).data.summary).toEqual(
      completed.data.summary,
    );
    expect(
      (await get(user, '&workspaceId=' + other.workspace.id)).data.summary
        .projectCount,
    ).toBe(0);
  }
  const empty = await call(
    'get',
    `/dashboard?workspaceId=${other.workspace.id}`,
    f.client,
  ).expect(200);
  expect(empty.body.data.summary.projectCount).toBe(0);
  for (const query of [
    'bucket=',
    'bucket=other',
    'bucket=mine&bucket=waiting',
    'projectId=bad',
    'userId=bad',
  ])
    await call('get', `/dashboard?${query}`, f.client).expect(400);
});
it('validates existing Web-facing HTTP contracts and capability transitions end to end', async () => {
  const f = await setup();
  for (const path of [
    '/me',
    '/workspaces',
    `/workspaces/${f.workspace.id}/members`,
    '/projects',
    `/projects/${f.project.id}`,
    `/projects/${f.project.id}/requirements`,
    `/requirements/${f.requirement.id}`,
    `/requirements/${f.requirement.id}/revisions`,
    `/change-requests/${f.cr.id}`,
  ])
    await call('get', path, f.owner).expect(200);
  const crClient = await call(
    'get',
    `/change-requests/${f.cr.id}`,
    f.client,
  ).expect(200);
  expect(crClient.body.data).not.toHaveProperty('draft');
  expect(crClient.body.data.capabilities.submit).toEqual({
    allowed: false,
    reasonCode: 'ROLE_FORBIDDEN',
  });
  const reqPath = `/projects/${f.project.id}/requirements`;
  const req = (
    await call('post', reqPath, f.client, {
      title: 'Capability workflow',
      originalText: 'Original',
    }).expect(201)
  ).body.data;
  const path = `/requirements/${req.id}`;
  expect(
    (await call('get', path, f.developer)).body.data.capabilities.editDraft
      .reasonCode,
  ).toBe('ROLE_FORBIDDEN');
  await call('patch', path, f.client, {
    expectedVersion: 1,
    title: 'Updated title',
  }).expect(200);
  const question = (
    await call('post', path + '/clarifications', f.developer, {
      expectedVersion: 2,
      kind: 'QUESTION',
      body: 'What outcome?',
    }).expect(201)
  ).body.data;
  const dash = async (user: { cookie: string }, bucket = 'mine') =>
    (
      await call(
        'get',
        `/dashboard?projectId=${f.project.id}&bucket=${bucket}`,
        user,
      ).expect(200)
    ).body.data.items;
  expect(
    (await dash(f.client)).some(
      (i: { type: string; entityId: string }) =>
        i.type === 'CLARIFY_REQUIREMENT' && i.entityId === req.id,
    ),
  ).toBe(true);
  await call('post', path + '/clarifications', f.client, {
    expectedVersion: 3,
    kind: 'ANSWER',
    parentId: question.id,
    body: 'A visible result',
  }).expect(201);
  expect(
    (await dash(f.owner)).some(
      (i: { type: string; entityId: string }) =>
        i.type === 'PREPARE_REVISION' && i.entityId === req.id,
    ),
  ).toBe(true);
  await call('post', path + '/revisions', f.developer, {
    expectedVersion: 4,
    content: 'Specification',
    acceptanceCriteria: ['Visible result'],
  }).expect(201);
  expect(
    (await call('get', path, f.developer)).body.data.capabilities.markReady
      .allowed,
  ).toBe(true);
  expect(
    (await dash(f.owner)).some(
      (i: { type: string; entityId: string }) =>
        i.type === 'MARK_READY' && i.entityId === req.id,
    ),
  ).toBe(true);
  await call('post', path + '/mark-ready', f.developer, {
    expectedVersion: 5,
  }).expect(200);
  expect(
    (await dash(f.owner)).some(
      (i: { type: string; entityId: string }) =>
        i.type === 'PREPARE_ASSESSMENT' && i.entityId === req.id,
    ),
  ).toBe(true);
  const cr = (
    await call('post', path + '/change-requests', f.developer, {}).expect(201)
  ).body.data;
  const cp = `/change-requests/${cr.id}`;
  expect(
    (await call('get', cp, f.developer)).body.data.capabilities.submit
      .reasonCode,
  ).toBe('ASSESSMENT_INCOMPLETE');
  expect(
    (await dash(f.client, 'waiting')).some(
      (i: { entityId: string }) => i.entityId === cr.id,
    ),
  ).toBe(false);
  await call('patch', cp, f.developer, {
    expectedVersion: 0,
    scopeSummary: 'Scope',
    estimateHours: '1.25',
    costDeltaMinor: 0,
    currency: 'CNY',
    scheduleDeltaDays: 0,
    acceptanceCriteria: ['Visible result'],
  }).expect(200);
  expect(
    (await call('get', cp, f.developer)).body.data.capabilities.submit.allowed,
  ).toBe(true);
  await call('post', cp + '/submit', f.developer, {
    expectedVersion: 1,
  }).expect(201);
  expect(
    (await call('get', path, f.developer)).body.data.capabilities.createRevision
      .reasonCode,
  ).toBe('REVIEW_IN_PROGRESS');
  expect(
    (await dash(f.owner)).some(
      (i: { type: string; entityId: string }) =>
        i.type === 'VENDOR_APPROVAL' && i.entityId === cr.id,
    ),
  ).toBe(true);
  await call('post', cp + '/vendor-decision', f.owner, {
    expectedVersion: 2,
    decision: 'REJECTED',
  }).expect(200);
  expect(
    (await dash(f.client, 'waiting')).some(
      (i: { type: string; entityId: string }) =>
        i.type === 'REVISE_ASSESSMENT' && i.entityId === cr.id,
    ),
  ).toBe(true);
  await call('post', cp + '/resubmit', f.developer, {
    expectedVersion: 3,
  }).expect(200);
  await call('post', cp + '/submit', f.developer, {
    expectedVersion: 4,
  }).expect(201);
  await call('post', cp + '/vendor-decision', f.owner, {
    expectedVersion: 5,
    decision: 'APPROVED',
  }).expect(200);
  expect(
    (await dash(f.client)).some(
      (i: { type: string; entityId: string }) =>
        i.type === 'CLIENT_APPROVAL' && i.entityId === cr.id,
    ),
  ).toBe(true);
  await call('post', cp + '/client-decision', f.client, {
    expectedVersion: 6,
    decision: 'APPROVED',
  }).expect(200);
  expect(
    (await call('get', cp, f.developer)).body.data.capabilities.createDelivery
      .allowed,
  ).toBe(true);
  const delivery = (
    await call('post', cp + '/deliveries', f.developer, payload).expect(201)
  ).body.data;
  await call('get', cp + '/deliveries', f.client).expect(200);
  expect(
    (await call('get', cp, f.developer)).body.data.capabilities.createDelivery
      .reasonCode,
  ).toBe('DELIVERY_PENDING');
  await call('post', `/deliveries/${delivery.id}/review`, f.client, {
    decision: 'ACCEPTED',
  }).expect(200);
  expect(
    (await call('get', cp, f.developer)).body.data.capabilities.createDelivery
      .reasonCode,
  ).toBe('DELIVERY_COMPLETED');
});
it('paginates dashboard tasks independently of summary and fails closed on invalid approval pointers', async () => {
  const f = await setup(),
    other = await setup();
  const { ProjectsService } =
    await import('../../src/projects/projects.service.js');
  const { RequirementsService } =
    await import('../../src/requirements/requirements.service.js');
  const projects = module.get(ProjectsService),
    requirements = module.get(RequirementsService);
  const project = await projects.create(f.owner.id, {
    workspaceId: f.workspace.id,
    name: 'Preparation',
    baselineScope: 'Reference',
  });
  for (const title of ['First', 'Second'])
    await requirements.create(f.owner.id, project.id, {
      title,
      originalText: 'Text',
    });
  const path = `/dashboard?projectId=${project.id}`;
  const full = (await call('get', path, f.owner).expect(200)).body;
  expect(full.data.summary.buckets.mine).toBe(3);
  expect(full.data.items.map((i: { type: string }) => i.type).sort()).toEqual([
    'BIND_CLIENT',
    'PREPARE_REVISION',
    'PREPARE_REVISION',
  ]);
  const collected = [];
  for (let offset = 0; offset < 3; offset++) {
    const page = (
      await call('get', `${path}&limit=1&offset=${offset}`, f.owner).expect(200)
    ).body;
    expect(page.data.summary).toEqual(full.data.summary);
    expect(page.meta.hasMore).toBe(offset < 2);
    collected.push(...page.data.items);
  }
  expect(collected).toEqual(full.data.items);
  await expect(
    pool.query('UPDATE change_requests SET active_version_id=$1 WHERE id=$2', [
      other.version.changeRequestVersionId,
      f.cr.id,
    ]),
  ).rejects.toMatchObject({ code: '23503' });
  // A missing pointer is representable; reads must deny an actionable approval/delivery.
  await pool.query(
    'UPDATE change_requests SET active_version_id=NULL WHERE id=$1',
    [f.cr.id],
  );
  const invalid = (
    await call('get', `/dashboard?projectId=${f.project.id}`, f.owner).expect(
      200,
    )
  ).body;
  expect(invalid.data.items).toEqual([]);
  expect(invalid.data.summary.changeCounts.APPROVED).toBe(1);
  const capability = (
    await call('get', `/change-requests/${f.cr.id}`, f.owner).expect(200)
  ).body.data.capabilities.createDelivery;
  expect(capability).toEqual({
    allowed: false,
    reasonCode: 'BUSINESS_RULE_VIOLATION',
  });
  const list = (
    await call(
      'get',
      `/projects/${f.project.id}/change-requests`,
      f.client,
    ).expect(200)
  ).body.data;
  expect(list[0].activeVersionNo).toBeNull();
});
it('validates auth and project setup HTTP responses against generated contracts', async () => {
  const email = `contract-${crypto.randomUUID()}@example.test`;
  const password = 'contract-test-password-only';
  await call(
    'post',
    '/auth/register',
    { cookie: '' },
    { email, password, displayName: 'Contract user' },
  ).expect(201);
  const login = await call(
    'post',
    '/auth/login',
    { cookie: '' },
    { email, password },
  ).expect(200);
  const user = { cookie: String(login.headers['set-cookie'][0]).split(';')[0] };
  await call('get', '/me', user).expect(200);
  const workspace = (
    await call('post', '/workspaces', user, {
      name: 'Contract workspace',
    }).expect(201)
  ).body.data;
  const f = await setup();
  await call('post', `/workspaces/${workspace.id}/members`, user, {
    email: f.developer.email,
  }).expect(201);
  const project = (
    await call('post', '/projects', user, {
      workspaceId: workspace.id,
      name: 'Contract project',
      baselineScope: 'Reference',
    }).expect(201)
  ).body.data;
  await call('post', `/projects/${project.id}/members`, user, {
    userId: f.developer.id,
    role: 'DEVELOPER',
  }).expect(201);
  const binding = await request(server)
    .put(`/api/v1/projects/${project.id}/client`)
    .set(headers)
    .set('Cookie', user.cookie)
    .send({ email: f.client.email })
    .expect(200);
  assertContract(`/projects/${project.id}/client`, 'put', binding);
  await call('get', `/projects/${project.id}`, user).expect(200);
  await call('post', '/auth/logout', user).expect(204);
  await call('get', '/me', user).expect(401);
});
