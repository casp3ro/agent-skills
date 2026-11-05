# Sections

This file defines all sections, their ordering, impact levels, and descriptions.
The section ID (in parentheses) is the filename prefix used to group rules.

---

## 1. Concurrency and Data-Race Safety (concurrency)

**Impact:** CRITICAL
**Description:** Swift 6 turns data races into compile-time errors. Getting isolation right (main actor by default, explicit background work, actors for shared state) prevents crashes that never reproduce locally and keeps the UI responsive.

## 2. Data Modeling and Value Semantics (modeling)

**Impact:** CRITICAL
**Description:** Value types, enums with associated values, and strong types eliminate whole classes of bugs (shared mutation, impossible states, mixed-up IDs) before the code ever runs.

## 3. Optionals and Error Handling (safety)

**Impact:** HIGH
**Description:** Optionals and typed errors make failure explicit. Force-unwrapping and swallowing errors turn recoverable situations into crashes or silent data loss.

## 4. Memory Management with ARC (memory)

**Impact:** HIGH
**Description:** Swift uses reference counting, not a garbage collector. Reference cycles leak memory and keep work running after the user has left the screen.

## 5. SwiftUI App Architecture (architecture)

**Impact:** HIGH
**Description:** Observable models, injected dependencies, and navigation as data keep views thin, testable, and fast to re-render.

## 6. Repository Structure and Modularization (modules)

**Impact:** MEDIUM-HIGH
**Description:** A thin app target plus a local Swift package with enforced module boundaries gives faster incremental builds, testable features, and an architecture the compiler enforces.

## 7. Networking and API Integration (networking)

**Impact:** MEDIUM-HIGH
**Description:** A single typed HTTP client with explicit endpoints, DTO mapping, and centralized auth makes API integration predictable and testable.

## 8. Persistence and Local Data (persistence)

**Impact:** MEDIUM-HIGH
**Description:** Choosing the right store (UserDefaults, Keychain, SwiftData, GRDB) and respecting actor boundaries prevents data loss, leaked secrets, and threading crashes.

## 9. Webhooks, Push, and Real-Time (realtime)

**Impact:** MEDIUM
**Description:** Apps cannot receive webhooks. Server-side ingestion, push notifications, and WebSocket streams must be wired together correctly to deliver real-time updates.

## 10. API Design and Code Style (api)

**Impact:** MEDIUM
**Description:** Following the Swift API Design Guidelines makes call sites read like prose and makes code look native to every Swift developer who reads it.

## 11. Testing (testing)

**Impact:** MEDIUM
**Description:** Swift Testing, protocol-based fakes, and sanitizers catch regressions and concurrency bugs before release.

## 12. Tooling, Configuration, and Observability (tooling)

**Impact:** LOW-MEDIUM
**Description:** Per-environment configuration, structured logging, and automated formatting keep a production codebase operable and consistent.
