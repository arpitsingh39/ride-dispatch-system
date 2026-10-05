# 🚕 Ride Dispatch System

A simplified asynchronous ride-booking and driver-assignment system built with **Node.js and Express.js**.

This project was created as part of an intern backend technical assessment. It demonstrates:

- Asynchronous ride processing
- Queue-based ride assignment
- Driver acceptance/rejection simulation
- Event publishing
- Multiple independent event consumers
- Concurrent creation of 100 rides
- Validation of final ride states and assignment correctness

---

## 📋 Problem Statement

The system simulates a simplified Ola/Uber-style ride booking workflow.

When a rider creates a ride:

1. The API immediately creates the ride and returns a `rideId`.
2. The ride is placed into a processing queue.
3. A background worker offers the ride to available drivers.
4. Each driver randomly accepts or rejects the ride.
5. If a driver accepts, the ride becomes `ASSIGNED`.
6. If 3 drivers reject the ride, it becomes `NO_DRIVER_FOUND`.
7. Every ride status change generates an event.
8. Two independent consumers receive every event:
   - **Billing Consumer**
   - **Operations Consumer**

The system also includes a script that creates **100 rides simultaneously** and verifies that every ride reaches a final state.

---

# 🏗️ Architecture

```text
                         ┌──────────────────────┐
                         │      Client /        │
                         │      Postman         │
                         └──────────┬───────────┘
                                    │
                                    │ POST /rides
                                    ▼
                         ┌──────────────────────┐
                         │    Express Server    │
                         │      server.js      │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │     Ride Store       │
                         │    In-memory Map     │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │      Ride Queue      │
                         │   Sequential Queue   │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    Ride Worker       │
                         │ Driver Assignment    │
                         └──────────┬───────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     │                             │
                     ▼                             ▼
              Driver accepts               Driver rejects
                     │                             │
                     ▼                             ▼
                ASSIGNED                  Try next driver
                                                   │
                                                   │
                                           3 rejections
                                                   │
                                                   ▼
                                          NO_DRIVER_FOUND


                    Ride Status Events
                           │
                           ▼
                  ┌─────────────────┐
                  │    Event Bus    │
                  └────────┬────────┘
                           │
                 ┌─────────┴─────────┐
                 │                   │
                 ▼                   ▼
        ┌─────────────────┐  ┌─────────────────┐
        │ Billing Process │  │  Ops Process    │
        └─────────────────┘  └─────────────────┘
```

---

# 🛠️ Tech Stack

- **Node.js**
- **Express.js**
- **JavaScript**
- **child_process / IPC**
- **REST API**
- **In-memory data storage**

No external database, Redis, Docker, or message broker is required for this implementation.

---

# 📁 Project Structure

```text
ride-dispatch/
│
├── consumers/
│   ├── billing.js
│   └── ops.js
│
├── screenshots/
│   ├── 100-ride-test.png
│   ├── create-ride.png
│   ├── get-rides.png
│   ├── health-check.png
│   └── worker-events.png
│
├── scripts/
│   └── test100.js
│
├── src/
│   ├── events/
│   │   └── eventBus.js
│   │
│   ├── queue/
│   │   └── rideQueue.js
│   │
│   ├── routes/
│   │   └── rideRoutes.js
│   │
│   ├── store/
│   │   └── rideStore.js
│   │
│   ├── worker/
│   │   └── rideWorker.js
│   │
│   └── server.js
│
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

---

# 🔄 Ride Booking Flow

When `POST /rides` is called:

```text
Client
  │
  ▼
POST /rides
  │
  ▼
Create ride
  │
  ├── status = REQUESTED
  │
  ▼
Publish REQUESTED event
  │
  ▼
Add ride to queue
  │
  ▼
Return rideId immediately
  │
  ▼
Worker processes ride
  │
  ▼
