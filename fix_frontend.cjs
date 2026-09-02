const fs = require('fs');
let content = fs.readFileSync('src/pages/TemporaryAssignments.tsx', 'utf8');

// Update state initialization
content = content.replace(
  'useState({ user_id: "", location: "", start_date: "", end_date: "", status: "Active" });',
  'useState({ user_id: "", location: "", start_date: "", end_date: "", status: "Active", purpose: "", remarks: "" });'
);

// Update setAssignForm reset in form submission success
content = content.replace(
  'setAssignForm({ user_id: "", location: "", start_date: "", end_date: "", status: "Active" });',
  'setAssignForm({ user_id: "", location: "", start_date: "", end_date: "", status: "Active", purpose: "", remarks: "" });'
);

// Add the fields to the form UI
const formFieldsHTML = \
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-bold text-slate-700">Purpose</Label>
                <Input value={assignForm.purpose} onChange={e => setAssignForm({...assignForm, purpose: e.target.value})} placeholder="e.g. Project deployment" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-bold text-slate-700">Remarks</Label>
                <Textarea value={assignForm.remarks} onChange={e => setAssignForm({...assignForm, remarks: e.target.value})} placeholder="Any additional details..." rows={3} />
              </div>
            </div>
          </div>
          <DialogFooter className="bg-slate-50 border-t p-4 rounded-b-xl flex justify-between">
\;

content = content.replace(
  '          </div>\n          <DialogFooter className="bg-slate-50 border-t p-4 rounded-b-xl flex justify-between">',
  formFieldsHTML
);

// When Edit is clicked, populate purpose and remarks
content = content.replace(
  'setAssignForm({ user_id: a.user_id, location: a.temp_branch, start_date: a.start_date.split(\\'T\\')[0], end_date: a.end_date ? a.end_date.split(\\'T\\')[0] : "", status: a.status });',
  'setAssignForm({ user_id: a.user_id, location: a.temp_branch, start_date: a.start_date.split(\\'T\\')[0], end_date: a.end_date ? a.end_date.split(\\'T\\')[0] : "", status: a.status, purpose: a.purpose || "", remarks: a.remarks || "" });'
);

// Fix the View Modal mapping
content = content.replace(
  '<p className="text-xs text-foreground font-medium mb-1">Reason for Assignment</p>\n                      <div className="p-3 bg-slate-50 rounded border border-slate-100 text-sm text-slate-600">\n                        Not provided\n                      </div>',
  '<p className="text-xs text-foreground font-medium mb-1">Reason for Assignment</p>\n                      <div className="p-3 bg-slate-50 rounded border border-slate-100 text-sm text-slate-600">\n                        {viewAssignment.purpose || "Not provided"}\n                      </div>'
);

content = content.replace(
  '<p className="text-xs text-foreground font-medium mb-1">Remarks</p>\n                      <div className="p-3 bg-slate-50 rounded border border-slate-100 text-sm text-slate-600 min-h-[60px]">\n                        Not provided\n                      </div>',
  '<p className="text-xs text-foreground font-medium mb-1">Remarks</p>\n                      <div className="p-3 bg-slate-50 rounded border border-slate-100 text-sm text-slate-600 min-h-[60px]">\n                        {viewAssignment.remarks || "Not provided"}\n                      </div>'
);


fs.writeFileSync('src/pages/TemporaryAssignments.tsx', content);
console.log('updated frontend');