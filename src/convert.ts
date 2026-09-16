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
  decodeWaveRangeFromRomPair,
} from "./decodeROM";
import { decodeVswaveData } from "./decodeVswave";
import { DEFAULT_CHART_OPTIONS } from "./chart";
import { buildChartFile, buildCombinedWavBuffer, buildHeaderFile, buildSeparateWavBuffers } from "./exportShared";

interface CliOptions {
  msbPath?: string;
  lsbPath?: string;
  vswavePath?: string;
  outDir: string;
  startIndex: number;
  count: number;
  bitDepth: "samples16" | "samples12";
  sampleRate: number;
  wavCombined: boolean;
  wavSeparate: boolean;
  chart: boolean;
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
    bitDepth: "samples16",
    sampleRate: 32000,
    wavCombined: false,
    wavSeparate: false,
    chart: false,
    chartColumns: DEFAULT_CHART_OPTIONS.columns,
    verbose: false,
    help: false,
  };

  const boolFlags = new Set([
    "--wav-combined",
    "--wav-separate",
    "--header",
    "--raw",
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
      case "--bit-depth": {
        const v = next();
        if (v !== "16" && v !== "12") {
          throw new Error(`--bit-depth must be "16" or "12", got "${v}"`);
        }
        opts.bitDepth = v === "12" ? "samples12" : "samples16";
        break;
      }
      case "--wav-combined":
        opts.wavCombined = true;
        break;
      case "--wav-separate":
        opts.wavSeparate = true;
        break;
      case "--header":
      case "--raw":
        break;
      case "--chart":
        opts.chart = true;
        break;
      case "--chart-columns":
        opts.chartColumns = parseInt(next(), 10);
        break;
      case "--all":
        opts.wavCombined = true;
        opts.wavSeparate = true;
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
    !argv.includes("--header") &&
    !argv.includes("--raw") &&
    !opts.chart &&
    !opts.help
  ) {
    opts.wavCombined = true;
    opts.wavSeparate = true;
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
  --wav-combined        One WAV file containing all selected waveforms back to back
  --wav-separate        One WAV file per waveform
  --header              One C++ header using the selected bit depth
  --raw                 One raw binary file per waveform using the selected bit depth
  --chart               One HTML file with a small-multiples SVG chart of every decoded waveform
  --all                 Shorthand for enabling all outputs above

Format options:
  --bit-depth <n>       16 (default) or 12; reused for WAV, binary, header and chart output
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

function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

function main(): void {
  const argv = process.argv.slice(2);
  const opts = parseArgs(argv);

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
    waves = decodeVswaveData(fs.readFileSync(opts.vswavePath), opts.startIndex, opts.count);
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
    const { waves: decodedWaves, swappedRomOrder } = decodeWaveRangeFromRomPair(msb, lsb, opts.startIndex, opts.count);
    const interleavedLength = msb.length * 2;
    const nSlots = Math.floor(Math.max(0, interleavedLength - TABLE_START_BYTES) / SLOT_SIZE);

    console.log(
      `Loaded ${msb.length}-byte MSB + ${lsb.length}-byte LSB ROM images ` +
        `(${interleavedLength} bytes interleaved, ${nSlots} wavetable slots available).`
    );
    if (swappedRomOrder) {
      console.log("ROM ordering sanity check failed for the first wave; swapped MSB and LSB inputs automatically.");
    }

    waves = decodedWaves;
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
    const totalSamples = waves.reduce((sum, wave) => sum + wave.samples16.length, 0);
    const buf = buildCombinedWavBuffer(waves, opts.bitDepth, opts.sampleRate);
    const outPath = path.join(opts.outDir, `prophet_vs_waves_all_${opts.bitDepth === "samples12" ? "12bit" : "16bit"}.wav`);
    fs.writeFileSync(outPath, buf);
    console.log(`Wrote ${outPath} (${totalSamples} samples, ${waves.length} waveforms).`);
  }

  if (opts.wavSeparate) {
    const dir = path.join(opts.outDir, "wav");
    ensureDir(dir);
    for (const entry of buildSeparateWavBuffers(waves, opts.bitDepth, opts.sampleRate)) {
      const outPath = path.join(dir, `wave_${String(entry.waveformIndex).padStart(3, "0")}.wav`);
      fs.writeFileSync(outPath, entry.buffer);
    }
    console.log(`Wrote ${waves.length} WAV file(s) to ${dir}/`);
  }

  if (hasFlag(argv, "--raw")) {
    const dir = path.join(opts.outDir, opts.bitDepth === "samples12" ? "data12" : "data16");
    ensureDir(dir);
    for (const w of waves) {
      const values = w[opts.bitDepth];
      const buf = Buffer.alloc(values.length * 2);
      for (let i = 0; i < values.length; i++) buf.writeInt16LE(values[i], i * 2);
      const outPath = path.join(
        dir,
        `wave_${String(w.waveformIndex).padStart(3, "0")}.${opts.bitDepth === "samples12" ? "i12" : "i16"}`
      );
      fs.writeFileSync(outPath, buf);
    }
    console.log(
      `Wrote ${waves.length} ${opts.bitDepth === "samples12" ? "12-bit" : "16-bit"} data file(s) to ${dir}/`
    );
  }

  if (hasFlag(argv, "--header")) {
    const header = buildHeaderFile(waves, opts.bitDepth, provenance);
    const outPath = path.join(
      opts.outDir,
      `prophet_vs_waves_${opts.bitDepth === "samples12" ? "12bit" : "16bit"}.h`
    );
    fs.writeFileSync(outPath, header);
    console.log(`Wrote ${outPath}`);
  }

  if (opts.chart) {
    const html = buildChartFile(waves, {
      which: opts.bitDepth,
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
