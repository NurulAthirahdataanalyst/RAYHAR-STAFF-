with open('src/pages/hr-analytics/WorkforceCalendar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_func = """          const isWeekend = (dateObj, branchId) => {
            const day = dateObj.getDay();
            const dateNum = dateObj.getDate();
            const isFirstWeek = dateNum <= 7;
            
            if (!branchId) return day === 0 || (day === 6 && isFirstWeek);
            
            const branchUpper = String(branchId).toUpperCase();
            const isZoneA = ['AOR', 'KBR', 'TGG', 'DGN', 'KMM', 'CNH', 'KBG', 'JTH', 'RMP', 'MZM', 'TWU', 'BTM', 'KKS', 'MLK', 'SNS', 'JB', 'BTP', 'JHB', 'JOHOR BAHRU', 'BPT', 'BATU PAHAT', 'JB - JOHOR BHARU', 'KOTA BHARU', 'KTG', 'KUALA TERENGGANU', 'ASR', 'ALOR SETAR', 'SPJ', 'SUNGAI PETANI', 'SOUTHERN'].some(b => branchUpper.includes(b));
            
            if (isZoneA) {
              return day === 5 || (day === 6 && isFirstWeek);
            } else {
              return day === 0 || (day === 6 && isFirstWeek);
            }
          };"""

new_func = """          const isWeekend = (dateObj, branchId, zoneObj) => {
            const day = dateObj.getDay();
            const dateNum = dateObj.getDate();
            const isFirstWeek = dateNum <= 7;
            
            let isZoneA = false;
            if (zoneObj === 'ZONE_A' || zoneObj === 'ZONE_B') {
              isZoneA = (zoneObj === 'ZONE_A');
            } else {
              if (!branchId) return day === 0 || (day === 6 && isFirstWeek);
              const branchUpper = String(branchId).toUpperCase();
              isZoneA = ['AOR', 'KBR', 'TGG', 'DGN', 'KMM', 'CNH', 'KBG', 'JTH', 'RMP', 'MZM', 'TWU', 'BTM', 'KKS', 'MLK', 'SNS', 'JB', 'BTP', 'JHB', 'JOHOR BAHRU', 'BPT', 'BATU PAHAT', 'JB - JOHOR BHARU', 'KOTA BHARU', 'KTG', 'KUALA TERENGGANU', 'ASR', 'ALOR SETAR', 'SPJ', 'SUNGAI PETANI', 'SOUTHERN'].some(b => branchUpper.includes(b));
            }
            
            if (isZoneA) {
              return day === 5 || (day === 6 && isFirstWeek);
            } else {
              return day === 0 || (day === 6 && isFirstWeek);
            }
          };"""
content = content.replace(old_func, new_func)

old_filter1 = "const absent = rawAbsent.filter(a => !isWeekend(selectedDay, a.branch));"
new_filter1 = "const absent = rawAbsent.filter(a => !isWeekend(selectedDay, a.branch, a.zone));"
content = content.replace(old_filter1, new_filter1)

old_filter2 = "const restDays = rawAbsent.filter(a => isWeekend(selectedDay, a.branch));"
new_filter2 = "const restDays = rawAbsent.filter(a => isWeekend(selectedDay, a.branch, a.zone));"
content = content.replace(old_filter2, new_filter2)

with open('src/pages/hr-analytics/WorkforceCalendar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)