#!/usr/bin/env node
// Builds every rule-based skill:
//   - skills/<name>/AGENTS.md          compiled guide with all rules expanded
//   - skills/<name>/SKILL.md           quick-reference block between markers
//   - evals/<name>/test-cases.json     bad/good examples for LLM evaluation
//
// Usage:
//   node scripts/build.mjs              build all rule-based skills
//   node scripts/build.mjs --skill=swift
//   node scripts/build.mjs --check      exit 1 if generated files are out of date (CI)

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  SKILLS_DIR, EVALS_DIR, QUICK_REFERENCE_START, QUICK_REFERENCE_END,
  readText, listRuleSkills, parseSections, parseRules, groupRules, extractExamples, anchor,
} from './lib/skills.mjs'

const args = process.argv.slice(2)
const checkOnly = args.includes('--check')
const skillArg = args.find((a) => a.startsWith('--skill='))?.split('=')[1]
const skills = skillArg ? [skillArg] : listRuleSkills()

let stale = 0

for (const skill of skills) {
  const skillDir = join(SKILLS_DIR, skill)
  const metadata = JSON.parse(readText(join(skillDir, 'metadata.json')))
  const sections = parseSections(skillDir)
  const grouped = groupRules(sections, parseRules(skillDir, sections))
  const ruleCount = grouped.reduce((n, s) => n + s.rules.length, 0)

  emit(join(skillDir, 'AGENTS.md'), renderAgents(metadata, grouped))
  emit(join(skillDir, 'SKILL.md'), renderSkill(readText(join(skillDir, 'SKILL.md')), grouped, ruleCount))
  emit(join(EVALS_DIR, skill, 'test-cases.json'), renderTestCases(grouped))

  console.error(`${checkOnly ? 'checked' : 'built'} ${skill}: ${ruleCount} rules in ${grouped.length} sections`)
}

if (checkOnly && stale > 0) {
  console.error(`\n${stale} generated file(s) are out of date. Run \`npm run build\` and commit the result.`)
  process.exit(1)
}

function emit(path, content) {
  const current = existsSync(path) ? readText(path) : null
  if (current === content) return
  if (checkOnly) {
    console.error(`out of date: ${path}`)
    stale++
    return
  }
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, content)
}

function renderAgents(metadata, grouped) {
  const out = []
  out.push(`# ${metadata.title}`, '')
  out.push(`**Version ${metadata.version}**  `, `${metadata.organization}  `, `${metadata.date}`, '')
  out.push(
    '> **Note:**  ',
    '> This document is mainly for agents and LLMs to follow when maintaining,  ',
    `> generating, or refactoring ${metadata.scope}. Humans  `,
    '> may also find it useful, but guidance here is optimized for automation  ',
    '> and consistency by AI-assisted workflows.',
    '',
    '---',
    '',
    '## Abstract',
    '',
    metadata.abstract,
    '',
    '---',
    '',
    '## Table of Contents',
    '',
  )
  for (const section of grouped) {
    out.push(`${section.number}. [${section.title}](#${anchor(`${section.number}. ${section.title}`)}) — **${section.impact}**`)
    for (const rule of section.rules) {
      out.push(`   - ${rule.number} [${rule.title}](#${anchor(`${rule.number} ${rule.title}`)})`)
    }
  }
  out.push('', '---', '')

  for (const section of grouped) {
    out.push(`## ${section.number}. ${section.title}`, '')
    out.push(`**Impact: ${section.impact}**`, '')
    out.push(section.description, '')
    for (const rule of section.rules) {
      // Rule bodies start with "## Title"; demote to "### N.M Title" and keep everything else verbatim.
      const body = rule.body.replace(/^## .+\n/, '').trim()
      out.push(`### ${rule.number} ${rule.title}`, '', body, '')
    }
    out.push('---', '')
  }

  if (metadata.references?.length) {
    out.push('## References', '')
    metadata.references.forEach((url, i) => out.push(`${i + 1}. [${url}](${url})`))
    out.push('')
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n')
}

function renderSkill(current, grouped, ruleCount) {
  const start = current.indexOf(QUICK_REFERENCE_START)
  const end = current.indexOf(QUICK_REFERENCE_END)
  if (start === -1 || end === -1 || end < start) {
    throw new Error('SKILL.md is missing the quick-reference markers')
  }
  const lines = [QUICK_REFERENCE_START, '', `${ruleCount} rules in ${grouped.length} sections. Read \`rules/<rule-id>.md\` for the full rule with incorrect and correct examples.`, '']
  for (const section of grouped) {
    lines.push(`### ${section.number}. ${section.title} (${section.impact})`, '')
    for (const rule of section.rules) lines.push(`- \`${rule.id}\` - ${rule.title}`)
    lines.push('')
  }
  lines.push(QUICK_REFERENCE_END)
  return current.slice(0, start) + lines.join('\n') + current.slice(end + QUICK_REFERENCE_END.length)
}

function renderTestCases(grouped) {
  const cases = []
  for (const section of grouped) {
    for (const rule of section.rules) {
      for (const example of extractExamples(rule.body)) {
        cases.push({
          ruleId: rule.id,
          ruleNumber: rule.number,
          ruleTitle: rule.title,
          section: section.title,
          impact: rule.impact,
          type: example.type,
          language: example.language,
          description: example.description,
          code: example.code,
        })
      }
    }
  }
  return `${JSON.stringify(cases, null, 2)}\n`
}
