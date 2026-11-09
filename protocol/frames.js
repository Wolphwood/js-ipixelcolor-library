/** Pure iPixelColor protocol frame builders; no Bluetooth I/O. */
export const MEDIA_BLOCK_BYTES = 4096;

function bytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  throw new TypeError('Expected an ArrayBuffer or typed byte array');
}

function assertByte(value, name) {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new RangeError(`${name} must be an integer from 0 to 255`);
  }
}

export function crc32(input) {
  let crc = 0xFFFFFFFF;
  for (const byte of bytes(input)) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function content(input, blockSize) {
  const data = bytes(input);
  if (!data.length || data.length > 0xFFFFFFFF) throw new RangeError('Invalid content length');
  if (![4096, 12288].includes(blockSize)) throw new RangeError('blockSize must be 4096 or 12288');
  return data;
}

/** Same public type identifiers as iDotMatrix: GIF(1), image(2), text(3). */
export function encodeMediaBlocks(input, { type, slotIndex = 101, blockSize = MEDIA_BLOCK_BYTES } = {}) {
  if (![1, 2, 3].includes(type)) throw new RangeError('type must be GIF(1), image(2) or text(3)');
  assertByte(slotIndex, 'slotIndex');
  const data = content(input, blockSize);
  const checksum = crc32(data);
  const opcode = { 1: 0x0003, 2: 0x0002, 3: 0x0100 }[type];
  const blocks = [];
  for (let start = 0; start < data.length; start += blockSize) {
    const chunk = data.subarray(start, start + blockSize);
    const frame = new Uint8Array(15 + chunk.length);
    const view = new DataView(frame.buffer);
    view.setUint16(0, frame.length, true);
    view.setUint16(2, opcode, true);
    frame[4] = start === 0 ? 0 : 2;
    view.setUint32(5, data.length, true);
    view.setUint32(9, checksum, true);
    frame[13] = type === 1 ? 2 : 0;
    frame[14] = slotIndex;
    frame.set(chunk, 15);
    blocks.push(frame);
  }
  return blocks;
}

/** Camera/undo/direct image envelope; contents depend on the target panel. */
export function encodeDIYBlocks(input, { blockSize = MEDIA_BLOCK_BYTES } = {}) {
  const data = content(input, blockSize);
  const blocks = [];
  for (let start = 0; start < data.length; start += blockSize) {
    const chunk = data.subarray(start, start + blockSize);
    const frame = new Uint8Array(9 + chunk.length);
    const view = new DataView(frame.buffer);
    view.setUint16(0, frame.length, true);
    frame[4] = start === 0 ? 0 : 2;
    view.setUint32(5, data.length, true);
    frame.set(chunk, 9);
    blocks.push(frame);
  }
  return blocks;
}

/** Wire screen type -> dimensions/internal text profile, from ChooseActivity.setLedType. */
export function getPanelProfile(type) {
  const sizes = [
    [64,64], [32,32], [32,16], [64,16], [96,16], [64,20], [128,32], [144,16],
    [192,16], [48,24], [64,32], [96,32], [128,32], [96,32], [160,32], [192,32],
    [256,32], [320,32], [384,32], [448,32], [16,16],
    [64,64], [96,64], [128,64], [160,64], [192,64], [256,64], [320,64], [384,64],
    [448,64], [512,64], [576,64], [640,64],
  ];
  const index = type === 0 ? 0 : type - 0x80;
  if (!Number.isInteger(index) || !sizes[index]) return null;
  const internal = [0, 2, 4, 3, 1, 5, 6, 7, 8, 9];
  return {
    width: sizes[index][0], height: sizes[index][1],
    internalType: index < 10 ? internal[index] : index <= 20 ? index : index + 3,
    blockSize: index <= 1 ? 12288 : 4096,
  };
}

/** Parse complete length-prefixed replies; no iDotMatrix response assumptions. */
export function decodeNotification(input) {
  const raw = bytes(input).slice();
  if (raw.length < 4) return { kind: 'incomplete', raw };
  const length = raw[0] | (raw[1] << 8);
  if (length < 4) return { kind: 'invalid', raw };
  if (length !== raw.length) return { kind: length > raw.length ? 'incomplete' : 'invalid', raw };
  const opcode = raw[2] | (raw[3] << 8);
  const status = raw.length >= 5 ? raw[4] : null;
  if (opcode === 0x8001 && raw.length > 9) return {
    kind: 'deviceInfo', opcode, status, raw, screenType: raw[4],
    passwordProtected: raw.length >= 11 ? raw[10] === 1 : null,
  };
  if (opcode === 0x8005 && raw.length === 8) return {
    kind: 'hardwareInfo', opcode, raw, mcuType: raw[4],
    mcuVersion: `${raw[4]}${String(raw[5]).padStart(2, '0')}`,
    secondaryVersion: `${raw[6]}.${String(raw[7]).padStart(2, '0')}`,
  };
  if (raw.length < 5) return { kind: 'incomplete', opcode, status, raw };
  const family = ({ 2: 'image', 3: 'gif', 4: 'gif', 256: 'text', 32768: 'diy' })[opcode]
    ?? (opcode === 0 && (status === 0 || status === 2) ? 'contentError' : null);
  if (family && raw.length === 5) return {
    kind: 'transferAck', family, opcode, status, raw,
    outcome: status === 1 ? 'continue' : status === 3 ? 'terminal'
      : status === 0 || status === 2 ? 'error' : 'unknown',
  };
  if (opcode === 0x0205) return { kind: 'passwordVerificationOrDrawing', opcode, status, raw };
  if (opcode === 0x8001) return { kind: 'timeAck', opcode, status, raw };
  return { kind: 'response', opcode, status, raw };
}

/** Reassemble fragmented or coalesced notifications using their LE16 length. */
export class FrameDecoder {
  constructor() {
    this.pending = new Uint8Array();
  }

  reset() {
    this.pending = new Uint8Array();
  }

  push(input) {
    const chunk = bytes(input);
    const joined = new Uint8Array(this.pending.length + chunk.length);
    joined.set(this.pending);
    joined.set(chunk, this.pending.length);
    const frames = [];
    let offset = 0;
    while (joined.length - offset >= 2) {
      const length = joined[offset] | (joined[offset + 1] << 8);
      if (length < 4) {
        this.reset();
        throw new RangeError('Invalid notification frame length');
      }
      if (joined.length - offset < length) break;
      frames.push(joined.slice(offset, offset + length));
      offset += length;
    }
    this.pending = joined.slice(offset);
    return frames;
  }
}
