import re

with open('src/pages/hr-analytics/WorkforceCalendar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_is_weekend = """          const isWeekend = (dateObj, branchId) => {
            if (!branchId) return dateObj.getDay() === 0 || dateObj.getDay() === 6;
            const branchUpper = String(branchId).toUpperCase();
            const isFriSat = ['JHB', 'JOHOR BAHRU', 'BPT', 'BATU PAHAT', 'JB - JOHOR BHARU', 'JB', 'KBR', 'KOTA BHARU', 'KTG', 'KUALA TERENGGANU', 'ASR', 'ALOR SETAR', 'SPJ', 'SUNGAI PETANI', 'SOUTHERN'].some(b => branchUpper.includes(b));
            const day = dateObj.getDay();
            return isFriSat ? (day === 5 || day === 6) : (day === 0 || day === 6);
          };"""

new_is_weekend = """          const isWeekend = (dateObj, branchId) => {
            const day = dateObj.getDay();
            const dateNum = dateObj.getDate();
            const isFirstWeek = dateNum <= 7;
            
            if (!branchId) return day === 0 || (day === 6 && isFirstWeek);
            
            const branchUpper = String(branchId).toUpperCase();
            const isZoneA = ['JHB', 'JOHOR BAHRU', 'BPT', 'BATU PAHAT', 'JB - JOHOR BHARU', 'JB', 'KBR', 'KOTA BHARU', 'KTG', 'KUALA TERENGGANU', 'ASR', 'ALOR SETAR', 'SPJ', 'SUNGAI PETANI', 'SOUTHERN'].some(b => branchUpper.includes(b));
            
            if (isZoneA) {
              return day === 5 || (day === 6 && isFirstWeek);
            } else {
              return day === 0 || (day === 6 && isFirstWeek);
            }
          };"""

if old_is_weekend in content:
    content = content.replace(old_is_weekend, new_is_weekend)
    with open('src/pages/hr-analytics/WorkforceCalendar.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed isWeekend logic in WorkforceCalendar.tsx")
else:
    print("Could not find old_is_weekend. Try regex.")
