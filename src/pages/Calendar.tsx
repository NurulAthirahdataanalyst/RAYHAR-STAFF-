import { useState, useEffect } from "react";
import { format, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useAuth } from "@/contexts/AuthContext";
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

type AttendanceLog = {
  id: number;
  clock_in: string;
  clock_out: string | null;
  location_in: string;
};

export default function Calendar() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  
  // New Event Form State
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [eventLocation, setEventLocation] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventType, setEventType] = useState("reminder");

  const [loading, setLoading] = useState(true);

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

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) {
      toast.error("Event Name is required");
      return;
    }

    // Construct the note text based on form fields
    let finalNoteText = eventName;
    if (startTime || endTime) {
      finalNoteText += `\nTime: ${startTime} - ${endTime}`;
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
          date: eventDate,
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

  // Calendar Grid Logic
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="w-full min-h-screen pb-12">
      
      {/* HEADER / TOP BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-foreground">
          Calendar
        </h1>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="bg-background border border-border rounded-lg px-4 py-2 flex items-center justify-between text-sm font-medium min-w-[220px]">
            <span>{format(startDate, "MM/dd/yyyy")} - {format(endDate, "MM/dd/yyyy")}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground ml-2" />
          </div>
          <Button variant="outline" className="gap-2 bg-background border-border font-bold">
            <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
          <Button 
            onClick={() => {
              setEventDate(format(selectedDate, "yyyy-MM-dd"));
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
                  day: "h-9 w-9 p-0 font-medium aria-selected:opacity-100 hover:bg-muted rounded-full transition-all",
                  day_selected: "bg-[#ff5b37] text-white hover:bg-[#e04526] hover:text-white focus:bg-[#ff5b37] focus:text-white",
                  day_today: "bg-accent text-accent-foreground font-bold",
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
              <h3 className="font-bold text-foreground mb-4">Event Categories</h3>
              <p className="text-xs text-muted-foreground mb-4">Drag and drop your event or click in the calendar</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold text-sm cursor-pointer hover:bg-blue-500/20 transition-colors">
                  <span className="w-3 h-3 rounded-full bg-blue-500 border border-blue-600/20" /> Notes
                </div>
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 font-bold text-sm cursor-pointer hover:bg-yellow-500/20 transition-colors">
                  <span className="w-3 h-3 rounded-full bg-yellow-500 border border-yellow-600/20" /> Reminders
                </div>
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-red-500/10 text-red-700 dark:text-red-400 font-bold text-sm cursor-pointer hover:bg-red-500/20 transition-colors">
                  <span className="w-3 h-3 rounded-full bg-red-500 border border-red-600/20" /> Holidays
                </div>
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#7B0099]/10 text-[#7B0099] dark:text-[#a000c7] font-bold text-sm cursor-pointer hover:bg-[#7B0099]/20 transition-colors">
                  <span className="w-3 h-3 rounded-full bg-[#7B0099] border border-[#7B0099]/20" /> Attendance
                </div>
              </div>
            </div>
          </Card>

        </div>

        {/* RIGHT COLUMN: MAIN CALENDAR GRID */}
        <div className="lg:col-span-9 flex flex-col h-[800px] bg-card border border-border/60 rounded-[16px] shadow-sm overflow-hidden">
          
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b border-border/60 gap-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" className="h-9 px-4 font-bold bg-muted/30" onClick={() => setSelectedDate(new Date())}>Today</Button>
              <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5 border border-border/50">
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white dark:hover:bg-card" onClick={() => setSelectedDate(subMonths(selectedDate, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white dark:hover:bg-card" onClick={() => setSelectedDate(addMonths(selectedDate, 1))}>
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
          
          <div className="grid grid-cols-7 border-b border-border/60 bg-muted/10">
            {weekDays.map(day => (
              <div key={day} className="py-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
          
          <div className="flex-1 grid grid-cols-7 bg-border/60 gap-px auto-rows-fr">
            {calendarDays.map((day, i) => {
              const isCurrentMonth = isSameMonth(day, selectedDate);
              const dayStr = format(day, 'yyyy-MM-dd');
              
              const dayNotes = notes.filter(n => n.date.startsWith(dayStr));
              const dayHolidays = holidays.filter(h => h.date === dayStr);
              const dayAttendance = attendance.filter(a => a.clock_in && format(new Date(a.clock_in), 'yyyy-MM-dd') === dayStr);
              
              return (
                <div 
                  key={i} 
                  className={`bg-card p-1.5 flex flex-col transition-colors hover:bg-muted/30 cursor-pointer ${!isCurrentMonth ? 'bg-muted/10 opacity-70' : ''}`}
                  onClick={() => setSelectedDate(day)}
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
                    
                    {/* Attendance */}
                    {dayAttendance.map((a, idx) => {
                      const timeStr = new Date(a.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={`att-${idx}`} className="px-2 py-1 rounded-[4px] bg-[#7B0099]/10 border-l-2 border-[#7B0099] text-[11px] font-bold text-[#7B0099] dark:text-purple-400 truncate shadow-sm">
                          In: {timeStr}
                        </div>
                      )
                    })}

                    {/* Notes & Reminders */}
                    {dayNotes.map((note) => {
                      const isReminder = note.type === 'reminder';
                      const colorClass = isReminder 
                        ? 'bg-yellow-500/10 border-l-2 border-yellow-500 text-yellow-700 dark:text-yellow-400' 
                        : 'bg-blue-500/10 border-l-2 border-blue-500 text-blue-700 dark:text-blue-400';
                      
                      // Extract title (first line) for pill
                      const title = note.note_text.split('\n')[0];

                      return (
                        <div key={note.id} className={`px-2 py-1 rounded-[4px] text-[11px] font-bold truncate shadow-sm relative group ${colorClass}`}>
                          {title}
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 bg-white dark:bg-black rounded-full"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
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

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Event Date</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="date"
                    required
                    className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#ff5b37] focus:ring-1 focus:ring-[#ff5b37] transition-all"
                    value={eventDate}
                    onChange={e => setEventDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Start Time</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="time"
                      className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#ff5b37] focus:ring-1 focus:ring-[#ff5b37] transition-all"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">End Time</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="time"
                      className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#ff5b37] focus:ring-1 focus:ring-[#ff5b37] transition-all"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                    />
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
                    value={eventType}
                    onChange={e => setEventType(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm font-bold text-foreground focus:outline-none"
                  >
                    <option value="reminder">Reminder (Yellow)</option>
                    <option value="note">Note (Blue)</option>
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

    </div>
  );
}
