import * as fs from "fs";
import { DecodedWave, FIRST_FACTORY_WAVE, LAST_FACTORY_WAVE } from "./decodeROM";

export const SAMPLES_PER_WAVE = 128;
export const BYTES_PER_SAMPLE = 2;
export const BYTES_PER_WAVE = SAMPLES_PER_WAVE * BYTES_PER_SAMPLE;

export function loadVswaveFile(filePath: string): Int16Array[] {
  const data = fs.readFileSync(filePath);
  if (data.length % BYTES_PER_WAVE !== 0) {
    throw new Error(
      `VS-WAVES.DAT size ${data.length} is not a multiple of ${BYTES_PER_WAVE} bytes ` +
        `(128 samples x 16-bit); format assumption may not hold for this file.`
    );
  }

  const nWaves = data.length / BYTES_PER_WAVE;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const waves: Int16Array[] = [];

  for (let waveIndex = 0; waveIndex < nWaves; waveIndex++) {
    const samples = new Int16Array(SAMPLES_PER_WAVE);
    for (let sampleIndex = 0; sampleIndex < SAMPLES_PER_WAVE; sampleIndex++) {
      const offset = waveIndex * BYTES_PER_WAVE + sampleIndex * BYTES_PER_SAMPLE;
      samples[sampleIndex] = view.getInt16(offset, false);
    }
    waves.push(samples);
  }

  return waves;
}

export function decodeVswaveWave(filePath: string, waveformIndex: number): DecodedWave | null {
  if (waveformIndex < FIRST_FACTORY_WAVE || waveformIndex > LAST_FACTORY_WAVE) {
    return null;
  }

  const waves = loadVswaveFile(filePath);
  const raw = waves[waveformIndex];
  if (!raw) return null;

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

export function decodeVswaveRange(
  filePath: string,
  startIndex: number,
  count: number
): DecodedWave[] {
  if (!Number.isInteger(startIndex) || !Number.isInteger(count) || count < 0) {
    throw new Error(`Invalid VS-WAVES range: startIndex=${startIndex}, count=${count}`);
  }
  if (startIndex < FIRST_FACTORY_WAVE || startIndex + count > LAST_FACTORY_WAVE + 1) {
    throw new Error(
      `Invalid waveform range: only VS indices ${FIRST_FACTORY_WAVE}-${LAST_FACTORY_WAVE} are allowed. ` +
        `Got start=${startIndex}, count=${count}.`
    );
  }

  const waves = loadVswaveFile(filePath);
  const out: DecodedWave[] = [];

  for (let waveformIndex = startIndex; waveformIndex < startIndex + count; waveformIndex++) {
    const raw = waves[waveformIndex];
    if (!raw) continue;

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
