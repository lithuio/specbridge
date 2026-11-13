import {
  Body,
  type CallHandler,
  Controller,
  type ExecutionContext,
  Get,
  Header,
  Inject,
  Injectable,
  type NestInterceptor,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
  HttpException,
} from '@nestjs/common';
import type {} from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { finalize } from 'rxjs';
import { z } from 'zod';
import type { AuthRequest } from '../auth/auth.types.js';
import { RateLimitService } from '../auth/rate-limit.service.js';
import { DocumentsService } from './documents.service.js';
import {
  DOCUMENT_LIMITS,
  documentPage,
  parseDocumentInput,
} from './document.contract.js';

@Injectable()
export class DocumentUploadAdmission implements NestInterceptor {
  private active = 0;
  constructor(
    @Inject(DocumentsService) private readonly documents: DocumentsService,
    @Inject(RateLimitService) private readonly limits: RateLimitService,
  ) {}
  async intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const id = parseDocumentInput(
      z.uuid().transform((v) => v.toLowerCase()),
      req.params.projectId,
    );
    await this.documents.canUpload(req.auth!.user.id, id);
    this.limits.consume(`document-user:${req.auth!.user.id}`, 50, 3600_000);
    this.limits.consume(`document-project:${id}`, 60, 3600_000);
    if (this.active >= 2) throw new HttpException({ retryAfter: 30 }, 429);
    this.active++;
    // Bound slow multipart clients as well as parser execution; no body accepted before auth.
    const timer = setTimeout(() => req.destroy(), 45_000);
    return next.handle().pipe(
      finalize(() => {
        clearTimeout(timer);
        this.active--;
      }),
    );
  }
}

@Controller('api/v1/projects/:projectId/documents')
export class DocumentsController {
  constructor(
    @Inject(DocumentsService) private readonly service: DocumentsService,
  ) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  async list(
    @Req() req: AuthRequest,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
  ) {
    return {
      data: await this.service.list(req.auth!.user.id, projectId.toLowerCase()),
      meta: { requestId: req.requestId },
    };
  }
  @Post()
  @Header('Cache-Control', 'no-store')
  @UseInterceptors(
    DocumentUploadAdmission,
    FileInterceptor('file', {
      limits: {
        fileSize: DOCUMENT_LIMITS.bytes,
        files: 1,
        fields: 2,
        fieldSize: 64,
        fieldNameSize: 32,
        parts: 3,
      },
    }),
  )
  async upload(
    @Req() req: AuthRequest,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() fields: unknown,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return {
      data: await this.service.upload(
        req.auth!.user.id,
        projectId.toLowerCase(),
        fields,
        file,
      ),
      meta: { requestId: req.requestId },
    };
  }
  @Put(':documentId')
  @Header('Cache-Control', 'no-store')
  async update(
    @Req() req: AuthRequest,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Body() body: unknown,
  ) {
    return {
      data: await this.service.update(
        req.auth!.user.id,
        projectId.toLowerCase(),
        documentId.toLowerCase(),
        body,
      ),
      meta: { requestId: req.requestId },
    };
  }
  @Get(':documentId/versions/:versionId')
  @Header('Cache-Control', 'no-store')
  async read(
    @Req() req: AuthRequest,
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Param('versionId', new ParseUUIDPipe()) versionId: string,
    @Query() query: unknown,
  ) {
    return {
      data: await this.service.read(
        req.auth!.user.id,
        projectId.toLowerCase(),
        documentId.toLowerCase(),
        versionId.toLowerCase(),
        parseDocumentInput(documentPage, query),
      ),
      meta: { requestId: req.requestId },
    };
  }
}
