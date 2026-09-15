import { buildCppHeader } from "./cppHeader";
import { buildWaveformChartHtml, ChartOptions, DEFAULT_CHART_OPTIONS } from "./chart";
import { DecodedWave } from "./decodeROM";
import { buildWavBuffer, concatSamples } from "./wav";

function wavSamplesFor(wave: DecodedWave, which: "samples12" | "samples16"): Int16Array {
  return which === "samples16" ? wave.samples16 : wave.samples12;
}

export function buildCombinedWavBuffer(
  waves: DecodedWave[],
  which: "samples12" | "samples16",
  sampleRate: number
): Buffer {
  return buildWavBuffer(concatSamples(waves.map((wave) => wavSamplesFor(wave, which))), sampleRate);
}

export function buildSeparateWavBuffers(
  waves: DecodedWave[],
  which: "samples12" | "samples16",
  sampleRate: number
): Array<{ waveformIndex: number; buffer: Buffer }> {
  return waves.map((wave) => ({
    waveformIndex: wave.waveformIndex,
    buffer: buildWavBuffer(wavSamplesFor(wave, which), sampleRate),
  }));
}

export function buildHeaderFile(
  waves: DecodedWave[],
  which: "samples12" | "samples16",
  provenance: string
): string {
  return buildCppHeader(waves, {
    which,
    namespaceName: "ProphetVS",
    arrayPrefix: which === "samples16" ? "wave16" : "wave12",
    tableName: which === "samples16" ? "kWaves16" : "kWaves12",
    provenance:
      provenance +
      (which === "samples16"
        ? "\nValues are scaled to 16-bit (sample12 * 16)."
        : "\nValues are the true 12-bit range (-2048..2047)."),
  });
}

export function buildChartFile(waves: DecodedWave[], opts: Partial<ChartOptions> = {}): string {
  return buildWaveformChartHtml(waves, {
    ...DEFAULT_CHART_OPTIONS,
    ...opts,
  });
}
