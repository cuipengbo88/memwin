# memwin 看板

> 最后更新: 2026-06-23

---

## 项目概要

| 项 | 值 |
|---|-----|
| 项目名 | memwin |
| 定位 | Windows 版 Claude Code 对话实时记忆系统（Obsidian 集成） |
| 许可证 | MIT |
| 本地路径 | `C:\Users\13706\memwin\` |
| Vault 路径 | `C:\Users\13706\Documents\Obsidian Vault\memwin\` |
| 安装状态 | ✅ 已安装，v2 更新完成（Obsidian 集成 + 格式标准化 + 校验） |

---

## v2 更新内容 (2026-06-23)

| # | 变更 | 说明 |
|---|------|------|
| 1 | Vault 路径 | 迁移至 Obsidian vault 的 `memwin/` 子目录 |
| 2 | Frontmatter 格式 | 改为 Obsidian Properties 标准（title/date/tags/aliases/related/source） |
| 3 | SessionEnd hook | 重写：扫描当天笔记 + YAML 校验 + 输出完整路径 |
| 4 | 写入后验证 | CLAUDE.md 和 hook 注入都加了「写完立即 Read 验证」步骤 |
| 5 | setup.ps1 | 自动检测 Obsidian vault，默认路径改为 `{obsidianVault}\memwin` |

---

## 待验证（需新会话实测）

| # | 验证点 | 预期结果 |
|---|--------|---------|
| 1 | 新会话 hook 注入是否包含验证步骤 | 系统提示中出现「写完立即验证」 |
| 2 | 新笔记 frontmatter 是否为 Obsidian Properties 格式 | title/date/tags/aliases/related/source |
| 3 | SessionEnd 是否列出笔记完整路径 | 终端显示每条笔记的绝对路径 |
| 4 | SessionEnd 校验是否通过 | 所有笔记显示 OK |
| 5 | Obsidian 中是否能看到笔记 | 打开 Obsidian vault → memwin/ 文件夹 |

---

## 可选扩展

| # | 想法 | 优先级 | 备注 |
|---|------|--------|------|
| A | 自动 git commit/push wiki 变更 | 待定 | 多机同步 |
| B | Windows Task Scheduler 定时自动整理 | 待定 | 需要 `claude -p` 无头模式可用 |
| C | 支持多 vault（工作/个人分离） | 待定 | |
| D | 笔记导出为 HTML/PDF | 待定 | 给老板看周报？ |
| E | 自定义记录规则（用户可编辑 CLAUDE.md 调整） | 待定 | 已部分支持 |
| F | 快捷键触发"立即记录这条" | 待定 | |
| G | 笔记按项目/话题自动分组 | 待定 | |
| H | 笔记之间的自动关联推荐 | 待定 | |

---

## 下一步

1. 重启终端（新 OBSIDIAN_VAULT 需要生效）
2. 开新会话聊天
3. 检查 Obsidian vault 中 `memwin/` 文件夹是否有新笔记
4. 观察 SessionEnd 是否输出校验结果
