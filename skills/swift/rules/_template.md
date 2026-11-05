---
title: Rule Title Here
impact: MEDIUM
impactDescription: Optional short description of the impact
tags: tag1, tag2
---

## Rule Title Here

**Impact: MEDIUM (optional short description of the impact)**

Brief explanation of the rule and why it matters. Explain the failure mode in concrete terms (crash, data race, hang, leak, slow build) rather than in abstract terms.

**Incorrect (description of what's wrong):**

```swift
// Bad code example here
let value = optionalValue!
```

**Correct (description of what's right):**

```swift
// Good code example here
guard let value = optionalValue else { return }
```

Optional explanatory text after the examples: edge cases, when the rule does not apply.

Reference: [Link to documentation or resource](https://www.swift.org/documentation/)
