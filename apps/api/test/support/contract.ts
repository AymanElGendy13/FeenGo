import { readFileSync } from 'node:fs';
import Ajv2020Module from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';
import type { Response } from 'supertest';
import { expect } from 'vitest';
import { parse } from 'yaml';

// Checks responses against docs/api/openapi.yaml, the contract (OpenAPI 3.1, whose
// schemas are JSON Schema 2020-12).

const CONTRACT_URL = new URL('../../../../docs/api/openapi.yaml', import.meta.url);
const SCHEMA_ID = 'https://feengo.invalid/openapi.yaml';

interface MediaType {
  schema?: { $ref?: string };
}
interface ResponseObject {
  $ref?: string;
  headers?: Record<string, unknown>;
  content?: Record<string, MediaType>;
}
interface Contract {
  paths: Record<string, Record<string, { responses: Record<string, ResponseObject> }>>;
  components: { schemas: Record<string, unknown>; responses: Record<string, ResponseObject> };
}

const contract = parse(readFileSync(CONTRACT_URL, 'utf8')) as Contract;

const ajv = new Ajv2020Module.default({ allErrors: true, strict: true });
addFormatsModule.default(ajv);
// `components` holds the schemas; `example` is an OpenAPI annotation.
ajv.addVocabulary(['components', 'example']);
ajv.addSchema({ $id: SCHEMA_ID, components: { schemas: contract.components.schemas } });

function validatorFor(ref: string) {
  const validate = ajv.getSchema(`${SCHEMA_ID}${ref}`);
  if (validate === undefined) {
    throw new Error(`The contract has no schema at ${ref}`);
  }
  return validate;
}

/** Fails unless `body` matches the named schema in components.schemas. */
export function expectSchema(name: string, body: unknown): void {
  const validate = validatorFor(`#/components/schemas/${name}`);
  const valid = validate(body);
  expect(validate.errors ?? [], `body does not match ${name}`).toEqual([]);
  expect(valid).toBe(true);
}

function resolveResponse(response: ResponseObject): ResponseObject {
  if (response.$ref === undefined) {
    return response;
  }
  const name = response.$ref.replace('#/components/responses/', '');
  const resolved = contract.components.responses[name];
  if (resolved === undefined) {
    throw new Error(`The contract has no response ${response.$ref}`);
  }
  return resolved;
}

/**
 * Fails unless the response is one the contract documents for this operation: its
 * status (or `default`), its media type, its body schema and the X-Request-Id
 * header it declares.
 */
export function expectContractResponse(path: string, method: string, res: Response): void {
  const operation = contract.paths[path]?.[method];
  expect(operation, `${method.toUpperCase()} ${path} is not in the contract`).toBeDefined();
  const documented = operation?.responses[String(res.status)] ?? operation?.responses.default;
  expect(documented, `${res.status} is not documented for ${path}`).toBeDefined();
  const response = resolveResponse(documented ?? {});

  const mediaType = String(res.headers['content-type']).split(';')[0]?.trim() ?? '';
  const content = response.content?.[mediaType];
  expect(content, `${mediaType} is not documented for ${res.status} on ${path}`).toBeDefined();
  const ref = content?.schema?.$ref;
  expect(ref, 'expected a $ref schema').toBeTypeOf('string');
  const validate = validatorFor(ref ?? '');
  const valid = validate(res.body);
  expect(validate.errors ?? [], `body does not match ${ref}`).toEqual([]);
  expect(valid).toBe(true);

  if (response.headers?.['X-Request-Id'] !== undefined) {
    const requestId = res.headers['x-request-id'];
    expect(requestId).toBeTypeOf('string');
    expect(String(requestId).length).toBeLessThanOrEqual(64);
  }
}
