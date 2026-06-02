import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/config/api";

export function useShiftNotifications() {
  const { user } = useAuth();
  const notifiedLunchRef = useRef<string | null>(null);
  const notifiedShiftEndRef = useRef<string | null>(null);

  useEffect(() => {
    // Request notification permission if not already granted or denied
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const userId = user?.user_id || user?.id;
    if (!userId) return;

    const checkNotifications = async () => {
      if (!("Notification" in window) || Notification.permission !== "granted") {
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/attendance-status?empId=${userId}`);
        const data = await response.json();

        if (data.success && data.active && data.record) {
          const now = new Date();
          const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
          
          const clockInDate = new Date(data.record.clock_in);
          
          // 1. Check Lunch Hour (1:00 PM - 13:00)
          // Ensure it's between 13:00 and 13:59 and hasn't been notified today
          if (now.getHours() === 13 && notifiedLunchRef.current !== todayStr) {
            new Notification("Lunch Hour!", {
              body: "It's 1:00 PM. Enjoy your 1-hour lunch break!",
              icon: "/vite.svg" // Fallback icon
            });
            notifiedLunchRef.current = todayStr;
          }

          // 2. Check 8 Hours Working Time (9 Hours total elapsed)
          const elapsedMs = Date.now() - clockInDate.getTime();
          const nineHoursMs = 9 * 60 * 60 * 1000;
          
          if (elapsedMs >= nineHoursMs && notifiedShiftEndRef.current !== todayStr) {
            new Notification("Shift Completed!", {
              body: "You have completed your 8 hours of work (plus 1 hour lunch). You can clock out now!",
              icon: "/vite.svg" // Fallback icon
            });
            notifiedShiftEndRef.current = todayStr;
          }
        }
      } catch (error) {
        console.error("Failed to check shift notifications:", error);
      }
    };

    // Check immediately, then every 1 minute (60000 ms)
    checkNotifications();
    const intervalId = setInterval(checkNotifications, 60000);

    return () => clearInterval(intervalId);
  }, [user]);
}
