GPS Feature - Local Test Instructions

1) Start backend server (example):

```powershell
# from repository root
node backend/server.js
# or if using npm script
npm run start
```

2) Run SSE test script (requires node dependencies `eventsource` and `node-fetch`):

```powershell
cd scripts
npm install eventsource node-fetch@2
node test_sse.js
```

3) Open the app in browser and visit `/gps-location-tracker` to view live map and alerts.

Notes:
- `test_sse.js` posts synthetic `employee-location-update` events every 5 seconds for `test-user` and logs SSE messages received from `/api/employee-locations/stream`.
- Alerts are persisted to the `alerts` table (created automatically on first save) and available via `GET /api/alerts` or `GET /api/alerts/stream` SSE.
