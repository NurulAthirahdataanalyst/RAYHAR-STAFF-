/**
 * Shared Attendance, Working Hours & Rest Calculation Utility
 *
 * Implements:
 * 1. Late Working Hour (comparison against official working start time).
 * 2. Working Hours (early clock-in clamped to official start time, multi-session aggregation).
 * 3. Rest (cumulative inactive gaps between Clock Out and next Clock In).
 *
 * Standard Display Formats:
 * - Late Working Hour: "[X] Min"   (e.g. "15 Min", "0 Min", "--")
 * - Working Hours:     "HH H MM M" (e.g. "09 H 00 M", "08 H 50 M", "08 H 15 M")
 * - Rest:              "[X] Min"   (e.g. "45 Min", "75 Min", "0 Min")
 */

export interface AttendanceSession {
  clock_in?: string | null;
  clock_out?: string | null;
  time_in?: string | null;
  time_out?: string | null;
  location?: string | null;
  distance_meters?: number | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

/**
 * Normalizes any time representation (ISO date string, Date object, or "8:25 AM" string)
 * into total minutes from start of day (0 to 1439) in Asia/Kuala_Lumpur (UTC+8).
 */
export function parseTimeToMinutes(timeVal: string | Date | null | undefined): number | null {
  if (!timeVal || timeVal === '-' || timeVal === 'N/A' || timeVal === '--') return null;

  // 1. If it's a 12-hour formatted time string like "8:25 AM" or "08:25:00 AM" or "1:15 PM"
  if (typeof timeVal === 'string') {
    const trimmed = timeVal.trim();
    const match12 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
    if (match12) {
      let h = parseInt(match12[1], 10);
      const m = parseInt(match12[2], 10);
      const period = match12[3]?.toUpperCase();
      if (period === 'PM' && h < 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    }
  }

  // 2. Otherwise parse as Date / ISO timestamp in Malaysia Time (UTC+8)
  const d = new Date(timeVal);
  if (isNaN(d.getTime())) return null;

  // Shift UTC to MYT (+8 hours)
  const mytDate = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  return mytDate.getUTCHours() * 60 + mytDate.getUTCMinutes();
}

/**
 * Parses a scheduled working start time string (e.g. "08:30:00", "08:30", "8:30 AM") into day minutes.
 * Defaults to 8:30 AM (510 minutes).
 */
export function parseScheduledStartTime(startTimeStr?: string | null): number {
  if (!startTimeStr) return 8 * 60 + 30; // 510 minutes
  const parsed = parseTimeToMinutes(startTimeStr);
  return parsed !== null ? parsed : 8 * 60 + 30;
}

/**
 * Formats a duration in minutes into strict "HH H MM M" format.
 * Example: 540 -> "09 H 00 M", 530 -> "08 H 50 M", 10 -> "00 H 10 M".
 */
export function formatDurationHHMM(totalMinutes: number): string {
  const mins = Math.max(0, Math.floor(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh} H ${mm} M`;
}

/**
 * Calculates Late Working Hour duration.
 *
 * Business Rule:
 * - Compares first Clock In against official Working Hours Start Time (default 8:30 AM or from Work Schedule tab).
 * - Only calculated from the first Clock In record of the day for each employee.
 * - Second, third, and subsequent Clock In records must display "—".
 * - Clock In <= Start Time -> "0 Min" (or "00 H 00 M" if format === 'hhmm')
 * - Clock In > Start Time -> difference formatted as "[X] Min" (e.g. "15 Min")
 * - No Clock In / Leave / Weekend / Absent -> "--"
 */
export function calculateLateWorkingHour(
  clockInVal: any,
  scheduledStartTime?: string | null,
  format: 'min' | 'hhmm' = 'min',
  isFirstClockIn: boolean = true
): string {
  // If explicitly flagged as not the first clock-in of the day
  if (isFirstClockIn === false) {
    return '—';
  }

  if (!clockInVal || clockInVal === '-' || clockInVal === 'N/A' || clockInVal === '--') {
    return '--';
  }

  // If a record object was passed
  if (typeof clockInVal === 'object' && !(clockInVal instanceof Date)) {
    // Check if flagged as a subsequent session
    if (clockInVal.is_subsequent === true || clockInVal.is_first_clock_in === false) {
      return '—';
    }

    const st = clockInVal.status;
    if (
      st === 'Approved Leave' ||
      st === 'Company Leave' ||
      st === 'Weekend' ||
      st === 'Rest Day' ||
      st === 'Absent' ||
      clockInVal.is_leave ||
      clockInVal.leave_type
    ) {
      return '--';
    }
    const firstSess = Array.isArray(clockInVal.sessions) && clockInVal.sessions.length > 0 ? clockInVal.sessions[0] : null;
    clockInVal = clockInVal.clock_in || clockInVal.time_in || firstSess?.clock_in || firstSess?.time_in;
    if (!clockInVal || clockInVal === '-' || clockInVal === 'N/A' || clockInVal === '--') {
      return '--';
    }
  }

  const clockInMins = parseTimeToMinutes(clockInVal);
  if (clockInMins === null) return '--';

  const startMins = parseScheduledStartTime(scheduledStartTime);

  if (clockInMins <= startMins) {
    return format === 'hhmm' ? '00 H 00 M' : '0 Min';
  }

  const diffMins = clockInMins - startMins;
  return format === 'hhmm' ? formatDurationHHMM(diffMins) : `${diffMins} Min`;
}

/**
 * Determines whether an attendance record is the earliest / first clock-in of the day for that employee.
 *
 * Rules:
 * 1. Identify the earliest Clock In time per employee per attendance date.
 * 2. Compare only the earliest Clock In with the employee's assigned working schedule.
 * 3. Any additional Clock In records after the first session return false (subsequent).
 */
function parseRecordClockInToComparable(rawVal: any): number | null {
  if (!rawVal || rawVal === '-' || rawVal === 'N/A' || rawVal === '--') return null;
  const d = new Date(rawVal).getTime();
  if (!isNaN(d)) return d;
  const m = parseTimeToMinutes(rawVal);
  return m !== null ? m : null;
}

export function isFirstClockInOfDay(record: any, allRecords?: any[]): boolean {
  if (!record || (!record.clock_in && !record.time_in)) return false;
  if (record.is_subsequent === true) return false;
  if (record.is_first_clock_in === false) return false;
  if (record.is_first_clock_in === true) return true;

  if (!Array.isArray(allRecords) || allRecords.length === 0) return true;

  const currentUserId = record.user_id || record.employee_id;
  if (!currentUserId) return true;

  const currentRecDate = record.date || (typeof record.clock_in === 'string' && record.clock_in.includes('T') ? record.clock_in.slice(0, 10) : null);
  const currentTimeComp = parseRecordClockInToComparable(record.clock_in || record.time_in);
  if (currentTimeComp === null) return true;

  // Filter all records for this employee on this date having a clock_in / time_in
  const employeeRecords = allRecords.filter((r) => {
    if (!r) return false;
    const uid = r.user_id || r.employee_id;
    if (uid !== currentUserId) return false;
    if (!r.clock_in && !r.time_in) return false;
    const rDate = r.date || (typeof r.clock_in === 'string' && r.clock_in.includes('T') ? r.clock_in.slice(0, 10) : null);
    if (currentRecDate && rDate && currentRecDate !== rDate) return false;
    return true;
  });

  if (employeeRecords.length <= 1) return true;

  let earliestComp: number | null = null;
  let earliestRecord = employeeRecords[0];

  for (const r of employeeRecords) {
    const comp = parseRecordClockInToComparable(r.clock_in || r.time_in);
    if (comp !== null) {
      if (earliestComp === null || comp < earliestComp) {
        earliestComp = comp;
        earliestRecord = r;
      }
    }
  }

  if (earliestComp === null) return true;

  // If strictly later than earliest, definitely not first
  if (currentTimeComp > earliestComp) return false;

  // If identical timestamp, tiebreak by original record order
  if (currentTimeComp === earliestComp) {
    return earliestRecord === record || employeeRecords.indexOf(record) === 0;
  }

  return true;
}

/**
 * Calculates working minutes for a single attendance session.
 *
 * Business Rule 1 (Early Clock-In Clamping):
 * - If employee clocks in before official working start time:
 *   Calculation starts from the official working start time!
 *   Formula: Effective Clock In = MAX(Clock In, Official Working Start Time)
 */
export function calculateSessionWorkingMinutes(
  clockInVal: string | Date | null | undefined,
  clockOutVal: string | Date | null | undefined,
  scheduledStartTime?: string | null,
  isFirstSession: boolean = true
): number {
  const inMins = parseTimeToMinutes(clockInVal);
  if (inMins === null) return 0;

  const startMins = parseScheduledStartTime(scheduledStartTime);

  // For the first session (or early arrival), clamp to official start time
  const effectiveInMins = isFirstSession ? Math.max(inMins, startMins) : inMins;

  let outMins = parseTimeToMinutes(clockOutVal);

  if (outMins === null) {
    // If clockOut is missing:
    // If today, use current Malaysia time.
    // If in the past, default to 17:30 (5:30 PM = 1050 mins) or end of official day.
    const now = new Date();
    const mytNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const clockInDate = typeof clockInVal === 'string' && clockInVal.includes('T') ? new Date(clockInVal) : null;
    let isToday = true;

    if (clockInDate && !isNaN(clockInDate.getTime())) {
      const mytIn = new Date(clockInDate.getTime() + 8 * 60 * 60 * 1000);
      isToday =
        mytNow.getUTCFullYear() === mytIn.getUTCFullYear() &&
        mytNow.getUTCMonth() === mytIn.getUTCMonth() &&
        mytNow.getUTCDate() === mytIn.getUTCDate();
    }

    if (isToday) {
      outMins = mytNow.getUTCHours() * 60 + mytNow.getUTCMinutes();
    } else {
      outMins = 17 * 60 + 30; // 5:30 PM default end
    }
  }

  const diffMins = outMins - effectiveInMins;
  return diffMins > 0 ? diffMins : 0;
}

/**
 * Calculates total working minutes across all sessions in a day.
 */
export function calculateTotalWorkingMinutes(
  recordOrSessions: any,
  scheduledStartTime?: string | null
): number {
  const sessions: AttendanceSession[] = Array.isArray(recordOrSessions?.sessions)
    ? recordOrSessions.sessions
    : Array.isArray(recordOrSessions)
    ? recordOrSessions
    : [];

  if (sessions.length === 0) {
    const rawIn = recordOrSessions?.clock_in || recordOrSessions?.time_in;
    const rawOut = recordOrSessions?.clock_out || recordOrSessions?.time_out;
    if (!rawIn) return 0;
    return calculateSessionWorkingMinutes(rawIn, rawOut, scheduledStartTime, true);
  }

  let totalMins = 0;
  sessions.forEach((s, idx) => {
    const inVal = s.clock_in || s.time_in;
    const outVal = s.clock_out || s.time_out;
    if (inVal) {
      const sessionMins = calculateSessionWorkingMinutes(inVal, outVal, scheduledStartTime, idx === 0);
      totalMins += sessionMins;
    }
  });

  return totalMins;
}

/**
 * Calculates Total Working Hours across all sessions in a day.
 *
 * Business Rule 2 (Multiple Sessions):
 * - Each session is calculated separately, then combined into the final Working Hours total.
 * - Formatted strictly as "HH H MM M" (e.g. "08 H 15 M").
 */
export function calculateTotalWorkingHoursFormatted(
  recordOrSessions: any,
  scheduledStartTime?: string | null
): string {
  if (recordOrSessions && typeof recordOrSessions === 'object' && !(recordOrSessions instanceof Date)) {
    const st = recordOrSessions.status;
    if (
      st === 'Approved Leave' ||
      st === 'Company Leave' ||
      st === 'Weekend' ||
      st === 'Rest Day' ||
      st === 'Absent' ||
      recordOrSessions.is_leave ||
      recordOrSessions.is_company_leave ||
      recordOrSessions.is_weekend ||
      recordOrSessions.is_rest_day ||
      recordOrSessions.leave_type
    ) {
      return '--';
    }
  }

  const sessions: AttendanceSession[] = Array.isArray(recordOrSessions?.sessions)
    ? recordOrSessions.sessions
    : Array.isArray(recordOrSessions)
    ? recordOrSessions
    : [];

  const rawIn = sessions.length > 0
    ? sessions.some(s => Boolean(s?.clock_in || s?.time_in))
    : Boolean(recordOrSessions?.clock_in || recordOrSessions?.time_in);

  if (!rawIn) return '--';

  const totalMins = calculateTotalWorkingMinutes(recordOrSessions, scheduledStartTime);
  return formatDurationHHMM(totalMins);
}

/**
 * Calculates Status Clock In based on the first Clock In record and schedule grace cutoff.
 *
 * Dynamic Grace Cutoff:
 * Grace Cutoff = Shift Starts + Late Arrival Window (default 30 Minutes from Attendance Config).
 * Example: 08:30 AM + 30 Minutes = 09:00 AM.
 *
 * Rules:
 * - IF First Clock In < Grace Cutoff: Status Clock In = "Present (On Time)"
 * - IF First Clock In >= Grace Cutoff: Status Clock In = "Present (Late)"
 * - IF No Clock In: Status Clock In = "Absent"
 *
 * Allowed values:
 * - Present (On Time)
 * - Present (Late)
 * - Approved Leave
 * - Company Leave
 * - Outstation
 * - Weekend
 * - Absent
 *
 * Special Rule:
 * If an employee is on Approved Leave, Company Leave, Weekend, or Outstation, even if they clock in,
 * the status does not change and remains as the designated event status.
 */
export function calculateStatusClockIn(
  record: any,
  scheduledStartTime?: string | null,
  graceMinutes?: number | null
): string {
  if (!record) return 'Absent';

  const rawStatus = String(record.status || '').trim();

  // 1. Check special non-working or protected statuses first
  if (
    rawStatus === 'Approved Leave' ||
    rawStatus.startsWith('Leave (') ||
    rawStatus === 'Leave' ||
    record.is_leave ||
    record.leave_type
  ) {
    return 'Approved Leave';
  }

  if (
    rawStatus === 'Company Leave' ||
    rawStatus === 'Leave (Company Holiday)' ||
    rawStatus.includes('Company Holiday') ||
    record.is_company_leave
  ) {
    return 'Company Leave';
  }

  if (rawStatus === 'Weekend' || rawStatus === 'Rest Day' || record.is_weekend || record.is_rest_day) {
    return 'Weekend';
  }

  if (rawStatus === 'Outstation' || record.is_outstation) {
    return 'Outstation';
  }

  // 2. Determine first clock in
  const sessions: AttendanceSession[] = Array.isArray(record.sessions) ? record.sessions : [];
  const firstSession = sessions.find((s) => Boolean(s.clock_in || s.time_in));
  const firstClockIn = firstSession?.clock_in || firstSession?.time_in || record.clock_in || record.time_in;

  if (!firstClockIn || firstClockIn === '-' || firstClockIn === 'N/A' || firstClockIn === '--') {
    return rawStatus === 'Absent' ? 'Absent' : (rawStatus || 'Absent');
  }

  const clockInMins = parseTimeToMinutes(firstClockIn);
  if (clockInMins === null) {
    return 'Absent';
  }

  const startMins = parseScheduledStartTime(scheduledStartTime);

  // Dynamic grace window from Attendance Config (default 30 mins)
  const grace =
    graceMinutes !== null && graceMinutes !== undefined && !isNaN(Number(graceMinutes))
      ? Math.max(0, Number(graceMinutes))
      : record.grace_period_minutes !== undefined && record.grace_period_minutes !== null
      ? Math.max(0, Number(record.grace_period_minutes))
      : record.late_threshold_minutes !== undefined && record.late_threshold_minutes !== null
      ? Math.max(0, Number(record.late_threshold_minutes))
      : 30;

  const graceCutoffMins = startMins + grace;

  // Rules:
  // IF First Clock In < Grace Cutoff: Status Clock In = "Present (On Time)"
  // IF First Clock In >= Grace Cutoff: Status Clock In = "Present (Late)"
  return clockInMins < graceCutoffMins ? 'Present (On Time)' : 'Present (Late)';
}

/**
 * Alias for calculateStatusClockIn representing the overall/arrival attendance status.
 */
export const calculateAttendanceStatus = calculateStatusClockIn;

/**
 * Calculates the Day Status column (placed at the last column of the Attendance Report).
 *
 * Allowed values:
 * - Working Days
 * - Approved Leave
 * - Company Leave
 * - Outstation
 * - Weekend
 */
export function calculateDayStatus(record: any): string {
  if (!record) return 'Working Days';

  const rawStatus = String(record.status || '').trim();
  const leaveType = String(record.leave_type || '').trim();

  if (
    rawStatus === 'Company Leave' ||
    rawStatus === 'Leave (Company Holiday)' ||
    rawStatus.includes('Company Holiday') ||
    leaveType === 'Company Holiday' ||
    record.is_company_leave
  ) {
    return 'Company Leave';
  }

  if (
    rawStatus === 'Weekend' ||
    rawStatus === 'Rest Day' ||
    record.is_weekend ||
    record.is_rest_day ||
    leaveType.toUpperCase().includes('REPLACEMENT') ||
    leaveType.toUpperCase().includes('GANTI')
  ) {
    return 'Weekend';
  }

  if (
    rawStatus === 'Approved Leave' ||
    rawStatus.startsWith('Leave (') ||
    rawStatus === 'Leave' ||
    record.is_leave ||
    Boolean(leaveType)
  ) {
    return 'Approved Leave';
  }

  if (
    rawStatus === 'Outstation' ||
    record.is_outstation ||
    String(record.attendance_type || '').toUpperCase() === 'OUTSTATION'
  ) {
    return 'Outstation';
  }

  return 'Working Days';
}

/**
 * Calculates Status Clock Out based on end-of-day clock-out record and working hours.
 *
 * Rules:
 * - Evaluate whether the employee completed their working session.
 * - An early clock out during a break/rest period is NOT "Clocked Out Early" if the employee
 *   clocks in again after the break.
 * - Status Clock Out evaluates the FINAL session of the day:
 *   * If the employee clocked in to a final session but has not clocked out: "Missing Clock Out".
 *   * If the employee clocked out of their final session with no further clock-in:
 *     - If Working Hours >= 07 H 59 M (479 mins): "Clock Out"
 *     - If Working Hours < 07 H 59 M (479 mins): "Clocked Out Early"
 *
 * Special handling:
 * - Approved Leave, Company Leave, Weekend, Outstation, Absent display their designated status.
 */
export function calculateStatusClockOut(
  record: any,
  scheduledStartTime?: string | null,
  graceMinutes?: number | null
): string {
  if (!record) return 'Absent';

  const statusIn = calculateStatusClockIn(record, scheduledStartTime, graceMinutes);

  // Special handling: Approved Leave, Company Leave, Weekend, Outstation, Absent
  // Status Clock Out MUST display the same attendance status for these!
  if (
    statusIn === 'Approved Leave' ||
    statusIn === 'Company Leave' ||
    statusIn === 'Weekend' ||
    statusIn === 'Outstation' ||
    statusIn === 'Absent'
  ) {
    return statusIn;
  }

  const sessions: AttendanceSession[] = Array.isArray(record.sessions) ? record.sessions : [];
  const activeSessions = sessions.filter((s) => Boolean(s.clock_in || s.time_in));

  const hasClockIn = activeSessions.length > 0 || Boolean(record.clock_in || record.time_in);
  if (!hasClockIn) {
    return statusIn || 'Absent';
  }

  // Evaluate whether employee completed their working session.
  // When an employee has multiple clock-ins/outs in a day, an early clock out during break/rest
  // is NOT Clocked Out Early if the employee clocked in again after the break.
  // Status Clock Out is based ONLY on the FINAL attendance session of the day.
  let hasFinalClockOut = false;
  if (activeSessions.length > 0) {
    const lastSession = activeSessions[activeSessions.length - 1];
    const out = lastSession.clock_out || lastSession.time_out;
    hasFinalClockOut = Boolean(out && out !== '-' && out !== 'N/A' && out !== '--');
  } else {
    const out = record.clock_out || record.time_out;
    hasFinalClockOut = Boolean(out && out !== '-' && out !== 'N/A' && out !== '--');
  }

  // If the last session has no clock out, the employee has not clocked out of their day session
  if (!hasFinalClockOut) {
    return 'Missing Clock Out';
  }

  // The employee has clocked out of their final session and did not clock in again.
  // Check total working hours duration.
  // Threshold: 07 H 59 M = 7 * 60 + 59 = 479 minutes
  const totalMins = calculateTotalWorkingMinutes(record, scheduledStartTime);
  const CLOCK_OUT_THRESHOLD_MINUTES = 7 * 60 + 59; // 479 mins

  return totalMins >= CLOCK_OUT_THRESHOLD_MINUTES ? 'Clock Out' : 'Clocked Out Early';
}

const DEFAULT_SINGLE_SESSION_REST_MINUTES = 60;
const FULL_DAY_SINGLE_SESSION_MIN_SPAN_MINUTES = 360;

const NON_WORKING_REST_STATUSES = new Set([
  'Approved Leave',
  'Company Leave',
  'Weekend',
  'Rest Day',
  'Absent',
  'Holiday',
  'N/A',
  'On Leave',
  'Leave',
]);

function hasValidClockValue(val: unknown): boolean {
  return Boolean(val && val !== '-' && val !== 'N/A' && val !== '--');
}

/**
 * Calculates Total Rest in numeric minutes between all sessions within the same day,
 * returning null for non-working / unclocked days (displayed as "--").
 *
 * Business Rules:
 * - Multi-session days: sum of (Next Clock In - Previous Clock Out) gaps in minutes.
 * - Single-session completed full working days (span >= 6 hours, e.g. 8:30 AM - 5:33 PM):
 *   assumes a 60 Min break.
 * - Single-session open/incomplete or short/half-day (< 6 hours): 0 Min.
 */
export function calculateDailyRestMinutesValue(recordOrSessions: any): number | null {
  if (recordOrSessions && typeof recordOrSessions === 'object' && !(recordOrSessions instanceof Date)) {
    const st = recordOrSessions.status;
    if (
      NON_WORKING_REST_STATUSES.has(st) ||
      recordOrSessions.is_leave ||
      recordOrSessions.is_on_leave ||
      recordOrSessions.is_company_leave ||
      recordOrSessions.is_weekend ||
      recordOrSessions.is_rest_day ||
      recordOrSessions.leave_type
    ) {
      return null;
    }
  }

  const rawSessions: AttendanceSession[] = Array.isArray(recordOrSessions?.sessions)
    ? recordOrSessions.sessions
    : Array.isArray(recordOrSessions)
    ? recordOrSessions
    : [];

  let validSessions = rawSessions
    .filter((s) => Boolean(s && hasValidClockValue(s.clock_in || s.time_in)))
    .sort((a, b) => {
      const minA = parseTimeToMinutes(a.clock_in || a.time_in) ?? 0;
      const minB = parseTimeToMinutes(b.clock_in || b.time_in) ?? 0;
      return minA - minB;
    });

  if (validSessions.length === 0) {
    const rawIn = recordOrSessions?.clock_in || recordOrSessions?.time_in;
    if (!hasValidClockValue(rawIn)) {
      return null;
    }
    validSessions = [
      {
        clock_in: recordOrSessions?.clock_in,
        clock_out: recordOrSessions?.clock_out,
        time_in: recordOrSessions?.time_in,
        time_out: recordOrSessions?.time_out,
      },
    ];
  }

  if (validSessions.length === 1) {
    const onlySession = validSessions[0];
    const inVal = onlySession.clock_in || onlySession.time_in;
    const outVal = onlySession.clock_out || onlySession.time_out;

    if (!hasValidClockValue(outVal)) {
      return 0;
    }

    const inMins = parseTimeToMinutes(inVal);
    const outMins = parseTimeToMinutes(outVal);
    if (inMins !== null && outMins !== null && outMins - inMins >= FULL_DAY_SINGLE_SESSION_MIN_SPAN_MINUTES) {
      return DEFAULT_SINGLE_SESSION_REST_MINUTES;
    }

    return 0;
  }

  let totalRestMins = 0;

  for (let i = 0; i < validSessions.length - 1; i++) {
    const currOutVal = validSessions[i].clock_out || validSessions[i].time_out;
    const nextInVal = validSessions[i + 1].clock_in || validSessions[i + 1].time_in;

    const currOutMins = parseTimeToMinutes(currOutVal);
    const nextInMins = parseTimeToMinutes(nextInVal);

    if (currOutMins !== null && nextInMins !== null) {
      const gap = nextInMins - currOutMins;
      if (gap > 0) {
        totalRestMins += gap;
      }
    }
  }

  return totalRestMins;
}

/**
 * Calculates Total Rest between all sessions within the same day.
 *
 * Business Rule:
 * - Multi-session days: Rest (Min) = Sum of (Next Clock In - Previous Clock Out)
 * - Single-session full working days (e.g. 8:30 AM - 5:33 PM): assumes 60 Min break.
 * - Display format: strictly total minutes followed by "Min" (e.g. "45 Min", "60 Min", "75 Min", "0 Min").
 * - Never displays hours format.
 */
export function calculateTotalRestMinutes(recordOrSessions: any): string {
  const totalRestMins = calculateDailyRestMinutesValue(recordOrSessions);
  return totalRestMins === null ? '--' : `${totalRestMins} Min`;
}

/**
 * Aggregates daily rest minutes across a month's attendance logs (flat session rows or grouped days),
 * merging an optional active session for `todayStr` (YYYY-MM-DD).
 *
 * Returns `{ totalBreakMins, todayRestMins }`.
 */
export function calculateMonthlyBreakMinutes(
  logs: any[],
  activeSession?: any,
  todayStr?: string
): { totalBreakMins: number; todayRestMins: number } {
  const dateMap = new Map<string, any[]>();

  (Array.isArray(logs) ? logs : []).forEach((log) => {
    if (!log) return;
    const rawDate = log.date ? String(log.date).slice(0, 10) : '';
    if (!rawDate) return;
    if (!dateMap.has(rawDate)) {
      dateMap.set(rawDate, []);
    }
    dateMap.get(rawDate)!.push(log);
  });

  if (activeSession && (activeSession.clock_in || activeSession.time_in)) {
    const fallbackDate = activeSession.clock_in
      ? new Date(activeSession.clock_in).toLocaleDateString('en-CA')
      : todayStr || '';
    const aDate = activeSession.date ? String(activeSession.date).slice(0, 10) : fallbackDate;
    if (aDate && (!todayStr || aDate === todayStr)) {
      const existing = dateMap.get(aDate) || [];
      const merged = [...existing];
      const existingIdx = merged.findIndex(
        (l: any) =>
          (l.attendance_id && activeSession.attendance_id && l.attendance_id === activeSession.attendance_id) ||
          (l.id && activeSession.id && l.id === activeSession.id)
      );
      if (existingIdx >= 0) {
        merged[existingIdx] = { ...merged[existingIdx], ...activeSession };
      } else {
        merged.push(activeSession);
      }
      dateMap.set(aDate, merged);
    }
  }

  let totalBreakMins = 0;
  let todayRestMins = 0;

  dateMap.forEach((dayLogs, dateStr) => {
    const isNonWorkingDay = dayLogs.some(
      (l) =>
        NON_WORKING_REST_STATUSES.has(l.status) ||
        l.is_leave ||
        l.is_on_leave ||
        l.is_company_leave ||
        l.is_weekend ||
        l.is_rest_day ||
        Boolean(l.leave_type)
    );

    let dayRestMins = 0;
    if (!isNonWorkingDay) {
      const daySessions: AttendanceSession[] = [];
      dayLogs.forEach((l) => {
        if (Array.isArray(l.sessions) && l.sessions.length > 0) {
          l.sessions.forEach((s: any) => {
            if (s && hasValidClockValue(s.clock_in || s.time_in)) {
              daySessions.push(s);
            }
          });
        } else if (hasValidClockValue(l.clock_in || l.time_in)) {
          daySessions.push(l);
        }
      });

      if (daySessions.length > 0) {
        dayRestMins = calculateDailyRestMinutesValue({ sessions: daySessions }) ?? 0;
      }
    }

    totalBreakMins += dayRestMins;
    if (todayStr && dateStr === todayStr) {
      todayRestMins = dayRestMins;
    }
  });

  return { totalBreakMins, todayRestMins };
}
