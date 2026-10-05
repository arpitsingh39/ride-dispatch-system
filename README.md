# 🚕 Ride Dispatch System

An asynchronous ride-booking and driver-assignment system built with **Node.js and Express.js**, modelled on a simplified Ola/Uber workflow.

Built for an intern backend technical assessment. No database, Redis, Docker, or message broker required.

## ✨ What It Does

- `POST /rides` creates a ride and returns a `rideId` **immediately**
- The ride is queued and processed in the background by a worker
- The worker offers the ride to drivers one at a time (each accepts with ~50% probability)
- First acceptance → `ASSIGNED`. Three rejections → `NO_DRIVER_FOUND`
- Every status change publishes an event received by **two independent consumer processes** (Billing and Ops)
- A test script fires **100 concurrent rides** and verifies every one reaches a final state with no duplicate assignments

## 🏗️ Architecture

```text
Client ──POST /rides──▶ Express API ──▶ Ride Store (in-memory Map)
                             │
                             ▼
                        Ride Queue ──▶ Ride Worker ──▶ Driver 1 → 2 → 3
                                            │              │
                                            │              ├─ accept ─▶ ASSIGNED
                                            │              └─ 3 rejects ▶ NO_DRIVER_FOUND
                                            ▼
                                        Event Bus (fork + IPC)
                                       ┌────┴─────┐
                                       ▼          ▼
                                   Billing      Ops
                                  process      process
```

### Ride lifecycle

```text
REQUESTED ──▶ ASSIGNED
          └─▶ NO_DRIVER_FOUND
```

A `REQUESTED` event is published on creation, and another event is published when the final status is set.

## 🔌 API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/rides` | Create a ride, returns `{ "rideId": "ride-1" }` |
| `GET` | `/rides` | List all rides currently in memory |

Example ride object from `GET /rides`:

```json
{
  "rideId": "ride-1",
  "status": "ASSIGNED",
  "assignedDriver": "Driver-2",
  "assignmentHistory": ["Driver-2"],
  "rejectionCount": 0,
  "nextDriverIndex": 2
}
```

## 📡 Events and Consumers

Each status change publishes an event:

```json
{ "rideId": "ride-1", "status": "ASSIGNED", "assignedDriver": "Driver-2" }
```

The main process uses `child_process.fork()` to start two separate Node.js processes and sends **every event to both** over IPC. Events are broadcast, not split between consumers.

| Consumer | File | Output |
|---|---|---|
| Billing | `consumers/billing.js` | `[BILLING] charging rider for ride ride-1` |
| Operations | `consumers/ops.js` | `[OPS] ride ride-1 is now in status ASSIGNED` |

## 🚗 Driver Assignment

- 10 hardcoded drivers: `Driver-1` … `Driver-10`
- Each response is random: `Math.random() < 0.5`
- Drivers are offered the ride one at a time; after 3 rejections the ride becomes `NO_DRIVER_FOUND`
- The queue is processed sequentially, which keeps the flow simple and easy to reason about

## ▶️ Getting Started

```bash
git clone https://github.com/arpitsingh39/ride-dispatch-system.git
cd ride-dispatch-system
npm install
npm start
```

The server runs at `http://localhost:3000`.

```bash
# Create a ride
curl -X POST http://localhost:3000/rides

# View all rides
curl http://localhost:3000/rides
```

## 🧪 Testing 100 Concurrent Rides

With the server running, in another terminal:

```bash
npm run test100
```

The script creates 100 rides at once, polls until all are finished, and checks the invariants below.

```text
==============================
       TEST RESULTS
==============================
Total rides created: 100
ASSIGNED: 87
NO_DRIVER_FOUND: 13
Final rides: 100
Any ride assigned to 2 drivers? 0
Any ride stuck with no final status? 0
==============================
```

`ASSIGNED` / `NO_DRIVER_FOUND` counts vary between runs because driver responses are random. What must always hold:

- `ASSIGNED + NO_DRIVER_FOUND = 100`
- No ride is assigned to more than one driver (checked via `assignmentHistory`)
- No ride is stuck without a final status

## 📸 Screenshots

| Health check | Create ride |
|---|---|
| ![Health Check](screenshots/health-check.png) | ![Create Ride](screenshots/create-ride.png) |

| Get rides | Worker + consumers |
|---|---|
| ![Get Rides](screenshots/get-rides.png) | ![Worker and Consumers](screenshots/worker-events.png) |

**100-ride test**

![100 Ride Test](screenshots/100-ride-test.png)

## 📁 Project Structure

```text
ride-dispatch/
├── consumers/
│   ├── billing.js          # Billing consumer process
│   └── ops.js              # Operations consumer process
├── scripts/
│   └── test100.js          # 100-ride validation test
├── src/
│   ├── events/eventBus.js  # Forks consumers, broadcasts events to both
│   ├── queue/rideQueue.js  # Sequential queue, triggers the worker
│   ├── routes/rideRoutes.js# POST /rides, GET /rides
│   ├── store/rideStore.js  # In-memory Map of rides
│   ├── worker/rideWorker.js# Driver offers, accept/reject, final status
│   └── server.js           # Express app entry point
├── screenshots/
└── package.json
```

## ⚙️ Design Decisions

- **Immediate response:** `POST /rides` never waits for assignment; processing happens asynchronously.
- **Separate consumer processes:** Billing and Ops run as real separate processes, and both receive every event.
- **Assignment history:** each ride records every driver it was assigned to, so the test can prove no ride has two drivers.
- **In-memory storage:** keeps the focus on async processing, queueing, events, and correctness under concurrency. Data resets on restart.

## ⚠️ Limitations and Production Improvements

| Current (assessment) | Production approach |
|---|---|
| In-memory `Map` | MongoDB / PostgreSQL |
| In-process queue | Redis + BullMQ, RabbitMQ, or Kafka |
| Node IPC event bus | Kafka / RabbitMQ with idempotent consumers |
| Single sequential worker | Multiple workers for throughput |
| Random simulated drivers | Real driver availability and location tracking |

Also worth adding: ride timeouts, retries, request validation, authentication, structured logging, metrics, and containerization.

---

**Built with Node.js, Express.js, and Node.js IPC**
