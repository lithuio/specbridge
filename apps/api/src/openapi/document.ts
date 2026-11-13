import { ProposalsController } from '../proposals/proposals.controller.js';
import {
  ConnectionsController,
  ConnectionExchangeController,
} from '../agent-connections/connections.module.js';
import { connectionOperations, exchangeOperations } from './connections.js';
import { proposalOperations } from './proposals.js';
import { RateLimitService } from '../auth/rate-limit.service.js';
import 'reflect-metadata';
import { Module, type Type } from '@nestjs/common';
import {
  SELF_DECLARED_DEPS_METADATA,
  PATH_METADATA,
  METHOD_METADATA,
  HTTP_CODE_METADATA,
} from '@nestjs/common/constants.js';
import { NestFactory } from '@nestjs/core';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  DocumentBuilder,
  SwaggerModule,
} from '@nestjs/swagger';
import { AuthController } from '../auth/auth.controller.js';
import { WorkspacesController } from '../workspaces/workspaces.controller.js';
import { ProjectsController } from '../projects/projects.controller.js';
import { RequirementsController } from '../requirements/requirements.controller.js';
import { ChangesController } from '../changes/changes.controller.js';
import { DeliveriesController } from '../deliveries/deliveries.controller.js';
import { AuditReadController } from '../audit/audit-read.module.js';
import { DashboardController } from '../dashboard/dashboard.module.js';
import { AiController } from '../ai/ai.controller.js';
import { WorkingDraftsController } from '../requirements/working-drafts.controller.js';
import {
  DocumentsController,
  DocumentUploadAdmission,
} from '../documents/documents.controller.js';
import { documentOperations } from './documents.js';
import {
  assistanceOperation,
  workingDraftOperations,
  workingDraftKindParam,
} from './working-drafts.js';
import { CopilotController } from '../ai/copilot.controller.js';
import { copilotInput, copilotResponse } from '../ai/copilot.contract.js';
import { z } from 'zod';
import {
  ApiTokensController,
  ApprovedSpecsController,
} from '../api-tokens/api-tokens.module.js';
import {
  createTokenInput,
  tokenSummary,
  tokenCreated,
  approvedSpec,
} from '../api-tokens/token.contract.js';
import {
  schemas,
  envelope,
  obj,
  arr,
  str,
  uuid,
  int,
  en,
  text,
  nullable,
  draftFields,
  changeStatus,
  deliveryStatus,
  type Schema,
} from './schemas.js';
import { auditEventTypes } from '../audit/audit-read.policy.js';
const ref = (name: keyof typeof schemas): Schema =>
  ({ $ref: `#/components/schemas/${name}` }) as Schema;
const user = obj({ user: ref('User') });
const version = { expectedVersion: int(1) },
  changeVersion = { expectedVersion: int() };
