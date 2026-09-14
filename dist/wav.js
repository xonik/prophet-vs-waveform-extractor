"use strict";
/**
 * Minimal mono 16-bit PCM WAV file writer (no external dependencies).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildWavBuffer = buildWavBuffer;
exports.concatSamples = concatSamples;
function buildWavBuffer(samples16, sampleRate) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples16.length * bytesPerSample;
    const buffer = Buffer.alloc(44 + dataSize);
    // RIFF chunk descriptor
    buffer.write("RIFF", 0, "ascii");
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write("WAVE", 8, "ascii");
    // fmt subchunk
    buffer.write("fmt ", 12, "ascii");
    buffer.writeUInt32LE(16, 16); // subchunk size (PCM)
    buffer.writeUInt16LE(1, 20); // audio format = 1 (PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    // data subchunk
    buffer.write("data", 36, "ascii");
    buffer.writeUInt32LE(dataSize, 40);
    for (let i = 0; i < samples16.length; i++) {
        buffer.writeInt16LE(samples16[i], 44 + i * bytesPerSample);
    }
    return buffer;
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
