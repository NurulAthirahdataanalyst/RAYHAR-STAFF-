import codecs

with codecs.open('src/pages/hr-analytics/WorkforceCalendar.tsx', 'r', 'utf-8') as f:
    content = f.read()

# 1. Add Rest Day card
cardOld = '''                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                          <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-3 flex flex-col items-start dark:bg-emerald-950/30">
                            <span className="text-[9px] sm:text-[10px] font-black uppercase text-emerald-700">Present (On Time)</span>
                            <span className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">{presentOnTime.length}</span>
                          </div>
                          <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 flex flex-col items-start dark:bg-amber-950/30">
                            <span className="text-[9px] sm:text-[10px] font-black uppercase text-amber-700">Present (Late)</span>
                            <span className="text-xl sm:text-2xl font-black text-amber-600 mt-1">{presentLate.length}</span>
                          </div>
                          <div className="border border-red-200 bg-red-50 rounded-xl p-3 flex flex-col items-start dark:bg-red-950/30">
                            <span className="text-[9px] sm:text-[10px] font-black uppercase text-red-700">Absent</span>
                            <span className="text-xl sm:text-2xl font-black text-red-600 mt-1">{absent.length}</span>
                          </div>
                        </div>'''
cardNew = '''                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                          <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-3 flex flex-col items-start dark:bg-emerald-950/30">
                            <span className="text-[9px] sm:text-[10px] font-black uppercase text-emerald-700">Present (On Time)</span>
                            <span className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">{presentOnTime.length}</span>
                          </div>
                          <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 flex flex-col items-start dark:bg-amber-950/30">
                            <span className="text-[9px] sm:text-[10px] font-black uppercase text-amber-700">Present (Late)</span>
                            <span className="text-xl sm:text-2xl font-black text-amber-600 mt-1">{presentLate.length}</span>
                          </div>
                          <div className="border border-red-200 bg-red-50 rounded-xl p-3 flex flex-col items-start dark:bg-red-950/30">
                            <span className="text-[9px] sm:text-[10px] font-black uppercase text-red-700">Absent</span>
                            <span className="text-xl sm:text-2xl font-black text-red-600 mt-1">{absent.length}</span>
                          </div>
                          <div className="border border-slate-200 bg-slate-50 rounded-xl p-3 flex flex-col items-start dark:bg-slate-900/50">
                            <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">Rest Day</span>
                            <span className="text-xl sm:text-2xl font-black text-slate-600 dark:text-slate-400 mt-1">{restDays.length}</span>
                          </div>
                        </div>'''
content = content.replace(cardOld, cardNew)
content = content.replace(cardOld.replace('\n', '\r\n'), cardNew)

# 2. Add Rest Day breakdown list
breakdownOld = '''                      </div>
                    )}
                  </div>
                </div>
              </div>
            , document.body);
          })()}'''
breakdownNew = '''                        {restDays.length > 0 && (
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white mb-2 border-b pb-1">
                              Rest Day / Weekend ({restDays.length})
                            </div>
                            <div className="space-y-2">
                              {restDays.map((a: any) => (
                                <div key={a.user_id} className="border border-gray-100 rounded-lg p-3 shadow-sm bg-white dark:bg-slate-900 dark:border-slate-800">
                                  <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold uppercase truncate">{a.full_name || a.name || User } {a.branch ? () : ''}</span>
                                      <div className="flex items-center gap-1.5 mt-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                        <span className="text-[10px] font-black uppercase text-slate-500">Rest Day</span>
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                      <span className="text-[10px] font-black text-slate-400 uppercase">{a.department || "-"}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            , document.body);
          })()}'''
content = content.replace(breakdownOld, breakdownNew)
content = content.replace(breakdownOld.replace('\n', '\r\n'), breakdownNew)

with codecs.open('src/pages/hr-analytics/WorkforceCalendar.tsx', 'w', 'utf-8') as f:
    f.write(content)

print("Updated WorkforceCalendar.tsx")
