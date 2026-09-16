# T01 验收记录

日期：2026-09-16。任务：[Issue #3](https://github.com/jojotechs/3d-home-dashboard/issues/3)。

状态：实施中，云端验收尚未完成；不能关闭 Issue #3 或解除后续票的依赖。

## 已有证据

- 开始时读取线上 Issue #3 和原生 `blocked_by`：无阻塞。
- 工作区原先没有提交；将批准原型与规格保存为 `f4defde`，作为本票差异审查基线。
- `tests/finance-state.test.mjs`：先失败后实现；1234.56 元、1 分以及超浮点精度整数分往返正确，拒绝指数、小数分及负余额输入。
- `tests/finance-database.test.mjs`：PGlite 本地 SQL 契约验证覆盖空家庭、完整历史、创建者/修改者、整数分、原子回滚、重复请求不重复保存、陈旧版本/重用键拒绝、匿名/跨家庭/无权限拒绝、直接写表及管理员初始化越权拒绝。
- `tests/city-state.test.mjs`：新增测试先发现旧演示财富峰值影响模型；已隔离，财务基础几何不读旧峰值，生活区原行为继续通过。
- `npm run typecheck` 已通过；`npm run build` 已成功生成 `dist/client/index.html`、`dist/server/index.js`、`dist/.openai/hosting.json`。仅有既有 Three 场景体积超过 500 kB 的提示。
- 本地服务由代理运行在 `http://127.0.0.1:5174/`；in-app browser 打开真实 GLB 城市并选择财务区，显示“家庭财务账尚未连接”，没有假余额/历史。已观察截图并修正夜间文字对比。

## 外部前置与待验证

- Vercel 已在 in-app browser 登录至 `jojotechs-projects`。现有三个项目不属于此仓库；本项目部署尚未创建。
- Supabase 在 in-app browser 的 GitHub 登录跳转遇到 `ERR_TIMED_OUT`，已恢复一个正常登录页面供继续操作。尚未选择/创建项目、执行迁移或初始化管理员。
- 尚无本项目云 URL、公开 key、管理员邮箱/初始身份及隔离测试家庭配置。
- 部署网页登录 → 保存 → 刷新 → 退出重登 → 另一隔离会话读回、真实 Auth/HTTP 权限和网络失败场景仍待完成。没有用 PGlite 或本地截图声称云端验收成功。
- Resend 邀请/恢复邮件属于 T03，本票不标记已验证。

## 最终检查

待完成全部代码与审查后填写全量测试、Sites 检查和两轴 code-review 结果。
