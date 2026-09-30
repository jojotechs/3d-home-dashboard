# 一期使用与维护

正式应用：<https://3d-home-dashboard.vercel.app/>。本期交付真实家庭认证、共享财务及财务市区十级成长；生活区、任务和旅行仍为明确标识的本机示例。完整验收见 [T16](verification/t16-results.md)，历史规格见 [一期规格](specs/phase-one.md)。

## 家庭使用

- 右上角登录，管理员从「账号与家庭 → 管理家庭成员」添加成员、发送邀请并单独授予财务权限。成员称呼可留空，提交时生成短字母数字昵称。公众注册关闭。
- 财务市区录入余额与正数负债，金额为人民币；点击保存并收到云端确认才生效。创建者是录入来源，资金对有财务权限的家庭成员共同可见、可修改。
- 刷新读回云账。冲突时逐行核对自己输入与最新记录；提交结果未知时保留同一请求并重试，不通过重复新建来猜测保存结果。
- 「历史与趋势」可纠正金额。修正旧记录只影响那条历史、趋势与成果；修正最近一次更新也会改变当前账本。原创建者、原操作人和修订人分别保留。
- 「成长图鉴」点选 Lv.1–10，在真实三维地图旋转查看。当前等级高亮；有效历史曾达到的等级彩色；未达到的等级灰色但仍可预览。结束预览或离开图鉴恢复当前云账等级，不写入金额、不解锁成就。
- 当前净储蓄下降会让财务市区立即降级。住宅/健康的累加设施、两辆独立车辆和其他生活示例保留原规则。
- 忘记密码从登录弹窗申请邮件，回到本站设置新密码；过期链接重新申请。不要向维护者发送密码。

## 部署与机密边界

| 组件 | 当前配置 |
| --- | --- |
| Web | Vercel，GitHub `jojotechs/3d-home-dashboard` 的 `main`，`npm run build`，输出 `dist/client` |
| Supabase | 独立项目 `ebffwcnodbusvmsgmnqg`，Postgres / Auth / `invite-household` Edge Function |
| 浏览器变量 | 仅 `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY`，格式见根 `.env.example` |
| 邀请函数秘密 | `APP_URL`、`MAIL_FROM`、`RESEND_API_KEY`、`EXTRA_ORIGINS` 及平台注入的 Supabase 服务端凭据；不放进 Vite 变量 |
| 邮件 | Resend 已验证域 `mail.jojotechs.com`，`家庭小城 <family@mail.jojotechs.com>`，SMTP `smtp.resend.com:465` |
| Auth 回跳 | Site URL 为正式域名；允许正式域名 `/**` 和已声明 localhost/127.0.0.1:5174 `/**`；关闭公众注册及匿名登录，密码最少 12 位 |
| 迁移 | `supabase/migrations` 的 7 份版本化迁移；T16 核对本地与远端完全一致 |

`invite-household` 的 `verify_jwt=false` 用于兼容公开 key；函数内部调用 `auth.getUser()` 验证身份，再以用户上下文检查管理员权限，不能移除这些检查。账号 bootstrap 只在受保护的维护环境执行，不在网页中暴露管理凭据。

本机配置与测试凭据被 Git 忽略，权限为 0600；共享邮件凭据路径和维护方法见 [邮件接入文档](verification/t03-cloud-setup.md)。正式家庭绝不作为写测试目标，也不导入旧 localStorage 演示金额。公共 GLB 和缩略图只描述建筑等级，不含某个家庭的金额或达成状态。

2026-09-30 只读配置核对：声明字段无漂移，10 项平台远端额外设置保持不变；SMTP 密码被管理 API 掩码，不能据此声称重新验证了密码值。真正送达、链接回跳、用户设密及新密码重登的验收在 [T03](verification/t03-results.md)。未购买套餐或新服务；后续必要费用另行确认。

## 修改与复现

安装依赖后，开发者使用本机 `.env.local` 的公开变量运行 `npm run dev -- --host 127.0.0.1 --port 5174 --strictPort`，固定到已允许的本地回跳端口；端口被占用时直接报错，不自动切换。执行代理应自行运行并在 **in-app browser** 验证，不使用用户 Chrome。邮件回跳测试优先正式域名；更换域名时同步 Auth allowlist、Site URL、邀请函数 APP_URL 与来源白名单。

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run test:sites
```

构建必须留下 `dist/client/index.html`、`dist/server/index.js`、`dist/.openai/hosting.json`；保留 Sites Worker 与包装脚本。Vercel 从 main 自动构建后，必须核对部署状态并实际进入正式站验证，而不只依赖本机构建。

真实云端回归使用各自隔离家庭：

```sh
npm run test:cloud
npm run test:cloud:lists
npm run test:cloud:household
npm run test:cloud:collaboration
npm run test:cloud:corrections
```

这些命令缺配置直接失败。`lists` 与 `collaboration` 共享同一测试家庭，按顺序运行；其他套件使用各自独立家庭。初始身份准备可用受保护管理流程，业务断言必须经过真实 Auth 和公开 RPC/Edge，不读取私有表冒充用户链路。网络丢响应/竞态用同一公开接口准确注入；浏览器验证正常 UI 与结果，不把接口注入称为浏览器断网。

数据库变更先读迁移差异，再执行 `supabase db push --dry-run`，确认后应用并验证。Auth 变更先 `supabase config diff --project-ref ebffwcnodbusvmsgmnqg`；仅应用有意声明的变更，保留远端其他设置，输出不得含密钥。禁止重跑 bootstrap 来重建已有真实家庭。

模型生成使用 `/Applications/Blender.app`，建模单位为米。十级资源映射是 `modeling/finance-levels.json`；分阶段生成命令见 package.json 的 `model:finance*`。新增等级或活动时同步 [行人活动扩展约定](agents/pedestrian-activities.md)。无需为了普通 UI 修改重生成已批准模型。

```sh
npm run model:verify-finance
npm run model:verify-activities
npm run model:verify-finance-airspace
npm run model:verify-finance-density
npm run model:verify
npm run model:scale
npm run model:verify-mobility
npm run model:verify-lighting
npm run model:verify-transport
```

## 已知边界

- 高等级夜景成本高于早期街区。M3 Pro 的三轮实际采样及资源释放数据见 [T15](verification/t15-results.md)；不能保证每台设备固定 60 FPS。生产构建仍有既有 Three.js 大 chunk 提示。
- 自动系统减动态分支有代码/场景测试覆盖，本轮没有切换用户 OS 偏好。手动暂停与日夜切换有真实浏览器证据。
- 离线编辑/自动合并、银行连接、财务导入导出及备份恢复 UI 均在本期之外；没有新增备份服务或计划任务。
- 源码按 [Family City Personal Use License 1.0](../LICENSE) 提供，许可人 zhanyi xu；商业与家庭外托管需另授权。第三方素材边界见 [通知](../THIRD_PARTY_NOTICES.md)，外部贡献需先完成商业再授权协议。
