import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { AuthorizationRepository } from '../authorization/authorization.repository.js';
import type {
  ChangesRepository,
  Change,
  Requirement,
} from '../changes/changes.repository.js';
import type { DatabaseTransaction } from '../database/database.service.js';
const conflict = (code: string): never => {
  throw new ConflictException({ code });
};
const business = (): never => {
  throw new UnprocessableEntityException();
};
export async function approvedDeliveryVersion(
  changes: ChangesRepository,
  authorization: AuthorizationRepository,
  tx: DatabaseTransaction,
  change: Change,
  requirement: Requirement,
  project: Awaited<ReturnType<AuthorizationRepository['project']>>,
) {
  if (change.status !== 'APPROVED') conflict('INVALID_TRANSITION');
  if (!change.activeVersionId) business();
  const version = await changes.version(tx, change.id, change.activeVersionId!);
  const latest = await changes.latestVersion(tx, change.id);
  if (
    !version ||
    version.id !== latest?.id ||
    !(await changes.revision(tx, requirement.id, version.requirementRevisionId))
  )
    business();
  const client = await changes.client(tx, project.id, project.workspaceId);
  const decisions = await changes.decisions(tx, version!.id);
  const vendor = decisions.find((d) => d.step === 'VENDOR');
  const customer = decisions.find((d) => d.step === 'CLIENT');
  if (
    !client ||
    client.conflict ||
    vendor?.decision !== 'APPROVED' ||
    customer?.decision !== 'APPROVED' ||
    customer.actorId !== client.userId
  )
    business();
  // Project Policy verifies both ownership and membership, including role conflicts.
  const owner = await authorization
    .project(vendor!.actorId, project.id, tx)
    .catch((error: unknown) => {
      if (error instanceof NotFoundException) business();
      throw error;
    });
  if (owner.projectRole !== 'OWNER') business();
  return version!;
}
