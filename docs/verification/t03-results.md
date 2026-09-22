# T03 家庭邀请、财务授权与邮件找回

对应 [Issue #5](https://github.com/jojotechs/3d-home-dashboard/issues/5)。前置 #3 已通过 GitHub 原生依赖接口确认关闭。实施起点 d6c7a99；核心实现 c30bdaa，正式站点 https://3d-home-dashboard.vercel.app/。下文将已完成检查与尚待人工设密的验收分开。

## 复用配置与边界

用户指定参考同游任务；读取该任务和 `/Users/joyy/work/roam-together/docs/cloud-runbook.md` 后，复用既有 `mail.jojotechs.com` 的 Resend 发信配置，以及服务端邀请发送租约和幂等的实现方式。未迁移同游的账号、旅行数据、Supabase 或部署域名。

- 家庭小城继续使用 Supabase `ebffwcnodbusvmsgmnqg` 和原 Vercel 项目。新增迁移 `202609220001_household_access.sql` 经 dry-run 后应用，`invite-household` Edge Function 已部署。
- 发件人是 `家庭小城 <family@mail.jojotechs.com>`；SMTP `smtp.resend.com:465`。复用 sending-only key，不扩大邮件服务权限、不新增 DNS、不购买服务。密钥保存在仓库外 0700 目录/0600 文件及 Supabase 服务端；前端仅公开 Supabase key。
- `supabase config diff` 审查后再 push：仅 SMTP、中文恢复邮件、密码最少 12 位及明确的正式/本地回跳域名改变。其他远程配置保留，公众注册保持关闭。
- 邀请由当前登录管理员经服务器发出，7 天到期且绑定已确认邮箱；首次账号确认链接自身为 1 小时有效。重发替换旧家庭邀请；重复接受不会重复成员。账号已有家庭时拒绝再绑定。家庭成员可先存在而没有登录账号。
- 管理家庭成员位于屏幕角落账号菜单，独立弹窗承载。登录、邮件设密和恢复也属于账号 UI，不放入财务模块。后台权限重读在聚焦/恢复联网/可见页面每 30 秒执行；普通网络失败保留已打开草稿，明确撤权则清理财务并提示。服务端的后续操作立即按当前权限验证。

配置依据：[Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)、[Resend SMTP](https://resend.com/docs/send-with-supabase-smtp)、[Supabase 邮件模板](https://supabase.com/docs/guides/auth/auth-email-templates)。

## 数据库与真实云端检查

沿用已确认的测试入口：真实浏览器与公开业务 API，补充相同 RPC 的 PostgreSQL 合同测试。未使用真实家庭账进行写测试。

本地 TDD：先运行新增成员/授权测试，因 RPC 不存在而失败，补齐实现后通过；邀请绑定测试同样先因缺失 RPC 失败，再实现并通过。3 个业务测试覆盖无账号成员、管理员授权边界、邮箱绑定、重复接受、撤权拒绝、历史归属、过期及重发。`tests/access-database.test.mjs` 同时通过。

`npm run test:cloud:household` 1/1 通过。隔离家庭 `9c1e3d35-2121-4922-a4dc-027773e8cc39`，角色为独立管理员、同家庭成员、另一家庭管理员和匿名调用者。经实际 Supabase Auth/公开 RPC/Edge Function 验证：

- 独立成员身份绑定，只有管理员能邀请和开关财务权限；跨家庭管理员只能看到自己的成员表。
- 开权后成员真实写入 123.45 元的测试余额，创建者和历史操作人均为该成员。
- 撤权后读取财务、读取历史、写入和旧幂等回执重试均返回 42501；直接财务/历史/家庭表读取为空。
- 管理员仍可读取过去的操作者；本轮财务测试行已软移除，历史保留。其他测试或真实家庭未改写。

## 应用内浏览器与真实邮件

所有浏览器操作均使用 in-app browser。管理员本地页面直连真实云端，邮件回跳正式 Vercel 站点。

已验证：管理员登录 → 角落账号菜单 → 独立家庭管理弹窗 → 添加“受邀验收家人”（没有登录账号）→ 填写验收别名 → 实际发送邀请。页面显示等待接受、到期日期和重发入口。Resend provider ID `01a0c7e6-03d3-725d-9fa9-d51ed932cd0c` 于 2026-09-22 14:55（北京时间）显示 Delivered；打开这封实际发出邮件的链接后，正式站点识别受邀账号并显示设密弹窗。该证据表示收件服务器接收，不单独证明 Gmail 收件箱分类或用户已读。

另一个已有独立账号的浏览器会话已验证：管理员开权 → 成员进入共享财务 → 成功保存 234.56 元（2026-09-22 15:07:18，北京时间）→ 管理员撤权 → 财务面板清除 → 再次进入显示独立权限提示。测试余额仅在该隔离家庭中保留，供后续邮件成员读回。

SMTP 实测通过同一公开 `resetPasswordForEmail` 接口发起；Resend provider ID `01a0c7f3-7dec-705c-9521-70cbddda07b9` 于 2026-09-22 15:10 显示 Delivered，中文邮件模板与正式站点回跳参数均正确。此动作只申请恢复邮件，尚未修改密码。

当前等待用户在浏览器中自行完成新密码填写与提交；这是浏览器工具对新凭据设置的强制交接要求。加入、授权读写、撤权及邮件恢复/重新登录的浏览器验收完成后，更新此段。不得用控制台截图或生成但未发出的链接声称闭环。

回归：已登录管理员打开仅含 `?recovery=1` 的无效链接，看到“邮件链接已失效”，没有密码表单。错误/损坏的邮件回跳不能借用 SDK 保留的旧会话更新其他账号。

## Standards

首次发现后台权限刷新普通网络失败会卸载草稿（1 项硬标准问题），已修复为保留当前已授权会话的面板与草稿。Standards 复核无剩余发现。

## Spec

发现两项并均修复：后台刷新失败丢草稿；过期/损坏邮件回跳误用旧会话进入设密。另经浏览器发现并修正后台刷新自动关闭权限弹窗、同一登录状态的可选字段 undefined/null 跳变触发多余导航检查。Spec 复核无待修复项、无越界实现。此为代码审查结论，实际邮件和 UI 结果独立记录。

## 最终检查

修复后 `npm test` 53/53、typecheck、构建、Sites 4/4 及 Deno Edge Function 类型检查通过。构建保留全部 Sites 输出；已有 Three.js 大 chunk 警告仍存在。c30bdaa 的 Vercel 部署状态已确认为 success；后续 b1770fc 修复已部署；完整邮件账号流程仍待用户设密，不将本票标为全部验收完成。
