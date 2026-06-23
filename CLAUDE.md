---
schema_version: 3
---

# memwin

> Real-time memory system for Claude Code on Windows — auto-captures insights to your Obsidian vault during conversations.

## How It Works

```
SessionStart → hook injects note-taking persona + vault context
     ↓
Claude silently records insights in real time
     ↓
Notes land in Obsidian vault — open Obsidian, they're there
     ↓
SessionEnd → hook validates notes and reports what was saved
```

## Vault Structure

```
{OBSIDIAN_VAULT}/memwin/
├── CLAUDE.md           # Note schema and recording rules
├── wiki/
│   ├── index.md        # Note directory
│   ├── hot.md          # Recent activity cache
│   ├── notes/          # General notes (tools, configs, preferences)
│   ├── concepts/       # Concept clarifications
│   ├── decisions/      # Important decisions
│   └── methods/        # Methods, frameworks, workflows
└── raw/                # Manual source materials
```

## Recording Rules

**Must Record:**
- Decisions + rationale → `decisions/`
- Methodology acceptance/critique → `methods/`
- Client positioning judgment (persona, boundaries) → `notes/`
- Preference statements (like/don't want/I think) → `notes/`
- To-do items → `notes/`
- Investment logic & market views → `decisions/`
- Tool & tech discoveries → `notes/`

**Should Record:**
- Bug fixes & non-standard configs → `notes/`
- A vs B final conclusions → `decisions/`
- Concept clarifications → `concepts/`
- Workflow optimizations → `methods/`

**Never Record:**
- Small talk & chit-chat
- Pure step-by-step operations
- Trial-and-error intermediates
- Duplicates of existing notes
- Sensitive information

## Note Template

```markdown
---
title: "Note Title"
date: YYYY-MM-DD
tags:
  - memwin
  - type/[decision|method|concept|note]
  - [business-tag]
aliases: []
related:
  - "[[Related Note]]"
source: claude-code-session
---

#type/[type]

## Summary
One-sentence conclusion, max 50 chars.

## Key Points
- Point 1
- Point 2
- Point 3

> [!info] My Take
> My judgment at the time — what I agreed with, questioned, or added. Required.

## Related
- [[Related Note 1]]
- [[Related Note 2]]
```

## Field Rules

| Field | Rule |
|-------|------|
| `type/` tag | decisions → `type/decision`, methods → `type/method`, concepts → `type/concept`, notes → `type/note` |
| Business tag | `投资` / `客户` / `方法论` / `工具` / `脚本` / `定投` / `AI` / `内容创作` / `vibe-coding` |
| `related` | Scan vault for 2-3 most relevant existing notes before writing |
| `> [!info] My Take` | **Required** — this is the most valuable part three months later |

## Behavior Rules

- Scan vault before writing: if a note on the same topic exists within 30 days, Edit (append), don't create new
- After writing: Read to verify file exists + callout is non-empty
- Update wiki/index.md + wiki/log.md
- **Never mention you're taking notes to the user**, unless they ask
