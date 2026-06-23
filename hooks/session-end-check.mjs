// session-end-check.mjs — memwin SessionEnd hook
//
// At session end:
//   1. Scans wiki/ for note files created today
//   2. Validates each file: exists + YAML frontmatter parseable
//   3. Outputs "memwin: N note(s) saved to Obsidian" with full paths
//   4. Warns on validation failures (never blocks)
//
// Safety: always exits 0. Never blocks session end.

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

process.on('uncaughtException', () => process.exit(0));
process.on('unhandledRejection', () => process.exit(0));

async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function resolveHookEvent() {
  const raw = await readStdin();
  if (raw && raw.trim()) {
    try {
      const payload = JSON.parse(raw);
      if (payload && typeof payload.hook_event_name === 'string') return payload.hook_event_name;
    } catch { /* ignore */ }
  }
  return process.env.CLAUDE_HOOK_EVENT || '';
}

// Simple YAML frontmatter parser — avoids dependency on yaml library.
// Extracts fields between --- delimiters and returns { valid, fields }.
// Handles both scalar (`key: value`) and list (`key:\n  - item`) values.
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { valid: false, fields: {}, error: 'no frontmatter delimiters' };

  const yaml = match[1];
  const fields = {};
  const lines = yaml.split('\n');

  let currentKey = null;
  for (const line of lines) {
    // List item: `  - value`
    const listItem = line.match(/^\s+-\s+(.+)/);
    if (listItem && currentKey) {
      if (!Array.isArray(fields[currentKey])) fields[currentKey] = [];
      fields[currentKey].push(listItem[1].trim());
      continue;
    }

    // Key-value: `key: value` or `key:` (start of list)
    const kv = line.match(/^(\w[\w_-]*)\s*:\s*(.*)/);
    if (kv) {
      currentKey = kv[1];
      const val = kv[2].trim();
      if (val) {
        let cleanVal = val;
        if ((cleanVal.startsWith('"') && cleanVal.endsWith('"')) ||
            (cleanVal.startsWith("'") && cleanVal.endsWith("'"))) {
          cleanVal = cleanVal.slice(1, -1);
        }
        fields[currentKey] = cleanVal;
      }
    }
  }

  // Required in frontmatter
  const required = ['title', 'date', 'tags', 'source'];

  // Also check body for: #type/xxx tag + > [!info] 我的立场 callout
  const hasTypeTag = /#type\/(decision|method|concept|note)/.test(content);
  const hasMyStand = />\s*\[!info\]\s*我的立场/.test(content);

  const missing = required.filter(f => !fields[f]);
  if (!hasTypeTag) missing.push('#type/xxx (body tag)');
  if (!hasMyStand) missing.push('> [!info] 我的立场 (callout)');

  return {
    valid: missing.length === 0,
    fields,
    missing: missing.length > 0 ? missing : undefined,
    error: missing.length > 0 ? `missing: ${missing.join(', ')}` : undefined,
  };
}

async function findTodayNotes(wikiDir) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
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
      const filePath = join(catDir, entry.name);
      try {
        const st = await stat(filePath);
        const mtime = st.mtime.toISOString().slice(0, 10);
        if (mtime === today) {
          // Avoid double-counting infrastructure files
          if (entry.name === 'index.md' || entry.name === 'log.md' || entry.name === 'hot.md') continue;
          files.push(filePath);
        }
      } catch {
        continue;
      }
    }
  }

  return files;
}

async function validateNotes(files) {
  const results = { ok: [], fail: [] };
  for (const fp of files) {
    try {
      const content = await readFile(fp, 'utf-8');
      const fm = parseFrontmatter(content);
      if (fm.valid) {
        results.ok.push({ path: fp, title: fm.fields.title || fp });
      } else {
        results.fail.push({ path: fp, error: fm.error });
      }
    } catch (err) {
      results.fail.push({ path: fp, error: `cannot read: ${err.message}` });
    }
  }
  return results;
}

async function main() {
  const event = await resolveHookEvent();
  if (event !== 'SessionEnd') return;

  const vault = process.env.OBSIDIAN_VAULT;
  if (!vault) return;

  try {
    const s = await stat(vault);
    if (!s.isDirectory()) return;
  } catch {
    return;
  }

  const wikiDir = join(vault, 'wiki');
  const notes = await findTodayNotes(wikiDir);

  if (notes.length === 0) {
    // No notes today — perfectly normal
    process.stdout.write(JSON.stringify({
      systemMessage: 'memwin: 0 notes this session.',
    }));
    return;
  }

  const results = await validateNotes(notes);
  const lines = [];
  const total = results.ok.length + results.fail.length;

  if (results.fail.length === 0) {
    const noun = total === 1 ? 'note' : 'notes';
    lines.push(`memwin: ${total} ${noun} saved to Obsidian`);
  } else {
    lines.push(`memwin: ${total} notes today (${results.ok.length} OK, ${results.fail.length} validation failed)`);
  }

  // Category emoji mapping
  const catEmoji = { notes: '📝', concepts: '💡', decisions: '✅', methods: '🔧' };

  for (const r of results.ok) {
    const cat = r.path.includes('\\decisions\\') || r.path.includes('/decisions/') ? 'decisions'
      : r.path.includes('\\concepts\\') || r.path.includes('/concepts/') ? 'concepts'
      : r.path.includes('\\methods\\') || r.path.includes('/methods/') ? 'methods'
      : 'notes';
    const fileName = r.path.split(/[/\\]/).pop();
    const emoji = catEmoji[cat] || '📝';
    lines.push(`${emoji} ${cat.padEnd(11)} → ${fileName}`);
  }

  // Report validation failures
  for (const r of results.fail) {
    lines.push(`❌ FAIL ${r.path} — ${r.error}`);
  }

  if (results.fail.length > 0) {
    lines.push(`  WARNING: ${results.fail.length} file(s) failed validation. Use Read tool to inspect.`);
  }

  process.stdout.write(JSON.stringify({
    systemMessage: lines.join('\n'),
  }));
}

main().catch(() => process.exit(0));
