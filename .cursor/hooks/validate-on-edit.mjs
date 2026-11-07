#!/usr/bin/env node
// Post-edit feedback loop (Cursor postToolUse Write).
// After a skill or eval file changes: regenerate derived files (rule-based skills), validate that
// skill, and hand any errors straight back to the agent so it fixes them in the same turn.

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, exitIfDuplicateHost, feedback, formatFindings, pass, readPayload, repoPath, runNode, skillOf, targetPaths } from './lib.mjs'

const payload = readPayload()
exitIfDuplicateHost(payload)

const paths = targetPaths(payload.tool_input).map(repoPath).filter(Boolean)
const skills = [...new Set(paths.map(skillOf).filter(Boolean))].filter((s) => existsSync(join(ROOT, 'skills', s, 'SKILL.md')))
if (skills.length === 0) pass()

const messages = []
for (const skill of skills) {
  // Rule-based skills: keep AGENTS.md, the SKILL.md quick reference and test cases in sync.
  if (existsSync(join(ROOT, 'skills', skill, 'rules', '_sections.md'))) {
    const build = runNode('build.mjs', [`--skill=${skill}`])
    if (!build.ok) messages.push(`Build failed for ${skill}:\n${build.stderr.trim().split('\n').slice(-8).join('\n')}`)
  }

  const result = runNode('validate.mjs', [`--skill=${skill}`, '--json'])
  let parsed = null
  try {
    parsed = JSON.parse(result.stdout)
  } catch {
    messages.push(`Validator crashed for ${skill}:\n${result.stderr.trim().split('\n').slice(-8).join('\n')}`)
    continue
  }
  if (!parsed.ok) messages.push(`Skill "${skill}" fails the quality gate:\n${formatFindings(parsed)}`)
}

if (messages.length === 0) pass()
feedback(
  `${messages.join('\n\n')}\n\nFix these now (TODO markers are expected while a skill is being written; ` +
    'everything else is a real defect). See .cursor/docs/quality-bar.md.',
)
