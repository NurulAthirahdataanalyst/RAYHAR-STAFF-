GPS Feature — Implementation & Test Guide

This document explains how the GPS tracker, SSE streams, history replay, outstation arrival checks, and persistent alerts were implemented and how to run and test them locally.

Overview
- Backend: Express endpoints added in `backend/server.js`
	- `GET /api/employee-locations` — aggregated latest locations (per employee, today's clock-in)
	- `GET /api/employee-locations/stream` — SSE stream that pushes full location snapshots periodically and receives presence events
	- `POST /api/employee-location-update` — employee-side location update (stores to `employee_location_logs` and updates `attendances` when applicable)
	- `GET /api/employee-location-history?userId=<id>&days=14` — returns recent location logs
	- `POST /api/outstation/check-arrival` — checks active outstation assignment distance/arrival
	- `GET /api/alerts` — list recent alerts (persisted events)
	- `GET /api/alerts/stream` — SSE stream for admin alerts

- Frontend changes (key files)
	- `src/pages/GPSLocationTracker.tsx` — consumes `employee-locations` SSE, updates map instantly, shows floating admin alerts, provides History modal with map replay and playback controls
	- `src/pages/Attendance.tsx` — adds `Update Location` behavior that posts to `POST /api/employee-location-update` and triggers outstation arrival check
	- `src/components/UpdateLocationButton.tsx` — reusable button for employees to send current GPS coordinates

Database migrations / schema notes
- Tables used or created automatically by backend when missing:
	- `employee_location_logs` (id, user_id, latitude, longitude, accuracy, recorded_at)
	- `alerts` (id, type, user_id, payload JSON, created_at)

If you prefer to create migrations explicitly, run these SQL snippets (MySQL syntax):

```sql
CREATE TABLE IF NOT EXISTS employee_location_logs (
	id INT AUTO_INCREMENT PRIMARY KEY,
	user_id VARCHAR(64),
	latitude DOUBLE,
	longitude DOUBLE,
	accuracy DOUBLE,
	recorded_at DATETIME
);

CREATE TABLE IF NOT EXISTS alerts (
	id INT AUTO_INCREMENT PRIMARY KEY,
	type VARCHAR(128),
	user_id VARCHAR(64),
	payload JSON,
	created_at DATETIME
);
```

How it works (flow)
- Employee updates location:
	1. Employee clicks `Update Location` (or clock-in/clock-out triggers location capture).
	2. Frontend posts to `POST /api/employee-location-update` with `{ user_id, latitude, longitude, accuracy, timestamp }`.
	3. Backend inserts into `employee_location_logs`. If a today's attendance record exists, it updates `attendances.clock_in_*` fields.
	4. Backend computes any active outstation assignment and distance; if relevant it broadcasts an `outstation-arrival` (or `location-update`) payload through `broadcastPresenceUpdate`.
	5. Broadcast publishes snapshots to SSE clients and persists alerts to the `alerts` table.

- Tracker (admin) consumption:
	1. `GPSLocationTracker` subscribes to `GET /api/employee-locations/stream` SSE.
	2. Server sends an initial snapshot and periodic snapshots; it also forwards event payloads (arrivals, updates).
	3. Frontend updates markers immediately on snapshot events and pushes admin alerts when arrival/breach events are received.

Testing locally
1) Start backend

```powershell
# from repository root
node backend/server.js
# or use your project's npm script (if available)
npm run start
```

2) Run the SSE test script (it posts a simulated `test-user` location every 5s and logs SSE messages)

```powershell
cd scripts
npm install eventsource node-fetch@2
node test_sse.js
```

3) Open the app and visit the GPS page

- Start the front end (Vite) normally and open `http://localhost:5173/gps-location-tracker` (adjust port if different).
- You should see markers update as `test_sse.js` posts updates. Arrival/breach alerts will appear in the floating alerts panel and also be persisted to the `alerts` table.

APIs reference (quick)
- GET /api/employee-locations
	- returns: { success: true, locations: [ { user_id, full_name, branch, latitude, longitude, accuracy, last_updated } ] }

- GET /api/employee-locations/stream
	- SSE stream that sends `{ type: 'employee-locations', timestamp, locations: [...] }` periodically and also forwards event payloads like `{ type: 'outstation-arrival', userId, arrived, distance_m, radius_m }`.

- POST /api/employee-location-update
	- body: { user_id, latitude, longitude, accuracy, timestamp }
	- stores location log, updates today's attendance if present, computes outstation arrival and broadcasts presence/alerts.

- GET /api/employee-location-history?userId=<id>&days=14
	- returns: { success: true, history: [ { lat, lng, accuracy, timestamp } ] }

- POST /api/outstation/check-arrival
	- body: { user_id, latitude, longitude }
	- returns: { success: true, arrived: boolean, distance_m, radius_m, assignment }

- GET /api/alerts
	- list persisted alerts

- GET /api/alerts/stream
	- SSE stream of persisted alerts as they are saved

Security & deployment notes
- Restrict access to SSE endpoints and alerts listing to authorized HR/admin roles in production. Add authentication checks to the SSE handlers (e.g., verify session or token before pushing the connection into `alertsClients` or `employeeLocationsClients`).
- Consider WebSocket for bidirectional, authenticated streams with better backpressure control if you expect heavy load.
- Add rate-limiting or deduplication for frequent location updates (clients sending many updates/second) to reduce DB writes and SSE noise.

Performance
- The SSE design sends a periodic snapshot plus events. For large orgs (hundreds of employees) prefer pushing deltas or using a message broker (Redis pub/sub) to scale broadcast efficiently.

Next steps (suggestions)
- Add role-restricted admin UI section wired to `GET /api/alerts/stream` to show persistent alerts and allow acknowledging them.
- Add notification delivery (email/Slack/push) for critical alerts.
- Add interpolation/smoothing for marker movement in the frontend replay.

If you'd like, I can add the admin alerts UI and RBAC wiring next. 
