import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added for Branch
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/config/api";

// ASSETS
import watercolorBg from "@/assets/watercolor-bg.png";
import rayharLogo from "@/assets/favicon.png";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { loginLocal } = useAuth();

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupBranch, setSignupBranch] = useState("HQ"); // Default branch
  const [signupDepartment, setSignupDepartment] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log("Login success, user data:", data.user);
        loginLocal(data.user); 
        const displayName = data.user?.full_name || data.user?.name || loginEmail;
        toast({ title: "Welcome back!", description: `Logged in as ${displayName}` });
        
        // Use a small timeout to ensure state is saved before navigation
        setTimeout(() => {
          navigate("/");
        }, 100);
      } else {
        toast({ title: "Login failed", description: data.error || data.message || "Invalid credentials", variant: "destructive" });
      }
    } catch (err) {
      console.error("Login connection error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          full_name: signupName, 
          email: signupEmail, 
          password: signupPassword,
          branch: signupBranch, // Pass branch to match DB table
          department: signupBranch === "HQ" ? signupDepartment : null,
          status: 'Active'
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // The DB Trigger assigned 'E0001' and the backend returned it in data.user
        loginLocal(data.user); 
        toast({ title: "Account Created!", description: `Welcome! Your ID is ${data.user.user_id}` });
        navigate("/");
      } else {
        toast({ title: "Signup failed", description: data.error || "Could not create account", variant: "destructive" });
      }
    } catch (err) {
      console.error("Signup connection error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 force-light safe-area-top safe-area-bottom"
      style={{
        backgroundImage: `url(${watercolorBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="w-full max-w-sm sm:max-w-md animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
          <img src={rayharLogo} alt="Rayhar Logo" className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shadow-xl" />
          <div className="text-center">
            <h1 className="font-heading font-black text-slate-900 text-xl sm:text-2xl tracking-tight">Rayhar Group</h1>
            <p className="text-[10px] sm:text-xs font-extrabold text-[#7B0099] uppercase tracking-widest">Staff Admin Panel</p>
          </div>
        </div>

        <Card className="border-white/40 shadow-2xl bg-white/80 backdrop-blur-xl rounded-[20px] sm:rounded-[30px] overflow-hidden">
          <Tabs defaultValue="login">
            <CardHeader className="pb-4 bg-white/50">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100/50">
                <TabsTrigger value="login" className="rounded-xl data-[state=active]:bg-[#7B0099] data-[state=active]:text-white touch-target">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-xl data-[state=active]:bg-[#7B0099] data-[state=active]:text-white touch-target">Sign Up</TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" placeholder="you@rayhar.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input id="login-password" type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full bg-[#7B0099] hover:bg-[#5e0080] text-white rounded-xl h-12 sm:h-11 transition-all touch-target text-sm sm:text-base" disabled={loading}>
                    {loading && <Loader2 className="animate-spin mr-2" />}
                    Sign In to Portal
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup}>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input id="signup-name" type="text" placeholder="Full Name" value={signupName} onChange={(e) => setSignupName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder="you@rayhar.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-branch">Branch</Label>
                    <Select value={signupBranch} onValueChange={setSignupBranch}>
                      <SelectTrigger className="rounded-md">
                        <SelectValue placeholder="Select Branch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HQ">Rayhar HQ</SelectItem>
                        <SelectItem value="KMM">Kemaman</SelectItem>
                        <SelectItem value="TGG">Kuala Terengganu</SelectItem>
                        <SelectItem value="CNH">Cheneh</SelectItem>
                        <SelectItem value="KBG">Kuala Berang</SelectItem>
                        <SelectItem value="DGN">Dungun</SelectItem>
                        <SelectItem value="JTH">Jertih</SelectItem>
                        <SelectItem value="KBR">Kota Baru</SelectItem>
                        <SelectItem value="RMP">Rompin</SelectItem>
                        <SelectItem value="MZM">Muadzam Shah</SelectItem>
                        <SelectItem value="SHA">Shah Alam</SelectItem>
                        <SelectItem value="BBB">Bandar Baru Bangi</SelectItem>
                        <SelectItem value="KUL">Kuala Lumpur</SelectItem>
                        <SelectItem value="IPH">Ipoh</SelectItem>
                        <SelectItem value="MJG">Manjung</SelectItem>
                        <SelectItem value="MLK">Melaka</SelectItem>
                        <SelectItem value="KKS">Kuala Kangsar</SelectItem>
                        <SelectItem value="TWU">Tawau</SelectItem>
                        <SelectItem value="SNS">Seremban</SelectItem>
                        <SelectItem value="AOR">Alor Setar</SelectItem>
                        <SelectItem value="BTM">Bertam</SelectItem>
                        <SelectItem value="BTP">Batu Pahatr</SelectItem>
                        <SelectItem value="JB">Johor Bharu</SelectItem>                        
                      </SelectContent>
                    </Select>
                  </div>

                  {signupBranch === "HQ" && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <Label htmlFor="signup-department">Department</Label>
                      <Select value={signupDepartment} onValueChange={setSignupDepartment} required>
                        <SelectTrigger className="rounded-md">
                          <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IT">IT</SelectItem>
                          <SelectItem value="HAJI/UMRAH (BHU)">HAJI/UMRAH (BHU)</SelectItem>
                          <SelectItem value="MARKETING & MEDIA">MARKETING & MEDIA</SelectItem>
                          <SelectItem value="OTB & DESIGN">OTB & DESIGN</SelectItem>
                          <SelectItem value="RESERVATION & VISA">RESERVATION & VISA</SelectItem>
                          <SelectItem value="ACCOUNT DEPARTMENT">ACCOUNT DEPARTMENT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" type="password" placeholder="Min. 6 characters" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full bg-[#7B0099] hover:bg-[#5e0080] text-white rounded-xl h-12 sm:h-11 transition-all touch-target text-sm sm:text-base" disabled={loading}>
                    {loading && <Loader2 className="animate-spin mr-2" />}
                    {loading ? "Registering..." : "Create Account"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}