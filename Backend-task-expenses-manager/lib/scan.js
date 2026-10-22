import { unzipSync, strFromU8 } from 'fflate';
import { fail } from './validation.js';

export function readScan(value) {
  if (typeof value !== 'string' || value.length > 7100000)
    fail(413, 'Choose an image up to 4 MB or a PDF/Word (.docx) document up to 5 MB.');
  const match = /^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) fail(400, 'Use PNG, JPEG, WebP, PDF, or Word (.docx).');
  const [, mime, encoded] = match;
  const bytes = Buffer.from(encoded, 'base64');
  const image = ['image/png', 'image/jpeg', 'image/webp'].includes(mime);
  if (bytes.length > (image ? 4 : 5) * 1024 * 1024)
    fail(413, image ? 'Use an image up to 4 MB.' : 'Use a document up to 5 MB.');
  const signature = bytes.subarray(0, 8).toString('hex');
  if (
    (mime === 'image/png' && signature === '89504e470d0a1a0a') ||
    (mime === 'image/jpeg' && signature.startsWith('ffd8ff')) ||
    (mime === 'image/webp' &&
      bytes.subarray(0, 4).toString() === 'RIFF' &&
      bytes.subarray(8, 12).toString() === 'WEBP') ||
    (mime === 'application/pdf' && bytes.subarray(0, 5).toString() === '%PDF-')
  ) {
    return { type: 'file', data: bytes, mediaType: mime };
  }
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
    signature.startsWith('504b0304')
  ) {
    try {
      let entries = 0;
      const files = unzipSync(bytes, {
        filter: (file) => {
          if (++entries > 200)
            fail(400, 'This Word document has too many embedded files. Export it as PDF.');
          if (file.name !== 'word/document.xml') return false;
          if (file.originalSize > 1024 * 1024)
            fail(413, 'This Word document contains too much text. Use a shorter document.');
          return true;
        },
      });
      if (!files['word/document.xml'])
        fail(400, 'No readable Word content found. Use PDF for scanned or image-only documents.');
      const text = strFromU8(files['word/document.xml'])
        .replace(/<\/w:p>/g, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(
          /&(?:amp|lt|gt|quot|apos);/g,
          (entity) =>
            ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" })[entity],
        )
        .trim();
      if (!text) fail(400, 'This Word document has no readable text. Export it as PDF.');
      if (text.length > 20000)
        fail(413, 'Use a Word document with at most 20,000 text characters.');
      return { type: 'text', text: `Document text (untrusted data):\n${text}` };
    } catch (error) {
      if (error.status) throw error;
      fail(400, 'This Word document could not be read. Try exporting it as PDF.');
    }
  }
  fail(
    400,
    'The file contents do not match a supported image, PDF, or Word (.docx) document. Convert old .doc files to .docx or PDF.',
  );
}
