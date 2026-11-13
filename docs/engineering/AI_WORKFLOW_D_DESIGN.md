# AI工作流 D — Codex 接入实现设计与当前进度

2026-11-13，AC-33/34，D-09增量；[总计划](AI_WORKFLOW_PLAN.md)。Owner确认、一次性交换、CLI安装/诊断/卸载、Web入口已实现，0008已获批并只在5434隔离库应用。完整[人工范例](AI_WORKFLOW_D_MANUAL.md)与[实际测试/限制](evidence/ai-workflow-d/README.md)。不改变原手动MCP方式，不进入E。

## 用户最终流程

1. Owner在项目“访问凭据”选择“连接本地Codex”，复制不含秘密的命令。首版仅Linux/WSL、本仓库已构建MCP与本地目标代码仓库。命令带可信API/Web origin与Project UUID，不带Token或任意脚本URL。
2. 安装器预检Node/Codex/目录，展示将增加的MCP和Skill位置。读取现有配置只在本地内存处理，不打印内容；保留其他MCP、模型、代理、权限、信任配置。名称冲突/修改过的托管块/Skill冲突安全停止，不能正则误改任意TOML；需完整解析与实际Codex解析验证。
3. 安装器绑定 `127.0.0.1:随机端口`，生成独立32-byte verifier/state和attempt UUID；只把challenge、state、attempt和port放进浏览器fragment。Web读取后立即移除fragment，不持久化；未登录可在当前页登录后重新启动连接，不把秘密放回跳转参数。
4. 浏览器展示服务器读取的项目名称/Owner身份、固定只读scope、期限、凭据名称与短连接指纹；提醒只确认本人刚发起的安装。确认按钮Session+CSRF创建授权记录，默认5分钟有效。对比指纹帮助辨认请求，不声称能抵抗诱骗Owner批准其他人的连接。
5. 浏览器导航至固定loopback路径，携带短期授权码、state、attempt；此处不是长期Token。listener核对Host/remoteAddress/path/参数数量/state/attempt，仅完成一次，输出固定文本不反射参数。拒绝远端地址、任意重定向、错误证明；关闭或5分钟超时关闭listener。
6. 安装器向可信API POST兑换，verifier/state/code只在请求body，redirect=manual、10秒/8KiB、无自动重试。API消费授权并创建Token；浏览器从不收到Token。失败或结果未知停止，Owner查看attempt及Token列表后明确撤销/重连。
7. Token写仓库外私有目录0700/文件0600；配置只引用launcher、目录及连接ID，Skill只包含通用指引和绑定的项目/服务器标识。使用真实MCP Client检查tools/list和批准规格目录读取，再通过单文件原子替换和失败回滚合并项目 `.codex/config.toml` 与 `.agents/skills/requirement-analyst`。配置不自动信任项目；使用者按Codex原有信任机制启动。没有批准规格时显示“连接成功，暂无批准版本”。
8. 重开Codex即可使用Skill。卸载只移除自身未被改动的配置/Skill和凭据文件；远端Token撤销继续由Owner原有入口完成，卸载不宣称远端已撤销。新Token已创建而本地安装失败时，明确报告需网页核对/撤销，不循环创建。

## 已注册API

| 接口 | 授权 / 请求 / 响应 |
|---|---|
| POST `/api/v1/projects/:id/agent-connections` | Owner Session+CSRF；grantId/challenge/challengeMethod=S256/state/callbackPort/name/expiresInDays。返回一次性code、grantId、到期时间和固定callback信息，不返回Token |
| GET `/api/v1/projects/:id/agent-connections` | Owner本人记录，limit默认20最大50；只有固定元数据、状态/Token ID，永不返回code/hash/verifier/state |
| GET `/api/v1/projects/:id/agent-connections/:grantId` | 同上，用于确认/兑换结果未知后查状态 |
| POST `/api/v1/projects/:id/agent-connections/:grantId/cancel` | Owner Session+CSRF；只取消未兑换授权，EXCHANGED不能伪装成已撤销Token |
| POST `/api/v1/agent-connections/exchange` | 专用无Cookie、无Bearer证明认证；grantId/projectId/code/verifier/state/callbackPort。成功后原Token创建响应的安全摘要及一次性token；400非法输入、401统一无效授权、409已消费/取消、429限流、503不可用，不暴露其他项目 |

固定`approved_specs:read`，不增加工具、scope或MCP OAuth discovery。新表和确认事务详见[0008审核包](AI_WORKFLOW_D_SQL_REVIEW.md)。使用独立专用exchange Guard，不修改全局CSRF原则，不用通用Public装饰器扩大可访问面。

## 实现与限制

