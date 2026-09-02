async function test() {
  const res = await fetch('http://localhost:5000/api/workforce/live-feed?role=hr_admin&date=2026-09-02');
  const reader = res.body.getReader();
  const { value, done } = await reader.read();
  const chunk = new TextDecoder().decode(value);
  console.log("CHUNK 1:", chunk);
  
  const { value: v2, done: d2 } = await reader.read();
  if (v2) console.log("CHUNK 2:", new TextDecoder().decode(v2).substring(0, 1000));
  
  process.exit(0);
}
test();