Offer to Driver-1
  │
  ├── ACCEPT → ASSIGNED
  │
  └── REJECT → Driver-2
                   │
                   ├── ACCEPT → ASSIGNED
                   │
                   └── REJECT → Driver-3
                                    │
                                    ├── ACCEPT → ASSIGNED
                                    │
                                    └── REJECT
                                         │
                                         ▼
                                  NO_DRIVER_FOUND
```

---

# 🚗 Driver Assignment

The system uses 10 hardcoded drivers:

```text
Driver-1
Driver-2
Driver-3
Driver-4
Driver-5
Driver-6
Driver-7
Driver-8
Driver-9
Driver-10
```

Each driver's response is randomly generated with approximately a 50% chance of acceptance.

```javascript
function randomDriverResponse() {
    return Math.random() < 0.5;
}
```

A ride is offered to drivers one at a time.

If a driver rejects the ride, the worker tries the next driver.

After **3 rejections**, the ride is marked:

```text
NO_DRIVER_FOUND
```

If any driver accepts, the ride becomes:

```text
ASSIGNED
```

---

# 📡 Event System

Whenever a ride status changes, an event is published.

Example event:

```json
{
  "rideId": "ride-1",
  "status": "ASSIGNED",
  "assignedDriver": "Driver-2"
}
```

The event is sent to both consumer processes.

```text
                    Event Bus
                       │
             ┌─────────┴─────────┐
             │                   │
             ▼                   ▼
        Billing Process      Ops Process
             │                   │
             ▼                   ▼
     "charging rider..."   "ride is now..."
```

The important part is that **both consumers receive every event**.

Events are not divided between consumers.

---

# 💳 Billing Consumer

The Billing consumer runs as a separate Node.js process.

It receives ride events and prints:

```text
[BILLING] charging rider for ride ride-1
```

Implementation:

```javascript
process.on("message", (event) => {
    console.log(
        `[BILLING] charging rider for ride ${event.rideId}`
    );
});
```

---

# 🖥️ Operations Consumer

The Operations consumer also runs as a separate Node.js process.

It receives the same events and prints the current ride status.

Example:

```text
[OPS] ride ride-1 is now in status ASSIGNED
```

Implementation:

```javascript
process.on("message", (event) => {
    console.log(
        `[OPS] ride ${event.rideId} is now in status ${event.status}`
    );
});
```

---

# ⚡ Why Separate Processes?

The assignment requires two separate programs/consumers to consume the same events.

Node.js `child_process.fork()` is used to create two independent processes:

```text
Main Server
    │
    ├── Billing Process
    │
    └── Ops Process
```

The main process sends every event to both processes using Node.js IPC.

This keeps the implementation simple while satisfying the requirement that both consumers receive every event.

---

# 📦 Queue

The ride queue stores rides waiting to be processed.

When a ride is created:

```javascript
addRide(ride);
```

The ride is added to the queue.

The queue processes rides sequentially:

```text
Ride 1 → Worker → Completed
                         │
Ride 2 → Worker → Completed
                         │
Ride 3 → Worker → Completed
```

This ensures that rides are processed in a controlled manner.

---

# 🔌 API Endpoints

## 1. Health Check

### `GET /`

Returns a simple response to verify that the server is running.

Example:

```text
GET http://localhost:3000/
```

Response:

```json
{
  "message": "Ride Dispatch API is running"
}
```

---

## 2. Create Ride

### `POST /rides`

Creates a new ride.

The API immediately returns the generated `rideId`.

Example:

```text
POST http://localhost:3000/rides
```

Response:

```json
{
  "rideId": "ride-1"
}
```

The ride continues processing asynchronously after the response is returned.

---

## 3. Get All Rides

### `GET /rides`

Returns all rides currently stored in memory.

Example:

```text
GET http://localhost:3000/rides
```

Example response:

```json
{
  "rides": [
    {
      "rideId": "ride-1",
      "status": "ASSIGNED",
      "assignedDriver": "Driver-2",
      "assignmentHistory": [
        "Driver-2"
      ],
      "rejectionCount": 0,
      "nextDriverIndex": 2
    }
  ]
}
```

---

# 🧪 Testing 100 Rides

The project includes:

```text
scripts/test100.js
```

This script:

1. Creates 100 rides simultaneously.
2. Stores the IDs of those rides.
3. Checks their status until all rides finish.
4. Counts `ASSIGNED` rides.
5. Counts `NO_DRIVER_FOUND` rides.
6. Checks that all 100 rides have a final status.
7. Checks that no ride was assigned to multiple drivers.

Run:

```bash
npm run test100
```

Example successful output:

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

The exact `ASSIGNED` / `NO_DRIVER_FOUND` numbers can change between runs because driver responses are randomized.

The important invariants are:

```text
Total rides created = 100

