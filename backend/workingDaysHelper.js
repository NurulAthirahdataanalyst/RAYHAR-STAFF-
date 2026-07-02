const { isWeekend, eachDayOfInterval, format } = require('date-fns');

function calculateExpectedWorkingDays(startDate, endDate, employee, companyLeaves, userApprovedLeaves, holidays) {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  let expectedDays = 0;

  for (const day of days) {
    if (isWeekend(day)) continue;

    const dateStr = format(day, 'yyyy-MM-dd');
    
    // Check holiday
    const isHoliday = holidays.some(h => h.date === dateStr);
    if (isHoliday) continue;

    // Check company leave
    const isCompanyLeave = companyLeaves.some(cl => {
      const clStart = cl.start_date instanceof Date ? format(cl.start_date, 'yyyy-MM-dd') : (cl.start_date.split && cl.start_date.split('T')[0]);
      const clEnd = cl.end_date instanceof Date ? format(cl.end_date, 'yyyy-MM-dd') : (cl.end_date.split && cl.end_date.split('T')[0]);
      
      if (dateStr >= clStart && dateStr <= clEnd) {
        if (cl.applies_to === 'all') return true;
        if (cl.applies_to === 'branch' && cl.branch_id && cl.branch_id.includes(employee.branch)) return true;
        if (cl.applies_to === 'department' && cl.department_id && cl.department_id.includes(employee.department)) return true;
      }
      return false;
    });
    if (isCompanyLeave) continue;

    // Check user approved leave
    const isUserLeave = userApprovedLeaves.some(ul => {
      const ulStart = ul.start_date instanceof Date ? format(ul.start_date, 'yyyy-MM-dd') : (ul.start_date.split && ul.start_date.split('T')[0]);
      const ulEnd = ul.end_date instanceof Date ? format(ul.end_date, 'yyyy-MM-dd') : (ul.end_date.split && ul.end_date.split('T')[0]);
      return dateStr >= ulStart && dateStr <= ulEnd;
    });
    if (isUserLeave) continue;

    expectedDays++;
  }

  return expectedDays;
}
module.exports = { calculateExpectedWorkingDays };
