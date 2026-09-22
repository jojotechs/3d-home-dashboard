# 家庭邀请与邮件维护

T03 使用原家庭小城 Supabase 和 Vercel；实际执行证据见 [t03-results.md](t03-results.md)。

## 管理员操作

右上角「账号与家庭 → 管理家庭成员」。先添加成员，称呼可选，留空时生成 6 位字母＋数字昵称；成员可以一直没有登录账号。需要登录时，对该成员填写邮箱发送邀请。家人打开邮件设置密码，再接受邀请，即绑定这条成员身份。已有账号先登录受邀邮箱再接受。每个账号当前只绑定一个家庭成员；不开放公众注册。

财务权限单独开关，默认关闭。开通后可读取和修改完整家庭共同账；撤回后所有后续服务端财务读写和历史查询拒绝，旧操作人的名字和归属仍保留。不能把成员称呼理解成某笔资金的所有权。

邀请有效期 7 天，首次账号确认链接为 1 小时。失效后管理员在同一成员卡片「重新发送邀请」；旧家庭链接被替换。发送失败时保持邮箱并重试，界面复用同一请求 ID，服务端发送租约和 Resend 幂等键避免重复处理。只有发送服务确认后显示成功，邮件最终送达需查看 Resend Events。

登录弹窗的「忘记密码？」使用 Supabase 自定义 SMTP。邮件回到同一网站的独立设密弹窗，密码至少 12 位。链接失效或原标签页已登录其他账号时，不应对旧账号展示可提交的设密表单。密码与恢复 token 不进入源码、日志或前端环境变量。

## 服务端配置

- Supabase project ref: `ebffwcnodbusvmsgmnqg`；版本化迁移包含成员管理、邮箱绑定邀请、受限发送 outbox。所有管理 RPC 逐请求检查管理员，不信任客户端角色字段。
- `invite-household`：Supabase 自动注入项目 URL / anon / service-role 凭据。自定义 secret 为 `APP_URL`、`RESEND_API_KEY`、`MAIL_FROM`、可选 `EXTRA_ORIGINS`。APP_URL 为 `https://3d-home-dashboard.vercel.app`；调用方不能自行指定邮件回跳域名。
- `verify_jwt=false` 适配 SDK 新公开 key；函数内部仍通过 `auth.getUser()` 验证 Bearer 身份，并在用户上下文调用管理员 RPC。服务角色只执行账号邀请链接生成及私有 outbox 操作。
- 发信域 `mail.jojotechs.com` 已由同游项目完成 Cloudflare/Resend 验证，两个应用复用同一发送服务和免费额度。家庭小城的发件人是 `家庭小城 <family@mail.jojotechs.com>`。不修改同游的发件人、数据库或权限。
- `supabase/config.toml` 的 SMTP 密码引用 `env(RESEND_API_KEY)`。本机配置保存在仓库外 `/Users/joyy/.local/share/family-city-dashboard/credentials/mail.env`（0600），不要提交。执行 `config push` 前必须检查 `config diff`，其他远程配置保留。
- SMTP 为 `smtp.resend.com:465`、用户 `resend`，发送 key 为 sending-only；不要为读取邮件日志而扩大 key 权限。域名与送达记录可由已登录的 Resend UI 读取。未购入任何套餐。
- 正式 origin 与本地端口 5174 的回跳地址明确列出；以后更换域名需同步 Auth allowlist、Site URL、APP_URL 和来源白名单。

## 验证与凭据

`npm run test:cloud:household` 读取忽略文件 `.env.t03-test`，仅允许指定隔离家庭写入。该测试从真实 Supabase Auth、公开业务 RPC/Edge 和 RLS 返回值验证授权，不直接查询私有业务表来断言结果。初始测试身份通过受保护的管理流程准备；不开放注册作为测试捷径。

真实邮件验收使用 管理员邮箱的专用 T03 验收别名（见本机忽略配置）。它与正式家庭无关联；不要把测试账号邀请进正式家庭，也不要在真实家庭写入测试金额。浏览器设密按工具要求由用户完成，代理可继续验收其余已授权操作。实际完成状态始终以验收记录为准。
