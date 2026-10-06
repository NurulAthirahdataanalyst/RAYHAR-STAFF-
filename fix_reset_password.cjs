const fs = require('fs');

let c = fs.readFileSync('src/pages/Login.tsx', 'utf8');

const target = \    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: \\\\/reset-password\\\,
      });

      if (error) {
        throw error;
      }

      // Always show success message to prevent email enumeration
      toast({
        title: "Reset Link Sent",
        description: "If an account exists with this email address, a password reset link has been sent. Please check your inbox.",
      });
      setShowResetBox(false);
      setResetEmail("");
    } catch (err) {
      console.error("Error requesting password reset:", err);
      // We still show the success message for security, unless it's a known network/rate limit error, 
      // but to be perfectly safe as requested: "Regardless of whether the email exists, use a generic success message."
      toast({
        title: "Reset Link Sent",
        description: "If an account exists with this email address, a password reset link has been sent. Please check your inbox.",
      });
      setShowResetBox(false);
      setResetEmail("");
    } finally {
      setResetLoading(false);
    }\;

const replacement = \    setResetLoading(true);
    try {
      // Check if email exists in profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (!profile) {
        toast({
          title: "Email Not Found",
          description: "This email address is not registered in the system. Please contact HR for assistance.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: \\\\/reset-password\\\,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Reset Link Sent",
        description: "If an account exists with this email address, a password reset link has been sent. Please check your inbox.",
      });
      setShowResetBox(false);
      setResetEmail("");
    } catch (err: any) {
      console.error("Error requesting password reset:", err);
      toast({
        title: "Error",
        description: err?.message || "An error occurred while sending the reset link.",
        variant: "destructive"
      });
    } finally {
      setResetLoading(false);
    }\;

if (c.includes(target)) {
  c = c.replace(target, replacement);
  fs.writeFileSync('src/pages/Login.tsx', c, 'utf8');
  console.log('Successfully updated handlePasswordReset!');
} else {
  console.log('Target block not found. Checking if partial match exists...');
}
