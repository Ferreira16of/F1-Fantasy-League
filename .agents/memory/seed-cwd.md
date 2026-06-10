---
name: Seed script working directory
description: The seed script requires a specific cwd to resolve drizzle-orm correctly
---

The seed script at `scripts/src/seed.ts` uses `@workspace/db` which imports `drizzle-orm`.
tsx resolves node_modules from the **file's location** (scripts/), but `drizzle-orm` is only installed in `artifacts/api-server/node_modules/`.

**Rule:** Always run the seed from `artifacts/api-server/`:
```
cd artifacts/api-server && DATABASE_URL="$DATABASE_URL" /home/runner/workspace/scripts/node_modules/.bin/tsx ../../scripts/src/seed.ts
```

**Why:** tsx's ESM resolver walks up from the file path, hitting scripts/ first. scripts/ doesn't have drizzle-orm as a direct dep — it only has @workspace/db as a workspace dep whose transitive deps live in api-server.

**How to apply:** Any time you add a script to scripts/src/ that imports from @workspace/db, run it from the artifact that has the runtime deps installed.
