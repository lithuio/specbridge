import type { TestingModule } from '@nestjs/testing';
import type { Pool } from 'pg';
import { domain } from '../rbac/helpers.js';
import { WorkspacesService } from '../../src/workspaces/workspaces.service.js';
import { ProjectsService } from '../../src/projects/projects.service.js';
import { RequirementsService } from '../../src/requirements/requirements.service.js';
import { ChangesService } from '../../src/changes/changes.service.js';
export const commercial = {
  scopeSummary: 'Commercial scope',
  estimateHours: '16.25',
  costDeltaMinor: -500,
  currency: 'CNY',
  scheduleDeltaDays: -2,
  acceptanceCriteria: ['Observable result'],
};
export const spec = {
  content: 'Frozen specification',
  acceptanceCriteria: ['Observable result'],
};
export async function setup(
  pool: Pool,
  module: Pick<TestingModule, 'get'>,
  bind = true,
) {
  const projects = module.get(ProjectsService),
    requirements = module.get(RequirementsService),
    changes = module.get(ChangesService),
    workspaces = module.get(WorkspacesService);
  const f = await domain(pool, workspaces, projects);
  await workspaces.add(f.owner.id, f.workspace.id, f.developer.email);
  await projects.add(f.owner.id, f.project.id, f.developer.id);
  if (bind) await projects.bindClient(f.owner.id, f.project.id, f.client.email);
  const requirement = await requirements.create(f.owner.id, f.project.id, {
    title: 'Change test',
    originalText: 'Original',
  });
  const revision = await requirements.revision(f.developer.id, requirement.id, {
    expectedVersion: 1,
    ...spec,
  });
  await requirements.ready(f.developer.id, requirement.id, {
    expectedVersion: 2,
  });
  const cr = await changes.create(f.developer.id, requirement.id);
  return { ...f, requirement, revision, cr };
}
export async function snapshot(pool: Pool, projectId: string) {
  return (
    await pool.query(
      `SELECT
    (SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.id),'[]') FROM requirements r WHERE r.project_id=$1) AS requirements,
    (SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.id),'[]') FROM change_requests c JOIN requirements r ON r.id=c.requirement_id WHERE r.project_id=$1) AS changes,
    (SELECT coalesce(jsonb_agg(to_jsonb(v) ORDER BY v.id),'[]') FROM change_request_versions v JOIN change_requests c ON c.id=v.change_request_id JOIN requirements r ON r.id=c.requirement_id WHERE r.project_id=$1) AS versions,
    (SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id),'[]') FROM approvals a JOIN change_request_versions v ON v.id=a.change_request_version_id JOIN change_requests c ON c.id=v.change_request_id JOIN requirements r ON r.id=c.requirement_id WHERE r.project_id=$1) AS approvals,
    (SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.id),'[]') FROM audit_events a WHERE a.project_id=$1) AS audit`,
      [projectId],
    )
  ).rows[0];
}
