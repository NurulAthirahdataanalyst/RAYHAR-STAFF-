const fs = require('fs');
const content = fs.readFileSync('backend/server.js', 'utf8');

const regex1 = /if \(cl\.applies_to === 'All'\) onCL = true;\s*else if \(cl\.applies_to === 'Specific Branch' && emp\.branch === cl\.branch_code\) onCL = true;\s*else if \(cl\.applies_to === 'Specific Department' && emp\.department === cl\.department\) onCL = true;/g;

const replacement1 = `if (cl.applies_to === 'All' || cl.applies_to === 'all') onCL = true;
        else if ((cl.applies_to === 'Specific Branch' || cl.applies_to === 'branch') && cl.branch_id && cl.branch_id.split(',').includes(emp.branch)) onCL = true;
        else if ((cl.applies_to === 'Specific Department' || cl.applies_to === 'department') && cl.department_id && cl.department_id.split(',').includes(emp.department)) onCL = true;`;

const newContent = content.replace(regex1, replacement1);

if (newContent !== content) {
    fs.writeFileSync('backend/server.js', newContent, 'utf8');
    console.log('Successfully fixed applies_to logic in backend/server.js');
} else {
    console.log('Failed to replace applies_to logic!');
}
