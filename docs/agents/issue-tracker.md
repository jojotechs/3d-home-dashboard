# Issue tracker: GitHub

本项目的待办与规格使用 https://github.com/jojotechs/3d-home-dashboard 的 GitHub Issues。使用 `gh` CLI；明确指定该仓库，或在根目录由 origin 推导。

- 创建前查询已有 issue，避免重复。创建使用 `gh issue create --repo jojotechs/3d-home-dashboard --title "..." --body-file <file>`，多行正文先写入文件。
- 读取使用 `gh issue view <number> --repo jojotechs/3d-home-dashboard --comments`；列表使用 `gh issue list --repo jojotechs/3d-home-dashboard --state open --json number,title,body,labels`。
- 技能要求“publish to the issue tracker”时，目标为 GitHub Issue；“fetch the relevant ticket”指读取相关 Issue 及评论。写入必须符合当前用户授权。
- PRs as a request surface: no.

## Triage vocabulary

- `ready-for-agent`：规格完整、测试入口已核对，可由代理承接后续工作；不表示功能已实现或验收通过。`to-spec` 完成后直接应用此标签，无需额外 triage。
- 使用既有 Issue 更新同一份规格，避免为格式整理创建重复任务。
- `to-tickets` 发布的任务使用 GitHub 原生 blocking 关系，并在正文列出 `Blocked by`。开始任务前读取实际阻塞状态；有 `ready-for-agent` 标签不代表其前置已完成。
- 分片发布时引用父规格，不修改或关闭父 Issue。每个需 E2E 的分片优先使用 in-app browser，独立完成对应验收。
