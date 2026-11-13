# 工程工作仓库安装说明

> **历史记录**：本页用于最初导入文档增量包。当前仓库安装请阅读 [运行指南](../guides/GETTING_STARTED.md)，以下路径和合并步骤按当时环境保留。

这是增量文件包，**不是一个可独立运行的新项目**。不得重跑 `create-next-app`、`nest new` 或 `git init`。
适用于已存在的 `/home/lumi/projects/specbriage`，包含 v0.2 设计文档和新增工作规范。

1. 在已有仓库确认工作区干净，先建立 `chore/repo-workflow` 分支。
2. 解压本 ZIP 到独立临时目录，阅读新增/可能冲突的文件。
3. 使用 `unzip -n` 或审查后 `rsync --ignore-existing` 合并：**不要覆盖现有代码、README、CI、AGENTS.md**。
4. 如已存在 `AGENTS.md`，请人工合并规则；不要让两个版本并存。
5. 根据真实仓库脚本审查 `DEVELOPMENT.md` 与 `docs/STATE.md`，必要时修改事实状态。
6. 检查 `.env` 被忽略，运行工作区检查脚本、本地真实质量命令。
7. 只提交经过验证的文档/模板到 PR；工作流验证功能放到下一个独立 Issue/PR。

所有设计文档 v0.2 都是规范，不意味着模块已完成；`docs/STATE.md` 不应用于替代真实测试结果。
