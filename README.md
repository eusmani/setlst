This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Database: dev vs. prod

`npm run dev` runs against a **local SQLite file** (`dev.db`), not production — so
you can't accidentally corrupt live data while developing. Production uses a
**Turso** (libSQL) database.

How the split works (Next.js env-file precedence):

- **`.env`** — sets `DATABASE_URL="file:./dev.db"`, the local dev default.
- **`.env.production.local`** — sets the Turso `DATABASE_URL` + `TURSO_AUTH_TOKEN`;
  loaded only for production builds (`next build` / `next start`). Gitignored.
- **`.env.local`** — shared secrets (auth, Spotify, etc.). **Do not** put
  `DATABASE_URL` here: `.env.local` overrides `.env` in *both* dev and prod, so a
  Turso URL here would point `npm run dev` straight at production. Gitignored.
- **Vercel** injects its own env vars in production, independent of these files.

Set up / reset the local database:

```bash
npx prisma db push          # sync dev.db to prisma/schema.prisma
```

To intentionally run locally against production data, temporarily set
`DATABASE_URL` (and `TURSO_AUTH_TOKEN`) in your shell for a single command —
don't move them back into `.env.local`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
