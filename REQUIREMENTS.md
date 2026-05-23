# Requirements

This is a Node.js/Next.js project. The installable package requirements are defined in `package.json` and locked by `package-lock.json`.

## Runtime

- Node.js 20 or newer recommended
- npm 10 or newer recommended
- Neon Postgres database

## Environment Variables

Create `.env` or `.env.local` from `.env.example`:

```bash
DATABASE_URL="your Neon pooled connection string"
DIRECT_URL="your Neon direct connection string"
NEXT_PUBLIC_APP_NAME="Weather Assessment"
```

## Main Dependencies

- `next`
- `react`
- `react-dom`
- `@prisma/client`
- `zod`
- `leaflet`
- `react-leaflet`
- `lucide-react`

## Development Dependencies

- `prisma`
- `typescript`
- `tailwindcss`
- `eslint`
- `eslint-config-next`
- `vitest`
- `tsx`
- `@types/node`
- `@types/react`
- `@types/react-dom`
- `@types/leaflet`

## Install

```bash
npm install
```

## Verify

```bash
npm run test
npm run lint
npm run build
```
