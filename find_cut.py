with open('src/pages/GPSLocationTracker.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the line where the employee table ends (after </Table> closing the employee list)
# We'll cut after line 606 (</Table>) and replace everything after

# Find the exact position of the table closing that belongs to the employee list
# The employee table ends with </Table> followed by </div></div></div>

marker = "            </Table>\r\n          </div>\r\n        </div>\r\n      </div>\r\n"
if marker not in content:
    marker = "            </Table>\n          </div>\n        </div>\n      </div>\n"

if marker not in content:
    print("Marker not found! Searching...")
    idx = content.find("</TableBody>\r\n              </Table>")
    print(f"TableBody close at index: {idx}")
else:
    cut_point = content.find(marker) + len(marker)
    before = content[:cut_point]
    print(f"Cut point found at char {cut_point}")
    print(f"Last 200 chars before cut: {repr(before[-200:])}")
