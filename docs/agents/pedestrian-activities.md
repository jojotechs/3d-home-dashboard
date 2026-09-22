# 扩展街区行人活动

场景创建 `PedestrianActivities({random})` 并通过构造参数注入模拟。每帧只有模拟推进活动时间，渲染器只消费姿态、可见性、步态和购物袋状态。`random` 默认使用 `Math.random`，验收可以注入带种子的随机函数。

新增街区时：

1. 为该模型编写米制配置：`origin`、`routeIndex`、`entrance`、`nodes`、`edges`、`places`。节点采用 Blender `[x,y,z]`，相对街区中心；入口必须落在所选人行道上。节点 z 是脚底高度，台阶也必须给出高度。
2. `places` 包含唯一 `id`、所在节点 `node`、`action`、停留秒数范围 `dwell`、面朝方向 `facing`。室内访问设 `indoor:true`，购物设 `purchase:true`。室内节点停在真实门口外，不规划穿墙路线。
3. 模型激活后调用 `activities.register(new DistrictActivities(config))`，保存返回的卸载函数。替换等级、退出或销毁时调用它。迟到的模型下载不能注册旧活动。
4. 用真实模型检查所有图边的通行空间，再验证从道路进入、停留、离开，以及模型切换时没有残留的隐藏行人或预约。参考 `modeling/verify_activity_routes.py` 和 `tests/pedestrian-activities.test.mjs`。

实例提供方接口只有 `id`、`routeIndex`、`entry`、`entrance`、`reserve(random, excluded)`、`release(place)` 和 `path(from,to)`。`path` 返回世界坐标序列，`reserve` 返回该实例独占的地点或 `null`。同街区重新注册会先取消旧访问，旧卸载函数不能移除新的实例。

单次访问随机选择一到两个不同地点，已占用地点不参与选择；没有余位时继续走街道。当前没有真实室内、排队、人群避碰或消费经济模拟。街区变更取消访问时会恢复到街道，而普通进出全程连续移动。不要把模拟行为当成家庭成员的真实行踪或财务记录。
