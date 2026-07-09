import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function OutstationAnalytics() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-12 flex flex-col items-center pt-24">
      
      {/* 404 Image/Icon Area */}
      <div className="relative mb-8 flex flex-col items-center justify-center">
        <div className="w-48 h-48 rounded-full bg-pink-50 flex items-center justify-center mb-6 relative">
            <div className="absolute inset-0 rounded-full border-[12px] border-pink-100/50"></div>
            <div className="absolute inset-4 rounded-full border-[12px] border-pink-200/50"></div>
            <h1 className="text-7xl font-black text-pink-600 tracking-tighter z-10 drop-shadow-sm">404</h1>
        </div>
        <p className="text-[11px] font-bold tracking-[0.2em] text-purple-900 uppercase">Page Not Found</p>
      </div>

      {/* Text Area */}
      <h2 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">Oops, something went wrong</h2>
      <p className="text-gray-500 max-w-sm text-center mb-10 leading-relaxed font-medium">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>

      {/* Button */}
      <Button 
        onClick={() => navigate("/")}
        className="bg-[#7B0099] hover:bg-[#5c0073] text-white px-8 py-5 rounded-md font-semibold tracking-wide text-sm"
      >
        Back to Dashboard
      </Button>

    </div>
  );
}

