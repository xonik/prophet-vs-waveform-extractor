#!/usr/bin/env -S npx tsx
/**
 * Decoder for Prophet VS "VS-WAVES.DAT" wavetable dumps.
 *
 * DAT file from https://www.sequencer.de/synthesizer/threads/prophet-vs-waves.121446/
 *
 * The VS-WAVES.DAT file contains all 128 waveforms (32 user + 96 ROM), not just the
 * rom waveforms.
 *
 * Originally from
 *
 * Format (reverse-engineered from a 32768-byte dump):
 *   - No header, no padding, no sysex framing: the file is pure raw sample data.
 *   - 128 waveforms, each exactly 256 bytes (128 samples x 2 bytes).
 *     32768 / 256 = 128 exactly, with no remainder, which is what pins the
 *     count at 128 rather than 94 or 96. This means the DAT file also contains the
 *     32 "user" waves (0-31) which are not part of the ROM set (32-127).
 *   - Each sample is a 16-bit BIG-ENDIAN signed integer ("Motorola" byte
 *     order, as commonly used on 68000-based gear such as the Atari ST).
 *   - Only the top 12 bits actually carry data: every decoded sample value
 *     is an exact multiple of 16 (i.e. the low nibble is always 0). This
 *     means the real DAC/wavetable resolution is 12-bit, left-shifted into
 *     the 16-bit words.
 *
 * Verification:
 *   - Waveform index 32, decoded this way, is a clean one-cycle cosine
 *     (starts at +max, falls smoothly through 0 around sample 32, hits
 *     -max near sample 64, rises back to +max by sample 128).
 *   - Waveform index 34 is a clean one-cycle square wave (~+max for the
 *     first half of the table, ~-max for the second half).
 *   - This matches the creator's claim exactly, and only the big-endian
 *     signed interpretation produces smooth, plausible waveforms globally
 *     (a sum-of-squared-differences smoothness test across all 128 tables
 *     favors big-endian by ~9x over little-endian).
 *
 * Usage (via tsx or ts-node):
 *   npx tsx decode_vswaves.ts VS-WAVES.DAT --info
 *   npx tsx decode_vswaves.ts VS-WAVES.DAT --plot 32 34 0 16 --plot-out waves.svg
 *   npx tsx decode_vswaves.ts VS-WAVES.DAT --export-wav out_dir/ --rate 32000
 *   npx tsx decode_vswaves.ts VS-WAVES.DAT --export-wav out_dir/ --index 32 34
 *
 * Original comments from author of DAT file (seems like a usenet post?=:
 *
 * Path: rz.uni-hildesheim.de!zib-berlin.de!news.th-darmstadt.de!terra.wiwi.uni-frankfurt.de!zeus.rbi.informatik.uni-frankfurt.de!news.dfn.de!swiss.ans.net!howland.reston.ans.net!spool.mu.edu!olivea!sgigate.sgi.com!gazette.engr.sgi.com!prophet.esd.sgi.com!gints
 * From: gints@prophet.esd.sgi.com (Gints Klimanis)
 * Newsgroups: comp.music,vectory@netcom.com
 * Subject: available: Prophet VS wave data
 * Date: 4 Jan 1995 23:52:53 GMT
 * Organization: Silicon Graphics, Inc.
 * Lines: 35
 * Distribution: world
 * Message-ID: <3efccl$drn@gazette.engr.sgi.com>
 * NNTP-Posting-Host: prophet.esd.sgi.com
 *
 * Many years ago, I dumped all Prophet VS waves (128 samples/cycle, 12-bit
 * resolution) over MIDI to my Atari ST. email me if you want them.
 *
 * Prophet VS Wave data - 128 waves
 *
 * 32768 bytes = 128 cycles * 128 samples/cycle * 2 bytes/sample
 * 16-bit signed integer
 *
 * Waves 0 .. 31 RAM memory and are actually of no value.
 * Waves 32 ..127 ROM memory are standard wave set.
 *
 * Notable ROM waves:
 *
 * 32 cosine
 * 33 sawtooth
 * 34 square
 * 46 thin pulse 1
 * 47 thin pulse 2
 *
 * 126 silence
 * 127 bogus entry, as this specifies Prophet VS noise generator
 *
 * Remember that single cycles themselves are not particularly
 * interesting. Stacking, detuning and timbral animation via vector
 * envlopes make the VS.
 *
 * For convenience, I have left shifted the 12-bit data by 4 places to
 * align on a 16-bit boundary. In other words, the 16-bit samples offer
 * no more information than the original 12-bit samples. Soon, I will
 * create 32-bit floating point wave cycles with more samples/cycle and
 * publish tables of harmonic amplitude and phases for each wave.
 *
 * Enjoy,
 *
 * Gints Klimanis
 *
 */

