## Background
SpecBridge 已有 Next.js 和 NestJS 两个可启动应用，需验证前端同源代理到 API 的基本连通性。此 Issue 用于演练完整软件工程工作流，不属于核心业务实现。

## Scope
- 检查现有 API 前缀和 Health Endpoint；不存在则实现 `GET /api/v1/health`。
- 返回一个最小非敏感 JSON，例如 `{ "status": "ok", "service": "specbridge-api" }`。
- 检查 Next.js `rewrites`，让 `GET http://localhost:3000/api/v1/health` 代理到 NestJS。
- 对此 API 增加至少一个可自动运行的测试，并记录本地验证步骤。
- 若仓库已有同等功能，基于现状补测试/文档，不重复写相同实现。

## Out of Scope
- 不做 Auth、Workspace、ORM Migration、DeepSeek 调用。
- 不创建新的微服务或基础设施。
- 不在生产环境暴露敏感系统内部信息。

## Acceptance Criteria
- [ ] `curl -i http://localhost:4000/api/v1/health` 返回 HTTP 200 与最小 JSON。
- [ ] `curl -i http://localhost:3000/api/v1/health` 在开发环境下得到等价数据。
- [ ] 新增/已有 API 测试可实际通过；不会测试时按仓库框架补齐。
- [ ] Lint、Build、实际存在的测试均运行并记录结果。
- [ ] 通过 PR、CI、Review 完成合并；不修改业务设计基线。

## Human Review
重点检查是否已存在相同路由、Rewrite 是否影响正常 Web API 路由、测试是否真实运行、有没有不必要的依赖。
