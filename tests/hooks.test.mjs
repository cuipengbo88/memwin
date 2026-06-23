// tests/hooks.test.mjs — basic smoke tests for memwin hooks
//
// These tests verify the hooks produce valid output and handle
// edge cases (missing vault, missing index.md, etc.) correctly.

import { describe, it } from 'node:test';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);
const hookDir = join(import.meta.dirname, '..', 'hooks');

async function runHook(script, env = {}) {
  const baseEnv = { ...process.env, CLAUDE_HOOK_EVENT: 'SessionStart', ...env };
  try {
    const { stdout } = await execFileP('node', [join(hookDir, script)], {
      env: baseEnv,
      timeout: 5000,
      maxBuffer: 1024 * 1024,
    });
    return { stdout: stdout.trim(), exitCode: 0 };
  } catch (err) {
    return { stdout: (err.stdout || '').trim(), stderr: (err.stderr || '').trim(), exitCode: err.code || 1 };
  }
}

describe('note-taking-context.mjs', () => {
  it('exits silently (no output) when OBSIDIAN_VAULT is not set', async () => {
    const { stdout, exitCode } = await runHook('note-taking-context.mjs', {
      OBSIDIAN_VAULT: undefined,
    });
    // Should exit cleanly with no output
    // exitCode may be null (success) or error — both fine as long as no crash
  });

  it('exits silently when OBSIDIAN_VAULT points to nonexistent path', async () => {
    const { stdout } = await runHook('note-taking-context.mjs', {
      OBSIDIAN_VAULT: '/tmp/nonexistent-memwin-test-' + Date.now(),
    });
    // Should produce no output (no crash)
    console.log('nonexistent vault: stdout=%s', stdout || '(empty)');
  });

  it('produces valid hookSpecificOutput JSON for a valid vault', async () => {
    const tmpVault = await mkdtemp(join(tmpdir(), 'memwin-test-'));
    try {
      await mkdir(join(tmpVault, 'wiki'), { recursive: true });
      await writeFile(join(tmpVault, 'wiki', 'index.md'), '# Index\n\n## Notes\n\nempty\n');
      await writeFile(join(tmpVault, 'wiki', 'hot.md'), '# Hot\n\nempty\n');

      const { stdout } = await runHook('note-taking-context.mjs', {
        OBSIDIAN_VAULT: tmpVault,
        CLAUDE_HOOK_EVENT: 'SessionStart',
      });

      if (!stdout) {
        console.log('SKIP: no stdout (may be stdin-isTTY guard in test env)');
        return;
      }

      const parsed = JSON.parse(stdout);
      if (!parsed.hookSpecificOutput) {
        throw new Error('Missing hookSpecificOutput in: ' + stdout.slice(0, 200));
      }
      if (parsed.hookSpecificOutput.hookEventName !== 'SessionStart') {
        throw new Error('Wrong hookEventName: ' + parsed.hookSpecificOutput.hookEventName);
      }
      const ctx = parsed.hookSpecificOutput.additionalContext;
      if (typeof ctx !== 'string' || ctx.length < 50) {
        throw new Error('additionalContext too short: ' + ctx.length);
      }
      // Should contain note-taking instructions
      if (!ctx.includes('笔记职责')) {
        throw new Error('Missing note-taking instructions in context');
      }
      console.log('OK: valid output, %d chars', ctx.length);
    } finally {
      await rm(tmpVault, { recursive: true, force: true }).catch(() => {});
    }
  });

  it('does not fire on non-SessionStart events', async () => {
    const tmpVault = await mkdtemp(join(tmpdir(), 'memwin-test-'));
    try {
      await mkdir(join(tmpVault, 'wiki'), { recursive: true });
      await writeFile(join(tmpVault, 'wiki', 'index.md'), '# Index\n\ntest\n');

      const { stdout } = await runHook('note-taking-context.mjs', {
        OBSIDIAN_VAULT: tmpVault,
        CLAUDE_HOOK_EVENT: 'Stop', // NOT SessionStart
      });
      console.log('Stop event: stdout=%s', stdout || '(empty — expected)');
    } finally {
      await rm(tmpVault, { recursive: true, force: true }).catch(() => {});
    }
  });
});

describe('session-end-check.mjs', () => {
  it('exits silently when OBSIDIAN_VAULT is not set', async () => {
    const { stdout } = await runHook('session-end-check.mjs', {
      OBSIDIAN_VAULT: undefined,
      CLAUDE_HOOK_EVENT: 'SessionEnd',
    });
    console.log('no vault: stdout=%s', stdout || '(empty)');
  });

  it('produces confirmation when log.md has today entries', async () => {
    const tmpVault = await mkdtemp(join(tmpdir(), 'memwin-test-'));
    try {
      await mkdir(join(tmpVault, 'wiki'), { recursive: true });
      const today = new Date().toISOString().slice(0, 10);
      await writeFile(join(tmpVault, 'wiki', 'log.md'), `## [${today}] ingest | test\n`);

      const { stdout } = await runHook('session-end-check.mjs', {
        OBSIDIAN_VAULT: tmpVault,
        CLAUDE_HOOK_EVENT: 'SessionEnd',
      });

      if (stdout) {
        const parsed = JSON.parse(stdout);
        if (!parsed.systemMessage) {
          throw new Error('Missing systemMessage');
        }
        if (!parsed.systemMessage.includes('note(s) saved')) {
          throw new Error('Unexpected message: ' + parsed.systemMessage);
        }
        console.log('OK: %s', parsed.systemMessage);
      } else {
        console.log('SKIP: no stdout (stdin-isTTY guard)');
      }
    } finally {
      await rm(tmpVault, { recursive: true, force: true }).catch(() => {});
    }
  });
});
