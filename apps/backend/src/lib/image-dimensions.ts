const readPngDimensions = (bytes: Uint8Array) => {
  if (
    bytes.length < 24 ||
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47
  ) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
};

const readJpegDimensions = (bytes: Uint8Array) => {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];
    if (marker === undefined || marker === 0xd9 || marker === 0xda) {
      break;
    }

    const segmentLength = (bytes[offset + 2]! << 8) | bytes[offset + 3]!;
    if (segmentLength < 2 || offset + segmentLength + 2 > bytes.length) {
      return null;
    }

    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isStartOfFrame) {
      return {
        height: (bytes[offset + 5]! << 8) | bytes[offset + 6]!,
        width: (bytes[offset + 7]! << 8) | bytes[offset + 8]!,
      };
    }

    offset += segmentLength + 2;
  }

  return null;
};

const readWebpDimensions = (bytes: Uint8Array) => {
  if (bytes.length < 30) return null;

  // Check 'RIFF'
  if (bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46) return null;
  // Check 'WEBP'
  if (bytes[8] !== 0x57 || bytes[9] !== 0x45 || bytes[10] !== 0x42 || bytes[11] !== 0x50) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunkId = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === "VP8X" && offset + 8 + 10 <= bytes.length) {
      const width = (bytes[offset + 8 + 4] | (bytes[offset + 8 + 5] << 8) | (bytes[offset + 8 + 6] << 16)) + 1;
      const height = (bytes[offset + 8 + 7] | (bytes[offset + 8 + 8] << 8) | (bytes[offset + 8 + 9] << 16)) + 1;
      return { width, height };
    }

    if (chunkId === "VP8 " && offset + 8 + 10 <= bytes.length) {
      if (bytes[offset + 8 + 3] !== 0x9d || bytes[offset + 8 + 4] !== 0x01 || bytes[offset + 8 + 5] !== 0x2a) return null;
      const width = view.getUint16(offset + 8 + 6, true) & 0x3fff;
      const height = view.getUint16(offset + 8 + 8, true) & 0x3fff;
      return { width, height };
    }

    if (chunkId === "VP8L" && offset + 8 + 5 <= bytes.length) {
      if (bytes[offset + 8] !== 0x2f) return null;
      const b1 = bytes[offset + 8 + 1]!;
      const b2 = bytes[offset + 8 + 2]!;
      const b3 = bytes[offset + 8 + 3]!;
      const b4 = bytes[offset + 8 + 4]!;
      
      const width = ((b1 | (b2 << 8)) & 0x3fff) + 1;
      const height = (((b2 >> 6) | (b3 << 2) | (b4 << 10)) & 0x3fff) + 1;
      return { width, height };
    }

    offset += 8 + chunkSize + (chunkSize % 2 === 1 ? 1 : 0);
  }

  return null;
};

export const readImageDimensions = (mimeType: string, bytes: Uint8Array) => {
  if (mimeType === "image/png") return readPngDimensions(bytes);
  if (mimeType === "image/webp") return readWebpDimensions(bytes);
  return readJpegDimensions(bytes);
};
