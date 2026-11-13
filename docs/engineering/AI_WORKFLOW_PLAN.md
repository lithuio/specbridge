# AI 工作流升级 — 执行计划与交接

负责人于2026-11-13确认交互规划后明确要求“Implement the plan”。这是R08之后的产品增量；R08 Issue [#17](https://github.com/lithuio/specbridge/issues/17) 是已有实现的上下文，不把它的只读范围默默改写为已上线的新能力。当前分支 `feat/17-ai-agent-integration`，开工HEAD `6fb81b8`、工作区干净。无自动Commit/Push/PR/Merge/部署。

## 已确认产品边界

- PDF（可提取文本）、DOCX、Markdown/TXT，暂不做OCR、图片或旧DOC；每文件10 MiB、项目20个/100 MiB。项目先保存基础信息，第二步可选上传，失败仅重试文件。
- 背景默认供应方内部，Owner可明确共享给Client；上传和AI使用均有说明。自动检索当前任务有权资料的片段并附真实版本/页段来源，不保证每次全读。对客问题/规格只用共享资料，内部上下文不能直接转入对客生成。
- “帮我问清楚”和“帮我整理规格”独立；个人工作稿可跨天保存，不是正式Revision、问答或聊天历史。选择、编辑、删除、人工发布；改写先预览，保留未采用内容。
- Copilot围绕项目待办、澄清、规格、范围差异、提交前检查与交付清单。模型只读/准备提案，执行必须点击明确预览确认按钮。首批写操作仅发布问题、创建Revision和创建/更新商业草稿；正式Submit/Ready/审批/验收保持原人工入口。
- Codex安装器首版仅当前Linux/WSL、本仓库构建产物；复制不含秘密的指令，由安装器处理配置合并、Skill、浏览器Owner确认、PKCE/loopback与一次性交换、真实联通检查。凭据在仓库外0700/0600目录，由launcher注入MCP环境；不进入模型、TOML、URL和日志，不声称抵抗同系统用户读取。
- 外部MCP保持两个工具与 `approved_specs:read`，不读取新背景。普通CI使用Mock；真实DeepSeek/Host单独记录。无向量数据库、新微服务、自动外部消息或完整聊天记忆。

## 阶段与当前完成边界

| 阶段 | 可运行交付 | 当前状态 |
|---|---|---|
| A 分步需求辅助 | 两任务契约、个人工作稿、批量问题发布、人工Revision、版本冲突与Web | PASS：两任务、授权私有稿、原子发布/回执、Web及真实DeepSeek/受影响回归；0005仅隔离库已应用 |
| B 项目背景 | 私有文件、解析版本、角色可见性、检索及引用 | PASS：0006已获批隔离应用，文件/共享/检索/Web及真实DeepSeek验证完成 |
| C Copilot执行预览 | 工作稿衔接、白名单提案、确认与幂等执行 | PASS：0007获批隔离应用，四类本人提案/确认事务、Web与真实DeepSeek验证 |
| D Codex接入 | 本地安装器、浏览器授权、安全配置与真实Host | 实现完成：0008获批隔离应用，Owner/CLI/Web/MCP联通与受影响验证；Host结果和人工信任边界见D证据 |
| E 最终验证 | 真Provider/浏览器/Host、负面测试、完整回归与人工验收 | NOT STARTED |

0005已获明确批准并通过5434/specbridge_test迁移、约束/业务回归。阶段A的新API/Web已接通，旧ai-analysis兼容；开发5433/生产未由本轮迁移。B的[0006审核包](AI_WORKFLOW_B_SQL_REVIEW.md)随后获批并在同一隔离目标应用。C的[0007审核包](AI_WORKFLOW_C_SQL_REVIEW.md)随后获明确批准，现仅在5434应用；C功能及受影响验证完成。整体A–E尚未完成。

## A：已实现契约与行为

`mode/kind` 固定为 `clarify | specification`。新生成入口为 `POST /requirements/{id}/ai-assistance`，Session+CSRF；请求含expectedVersion、可选instruction≤2000及当前同类型draft。服务读取原文、项目初始参考、最新Revision和已有问答；Client不能请求specification。调用前后重验会话/项目/角色；输出纯建议，不写工作稿/业务/商业审计。复用现有Provider、JSON/Zod验证、预算、超时及日志策略。

- clarify输出：questions（每条body/reason）、assumptions、risks；可为空，不为凑数重复已回答问题。
- specification输出：content、acceptanceCriteria、openQuestions、assumptions、risks；不补成已确认的默认值。正文≤6000，数组各≤10项/500字，总文本≤12000；clarify总文本≤6000。用户草稿沿用正文20000/标准100×1000的业务限制，并增加总96 KiB校验。
- 原 `ai-analysis` 与五类结果完全兼容。只有新入口支持此任务契约，不悄悄改变旧客户端字段。

个人工作稿接口：`GET /requirements/{id}/working-drafts` 仅返回本人；`PUT /requirements/{id}/working-drafts/{kind}` 带draftId（create时null）、expectedDraftVersion（0=create）、baseRequirementVersion、body；`DELETE` 带draftId与expectedDraftVersion。每用户/需求/类型仅一份。Client仅可用clarify；Owner也不能读取别人个人工作稿。保存只增工作稿version，不增Requirement.draftVersion、不写正式Revision，不受“生成新Revision”的Pending限制；仍须当前项目写资格。旧base版本可保存，不能伪装成已核对最新业务状态。

发布接口为 `POST /requirements/{id}/working-drafts/{kind}/publish`：operationId、draftId、expectedDraftVersion、R04 expectedVersion，clarify另外明确选择questionIds；body和发布标记从服务端本人工作稿读取，拒绝客户端替换正文或伪造publication。发布前预览当前最新事实与差异，stale保留工作稿并人工重新核对。

事务沿用Workspace→Project→Requirement→WorkingDraft锁序，锁后重验资格。批量问题一次最多10条，每条复用原问答校验与审计，统一提交/回滚；正式Revision复用既有Pending/权限/版本编号和不可变写逻辑，不能跨事务串接HTTP。成功后同事务更新工作稿的已采用标记/version及发布回执；未选内容保持。

发布回执：operationId绑定当前actor/requirement/draft/version及规范化请求hash；同请求重放返回既有结果，复用ID更换参数拒绝。unique(draft_id,draft_version)防两个operationId消费同一工作稿版本。查询回执仍重新授权，仅本人可读，不用Token或日志查询。删除个人工作稿保留回执和正式业务历史。publication只保存当前工作稿条目的服务端采用状态；历史发布以回执和正式对象为准。新工作稿用新ID，不恢复旧版；所有更新/删除/发布同时比较ID与版本，防止删除重建后旧请求覆盖。

Web替换原集中面板，保留手动R04编辑器；两个入口各有生成/改写预览、个人保存与显式发布。个人草稿正文仅服务端私有表及当前组件内存，不落localStorage/聊天记录；切用户/撤权清理。超时、429、格式错误、保存结果未知和409有不同反馈；未知发布结果先查operationId，不自动创建新请求重发。兼容既有R07外观、键盘焦点与手机布局。

## B：已实现契约与行为

0006新增项目资料/版本/分段，已审SQL原字节应用5434/specbridge_test；当前21表/7迁移。四个业务入口：项目资料GET列表、POST专用multipart上传、PUT状态/共享CAS、GET指定版本分页纯文本。Session/Origin/CSRF/项目授权先于上传；Bearer拒绝。Owner和显式Developer上传/内部读取，仅Owner可明确共享、撤回或停用。

共享绑定READY版本；替换不自动共享。Client仅投影共享版本，内部标题、最新版本、失败和配额不会进入列表或检索。原件0700/0600以opaque UUID保存在仓库外；无原件下载。20文档身份含停用，100MiB含所有READY历史/在途预留；解析失败原件清理后才释放空间。列表最多50次历史加当前/共享版本，来源原链接继续授权验证。

文本PDF/DOCX/MD/TXT解析采用独立Linux Node进程；无用户环境/秘密。CPU10s、墙钟15s、V8 heap128MiB、50ms RSS采样超过256MiB终止、stdout3MiB；DOCX条目/展开量及PDF页数/文本/段数都有上限。不是完整OS沙箱，部署与依赖安全仍需人工Review。中断任务在下一次上传、超两分钟时清理；失败不阻断建项目与手动业务。

A的新ai-assistance自动检索shared-only片段（包括Owner），返回source.background真实ID/版本/页段链接；旧ai-analysis五字段保持兼容。Copilot新增search_project_background白名单只读工具，当前角色授权，最多4个1000字符片段；每次后续模型调用与最终输出前复核来源。背景不是批准事实，MCP仍只有两个approved_specs:read工具。

Web创建项目后可选上传、管理资料/替换/共享确认、按页段查看；409与未知响应保留文件、先刷新核对，不自动重放。R07 Shell保持。详见[人工测试](AI_WORKFLOW_B_MANUAL.md)、[工程证据](evidence/ai-workflow-b/README.md)与[截图](../ux/evidence/ai-workflow-b/README.md)。

## C：已实现契约与行为

0007已按审定SHA-256原字节仅应用5434；当前22表/8迁移。新增本人提案列表/准备/读取/编辑/删除/确认执行六操作，Session+CSRF，外部Token无权调用。四类任务为发布问题、创建Revision、创建/更新商业草稿；没有任何模型执行工具。

Copilot来源中的真实Requirement可打开准备区，也可从当前项目分页选择需求。问题/规格重新走A shared-only生成路径，内部聊天与工具正文不复制；可显式复制本人工作稿，绑定原ID/版本但不覆盖原稿。商业准备复制当前最新READY规格或同需求DRAFT；新建提案的工时/金额为空，更新提案保留已有草稿值，始终需要人工编辑核对。

个人提案独立CAS，正文组合80KiB；只存提案正文与服务端来源ID/版本，不存完整对话。本人每需求100份未执行上限（含过期），每用户30次/项目60次准备每小时，生成另受既有AI预算限制。列表未执行优先、20默认/50最大分页；24h有效期，不自动清理，已执行回执不可修改/删除。

确认再次检查当前项目资格、Session、Requirement/商业/工作稿/背景来源版本与共享状态；业务锁顺序保持Workspace→Project→Requirement→CR（需要时）→Proposal。取得聚合锁后复核并持有Session共享锁，避免锁等待中退出登录仍执行。R04原事务命令、R05抽取的原create/patch事务命令与业务审计/提案EXECUTED回执同事务。operationId同摘要重放只读回执，第二编号或换参数拒绝；唯一约束或审计失败回滚全部写入。

Web保存修改后才能打开确认区；执行仍绑定原业务/提案版本，409保留编辑，不自动重定基线。网络结果未知先查本人记录，保留同一操作编号；关闭重开Drawer不丢当前内存编辑，刷新后恢复已保存提案。任务展开时收起聊天输入，沿用R07 Shell/Drawer。人工验收见[C范例](AI_WORKFLOW_C_MANUAL.md)、[证据](evidence/ai-workflow-c/README.md)。

## D：已实现契约与行为

[D设计](AI_WORKFLOW_D_DESIGN.md)、[人工安装/恢复范例](AI_WORKFLOW_D_MANUAL.md)、[实际证据](evidence/ai-workflow-d/README.md)。0008按明确批准哈希原字节应用5434/specbridge_test，23表/9迁移/10触发器，原22表保持；开发5433/生产未应用0005–0008。

Owner网页确认后才创建5分钟连接授权，绑定原Session/项目/PKCE/state/port/Token期限。专用无Cookie/Bearer/Origin/Sec-Fetch兑换，授权与Session锁后重验；复用Token创建事务，与一次性消费及审计原子提交。未知结果查本人回执并取消/撤销，不循环发新Token；回执不可改，过期未兑换记录满24小时后可同项目有界清理。

CLI仅本机Linux/WSL、Node22与本仓库已构建产物。预检后打开loopback浏览器入口，人工确认，原生HTTP限时限长兑换，仓库外0700/0600凭据，真实MCP诊断，再保留原配置合并自有MCP/Skill。重复执行/--status只诊断，--uninstall只移除未改的自有配置与凭据，远端撤销仍在网页。新增smol-toml1.9.1完整解析；原SDK Client转运行依赖；没有新工具或scope。

单文件原子替换/普通失败回滚不保证跨文件崩溃一致性；中断残留需先撤销再人工恢复。项目配置仍受Codex原有信任控制，安装器不改用户信任；隔离Host以生成配置表作为CLI覆盖，真实用户信任后的自动加载单列H-20。D结束不自动进入E。

## 验证与迁移门槛

阶段A实际PASS：149单元、95数据库、33 AI/工作稿/Copilot HTTP；Auth16/RBAC13/Requirement9/reads9；工作台浏览器6、受影响R04/表单/Copilot浏览器12、真实DeepSeek浏览器1；API/Web类型/Lint/Build、41路径OpenAPI与迁移静态检查。精确命令、失败修复与边界见 [A证据](evidence/ai-workflow-a/README.md)。常规CI的既有AI套件自动包含新工作稿测试，浏览器套件已切换新入口；无真实Key依赖。

真实DeepSeek单独记录：4调用全部200，预留8192输出Tokens，实际7146输入/2216输出；人工生成Revision后Copilot只读来源验证通过。仅安全API子进程载入.env，合成项目在隔离库；没有开发数据访问、秘密输出、自动状态审批或远程操作。

B实际PASS：98数据库、155单元（含真实子进程监督）；背景HTTP9、AI33；Auth16/RBAC13/R049/Change8/Delivery7/reads9/Token9/MCP6；新增浏览器2、工作台6/Copilot4/Projects2。API/Web类型/Lint/Build、44路径契约、db:check和diff通过。真实背景DeepSeek1场景：4请求全200，9195输入/1640输出，8192预留；公开生成只引用共享资料，Owner内部Copilot2工具/4来源，Requirement不变。

SQL分阶段审核：0005哈希 `3ef341ab762315d265f03ec32ab40813e32eaeec6b308fb7279297c1f0153e7c`、0006哈希 `6efe3cd862b3167478ce1be8095a791379eae39852801d7f0616c635516272e4` 均只获批5434隔离验证。C的0007哈希 `a5a9788072b5caf6366a83f28197340f7709fb4a5c50fd2c181d21407bc66010` 已获批准，仅5434应用。D的0008随后按哈希获批，仅5434应用；开发/生产及未来SQL另行授权。

C实际PASS：100数据库、158单元、44 AI HTTP；Auth16/RBAC13/R049/R058/reads9；新增浏览器4、原Copilot4；真实DeepSeek1场景（4模型请求全200，6497输入/1815输出）。类型/Lint/Build、47路径契约及db:check通过。会话撤销与锁等待竞态已复现并修复。

D验证与当前风险以[D工程证据](evidence/ai-workflow-d/README.md)为准。E最终全量、远程CI、独立人工信任/安全/设备验收未运行。新审计27条公告（8high/13moderate/6low）与开工c0960b0基线完全相同、无新增ID；不能沿用B当时2条结果称当前审计干净，H-17已扩充待处置。详见[CHECKPOINT](AI_WORKFLOW_CHECKPOINT.md)与[Commit/PR草案](AI_WORKFLOW_PR_DRAFT.md)。无自动Commit/Push/PR/Merge/部署。
