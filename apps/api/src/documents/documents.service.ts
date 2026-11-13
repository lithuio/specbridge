import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import {
  DatabaseService,
  type DatabaseTransaction,
} from '../database/database.service.js';
import {
  AuthorizationRepository,
  type Connection,
} from '../authorization/authorization.repository.js';
import { AuditWriter } from '../audit/audit.module.js';
import {
  projectDocuments as documents,
  projectDocumentVersions as versions,
  projectDocumentChunks as chunks,
} from '../database/schema/index.js';
import {
  DOCUMENT_LIMITS,
  documentFailure,
  documentUpdate,
  mediaTypes,
  parseDocumentInput,
  uploadFields,
  type DocumentError,
} from './document.contract.js';
import { DocumentParser, ParseFailure } from './document.parser.js';
import { DocumentStorage } from './document.storage.js';

type Document = typeof documents.$inferSelect;
type Version = typeof versions.$inferSelect;
type Project = Awaited<ReturnType<AuthorizationRepository['project']>>;
export type BackgroundSource = {
  documentId: string;
  versionId: string;
  chunkId: string;
  versionNo: number;
  title: string;
  locatorKind: 'page' | 'paragraph';
  locatorStart: number;
  locatorEnd: number;
  href: string;
  content: string;
};

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AuthorizationRepository)
    private readonly authorization: AuthorizationRepository,
    @Inject(AuditWriter) private readonly audit: AuditWriter,
    @Inject(DocumentParser) private readonly parser: DocumentParser,
    @Inject(DocumentStorage) private readonly storage: DocumentStorage,
  ) {}
  async canUpload(actor: string, projectId: string) {
    const project = await this.authorization.project(actor, projectId);
    this.writer(project);
    return project;
  }
  private writer(project: Project) {
    if (project.projectRole === 'CLIENT' || project.status !== 'ACTIVE')
      throw new ForbiddenException();
  }
  private async lock(
    actor: string,
    projectId: string,
    tx: DatabaseTransaction,
  ) {
    const project = await this.authorization.projectWrite(actor, projectId, tx);
    this.writer(project);
    return project;
  }
  private async document(db: Connection, projectId: string, id: string) {
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.projectId, projectId), eq(documents.id, id)));
    if (!doc) throw new NotFoundException();
    return doc;
  }
  private async event(
    tx: DatabaseTransaction,
    project: Project,
    actor: string,
    docId: string,
    action: 'uploaded' | 'parsed' | 'failed' | 'updated',
    metadata: Record<string, unknown>,
  ) {
    await this.audit.write(tx, {
      workspaceId: project.workspaceId,
      projectId: project.id,
      actorId: actor,
      eventType: `project_document.${action}`,
      entityType: 'project_document',
      entityId: docId,
      metadata,
    });
  }
  private checkVersion(doc: Document, expected: number) {
    if (doc.version !== expected) documentFailure('DOCUMENT_STALE');
  }
  private async touch(
    tx: DatabaseTransaction,
    id: string,
    patch: Partial<Document> = {},
  ) {
    const [doc] = await tx
      .update(documents)
      .set({
        ...patch,
        version: sql`${documents.version}+1`,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, id))
      .returning();
    return doc;
  }
  private async fail(
    tx: DatabaseTransaction,
    project: Project,
    actor: string,
    version: Version,
    code: DocumentError,
  ) {
    // Delete before releasing quota; if cleanup fails the reservation remains PROCESSING for recovery.
    await this.storage.remove(version.blobId);
    await tx
      .update(versions)
      .set({ status: 'FAILED', errorCode: code, completedAt: new Date() })
      .where(eq(versions.id, version.id));
    await this.touch(tx, version.documentId);
    await this.event(tx, project, actor, version.documentId, 'failed', {
      versionId: version.id,
      code,
    });
  }
  async upload(
    actor: string,
    projectId: string,
    raw: unknown,
    file: Express.Multer.File | undefined,
  ) {
    const fields = parseDocumentInput(uploadFields, raw);
    if (!file || file.size < 1 || file.size > DOCUMENT_LIMITS.bytes)
      throw new BadRequestException();
    // Multer decodes multipart filenames as latin1. Recover browsers' UTF-8 without trusting a path.
    const decoded = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const name = (
      decoded.includes('\ufffd') ? file.originalname : decoded
    ).trim();
    if (
      !name ||
      Array.from(name).length > 255 ||
      Array.from(name).some(
        (c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127,
      ) ||
      /[/\\]/u.test(name)
    )
      throw new BadRequestException();
    const media =
      mediaTypes[extname(name).toLowerCase() as keyof typeof mediaTypes];
    if (
      !media ||
      ![
        media,
        'application/octet-stream',
        ...(media === 'text/markdown' ? ['text/plain'] : []),
      ].includes(file.mimetype)
    )
      throw new BadRequestException();
    const blobId = randomUUID();
    const reserved = await this.database.transaction(async (tx) => {
      const project = await this.lock(actor, projectId, tx);
      const interrupted = await tx
        .select()
        .from(versions)
        .where(
          and(
            eq(versions.projectId, projectId),
            eq(versions.status, 'PROCESSING'),
          ),
        );
      for (const old of interrupted) {
        if (Date.now() - old.createdAt.getTime() < 120_000)
          documentFailure('DOCUMENT_PROCESSING');
        await this.fail(tx, project, actor, old, 'INTERRUPTED');
      }
      const [quota] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(documents)
        .where(eq(documents.projectId, projectId));
      const [used] = await tx
        .select({
          bytes: sql<number>`coalesce(sum(${versions.sizeBytes}),0)::int`,
        })
        .from(versions)
        .where(
          and(
            eq(versions.projectId, projectId),
            sql`${versions.status} IN ('PROCESSING','READY')`,
          ),
        );
      if (
        (!fields.documentId && quota.count >= DOCUMENT_LIMITS.documents) ||
        used.bytes + file.size > DOCUMENT_LIMITS.projectBytes
      )
        documentFailure('DOCUMENT_QUOTA', 422);
      let doc: Document;
      if (fields.documentId) {
        doc = await this.document(tx, projectId, fields.documentId);
        this.checkVersion(doc, fields.expectedVersion!);
        if (doc.status !== 'ACTIVE') documentFailure('DOCUMENT_UNAVAILABLE');
        doc = await this.touch(tx, doc.id);
      } else {
        [doc] = await tx
          .insert(documents)
          .values({
            projectId,
            title: Array.from(name).slice(0, 200).join(''),
            createdBy: actor,
          })
          .returning();
      }
      const [last] = await tx
        .select({ versionNo: versions.versionNo })
        .from(versions)
        .where(eq(versions.documentId, doc.id))
        .orderBy(desc(versions.versionNo))
        .limit(1);
      const [version] = await tx
        .insert(versions)
        .values({
          projectId,
          documentId: doc.id,
          versionNo: (last?.versionNo ?? 0) + 1,
          originalName: name,
          mediaType: media,
          sizeBytes: file.size,
          blobId,
          sha256: createHash('sha256').update(file.buffer).digest('hex'),
          createdBy: actor,
        })
        .returning();
      await this.event(tx, project, actor, doc.id, 'uploaded', {
        versionId: version.id,
        mediaType: media,
        sizeBytes: file.size,
      });
      return { doc, version };
    });
    let failure: DocumentError | undefined;
    try {
      await this.storage.put(blobId, file.buffer);
      const result = await this.parser.parse(file.buffer, media);
      await this.database.transaction(async (tx) => {
        const project = await this.lock(actor, projectId, tx);
        const doc = await this.document(tx, projectId, reserved.doc.id);
        const [v] = await tx
          .select()
          .from(versions)
          .where(eq(versions.id, reserved.version.id))
          .for('update');
        if (doc.status !== 'ACTIVE' || v.status !== 'PROCESSING')
          documentFailure('DOCUMENT_UNAVAILABLE');
        await tx.insert(chunks).values(
          result.chunks.map((chunk, i) => ({
            ...chunk,
            projectId,
            documentId: doc.id,
            versionId: v.id,
            ordinal: i + 1,
          })),
        );
        await tx
          .update(versions)
          .set({
            status: 'READY',
            completedAt: new Date(),
            parserVersion: result.parserVersion,
            extractedChars: result.chunks.reduce(
              (n, c) => n + Array.from(c.content).length,
              0,
            ),
          })
          .where(eq(versions.id, v.id));
        await this.touch(tx, doc.id, { currentVersionId: v.id }); // sharedVersionId is deliberately unchanged.
        await this.event(tx, project, actor, doc.id, 'parsed', {
          versionId: v.id,
          chunks: result.chunks.length,
        });
      });
    } catch (error) {
      failure = error instanceof ParseFailure ? error.code : 'PARSE_FAILED';
      // Cleanup is system maintenance of an already reserved upload. Do not require the actor
      // still to be a member, but serialize with the same workspace/project lock order.
      await this.database.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT id FROM workspaces WHERE id=(SELECT workspace_id FROM projects WHERE id=${projectId}) FOR UPDATE`,
        );
        const p = await tx.execute<{ workspaceId: string }>(
          sql`SELECT workspace_id AS "workspaceId" FROM projects WHERE id=${projectId} FOR UPDATE`,
        );
        const [v] = await tx
          .select()
          .from(versions)
          .where(eq(versions.id, reserved.version.id))
          .for('update');
        if (v.status === 'PROCESSING')
          await this.fail(
            tx,
            { id: projectId, workspaceId: p.rows[0].workspaceId } as Project,
            actor,
            v,
            failure!,
          );
      });
    }
    // Never return file metadata if membership was revoked while the parser was running.
    await this.canUpload(actor, projectId);
    return {
      documentId: reserved.doc.id,
      versionId: reserved.version.id,
      status: failure ? ('FAILED' as const) : ('READY' as const),
      errorCode: failure ?? null,
    };
  }
  async update(actor: string, projectId: string, id: string, raw: unknown) {
    const input = parseDocumentInput(documentUpdate, raw);
    return this.database.transaction(async (tx) => {
      const project = await this.lock(actor, projectId, tx);
      if (project.projectRole !== 'OWNER') throw new ForbiddenException();
      const doc = await this.document(tx, projectId, id);
      this.checkVersion(doc, input.expectedVersion);
      if (input.sharedVersionId) {
        const [v] = await tx
          .select({ id: versions.id })
          .from(versions)
          .where(
            and(
              eq(versions.id, input.sharedVersionId),
              eq(versions.documentId, doc.id),
              eq(versions.projectId, projectId),
              eq(versions.status, 'READY'),
            ),
          );
        if (!v) throw new NotFoundException();
        if ((input.status ?? doc.status) !== 'ACTIVE')
          documentFailure('DOCUMENT_UNAVAILABLE');
      }
      const patch: Partial<Document> = {};
      if (input.status) patch.status = input.status;
      if (input.sharedVersionId !== undefined)
        patch.sharedVersionId = input.sharedVersionId;
      if (input.status === 'INACTIVE') patch.sharedVersionId = null;
      const updated = await this.touch(tx, id, patch);
      await this.event(tx, project, actor, id, 'updated', {
        version: updated.version,
        status: updated.status,
        sharedVersionId: updated.sharedVersionId,
      });
      return { id, version: updated.version };
    });
  }
  private metadata(v: Version) {
    return {
      id: v.id,
      versionNo: v.versionNo,
      originalName: v.originalName,
      mediaType: v.mediaType,
      sizeBytes: v.sizeBytes,
      status: v.status,
      errorCode: v.errorCode,
      extractedChars: v.extractedChars,
      createdAt: v.createdAt,
    };
  }
  async list(actor: string, projectId: string) {
    return this.database.db.transaction(
      async (tx) => {
        const project = await this.authorization.project(actor, projectId, tx);
        const client = project.projectRole === 'CLIENT';
        const rows = await tx
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.projectId, projectId),
              client
                ? sql`${documents.status}='ACTIVE' AND ${documents.sharedVersionId} IS NOT NULL`
                : undefined,
            ),
          )
          .orderBy(desc(documents.updatedAt), desc(documents.id))
          .limit(20);
        const items = [];
        for (const doc of rows) {
          const history = await tx
            .select()
            .from(versions)
            .where(
              and(
                eq(versions.documentId, doc.id),
                client ? eq(versions.id, doc.sharedVersionId!) : undefined,
              ),
            )
            .orderBy(desc(versions.versionNo))
            .limit(client ? 1 : 51);
          if (client) {
            const shared = history[0];
            if (!shared || shared.status !== 'READY') continue;
            items.push({
              id: doc.id,
              title: shared.originalName,
              sharedVersion: this.metadata(shared),
            });
          } else {
            const historyTruncated = history.length > 50;
            if (historyTruncated) history.pop();
            const pointers = [doc.currentVersionId, doc.sharedVersionId].filter(
              (id): id is string => !!id && !history.some((v) => v.id === id),
            );
            if (pointers.length)
              history.push(
                ...(await tx
                  .select()
                  .from(versions)
                  .where(
                    and(
                      eq(versions.documentId, doc.id),
                      inArray(versions.id, pointers),
                    ),
                  )),
              );
            items.push({
              id: doc.id,
              title: doc.title,
              status: doc.status,
              version: doc.version,
              currentVersionId: doc.currentVersionId,
              sharedVersionId: doc.sharedVersionId,
              versions: history.map((v) => this.metadata(v)),
              historyTruncated,
            });
          }
        }
        return {
          projectRole: project.projectRole,
          writable: !client && project.status === 'ACTIVE',
          items,
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  private async visibleVersion(
    db: Connection,
    actor: string,
    projectId: string,
    documentId: string,
    versionId: string,
    sharedOnly = false,
  ) {
    const project = await this.authorization.project(actor, projectId, db);
    const doc = await this.document(db, projectId, documentId);
    if (
      doc.status !== 'ACTIVE' ||
      ((sharedOnly || project.projectRole === 'CLIENT') &&
        doc.sharedVersionId !== versionId)
    )
      throw new NotFoundException();
    const [v] = await db
      .select()
      .from(versions)
      .where(
        and(
          eq(versions.projectId, projectId),
          eq(versions.documentId, documentId),
          eq(versions.id, versionId),
          eq(versions.status, 'READY'),
        ),
      );
    if (!v) throw new NotFoundException();
    return v;
  }
  async read(
    actor: string,
    projectId: string,
    documentId: string,
    versionId: string,
    page: { limit: number; offset: number },
  ) {
    return this.database.db.transaction(
      async (tx) => {
        const v = await this.visibleVersion(
          tx,
          actor,
          projectId,
          documentId,
          versionId,
        );
        const rows = await tx
          .select({
            id: chunks.id,
            ordinal: chunks.ordinal,
            locatorKind: chunks.locatorKind,
            locatorStart: chunks.locatorStart,
            locatorEnd: chunks.locatorEnd,
            content: chunks.content,
          })
          .from(chunks)
          .where(eq(chunks.versionId, v.id))
          .orderBy(chunks.ordinal)
          .limit(page.limit + 1)
          .offset(page.offset);
        return {
          documentId,
          version: this.metadata(v),
          chunks: rows.slice(0, page.limit),
          hasMore: rows.length > page.limit,
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  async retrieve(
    actor: string,
    projectId: string,
    query: string,
    sharedOnly: boolean,
  ): Promise<BackgroundSource[]> {
    return this.database.db.transaction(
      async (tx) => {
        const project = await this.authorization.project(actor, projectId, tx);
        const shared = sharedOnly || project.projectRole === 'CLIENT';
        const terms = [
          ...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{2,24}/gu) ?? []),
        ].slice(0, 12);
        // Fixed parameterized expressions, never model-provided SQL or a tenant ID in tool args.
        const score = terms.length
          ? sql.join(
              terms.map(
                (t) =>
                  sql`CASE WHEN strpos(lower(${chunks.content}),${t})>0 THEN 1 ELSE 0 END`,
              ),
              sql` + `,
            )
          : sql`CAST(0 AS integer)`;
        const result = await tx
          .select({
            documentId: documents.id,
            versionId: versions.id,
            chunkId: chunks.id,
            versionNo: versions.versionNo,
            title: versions.originalName,
            locatorKind: chunks.locatorKind,
            locatorStart: chunks.locatorStart,
            locatorEnd: chunks.locatorEnd,
            content: chunks.content,
          })
          .from(documents)
          .innerJoin(
            versions,
            and(
              eq(
                versions.id,
                shared ? documents.sharedVersionId : documents.currentVersionId,
              ),
              eq(versions.projectId, documents.projectId),
            ),
          )
          .innerJoin(chunks, eq(chunks.versionId, versions.id))
          .where(
            and(
              eq(documents.projectId, projectId),
              eq(documents.status, 'ACTIVE'),
              eq(versions.status, 'READY'),
            ),
          )
          .orderBy(
            desc(score),
            desc(documents.updatedAt),
            documents.id,
            chunks.ordinal,
          )
          .limit(4);
        return result.map((r) => ({
          ...r,
          content: r.content.slice(0, 1000),
          href: `/app/projects/${projectId}/documents/${r.documentId}/versions/${r.versionId}`,
        }));
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  // Used while the caller retains the Project lock; sharing/revocation uses the same lock.
  async checkSharedReference(
    tx: DatabaseTransaction,
    actor: string,
    projectId: string,
    documentId: string,
    versionId: string,
  ) {
    await this.visibleVersion(
      tx,
      actor,
      projectId,
      documentId,
      versionId,
      true,
    );
  }
  async reauthorizeSources(
    actor: string,
    projectId: string,
    sources: BackgroundSource[],
    sharedOnly: boolean,
  ) {
    return this.database.db.transaction(
      async (tx) => {
        for (const source of sources)
          await this.visibleVersion(
            tx,
            actor,
            projectId,
            source.documentId,
            source.versionId,
            sharedOnly,
          );
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
}
