# Swift Best Practices

A structured, rule-based skill for writing production Swift 6 and SwiftUI code, optimized for AI agents and readable by humans.

## Structure

- `SKILL.md` - Skill entry point loaded by agents (frontmatter, priorities, generated quick reference)
- `rules/` - One file per rule
  - `_sections.md` - Section metadata (titles, prefixes, impact levels, descriptions)
  - `_template.md` - Template for new rules
  - `area-description.md` - Individual rule files (e.g. `concurrency-async-let.md`)
- `references/` - Longer primers loaded on demand
- `metadata.json` - Document metadata (title, version, organization, abstract, references)
- __`AGENTS.md`__ - Compiled guide with every rule expanded (generated)
- `../../evals/swift/test-cases.json` - Incorrect/correct examples for LLM evaluation (generated)

## Getting Started

From the repository root (Node.js 20+, no dependencies to install):

1. Build `AGENTS.md`, the `SKILL.md` quick reference, and test cases:
   ```bash
   npm run build
   ```

2. Validate the skill and every rule file:
   ```bash
   npm run validate
   ```

3. Check that generated files are committed and current (used in CI):
   ```bash
   npm run check
   ```

## Creating a New Rule

1. Copy `rules/_template.md` to `rules/<prefix>-<description>.md`.
2. Choose the prefix of the section the rule belongs to:
   - `concurrency-` Concurrency and Data-Race Safety (Section 1)
   - `modeling-` Data Modeling and Value Semantics (Section 2)
   - `safety-` Optionals and Error Handling (Section 3)
   - `memory-` Memory Management with ARC (Section 4)
   - `architecture-` SwiftUI App Architecture (Section 5)
   - `modules-` Repository Structure and Modularization (Section 6)
   - `networking-` Networking and API Integration (Section 7)
   - `persistence-` Persistence and Local Data (Section 8)
   - `realtime-` Webhooks, Push, and Real-Time (Section 9)
   - `api-` API Design and Code Style (Section 10)
   - `testing-` Testing (Section 11)
   - `tooling-` Tooling, Configuration, and Observability (Section 12)
3. Fill in the frontmatter and the body.
4. Give clear incorrect and correct examples in `swift` code blocks.
5. Run `npm run build && npm run validate`.
6. If the correct example is self-contained library code, consider adding it to `validation/SwiftSkillValidation` so CI compiles it with a real Swift toolchain.

## Rule File Structure

````markdown
---
title: Rule Title Here
impact: HIGH
impactDescription: short impact description
tags: tag1, tag2, tag3
---

## Rule Title Here

**Impact: HIGH (short impact description)**

Why the rule matters, in concrete terms.

**Incorrect (what's wrong):**

```swift
// Bad code example
```

**Correct (what's right):**

```swift
// Good code example
```

Optional notes after the examples.

Reference: [Link](https://www.swift.org/documentation/)
````

## File Naming Convention

- Files starting with `_` are special and excluded from the build
- Rule files: `<prefix>-<description>.md` in kebab-case (e.g. `networking-typed-endpoints.md`)
- The section is inferred from the filename prefix
- Rules are sorted alphabetically by title within each section
- IDs (e.g. 1.1, 1.2) are generated during the build

## Impact Levels

- `CRITICAL` - Prevents crashes, data races, or data loss; fix first
- `HIGH` - Significant correctness, safety, or maintainability gains
- `MEDIUM-HIGH` - Important for production quality
- `MEDIUM` - Clear improvements to design and consistency
- `LOW-MEDIUM` - Operational and stylistic improvements
- `LOW` - Incremental refinements

## Learning Path (for Humans)

This skill doubles as a handbook for engineers moving to Swift from TypeScript, Node.js, or Python. A six-week plan at about an hour a day:

1. **Language.** Read [A Swift Tour](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/guidedtour/) and `references/swift-for-typescript-developers.md`. Port a few TypeScript utilities to a Swift package (`swift package init --type library`, `swift test`).
2. **Types and abstractions.** Protocols, generics, opaque and boxed types, error handling, ARC. Then the `modeling-`, `safety-`, `memory-`, and `api-` rules. Build the domain layer of a small app with only structs, enums, and protocols, fully tested.
3. **Concurrency.** `references/concurrency-primer.md`, the `concurrency-` rules, and the WWDC sessions listed in the primer. Build the HTTP client from `networking-single-client` with a token store and test concurrent requests sharing one refresh.
4. **SwiftUI.** Apple's SwiftUI pathway and the `architecture-` rules. Put a UI on the week-2 domain with `@Observable`, `NavigationStack`, `.task`, and previews backed by fakes.
5. **Data and networking.** The `networking-` and `persistence-` rules. Build an offline-first sync: API → DTO → `@ModelActor` upsert → `@Query` UI.
6. **Production.** The `modules-`, `testing-`, `tooling-`, and `realtime-` rules. Modularize into a local package, add per-environment xcconfig, CI with Swift Testing and Thread Sanitizer, and a small Vapor webhook endpoint that sends a push to the app.

Further resources: [Apple's Swift pathway](https://developer.apple.com/swift/get-started/), [The Swift Programming Language](https://docs.swift.org/swift-book/), [Swift API Design Guidelines](https://www.swift.org/documentation/api-design-guidelines/), Hacking with Swift, Swift by Sundell, SwiftLee, Point-Free, and the [Swift Forums](https://forums.swift.org).

## Acknowledgments

Structure modeled on [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills). The defaults hierarchy follows the progressive-disclosure framing from Emil Kowalski's [write-swift](https://www.skills.sh/emilkowalski/skills/write-swift) skill.
