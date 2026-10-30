import { WorkSchedule, WorkScheduleDay } from '@/modules/multi-company/types/multiCompany.types';

export function normalizeZoneCode(zone: string | null | undefined): string {
  if (!zone) return '';
  const trimmed = String(zone).trim();
  if (!trimmed || trimmed.toUpperCase() === 'ALL' || trimmed.toUpperCase() === 'NONE') return '';
  const upper = trimmed.toUpperCase().replace(/\s+/g, '_');
  if (upper === 'ZONE_A' || upper.startsWith('ZONE_A_')) return 'ZONE_A';
  if (upper === 'ZONE_B' || upper.startsWith('ZONE_B_')) return 'ZONE_B';
  return upper;
}

export function formatZoneDisplayName(zone: string | null | undefined): string {
  const norm = normalizeZoneCode(zone);
  if (!norm) return 'All Zones';
  if (norm === 'ZONE_A') return 'Zone A';
  if (norm === 'ZONE_B') return 'Zone B';
  return norm.replace(/_/g, ' ');
}

export function formatTime12Hour(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  const parts = String(timeStr).trim().split(':');
  if (parts.length < 2) return String(timeStr);
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) return String(timeStr);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
}

export function getScheduleBranchCodes(schedule: WorkSchedule | null | undefined): string[] {
  if (!schedule) return [];
  if (Array.isArray(schedule.branch_ids) && schedule.branch_ids.length > 0) {
    return Array.from(
      new Set(
        schedule.branch_ids
          .map((c) => String(c || '').trim().toUpperCase())
          .filter((c) => c && c !== 'ALL')
      )
    );
  }
  if (schedule.branch_id && schedule.branch_id.trim() && schedule.branch_id.trim().toUpperCase() !== 'ALL') {
    return Array.from(
      new Set(
        schedule.branch_id
          .split(',')
          .map((c) => c.trim().toUpperCase())
          .filter((c) => c && c !== 'ALL')
      )
    );
  }
  return [];
}

export function getZonePresetDays(zone: string): { days: WorkScheduleDay[]; specialRules: string[]; lunchStart: string; lunchEnd: string; defaultName: string } {
  const norm = normalizeZoneCode(zone);
  if (norm === 'ZONE_A') {
    return {
      defaultName: 'Standard Office Hours (Zone A)',
      lunchStart: '13:00',
      lunchEnd: '14:00',
      specialRules: ['first_thursday_full', 'first_saturday_closed'],
      days: [
        { day_of_week: 'Monday', start_time: '08:30:00', end_time: '17:30:00', is_working_day: true },
        { day_of_week: 'Tuesday', start_time: '08:30:00', end_time: '17:30:00', is_working_day: true },
        { day_of_week: 'Wednesday', start_time: '08:30:00', end_time: '17:30:00', is_working_day: true },
        { day_of_week: 'Thursday', start_time: '08:30:00', end_time: '13:00:00', is_working_day: true },
        { day_of_week: 'Friday', start_time: null, end_time: null, is_working_day: false },
        { day_of_week: 'Saturday', start_time: '08:30:00', end_time: '17:30:00', is_working_day: true },
        { day_of_week: 'Sunday', start_time: '08:30:00', end_time: '17:30:00', is_working_day: true },
      ],
    };
  }
  return {
    defaultName: norm === 'ZONE_B' ? 'Standard Office Hours (Zone B)' : 'Standard Office Hours',
    lunchStart: '13:00',
    lunchEnd: '14:00',
    specialRules: ['first_saturday_closed'],
    days: [
      { day_of_week: 'Monday', start_time: '08:30:00', end_time: '17:30:00', is_working_day: true },
      { day_of_week: 'Tuesday', start_time: '08:30:00', end_time: '17:30:00', is_working_day: true },
      { day_of_week: 'Wednesday', start_time: '08:30:00', end_time: '17:30:00', is_working_day: true },
      { day_of_week: 'Thursday', start_time: '08:30:00', end_time: '17:30:00', is_working_day: true },
      { day_of_week: 'Friday', start_time: '08:30:00', end_time: '17:30:00', is_working_day: true },
      { day_of_week: 'Saturday', start_time: '08:30:00', end_time: '13:00:00', is_working_day: true },
      { day_of_week: 'Sunday', start_time: null, end_time: null, is_working_day: false },
    ],
  };
}

const SHORT_DAY: Record<string, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
};

