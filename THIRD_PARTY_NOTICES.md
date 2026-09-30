# 第三方与素材边界

Family City 的 [个人家庭许可](LICENSE) 只覆盖许可人有权授权的原创部分，不改变第三方权利。

- React、React DOM、Three.js、Phosphor React Icons、Supabase JS 及其相关依赖保留各自许可证；本仓库锁定的主要库为 MIT。运行依赖和构建工具的完整原始通知汇总在 [public/third-party-notices.txt](public/third-party-notices.txt)，可随部署访问。
- `public/draco/` 是 Google Draco 解码器，Apache License 2.0；见同目录 [LICENSE](public/draco/LICENSE) 和 [AUTHORS](public/draco/AUTHORS)。原始解码器文件未修改。
- `modeling/` 中原创程序生成 `public/models/` 的城市、交通和财务 GLB；这些原创几何及由它们渲染的图鉴缩略图纳入项目许可。使用 Blender 生成输出本身不令作品自动改用 Blender 软件许可证。
- `references/01-city-overview.png`、`references/08-health-home-levels-v2.png` 是用户批准的设计参考，不在新许可授予范围内；展示来源不代表获准再分发或商业再使用。外部游戏截图没有作为应用模型或纹理引入。
- 项目名称和标识的商标使用、官方背书、截图中用户数据和私密配置均不由 LICENSE 授权。

新增第三方素材时必须记录来源、许可、文件和必要通知；不得把权利未知的图片、模型、字体纳入原创许可声明。