ASSIGNED + NO_DRIVER_FOUND = 100

No ride assigned to 2 drivers = 0

No ride stuck without final status = 0
```

---

# 📸 Screenshots

## 1. Health Check

Show:

```text
GET http://localhost:3000/
```

and the response:

```json
{
  "message": "Ride Dispatch API is running"
}
```

**Screenshot:**

![Health Check](screenshots/health-check.png)

---

## 2. Create Ride — POST /rides

Show the Postman request:

```text
POST http://localhost:3000/rides
```

with the returned `rideId`.

**Screenshot:**

![Create Ride](screenshots/create-ride.png)

---

## 3. Get Rides — GET /rides

Show the stored ride and its final status.

**Screenshot:**

![Get Rides](screenshots/get-rides.png)

---

## 4. Worker + Event Consumers

Show the terminal output demonstrating:

- Driver rejection/acceptance
- `ASSIGNED` or `NO_DRIVER_FOUND`
- Billing event
- Ops event

**Screenshot:**

![Worker and Consumers](screenshots/worker-events.png)

---

## 5. 100-Ride Test

Show the terminal output containing:

```text
Total rides created: 100
ASSIGNED: ...
NO_DRIVER_FOUND: ...
Final rides: 100
Any ride assigned to 2 drivers? 0
Any ride stuck with no final status? 0
```

**Screenshot:**

![100 Ride Test](screenshots/100-ride-test.png)

---

# ▶️ How to Run

## 1. Clone the repository

```bash
git clone https://github.com/arpitsingh39/ride-dispatch-system.git
```

Move into the project:

```bash
cd ride-dispatch-system
```

---

## 2. Install dependencies

```bash
npm install
```

---

## 3. Start the server

```bash
npm start
```

The server runs on:

```text
http://localhost:3000
```

---

## 4. Test the API

Create a ride:

```text
POST http://localhost:3000/rides
```

View rides:

```text
GET http://localhost:3000/rides
```

---

# 📜 Available Scripts

| Command | Description |
|---|---|
| `npm start` | Starts the Express server |
| `npm run billing` | Starts the Billing consumer independently |
| `npm run ops` | Starts the Operations consumer independently |
| `npm run test100` | Creates and validates 100 rides |

---

# 🧩 Important Files

### `src/server.js`

Initializes the Express application and starts the HTTP server.

---

### `src/routes/rideRoutes.js`

Contains the ride API endpoints:

```text
POST /rides
GET /rides
```

It creates rides, publishes events, and adds rides to the queue.

---

### `src/store/rideStore.js`

Maintains rides using an in-memory JavaScript `Map`.

It provides functions to:

- Create rides
- Get a ride
- Get all rides

---

### `src/queue/rideQueue.js`

Maintains the processing queue and starts the worker when rides are available.

---

### `src/worker/rideWorker.js`

Contains the driver assignment logic.

It:

- Selects drivers
- Simulates acceptance/rejection
- Tracks rejections
- Assigns a driver
- Sets `NO_DRIVER_FOUND` after 3 rejections
- Publishes status events

---

### `src/events/eventBus.js`

Creates the Billing and Operations child processes and sends every ride event to both consumers.

---

### `consumers/billing.js`

Consumes ride events for billing-related processing.

---

### `consumers/ops.js`

Consumes ride events for operations/status monitoring.

---

### `scripts/test100.js`

Runs the 100-ride validation test.

It verifies:

- 100 rides are created
- Every ride reaches a final status
- No ride has multiple assignments
- No ride remains stuck

---

# 🔐 Data Storage

This implementation uses an **in-memory JavaScript `Map`** instead of a database.

This was intentionally kept simple because the assessment focuses on:

- Asynchronous processing
- Queueing
- Driver assignment
- Event publishing
- Multiple consumers
- Correctness under 100 concurrent ride requests

The data is therefore reset whenever the server restarts.

---

# ⚙️ Design Decisions

### Immediate API Response

The `POST /rides` endpoint does not wait for driver assignment.

It creates the ride, queues it, and immediately returns the `rideId`.

This allows the driver assignment process to happen asynchronously.

---

### Sequential Worker Processing

The queue processes rides sequentially.

This keeps the implementation simple and makes the assignment flow easy to reason about.

---

### Driver Assignment History

Each ride maintains:

```javascript
assignmentHistory
```

This allows the test script to verify that no ride was assigned to more than one driver.

---

### Three-Rejection Rule

A ride is offered to drivers until:

- A driver accepts, or
- Three drivers reject the ride.

After three rejections:

```text
NO_DRIVER_FOUND
```

---

### Separate Event Consumers

Billing and Operations are separate Node.js processes.

Every event is sent to both consumers, ensuring that neither consumer misses an event.

---

# ⚠️ Limitations

This is a simplified assessment implementation.

### In-memory storage

Rides are lost when the Node.js server restarts.

A production system would use a persistent database.

### In-process queue

The queue exists inside the Node.js application.

A production system could use a durable queue such as Redis, RabbitMQ, Kafka, or another message broker.

### Simulated drivers

Drivers are hardcoded and their responses are randomly generated.

A production system would communicate with real driver availability and location services.

### Single worker

The current implementation processes rides sequentially.

A production system could use multiple workers for higher throughput.

---

# 🚀 Possible Production Improvements

If this system were extended for production, I would consider:

- MongoDB/PostgreSQL for persistent ride storage
- Redis/BullMQ or RabbitMQ for a durable job queue
- Kafka/RabbitMQ for event streaming
- Multiple worker processes
- Driver location and availability tracking
- Ride timeout handling
- Retry mechanisms
- Idempotent event processing
- Authentication and authorization
- Request validation
- Structured logging
- Monitoring and metrics
- Docker/containerization
- Horizontal scaling

---

# ✅ Assessment Requirements Covered

| Requirement | Implementation |
|---|---|
| Create ride API | `POST /rides` |
| Return `rideId` immediately | Implemented |
| Queue ride | `rideQueue.js` |
| Separate worker | `rideWorker.js` |
| Hardcoded drivers | 10 drivers |
| Random accept/reject | ~50% probability |
| Assign accepted ride | `ASSIGNED` |
| Three rejections | `NO_DRIVER_FOUND` |
| Publish ride events | `eventBus.js` |
| Billing consumer | `consumers/billing.js` |
| Operations consumer | `consumers/ops.js` |
| Both consumers receive every event | Implemented using IPC |
| Create 100 rides | `scripts/test100.js` |
| No duplicate assignments | `assignmentHistory` validation |
| No stuck rides | Final-status validation |
| README | This document |

---

# 📌 Summary

This project demonstrates an asynchronous ride-booking workflow where a ride is created immediately, processed through a queue, assigned to drivers asynchronously, and publishes events to multiple independent consumers.

The 100-ride test verifies the core correctness requirements:

```text
100 rides created
        ↓
Driver assignment processing
        ↓
ASSIGNED / NO_DRIVER_FOUND
        ↓
100 final rides
        ↓
0 duplicate assignments
        ↓
0 stuck rides
```

**Built with Node.js + Express.js + JavaScript + Node.js IPC**