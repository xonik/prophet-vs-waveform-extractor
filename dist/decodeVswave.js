"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BYTES_PER_WAVE = exports.BYTES_PER_SAMPLE = exports.SAMPLES_PER_WAVE = void 0;
exports.decodeVswaveData = decodeVswaveData;
const decodeROM_1 = require("./decodeROM");
exports.SAMPLES_PER_WAVE = 128;
exports.BYTES_PER_SAMPLE = 2;
exports.BYTES_PER_WAVE = exports.SAMPLES_PER_WAVE * exports.BYTES_PER_SAMPLE;
function decodeVswaveData(data, startIndex, count) {
    if (!Number.isInteger(startIndex) || !Number.isInteger(count) || count < 0) {
        throw new Error(`Invalid VS-WAVES range: startIndex=${startIndex}, count=${count}`);
    }
    if (startIndex < decodeROM_1.FIRST_FACTORY_WAVE || startIndex + count > decodeROM_1.LAST_FACTORY_WAVE + 1) {
        throw new Error(`Invalid waveform range: only VS indices ${decodeROM_1.FIRST_FACTORY_WAVE}-${decodeROM_1.LAST_FACTORY_WAVE} are allowed. ` +
            `Got start=${startIndex}, count=${count}.`);
    }
    if (data.length % exports.BYTES_PER_WAVE !== 0) {
        throw new Error(`VS-WAVES.DAT size ${data.length} is not a multiple of ${exports.BYTES_PER_WAVE} bytes ` +
            `(128 samples x 16-bit); format assumption may not hold for this file.`);
    }
    const nWaves = data.length / exports.BYTES_PER_WAVE;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const out = [];
    for (let waveformIndex = startIndex; waveformIndex < startIndex + count; waveformIndex++) {
        if (waveformIndex < 0 || waveformIndex >= nWaves)
            continue;
        const samples12 = new Int16Array(exports.SAMPLES_PER_WAVE);
        const samples16 = new Int16Array(exports.SAMPLES_PER_WAVE);
        for (let sampleIndex = 0; sampleIndex < exports.SAMPLES_PER_WAVE; sampleIndex++) {
            const offset = waveformIndex * exports.BYTES_PER_WAVE + sampleIndex * exports.BYTES_PER_SAMPLE;
            const sample16 = view.getInt16(offset, false);
            samples16[sampleIndex] = sample16;
            samples12[sampleIndex] = Math.trunc(sample16 / 16);
        }
        out.push({ waveformIndex, romIndex: waveformIndex, samples12, samples16 });
    }
    return out;
}
