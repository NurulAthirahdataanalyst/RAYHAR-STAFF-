import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, User, Clock, ArrowLeft } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import PageActions from "@/components/layout/PageActions";
import { API_BASE_URL } from "../../config/api";

const OUTSTATION_ROLES = ["hr_admin", "managing_director", "operation_manager", "finance_manager", "branch_leader", "head_of_department"];

// Fix leaflet icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function OutstationDashboard() {
  const { role, loading: roleLoading } = useRole();
  const navigate = useNavigate();

  const [staffToday, setStaffToday] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyUserId, setHistoryUserId] = useState<string | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!roleLoading && !OUTSTATION_ROLES.includes(role)) navigate("/");
  }, [role, roleLoading, navigate]);

  const fetchStaffToday = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/outstation/today`);
      const data = await res.json();
      if (data.success) {
        setStaffToday(data.staff || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaffToday();
    const interval = setInterval(fetchStaffToday, 60000);
    return () => clearInterval(interval);
  }, [fetchStaffToday]);

  const fetchHistory = async (userId: string) => {
    setHistoryUserId(userId);
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/outstation/history/${userId}`);
      const data = await res.json();
      if (data.success) {
        setHistoryLogs(data.history || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const centerPos = staffToday.length > 0 && staffToday[0].latitude ? 
    [staffToday[0].latitude, staffToday[0].longitude] : [3.1390, 101.6869];

  const polylinePositions = historyLogs.map(h => [h.latitude, h.longitude]);

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-purple-900" /></div>;

  return (
    <div className="animate-in fade-in duration-500 pb-12">
      <div className="py-2">
        <PageActions>
          {historyUserId && (
             <Button variant="outline" onClick={() => { setHistoryUserId(null); setHistoryLogs([]); }}>
               <ArrowLeft className="w-4 h-4 mr-2" /> Back to Live
             </Button>
          )}
        </PageActions>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6 mt-4">
          
          <div className="lg:col-span-4 flex flex-col gap-6">
            <Card className="border-0 shadow-sm rounded-[16px] bg-white dark:bg-card">
              <CardHeader className="px-5 py-4 border-b border-gray-50">
                <CardTitle className="text-[16px] font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-500" /> Outstation Staff Today
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex flex-col divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                {loading ? (
                   <div className="p-5 flex justify-center"><Loader2 className="animate-spin w-6 h-6 text-purple-600" /></div>
                ) : staffToday.length === 0 ? (
                   <div className="p-5 text-center text-sm text-gray-500">No staff outstation today</div>
                ) : (
                  staffToday.map((staff, i) => (
                    <div key={i} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                          {staff.full_name?.substring(0,2).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="text-[14px] font-bold text-gray-900">{staff.full_name}</p>
                          <p className="text-[12px] text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {staff.destination || 'Unknown Location'}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => fetchHistory(staff.user_id)}>
                        History
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {historyUserId && (
              <Card className="border-0 shadow-sm rounded-[16px] bg-white dark:bg-card">
                <CardHeader className="px-5 py-4 border-b border-gray-50">
                  <CardTitle className="text-[16px] font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-500" /> Location History
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 max-h-[400px] overflow-y-auto">
                   {loadingHistory ? (
                     <div className="p-5 flex justify-center"><Loader2 className="animate-spin w-6 h-6 text-orange-600" /></div>
                   ) : historyLogs.length === 0 ? (
                     <div className="p-5 text-center text-sm text-gray-500">No location history found</div>
                   ) : (
                     <div className="p-5 relative border-l-2 border-purple-100 ml-4 space-y-6">
                       {historyLogs.map((log, i) => (
                         <div key={i} className="relative pl-4">
                           <div className="absolute w-3 h-3 bg-purple-500 rounded-full -left-[23px] top-1"></div>
                           <p className="text-[12px] text-gray-500 mb-1">{new Date(log.timestamp).toLocaleTimeString()}</p>
                           <p className="text-[13px] font-medium text-gray-800">
                             Lat: {log.latitude.toFixed(4)}, Lng: {log.longitude.toFixed(4)}
                           </p>
                           <p className="text-[11px] text-gray-400">Accuracy: {log.accuracy}m</p>
                         </div>
                       ))}
                     </div>
                   )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-8 flex flex-col gap-6">
            <Card className="border-0 shadow-sm rounded-[16px] bg-white dark:bg-card flex-1 min-h-[600px] overflow-hidden flex flex-col">
              <CardHeader className="px-6 py-5 border-b border-gray-100 z-10 bg-white">
                <CardTitle className="text-[18px] font-bold text-gray-900">
                  {historyUserId ? "History Map" : "Live Location"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 relative">
                <MapContainer center={centerPos as any} zoom={12} style={{ height: '100%', width: '100%', minHeight: '600px' }}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  
                  {!historyUserId && staffToday.map((staff, i) => staff.latitude && staff.longitude ? (
                    <Marker key={i} position={[staff.latitude, staff.longitude]}>
                      <Popup>
                        <div className="text-center">
                          <p className="font-bold text-sm mb-1">{staff.full_name}</p>
                          <p className="text-xs text-gray-600 mb-2">{staff.destination}</p>
                          <Button size="sm" onClick={() => fetchHistory(staff.user_id)}>View History</Button>
                        </div>
                      </Popup>
                    </Marker>
                  ) : null)}

                  {historyUserId && historyLogs.length > 0 && (
                    <>
                      <Polyline positions={polylinePositions as any} color="purple" weight={4} opacity={0.7} />
                      {historyLogs.map((log, i) => (
                        <Marker key={i} position={[log.latitude, log.longitude]}>
                          <Popup>
                            <div className="text-center">
                              <p className="font-bold text-xs mb-1">{new Date(log.timestamp).toLocaleTimeString()}</p>
                              <p className="text-xs text-gray-600">Acc: {log.accuracy}m</p>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </>
                  )}
                </MapContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
