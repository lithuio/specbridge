import { DocumentParser } from './document.parser.js';
import { docx, pdf, zip } from '../../test/documents/fixtures.js';
const parser = new DocumentParser();
const docType =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
it('extracts real PDF, DOCX, Unicode Markdown and TXT as plain text with real locators', async () => {
  for (const [type, bytes, expected, kind] of [
    ['application/pdf', pdf(), 'Synthetic PDF background', 'page'],
    [docType, docx(), 'Synthetic document background', 'paragraph'],
    [
      'text/markdown',
      Buffer.from('# 背景\n客户端只支持中文😀'),
      '客户端只支持中文😀',
      'paragraph',
    ],
    ['text/plain', Buffer.from('plain text'), 'plain text', 'paragraph'],
  ] as const) {
    const result = await parser.parse(bytes, type);
    expect(result.chunks.some((c) => c.content.includes(expected))).toBe(true);
    expect(result.chunks[0].locatorKind).toBe(kind);
    expect(result.parserVersion).toContain('text-v1');
  }
}, 15000);
it('rejects empty, invalid UTF8, binary disguise and malformed office files without raw errors', async () => {
  for (const [type, bytes] of [
    ['text/plain', Buffer.from('  ')],
    ['text/plain', Buffer.from([255])],
    ['text/plain', Buffer.from('%PDF-1.4')],
    ['application/pdf', Buffer.from('broken')],
    [docType, zip({ 'word/document.xml': 'broken' })],
  ] as const)
    await expect(parser.parse(bytes, type)).rejects.toMatchObject({
      code: expect.stringMatching(/NO_TEXT|INVALID_FILE/),
    });
});
it('bounds extracted text, PDF pages and DOCX decompressed sizes', async () => {
  for (const [type, bytes] of [
    ['text/plain', Buffer.from('x'.repeat(500_001))],
    ['application/pdf', pdf('text', 501)],
    [docType, docx('small', { 'large.bin': 'x'.repeat(9 * 1024 * 1024) })],
  ] as const)
    await expect(parser.parse(bytes, type)).rejects.toMatchObject({
      code: 'PARSE_LIMIT',
    });
}, 15000);
it('rejects macros, traversal and XML entities; external relationships are never followed', async () => {
  await expect(
    parser.parse(docx('safe', { 'word/vbaProject.bin': 'macro' }), docType),
  ).rejects.toMatchObject({ code: 'UNSUPPORTED_FILE' });
  await expect(
    parser.parse(docx('safe', { '../escape': 'x' }), docType),
  ).rejects.toMatchObject({ code: 'INVALID_FILE' });
  await expect(parser.parse(docx('&secret;'), docType)).rejects.toMatchObject({
    code: 'INVALID_FILE',
  });
  const result = await parser.parse(
    docx('safe &amp; visible', {
      'word/_rels/document.xml.rels':
        '<Relationships><Relationship Target="http://127.0.0.1:1/secret" TargetMode="External"/></Relationships>',
    }),
    docType,
  );
  expect(result.chunks[0].content).toBe('safe & visible');
});
