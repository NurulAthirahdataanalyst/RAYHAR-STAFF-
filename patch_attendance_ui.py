import re

file_path = "c:\\Users\\HP\\ATTENDANCE_SYSTEM\\src\\pages\\Attendance.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Make sure Dialog is imported from @/components/ui/dialog
if "DialogContent" not in content:
    content = content.replace(
        'import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";',
        'import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";\nimport { Dialog, DialogContent, DialogHeader, DialogTitle as DTitle } from "@/components/ui/dialog";'
    )
else:
    # already imported?
    pass

# We will inject the dialog at the end of the return statement.
end_tag = "    </div>\n  );\n}"

dialog_code = """
      {/* Outstation Prompt Modal */}
      <Dialog open={outstationPromptOpen} onOpenChange={setOutstationPromptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DTitle>Outside Branch Area</DTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              You're outside your assigned branch. Would you like to check in using Outstation Mode?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOutstationPromptOpen(false)}>Cancel</Button>
              <Button type="button" onClick={confirmOutstationMode} className="bg-[#7B0099] text-white hover:bg-[#7B0099]/90">
                Outstation Mode
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
"""

if "Outstation Prompt Modal" not in content:
    content = content.replace(end_tag, dialog_code)

# Add "Update My Location" button if the user is clocked in as OUTSTATION
# We can find the 'activeSession?.attendance_type' maybe.
# Wait, let's see if the subagent already added it. I don't see it in the previous tail command.
# I will search for "handleUpdateLocation" usage.
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Attendance.tsx patched with Dialog.")
