function parseExifOrientation(buf, offset, len) {
  // Check "Exif\0\0"
  if (len < 14) return 1;
  const exifHeader = buf.toString('ascii', offset + 2, offset + 8);
  if (exifHeader !== 'Exif\0\0') return 1;

  const tiffStart = offset + 8;
  const isLittleEndian = buf.readUInt16LE(tiffStart) === 0x4949; // 'II'

  const readU16 = (o) => isLittleEndian ? buf.readUInt16LE(o) : buf.readUInt16BE(o);
  const readU32 = (o) => isLittleEndian ? buf.readUInt32LE(o) : buf.readUInt32BE(o);

  const firstIfdOffset = readU32(tiffStart + 4);
  let dirOffset = tiffStart + firstIfdOffset;
  if (dirOffset + 2 > buf.length) return 1;

  const numEntries = readU16(dirOffset);
  dirOffset += 2;

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = dirOffset + i * 12;
    if (entryOffset + 12 > buf.length) break;
    const tag = readU16(entryOffset);
    if (tag === 0x0112) { // Orientation tag
      return readU16(entryOffset + 8);
    }
  }
  return 1;
}

export function parseJpegMetadata(buf) {
  if (buf.length < 4 || buf[0] !== 0xFF || buf[1] !== 0xD8) return null;

  let offset = 2;
  let orientation = 1;
  let rawDimensions = null;

  while (offset < buf.length - 8) {
    if (buf[offset] !== 0xFF) {
      offset++;
      continue;
    }
    const marker = buf[offset + 1];
    offset += 2;

    if (offset + 2 > buf.length) break;
    const len = buf.readUInt16BE(offset);

    // APP1: EXIF
    if (marker === 0xE1) {
      try {
        orientation = parseExifOrientation(buf, offset, len);
      } catch (_) {}
    }

    // SOF markers
    const isSof = (marker >= 0xC0 && marker <= 0xC3) ||
                  (marker >= 0xC5 && marker <= 0xC7) ||
                  (marker >= 0xC9 && marker <= 0xCB) ||
                  (marker >= 0xCD && marker <= 0xCF);

    if (isSof && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
      const height = buf.readUInt16BE(offset + 3);
      const width = buf.readUInt16BE(offset + 5);
      rawDimensions = { width, height };
      break;
    }

    offset += len;
  }

  if (rawDimensions) {
    let { width, height } = rawDimensions;
    // If orientation is 5, 6, 7, 8, the image is rotated 90 or 270 deg
    if ([5, 6, 7, 8].includes(orientation)) {
      const tmp = width;
      width = height;
      height = tmp;
    }
    return {
      width,
      height,
      orientation,
      aspectRatio: width / height,
      isLandscape: width > height
    };
  }
  return null;
}
