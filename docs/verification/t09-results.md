# T09 / #11：邻里商街 Lv.3–4

2026-09-29 开始前读取 GitHub #11 实时正文、评论与原生 blocked_by；唯一前置 #10 已关闭。实现提交 `ac11999`；固定审查起点 `41e5652`。此票不扩展 Lv.5–10 或完整图鉴。

## 交付内容

- Lv.3：五栋相连的两三层底商，开放骑楼、阳台栏杆、花槽、瓦屋顶、老虎窗与阶梯山墙；各店入口错位、实体悬挑招牌支架、街道挂旗、暖橱窗与背面服务门窗，前街有咖啡店、日用店、外摆、自行车及包裹收取柜。
- Lv.4：独立红砖转角楼、铜顶角塔、砖缝与窗格；连续的实体拱券、柱墩和半透明玻璃桶拱顶覆盖可通行商廊，北侧五家商店、成组吊灯、入口发光招牌、栏杆和橱窗展示岛。不是把同一高楼截短。
- 原有 `financeProjection` / `FinanceDistrict` 契约直接按资源清单选择新等级；只有已保存当前金额控制实际模型，预览不写账，退出预览回当前级。未交付更高模型仍显示明确提示。
- 按 ADR 0007 注册各级专属通行图：Lv.3 九个地点、Lv.4 十个地点。共享道路行人进入商店、拱廊、外摆和包裹点，购物/取件后携袋离开。自行车为停放的真实几何；未新增独立绕圈顾客或骑行模拟。所有活动仅为视觉效果。
- 继续复用等级作用域的建筑、灯光、视觉时间和访问清理。每个新等级四盏不投射阴影的局部点光源；其余暖灯与橱窗为分组发光材质。降级注销地点、恢复街道人物并释放模型资源。

## 模型验证

压缩 GLB 重新导入通过：两级保持 60×44 m，最高分别约 13.87 m / 19.65 m，低于 60 m；全城共享 1.7 m 行人及现有车辆米制未变。实际三角形、尺寸、字节数和 SHA-256 见 [model-validation.json](t09/model-validation.json)。原城市、旧繁荣几何、灯光、交通及 Lv.1–2 GLB 和 Sites 文件逐字节不变：[preserved-assets.json](t09/preserved-assets.json)。

[Lv.3 南面白天](t09/level-3-south-day.png) · [北面白天](t09/level-3-north-day.png) · [南面夜晚](t09/level-3-south-night.png) · [北面夜晚](t09/level-3-north-night.png)

[Lv.4 南面白天](t09/level-4-south-day.png) · [北面白天](t09/level-4-north-day.png) · [南面夜晚](t09/level-4-south-night.png) · [北面夜晚](t09/level-4-north-night.png)

隐藏等级文字、地块约 200 px 时，成排瓦屋顶和高角楼/长拱顶仍可区分：

![Lv.3](t09/level-3-thumbnail.png) ![Lv.4](t09/level-4-thumbnail.png)

实际 GLB 通行检查沿每条边每 0.15 m 采样，在脚底上方 0.35 / 0.9 / 1.45 m 验证身体净空。Lv.3 共 4,293 次、最小 0.297 m；Lv.4 共 4,158 次、最小 0.327 m，均零碰撞。过程中发现并修正花箱、椅子和展示岛路线。见 [route-validation.json](t09/route-validation.json)。该检查只覆盖静态建筑，不宣称动态人群避碰。

```sh
npm run model:finance-neighbourhood
npm run model:verify-finance
npm run model:verify-activities
bash modeling/run-blender.sh modeling/render_finance_levels.py --levels 3 4 --output docs/verification/t09
```

## 自动验证

- 已确认的纯状态 seam 红→绿：新门槛起初回退 Lv.1，接入清单后可选择 Lv.3–4，并覆盖降级、锁定级预览及退出预览。
- 实际 GLB 检查起初因缺少 Lv.3 文件失败；生成和重导入后通过。
- 新活动图起初缺失使测试失败；补齐后各级 30 分钟连续模拟能访问所有地点、停留、购买、返回，普通访问不瞬移且仍为 40 位道路行人。
- 场景公共边界测试覆盖 2→3→4→3→1，旧访问、灯光与资源均清理；既有过期下载、暂停和失败激活检查继续通过。
- `npm test` 72/72、`npm run typecheck`、`npm run build`、`npm run test:sites` 4/4、`git diff --check` 通过。构建仍有已有 Three.js 主包体积提示。

## 云端和应用内浏览器验收

只用隔离家庭管理员 `family-city-t08-015ba47e@example.com`，家庭 `a3318304-bfc3-45c7-97d9-8c4d14564192`。真实家庭未参与写入，凭据不进入证据。

