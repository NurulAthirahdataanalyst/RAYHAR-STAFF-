with open('src/pages/master/Role.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_block = """        <div className="mb-2">
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
        </div>

      {/* Action Buttons Portaled to Header */}
      {document.getElementById("page-header-actions") &&
        createPortal(
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
            <ExportDropdown 
              onExportCSV={() => exportToCSV(roles, 'Roles_List')} 
              onExportPDF={() => window.print()} 
            />
            <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 bg-[#7B0099] hover:bg-[#60007A] text-white shadow-sm">
              <Plus className="w-4 h-4" />
              Add Roles
            </Button>
          </div>,
          document.getElementById("page-header-actions")!
        )}"""

new_block = """        <div className="mb-2 flex items-center justify-between">
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

if old_block in text:
    text = text.replace(old_block, new_block)
else:
    print("Block not found!")

with open('src/pages/master/Role.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
