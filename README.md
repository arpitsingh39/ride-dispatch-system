# Intern Ride Dispatch System

A simple asynchronous ride-booking and driver-dispatch backend built with **Node.js** and **Express.js**.

This project simulates a simplified version of how ride-hailing platforms such as Ola/Uber can process a ride request asynchronously, offer the ride to drivers one by one, and publish ride-status events to multiple consumers.

---

## 📌 Assignment Overview

The system implements three requirements:

1. **Book a ride and asynchronously offer it to drivers**
2. **Publish ride-status events to multiple consumers**
3. **Run a 100-ride test and verify the final results**

### Expected behavior

- `POST /rides` creates a ride and immediately returns a `rideId`.
- The ride starts with status `REQUESTED`.
- The ride is placed into an in-memory queue.
- A worker processes the ride asynchronously.
- A hardcoded list of 10 fake drivers is used.
- Each driver randomly accepts or rejects the ride (~50% probability).
- If a driver accepts, the ride becomes `ASSIGNED`.
- If 3 drivers reject the ride, it becomes `NO_DRIVER_FOUND`.
- Every status change is published as an event.
- Both the Billing and Operations consumers receive every event.
- A test script creates 100 rides and verifies that all rides reach a final status.

---

## 🏗️ Architecture

```text
                         Client
                           |
                           | POST /rides
                           v
                    +---------------+
                    | Express API   |
                    +-------+-------+
                            |
                            v
                    +---------------+
                    |  Ride Store   |
                    |  REQUESTED    |
                    +-------+-------+
                            |
                            v
                    +---------------+
                    | In-Memory     |
                    | Queue         |
                    +-------+-------+
                            |
                            v
                    +---------------+
                    | Ride Worker   |
                    +-------+-------+
                            |
                     Offer to driver
                            |
              +-------------+-------------+
              |                           |
           ACCEPT                      REJECT
              |                           |
              v                           v
        +-----------+               Next driver
        | ASSIGNED  |                    |
        +-----------+               3 rejections
                                          |
                                          v
                                 +------------------+
                                 | NO_DRIVER_FOUND  |
                                 +------------------+

                 Every status change
                         |
                         v
                  +-------------+
                  | Event Bus   |
                  +------+------+
                         |
              +----------+----------+
              |                     |
              v                     v
        +-----------+         +-----------+
        | Billing   |         |    Ops    |
        | Consumer  |         | Consumer  |
        +-----------+         +-----------+
```

---

## 📁 Project Structure

```text
ride-dispatch/
│
├── src/
│   ├── server.js
│   │
│   ├── routes/
│   │   └── rideRoutes.js
│   │
│   ├── store/
│   │   └── rideStore.js
│   │
│   ├── queue/
│   │   └── rideQueue.js
│   │
│   ├── worker/
│   │   └── rideWorker.js
│   │
│   └── events/
│       └── eventBus.js
│
├── consumers/
│   ├── billing.js
│   └── ops.js
│
├── scripts/
│   └── test100.js
│
├── package.json
└── README.md
```

---

## 🔧 Technologies Used

- **Node.js** — JavaScript runtime
- **Express.js** — HTTP API framework
- **JavaScript Map** — In-memory ride storage
- **In-memory Array Queue** — Asynchronous ride processing
- **Node.js `child_process.fork()`** — Runs Billing and Ops as separate processes
- **Node.js process IPC** — Sends the same ride-status event to both consumers

No database, frontend, Docker, Redis, or external message broker is required for this assignment.

---

# 🚀 Getting Started

## 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd ride-dispatch
```

## 2. Install dependencies

```bash
npm install
```

## 3. Start the server

```bash
npm start
```

The server starts on:

```text
http://localhost:3000
```

You should see:

```text
Server running on http://localhost:3000
```

The root endpoint can be used as a simple health check:

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

# 🔌 API Endpoints

## 1. Create a Ride

### Request

```http
POST /rides
```

Example:

```text
POST http://localhost:3000/rides
```

No request body is required.

### Response

```json
{
  "rideId": "ride-1"
}
```

The API returns the `rideId` immediately instead of waiting for driver assignment.

### Flow

```text
POST /rides
     |
     +--> Create ride
     |
     +--> Status = REQUESTED
     |
     +--> Publish REQUESTED event
     |
     +--> Add ride to queue
     |
     +--> Return rideId immediately
