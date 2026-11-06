# SpecBridge — Repository Agent Instructions

## Project and Scope
SpecBridge is a small-team software requirement, change-approval, and delivery-acceptance SaaS.
Approved product baseline: `docs/product/PRD.md` (v0.2), `docs/product/DECISIONS.md`.
Technology: pnpm Monorepo; Next.js Web; NestJS modular monolith; PostgreSQL + Drizzle;
DeepSeek is optional; MCP/Skills are P1 and must not bypass human approval.

## Required Reading (task-specific, NOT all docs by default)
1. Read `docs/STATE.md` and the relevant GitHub Issue.
2. Identify acceptance criteria from `docs/product/ACCEPTANCE.md`.
3. Read relevant documents using `docs/README.md` as an index:
   - Product or workflow: `docs/product/PRD.md`, `USER_STORIES.md`, `docs/architecture/STATE_MACHINES.md`
   - API/frontend: `docs/architecture/API.md`, `docs/ux/WIREFRAMES.md`
   - Database: `docs/architecture/DATA_MODEL.md`
   - Authentication/authorization: `docs/architecture/SECURITY.md`, related ADRs.
If documents conflict, STOP and report the inconsistency. Do not silently change the approved baseline.

## Architecture Boundaries
- `apps/web`: presentation, input, state; never enforce final permissions only in UI.
- `apps/api`: authorization, business rules, state transitions, transactions, audit.
- Database access through API's persistence layer only; MCP uses authorized API endpoints.
- Do not introduce microservices, Redis, Kafka, or Kubernetes unless separately approved.

## Non-negotiable Business Invariants
- Each project has at most one Client approval account; it must exist before formal change submission.
- An active change version is approved in order: Workspace Owner, then that Client.
- Submitted change versions and requirement revisions are immutable.
- No new requirement revision while a related approval is pending.
- Delivered artifacts link to an approved change version; accepted history remains auditable.
- AI suggestions never perform commercial approval; core P0 must work without AI.

## Security and Quality
- Never read secrets into responses or logs; never commit `.env` or credentials.
- Enforce workspace/project-scoped authorization server-side for every resource.
- Keep revisions and approval/audit writes transactionally consistent.
- Validate request input and AI output; handle conflicts and failures explicitly.
- Reuse current dependencies, scripts, frameworks, and testing style; inspect before editing.
- Changes require appropriate unit/integration/E2E tests. Run actual available checks.

## Working Agreement
1. Summarize the current Issue's scope, acceptance criteria, and files expected to change.
2. Propose a small implementation plan before modifying sensitive modules.
3. Implement only scoped code and tests; avoid unrelated refactors.
4. Review diff and run relevant quality checks; report exact commands and outcomes.
5. Update documentation when behavior/contract changes; update `docs/STATE.md` after verified milestones.
6. Do not independently create remote repos, merge to main, deploy, rotate secrets, or execute destructive migrations.
7. End with: changes, tests, risks, required human actions, suggested commit/PR summary.

## Code Review Rules
Flag tenant-scope leaks, bypassed human approvals, mutable frozen versions, missing transaction
boundaries, unaudited state changes, inadequate negative authorization tests, and insecure secrets.
