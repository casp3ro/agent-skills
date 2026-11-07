#!/usr/bin/env node
// Definition-of-done gate (Cursor stop).
// When the agent tries to finish after touching skills, evals, scripts or the harness, run the
// same checks CI runs. If they fail, send the agent back to fix them instead of finishing.
// Loop guards: Cursor stops re-prompting after `loop_limit` (hooks.json); we also stop at loop_count >= 3.
// `stop_hook_active` is honored for Claude Code compatibility if these scripts are reused there.

import { changedFiles, continueWith, exitIfDuplicateHost, formatFindings, pass, readPayload, runNode } from './lib.mjs'

// Two automatic fix attempts are enough; after that a human should look.
const MAX_FIX_LOOPS = 3

const payload = readPayload()
exitIfDuplicateHost(payload)

if (payload.stop_hook_active === true) pass()
if (typeof payload.loop_count === 'number' && payload.loop_count >= MAX_FIX_LOOPS) pass()
if (payload.status && payload.status !== 'completed') pass()

const RELEVANT = /^(skills\/|evals\/|scripts\/|\.cursor\/|\.claude\/|README\.md$|AGENTS\.md$|skills\.sh\.json$|package\.json$)/
const changed = changedFiles()
// Without git (fresh unzip), check everything; with git, only when relevant files changed.
if (changed && !changed.some((f) => RELEVANT.test(f))) pass()

const problems = []

const build = runNode('build.mjs', ['--check'])
if (!build.ok) problems.push(`Generated files are stale:\n${build.stderr.trim().split('\n').slice(-10).join('\n')}\nRun \`npm run build\` and keep the result.`)

const validation = runNode('validate.mjs', ['--json'])
try {
  const parsed = JSON.parse(validation.stdout)
  if (!parsed.ok) problems.push(`Validation errors:\n${formatFindings(parsed)}`)
} catch {
  problems.push(`Validator crashed:\n${validation.stderr.trim().split('\n').slice(-10).join('\n')}`)
}

// scripts/test-harness.mjs sets AGENT_SKILLS_SKIP_HARNESS_TEST when it runs this hook, to avoid recursion.
const harnessChanged = !changed || changed.some((f) => /^(\.cursor\/hooks\/|scripts\/)/.test(f))
if (harnessChanged && !process.env.AGENT_SKILLS_SKIP_HARNESS_TEST) {
  const harness = runNode('test-harness.mjs')
  if (!harness.ok) problems.push(`Harness self-test failed:\n${(harness.stderr || harness.stdout).trim().split('\n').slice(-12).join('\n')}`)
}

if (problems.length === 0) pass()
continueWith(
  `The repository quality gate failed, so the task is not done yet.\n\n${problems.join('\n\n')}\n\n` +
    'Fix every error, re-run `npm run check`, then summarize what you changed. ' +
    'If an error is a deliberate work-in-progress state the user asked for, say so explicitly instead.',
)
