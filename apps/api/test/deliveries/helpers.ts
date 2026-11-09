import type { TestingModule } from '@nestjs/testing';
import type { Pool } from 'pg';
import {
  setup as changeFixture,
  commercial,
  snapshot as parentSnapshot,
} from '../changes/helpers.js';
import { ChangesService } from '../../src/changes/changes.service.js';
export const payload = {
  artifactUrl: 'https://example.test/artifact',
  summary: 'Delivered result',
  evidenceLinks: ['https://example.test/evidence'],
};
export async function setup(
  pool: Pool,
  module: Pick<TestingModule, 'get'>,
  approved = true,
) {
  const f = await changeFixture(pool, module);
  const changes = module.get(ChangesService);
  await changes.patch(f.owner.id, f.cr.id, {
    expectedVersion: 0,
    ...commercial,
  });
  const version = await changes.submit(f.owner.id, f.cr.id, {
    expectedVersion: 1,
  });
  if (approved) {
    await changes.decision(f.owner.id, f.cr.id, 'VENDOR', {
      expectedVersion: 2,
      decision: 'APPROVED',
    });
    await changes.decision(f.client.id, f.cr.id, 'CLIENT', {
      expectedVersion: 3,
      decision: 'APPROVED',
    });
  }
  return { ...f, version };
}
export async function snapshot(pool: Pool, projectId: string) {
  const parent = await parentSnapshot(pool, projectId);
  const result = await pool.query(
    `WITH scoped AS (
    SELECT d.* FROM deliveries d JOIN change_request_versions v ON v.id=d.change_request_version_id
    JOIN change_requests c ON c.id=v.change_request_id JOIN requirements r ON r.id=c.requirement_id WHERE r.project_id=$1)
    SELECT (SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.id),'[]') FROM scoped d) AS deliveries,
    (SELECT coalesce(jsonb_agg(to_jsonb(rv) ORDER BY rv.id),'[]') FROM delivery_reviews rv JOIN scoped d ON d.id=rv.delivery_id) AS reviews`,
    [projectId],
  );
  return { ...parent, ...result.rows[0] };
}
