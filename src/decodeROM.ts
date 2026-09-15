/**
 * Prophet VS factory wavetable ROM decoder.
 *
 * ROM layout:
 *
 *   - The two ROM chip images are interleaved byte-for-byte into one flat
 *     memory image: mem[0]=MSB[0], mem[1]=LSB[0], mem[2]=MSB[1], ...
 *   - The factory wavetable starts at the absolute byte address of the first
 *     valid wave, waveform index 32: `tableStartBytes = 47296`.
 *   - From there, every waveform occupies a fixed-size "slot" of `slotSize`
 *     bytes (192, confirmed empirically). Each slot is:
 *       - `headSize` bytes (128) of plain SIGNED 8-BIT samples, one byte per
 *         waveform sample (the coarse/high-order part of each 12-bit sample).
 *       - `slotSize - headSize` bytes (64) of packed 4-bit "fine" nibbles,
 *         two per byte, high nibble first: tailByte[i] holds the fine nibble
 *         for sample (2*i) in its upper 4 bits and the fine nibble for
 *         sample (2*i+1) in its lower 4 bits.
 *   - The two parts recombine as:
 *         sample12 = headByte * 16 + fineNibble        (range -2048..2047)
 *         sample16 = sample12 * 16                     (range -32768..32752,
 *                                                        low nibble always 0)
 *
 *   - The ROM table is anchored at the first real factory waveform, so the
 *     relative slot index is `romIndex = waveformIndex + romOffset` with
 *     `romOffset = -32`. That makes waveform 32 start at exactly
 *     `tableStartBytes + 0 * slotSize = 47296`.
 *
 */

export const TABLE_START_BYTES = 47296;
export const SLOT_SIZE = 192;
export const HEAD_SIZE = 128;
export const ROM_OFFSET = -32;

export interface DecodedWave {
  /** Waveform index in the Prophet VS waveform table (0-127). */
  waveformIndex: number;
  /** Absolute ROM-table offset for this waveform. */
  romIndex: number;
  /** True 12-bit signed samples, range -2048..2047. */
  samples12: Int16Array;
  /** Samples scaled to 16-bit (factory waveform convention: value*16, low nibble always 0). */
  samples16: Int16Array;
}

export const FIRST_FACTORY_WAVE = 32;
export const LAST_FACTORY_WAVE = 125;

/** The Prophet VS ROM-backed factory waveforms occupy a fixed, validated range: 32..125.
 * Indices before 32 are user/RAM waves, and 126/127 are the silent/noise placeholders.
 */
function validateWaveRange(startIndex: number, count: number): void {
  if (!Number.isInteger(startIndex) || !Number.isInteger(count) || count < 0) {
    throw new Error(`Invalid waveform range: startIndex=${startIndex}, count=${count}`);
  }
  if (startIndex < FIRST_FACTORY_WAVE) {
    throw new Error(
      `Waveform indices before ${FIRST_FACTORY_WAVE} are not valid for the ROM-backed factory set; got startIndex=${startIndex}.`
    );
  }
  const endIndexExclusive = startIndex + count;
  if (endIndexExclusive > LAST_FACTORY_WAVE + 1) {
    throw new Error(
      `Waveform range must end at or before ${LAST_FACTORY_WAVE}; got startIndex=${startIndex}, count=${count}.`
    );
  }
}

/** Interleave the two ROM chip images into one flat memory image (MSB0,LSB0,MSB1,LSB1,...). */
export function interleaveRom(msb: ArrayLike<number>, lsb: ArrayLike<number>): Uint8Array {
  if (msb.length !== lsb.length) {
    throw new Error(
      `MSB (${msb.length} bytes) and LSB (${lsb.length} bytes) ROM images must be the same length`
    );
  }
  const mem = new Uint8Array(msb.length * 2);
  for (let i = 0; i < msb.length; i++) {
    mem[2 * i] = msb[i];
    mem[2 * i + 1] = lsb[i];
  }
  return mem;
}

/** How many ROM slots fit in the given interleaved memory image. */
export function availableRomSlots(mem: Uint8Array): number {
  const usable = mem.length - TABLE_START_BYTES;
  if (usable < 0) return 0;
  return Math.floor(usable / SLOT_SIZE);
}

/**
 * Decode a single waveform by its index.
 * Returns null if the corresponding ROM slot falls outside the available data.
 */
export function decodeWave(mem: Uint8Array, waveformIndex: number): DecodedWave | null {
  if (waveformIndex < FIRST_FACTORY_WAVE || waveformIndex > LAST_FACTORY_WAVE) {
    return null;
  }
  const romIndex = waveformIndex + ROM_OFFSET;
  if (romIndex < 0) return null;

  const slotStart = TABLE_START_BYTES + romIndex * SLOT_SIZE;
  const slotEnd = slotStart + SLOT_SIZE;
  if (slotStart < 0 || slotEnd > mem.length) return null;

  const headStart = slotStart;
  const headEnd = slotStart + HEAD_SIZE;
  const tailStart = headEnd;
  const tailEnd = slotEnd;

  const nSamples = HEAD_SIZE; // one head byte per sample
  const samples12 = new Int16Array(nSamples);
  const samples16 = new Int16Array(nSamples);

  // Unpack the 4-bit fine nibbles: tailByte[i] -> upper nibble = sample(2i), lower = sample(2i+1)
  const fine = new Uint8Array(nSamples);
  for (let i = 0; i < tailEnd - tailStart; i++) {
    const tailByte = mem[tailStart + i];
    const upper = (tailByte >> 4) & 0xf;
    const lower = tailByte & 0xf;
    const s0 = 2 * i;
    const s1 = 2 * i + 1;
    if (s0 < nSamples) fine[s0] = upper;
    if (s1 < nSamples) fine[s1] = lower;
  }

  for (let j = 0; j < nSamples; j++) {
    const rawByte = mem[headStart + j];
    const headSigned = rawByte >= 128 ? rawByte - 256 : rawByte; // int8
    const s12 = headSigned * 16 + fine[j]; // -2048..2047
    samples12[j] = s12;
    samples16[j] = s12 * 16; // -32768..32752, low nibble always 0
  }

  return { waveformIndex, romIndex, samples12, samples16 };
}

/** Decode a contiguous range of waveform indices, skipping any that fall out of range. */
export function decodeWaveRange(
  mem: Uint8Array,
  startIndex: number,
  count: number
): DecodedWave[] {
  validateWaveRange(startIndex, count);
  const out: DecodedWave[] = [];
  for (let waveformIndex = startIndex; waveformIndex < startIndex + count; waveformIndex++) {
    const wave = decodeWave(mem, waveformIndex);
    if (wave) out.push(wave);
  }
  return out;
}
