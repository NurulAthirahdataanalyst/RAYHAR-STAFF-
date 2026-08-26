import re

file_path = 'src/pages/Settings.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''                      <button 
                        type="button"
                        onClick={() => setIsDeptActive(!isDeptActive)}
                        className={`w-12 h-6 flex items-center rounded-md p-1 transition-all ${isDeptActive ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
                      >
                        <div className={`bg-white dark:bg-card w-4.5 h-4.5 rounded-full shadow-md transform transition-all ${isDeptActive ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>'''

replacement = '''                      <label className="switch shrink-0" style={{ '--color-green': '#10b981' } as React.CSSProperties}>
                        <input 
                          type="checkbox" 
                          checked={isDeptActive}
                          onChange={(e) => setIsDeptActive(e.target.checked)} 
                        />
                        <span className="slider"></span>
                      </label>'''

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced department status button.")
else:
    print("Target block not found in Settings.tsx")
