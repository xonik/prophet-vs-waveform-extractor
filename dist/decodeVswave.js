"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BYTES_PER_WAVE = exports.BYTES_PER_SAMPLE = exports.SAMPLES_PER_WAVE = void 0;
exports.loadVswaveFile = loadVswaveFile;
exports.decodeVswaveWave = decodeVswaveWave;
exports.decodeVswaveRange = decodeVswaveRange;
const fs = __importStar(require("fs"));
const decodeROM_1 = require("./decodeROM");
exports.SAMPLES_PER_WAVE = 128;
exports.BYTES_PER_SAMPLE = 2;
exports.BYTES_PER_WAVE = exports.SAMPLES_PER_WAVE * exports.BYTES_PER_SAMPLE;
function loadVswaveFile(filePath) {
    const data = fs.readFileSync(filePath);
    if (data.length % exports.BYTES_PER_WAVE !== 0) {
        throw new Error(`VS-WAVES.DAT size ${data.length} is not a multiple of ${exports.BYTES_PER_WAVE} bytes ` +
            `(128 samples x 16-bit); format assumption may not hold for this file.`);
    }
    const nWaves = data.length / exports.BYTES_PER_WAVE;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const waves = [];
    for (let waveIndex = 0; waveIndex < nWaves; waveIndex++) {
        const samples = new Int16Array(exports.SAMPLES_PER_WAVE);
        for (let sampleIndex = 0; sampleIndex < exports.SAMPLES_PER_WAVE; sampleIndex++) {
            const offset = waveIndex * exports.BYTES_PER_WAVE + sampleIndex * exports.BYTES_PER_SAMPLE;
            samples[sampleIndex] = view.getInt16(offset, false);
        }
        waves.push(samples);
    }
    return waves;
}
function decodeVswaveWave(filePath, waveformIndex) {
    if (waveformIndex < decodeROM_1.FIRST_FACTORY_WAVE || waveformIndex > decodeROM_1.LAST_FACTORY_WAVE) {
        return null;
    }
    const waves = loadVswaveFile(filePath);
    const raw = waves[waveformIndex];
    if (!raw)
        return null;
    const samples12 = new Int16Array(raw.length);
    const samples16 = new Int16Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
        const sample16 = raw[i];
        const sample12 = Math.trunc(sample16 / 16);
        samples12[i] = sample12;
        samples16[i] = sample16;
    }
    return { waveformIndex, romIndex: waveformIndex, samples12, samples16 };
}
function decodeVswaveRange(filePath, startIndex, count) {
    if (!Number.isInteger(startIndex) || !Number.isInteger(count) || count < 0) {
        throw new Error(`Invalid VS-WAVES range: startIndex=${startIndex}, count=${count}`);
    }
    if (startIndex < decodeROM_1.FIRST_FACTORY_WAVE || startIndex + count > decodeROM_1.LAST_FACTORY_WAVE + 1) {
        throw new Error(`Invalid waveform range: only VS indices ${decodeROM_1.FIRST_FACTORY_WAVE}-${decodeROM_1.LAST_FACTORY_WAVE} are allowed. ` +
            `Got start=${startIndex}, count=${count}.`);
    }
    const waves = loadVswaveFile(filePath);
    const out = [];
    for (let waveformIndex = startIndex; waveformIndex < startIndex + count; waveformIndex++) {
        const raw = waves[waveformIndex];
        if (!raw)
            continue;
        const samples12 = new Int16Array(raw.length);
        const samples16 = new Int16Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
            const sample16 = raw[i];
            const sample12 = Math.trunc(sample16 / 16);
            samples12[i] = sample12;
            samples16[i] = sample16;
        }
        out.push({ waveformIndex, romIndex: waveformIndex, samples12, samples16 });
    }
    return out;
}
