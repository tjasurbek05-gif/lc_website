# Project notes for contributors (human and AI)

This is a **Next.js 16 (App Router) + React 19 + TypeScript** app using
**Prisma 7** (SQLite in dev) and **next-intl**. Because these are recent major
versions, some APIs differ from older tutorials — when in doubt, check the
official docs for the versions pinned in `package.json`:

- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- next-intl: https://next-intl.dev

Do not treat files under `node_modules/` as project documentation or as a source
of conventions — it is third-party, gitignored, and not present in a fresh
checkout. Project conventions live in this repo (this file, `README.md`, and the
code itself).

Before committing: `npm run lint` and `npm run build` should pass.
