import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added for Branch
import { Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/config/api";

// ASSETS
import watercolorBg from "@/assets/watercolor-bg.png";
import rayharLogo from "@/assets/favicon.png";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login"); // Controlled tab state
  const { toast } = useToast();
  const navigate = useNavigate();
  const { loginLocal } = useAuth();

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Email Password Reset state
  const [showResetBox, setShowResetBox] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast({ title: "Email required", description: "Please enter your email to proceed.", variant: "destructive" });
      return;
    }
    setResetLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Reset Link Sent",
          description: data.message || "Please check your email for the password reset link.",
        });
        setShowResetBox(false);
        setResetEmail("");
      } else {
        toast({
          title: "Failed to send reset link",
          description: data.error || "An error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error requesting password reset:", err);
      toast({
        title: "Connection Failed",
        description: "Could not connect to the server. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
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
    if (signupPassword !== signupConfirmPassword) {
      toast({ title: "Passwords do not match", description: "Please ensure your password and confirm password match.", variant: "destructive" });
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
          <Tabs value={activeTab} onValueChange={setActiveTab}>


            <TabsContent value="login" className="mt-0">
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
                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full bg-[#7B0099] hover:bg-[#5e0080] text-white rounded-xl h-12 sm:h-11 transition-all touch-target text-sm sm:text-base font-black uppercase tracking-wider" disabled={loading}>
                    {loading && <Loader2 className="animate-spin mr-2" />}
                    Sign In to Portal
                  </Button>

                  {/* Modern Bottom Utilities Section */}
                  <div className="w-full space-y-4 pt-2">
                    {/* Email Reset Box */}
                    <div className="flex flex-col gap-3 p-3 rounded-[16px] bg-[#FBF0FF] border border-[#7B0099]/15 text-xs shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-600 font-bold">
                          <svg className="w-4 h-4 text-[#7B0099]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"/>
                            <path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"/>
                          </svg>
                          <button
                            type="button"
                            onClick={() => setShowResetBox(!showResetBox)}
                            className="hover:underline text-left cursor-pointer transition-all text-slate-600 font-bold"
                          >
                            Forgot Password?
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowResetBox(!showResetBox)}
                          className="text-[#7B0099] font-black hover:underline cursor-pointer transition-colors"
                        >
                          Reset via Email
                        </button>
                      </div>

                      {showResetBox && (
                        <div className="pt-2 border-t border-[#7B0099]/10 animate-in fade-in slide-in-from-top-2 duration-300">
                          <p className="text-[10px] text-slate-500 mb-2 font-medium">
                            Enter your email to receive a secure password reset link.
                          </p>
                          <div className="flex gap-2">
                            <Input
                              type="email"
                              placeholder="you@rayhar.com"
                              value={resetEmail}
                              onChange={(e) => setResetEmail(e.target.value)}
                              className="h-8 text-xs bg-white border-[#7B0099]/20 focus-visible:ring-[#7B0099]"
                            />
                            <Button
                              type="button"
                              onClick={handlePasswordReset}
                              disabled={resetLoading}
                              className="h-8 bg-[#7B0099] hover:bg-[#5e0080] text-white text-xs font-bold rounded-md px-3 flex items-center justify-center shrink-0"
                            >
                              {resetLoading ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Send Link"
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>



                    {/* Secure Footer */}
                    <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider pt-2 border-t border-slate-100/50">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Secure Password Login</span>
                    </div>
                  </div>
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
                        <SelectItem value="BTP">Batu Pahat</SelectItem>
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
                  <div className="space-y-2 animate-in fade-in duration-300">
                    <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                    <Input id="signup-confirm-password" type="password" placeholder="Confirm your password" value={signupConfirmPassword} onChange={(e) => setSignupConfirmPassword(e.target.value)} required />
                    {signupConfirmPassword && (
                      <div className={`text-[10px] sm:text-xs font-bold flex items-center gap-1 mt-1.5 transition-all ${signupPassword === signupConfirmPassword ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {signupPassword === signupConfirmPassword ? (
                          <>
                            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black">✓</span>
                            <span>Passwords match</span>
                          </>
                        ) : (
                          <>
                            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-rose-100 text-rose-800 text-[9px] font-black">✗</span>
                            <span>Passwords do not match</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full bg-[#7B0099] hover:bg-[#5e0080] text-white rounded-xl h-12 sm:h-11 transition-all touch-target text-sm sm:text-base font-black uppercase tracking-wider" disabled={loading}>
                    {loading && <Loader2 className="animate-spin mr-2" />}
                    {loading ? "Registering..." : "Create Account"}
                  </Button>

                  {/* Centered Switch Link */}
                  <div className="text-center text-xs text-slate-500 font-bold pt-2">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setActiveTab("login")}
                      className="text-[#7B0099] font-black hover:underline ml-1 uppercase"
                    >
                      SIGN IN
                    </button>
                  </div>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}