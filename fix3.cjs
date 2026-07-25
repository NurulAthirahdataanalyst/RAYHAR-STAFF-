const fs = require('fs');

try {
  let db = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
  
  // Imports
  if (!db.includes('PageHeader')) {
    db = db.replace('import { Badge } from "@/components/ui/badge";', 'import { Badge } from "@/components/ui/badge";\nimport PageHeader from "@/components/layout/PageHeader";\nimport PageActions from "@/components/layout/PageActions";');
  }

  // Remove portal
  db = db.replace('const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);\n\n  useEffect(() => {\n    setPortalTarget(document.getElementById("page-header-actions"));\n  }, []);', '');
  
  const headerStartRegex = /<div className=\"space-y-3 animate-in fade-in duration-500\">[\s\S]*?\{portalTarget && createPortal\([\s\S]*?<div className=\"flex items-center gap-2 shrink-0\">/;
  
  const headerReplacement = `<div className="space-y-3 animate-in fade-in duration-500 pb-8">
      <PageHeader
        title="Workforce Overview"
        description="Monitor employee activity, attendance status, leave updates, and workforce performance in real time"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Dashboard" }
        ]}
      />
      <PageActions>
        <div className="flex items-center gap-2 shrink-0">`;
        
  db = db.replace(headerStartRegex, headerReplacement);
  
  const headerEndRegex = /Reset\n            <\/Button>\n          \)}\n        <\/div>,\n        portalTarget\n      \)}/;
  
  const headerEndReplacement = `Reset\n            </Button>\n          )}\n        </div>\n      </PageActions>`;
  
  db = db.replace(headerEndRegex, headerEndReplacement);
  fs.writeFileSync('src/pages/Dashboard.tsx', db);
  console.log('Fixed Dashboard.tsx');
} catch (e) {
  console.error(e);
}

try {
  let mo = fs.readFileSync('src/pages/outstation/MyOutstation.tsx', 'utf8');
  
  if (!mo.includes('PageHeader')) {
    mo = mo.replace('import { Button } from "@/components/ui/button";', 'import { Button } from "@/components/ui/button";\nimport PageHeader from "@/components/layout/PageHeader";\nimport PageActions from "@/components/layout/PageActions";');
  }
  
  // Remove portal
  mo = mo.replace('const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);\n\n  useEffect(() => {\n    setPortalTarget(document.getElementById("page-header-actions"));\n  }, []);', '');

  const moStartRegex = /<div className=\"min-h-screen bg-background space-y-6 animate-in fade-in duration-500\">[\s\S]*?\{portalTarget && createPortal\([\s\S]*?<div className=\"flex items-center gap-3 shrink-0\">/;
  
  const moReplacement = `<div className="min-h-screen bg-background space-y-6 animate-in fade-in duration-500 pb-8">
      <PageHeader
        title="My Outstation"
        description="View and manage your outstation assignments, expenses, and travel details"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Outstation Management", href: "/outstation" },
          { label: "My Outstation" }
        ]}
      />
      <PageActions>
        <div className="flex items-center gap-3 shrink-0">`;
        
  mo = mo.replace(moStartRegex, moReplacement);
  
  const moEndRegex = /<\/Button>\n        <\/div>,\n        portalTarget\n      \)}/;
  const moEndReplacement = `</Button>\n        </div>\n      </PageActions>`;
  
  mo = mo.replace(moEndRegex, moEndReplacement);

  const cardHeaderRegex = /<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">[\s\S]*?<\/CardHeader>/;
  const cardHeaderReplacement = `<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-base font-bold">My Outstation Log</CardTitle>
          </CardHeader>`;
          
  mo = mo.replace(cardHeaderRegex, cardHeaderReplacement);

  fs.writeFileSync('src/pages/outstation/MyOutstation.tsx', mo);
  console.log('Fixed MyOutstation.tsx');
} catch (e) {
  console.error(e);
}
