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

export const readImageDimensions = (mimeType: string, bytes: Uint8Array) =>
  mimeType === "image/png" ? readPngDimensions(bytes) : readJpegDimensions(bytes);
