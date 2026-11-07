# Agent Skills

A collection of skills for AI coding agents (Claude Code, Cursor, Codex, OpenCode, and others). Skills are packaged instructions that extend what an agent knows how to do well.

Skills follow the [Agent Skills](https://agentskills.io/) format and install with the [`skills`](https://github.com/vercel-labs/skills) CLI.

[![skills.sh](https://skills.sh/b/casp3ro/agent-skills)](https://skills.sh/casp3ro/agent-skills)

## Available Skills

### swift

Modern Swift 6 and SwiftUI best practices for production iOS and macOS apps. Contains 62 rules across 12 categories, prioritized by impact, plus primers for developers coming from TypeScript and single-threaded JavaScript.

**Use when:**

- Writing, reviewing, or refactoring Swift and SwiftUI code
- Fixing Swift 6 `Sendable`, actor-isolation, or data-race errors
- Structuring a Swift app, Swift packages, and module boundaries
- Integrating a REST or OpenAPI backend, SwiftData, or the Keychain
- Wiring push notifications, webhooks (server side), and WebSockets
- Learning Swift as a TypeScript, Node.js, or Python developer

**Categories covered:**

- Concurrency and data-race safety (Critical)
- Data modeling and value semantics (Critical)
- Optionals and error handling (High)
- Memory management with ARC (High)
- SwiftUI app architecture (High)
- Repository structure and modularization (Medium-High)
- Networking and API integration (Medium-High)
- Persistence and local data (Medium-High)
- Webhooks, push, and real-time (Medium)
- API design and code style (Medium)
- Testing (Medium)
- Tooling, configuration, and observability (Low-Medium)

## Installation

Requires Node.js 22.20 or later for the `skills` CLI. Run from your project:

```bash
# Interactive: choose skills and agents
npx skills add casp3ro/agent-skills

# Only the Swift skill, for Cursor
npx skills add casp3ro/agent-skills --skill swift -a cursor

# Only the Swift skill, for Claude Code, available in every project
npx skills add casp3ro/agent-skills --skill swift -a claude-code -g
```

### Manual installation

- **Claude Code:** `cp -r skills/swift ~/.claude/skills/` (or `.claude/skills/` in a project)
- **Cursor:** copy `skills/swift` to `.agents/skills/` in the project, or `~/.cursor/skills/` for all projects
- **claude.ai:** zip the `skills/swift` folder (`cd skills && zip -r ../dist/swift.zip swift`) and upload it as a custom skill in claude.ai settings

## Usage

Skills load automatically when a task matches their description. Examples:

```text
Review this SwiftUI view model for concurrency problems
```

```text
Set up a modular Swift package structure for a new iOS app with networking and SwiftData
```

```text
Explain why this Swift 6 code needs `await` here; I come from TypeScript
```

## Repository Structure

```text
agent-skills/
├── skills/
│   └── swift/
│       ├── SKILL.md            # entry point: frontmatter, priorities, quick reference
│       ├── AGENTS.md           # compiled guide with every rule expanded (generated)
│       ├── README.md           # contributor guide for the skill
│       ├── metadata.json       # title, version, abstract, references
│       ├── rules/              # one Markdown file per rule
│       └── references/         # primers loaded on demand
├── evals/swift/                # evals.json, triggers.json, benchmark.md, test-cases.json (generated)
├── docs/research/              # cited research briefs per skill
├── scripts/                    # zero-dependency build, validate, scaffold, harness self-test (Node.js 20+)
├── validation/                 # Swift package that compiles the rule examples in CI
├── .cursor/                    # authoring harness: rules, /workflows, subagents, hooks (not published)
└── .github/workflows/ci.yml
```

## Development

```bash
npm run build          # regenerate AGENTS.md, SKILL.md quick reference, evals
npm run validate       # quality gate for every skill
npm run test:harness   # self-test of hooks, validator and scaffolder
npm run check          # all of the above in check mode (CI, Cursor stop hook)
```

Compile and test the Swift examples (macOS with Xcode 26 or later):

```bash
cd validation/SwiftSkillValidation
swift build
swift test
```

To add or change skills, use the Cursor workflows (`/new-skill`, `/new-rule`, `/review-skill`, `/eval-skill`, `/release-skill`) described in [.cursor/README.md](.cursor/README.md). Formats and commands: [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE)
