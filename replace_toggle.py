import re

with open('src/pages/Settings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''                  <button 
                    onClick={() => {
                      setIsAlertsEnabled(!isAlertsEnabled);
                      toast.success(`SSE Alerts toggled ${!isAlertsEnabled ? 'ON' : 'OFF'}`);
                    }}
                    className={`w-12 h-6 flex items-center rounded-md p-1 transition-all shrink-0 ${isAlertsEnabled ? 'bg-[#7B0099]' : 'bg-muted-foreground/30'}`}
                  >
                    <div className={`bg-white dark:bg-card w-4.5 h-4.5 rounded-full shadow-md transform transition-all ${isAlertsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>'''

replacement = '''                  <label className="switch shrink-0">
                    <input 
                      type="checkbox" 
                      checked={isAlertsEnabled}
                      onChange={(e) => {
                        setIsAlertsEnabled(e.target.checked);
                        toast.success(`SSE Alerts toggled ${e.target.checked ? 'ON' : 'OFF'}`);
                      }} 
                    />
                    <span className="slider"></span>
                  </label>'''

if target in content:
    content = content.replace(target, replacement)
    with open('src/pages/Settings.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced button for Real-time Notification Alerts")
else:
    print("Target block not found in Settings.tsx")
