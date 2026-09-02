const fs = require('fs');
let content = fs.readFileSync('src/components/shared/MonthPicker.tsx', 'utf8');

content = content.replace(
  '  className?: string;\n}',
  '  className?: string;\n  hideAllYear?: boolean;\n}'
);

content = content.replace(
  'export function MonthPicker({ monthYear, onSelectMonthYear, className }: MonthPickerProps) {',
  'export function MonthPicker({ monthYear, onSelectMonthYear, className, hideAllYear }: MonthPickerProps) {'
);

content = content.replace(
  '<button\n                type="button"\n                onClick={() => {\n                  onSelectMonthYear(${viewYear}-all); // clear\n                  // setOpen(false);\n                }}\n                className="text-[#942392] hover:underline text-[11px] font-bold"\n              >\n                All year\n              </button>',
  '{!hideAllYear && (\n              <button\n                type="button"\n                onClick={() => {\n                  onSelectMonthYear(${viewYear}-all); // clear\n                  // setOpen(false);\n                }}\n                className="text-[#942392] hover:underline text-[11px] font-bold"\n              >\n                All year\n              </button>\n              )}'
);

// Fallback if the whitespace differs slightly:
content = content.replace(
  /<\s*button[^>]*>\s*All year\s*<\/button>/i,
  '{!hideAllYear && ($&)}'
);

fs.writeFileSync('src/components/shared/MonthPicker.tsx', content);
console.log('done modifying MonthPicker');