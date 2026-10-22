import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { readScan } from '../lib/scan.js';

const wordType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const dataURL = (bytes, mime) => `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
const word = (text) =>
  zipSync({
    'word/document.xml': strToU8(
      `<w:document><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:document>`,
    ),
  });
test('PDF documents use native file input and preserve their bytes', () => {
  const bytes = Buffer.from('%PDF-1.7\nSample document');
  const content = readScan(dataURL(bytes, 'application/pdf'));
  assert.equal(content.mediaType, 'application/pdf');
  assert.deepEqual(content.data, bytes);
});
test('Word documents extract text without forwarding the ZIP archive or embedded files', () => {
  const content = readScan(dataURL(word('Invoice &amp; receipt: $49'), wordType));
  assert.equal(content.type, 'text');
  assert.match(content.text, /Invoice & receipt: \$49/);
});
test('scan rejects oversized documents, spoofed formats, and legacy DOC files', () => {
  assert.throws(
    () => readScan(dataURL(Buffer.alloc(5 * 1024 * 1024 + 1), 'application/pdf')),
    (e) => e.status === 413,
  );
  assert.throws(
    () => readScan(dataURL(Buffer.from('not a pdf'), 'application/pdf')),
    (e) => e.status === 400,
  );
  assert.throws(
    () => readScan(dataURL(Buffer.from('old document'), 'application/msword')),
    (e) => e.status === 400,
  );
});
test('compressed Word content and extracted text have independent safety limits', () => {
  assert.throws(
    () => readScan(dataURL(word('x'.repeat(1024 * 1024 + 1)), wordType)),
    (e) => e.status === 413,
  );
  assert.throws(
    () => readScan(dataURL(word('x'.repeat(20001)), wordType)),
    (e) => e.status === 413,
  );
});
