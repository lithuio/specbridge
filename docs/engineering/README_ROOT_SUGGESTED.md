# SpecBridge

AI-native requirement clarification, scope change approval, and delivery acceptance for small software development teams.

## Status
Product baseline v0.2 accepted (D-01–D-04). Application implementation ongoing; do not mistake design specifications for shipped features.

## Stack
pnpm Monorepo · Next.js · NestJS · PostgreSQL · Drizzle · Docker Compose · DeepSeek (optional)

## Quick Start
See [Local development](DEVELOPMENT.md) and the actual root `package.json` scripts.

## Documentation
See [Documentation index](../README.md).

## Development Process
See [Workflow](WORKFLOW.md), [Test strategy](TEST_STRATEGY.md), and root `AGENTS.md`.

## Safety
Secrets stay in local `.env`; only `.env.example` belongs in Git. User-facing production claims require actual validation.

> 这是根目录 README.md 的建议材料，需人工合并到现有 README，避免覆盖原有脚手架启动说明。
