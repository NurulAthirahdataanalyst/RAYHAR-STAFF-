export const exportToCSV = (data: any[], filename: string) => {
  if (!data || !data.length) {
    return;
  }

  // Extract headers
  const headers = Object.keys(data[0]);
  
  // Convert rows
  const csvRows = [];
  csvRows.push(headers.join(',')); // Add headers row
  
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header] !== null && row[header] !== undefined ? row[header] : '';
      const stringVal = String(val);
      // Escape commas and quotes
      return `"${stringVal.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }
  
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
