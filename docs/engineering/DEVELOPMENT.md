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
以上脚本已按仓库 `package.json` 核对。仅验证健康检查时无需 `pnpm run db:up`，也无需数据库或 AI 凭据。

## 常见检查
```bash
git status --short
pnpm run lint
pnpm run build
pnpm run test
pnpm --filter specbridge-api test:e2e
pnpm run db:logs
```
`pnpm run test` 当前只运行 API 单元测试；API E2E 需要单独运行上述命令，Web 尚无自动测试脚本。当前 CI 也未执行 API E2E，不得将 CI 成功视为代理链路已验证。

## 服务接口
- 前端：`http://localhost:3000`
- 后端：`http://localhost:4000`
- PostgreSQL：`127.0.0.1:5433`（容器内 `db:5432`）
- API 前缀约定：`/api/v1`；目前健康检查使用显式路径，尚未设置 NestJS 全局前缀。

## 健康检查与 Web 代理

启动 API 和 Web 后，在第三个终端执行：

```bash
curl --noproxy '*' --max-time 10 -i http://localhost:4000/api/v1/health
curl --noproxy '*' --max-time 10 -i http://localhost:3000/api/v1/health
```

两者应返回 HTTP 200、`application/json` 和相同的 `{"data":{"status":"ok"}}`。
这是无需认证的进程存活检查，不代表数据库、AI 或业务流程就绪；响应不包含环境变量、版本或主机信息。

Next.js 将 `/api/v1/:path*` 代理到固定开发地址 `http://127.0.0.1:4000/api/v1/:path*`，普通 Rewrite 在已有文件路由之后匹配，不影响 Web 首页。修改 API 端口或部署到独立容器时，需要调整代理目标并重新启动/构建 Web。

回归检查：Web `/` 应返回 200，API `/` 仍返回 `Hello World!`。停止本次启动的 API 后，代理健康检查应失败而非返回健康成功（当前开发环境返回 HTTP 500）；完成后停止本次启动的 Web。自动 E2E 验证真实 Nest 路由，以上双服务检查验证实际 Rewrite，二者不能相互替代。

## 秘钥与迁移
- `.env` 和私密配置不得提交，仓库仅保留 `.env.example`。
- Drizzle SQL Migration 必须先人工审查，再对本地 DB 执行。
- 不执行 `docker compose down -v`、数据库清空或任何生产部署，除非明确批准。
