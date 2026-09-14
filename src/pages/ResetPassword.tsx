import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Loader2, ShieldCheck, Check, Eye, EyeOff, Info, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { API_BASE_URL } from "@/config/api";

import watercolorBg from "@/assets/watercolor-bg.png";
import rayharLogo from "@/assets/favicon.png";

// Password Requirements & Strength Configuration
const PASSWORD_REQUIREMENTS = [
  { regex: /.{8,}/, text: "At least 8 characters" },
  { regex: /[0-9]/, text: "At least 1 number" },
  { regex: /[a-z]/, text: "At least 1 lowercase letter" },
  { regex: /[A-Z]/, text: "At least 1 uppercase letter" },
  { regex: /[!-/:-@[-`{-~]/, text: "At least 1 special character" },
] as const;

type StrengthScore = 0 | 1 | 2 | 3 | 4 | 5;

const STRENGTH_CONFIG = {
  colors: {
    0: "border-slate-200",
    1: "border-red-500",
    2: "border-orange-500",
    3: "border-amber-500",
    4: "border-emerald-400",
    5: "border-emerald-500",
  } satisfies Record<StrengthScore, string>,
  iconColors: {
    0: "text-slate-400",
    1: "text-red-500",
    2: "text-orange-500",
    3: "text-amber-500",
    4: "text-emerald-500",
    5: "text-emerald-500",
  } satisfies Record<StrengthScore, string>,
  barColors: {
    0: "bg-slate-200",
    1: "bg-red-500",
    2: "bg-orange-500",
    3: "bg-amber-500",
    4: "bg-emerald-400",
    5: "bg-emerald-500",
  } satisfies Record<StrengthScore, string>,
  texts: {
    0: "Enter a password",
    1: "Weak password",
    2: "Medium password!",
    3: "Strong password!!",
    4: "Very Strong password!!!",
  } satisfies Record<Exclude<StrengthScore, 5>, string>,
} as const;

type Requirement = {
  met: boolean;
  text: string;
};

type PasswordStrength = {
  score: StrengthScore;
  requirements: Requirement[];
};

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSessionChecking, setIsSessionChecking] = useState(true);
  const [tokenParam, setTokenParam] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const calculateStrength = useMemo((): PasswordStrength => {
    const requirements = PASSWORD_REQUIREMENTS.map((req) => ({
      met: req.regex.test(newPassword),
      text: req.text,
    }));

    return {
      score: requirements.filter((req) => req.met).length as StrengthScore,
      requirements,
    };
  }, [newPassword]);

  const isMatch = useMemo(() => {
    if (confirmPassword === "") return null;
    return newPassword !== "" && confirmPassword === newPassword;
  }, [newPassword, confirmPassword]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash || "";
    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));

    // Check for error parameters from Supabase (e.g. otp_expired, access_denied)
    const errorParam = urlParams.get("error") || hashParams.get("error");
    const errorDesc = urlParams.get("error_description") || hashParams.get("error_description");
    if (errorParam || errorDesc) {
      const msg = errorDesc
        ? decodeURIComponent(errorDesc.replace(/\+/g, " "))
        : "This password reset link has expired or is invalid. Please request a new link.";
      setError(msg);
      setIsSessionChecking(false);
      return;
    }

    const token = urlParams.get("token");
    if (token) {
      setTokenParam(token);
      setIsSessionChecking(false);
      return;
    }

    let isMounted = true;

    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (session) {
        setError(null);
        setIsSessionChecking(false);
        return;
      }

      // If hash contains tokens, Supabase may take a brief moment to process the hash
      if (hash.includes("access_token") || hash.includes("type=recovery")) {
        setTimeout(async () => {
          if (!isMounted) return;
          const { data: { session: delayedSession } } = await supabase.auth.getSession();
          if (delayedSession) {
            setError(null);
          } else {
            setError("This password reset link is no longer valid or has expired. Please request a new link.");
          }
          setIsSessionChecking(false);
        }, 1200);
      } else {
        if (!error) {
          setError("This password reset link is no longer valid. Please request a new password reset link.");
        } else {
          setError(error.message || "Failed to verify password reset link.");
        }
        setIsSessionChecking(false);
      }
    };

    checkSession();

    // Also listen for auth state change in case the hash is processed slightly after mount
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setError(null);
        setIsSessionChecking(false);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (calculateStrength.score < 3) {
      toast({ title: "Weak Password", description: "Please fulfill more password requirements (at least 3 met).", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", description: "Please ensure your passwords match.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // 1. Get current Supabase session (contains access_token and user email if recovery link was clicked)
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token || "";
      const sessionEmail = session?.user?.email || "";

      // 2. Update Supabase Auth if session exists
      if (session) {
        const { error: sbError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (sbError) {
          console.warn("Supabase auth updateUser warning:", sbError);
        }
      }

      // 3. ALWAYS update the primary database profiles table via backend API
      const response = await fetch(`${API_BASE_URL}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tokenParam,
          accessToken: accessToken,
          email: sessionEmail,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update password in system.");
      }

      // 4. Sign out from temporary recovery session so next login is clean
      await supabase.auth.signOut().catch(() => {});

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
            <h1 className="font-heading font-black text-slate-900 text-xl sm:text-2xl tracking-tight">Rayhar Group</h1>
            <p className="text-[10px] sm:text-xs font-extrabold text-[#942392] uppercase tracking-widest">Password Reset</p>
          </div>
        </div>

        <Card className="border-white/60 shadow-2xl bg-white/95 backdrop-blur-xl rounded-[20px] sm:rounded-[30px] overflow-hidden">
          {isSessionChecking ? (
            <CardContent className="py-12 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#942392] mb-4" />
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
                className="w-full mt-4 bg-[#942392] hover:bg-[#5e0080] text-white rounded-xl h-11 font-black uppercase tracking-wider"
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
                className="w-full mt-4 bg-[#942392] hover:bg-[#5e0080] text-white rounded-xl h-11 font-black uppercase tracking-wider"
              >
                Back to Sign In
              </Button>
            </div>
          ) : (
            <>
              <CardHeader className="pb-2 bg-white/50 text-center">
                <h2 className="text-lg font-bold text-[#942392]">Create New Password</h2>
                <p className="text-xs text-slate-600">Enter your new secure password below.</p>
              </CardHeader>
              
              <form onSubmit={handleResetPassword}>
                <CardContent className="space-y-4 pt-4">
                  {/* New Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="new-password" className="text-slate-800 font-bold text-xs">
                        New Password
                      </Label>
                      <HoverCard openDelay={150}>
                        <HoverCardTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center p-0.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                            aria-label="Password requirements info"
                          >
                            <Info
                              size={17}
                              className={`${
                                STRENGTH_CONFIG.iconColors[calculateStrength.score]
                              } transition-colors`}
                            />
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent 
                          align="end" 
                          side="bottom" 
                          sideOffset={6} 
                          collisionPadding={16}
                          className="w-72 bg-white/98 backdrop-blur-md p-3.5 rounded-xl shadow-2xl border border-slate-200"
                        >
                          <p className="text-xs font-bold text-slate-800 mb-2">Password Requirements</p>
                          <ul className="space-y-1.5" aria-label="Password requirements">
                            {calculateStrength.requirements.map((req) => (
                              <li key={req.text} className="flex items-center space-x-2">
                                {req.met ? (
                                  <Check size={14} className="text-emerald-500 shrink-0" />
                                ) : (
                                  <X size={14} className="text-slate-400 shrink-0" />
                                )}
                                <span
                                  className={`text-xs ${
                                    req.met ? "text-emerald-600 font-bold" : "text-slate-500"
                                  }`}
                                >
                                  {req.text}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </HoverCardContent>
                      </HoverCard>
                    </div>

                    <div className="relative">
                      <Input
                        id="new-password"
                        type={isVisible ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        aria-invalid={calculateStrength.score < 4}
                        aria-describedby="password-strength"
                        className={`w-full pr-10 border-2 rounded-md !bg-white !text-slate-900 placeholder:!text-slate-400 placeholder:!text-gray-400 placeholder:!font-normal transition-all shadow-sm focus:!border-[#942392] focus-visible:!border-[#942392] focus-visible:!ring-1 focus-visible:!ring-[#942392] focus-visible:!ring-offset-0 focus:!ring-offset-0 ${
                          newPassword === ""
                            ? "!border-slate-200"
                            : STRENGTH_CONFIG.colors[calculateStrength.score]
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setIsVisible((prev) => !prev)}
                        aria-label={isVisible ? "Hide password" : "Show password"}
                        className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {/* Animated Strength Progress Bar */}
                    <div
                      className="mt-2 mb-1.5 h-1 rounded-full bg-slate-100 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={calculateStrength.score}
                      aria-valuemin={0}
                      aria-valuemax={5}
                    >
                      <div
                        className={`h-full ${
                          STRENGTH_CONFIG.barColors[calculateStrength.score]
                        } transition-all duration-500`}
                        style={{ width: `${(calculateStrength.score / 5) * 100}%` }}
                      />
                    </div>

                    {newPassword !== "" && (
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                        <span>Must contain:</span>
                        <span className={calculateStrength.score >= 4 ? "text-emerald-600 font-bold" : calculateStrength.score >= 2 ? "text-amber-500 font-bold" : "text-red-500 font-bold"}>
                          {STRENGTH_CONFIG.texts[Math.min(calculateStrength.score, 4) as keyof typeof STRENGTH_CONFIG.texts]}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5 pt-1">
                    <Label htmlFor="confirm-password" className="text-slate-800 font-bold text-xs">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={isConfirmVisible ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        aria-invalid={confirmPassword !== "" ? isMatch === false : undefined}
                        className={`w-full pr-10 border-2 rounded-md !bg-white !text-slate-900 placeholder:!text-slate-400 placeholder:!text-gray-400 placeholder:!font-normal transition-all shadow-sm focus:!border-[#942392] focus-visible:!border-[#942392] focus-visible:!ring-1 focus-visible:!ring-[#942392] focus-visible:!ring-offset-0 focus:!ring-offset-0 ${
                          confirmPassword === ""
                            ? "!border-slate-200"
                            : isMatch
                            ? "border-emerald-500"
                            : "border-red-500"
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setIsConfirmVisible((prev) => !prev)}
                        aria-label={isConfirmVisible ? "Hide password" : "Show password"}
                        className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        {isConfirmVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {confirmPassword !== "" && isMatch === false && (
                      <p className="text-red-500 text-[11px] font-bold mt-1">Passwords do not match</p>
                    )}
                    {confirmPassword !== "" && isMatch === true && (
                      <p className="text-emerald-600 text-[11px] font-bold mt-1">✓ Passwords match</p>
                    )}
                  </div>
                </CardContent>
                
                <CardFooter className="flex flex-col gap-4">
                  <Button 
                    type="submit" 
                    className="w-full bg-[#942392] hover:bg-[#5e0080] text-white rounded-xl h-12 sm:h-11 transition-all touch-target text-sm sm:text-base font-black uppercase tracking-wider" 
                    disabled={loading}
                  >
                    {loading && <Loader2 className="animate-spin mr-2" />}
                    Update Password
                  </Button>
                  
                  <div className="text-center mt-2">
                    <button
                      type="button"
                      onClick={() => navigate("/login")}
                      className="text-xs text-slate-600 font-bold hover:text-[#942392] hover:underline transition-colors uppercase"
                    >
                      Back to Sign In
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider pt-2 border-t border-slate-100 w-full">
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
