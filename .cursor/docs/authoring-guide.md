# Skill Authoring Guide

Condensed, sourced guidance for writing skills in this repository. The rules in `.cursor/rules/` point here; the quality bar (`quality-bar.md`) is how the result is judged.

## Contents

- [How Skills Load](#how-skills-load)
- [Choosing the Skill Type](#choosing-the-skill-type)
- [Frontmatter](#frontmatter)
- [Writing the Description](#writing-the-description)
- [Writing the Body](#writing-the-body)
- [Progressive Disclosure](#progressive-disclosure)
- [Degrees of Freedom](#degrees-of-freedom)
- [Examples and Templates](#examples-and-templates)
- [Workflows and Feedback Loops](#workflows-and-feedback-loops)
- [Scripts](#scripts)
- [Pruning](#pruning)
- [Research and Attribution](#research-and-attribution)
- [Sources](#sources)

## How Skills Load

1. At startup the agent sees only `name` and `description` of every installed skill (often 100+). The description is the only trigger.
2. When a task matches, the agent reads `SKILL.md`. Every line now competes with the conversation for attention.
3. Files linked from `SKILL.md` load only when the agent decides it needs them. Scripts run without their source entering context.

Consequence: put trigger information in the description, what every branch needs in `SKILL.md`, and branch-specific depth in linked files.

## Choosing the Skill Type

| Type | Use when | Layout |
|---|---|---|
| **Simple** | One workflow or a compact body of guidance | `SKILL.md` + optional `references/`, `scripts/`, `assets/` |
| **Rule-based** | A large catalogue of independent best practices reviewed by ID (like `swift`) | `SKILL.md` + `rules/` + `metadata.json` + generated `AGENTS.md` |

Scaffold with `node scripts/new-skill.mjs <name> --type=simple|rules`.

## Frontmatter

```yaml
---
name: kebab-case-name          # equals the folder; 1-64 chars; no "anthropic"/"claude"
description: Third-person summary of what it does. Use when <branch>, <branch>, or <branch>.
license: MIT
metadata:
  author: casp3ro
  version: "0.1.0"
---
```

Names: a noun for a domain (`swift`) or a gerund for an activity (`reviewing-pull-requests`). Never generic (`helper`, `utils`, `tools`). Keep naming consistent across the collection.

## Writing the Description

- Third person: "Builds...", "Reviews...". It is injected into the system prompt; "I can" and "you can" read wrongly there.
- Front-load the capability in the first words.
- Then "Use when ..." listing each distinct branch once, using the words users actually type (frameworks, file types, error messages).
- Collapse synonyms into one branch; cut anything the body already says.
- Agents tend to undertrigger. Be specific and slightly assertive about coverage ("Use when writing, reviewing, or refactoring X, even if the user does not name X"), but never claim branches the body does not handle.
- Verify against `triggers.json`, especially the near misses.

## Writing the Body

- Assume a capable model. Add only what changes behavior versus its default: conventions, decisions, gotchas, exact procedures, current versions.
- Lead with what to do. State the positive target ("write one-line comments") rather than a prohibition; use a prohibition only as a hard guardrail, paired with the positive target.
- One default per choice, one escape hatch: "Use pdfplumber. For scanned PDFs, use pytesseract instead."
- One term per concept across all files.
- No relative time ("currently", "as of", "new in"). State the version a fact applies to; keep deprecated material in a clearly labeled "Old patterns" section.
- Concrete beats abstract: an incorrect/correct pair teaches more than a paragraph.

## Progressive Disclosure

- `SKILL.md` under 500 lines (enforced), ideally far less.
- Link every reference file directly from `SKILL.md` with a "read when ..." pointer. No chains (`SKILL.md` → `a.md` → `b.md`): agents preview nested files partially.
- Reference files over 100 lines start with a table of contents (enforced).
- Split references by domain or branch so a task loads only what it needs (`references/finance.md`, `references/sales.md`).
- Name files by content (`form-validation-rules.md`, not `doc2.md`).

## Degrees of Freedom

| Freedom | When | Form |
|---|---|---|
| High | Many valid approaches; judgment needed | Heuristics and examples |
| Medium | A preferred pattern; parameters vary | Pseudocode, parameterized script |
| Low | Fragile, order-sensitive, must be consistent | Exact script or command, "run exactly this" |

## Examples and Templates

- Strict output format: "ALWAYS use this template" plus the template.
- Style-dependent output: two or three input/output pairs.
- Code guidance: incorrect/correct pairs with a one-line explanation of the failure each prevents.
- Examples must be correct and minimal. Wrong examples teach wrong behavior with high confidence.

## Workflows and Feedback Loops

- Order multi-step work as numbered steps; for long ones provide a copy-able checklist.
- End every step on a **completion criterion** the agent can check ("validator exits 0", "every modified model listed"). Vague criteria invite premature completion.
- For quality-critical output, loop: run validator → fix → repeat until clean.
- For batch or destructive operations: plan file → validate the plan → execute → verify.

## Scripts

- Prefer a script whenever the work is deterministic (validation, conversion, extraction). Say whether to run it or read it.
- Scripts solve problems: handle errors with messages that say what to do next. Do not fail and leave the agent to guess.
- Justify every constant in a comment. No unexplained numbers.
- State dependencies and install commands; do not assume tools exist.
- Forward slashes in all paths. Shebang line; `set -e` in shell scripts. Status to stderr, results (JSON) to stdout.

## Pruning

- Delete no-op sentences: anything the model already does by default.
- Keep each meaning in one place. Restating `package.json` scripts or directory layouts is a cache that goes stale; keep only what cannot be looked up (conventions, reasons, gotchas).
- Re-check relevance on every change. Stale layers accumulate unless removed.

## Research and Attribution

- Research before writing: existing skills on skills.sh (`npx skills find <topic>`), official documentation, and recent release notes. Record findings in `docs/research/<name>.md`.
- Primary sources beat blog posts. Verify version-specific claims against official docs or release notes.
- Do not copy text or code from other skills unless their license allows it; attribute adapted material in the skill's README.

## Sources

- [Agent Skills specification](https://agentskills.io/specification)
- [Anthropic: Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [anthropics/skills: skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator)
- [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)
- [mattpocock/skills: writing-for-agents](https://github.com/mattpocock/skills)
- [Cursor: Agent Skills](https://cursor.com/docs/skills)
