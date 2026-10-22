// Quote every cell and prevent spreadsheet formulas in user-entered text.
export const csvCell = (value) => {
  let text = String(value ?? '');
  if (typeof value !== 'number' && /^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};
export const csvRow = (values) => values.map(csvCell).join(',') + '\r\n';
export const reportColumns = [
  'Section',
  'ID',
  'Project',
  'Title',
  'Description',
  'Client',
  'Status',
  'Priority',
  'Created',
  'Due',
  'Date',
  'Currency',
  'Budget',
  'Revenue',
  'Spent',
  'Remaining',
  'ProfitLoss',
  'Amount',
  'Category',
  'Merchant',
  'Billable',
  'Notes',
  'TotalTasks',
  'CompletedTasks',
  'Color',
  'Value',
];
export const reportRow = (row) => csvRow(reportColumns.map((key) => row[key]));
