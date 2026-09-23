#!/usr/bin/env node
// PreToolUse hook: forces a human approval prompt before anything that
// publishes, edits the live site's source, submits URLs, or rewrites history
// in the append-only log. Everything else passes through to the normal
// permission rules untouched.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf-8'));
const { tool_name: tool, tool_input: args = {}, cwd = process.cwd() } = input;

// The seo/ folder is this hook's grandparent directory.
const SEO_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const LOG_FILE = path.join(SEO_DIR, 'log.md');

function decide(decision, reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: decision,
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0);
}

const ask = (reason) => decide('ask', reason);

// Shell commands that ship something or spend money outside the sandbox.
const RISKY_BASH = [
  [/\bgit\s+(commit|push|merge|rebase|reset|tag)\b/, 'git write'],
  [/\bgh\s+(pr|release|workflow|api)\b/, 'GitHub write'],
  [/\b(bun|npm|pnpm|yarn)\s+(run\s+)?(deploy|publish|release)\b/, 'deploy/publish'],
  [/\bdocker\s+(push|build)\b/, 'docker push/build'],
  [/\bcurl\b.*(-X\s*(POST|PUT|PATCH|DELETE)|--data|-d\s)/i, 'HTTP write request'],
  [/indexnow|ping\?sitemap|urlNotifications|indexing\.googleapis/i, 'URL/sitemap submission'],
  [/api\.dataforseo\.com/i, 'paid DataForSEO call (use sandbox.dataforseo.com)'],
];

// MCP tools whose name says they change something.
const RISKY_MCP = /(submit|publish|update|create|delete|insert|remove|index|sitemap|write|push|merge|deploy)/i;

if (tool === 'Bash') {
  const cmd = args.command || '';
  const hit = RISKY_BASH.find(([re]) => re.test(cmd));
  if (hit) ask(`SEO agent approval required: ${hit[1]} → ${cmd}`);
} else if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(tool)) {
  const target = path.resolve(cwd, args.file_path || args.notebook_path || '');
  const insideSeo = target === SEO_DIR || target.startsWith(SEO_DIR + path.sep);

  if (!insideSeo) {
    ask(`SEO agent approval required: editing live site source ${target}`);
  }
  if (target === LOG_FILE) {
    // log.md is append-only: an Edit must keep the text it replaces.
    const edits = tool === 'MultiEdit' ? args.edits || [] : [args];
    const appendOnly =
      tool !== 'Write' &&
      edits.every((e) => typeof e.new_string === 'string' && e.new_string.startsWith(e.old_string));
    if (!appendOnly) ask('log.md is append-only: this change removes or rewrites past entries');
  }
  if (/\/(CLAUDE\.md|brief\.md)$|\/prompts\//.test(target) && insideSeo) {
    ask('Instructions are frozen during a test — confirm this edit is intended');
  }
} else if (tool.startsWith('mcp__') && RISKY_MCP.test(tool.split('__').pop())) {
  ask(`SEO agent approval required: ${tool} may change external state`);
}

process.exit(0);
