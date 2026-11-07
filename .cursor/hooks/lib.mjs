// Shared runtime for the repository's agent hooks.
// Wired up in .cursor/hooks.json; responses follow https://cursor.com/docs/hooks (JSON on stdout).
// Passing --agent=claude switches to Claude Code's protocol (exit 2 + stderr / decision JSON), so the
// same scripts can be registered in .claude/settings.json later without changes.
// Zero dependencies: Node.js 20+.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const AGENT = process.argv.includes('--agent=claude') ? 'claude' : 'cursor'

// SKILLS_REPO_ROOT lets scripts/test-harness.mjs run hooks against fixture repositories.
export const ROOT = process.env.SKILLS_REPO_ROOT || resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Read the hook payload from stdin. Returns {} when stdin is empty or not JSON. */
export function readPayload() {
  let raw = ''
  try {
    raw = readFileSync(0, 'utf8')
  } catch {
    return {}
  }
  try {
    return raw.trim() ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/**
 * Cursor can also load Claude Code hooks from .claude/settings.json. When that happens the same
 * script would run twice, so the Claude-mode invocation steps aside if the payload came from Cursor.
 */
export function exitIfDuplicateHost(payload) {
  if (AGENT === 'claude' && payload && payload.cursor_version) process.exit(0)
}

/** Repository-relative POSIX path, or null when the path is outside the repository. */
export function repoPath(filePath) {
  if (!filePath || typeof filePath !== 'string') return null
  const absolute = isAbsolute(filePath) ? filePath : join(ROOT, filePath)
  const rel = relative(ROOT, absolute)
  if (rel.startsWith('..') || isAbsolute(rel)) return null
  return rel.split(sep).join('/')
}

/** File paths a write/delete tool call targets, across Cursor and Claude Code tool schemas. */
export function targetPaths(toolInput = {}) {
  const keys = ['file_path', 'filePath', 'path', 'target_file', 'targetFile', 'notebook_path']
  const found = new Set()
  for (const key of keys) {
    if (typeof toolInput[key] === 'string') found.add(toolInput[key])
  }
  if (Array.isArray(toolInput.edits)) {
    for (const edit of toolInput.edits) if (typeof edit?.file_path === 'string') found.add(edit.file_path)
  }
  return [...found]
}

/** The skill a repository path belongs to: skills/<name>/... or evals/<name>/... */
export function skillOf(relPath) {
  const match = relPath && relPath.match(/^(?:skills|evals)\/([a-z0-9-]+)\//)
  return match ? match[1] : null
}

/** Run a Node script from scripts/ and capture its result without throwing. */
export function runNode(script, args = []) {
  try {
    const stdout = execFileSync(process.execPath, [join(ROOT, 'scripts', script), ...args], {
      cwd: ROOT,
      env: { ...process.env, SKILLS_REPO_ROOT: ROOT },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { ok: true, stdout, stderr: '' }
  } catch (e) {
    return { ok: false, stdout: e.stdout?.toString() ?? '', stderr: e.stderr?.toString() ?? String(e) }
  }
}

/** Files changed in the working tree (empty when git is unavailable). */
export function changedFiles() {
  if (!existsSync(join(ROOT, '.git'))) return null
  try {
    const out = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' })
    return out
      .split('\n')
      .filter(Boolean)
      .map((line) => line.slice(3).split(' -> ').pop().replace(/^"|"$/g, ''))
  } catch {
    return null
  }
}

export function formatFindings(result, limit = 15) {
  const errors = result?.errors ?? []
  const lines = errors.slice(0, limit).map((e) => `- ${e.where}: ${e.message}`)
  if (errors.length > limit) lines.push(`- ...and ${errors.length - limit} more (run \`npm run validate\`)`)
  return lines.join('\n')
}

// --- Responses -------------------------------------------------------------------------------

function emit(object) {
  process.stdout.write(`${JSON.stringify(object)}\n`)
}

/** Allow the pending action (permission hooks). */
export function allow() {
  if (AGENT === 'cursor') emit({ permission: 'allow' })
  process.exit(0)
}

/** Block the pending action and tell the agent why. */
export function deny(reason) {
  if (AGENT === 'cursor') {
    emit({ permission: 'deny', user_message: reason, agent_message: reason })
    process.exit(0)
  }
  process.stderr.write(`${reason}\n`)
  process.exit(2)
}

/** Ask the human to confirm the pending action. */
export function ask(reason) {
  if (AGENT === 'cursor') {
    emit({ permission: 'ask', user_message: reason, agent_message: reason })
  } else {
    emit({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: reason } })
  }
  process.exit(0)
}

/** Feed information back to the agent after a tool ran (post-edit validation results). */
export function feedback(message) {
  if (AGENT === 'cursor') {
    emit({ additional_context: message })
    process.exit(0)
  }
  process.stderr.write(`${message}\n`)
  process.exit(2)
}

/** Keep the agent working instead of stopping (stop hook). */
export function continueWith(message) {
  if (AGENT === 'cursor') emit({ followup_message: message })
  else emit({ decision: 'block', reason: message })
  process.exit(0)
}

/** Add context at session start. */
export function sessionContext(text) {
  if (AGENT === 'cursor') emit({ additional_context: text })
  else process.stdout.write(`${text}\n`)
  process.exit(0)
}

/** Do nothing (non-permission hooks). */
export function pass() {
  if (AGENT === 'cursor') emit({})
  process.exit(0)
}
