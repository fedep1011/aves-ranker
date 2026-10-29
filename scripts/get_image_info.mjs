import fs from 'node:fs';
import { parseJpegMetadata } from './image_meta_parser.mjs';

function parsePngDimensions(buf) {
  if (buf.length < 24) return null;
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return {
      width,
      height,
      orientation: 1,
      aspectRatio: width / height,
      isLandscape: width > height
    };
  }
  return null;
}

function parseWebpDimensions(buf) {
  if (buf.length < 30) return null;
  // "RIFF" .... "WEBP"
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const format = buf.toString('ascii', 12, 16);
    if (format === 'VP8 ') {
      const width = buf.readUInt16LE(26) & 0x3fff;
      const height = buf.readUInt16LE(28) & 0x3fff;
      return { width, height, orientation: 1, aspectRatio: width / height, isLandscape: width > height };
    }
    if (format === 'VP8L') {
      const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
      const width = 1 + (((b1 & 0x3f) << 8) | b0);
      const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      return { width, height, orientation: 1, aspectRatio: width / height, isLandscape: width > height };
    }
    if (format === 'VP8X') {
      const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
      const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
      return { width, height, orientation: 1, aspectRatio: width / height, isLandscape: width > height };
    }
  }
  return null;
}

export async function getImageInfo(url) {
  if (!url || !url.startsWith('http')) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Range': 'bytes=0-16383',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    clearTimeout(timeout);

    if (!res.ok && res.status !== 206) {
      // Fallback: fetch streaming first 16KB
      const fullController = new AbortController();
      const fTimeout = setTimeout(() => fullController.abort(), 6000);
      const fullRes = await fetch(url, { signal: fullController.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const reader = fullRes.body.getReader();
      const { value } = await reader.read();
      clearTimeout(fTimeout);
      reader.cancel();
      if (!value) return null;
      const buf = Buffer.from(value);
      return parseJpegMetadata(buf) || parsePngDimensions(buf) || parseWebpDimensions(buf);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    return parseJpegMetadata(buf) || parsePngDimensions(buf) || parseWebpDimensions(buf);
  } catch (err) {
    return null;
  }
}
