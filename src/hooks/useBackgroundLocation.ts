import { useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { useAuth } from "@/contexts/AuthContext";

export function useBackgroundLocation() {
  const { user } = useAuth();
  
  useEffect(() => {
    const userId = user?.id || user?.user_id;
    if (!userId) return;
    
    // Function to fetch and send location
    const updateLocation = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude, accuracy } = position.coords;
              await fetch(`${API_BASE_URL}/api/employee-location-update`, {
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
            } catch (err) {
              console.error("Failed to update background location", err);
            }
          },
          (err) => {
            console.error("Background geolocation error:", err);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 10000,
            timeout: 5000
          }
        );
      }
    };

    // Update immediately on mount
    updateLocation();

    // Then update every 3 minutes (3600000 ms)
    const interval = setInterval(updateLocation, 3600000);

    return () => clearInterval(interval);
  }, [user]);
}
