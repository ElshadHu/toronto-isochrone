# Toronto Isochrone

A map that shows how far you can walk from any Toronto subway station in 15, 30, or 60 minutes.

I wanted to answer a simple question: if you step out of a TTC subway station and start walking, how much of the city can you actually reach? The answer depends on the station. Some stations sit in dense grids where you can cover a lot of ground. Others are surrounded by ravines, highways, or dead-end streets that cut your range short. I wanted to see that difference on a map.

## How It Works

The app shows  71 TTC subway stations across 3 subway lines on a dark map. Click a station and colored areas appear around it. Green is 15 minutes of walking, orange is 30, red is 60. The shapes are not simple circles. They follow the actual street network, so they stretch along walkable corridors and shrink where roads or terrain block the way.

## How the Data Gets In

The data pipeline has two stages: building the station data and computing the walking areas.

**Stage 1: Station data from the TTC transit feed.** A set of scripts downloads the official GTFS feed from the Toronto Open Data portal, filters it down to subway-only routes, extracts the 71 station locations with their line associations, and writes two files: `stations.json` and `lines.geojson`. These are the raw ingredients.

**Stage 2: Walking areas from Valhalla.** Valhalla is an open-source routing engine that runs locally in a Docker container, loaded with OpenStreetMap road data for Ontario. For each of the 71 stations, a script sends the station coordinates to Valhalla and asks: draw me polygons for 15, 30, and 60 minutes of pedestrian walking. Valhalla returns a GeoJSON FeatureCollection with 3 polygon features per station. Each response is about 8.5KB.

**Stage 3: Everything goes into MySQL.** A seed script reads the station and line files and inserts them into the database (subway_lines, stations, station_lines tables). A separate compute script runs all 71 Valhalla calls with a concurrency limit of 2, stores each full FeatureCollection as a single row in the isochrones table. One row per station, 71 rows total. The script is resume-friendly: if it crashes halfway, it skips stations that already have data.

The key decision was to precompute everything. Valhalla calls take a few hundred milliseconds each, which is fine for a batch job but too slow for a user clicking around a map. By storing the results in MySQL, the app serves precomputed GeoJSON blobs in under 10ms per station. React Query on the frontend caches responses per station, so clicking the same station twice costs zero network requests.

## Tech Stack

Next.js 16, React 19, MapLibre GL JS, tRPC, React Query, Zustand, Valhalla (Docker), MySQL (Docker), Tailwind CSS, Shadcn UI

## API

The backend exposes tRPC procedures at `/api/trpc/`:

- `getStations` - returns all 71 stations with their line associations
- `isochrone` - takes a station ID, returns the precomputed walking area polygons from the database. Falls back to a live Valhalla call if the station has no precomputed data.
- `healthcheck` - reports server and database status

## How to Run

### Prerequisites

- Node.js 20+
- Docker

### Setup

```bash
npm install
docker compose up -d    # starts MySQL and Valhalla
```

Wait for Valhalla to finish building its routing tiles (first run takes a few minutes). Check with:

```bash
docker compose logs -f valhalla
# Ready when you see: "[INFO] App is listening on 0.0.0.0:8002"
```

### Build the Data

```bash
# 1. Build station data from the TTC GTFS feed
npm run script:fetch-gtfs
npm run script:filter-subway
npm run script:parse-stations
npm run script:parse-lines-geojson
npm run script:build-station-index

# 2. Create database tables
DATABASE_URL="mysql://isochrone_user:securepassword@localhost:3306/toronto_isochrone" \
  npm run db:migrate

# 3. Seed stations and lines into MySQL
DATABASE_URL="mysql://isochrone_user:securepassword@localhost:3306/toronto_isochrone" \
  npm run script:seed-db

# 4. Compute walking areas for all 71 stations (takes a few minutes)
DATABASE_URL="mysql://isochrone_user:securepassword@localhost:3306/toronto_isochrone" \
  npm run script:compute-isochrones
```

### Run the App

```bash
npm run dev
# Open http://localhost:3000
```

### Verify

```bash
npm run type-check
npm run lint
```
