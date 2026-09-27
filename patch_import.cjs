const fs = require('fs');
const file = 'c:/Users/HP/ATTENDANCE_SYSTEM/src/pages/LeaveAnalytics.tsx';
let content = fs.readFileSync(file, 'utf8');

const importStr = 'import { Badge } from "@/components/ui/badge";\r\nimport { Tooltip as RadixTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";\r\nimport { Button } from "@/components/ui/button";';

content = content.replace(/import { Badge } from "@\/components\/ui\/badge";\r?\nimport { Button } from "@\/components\/ui\/button";/, importStr);

fs.writeFileSync(file, content);
console.log("Done import patch");
