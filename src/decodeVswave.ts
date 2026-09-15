import { DecodedWave, FIRST_FACTORY_WAVE, LAST_FACTORY_WAVE } from "./decodeROM";

export const SAMPLES_PER_WAVE = 128;
export const BYTES_PER_SAMPLE = 2;
export const BYTES_PER_WAVE = SAMPLES_PER_WAVE * BYTES_PER_SAMPLE;

export function decodeVswaveData(data: Uint8Array, startIndex: number, count: number): DecodedWave[] {
  if (!Number.isInteger(startIndex) || !Number.isInteger(count) || count < 0) {
    throw new Error(`Invalid VS-WAVES range: startIndex=${startIndex}, count=${count}`);
  }
  if (startIndex < FIRST_FACTORY_WAVE || startIndex + count > LAST_FACTORY_WAVE + 1) {
    throw new Error(
      `Invalid waveform range: only VS indices ${FIRST_FACTORY_WAVE}-${LAST_FACTORY_WAVE} are allowed. ` +
        `Got start=${startIndex}, count=${count}.`
    );
  }
  if (data.length % BYTES_PER_WAVE !== 0) {
    throw new Error(
      `VS-WAVES.DAT size ${data.length} is not a multiple of ${BYTES_PER_WAVE} bytes ` +
        `(128 samples x 16-bit); format assumption may not hold for this file.`
    );
  }

  const nWaves = data.length / BYTES_PER_WAVE;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const out: DecodedWave[] = [];

  for (let waveformIndex = startIndex; waveformIndex < startIndex + count; waveformIndex++) {
    if (waveformIndex < 0 || waveformIndex >= nWaves) continue;

    const samples12 = new Int16Array(SAMPLES_PER_WAVE);
    const samples16 = new Int16Array(SAMPLES_PER_WAVE);
    for (let sampleIndex = 0; sampleIndex < SAMPLES_PER_WAVE; sampleIndex++) {
      const offset = waveformIndex * BYTES_PER_WAVE + sampleIndex * BYTES_PER_SAMPLE;
      const sample16 = view.getInt16(offset, false);
      samples16[sampleIndex] = sample16;
      samples12[sampleIndex] = Math.trunc(sample16 / 16);
    }

    out.push({ waveformIndex, romIndex: waveformIndex, samples12, samples16 });
  }

  return out;
}
