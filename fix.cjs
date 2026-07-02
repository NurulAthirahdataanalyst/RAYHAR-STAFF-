const fs = require('fs');
let content = fs.readFileSync('c:/Users/HP/ATTENDANCE_SYSTEM/backend/server.js', 'utf8');

content = content.replace(
    /if \(role === 'branch_leader' && branch && branch !== "All"\) \{/g,
    'if (role === \'branch_leader\') {\n      const safeBranch = (branch && branch !== "All") ? branch : "INVALID_BYPASS";\n      branch = safeBranch;'
);

content = content.replace(
    /\} else if \(role === 'head_of_department' && department && department !== "All"\) \{/g,
    '} else if (role === \'head_of_department\') {\n      const safeDept = (department && department !== "All") ? department : "INVALID_BYPASS";\n      department = safeDept;'
);

fs.writeFileSync('c:/Users/HP/ATTENDANCE_SYSTEM/backend/server.js', content, 'utf8');
console.log('Done JS replacement!');
