# Toronto Isochrone

A map that shows how far you can walk from any Toronto subway station in 15, 30, or 60 minutes.

Click a station on the map. Colored areas appear around it. Green means 15 minutes of walking. Orange means 30 minutes. Red means 60 minutes.

## What It Does

1. Shows all 71 TTC subway stations and 3 subway lines on a dark map.
2. You click a station. The map zooms in.
3. The app asks the Valhalla routing engine: "How far can someone walk from here?"
4. Valhalla sends back 3 shapes (polygons) for 15, 30, and 60 minutes.
5. The app draws these shapes on the map with different colors.

## Current Progress

| Step | What it does                        | Status  |
| ---- | ----------------------------------- | ------- |
| 1    | Build station data from transit feed | Done    |
| 2    | Create shared types and state        | Done    |
| 3    | Show stations and lines on map       | Done    |
| 4    | Show walking areas on click          | Done    |
| 5    | Add sidebar with controls            | Next    |
| 6    | Save data to database                | Later   |
| 7    | Add station search                   | Later   |

## Tech Stack

Next.js 16, React 19, MapLibre GL JS, tRPC, Zustand, Valhalla (Docker), MySQL, Tailwind CSS, Shadcn UI

## API

The backend has these endpoints at `/api/trpc/`:

### `isochrone`

Give it a location. It returns 3 walking areas (15min, 30min, 60min).

```
GET /api/trpc/isochrone?input={"json":{"lat":43.6453,"lon":-79.3806}}
```

It talks to the Valhalla engine running on `localhost:8002`.

### `healthcheck`

Checks if the server and database are working.

```
GET /api/trpc/healthcheck
```

## Data Files

The app uses two data files in `public/data/`:

- **stations.json** - 71 subway stations with name, location, and line info
- **lines.geojson** - the 3 subway line paths drawn on the map

These files are created by the pipeline scripts (see below).

## How to Run

### What You Need

- Node.js 20 or newer
- Docker

### Setup

```bash
npm install
```

### Start Valhalla

Valhalla calculates the walking areas. It needs to run in Docker. The first start takes a few minutes because it builds a routing map.

```bash
docker compose up -d valhalla
docker compose logs -f valhalla
# Wait until you see: "[INFO] App is listening on 0.0.0.0:8002"
```

### Start the App

```bash
npm run dev
# Open http://localhost:3000
```

### Check Your Code

```bash
npm run type-check    # check types
npm run lint          # check code style
```

### Test Valhalla

```bash
curl -s -X POST http://localhost:8002/isochrone \
  -H 'Content-Type: application/json' \
  -d '{"locations":[{"lat":43.6453,"lon":-79.3806}],"costing":"pedestrian","contours":[{"time":15},{"time":30},{"time":60}],"polygons":true}' \
  | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('Features:',j.features.length)})"
# You should see: Features: 3
```

## Pipeline Scripts

These scripts create the station and line data from the TTC transit feed. Run them in this order:

```bash
npm run script:fetch-gtfs            # download transit data
npm run script:filter-subway         # keep only subway data
npm run script:parse-stations        # extract subway stops
npm run script:parse-lines-geojson   # build line paths
npm run script:build-station-index   # create final stations.json and lines.geojson
```
