const fs = require('fs');
let text = fs.readFileSync('backend/server.js', 'utf8');
text = text.replace('        p.branch AS permanent_branch,\n        temp_ewa.temp_branch AS temp_branch,', '        p.branch AS permanent_branch,\n        p.created_at,\n        p.updated_at,\n        temp_ewa.temp_branch AS temp_branch,');
text = text.replace('\"UPDATE profiles SET status = ? WHERE user_id = ?\"', '\"UPDATE profiles SET status = ?, updated_at = NOW() WHERE user_id = ?\"');
fs.writeFileSync('backend/server.js', text);
