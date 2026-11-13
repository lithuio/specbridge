// Private, text-only worker. No document code, rendered HTML, attachments or external resources.
import { syncBuiltinESMExports } from 'node:module';
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
import dgram from 'node:dgram';
import dns from 'node:dns';

const fail = (code = 'INVALID_FILE') => {
  throw new Error(code);
};
const denied = () => fail();
// Node 22 permissions do not cover network. These audited parsers never fetch document URLs;
// also disable the transport entry points. This is defense in depth, not an OS security sandbox.
net.connect =
  net.createConnection =
  tls.connect =
  http.request =
  http.get =
  https.request =
  https.get =
  dgram.createSocket =
  dns.lookup =
    denied;
net.Socket.prototype.connect = denied;
globalThis.fetch = denied;
globalThis.WebSocket = undefined;
syncBuiltinESMExports();
console.log =
  console.warn =
  console.error =
  console.info =
  console.debug =
    () => {};

const chunks = [];
let chars = 0;
function append(text, kind, index) {
  const normalized = text
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim();
  if (!normalized) return;
  if (normalized.length > 1_000_000) fail('PARSE_LIMIT');
  // Split on code points to preserve supplementary characters and PostgreSQL char_length.
  const points = [...normalized];
  for (let i = 0; i < points.length; i += 1000) {
    const content = points
      .slice(i, i + 1000)
      .join('')
      .trim();
    if (!content) continue;
    chars += [...content].length;
    if (chars > 500_000 || chunks.length >= 1000) fail('PARSE_LIMIT');
    chunks.push({
      content,
      locatorKind: kind,
      locatorStart: index,
      locatorEnd: index,
    });
  }
}
const decode = (data) => new TextDecoder('utf-8', { fatal: true }).decode(data);

