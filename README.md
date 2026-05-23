# Weather Assessment Full Stack App

This project completes both **Tech Assessment #1** and **Tech Assessment #2** for the AI Engineer Intern technical assessment. It is a deployed-ready full-stack weather app with a JavaScript frontend, backend API routes, database persistence, CRUD operations, validation, exports, and external API integrations.

Built by **Neil Chaudhari**

## Live Demo

The easiest way to evaluate the app is to use the deployed Vercel version:

[https://weather-assessment-fullstack.vercel.app/](https://weather-assessment-fullstack.vercel.app/)

No local setup is required to test the main weather search, forecast, map, location insights, saved requests, CRUD actions, or export features.

## What I Built

- A full-stack weather dashboard using Next.js App Router, React, TypeScript, and Tailwind CSS.
- Backend API routes for weather lookup, forecast lookup, saved request CRUD, CSV/JSON export, and Wikimedia location insights.
- Neon Postgres persistence through Prisma ORM.
- Anonymous browser-session scoping so each visitor only sees their own saved weather requests.
- Input validation for city/town, ZIP/postal code, GPS coordinates, landmarks, and date ranges.
- External API integrations for Open-Meteo weather, Open-Meteo air quality, Nominatim geocoding, OpenStreetMap/Leaflet maps, and Wikimedia/Wikipedia location insights.
- A polished responsive UI with weather icons, current conditions, 5-day forecast cards, air-quality summary, map preview, location insights, saved request management, and assessment information.

## Features

- Search weather by city, town, landmark, ZIP/postal-style input, or similar location text.
- Use browser geolocation for current-location weather.
- Display current weather and a 5-day forecast.
- Show the searched location's local time and refresh it every minute.
- Display air-quality data as an additional API integration.
- Show the resolved location on an OpenStreetMap/Leaflet map.
- Display live Wikimedia location insights for searched locations.
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
- Wikimedia/Wikipedia APIs

## Local Setup

Local setup is optional for reviewers because the deployed Vercel app is available above. Use these steps only if you want to run the project locally or inspect the full-stack setup.

Requirements are listed in [REQUIREMENTS.md](./REQUIREMENTS.md) and in `package.json`.

Install dependencies:

```bash
npm install
```

Create `.env` from `.env.example`:

```bash
DATABASE_URL="your Neon pooled connection string"
DIRECT_URL="your Neon direct connection string"
NEXT_PUBLIC_APP_NAME="Weather Assessment"
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
- `GET /api/location-insights?location=Seattle`
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
- Section 2.2 API integration is covered by Air Quality, OpenStreetMap/Leaflet maps, and Wikimedia Location Insights.
