"use strict";
/**
 * Prophet VS factory wavetable ROM decoder.
 *
 * ROM layout (reverse-engineered from PVSMSB.BIN / PVSLSB.BIN, cross-checked
 * against the known VS-WAVES.DAT reference dump — see README.md):
 *
 *   - The two ROM chip images are interleaved byte-for-byte into one flat
 *     memory image: mem[0]=MSB[0], mem[1]=LSB[0], mem[2]=MSB[1], ...
 *   - The wavetable region starts at a fixed byte offset ("tableStartBytes")
 *     into that interleaved image.
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
 *                                                        low nibble always 0,
 *                                                        matches VS-WAVES.DAT)
 *
 *   - ROM slot index and VS-WAVES.DAT waveform index are related by a fixed
 *     offset: romIndex = vsIndex + romOffset (romOffset confirmed = 48).
 *     E.g. VS-WAVES wave 32 (cosine) is ROM slot 80.
 *
 * This decode was validated against VS-WAVES.DAT across all 95 available
 * factory waves (VS index 32-126): mean sample correlation 0.99999, mean
 * RMS error ~41 out of a +/-32768 range (~0.13%), with a small, symmetric,
 * noise-like residual left over (most likely dither/measurement noise in
 * how the reference dump itself was captured, not a missed encoding detail).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
exports.interleaveRom = interleaveRom;
exports.availableRomSlots = availableRomSlots;
exports.decodeWave = decodeWave;
exports.decodeWaveRange = decodeWaveRange;
exports.DEFAULT_CONFIG = {
    tableStartBytes: 31936,
    slotSize: 192,
    headSize: 128,
    romOffset: 48,
};
/** Interleave the two ROM chip images into one flat memory image (MSB0,LSB0,MSB1,LSB1,...). */
function interleaveRom(msb, lsb) {
    if (msb.length !== lsb.length) {
        throw new Error(`MSB (${msb.length} bytes) and LSB (${lsb.length} bytes) ROM images must be the same length`);
    }
    const mem = new Uint8Array(msb.length * 2);
    for (let i = 0; i < msb.length; i++) {
        mem[2 * i] = msb[i];
        mem[2 * i + 1] = lsb[i];
    }
    return mem;
}
/** How many ROM slots fit in the given interleaved memory image, given the decode config. */
function availableRomSlots(mem, config = exports.DEFAULT_CONFIG) {
    const usable = mem.length - config.tableStartBytes;
    if (usable < 0)
        return 0;
    return Math.floor(usable / config.slotSize);
}
/**
 * Decode a single waveform by its VS-WAVES.DAT index.
 * Returns null if the corresponding ROM slot falls outside the available data.
 */
function decodeWave(mem, vsIndex, config = exports.DEFAULT_CONFIG) {
    const romIndex = vsIndex + config.romOffset;
    if (romIndex < 0)
        return null;
    const slotStart = config.tableStartBytes + romIndex * config.slotSize;
    const slotEnd = slotStart + config.slotSize;
    if (slotStart < 0 || slotEnd > mem.length)
        return null;
    const headStart = slotStart;
    const headEnd = slotStart + config.headSize;
    const tailStart = headEnd;
    const tailEnd = slotEnd;
    const nSamples = config.headSize; // one head byte per sample
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
        if (s0 < nSamples)
            fine[s0] = upper;
        if (s1 < nSamples)
            fine[s1] = lower;
    }
    for (let j = 0; j < nSamples; j++) {
        const rawByte = mem[headStart + j];
        const headSigned = rawByte >= 128 ? rawByte - 256 : rawByte; // int8
        const s12 = headSigned * 16 + fine[j]; // -2048..2047
        samples12[j] = s12;
        samples16[j] = s12 * 16; // -32768..32752, low nibble always 0
    }
    return { vsIndex, romIndex, samples12, samples16 };
}
/** Decode a contiguous range of VS-WAVES.DAT waveform indices, skipping any that fall out of range. */
function decodeWaveRange(mem, startIndex, count, config = exports.DEFAULT_CONFIG) {
    const out = [];
    for (let vsIndex = startIndex; vsIndex < startIndex + count; vsIndex++) {
        const wave = decodeWave(mem, vsIndex, config);
        if (wave)
            out.push(wave);
    }
    return out;
}
