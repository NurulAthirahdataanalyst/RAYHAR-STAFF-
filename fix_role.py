import re

with open('src/pages/master/Role.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

new_back_div = """        <div className="mb-2 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="mb-1 gap-2 px-0 text-foreground hover:bg-transparent hover:text-[#7B0099] transition-colors touch-target"
            onClick={() => navigate("/master")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Back to Employee Management
            </span>
          </Button>

          <div className="flex items-center gap-3">
            <ExportDropdown 
              onExportCSV={() => exportToCSV(roles, 'Roles_List')} 
              onExportPDF={() => window.print()} 
            />
            <Button 
              onClick={() => setIsAddModalOpen(true)} 
              className="h-9 px-6 rounded-xl bg-[#7B0099] text-white hover:bg-[#7B0099]/95 font-black text-[9px] uppercase tracking-wider shadow-lg shadow-[#7B0099]/15 transition-all touch-target whitespace-nowrap flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Roles
            </Button>
          </div>
        </div>"""

text = re.sub(r'        <div className="mb-2">\n\s*<Button\n\s*variant="ghost".*?Back to Employee Management\n\s*</span>\n\s*</Button>\n\s*</div>', new_back_div, text, flags=re.DOTALL)
text = re.sub(r'\s*\{/\* Action Buttons Portaled to Header \*/\}\s*\{document.getElementById.*?\)\s*\}', '', text, flags=re.DOTALL)

with open('src/pages/master/Role.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
