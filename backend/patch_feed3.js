const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '../backend/server.js');
let serverContent = fs.readFileSync(serverFile, 'utf8');

// A. Remove Irregular Clock-In Location notification
const notificationRegex = /    \/\/ Send HR notification if temporary assignment or multi-location[\s\S]*?    \} catch \(err\) \{/;
if (serverContent.match(notificationRegex)) {
  serverContent = serverContent.replace(notificationRegex, '    } catch (err) {');
}

// B. /api/employees SELECT main
const empSelectOld = `        today.clock_in AS today_clock_in,
        today.clock_out AS today_clock_out
      FROM profiles p`;
const empSelectNew = `        today.clock_in AS today_clock_in,
        today.clock_out AS today_clock_out,
        today.attendance_type AS today_attendance_type,
        today.location AS today_location
      FROM profiles p`;
if (serverContent.includes(empSelectOld)) {
  serverContent = serverContent.replace(empSelectOld, empSelectNew);
}

// C. /api/employees SELECT subquery (around line 3564)
const empSubOld = `      LEFT JOIN (
        SELECT a.user_id, a.clock_in, a.clock_out
        FROM attendances a
        INNER JOIN (
          SELECT user_id, MAX(attendance_id) AS latest_attendance_id
          FROM attendances
          WHERE DATE(clock_in AT TIME ZONE 'Asia/Kuala_Lumpur') = \${date ? '?::date' : 'CURRENT_DATE'}
          GROUP BY user_id
        ) latest ON latest.latest_attendance_id = a.attendance_id
      ) today ON today.user_id = p.user_id`;

const empSubNew = `      LEFT JOIN (
        SELECT a.user_id, a.clock_in, a.clock_out, a.attendance_type, a.location
        FROM attendances a
        INNER JOIN (
          SELECT user_id, MAX(attendance_id) AS latest_attendance_id
          FROM attendances
          WHERE DATE(clock_in AT TIME ZONE 'Asia/Kuala_Lumpur') = \${date ? '?::date' : 'CURRENT_DATE'}
          GROUP BY user_id
        ) latest ON latest.latest_attendance_id = a.attendance_id
      ) today ON today.user_id = p.user_id`;

if (serverContent.includes(empSubOld)) {
  serverContent = serverContent.replace(empSubOld, empSubNew);
}

fs.writeFileSync(serverFile, serverContent, 'utf8');
console.log("server.js patched carefully!");

// 2. Patch PresenceFeed.tsx UI
const feedFile = path.join(__dirname, '../src/components/PresenceFeed.tsx');
let feedContent = fs.readFileSync(feedFile, 'utf8');

// Add to activeList pushing
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

// UI Badge
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
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-purple-500/10 text-[#7B0099] border border-purple-200 shrink-0 shadow-sm flex items-center gap-1">
                              TEMP: {emp.today_location}
                            </span>
                          )}
                        </div>`;

if (feedContent.includes(oldBadgeDiv)) {
  feedContent = feedContent.replace(oldBadgeDiv, newBadgeDiv);
}

fs.writeFileSync(feedFile, feedContent, 'utf8');
console.log("PresenceFeed.tsx patched carefully!");
