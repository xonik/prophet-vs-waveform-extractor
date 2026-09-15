"use strict";
/**
 * Minimal mono 16-bit PCM WAV file writer with no external dependencies.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildWavBytes = buildWavBytes;
exports.buildWavBuffer = buildWavBuffer;
exports.concatSamples = concatSamples;
function buildWavBytes(samples16, sampleRate) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples16.length * bytesPerSample;
    const buffer = new Uint8Array(44 + dataSize);
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    // RIFF chunk descriptor
    writeAscii(view, 0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeAscii(view, 8, "WAVE");
    // fmt subchunk
    writeAscii(view, 12, "fmt ");
    view.setUint32(16, 16, true); // subchunk size (PCM)
    view.setUint16(20, 1, true); // audio format = 1 (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    // data subchunk
    writeAscii(view, 36, "data");
    view.setUint32(40, dataSize, true);
    for (let i = 0; i < samples16.length; i++) {
        view.setInt16(44 + i * bytesPerSample, samples16[i], true);
    }
    return buffer;
}
function buildWavBuffer(samples16, sampleRate) {
    return Buffer.from(buildWavBytes(samples16, sampleRate));
}
function writeAscii(view, offset, value) {
    for (let i = 0; i < value.length; i++) {
        view.setUint8(offset + i, value.charCodeAt(i));
    }
}
function concatSamples(chunks) {
    const total = chunks.reduce((sum, c) => sum + c.length, 0);
    const out = new Int16Array(total);
    let offset = 0;
    for (const c of chunks) {
        out.set(c, offset);
        offset += c.length;
    }
    return out;
}
