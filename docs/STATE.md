# SpecBridge — Current Project State

> 更新时间：2026-11-03；此文件是当前工作记录，执行任务后应核对并更新。

## 当前里程碑
M1 — Repository Governance & Engineering Baseline（进行中）

## 已确认（由项目负责人报告或批准）
- M0：WSL2 原生 Docker Engine、pnpm Monorepo、Next.js、NestJS、PostgreSQL、DeepSeek API、GitHub CI 已完成本地初始化与验证。
- 产品设计：D-01～D-04 已确认；v0.2 设计文件已准备。

## 待验证 / 不能假定完成
- v0.2 文档是否已合入项目仓库。
- 根目录 `AGENTS.md`、PR/Issue 模板是否已配置。
- 当前 CI 是否通过最新分支与 PR；实际脚本以仓库为准。
- `GET /api/v1/health` 与 Web Rewrite 是否已实现（需检查代码）。

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