import * as fs from "fs";
import * as path from "path";

const SAMPLES_PER_WAVE = 128;
const BYTES_PER_SAMPLE = 2;
const BYTES_PER_WAVE = SAMPLES_PER_WAVE * BYTES_PER_SAMPLE; // 256

/** Decode the file into an array of Int16Array (big-endian signed), one per waveform. */
function loadWaves(filePath: string): Int16Array[] {
  const data = fs.readFileSync(filePath);
  if (data.length % BYTES_PER_WAVE !== 0) {
    throw new Error(
      `File size ${data.length} is not a multiple of ${BYTES_PER_WAVE} bytes ` +
      `(128 samples x 16-bit); format assumption may not hold for this file.`
    );
  }
  const nWaves = data.length / BYTES_PER_WAVE;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const waves: Int16Array[] = [];
  for (let w = 0; w < nWaves; w++) {
    const samples = new Int16Array(SAMPLES_PER_WAVE);
    for (let s = 0; s < SAMPLES_PER_WAVE; s++) {
      const offset = w * BYTES_PER_WAVE + s * BYTES_PER_SAMPLE;
      samples[s] = view.getInt16(offset, false); // false = big-endian
    }
    waves.push(samples);
  }
  return waves;
}

function printInfo(waves: Int16Array[]): void {
  console.log(`waveforms: ${waves.length}`);
  console.log(`samples per waveform: ${SAMPLES_PER_WAVE}`);

  let globalMin = Infinity;
  let globalMax = -Infinity;
  let allMultOf16 = true;
  for (const w of waves) {
    for (const v of w) {
      if (v < globalMin) globalMin = v;
      if (v > globalMax) globalMax = v;
      if (v % 16 !== 0) allMultOf16 = false;
    }
  }
  console.log(`global min/max: ${globalMin} / ${globalMax}`);
  console.log(
    `all samples multiples of 16 (12-bit DAC left-shifted into 16 bits): ${allMultOf16}`
  );

  waves.forEach((w, idx) => {
    let min = Infinity;
    let max = -Infinity;
    let zeroCrossings = 0;
    let prevSign = 0;
    let allZero = true;
    for (const v of w) {
      if (v !== 0) allZero = false;
      if (v < min) min = v;
      if (v > max) max = v;
      const sign = Math.sign(v);
      if (prevSign !== 0 && sign !== 0 && sign !== prevSign) zeroCrossings++;
      if (sign !== 0) prevSign = sign;
    }
    const flag = allZero ? "silent" : "";
    console.log(
      `  wave ${idx.toString().padStart(3)}: min=${min
        .toString()
        .padStart(6)} max=${max.toString().padStart(6)} ` +
      `zero_crossings=${zeroCrossings.toString().padStart(3)} ${flag}`
    );
  });
}

