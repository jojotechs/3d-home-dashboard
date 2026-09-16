# 选择源码公开与商业授权方案

跟踪：[GitHub Issue #1](https://github.com/jojotechs/3d-home-dashboard/issues/1)。

状态：待决策。用户希望公开源码供初期推广，同时保留第三方商业使用的授权控制；没有选定或授予新的许可。

## 验收要求

- 明确家庭自部署、修改、公开 fork、免费再分发及免费托管是否允许。
- 明确收费托管、付费代部署/维护、捆绑销售、广告变现、捐赠、付费教程及企业内部使用的边界。
- 对照官方原文选定许可证，并准确描述为源码可见或开源。
- 明确应用代码、建模脚本、模型、纹理、参考图和品牌的许可范围；保留第三方原有权利及通知。
- 明确项目权利人及外部贡献的商业再授权机制。
- 决策达成后加入 LICENSE、README 说明及必要贡献约定，并记录关键取舍。

## 官方条款核查（2026-09-16）

- [OSI 开源定义](https://opensource.org/osd)允许商业用途，禁止第三方商业用途的要求通常应描述为“源码可见 / source-available”。
- [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0)是优先研究候选：允许符合其用途约束的修改与再分发，没有自动转开源日期。但正文有慈善、教育、研究、政府等机构的允许用途，不能仅凭名称认定满足所有商业限制。
- [PolyForm Strict 1.0.0](https://polyformproject.org/licenses/strict/1.0.0)不授予修改及再分发权，也有机构用途例外；可能与社区 fork、贡献需求冲突。
- [AGPLv3](https://www.gnu.org/licenses/agpl-3.0.html)允许收费和商业使用，不能保证商业经营只属于维护者。
- [BSL 1.1](https://mariadb.com/bsl11/)每个版本在指定日期或首次发布满四年（较早者）转为指定开源许可；[FSL](https://fsl.software/)每版本两年后转 MIT 或 Apache 2.0。二者不适合永久商业限制。
- [DCO](https://developercertificate.org/)不能自动赋予维护者额外的商业再授权权利；贡献政策需明确实际授予的权利。
- [Blender 官方说明](https://www.blender.org/about/license/)明确，使用 Blender 创作的输出不会仅因此必须采用 Blender 的 GPL；导入素材及其他第三方内容仍须单独核查。

以上是候选比较，不是最终许可决定，也不是商业独占或全部素材权利的保证。
