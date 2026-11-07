# Swift for TypeScript Developers

A primer on how Swift works and how its syntax maps from TypeScript, Node.js, and Python. Read this before the rules if you are new to Swift, or when explaining Swift concepts to someone coming from JavaScript.

Current as of November 2026: Swift 6.4 (released September 2026), Xcode 27.

## Contents

- [1. How Swift Runs](#1-how-swift-runs)
- [2. Syntax Map](#2-syntax-map)
- [3. Choosing Types: Quick Decision Table](#3-choosing-types-quick-decision-table)
- [4. Common Mistakes from TypeScript Habits](#4-common-mistakes-from-typescript-habits)

---

## 1. How Swift Runs

### Compiled ahead of time

Swift is compiled ahead of time (AOT) to native machine code through LLVM, like C++ or Rust. It is not JIT-compiled like JavaScript in V8 or interpreted like Python.

- There is no interpreter or JS-style runtime. The binary runs directly on the CPU (arm64 on Apple silicon and iPhone).
- Type errors, unhandled enum cases, using an optional as if it were non-optional, and (in Swift 6 mode) **data races** are caught at **compile time**, not in production.
- Builds are slower than `tsc`. Very complex expressions with heavy type inference can slow the type checker; adding explicit type annotations helps.
- Swift also runs on Linux, Windows, Android (official SDK since Swift 6.3), WebAssembly, and microcontrollers (Embedded Swift). Server frameworks: Vapor, Hummingbird.

`swift script.swift` and the REPL exist for convenience, but they compile under the hood too.

### Statically and strongly typed, with inference

| Property | TypeScript | Swift |
|---|---|---|
| When types are checked | Compile time, **erased** at runtime | Compile time, and types **exist** at runtime |
| Strength | Escape hatches (`any`, `as`) | No implicit conversions |
| `Int + Double` | Works (both are `number`) | **Compile error**: write `Double(i) + d` |
| Typing discipline | Structural (shape matters) | **Nominal** (the declared type and conformances matter) |
| Null | `null` / `undefined`, optional strictness | `Optional<T>`, built in and enforced |
| Inference | Yes | Yes, very strong |

The biggest mental shift: in TypeScript two objects with the same shape are interchangeable. In Swift, `struct UserID { let value: String }` and `struct OrderID { let value: String }` are **different types**. Use that to model your domain (see rule `modeling-tagged-ids`).

```swift
let count = 42            // inferred as Int
let price = 9.99          // inferred as Double
let name = "Kacper"       // inferred as String
let explicit: Float = 1.5 // explicit annotation

let total = Double(count) * price // explicit conversion required
```

### Memory: ARC instead of a garbage collector

JavaScript and Python use a garbage collector that periodically frees unreachable objects. Swift uses **Automatic Reference Counting (ARC)**: the compiler inserts retain/release calls for class instances, and an instance is freed the moment its strong reference count reaches zero. No GC pauses, deterministic `deinit`. The cost: you must understand **reference cycles** (rules `memory-*`).

### Value types vs reference types

In JavaScript every object is passed by reference. In Swift:

- **`struct`, `enum`, tuples, `Array`, `Dictionary`, `Set`, `String`** are value types. Assignment copies (logically). Collections use **copy-on-write**, so copies are cheap until one side mutates.
- **`class`, `actor`, closures** are reference types. Assignment shares the instance, as in JavaScript.

```swift
struct Point { var x: Int; var y: Int }

var a = Point(x: 1, y: 2)
var b = a        // copy
b.x = 100
print(a.x)       // 1: `a` is untouched

final class Box { var value = 0 }
let c = Box()
let d = c        // same instance
d.value = 100
print(c.value)   // 100: shared, like a JS object
```

Value types eliminate "someone mutated my object somewhere else" bugs and are safe to share across threads. **Model data as structs by default.** It is what `readonly` and object spread give you in TypeScript, enforced by the language and without the cost.

### Ecosystem map

| Role | Node / TypeScript | Swift |
|---|---|---|
| Package manager | npm / pnpm | **Swift Package Manager (SPM)** |
| Manifest | `package.json` | `Package.swift` (Swift code, not JSON) |
| Lockfile | `package-lock.json` | `Package.resolved` |
| IDE | VS Code | **Xcode** (required to build, sign, and ship apps); VS Code or Cursor with the Swift extension for packages |
| UI | React | **SwiftUI** (declarative); UIKit/AppKit (imperative, older) |
| UI state | hooks, Zustand | `@State`, `@Observable`, `@Environment` |
| HTTP | fetch / axios | `URLSession` |
| JSON + validation | `JSON.parse` + zod | `Codable` (`JSONDecoder`) |
| ORM / database | Prisma | **SwiftData**, GRDB, Core Data |
| Tests | Jest / Vitest | **Swift Testing** (`@Test`, `#expect`), XCTest |
| Lint / format | ESLint / Prettier | SwiftLint / `swift format` |
| Server | Express / Fastify | Vapor, Hummingbird |
| Node version manager | nvm | swiftly (toolchains), Xcode versions |

---

## 2. Syntax Map

### Constants and variables

```swift
let apiURL = "https://api.example.com"  // like `const`: use by default
var retryCount = 0                      // like `let` in TS: mutable
retryCount += 1
```

`let` on a struct is deep immutability: no property can change. In TypeScript, `const obj` still allows `obj.field = x`.

### Collections

```swift
var tags: [String] = ["swift", "ios"]          // Array<String>
var scores: [String: Int] = ["kacper": 10]     // Dictionary<String, Int>
let unique: Set<Int> = [1, 2, 3]

tags.append("macos")
scores["adam"] = 7
let kacperScore = scores["kacper"]             // Int?: the key might be missing

let lengths = tags.map { $0.count }
let long = tags.filter { $0.count > 3 }
let total = lengths.reduce(0, +)
let sortedTags = tags.sorted()                 // returns a new array
let firstLong = tags.first { $0.count > 3 }    // Optional
let ids = ["1", "x", "3"].compactMap { Int($0) } // map and drop nils: [1, 3]
```

### Control flow and pattern matching

```swift
let count = 3
let label = if count == 0 { "empty" } else { "\(count) items" } // if expression

func describe(statusCode: Int) -> String {
    switch statusCode {                  // exhaustive, no implicit fallthrough
    case 200..<300: "success"
    case 401, 403: "auth problem"
    case let code where code >= 500: "server error \(code)"
    default: "other"
    }
}

for (index, tag) in ["a", "b"].enumerated() { print(index, tag) }
for i in 0..<10 { print(i) }             // half-open range
for i in stride(from: 0, to: 100, by: 10) { print(i) }

let (minimum, maximum) = (1, 10)         // tuple destructuring
```

`switch` is full pattern matching (closer to Rust than to JavaScript). The compiler requires every case to be handled; adding an enum case breaks every `switch` that lacks it, unless you used `default` (see rule `modeling-exhaustive-switch`).

### Strings

```swift
let user = "Kacper"
let greeting = "Hello, \(user)!"        // interpolation, like `${user}`
let id = 42
let sql = """
    SELECT *
    FROM users
    WHERE id = \(id)
    """
let raw = #"Regex: \d+ "quoted""#        // raw string

greeting.count                          // grapheme clusters, not bytes
greeting.hasPrefix("He")
greeting.lowercased()
greeting.split(separator: ",")
```

`String` is Unicode-correct (an emoji is one `Character`), so integer subscripting (`s[3]`) does not compile. Use `prefix(_:)`, `dropFirst(_:)`, `firstIndex(of:)`, or `String.Index`.

### Optionals

`T?` is shorthand for `Optional<T>`, an enum with `.none` and `.some(T)`. A non-optional value can never be `nil`.

```swift
struct Address { let city: String }
struct Person { let nickname: String?; let address: Address? }

func greet(_ person: Person?) -> String {
    guard let person else { return "Hello, stranger" }   // early exit
    let city = person.address?.city ?? "somewhere"        // optional chaining + nil-coalescing
    if let nickname = person.nickname {                   // optional binding
        return "Hi \(nickname) from \(city)"
    }
    return "Hello from \(city)"
}

let shout = Optional("swift").map { $0.uppercased() }     // Optional("SWIFT")
```

`!` force-unwraps and crashes on `nil`; reserve it for literals known to be valid (rule `safety-no-force-unwrap`).

### Functions and argument labels

```swift
struct Point { var x: Int; var y: Int }

func move(from start: Point, to end: Point) -> Int {     // external label, internal name
    abs(end.x - start.x) + abs(end.y - start.y)
}
let distance = move(from: Point(x: 0, y: 0), to: Point(x: 3, y: 4))

func greet(_ name: String, punctuation: String = "!") -> String {  // `_` = no label
    "Hello, \(name)\(punctuation)"
}
greet("Kacper")

func increment(_ value: inout Int) { value += 1 }        // explicit in-place mutation
var x = 1
increment(&x)

func bounds(of values: [Int]) -> (min: Int, max: Int)? { // named tuple return
    guard let lo = values.min(), let hi = values.max() else { return nil }
    return (lo, hi)
}
```

### Closures

```swift
let add: (Int, Int) -> Int = { a, b in a + b }         // TS: (a, b) => a + b
let names = ["b", "a"].sorted { $0 < $1 }              // trailing closure, shorthand args

func onComplete(_ handler: @escaping (Result<String, any Error>) -> Void) {
    // @escaping: the closure is stored and called later
}
```

Use `$0`/`$1` only in short closures; name parameters in longer ones.

### Protocols, extensions, generics

```swift
protocol Greeter {
    var name: String { get }
    func greet() -> String
}

extension Greeter {                       // default implementation
    func greet() -> String { "Hello from \(name)" }
}

struct EnglishGreeter: Greeter {          // explicit (nominal) conformance
    let name: String
}

func introduce(_ greeter: some Greeter) -> String {   // generic via `some`
    greeter.greet()
}

func firstMatch<T: Identifiable>(in items: [T], id: T.ID) -> T? {
    items.first { $0.id == id }
}
```

Differences from TypeScript interfaces: conformance is declared, protocols can have default implementations, you can add conformances to existing types (including types you do not own), and protocols can have associated types.

### Errors

```swift
enum ParseError: Error {
    case missingField(String)
}

func parsePort(_ raw: String?) throws -> Int {
    guard let raw else { throw ParseError.missingField("port") }
    guard let port = Int(raw) else { throw ParseError.missingField("port (not a number)") }
    return port
}

do {
    let port = try parsePort("8080")     // `try` marks every call that can throw
    print(port)
} catch ParseError.missingField(let name) {
    print("Missing \(name)")
} catch {
    print("Unexpected: \(error)")
}

let maybePort = try? parsePort(nil)      // nil on error: use sparingly
```

### Access control

| Modifier | Visible in |
|---|---|
| `private` | The enclosing declaration (and its extensions in the same file) |
| `fileprivate` | The file |
| `internal` (default) | The module (SPM target) |
| `package` | All modules in the same Swift package |
| `public` | Other modules |
| `open` | Other modules, and they may subclass or override (classes only) |

A module is an SPM target. This is how a pnpm workspace's package boundaries would work if the compiler enforced them (rules `modules-*`).

---

## 3. Choosing Types: Quick Decision Table

| Question | Use |
|---|---|
| Plain data (DTO, domain model, view state)? | `struct` |
| A finite set of variants or a state machine? | `enum` with associated values |
| Shared mutable state used from several tasks? | `actor` |
| An object with identity observed by SwiftUI, on the main actor? | `@MainActor @Observable final class` |
| Required by a framework (SwiftData `@Model`, UIKit)? | `class` |
| Abstraction over several implementations? | `protocol` (plus `some` / generics) |

---

## 4. Common Mistakes from TypeScript Habits

| Habit | Why it hurts in Swift | Do instead |
|---|---|---|
| Everything is a class "because objects" | Shared mutation, Sendable errors | `struct` |
| `var x: String?` just in case | Blurs the domain, invites `!` | Non-optional unless absence is meaningful |
| `static let shared` with mutable state | Hidden dependencies, global races | Inject; shared state in an `actor` |
| `Task.detached` / `DispatchQueue.global()` "for speed" | Bypasses isolation, loses priority and cancellation | `@concurrent` after measuring |
| Every service is an `actor` | `await` everywhere, reentrancy pitfalls | Actor only for shared mutable state |
| Heavy logic in a view's `body` | Runs on every render | Model properties and methods |
| `@unchecked Sendable` to silence errors | Hides a real race | Redesign the data flow |
| Copying pre-2024 tutorials (`ObservableObject`, Combine, GCD) | Outdated patterns | `@Observable`, async/await, `AsyncSequence` |
| A package for every small thing | Slow builds, upgrade breakage | Foundation and the standard library |
| Connecting the app directly to the backend database | Credentials in the binary | API plus a local cache |
