# Matt skills setup 草稿

状态：用户于 2026-09-16 选择 GitHub Issues；本草稿已落实至 AGENTS.md 与 docs/agents/。未安装 triage，因此不配置标签。正式规则以 docs/agents/ 中的文件为准。

## 拟加入 AGENTS.md

```markdown
## Agent skills

### Issue tracker

任务和规格使用 GitHub Issues：`jojotechs/3d-home-dashboard`。见 `docs/agents/issue-tracker.md`。

### Domain docs

单一领域上下文：根目录 `CONTEXT.md` + `docs/adr/`。见 `docs/agents/domain.md`。
```

## 拟写入 docs/agents/issue-tracker.md

```markdown
# Issue tracker: GitHub

本项目的待办与规格使用 https://github.com/jojotechs/3d-home-dashboard 的 GitHub Issues。使用 `gh` CLI；明确指定该仓库，或在根目录由 origin 推导。

- 创建前查询已有 issue，避免重复。创建使用 `gh issue create --repo jojotechs/3d-home-dashboard --title "..." --body-file <file>`，多行正文先写入文件。
- 读取使用 `gh issue view <number> --repo jojotechs/3d-home-dashboard --comments`；列表使用 `gh issue list --repo jojotechs/3d-home-dashboard --state open --json number,title,body,labels`。
- 技能要求“publish to the issue tracker”时，目标为 GitHub Issue；“fetch the relevant ticket”指读取相关 Issue 及评论。写入必须符合当前用户授权。
- PRs as a request surface: no.
```

## 拟写入 docs/agents/domain.md

```markdown
# Domain docs

本项目采用单一领域上下文：根目录 `CONTEXT.md` 仅存业务术语，`docs/adr/` 记录有实质取舍的重要决策。

探索代码前先读 `CONTEXT.md` 及与任务相关的 ADR；缺失时直接继续，由 domain-modeling 在术语或决策明确时按需创建。

在任务、规格、代码讨论与测试中使用词汇表的标准术语。不要将技术实现、开放问题或临时计划写入词汇表；这些保存在相应任务或规划文档。

若提议与已有 ADR 冲突，明确指出冲突并解释重新讨论的原因，不要静默覆盖。
```