async function docx(data) {
  const { fromBuffer } = await import('yauzl');
  const { default: sax } = await import('sax');
  const zip = await new Promise((resolve, reject) =>
    fromBuffer(
      data,
      { lazyEntries: true, validateEntrySizes: true, strictFileNames: true },
      (e, z) => (e ? reject(e) : resolve(z)),
    ),
  );
  if (zip.entryCount > 2000) {
    zip.close();
    fail('PARSE_LIMIT');
  }
  let expanded = 0;
  let document;
  let types;
  const names = new Set();
  await new Promise((resolve, reject) => {
    const error = (e) => {
      zip.close();
      reject(e);
    };
    zip.on('error', error);
    zip.on('end', resolve);
    zip.on('entry', (entry) => {
      try {
        const name = entry.fileName;
        if (
          names.has(name) ||
          entry.isEncrypted() ||
          /(^|\/)\.\.(\/|$)|^\/|\\/.test(name)
        )
          fail();
        names.add(name);
        expanded += entry.uncompressedSize;
        if (
          expanded > 32 * 1024 * 1024 ||
          entry.uncompressedSize > 8 * 1024 * 1024
        )
          fail('PARSE_LIMIT');
        if (/vbaProject|embeddings\//i.test(name)) fail('UNSUPPORTED_FILE');
        if (name !== 'word/document.xml' && name !== '[Content_Types].xml')
          return zip.readEntry();
        zip.openReadStream(entry, (err, stream) => {
          if (err) return error(err);
          let length = 0;
          const parts = [];
          stream.on('error', error);
          stream.on('data', (part) => {
            length += part.length;
            if (length > 8 * 1024 * 1024) {
              stream.destroy();
              error(new Error('PARSE_LIMIT'));
            } else parts.push(part);
          });
          stream.on('end', () => {
            if (name === 'word/document.xml') document = Buffer.concat(parts);
            else types = Buffer.concat(parts);
            zip.readEntry();
          });
        });
      } catch (e) {
        error(e);
      }
    });
    zip.readEntry();
  });
  zip.close();
  if (!document || !types) fail();
  const contentTypes = decode(types);
  if (
    !contentTypes.includes(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml',
    ) ||
    /macroEnabled/i.test(contentTypes)
  )
    fail('UNSUPPORTED_FILE');
  const parser = sax.parser(true, { xmlns: true, strictEntities: true });
  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const strictNs = 'http://purl.oclc.org/ooxml/wordprocessingml/main';
  let depth = 0;
  let paragraph = 0;
  let body = '';
  let inText = false;
  let sawDocument = false;
  parser.ondoctype = denied;
  parser.onopentag = (node) => {
    if (++depth > 100) fail('PARSE_LIMIT');
    if (![ns, strictNs].includes(node.uri)) return;
    if (node.local === 'document') sawDocument = true;
    if (node.local === 'p') {
      if (++paragraph > 500_000) fail('PARSE_LIMIT');
      body = '';
    }
    if (node.local === 't') inText = true;
    if (node.local === 'tab' || node.local === 'br') body += ' ';
  };
  parser.ontext = (text) => {
    if (inText) {
      body += text;
      if (body.length > 1_000_000) fail('PARSE_LIMIT');
    }
  };
  parser.onclosetag = () => {
    const node = parser.tag;
    if ([ns, strictNs].includes(node.uri)) {
      if (node.local === 't') inText = false;
      if (node.local === 'p') {
        append(body, 'paragraph', paragraph);
        body = '';
      }
    }
    depth--;
  };
  parser.write(decode(document)).close();
  if (!sawDocument) fail();
}

try {
  let bytes = 0;
  const parts = [];
  for await (const part of process.stdin) {
    bytes += part.length;
    if (bytes > 10 * 1024 * 1024) fail('PARSE_LIMIT');
    parts.push(part);
  }
  const data = Buffer.concat(parts);
  const type = process.argv[2];
  if (!data.length) fail('NO_TEXT');
  if (type === 'application/pdf') {
    if (data.subarray(0, 5).toString('ascii') !== '%PDF-') fail();
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task = getDocument({
      data: new Uint8Array(data),
      verbosity: 0,
      isEvalSupported: false,
      useSystemFonts: false,
      disableFontFace: true,
      useWorkerFetch: false,
      isOffscreenCanvasSupported: false,
      isImageDecoderSupported: false,
      stopAtErrors: true,
    });
    task.onPassword = () => {
      void task.destroy();
    };
    const pdf = await task.promise;
    if (pdf.numPages > 500) fail('PARSE_LIMIT');
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const reader = page.streamTextContent().getReader();
      let text = '';
      while (true) {
        const item = await reader.read();
        if (item.done) break;
        for (const token of item.value.items) {
          if ('str' in token) text += token.str + (token.hasEOL ? '\n' : ' ');
          if (text.length > 1_000_000) fail('PARSE_LIMIT');
        }
      }
      append(text, 'page', i);
      page.cleanup();
    }
    await task.destroy();
  } else if (
    type ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    if (data.subarray(0, 2).toString('ascii') !== 'PK') fail();
    await docx(data);
  } else if (type === 'text/plain' || type === 'text/markdown') {
    const value = decode(data);
    if (
      value.includes('\u0000') ||
      /^[\s\ufeff]*(?:%PDF-|PK\u0003\u0004|<!doctype\s+html|<html\b)/i.test(
        value,
      )
    )
      fail();
    value
      .split(/\r?\n/)
      .forEach((line, index) => append(line, 'paragraph', index + 1));
  } else fail('UNSUPPORTED_FILE');
  if (!chunks.length) fail('NO_TEXT');
  process.stdout.write(
    JSON.stringify({
      chunks,
      parserVersion: 'text-v1/pdfjs-6.5.438/yauzl-3.4.0/sax-1.6.1',
    }),
  );
} catch (error) {
  const code = ['UNSUPPORTED_FILE', 'NO_TEXT', 'PARSE_LIMIT'].includes(
    error?.message,
  )
    ? error.message
    : 'INVALID_FILE';
  process.stdout.write(JSON.stringify({ error: code }));
}
