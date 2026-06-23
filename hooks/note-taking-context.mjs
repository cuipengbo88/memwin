// note-taking-context.mjs — memwin SessionStart hook
//
// Layer 1: Auto-start
//   1. Scans last 20 notes from Obsidian vault for historical context
//   2. Injects "笔记官" (Note Officer) persona with recording rules + template
//   3. Injects historical knowledge base context
//
// Safety: always exits 0. On any error, outputs nothing and lets the session
// proceed normally.

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';

const MAX_NOTE_CONTENT_CHARS = 600;
const MAX_CONTEXT_CHARS = 8000;

// --- Safety net ---
process.on('uncaughtException', () => process.exit(0));
process.on('unhandledRejection', () => process.exit(0));

// --- Stdin reader ---
async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

// --- Resolve which hook event fired ---
async function resolveHookEvent() {
  const raw = await readStdin();
  if (raw && raw.trim()) {
    try {
      const payload = JSON.parse(raw);
      if (payload && typeof payload.hook_event_name === 'string') return payload.hook_event_name;
    } catch { /* non-JSON stdin — fall through */ }
  }
  return process.env.CLAUDE_HOOK_EVENT || 'SessionStart';
}

// --- Safe file reader — returns null on any error ---
async function safeRead(filePath, maxChars = Infinity) {
  try {
    const content = await readFile(filePath, 'utf-8');
    if (content.length > maxChars) {
      return content.slice(0, maxChars) + '\n\n... (truncated)';
    }
    return content;
  } catch {
    return null;
  }
}

