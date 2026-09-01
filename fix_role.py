with open('src/pages/master/Role.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

btn_code = """<Button 
              onClick={() => setIsAddModalOpen(true)} 
              className="h-9 px-6 rounded-xl bg-[#7B0099] text-white hover:bg-[#7B0099]/95 font-black text-[9px] uppercase tracking-wider shadow-lg shadow-[#7B0099]/15 transition-all touch-target whitespace-nowrap flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Roles
            </Button>"""

new_btn_code = """{role === "hr_admin" && ( <Button 
              onClick={() => setIsAddModalOpen(true)} 
              className="h-9 px-6 rounded-xl bg-[#7B0099] text-white hover:bg-[#7B0099]/95 font-black text-[9px] uppercase tracking-wider shadow-lg shadow-[#7B0099]/15 transition-all touch-target whitespace-nowrap flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Roles
            </Button> )}"""

content = content.replace(btn_code, new_btn_code)

with open('src/pages/master/Role.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
