import { useState, useEffect, useMemo } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/config/api";
import { toast } from "sonner";
import { 
  CalendarDays, 
  Plus, 
  MapPin, 
  Clock, 
  FileText, 
  Bell, 
  Calendar as CalendarIcon,
  X,
  Trash2,
  ListTodo
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteType, setNewNoteType] = useState("note");

  const [loading, setLoading] = useState(true);

  const fetchCalendarData = async () => {
    try {
      const currentUserId = user?.user_id || user?.id;
      if (!currentUserId) return;

      // Fetch Notes
      const notesRes = await fetch(`${API_BASE_URL}/api/personal-notes?userId=${currentUserId}`);
      const notesData = await notesRes.json();
      if (notesData.success) setNotes(notesData.notes);

      // Fetch Holidays
      const holRes = await fetch(`${API_BASE_URL}/api/holidays`);
      const holData = await holRes.json();
      if (holData.success) setHolidays(holData.holidays);

      // Fetch Attendance
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

  // Filter items for selected date
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  
  const selectedNotes = notes.filter(n => n.date.startsWith(selectedDateStr));
  const selectedHolidays = holidays.filter(h => h.date === selectedDateStr);
  const selectedAttendance = attendance.filter(a => {
    // a.clock_in is ISO string or close to it
    if (!a.clock_in) return false;
    const dateObj = new Date(a.clock_in);
    if (isNaN(dateObj.getTime())) return false;
    return format(dateObj, "yyyy-MM-dd") === selectedDateStr;
  });

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

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
          date: selectedDateStr,
          note_text: newNoteText,
          type: newNoteType
        })
      });

      const data = await res.json();
      if (data.success) {
        setNotes([...notes, data.note]);
        setNewNoteText("");
        setIsAddNoteOpen(false);
        toast.success("Note added successfully");
      }
    } catch (error) {
      toast.error("Failed to add note");
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
        toast.success("Note deleted");
      }
    } catch (error) {
      toast.error("Failed to delete note");
    }
  };

  // Custom Day renderer to show dots
  const CustomDayContent = (props: any) => {
    const { date, displayMonth } = props;
    const dateStr = format(date, "yyyy-MM-dd");
    
    const hasNote = notes.some(n => n.date.startsWith(dateStr) && n.type === 'note');
    const hasReminder = notes.some(n => n.date.startsWith(dateStr) && n.type === 'reminder');
    const isHoliday = holidays.some(h => h.date === dateStr);
    
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <span>{date.getDate()}</span>
        <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-0.5">
          {isHoliday && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
          {hasNote && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
          {hasReminder && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
          <CalendarDays className="w-8 h-8 text-[#7B0099] dark:text-purple-400" />
          My Calendar
        </h1>
        <p className="text-muted-foreground font-medium mt-1">
          Manage your schedule, personal notes, and reminders.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: DAILY AGENDA */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden rounded-[24px]">
            <div className="p-6 sm:p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Daily Agenda</h2>
                  <p className="text-purple-400 font-medium">
                    {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </p>
                </div>
                <Button 
                  onClick={() => setIsAddNoteOpen(true)}
                  className="bg-[#7B0099] hover:bg-purple-800 text-white rounded-xl gap-2 font-bold shadow-lg shadow-purple-900/20"
                >
                  <Plus className="w-4 h-4" />
                  Add Event
                </Button>
              </div>

              {/* Add Note Form */}
              {isAddNoteOpen && (
                <div className="mb-6 p-4 rounded-2xl bg-muted/50 border border-border/50 animate-in slide-in-from-top-2">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-foreground">New Note/Reminder</h3>
                    <button onClick={() => setIsAddNoteOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={handleAddNote} className="space-y-4">
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setNewNoteType('note')}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                          newNoteType === 'note' ? 'bg-[#7B0099] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        Personal Note
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewNoteType('reminder')}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                          newNoteType === 'reminder' ? 'bg-yellow-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        Reminder
                      </button>
                    </div>
                    <textarea 
                      placeholder="Type your note here..."
                      className="w-full bg-background border border-border rounded-xl p-3 text-foreground focus:outline-none focus:border-[#7B0099] min-h-[100px]"
                      value={newNoteText}
                      onChange={e => setNewNoteText(e.target.value)}
                      required
                    />
                    <div className="flex justify-end">
                      <Button type="submit" className="bg-[#7B0099] hover:bg-purple-800 text-white rounded-xl font-bold">
                        Save
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-4">
                {/* HOLIDAYS */}
                {selectedHolidays.map((h, i) => (
                  <div key={`hol-${i}`} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-4 items-start">
                    <div className="p-2.5 bg-red-500/20 rounded-xl text-red-400 shrink-0">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md">Public Holiday</span>
                      </div>
                      <h3 className="font-bold text-foreground mt-1">{h.name}</h3>
                    </div>
                  </div>
                ))}

                {/* ATTENDANCE */}
                {selectedAttendance.map((a, i) => {
                  const clockInTime = new Date(a.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const clockOutTime = a.clock_out ? new Date(a.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Active";
                  
                  return (
                    <div key={`att-${i}`} className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 flex gap-4 items-start">
                      <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400 shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="w-full">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-black uppercase tracking-wider text-purple-400">Shift</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <h3 className="font-bold text-foreground">{clockInTime} - {clockOutTime}</h3>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5" />
                            {a.location_in || "Unknown"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* NOTES & REMINDERS */}
                {selectedNotes.map((note) => (
                  <div key={note.id} className="p-4 rounded-2xl bg-muted/20 border border-border/50 flex gap-4 items-start relative group">
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                      note.type === 'reminder' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    }`}>
                      {note.type === 'reminder' ? <Bell className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>
                    <div className="pr-8">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          note.type === 'reminder' ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10' : 'text-blue-600 dark:text-blue-400 bg-blue-500/10'
                        }`}>
                          {note.type === 'reminder' ? 'Reminder' : 'Personal Note'}
                        </span>
                      </div>
                      <p className="text-foreground/80 whitespace-pre-wrap text-sm leading-relaxed mt-2">{note.note_text}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteNote(note.id)}
                      className="absolute top-4 right-4 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {selectedNotes.length === 0 && selectedAttendance.length === 0 && selectedHolidays.length === 0 && (
                  <div className="text-center py-12 px-4 rounded-2xl bg-muted/20 border border-border/50 border-dashed">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <ListTodo className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-foreground font-bold mb-1">Nothing planned for this day</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      Add a personal note, set a reminder, or request leave to build your daily agenda.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: CALENDAR WIDGET & HOLIDAYS */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Calendar Widget */}
          <Card className="border-border/50 bg-card shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden rounded-[24px]">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-6 px-2">
                <span className="text-[11px] font-black tracking-[0.2em] uppercase text-muted-foreground">Calendar</span>
              </div>
              <div className="bg-muted/30 rounded-[20px] p-2 border border-border/50">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  className="mx-auto"
                  components={{
                    DayContent: CustomDayContent
                  }}
                  classNames={{
                    day_selected: "bg-[#7B0099] text-white hover:bg-[#5e0080] focus:bg-[#7B0099]",
                    day_today: "border-2 border-[#7B0099] text-[#7B0099] font-black rounded-full shadow-sm bg-purple-500/10",
                    head_cell: "text-muted-foreground font-bold text-[10px] uppercase tracking-wider w-10 text-center",
                    cell: "h-10 w-10 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-muted/50 [&:has([aria-selected])]:bg-muted/50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: "h-10 w-10 p-0 font-medium aria-selected:opacity-100 text-foreground hover:bg-muted rounded-full transition-all",
                    nav_button: "h-8 w-8 bg-transparent p-0 text-muted-foreground hover:text-foreground transition-colors",
                    caption_label: "text-sm font-bold text-[#7B0099] dark:text-purple-400",
                  }}
                />
              </div>
              
              {/* Legend */}
              <div className="mt-6 flex flex-wrap justify-center gap-4 px-2">
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Note
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" /> Reminder
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  <span className="w-2 h-2 rounded-full bg-red-500" /> Holiday
                </div>
              </div>
            </div>
          </Card>

          {/* Upcoming Holidays Widget */}
          <Card className="border-border/50 bg-card shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden rounded-[24px]">
            <div className="p-4 sm:p-6">
              <span className="text-[11px] font-black tracking-[0.2em] uppercase text-muted-foreground block mb-4">Upcoming Holidays</span>
              
              <div className="space-y-3">
                {holidays
                  .filter(h => new Date(h.date) >= new Date(new Date().setHours(0,0,0,0)))
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .slice(0, 5)
                  .map((holiday, i) => {
                    const holDate = new Date(holiday.date);
                    return (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-muted/30 border border-border/50 hover:border-[#7B0099]/30 transition-colors group cursor-pointer" onClick={() => setSelectedDate(holDate)}>
                        <div className="bg-[#E51B5C] rounded-xl p-2.5 w-14 flex flex-col items-center justify-center shrink-0 shadow-lg shadow-pink-900/20 group-hover:scale-105 transition-transform">
                          <span className="text-[10px] font-black uppercase text-white/90 leading-none mb-1">{format(holDate, "MMM")}</span>
                          <span className="text-lg font-black text-white leading-none">{format(holDate, "dd")}</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">{holiday.name}</h4>
                          <p className="text-[11px] text-muted-foreground font-medium italic mt-0.5">Public Holiday</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}
