#!/usr/bin/env node
// Scaffolds a new skill from .cursor/templates, plus its evals and README entry.
// The scaffold deliberately contains TODO markers: `npm run validate` fails until every one is
// replaced with real content, so an unfinished skill cannot pass CI.
//
// Usage:
//   node scripts/new-skill.mjs <name> --type=simple|rules --title="Title" --description="..."
//
// Prints a JSON summary of created files on stdout; progress messages go to stderr.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { REPO_ROOT, SKILLS_DIR, EVALS_DIR } from './lib/skills.mjs'

const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
const TEMPLATES = join(REPO_ROOT, '.cursor', 'templates')

const [name, ...rest] = process.argv.slice(2)
const option = (key, fallback) => rest.find((a) => a.startsWith(`--${key}=`))?.slice(key.length + 3) ?? fallback

function fail(message) {
  console.error(`new-skill: ${message}`)
  process.exit(1)
}

if (!name) fail('usage: node scripts/new-skill.mjs <name> --type=simple|rules --title="..." --description="..."')
if (!NAME_PATTERN.test(name) || name.length > 64) fail(`invalid name "${name}": use 1-64 chars of a-z, 0-9 and single hyphens`)
if (/anthropic|claude/.test(name)) fail('names must not contain the reserved words "anthropic" or "claude"')

const type = option('type', 'simple')
if (!['simple', 'rules'].includes(type)) fail(`--type must be "simple" or "rules", got "${type}"`)

const skillDir = join(SKILLS_DIR, name)
const evalsDir = join(EVALS_DIR, name)
if (existsSync(skillDir)) fail(`skills/${name} already exists`)
// Evals are written before the skill (evaluation-driven development), so existing eval files are kept.
const keepEvals = existsSync(join(evalsDir, 'evals.json')) || existsSync(join(evalsDir, 'triggers.json'))

const now = new Date()
const values = {
  name,
  title: option('title', name.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')),
  description: option('description', 'TODO: what the skill does and the situations that should trigger it. Use when ...'),
  monthYear: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
}

const created = []
copyTemplate(join(TEMPLATES, type === 'rules' ? 'rules-skill' : 'skill'), skillDir)
if (keepEvals) console.error(`Keeping existing evals in evals/${name}/`)
else copyTemplate(join(TEMPLATES, 'evals'), evalsDir)
registerInReadme()

process.stdout.write(`${JSON.stringify({ skill: name, type, keptExistingEvals: keepEvals, created }, null, 2)}\n`)
console.error(`\nScaffolded skills/${name}. Next: replace every TODO, then run npm run build && npm run validate.`)

function copyTemplate(from, to) {
  if (!existsSync(from)) fail(`template not found: ${relative(REPO_ROOT, from)}`)
  mkdirSync(to, { recursive: true })
  cpSync(from, to, { recursive: true })
  for (const file of walk(to)) {
    const text = readFileSync(file, 'utf8').replace(/\{\{(\w+)\}\}/g, (match, key) => values[key] ?? match)
    writeFileSync(file, text)
    created.push(relative(REPO_ROOT, file))
  }
}

function registerInReadme() {
  const readmePath = join(REPO_ROOT, 'README.md')
  if (!existsSync(readmePath)) return
  const readme = readFileSync(readmePath, 'utf8')
  if (new RegExp(`^### ${name}\\s*$`, 'm').test(readme)) return
  const entry = `### ${name}\n\n${values.description}\n\n`
  const anchor = readme.indexOf('\n## Installation')
  const updated = anchor === -1 ? `${readme.trimEnd()}\n\n${entry}` : `${readme.slice(0, anchor + 1)}${entry}${readme.slice(anchor + 1)}`
  writeFileSync(readmePath, updated)
  created.push('README.md (Available Skills entry)')
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}
