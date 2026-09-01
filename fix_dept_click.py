with open('src/pages/master/Department.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('onClick={() => setIsAddModalOpen(true)}', 'onClick={() => navigate("/settings?tab=department")}')

with open('src/pages/master/Department.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
