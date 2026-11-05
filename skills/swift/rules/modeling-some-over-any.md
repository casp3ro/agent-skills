---
title: Prefer some and Generics over any
impact: MEDIUM
impactDescription: static dispatch, no boxing
tags: modeling, generics, opaque-types, existentials
---

## Prefer some and Generics over any

**Impact: MEDIUM (static dispatch, no boxing)**

`some P` (an opaque type, shorthand for a generic parameter) means one concrete type known to the compiler: static dispatch, inlining, no allocation. `any P` (an existential) is a box that can hold any conforming type: dynamic dispatch, possible heap allocation, and lost type information. Start with `some` or generics; use `any` when you truly need heterogeneous storage or a type chosen at runtime. Stored dependencies at module boundaries are a reasonable place for `any`.

**Incorrect (existentials everywhere, including hot paths and homogeneous data):**

```swift
func totalArea(of shapes: [any Shape]) -> Double { // every element boxed
    shapes.reduce(0) { $0 + $1.area }
}

func render(_ shape: any Shape) -> String {
    "Area: \(shape.area)"
}
```

**Correct (generics for homogeneous data, any only where heterogeneity is real):**

```swift
protocol Shape {
    var area: Double { get }
}

func totalArea<S: Shape>(of shapes: [S]) -> Double {
    shapes.reduce(0) { $0 + $1.area }
}

func render(_ shape: some Shape) -> String {
    "Area: \(shape.area)"
}

struct Circle: Shape { let radius: Double; var area: Double { .pi * radius * radius } }
struct Square: Shape { let side: Double; var area: Double { side * side } }

// Heterogeneous collection: any is the right tool here.
let mixed: [any Shape] = [Circle(radius: 1), Square(side: 2)]
let mixedArea = mixed.reduce(0) { $0 + $1.area }
```

Reference: [Opaque and Boxed Protocol Types](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/opaquetypes/)
