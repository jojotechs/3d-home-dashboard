# 财务街区 v0.4 · 城市层次

> 版本说明：本文描述已实现的 v0.4 三级几何，保留为建模依据。正式业务一期规划为五阶段十级，当前财务等级可升可降；下文历史最高保级的旧业务说明已由 [ADR 0004](../docs/adr/0004-finance-level-follows-current-savings.md) 替代。


用户反馈：六栋相似玻璃楼缺少外观差异和真实城市的错落感。此轮只重建财务街区，保持 60 × 44 m 用地、米制比例、原有城市道路和三级财富里程碑。

## 空间与建筑

| 建筑 | 最高轮廓（约） | 识别特征 |
| --- | --- | --- |
| 街角老银行 | 14.4 m | 暖色石材、拱窗、柱廊、山花、小钟楼 |
| 花园办公楼 | 26.1 m | 三层退台体量、青绿色玻璃、白色水平檐口、花池与屋顶廊架 |
| 红砖商楼 | 21.7 m | 拱形底商、独立窗洞、铁艺阳台、铜绿折坡屋顶、咖啡外摆 |
| Art Deco 塔楼 | 47.1 m | 竖向石材肋、墨色窗带、多次退台、铜绿和黄铜塔冠 |
| 棱面玻璃塔 | 57.7 m | 窄身倒角平面、冷蓝玻璃、斜切楼顶与斜向立面接缝 |
| 圆形交易楼 | 39.5 m | 环形楼层、收分轮廓、青色玻璃、黄铜菱形斜撑 |

前排为低、中层街道界面，后排形成不等高天际线。沿街保持可步行的开口，右前方增加喷泉、弧形座椅和咖啡外摆；树荫分布在转角与通道，避免再次排成同宽、同间距的六个塔楼基座。背面也有完整立面。

这些是适配家庭小城比例的原创组合，不是城市地标的等比例复刻。参考的是类型、轮廓和街道空间关系。

## 参考依据

- [Chicago Architecture Center · Art Deco](https://www.architecture.org/online-resources/architecture-encyclopedia/art-deco)：竖向强调、建筑退台、几何装饰；用于石材塔楼和铜绿塔冠的设计语言。
- [Manhattan West 官方场地](https://manhattanwestnyc.com/) 与 [街区导览](https://manhattanwestnyc.com/guide/the-perfect-west-side-day/)：高楼围合的树荫广场、公共座椅、底层餐饮与步行空间；用于街角公共空间组织。

## 成长与制作

三个等级是完整、互斥的街区阶段，不是同一批高楼的三段截面：

| 等级 | 建筑与街区性质 |
| --- | --- |
| Lv.1 街角初成 | 小型储蓄所、坡屋顶家庭办公室、咖啡店、合作社、有摊位的市场棚、街角花园凉亭；更多地面绿化和庭院 |
| Lv.2 稳步积累 | 老银行扩建、L 形商业办公楼、带完整屋顶的红砖商楼、宽体市民办公楼、底层商业骑楼、中层交易所；新旧混合 |
| Lv.3 繁荣街区 | 用户已批准的六种地标建筑与天际线，完整保留几何 |

保留 `finance_tower_0..5_level_1..3` 名称和 `kind/minLevel/district` 字段，财务节点增加 `maxLevel`，每个阶段只展示对应的六栋完整建筑。没有 `maxLevel` 的健康和住宅设施继续累加。历史最高净资产仍决定永久等级；预览与净资产减少都不会清除已达到的里程碑。

局部模型：`refined_finance.py`；全城组装：`build_city.py`。材质仍使用共享调色板、顶点颜色及本地 Draco 压缩。无需联网贴图或运行时第三方资产。

复现审图：

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 --python modeling/build_city.py -- --no-renders
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 --python modeling/render_city_studies.py -- --district finance --prefix v4
```
