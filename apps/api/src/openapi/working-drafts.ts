import { z } from 'zod';
import { backgroundSource } from './documents.js';
import {
  clarificationDraftBody,
  specificationDraftBody,
  saveWorkingDraft,
  publishWorkingDraft,
  deleteWorkingDraft,
} from '../requirements/working-draft.contract.js';
import {
  assistanceInput,
  clarificationSuggestion,
  specificationSuggestion,
} from '../ai/assistance.contract.js';
import {
  arr,
  obj,
  uuid,
  int,
  str,
  en,
  date,
  nullable,
  type Schema,
} from './schemas.js';

const json = (schema: z.ZodType): Schema =>
  z.toJSONSchema(schema, { io: 'input', target: 'openapi-3.0' }) as Schema;
const source = obj({
  background: arr(backgroundSource),
  requirementId: uuid,
  draftVersion: int(1),
  revisionId: nullable(uuid),
  clarificationIds: arr(uuid),
  includesUnsavedDraft: { type: 'boolean' },
  readAt: date,
});
export const assistanceOperation = {
  body: json(assistanceInput),
  response: {
    oneOf: (
      [
        ['clarify', clarificationSuggestion],
        ['specification', specificationSuggestion],
      ] as const
    ).map(([mode, schema]) =>
      obj({
        analysisId: uuid,
        schemaVersion: { type: 'integer', enum: [1] },
        mode: en(mode),
        source,
        result: json(schema),
      }),
    ),
  },
};
const record: Schema = {
  oneOf: (
    [
      ['clarify', clarificationDraftBody],
      ['specification', specificationDraftBody],
    ] as const
  ).map(([kind, body]) =>
    obj({
      id: uuid,
      requirementId: uuid,
      userId: uuid,
      kind: en(kind),
      version: int(1),
      baseRequirementVersion: int(1),
      body: json(body),
      publication: obj(
        {
          questions: arr(obj({ itemId: uuid, clarificationId: uuid })),
          revision: obj({ revisionId: uuid, draftVersion: int(1) }),
        },
        ['questions', 'revision'],
      ),
      createdAt: date,
      updatedAt: date,
    }),
  ),
};
const receipt = obj(
  {
    operationId: uuid,
    draftId: uuid,
    kind: en('clarify', 'specification'),
    requirementVersion: int(1),
    workingDraftVersion: int(1),
    clarificationIds: arr(uuid),
    revisionId: uuid,
  },
  ['clarificationIds', 'revisionId'],
);
export const workingDraftOperations = {
  list: { response: arr(record) },
  save: { body: json(saveWorkingDraft), response: record },
  remove: {
    body: json(deleteWorkingDraft),
    response: obj({ deleted: { type: 'boolean', enum: [true] } }),
  },
  publish: { body: json(publishWorkingDraft), response: receipt },
  receipt: { response: receipt },
};
// Only these path segments are enums; all other resource parameters remain UUIDs.
export const workingDraftKindParam: Schema = {
  ...str,
  enum: ['clarify', 'specification'],
};
