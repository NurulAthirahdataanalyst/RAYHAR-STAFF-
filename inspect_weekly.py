with open('backend/server.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_block = False
for line in lines:
    if "Build Weekly Attendance Trend (CURRENT WEEK ONLY)" in line:
        in_block = True
    if in_block:
        print(line, end="")
    if in_block and "const weeklyAttendanceTrend" in line:
        break