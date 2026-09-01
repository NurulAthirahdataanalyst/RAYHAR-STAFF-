with open('src/pages/LeaveFormView.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
start = -1
end = -1
for i, line in enumerate(lines):
    if 'divide-blue-500' in line and '<TableBody' in line:
        start = i
    if start != -1 and '</TableBody>' in line:
        end = i
        break

new_lines = [
    '                            <TableBody className="divide-y divide-blue-500/10 font-bold text-foreground/80">\n',
    '                              {rows.map((row, idx) => {\n',
    '                                let actualHours: number | null = null;\n',
    '                                let hasCalculated = false;\n',
    '                                if (selectedForm.replacementValidations && selectedForm.replacementValidations.length > 0) {\n',
    '                                  const val = selectedForm.replacementValidations.find((v: any) => {\n',
    '                                    const valDateStr = String(v.replacement_date).substring(0, 10);\n',
    '                                    let rowDateStr = row.tarikhGanti;\n',
    '                                    if (rowDateStr.includes("/")) {\n',
    '                                       const parts = rowDateStr.split("/");\n',
    '                                       if (parts.length === 3) {\n',
    '                                          rowDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;\n',
    '                                       }\n',
    '                                    }\n',
    '                                    return valDateStr === rowDateStr;\n',
    '                                  });\n',
    '                                  if (val) {\n',
    '                                    if (val.validation_status === "Validated" || val.validation_status === "Failed" || val.validation_status === "Completed" || (val.actual_hours !== null && val.actual_hours > 0)) {\n',
    '                                      actualHours = val.actual_hours;\n',
    '                                      hasCalculated = true;\n',
    '                                    }\n',
    '                                  }\n',
    '                                }\n',
    '                                return (\n',
    '                                <TableRow key={idx} className="hover:bg-blue-500/5">\n',
    '                                  <TableCell className="py-2 px-4">{row.tarikhCuti || "-"}</TableCell>\n',
    '                                  <TableCell className="py-2 px-4">{row.tarikhGanti || "-"}</TableCell>\n',
    '                                  <TableCell className="py-2 px-4 whitespace-normal break-words max-w-[200px] text-[11px] text-blue-900/80 font-medium">{row.keterangan || "-"}</TableCell>\n',
    '                                  <TableCell className="py-2 px-4 text-right">{hasCalculated ? `${actualHours} Jam` : "-- Jam"}</TableCell>\n',
    '                                </TableRow>\n',
    '                                );\n',
    '                              })}\n',
    '                            </TableBody>\n'
]

lines[start:end+1] = new_lines

with open('src/pages/LeaveFormView.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