/** Dependency-free SVG plot of one or more waveforms (a stand-in for matplotlib). */
function plotWaves(waves: Int16Array[], indices: number[], outPath: string): void {
  const cols = Math.min(4, indices.length);
  const rows = Math.ceil(indices.length / cols);
  const cellW = 320;
  const cellH = 220;
  const pad = 20;
  const width = cols * cellW;
  const height = rows * cellH;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
  );
  parts.push(`<rect width="100%" height="100%" fill="white"/>`);

  indices.forEach((idx, i) => {
    const w = waves[idx];
    if (!w) return;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const ox = col * cellW;
    const oy = row * cellH;

    const plotW = cellW - 2 * pad;
    const plotH = cellH - 2 * pad - 20; // leave room for title
    const midY = oy + pad + 20 + plotH / 2;
    const scale = plotH / 2 / 32768;

    parts.push(
      `<text x="${ox + cellW / 2}" y="${oy + 16}" font-size="13" font-family="sans-serif" text-anchor="middle">wave ${idx}</text>`
    );
    // zero line
    parts.push(
      `<line x1="${ox + pad}" y1="${midY}" x2="${ox + pad + plotW}" y2="${midY}" stroke="#ccc" stroke-width="1"/>`
    );
    // border
    parts.push(
      `<rect x="${ox + pad}" y="${oy + pad + 20}" width="${plotW}" height="${plotH}" fill="none" stroke="#eee"/>`
    );

    const points = w
      .map((v, s) => {
        const x = ox + pad + (s / (SAMPLES_PER_WAVE - 1)) * plotW;
        const y = midY - v * scale;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
    parts.push(
      `<polyline points="${points}" fill="none" stroke="#2563eb" stroke-width="1.5"/>`
    );
  });

  parts.push(`</svg>`);
  fs.writeFileSync(outPath, parts.join("\n"));
  console.log(`wrote ${outPath}`);
}

/** Build a minimal 16-bit PCM mono WAV file buffer from little-endian samples. */
function buildWavBuffer(samples: Int16Array, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * 2;

  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16); // PCM fmt chunk size
  buffer.writeUInt16LE(1, 20); // audio format = PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(samples[i], 44 + i * 2); // WAV files are little-endian
  }
  return buffer;
}

function exportWav(
  waves: Int16Array[],
  outDir: string,
  rate: number,
  indices?: number[]
): void {
  fs.mkdirSync(outDir, { recursive: true });
  const idxs = indices && indices.length ? indices : waves.map((_, i) => i);
  for (const idx of idxs) {
    const w = waves[idx];
    if (!w) continue;
    const buf = buildWavBuffer(w, rate);
    const outPath = path.join(outDir, `wave_${idx.toString().padStart(3, "0")}.wav`);
    fs.writeFileSync(outPath, buf);
  }
  console.log(`wrote ${idxs.length} WAV file(s) to ${outDir}/`);
}

// --- simple CLI argument parsing (no external deps) ---
function parseArgs(argv: string[]) {
  const args = {
    file: "",
    info: false,
    plot: undefined as number[] | undefined,
    plotOut: "waves.svg",
    exportWavDir: undefined as string | undefined,
    rate: 32000,
    index: undefined as number[] | undefined,
  };

  const rest = [...argv];
  if (rest.length === 0 || rest[0].startsWith("--")) {
    console.error("usage: decode_vswaves.ts <file> [--info] [--plot IDX...] [--plot-out PATH] [--export-wav DIR] [--rate N] [--index IDX...]");
    process.exit(1);
  }
  args.file = rest.shift()!;

  while (rest.length) {
    const tok = rest.shift()!;
    switch (tok) {
      case "--info":
        args.info = true;
        break;
      case "--plot": {
        const nums: number[] = [];
        while (rest.length && !rest[0].startsWith("--")) nums.push(Number(rest.shift()));
        args.plot = nums;
        break;
      }
      case "--plot-out":
        args.plotOut = rest.shift()!;
        break;
      case "--export-wav":
        args.exportWavDir = rest.shift()!;
        break;
      case "--rate":
        args.rate = Number(rest.shift());
        break;
      case "--index": {
        const nums: number[] = [];
        while (rest.length && !rest[0].startsWith("--")) nums.push(Number(rest.shift()));
        args.index = nums;
        break;
      }
      default:
        console.error(`unknown argument: ${tok}`);
        process.exit(1);
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const waves = loadWaves(args.file);

  if (args.info || (!args.plot && !args.exportWavDir)) {
    printInfo(waves);
  }

  if (args.plot) {
    const idxs = args.plot.length ? args.plot : [32, 34, 0, 16];
    plotWaves(waves, idxs, args.plotOut);
  }

  if (args.exportWavDir) {
    exportWav(waves, args.exportWavDir, args.rate, args.index);
  }
}

main();
