# R07 Phase D — 项目准备浏览器证据

2026-11-11，本地完成。正式 Next production / 编译 Nest API / 5434 隔离 PostgreSQL / Chromium；复用 C 启动器与 UUID 账号，无 Mock 业务数据。三张图已逐张查看，人工视觉评审未记录；C 历史截图保持原值。

| 页面 | 截图 | 视口 |
|---|---|---|
| Owner 项目成员、Developer 分配、唯一 Client | [桌面整页](owner-members-desktop.png) | 1440×1000 |
| Client 从自己的项目列表进入、只读初始范围 | [手机整页](client-project-mobile.png) | 390×844 |
| 真实首次 Submit 后客户绑定锁定 | [桌面整页](client-locked-desktop.png) | 1440×1000 |

随机邮箱遮罩，不保存密码、Cookie、trace/HAR/video/storageState。截图用即时滚到页首，避免 CSS 平滑滚动未完成时的 fixed 导航错位。

## 实际验证

`projects.spec.ts` 两个场景通过：定向运行 6.5s；最终根命令执行 C 6场景/6.3s、D 2场景/6.6s，API/Web 构建同时通过。最终 Web lint/typecheck、diff 空白检查通过。无未捕获浏览器异常。

1. Given 三个已注册账号：Owner 在浏览器创建空间/项目（验证初始范围必填及原文持久化），添加已注册 Developer，分配项目并绑定 Client。未注册成员422保留输入、供应方绑定Client身份冲突422。Developer 仅加入空间时项目404，分配后200；名册403、绑定操作403。13个真实项目验证12条分页及切换筛选重置。Client 无供应方空间仍从自己的列表进入，跨项目读写404、供应方名册404；当前项目无管理控件。同一Client创建独立空间/项目后在该项目是Owner，回原项目仍是Client。深链接刷新、320px无横向溢出。
2. Given 未正式提交项目：Owner更正客户后旧Client访问404、项目仍只有一个Client。通过既有R04/R05 API建立真实Submit前置状态（不实现E/F UI、不直接SQL）。保留旧绑定表单提交更正时真实409，输入保留、重新获取锁定能力并禁提交；刷新仍显示唯一原Client和锁定。另模拟Workspace创建已提交但响应丢失，禁重发且返回列表可查真实创建结果，POST仅一次。

## 复现

依赖安装、隔离库与当前临时系统库见 [Web README](../../../../apps/web/README.md)、[C 环境说明](../r07-c/README.md)。本轮未安装新依赖或修改环境配置。

```bash
# 构建并分别启动 C/D 套件，避免共享 API 进程的真实登录配额叠加：
env LD_LIBRARY_PATH=/tmp/specbridge-browser-libs/root/usr/lib/x86_64-linux-gnu FONTCONFIG_FILE=/tmp/specbridge-browser-libs/fonts.conf pnpm run test:browser

# 已有最新 API/Web 构建时，仅验证 D：
env LD_LIBRARY_PATH=/tmp/specbridge-browser-libs/root/usr/lib/x86_64-linux-gnu FONTCONFIG_FILE=/tmp/specbridge-browser-libs/fonts.conf pnpm run test:browser:projects
```

实际定向命令为同环境前缀 `node scripts/with-env.mjs .env.test pnpm --filter web test:e2e projects.spec.ts`，与新增根别名等价。不要一次无文件参数运行两个套件；真实的按邮箱/IP限流未放宽。后续阶段沿用此工具和定向测试，H集中全量回归。

## 已处理失败与未运行项

- 初始 Web typecheck：接口路径参数名误写为 projectId/workspaceId，按生成契约改为 `{id}`；RHF watch warning 改用 useWatch；最终均通过。
- 沙箱 Turbopack 内部端口和 Playwright 启动受限，获准沙箱外重跑通过。Docker ps 仍缺 socket 权限，未操作容器；原隔离数据库实际由启动器校验与通过的测试验证。
- 首轮浏览器点击项目后立即reload，导航尚未提交，刷新仍停在列表；增加目标角色就绪断言后通过。截图平滑滚动修正为即时滚动，最终图片已查看。
- 未改后端，未重复R01–R06全量回归/契约重生成。远程CI、人工视觉/安全评审、生产HTTPS、多浏览器、E–H业务闭环未运行。没有新增实施阻塞。
- 测试仅访问隔离库，沿用已审核迁移、不清表/禁触发器。原数据库保持运行；自建API/Web进程已退出。
