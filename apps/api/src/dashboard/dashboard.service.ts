import { Inject, Injectable } from '@nestjs/common';
import { AuthorizationRepository } from '../authorization/authorization.repository.js';
import { DashboardRepository } from './dashboard.repository.js';
import type { DashboardDto } from './dashboard.dto.js';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DashboardRepository)
    private readonly repository: DashboardRepository,
    @Inject(AuthorizationRepository)
    private readonly authorization: AuthorizationRepository,
  ) {}
  read(actor: string, input: DashboardDto) {
    return this.repository.database.db.transaction(
      async (tx) => {
        actor = actor.toLowerCase();
        if (input.projectId)
          await this.authorization.project(
            actor,
            input.projectId.toLowerCase(),
            tx,
          );
        const result = await this.repository.read(tx, actor, input);
        return {
          data: {
            scope: {
              workspaceId: input.workspaceId?.toLowerCase() ?? null,
              projectId: input.projectId?.toLowerCase() ?? null,
            },
            summary: result.summary,
            items: result.items.slice(0, input.limit),
          },
          meta: {
            limit: input.limit,
            offset: input.offset,
            hasMore: result.items.length > input.limit,
            asOf: result.asOf,
          },
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
}