export function formatScheduleCoreHoursSummary(schedule: WorkSchedule): string {
  const days = schedule.days || [];
  if (days.length === 0) return '08:30 - 17:30';

  const daysMap = new Map(days.map((d) => [d.day_of_week, d]));
  const fri = daysMap.get('Friday');
  const isFridayOff = fri && !fri.is_working_day;

  const order: Array<WorkScheduleDay['day_of_week']> = isFridayOff
    ? ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const orderedDays = order
    .map((name) => daysMap.get(name))
    .filter((d): d is WorkScheduleDay => Boolean(d));

  const groups: Array<{ startDay: string; endDay: string; timeRange: string; isWorking: boolean }> = [];
  for (const d of orderedDays) {
    const timeRange = d.is_working_day
      ? `${(d.start_time || '08:30').slice(0, 5)} - ${(d.end_time || '17:30').slice(0, 5)}`
      : 'Off';
    const prev = groups[groups.length - 1];
    if (prev && prev.isWorking === d.is_working_day && prev.timeRange === timeRange) {
      prev.endDay = d.day_of_week;
    } else {
      groups.push({
        startDay: d.day_of_week,
        endDay: d.day_of_week,
        timeRange,
        isWorking: d.is_working_day,
      });
    }
  }

  const workingParts = groups
    .filter((g) => g.isWorking)
    .map((g) => {
      const dayLabel =
        g.startDay === g.endDay
          ? SHORT_DAY[g.startDay] || g.startDay
          : `${SHORT_DAY[g.startDay]}–${SHORT_DAY[g.endDay]}`;
      return `${dayLabel}: ${g.timeRange}`;
    });

  const offParts = groups
    .filter((g) => !g.isWorking)
    .map((g) =>
      g.startDay === g.endDay
        ? `${SHORT_DAY[g.startDay]} Off`
        : `${SHORT_DAY[g.startDay]}–${SHORT_DAY[g.endDay]} Off`
    );

  return [...workingParts, ...offParts].join(' | ') || 'Varies / Off';
}

export function resolveBranchSchedule(
  branch: { code?: string; operating_zone?: string } | null | undefined,
  schedules: WorkSchedule[]
): WorkSchedule | null {
  if (!branch || !schedules || schedules.length === 0) return null;
  const cleanCode = (branch.code || '').trim().toUpperCase();
  const normBranchZone = normalizeZoneCode(branch.operating_zone);

  // 1. Direct branch_ids match
  if (cleanCode) {
    const directMatch = schedules.find((s) => getScheduleBranchCodes(s).includes(cleanCode));
    if (directMatch) return directMatch;
  }

  // 2. Operating zone match
  if (normBranchZone) {
    const zoneMatch = schedules.find((s) => normalizeZoneCode(s.operating_zone) === normBranchZone);
    if (zoneMatch) return zoneMatch;
  }

  // 3. Company default fallback
  const defaultMatch = schedules.find(
    (s) => !s.operating_zone && getScheduleBranchCodes(s).length === 0 && !s.department_id
  );
  return defaultMatch || schedules[0] || null;
}

export function getBranchOperatingHoursDisplay(
  branch: { code?: string; operating_zone?: string } | null | undefined,
  schedules: WorkSchedule[] = []
): {
  zoneCode: string;
  zoneLabel: string;
  scheduleName: string;
  openLines: string[];
  closedLines: string[];
} {
  const matched = resolveBranchSchedule(branch, schedules);
  const normZone = normalizeZoneCode(matched?.operating_zone || branch?.operating_zone || 'ZONE_B') || 'ZONE_B';
  const zoneLabel = formatZoneDisplayName(normZone);
  const scheduleName = matched?.schedule_name || (normZone === 'ZONE_A' ? 'Standard Office Hours (Zone A)' : 'Standard Office Hours (Zone B)');

  const days = matched?.days && matched.days.length > 0 ? matched.days : getZonePresetDays(normZone).days;
  const specialRules =
    matched?.special_rules && matched.special_rules.length > 0
      ? matched.special_rules
      : getZonePresetDays(normZone).specialRules;

  const daysMap = new Map(days.map((d) => [d.day_of_week, d]));
  const fri = daysMap.get('Friday');
  const isFridayOff = fri && !fri.is_working_day;

  const order: Array<WorkScheduleDay['day_of_week']> = isFridayOff
    ? ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const orderedDays = order
    .map((name) => daysMap.get(name))
    .filter((d): d is WorkScheduleDay => Boolean(d));

  const groups: Array<{ startDay: string; endDay: string; startTime: string | null; endTime: string | null; isWorking: boolean }> = [];
  for (const d of orderedDays) {
    const sTime = d.is_working_day ? (d.start_time || '08:30:00').slice(0, 5) : null;
    const eTime = d.is_working_day ? (d.end_time || '17:30:00').slice(0, 5) : null;
    const prev = groups[groups.length - 1];
    if (prev && prev.isWorking === d.is_working_day && prev.startTime === sTime && prev.endTime === eTime) {
      prev.endDay = d.day_of_week;
    } else {
      groups.push({
        startDay: d.day_of_week,
        endDay: d.day_of_week,
        startTime: sTime,
        endTime: eTime,
        isWorking: d.is_working_day,
      });
    }
  }

  const openLines: string[] = [];
  const closedLines: string[] = [];

  for (const g of groups) {
    const dayRange = g.startDay === g.endDay ? g.startDay : `${g.startDay} – ${g.endDay}`;
    if (g.isWorking) {
      openLines.push(`${formatTime12Hour(g.startTime)} – ${formatTime12Hour(g.endTime)} (${dayRange})`);
    } else {
      closedLines.push(`Closed (${dayRange})`);
    }
  }

  if (specialRules.includes('first_thursday_full')) {
    const mon = daysMap.get('Monday');
    const fullStart = formatTime12Hour(mon?.start_time || '08:30:00');
    const fullEnd = formatTime12Hour(mon?.end_time || '17:30:00');
    openLines.push(`${fullStart} – ${fullEnd} (First Thursday of the Month)`);
  }

  if (specialRules.includes('first_saturday_closed')) {
    closedLines.push('Closed (First Saturday of the Month)');
  }

  return {
    zoneCode: normZone,
    zoneLabel,
    scheduleName,
    openLines,
    closedLines,
  };
}

