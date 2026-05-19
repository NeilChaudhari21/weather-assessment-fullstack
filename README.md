# Weather Assessment Full Stack App

This project completes both **Tech Assessment #1** and **Tech Assessment #2** for the AI Engineer Intern technical assessment. It is a deployed-ready full-stack weather app with a JavaScript frontend, backend API routes, database persistence, CRUD operations, validation, exports, and external API integrations.

Built by **Neil C.**

## Features

- Search weather by city, town, landmark, ZIP/postal-style input, or similar location text.
- Use browser geolocation for current-location weather.
- Display current weather and a 5-day forecast.
- Display air-quality data as an additional API integration.
- Show the resolved location on an OpenStreetMap/Leaflet map.
- Save weather requests with location and date range.
- Read, update, and delete saved weather records.
- Export saved records as JSON or CSV.
- Handle invalid locations, invalid date ranges, denied geolocation, failed API calls, and empty states.

## Tech Stack

- Next.js, React, TypeScript
- Tailwind CSS
- Prisma ORM
- Neon Postgres
- Vercel deployment
- Open-Meteo Forecast API
- Open-Meteo Geocoding API
- Open-Meteo Air Quality API
- Leaflet and OpenStreetMap

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env.local` from `.env.example`:

```bash
DATABASE_URL="your Neon pooled connection string"
DIRECT_URL="your Neon direct connection string"
NEXT_PUBLIC_APP_NAME="Weather Assessment"
NEXT_PUBLIC_CANDIDATE_NAME="Neil C."
```

Generate the Prisma client:

```bash
npm run db:generate
```

Create the database tables:

```bash
npm run db:migrate
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

1. Push this repo to GitHub.
2. Import the repo into Vercel.
3. Add these Vercel environment variables:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `NEXT_PUBLIC_APP_NAME`
   - `NEXT_PUBLIC_CANDIDATE_NAME`
4. Deploy from the `main` branch.
5. Run the production database migration:

```bash
npm run db:deploy
```

If using Vercel, the migration can be run locally against Neon before deployment or added to the deployment workflow after confirming the database connection.

## Scripts

```bash
npm run dev        # Start local dev server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run test       # Run tests
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run db:studio
```

## API Routes

- `GET /api/weather/current?location=Seattle`
- `GET /api/weather/current?lat=47.6062&lon=-122.3321`
- `GET /api/weather/forecast?location=Seattle`
- `POST /api/weather-requests`
- `GET /api/weather-requests`
- `GET /api/weather-requests/:id`
- `PATCH /api/weather-requests/:id`
- `DELETE /api/weather-requests/:id`
- `GET /api/weather-requests/export?format=json`
- `GET /api/weather-requests/export?format=csv`

## Notes

- Neon Auth is intentionally disabled because this assessment does not require user login or row-level security.
- Open-Meteo does not require an API key for this non-commercial assessment project.
- Rotate the Neon database password before final deployment because an earlier connection string was shared during setup.
- Replace the PM Accelerator description in the app with the exact LinkedIn/company wording before final submission if required.
