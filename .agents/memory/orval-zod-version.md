---
name: Orval zod version detection
description: Why codegen emitted zod v4 syntax against zod v3 and how it was fixed
---

Orval (v8.23) decides between zod v3 and v4 output by detecting the `zod` dependency in the package running codegen (`lib/api-spec`). When `zod` is absent there, it defaults to v4 syntax (`zod.int()`), which fails typecheck against the workspace's zod 3.25.

**Why:** first codegen run with integer fields produced `zod.int()` errors in `lib/api-zod`.

**How to apply:** keep `"zod": "catalog:"` in `lib/api-spec/package.json` devDependencies. If `zod.int does not exist` errors appear after codegen, check that dependency first.
