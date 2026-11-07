#!/usr/bin/env node
// Pre-write guardrail (Cursor preToolUse Write|Delete).
// Blocks edits that would corrupt generated files, ship non-skill files inside a published skill,
// or touch secrets. Every denial says what to do instead.

import { allow, deny, exitIfDuplicateHost, readPayload, repoPath, targetPaths } from './lib.mjs'

const payload = readPayload()
exitIfDuplicateHost(payload)

// Entries allowed at the top level of skills/<name>/ (published to users by `npx skills add`).
const ALLOWED_SKILL_ENTRIES = new Set(['SKILL.md', 'README.md', 'AGENTS.md', 'metadata.json', 'LICENSE', 'LICENSE.txt', 'LICENSE.md', 'rules', 'references', 'scripts', 'assets'])

const SECRET_FILE = /(^|\/)(\.env(\..*)?|.*\.pem|.*\.p8|.*\.p12|id_(rsa|ed25519)(\.pub)?|credentials\.json)$/i

for (const raw of targetPaths(payload.tool_input)) {
  const path = repoPath(raw)
  if (!path) continue

  if (SECRET_FILE.test(path) && !path.endsWith('.env.example')) {
    deny(`Blocked: ${path} looks like a secret. Never create or edit secrets in this public repository.`)
  }

  if (/^skills\/[^/]+\/AGENTS\.md$/.test(path)) {
    deny(`Blocked: ${path} is generated. Edit skills/<skill>/rules/*.md, rules/_sections.md or metadata.json, then run \`npm run build\`.`)
  }

  if (/^evals\/[^/]+\/test-cases\.json$/.test(path)) {
    deny(`Blocked: ${path} is generated from the rule examples. Edit the rule files and run \`npm run build\`. Task evals live in evals/<skill>/evals.json.`)
  }

  const inSkill = path.match(/^skills\/([^/]+)\/([^/]+)/)
  if (inSkill && !ALLOWED_SKILL_ENTRIES.has(inSkill[2])) {
    deny(
      `Blocked: skills/${inSkill[1]}/${inSkill[2]} would be published to every user who installs the skill. ` +
        `Allowed entries: ${[...ALLOWED_SKILL_ENTRIES].join(', ')}. Evals belong in evals/${inSkill[1]}/, research in docs/research/.`,
    )
  }

  if (/^\.claude\/skills\//.test(path) || /^\.agents\/skills\//.test(path)) {
    deny(
      `Blocked: ${path} is scanned by \`npx skills add casp3ro/agent-skills\` and would be published as an installable skill. ` +
        'Put harness workflows in .cursor/skills/, which the skills CLI does not publish.',
    )
  }
}

allow()
