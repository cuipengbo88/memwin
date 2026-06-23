# memwin

> Windows 版 Claude Code 实时对话记忆系统 — 对话中自动捕捉洞察，直接写入 Obsidian vault。

## 工作方式

```
SessionStart → hook 注入笔记官角色 + vault 上下文
     ↓
Claude 全程静默记录重要洞察
     ↓
笔记直接写入 Obsidian vault — 打开 Obsidian 即可查看
     ↓
SessionEnd → hook 校验笔记并报告结果
```

## Vault 结构

```
{OBSIDIAN_VAULT}/memwin/
├── CLAUDE.md           # 笔记模板和记录规则
├── wiki/
│   ├── index.md        # 笔记目录
│   ├── hot.md          # 最近动态
│   ├── notes/          # 通用笔记（工具、配置、偏好）
│   ├── concepts/       # 概念澄清
│   ├── decisions/      # 重要决策
│   └── methods/        # 方法论/工作流/框架
└── raw/                # 手动投放材料
```

## 记录规则

**必须记：**
- 决策 + 理由 → `decisions/`
- 方法论认可/质疑 → `methods/`
- 客户定位判断 → `notes/`
- 偏好表态 → `notes/`
- 待办事项 → `notes/`
- 投资逻辑与市场判断 → `decisions/`
- 工具与技术发现 → `notes/`

**应该记：**
- 踩坑修复与非标配置 → `notes/`
- A vs B 最终结论 → `decisions/`
- 概念澄清 → `concepts/`
- 工作流优化 → `methods/`

**不记：**
- 闲聊与寒暄
- 纯操作步骤流水账
- 试错中间状态
- 已有笔记的重复内容
- 敏感信息

## 笔记模板

```markdown
---
title: "笔记标题"
date: YYYY-MM-DD
tags:
  - memwin
  - type/[decision|method|concept|note]
  - [业务标签]
aliases: []
related:
  - "[[关联笔记]]"
source: claude-code-session
---

#type/[类型]

## 摘要
一句话结论，不超过 50 字。

## 要点
- 要点 1
- 要点 2
- 要点 3

> [!info] 我的立场
> 我当时的判断——认同/质疑/补充了什么。必填。

## 关联笔记
- [[关联笔记 1]]
- [[关联笔记 2]]
```

## 字段规则

| 字段 | 规则 |
|------|------|
| `type/` 标签 | decisions → `type/decision`, methods → `type/method`, concepts → `type/concept`, notes → `type/note` |
| 业务标签 | `投资` / `客户` / `方法论` / `工具` / `脚本` / `定投` / `AI` / `内容创作` / `vibe-coding` |
| `related` | 写入前扫描 vault，找 2-3 条最相关的已有笔记 |
| `> [!info] 我的立场` | **必填**，不允许空或写「暂无」|

## 行为约定

- 写入前扫描 vault：30 天内有同主题笔记则 Edit 追加，不新建
- 写入后 Read 验证文件存在 + callout 非空
- 更新 wiki/index.md + wiki/log.md
- **绝不在对话中提及你在记笔记**，除非用户主动问

## 快速开始

### 前提

- Windows 10/11
- Node.js 18+
- Claude Code
- Obsidian（推荐 Minimal 主题）

### 安装

```powershell
cd ~/memwin
.\setup.ps1
```

安装脚本会自动：
1. 检测 Obsidian vault 位置
2. 创建 `memwin/` 子目录
3. 设置 `OBSIDIAN_VAULT` 环境变量
4. 安装 SessionStart / SessionEnd hooks

### 使用

什么都不用做。正常对话即可。Claude 会自动记录重要内容。

### 查看笔记

打开 Obsidian → vault 中找到 `memwin/` 文件夹。推荐启用 `memwin-apple.css` snippet 获得最佳阅读体验。

## 卸载

编辑 `~/.claude/settings.json`，删除 hooks 中包含 `memwin` 的条目。

## 许可证

MIT
