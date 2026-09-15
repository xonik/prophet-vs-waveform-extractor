#!/usr/bin/env node
/**
 * Prophet VS wavetable ROM converter — CLI entry point.
 *
 * Reads the two factory wavetable ROM images (PVSMSB.BIN / PVSLSB.BIN) or a single VSWAVE.BIN file and
 * emits one or more of:
 *   --wav-combined   one 16-bit WAV file containing every selected waveform back to back
 *   --wav-separate   one 16-bit WAV file per waveform
 *   --header16       one C++ header with each waveform as an inline int16_t[] (16-bit scale)
 *   --data12         one raw binary file per waveform, int16LE samples in the true 12-bit range
 *   --header12       one C++ header with each waveform as an inline int16_t[] (12-bit range)
 *   --chart          one HTML file with a small-multiples SVG chart of every decoded waveform
 *
 * Run with no output flags (or --all) to generate everything.
 *
 * Usage:
 *   npx ts-node src/convert.ts --msb PVSMSB.BIN --lsb PVSLSB.BIN --out ./output --all
 *   npx ts-node src/convert.ts --vswave VS-WAVES.DAT --out ./output --all
 *
 * See README.md for the full option list and background on the ROM format.
 */
import * as fs from "fs";
import * as path from "path";
import {
  DecodedWave,
  FIRST_FACTORY_WAVE,
  LAST_FACTORY_WAVE,
  HEAD_SIZE,
  SLOT_SIZE,
  TABLE_START_BYTES,
  ROM_OFFSET,
  availableRomSlots,
  decodeWaveRange,
  interleaveRom,
} from "./decodeROM";
import { decodeVswaveRange } from "./decodeVswave";
import { buildWavBuffer, concatSamples } from "./wav";
import { buildCppHeader } from "./cppHeader";
import { buildWaveformChartHtml, DEFAULT_CHART_OPTIONS } from "./chart";

interface CliOptions {
  msbPath?: string;
  lsbPath?: string;
  vswavePath?: string;
  outDir: string;
  startIndex: number;
  count: number;
  sampleRate: number;
  wavCombined: boolean;
  wavSeparate: boolean;
  header16: boolean;
  data12: boolean;
  header12: boolean;
  chart: boolean;
  chartWhich: "samples16" | "samples12";
  chartColumns: number;
  verbose: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    outDir: "./output",
    // Default range: the 94 factory waveforms starting at waveform index 32
    // through 125, which are the only validated ROM-backed waveforms.
    // Indices 0-31 are user/RAM slots, and 126/127 are reserved for the
    // silent/noise placeholders.
    startIndex: FIRST_FACTORY_WAVE,
    count: LAST_FACTORY_WAVE - FIRST_FACTORY_WAVE + 1,
    sampleRate: 32000,
    wavCombined: false,
    wavSeparate: false,
    header16: false,
    data12: false,
    header12: false,
    chart: false,
    chartWhich: "samples16",
    chartColumns: DEFAULT_CHART_OPTIONS.columns,
    verbose: false,
    help: false,
  };

  const boolFlags = new Set([
    "--wav-combined",
    "--wav-separate",
    "--header16",
    "--data12",
    "--header12",
    "--chart",
    "--all",
    "--verbose",
    "--help",
    "-h",
  ]);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case "--msb":
        opts.msbPath = next();
        break;
      case "--lsb":
        opts.lsbPath = next();
        break;
      case "--vswave":
        opts.vswavePath = next();
        break;
      case "--out":
        opts.outDir = next();
        break;
      case "--start":
        opts.startIndex = parseInt(next(), 10);
        break;
      case "--count":
        opts.count = parseInt(next(), 10);
        break;
      case "--sample-rate":
        opts.sampleRate = parseInt(next(), 10);
        break;
      case "--wav-combined":
        opts.wavCombined = true;
        break;
      case "--wav-separate":
        opts.wavSeparate = true;
        break;
      case "--header16":
        opts.header16 = true;
        break;
      case "--data12":
        opts.data12 = true;
        break;
      case "--header12":
        opts.header12 = true;
        break;
      case "--chart":
        opts.chart = true;
        break;
      case "--chart-which": {
        const v = next();
        if (v !== "samples16" && v !== "samples12") {
          throw new Error(`--chart-which must be "samples16" or "samples12", got "${v}"`);
        }
        opts.chartWhich = v;
        break;
      }
      case "--chart-columns":
        opts.chartColumns = parseInt(next(), 10);
        break;
      case "--all":
        opts.wavCombined = true;
        opts.wavSeparate = true;
        opts.header16 = true;
        opts.data12 = true;
        opts.header12 = true;
        opts.chart = true;
        break;
      case "--verbose":
        opts.verbose = true;
        break;
      case "--help":
      case "-h":
        opts.help = true;
        break;
      default:
        if (!boolFlags.has(arg)) {
          throw new Error(`Unknown argument: ${arg}`);
        }
    }
  }

  if (opts.count < 0) {
    throw new Error(`--count must be non-negative, got ${opts.count}.`);
  }
  if (opts.startIndex < FIRST_FACTORY_WAVE || opts.startIndex + opts.count > LAST_FACTORY_WAVE + 1) {
    throw new Error(
      `Invalid waveform range: only VS indices ${FIRST_FACTORY_WAVE}-${LAST_FACTORY_WAVE} are allowed. ` +
      `Got start=${opts.startIndex}, count=${opts.count}.`
    );
  }

  // If no specific output was requested (and --all wasn't passed either), default to everything.
  if (
    !opts.wavCombined &&
    !opts.wavSeparate &&
    !opts.header16 &&
    !opts.data12 &&
    !opts.header12 &&
    !opts.chart &&
    !opts.help
  ) {
    opts.wavCombined = true;
    opts.wavSeparate = true;
    opts.header16 = true;
    opts.data12 = true;
    opts.header12 = true;
    opts.chart = true;
  }

  return opts;
}

