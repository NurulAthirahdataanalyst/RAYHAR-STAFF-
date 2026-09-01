import codecs
import re

with codecs.open('src/pages/outstation/OutstationAssignment.tsx', 'r', 'utf-8') as f:
    content = f.read()

# Target the entire block containing the back button and PageActions
target = r'''<div className="mb-2">
          <Button
            variant="ghost"
            size="sm"
            className="mb-1 gap-2 px-0 text-foreground hover:bg-transparent hover:text-\[#7B0099\] transition-colors touch-target"
            onClick=\{\(\) => navigate\("/outstation"\)\}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-\[10px\] font-black uppercase tracking-widest">
              Back to Outstation Dashboard
            </span>
          </Button>
        </div>

      
      \{\/\* Filter Bar \*\/\}
      <PageActions>
        <Button size="sm" className="h-8 text-xs gap-1.5 shrink-0" style=\{\{ background: "#7B0099" \}\} onClick=\{openNew\}>
            <Plus className="w-3.5 h-3.5" /> New Assignment
          </Button>
      </PageActions>'''

replace = r'''{/* Filter Bar and Back Button */}
      <PageActions>
        <div className="flex w-full items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 px-0 text-foreground hover:bg-transparent hover:text-[#7B0099] transition-colors touch-target"
            onClick={() => navigate("/outstation")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Back to Outstation Dashboard
            </span>
          </Button>
          
          <Button 
            className="h-10 px-5 text-[14px] font-semibold text-white shadow-sm bg-[#7B0099] hover:bg-[#3b0764] w-full sm:w-auto shrink-0" 
            onClick={openNew}
          >
            <Plane className="w-4 h-4 mr-2" /> New Assignment
          </Button>
        </div>
      </PageActions>'''

content = re.sub(target, replace, content)

with codecs.open('src/pages/outstation/OutstationAssignment.tsx', 'w', 'utf-8') as f:
    f.write(content)

print("Updated OutstationAssignment")
