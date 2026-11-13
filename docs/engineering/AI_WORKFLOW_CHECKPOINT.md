# AI工作流升级 — E完成交接

2026-11-13。负责人“继续阶段E”授权最终集成验证。分支`feat/17-ai-agent-integration`、开工及结束HEAD`e9e5efd`；A–D已由负责人提交，开工工作区干净。本轮测试/编排/证据/文档未提交。没有Commit/Push/PR/Merge/部署，停止在E。

## 完成的工作

未扩大业务范围、未修改生产业务代码/依赖/SQL。补连接授权兑换Token到真实stdio批准规格读取、跨项目与撤销拒绝的集成测试，连接套件10→11项；HTTP聚合补AI44项、连接脚本显式构建MCP。修正真实AI命令文件正则误匹配三个测试的问题；真实Provider/浏览器支持独立证据目录，并补有界白名单诊断，仍不记录正文/工具参数/原异常/秘密。CI自动纳入新增覆盖，不依赖真实Provider。

## 验证与失败记录

[E证据与精确命令](evidence/ai-workflow-e/README.md)、[机器可读结果](evidence/ai-workflow-e/verification.json)、[截图](../ux/evidence/ai-workflow-e/README.md)。

- PASS：API161+MCP28单元、102数据库、141 HTTP（外部两项默认SKIP）、公共路由5、CI保护4、14套件44浏览器；独立MCP8项含真实Codex Host与Inspector。类型/Lint/Build、51路径契约、迁移元数据、Skill格式通过。
- 真实DeepSeek三场景最终通过；共14次上游请求全HTTP200，26624预留输出；已知输入26083/输出6219，1次失败响应usage未记录，不冒充完整费用。A人工Revision、B共享背景/Copilot来源、C明确确认仅发布1问题均验证。
- 初次真实AI文件选择误选三文件：B先通过，C被本地4调用预算拒绝，A未运行。已精确限定文件，只补未完成场景，保留初次统计。独立C另一次上游200响应未过Provider校验，新增安全元数据后单次复验通过；原失败无响应元数据，根因未确认，不能声称已修复或稳定性全绿。没有扩大预算或改生产校验。首次OpenAPI检查与HTTP构建并发导致dist缺文件，串行重跑通过。
- FAIL：依赖27公告（8high/13moderate/6low）与已提交D相同、无新增ID；production口径deepmerge low/minimatch moderate共2条。H-17待专项修复，未擅自升级。
- 48个axe状态0违规，26状态有incomplete。代表桌面/320/390px与真实AI图像已打开抽查，未见新增遮挡/页面溢出。真实模型长答复、技术字段和持久化措辞仍需人工核对。

## 不变的授权与安全边界

0005–0008按各自审核包哈希复核不变，仅5434/specbridge_test / specbridge_test获批。23表/9迁移/10触发器，存量升级测试通过。没有新Migration，开发5433/生产未应用；H-15目标授权未扩大。0008 SHA-256仍`2fa26bd9bee6c4f420d9cdd3f8adb9b231fa2c2a2ad5ab77f1edfb087364d74b`。

外部Host实际使用安装器生成配置表的隔离CLI覆盖、已安装Skill和私有文件launcher；它不是实际用户交互信任后的自动加载验证。真实用户配置/信任/.env未修改。专用外部Token已撤销，临时宿主/安装凭据和浏览器原件目录由测试清理；合成业务审计留在隔离PG，不清空数据库。API tracked构建缓存从`/tmp/specbridge-workflow-e-initial.tsbuildinfo`恢复开工字节。

单实例配额重启清零、解析器非完整OS沙箱、私有文件不防同UID/root、多文件崩溃恢复、一目录一托管连接、提案24h有效但无自动清理等既有边界保持。模型建议不是批准事实，所有Ready/Submit/审批/验收仍人工；公开生成仅shared-only，私有聊天不持久化。

## 人工后续

[综合范例](AI_WORKFLOW_E_ACCEPTANCE.md)贯穿A–D；H-21最终模型/安全/视觉验收，H-20实际Codex信任自动加载/设备，H-17依赖/解析评审，H-15开发启用目标授权。远程CI、独立安全/读屏/设备与开发/生产迁移NOT RUN。本地E工作完成，不替代这些事项，也不要求重复批准已授权隔离SQL。

建议Commit：`test(ai): verify integrated AI workflows and agent connections`。最终PR标题/正文见[人工草案](AI_WORKFLOW_PR_DRAFT.md)，由负责人审阅后自行提交，本轮不自动创建。辅助日志为`/tmp/specbridge-workflow-e-*.log`；持久证据在工程/UX的`ai-workflow-e`目录，未覆盖历史A–D。
