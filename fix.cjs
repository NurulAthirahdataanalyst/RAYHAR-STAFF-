const fs = require('fs');
let content = fs.readFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', 'utf8');

const subtitles = {
    'Workforce Insights': 'Gain actionable insights into workforce performance and attendance behavior.',
    'Workforce Insight': 'Gain actionable insights into workforce performance and attendance behavior.',
    'Employee Distribution': 'Overview of employee allocation across headquarters and branch locations.',
    'Top Performer': 'Recognize employees with outstanding attendance performance.',
    'Branch Workforce Distribution': 'View workforce distribution across all company branches and regions.',
    'Temporary Branch Assignment': 'Monitor active, upcoming, and completed temporary branch assignments.',
    'Leave Monitoring': 'Track leave requests, approvals, and employee leave status.',
    'Employee Performance & Attendance': 'Monitor attendance trends and identify top and low-performing employees.',
    'Top Attendance Performers': 'Employees with the highest attendance rates during the selected period.',
    'Highest Late Arrivals': 'Employees with the most recorded late arrivals.',
    'Highest Absent': 'Employees with the highest number of absence records.',
    'Clock-In/Out': 'Live updates of employee clock-in and clock-out activities.',
    'Late': 'Employees who reported late for the current workday.',
    'Absent / Leave / Outstation': 'Current employees who are absent, on leave, or assigned outstation.',
    'Active Outstation': 'Employees currently assigned to outstation duties.',
    'Pending Approvals': 'Requests awaiting review and approval from authorized personnel.'
};

let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    for (const [title, sub] of Object.entries(subtitles)) {
        if (lines[i].includes('>' + title + '</')) {
            if (i + 1 < lines.length && (lines[i+1].includes(sub) || lines[i+1].includes('Real-time status') || lines[i+1].includes('text-xs text-foreground mt-0.5'))) {
                continue;
            }
            const match = lines[i].match(/^\s*/);
            const spaces = match ? match[0] : '';
            lines.splice(i + 1, 0, spaces + '<div className="text-xs text-foreground mt-0.5">' + sub + '</div>');
            i++; 
        }
    }
}

fs.writeFileSync('src/pages/hr-analytics/WorkforceInsights.tsx', lines.join('\n'), 'utf8');
console.log('Done!');