// --- Extract title + one-line summary from a note .md file ---
function extractSummary(content) {
  const lines = content.split('\n');
  let title = '';
  let summary = '';

  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const fm = fmMatch[1];
    const titleMatch = fm.match(/^title\s*:\s*["']?(.+?)["']?\s*$/m);
    if (titleMatch) title = titleMatch[1].trim();
  }

  if (!title) {
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) title = h1Match[1].trim();
  }

  // Extract ## 摘要 content
  const absMatch = content.match(/## 摘要\s*\n+(.+)/);
  if (absMatch) summary = absMatch[1].trim();
  if (!summary) {
    const bqMatch = content.match(/^>\s*(.+)$/m);
    if (bqMatch) summary = bqMatch[1].trim();
  }

  return { title: title || '(untitled)', summary };
}

// --- Scan last N notes from vault/wiki/ ---
async function scanRecentNotes(vaultPath, count = 20) {
  const wikiDir = join(vaultPath, 'wiki');
  const categories = ['notes', 'concepts', 'decisions', 'methods'];
  const files = [];

  for (const cat of categories) {
    const catDir = join(wikiDir, cat);
    let entries;
    try {
      entries = await readdir(catDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const fp = join(catDir, entry.name);
      try {
        const st = await stat(fp);
        files.push({ path: fp, cat, mtime: st.mtimeMs });
      } catch {
        continue;
      }
    }
  }

  files.sort((a, b) => b.mtime - a.mtime);
  const recent = files.slice(0, count);

  const results = [];
  for (const f of recent) {
    const content = await safeRead(f.path, MAX_NOTE_CONTENT_CHARS);
    if (!content) continue;
    const { title, summary } = extractSummary(content);
    const name = basename(f.path, '.md');
    results.push({ title, summary, cat: f.cat, file: name });
  }

  return results;
}

// --- Build the 笔记官 context ---
function buildContext({ recentNotes, vaultPath }) {
  const lines = [];

  lines.push(
    '---',
    '',
    '## 笔记官模式（memwin · 自动激活）',
    '',
    '你现在承担「笔记官」角色，全程在后台运行，对我完全透明。',
    '',
    '### 笔记写入格式（必须严格遵守）',
    '',
    '每条笔记使用以下结构：',
    '',
    '```markdown',
    '---',
    'title: "标题"',
    'date: YYYY-MM-DD',
    'tags:',
    '  - memwin',
    '  - type/[decision|method|concept|note]',
    '  - [业务标签]',
    'aliases: []',
    'related:',
    '  - "[[关联笔记标题]]"',
    'source: claude-code-session',
    '---',
    '',
    '#type/[类型]',
    '',
    '## 摘要',
    '[一句话结论，不超过50字]',
    '',
    '## 要点',
    '- [要点1]',
    '- [要点2]',
    '- [要点3]',
    '',
    '> [!info] 我的立场',
    '> [我的判断和立场，必填，不允许留空]',
    '',
    '## 关联笔记',
    '- [[关联笔记标题1]]',
    '- [[关联笔记标题2]]',
    '```',
    '',
    '### 字段规则',
    '',
    '| 字段 | 规则 |',
    '|------|------|',
    '| type/ 标签 | decisions → `type/decision`, methods → `type/method`, concepts → `type/concept`, notes → `type/note` |',
    '| 业务标签 | `投资` / `客户` / `方法论` / `工具` / `脚本` / `定投` / `AI` / `内容创作` / `vibe-coding` |',
    '| related | 写入前扫描 vault 已有笔记，找到 2-3 条最相关的填入 `[[标题]]` |',
    '| `> [!info] 我的立场` | **必填**，不允许空或写「暂无」，这是三个月后最有价值的部分 |',
    '',
    '### 记录规则',
    '',
    '**【必须记】**',
    '- 我说出的决策 + 理由 → decisions/',
    '- 我认可/质疑的方法论/框架 → methods/',
    '- 关于客户的定位判断（人设、风格边界、禁忌）→ notes/',
    '- 我的偏好表态（喜欢/不要/我觉得）→ notes/',
    '- 待办/之后研究的事项 → notes/',
    '- 投资逻辑与市场判断 → decisions/',
    '- 工具与技术发现 → notes/',
    '',
    '**【应该记】**',
    '- 踩坑修复与非标配置步骤 → notes/',
    '- A vs B 最终选择结论 → decisions/',
    '- 对话中产生的概念澄清 → concepts/',
    '- 更高效的工作流发现 → methods/',
    '',
    '**【不记】**',
    '- 闲聊与寒暄',
    '- 纯操作步骤流水账',
    '- 试错的中间状态',
    '- 已有笔记的重复内容',
    '- 敏感信息',
    '',
    '### 写入规范',
    '- 识别到高价值信息后立即写入，不等会话结束',
    '- 写入前扫描 vault 已有笔记，避免重复，填写 related 字段',
    '- 「我的立场」必填，这是三个月后最有价值的部分',
    '- 写入后 Read 验证文件存在 + `> [!info]` callout 非空',
    '- 更新 wiki/index.md + wiki/log.md',
    '- **不在对话中提及正在记笔记**，除非我主动问',
  );

  // ==== Historical knowledge base ====
  if (recentNotes.length > 0) {
    lines.push('', '---', '', '### 历史知识库（最近笔记）', '');

    const catNames = { notes: 'NOTE', concepts: 'CONCEPT', decisions: 'DECISION', methods: 'METHOD' };
    const grouped = {};
    for (const n of recentNotes) {
      if (!grouped[n.cat]) grouped[n.cat] = [];
      grouped[n.cat].push(n);
    }

    let contextLen = 0;
    for (const [cat, notes] of Object.entries(grouped)) {
      if (contextLen > MAX_CONTEXT_CHARS) break;
      lines.push(`**${catNames[cat] || cat}：**`);
      for (const n of notes) {
        if (contextLen > MAX_CONTEXT_CHARS) break;
        const line = `- [[${n.file}]] ${n.title}${n.summary ? ' — ' + n.summary : ''}`;
        lines.push(line);
        contextLen += line.length;
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

// --- Main ---
async function main() {
  const event = await resolveHookEvent();
  if (event !== 'SessionStart') return;

  const vault = process.env.OBSIDIAN_VAULT;
  if (!vault) return;

  try {
    const s = await stat(vault);
    if (!s.isDirectory()) return;
  } catch {
    return;
  }

  const recentNotes = await scanRecentNotes(vault, 20);
  const context = buildContext({ recentNotes, vaultPath: vault });

  const output = JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: context,
    },
  });

  process.stdout.write(output);
}

main().catch(() => process.exit(0));
