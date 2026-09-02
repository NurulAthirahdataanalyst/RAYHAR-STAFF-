with open('src/pages/hr-analytics/WorkforceCalendar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_code = "const isZoneA = ['JHB', 'JOHOR BAHRU', 'BPT', 'BATU PAHAT', 'JB - JOHOR BHARU', 'JB', 'KBR', 'KOTA BHARU', 'KTG', 'KUALA TERENGGANU', 'ASR', 'ALOR SETAR', 'SPJ', 'SUNGAI PETANI', 'SOUTHERN'].some(b => branchUpper.includes(b));"

new_code = "const isZoneA = ['AOR', 'KBR', 'TGG', 'DGN', 'KMM', 'CNH', 'KBG', 'JTH', 'RMP', 'MZM', 'TWU', 'BTM', 'KKS', 'MLK', 'SNS', 'JB', 'BTP', 'JHB', 'JOHOR BAHRU', 'BPT', 'BATU PAHAT', 'JB - JOHOR BHARU', 'KOTA BHARU', 'KTG', 'KUALA TERENGGANU', 'ASR', 'ALOR SETAR', 'SPJ', 'SUNGAI PETANI', 'SOUTHERN'].some(b => branchUpper.includes(b));"

content = content.replace(old_code, new_code)

with open('src/pages/hr-analytics/WorkforceCalendar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)