#!/usr/bin/env node
// Validates every skill in skills/ against the Agent Skills specification
// (https://agentskills.io/specification) and this repository's rule format.
//
// Usage: node scripts/validate.mjs   (exit code 1 on any error)

import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  SKILLS_DIR, IMPACT_LEVELS, QUICK_REFERENCE_START, QUICK_REFERENCE_END,
  readText, parseFrontmatter, listAllSkills, listRuleSkills, parseSections, parseRules, extractExamples,
} from './lib/skills.mjs'

const errors = []
const warnings = []
const error = (where, message) => errors.push(`${where}: ${message}`)
const warn = (where, message) => warnings.push(`${where}: ${message}`)

const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
const ruleSkills = new Set(listRuleSkills())

for (const skill of listAllSkills()) {
  const skillDir = join(SKILLS_DIR, skill)
  validateSkillFile(skill, skillDir)
  if (ruleSkills.has(skill)) validateRuleSkill(skill, skillDir)
}

for (const w of warnings) console.error(`warning  ${w}`)
for (const e of errors) console.error(`error    ${e}`)
console.error(`\n${errors.length} error(s), ${warnings.length} warning(s)`)
process.exit(errors.length ? 1 : 0)

function validateSkillFile(skill, skillDir) {
  const where = `skills/${skill}/SKILL.md`
  const text = readText(join(skillDir, 'SKILL.md'))
  const { data, body, hasFrontmatter } = parseFrontmatter(text)

  if (!hasFrontmatter) return error(where, 'missing YAML frontmatter')

  // name: required, 1-64 chars, lowercase alphanumerics and single hyphens, must match the directory.
  if (!data.name) error(where, 'frontmatter `name` is required')
  else {
    if (data.name.length > 64) error(where, '`name` must be at most 64 characters')
    if (!NAME_PATTERN.test(data.name)) error(where, '`name` may contain only a-z, 0-9 and single hyphens, not at the start or end')
    if (data.name !== skill) error(where, `\`name\` (${data.name}) must match the directory name (${skill})`)
  }

  // description: required, 1-1024 chars.
  if (!data.description) error(where, 'frontmatter `description` is required')
  else if (data.description.length > 1024) error(where, `\`description\` is ${data.description.length} characters (max 1024)`)
  else if (!/\buse when\b/i.test(data.description)) warn(where, '`description` should say when to use the skill ("Use when ...")')

  if (data.compatibility && data.compatibility.length > 500) error(where, '`compatibility` must be at most 500 characters')
  if (data.metadata && typeof data.metadata !== 'object') error(where, '`metadata` must be a map')

  const lines = text.split('\n').length
  if (lines > 500) warn(where, `${lines} lines; keep SKILL.md under 500 lines and move detail to referenced files`)

  // Relative links in SKILL.md must resolve (progressive disclosure: one level deep).
  for (const [, target] of body.matchAll(/\]\((?!https?:|#|mailto:)([^)\s]+)\)/g)) {
    if (!existsSync(join(skillDir, target))) error(where, `broken relative link: ${target}`)
  }
  for (const [, target] of body.matchAll(/`((?:references|rules|scripts|assets)\/[^`*<>]+\.\w+)`/g)) {
    if (!existsSync(join(skillDir, target))) error(where, `referenced file does not exist: ${target}`)
  }
}

function validateRuleSkill(skill, skillDir) {
  const base = `skills/${skill}`

  for (const file of ['README.md', 'metadata.json', 'AGENTS.md', 'rules/_template.md']) {
    if (!existsSync(join(skillDir, file))) error(base, `missing ${file}`)
  }

  let metadata = {}
  try {
    metadata = JSON.parse(readText(join(skillDir, 'metadata.json')))
  } catch (e) {
    error(`${base}/metadata.json`, `invalid JSON: ${e.message}`)
  }
  for (const key of ['title', 'version', 'organization', 'date', 'scope', 'abstract']) {
    if (!metadata[key]) error(`${base}/metadata.json`, `missing \`${key}\``)
  }

  const sections = parseSections(skillDir)
  if (!sections.length) error(`${base}/rules/_sections.md`, 'no sections found (expected "## N. Title (prefix)")')
  sections.forEach((section, i) => {
    const where = `${base}/rules/_sections.md`
    if (section.number !== i + 1) error(where, `section "${section.title}" is numbered ${section.number}, expected ${i + 1}`)
    if (!IMPACT_LEVELS.includes(section.impact)) error(where, `section "${section.title}" has invalid impact "${section.impact}"`)
    if (!section.description) error(where, `section "${section.title}" has no description`)
  })

  const rules = parseRules(skillDir, sections)
  const titles = new Map()
  for (const rule of rules) {
    const where = `${base}/rules/${rule.file}`
    if (!/^[a-z0-9]+(-[a-z0-9]+)*\.md$/.test(rule.file)) error(where, 'file name must be kebab-case')
    if (!rule.hasFrontmatter) { error(where, 'missing frontmatter'); continue }
    if (!rule.section) error(where, `file name must start with a section prefix (${sections.map((s) => `${s.prefix}-`).join(', ')})`)
    if (!rule.title) error(where, 'frontmatter `title` is required')
    if (!IMPACT_LEVELS.includes(rule.impact)) error(where, `frontmatter \`impact\` must be one of ${IMPACT_LEVELS.join(', ')}`)
    if (!rule.tags.length) error(where, 'frontmatter `tags` is required')

    const heading = rule.body.match(/^## (.+)$/m)?.[1]?.trim()
    if (heading !== rule.title) error(where, `first heading "## ${heading}" must equal the frontmatter title "${rule.title}"`)

    const impactLine = rule.body.match(/^\*\*Impact: ([A-Z-]+)(?: \(([^)]*)\))?\*\*$/m)
    if (!impactLine) error(where, 'missing "**Impact: LEVEL (description)**" line')
    else {
      if (impactLine[1] !== rule.impact) error(where, `impact line (${impactLine[1]}) does not match frontmatter (${rule.impact})`)
      if (rule.impactDescription && impactLine[2] !== rule.impactDescription) {
        error(where, 'impact line description does not match frontmatter impactDescription')
      }
    }

    const examples = extractExamples(rule.body)
    if (!examples.some((e) => e.type === 'bad')) error(where, 'needs at least one **Incorrect (...):** example followed by a code block')
    if (!examples.some((e) => e.type === 'good')) error(where, 'needs at least one **Correct (...):** example followed by a code block')
    for (const example of examples) {
      if (!example.language) error(where, 'every example code block needs a language tag')
    }
    if (/^```\s*$/m.test(rule.body.replace(/^```[\w-]+\n[\s\S]*?^```\s*$/gm, ''))) {
      error(where, 'code fence without a language tag')
    }
    if (!/^Reference: /m.test(rule.body)) warn(where, 'no "Reference:" line')

    if (titles.has(rule.title)) error(where, `duplicate title also used by ${titles.get(rule.title)}`)
    titles.set(rule.title, rule.file)
  }

  // SKILL.md quick reference must be generated from the current rules.
  const skillText = readText(join(skillDir, 'SKILL.md'))
  if (!skillText.includes(QUICK_REFERENCE_START) || !skillText.includes(QUICK_REFERENCE_END)) {
    error(`${base}/SKILL.md`, 'missing quick-reference markers')
  } else {
    for (const rule of rules) {
      if (!skillText.includes(`\`${rule.id}\``)) error(`${base}/SKILL.md`, `quick reference is missing \`${rule.id}\` (run npm run build)`)
    }
  }

  // Reference files should stay reasonably small (loaded on demand).
  const refsDir = join(skillDir, 'references')
  if (existsSync(refsDir)) {
    for (const file of readdirSync(refsDir)) {
      const size = statSync(join(refsDir, file)).size
      if (size > 60_000) warn(`${base}/references/${file}`, `${Math.round(size / 1000)} KB; consider splitting`)
    }
  }
}
