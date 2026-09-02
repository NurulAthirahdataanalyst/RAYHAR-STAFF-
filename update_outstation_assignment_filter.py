with open('src/pages/outstation/OutstationAssignment.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_statement = "import { useAuth } from "@/context/AuthContext";"
if "useSearchParams" not in content:
    content = content.replace(import_statement, "import { useSearchParams } from 'react-router-dom';\n" + import_statement)

old_state = "const [filterMonthYear, setFilterMonthYear] = useState(${currentDate.getFullYear()}-);"
new_state = """const [searchParams] = useSearchParams();
  const initialMonth = searchParams.get('month') || (currentDate.getMonth() + 1).toString().padStart(2, '0');
  const initialYear = searchParams.get('year') || currentDate.getFullYear().toString();
  const initialMonthYear = searchParams.get('month') && searchParams.get('year') ? ${initialYear}- : ${currentDate.getFullYear()}-;
  const [filterMonthYear, setFilterMonthYear] = useState(initialMonthYear);"""

content = content.replace(old_state, new_state)

with open('src/pages/outstation/OutstationAssignment.tsx', 'w', encoding='utf-8') as f:
    f.write(content)