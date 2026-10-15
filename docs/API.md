# API Usage

## Quick start

```bash
npm install
npm run start:dev      # http://localhost:3000
```

Interactive docs (Swagger UI): **http://localhost:3000/docs**
Raw OpenAPI JSON: **http://localhost:3000/docs-json**

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
