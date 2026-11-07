---
name: new-rule
description: Adds one rule to a rule-based skill (such as swift) with verified sources, correct incorrect/correct examples, compile validation and regenerated outputs. Invoke with /new-rule <skill> <prefix> "<title>".
disable-model-invocation: true
---

# /new-rule

Input: the text after `/new-rule`: skill name, section prefix, rule title, and optionally the problem the rule solves. If the prefix is not in `skills/<skill>/rules/_sections.md`, list the valid prefixes and ask.

```text
/new-rule <skill> <prefix> "<title>"
- [ ] 1. Check overlap   gate: no existing rule covers it (or user approved merging)
- [ ] 2. Verify          gate: primary source found; claim and versions confirmed
- [ ] 3. Write           gate: rule file follows rule-files.mdc; examples correct
- [ ] 4. Compile         gate: examples compile in the validation package (when applicable)
- [ ] 5. Build           gate: npm run build && npm run validate exit 0
- [ ] 6. Review          gate: self-review checklist below passes
```

1. **Overlap.** Search `skills/<skill>/rules/` for related titles and tags (`rg -i "<keyword>" skills/<skill>/rules`). If a rule already covers the idea, propose extending it instead.
2. **Verify.** Find the primary source (official docs, proposal, release notes) for the claim and the version it applies to. Add the source to `docs/research/<skill>.md` under "Current facts".
3. **Write** `skills/<skill>/rules/<prefix>-<topic>.md` from `rules/_template.md`, following `.cursor/rules/rule-files.mdc`. Pick impact by the cost of violating the rule. The incorrect example shows the realistic mistake an agent makes, not a strawman.
4. **Compile.** For `swift`: put the self-contained correct example into `validation/SwiftSkillValidation` (the module that matches its isolation), add a test if behavior is non-trivial, and run `swift build && swift test` there if a Swift toolchain is available. If no toolchain is available, say so explicitly in the summary; CI will compile it.
5. **Build.** `npm run build && npm run validate`; fix everything.
6. **Self-review:** one idea only; title is an imperative instruction; the explanation names a concrete failure; examples are minimal and realistic; no relative time; reference link is a primary source; consistent terminology with neighbouring rules. Then report the rule ID, impact, source, and the proposed commit message `feat(<skill>): add <rule-id> rule`.
