---
name: release-skill
description: Prepares a versioned release of one skill with a semantic version bump, changelog entry, regenerated files, full quality gate and a proposed tag, asking before anything is pushed. Invoke with /release-skill <name> <major|minor|patch|x.y.z>.
disable-model-invocation: true
---

# /release-skill

Input: the text after `/release-skill`: skill name and a bump (`major`, `minor`, `patch`) or an explicit version.

1. **Decide the version.** Read the current version from `skills/<name>/SKILL.md` (`metadata.version`) and, for rule-based skills, `metadata.json`. Semantic versioning for skills: major = removed or renamed rules, changed scope or triggers; minor = new rules, references or capabilities; patch = fixes and wording. If the requested bump contradicts the changes since the last tag (`git log --oneline <last-tag>..HEAD -- skills/<name> evals/<name>`), say so and ask.
2. **Gate.** Require a `skill-reviewer` verdict of SHIP on the current content (run it if there is no review since the last change) and, for minor or major releases, a current `evals/<name>/benchmark.md` that meets the eval thresholds. If either is missing, run `/review-skill` or `/eval-skill` first.
3. **Bump.** Update `metadata.version` in `SKILL.md` and `version` plus `date` in `metadata.json` (rule-based). Add an entry to `skills/<name>/README.md` under a `## Changelog` section (create it if absent): version, date, and a short list of changes.
4. **Build and check.** `npm run build && npm run check` must exit 0.
5. **Propose, then ask.** Show the diff summary and the commands, and wait for explicit approval before running them:

```bash
git add -A
git commit -m "release(<name>): v<x.y.z>"
git tag -a <name>-v<x.y.z> -m "<name> v<x.y.z>"
git push origin HEAD --follow-tags
gh release create <name>-v<x.y.z> --title "<name> v<x.y.z>" --notes-file <(sed -n '/^### v<x.y.z>/,/^### v/p' skills/<name>/README.md)
```

Users can install that exact version from the tag: `npx skills add https://github.com/casp3ro/agent-skills/tree/<name>-v<x.y.z>/skills/<name>`.
