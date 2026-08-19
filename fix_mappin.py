with open('src/pages/Employees.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('Printer\n} from "lucide-react";', 'Printer,\n    MapPin\n} from "lucide-react";')
with open('src/pages/Employees.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
