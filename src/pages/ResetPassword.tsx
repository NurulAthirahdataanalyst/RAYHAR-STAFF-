import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "@/config/api";

import watercolorBg from "@/assets/watercolor-bg.png";
import rayharLogo from "@/assets/favicon.png";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token. Please request a new link.");
    }
  }, [token]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", description: "Please ensure your passwords match.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({ title: "Password Reset Successful", description: "You can now log in with your new password." });
        navigate("/login");
      } else {
        setError(data.error || "Failed to reset password.");
        toast({ title: "Reset failed", description: data.error || "Failed to reset password.", variant: "destructive" });
      }
    } catch (err) {
      console.error("Reset password error:", err);
      toast({ title: "Connection Failed", description: "Could not connect to the server.", variant: "destructive" });
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
            <p className="text-[10px] sm:text-xs font-extrabold text-[#7B0099] uppercase tracking-widest">Password Reset</p>
          </div>
        </div>

        <Card className="border-white/40 shadow-2xl bg-white/80 backdrop-blur-xl rounded-[20px] sm:rounded-[30px] overflow-hidden">
          <CardHeader className="pb-2 bg-white/50 text-center">
            <h2 className="text-lg font-bold text-[#7B0099]">Create New Password</h2>
            <p className="text-xs text-slate-500">Enter your new secure password below.</p>
          </CardHeader>
          
          <form onSubmit={handleResetPassword}>
            <CardContent className="space-y-4 pt-4">
              {error ? (
                <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium text-center">
                  {error}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}
            </CardContent>
            
            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full bg-[#7B0099] hover:bg-[#5e0080] text-white rounded-xl h-12 sm:h-11 transition-all touch-target text-sm sm:text-base font-black uppercase tracking-wider" 
                disabled={loading || !!error}
              >
                {loading && <Loader2 className="animate-spin mr-2" />}
                Reset Password
              </Button>
              
              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-xs text-slate-500 font-bold hover:text-[#7B0099] hover:underline transition-colors uppercase"
                >
                  Back to Sign In
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider pt-2 border-t border-slate-100/50 w-full">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Secure Password Setup</span>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
