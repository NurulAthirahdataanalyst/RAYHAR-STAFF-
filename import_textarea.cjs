const fs = require('fs');
let content = fs.readFileSync('src/pages/TemporaryAssignments.tsx', 'utf8');

content = content.replace(
  'import { Input } from "@/components/ui/input";',
  'import { Input } from "@/components/ui/input";\nimport { Textarea } from "@/components/ui/textarea";'
);

fs.writeFileSync('src/pages/TemporaryAssignments.tsx', content);