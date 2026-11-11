# SpecBridge Web

正式 Next App Router / React / Base UI 应用。当前完成 R07 C：`/login`、`/register`、`/app`；根路径跳转 `/app`。项目准备在 D，业务 Dashboard 在 G；当前概览只有真实账号信息和协作说明。

从仓库根目录运行 `pnpm run dev:api` 与 `pnpm run dev:web`，打开 `http://localhost:3000`。数据库配置与启动见 [DEVELOPMENT](../../docs/engineering/DEVELOPMENT.md)，不要改用 Web 子目录的独立锁文件安装。

## 复用入口

- `src/app/tokens.css`：正式语义 Tokens；`globals.css`：响应式页面与 Shell。
- `components/layout/app-shell.tsx`：桌面/平板导航、手机 Base UI Drawer；D 扩展真实项目/空间上下文与导航。
- `features/auth/provider.tsx`、`session.ts`：每个 Provider 独立 SessionStore；启动/刷新、重新聚焦、其他标签账号变更时通过 `/me` 确认身份。
- `lib/api/client.ts`：路径、method、path/query/body 与成功响应均从 B 的 `generated/schema.d.ts` 推导。所有请求同源、带 Cookie、禁 HTTP cache，所有写请求带 JSON/CSRF 头且不自动重试；Origin 由浏览器提供。API 仍负责最终权限。
- `lib/query/keys.ts`：`privateKey(epoch, userId, resource, ...scopeAndFilters)`。后续资源 key 必须含项目 ID、筛选和分页。使用 `useSession().runtime.api` 并传 Query 的 `signal`，不创建共享私有 API singleton。
- `components/shared/async-state.tsx`：加载/网络恢复/安全错误与 requestId。409 保留输入并核对，不自动重放 mutation。

## 会话边界

每次身份边界同步 abort 旧请求、cancel/clear 旧 QueryClient，再创建新 epoch/QueryClient；受保护子树卸载，避免旧表单保留。响应解析前后检查 lifetime signal，旧 200 或 401 不能改变新账号。私有数据不落 localStorage/sessionStorage、不进 Server Components 或共享 Next Cache。`/me` 没有全局 role。

注册成功清除密码并提示登录，不自动创建 Session；登录 401 仅显示统一错误。退出先清空私有 UI；网络结果未知时停在重试退出页面，不自动恢复旧账号。BroadcastChannel 仅传变更通知，无用户/凭据/业务数据；重新聚焦、可见性和 pageshow 恢复均重新确认 `/me`。

## 检查与真实浏览器

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build
pnpm --filter web exec playwright install --only-shell chromium
# Linux 如缺系统库，需要有 sudo 权限的终端：
pnpm --filter web exec playwright install-deps chromium
pnpm run db:test:up
pnpm run test:browser
```

`test:browser` 编译 API/Web 并运行 Next 生产服务器，只读取 `.env.test`，Playwright 启动器复用已审迁移和现有隔离库身份校验（5434 / specbridge_test），端口 3000/4000 被占用即失败，绝不复用开发服务。结束只关闭自己启动的 API/Web；数据库沿用原状态，不能自动 down 共享测试实例。无需重置表、关闭不可变触发器或读取开发 `.env`。

`e2e/fixtures.ts` 提供 worker 级三个 UUID 账号、真实注册与登录 helpers；账号名字不是全局角色，后续通过正式 API 建立 Workspace/Project 关系。用例串行、无自动重试；首次失败即停止，避免新 worker 再注册触发真实限流。账号仅留在隔离 tmpfs，不删历史。

只对网络故障/延迟做 transport 控制；正常数据与延迟载荷均由真实 API 返回。认证 trace/HAR/video/storageState 均关闭，避免保存 Cookie/密码；截图不拍密码并遮盖随机邮箱。截图及本机依赖说明见 [C evidence](../../docs/ux/evidence/r07-c/README.md)。运行边界及精确结果见 [R07_PLAN](../../docs/engineering/R07_PLAN.md) 与 [STATE](../../docs/STATE.md)。
