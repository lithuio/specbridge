import { z } from "zod";

export const listInput = z.strictObject({
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).max(10000).default(0),
});
export const detailInput = z.strictObject({ versionId: z.uuid() });
const criteria = z.array(z.string().max(1000)).max(100);
// Deliberate independent wire contract: the MCP runtime never imports Nest or a DB module.
// The real Nest/PG integration test detects drift against the authorized API.
export const approvedSpec = z.strictObject({
  projectId: z.uuid(),
  requirementId: z.uuid(),
  changeRequestId: z.uuid(),
  versionId: z.uuid(),
  versionNo: z.number().int().min(1),
  submittedAt: z.iso.datetime(),
  approvedAt: z.iso.datetime(),
  approvedScope: z.strictObject({
    summary: z.string().max(20000),
    acceptanceCriteria: criteria,
  }),
  referencedRequirement: z.strictObject({
    revisionId: z.uuid(),
    revisionNo: z.number().int().min(1),
    content: z.string().max(20000),
    acceptanceCriteria: criteria,
    createdAt: z.iso.datetime(),
  }),
});
export const pageMeta = z.strictObject({
  requestId: z.uuid(),
  limit: z.number().int().min(1).max(100),
  offset: z.number().int().min(0),
  hasMore: z.boolean(),
});
export const apiList = z.strictObject({
  data: z.array(approvedSpec).max(50),
  meta: pageMeta,
});
export const apiDetail = z.strictObject({
  data: approvedSpec,
  meta: z.strictObject({ requestId: z.uuid() }),
});
const source = z.strictObject({
  apiPath: z.string(),
  requestId: z.uuid(),
  readAt: z.iso.datetime(),
});
export const listOutput = z.strictObject({
  projectId: z.uuid(),
  source,
  items: z
    .array(
      z.strictObject({
        requirementId: z.uuid(),
        changeRequestId: z.uuid(),
        versionId: z.uuid(),
        versionNo: z.number().int().min(1),
        revisionId: z.uuid(),
        revisionNo: z.number().int().min(1),
        approvedAt: z.iso.datetime(),
        scopePreview: z.string().max(300),
        previewTruncated: z.boolean(),
      }),
    )
    .max(50),
  page: z.strictObject({
    limit: z.number().int(),
    offset: z.number().int(),
    hasMore: z.boolean(),
  }),
});
export const detailOutput = z.strictObject({
  specification: approvedSpec,
  source,
});
