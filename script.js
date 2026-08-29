const fs = require('fs');

let content = fs.readFileSync('src/components/shared/StaffProfileDialog.tsx', 'utf-8');

const regex = /<TabsContent value="attendance_settings" className="mt-0">[\s\S]*?<\/TabsContent>\s*<TabsContent value="location_history">/;
const match = content.match(regex);

if (match) {
    let oldBlock = match[0];
    
    // Extract pieces using regex on the oldBlock
    const primaryBranchMatch = oldBlock.match(/(<Card>\s*<CardContent[^>]*>\s*<h3[^>]*>Primary Branch<\/h3>[\s\S]*?<\/Card>)/);
    const primaryBranch = primaryBranchMatch ? primaryBranchMatch[1] : '';
    
    const manageAllowedMatch = oldBlock.match(/({role === "hr_admin" \? \(\s*<Card>[\s\S]*?<h3[^>]*>Manage Allowed Branches<\/h3>[\s\S]*?<\/Card>\s*\)\s*:\s*null})/);
    const manageAllowed = manageAllowedMatch ? manageAllowedMatch[1] : '';
    
    const tempFormMatch = oldBlock.match(/(<Card>\s*<CardContent[^>]*>\s*<h3[^>]*>Temporary Assignment<\/h3>[\s\S]*?<\/Card>)/);
    const tempForm = tempFormMatch ? tempFormMatch[1] : '';
    
    const allowedTableMatch = oldBlock.match(/(<Card>\s*<CardContent[^>]*>\s*<h3[^>]*>Allowed Branches<\/h3>[\s\S]*?<\/Card>)/);
    const allowedTable = allowedTableMatch ? allowedTableMatch[1] : '';
    
    const tempHistMatch = oldBlock.match(/(<Card>\s*<CardContent[^>]*>\s*<h3[^>]*>Assignment History<\/h3>[\s\S]*?<\/Card>)/);
    const tempHist = tempHistMatch ? tempHistMatch[1] : '';

    const newBlock = <TabsContent value="attendance_settings" className="mt-0">
                  {loadingSettings ? (
                    <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-4">
                        \
                        \
                      </div>
                      <div className="space-y-4">
                        \
                      </div>
                    </div>
                  )}
                </TabsContent>
              
                <TabsContent value="temporary_assignment" className="mt-0">
                  {loadingSettings ? (
                    <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                  ) : (
                    <div className="max-w-3xl mx-auto space-y-6">
                      \
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="multi_location" className="mt-0">
                  {loadingSettings ? (
                    <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                  ) : (
                    <div className="max-w-3xl mx-auto space-y-6">
                      \
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="location_history">;

    const newContent = content.replace(match[0], newBlock);
    fs.writeFileSync('src/components/shared/StaffProfileDialog.tsx', newContent);
    console.log('Refactored successfully.');
} else {
    console.log('Could not find the block to replace.');
}
