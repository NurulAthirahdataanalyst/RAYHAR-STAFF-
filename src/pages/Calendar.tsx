import { useState, useEffect, useMemo } from "react";
import { format, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths } from "date-fns";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { exportToCSV } from "@/utils/export";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useLocation } from "react-router-dom";
import { API_BASE_URL } from "@/config/api";
import { toast } from "sonner";
import { 
  Plus, 
  MapPin, 
  Clock, 
  FileText, 
  Bell, 
  Calendar as CalendarIcon,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  ChevronDown
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Types
type PersonalNote = {
  id: number;
  date: string;
  note_text: string;
  type: string;
  created_at: string;
};

type Holiday = {
  date: string;
  name: string;
};

type CompanyLeaveEvent = {
  id: number;
  leave_name: string;
  start_date: string;
  end_date: string;
  applies_to: string;
  branch_id: string | null;
  department_id: string | null;
  leave_type: string;
  is_paid: boolean;
};

type AttendanceLog = {
  id: number;
  clock_in: string;
  clock_out: string | null;
  location_in: string;
};

type CustomCategory = {
  id: string;
  name: string;
  color: string;
};

export default function Calendar() {
  const { user } = useAuth();
  const { role } = useRole();
  const isHR = role === 'hr_admin';
  const location = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [companyLeaves, setCompanyLeaves] = useState<CompanyLeaveEvent[]>([]);
  
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  
  // New Event Form State
  const [eventName, setEventName] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [eventLocation, setEventLocation] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventType, setEventType] = useState("reminder");
  const [selectedEvent, setSelectedEvent] = useState<PersonalNote | null>(null);
  const [selectedCompanyLeave, setSelectedCompanyLeave] = useState<CompanyLeaveEvent | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Custom Categories State
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(() => {
    try {
      const saved = localStorage.getItem('calendarCustomCategories');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('calendarCustomCategories', JSON.stringify(customCategories));
  }, [customCategories]);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("bg-blue-500");
  const [categoryToDelete, setCategoryToDelete] = useState<CustomCategory | null>(null);
  
  const [deletedDefaultCategories, setDeletedDefaultCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('calendarDeletedDefaults');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('calendarDeletedDefaults', JSON.stringify(deletedDefaultCategories));
  }, [deletedDefaultCategories]);

  const [loading, setLoading] = useState(true);

  const CATEGORY_COLORS: Record<string, string> = {
    'bg-red-500': 'bg-red-500/10 border-l-2 border-red-500 text-red-700 dark:text-red-400',
    'bg-orange-500': 'bg-orange-500/10 border-l-2 border-orange-500 text-orange-700 dark:text-orange-400',
    'bg-yellow-500': 'bg-yellow-500/10 border-l-2 border-yellow-500 text-yellow-700 dark:text-yellow-400',
    'bg-green-500': 'bg-green-500/10 border-l-2 border-green-500 text-green-700 dark:text-green-400',
    'bg-blue-500': 'bg-blue-500/10 border-l-2 border-blue-500 text-blue-700 dark:text-blue-400',
    'bg-purple-500': 'bg-purple-500/10 border-l-2 border-purple-500 text-purple-700 dark:text-purple-400',
    'bg-amber-700': 'bg-amber-700/10 border-l-2 border-amber-700 text-amber-900 dark:text-amber-500',
    'bg-slate-800': 'bg-slate-800/10 border-l-2 border-slate-800 text-slate-900 dark:text-slate-300',
  };

  const fetchCalendarData = async () => {
    try {
      const currentUserId = user?.user_id || user?.id;
      if (!currentUserId) return;

      const notesRes = await fetch(`${API_BASE_URL}/api/personal-notes?userId=${currentUserId}`);
      const notesData = await notesRes.json();
      if (notesData.success) setNotes(notesData.notes);

      const holRes = await fetch(`${API_BASE_URL}/api/holidays`);
      const holData = await holRes.json();
      if (holData.success) setHolidays(holData.holidays);

      const attRes = await fetch(`${API_BASE_URL}/api/attendance/history?userId=${currentUserId}`);
      const attData = await attRes.json();
      if (attData.success) setAttendance(attData.history);

      // Fetch company leaves and filter for this user
      const clRes = await fetch(`${API_BASE_URL}/api/company-leaves`);
      const clData = await clRes.json();
      if (clData.success && clData.leaves) {
        const userBranch = user?.branch || '';
        const userDept = user?.department || '';
        const relevant = clData.leaves.filter((cl: CompanyLeaveEvent) => {
          if (cl.applies_to === 'all') return true;
          if (cl.applies_to === 'branch' && cl.branch_id) {
            return cl.branch_id.split(',').map((s: string) => s.trim()).includes(userBranch);
          }
          if (cl.applies_to === 'department' && cl.department_id) {
            const depts = cl.department_id.split(',').map((s: string) => s.trim());
            const normEmp = userDept.toLowerCase().replace(/\bdepartment\b/g, '').trim();
            return depts.some((d: string) => {
              const normD = d.toLowerCase().replace(/\bdepartment\b/g, '').trim();
              return normEmp === normD || userDept === d;
            });
          }
          return false;
        });
        setCompanyLeaves(relevant);
      }

    } catch (error) {
      console.error("Error fetching calendar data:", error);
      toast.error("Failed to load calendar data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCalendarData();
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dateParam = params.get("date");
    if (dateParam) {
      const parsedDate = new Date(dateParam);
      if (!isNaN(parsedDate.getTime())) {
        setSelectedDate(parsedDate);
      }
    }
  }, [location.search]);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) {
      toast.error("Event Name is required");
      return;
    }

    // Construct the note text based on form fields
    let finalNoteText = eventName;
    if (startDate || endDate) {
      if (startDate && endDate) {
        if (isAllDay) {
          finalNoteText += `\nStarts: ${startDate} All Day`;
          finalNoteText += `\nEnds: ${endDate} All Day`;
        } else {
          finalNoteText += `\nStarts: ${startDate} ${startTime}`;
          finalNoteText += `\nEnds: ${endDate} ${endTime}`;
        }
      } else if (!isAllDay && (startTime || endTime)) {
        finalNoteText += `\nTime: ${startTime} - ${endTime}`;
      }
    }
    if (eventLocation) {
      finalNoteText += `\nLocation: ${eventLocation}`;
    }
    if (eventDescription) {
      finalNoteText += `\n\n${eventDescription}`;
    }

    try {
      const currentUserId = user?.user_id || user?.id;
      if (!currentUserId) return;
      const res = await fetch(`${API_BASE_URL}/api/personal-notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: currentUserId,
          date: startDate,
          note_text: finalNoteText,
          type: eventType
        })
      });

      const data = await res.json();
      if (data.success) {
        setNotes([...notes, data.note]);
        setEventName("");
        setEventDescription("");
        setEventLocation("");
        setIsAddEventModalOpen(false);
        toast.success("Event added successfully");
      } else {
        toast.error(data.error || "Failed to add event");
      }
    } catch (error) {
      toast.error("Failed to add event");
    }
  };

  const handleDeleteNote = async (id: number) => {
    try {
      const currentUserId = user?.user_id || user?.id;
      if (!currentUserId) return;
      const res = await fetch(`${API_BASE_URL}/api/personal-notes/${id}?userId=${currentUserId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        setNotes(notes.filter(n => n.id !== id));
        toast.success("Event deleted");
      } else {
        toast.error(data.error || "Failed to delete event");
      }
    } catch (error) {
      toast.error("Failed to delete event");
    }
  };

  const handleDeleteCompanyLeave = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/company-leaves/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Company leave deleted successfully");
        fetchCalendarData();
      } else {
        toast.error(data.error || "Failed to delete company leave");
      }
    } catch (error) {
      toast.error("Failed to delete company leave");
    }
  };

  // Calendar Grid Logic
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(monthStart);
  const gridStartDate = startOfWeek(monthStart);
  const gridEndDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: gridStartDate,
    end: gridEndDate
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleExportCalendar = () => {
    const exportData: any[] = [];

    // Add holidays
    holidays
      .filter(holiday => isSameMonth(new Date(holiday.date), selectedDate))
      .forEach(holiday => {
      exportData.push({
        'Event Title': holiday.name,
        'Start Date': format(new Date(holiday.date), "dd/MM/yyyy"),
        'Start Time': 'All Day',
        'End Date': format(new Date(holiday.date), "dd/MM/yyyy"),
        'End Time': 'All Day',
        'Category': 'Holiday',
        'Location': '-',
        'Notes': '-'
      });
    });

    // Add notes
    notes
      .filter(note => isSameMonth(new Date(note.date), selectedDate))
      .forEach(note => {
      const lines = note.note_text.split('\n');
      const title = lines[0];
      const startsLine = lines.find(l => l.startsWith('Starts: '));
      const endsLine = lines.find(l => l.startsWith('Ends: '));
      const timeLine = lines.find(l => l.startsWith('Time: '));
      const locationLine = lines.find(l => l.startsWith('Location: '));
      const descStartIndex = lines.findIndex((l, i) => i > 0 && !l.startsWith('Starts: ') && !l.startsWith('Ends: ') && !l.startsWith('Time: ') && !l.startsWith('Location: ') && l.trim() !== '');
      const description = descStartIndex !== -1 ? lines.slice(descStartIndex).join('\n').trim() : '-';

      let startDate = format(new Date(note.date), "dd/MM/yyyy");
      let endDate = format(new Date(note.date), "dd/MM/yyyy");
      let startTime = '-';
      let endTime = '-';

      if (startsLine && endsLine) {
        const modalStarts = startsLine.replace('Starts: ', '');
        const modalEnds = endsLine.replace('Ends: ', '');
        const startParts = modalStarts.split(' ');
        const endParts = modalEnds.split(' ');
        
        try {
          startDate = startParts[0] ? format(new Date(startParts[0]), "dd/MM/yyyy") : startDate;
          endDate = endParts[0] ? format(new Date(endParts[0]), "dd/MM/yyyy") : endDate;

          if (startParts[1] === 'All' && startParts[2] === 'Day') {
            startTime = 'All Day';
            endTime = 'All Day';
          } else if (startParts[1] && endParts[1]) {
            startTime = format(new Date(`2000-01-01T${startParts[1]}`), "hh:mm a");
            endTime = format(new Date(`2000-01-01T${endParts[1]}`), "hh:mm a");
          }
        } catch(e) {}
      } else if (timeLine) {
        const modalTime = timeLine.replace('Time: ', '');
        const match = modalTime.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
        if (match) {
          try {
            startTime = format(new Date(`2000-01-01T${match[1]}`), "hh:mm a");
            endTime = format(new Date(`2000-01-01T${match[2]}`), "hh:mm a");
          } catch(e) {}
        } else {
          startTime = modalTime;
          endTime = modalTime;
        }
      }

      let categoryName = note.type.charAt(0).toUpperCase() + note.type.slice(1);
      const customCat = customCategories.find(c => c.id === note.type);
      if (customCat) categoryName = customCat.name;
      if (note.type.startsWith('custom-') && !customCat) categoryName = 'Note';

      exportData.push({
        'Event Title': title,
        'Start Date': startDate,
        'Start Time': startTime,
        'End Date': endDate,
        'End Time': endTime,
        'Category': categoryName,
        'Location': locationLine ? locationLine.replace('Location: ', '') : '-',
        'Notes': description
      });
    });

    exportToCSV(exportData, 'Calendar_Events');
  };

  return (
    <div className="w-full min-h-screen pb-12">
      
      {/* HEADER / TOP BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-foreground">
          Calendar
        </h1>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">

          <ExportDropdown 
            onExportCSV={handleExportCalendar} 
            onExportPDF={() => window.print()} 
          />
          <Button 
            onClick={() => {
              setStartDate(format(selectedDate, "yyyy-MM-dd"));
              setEndDate(format(selectedDate, "yyyy-MM-dd"));
              setIsAddEventModalOpen(true);
            }}
            className="bg-[#ff5b37] hover:bg-[#e04526] text-white gap-2 font-bold px-6 shadow-sm shadow-[#ff5b37]/20"
          >
            Create
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Sidebar Calendar & Events */}
        <div className="lg:col-span-3 space-y-6">
          
          <Card className="border-border/50 bg-card overflow-hidden rounded-[16px] shadow-sm">
            <div className="p-4">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                className="w-full"
                classNames={{
                  months: "w-full",
                  month: "w-full space-y-4",
                  caption: "flex justify-center pt-1 relative items-center mb-4",
                  caption_label: "text-sm font-bold",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex w-full justify-between mb-2",
                  head_cell: "text-muted-foreground rounded-md w-9 font-bold text-[11px] uppercase",
                  row: "flex w-full mt-2 justify-between",
                  cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-[#ff5b37]/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day: "h-9 w-9 p-0 font-medium aria-selected:opacity-100 hover:bg-muted rounded-md transition-all",
                  day_selected: "bg-[#ff5b37] text-white hover:bg-[#e04526] hover:text-white focus:bg-[#ff5b37] focus:text-white",
                  day_today: "bg-[#7B0099]/10 text-[#7B0099] font-bold",
                  day_outside: "text-muted-foreground opacity-50",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                  day_hidden: "invisible",
                }}
              />
            </div>
          </Card>

          <Card className="border-border/50 bg-card overflow-hidden rounded-[16px] shadow-sm">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground">Event Categories</h3>
                  {activeFilter && (
                    <button 
                      onClick={() => setActiveFilter(null)}
                      className="text-[10px] uppercase tracking-wider font-bold text-[#7B0099] bg-[#7B0099]/10 hover:bg-[#7B0099]/20 px-2 py-0.5 rounded-md transition-colors"
                    >
                      Show All
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => setIsAddCategoryOpen(true)}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  aria-label="Add Category"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Click to filter, or add an event to calendar</p>
              <div className="space-y-3">
                {!deletedDefaultCategories.includes('note') && (
                  <div 
                    onClick={() => setActiveFilter(activeFilter === 'note' ? null : 'note')}
                    className={`group flex items-center justify-between px-4 py-2.5 rounded-lg font-bold text-sm cursor-pointer transition-colors ${activeFilter === 'note' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/30' : 'bg-blue-500/5 text-blue-700 dark:text-blue-400 hover:bg-blue-500/10'}`}>
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-blue-500 border border-blue-600/20" /> Notes
                    </div>
                    <div className="flex items-center gap-1">
                      {activeFilter === 'note' && <X className="w-4 h-4 opacity-50 hover:opacity-100" />}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCategoryToDelete({ id: 'note', name: 'Notes', color: 'bg-blue-500' });
                        }}
                        className={`p-1 rounded transition-all ${activeFilter === 'note' ? 'text-blue-700/60 hover:text-red-500 hover:bg-blue-500/10' : 'opacity-0 group-hover:opacity-100 text-blue-700/60 hover:text-red-500 hover:bg-blue-500/10'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
                {!deletedDefaultCategories.includes('reminder') && (
                  <div 
                    onClick={() => setActiveFilter(activeFilter === 'reminder' ? null : 'reminder')}
                    className={`group flex items-center justify-between px-4 py-2.5 rounded-lg font-bold text-sm cursor-pointer transition-colors ${activeFilter === 'reminder' ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30' : 'bg-yellow-500/5 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/10'}`}>
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-yellow-500 border border-yellow-600/20" /> Reminders
                    </div>
                    <div className="flex items-center gap-1">
                      {activeFilter === 'reminder' && <X className="w-4 h-4 opacity-50 hover:opacity-100" />}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCategoryToDelete({ id: 'reminder', name: 'Reminders', color: 'bg-yellow-500' });
                        }}
                        className={`p-1 rounded transition-all ${activeFilter === 'reminder' ? 'text-yellow-700/60 hover:text-red-500 hover:bg-yellow-500/10' : 'opacity-0 group-hover:opacity-100 text-yellow-700/60 hover:text-red-500 hover:bg-yellow-500/10'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
                {!deletedDefaultCategories.includes('meeting') && (
                  <div 
                    onClick={() => setActiveFilter(activeFilter === 'meeting' ? null : 'meeting')}
                    className={`group flex items-center justify-between px-4 py-2.5 rounded-lg font-bold text-sm cursor-pointer transition-colors ${activeFilter === 'meeting' ? 'bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30' : 'bg-green-500/5 text-green-700 dark:text-green-400 hover:bg-green-500/10'}`}>
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-green-500 border border-green-600/20" /> Meetings
                    </div>
                    <div className="flex items-center gap-1">
                      {activeFilter === 'meeting' && <X className="w-4 h-4 opacity-50 hover:opacity-100" />}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCategoryToDelete({ id: 'meeting', name: 'Meetings', color: 'bg-green-500' });
                        }}
                        className={`p-1 rounded transition-all ${activeFilter === 'meeting' ? 'text-green-700/60 hover:text-red-500 hover:bg-green-500/10' : 'opacity-0 group-hover:opacity-100 text-green-700/60 hover:text-red-500 hover:bg-green-500/10'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
                {!deletedDefaultCategories.includes('holiday') && (
                  <div 
                    onClick={() => setActiveFilter(activeFilter === 'holiday' ? null : 'holiday')}
                    className={`group flex items-center justify-between px-4 py-2.5 rounded-lg font-bold text-sm cursor-pointer transition-colors ${activeFilter === 'holiday' ? 'bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30' : 'bg-red-500/5 text-red-700 dark:text-red-400 hover:bg-red-500/10'}`}>
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-red-500 border border-red-600/20" /> Holidays
                    </div>
                    <div className="flex items-center gap-1">
                      {activeFilter === 'holiday' && <X className="w-4 h-4 opacity-50 hover:opacity-100" />}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCategoryToDelete({ id: 'holiday', name: 'Holidays', color: 'bg-red-500' });
                        }}
                        className={`p-1 rounded transition-all ${activeFilter === 'holiday' ? 'text-red-700/60 hover:text-red-500 hover:bg-red-500/10' : 'opacity-0 group-hover:opacity-100 text-red-700/60 hover:text-red-500 hover:bg-red-500/10'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
                {!deletedDefaultCategories.includes('attendance') && (
                  <div 
                    onClick={() => setActiveFilter(activeFilter === 'attendance' ? null : 'attendance')}
                    className={`group flex items-center justify-between px-4 py-2.5 rounded-lg font-bold text-sm cursor-pointer transition-colors ${activeFilter === 'attendance' ? 'bg-[#7B0099]/20 text-[#7B0099] dark:text-[#a000c7] border border-[#7B0099]/30' : 'bg-[#7B0099]/5 text-[#7B0099] dark:text-[#a000c7] hover:bg-[#7B0099]/10'}`}>
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-[#7B0099] border border-[#7B0099]/20" /> Attendance
                    </div>
                    <div className="flex items-center gap-1">
                      {activeFilter === 'attendance' && <X className="w-4 h-4 opacity-50 hover:opacity-100" />}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCategoryToDelete({ id: 'attendance', name: 'Attendance', color: 'bg-[#7B0099]' });
                        }}
                        className={`p-1 rounded transition-all ${activeFilter === 'attendance' ? 'text-[#7B0099]/60 hover:text-red-500 hover:bg-[#7B0099]/10' : 'opacity-0 group-hover:opacity-100 text-[#7B0099]/60 hover:text-red-500 hover:bg-[#7B0099]/10'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
                {companyLeaves.length > 0 && (
                  <div 
                    onClick={() => setActiveFilter(activeFilter === 'company_leave' ? null : 'company_leave')}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-lg font-bold text-sm cursor-pointer transition-colors ${activeFilter === 'company_leave' ? 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/30' : 'bg-purple-500/5 text-purple-700 dark:text-purple-400 hover:bg-purple-500/10'}`}>
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-purple-500 border border-purple-600/20" /> Company Leave
                    </div>
                    <div className="flex items-center gap-1">
                      {activeFilter === 'company_leave' && <X className="w-4 h-4 opacity-50 hover:opacity-100" />}
                    </div>
                  </div>
                )}
                {customCategories.map(cat => (
                  <div 
                    key={cat.id}
                    onClick={() => setActiveFilter(activeFilter === cat.id ? null : cat.id)}
                    className={`group flex items-center justify-between px-4 py-2.5 rounded-lg font-bold text-sm cursor-pointer transition-colors ${activeFilter === cat.id ? 'bg-muted border border-border' : 'hover:bg-muted/50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${cat.color}`} /> {cat.name}
                    </div>
                    <div className="flex items-center gap-1">
                      {activeFilter === cat.id && <X className="w-4 h-4 opacity-50 hover:opacity-100" />}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCategoryToDelete(cat);
                        }}
                        className={`p-1 rounded transition-all ${activeFilter === cat.id ? 'text-muted-foreground hover:text-red-500 hover:bg-black/5 dark:hover:bg-white/10' : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 hover:bg-black/5 dark:hover:bg-white/10'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {isAddCategoryOpen && (
                <div className="mt-4 p-4 bg-muted/30 rounded-xl border border-border space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Category Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Project Launch"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff5b37] focus:ring-1 focus:ring-[#ff5b37] transition-all"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Label Color</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(CATEGORY_COLORS).map(color => (
                        <div 
                          key={color}
                          onClick={() => setNewCategoryColor(color)}
                          className={`w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-110 ${color} ${newCategoryColor === color ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-slate-300 shadow-sm' : 'opacity-80 hover:opacity-100'}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                    <button 
                      onClick={() => setIsAddCategoryOpen(false)} 
                      className="px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        if (newCategoryName.trim()) {
                          setCustomCategories([...customCategories, { id: `custom-${Date.now()}`, name: newCategoryName.trim(), color: newCategoryColor }]);
                          setIsAddCategoryOpen(false);
                          setNewCategoryName("");
                        }
                      }}
                      className="px-4 py-1.5 text-xs font-bold bg-[#ff5b37] text-white rounded-md shadow-sm hover:bg-[#e04526] transition-colors"
                    >
                      Add Category
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>

        </div>

        {/* RIGHT COLUMN: MAIN CALENDAR GRID */}
        <div className="lg:col-span-9 flex flex-col h-[800px] bg-card border border-border/60 rounded-[16px] shadow-sm overflow-hidden">
          
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b border-border/60 gap-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" className="h-9 px-4 font-bold bg-muted/30" onClick={() => setSelectedDate(new Date())}>Today</Button>
              <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5 border border-border/50">
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white dark:bg-card dark:hover:bg-card" onClick={() => setSelectedDate(subMonths(selectedDate, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white dark:bg-card dark:hover:bg-card" onClick={() => setSelectedDate(addMonths(selectedDate, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <h2 className="text-lg font-bold text-foreground w-full text-center sm:w-auto">
              {format(selectedDate, "MMMM yyyy")}
            </h2>
            
            <div className="flex items-center bg-muted/40 rounded-lg p-1 border border-border/50 w-full justify-center sm:w-auto">
              <button className="px-5 py-1.5 rounded-md bg-[#ff5b37] text-white text-sm font-bold shadow-sm transition-colors">Month</button>
              <button className="px-5 py-1.5 rounded-md text-muted-foreground hover:text-foreground text-sm font-bold transition-colors">Week</button>
              <button className="px-5 py-1.5 rounded-md text-muted-foreground hover:text-foreground text-sm font-bold transition-colors">Day</button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 border-b border-border/60 bg-[#7B0099]">
            {weekDays.map(day => (
              <div key={day} className="py-3 text-center text-xs font-bold text-white uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
          
          <div className="flex-1 grid grid-cols-7 bg-border/60 gap-px auto-rows-fr">
            {calendarDays.map((day, i) => {
              const isCurrentMonth = isSameMonth(day, selectedDate);
              const dayStr = format(day, 'yyyy-MM-dd');
              
              const isNoteActiveOnDate = (note: PersonalNote, targetDateStr: string) => {
                const noteDate = note.date.split('T')[0];
                const lines = note.note_text.split('\n');
                const startsLine = lines.find(l => l.startsWith('Starts: '));
                const endsLine = lines.find(l => l.startsWith('Ends: '));
                
                let start = noteDate;
                let end = noteDate;
                
                if (startsLine && endsLine) {
                  const modalStarts = startsLine.replace('Starts: ', '');
                  const modalEnds = endsLine.replace('Ends: ', '');
                  const startParts = modalStarts.split(' ');
                  const endParts = modalEnds.split(' ');
                  
                  if (startParts[0]) start = startParts[0];
                  if (endParts[0]) end = endParts[0];
                }
                
                return targetDateStr >= start && targetDateStr <= end;
              };

              const dayNotes = notes.filter(n => isNoteActiveOnDate(n, dayStr) && (!activeFilter || activeFilter === n.type));
              const dayHolidays = holidays.filter(h => h.date === dayStr && (!activeFilter || activeFilter === 'holiday'));
              const dayAttendance = attendance.filter(a => a.clock_in && format(new Date(a.clock_in), 'yyyy-MM-dd') === dayStr && (!activeFilter || activeFilter === 'attendance'));
              const dayCompanyLeaves = companyLeaves.filter(cl => {
                const start = cl.start_date?.split('T')[0] || cl.start_date;
                const end = cl.end_date?.split('T')[0] || cl.end_date;
                return dayStr >= start && dayStr <= end && (!activeFilter || activeFilter === 'company_leave');
              });
              
              return (
                <div 
                  key={i} 
                  className={`bg-card p-1.5 flex flex-col transition-colors hover:bg-muted/10 ${!isCurrentMonth ? 'bg-muted/10 opacity-70' : ''}`}
                >
                  <div className="text-right mb-1.5 p-1">
                    <span className={`text-sm font-bold inline-flex items-center justify-center w-7 h-7 rounded-full ${isSameDay(day, new Date()) ? 'bg-[#ff5b37] text-white shadow-sm' : 'text-foreground/80 hover:bg-muted'}`}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-1.5 no-scrollbar px-0.5">
                    
                    {/* Holidays */}
                    {dayHolidays.map((h, idx) => (
                      <div key={`hol-${idx}`} className="px-2 py-1 rounded-[4px] bg-red-500/10 border-l-2 border-red-500 text-[11px] font-bold text-red-700 dark:text-red-400 truncate shadow-sm">
                        {h.name}
                      </div>
                    ))}

                    {/* Company Leaves */}
                    {dayCompanyLeaves.map((cl, idx) => (
                      <div
                        key={`cl-${idx}`}
                        onClick={() => setSelectedCompanyLeave(cl)}
                        className="px-2 py-1 rounded-[4px] bg-purple-500/10 border-l-2 border-purple-500 text-[11px] font-bold text-purple-700 dark:text-purple-400 truncate shadow-sm cursor-pointer hover:bg-purple-500/20 transition-colors"
                        title={`${cl.leave_name} (${cl.leave_type})`}
                      >
                        🏢 {cl.leave_name}
                      </div>
                    ))}
                    
                    {/* Attendance */}
                    {dayAttendance.map((a, idx) => {
                      const timeStr = new Date(a.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={`att-${idx}`} className="px-2 py-1 rounded-[4px] bg-[#7B0099]/10 border-l-2 border-[#7B0099] text-[11px] font-bold text-[#7B0099] dark:text-purple-400 truncate shadow-sm">
                          In: {timeStr}
                        </div>
                      )
                    })}

                    {/* Notes, Reminders, Meetings */}
                    {dayNotes.map((note) => {
                      const isReminder = note.type === 'reminder';
                      const isMeeting = note.type === 'meeting';
                      const customCat = customCategories.find(c => c.id === note.type);
                      
                      let colorClass = 'bg-blue-500/10 border-l-2 border-blue-500 text-blue-700 dark:text-blue-400';
                      if (isReminder) colorClass = 'bg-yellow-500/10 border-l-2 border-yellow-500 text-yellow-700 dark:text-yellow-400';
                      if (isMeeting) colorClass = 'bg-green-500/10 border-l-2 border-green-500 text-green-700 dark:text-green-400';
                      if (customCat) colorClass = CATEGORY_COLORS[customCat.color] || colorClass;
                      
                      // Extract title (first line) for pill
                      const title = note.note_text.split('\n')[0];

                      return (
                        <div 
                          key={note.id} 
                          onClick={(e) => { e.stopPropagation(); setSelectedEvent(note); }}
                          className={`px-2 py-1 rounded-[4px] text-[11px] font-bold truncate shadow-sm relative group cursor-pointer hover:brightness-95 ${colorClass}`}
                        >
                          {title}
                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add New Event Modal Overlay */}
      {isAddEventModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in transition-all duration-300">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border/60 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border/60">
              <h3 className="font-bold text-lg text-foreground">Add New Event</h3>
              <button 
                onClick={() => setIsAddEventModalOpen(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddEvent} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Event Name</label>
                <input
                  type="text"
                  required
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#ff5b37] focus:ring-1 focus:ring-[#ff5b37] transition-all"
                  value={eventName}
                  onChange={e => setEventName(e.target.value)}
                  placeholder="e.g. Design System Review"
                />
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="allDay" 
                  checked={isAllDay} 
                  onChange={e => setIsAllDay(e.target.checked)} 
                  className="rounded border-border text-[#ff5b37] focus:ring-[#ff5b37] w-4 h-4 cursor-pointer"
                />
                <label htmlFor="allDay" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">All day</label>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <label className="w-16 text-xs font-bold text-muted-foreground uppercase tracking-wider">Starts</label>
                  <div className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="date"
                        required
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-[13px] sm:text-sm text-foreground focus:outline-none focus:border-[#ff5b37] focus:ring-1 focus:ring-[#ff5b37] transition-all"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                      />
                    </div>
                    {!isAllDay && (
                      <div className="relative flex-1">
                        <input
                          type="time"
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-[13px] sm:text-sm text-foreground focus:outline-none focus:border-[#ff5b37] focus:ring-1 focus:ring-[#ff5b37] transition-all"
                          value={startTime}
                          onChange={e => setStartTime(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="w-16 text-xs font-bold text-muted-foreground uppercase tracking-wider">Ends</label>
                  <div className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="date"
                        required
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-[13px] sm:text-sm text-foreground focus:outline-none focus:border-[#ff5b37] focus:ring-1 focus:ring-[#ff5b37] transition-all"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                      />
                    </div>
                    {!isAllDay && (
                      <div className="relative flex-1">
                        <input
                          type="time"
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-[13px] sm:text-sm text-foreground focus:outline-none focus:border-[#ff5b37] focus:ring-1 focus:ring-[#ff5b37] transition-all"
                          value={endTime}
                          onChange={e => setEndTime(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Event Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#ff5b37] focus:ring-1 focus:ring-[#ff5b37] transition-all"
                    value={eventLocation}
                    onChange={e => setEventLocation(e.target.value)}
                    placeholder="e.g. Meeting Room A or Google Meet link"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Descriptions</label>
                <textarea
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-[#ff5b37] focus:ring-1 focus:ring-[#ff5b37] transition-all min-h-[100px] resize-none"
                  value={eventDescription}
                  onChange={e => setEventDescription(e.target.value)}
                  placeholder="Add any additional details or context here..."
                />
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-border/60">
                <div className="flex-1">
                  <select 
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:border-[#ff5b37] focus:ring-1 focus:ring-[#ff5b37] transition-all"
                    value={eventType}
                    onChange={e => setEventType(e.target.value)}
                  >
                    <option value="reminder">Reminder</option>
                    <option value="note">Note</option>
                    <option value="meeting">Meeting</option>
                    {customCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <Button type="button" variant="ghost" onClick={() => setIsAddEventModalOpen(false)} className="font-bold">
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#ff5b37] hover:bg-[#e04526] text-white font-bold px-6 shadow-md shadow-[#ff5b37]/20">
                  Add Event
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (() => {
        const lines = selectedEvent.note_text.split('\n');
        const modalEventName = lines[0];
        const startsLine = lines.find(l => l.startsWith('Starts: '));
        const endsLine = lines.find(l => l.startsWith('Ends: '));
        const timeLine = lines.find(l => l.startsWith('Time: '));
        const locationLine = lines.find(l => l.startsWith('Location: '));
        const descStartIndex = lines.findIndex((l, i) => i > 0 && !l.startsWith('Starts: ') && !l.startsWith('Ends: ') && !l.startsWith('Time: ') && !l.startsWith('Location: ') && l.trim() !== '');
        const modalDescription = descStartIndex !== -1 ? lines.slice(descStartIndex).join('\n').trim() : '';

        const modalStarts = startsLine ? startsLine.replace('Starts: ', '') : '';
        const modalEnds = endsLine ? endsLine.replace('Ends: ', '') : '';
        const modalTime = timeLine ? timeLine.replace('Time: ', '') : '';
        const modalLocation = locationLine ? locationLine.replace('Location: ', '') : '';

        // Helper to format duration
        let durationDisplay: string | null = null;
        let finalTimeDisplay = modalTime || '';
        let finalDateDisplay = format(new Date(selectedEvent.date), "dd MMM yyyy (EEEE)");

        try {
          if (modalStarts && modalEnds) {
            const startParts = modalStarts.split(' ');
            const endParts = modalEnds.split(' ');
            if (startParts[0] === endParts[0]) {
              finalDateDisplay = format(new Date(startParts[0]), "dd MMM yyyy (EEEE)");
              if (startParts[1] === 'All' && startParts[2] === 'Day') {
                finalTimeDisplay = 'All Day';
              } else {
                const st = format(new Date(`2000-01-01T${startParts[1]}`), "hh:mm a");
                const et = format(new Date(`2000-01-01T${endParts[1]}`), "hh:mm a");
                finalTimeDisplay = `${st} - ${et}`;
                const startMins = parseInt(startParts[1].split(':')[0]) * 60 + parseInt(startParts[1].split(':')[1]);
                const endMins = parseInt(endParts[1].split(':')[0]) * 60 + parseInt(endParts[1].split(':')[1]);
                let diff = endMins - startMins;
                if (diff < 0) diff += 24 * 60;
                const h = Math.floor(diff / 60);
                const m = diff % 60;
                if (h > 0 && m > 0) durationDisplay = `${h} hour${h > 1 ? 's' : ''} ${m} min`;
                else if (h > 0) durationDisplay = `${h} hour${h > 1 ? 's' : ''}`;
                else if (m > 0) durationDisplay = `${m} min`;
              }
            } else {
              finalDateDisplay = `${format(new Date(startParts[0]), "dd MMM yyyy")} - ${format(new Date(endParts[0]), "dd MMM yyyy")}`;
              if (startParts[1] !== 'All') {
                 const st = format(new Date(`2000-01-01T${startParts[1]}`), "hh:mm a");
                 const et = format(new Date(`2000-01-01T${endParts[1]}`), "hh:mm a");
                 finalTimeDisplay = `${st} - ${et}`;
              } else {
                 finalTimeDisplay = 'All Day';
              }
            }
          } else if (modalTime) {
            const match = modalTime.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
            if (match) {
               const st = format(new Date(`2000-01-01T${match[1]}`), "hh:mm a");
               const et = format(new Date(`2000-01-01T${match[2]}`), "hh:mm a");
               finalTimeDisplay = `${st} - ${et}`;
               const startMins = parseInt(match[1].split(':')[0]) * 60 + parseInt(match[1].split(':')[1]);
               const endMins = parseInt(match[2].split(':')[0]) * 60 + parseInt(match[2].split(':')[1]);
               let diff = endMins - startMins;
               if (diff < 0) diff += 24 * 60;
               const h = Math.floor(diff / 60);
               const m = diff % 60;
               if (h > 0 && m > 0) durationDisplay = `${h} hour${h > 1 ? 's' : ''} ${m} min`;
               else if (h > 0) durationDisplay = `${h} hour${h > 1 ? 's' : ''}`;
               else if (m > 0) durationDisplay = `${m} min`;
            }
          }
        } catch(e) {
          // ignore parsing errors
        }

        const renderLocation = (text: string) => {
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          const parts = text.split(urlRegex);
          return parts.map((part, i) => {
            if (part.match(urlRegex)) {
              return <a key={i} href={part} target="_blank" rel="noreferrer" className="text-[#7B0099] hover:underline font-medium">{part}</a>;
            }
            return <span key={i}>{part}</span>;
          });
        };

        // Find category name
        let categoryName = selectedEvent.type.charAt(0).toUpperCase() + selectedEvent.type.slice(1);
        const customCat = customCategories.find(c => c.id === selectedEvent.type);
        if (customCat) categoryName = customCat.name;
        // Fallback for missing custom category
        if (selectedEvent.type.startsWith('custom-') && !customCat) categoryName = 'Note';

        let tagColorClass = "bg-[#7B0099]/10 text-[#7B0099]";
        if (selectedEvent.type === 'meeting') tagColorClass = "bg-green-500/10 text-green-700";
        else if (selectedEvent.type === 'reminder') tagColorClass = "bg-yellow-500/10 text-yellow-700";
        else if (selectedEvent.type === 'note') tagColorClass = "bg-blue-500/10 text-blue-700";
        else if (selectedEvent.type === 'holiday') tagColorClass = "bg-red-500/10 text-red-700";
        else if (customCat && CATEGORY_COLORS[customCat.color]) {
          tagColorClass = CATEGORY_COLORS[customCat.color].replace(/border-l-2 border-\S+ /, '');
        }

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in transition-all duration-300" onClick={() => setSelectedEvent(null)}>
            <div 
              className="w-full max-w-[420px] rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200 bg-white dark:bg-card"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 tracking-tight">Event Details</h3>
                  <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-bold ${tagColorClass}`}>
                    {categoryName}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedEvent(null)} 
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight">{modalEventName}</h3>
                </div>

                <div className="flex flex-col">
                  {/* DATE ROW */}
                  <div className="flex gap-4 pb-4">
                    <CalendarIcon className="w-[18px] h-[18px] mt-0.5 text-[#7B0099]" strokeWidth={2} />
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Date</span>
                      <span className="text-[15px] text-slate-900 dark:text-slate-100 font-semibold">{finalDateDisplay}</span>
                    </div>
                  </div>
                  
                  {/* TIME ROW */}
                  {finalTimeDisplay && (
                    <div className="flex gap-4 pb-4">
                      <Clock className="w-[18px] h-[18px] mt-0.5 text-[#7B0099]" strokeWidth={2} />
                      <div className="flex flex-col">
                        <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Time</span>
                        <span className="text-[15px] text-slate-900 dark:text-slate-100 font-semibold">{finalTimeDisplay}</span>
                        {durationDisplay && <span className="text-[13px] text-slate-500 font-medium mt-0.5">({durationDisplay})</span>}
                      </div>
                    </div>
                  )}

                  {/* LOCATION ROW */}
                  {modalLocation && (
                    <div className="flex gap-4 pb-4">
                      <MapPin className="w-[18px] h-[18px] mt-0.5 text-[#7B0099]" strokeWidth={2} />
                      <div className="flex flex-col">
                        <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Location</span>
                        <div className="text-[15px] text-slate-900 dark:text-slate-100 font-semibold">{renderLocation(modalLocation)}</div>
                      </div>
                    </div>
                  )}

                  {/* DESCRIPTION ROW */}
                  {modalDescription && (
                    <div className="flex gap-4 pb-4">
                      <FileText className="w-[18px] h-[18px] mt-0.5 text-[#7B0099]" strokeWidth={2} />
                      <div className="flex flex-col">
                        <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Description</span>
                        <span className="text-[15px] text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap leading-relaxed">{modalDescription}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this event?')) {
                        handleDeleteNote(selectedEvent.id);
                        setSelectedEvent(null);
                      }
                    }} 
                    className="font-semibold px-6 rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Delete
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedEvent(null)} className="font-semibold px-6 rounded-lg border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-900/50">
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Category Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in transition-all duration-300" onClick={() => setCategoryToDelete(null)}>
          <div 
            className="w-full max-w-sm rounded-2xl shadow-xl border border-border bg-white dark:bg-card overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Delete Category?</h3>
              <p className="text-sm text-slate-500 mb-6">
                Are you sure you want to delete <span className="font-bold text-slate-700">"{categoryToDelete.name}"</span>? Any existing events assigned to this category will be changed to "Notes".
              </p>
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setCategoryToDelete(null)}
                  className="font-semibold"
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    // Update notes state to move events to 'note' category
                    setNotes(notes.map(note => note.type === categoryToDelete.id ? { ...note, type: 'note' } : note));
                    
                    // Remove category from state
                    if (['note', 'reminder', 'meeting', 'holiday', 'attendance'].includes(categoryToDelete.id)) {
                      setDeletedDefaultCategories([...deletedDefaultCategories, categoryToDelete.id]);
                    } else {
                      setCustomCategories(customCategories.filter(c => c.id !== categoryToDelete.id));
                    }
                    
                    // Reset active filter if deleting currently active category
                    if (activeFilter === categoryToDelete.id) {
                      setActiveFilter(null);
                    }
                    
                    setCategoryToDelete(null);
                    toast.success("Category deleted");
                  }}
                  className="font-semibold bg-red-600 hover:bg-red-700"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Company Leave Detail Modal */}
      {selectedCompanyLeave && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl transition-all duration-300" onClick={() => setSelectedCompanyLeave(null)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-[#5e0080] via-[#7B0099] to-purple-500 px-6 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">🏢</span>
                    <span className="text-xs font-semibold text-purple-100 uppercase tracking-wide bg-white/20 px-2 py-0.5 rounded-full">
                      {selectedCompanyLeave.leave_type || 'Company Leave'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{selectedCompanyLeave.leave_name}</h2>
                </div>
                <button onClick={() => setSelectedCompanyLeave(null)} className="text-white/70 hover:text-white transition-colors mt-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Date Range */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                  <CalendarIcon className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Date</p>
                  {(() => {
                    const start = selectedCompanyLeave.start_date?.split('T')[0];
                    const end = selectedCompanyLeave.end_date?.split('T')[0];
                    const startD = new Date(start);
                    const endD = new Date(end);
                    const totalDays = Math.round((endD.getTime() - startD.getTime()) / (1000*60*60*24)) + 1;
                    const fmt = (d: Date) => d.toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
                    return (
                      <div>
                        <p className="font-semibold text-foreground">
                          {start === end ? fmt(startD) : `${fmt(startD)} – ${fmt(endD)}`}
                        </p>
                        <p className="text-sm text-purple-600 dark:text-purple-400 font-medium mt-0.5">
                          {totalDays} day{totalDays !== 1 ? 's' : ''} leave
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Applies To */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                  <span className="text-purple-600 text-sm">👥</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Applies To</p>
                  <p className="font-semibold text-foreground capitalize">
                    {selectedCompanyLeave.applies_to === 'all' ? 'All Staff' :
                     selectedCompanyLeave.applies_to === 'branch' ? `Branch: ${selectedCompanyLeave.branch_id}` :
                     `Department: ${selectedCompanyLeave.department_id}`}
                  </p>
                </div>
              </div>

              {/* Paid / Unpaid */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                  <span className="text-purple-600 text-sm">💰</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Leave Pay</p>
                  <span className={`inline-flex items-center gap-1 text-sm font-semibold px-2.5 py-0.5 rounded-full ${selectedCompanyLeave.is_paid ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {selectedCompanyLeave.is_paid ? '✓ Paid Leave' : '✗ Unpaid Leave'}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 pb-5 flex gap-3">
              {role === 'hr_admin' && (
                <Button 
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this company leave?')) {
                      handleDeleteCompanyLeave(selectedCompanyLeave.id);
                      setSelectedCompanyLeave(null);
                    }
                  }} 
                  className="w-1/3 bg-red-500 hover:bg-red-600 text-white font-semibold"
                >
                  Delete
                </Button>
              )}
              <Button 
                onClick={() => setSelectedCompanyLeave(null)} 
                className={`${role === 'hr_admin' ? 'w-2/3' : 'w-full'} bg-purple-600 hover:bg-purple-700 text-white font-semibold`}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
