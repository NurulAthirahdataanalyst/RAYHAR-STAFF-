import codecs

with codecs.open('src/pages/Employees.tsx', 'r', 'utf-8') as f:
    content = f.read()

# 1. Add Eye, EyeOff to lucide-react imports
if 'EyeOff' not in content:
    content = content.replace('ArrowLeft\r\n} from \'lucide-react\';', 'ArrowLeft,\n  Eye,\n  EyeOff\n} from \'lucide-react\';')
    content = content.replace('ArrowLeft\n} from \'lucide-react\';', 'ArrowLeft,\n  Eye,\n  EyeOff\n} from \'lucide-react\';')

# 2. Add showPassword state
if 'const [showPassword' not in content:
    content = content.replace('const [signupPassword, setSignupPassword] = useState("");', 'const [signupPassword, setSignupPassword] = useState("");\n  const [showPassword, setShowPassword] = useState(false);')

# 3. DialogHeader update
headerOld = '''            <DialogHeader>
              <DialogTitle>Add New Staff</DialogTitle>
              <DialogDescription>'''
headerNew = '''            <DialogHeader className="bg-[#942392] p-6 -mx-6 -mt-6 sm:rounded-t-lg">
              <DialogTitle className="text-white">Add New Staff</DialogTitle>
              <DialogDescription className="text-white/80">'''
content = content.replace(headerOld, headerNew)
content = content.replace(headerOld.replace('\n', '\r\n'), headerNew)

# Also need to update DialogContent to allow button styling
dialogContentOld = '<DialogContent className="sm:max-w-[425px]">'
dialogContentNew = '<DialogContent className="sm:max-w-[425px] overflow-hidden [&>button]:text-white [&>button]:hover:text-white/80">'
content = content.replace(dialogContentOld, dialogContentNew)

# 4. Update Inputs and Selects in the modal
inputNameOld = '              <Input id="signup-name" type="text" placeholder="e.g. AHMAD ALBAB" value={signupName} onChange={(e) => setSignupName(e.target.value.toUpperCase())} required />'
inputNameNew = '              <Input id="signup-name" type="text" className="bg-slate-100 border-transparent focus:bg-white" placeholder="e.g. AHMAD ALBAB" value={signupName} onChange={(e) => setSignupName(e.target.value.toUpperCase())} required />'
content = content.replace(inputNameOld, inputNameNew)

inputEmailOld = '              <Input id="signup-email" type="email" placeholder="ahmad@rayhar.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />'
inputEmailNew = '              <Input id="signup-email" type="email" className="bg-slate-100 border-transparent focus:bg-white" placeholder="ahmad@rayhar.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />'
content = content.replace(inputEmailOld, inputEmailNew)

# SelectTriggers in the modal
# Wait, replacing all <SelectTrigger className="rounded-md"> will replace them everywhere. There are only a few in this file anyway?
selectOld = '<SelectTrigger className="rounded-md">'
selectNew = '<SelectTrigger className="rounded-md bg-slate-100 border-transparent focus:bg-white">'
content = content.replace(selectOld, selectNew)

# 5. Update Password Field
pwOld = '''              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input id="signup-password" type="password" placeholder="Min. 6 characters" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required />
              </div>'''
pwNew = '''              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Input id="signup-password" type={showPassword ? "text" : "password"} className="bg-slate-100 border-transparent focus:bg-white pr-10" placeholder="Min. 6 characters" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>'''
content = content.replace(pwOld, pwNew)
content = content.replace(pwOld.replace('\n', '\r\n'), pwNew)

with codecs.open('src/pages/Employees.tsx', 'w', 'utf-8') as f:
    f.write(content)

print("Updated Employees.tsx")
