import { z } from 'zod';
import {
  approveConnection,
  exchangeConnection,
} from '../agent-connections/connection.contract.js';
import { tokenCreated } from '../api-tokens/token.contract.js';
import {
  arr,
  obj,
  uuid,
  int,
  date,
  nullable,
  en,
  text,
  type Schema,
} from './schemas.js';
const json = (schema: z.ZodType): Schema =>
  z.toJSONSchema(schema, { io: 'input', target: 'openapi-3.0' }) as Schema;
export const connectionRecord = obj({
  id: uuid,
  projectId: uuid,
  name: text(100),
  expiresInDays: int(1, 90),
  createdAt: date,
  expiresAt: date,
  completedAt: nullable(date),
  apiTokenId: nullable(uuid),
  status: en('AUTHORIZED', 'EXCHANGED', 'CANCELLED', 'EXPIRED'),
});
export const connectionOperations = {
  approve: {
    body: json(approveConnection),
    response: obj({
      grant: connectionRecord,
      code: { type: 'string', pattern: '^sbc_[A-Za-z0-9_-]{43}$' },
      callbackUrl: { type: 'string', format: 'uri' },
    }),
  },
  list: {
    paged: true,
    query: { limit: int(1, 50), offset: int(0, 10000) },
    response: arr(connectionRecord),
  },
  read: { response: connectionRecord },
  cancel: { response: connectionRecord },
};
export const exchangeOperations = {
  exchange: {
    public: true,
    body: json(exchangeConnection),
    response: json(tokenCreated),
  },
};