- 0008新增1表/触发器，旧22表保持。Owner确认才入库，专用exchange Guard不使用Public。Workspace→Project→Session共享→Grant锁序；当前权限、原Session和过期重验；原Token事务命令、消费、审计一起提交。终态不可改、不同项目Token不能绑定，兑换回执保留。
- API请求4KiB，用户20/项目40每小时、本人项目5个活跃授权、兑换TCP peer60/分钟，另复用原Token创建限流。名单分页默认20最大50；只本人Owner元数据。未EXCHANGED记录在过期24小时后每次同项目授权最多清100条，没有后台全局清理。
- CLI预检Node/Codex、目录/完整TOML/Skill和私有凭据位置；HTTP使用Node原生http/https，避免fetch自动添加Sec-Fetch-Mode导致专用Guard拒绝；严格origin、10秒/8KiB、无重定向/自动重试。启动URL只带本机端口，授权proof进入Web fragment并立即移除。
- 私有文件0700/0600、当前UID、拒绝symlink/hardlink/宽权限/过期/非法JSON；不覆盖旧凭据。连接ID绑定API origin、项目和工作目录。launcher只把三项MCP环境传给既有stdio Server，模型看不到Token。
- 新增精确锁定smol-toml1.9.1用于完整解析、保留既有字节与语义；SDK Client2.4.0从dev移到runtime用于诊断。每目录只支持一个specbridge_托管连接，既有Skill不同/inline-table无法安全追加时拒绝。独占安装锁、比较旧值、临时文件原子替换、普通错误回滚；多文件异常退出不是原子事务，需先网页撤销再人工恢复残留。
- CLI重复执行只诊断，--status不发放，--uninstall只移除自有且未改的配置/Skill/凭据，不撤销远端Token。未知兑换和已发放后失败输出grantId引导Owner核对；配置不能恢复时不自动发新Token。
- 实际浏览器通过确认/未知查询/取消/刷新不重放、键盘与响应式；真实SDK Client→CLI launcher→stdio→Next Rewrite→Nest→PG读目录、撤销拒绝通过。MCP仍只有两工具，无背景读取或业务写入。
- Codex0.167.1在--ignore-user-config隔离模式下，临时CLI projects.trust_level未激活项目配置（实测）；Host测试因此解析生成的项目TOML，仅将同一非秘密MCP表作为CLI覆盖加载，保留实际复制的Skill和私有文件launcher。它不代表已验收真实用户的交互式信任/自动发现，后者明确保留H-20，绝不为测试修改真实用户配置。

## 安全审查边界

Token不进入网页、URL、argv、TOML、Skill或模型；一次性code只走短期loopback回调。Observe忽略连接路由、错误固定枚举，原始proof/正文不写日志。单实例限流重启清零，不能作为全局集群账本。私有文件不防同UID/root/恶意宿主，不是OS keychain；拒绝特殊symlink home布局。PKCE与指纹不防Owner主动确认钓鱼请求。开发5433/生产迁移、其他OS、独立读屏/安全签字及E全量未执行。

## 当前依据

本机Codex CLI `0.167.1`，实际检查了`codex --version`和`codex mcp --help`，未读取用户配置、认证文件或修改信任。沿用当前精确锁定MCP SDK2.4.0。

- [官方Codex MCP配置](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)：本地stdio可用command/args配置，本实现将用launcher读取私有凭据，不把Token写入env表。
- [官方项目配置](https://learn.chatgpt.com/docs/config-file/config-basic)：项目 `.codex/config.toml` 由信任策略控制；安装器不擅自修改信任。
- [官方Skill发现](https://learn.chatgpt.com/docs/build-skills)：使用项目 `.agents/skills`，保留现有Skill和正常发现方式。
- [RFC8252 §7.3/8.3](https://www.rfc-editor.org/rfc/rfc8252)：只在loopback IP和临时端口接收回调、完成后关闭。
- [RFC7636 §4](https://www.rfc-editor.org/rfc/rfc7636)：S256证明及高熵verifier；本轮契约测试包含标准向量。本项目只是自有本地Token引导，不宣称完整远程HTTP OAuth MCP授权。

补充依据：[官方非交互隔离模式](https://learn.chatgpt.com/docs/non-interactive-mode)、[项目配置与信任](https://learn.chatgpt.com/docs/config-file/config-advanced)；隔离模式的实际差异按上述实验记录，未通过试验的部分不作已验证承诺。

重复执行与--status会校验安装回执、自有TOML块及Skill摘要，再诊断MCP；配置或Skill已被改动时拒绝，保留用户改动，不把“凭据仍可用”误报成安装配置正常。
