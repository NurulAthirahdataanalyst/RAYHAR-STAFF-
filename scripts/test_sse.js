// Simple test script to connect to employee-locations SSE and log events
const EventSource = require('eventsource');
const fetch = require('node-fetch');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

console.log('Connecting to SSE:', `${API_BASE}/api/employee-locations/stream`);
const es = new EventSource(`${API_BASE}/api/employee-locations/stream`);
es.onmessage = (ev) => {
  console.log('[SSE]', ev.data);
};
es.onerror = (err) => {
  console.error('[SSE ERROR]', err);
};

// small updater: POST a simulated location every 5 seconds
setInterval(async () => {
  const payload = {
    user_id: 'test-user',
    latitude: 3.1390 + (Math.random()-0.5)/100,
    longitude: 101.6869 + (Math.random()-0.5)/100,
    accuracy: 10 + Math.floor(Math.random()*20)
  };
  try {
    const res = await fetch(`${API_BASE}/api/employee-location-update`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const j = await res.json();
    console.log('Posted location update:', j);
  } catch (e) {
    console.error('Post error', e.message || e);
  }
}, 5000);
