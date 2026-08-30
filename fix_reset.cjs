const fs = require('fs');

let content = fs.readFileSync('src/pages/ResetPassword.tsx', 'utf-8');
content = content.replace(/<Input([^>]*?)type="password"/g, '<PasswordInput');
fs.writeFileSync('src/pages/ResetPassword.tsx', content);

let content2 = fs.readFileSync('src/pages/Settings.tsx', 'utf-8');
content2 = content2.replace(/<Input([^>]*?)type="password"/g, '<PasswordInput');
if (content2.includes('PasswordInput') && !content2.includes('import { PasswordInput }')) {
    content2 = content2.replace('import { Input } from "@/components/ui/input"', 'import { Input } from "@/components/ui/input"\nimport { PasswordInput } from "@/components/ui/password-input"');
}
fs.writeFileSync('src/pages/Settings.tsx', content2);
