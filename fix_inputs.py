import os
import codecs

# 1. Update Input to have bg-gray-50
input_file = 'src/components/ui/input.tsx'
with codecs.open(input_file, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace('bg-background', 'bg-gray-50 dark:bg-slate-900')
with codecs.open(input_file, 'w', 'utf-8') as f:
    f.write(content)


# 2. Update Header background color to #942392
layout_file = 'src/components/layout/AppLayout.tsx'
with codecs.open(layout_file, 'r', 'utf-8') as f:
    layout_content = f.read()

layout_content = layout_content.replace('bg-gradient-to-r from-[#800A7A] via-[#7B0099] to-[#3d0052]', 'bg-[#942392]')
with codecs.open(layout_file, 'w', 'utf-8') as f:
    f.write(layout_content)


# 3. Use PasswordInput
def replace_passwords(filepath):
    if not os.path.exists(filepath): return
    with codecs.open(filepath, 'r', 'utf-8') as f:
        c = f.read()
    
    if 'type="password"' in c:
        if 'import { Input }' in c and 'PasswordInput' not in c:
            c = c.replace('import { Input } from "@/components/ui/input"', 'import { Input } from "@/components/ui/input"\nimport { PasswordInput } from "@/components/ui/password-input"')
        
        c = c.replace('<Input id="login-password" type="password"', '<PasswordInput id="login-password"')
        c = c.replace('<Input id="signup-password" type="password"', '<PasswordInput id="signup-password"')
        c = c.replace('<Input id="signup-confirm-password" type="password"', '<PasswordInput id="signup-confirm-password"')
        c = c.replace('<Input\n                      id="new-password"\n                      type="password"', '<PasswordInput\n                      id="new-password"')
        c = c.replace('<Input\n                      id="confirm-password"\n                      type="password"', '<PasswordInput\n                      id="confirm-password"')
        c = c.replace('<Input\n                      id="current-password"\n                      type="password"', '<PasswordInput\n                      id="current-password"')
        c = c.replace('<Input\n                      id="new-password-settings"\n                      type="password"', '<PasswordInput\n                      id="new-password-settings"')
        
        with codecs.open(filepath, 'w', 'utf-8') as f:
            f.write(c)

replace_passwords('src/pages/Login.tsx')
replace_passwords('src/pages/ResetPassword.tsx')
replace_passwords('src/pages/Settings.tsx')

print('Done applying fixes!')
