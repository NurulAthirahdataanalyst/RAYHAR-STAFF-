import re

with open("src/pages/LeaveFormView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Pattern for the old top bar:
top_bar_pattern = r'<div className="mb-4">\s*<div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-between">.*?</div>\s*</div>\s*</div>'

# Remove old top bar
new_content = re.sub(top_bar_pattern, '', content, flags=re.DOTALL)

if new_content == content:
    print("Warning: Top bar not removed!")

# Pattern for the Card
card_pattern = r'<Card className="border-none shadow-\[0_20px_50px_rgba\(0,0,0,0\.04\)\] dark:shadow-\[0_20px_50px_rgba\(0,0,0,0\.2\)\] bg-card/80 backdrop-blur-md rounded-\[24px\] sm:rounded-\[32px\] overflow-hidden">\s*<CardContent className="p-0">'

new_tabs_html = r'''<Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-card/80 backdrop-blur-md rounded-[24px] sm:rounded-[32px] overflow-hidden">
        <CardContent className="p-0">
          <div className="px-6 pt-6 border-b border-border/50 bg-muted/10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div className="flex gap-6 overflow-x-auto w-full sm:w-auto scrollbar-none">
              {([
                { key: "history" as FormTabFilter, label: "History", count: forms.length },
                { key: "pending" as FormTabFilter, label: "Pending", count: pendingCount },
                { key: "approved" as FormTabFilter, label: "Approved", count: approvedCount },
                { key: "rejected" as FormTabFilter, label: "Rejected", count: rejectedCount }
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`text-sm font-black uppercase tracking-widest pb-3 -mb-[1px] transition-colors border-b-[3px] whitespace-nowrap ${
                    activeTab === tab.key 
                      ? (tab.key === "history" ? "text-[#7B0099] border-[#7B0099]" :
                         tab.key === "pending" ? "text-amber-500 border-amber-500" :
                         tab.key === "approved" ? "text-emerald-500 border-emerald-500" :
                         "text-red-500 border-red-500")
                      : "text-muted-foreground border-transparent hover:text-yellow-500 hover:border-yellow-500"
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${
                      activeTab === tab.key 
                        ? (tab.key === "history" ? "bg-[#7B0099] text-white" :
                           tab.key === "pending" ? "bg-amber-500 text-white" :
                           tab.key === "approved" ? "bg-emerald-500 text-white" :
                           "bg-red-500 text-white")
                        : "bg-muted-foreground/20 text-muted-foreground transition-colors group-hover:bg-yellow-500 group-hover:text-white"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            
            <div className="pb-3 flex items-center gap-3 w-full sm:w-auto justify-end">
              <Badge variant="outline" className="font-black text-[10px] px-3 py-1 bg-white/50 dark:bg-black/20 border-border/50 text-foreground">
                {filteredForms.length} {activeTab === "pending" ? "PENDING" : activeTab === "approved" ? "APPROVED" : activeTab === "rejected" ? "REJECTED" : "TOTAL"}
              </Badge>
              <Button
                onClick={() => navigate("/leave/apply")}
                className="gap-2 bg-[#7B0099] text-white hover:bg-[#5e0080] rounded-xl font-black text-[10px] uppercase tracking-widest px-4 shadow-sm transition-all active:scale-95"
              >
                <FileText className="w-3.5 h-3.5" />
                New Application
              </Button>
            </div>
          </div>'''

new_content = re.sub(card_pattern, new_tabs_html, new_content, flags=re.DOTALL)

with open("src/pages/LeaveFormView.tsx", "w", encoding="utf-8") as f:
    f.write(new_content)

print("LeaveFormView replaced!")
