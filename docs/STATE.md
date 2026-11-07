# SpecBridge — Current Project State

> 更新时间：2026-11-07；此文件是当前工作记录，执行任务后应核对并更新。

## 当前里程碑
M1 — Repository Governance & Engineering Baseline（进行中）

## 已确认（由项目负责人报告或批准）
- M0：WSL2 原生 Docker Engine、pnpm Monorepo、Next.js、NestJS、PostgreSQL、DeepSeek API、GitHub CI 已完成本地初始化与验证。
- 产品设计：D-01～D-04 已确认；v0.2 设计文件已准备。

## 待验证 / 不能假定完成
- v0.2 文档是否已合入项目仓库。
- 根目录 `AGENTS.md`、PR/Issue 模板是否已配置。
- 当前 CI 是否通过最新分支与 PR；实际脚本以仓库为准。

## 当前任务：Health Check & API Proxy
- [Issue #1](https://github.com/lithuio/specbridge/issues/1)：本地实现与验证完成，尚未提交、推送或合并；远程 CI / PR Review 未运行。
- 已新增公开 `GET /api/v1/health`，仅返回 `{"data":{"status":"ok"}}`；不依赖 DB/AI，不代表业务就绪。保留原 API `/`，未引入全局前缀。
- Web 将 `/api/v1/:path*` 代理至 `http://127.0.0.1:4000/api/v1/:path*`；代理地址目前固定为本地开发端口。
- PASS：`pnpm run test`（现有 API 单元测试）、`pnpm --filter specbridge-api test:e2e`（2 项）、`pnpm run lint`、`pnpm run build`（API + Web）。Web 尚无独立自动测试脚本。
- 执行记录：E2E 首次因沙箱端口监听 `EPERM` 失败，获准在沙箱外重跑通过；Build 首次同样失败，沙箱外重跑仍报错，移走 `.next` 缓存后在沙箱外完整构建通过。
- PASS：启动 `pnpm run dev:api` / `pnpm run dev:web`，使用 `curl --noproxy '*' --max-time 10 -i` 分别请求 `http://localhost:4000/api/v1/health`、`http://localhost:3000/api/v1/health`，均为 200、JSON 完全一致；原 API `/` 为 200 + `Hello World!`，Web `/` 为 200。
- PASS：停止本次 API 后代理返回 500，无虚假健康成功；本次启动的两个服务均已停止。复现步骤见 `engineering/DEVELOPMENT.md`。
- 下一步：人工审查 diff；获得后续授权后再进入提交、PR、CI 和合并流程。当前 CI 不包含 API E2E，不能标记 Issue 全流程验收完成。

## 当前建议任务
- 将 v0.2 设计文件与项目工作规范合入，不覆盖现有脚手架配置。
- 用一次真实 Issue → Branch → PR → CI → Merge 验证工作流。

## 下一里程碑
M2 — Database Schema → Auth/Session → Workspace/Project + RBAC

## 阻塞与开放问题
- 商业/非阻断决策 D-05～D-08 见 `product/DECISIONS.md`。
- 若 API、数据模型或状态机相互冲突，需先记录并由负责人决定。

## 更新约定
只有确认测试或合并事实后才把任务标记已完成；更新时附 Issue/PR 链接或 Commit SHA。
