#!/usr/bin/env node
// Shell guardrail (Cursor beforeShellExecution).
// Denies destructive or verification-skipping commands, asks before anything that publishes.

import { allow, ask, deny, exitIfDuplicateHost, readPayload } from './lib.mjs'

const payload = readPayload()
exitIfDuplicateHost(payload)

const command = String(payload.command ?? payload.tool_input?.command ?? '').trim()
if (!command) allow()

const DENY = [
  [/\bgit\s+push\b[^|;&]*\s(--force(?!-with-lease)|-f\b)/, 'Force-pushing rewrites published history. Push normally, or ask the maintainer.'],
  [/\bgit\s+push\b[^|;&]*--force-with-lease/, 'Force-pushing rewrites published history. Ask the maintainer to do it manually if it is really needed.'],
  [/--no-verify\b/, 'Skipping hooks bypasses the quality gate. Fix the failing check instead.'],
  [/\bgit\s+reset\s+--hard\b/, 'git reset --hard discards work irreversibly. Use git stash or a new branch.'],
  [/\bgit\s+clean\s+-[a-z]*f/, 'git clean -f deletes untracked files irreversibly. Remove specific files explicitly.'],
  [/\brm\s+-[a-z]*r[a-z]*\s+(?:-[a-z]+\s+)*(?:\.\/)?(skills|evals|scripts|\.cursor|\.claude|\.github|docs)(\/|\s|$)/, 'Recursive delete of a core directory. Delete specific files instead, and say why.'],
  [/\brm\s+-[a-z]*r[a-z]*\s+(?:-[a-z]+\s+)*(\/|~|\$HOME|\*)(\s|$)/, 'Refusing a recursive delete of a root, home or wildcard path.'],
  [/\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(ba|z)?sh\b/, 'Piping a download into a shell runs unreviewed code. Download, read, then run.'],
  [/(>|\btee\b|\bsed\s+-i\b|\bperl\s+-i\b)[^|;&]*skills\/[^/\s]+\/AGENTS\.md/, 'skills/*/AGENTS.md is generated. Edit the rule files and run `npm run build`.'],
  [/(>|\btee\b|\bsed\s+-i\b|\bperl\s+-i\b)[^|;&]*evals\/[^/\s]+\/test-cases\.json/, 'evals/*/test-cases.json is generated. Edit the rule files and run `npm run build`.'],
]

const ASK = [
  [/\bgit\s+push\b/, 'This pushes to GitHub. Confirm the branch and that `npm run check` passes.'],
  [/\bgh\s+(release|repo)\s+(create|delete|edit)\b/, 'This changes the public GitHub repository or its releases. Confirm before running.'],
  [/\bgit\s+tag\b[^|;&]*\s-d\b|\bgit\s+push\b[^|;&]*--tags/, 'This changes published tags. Confirm before running.'],
  [/\bnpm\s+publish\b/, 'This repository is not an npm package; confirm you really want to publish.'],
]

for (const [pattern, reason] of DENY) if (pattern.test(command)) deny(`Blocked: ${reason}\nCommand: ${command}`)
for (const [pattern, reason] of ASK) if (pattern.test(command)) ask(reason)
allow()
