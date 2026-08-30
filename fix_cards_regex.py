import codecs
import re

standard = "border border-slate-100 dark:border-slate-700 bg-white dark:bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[24px]"

files = [
    'src/pages/LeaveAdmin.tsx',
    'src/pages/LeaveManagement.tsx',
    'src/pages/outstation/OutstationAssignment.tsx',
    'src/pages/CompanyLeaveCalendar.tsx',
    'src/pages/outstation/MyOutstation.tsx'
]

for file_path in files:
    try:
        with codecs.open(file_path, 'r', 'utf-8') as f:
            content = f.read()
        
        orig = content

        if 'LeaveAdmin.tsx' in file_path:
            content = re.sub(
                r'className=\{g-card border border-gray-200 dark:border-slate-800/80 shadow-sm border-l-4 \$\{stat\.bg\.replace\(\'bg-\', \'border-l-\'\)\} rounded-lg (.*?)\}',
                r'className={' + standard + r' border-l-4  \1}',
                content
            )
            content = re.sub(
                r'className="border border-border/60 shadow-sm bg-card rounded-lg (.*?)"',
                r'className="' + standard + r' \1"',
                content
            )
            
        if 'LeaveManagement.tsx' in file_path:
            content = re.sub(
                r'className=\{g-card border border-border shadow-sm rounded-lg overflow-hidden border-l-4 flex flex-col justify-between \$\{card\.borderColor\} min-h-\[160px\] transform transition-all duration-300 hover:shadow-md\}',
                r'className={' + standard + r' overflow-hidden border-l-4 flex flex-col justify-between  min-h-[160px] transform transition-all duration-300 hover:shadow-lg}',
                content
            )
            content = re.sub(
                r'className="bg-card border border-border shadow-sm rounded-lg overflow-hidden flex flex-col"',
                r'className="' + standard + r' overflow-hidden flex flex-col"',
                content
            )

        if 'OutstationAssignment.tsx' in file_path:
            content = re.sub(
                r'className="bg-card border border-border shadow-sm rounded-lg overflow-hidden mb-6 flex flex-col"',
                r'className="' + standard + r' overflow-hidden mb-6 flex flex-col"',
                content
            )

        if 'CompanyLeaveCalendar.tsx' in file_path:
            content = re.sub(
                r'className="bg-card border border-border shadow-sm rounded-lg overflow-hidden"',
                r'className="' + standard + r' overflow-hidden"',
                content
            )
            
        if 'MyOutstation.tsx' in file_path:
            content = re.sub(
                r'className="bg-card border border-border shadow-sm rounded-lg p-6 mb-6"',
                r'className="' + standard + r' p-6 mb-6"',
                content
            )
            content = re.sub(
                r'className="bg-card border border-border shadow-sm rounded-lg p-4 sm:p-6 mb-6 overflow-hidden"',
                r'className="' + standard + r' p-4 sm:p-6 mb-6 overflow-hidden"',
                content
            )
            content = re.sub(
                r'className="bg-card border border-border shadow-sm rounded-lg overflow-hidden mb-6 flex flex-col"',
                r'className="' + standard + r' overflow-hidden mb-6 flex flex-col"',
                content
            )

        if content != orig:
            with codecs.open(file_path, 'w', 'utf-8') as f:
                f.write(content)
            print(f"Updated {file_path}")
        else:
            print(f"No changes in {file_path}")

    except Exception as e:
        print(f"Error processing {file_path}: {e}")

