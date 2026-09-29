# 财务街区行人互动验收

用户于 2026-09-22 要求街道行人与建筑互动，从财务市区开始，并使用面向对象和 IoC 方便扩展。实现提交 `98d48b5`；加载失败时不注册活动的补充提交 `f72c5ba`。本次不是 T09，不修改其他票据状态。

## 行为与结构

- 现有 40 位道路行人保留身份；财务街区所在人行道的行人会从南侧入口进入，随机访问一到两个设施，再沿通行图回到原街道。普通访问逐帧移动，不在街道与店铺之间瞬移。
- Lv.1：街角咖啡店、外摆、储蓄所、合作商店；Lv.2：市场、三个摊位、咖啡店、外摆、储蓄所。浏览/咖啡停留可见；室内访问停在门口后隐藏，若干秒后从同处出现。购物后增加随手臂移动的三维手提袋。
- 提供方对停留点进行独占预约，避免多人停在同一位置。切换等级或卸载取消旧访问并恢复到街道，释放预约；旧下载和旧卸载函数不能恢复/删除错误的活动实例。失败的模型激活不发布活动地点。
- 场景创建并注入 `PedestrianActivities`，财务模型注册 `DistrictActivities`；后者封装通行图、路径与地点预约，内部 `Visit` 管理活动生命周期。扩展方式见 [接入说明](../agents/pedestrian-activities.md) 和 [ADR 0007](../adr/0007-district-pedestrian-activities.md)。
- 保留原 GLB 与其他区块的模型。隐藏财务 GLB 中原本独立绕圈的顾客，改用城市共享的关节行人。两个手提袋实例批次随城市行人一起释放。

## 自动验证

- `npm test`：70/70。
- `npm run typecheck`、`npm run build`、`npm run test:sites`：通过（Sites 4/4，仍有既有的 Three.js 大包提示）。
- `npm run model:verify-activities`：重导入实际压缩 GLB，按 0.15 m 间隔采样每条路线，在脚底上方 0.35 / 0.9 / 1.45 m 检查 0.24 m 身体净空；两个等级均通过。初次检查发现花箱、市场入口、路缘与台阶遮挡，调整路径和脚下高度后通过。结果见 [route-validation.json](pedestrian-activities/route-validation.json)。这是静态建筑通行检查，不是动态人群避碰。
- 长程测试分别模拟两个等级各 15 分钟，经过全部活动地点，覆盖室内停留、外摆、摊位浏览、购买、离开及回到道路，单帧位移受步速约束；零时间不推进停留或步行。
- 注入独立的阅读地点，验证不修改行人或财务模块即可执行新活动；另验证预约释放、旧注销函数、加载竞争、模型激活失败与资源释放。

## 应用内浏览器与云端

仅使用 Codex in-app browser。现有隔离家庭 `a3318304-bfc3-45c7-97d9-8c4d14564192` 用于验收，真实家庭未写入。

- 本地 Lv.1 观察到咖啡店室内停留、外摆停留、合作商店访问以及提袋离开。暂停后跨昼夜切换，两次 `seconds` 都为 233.666，访客状态和位置完全相同，灯光正常变化。
- 本地保存 10,000 元后切换到 Lv.2；刷新后从云端恢复。观察到购买后继续前往咖啡店，再离开街区，另一访客完成储蓄所访问。40 位共享行人、24 辆交通车辆保持不变。
- 本地 1280×720 的一次实际采样为 60.0 FPS、171 个 renderer geometries、22 个 textures；它是该机器单次读数，不代表所有设备。
- 多轮访问后云端仍是版本 6、6 条历史、1,000,000 分；动画没有生成财务记录。两次读取证据为 [cloud-lv2.json](pedestrian-activities/cloud-lv2.json) 与 [cloud-after-visits.json](pedestrian-activities/cloud-after-visits.json)。
- 状态和截图：[browser-local.json](pedestrian-activities/browser-local.json)、[Lv.1 夜景](pedestrian-activities/lv1-night.png)、[Lv.2 白天](pedestrian-activities/lv2-day.png)。

## 生产验收补完（2026-09-29）

- Vercel 最终代码提交 `f72c5ba` [部署成功](https://vercel.com/jojotechs-projects/3d-home-dashboard/GQe6Vi33oFnhHaDgqL1Abfa3ChHd)，生产域名及应用内浏览器实际加载 `/assets/index-ByYlGkTs.js`。
- 恢复工作时，隔离家庭仍为 10,000 元、版本 6、6 条历史；没有覆盖他人新增记录。登录从共享认证弹窗返回财务区，显示云端 Lv.2。
- 生产环境观察到同一批街道行人进入市场区，分别前往咖啡店和花摊；保持 40 位行人、24 辆交通车辆，采样 59.5–60.1 FPS，浏览器控制台无 error / warn。
- 同一访客 `36` 从前往咖啡店到 `carrying:true / leaving`，另一访客访问花摊后完成返回，随后访客 `0` 前往水果摊；记录见 [browser-production.json](pedestrian-activities/browser-production.json) 和 [线上 Lv.2](pedestrian-activities/production-lv2.png)。
- 通过线上“保存修改”把隔离家庭恢复到验收前的 9,999.99 元；模型立即降为 Lv.1，旧市场访客/预约清空，共享行人数量不变，历史最高保持 Lv.2。最终云端为版本 7、7 条历史，仅增加本次升级和恢复的两次人工验收保存。[最终云端回读](pedestrian-activities/cloud-final.json)、[恢复后的线上 Lv.1](pedestrian-activities/production-lv1-restored.png)。真实家庭未写入；活动没有写账。

## 范围

目前接入财务 Lv.1–2；后续财务等级必须随模型提供匹配的通行图，其他板块在自身功能开发时注册提供方。本次没有建模室内、开门动画、排队、人群避碰或消费经济。活动不代表家庭成员的真实位置，不写财务数据，不改变成就。减少动态效果、页面隐藏和全局暂停均停止视觉时间，真实行程时钟保持原逻辑。
