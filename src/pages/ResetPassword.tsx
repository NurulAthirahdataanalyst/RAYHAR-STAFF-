import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import watercolorBg from "@/assets/watercolor-bg.png";
import rayharLogo from "@/assets/favicon.png";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSessionChecking, setIsSessionChecking] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        setError("This password reset link is no longer valid. Please request a new password reset link.");
      }
      setIsSessionChecking(false);
    };

    checkSession();
    
    // Also listen for auth state change in case the hash is processed slightly after mount
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setError(null);
        setIsSessionChecking(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

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
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      toast({ title: "Password Updated", description: "Your password has been successfully updated." });
    } catch (err: any) {
      console.error("Reset password error:", err);
      toast({ title: "Update Failed", description: err.message || "Failed to update password.", variant: "destructive" });
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
            <h1 className="font-heading font-black text-slate-900 dark:text-slate-100 text-xl sm:text-2xl tracking-tight">Rayhar Group</h1>
            <p className="text-[10px] sm:text-xs font-extrabold text-[#7B0099] uppercase tracking-widest">Password Reset</p>
          </div>
        </div>

        <Card className="border-white/40 shadow-2xl bg-white/80 backdrop-blur-xl rounded-[20px] sm:rounded-[30px] overflow-hidden">
          {isSessionChecking ? (
            <CardContent className="py-12 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#7B0099] mb-4" />
              <p className="text-sm font-medium text-slate-600">Verifying secure session...</p>
            </CardContent>
          ) : isSuccess ? (
            <div className="text-center p-6 sm:p-8 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Password Updated</h2>
              <p className="text-sm text-slate-600">
                Your password has been successfully updated. You can now sign in using your new password.
              </p>
              <Button 
                onClick={() => navigate("/login")}
                className="w-full mt-4 bg-[#7B0099] hover:bg-[#5e0080] text-white rounded-xl h-11 font-black uppercase tracking-wider"
              >
                Back to Sign In
              </Button>
            </div>
          ) : error ? (
            <div className="text-center p-6 sm:p-8 space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Reset Link Expired</h2>
              <p className="text-sm text-slate-600">
                {error}
              </p>
              <Button 
                onClick={() => navigate("/login")}
                className="w-full mt-4 bg-[#7B0099] hover:bg-[#5e0080] text-white rounded-xl h-11 font-black uppercase tracking-wider"
              >
                Back to Sign In
              </Button>
            </div>
          ) : (
            <>
              <CardHeader className="pb-2 bg-white/50 text-center">
                <h2 className="text-lg font-bold text-[#7B0099]">Create New Password</h2>
                <p className="text-xs text-foreground">Enter your new secure password below.</p>
              </CardHeader>
              
              <form onSubmit={handleResetPassword}>
                <CardContent className="space-y-4 pt-4">
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
                </CardContent>
                
                <CardFooter className="flex flex-col gap-4">
                  <Button 
                    type="submit" 
                    className="w-full bg-[#7B0099] hover:bg-[#5e0080] text-white rounded-xl h-12 sm:h-11 transition-all touch-target text-sm sm:text-base font-black uppercase tracking-wider" 
                    disabled={loading}
                  >
                    {loading && <Loader2 className="animate-spin mr-2" />}
                    Update Password
                  </Button>
                  
                  <div className="text-center mt-2">
                    <button
                      type="button"
                      onClick={() => navigate("/login")}
                      className="text-xs text-foreground font-bold hover:text-[#7B0099] hover:underline transition-colors uppercase"
                    >
                      Back to Sign In
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-foreground font-extrabold uppercase tracking-wider pt-2 border-t border-slate-100 dark:border-slate-800/50 w-full">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Secure Password Setup</span>
                  </div>
                </CardFooter>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
