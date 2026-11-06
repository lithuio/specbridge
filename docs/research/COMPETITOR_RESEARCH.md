# 竞品与用户问题初步研究（2026-11-01）

> 状态：公开资料桌面研究，**不是独立用户访谈**。对竞品功能的判断依据来自其公开官网/帮助中心；不推断其未公开的能力、价格或市场占有率。

## 1. 竞争边界

SpecBridge 的竞争对象不只是单一 SaaS，还包括“邮件/微信/Slack + Notion/Google Docs + GitHub Issues + 人工审批”的组合替代方案。一个新门户可能给客户增加登录负担，因此必须验证它的流程收益是否超过摩擦成本。

## 2. 竞品对照

| 竞品/替代方案 | 已公开覆盖的能力 | 与 SpecBridge 的关系 | 值得借鉴 |
|---|---|---|---|
| **ManyRequests** | Client Portal、客户请求列表、项目可见性、文件协作/审批、客户侧权限 | 强竞争；SpecBridge 不应称“客户可提交需求并审批”为独创 | Client Portal 信息层级、状态反馈、角色隔离 |
| **Bonsai（Hello Bonsai）** | 软件项目范围文件/SOW 模板涵盖需求、交付、验收与变更控制；产品提供 Proposal/合同工具 | 业务控制链已成熟，SpecBridge 应专注小团队的技术规格与版本追溯 | 范围确认内容必须清晰与可追溯 |
| **Canny** | 反馈收集、归并、Roadmap、Changelog、自动化反馈分析 | 面向产品反馈决策，SpecBridge 面向特定客户项目的范围变更及验收 | 反馈与发布闭环、AI 归类体验 |
| **Notion / GitHub Issues / IM** | 通用文档、任务跟踪、通讯 | 最强低成本替代方案，虽然“链路分散”，但用户熟悉且使用门槛低 | 低摩擦、可共享链接、减少输入字段 |

## 3. 公开资料与出处

1. ManyRequests《8 Client Portal Features Every Agency Should Look For》，2026-06-15： https://manyrequests.com/blog/client-portal-features  
   官方描述其文件共享/审批、项目可见性、权限、账单等能力。
2. ManyRequests 帮助中心《How to manage client requests》： https://help.manyrequests.com/en/articles/5440298-how-to-manage-client-requests  
   证实客户请求具有列表、状态、优先级、分配等流程。
3. Bonsai《Software Development SOW Template》： https://www.hellobonsai.com/scope-of-work-template/software-development-sow  
   范围、交付、验收和变更控制是已有实践。
4. Bonsai《All about proposals》，2026-08-05： https://help.hellobonsai.com/en/articles/5616844-all-about-proposals  
   Proposal 体系覆盖范围、时间线和预算表述。
5. Canny 官方介绍： https://canny.io/about  
   已覆盖 Capture、Autopilot、Roadmap 和 Close-the-loop。
6. Canny 帮助中心： https://help.canny.io/en/articles/3816826-canny-101

## 4. 初步定位结论（假设）

- 不竞争“最完整客户门户”，以此定位会输给集成度更高的成熟产品。
- 只服务**软件开发交付**：不可变规格、严格审批版本、可链接 GitHub Issue、Agent 可读取已批准内容。
- 先让客户只需 3 类动作：提需求、批准、验收；其余由开发者完成，降低客户学习成本。
- 短期不要先做支付、CRM、发票、白标、文件标注等重型泛化功能。

## 5. 访谈提纲（必须补上真实验证）

建议找 3–5 位有实际客户项目经历的开发者/工作室负责人，最好再找 1–2 位委托方：

1. 最近一次客户新增/修改范围发生在什么项目？请描述从提出到交付的经过。
2. 当时哪个版本的需求被视为“最终确定”？保存在什么地方？
3. 是否产生过返工、未付费变更或延期？如何界定范围？
4. 目前使用什么工具确认工期/费用？客户愿意额外登录吗？
5. 如果只保留需求澄清、范围批准、验收三步，哪一步最有价值、哪一步最碍事？
6. 是否愿意提供一个不敏感的真实需求，试用 MVP 走完整链路？
7. 已有什么流程做得足够好，完全不需要新软件？

记录真实原话（经同意、脱敏）、使用工具、最近具体案例、假设被推翻的证据。**不能用 AI 生成的访谈记录代替。**
