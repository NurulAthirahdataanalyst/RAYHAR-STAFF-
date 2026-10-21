// This code exists only to simulate browser tracking prevention behavior.

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  ExternalLink,
  ArrowLeft,
  Database,
  Lock,
  EyeOff,
  CheckCircle2,
  Info,
  Terminal,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CDN_TRACKER_SCRIPT_URL,
  runTrackingPreventionSimulation,
  cleanupTrackingSimulation,
  SimulationLog,
  SimulationResult,
} from "@/utils/trackingPreventionSimulation";

export default function TrackingTest() {
  // This code exists only to simulate browser tracking prevention behavior.
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [logs, setLogs] = useState<SimulationLog[]>([]);
  const [isEdge, setIsEdge] = useState<boolean>(false);
  const [userAgent, setUserAgent] = useState<string>("");

  useEffect(() => {
    // Detect Microsoft Edge
    const ua = navigator.userAgent;
    setUserAgent(ua);
    setIsEdge(ua.includes("Edg/"));

    // Automatically run the simulation on initial page load in controlled test environment
    handleRunSimulation();

    return () => {
      // Clean up when unmounting
      cleanupTrackingSimulation();
    };
  }, []);

  const handleRunSimulation = async () => {
    setIsRunning(true);
    setLogs([]);
    try {
      const simResult = await runTrackingPreventionSimulation((newLog) => {
        setLogs((prev) => [...prev, newLog]);
      });
      setResult(simResult);
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    cleanupTrackingSimulation();
    setResult(null);
    setLogs([
      {
        timestamp: new Date().toLocaleTimeString(),
        type: "info",
        message: "Simulation script removed and test storage cleared.",
      },
    ]);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 text-foreground">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                to="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Rayhar Portal
              </Link>
              <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30">
                Isolated Test Environment
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-primary" />
              Microsoft Edge Tracking Prevention Test
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Controlled environment to simulate third-party tracker storage blocking in Microsoft Edge.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleRunSimulation}
              disabled={isRunning}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Play className="w-4 h-4" /> {isRunning ? "Running..." : "Run Simulation"}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isRunning}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </Button>
          </div>
        </div>

        {/* Browser Detection Banner */}
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            isEdge
              ? "bg-blue-50/70 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900 text-blue-900 dark:text-blue-200"
              : "bg-amber-50/80 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900 text-amber-900 dark:text-amber-200"
          }`}
        >
          {isEdge ? (
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="text-sm space-y-1">
            <div className="font-semibold">
              {isEdge ? "Microsoft Edge Detected" : "Non-Edge Browser Detected"}
            </div>
            <div>
              {isEdge ? (
                <>
                  You are currently using Microsoft Edge. To see the tracking prevention console message, ensure{" "}
                  <strong>Tracking Prevention</strong> is set to <strong>Strict</strong> or browse in an{" "}
                  <strong>InPrivate Window</strong> (<kbd className="px-1 py-0.5 bg-background rounded border text-xs">Ctrl + Shift + N</kbd>).
                </>
              ) : (
                <>
                  You are viewing this test in a browser other than Microsoft Edge (e.g. Chrome/Firefox). To reproduce
                  the specific Microsoft Edge warning message, please open this URL in{" "}
                  <strong>Microsoft Edge</strong>.
                </>
              )}
            </div>
            <div className="text-xs opacity-75 font-mono truncate max-w-xl">
              User-Agent: {userAgent}
            </div>
          </div>
        </div>

        {/* Target Console Message Card */}
        <Card className="border-indigo-200 dark:border-indigo-900/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-500" />
                Target Microsoft Edge Console Warning
              </CardTitle>
              <Badge variant="secondary" className="font-mono text-xs">
                DevTools (F12)
              </Badge>
            </div>
            <CardDescription>
              When Edge Tracking Prevention restricts storage access for the external CDN script, the console displays:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs sm:text-sm overflow-x-auto border border-slate-800 shadow-inner">
              <div className="text-amber-400 font-semibold mb-1">
                ⚠️ [Warning] Microsoft Edge Tracking Prevention
              </div>
              <div className="text-rose-300">
                Tracking Prevention blocked access to storage for:
              </div>
              <div className="text-sky-300 underline break-all">
                {CDN_TRACKER_SCRIPT_URL}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Simulation Controls & Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* CDN Script Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>External CDN Domain</span>
                {result?.scriptLoaded ? (
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px]">Loaded</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">Pending</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <p className="text-muted-foreground">
                Loaded from a non-localhost CDN domain (jsDelivr) to trigger cross-origin classification.
              </p>
              <div className="p-2 bg-muted rounded font-mono text-[11px] break-all">
                {CDN_TRACKER_SCRIPT_URL}
              </div>
              <div className="text-muted-foreground flex items-center gap-1 pt-1">
                <Info className="w-3.5 h-3.5 text-blue-500" />
                Bundle contains Meta CAPI client parameter builder.
              </div>
            </CardContent>
          </Card>

          {/* Storage Access Attempts Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Storage API Access</span>
                <Badge variant="outline" className="text-[10px]">Simulated</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-1.5 rounded bg-muted/60">
                <span className="font-mono">document.cookie</span>
                <span className={result?.cookieAttempted ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                  {result?.cookieAttempted ? (result.cookieSuccess ? "Accessed" : "Restricted") : "Idle"}
                </span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-muted/60">
                <span className="font-mono">window.localStorage</span>
                <span className={result?.localStorageAttempted ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                  {result?.localStorageAttempted ? (result.localStorageSuccess ? "Accessed" : "Restricted") : "Idle"}
                </span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-muted/60">
                <span className="font-mono">window.sessionStorage</span>
                <span className={result?.sessionStorageAttempted ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                  {result?.sessionStorageAttempted ? (result.sessionStorageSuccess ? "Accessed" : "Restricted") : "Idle"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Isolation & Safety Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Safety & Isolation</span>
                <Badge className="bg-emerald-500 text-white text-[10px]">100% Safe</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-start gap-1.5 text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>No user data collected or sent externally.</span>
              </div>
              <div className="flex items-start gap-1.5 text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>No advertising beacons or real ad networks.</span>
              </div>
              <div className="flex items-start gap-1.5 text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Rayhar HR, Attendance & DB are untouched.</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Simulation Execution Logs */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                Simulation Execution Log
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {logs.length} event(s) recorded
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-44 overflow-y-auto bg-slate-950 text-slate-100 p-3 rounded-lg font-mono text-xs space-y-1.5 border border-slate-800">
              {logs.length === 0 ? (
                <div className="text-slate-500 italic">No events recorded. Click &quot;Run Simulation&quot; to execute.</div>
              ) : (
                logs.map((log, index) => {
                  let colorClass = "text-slate-300";
                  if (log.type === "success") colorClass = "text-emerald-400";
                  if (log.type === "warn") colorClass = "text-amber-400";
                  if (log.type === "error") colorClass = "text-rose-400";
                  return (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                      <span className={colorClass}>{log.message}</span>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step-by-Step Instructions */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" />
              How to Reproduce the Warning in Microsoft Edge
            </CardTitle>
            <CardDescription>
              Follow these exact steps in Microsoft Edge to trigger and verify the Tracking Prevention warning.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-card border space-y-2">
                <div className="font-semibold text-primary flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs font-bold">1</span>
                  Option A: Use Edge InPrivate Window (Fastest)
                </div>
                <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1 pl-1">
                  <li>In Microsoft Edge, press <kbd className="px-1 py-0.5 bg-muted rounded border">Ctrl + Shift + N</kbd> to open an InPrivate window.</li>
                  <li>InPrivate automatically sets <strong>Tracking Prevention to Strict</strong> by default.</li>
                  <li>Navigate to <code className="bg-muted px-1 py-0.5 rounded text-foreground">http://localhost:5173/tracking-test</code>.</li>
                  <li>Press <kbd className="px-1 py-0.5 bg-muted rounded border">F12</kbd> (or right-click → Inspect) and open the <strong>Console</strong> tab.</li>
                </ol>
              </div>

              <div className="p-4 rounded-lg bg-card border space-y-2">
                <div className="font-semibold text-primary flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs font-bold">2</span>
                  Option B: Enable Strict Mode in Edge Settings
                </div>
                <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1 pl-1">
                  <li>In Edge URL bar, type <code className="bg-muted px-1 py-0.5 rounded text-foreground">edge://settings/privacy</code> and press Enter.</li>
                  <li>Under <strong>Tracking prevention</strong>, select the <strong>Strict</strong> radio card.</li>
                  <li>Return to this page (<code className="bg-muted px-1 py-0.5 rounded text-foreground">/tracking-test</code>) and reload (<kbd className="px-1 py-0.5 bg-muted rounded border">Ctrl + F5</kbd>).</li>
                  <li>Open Developer Tools (<kbd className="px-1 py-0.5 bg-muted rounded border">F12</kbd>) → Console.</li>
                </ol>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900 text-xs space-y-1.5 text-emerald-900 dark:text-emerald-200">
              <div className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Rayhar Staff Portal Safety Checklist:
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-muted-foreground dark:text-emerald-300">
                <li><strong>Authentication:</strong> Session tokens and Supabase auth listeners operate strictly on first-party domains.</li>
                <li><strong>Attendance & GPS:</strong> Punch-in, geolocation, and office geofencing endpoints remain completely unaffected.</li>
                <li><strong>Leave Management:</strong> Leave applications, approval workflows, and calendars are isolated from tracking tests.</li>
                <li><strong>Database:</strong> No database schemas, migrations, or tables are modified.</li>
                <li><strong>Removal:</strong> Delete <code className="font-mono">src/pages/TrackingTest.tsx</code> and the <code className="font-mono">/tracking-test</code> route in <code className="font-mono">src/App.tsx</code> when testing concludes.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