export interface OperatingZoneOption {
  value: string;
  zoneLabel: string;
  shortLabel: string;
  scheduleName: string;
  hoursSummary: string;
  fullLabel: string;
  label: string;
  branchCodes: string[];
  scheduleId?: number;
}

export function getOperatingZoneOptionsFromSchedules(schedules: WorkSchedule[] = []): OperatingZoneOption[] {
  const optionsMap = new Map<string, OperatingZoneOption>();

  for (const s of schedules) {
    const rawZone = s.operating_zone ? String(s.operating_zone).trim() : '';
    const normZone = rawZone ? normalizeZoneCode(rawZone) : '';
    const zoneVal = normZone || (rawZone ? rawZone.toUpperCase().replace(/\s+/g, '_') : '') || 'STANDARD';
    const zoneLabel = normZone ? formatZoneDisplayName(normZone).toUpperCase() : (rawZone ? rawZone.replace(/_/g, ' ').toUpperCase() : '');
    const hoursSummary = formatScheduleCoreHoursSummary(s);
    const branchCodes = getScheduleBranchCodes(s);
    const fullLabel = zoneLabel ? `${zoneLabel} — ${s.schedule_name} (${hoursSummary})` : `${s.schedule_name} (${hoursSummary})`;
    
    // Key by zoneVal or schedule id if multiple schedules have no zone
    const optionKey = zoneVal === 'STANDARD' && schedules.filter(ws => !ws.operating_zone).length > 1
      ? `SCHEDULE_${s.id}`
      : zoneVal;

    optionsMap.set(optionKey, {
      value: optionKey,
      zoneLabel: zoneLabel || s.schedule_name,
      shortLabel: zoneLabel || s.schedule_name,
      scheduleName: s.schedule_name,
      hoursSummary,
      fullLabel,
      label: fullLabel,
      branchCodes,
      scheduleId: s.id,
    });
  }

  // Ensure Zone A and Zone B are ONLY available as baseline options if no schedules were provided/found
  if (optionsMap.size === 0) {
    const fullLabel = 'ZONE A — Standard Office Hours (Zone A) (Sat–Wed: 08:30 - 17:30 | Thu: 08:30 - 13:00 | Fri Off)';
    optionsMap.set('ZONE_A', {
      value: 'ZONE_A',
      zoneLabel: 'ZONE A',
      shortLabel: 'ZONE A',
      scheduleName: 'Standard Office Hours (Zone A)',
      hoursSummary: 'Sat–Wed: 08:30 - 17:30 | Thu: 08:30 - 13:00 | Fri Off',
      fullLabel,
      label: fullLabel,
      branchCodes: [],
    });

    const fullLabelB = 'ZONE B — Standard Office Hours (Zone B) (Mon–Fri: 08:30 - 17:30 | Sat: 08:30 - 13:00 | Sun Off)';
    optionsMap.set('ZONE_B', {
      value: 'ZONE_B',
      zoneLabel: 'ZONE B',
      shortLabel: 'ZONE B',
      scheduleName: 'Standard Office Hours (Zone B)',
      hoursSummary: 'Mon–Fri: 08:30 - 17:30 | Sat: 08:30 - 13:00 | Sun Off',
      fullLabel: fullLabelB,
      label: fullLabelB,
      branchCodes: [],
    });
  }

  return Array.from(optionsMap.values());
}
