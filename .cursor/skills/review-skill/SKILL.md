---
name: review-skill
description: Runs an independent quality review of a skill against the repository quality bar and optionally applies the fixes. Invoke with /review-skill <name> [--fix].
disable-model-invocation: true
---

# /review-skill

Input: the text after `/review-skill`: a skill name and optionally `--fix`.

1. Run `node scripts/validate.mjs --skill=<name>` and keep the output.
2. Delegate to the `skill-reviewer` subagent (fresh context) with the skill name. Do not pass your own opinion of the skill; the review must be independent.
3. Present the review verbatim, then a short plan grouped as blockers, rubric fixes, and optional polish.
4. Without `--fix`: stop here.
5. With `--fix`: apply blockers and rubric fixes (not optional polish unless trivial), run `npm run build && npm run validate`, then run the `skill-reviewer` again. Repeat until the verdict is SHIP or two rounds pass without improvement, in which case stop and report what remains.
6. If any fix changes behavior (not just wording), recommend running `/eval-skill <name>` and say why.
