# R08 Phase D — Project API Token SQL 审核包

状态：**负责人已明确批准此哈希对应SQL；D先在隔离PostgreSQL应用，后续按追加授权应用本机开发库**。D于2026-11-12开工，分支 `feat/17-ai-agent-integration` / HEAD `9ba8f34`，工作区原本干净。Phase C 当时已由负责人提交。

追加授权与执行：F提交922eef1后，负责人明确要求修复本地AI并“应用0004_project_api_tokens，最终要求是能够整体都完整使用”。本轮核对以下原始SQL哈希与开发库0000–0003记录后，复用迁移runner在 `127.0.0.1:5433/specbridge` 应用成功；4→5条迁移，旧表列定义/行数保持。没有修改SQL或访问生产目标。[开发迁移证据](evidence/r08-local/migration.json)。下文保留D最初仅隔离库授权的历史记录。

依据：本轮负责人明确授权“生成最小 Drizzle Schema 和 SQL”，并要求“给出 SQL Diff 和 SHA-256，停止等待负责人明确批准，未批准前不应用任何 Migration”。随后负责人回复“已审批”，明确授权此SQL在隔离PostgreSQL应用并继续D。重新核对哈希后，`pnpm db:migrate:test` 实际成功；未应用开发/生产库。Issue [#17](https://github.com/lithuio/specbridge/issues/17)、AC-20、AC-05/15/16/17 和 ADR-002/004 的只读/租户/人审边界保持。

## 审批对象

- [Drizzle Schema](../../apps/api/src/database/schema/index.ts)：仅新增 `apiTokens`。
- [0004_project_api_tokens.sql](../../apps/api/drizzle/0004_project_api_tokens.sql)：一张新表、9列、PK、摘要唯一约束、5个CHECK、2个RESTRICT外键、1个项目分页索引。
- [0004_snapshot.json](../../apps/api/drizzle/meta/0004_snapshot.json) 与 [_journal.json](../../apps/api/drizzle/meta/_journal.json)：由已安装的 drizzle-kit 0.31.11 / drizzle-orm 0.45.4 生成；只追加第4号迁移。
- 0000–0003 SQL/snapshots、原15张表和原journal条目逐项比对未改变。无数据回填、UPDATE/DELETE/DROP、扩展、触发器或既有表结构调整；两条ALTER只向新表添加外键。

SQL 文件精确 SHA-256（包含生成器原始换行格式）：

```text
7133f1d8fc11ef93f84314dede4257cbba23452dec9ca49a2fdb57ce5cc0bd0a
```

## SQL Diff

以下为实际 `git diff --no-index -- /dev/null apps/api/drizzle/0004_project_api_tokens.sql`，不是伪SQL：

```diff
diff --git a/apps/api/drizzle/0004_project_api_tokens.sql b/apps/api/drizzle/0004_project_api_tokens.sql
new file mode 100644
index 0000000..10a5a75
--- /dev/null
+++ b/apps/api/drizzle/0004_project_api_tokens.sql
@@ -0,0 +1,21 @@
+CREATE TABLE "api_tokens" (
+	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
+	"project_id" uuid NOT NULL,
+	"user_id" uuid NOT NULL,
+	"name" text NOT NULL,
+	"token_hash" char(64) NOT NULL,
+	"scopes" text[] NOT NULL,
+	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
+	"expires_at" timestamp with time zone NOT NULL,
+	"revoked_at" timestamp with time zone,
+	CONSTRAINT "api_tokens_token_hash_unique" UNIQUE("token_hash"),
+	CONSTRAINT "api_tokens_name_valid" CHECK (char_length("api_tokens"."name") BETWEEN 1 AND 100 AND "api_tokens"."name" ~ '[^[:space:]]'),
+	CONSTRAINT "api_tokens_token_hash_format" CHECK ("api_tokens"."token_hash" ~ '^[0-9a-f]{64}$'),
+	CONSTRAINT "api_tokens_scopes_read_only" CHECK ("api_tokens"."scopes" = ARRAY['approved_specs:read']::text[]),
+	CONSTRAINT "api_tokens_expiry_window" CHECK (isfinite("api_tokens"."created_at") AND isfinite("api_tokens"."expires_at") AND "api_tokens"."expires_at" - "api_tokens"."created_at" BETWEEN interval '24 hours' AND interval '2160 hours'),
+	CONSTRAINT "api_tokens_revocation_time_valid" CHECK ("api_tokens"."revoked_at" IS NULL OR (isfinite("api_tokens"."revoked_at") AND "api_tokens"."revoked_at" >= "api_tokens"."created_at"))
+);
+--> statement-breakpoint
+ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
+ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
+CREATE INDEX "api_tokens_project_created_idx" ON "api_tokens" USING btree ("project_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);
\ No newline at end of file
```

## 字段、约束与安全语义

| 字段/约束 | 设计与后续实现要求 |
|---|---|
| id / project_id / user_id | UUID主键；project_id绑定唯一项目，user_id记录创建者。两个FK均RESTRICT，不级联删除凭据历史。Workspace从Project推导，不重复存储租户字段。FK不能代替当前Owner资格检查。 |
| name | NOT NULL，1–100个数据库字符且至少含一个非空白字符；应用层trim并限制长度。名称可重复；UI用Token记录ID和创建时间核对，不能把名称当凭据。 |
| token_hash | NOT NULL char(64)，唯一且仅64位小写十六进制。后续使用Node CSPRNG 32bytes、规范base64url和 `sbp_` 前缀；SHA-256摘要覆盖整个规范Token。表中无明文、加密副本、可恢复Token或显示用秘密片段。 |
| scopes | NOT NULL text[]，必须精确等于 `['approved_specs:read']`；不是“包含此scope即可”。禁止空数组、NULL元素、重复项、额外写scope及非标准数组维度。以后扩scope须另审Schema/SQL。 |
| created_at / expires_at | timestamptz，均须有限时间；expires-created在24–2160小时（1–90天）之间。应用默认30天、整数1–90天，以同一数据库时间计算两列，避免应用时钟/毫秒误差破坏1天边界。绝对过期，不续期；`expires_at <= statement_timestamp()`即失效。 |
| revoked_at | nullable；非NULL须有限且不早于created_at。允许过期后撤销。应用仅提供NULL→时间的条件更新，重复撤销幂等且不重复审计；不提供恢复、改项目/创建者/scope或延期API。此CHECK不承诺防具有任意SQL权限的管理员恢复记录。 |
| 索引 | PK用于撤销；unique(token_hash)用于凭据查找；(project_id,created_at DESC,id DESC)用于稳定项目分页。不存冗余active/status，不创建时间相关部分索引。 |

数组整体比较同时考虑内容和维度；没有使用会接受重复项的包含运算符。参见 [PostgreSQL 17 数组比较](https://www.postgresql.org/docs/17/functions-array.html)。有效期比较的是两个时间戳之差，避免把日历日加法的夏令时行为引入期限；有限时间校验及时间函数参见 [PostgreSQL 17 日期时间函数](https://www.postgresql.org/docs/17/functions-datetime.html)。这些是SQL设计依据，**尚未替代真实PostgreSQL约束验证**。

## 审批后继续的 D 实现

以下尚未实现，不因本审核包而宣称可用：

1. Owner Session+CSRF创建、分页列表、撤销。创建请求仅name/期限，scope服务端固定；响应成功提交后才交付明文一次，列表不含token/hash。Workspace→Project→Token锁序及锁后授权，创建/撤销与audit同事务；未知创建结果先列表核对并撤销，不能自动重试创建。
2. 批准规格专用GET/HEAD支持显式Session或独立ProjectToken principal，不能用 `@Public()` 绕过，也不能构造完整Owner Session。混合Cookie/Bearer、多个或非法Authorization值拒绝；受保护普通业务路由不接受Bearer。每次检查项目绑定、scope、过期、撤销与创建者当前Owner资格；失去Owner资格、成员/所有权关系冲突即拒绝，不缓存有效性。建议仅ACTIVE项目允许创建/使用Token，归档仍允许Owner列表/撤销；归档/角色资格恢复不自动撤销历史Token，若需永久失效须显式撤销。这项生命周期细化随D实现评审核对，不新增归档/转移API。
3. GET `/projects/{id}/approved-specs` 与 `/{versionId}`严格投影精确同版VENDOR/CLIENT已批准快照和其不可变Revision；验证真实父项目。批准范围与引用需求资料分开，不读最新Revision/当前可变标题/原文，不返回报价/工时/工期/审批评论/邮箱。不使用会返回整份商业详情的现有projection冒充技术投影。
4. 复用audit_events，无新增审计表。新增创建/撤销事件与成功Token读取的必要使用元信息（Token记录ID、固定端点类别、结果/版本ID、时间；不含原始Token、hash、Authorization、URL query或正文）。使用事件明确标为Token principal，不能伪装成Owner亲自操作；失败认证只记脱敏安全元信息。当前Audit策略只区分Client/非Client，**不能仅填false就声称Owner-only**，须扩展为按实际角色在SQL分页前过滤Token事件；明文/摘要均不进审计。
5. Owner管理UI仅内存显示新Token；关闭/隐藏/换项目/换号即销毁，迟到响应不得恢复。禁localStorage/sessionStorage/URL/QueryCache/MutationCache保存明文，禁自动复制剪贴板；手动复制后说明已交给用户管理。所有敏感响应no-store，Observe排除管理/批准规格路由并保持内容捕获关闭。

## 批准后的最小测试矩阵（当前全部 NOT RUN）

| 层级 | 必须验证 |
|---|---|
| Migration/DB | 已审0000–0003升级到0004、重复迁移、存量数据不变；UUID/FK/unique；非法hash/空白超长名称；空/NULL/重复/多维/额外scope；1天与90天边界、过短过长/无限时间、非法撤销；RESTRICT删除。 |
| 凭据与授权 | 三角色创建/列表/撤销；未登录/伪造/错误格式/过期/撤销/普通Session串用；跨Project/Workspace；Owner关系变化、归档；GET/HEAD同样授权、混合身份拒绝；所有业务写和非批准资料读取拒绝。 |
| 批准投影 | Draft/仅Vendor批准/拒绝版本不可读；精确同版双方批准可读；错误父链/外国Revision拒绝；新Revision或当前商业数据不替换历史快照；响应字段白名单。 |
| 事务/并发/审计 | 审计失败使创建/撤销回滚；重复撤销不重复事件；撤销与读取、授权变化竞争，明确在途边界；成功使用元信息可查且只有Owner可见，分页前过滤；明文/hash不入日志/错误/审计。 |
| Web与回归 | 创建明文仅一次、隐藏/换号/换项目/迟到结果清理、未知结果不重试、真实撤销；R02 Auth、R03 RBAC、R07审计/读取和P0受影响回归。 |

现有 `openTestDatabase()` 与浏览器启动器会自动调用migrate，所以审批前不执行集成/HTTP/浏览器测试，不调用任何db:migrate/db:push命令。批准后先重算此SHA-256，再仅使用 `TEST_DATABASE_URL` 本机5434、专用specbridge_test库/账号，并校验数据库实际身份；不得连接开发/生产库，不清空既有历史，不生成其他SQL。

## 审批前历史检查（后续验证见R08_PLAN）

- PASS：`pnpm --filter specbridge-api db:generate --name=project_api_tokens`；第二次相同命令报告无Schema差异。
- PASS：`pnpm --filter specbridge-api db:check`、`pnpm --filter specbridge-api typecheck`、`pnpm --filter specbridge-api lint`。
- PASS：`pnpm --filter specbridge-api test`，12文件125项既有单元测试；不代表尚未实现的Token功能通过。
- PASS：离线JSON/逐字节对照确认只增api_tokens，旧15表和迁移未改；SQL哈希核对；`git diff --check`。
- NOT RUN：任何数据库连接/迁移应用、D功能实现和专项测试、Auth/RBAC真实数据库回归、Web、远程CI、独立人工SQL审查。

## 审批与应用记录

2026-11-12，负责人回复“已审批”。应用前后核对上述SHA-256未变；`pnpm db:migrate:test` 使用 TEST_DATABASE_URL，启动器检查localhost:5434/specbridge_test和实际数据库/账号身份后成功。普通沙箱首次连接EPERM，获授权后在允许本地连接的环境重跑成功。无其他SQL生成、开发/生产迁移或破坏性重置。

后续已实现D API/独立Token principal/批准技术投影/Owner审计/UI，测试命令、结果及限制汇总于 [R08_PLAN](R08_PLAN.md) 与 [STATE](../STATE.md)。若此SQL需要改变，必须重新提供Diff/哈希并取得批准。未进入Phase E，未自动Commit/Push/Merge/部署。
