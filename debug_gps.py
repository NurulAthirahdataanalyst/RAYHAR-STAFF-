with open('src/pages/GPSLocationTracker.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find where the main content ends (after the employee table)
# We need to replace from line 608 onwards (0-indexed: 607)
# Structure we need at the end:
#   </div>  -- closes inner div (table section)
#   </div>  -- closes space-y-4 outer div
#   {historyFor && ( ... modal ... )}
#   </>     -- closes fragment
# );
# }

# Find the line index where '      </div>' for space-y-4 closing should be
# Looking at the current end structure from line 607 (1-indexed 608):

# Let's just truncate and append the correct ending

# Find index of line 607 (0-indexed) which is the closing of the inner employee list div
# Line 607 = 0-indexed 606 = '          </div>'
# Line 608 = 0-indexed 607 = '        </div>'

# Let's find the last closing of the employee table area
target_idx = None
for i, line in enumerate(lines):
    if i >= 600 and i <= 615:
        print(f"{i+1}: {line.rstrip()}")

