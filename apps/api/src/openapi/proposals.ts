import { z } from 'zod';
import {
  proposalContent,
  proposalSources,
  prepareProposal,
  editProposal,
  executeProposal,
  deleteProposal,
} from '../proposals/proposals.contract.js';
import {
  arr,
  obj,
  uuid,
  int,
  en,
  date,
  nullable,
  type Schema,
} from './schemas.js';
const json = (schema: z.ZodType): Schema =>
  z.toJSONSchema(schema, { io: 'input', target: 'openapi-3.0' }) as Schema;
const result = obj(
  {
    requirementVersion: int(1),
    clarificationIds: arr(uuid),
    revisionId: uuid,
    changeRequestId: uuid,
    changeVersion: int(),
  },
  ['clarificationIds', 'revisionId', 'changeRequestId', 'changeVersion'],
);
const content = json(proposalContent);
export const proposalRecord: Schema = {
  oneOf: content.oneOf!.map((part) => {
    const properties = (part as Schema).properties!;
    return obj({
      id: uuid,
      requirementId: uuid,
      userId: uuid,
      kind: properties.kind as Schema,
      payload: properties.payload as Schema,
      changeRequestId: nullable(uuid),
      version: int(1),
      baseRequirementVersion: int(1),
      baseChangeVersion: nullable(int()),
      status: en('DRAFT', 'EXECUTED'),
      sources: json(proposalSources),
      operationId: nullable(uuid),
      result: nullable(result),
      createdAt: date,
      updatedAt: date,
      expiresAt: date,
      executedAt: nullable(date),
    });
  }),
};
export const proposalOperations = {
  list: {
    query: { limit: int(1, 50), offset: int(0, 10000) },
    response: obj({ items: arr(proposalRecord), hasMore: { type: 'boolean' } }),
  },
  read: { response: proposalRecord },
  prepare: { body: json(prepareProposal), response: proposalRecord },
  edit: { body: json(editProposal), response: proposalRecord },
  remove: {
    body: json(deleteProposal),
    response: obj({ deleted: { type: 'boolean', enum: [true] } }),
  },
  execute: { body: json(executeProposal), response: proposalRecord },
};
