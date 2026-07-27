const fs = require('fs');
const path = require('path');

// 1. Patch server.js
const serverFile = path.join(__dirname, '../backend/server.js');
let serverContent = fs.readFileSync(serverFile, 'utf8');

// A. Remove Irregular Clock-In Location notification
const notificationRegex = /    \/\/ Send HR notification if temporary assignment or multi-location[\s\S]*?    \} catch \(err\) \{/;
if (serverContent.match(notificationRegex)) {
  serverContent = serverContent.replace(notificationRegex, '    } catch (err) {');
}

// B. Update /api/employees query
const selectRegex = /today\.clock_in AS today_clock_in,\s*today\.clock_out AS today_clock_out/;
if (serverContent.match(selectRegex) && !serverContent.includes('today_attendance_type')) {
  serverContent = serverContent.replace(
    selectRegex, 
    'today.clock_in AS today_clock_in,\n        today.clock_out AS today_clock_out,\n        today.attendance_type AS today_attendance_type,\n        today.location AS today_location'
  );
}

const subqueryRegex = /SELECT a\.user_id, a\.clock_in, a\.clock_out/;
if (serverContent.match(subqueryRegex) && !serverContent.includes('a.attendance_type')) {
  serverContent = serverContent.replace(
    subqueryRegex,
    'SELECT a.user_id, a.clock_in, a.clock_out, a.attendance_type, a.location'
  );
}

fs.writeFileSync(serverFile, serverContent, 'utf8');
console.log("server.js patched!");

// 2. Patch PresenceFeed.tsx
const feedFile = path.join(__dirname, '../src/components/PresenceFeed.tsx');
let feedContent = fs.readFileSync(feedFile, 'utf8');

// A. Add to activeList pushing
const pushInRegex = /id: \`emp-in-\$\{e\.user_id\}\`,\s*is_leave_submission: false,\s*today_status: "Present",\s*event_time: e\.today_clock_in,/;
if (feedContent.match(pushInRegex) && !feedContent.includes('today_attendance_type: e.today_attendance_type')) {
  feedContent = feedContent.replace(
    pushInRegex,
    `id: \`emp-in-\${e.user_id}\`,
              is_leave_submission: false,
              today_status: "Present",
              event_time: e.today_clock_in,
              today_attendance_type: e.today_attendance_type,
              today_location: e.today_location,`
  );
}

// B. Add badge in the UI
const oldBadgeDiv = `<div className="mt-2.5 flex items-center">
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-purple-50 dark:bg-purple-950/40 text-[#7B0099] border border-purple-100 dark:border-purple-900/40 shrink-0">
                            {getDeptShortCode(emp.department, emp.branch)}
                          </span>
                        </div>`;

const newBadgeDiv = `<div className="mt-2.5 flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-purple-50 dark:bg-purple-950/40 text-[#7B0099] border border-purple-100 dark:border-purple-900/40 shrink-0">
                            {getDeptShortCode(emp.department, emp.branch)}
                          </span>
                          {emp.today_attendance_type === "Temporary Assignment" && (
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-purple-500/10 text-purple-700 border border-purple-200 shrink-0 shadow-sm flex items-center gap-1">
                              TEMP: {emp.today_location}
                            </span>
                          )}
                        </div>`;

if (feedContent.includes(oldBadgeDiv)) {
  feedContent = feedContent.replace(oldBadgeDiv, newBadgeDiv);
  console.log("PresenceFeed.tsx UI patched!");
}

fs.writeFileSync(feedFile, feedContent, 'utf8');
