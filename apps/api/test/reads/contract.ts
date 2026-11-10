import { readFileSync } from 'node:fs';
import { Ajv, type ValidateFunction } from 'ajv';
import { createRequire } from 'node:module';
import type { FormatsPlugin } from 'ajv-formats';
const addFormats = createRequire(import.meta.url)(
  'ajv-formats',
) as FormatsPlugin;
import type { OpenAPIObject, ResponseObject } from '@nestjs/swagger';
const document = JSON.parse(
  readFileSync(
    new URL('../../../../docs/architecture/openapi.json', import.meta.url),
    'utf8',
  ),
) as OpenAPIObject;
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
// The product contract requires canonical UTC JSON dates, stronger than RFC3339's accepted alternatives.
ajv.addFormat('date-time', {
  type: 'string',
  validate: (value) =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value)),
});
const validators = new Map<string, ValidateFunction>();
export function assertContract(
  path: string,
  method: string,
  response: { status: number; body: unknown },
) {
  const actual = '/api/v1' + path.split('?')[0];
  const route = Object.keys(document.paths).find((p) =>
    new RegExp('^' + p.replace(/\{[^}]+\}/g, '[^/]+') + '$').test(actual),
  );
  if (!route) throw new Error('Missing OpenAPI route: ' + actual);
  const operation = document.paths[route][method as 'get'];
  const contract = operation?.responses[String(response.status)] as
    ResponseObject | undefined;
  if (!contract)
    throw new Error(
      `Missing OpenAPI response: ${route} ${method} ${response.status}`,
    );
  const schema = contract.content?.['application/json']?.schema;
  if (!schema) {
    expect(response.status).toBe(204);
    return;
  }
  const key = `${route}:${method}:${response.status}`;
  let validate = validators.get(key);
  if (!validate) {
    validate = ajv.compile({ ...schema, components: document.components });
    validators.set(key, validate);
  }
  const valid = validate(response.body);
  expect(valid, JSON.stringify(validate.errors)).toBe(true);
}
