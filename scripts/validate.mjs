#!/usr/bin/env node
// Quality gate for every skill in skills/.
//
// Checks the Agent Skills specification (https://agentskills.io/specification), Anthropic's skill
// authoring best practices, this repository's rule format, and the eval requirements in
// .cursor/docs/quality-bar.md. Errors block CI; warnings are reported for review.
//
// Usage:
//   node scripts/validate.mjs                 all skills, human-readable
//   node scripts/validate.mjs --skill=swift   one skill
//   node scripts/validate.mjs --json          machine-readable result on stdout (used by hooks)
//
// Exit code: 0 when there are no errors, 1 otherwise.

import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
  REPO_ROOT, SKILLS_DIR, EVALS_DIR, IMPACT_LEVELS, QUICK_REFERENCE_START, QUICK_REFERENCE_END,
  readText, parseFrontmatter, listAllSkills, listRuleSkills, parseSections, parseRules, extractExamples,
} from './lib/skills.mjs'

const args = process.argv.slice(2)
const asJson = args.includes('--json')
const onlySkill = args.find((a) => a.startsWith('--skill='))?.split('=')[1]

const findings = []
const error = (where, message) => findings.push({ level: 'error', where, message })
const warn = (where, message) => findings.push({ level: 'warning', where, message })

// --- Thresholds (each value is explained so nobody has to guess why it exists) ---------------
// Spec limit for `name`.
const MAX_NAME = 64
// Spec limit for `description`.
const MAX_DESCRIPTION = 1024
// Below this a description rarely names both what the skill does and when to use it.
const MIN_DESCRIPTION = 120
// Anthropic best practice: keep the SKILL.md body under 500 lines; split into references beyond that.
const MAX_SKILL_LINES = 500
// Anthropic best practice: reference files longer than 100 lines start with a table of contents,
// so a partial read (e.g. `head -100`) still shows the full scope.
const TOC_REQUIRED_ABOVE_LINES = 100
// Where the table of contents must appear.
const TOC_WINDOW_LINES = 40
// Skill-creator methodology: at least three realistic task evals per skill.
const MIN_TASK_EVALS = 3
// Each task eval needs at least two verifiable expectations to discriminate good from bad output.
const MIN_EXPECTATIONS = 2
// Trigger evals: 10+ queries with both should-trigger and near-miss should-not-trigger cases.
const MIN_TRIGGER_QUERIES = 10
// Reference files above this size are expensive to load; consider splitting by domain.
const MAX_REFERENCE_BYTES = 60_000

const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
const RESERVED_NAME_WORDS = ['anthropic', 'claude']
const GENERIC_NAMES = new Set(['helper', 'helpers', 'utils', 'util', 'tools', 'tool', 'documents', 'data', 'files', 'misc', 'common', 'stuff'])
const ALLOWED_SKILL_ENTRIES = new Set(['SKILL.md', 'README.md', 'AGENTS.md', 'metadata.json', 'LICENSE', 'LICENSE.txt', 'LICENSE.md', 'rules', 'references', 'scripts', 'assets'])
const PLACEHOLDER_PATTERN = /\bTODO\b|\bTBD\b|\{\{[^}]*\}\}|<placeholder>|lorem ipsum/i
const TIME_SENSITIVE_PATTERN = /\b(as of|currently|recently|nowadays|this year|last year|latest version|new in)\b/i

const ruleSkills = new Set(listRuleSkills())
const skills = listAllSkills().filter((s) => !onlySkill || s === onlySkill)
if (onlySkill && skills.length === 0) error(`skills/${onlySkill}`, 'skill not found (no SKILL.md)')

const rootReadme = existsSync(join(REPO_ROOT, 'README.md')) ? readText(join(REPO_ROOT, 'README.md')) : ''
const skillsShConfig = readJsonIfExists(join(REPO_ROOT, 'skills.sh.json'))

for (const skill of skills) {
  const skillDir = join(SKILLS_DIR, skill)
  validateLayout(skill, skillDir)
  const frontmatter = validateSkillFile(skill, skillDir)
  validateReferences(skill, skillDir)
  validateScripts(skill, skillDir)
  validateEvals(skill)
  validateRegistration(skill)
  if (ruleSkills.has(skill)) validateRuleSkill(skill, skillDir, frontmatter)
}

report()

// ---------------------------------------------------------------------------------------------

