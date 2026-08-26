const fs = require('fs');
let code = fs.readFileSync('src/components/leave/ApprovalStatusTracker.tsx', 'utf-8');

// 1. Add variant prop to interface
code = code.replace(
  'interface ApprovalStatusTrackerProps {',
  'interface ApprovalStatusTrackerProps {\n  variant?: \'staggered\' | \'linear\';'
);

// 2. Extract variant from props
code = code.replace(
  'export const ApprovalStatusTracker = ({ approvalHistory, status, approverRole, branch }: ApprovalStatusTrackerProps) => {',
  'export const ApprovalStatusTracker = ({ approvalHistory, status, approverRole, branch, variant = \'linear\' }: ApprovalStatusTrackerProps) => {\n  const isStaggered = variant === \'staggered\';'
);

// 3. Update timeline container wrapper
code = code.replace(
  '<div className="relative space-y-8 before:absolute before:inset-0 before:ml-3 md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent mt-4">',
  '<div className={`relative space-y-8 before:absolute before:inset-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent mt-4 ${isStaggered ? "before:ml-3 md:before:mx-auto md:before:translate-x-0" : "before:ml-[11px]"}`}>'
);

// 4. Update the item div container
code = code.replace(
  '<div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">',
  '<div key={idx} className={`relative flex items-center group is-active ${isStaggered ? "justify-between md:justify-normal md:odd:flex-row-reverse" : "justify-start"}`}>'
);

// 5. Update icon class
code = code.replace(
  'const getIconClass = (borderClass: string, extraClass: string) => isStaggered',
  'const getIconClass = (borderClass: string, extraClass: string) => isStaggered' // unchanged
);
// Wait, I can just replace the definition of getIconClass completely!
code = code.replace(
  /const getIconClass = \([\s\S]*?;\s*/,
  `const getIconClass = (borderClass: string, extraClass: string) => isStaggered
    ? \`flex items-center justify-center w-6 h-6 rounded-full border-[3px] bg-white dark:bg-slate-900 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 \${borderClass} \${extraClass}\`
    : \`absolute -left-[13px] top-2 w-6 h-6 rounded-full border-[3px] bg-white dark:bg-slate-900 shadow z-10 flex items-center justify-center \${borderClass} \${extraClass}\`;\n`
);

// 6. Update card container
code = code.replace(
  /const getCardClass = \(\) => isStaggered[\s\S]*?;/,
  `const getCardClass = () => isStaggered 
    ? "w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-800"
    : "p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-800 ml-8 w-full";`
);

// 7. Update MD to Managing Director
code = code.replace(
  'const steps = isHQ ? ["Submit", "HOD", "Operation Manager"] : ["Submit", "Branch Leader", "MD"];',
  'const steps = isHQ ? ["Submit", "HOD", "Operation Manager"] : ["Submit", "Branch Leader", "Managing Director"];'
);

fs.writeFileSync('src/components/leave/ApprovalStatusTracker.tsx', code);
console.log("Node script done!");
