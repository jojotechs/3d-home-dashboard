# T01 云端接入与复现

对应 [Issue #3](https://github.com/jojotechs/3d-home-dashboard/issues/3)。代码包含首笔余额路径；云项目和实际验收状态见 [验收记录](t01-results.md)，不能仅因构建成功而关闭本票。

2026-09-17 交互更新：认证客户端和账号 UI 已移至 `src/auth/`，所有模块使用统一访问入口，财务面板不再内嵌登录。当前交互与验证见 [全局账号入口](auth-entry-ui.md)。

2026-09-19 T02：当前 UI 使用 `save_finances` 多行补丁入口，`save_balance` 保留兼容；两份列表与新迁移复现见 [T02 验收记录](t02-results.md)。下列单笔交互为 T01 历史说明。

## 实现边界

- `src/finance/` 是独立业务入口。现有生活区继续用本机示例；旧 `netWorth`/`highestNetWorth` 不读取、不上传，恢复生活示例不触及云财务。
- 浏览器用 Supabase Auth 邮箱/密码登录，通过公开 RPC `get_finances`、`save_balance`、`get_finance_history` 访问同一业务边界。T01 的历史入口供完整状态验证及后续历史界面复用。
- 金额用整数分十进制字符串在 JSON 中传输，以 PostgreSQL `numeric` 的整数约束保存，避免浮点精度损失；不设一万元上限。验收余额为 1234.56 元。
- 首笔写入包含记录 UUID、家庭 ID、不可变创建者、最新修改者、版本、服务端时间。一次保存串行锁定家庭账、检查记录版本、更新余额、保存全账快照和重试结果，在一个数据库事务内完成。
- 安全重试按家庭、可信操作者及请求 UUID 识别；同请求返回原确认结果，不重复记历史；不同内容重用 UUID、陈旧版本均返回 `PT409`。浏览器收到确认后再读取最新账，避免重试旧确认覆盖后来状态。
- 浏览器仅保留当前面板的余额内存与当前标签页的认证会话。SDK 广播频道按每个页面实例随机区分，认证凭据由适配器保存在各标签页独立的 sessionStorage；即使复制标签页也不会混用广播身份。关闭财务面板会清空其金额内存；退出立刻卸载金额面板并写入同步退出标记，刷新也不会恢复待退出会话。过期的异步响应不能重新写回。
- 所有公开业务表启用 RLS，匿名无权调用业务 RPC，跨家庭/无财务权限被拒。直接表写权限关闭，避免绕过历史和版本校验。初始化 RPC 只授予 `service_role`。
- T01 维持财务基础 GLB 面貌。净额低于一万元显示 Lv.1；更高金额仍能保存，十级计算/几何随 T06/T08–T13 接入。住宅/健康累加设施保持原规则。

## 云资源配置

1. 使用本项目专用的 Supabase 项目，避免将迁移应用到既有家庭财务产品。Vercel 使用 `jojotechs/3d-home-dashboard` 仓库。
2. Supabase Auth → Sign In / Providers：关闭 **Allow new users to sign up** 与匿名登录；保留 email/password。全局 `[auth] enable_signup=false` 禁止公众注册；`[auth.email] enable_signup=true` 保留邮箱提供方，否则托管项目连已有账号的邮箱登录也会禁用。配置需先 `supabase config diff --project-ref <ref>` 审查，再 `supabase config push --project-ref <ref> --yes` 应用；远端未声明配置不覆盖。[官方认证配置](https://supabase.com/docs/guides/auth/general-configuration)
3. 通过 Supabase CLI 登录、`supabase link --project-ref <项目 ref>` 后执行 `supabase db push`，应用 `supabase/migrations/202609160001_finance.sql`。不要重复粘贴迁移创建同名对象；迁移版本必须登记。迁移不创建身份、不种入任何财务数据。
4. 本地 `.env.local` 与 Vercel 环境变量设置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`。只允许 publishable 或旧 anon key；禁止 secret/service_role。管理凭据不进 Vite、不进 Git、不通过聊天发送。
5. `.npmrc` 和锁文件固定官方 npm 下载源，避免部署环境访问本机公司镜像；依赖版本和完整性校验保持锁定。Vercel 已由 `vercel.json` 指定 Vite、`npm run build` 和 `dist/client`。保留 `.openai/hosting.json`、Worker 与 Sites 打包脚本。[官方 Vite 部署](https://vercel.com/docs/frameworks/frontend/vite)
6. Supabase Site URL 设置为本项目部署 URL。Resend SMTP、真实邀请和找回邮件在 T03 接入，不由本票虚报邮件已送达。

## 初始化首个管理员

维护者在本机创建权限为 0600 且被 Git 忽略的 `.env.bootstrap`，包含：

```dotenv
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
ADMIN_EMAIL=
ADMIN_NAME=
HOUSEHOLD_ID=
HOUSEHOLD_NAME=
# 已存在的、已确认邮箱的 Auth 用户填 ADMIN_USER_ID；脚本不会改其密码。
ADMIN_USER_ID=
# 仅新建身份时设置至少 16 字符的 ADMIN_PASSWORD；不输出密码。
ADMIN_PASSWORD=
```

`HOUSEHOLD_ID` 使用固定 UUID，重试沿用同一 ID。运行 `npm run cloud:bootstrap`。脚本先验证公众注册已关闭且邮箱提供方启用，只在维护者环境使用管理 key；创建 Auth 身份后调用事务初始化家庭与管理员成员，不创建财务历史。账号创建和数据库事务属于两个服务边界：若后半段失败，保留输出的用户 ID 写入 `ADMIN_USER_ID` 后重试；不自动删除身份、不把首次网页访问者升级为管理员。

## 验证命令及性质

```sh
npm ci
npm run typecheck
npm run test:finance
npm run build
npm test
npm run test:sites
```

类型检查覆盖新增 TypeScript 财务模块；原型 JavaScript 由既有行为测试与构建检查。`test:finance` 使用 PGlite 的真实 PostgreSQL 执行迁移，通过相同 SQL RPC 检查数据/权限契约。它只模拟托管平台注入的身份上下文，**没有验证 Supabase Auth、HTTP 网关、云持久化或公网部署**；不能替代下面的云端验证。

本地开发服务由执行代理自行运行并在 in-app browser 打开。已启动地址记录在验收文件。

## 真实云端接口与浏览器验收

仅在专门的测试家庭运行 `npm run test:cloud`。用 `.env.cloud-test` 配置 `SUPABASE_URL`、`SUPABASE_PUBLISHABLE_KEY`、`TEST_HOUSEHOLD_ID`、`TEST_ALLOW_WRITES=true`、`TEST_ADMIN_EMAIL`、`TEST_ADMIN_PASSWORD`、`TEST_OUTSIDER_EMAIL`、`TEST_OUTSIDER_PASSWORD`。这些账号先由维护者初始化；外家庭账号必须属于另一测试家庭。脚本缺配置直接失败，不默默跳过、不降级成 mock。

它直接调用与网页相同的 Auth 和 RPC：保存 1234.56 元、幂等重试、另一无共享存储会话读回、完整历史、未认证和跨家庭拒绝、直接表写拒绝、并行同版本请求仅一笔成功、退出重登。会修改指定测试家庭首笔余额，并在最后并发场景保存 2345.67 元；不用真实家庭账做测试，不自动删用户或历史。

in-app browser 逐项操作：

1. 专用空家庭管理员登录，看到无余额、无伪造历史、Lv.1 基础街区。
2. 输入名称与 1234.56 元，保存前城市和已存净额不变；保存后显示云端确认。
3. 修改为 2345.67 元，保存、刷新，退出后不再显示财务金额；重新登录仍读回。
4. 在独立标签页登录同一测试管理员，读取同一记录。直接 RPC 补足未认证/跨家庭拒绝证据。
5. 使用第二会话制造真实版本冲突，确认失败保留输入、没有伪报保存；读取最新版本后核对并重新保存。网络失败用同一保留/重试路径，客户端请求超时为 15 秒；若浏览器不能设置离线模式，明确记录该限制，不把冲突测试称作断网测试。
6. 核对昼夜、住宅、健康、双车和交通仍可用，记录场景、角色、部署 URL、时间、截图与接口结果。所有浏览器操作只用 in-app browser。