```

The worker then processes the ride asynchronously.

---

## 2. Get All Rides

### Request

```http
GET /rides
```

Example:

```text
GET http://localhost:3000/rides
```

### Example response

```json
{
  "rides": [
    {
      "rideId": "ride-1",
      "status": "ASSIGNED",
      "assignedDriver": "Driver-2",
      "assignmentHistory": ["Driver-2"],
      "rejectionCount": 1,
      "nextDriverIndex": 2
    }
  ]
}
```

This endpoint is also used by the 100-ride test script to check the processing results.

---

## 3. Health Check

### Request

```http
GET /
```

Example:

```text
GET http://localhost:3000/
```

### Response

```json
{
  "message": "Ride Dispatch API is running"
}
```

---

# 🚕 Driver Assignment Logic

The system uses 10 hardcoded fake drivers:

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

For each ride, the worker offers the ride to drivers sequentially.

The driver's response is simulated randomly:

```javascript
Math.random() < 0.5
```

Approximately:

```text
50% → ACCEPT
50% → REJECT
```

### Acceptance

If a driver accepts:

```text
REQUESTED
    |
    v
ASSIGNED
```

The accepted driver is stored in:

```text
assignedDriver
```

and the driver is added to:

```text
assignmentHistory
```

### Rejection

If a driver rejects:

```text
Driver-1 → REJECT
Driver-2 → REJECT
Driver-3 → ACCEPT
```

The ride becomes:

```text
ASSIGNED
```

with:

```text
assignedDriver = Driver-3
```

### Three rejections

If three drivers reject:

```text
Driver-1 → REJECT
Driver-2 → REJECT
Driver-3 → REJECT
```

the ride becomes:

```text
NO_DRIVER_FOUND
```

---

# 📬 Asynchronous Queue

The API does not perform driver assignment directly.

Instead:

```text
POST /rides
     |
     v
Create ride
     |
     v
Add to queue
     |
     v
Return rideId
```

A separate worker then picks the ride from the queue:

```text
Queue
  |
  v
Worker
  |
  v
Try drivers
  |
  v
Final status
```

This keeps the API response fast and demonstrates asynchronous background processing.

The current implementation uses an in-memory queue because persistence and an external queue service are not required for this assignment.

---

# 📢 Event-Driven Processing

Every time a ride's status changes, an event is published.

The event contains information such as:

```json
{
  "rideId": "ride-1",
  "status": "ASSIGNED",
  "assignedDriver": "Driver-2"
}
```

The main statuses are:

```text
REQUESTED
ASSIGNED
NO_DRIVER_FOUND
```

---

## Multiple Event Consumers

The assignment requires two separate programs to receive the same events.

### Billing

`consumers/billing.js`

Example output:

```text
[BILLING] charging rider for ride ride-1
```

### Operations

`consumers/ops.js`

Example output:

```text
[OPS] ride ride-1 is now in status ASSIGNED
```

The server starts both consumer programs using Node.js `child_process.fork()`.

For each event, the server sends the same event independently to both processes:

```text
                     Event
                       |
              +--------+--------+
              |                 |
              v                 v
           Billing             Ops
```

Therefore, one consumer does not take events away from the other.

Both consumers receive every published event.

---

# 🧪 100-Ride Test

The project includes:

```text
scripts/test100.js
```

Run it with:

```bash
npm run test100
```

The script:

1. Creates 100 rides concurrently.
2. Stores the IDs returned by those requests.
3. Waits for those specific rides to reach a final status.
4. Counts `ASSIGNED` rides.
5. Counts `NO_DRIVER_FOUND` rides.
6. Checks that all 100 rides reached a final status.
7. Checks assignment history for duplicate assignments.
8. Prints the final results.

### Example result

```text
Starting 100-ride test...

