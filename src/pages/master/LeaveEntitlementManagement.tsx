import {
  Award,
  BadgePlus,
  CalendarRange,
  ClipboardList,
  History,
  Layers3,
  ShieldAlert,
  Sparkles,
  RotateCcw,
  Users,
  MinusCircle,
  Gift,
  CircleAlert,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import { Navigate } from "react-router-dom";

const modules = [
  {
    title: "Annual Leave Allocation",
    description: "Set each employee's base entitlement for the leave year according to role, policy, or grade.",
    icon: CalendarRange,
    tone: "bg-sky-500/10 text-sky-600",
  },
  {
    title: "Carry Forward Leave",
    description: "Move approved unused leave from the previous year into the current cycle based on carry-forward rules.",
    icon: RotateCcw,
    tone: "bg-emerald-500/10 text-emerald-600",
  },
  {
    title: "Additional Leave Allocation",
    description: "Grant extra leave days for rewards, compensation, retention, or special business approvals.",
    icon: BadgePlus,
    tone: "bg-violet-500/10 text-violet-600",
  },
  {
    title: "Manual Leave Adjustments",
    description: "Correct balances when there is a policy update, payroll correction, or data reconciliation issue.",
    icon: ClipboardList,
    tone: "bg-amber-500/10 text-amber-600",
  },
  {
    title: "Special Leave Credits",
    description: "Issue special-purpose credits such as compassionate leave, replacement leave, or birthday leave.",
    icon: Gift,
    tone: "bg-rose-500/10 text-rose-600",
  },
  {
    title: "Leave Forfeiture",
    description: "Remove expired or non-carryable leave balances after policy cut-off or year-end processing.",
    icon: ShieldAlert,
    tone: "bg-red-500/10 text-red-600",
  },
  {
    title: "Leave Balance History",
    description: "Track every allocation, deduction, and correction so HR can audit the full entitlement lifecycle.",
    icon: History,
    tone: "bg-slate-500/10 text-slate-600",
  },
  {
    title: "Bulk Leave Allocation",
    description: "Apply the same entitlement update to many employees at once for annual rollouts or policy changes.",
    icon: Users,
    tone: "bg-cyan-500/10 text-cyan-600",
  },
];

export default function LeaveEntitlementManagement() {
  const { role } = useRole();

  if (role && role !== "hr_admin" && role !== "managing_director") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="space-y-2">
          <Badge className="w-fit bg-[#7B0099]/10 text-[#7B0099] hover:bg-[#7B0099]/10 border border-[#7B0099]/15">
            HR Master Module
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-black font-heading text-foreground tracking-tight">
            Leave Entitlement Management
          </h1>
          <p className="max-w-3xl text-sm sm:text-base text-muted-foreground">
            Centralised administration for employee leave allocation, balance corrections, carry forward rules, and audit-ready entitlement history.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button className="bg-[#7B0099] hover:bg-[#5e0080] text-white font-black text-[10px] uppercase tracking-widest">
            <Sparkles className="w-4 h-4 mr-2" />
            Run Allocation
          </Button>
          <Button variant="outline" className="font-black text-[10px] uppercase tracking-widest">
            <BadgePlus className="w-4 h-4 mr-2" />
            Grant Leave
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-border/60 bg-card/70 backdrop-blur-sm">
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle className="flex items-center gap-2 text-lg font-black">
            <Layers3 className="w-5 h-5 text-[#7B0099]" />
            Module Scope
          </CardTitle>
          <CardDescription>
            This page is structured for enterprise leave entitlement administration and can grow with policy-driven features over time.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <div key={module.title} className="rounded-2xl border border-border/60 bg-background/60 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${module.tone}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="mt-4 text-sm font-black text-foreground">{module.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{module.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 border-border/60 bg-card/70 backdrop-blur-sm">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle className="flex items-center gap-2 text-lg font-black">
              <Award className="w-5 h-5 text-emerald-600" />
              Recommended HR Workflow
            </CardTitle>
            <CardDescription>
              A typical annual leave entitlement cycle for January processing and ongoing HR administration.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <ol className="space-y-3">
              {[
                "Allocate the annual entitlement for all eligible employees.",
                "Carry forward approved unused days from the prior year.",
                "Apply forfeiture where the policy cap is exceeded.",
                "Add special credits or additional leave where approvals exist.",
                "Record manual adjustments with a reason and approver.",
                "Review the balance history before closing the leave year.",
              ].map((step, index) => (
                <li key={step} className="flex gap-3 rounded-2xl border border-border/60 p-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7B0099]/10 text-[11px] font-black text-[#7B0099]">
                    {index + 1}
                  </div>
                  <p className="text-sm text-foreground/90">{step}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70 backdrop-blur-sm">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle className="flex items-center gap-2 text-lg font-black">
              <CircleAlert className="w-5 h-5 text-amber-600" />
              Audit Notes
            </CardTitle>
            <CardDescription>
              Keep entitlement changes transparent and policy-aligned.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            <div className="rounded-2xl bg-amber-500/5 border border-amber-500/15 p-4 text-sm text-foreground/90">
              Every balance change should capture the reason, date, affected period, and user who made the change.
            </div>
            <div className="rounded-2xl bg-sky-500/5 border border-sky-500/15 p-4 text-sm text-foreground/90">
              This module name stays future-proof for carry forward, forfeiture, bulk updates, and balance history features.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
