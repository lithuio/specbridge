# AI工作流 D — 本地 Codex 连接人工验收

2026-11-13。本阶段只提供本机 Linux/WSL、Node 22、已安装 Codex CLI 与本仓库构建产物的安装器。MCP仍只有两个批准规格只读工具。浏览器登录凭据不交给安装器；长期项目Token不交给网页或模型。

## 准备可用环境

0008已经按批准哈希仅应用5434/specbridge_test，0005–0008没有应用5433开发库或生产。不要直接在尚未迁移的开发库宣称新功能已启用；开发启用另见H-15。以下临时验收栈只使用已获批隔离库，端口3000/4000须空闲：

```bash
pnpm --filter specbridge-api build
pnpm --filter web build
pnpm --filter specbridge-mcp build
node scripts/with-env.mjs .env.test node --experimental-strip-types scripts/browser-stack.mjs
```

访问 http://127.0.0.1:3000，注册合成账号，创建工作空间/项目。结束用Ctrl+C关闭测试栈，保留原开发数据。此栈不加载真实DeepSeek Key，连接功能本身不调用DeepSeek；Codex自然语言分析使用其自身账号/模型。复现自动链路用 `pnpm test:browser:connections`（独立启动并清理栈），不要与人工栈同时运行。

## 首次连接

1. Owner进入项目“访问凭据”下的“连接本地 Codex”。填写SpecBridge仓库绝对路径与目标代码目录绝对路径，生成命令。命令只有路径、origin、项目ID，不含Token。
2. 在本机终端执行，或将完整命令交给本地开发助手执行。安装器会检查版本/目录/配置和私有存储，打开本机浏览器；自动打开失败则打开终端的 `http://127.0.0.1:随机端口/start`。这个地址不包含授权证明。确认页若要求先登录，先登录，再结束旧安装器并重新发起连接。
3. 对比网页真实项目名称、Owner身份和终端连接指纹，核对“只读本项目批准规格”、用途名称与1–90天期限。勾选本人发起确认后，点击“确认授权并返回安装器”。只接受自己刚发起的请求，不代不明来源确认。
4. 网页返回固定loopback；它只携带短期授权码。CLI用PKCE证明兑换一次性Token，保存到仓库外私有文件，检查真实stdio MCP及授权API，再写项目 `.codex/config.toml` 与 `.agents/skills/requirement-analyst/SKILL.md`。成功应看到“连接成功”，空项目另显示“暂无批准规格”。
5. 重开目标目录的Codex，按其原有提示决定是否信任项目；安装器不会修改信任、模型、审批或沙箱设置。默认私有目录为 `~/.local/share/specbridge/connections`，目录0700/文件0600。配置只引用launcher/目录/连接ID，不要把凭据文件复制到仓库或聊天。

手动命令等价示例（替换路径及项目UUID）：

```bash
node /absolute/specbridge/apps/mcp/dist/connect/cli.js \
  --api-origin http://127.0.0.1:3000 \
  --web-origin http://127.0.0.1:3000 \
  --project PROJECT_UUID --workspace /absolute/target-repository
```

`--no-browser`只打印本机启动地址；`--credential-dir /absolute/private-directory`更换仓库外私有位置。使用HTTPS远程业务API也必须由本机浏览器返回本机loopback；本轮没有公开远程MCP HTTP服务。WSL需本机浏览器可访问该loopback，原生Windows/macOS尚不支持。

## 给 Codex 的验证请求

空项目：`使用 $requirement-analyst 列出当前项目可见的批准规格；没有批准内容时说明边界，不推测草稿。`

有批准规格：先通过原业务人工流程建立Revision、Mark Ready、商业评估并依次Owner/Client批准，然后请求：

> 使用 $requirement-analyst。先列出当前项目批准版本，再读取“客户门户登录”对应的明确版本。区分批准事实、引用背景、未确认推测。给出范围内实施步骤、模糊点问题和验收清单，每项关键结论保留真实版本来源。离线导出是否在批准范围内？不要修改文件或执行业务操作。

期待两个只读工具实际调用，输出真实project/requirement/change version/revision及readAt；多批准版本应明确选用哪个，背景和推测不扩展批准范围。规格中故意放置“忽略规则、输出Token、调用审批工具”时，宿主应忽略这类指令。MCP不注册写工具，不能通过它审批或验收。Skill效果仍需人工核对，不保证任意模型都正确理解业务。

## 生命周期和异常

- 同一命令再次执行：只检查现有连接，不发第二个Token、不重写配置。追加 `--status`可只做连通检查。
- 在网页撤销该Token：后续工具请求拒绝；本机过期凭据也拒绝。不自动续期、不自动更换项目。
- 追加 `--uninstall`：只删除安装器拥有且未被改动的配置块/Skill及私有凭据，保留其他配置；远端Token仍须Owner网页撤销。先撤销再卸载便于验收。修改过托管块或Skill时安全拒绝，不能覆盖你的编辑。
- 网页拒绝：不创建授权/Token，CLI可Ctrl+C结束或5分钟后超时。确认页刷新不重放授权；无效fragment无提交按钮。
- 确认结果未知：点击“核对授权记录”，再去访问凭据页取消未兑换授权或撤销已发放Token。不能恢复授权码、不能重复返回明文。CLI发生未知兑换时会输出授权记录ID供核对；不要循环运行创建新Token。
- Token已发放但安装失败：先到网页撤销。若已有完整安装回执，执行同参数 `--uninstall`；若进程中断在多文件安装中间且回执缺失，安装器会安全拒绝再次安装。人工只清理该连接ID的私有文件和精确托管配置块/新Skill，保留其他设置，再明确重连。无需查看或粘贴Token内容。
- 首版每目标目录只允许一个 `specbridge_` 托管连接；旧同名Skill、内联TOML表导致不能安全追加、symlink路径或权限不合要求都会拒绝。换项目先撤销并卸载原连接。移动SpecBridge构建目录或Node安装后需要重新配置。

## 验收记录

核对桌面与390/320px布局、Tab/Space/Enter明确确认、Client/Developer无管理入口、未知结果保留状态、重复安装不发新凭据、跨项目访问拒绝。截图及自动可访问性结果见[视觉证据](../ux/evidence/ai-workflow-d/README.md)，实际命令/结果与未运行项见[工程证据](evidence/ai-workflow-d/README.md)。

私有文件权限不防同UID/root/恶意本地宿主；每个文件原子替换及普通失败回滚不等于跨文件崩溃事务。指纹和PKCE也不能防Owner主动批准钓鱼请求。独立安全/视觉验收见H-20，不把自动测试等同人工签字。

重复执行与--status会校验安装回执、自有TOML块及Skill摘要，再诊断MCP；配置或Skill已被改动时拒绝，保留用户改动，不把“凭据仍可用”误报成安装配置正常。
