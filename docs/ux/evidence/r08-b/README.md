# R08 Phase B — AI Assistance UX 证据

2026-11-12；Issue #17，AC-18/19，兼顾 AC-06/08/16。Next 生产构建 + Nest + 5434 隔离 PostgreSQL + Chromium，真实 Cookie/CSRF/项目授权/业务写入；只有外部 DeepSeek HTTP transport 为固定合成响应，异常场景另用 Playwright 拦截响应或延迟网络。不是实际 DeepSeek 浏览器联调，也不是人工验收签字。

## 截图

| 证据 | 内容 |
|---|---|
| [桌面审阅视口](review-desktop-viewport.png) | 1440×1000；原文下方分析面板、来源版本、可编辑/可选择建议，保持 R07 导航与视觉 |
| [手机人工确认视口](confirm-mobile-viewport.png) | 390×844；已人工采用但未保存的 Revision 草稿，继续编辑后再保存 |
| [桌面完整页面](review-desktop.png) | 五类建议与假设删除后的空状态、人工采用按钮、已有 P0 操作 |
| [手机完整页面](confirm-mobile.png) | 单列重排、保留原文、AI审阅与既有Revision表单的完整上下文 |

数据均为本次测试创建的合成资料和一次性账号；不保存密码、Cookie、trace、HAR或真实需求。截图由实际浏览器生成并查看，无图像生成或后处理。R07既有截图未覆盖。

## 自动验证

`pnpm run test:browser:ai` 六场景最终52.3秒PASS；补充控件ID/radio隔离后，运行 `R08_AI_FIXTURE=1 node scripts/with-env.mjs .env.test pnpm --filter web test:e2e ai-assistance.spec.ts --grep '真实 Draft|审阅编辑跨'`，最终两场景8.7秒PASS并重采本目录截图。R04 2项、表单保留6项、Auth 6项定向回归PASS。完整命令与已解决失败见 [R08交接](../../../engineering/R08_PLAN.md)。

最后截图自检修正平滑滚动时机及手机高表单定位；以相同入口 `--grep '真实 Draft'` 复测1项5.0秒PASS，再次重采4张图。视口截图断言桌面摘要、手机正文和保存按钮进入画面；完整页面图提供上下文，未裁剪或修改截图文件。

场景包含真实Draft创建入口、五类结果、编辑/删除/选择/人工采用、分析/采用无业务写、人工保存后只新增Revision、生成期间手动输入不覆盖、source stale、真实R04保存409、503/格式错误/413/429/35秒等待超时、失败后手动保存、Client单条问题、HTML纯文本、撤权、只读来源Revision、未知保存禁重放、临时读取失败/会话复核保留、切页取消响应、错项目URL拒绝、不同需求控件/输入隔离与退出清除。

[accessibility.json](accessibility.json) 保留两状态原始判定摘要：桌面通过27项规则、手机28项规则，自动违规均为0。手机有一类 color-contrast 未判定，涉及水平导航被裁剪的3个链接；实际计算对比度均5.94:1，高于4.5门槛，未把补充计算当作axe自动判定通过。删除建议后焦点回到组内；320/390/768/1440 CSS px无横向溢出。不将自动检查等同读屏/独立人工可访问性评审。

单独入口默认输出本目录；为避免覆盖证据可设置 `R07_EVIDENCE_ROOT=test-results/evidence`。根 `test:browser` 全量入口默认使用忽略的该目录。需先构建 API/Web，3000/4000空闲，测试服务器仅用5434，不加载真实 `.env`。

NOT RUN：本阶段真实模型浏览器调用、Firefox/WebKit、真实手机/读屏、人工内容质量/视觉/安全评审、远程CI、R01–R08全量回归。AI本地内存编辑在刷新/动态页面重建后可能丢失，未持久保存逐句来源；来源版本仅证明读取上下文，不证明AI判断正确。
