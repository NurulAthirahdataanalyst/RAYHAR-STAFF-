with open('src/pages/outstation/OutstationAnalytics.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_card = """        {/* Top Destinations */}
        <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-[16px] bg-white dark:bg-card">
          <CardHeader className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold text-foreground dark:text-slate-100">Top Destinations</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {destinationData.length === 0 ? (
              <div className="py-4 text-center text-foreground text-xs">No destinations available.</div>
            ) : (
              destinationData.map((item, index) => (
                <div key={index} className="flex items-center justify-between gap-3 text-xs">
                  <div className="w-32 font-medium text-foreground dark:text-slate-300 truncate">{item.destination}</div>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div className="h-2.5 rounded-full bg-[#942392]" style={{ width: ${Math.min(100, (item.count / (destinationData[0]?.count || 1)) * 100)}% }} />
                  </div>
                  <div className="w-12 text-right font-bold text-foreground dark:text-slate-300">{item.count} {item.count === 1 ? 'Trip' : 'Trips'}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>"""

new_card = """        {/* Top Destinations */}
        <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-[16px] bg-white dark:bg-card">
          <CardHeader className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold text-foreground dark:text-slate-100">Top Destinations</CardTitle>
            <select
              value={destinationLimit}
              onChange={e => setDestinationLimit(Number(e.target.value))}
              className="h-8 px-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-foreground dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#942392] cursor-pointer shadow-xs"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {destinationData.length === 0 ? (
              <div className="py-4 text-center text-foreground text-xs">No destinations available.</div>
            ) : (
              <>
                {destinationData.slice(0, destinationLimit).map((item, index) => (
                  <div key={index} className="flex items-center justify-between gap-3 text-xs">
                    <div className="w-32 font-medium text-foreground dark:text-slate-300 truncate">{item.destination}</div>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div className="h-2.5 rounded-full bg-[#942392]" style={{ width: ${Math.min(100, (item.count / (destinationData[0]?.count || 1)) * 100)}% }} />
                    </div>
                    <div className="w-16 text-right font-bold text-foreground dark:text-slate-300">{item.count} Staff</div>
                  </div>
                ))}
                
                <div className="flex justify-between items-center mt-6 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] text-yellow-600 dark:text-yellow-500 font-bold uppercase tracking-wider">
                    TOTAL DESTINATION - {destinationData.length}
                  </div>
                  <Button variant="link" className="text-[11px] h-auto p-0 text-[#942392] dark:text-purple-400 font-bold" onClick={() => navigate('/outstation')}>
                    VIEW ALL OUTSTATION
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>"""

content = content.replace(old_card, new_card)

with open('src/pages/outstation/OutstationAnalytics.tsx', 'w', encoding='utf-8') as f:
    f.write(content)