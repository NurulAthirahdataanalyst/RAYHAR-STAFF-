import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/config/api";

export default function UpdateLocationButton({ userId }: { userId?: string }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleUpdate = async () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation unavailable", description: "Your browser doesn't support geolocation." });
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy;
        const body = { user_id: userId, latitude: lat, longitude: lng, accuracy: acc, timestamp: new Date().toISOString() };
        const res = await fetch(`${API_BASE_URL}/api/employee-location-update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const j = await res.json();
        if (j && j.success) {
          toast({ title: 'Location sent', description: 'Your current location was updated.' });
        } else {
          toast({ title: 'Update failed', description: j?.error || 'Unknown error' });
        }
      } catch (e: any) {
        console.error('Update location error', e);
        toast({ title: 'Update failed', description: e.message || String(e) });
      } finally {
        setLoading(false);
      }
    }, (err) => {
      setLoading(false);
      toast({ title: 'Geolocation error', description: err.message || 'Unable to retrieve location' });
    }, { enableHighAccuracy: true, timeout: 15000 });
  };

  return (
    <Button onClick={handleUpdate} disabled={loading} variant="outline" className="flex items-center gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
      Update Location
    </Button>
  );
}