function validateLayout(skill, skillDir) {
  for (const entry of readdirSync(skillDir)) {
    if (!ALLOWED_SKILL_ENTRIES.has(entry)) {
      error(`skills/${skill}/${entry}`, `unexpected entry in a published skill; allowed: ${[...ALLOWED_SKILL_ENTRIES].join(', ')} (evals live in evals/${skill}/)`)
    }
  }
  for (const file of walk(skillDir)) {
    const rel = relative(REPO_ROOT, file)
    if (/\.(md|json|ya?ml|txt)$/.test(file) && !rel.endsWith('/AGENTS.md') && PLACEHOLDER_PATTERN.test(readText(file))) {
      error(rel, 'contains a placeholder (TODO, TBD, {{...}}, lorem ipsum); finish or remove it')
    }
  }
}

function validateSkillFile(skill, skillDir) {
  const where = `skills/${skill}/SKILL.md`
  const text = readText(join(skillDir, 'SKILL.md'))
  const { data, body, hasFrontmatter } = parseFrontmatter(text)
  if (!hasFrontmatter) {
    error(where, 'missing YAML frontmatter')
    return {}
  }

  // name
  if (!data.name) error(where, 'frontmatter `name` is required')
  else {
    if (data.name.length > MAX_NAME) error(where, `\`name\` must be at most ${MAX_NAME} characters`)
    if (!NAME_PATTERN.test(data.name)) error(where, '`name` may contain only a-z, 0-9 and single hyphens, not at the start or end')
    if (data.name !== skill) error(where, `\`name\` (${data.name}) must match the directory name (${skill})`)
    if (RESERVED_NAME_WORDS.some((w) => data.name.includes(w))) error(where, `\`name\` must not contain reserved words (${RESERVED_NAME_WORDS.join(', ')})`)
    const generic = [data.name, skill].find((n) => GENERIC_NAMES.has(n))
    if (generic) error(where, `"${generic}" is too generic for a skill name; name the capability (e.g. "processing-pdfs", "swift")`)
  }

  // description
  const description = data.description || ''
  if (!description) error(where, 'frontmatter `description` is required')
  else {
    if (description.length > MAX_DESCRIPTION) error(where, `\`description\` is ${description.length} characters (max ${MAX_DESCRIPTION})`)
    if (description.length < MIN_DESCRIPTION) warn(where, `\`description\` is only ${description.length} characters; state what the skill does, when to use it, and key trigger terms`)
    if (/[<>]/.test(description) || /[<>]/.test(data.name || '')) error(where, '`name` and `description` must not contain XML/HTML tags or angle brackets')
    if (!/\buse (this skill )?(when|whenever|for|to|before|after)\b/i.test(description)) {
      error(where, '`description` must say when to use the skill ("Use when ...")')
    }
    if (/\b(I|I'm|I'll|I've|me|my)\b/.test(description)) error(where, '`description` must be written in the third person (no "I", "me", "my")')
    if (/\byou(r|'re|'ll)?\b/i.test(description)) error(where, '`description` must be written in the third person (no "you", "your")')
  }

  if (data.compatibility && data.compatibility.length > 500) error(where, '`compatibility` must be at most 500 characters')
  if (data.metadata !== undefined && typeof data.metadata !== 'object') error(where, '`metadata` must be a map')
  if (!data.license) warn(where, 'no `license` in frontmatter')

  const lines = text.split('\n').length
  if (lines > MAX_SKILL_LINES) error(where, `${lines} lines; keep SKILL.md under ${MAX_SKILL_LINES} lines and move detail into references/ or rules/`)

  if (TIME_SENSITIVE_PATTERN.test(body)) {
    warn(where, `time-sensitive wording ("${body.match(TIME_SENSITIVE_PATTERN)[0]}"); state facts without relative time, or move history to an "Old patterns" section`)
  }

  checkLocalLinks(where, skillDir, body)
  return data
}

function validateReferences(skill, skillDir) {
  const refsDir = join(skillDir, 'references')
  if (!existsSync(refsDir)) return
  for (const file of walk(refsDir).filter((f) => f.endsWith('.md'))) {
    const where = relative(REPO_ROOT, file)
    const text = readText(file)
    const lines = text.split('\n')
    if (lines.length > TOC_REQUIRED_ABOVE_LINES) {
      const head = lines.slice(0, TOC_WINDOW_LINES).join('\n')
      const hasToc = /^#{1,3} .*(contents|table of contents)/im.test(head) || (head.match(/\]\(#[^)]+\)/g) || []).length >= 3
      if (!hasToc) error(where, `${lines.length} lines without a table of contents in the first ${TOC_WINDOW_LINES} lines`)
    }
    // Progressive disclosure: references are one level deep (SKILL.md -> reference), no chains.
    for (const [, target] of text.matchAll(/\]\((?!https?:|#|mailto:)([^)\s#]+\.md)(#[^)]*)?\)/g)) {
      warn(where, `links to another local file (${target}); keep references one level deep from SKILL.md`)
    }
    if (statSync(file).size > MAX_REFERENCE_BYTES) warn(where, `${Math.round(statSync(file).size / 1000)} KB; consider splitting by domain`)
  }
}

function validateScripts(skill, skillDir) {
  const scriptsDir = join(skillDir, 'scripts')
  if (!existsSync(scriptsDir)) return
  for (const file of walk(scriptsDir)) {
    const where = relative(REPO_ROOT, file)
    const text = readText(file)
    if (/\.(sh|bash|py|mjs|js|ts|rb)$/.test(file) && !text.startsWith('#!')) error(where, 'executable script must start with a shebang line')
    if (/\.(sh|bash)$/.test(file) && !/^set -[a-z]*e/m.test(text)) error(where, 'shell script must use `set -e` (or `set -euo pipefail`)')
    if (/[A-Za-z]:\\|\w\\\w+\.\w{1,4}\b/.test(text.replace(/\\[nrt"'\\$`]/g, ''))) warn(where, 'possible Windows-style path; use forward slashes')
  }
}

function validateEvals(skill) {
  const dir = join(EVALS_DIR, skill)
  const evalsPath = join(dir, 'evals.json')
  const triggersPath = join(dir, 'triggers.json')
  const whereEvals = relative(REPO_ROOT, evalsPath)
  const whereTriggers = relative(REPO_ROOT, triggersPath)

  const evals = readJsonIfExists(evalsPath, (e) => error(whereEvals, `invalid JSON: ${e.message}`))
  if (evals === undefined) error(whereEvals, `missing; write at least ${MIN_TASK_EVALS} task evals before writing the skill (see .cursor/docs/eval-protocol.md)`)
  else if (evals) {
    if (evals.skill_name !== skill) error(whereEvals, `\`skill_name\` must be "${skill}"`)
    const list = Array.isArray(evals.evals) ? evals.evals : []
    if (list.length < MIN_TASK_EVALS) error(whereEvals, `needs at least ${MIN_TASK_EVALS} evals (found ${list.length})`)
    const ids = new Set()
    list.forEach((item, i) => {
      const label = `evals[${i}]`
      if (!Number.isInteger(item.id)) error(whereEvals, `${label}.id must be an integer`)
      else if (ids.has(item.id)) error(whereEvals, `${label}.id ${item.id} is duplicated`)
      ids.add(item.id)
      if (typeof item.prompt !== 'string' || item.prompt.trim().length < 40) error(whereEvals, `${label}.prompt must be a realistic task of at least 40 characters`)
      if (!Array.isArray(item.expectations) || item.expectations.length < MIN_EXPECTATIONS) {
        error(whereEvals, `${label}.expectations needs at least ${MIN_EXPECTATIONS} verifiable statements`)
      }
      if (typeof item.expected_output !== 'string' || !item.expected_output.trim()) error(whereEvals, `${label}.expected_output is required`)
      for (const f of item.files || []) {
        if (!existsSync(join(dir, f))) error(whereEvals, `${label}.files: ${f} does not exist under evals/${skill}/`)
      }
    })
    if (PLACEHOLDER_PATTERN.test(JSON.stringify(evals))) error(whereEvals, 'contains placeholders')
  }

  const triggers = readJsonIfExists(triggersPath, (e) => error(whereTriggers, `invalid JSON: ${e.message}`))
  if (triggers === undefined) error(whereTriggers, `missing; add ${MIN_TRIGGER_QUERIES}+ should-trigger and near-miss should-not-trigger queries`)
  else if (triggers) {
    const list = Array.isArray(triggers) ? triggers : []
    if (list.length < MIN_TRIGGER_QUERIES) error(whereTriggers, `needs at least ${MIN_TRIGGER_QUERIES} queries (found ${list.length})`)
    if (!list.some((q) => q.should_trigger === true) || !list.some((q) => q.should_trigger === false)) {
      error(whereTriggers, 'needs both should_trigger: true and should_trigger: false queries')
    }
    list.forEach((q, i) => {
      if (typeof q.query !== 'string' || !q.query.trim()) error(whereTriggers, `[${i}].query must be a non-empty string`)
      if (typeof q.should_trigger !== 'boolean') error(whereTriggers, `[${i}].should_trigger must be a boolean`)
    })
    if (PLACEHOLDER_PATTERN.test(JSON.stringify(triggers))) error(whereTriggers, 'contains placeholders')
  }
}

function validateRegistration(skill) {
  if (!new RegExp(`^### ${skill}\\s*$`, 'm').test(rootReadme)) error('README.md', `missing a "### ${skill}" section under Available Skills`)
  if (skillsShConfig && Array.isArray(skillsShConfig.groupings)) {
    const grouped = skillsShConfig.groupings.some((g) => (g.skills || []).includes(skill))
    if (!grouped) warn('skills.sh.json', `skill "${skill}" is not in any grouping`)
  }
}

function validateRuleSkill(skill, skillDir, frontmatter) {
  const base = `skills/${skill}`

  for (const file of ['README.md', 'metadata.json', 'AGENTS.md', 'rules/_template.md']) {
    if (!existsSync(join(skillDir, file))) error(base, `missing ${file}`)
  }

  const metadata = readJsonIfExists(join(skillDir, 'metadata.json'), (e) => error(`${base}/metadata.json`, `invalid JSON: ${e.message}`)) || {}
  for (const key of ['title', 'version', 'organization', 'date', 'scope', 'abstract']) {
    if (!metadata[key]) error(`${base}/metadata.json`, `missing \`${key}\``)
  }
  const skillVersion = frontmatter?.metadata?.version
  if (metadata.version && skillVersion && metadata.version !== skillVersion) {
    error(`${base}/SKILL.md`, `metadata.version (${skillVersion}) must equal metadata.json version (${metadata.version})`)
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
    if (!rule.hasFrontmatter) {
      error(where, 'missing frontmatter')
      continue
    }
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
    if (hasUntaggedFence(rule.body)) error(where, 'code fence without a language tag')
    if (!/^Reference: /m.test(rule.body)) warn(where, 'no "Reference:" line')

    if (titles.has(rule.title)) error(where, `duplicate title also used by ${titles.get(rule.title)}`)
    titles.set(rule.title, rule.file)
  }

  const skillText = readText(join(skillDir, 'SKILL.md'))
  if (!skillText.includes(QUICK_REFERENCE_START) || !skillText.includes(QUICK_REFERENCE_END)) {
    error(`${base}/SKILL.md`, 'missing quick-reference markers')
  } else {
    for (const rule of rules) {
      if (!skillText.includes(`\`${rule.id}\``)) error(`${base}/SKILL.md`, `quick reference is missing \`${rule.id}\` (run npm run build)`)
    }
  }
}

// --- helpers ---------------------------------------------------------------------------------

function checkLocalLinks(where, baseDir, body) {
  for (const [, target] of body.matchAll(/\]\((?!https?:|#|mailto:)([^)\s#]+)(#[^)]*)?\)/g)) {
    if (target.includes('\\')) error(where, `Windows-style path in link: ${target}; use forward slashes`)
    else if (!existsSync(join(baseDir, target))) error(where, `broken relative link: ${target}`)
  }
  for (const [, target] of body.matchAll(/`((?:references|rules|scripts|assets)[/\\][^`*<>\s]+\.\w+)`/g)) {
    if (target.includes('\\')) error(where, `Windows-style path: ${target}; use forward slashes`)
    else if (!existsSync(join(baseDir, target))) error(where, `referenced file does not exist: ${target}`)
  }
}

function hasUntaggedFence(markdown) {
  let open = null
  for (const line of markdown.split('\n')) {
    const fence = line.match(/^(`{3,})(.*)$/)
    if (!fence) continue
    if (open === null) {
      if (!fence[2].trim()) return true
      open = fence[1]
    } else if (fence[1].length >= open.length && !fence[2].trim()) {
      open = null
    }
  }
  return false
}

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

function readJsonIfExists(path, onError) {
  if (!existsSync(path)) return undefined
  try {
    return JSON.parse(readText(path))
  } catch (e) {
    onError?.(e)
    return null
  }
}

function report() {
  const errors = findings.filter((f) => f.level === 'error')
  const warnings = findings.filter((f) => f.level === 'warning')
  if (asJson) {
    process.stdout.write(`${JSON.stringify({ ok: errors.length === 0, errors, warnings }, null, 2)}\n`)
  } else {
    for (const w of warnings) console.error(`warning  ${w.where}: ${w.message}`)
    for (const e of errors) console.error(`error    ${e.where}: ${e.message}`)
    console.error(`\n${errors.length} error(s), ${warnings.length} warning(s)`)
  }
  process.exit(errors.length ? 1 : 0)
}
