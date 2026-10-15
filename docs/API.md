# API Usage

## Quick start

```bash
npm install
npm run start:dev      # http://localhost:3000
```

Interactive docs (Swagger UI): **http://localhost:3000/docs**
Raw OpenAPI JSON: **http://localhost:3000/docs-json**

## Docker and Compose

Requires Docker Engine with the Compose plugin, or Docker Desktop configured for
Linux containers. Node.js and MongoDB do not need to be installed on the host.

From the repository root:

```bash
docker compose up --build -d --wait
docker compose ps
```

Open **http://localhost:3000/docs** and use the walkthrough below. Compose starts
MongoDB first, waits for its ping health check, then starts the API. The API image
uses Node.js 24, compiles TypeScript in a separate build stage, installs only
production dependencies in the final image, and runs as the unprivileged `node`
user. Compiled routing workers are included in `dist`.

Only the API is published, on the host's loopback interface. MongoDB is reachable
by the API at `mongo:27017` on the Compose network and is not published to the
host. This is a local evaluation setup; MongoDB authentication and remote
exposure are not configured.

The API always listens on port 3000 inside Compose. To change the host port, set
`PORT` in a root `.env` file, for example `PORT=3001`, and open
`http://localhost:3001/docs`. Compose sets its own internal `MONGO_URI`; a host
connection string from `.env` is not passed to the container. Environment files
are excluded from the image build context.

The API container health check verifies that `/docs-json` responds successfully.
It checks HTTP availability, not ongoing MongoDB connectivity. Nest shutdown
hooks close MongoDB connections and stop the routing worker on container stop.

```bash
docker compose logs -f api
docker compose down
```

`down` keeps the named MongoDB volume, so uploaded networks survive recreating
the containers. Route jobs remain in API memory and are lost when it restarts.
To also erase the stored networks, use `docker compose down --volumes`.

To run only the API with its in-memory network repository:

```bash
docker build -t smart-logistics-api .
docker run --rm --init -p 127.0.0.1:3000:3000 smart-logistics-api
```

No `MONGO_URI` is set in this standalone command, so it keeps the last five
networks in memory.

## Tests

Run the test suites:

```bash
npm test               # unit tests (algorithm, heap, services, repository)
npm run test:e2e       # end-to-end tests over HTTP (in-memory driver)
npm run verify:mongo   # real MongoDB round-trip (ephemeral mongod via mongodb-memory-server)
```

## Endpoints

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `POST` | `/network/upload` | Store a graph, returns its `id`. |
| `GET` | `/network/nodes/{id}` | List the nodes of a stored graph. |
| `POST` | `/route/optimize/{id}` | Submit an async route job, returns `202 { jobId }`. |
| `GET` | `/route/status/{jobId}` | Poll a job: `PENDING` → `PROCESSING` → `COMPLETED`/`FAILED`. |
| `GET` | `/docs` | Swagger UI (auto-generated from the code). |

## Walkthrough

### 1. Upload a network

```bash
curl -X POST http://localhost:3000/network/upload \
  -H "Content-Type: application/json" \
  -d '{
    "edges": [
      { "from": "A", "to": "B", "cost": 10, "maxWeight": 10000, "noHazardous": false, "trafficMultiplier": 1.0 },
      { "from": "A", "to": "C", "cost": 15, "maxWeight": 5000,  "noHazardous": true,  "trafficMultiplier": 1.5 },
      { "from": "B", "to": "D", "cost": 12, "maxWeight": 10000, "noHazardous": false, "trafficMultiplier": 2.0 },
      { "from": "C", "to": "D", "cost": 5,  "maxWeight": 5000,  "noHazardous": true,  "trafficMultiplier": 1.0 },
      { "from": "D", "to": "E", "cost": 10, "maxWeight": 8000,  "noHazardous": false, "trafficMultiplier": 1.2 }
    ]
  }'
# => { "id": "<graphId>" }
```

Only edges are sent; nodes are derived from their endpoints. Optional edge
fields default to: `maxWeight` = unlimited, `noHazardous` = `false`,
`trafficMultiplier` = `1`.

### 2. Submit a route job

```bash
curl -X POST http://localhost:3000/route/optimize/<graphId> \
  -H "Content-Type: application/json" \
  -d '{
    "originNodeId": "A",
    "destinationNodeId": "E",
    "waypoints": ["C"],
    "vehicleProfile": { "type": "van", "weight": 3000, "hazardous": false },
    "departureTime": "12:00"
  }'
# 202 Accepted => { "jobId": "job-..." }
```

### 3. Poll the result

```bash
curl http://localhost:3000/route/status/<jobId>
# {
#   "status": "COMPLETED",
#   "result": { "graphId": "...", "totalCost": 30, "path": ["A","C","D","E"], "durationMs": 0 }
# }
```

On failure the job settles as `FAILED` with a structured `error`:

```json
{
  "status": "FAILED",
  "error": {
    "code": "NO_ROUTE",
    "message": "No route from 'A' to 'E' under the given constraints"
  }
}
```

Codes: `NO_ROUTE` (unreachable, or impossible under the constraints),
`UNKNOWN_NODE` (a referenced node is not in the graph) and `INTERNAL_ERROR`
(unexpected failure).

## Behaviour notes

- **Algorithm:** Dijkstra with a binary min-heap, `O((V + E) log V)`.
- **Vehicle constraints:** edges with `maxWeight < vehicle.weight`, or with
  `noHazardous: true` while `vehicle.hazardous` is set, are filtered out before
  pathfinding.
- **Time-dependent weights:** during peak windows (`07:00–09:00` and
  `17:00–19:00`, start inclusive / end exclusive) an edge costs
  `cost * trafficMultiplier`; otherwise it costs `cost`.
- **Multi-stop:** waypoints are visited strictly in array order (fixed sequence,
  not a TSP reordering). Any unreachable leg fails the whole job.
- **Edge validation:** within a single upload the edge list must be free of
  self-loops (`from === to`), duplicated edges (same direction and cost) and
  parallel edges (same direction, different cost) — these return `400`. Node ids
  must be non-empty and free of surrounding whitespace, and `trafficMultiplier`
  must be `> 0`. Bidirectional pairs are valid: `A → B` and `B → A` are distinct
  edges of a directed graph.
- **Route request validation:** `originNodeId` and `destinationNodeId` must
  differ when no `waypoints` are given; `waypoints` must not contain duplicates
  and must not include the origin or the destination — these return `400`.
- **Storage:** two interchangeable drivers behind a `NetworkRepository`
  abstraction. Set `MONGO_URI` to persist networks in MongoDB (Mongoose); when it
  is unset the API falls back to an in-memory driver that keeps only the last 5
  networks. Route jobs are kept in memory.

## Persistence

Copy `.env.example` to `.env` and set the connection string:

```bash
MONGO_URI=mongodb://localhost:27017/smart-logistics
```

Then start the API as usual (`npm run start:dev`). Without `MONGO_URI`, the API
boots with the in-memory driver, so no database is required for a quick demo or
for the automated tests.

## Validation cases (from the project brief)

| Request | Expected route | Cost |
| :--- | :--- | :--- |
| `van`, 3000, 12:00 | `A → C → D → E` | 30 |
| `truck`, 6000, 12:00 | `A → B → D → E` | 32 |
| `truck`, 3000, hazardous, 12:00 | `A → B → D → E` | 32 |
| `van`, 3000, 08:00 (peak) | `A → C → D → E` | 39.5 |
