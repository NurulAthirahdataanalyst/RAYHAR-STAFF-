import { describe, it, expect } from 'vitest';
import {
  calculateLateWorkingHour,
  calculateTotalWorkingHoursFormatted,
  calculateTotalRestMinutes,
  calculateDailyRestMinutesValue,
  calculateMonthlyBreakMinutes,
  calculateStatusClockIn,
  calculateStatusClockOut,
  calculateDayStatus,
  isFirstClockInOfDay,
  parseTimeToMinutes,
  formatDurationHHMM
} from './workingHoursCalculator';

describe('workingHoursCalculator', () => {
  describe('Late Working Hour', () => {
    it('clock in before 8:30 AM should be 0 Min', () => {
      expect(calculateLateWorkingHour('8:25 AM', '08:30')).toBe('0 Min');
    });

    it('clock in exactly at 8:30 AM should be 0 Min', () => {
      expect(calculateLateWorkingHour('8:30 AM', '08:30')).toBe('0 Min');
    });

    it('clock in at 8:40 AM should be 10 Min', () => {
      expect(calculateLateWorkingHour('8:40 AM', '08:30')).toBe('10 Min');
    });

    it('clock in at 8:45 AM should be 15 Min (e.g. 15 Min not 00 H 15 M)', () => {
      expect(calculateLateWorkingHour('8:45 AM', '08:30')).toBe('15 Min');
    });

    it('clock in at 8:55 AM should be 25 Min', () => {
      expect(calculateLateWorkingHour('8:55 AM', '08:30')).toBe('25 Min');
    });

    it('clock in at 9:15 AM should be 45 Min', () => {
      expect(calculateLateWorkingHour('9:15 AM', '08:30')).toBe('45 Min');
    });

    it('optional hhmm format should still work if requested', () => {
      expect(calculateLateWorkingHour('8:45 AM', '08:30', 'hhmm')).toBe('00 H 15 M');
      expect(calculateLateWorkingHour('8:25 AM', '08:30', 'hhmm')).toBe('00 H 00 M');
    });

    it('no clock in should be --', () => {
      expect(calculateLateWorkingHour(null, '08:30')).toBe('--');
    });

    it('subsequent clock in records must display — (not calculate late)', () => {
      // 1. Explicit 4th param
      expect(calculateLateWorkingHour('2:00 PM', '08:30', 'min', false)).toBe('—');
      // 2. Record with is_subsequent: true
      expect(calculateLateWorkingHour({ clock_in: '2:00 PM', is_subsequent: true }, '08:30')).toBe('—');
      // 3. Record with is_first_clock_in: false
      expect(calculateLateWorkingHour({ clock_in: '2:00 PM', is_first_clock_in: false }, '08:30')).toBe('—');
    });

    it('first clock in vs subsequent clock in for Achmed Amzar example', () => {
      const records = [
        { user_id: 'E032', clock_in: '2026-11-02T08:45:00+08:00', time_in: '08:45 AM' },
        { user_id: 'E032', clock_in: '2026-11-02T14:00:00+08:00', time_in: '02:00 PM' }
      ];

      expect(isFirstClockInOfDay(records[0], records)).toBe(true);
      expect(isFirstClockInOfDay(records[1], records)).toBe(false);

      expect(calculateLateWorkingHour(records[0].clock_in, '08:30', 'min', isFirstClockInOfDay(records[0], records))).toBe('15 Min');
      expect(calculateLateWorkingHour(records[1].clock_in, '08:30', 'min', isFirstClockInOfDay(records[1], records))).toBe('—');
    });
  });

  describe('Working Hours (Rule 1: Early Clock-In Clamping)', () => {
    it('8:25 AM to 5:30 PM should be 09 H 00 M', () => {
      const res = calculateTotalWorkingHoursFormatted({
        sessions: [{ clock_in: '8:25 AM', clock_out: '5:30 PM' }]
      }, '08:30');
      expect(res).toBe('09 H 00 M');
    });

    it('8:30 AM to 5:30 PM should be 09 H 00 M', () => {
      const res = calculateTotalWorkingHoursFormatted({
        sessions: [{ clock_in: '8:30 AM', clock_out: '5:30 PM' }]
      }, '08:30');
      expect(res).toBe('09 H 00 M');
    });

    it('8:40 AM to 5:30 PM should be 08 H 50 M', () => {
      const res = calculateTotalWorkingHoursFormatted({
        sessions: [{ clock_in: '8:40 AM', clock_out: '5:30 PM' }]
      }, '08:30');
      expect(res).toBe('08 H 50 M');
    });

    it('8:40 AM to 5:40 PM should be 09 H 00 M', () => {
      const res = calculateTotalWorkingHoursFormatted({
        sessions: [{ clock_in: '8:40 AM', clock_out: '5:40 PM' }]
      }, '08:30');
      expect(res).toBe('09 H 00 M');
    });
  });

  describe('Multiple Sessions & Rest Calculation', () => {
    it('Two sessions: 8:20 AM - 1:15 PM and 2:00 PM - 5:30 PM', () => {
      const sessions = [
        { clock_in: '8:20 AM', clock_out: '1:15 PM' },
        { clock_in: '2:00 PM', clock_out: '5:30 PM' },
      ];
      // Working hours: (8:30 to 1:15 PM = 4h 45m) + (2:00 PM to 5:30 PM = 3h 30m) = 8h 15m
      const workHrs = calculateTotalWorkingHoursFormatted({ sessions }, '08:30');
      expect(workHrs).toBe('08 H 15 M');

      // Rest: 2:00 PM - 1:15 PM = 45 Min
      const rest = calculateTotalRestMinutes({ sessions });
      expect(rest).toBe('45 Min');
    });

    it('Three sessions: 8:20 AM - 12:00 PM, 12:45 PM - 3:00 PM, 3:30 PM - 5:30 PM', () => {
      const sessions = [
        { clock_in: '8:20 AM', clock_out: '12:00 PM' },
        { clock_in: '12:45 PM', clock_out: '3:00 PM' },
        { clock_in: '3:30 PM', clock_out: '5:30 PM' },
      ];
      // Rest 1: 12:45 PM - 12:00 PM = 45 Min
      // Rest 2: 3:30 PM - 3:00 PM = 30 Min
      // Total Rest = 75 Min
      const rest = calculateTotalRestMinutes({ sessions });
      expect(rest).toBe('75 Min');
    });

    it('Single session full working day (8:30 AM - 5:33 PM) assumes 60 Min rest', () => {
      expect(
        calculateTotalRestMinutes({
          sessions: [{ clock_in: '8:30 AM', clock_out: '5:33 PM' }],
        })
      ).toBe('60 Min');

      expect(
        calculateTotalRestMinutes({
          clock_in: '8:30 AM',
          clock_out: '5:33 PM',
        })
      ).toBe('60 Min');
    });

    it('Single session short/half-day or open session returns 0 Min rest', () => {
      expect(
        calculateTotalRestMinutes({
          sessions: [{ clock_in: '8:30 AM', clock_out: '1:00 PM' }],
        })
      ).toBe('0 Min');

      expect(
        calculateTotalRestMinutes({
          sessions: [{ clock_in: '8:30 AM', clock_out: null }],
        })
      ).toBe('0 Min');
    });

    it('Monthly break aggregation sums daily rest and assumed 60 Min single-session breaks (60+62+46+48+50+59+60+60 = 445 Min)', () => {
      const logs = [
        // Day 1: single session full day -> 60 Min
        { date: '2026-11-01', clock_in: '8:30 AM', clock_out: '5:33 PM', status: 'Present (On Time)' },
        // Day 2: two sessions -> 62 Min gap
        { date: '2026-11-02', clock_in: '8:30 AM', clock_out: '1:00 PM', status: 'Present (On Time)' },
        { date: '2026-11-02', clock_in: '2:02 PM', clock_out: '5:30 PM', status: 'Present (On Time)' },
        // Day 3: two sessions -> 46 Min gap
        { date: '2026-11-03', clock_in: '8:30 AM', clock_out: '1:00 PM', status: 'Present (On Time)' },
        { date: '2026-11-03', clock_in: '1:46 PM', clock_out: '5:30 PM', status: 'Present (On Time)' },
        // Day 4: two sessions -> 48 Min gap
        { date: '2026-11-04', clock_in: '8:30 AM', clock_out: '1:00 PM', status: 'Present (On Time)' },
        { date: '2026-11-04', clock_in: '1:48 PM', clock_out: '5:30 PM', status: 'Present (On Time)' },
        // Day 5: two sessions -> 50 Min gap
        { date: '2026-11-05', clock_in: '8:30 AM', clock_out: '1:00 PM', status: 'Present (On Time)' },
        { date: '2026-11-05', clock_in: '1:50 PM', clock_out: '5:30 PM', status: 'Present (On Time)' },
        // Weekend / Leave / Absent -> 0 Min
        { date: '2026-11-06', clock_in: null, clock_out: null, status: 'Weekend' },
        { date: '2026-11-07', clock_in: null, clock_out: null, status: 'Approved Leave', is_on_leave: true },
        // Day 6: single session full day -> 60 Min
        { date: '2026-11-08', clock_in: '8:30 AM', clock_out: '5:30 PM', status: 'Present (On Time)' },
        // Day 7: single session full day -> 60 Min
        { date: '2026-11-09', clock_in: '8:30 AM', clock_out: '5:30 PM', status: 'Present (On Time)' },
        // Day 8 (today): two sessions -> 59 Min gap (second session still active)
        { date: '2026-11-10', attendance_id: 101, clock_in: '8:30 AM', clock_out: '1:01 PM', status: 'Present (On Time)' },
        { date: '2026-11-10', attendance_id: 102, clock_in: '2:00 PM', clock_out: null, status: 'Present (On Time)' },
      ];

      const { totalBreakMins, todayRestMins } = calculateMonthlyBreakMinutes(
        logs,
        { attendance_id: 102, date: '2026-11-10', clock_in: '2:00 PM', clock_out: null },
        '2026-11-10'
      );

      expect(calculateDailyRestMinutesValue({ clock_in: '8:30 AM', clock_out: '5:33 PM' })).toBe(60);
      expect(todayRestMins).toBe(59);
      expect(totalBreakMins).toBe(445); // 7h 25m
    });
  });

  describe('Status Clock In', () => {
    it('First Clock In < Grace Cutoff (08:30 + 30m = 09:00 AM) -> Present (On Time)', () => {
      expect(calculateStatusClockIn({ clock_in: '8:25 AM' }, '08:30', 30)).toBe('Present (On Time)');
      expect(calculateStatusClockIn({ clock_in: '8:45 AM' }, '08:30', 30)).toBe('Present (On Time)');
      expect(calculateStatusClockIn({ clock_in: '8:59 AM' }, '08:30', 30)).toBe('Present (On Time)');
    });

    it('First Clock In >= Grace Cutoff (08:30 + 30m = 09:00 AM) -> Present (Late)', () => {
      expect(calculateStatusClockIn({ clock_in: '9:00 AM' }, '08:30', 30)).toBe('Present (Late)');
      expect(calculateStatusClockIn({ clock_in: '9:15 AM' }, '08:30', 30)).toBe('Present (Late)');
    });

    it('Dynamic Grace Period: 15 minutes grace cutoff (08:30 + 15m = 08:45 AM)', () => {
      expect(calculateStatusClockIn({ clock_in: '8:44 AM' }, '08:30', 15)).toBe('Present (On Time)');
      expect(calculateStatusClockIn({ clock_in: '8:45 AM' }, '08:30', 15)).toBe('Present (Late)');
    });

    it('No Clock In Record -> Absent', () => {
      expect(calculateStatusClockIn({ clock_in: null }, '08:30')).toBe('Absent');
      expect(calculateStatusClockIn({}, '08:30')).toBe('Absent');
    });

    it('Approved Leave (even if they clocked in) -> Approved Leave', () => {
      expect(calculateStatusClockIn({ status: 'Approved Leave', clock_in: '8:20 AM' }, '08:30')).toBe('Approved Leave');
      expect(calculateStatusClockIn({ leave_type: 'Annual Leave' }, '08:30')).toBe('Approved Leave');
    });

    it('Company Leave (even if they clocked in) -> Company Leave', () => {
      expect(calculateStatusClockIn({ status: 'Company Leave', clock_in: '8:30 AM' }, '08:30')).toBe('Company Leave');
    });

    it('Weekend -> Weekend', () => {
      expect(calculateStatusClockIn({ status: 'Weekend' }, '08:30')).toBe('Weekend');
    });

    it('Outstation -> Outstation', () => {
      expect(calculateStatusClockIn({ status: 'Outstation' }, '08:30')).toBe('Outstation');
    });
  });

  describe('Status Clock Out', () => {
    it('Missing Clock Out: Clock In with no final Clock Out record', () => {
      expect(calculateStatusClockOut({ clock_in: '8:30 AM', clock_out: null }, '08:30')).toBe('Missing Clock Out');
    });

    it('Multi-session with break clock out and open final session -> Missing Clock Out (not Clocked Out Early)', () => {
      // ACHMED AMZAR scenario: Clock Out 1 = 1:11 PM, Clock In 2 = 2:00 PM, Clock Out 2 = N/A
      const sessions = [
        { clock_in: '8:45 AM', clock_out: '1:11 PM' },
        { clock_in: '2:00 PM', clock_out: null },
      ];
      expect(calculateStatusClockOut({ sessions }, '08:30')).toBe('Missing Clock Out');
    });

    it('Clock Out: Valid final Clock Out and Working Hours >= 07 H 59 M', () => {
      // 8:30 AM to 5:30 PM = 9h 00m
      expect(calculateStatusClockOut({ clock_in: '8:30 AM', clock_out: '5:30 PM' }, '08:30')).toBe('Clock Out');
      // 8:20 AM (starts 8:30) to 4:29 PM = 7h 59m
      expect(calculateStatusClockOut({ clock_in: '8:20 AM', clock_out: '4:29 PM' }, '08:30')).toBe('Clock Out');
      // 8:20 AM (clamped to 8:30) to 1:15 PM (4h 45m) + 2:00 PM to 5:30 PM (3h 30m) = 8h 15m
      const sessions = [
        { clock_in: '8:20 AM', clock_out: '1:15 PM' },
        { clock_in: '2:00 PM', clock_out: '5:30 PM' },
      ];
      expect(calculateStatusClockOut({ sessions }, '08:30')).toBe('Clock Out');
    });

    it('Clocked Out Early: Valid final Clock Out, no further clock in, and Working Hours < 07 H 59 M', () => {
      // 8:25 AM to 1:12 PM, no further Clock In
      expect(calculateStatusClockOut({ clock_in: '8:25 AM', clock_out: '1:12 PM' }, '08:30')).toBe('Clocked Out Early');
      // 8:30 AM to 3:00 PM = 6h 30m
      expect(calculateStatusClockOut({ clock_in: '8:30 AM', clock_out: '3:00 PM' }, '08:30')).toBe('Clocked Out Early');
      // 8:30 AM to 4:00 PM = 7h 30m
      expect(calculateStatusClockOut({ clock_in: '8:30 AM', clock_out: '4:00 PM' }, '08:30')).toBe('Clocked Out Early');
      // 8:30 AM to 4:28 PM = 7h 58m (< 479 mins)
      expect(calculateStatusClockOut({ clock_in: '8:30 AM', clock_out: '4:28 PM' }, '08:30')).toBe('Clocked Out Early');
    });

    it('Special Handling: Approved Leave, Company Leave, Weekend, Outstation, Absent -> same status', () => {
      expect(calculateStatusClockOut({ status: 'Approved Leave', clock_in: '8:20 AM', clock_out: '5:30 PM' }, '08:30')).toBe('Approved Leave');
      expect(calculateStatusClockOut({ status: 'Company Leave' }, '08:30')).toBe('Company Leave');
      expect(calculateStatusClockOut({ status: 'Weekend' }, '08:30')).toBe('Weekend');
      expect(calculateStatusClockOut({ status: 'Outstation' }, '08:30')).toBe('Outstation');
      expect(calculateStatusClockOut({ status: 'Absent' }, '08:30')).toBe('Absent');
    });

    it('Working Hours and Late Working Hour and Rest must be -- for Approved Leave, Company Leave, Weekend, Absent', () => {
      const leaveRec = { status: 'Approved Leave', clock_in: '8:20 AM', clock_out: '5:30 PM' };
      expect(calculateLateWorkingHour(leaveRec, '08:30')).toBe('--');
      expect(calculateTotalWorkingHoursFormatted(leaveRec, '08:30')).toBe('--');
      expect(calculateTotalRestMinutes(leaveRec)).toBe('--');

      const weekendRec = { status: 'Weekend', clock_in: '8:20 AM', clock_out: '5:30 PM' };
      expect(calculateLateWorkingHour(weekendRec, '08:30')).toBe('--');
      expect(calculateTotalWorkingHoursFormatted(weekendRec, '08:30')).toBe('--');
      expect(calculateTotalRestMinutes(weekendRec)).toBe('--');

      const absentRec = { status: 'Absent' };
      expect(calculateLateWorkingHour(absentRec, '08:30')).toBe('--');
      expect(calculateTotalWorkingHoursFormatted(absentRec, '08:30')).toBe('--');
      expect(calculateTotalRestMinutes(absentRec)).toBe('--');
    });

    it('Outstation staff with Clock In and Clock Out must calculate Late Working Hour, Working Hours, and Rest normally', () => {
      const outstationRec = {
        status: 'Outstation',
        clock_in: '08:45 AM',
        clock_out: '05:30 PM',
        sessions: [
          { clock_in: '08:45 AM', clock_out: '01:15 PM', latitude: 3.139003, longitude: 101.686855, distance_meters: 245000, location: 'OUTSTATION' },
          { clock_in: '02:00 PM', clock_out: '05:30 PM', latitude: 3.139003, longitude: 101.686855, distance_meters: 245000, location: 'OUTSTATION' },
        ],
      };
      expect(calculateStatusClockIn(outstationRec, '08:30')).toBe('Outstation');
      expect(calculateStatusClockOut(outstationRec, '08:30')).toBe('Outstation');
      expect(calculateLateWorkingHour(outstationRec, '08:30')).toBe('15 Min');
      expect(calculateTotalWorkingHoursFormatted(outstationRec, '08:30')).toBe('08 H 00 M');
      expect(calculateTotalRestMinutes(outstationRec)).toBe('45 Min');
    });

    it('buildXlsxBinary produces a valid ZIP/OpenXML .xlsx binary header', async () => {
      const { buildXlsxBinary, getExcelColumnLetter } = await import('./xlsxExport');
      expect(getExcelColumnLetter(0)).toBe('A');
      expect(getExcelColumnLetter(25)).toBe('Z');
      expect(getExcelColumnLetter(26)).toBe('AA');

      const binary = buildXlsxBinary(
        'Attendance Report',
        ['Employee ID', 'Name', 'Late Working Hour', 'Working Hours', 'Rest', 'Status'],
        [['E032', 'ACHMED AMZAR', '15 Min', '08 H 00 M', '45 Min', 'Present (On Time)']]
      );

      // Valid ZIP local file header signature: PK\x03\x04 (0x50, 0x4b, 0x03, 0x04)
      expect(binary[0]).toBe(0x50);
      expect(binary[1]).toBe(0x4b);
      expect(binary[2]).toBe(0x03);
      expect(binary[3]).toBe(0x04);

      const textContent = new TextDecoder().decode(binary);
      expect(textContent).toContain('[Content_Types].xml');
      expect(textContent).toContain('xl/workbook.xml');
      expect(textContent).toContain('xl/worksheets/sheet1.xml');
      expect(textContent).toContain('ACHMED AMZAR');
      expect(textContent).toContain('15 Min');
    });

    it('calculateDayStatus returns Working Days, Approved Leave, Company Leave, Outstation, or Weekend', () => {
      expect(calculateDayStatus({ status: 'Present (On Time)', clock_in: '08:30 AM' })).toBe('Working Days');
      expect(calculateDayStatus({ status: 'Present (Late)', clock_in: '09:05 AM' })).toBe('Working Days');
      expect(calculateDayStatus({ status: 'Absent' })).toBe('Working Days');
      expect(calculateDayStatus({ status: 'Approved Leave', leave_type: 'Annual Leave' })).toBe('Approved Leave');
      expect(calculateDayStatus({ status: 'Company Leave', leave_type: 'Company Holiday' })).toBe('Company Leave');
      expect(calculateDayStatus({ status: 'Outstation' })).toBe('Outstation');
      expect(calculateDayStatus({ status: 'Weekend' })).toBe('Weekend');
      expect(calculateDayStatus({ status: 'Rest Day' })).toBe('Weekend');
    });
  });
});