const comment = { comment: text(10000) };
const createReq = { title: text(200), originalText: text(20000) };
const revision = {
  ...version,
  content: text(20000),
  acceptanceCriteria: { ...arr(text(1000)), maxItems: 100 },
};
const deliveryInput = {
  artifactUrl: {
    type: 'string',
    format: 'uri',
    pattern: '^https://',
    maxLength: 2048,
  } as Schema,
  summary: text(20000),
  evidenceLinks: {
    ...arr({
      type: 'string',
      format: 'uri',
      pattern: '^https://',
      maxLength: 2048,
    }),
    maxItems: 100,
  },
};
type Operation = {
  multipart?: boolean;
  response?: Schema;
  paged?: boolean;
  dashboard?: boolean;
  query?: Record<string, Schema>;
  body?: Schema;
  statuses?: number[];
  public?: boolean;
  projectToken?: boolean;
};
const r = (name: keyof typeof schemas): Operation => ({ response: ref(name) });
const list = (
  name: keyof typeof schemas,
  query?: Record<string, Schema>,
): Operation => ({ response: arr(ref(name)), paged: true, query });
const definitions: [Type, Record<string, Operation>][] = [
  [ProposalsController, proposalOperations],
  [ConnectionsController, connectionOperations],
  [ConnectionExchangeController, exchangeOperations],
  [DocumentsController, documentOperations],
  [
    ApiTokensController,
    {
      create: {
        body: z.toJSONSchema(createTokenInput, {
          io: 'input',
          target: 'openapi-3.0',
        }) as Schema,
        response: z.toJSONSchema(tokenCreated, {
          target: 'openapi-3.0',
        }) as Schema,
      },
      list: {
        response: arr(
          z.toJSONSchema(tokenSummary, { target: 'openapi-3.0' }) as Schema,
        ),
        paged: true,
      },
      revoke: {},
    },
  ],
  [
    ApprovedSpecsController,
    {
      list: {
        response: arr(
          z.toJSONSchema(approvedSpec, { target: 'openapi-3.0' }) as Schema,
        ),
        paged: true,
        projectToken: true,
      },
      detail: {
        response: z.toJSONSchema(approvedSpec, {
          target: 'openapi-3.0',
        }) as Schema,
        projectToken: true,
      },
    },
  ],
  [
    CopilotController,
    {
      message: {
        body: z.toJSONSchema(copilotInput, {
          io: 'input',
          target: 'openapi-3.0',
        }) as Schema,
        response: z.toJSONSchema(copilotResponse, {
          target: 'openapi-3.0',
        }) as Schema,
      },
    },
  ],
  [WorkingDraftsController, workingDraftOperations],
  [
    AiController,
    {
      assist: assistanceOperation,
      analyze: {
        body: obj(
          {
            expectedVersion: int(1),
            revisionId: uuid,
            includeClarifications: { type: 'boolean', default: true },
            draft: obj({
              content: text(20000),
              acceptanceCriteria: { ...arr(text(1000)), maxItems: 100 },
            }),
          },
          ['revisionId', 'includeClarifications', 'draft'],
        ),
        response: obj({
          analysisId: uuid,
          schemaVersion: { type: 'integer', enum: [1] },
          source: obj({
            requirementId: uuid,
            draftVersion: int(1),
            revisionId: nullable(uuid),
            clarificationIds: { ...arr(uuid), maxItems: 500 },
            includesUnsavedDraft: { type: 'boolean' },
            readAt: { type: 'string', format: 'date-time' },
          }),
          result: {
            ...obj({
              summary: text(1000),
              ...Object.fromEntries(
                [
                  'assumptions',
                  'openQuestions',
                  'acceptanceCriteria',
                  'risks',
                ].map((key) => [key, { ...arr(text(500)), maxItems: 10 }]),
              ),
            }),
            description:
              'Untrusted AI draft. Combined text length <=6000 UTF-16 code units. Not approval or an automatic business write.',
          },
        }),
      },
    },
  ],
  [
    AuthController,
    {
      register: {
        response: obj({ id: uuid }),
        body: obj({
          email: { ...str, format: 'email', maxLength: 254 },
          password: { ...str, minLength: 15, maxLength: 128 },
          displayName: text(100),
        }),
        public: true,
      },
      login: {
        response: user,
        body: obj({
          email: { ...str, format: 'email', maxLength: 254 },
          password: { ...str, minLength: 1, maxLength: 128 },
        }),
        public: true,
      },
      logout: {},
      me: { response: user },
    },
  ],
  [
    WorkspacesController,
    {
      list: list('Workspace'),
      create: { ...r('Workspace'), body: obj({ name: text(100) }) },
      members: list('WorkspaceMember'),
      add: {
        ...r('WorkspaceMember'),
        body: obj({ email: { ...str, format: 'email', maxLength: 254 } }),
        statuses: [200, 201],
      },
    },
  ],
  [
    ProjectsController,
    {
      list: list('Project', { workspaceId: uuid }),
      create: {
        ...r('ProjectCreated'),
        body: obj({
          workspaceId: uuid,
          name: text(100),
          baselineScope: text(20000),
        }),
      },
      detail: r('ProjectDetail'),
      add: {
        ...r('Person'),
        body: obj({ userId: uuid, role: en('DEVELOPER') }),
        statuses: [200, 201],
      },
      client: {
        ...r('Person'),
        body: obj({ email: { ...str, format: 'email', maxLength: 254 } }),
      },
    },
  ],
  [
    RequirementsController,
    {
      list: list('RequirementListItem'),
      create: { ...r('Requirement'), body: obj(createReq) },
      detail: r('RequirementDetail'),
      patch: {
        ...r('Requirement'),
        body: {
          ...obj({ ...version, ...createReq }, ['title', 'originalText']),
          anyOf: [{ required: ['title'] }, { required: ['originalText'] }],
        },
      },
      clarify: {
        ...r('ClarificationCreated'),
        body: {
          oneOf: [
            obj(
              {
                ...version,
                kind: en('QUESTION'),
                body: text(10000),
                parentId: { type: 'string', nullable: true, enum: [null] },
              },
              ['parentId'],
            ),
            obj({
              ...version,
              kind: en('ANSWER'),
              body: text(10000),
              parentId: uuid,
            }),
          ],
        },
      },
      revision: { ...r('RevisionCreated'), body: obj(revision) },
      history: list('Revision'),
      revisionDetail: r('RevisionDetail'),
      ready: { ...r('Requirement'), body: obj(version) },
    },
  ],
  [
    ChangesController,
    {
      list: list('ChangeListItem', {
        requirementId: uuid,
        status: changeStatus,
      }),
      versionDetail: r('VersionDetail'),
      create: { ...r('ChangeDraft'), body: obj({}) },
      detail: { ...r('ChangeDetail'), paged: true },
      patch: {
        ...r('ChangeDraft'),
        body: {
          ...obj(
            {
              ...changeVersion,
              ...draftFields,
              estimateHours: nullable({
                type: 'string',
                pattern: '^(0|[1-9][0-9]{0,5})(\\.[0-9]{1,2})?$',
              }),
            },
            Object.keys(draftFields),
          ),
          anyOf: Object.keys(draftFields).map((k) => ({ required: [k] })),
        },
      },
      submit: { ...r('SubmittedChange'), body: obj(changeVersion) },
      vendor: {
        ...r('ChangeDecision'),
        body: obj(
          {
            ...changeVersion,
            decision: en('APPROVED', 'REJECTED'),
            ...comment,
          },
          ['comment'],
        ),
      },
      client: {
        ...r('ChangeDecision'),
        body: obj(
          {
            ...changeVersion,
            decision: en('APPROVED', 'REJECTED'),
            ...comment,
          },
          ['comment'],
        ),
      },
      reopen: { ...r('ChangeDraft'), body: obj(changeVersion) },
    },
  ],
  [
    DeliveriesController,
    {
      detail: r('DeliveryDetail'),
      list: list('DeliveryListItem', {
        changeRequestId: uuid,
        status: deliveryStatus,
      }),
      create: { ...r('Delivery'), body: obj(deliveryInput, ['evidenceLinks']) },
      history: list('Delivery'),
      review: {
        ...r('Delivery'),
        body: {
          oneOf: [
            obj({ decision: en('ACCEPTED'), ...comment }, ['comment']),
            obj({ decision: en('CHANGES_REQUESTED'), ...comment }),
          ],
        },
      },
    },
  ],
  [
    AuditReadController,
    {
      list: list('AuditEvent', {
        entityType: en(
          'project',
          'requirement',
          'clarification',
          'requirement_revision',
          'change_request',
          'delivery',
          'api_token',
        ),
        entityId: uuid,
        eventType: en(...auditEventTypes),
      }),
    },
  ],
  [
    DashboardController,
    {
      read: {
        ...r('Dashboard'),
        paged: true,
        dashboard: true,
        query: {
          workspaceId: uuid,
          projectId: uuid,
          bucket: { ...en('mine', 'waiting', 'completed'), default: 'mine' },
        },
      },
    },
  ],
];
export async function createDocument() {
  const providers = new Set<Type>();
  for (const [controller, operations] of definitions) {
    const injections = Reflect.getMetadata(
      SELF_DECLARED_DEPS_METADATA,
      controller,
    ) as { param: Type }[];
    for (const dependency of injections ?? []) providers.add(dependency.param);
    for (const key of Object.getOwnPropertyNames(controller.prototype).filter(
      (k) => k !== 'constructor',
    )) {
      const descriptor = Object.getOwnPropertyDescriptor(
        controller.prototype,
        key,
      )!;
      if (Reflect.getMetadata(METHOD_METADATA, descriptor.value) === undefined)
        continue;
      const spec = operations[key];
      if (!spec)
        throw new Error(`Missing HTTP contract: ${controller.name}.${key}`);
      const decorate = (decorator: MethodDecorator) =>
        decorator(controller.prototype, key, descriptor);
      decorate(
        ApiOperation({
          operationId: `${controller.name.replace('Controller', '')}_${key}`,
          security: spec.public
            ? []
            : spec.projectToken
              ? [{ session: [] }, { projectToken: [] }]
              : [{ session: [] }],
        }),
      );
      const path = `${Reflect.getMetadata(PATH_METADATA, controller)}/${Reflect.getMetadata(PATH_METADATA, descriptor.value)}`;
      for (const match of path.matchAll(/:([a-zA-Z]+)/g))
        decorate(
          ApiParam({
            name: match[1],
            schema:
              controller === WorkingDraftsController && match[1] === 'kind'
                ? workingDraftKindParam
                : uuid,
          }),
        );
      const query = {
        ...(spec.paged
          ? {
              limit: { ...int(1, 100), default: 20 },
              offset: { ...int(0, Number.MAX_SAFE_INTEGER), default: 0 },
            }
          : {}),
        ...spec.query,
      };
      for (const [name, schema] of Object.entries(query))
        decorate(ApiQuery({ name, required: false, schema }));
      if (spec.body) decorate(ApiBody({ schema: spec.body }));
      if (spec.multipart) decorate(ApiConsumes('multipart/form-data'));
      const status =
        Reflect.getMetadata(HTTP_CODE_METADATA, descriptor.value) ??
        (Reflect.getMetadata(METHOD_METADATA, descriptor.value) === 1
          ? 201
          : 200);
      for (const code of spec.statuses ?? [status])
        decorate(
          ApiResponse({
            status: code,
            description: 'Success',
            ...(spec.response
              ? { schema: envelope(spec.response, spec.paged, spec.dashboard) }
              : {}),
          }),
        );
      for (const code of [
        400,
        401,
        403,
        404,
        409,
        422,
        429,
        500,
        ...(controller === AiController ||
        controller === CopilotController ||
        controller === DocumentsController ||
        controller === ConnectionsController ||
        controller === ConnectionExchangeController
          ? [413, 503]
          : []),
      ])
        decorate(
          ApiResponse({
            status: code,
            description: 'Safe error envelope',
            schema: ref('Error'),
          }),
        );
    }
    for (const key of Object.keys(operations))
      if (!Object.hasOwn(controller.prototype, key))
        throw new Error(`Obsolete contract: ${controller.name}.${key}`);
  }
  // No AppModule, DatabaseModule, AuthModule, Observe, .env or listeners. Only controller metadata is loaded.
  class OfflineModule {}
  Module({
    controllers: definitions.map(([controller]) => controller),
    providers: [...providers, DocumentUploadAdmission, RateLimitService].map(
      (provide) => ({ provide, useValue: {} }),
    ),
  })(OfflineModule);
  const app = await NestFactory.create(OfflineModule, { logger: false });
  try {
    const config = new DocumentBuilder()
      .setTitle('SpecBridge HTTP API')
      .setVersion('0.2')
      .addSecurity('projectToken', {
        type: 'http',
        scheme: 'bearer',
        description:
          'Project-bound approved_specs:read only. GET/HEAD approved-specs routes only; Cookie plus Bearer is rejected. This is not MCP HTTP OAuth.',
      })
      .addSecurity('session', {
        type: 'apiKey',
        in: 'cookie',
        name: 'specbridge_session',
        description:
          'HttpOnly session; production cookie name is configured by AuthConfig. Writes require trusted Origin, application/json and X-CSRF-Protection: 1.',
      })
      .build();
    const doc = SwaggerModule.createDocument(app, config);
    doc.components = {
      ...doc.components,
      schemas: { ...doc.components?.schemas, ...schemas },
    };
    return doc;
  } finally {
    await app.close();
  }
}
