import { useEffect, useRef } from "react";
import { API_BASE_URL } from "@/config/api";
import { useAuth } from "@/contexts/AuthContext";

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

export function useBackgroundLocation() {
  const { user } = useAuth();
  const isUpdatingRef = useRef(false);
  
  useEffect(() => {
    const userId = user?.id || user?.user_id;
    if (!userId) return;
    
    // Function to check if 30 minutes have elapsed and send location update
    const checkAndUpdateLocation = () => {
      if (isUpdatingRef.current) return;

      const storageKey = `last_bg_location_update_${userId}`;
      const lastUpdateStr = localStorage.getItem(storageKey);
      const lastUpdate = lastUpdateStr ? parseInt(lastUpdateStr, 10) : 0;
      const now = Date.now();

      // Only send if at least 30 minutes have elapsed since the last recorded update
      if (lastUpdate && (now - lastUpdate) < THIRTY_MINUTES_MS) {
        return;
      }

      if ("geolocation" in navigator) {
        isUpdatingRef.current = true;
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude, accuracy } = position.coords;
              const res = await fetch(`${API_BASE_URL}/api/employee-location-update`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  user_id: userId,
                  latitude,
                  longitude,
                  accuracy,
                  timestamp: new Date().toISOString()
                })
              });
              if (res.ok) {
                localStorage.setItem(storageKey, Date.now().toString());
              }
            } catch (err) {
              console.error("Failed to update background location", err);
            } finally {
              isUpdatingRef.current = false;
            }
          },
          (err) => {
            console.error("Background geolocation error:", err);
            isUpdatingRef.current = false;
          },
          {
            enableHighAccuracy: true,
            maximumAge: 10000,
            timeout: 8000
          }
        );
      }
    };

    // Check on mount (only executes if 30 minutes have passed since last update)
    checkAndUpdateLocation();

    // Check periodically every minute so when 30 minutes have elapsed, it sends the update
    const interval = setInterval(checkAndUpdateLocation, 60000);

    return () => clearInterval(interval);
  }, [user]);
}
