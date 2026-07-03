---
name: tsconfig noEmit pattern for esbuild/tsx artifacts
description: Why api-server and scripts tsconfigs must have noEmit:true and no references, and the Vercel "Emit skipped" root cause.
---

## Rule
Any TypeScript project whose actual build/run tool is NOT tsc (e.g. esbuild, tsx, vite) MUST declare
"noEmit": true in its tsconfig. Do NOT set outDir / rootDir. Do NOT list composite lib references.

**Why:**
- dist/ is gitignored, so lib *.d.ts files don't exist on a clean Vercel/CI clone.
- Without noEmit:true, a bare `tsc -p tsconfig.json` (Vercel may run this) tries to emit JS.
- references to composite libs expect pre-built dist/*.d.ts. When absent, TypeScript raises
  TS6305 ("Output file has not been built from source file").
- noEmitOnError:true (inherited from tsconfig.base.json) turns any error into "Emit skipped"
  for every file in the project.

**How to apply:**
- api-server: build tool is esbuild (node build.mjs). tsconfig must have noEmit:true, no outDir,
  no references.
- scripts: run via tsx. Same rule.
- Workspace packages (@workspace/db etc.) resolve types via pnpm workspace symlinks →
  package.json exports → ./src/index.ts — no project references needed.
- The root tsc --build (typecheck:libs) still builds lib .d.ts files for incremental builds,
  but consuming artifacts must not DEPEND on those files existing.

**Contrast with lib packages:**
Lib packages (lib/db, lib/api-zod, etc.) DO have composite:true + emitDeclarationOnly:true
because they ARE built by tsc (for their .d.ts output) and ARE referenced by the root
solution tsconfig.
