---
name: research-skill
description: Researches prior art on skills.sh and GitHub plus primary documentation for a skill idea or an existing skill, and saves a cited research brief to docs/research/. Invoke with /research-skill <topic or skill name>.
disable-model-invocation: true
---

# /research-skill

Input: the text after `/research-skill`: a topic for a possible new skill, or the name of an existing skill to refresh.

1. If it names an existing skill, read its `SKILL.md`, `docs/research/<name>.md` (if any) and `evals/<name>/` first, and pass the current version and scope to the researcher so it focuses on what changed.
2. Delegate to the `skill-researcher` subagent. For broad topics, launch two in parallel with different focuses (prior-art skills vs primary documentation) and merge their briefs.
3. Check the brief before saving: every fact has a link, version claims cite official sources, prior-art table lists licenses, the recommendation is justified.
4. Save to `docs/research/<slug>.md`. When refreshing an existing brief, keep previous findings that still hold and add a dated "Changes since <previous date>" section at the top.
5. Reply with the recommendation, the three most important findings, and for an existing skill the list of rules or sections that are now outdated (file paths).
