export function exportCSV(filename, rows, columns) {
  const header = columns.map(c => `"${c.label}"`).join(',');
  const body = rows.map(row =>
    columns.map(c => {
      const val = String(c.getValue(row) ?? '').replace(/"/g, '""');
      return `"${val}"`;
    }).join(',')
  ).join('\n');
  // BOM prefix ensures Excel opens UTF-8 correctly
  const blob = new Blob(['﻿' + header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