- 初始 9,999.99 元、版本 7；编辑 30,000 元草稿时模型仍为 Lv.1，2026-09-29 14:54:51（北京时间）明确保存后进入 Lv.3，刷新读回相同结果。
- 14:58:56 保存 80,000 元后进入 Lv.4，公开 `get_finance_book` 回读为版本 9、9 条历史：[cloud-lv4.json](t09/cloud-lv4.json)。
- 最终构建 `/assets/index-9LTc0gWO.js` 在本地 preview 服务正常登录读回 Lv.4。行人进入商廊店铺，观察到同一共享访客购物后 `carrying:true / leaving`，仍为 40 人和 24 辆交通车。
- Lv.4 暂停三次读取的视觉秒数均为 `128.334`，活动状态与位置完全一致；关灯后 `night=0`，重新亮灯/播放正常。Lv.3 暂停两次秒数均为 `133.902`。
- 15:04:03 明确保存 79,999.99 元，降为 Lv.3，历史最高保留 Lv.4/80,000 元；刷新重新打开仍读回相同结果。没有用历史峰值保留商廊。
- 最终 Lv.3/Lv.4 均完成南北昼夜视角检查。Lv.3 背面门窗补细化后，全部浏览器截图已在最终构建中重拍。证据：[browser-evidence.json](t09/browser-evidence.json)、[Lv.3 日间](t09/browser-lv3-day.png)、[夜间](t09/browser-lv3-night.png)、[背面](t09/browser-lv3-rear-night.png)、[Lv.4 日间](t09/browser-lv4-day.png)、[夜间](t09/browser-lv4-night.png)、[背面](t09/browser-lv4-rear-night.png)。

本地最终构建在 1280×720 的短时读数：Lv.3 日间 60.0 FPS / 133 calls / 1,912,317 renderer triangles，夜间 60.0 / 156 / 1,925,058；Lv.4 日间 60.0 / 145 / 2,006,457，夜间 60.0 / 164 / 1,941,414。刷新后的一次 Lv.3 夜间读数为 55.4 FPS。完成夜间渲染后新等级各为 171 geometries / 22 textures，4→3 没有持续增长；首次日间纹理较少是夜间后处理资源尚未启用。对照 T08 的 Lv.2 夜间 161 calls / 1,871,846 triangles / 172 geometries / 22 textures，新增建筑增加约 5.3–7.0 万该视角渲染三角形，调用数相近；这些总数包括全城、阴影与后处理，视角不同也会变化，不是资产自身三角形或所有设备的帧率承诺。

## Standards

Standards：0 项发现。

已对照 `AGENTS.md`、领域术语、ADR 0007、行人活动扩展约定和财务视觉规范检查本次 diff。新等级复用既有 `FinanceDistrict` 与行人活动生命周期，随模型交付独立活动图；旧几何保留、米制布局、等级资源清理及视觉与财务业务隔离均符合约定。

未发现值得提出的硬性规范违反或可操作代码异味。审查时生产验收仍在进行且文档明确标注，本报告不把它视为已完成。

## Spec

Spec 轴：0 个确定的可操作发现。

- 缺失或部分实现：未发现 T09 模型及接入要求缺失。Lv.3 连续底商、差异化屋脊与阳台，Lv.4 红砖角楼、实体拱券与玻璃拱顶均可在南北昼夜图中确认；约 200 px 缩图仍可区分。
- 未请求的行为：未发现范围扩张。新增配置沿用既有已保存等级、预览和共享行人机制，没有改变金融记录、成就或其他街区。
- 实现错误：未发现。活动节点与实际店门、展示岛、外摆及取件点对应；两级资源和灯光由现有等级实例统一管理。

审查依据包括实时 Issue #11、一期规格、视觉 brief、AGENTS.md、实现 diff、路线配置与实际渲染证据。审查范围 `41e5652…ac11999`，由两位独立代理分别执行。审查时生产 E2E、降级刷新和性能记录仍由主代理完成，未将进行中项目视为已通过。提出的旧背面截图提醒已处理：最终构建截图替换旧图。

审查汇总：Standards 0 项、Spec 0 项；两个轴均无待修复项。

## 生产验收

实现 `ac11999` 的 [Vercel 部署成功](https://vercel.com/jojotechs-projects/3d-home-dashboard/6fqVEtKVLJZV25zyT6dbacPVbJxw)。正式域名应用内浏览器实际加载 `/assets/index-9LTc0gWO.js`，与验收构建相同。

- 正式页先核对账号再切换到上述隔离家庭管理员，没有操作真实家庭账。
- 15:09:05（北京时间）实际保存 80,000 元，进入 Lv.4；刷新重新打开账本，仍读回 Lv.4/80,000 元，新商廊正常加载。[线上 Lv.4](t09/production-lv4-day.png)。
- 15:10:43 保存 29,999.99 元，直接降为 Lv.2，旧商廊及其活动提供方退出；15:10:56 保存回验收前的 9,999.99 元，恢复 Lv.1，历史最高仍为 Lv.4。
- 最终公开 `get_finance_book` 回读为版本 13、13 条历史、当前 999,999 分；比开始增加 6 条且都对应上述显式保存，没有动画写账。[cloud-final.json](t09/cloud-final.json)、[恢复截图](t09/production-restored.png)。
- 浏览器状态、资源与控制台证据见 [browser-production.json](t09/browser-production.json)。最终刷新再次读回 9,999.99 元 / 当前 Lv.1 / 历史峰值 Lv.4；本地与生产控制台均无 error / warn。结束时退出测试账号，正式站点回到未登录中性 Lv.1，保留自动北京时间与正常漫游。线上窄窗口的点击坐标映射未能可靠命中，改用同一 in-app browser 的语义定位、表单填充和键盘 Enter 完成真实操作；没有改动 DOM 或通过脚本提交业务写入。
