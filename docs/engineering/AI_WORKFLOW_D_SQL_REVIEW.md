# AI工作流 D — 本地 Codex 连接授权 SQL 审核包

2026-11-13。负责人已回复“批准，继续任务”，本包SQL哈希复核一致，原字节激活并仅应用 `127.0.0.1:5434/specbridge_test` / specbridge_test。没有扩展至开发5433、生产或未来SQL。原始审批依据：[Issue #17](https://github.com/lithuio/specbridge/issues/17)要求新SQL人工审核；DATA_MODEL规定生成、审查后才能迁移。

## 审核材料与执行记录

- [运行时Drizzle Schema](../../apps/api/src/database/schema/index.ts)；原候选路径保留重导出，避免两份定义漂移。
- [已审完整SQL](migrations/ai-workflow-d/0008_agent_connection_grants.sql)，SHA-256 `2fa26bd9bee6c4f420d9cdd3f8adb9b231fa2c2a2ad5ab77f1edfb087364d74b`。
- [snapshot](migrations/ai-workflow-d/0008_snapshot.json)、[原journal entry](migrations/ai-workflow-d/journal-entry.json)、[审批前静态对照](migrations/ai-workflow-d/static-review.json)。静态对照中的未应用状态是审批前快照，不是当前状态。
- SQL/snapshot已原字节复制至apps/api/drizzle并追加已审journal entry；当前23表/9迁移/10自定义触发器。102项数据库测试及旧22表升级数据保持通过，见[实际证据](evidence/ai-workflow-d/README.md)。
- [连接设计](AI_WORKFLOW_D_DESIGN.md)、[安装和恢复](AI_WORKFLOW_D_MANUAL.md)。下方完整SQL Diff保持审核版本，不以新生成SQL替换已批内容。

## 为什么需要新表

`api_tokens`继续存实际只读凭据摘要、scope、期限和撤销状态。新增 `agent_connection_grants` 仅存Owner明确确认后的一次性连接授权；把授权码消费、Token创建和审计放入同一事务，支持重启后拒绝重放。内存缓存不能提供这种一次性保证，也不应将短期授权状态混入Token正文/审计正文。

不接受匿名“申请授权”写入数据库。安装器先在本机生成attempt UUID、随机state和PKCE verifier/challenge，打开浏览器；Owner在真实项目页面确认后才创建AUTHORIZED记录和短期授权码。记录不含API Token、原始授权码、verifier、完整state、Prompt、文件路径或对话。授权码/state只存SHA-256；challenge是S256公开证明值。

## 表、约束、索引与生命周期

| 字段 | 用途与限制 |
|---|---|
| id | 安装器产生的attempt UUID，主键；重复点击确认不能新建第二份同attempt授权 |
| project_id / user_id / session_id | 授权时真实项目、Owner与当前Session；restrict FK。触发器检查Session实际属于该Owner；当前Owner资格/会话有效性仍由事务服务重验 |
| code_hash / challenge / state_hash | code摘要唯一，state摘要64位hex，challenge为canonical 32-byte base64url的43字符；只支持S256 |
| callback_port | 1024–65535；地址由代码固定为 `http://127.0.0.1:{port}/specbridge/callback`，不存可任意替换的URL |
| token_name / token_expires_in_days | Owner确认的凭据名称及整数1–90天，默认30天；交换不能改名称、期限、项目或scope |
| status | AUTHORIZED / EXCHANGED / CANCELLED；过期由时间派生，不需要后台写状态 |
| api_token_id | 仅EXCHANGED非空，FK且唯一；绑定同用户/项目/名称/只读scope和批准期限的新Token |
| created_at / expires_at / completed_at | 有限时间；授权最多5分钟，兑换必须在到期前完成；取消允许在到期后记录 |

普通索引分别支持Owner/项目创建时间列表及到期查找；主键、code_hash和非空api_token_id唯一约束承担attempt、code及Token绑定的去重。

触发器拒绝插入伪造终态、修改所有绑定字段、再次更新终态或重复消费。AUTHORIZED只允许一次转为EXCHANGED/CANCELLED；EXCHANGED检查数据库当前时间、Token父链/只读scope/名称/期限与创建时间。全事务回滚保证创建Token后不能只留下未消费授权。不存在Token回传恢复、重复返回原Token或自动换码的语义。

已兑换记录作为安全回执保留，不可更新/删除；长期Token撤销继续写 `api_tokens.revoked_at`，不会改回执。未兑换/取消记录过期满24小时后允许清理；拟由同项目下一次确认授权时、项目锁内有界清理最多100条，无后台队列或“必在24小时删除”的承诺。服务审计保留对象ID和动作，不保留秘密；该保留策略不构成完整聊天存储。

## 应用层约束（批准后实现）

- Owner Session+CSRF确认/取消；列表只本人有权项目，Developer/Client/Bearer拒绝。初次确认每Owner20次/项目40次每小时，同Owner/项目最多5个未过期AUTHORIZED；配额为既有单实例限流，不宣称多实例全局限流。
- 唯一专用兑换端点接受code+verifier+state+attempt/project/port；拒绝Cookie、Authorization、Origin/浏览器Fetch元信息及非JSON，限正文4KiB和IP次数；不把普通业务路由改为Public或复用Bearer写权限。它本身不返回任何项目正文。
- 无锁定位/校验hash仅用于早拒绝，写前按Workspace→Project→Session共享锁→Grant锁序重查Owner、ACTIVE项目、原Session期限/撤销、所有证明及授权期限。生成Token、消费授权、两类审计同事务；任何审计/约束错误全部回滚。
- 原Session失效将阻止尚未兑换授权；已发出的Token沿用既有Owner/项目/期限/撤销规则，退出登录本身不是已发出Token的自动撤销。
- 网络结果未知不自动重新授权或重试兑换。Owner页面通过attempt查询是否已兑换及Token ID，必要时用原Token管理界面撤销，再明确发起新连接；不恢复明文。
- 审计/日志/Observe禁收code、verifier、state和Token；授权URL fragment、loopback回调和响应设置no-store/no-referrer，回调不回显秘密。Token仅在安装器兑换响应内出现，网页不接收它。

## 批准后必须运行的真实验证

1. 原0000–0007升级数据/22表保持；新FK、hash格式、canonical challenge、5分钟期限、状态组合、终态/绑定不可变与清理边界。
2. Owner/Client/Developer及跨Project/Workspace、混合认证、CSRF、无效/过期/取消/重放、错误verifier/state/port/项目、Owner变更/项目归档/等待锁时退出登录。
3. 并发兑换只产生一个Token；取消与兑换串行；审计失败、unique冲突、期限边缘全部回滚；相同attempt确认结果未知的恢复路径。
4. 真实浏览器确认/拒绝/到期/网络未知、桌面/手机和键盘；Token不出现在URL、Web持久存储、配置、截图、日志。
5. 本地配置合并/恢复/重装/卸载保留其他设置；真实MCP Client→Nest→隔离PG，只读及撤销/到期生效；独立Codex Host/Skill测试使用合成项目和临时Token，完成撤销清理。
6. 受影响Auth/RBAC/Token/MCP回归、API/Web类型/Lint/Build/OpenAPI、普通CI无真实模型依赖；不在D冒充E最终全量通过。

以上是原审核时的验证计划；批准后已按原字节在获批隔离目标执行，数据库/API/Web/安装与隔离Host验证结果见[实际证据](evidence/ai-workflow-d/README.md)。实际用户Codex信任加载与独立人工验收仍待H-20，未扩展迁移目标。

## 完整新增SQL Diff

```diff
--- /dev/null
+++ candidate/0008_agent_connection_grants.sql
+CREATE TABLE "agent_connection_grants" (
+	"id" uuid PRIMARY KEY NOT NULL,
+	"project_id" uuid NOT NULL,
+	"user_id" uuid NOT NULL,
+	"session_id" uuid NOT NULL,
+	"code_hash" char(64) NOT NULL,
+	"challenge" char(43) NOT NULL,
+	"state_hash" char(64) NOT NULL,
+	"callback_port" integer NOT NULL,
+	"token_name" text NOT NULL,
+	"token_expires_in_days" integer NOT NULL,
+	"status" text DEFAULT 'AUTHORIZED' NOT NULL,
+	"api_token_id" uuid,
+	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
+	"expires_at" timestamp with time zone NOT NULL,
+	"completed_at" timestamp with time zone,
+	CONSTRAINT "agent_connection_grants_code_unique" UNIQUE("code_hash"),
+	CONSTRAINT "agent_connection_grants_token_unique" UNIQUE("api_token_id"),
+	CONSTRAINT "agent_connection_grants_proof_valid" CHECK ("agent_connection_grants"."code_hash" ~ '^[0-9a-f]{64}$' AND "agent_connection_grants"."state_hash" ~ '^[0-9a-f]{64}$' AND "agent_connection_grants"."challenge" ~ '^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$'),
+	CONSTRAINT "agent_connection_grants_port_valid" CHECK ("agent_connection_grants"."callback_port" BETWEEN 1024 AND 65535),
+	CONSTRAINT "agent_connection_grants_token_settings" CHECK (length(btrim("agent_connection_grants"."token_name")) BETWEEN 1 AND 100 AND "agent_connection_grants"."token_expires_in_days" BETWEEN 1 AND 90),
+	CONSTRAINT "agent_connection_grants_state_valid" CHECK (("agent_connection_grants"."status"='AUTHORIZED' AND "agent_connection_grants"."api_token_id" IS NULL AND "agent_connection_grants"."completed_at" IS NULL) OR ("agent_connection_grants"."status"='EXCHANGED' AND "agent_connection_grants"."api_token_id" IS NOT NULL AND "agent_connection_grants"."completed_at" IS NOT NULL) OR ("agent_connection_grants"."status"='CANCELLED' AND "agent_connection_grants"."api_token_id" IS NULL AND "agent_connection_grants"."completed_at" IS NOT NULL)),
+	CONSTRAINT "agent_connection_grants_time_valid" CHECK (isfinite("agent_connection_grants"."created_at") AND isfinite("agent_connection_grants"."expires_at") AND "agent_connection_grants"."expires_at">"agent_connection_grants"."created_at" AND "agent_connection_grants"."expires_at"<="agent_connection_grants"."created_at"+interval '5 minutes' AND ("agent_connection_grants"."completed_at" IS NULL OR (isfinite("agent_connection_grants"."completed_at") AND "agent_connection_grants"."completed_at">="agent_connection_grants"."created_at" AND ("agent_connection_grants"."status"<>'EXCHANGED' OR "agent_connection_grants"."completed_at"<"agent_connection_grants"."expires_at"))))
+);
+--> statement-breakpoint
+ALTER TABLE "agent_connection_grants" ADD CONSTRAINT "agent_connection_grants_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
+ALTER TABLE "agent_connection_grants" ADD CONSTRAINT "agent_connection_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
+ALTER TABLE "agent_connection_grants" ADD CONSTRAINT "agent_connection_grants_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
+ALTER TABLE "agent_connection_grants" ADD CONSTRAINT "agent_connection_grants_api_token_id_api_tokens_id_fk" FOREIGN KEY ("api_token_id") REFERENCES "public"."api_tokens"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
+CREATE INDEX "agent_connection_grants_owner_project_idx" ON "agent_connection_grants" USING btree ("user_id","project_id","created_at");--> statement-breakpoint
+CREATE INDEX "agent_connection_grants_expiry_idx" ON "agent_connection_grants" USING btree ("expires_at");
+--> statement-breakpoint
+-- Only the new table is guarded; existing Token/session/tenant tables are unchanged.
+CREATE FUNCTION specbridge_guard_agent_connection_grant() RETURNS trigger LANGUAGE plpgsql AS $$
+BEGIN
+  IF TG_OP = 'INSERT' THEN
+    IF NEW.status <> 'AUTHORIZED' OR NEW.api_token_id IS NOT NULL OR NEW.completed_at IS NOT NULL
+       OR NEW.created_at > clock_timestamp() OR NEW.expires_at <= clock_timestamp() THEN
+      RAISE EXCEPTION 'invalid initial connection grant' USING ERRCODE = '23514';
+    END IF;
+    IF NOT EXISTS (SELECT 1 FROM sessions s WHERE s.id=NEW.session_id AND s.user_id=NEW.user_id) THEN
+      RAISE EXCEPTION 'connection session mismatch' USING ERRCODE = '23514';
+    END IF;
+    RETURN NEW;
+  END IF;
+  IF TG_OP = 'DELETE' THEN
+    -- Used only for expired unused/cancelled metadata cleanup; issued-token receipts remain.
+    IF OLD.status = 'EXCHANGED' OR OLD.expires_at > clock_timestamp() - interval '24 hours' THEN
+      RAISE EXCEPTION 'connection grant history is retained' USING ERRCODE = '23514';
+    END IF;
+    RETURN OLD;
+  END IF;
+  IF OLD.status <> 'AUTHORIZED' OR NEW.status NOT IN ('EXCHANGED','CANCELLED') THEN
+    RAISE EXCEPTION 'connection grant is terminal' USING ERRCODE = '23514';
+  END IF;
+  IF ROW(NEW.id,NEW.project_id,NEW.user_id,NEW.session_id,NEW.code_hash,NEW.challenge,NEW.state_hash,
+         NEW.callback_port,NEW.token_name,NEW.token_expires_in_days,NEW.created_at,NEW.expires_at)
+     IS DISTINCT FROM
+     ROW(OLD.id,OLD.project_id,OLD.user_id,OLD.session_id,OLD.code_hash,OLD.challenge,OLD.state_hash,
+         OLD.callback_port,OLD.token_name,OLD.token_expires_in_days,OLD.created_at,OLD.expires_at) THEN
+    RAISE EXCEPTION 'connection binding is immutable' USING ERRCODE = '23514';
+  END IF;
+  IF NEW.completed_at IS NULL OR NEW.completed_at > clock_timestamp() THEN
+    RAISE EXCEPTION 'invalid connection completion time' USING ERRCODE = '23514';
+  END IF;
+  IF NEW.status = 'EXCHANGED' THEN
+    IF NEW.expires_at <= clock_timestamp() THEN
+      RAISE EXCEPTION 'connection grant expired' USING ERRCODE = '23514';
+    END IF;
+    IF NOT EXISTS (
+      SELECT 1 FROM api_tokens t WHERE t.id=NEW.api_token_id AND t.project_id=NEW.project_id
+        AND t.user_id=NEW.user_id AND t.name=NEW.token_name
+        AND t.scopes=ARRAY['approved_specs:read']::text[] AND t.revoked_at IS NULL
+        AND t.created_at>=NEW.created_at AND t.created_at<=NEW.completed_at
+        AND t.expires_at-t.created_at=NEW.token_expires_in_days * interval '24 hours'
+    ) THEN
+      RAISE EXCEPTION 'connection token mismatch' USING ERRCODE = '23514';
+    END IF;
+  END IF;
+  RETURN NEW;
+END;
+$$;
+--> statement-breakpoint
+CREATE TRIGGER agent_connection_grants_guard
+BEFORE INSERT OR UPDATE OR DELETE ON agent_connection_grants
+FOR EACH ROW EXECUTE FUNCTION specbridge_guard_agent_connection_grant();
```
