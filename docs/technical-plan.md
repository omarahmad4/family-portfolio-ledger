# Technical Plan

## Stack
- TypeScript
- Next.js App Router
- Prisma ORM
- SQLite for local V1
- Tailwind-style plain CSS first; shadcn can be added after install
- Vitest for accounting/math tests

## Build philosophy
Keep ledger calculations as pure TypeScript functions before wiring them into the UI. This makes the project AI-friendly, testable, and less likely to have hidden accounting mistakes.

## Immediate next tasks
1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Run `npx prisma migrate dev --name init`.
4. Run `npx prisma db seed`.
5. Run `npm test`.
6. Run `npm run dev`.

## AI-native workflow
Each new feature should start with:
- A short requirement in docs
- A pure function or schema change
- A unit test
- A small UI screen
- Then polish
