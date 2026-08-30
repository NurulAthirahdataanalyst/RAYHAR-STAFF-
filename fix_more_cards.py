import codecs

files_to_fix = [
    'src/pages/LeaveAdmin.tsx',
    'src/pages/LeaveManagement.tsx',
    'src/pages/outstation/OutstationAssignment.tsx',
    'src/pages/CompanyLeaveCalendar.tsx',
    'src/pages/outstation/MyOutstationCalendar.tsx'
]

standard_card = "border border-slate-100 dark:border-slate-700 bg-white dark:bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[24px]"

for file_path in files_to_fix:
    try:
        with codecs.open(file_path, 'r', 'utf-8') as f:
            content = f.read()
            
        original_content = content
        
        # 1. LeaveAdmin.tsx specific
        if 'LeaveAdmin.tsx' in file_path:
            # The 4 top stats
            content = content.replace(
                "className={g-card border border-gray-200 dark:border-slate-800/80 shadow-sm border-l-4  rounded-lg overflow-hidden flex relative h-[100px] hover:shadow-md transition-shadow}",
                "className={g-card border border-gray-200 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[24px] border-l-4  overflow-hidden flex relative h-[100px] hover:shadow-md transition-shadow}"
            )
            # Table container
            content = content.replace(
                "className=\"bg-card border border-border shadow-sm rounded-lg overflow-hidden\"",
                "className=\"bg-card border border-slate-100 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[24px] overflow-hidden\""
            )
            content = content.replace(
                "className=\"border-border shadow-sm overflow-hidden bg-card/60 backdrop-blur-md min-h-[400px]\"",
                "className=\"border border-slate-100 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[24px] overflow-hidden bg-card/60 backdrop-blur-md min-h-[400px]\""
            )

        # 2. LeaveManagement.tsx specific
        if 'LeaveManagement.tsx' in file_path:
            # Leave Balance Cards
            content = content.replace(
                "className={g-card border border-border shadow-sm rounded-lg overflow-hidden border-l-4 flex flex-col justify-between  min-h-[160px] transform transition-all duration-300 hover:shadow-md}",
                "className={g-card border border-slate-100 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[24px] overflow-hidden border-l-4 flex flex-col justify-between  min-h-[160px] transform transition-all duration-300 hover:shadow-md}"
            )
            # Table container
            content = content.replace(
                "className=\"bg-card border border-border shadow-sm rounded-lg overflow-hidden flex flex-col\"",
                "className=\"bg-card border border-slate-100 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[24px] overflow-hidden flex flex-col\""
            )

        # 3. OutstationAssignment.tsx specific
        if 'OutstationAssignment.tsx' in file_path:
            content = content.replace(
                "className=\"bg-card border border-border shadow-sm rounded-lg overflow-hidden mb-6 flex flex-col\"",
                "className=\"bg-card border border-slate-100 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[24px] overflow-hidden mb-6 flex flex-col\""
            )

        # 4. CompanyLeaveCalendar.tsx specific
        if 'CompanyLeaveCalendar.tsx' in file_path:
            content = content.replace(
                "className=\"bg-card border border-border shadow-sm rounded-lg overflow-hidden\"",
                "className=\"bg-card border border-slate-100 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[24px] overflow-hidden\""
            )
            
        # 5. MyOutstationCalendar.tsx specific
        if 'MyOutstationCalendar.tsx' in file_path:
            content = content.replace(
                "className=\"bg-card border border-border shadow-sm rounded-lg p-6 mb-6\"",
                "className=\"bg-card border border-slate-100 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[24px] p-6 mb-6\""
            )
            content = content.replace(
                "className=\"bg-card border border-border shadow-sm rounded-lg p-4 sm:p-6 mb-6 overflow-hidden\"",
                "className=\"bg-card border border-slate-100 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[24px] p-4 sm:p-6 mb-6 overflow-hidden\""
            )
            content = content.replace(
                "className=\"bg-card border border-border shadow-sm rounded-lg overflow-hidden mb-6 flex flex-col\"",
                "className=\"bg-card border border-slate-100 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-[24px] overflow-hidden mb-6 flex flex-col\""
            )

        if content != original_content:
            with codecs.open(file_path, 'w', 'utf-8') as f:
                f.write(content)
            print(f"Updated {file_path}")
        else:
            print(f"No changes in {file_path} (maybe already updated or class didn't match)")
            
    except FileNotFoundError:
        print(f"File not found: {file_path}")

