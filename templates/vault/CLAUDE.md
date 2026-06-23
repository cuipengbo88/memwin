---
schema_version: 3
---

# memwin vault

> 由 memwin 自动维护的对话笔记知识库。Claude 在对话中实时记录重要内容。
> 也兼容 llm-wiki-manager 手动深度研究。

## 目录结构

- `wiki/` — Claude 自动维护的笔记
  - `wiki/notes/` — 通用笔记（工具、配置、对比、投资判断、用户偏好）
  - `wiki/concepts/` — 概念/术语澄清
  - `wiki/decisions/` — 重要决策记录
  - `wiki/methods/` — 方法论/工作流/框架
- `raw/` — 用户手动投放的材料（llm-wiki-manager 共用）

## 记录规则（按检索场景判断）

**先问自己：用户下周会怎么找这条信息？**

| 检索场景 | 存哪里 | 示例 |
|---------|--------|------|
| "上次那个工具叫什么来着？" | `notes/` | 工具发现、资源链接 |
| "XX 和 YY 有什么区别？" | `concepts/` | 概念澄清、术语对比 |
| "为什么当时选了 A 不选 B？" | `decisions/` | 决策 + 背景 + 选项 + 理由 |
| "这个方法怎么用来着？" | `methods/` | 方法论步骤、框架、工作流 |
| "上次踩的坑怎么解决的？" | `notes/` | 技术配置、bug 修复（只记根因+方案，不记试错） |
| "我对 XX 是什么判断？" | `notes/` | 投资逻辑、市场观点 |
| "我喜欢/不喜欢什么？" | `notes/` | 用户偏好（长期规则优先更新本文件） |
| "还有什么要做的？" | `notes/` | 待办事项 |

**不记：** 闲聊、操作指令（"帮我改名"）、试错中间过程、已有笔记覆盖的内容、敏感信息。

## 业务专属规则

以下是你（用户）的业务场景对应的记录要求：

| 业务场景 | 记录重点 | 示例 |
|---------|---------|------|
| **知识付费** | 课程框架决策、定价逻辑、学员反馈中提炼的模式 | "把 AI 课从 199 调到 399 是因为学员更看重实操" |
| **陪跑教练** | 教练方法论、客户互动模式、进度追踪技巧 | "用每周复盘代替每日检查，客户留存率更高" |
| **短视频脚本** | 爆款钩子公式、开头结构、选题方向判断 | "实体老板类视频用'反问开头'比'数据开头'完播率高" |
| **投资决策** | 基金/股票判断逻辑、市场归因、资产配置理由 | "选择广发270042而非南方016452是因为规模更大、费率更低" |
| **vibe coding** | 工具选型、架构决策、踩坑修复、工作流优化 | "Windows 上用 PowerShell 写 setup 比 bash 兼容性好" |

> 投资类笔记与 zhengxi-views 的分工：zhengxi-views 管郑希原话引用和基金数据对比；memwin 记的是**你自己的判断逻辑和决策过程**。

## 笔记格式模板

### 通用笔记 (wiki/notes/)

```markdown
---
title: "笔记标题"
date: YYYY-MM-DD
tags:
  - memwin
  - type/note
  - 业务标签
aliases: []
related:
  - "[[关联笔记标题]]"
source: claude-code-session
---

#type/note

## 摘要
一句话核心结论，不超过 50 字。

## 要点
- 要点1
- 要点2
- 要点3

> [!info] 我的立场
> 我当时的判断：认同/质疑/补充了什么，与已有认知或决策的关系。
```

### 概念 (wiki/concepts/)

```markdown
---
title: "概念名"
date: YYYY-MM-DD
tags:
  - memwin
  - type/concept
  - 业务标签
aliases: [中文名, EnglishName]
related:
  - "[[关联笔记标题]]"
source: claude-code-session
---

#type/concept

## 摘要
一句话定义，不超过 50 字。

## 要点
- 核心特征
- 与相近概念的区别

> [!info] 我的立场
> 我对这个概念的理解/看法/应用场景。
```

### 决策 (wiki/decisions/)

```markdown
---
title: "决策标题"
date: YYYY-MM-DD
tags:
  - memwin
  - type/decision
  - 业务标签
aliases: []
related:
  - "[[关联笔记标题]]"
source: claude-code-session
---

#type/decision

## 摘要
一句话概括决策与选择，不超过 50 字。

## 要点
- 背景：为什么要做这个决策
- 选项：A vs B vs C
- 选择：选了哪个，核心原因

> [!info] 我的立场
> 选 X 而非 Y 的核心原因。什么条件下需要重新评估。
```

### 方法/框架 (wiki/methods/)

```markdown
---
title: "方法名"
date: YYYY-MM-DD
tags:
  - memwin
  - type/method
  - 业务标签
aliases: []
related:
  - "[[关联笔记标题]]"
source: claude-code-session
---

#type/method

## 摘要
一句话概括这个方法，不超过 50 字。

## 要点
- 来源：谁提出的 / 从哪里学到的
- 步骤：1→2→3
- 适用/不适用场景

> [!info] 我的立场
> 我认可这个方法的原因，适用的场景，限制条件。
```

### 字段填写规则

| 字段 | 规则 |
|------|------|
| `type/` 标签 | decisions → `type/decision`, methods → `type/method`, concepts → `type/concept`, notes → `type/note` |
| 业务标签 | 从以下选择：`投资` / `客户` / `方法论` / `工具` / `脚本` / `定投` / `AI` / `内容创作` / `vibe-coding` |
| `related` | 写入前扫描 vault 已有笔记，找到 2-3 条最相关的填入 |
| `> [!info] 我的立场` | **必填**，不允许留空或写「暂无」。这是三个月后最有价值的部分 |
| `#type/xxx` | 笔记正文第一行，与 frontmatter tags 中的 type 标签一致 |

## 行为约定

- 记之前用 Grep 搜 `wiki/` 目录中相关关键词，确认最近 30 天内没有同主题笔记。有则 Edit 更新（追加新内容，不覆盖），无则 Write 新建。
- **写完立即验证：** Read 刚写的文件，确认 (1) 文件存在 (2) frontmatter 有 title/date/tags/related/source (3) `> [!info] 我的立场` 非空。
- 写完 → 更新 wiki/index.md + wiki/log.md
- **写完关联检查：** 用 Grep 搜新笔记中出现的实体名/工具名/概念名，如果已有页面提到 → 填入 `related` 字段，同时在旧笔记的 `related` 中加回来。如果发现 3+ 页面讨论同一主题 → 考虑建 hub 页。
- 一次对话 3-8 条笔记为佳，太短/太操作的对话 0 条也 OK
- **不要在对话中提及你在记笔记**，除非用户主动问
