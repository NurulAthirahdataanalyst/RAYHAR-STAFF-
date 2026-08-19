import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Branch Workforce Distribution
    content = re.sub(
        r'<div className="flex flex-col gap-1">\s*<div className="flex items-center gap-2">\s*<MapPin[^>]*/>\s*<CardTitle[^>]*>Branch Workforce Distribution</CardTitle>\s*</div>\s*<p[^>]*>.*?</p>\s*</div>',
        r'<CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">Branch Workforce Distribution</CardTitle>',
        content,
        flags=re.DOTALL
    )

    # 2. Temporary Branch Assignment
    content = re.sub(
        r'<div className="flex flex-col gap-1">\s*<div className="flex items-center gap-2">\s*<Briefcase[^>]*/>\s*<CardTitle[^>]*>Temporary Branch Assignment</CardTitle>\s*</div>\s*<p[^>]*>.*?</p>\s*</div>',
        r'<CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">Temporary Branch Assignment</CardTitle>',
        content,
        flags=re.DOTALL
    )

    # 3. Attendance Overview
    content = re.sub(
        r'<div className="flex flex-col gap-1">\s*<div className="flex items-center gap-2">\s*<Clock[^>]*/>\s*<CardTitle[^>]*>Attendance Overview</CardTitle>\s*</div>\s*<p[^>]*>.*?</p>\s*</div>',
        r'<CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">Attendance Overview</CardTitle>',
        content,
        flags=re.DOTALL
    )

    # 4. Attendance Trend
    content = re.sub(
        r'<CardHeader[^>]*>\s*<div className="flex justify-between items-center w-full mb-2">\s*<CardTitle[^>]*>Attendance Trend</CardTitle>\s*<div[^>]*>.*?</div>\s*</div>\s*</CardHeader>',
        r'<CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 pb-4">\n  <div className="flex justify-between items-center w-full">\n    <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">Attendance Trend</CardTitle>\n    \g<1>\n  </div>\n</CardHeader>',
        content,
        flags=re.DOTALL
    )
    # Wait, the Attendance Trend capture group 1 needs to be captured.
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# We will refine this.
