# 云端与认证候选事实备忘

核查日期：2026-09-16，当日根据用户最新答复更新。状态：Vercel + Supabase + Resend 路线已由用户在第四轮接受；尚未创建云资源或完成真实云接入验证。

当前约束：一期先供自己的家庭使用；从财务市区的首个业务功能开始验证真实云端读写与认证；邮箱加密码、邮件邀请和邮件找回已接受；免费优先，必要费用再讨论。用户已撤回大陆普通网络访问的验收要求，当前先正常部署，不以大陆访问质量或备案作为选型门槛。下文保留前轮地域资料供将来参考。依据 [ADR 0001](../adr/0001-validate-cloud-in-first-business-slice.md)，本备忘不改变已批准的云端验证时机；路线选择不等于已完成接入，也不构成采购授权。

## 当前选定路线：Vercel + Supabase + Resend SMTP

**路线已确认，接入未实施：**当前自家使用先用 Vercel 托管现有 Vite 前端，Supabase 提供 Postgres 与 Auth，Resend 作为自定义 SMTP。各平台的免费层可用于验证；是否存在域名购置费、是否需要升级套餐，应在接入前核实实际资源与用量。Vercel 支持直接部署 Vite，无需为此迁移到 Next.js。[Vite 部署](https://vercel.com/docs/frameworks/frontend/vite)

仓库只读核查：当前是 React/Vite/Three 前端，已有构建会生成 `dist/client`，Sites 的 Worker 负责静态文件与 SPA 回退，不含业务后端。可保留现有 Sites 构建与 Worker，新增托管配置指向 `dist/client`；邀请等管理操作放在受鉴权保护的服务端，避免把管理员凭据放入前端。此处仅描述建议，本轮未改代码或托管配置。

| 问题 | 已核实事实与方案含义 |
| --- | --- |
| 迁移能否从开始就纳入开发？ | Supabase 以 `supabase/migrations` 保存 SQL 迁移，通过 CLI 连接远程项目并执行 `db push`。表、约束、权限与 RLS 策略可随迁移提交；Auth 配置、SMTP、跳转地址仍需分别管理和验证，不能认为 SQL 迁移自动包含全部平台设置。[数据库迁移](https://supabase.com/docs/guides/deployment/database-migrations)、[跳转地址](https://supabase.com/docs/guides/auth/redirect-urls) |
| 账号与家庭成员能否分开？ | `auth.users` 属于认证 schema，不暴露在自动生成 API 中；官方支持在业务 schema 建表并引用其主键。因此可以让家庭成员独立存在，仅对有登录能力的操作者建立账号关联，无需给每个家庭成员建 Auth 用户。这是适配已定业务规则的设计推断。[用户数据](https://supabase.com/docs/guides/auth/managing-user-data) |
| 能否执行家庭隔离？ | RLS 可用 `auth.uid()` 识别请求账号，结合家庭成员及财务访问授权限制读写。仍须正确配置 grants 和各操作策略，并实测无权限账号被拒；`service_role` 可绕过 RLS，只能留在服务端。[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) |
| Resend 免费邮件能否用于正式家庭成员？ | 当前 Free 为每月 3000 封、每天 100 封、3 个域名；无需另外申请生产权限。但默认 `resend.dev` 发件域名仅能给 Resend 注册邮箱发送测试信。向其他家庭成员发真实邀请／恢复邮件，必须验证自己控制的域名并使用该域名发件。[价格](https://resend.com/pricing)、[生产权限](https://resend.com/docs/knowledge-base/does-resend-require-production-approval)、[测试收件人限制](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain) |
| 邮件需要什么配置？ | 需 Resend 账号、API key、可控制 DNS 的自有域名／子域名，完成 SPF/DKIM 验证后，将 SMTP 配置存入 Supabase；SMTP 密码使用 Resend API key。域名额度不等于赠送域名注册。应用本身可先用托管商分配的 HTTPS 地址，发件域名与应用访问域名不必相同。[域名验证](https://resend.com/docs/dashboard/domains/introduction)、[SMTP](https://resend.com/docs/send-with-smtp)、[Supabase 跳转地址](https://supabase.com/docs/guides/auth/redirect-urls) |

### Cloudflare Pages 是否值得替换 Vercel？

两者都能托管现有 Vite 静态前端，后端仍可使用同一个 Supabase。Cloudflare Pages Free 每月 500 次构建，单文件上限 25 MiB。只读检查现有最大 GLB 为 7,493,336 字节，当前符合这个单文件限制；未来十级模型生成后再按实际文件检查。[Pages 的 Vite 部署](https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/)、[Pages 限制](https://developers.cloudflare.com/pages/platform/limits/)

当前没有为业务能力切换到 Pages 的必要。Vercel Hobby 明确仅供个人非商业使用，网站将来承担商业引流或收费时要重新评估，可能升级或换托管。核查的 Cloudflare 自助服务条款未见同样的全面非商业限制，但免费服务仍受服务条款和产品限额约束，不能承诺任何商业场景都永久免费。若第一版站点本身就用于商业引流，可优先复核 Pages，避免先依赖 Hobby 再迁移；家庭自用阶段保留当前建议即可。[Vercel Hobby](https://vercel.com/docs/plans/hobby)、[Cloudflare 条款](https://www.cloudflare.com/terms/)

## Vercel + Supabase 的持续适用限制及历史地域事实

| 项目 | 官方文档事实 | 对本项目的影响／推断 |
| --- | --- | --- |
| Vercel 大陆网络（历史调查） | 没有大陆服务器或 CDN 节点；官方明确不能保证大陆可用性或性能。自定义域名只能缓解部分问题。[大陆访问说明](https://vercel.com/kb/guide/accessing-vercel-hosted-sites-from-mainland-china) | 用户已不将大陆访问质量列为本期门槛；不因此阻止常规部署。 |
| Vercel Hobby | 限个人非商业使用；商业使用需要 Pro 或 Enterprise。[Fair Use](https://vercel.com/docs/limits/fair-use-guidelines)、[服务条款第 4 节](https://vercel.com/legal/terms) | 自家使用与后续付费服务需分别评估；若网站承担商业引流，不能只以「尚未收费」认定可用 Hobby。 |
| Supabase 地域 | 公开托管地域列出新加坡、东京、首尔等，未列大陆或香港。[可选地域](https://supabase.com/docs/guides/platform/regions) | 未找到大陆访问保证；不能由「距离近」推断运营商网络一定稳定，也不能断言一定不可达。 |
| Supabase 默认邮件 | 默认 SMTP 仅发送到项目团队成员的邮箱，目前合计每小时 2 封，无邮件投递或可用性 SLA；正式用途应配置自有 SMTP。[SMTP 说明](https://supabase.com/docs/guides/auth/auth-smtp) | 家庭应用账号不应因此被邀请进云平台管理团队。正式邀请、验证与找回密码的邮件通道须单独设计和验证。 |
| Supabase Free | 低活跃一周可能暂停；套餐页列出 500 MB 数据库、1 GB 文件存储、两项各 5 GB 的普通／缓存出流量、最多 2 个活跃项目。Pro 从每月 25 美元起。[套餐](https://supabase.com/pricing)、[生产检查清单](https://supabase.com/docs/guides/deployment/going-into-prod) | 免费方案需要处理长时间未用后的恢复；3D 模型流量也应计入估算，不能只计算财务记录大小。 |
| Supabase 备份 | 托管每日备份属于付费计划；官方建议免费项目用 CLI 导出并异地保存，Pro 可访问最近 7 天每日备份。[备份](https://supabase.com/docs/guides/platform/backups) | 采用免费层也需要能恢复的数据导出方案；「云上已有一份」不等于备份。 |
| Supabase 商业使用 | 本次核查的定价页和服务条款未发现与 Vercel Hobby 相同的 Free 全面非商业限制；这不是对任何使用方式的法律保证。[套餐](https://supabase.com/pricing)、[服务条款](https://supabase.com/terms) | 不把两个平台的套餐限制混为一谈。正式商业化时复核当时合同与套餐。 |

## 前轮替代路线资料：当前无需继续展开

### A. 腾讯 CloudBase 上海：静态托管 + 认证 + 数据库／云函数

官方当前计费文档列出上海环境支持 PostgreSQL、身份认证、云函数和静态网站托管。免费体验版为 3000 资源点／月，可在到期前手动续期 6 个月；个人版当前限时价 19.9 元／月。免费及个人版不含数据回档。费用、额度、兑换资格和数据库类型须在选型时再次核对，不能采用旧教程的套餐数字。[资源点价格文档，2026-09-15 更新](https://cloud.tencent.com.cn/document/product/876/127357)

当前登录管理接口支持邮箱、用户名密码、手机号等配置与自有 SMTP；具体登录产品应以新版认证验证，旧 v1 文档已停止更新。[登录配置](https://docs.cloudbase.net/api-reference/manager/node/login-config)、[v1 停更提示](https://docs.cloudbase.net/authentication/auth/introduce)

默认托管域名供开发测试，有访问频率限制；正式站点需评估自定义域名。[静态托管管理](https://docs.cloudbase.net/hosting/manage) 大陆服务器的网站涉及 ICP 备案；腾讯通过 CloudBase 办理备案的云资源条件还包含剩余有效期及固定公网 IP 条件，应按实际接入方式核实，不能假设购买最低套餐就已满足。[备案范围](https://cloud.tencent.com/document/api/243/19630)、[备案云资源](https://cloud.tencent.com/document/product/243/18908)

**历史推断，当前不作为推荐：**前轮因大陆访问要求而列入优先候选。用户撤回该要求后，不再以此触发备案工作；仅在未来重新选择大陆托管时恢复评估。它尚未获批准。

### B. 香港云服务器：前端 + 自托管 Supabase

腾讯轻量服务器提供香港地域；其备案文档说明香港服务器开办网站／APP 不需要 ICP 备案。[轻量服务器](https://cloud.tencent.com/product/lighthouse)、[备案范围](https://cloud.tencent.com/document/api/243/19630) 这不代表跨境线路性能得到保证，具体实例价格、流量和面向家庭运营商的链路尚未核实。

Supabase 官方支持 Docker 自托管。完整组件最低要求为 2 核 CPU、4 GB RAM、40 GB SSD；不需要的组件可删减。TLS、升级、监控、备份恢复、安全维护均由部署者承担；本地开发栈不能直接作为公网生产部署。[Docker 部署](https://supabase.com/docs/guides/self-hosting/docker)、[自托管责任](https://supabase.com/docs/guides/self-hosting)

**推断：**可保留 Postgres／Supabase 技术路线并控制部署位置，但日常运维重于托管服务；不能在未测量资源消耗前承诺最便宜服务器足够。服务器、域名、邮件和异地备份应合计预算。

## 接入前的必要条件与后续验证

1. 真实云接入需要可用的托管平台账号、Supabase 项目及部署权限；正式邮件还需要 Resend 账号与已验证发件域名。应在实施时先检查已连接资源与可用登录状态，不能把「本次未检查」写成「用户没有账号／必须购买新域名」，也不必现在让用户回答能从环境自查的事项。
2. 本轮尚未创建或连接这些资源，因此目前没有已验证的真实数据库、家庭权限、正式发信或跨设备保存闭环。业务开始实施后，必须用真实云项目完成迁移、授权、邀请、找回、写入后刷新／另一设备读取及越权拒绝的验证。
3. 邮箱登录方案已接受；家庭成员与登录账号独立，各操作者各有账号，获财务权限者可查看家庭财务账完整明细。剩余权限角色和邀请／撤销规则由业务 grill 继续明确，无需再询问是否改用微信或短信。
4. 免费层的暂停、备份与限额仍会影响体验。常态预算、恢复目标、首次公开推广是否带商业用途等应在需要作实质取舍时再确定；在任何付费承诺前讨论具体费用。

本次只写规划资料并只读核对构建与模型文件；无创建资源、采购、部署、登录、凭据读取或业务代码变更。
