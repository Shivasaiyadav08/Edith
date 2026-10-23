import { apiFetch } from './api';

export async function downloadCSV(path: string, name: string, sample?: string) {
  let blob: Blob;
  if (sample !== undefined) blob = new Blob(['\uFEFF', sample], { type: 'text/csv;charset=utf-8' });
  else {
    const response = await apiFetch(path);
    if (!response.ok) throw new Error('Export could not be completed. Please try again.');
    blob = await response.blob();
  }
  const url = URL.createObjectURL(blob),
    anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
