with open('src/pages/LeaveFormView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_block = """                        <TableBody className="divide-y divide-blue-500/10 font-bold text-foreground/80">
                          {rows.map((row, idx) => (
                            <TableRow key={idx} className="hover:bg-blue-500/5">
                              <TableCell className="py-2 px-4">{row.tarikhCuti || "-"}</TableCell>
                              <TableCell className="py-2 px-4">{row.tarikhGanti || "-"}</TableCell>
                              <TableCell className="py-2 px-4 whitespace-normal break-words max-w-[200px] text-[11px] text-blue-900/80 font-medium">{row.keterangan || "-"}</TableCell>
                              <TableCell className="py-2 px-4 text-right">{row.jamGanti || 0} Jam</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>"""

new_block = """                        <TableBody className="divide-y divide-blue-500/10 font-bold text-foreground/80">
                          {rows.map((row, idx) => {
                            let actualHours: number | null = null;
                            let hasCalculated = false;

                            if (selectedForm.replacementValidations && selectedForm.replacementValidations.length > 0) {
                              const val = selectedForm.replacementValidations.find((v: any) => {
                                const valDateStr = String(v.replacement_date).substring(0, 10);
                                let rowDateStr = row.tarikhGanti;
                                if (rowDateStr.includes('/')) {
                                   const parts = rowDateStr.split('/');
                                   if (parts.length === 3) {
                                      rowDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
                                   }
                                }
                                return valDateStr === rowDateStr;
                              });

                              if (val) {
                                if (val.validation_status === 'Validated' || val.validation_status === 'Failed' || val.validation_status === 'Completed' || (val.actual_hours !== null && val.actual_hours > 0)) {
                                  actualHours = val.actual_hours;
                                  hasCalculated = true;
                                }
                              }
                            }

                            return (
                              <TableRow key={idx} className="hover:bg-blue-500/5">
                                <TableCell className="py-2 px-4">{row.tarikhCuti || "-"}</TableCell>
                                <TableCell className="py-2 px-4">{row.tarikhGanti || "-"}</TableCell>
                                <TableCell className="py-2 px-4 whitespace-normal break-words max-w-[200px] text-[11px] text-blue-900/80 font-medium">{row.keterangan || "-"}</TableCell>
                                <TableCell className="py-2 px-4 text-right">
                                  {hasCalculated ? `${actualHours} Jam` : "-- Jam"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>"""

if old_block in text:
    text = text.replace(old_block, new_block)
    with open('src/pages/LeaveFormView.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Fixed LeaveFormView!")
else:
    print("Could not find the block in LeaveFormView")
