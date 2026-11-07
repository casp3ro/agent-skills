#!/usr/bin/env node
// Session primer (Cursor sessionStart).
// Adds a short, current snapshot of the repository so the agent starts from facts, not guesses.

import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, exitIfDuplicateHost, readPayload, runNode, sessionContext } from './lib.mjs'

const payload = readPayload()
exitIfDuplicateHost(payload)

const skillsDir = join(ROOT, 'skills')
const skills = existsSync(skillsDir)
  ? readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(skillsDir, d.name, 'SKILL.md')))
  : []

const summary = skills.map((d) => {
  const rulesDir = join(skillsDir, d.name, 'rules')
  const rules = existsSync(rulesDir) ? readdirSync(rulesDir).filter((f) => f.endsWith('.md') && !f.startsWith('_')).length : 0
  return rules ? `${d.name} (${rules} rules)` : d.name
})

let status = 'unknown'
const result = runNode('validate.mjs', ['--json'])
try {
  const parsed = JSON.parse(result.stdout)
  status = parsed.ok ? `passing (${parsed.warnings.length} warnings)` : `FAILING with ${parsed.errors.length} errors; run \`npm run validate\``
} catch {
  status = 'validator crashed; run `npm run validate`'
}

sessionContext(
  [
    'agent-skills repository (casp3ro/agent-skills): skills/ is published via `npx skills add`.',
    `Skills: ${summary.join(', ') || 'none yet'}. Quality gate: ${status}.`,
    'Workflows (type / in Agent chat): /new-skill, /new-rule, /research-skill, /review-skill, /eval-skill, /release-skill.',
    'Before finishing any change: `npm run check` must pass (the stop hook enforces it). Quality bar: .cursor/docs/quality-bar.md.',
  ].join('\n'),
)
