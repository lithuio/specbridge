# SpecBridge — Local Development

## 已有环境（由项目负责人验证）
- Ubuntu 22.04 on WSL2，工作目录 `/home/lumi/projects/specbriage`
- 本机原生 Docker Engine；PostgreSQL 17 Docker Compose 容器
- pnpm Monorepo：`apps/web`, `apps/api`; MCP 未来作为独立应用（P1）
- DeepSeek API 密钥仅保存在本地 `.env`，不提交。

## 启动（在项目根目录）
```bash
cd /home/lumi/projects/specbriage
nvm use
pnpm install --frozen-lockfile
pnpm run db:up
pnpm run dev:api    # 终端 B；默认 http://localhost:4000
pnpm run dev:web    # 终端 C；默认 http://localhost:3000
```
注：以上脚本名称来自 M0 约定；如果实际 `package.json` 不同，以仓库真实脚本为准。

## 常见检查
```bash
git status --short
pnpm run lint
pnpm run build
pnpm run test
pnpm run db:logs
```
`pnpm run test` 仅运行已配置的测试；若某个应用尚无测试，应在 Issue 中记录并配置，不得称其已通过。

## 服务接口
- 前端：`http://localhost:3000`
- 后端：`http://localhost:4000`
- PostgreSQL：`127.0.0.1:5433`（容器内 `db:5432`）
- 计划接口：`/api/v1`；前端同源代理是否实现需按代码验证。

## 秘钥与迁移
- `.env` 和私密配置不得提交，仓库仅保留 `.env.example`。
- Drizzle SQL Migration 必须先人工审查，再对本地 DB 执行。
- 不执行 `docker compose down -v`、数据库清空或任何生产部署，除非明确批准。
