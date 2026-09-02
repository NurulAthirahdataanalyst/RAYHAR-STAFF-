const str = '[CUTI_GANTI_DATA: [{"a":1}]]'; 
const match = str.match(/\[CUTI_GANTI_DATA:([\s\S]*?)\]/); 
console.log('Matched:', match[1]); 
try { JSON.parse(match[1]); console.log('Parsed successfully'); } catch(e) { console.log('Error:', e.message); }