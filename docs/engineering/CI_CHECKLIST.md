# 现有 GitHub Actions CI 检查要求

> 本仓库已经由项目负责人初始化 CI。不要直接替换 `.github/workflows/ci.yml`，先阅读现有配置。

- [ ] push(main) / pull_request 触发，PR 不需要生产 API 密钥。
- [ ] Node/pnpm 版本依据 `.nvmrc` / `packageManager`。
- [ ] `pnpm install --frozen-lockfile`，不要在 CI 自动修改 lockfile。
- [ ] Lint、Build、实际存在的测试全部运行。
- [ ] 需要数据库的集成测试使用临时 PostgreSQL 服务，不用线上 DB。
- [ ] 改动 API/数据库时增加测试；合并需要人工确认和绿色检查。
- [ ] 不暴露 `.env`、生产密钥或 DeepSeek API Key。

如需更改 CI，应建立单独 PR 并记录理由，不在搭建文档结构时无差别覆盖。
