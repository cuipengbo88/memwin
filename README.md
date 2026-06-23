# memwin

> Real-time memory system for Claude Code on Windows — auto-captures insights directly to your Obsidian vault.

memwin is a silent note-taking partner for Claude Code. Like a colleague listening in, it automatically identifies important content during your conversations and saves it as structured, Obsidian-compatible markdown notes.

**Zero background processes. Zero cron jobs. Zero MCP servers.** Just two lightweight hooks.

## How It Works

```
SessionStart → hook injects note-taking persona + vault context
     ↓
You chat normally — Claude silently records insights in real time
     ↓
Notes land directly in your Obsidian vault
     ↓
SessionEnd → hook validates notes and reports what was saved
```

## Features

- **Auto-capture** — Decisions, methods, concepts, preferences, investment logic, and more
- **Obsidian-native** — Notes use Properties frontmatter, `[!info]` callouts, and `[[wikilinks]]`
- **Apple-style design** — CSS snippet with type badges (DECISION/METHOD/CONCEPT/NOTE) and styled callout blocks
- **4 note categories** — `notes/`, `concepts/`, `decisions/`, `methods/` with structured templates
- **Silent operation** — Claude never mentions it's taking notes unless you ask
- **Session-end validation** — Hook reports what was saved with emoji + file path output
- **Historical context** — SessionStart loads last 20 notes so Claude knows what you've discussed before
- **One-click install** — `setup.ps1` auto-detects Obsidian vault and configures everything

## Requirements

- Windows 10/11
- Node.js 18+
- [Claude Code](https://claude.ai/code)
- [Obsidian](https://obsidian.md) (recommended: Minimal theme)

## Quick Start

```powershell
git clone https://github.com/YOUR_USERNAME/memwin.git
cd memwin
.\setup.ps1
```

The installer will:
1. Auto-detect your Obsidian vault location
2. Create a `memwin/` subdirectory inside it
3. Set the `OBSIDIAN_VAULT` environment variable
4. Install SessionStart and SessionEnd hooks into `~/.claude/settings.json`
5. Create backup of your settings before modifying

Restart your terminal, then just chat normally. Open Obsidian to see your notes.

## Note Format

Each note follows a structured template:

```markdown
---
title: "Note Title"
date: 2026-06-23
tags:
  - memwin
  - type/decision
  - 投资
aliases: []
related:
  - "[[Related Note]]"
source: claude-code-session
---

#type/decision

## Summary
One-sentence conclusion.

## Key Points
- Point 1
- Point 2

> [!info] My Take
> My judgment at the time — what I agreed with, questioned, or added.

## Related
- [[Related Note 1]]
- [[Related Note 2]]
```

## Obsidian Apple-Style CSS

Enable the included CSS snippet for a polished reading experience:

1. Copy `memwin-apple.css` to `.obsidian/snippets/` in your vault
2. Settings → Appearance → CSS Snippets → Enable `memwin-apple`

The snippet adds:
- Color-coded type badges (blue DECISION, green METHOD, purple CONCEPT, amber NOTE)
- Styled `[!info]` callout block for "My Take"
- Clean internal link underlines
- Dark mode support

## Uninstall

Edit `~/.claude/settings.json` and remove any hook entries containing `memwin`.

## License

MIT — see [LICENSE](LICENSE)
