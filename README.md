# Brian

A modern, multi-role management platform for a learning center. Students see their
marks and progress, teachers grade in seconds, and admins run everything from one place.

Built to be a real, sellable product — secure login, a real database, polished UI,
and a built-in multi-language switcher.

## Features

- **Three account types**, each with its own dashboard and permissions:
  - **Admin** — manage users (students/teachers/admins), groups, subjects, and
    teaching assignments. See center-wide stats.
  - **Teacher** — see assigned classes, enter and edit marks, track class performance.
  - **Student** — view marks, GPA, per-subject performance and a progress-over-time chart.
- **Multi-language** interface (English, Russian, Uzbek) with an in-app switcher.
- **Light / dark mode** with no flash on load.
- **Authentication & role-based access** — signed session cookies, protected routes.
- **Responsive** — works well on phones (students checking marks) and desktop.
- A clearly-marked **logo placeholder** ready to swap for the center's real brand.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** with a small custom UI component library
- **Prisma 7** ORM with a **SQLite** dev database (driver adapter: better-sqlite3)
- **jose** (signed JWT session cookies) + **bcryptjs** (password hashing)
- **next-intl** for internationalization
- **Recharts** for charts

## Getting started

Requirements: Node.js 20+.

```bash
npm install            # also generates the Prisma client (postinstall)
cp .env.example .env   # then set AUTH_SECRET (see the file for a generator command)
npm run db:migrate     # create the SQLite database from the schema
npm run seed           # load demo data (groups, subjects, users, grades)
npm run dev            # http://localhost:3000
```

### Demo logins

All demo accounts use the password **`password123`**:

| Role    | Email              |
| ------- | ------------------ |
| Admin   | `admin@demo.com`   |
| Teacher | `teacher@demo.com` |
| Student | `student@demo.com` |

The login screen also has one-tap buttons to fill in each demo account.

## Project structure

```
prisma/
  schema.prisma        Data model (User, Group, Subject, TeacherSubject, Grade)
  seed.ts              Demo data
src/
  app/
    page.tsx           Public landing page
    login/             Login screen + form
    admin/ teacher/ student/   Role areas (each has its own layout + pages)
    actions/           Server actions (auth, grades, admin CRUD, locale)
  components/
    ui/                Reusable UI primitives (button, card, table, modal, …)
    layout/            App shell: sidebar, topbar, logo, language switcher, theme
    charts/            Recharts client components
    admin/ teacher/    Feature components (managers, gradebook)
  lib/                 prisma, auth, session, metrics, validations, constants
  i18n/                next-intl config (cookie-based locale)
  messages/            en.json, ru.json, uz.json
proxy.ts               Next.js 16 "proxy" (formerly middleware): optimistic auth gate
```

Authorization is enforced server-side in every layout/page/action via
`requireRole()`; `proxy.ts` only does fast optimistic redirects.

## Customizing

- **Logo & brand:** edit `src/components/layout/logo.tsx` (marked as a placeholder).
  Brand colors live as CSS variables in `src/app/globals.css`.
- **Languages:** add a locale in `src/i18n/config.ts` and a matching
  `src/messages/<locale>.json`.

## Going to production

1. **Database → PostgreSQL:** set `provider = "postgresql"` in `prisma/schema.prisma`,
   point `DATABASE_URL` at your Postgres instance, install `@prisma/adapter-pg`, and
   swap the adapter in `src/lib/prisma.ts` (`PrismaPg` instead of `PrismaBetterSqlite3`).
   Then run `npx prisma migrate deploy`.
2. **Secrets:** set a strong `AUTH_SECRET`.
3. **Deploy:** push to a host such as Vercel and run the build (`npm run build`).

## Scripts

| Script             | Description                       |
| ------------------ | --------------------------------- |
| `npm run dev`      | Start the dev server              |
| `npm run build`    | Production build                  |
| `npm run start`    | Run the production build          |
| `npm run lint`     | Lint                              |
| `npm run db:migrate` | Create/apply migrations         |
| `npm run db:reset` | Reset the database                |
| `npm run seed`     | Load demo data                    |
| `npm run db:studio`| Open Prisma Studio                |