Created 100 rides
Progress: 100/100 completed

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

The exact `ASSIGNED` / `NO_DRIVER_FOUND` numbers vary between runs because driver responses are randomized.

The important invariants are:

```text
ASSIGNED + NO_DRIVER_FOUND = 100
Duplicate assignments = 0
Stuck rides = 0
```

---

# 📊 Results

## 100-Ride Test Result

**Latest successful run:**

| Check | Result |
|---|---:|
| Total rides created | 100 |
| ASSIGNED | 87 |
| NO_DRIVER_FOUND | 13 |
| Final rides | 100 |
| Any ride assigned to 2 drivers? | 0 |
| Any ride stuck with no final status? | 0 |

> Note: The `ASSIGNED` and `NO_DRIVER_FOUND` counts are randomized and can differ between runs. The expected invariant is that they always add up to 100.

---

# 📸 Screenshots

Add screenshots from Postman and the terminal here.

### 1. Health Check

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

```text
![Health Check](screenshots/health-check.png)
```

---

### 2. Create Ride — POST /rides

Show the Postman request:

```text
POST http://localhost:3000/rides
```

with the returned `rideId`.

**Screenshot:**

```text
![Create Ride](screenshots/create-ride.png)
```

---

### 3. Get Rides — GET /rides

Show the stored ride and its final status.

**Screenshot:**

```text
![Get Rides](screenshots/get-rides.png)
```

---

### 4. Worker + Event Consumers

Show the terminal output demonstrating:

- Driver rejection/acceptance
- `ASSIGNED` or `NO_DRIVER_FOUND`
- Billing event
- Ops event

**Screenshot:**

```text
![Worker and Consumers](screenshots/worker-events.png)
```

---

### 5. 100-Ride Test

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

```text
![100 Ride Test](screenshots/100-ride-test.png)
```

---

# 🧠 Design Decisions

## Why an in-memory queue?

The assignment focuses on demonstrating asynchronous processing rather than requiring production infrastructure. An in-memory queue keeps the implementation small and easy to run.

## Why `child_process.fork()`?

The assignment requires two separate programs that both receive every event. Node.js `fork()` provides separate Node.js processes while allowing the parent process to communicate with them using IPC.

## Why no database?

The assignment does not require persistence. An in-memory `Map` is sufficient for the scope of the task and keeps the implementation simple.

## Why process rides sequentially?

The task does not require high-throughput parallel workers. A single worker keeps the implementation simple while still demonstrating the required queue/worker architecture.

## Why is driver assignment random?

The assignment explicitly asks for a fake driver response that randomly accepts or rejects the ride at approximately 50%.

---

# ⚠️ Limitations

This is intentionally a simplified assessment implementation.

For a production system, the following could be added:

- Redis/RabbitMQ/Kafka for a durable message queue
- A persistent database
- Multiple worker processes
- Retry and failure handling
- Driver availability tracking
- Distributed locking
- Idempotency keys
- Authentication and authorization
- Structured logging
- Monitoring and metrics
- Graceful process shutdown
- Persistent event storage

These are outside the scope of the current assignment.

---

# ▶️ Useful Commands

Start the API:

```bash
npm start
```

Run the 100-ride test:

```bash
npm run test100
```

Run Billing independently if needed:

```bash
npm run billing
```

Run Ops independently if needed:

```bash
npm run ops
```

---

# 📌 Summary

The project demonstrates a simplified asynchronous ride-dispatch architecture:

```text
Rider
  |
  | POST /rides
  v
Ride API
  |
  v
Queue
  |
  v
Worker
  |
  +---- Driver accepts ----> ASSIGNED
  |
  +---- 3 drivers reject --> NO_DRIVER_FOUND
  |
  v
Event Bus
  |
  +----> Billing
  |
  +----> Operations
```

The implementation was tested with 100 rides and successfully verified:

- 100 rides created
- All 100 rides reached a final status
- No ride was assigned to multiple drivers
- No ride remained stuck without a final status
