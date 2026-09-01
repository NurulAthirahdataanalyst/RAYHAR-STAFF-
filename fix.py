import re
with open('src/pages/CompanyLeaveCalendar.tsx', 'r', encoding='utf8') as f:
    text = f.read()

# We know the first part of the file is correct up until the first instance of:
# "No departments found</div>"
idx = text.find('No departments found</div>')
if idx != -1:
    idx = text.find('</div>', idx) + 6 # end of that div
    # Now append the correct ending
    new_text = text[:idx] + """
                <div className="flex flex-wrap gap-1 mt-1">
                  {(formData.department_id || '').split(',').filter(Boolean).map(name => (
                    <Badge key={name} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="is_paid" 
                checked={formData.is_paid} 
                onCheckedChange={(checked) => setFormData({ ...formData, is_paid: checked === true })} 
              />
              <Label htmlFor="is_paid" className="cursor-pointer">This is a paid leave</Label>
            </div>
            
            <div className="grid gap-3 pt-2">
              <Label>Remarks (Optional)</Label>
              <Input 
                value={formData.remarks || ''} 
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} 
                placeholder="Additional notes"
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/40">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">Save Leave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyLeaveCalendar;
"""
    with open('src/pages/CompanyLeaveCalendar.tsx', 'w', encoding='utf8') as f:
        f.write(new_text)
    print("Fixed!")
else:
    print("Could not find anchor")
