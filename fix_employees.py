import re

with open('src/pages/Employees.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

new_back_div = """        <div className="mb-2 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="mb-1 gap-2 px-0 text-foreground hover:bg-transparent hover:text-[#7B0099] transition-colors touch-target no-global-hover"
            onClick={() => navigate("/master")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Back to Employee Management
            </span>
          </Button>

          {["hr_admin", "managing_director", "operation_manager", "finance_manager"].includes(role) ? (
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="h-9 px-6 rounded-xl bg-[#7B0099] text-white hover:bg-[#7B0099]/95 font-black text-[9px] uppercase tracking-wider shadow-lg shadow-[#7B0099]/15 transition-all whitespace-nowrap touch-target flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4 w-full sm:w-auto">
              <ExportDropdown onExportCSV={handleExportCSV} />
            </div>
          )}
        </div>"""

text = re.sub(r'        <div className="mb-2">\n\s*<Button\n\s*variant="ghost".*?Back to Employee Management\n\s*</span>\n\s*</Button>\n\s*</div>', new_back_div, text, flags=re.DOTALL)
text = re.sub(r'\s*\{portalTarget && createPortal\(.*?\s*portalTarget\s*\)\s*\}', '', text, flags=re.DOTALL)

if 'Plus' not in text.split('lucide-react')[0]:
    text = text.replace('ArrowLeft,', 'ArrowLeft, Plus,')

with open('src/pages/Employees.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