function printHelp(): void {
  console.log(`Prophet VS wavetable ROM converter

Usage:
  ts-node src/convert.ts --msb <PVSMSB.BIN> --lsb <PVSLSB.BIN> --out <dir> [options]

Required (choose one input mode):
  --msb <path>          Path to the MSB ROM image (e.g. PVSMSB.BIN)
  --lsb <path>          Path to the LSB ROM image (e.g. PVSLSB.BIN)
  --vswave <path>       Path to a VS-WAVES.DAT dump (alternative to ROM images)

Output selection (default: all, if none specified):
  --wav-combined        One 16-bit WAV file containing all selected waveforms back to back
  --wav-separate        One 16-bit WAV file per waveform
  --header16            One C++ header, each waveform as an inline int16_t[] (16-bit scale)
  --data12              One raw binary file per waveform (int16LE, true 12-bit range)
  --header12            One C++ header, each waveform as an inline int16_t[] (12-bit range)
  --chart               One HTML file with a small-multiples SVG chart of every decoded waveform
  --all                 Shorthand for enabling all six outputs above

Chart options:
  --chart-which <which> Which values to plot: samples16 (default) or samples12
  --chart-columns <n>   Waveform tiles per row in the chart grid (default: 10)

Other options:
  --out <dir>           Output directory (default: ./output)
  --start <n>           First waveform index to decode (default: 32)
  --count <n>           Number of waveform indices to attempt (default: 94, i.e. up to
                       index 125). Only the fixed ROM-backed factory set
                       32..125 is valid; indices 0..31 and 126..127 are
                       intentionally excluded.
  --sample-rate <n>     Sample rate written into WAV file headers (default: 32000; arbitrary —
                       the real VS oscillator rate depends on the note/pitch played)
  --verbose             Print per-wave progress
  --help                Show this message
`);
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function main(): void {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) {
    printHelp();
    return;
  }

  const hasRomInputs = Boolean(opts.msbPath || opts.lsbPath);
  const hasVswaveInput = Boolean(opts.vswavePath);
  if ((opts.msbPath && !opts.lsbPath) || (!opts.msbPath && opts.lsbPath)) {
    printHelp();
    throw new Error("Both --msb and --lsb are required together.");
  }
  if (hasRomInputs && hasVswaveInput) {
    printHelp();
    throw new Error("Choose either --msb/--lsb OR --vswave, not both.");
  }
  if (!hasRomInputs && !hasVswaveInput) {
    printHelp();
    throw new Error("Either --msb/--lsb or --vswave is required.");
  }

  let waves: DecodedWave[];
  let provenance: string;

  if (opts.vswavePath) {
    waves = decodeVswaveRange(opts.vswavePath, opts.startIndex, opts.count);
    provenance =
      `Source: ${path.basename(opts.vswavePath)}\n` +
      `Generated: ${new Date().toISOString()}\n` +
      `Format: VS-WAVES.DAT stores 128 16-bit samples per waveform, big-endian signed, ` +
      `with the 12-bit data left-shifted by four bits.\n` +
      `Values are represented as sample16 = rawBigEndianSample and sample12 = sample16 / 16.`;
    console.log(`Loaded VS-WAVES.DAT from ${opts.vswavePath}.`);
  } else {
    const msb = fs.readFileSync(opts.msbPath!);
    const lsb = fs.readFileSync(opts.lsbPath!);
    const mem = interleaveRom(msb, lsb);

    const nSlots = availableRomSlots(mem);
    console.log(
      `Loaded ${msb.length}-byte MSB + ${lsb.length}-byte LSB ROM images ` +
        `(${mem.length} bytes interleaved, ${nSlots} wavetable slots available).`
    );

    waves = decodeWaveRange(mem, opts.startIndex, opts.count);
    provenance =
      `Source: ${path.basename(opts.msbPath!)} / ${path.basename(opts.lsbPath!)}\n` +
      `Generated: ${new Date().toISOString()}\n` +
      `ROM layout: fixed slot=${SLOT_SIZE} bytes, head=${HEAD_SIZE} bytes 8-bit, ` +
      `tail=${SLOT_SIZE - HEAD_SIZE} bytes packed nibbles, ` +
      `tableStart=${TABLE_START_BYTES} (absolute address of waveform 32), romOffset=${ROM_OFFSET}.\n` +
      `Format: sample12 = int8(headByte)*16 + fineNibble; fineNibble packed two-per-byte ` +
      `(high nibble = earlier sample) in the ${SLOT_SIZE - HEAD_SIZE} bytes ` +
      `following the head.`;
  }

  const skipped = opts.count - waves.length;
  console.log(
    `Decoded ${waves.length} waveform(s) for VS index range [${opts.startIndex}, ${
      opts.startIndex + opts.count - 1
    }]` + (skipped > 0 ? ` (${skipped} out of ROM range, skipped)` : "")
  );
  if (waves.length === 0) {
    console.warn("Nothing to write - no waveforms decoded.");
    return;
  }
  if (opts.verbose) {
    for (const w of waves) {
      console.log(
        `  waveform ${w.waveformIndex} <- ${opts.vswavePath ? "waveform index" : `ROM table offset ${w.romIndex}`}`
      );
    }
  }

  ensureDir(opts.outDir);

  if (opts.wavCombined) {
    const all16 = concatSamples(waves.map((w) => w.samples16));
    const buf = buildWavBuffer(all16, opts.sampleRate);
    const outPath = path.join(opts.outDir, "prophet_vs_waves_all.wav");
    fs.writeFileSync(outPath, buf);
    console.log(`Wrote ${outPath} (${all16.length} samples, ${waves.length} waveforms).`);
  }

  if (opts.wavSeparate) {
    const dir = path.join(opts.outDir, "wav");
    ensureDir(dir);
    for (const w of waves) {
      const buf = buildWavBuffer(w.samples16, opts.sampleRate);
      const outPath = path.join(dir, `wave_${String(w.waveformIndex).padStart(3, "0")}.wav`);
      fs.writeFileSync(outPath, buf);
    }
    console.log(`Wrote ${waves.length} WAV file(s) to ${dir}/`);
  }

  if (opts.data12) {
    const dir = path.join(opts.outDir, "data12");
    ensureDir(dir);
    for (const w of waves) {
      const buf = Buffer.alloc(w.samples12.length * 2);
      for (let i = 0; i < w.samples12.length; i++) buf.writeInt16LE(w.samples12[i], i * 2);
      const outPath = path.join(dir, `wave_${String(w.waveformIndex).padStart(3, "0")}.i12`);
      fs.writeFileSync(outPath, buf);
    }
    console.log(
      `Wrote ${waves.length} 12-bit data file(s) to ${dir}/ ` +
        `(raw little-endian int16 samples, values in range -2048..2047)`
    );
  }

  if (opts.header16) {
    const header = buildCppHeader(waves, {
      which: "samples16",
      namespaceName: "ProphetVS",
      arrayPrefix: "wave16",
      tableName: "kWaves16",
      provenance: provenance + "\nValues are scaled to 16-bit (sample12 * 16).",
    });
    const outPath = path.join(opts.outDir, "prophet_vs_waves_16bit.h");
    fs.writeFileSync(outPath, header);
    console.log(`Wrote ${outPath}`);
  }

  if (opts.header12) {
    const header = buildCppHeader(waves, {
      which: "samples12",
      namespaceName: "ProphetVS",
      arrayPrefix: "wave12",
      tableName: "kWaves12",
      provenance: provenance + "\nValues are the true 12-bit range (-2048..2047).",
    });
    const outPath = path.join(opts.outDir, "prophet_vs_waves_12bit.h");
    fs.writeFileSync(outPath, header);
    console.log(`Wrote ${outPath}`);
  }

  if (opts.chart) {
    const html = buildWaveformChartHtml(waves, {
      ...DEFAULT_CHART_OPTIONS,
      which: opts.chartWhich,
      columns: opts.chartColumns,
      title: `Prophet VS wavetable — ${waves.length} decoded waveform(s)`,
    });
    const outPath = path.join(opts.outDir, "prophet_vs_waves_chart.html");
    fs.writeFileSync(outPath, html);
    console.log(`Wrote ${outPath} (open in any browser to eyeball every decoded waveform)`);
  }

  console.log("Done.");
}

main();
