# Prophet VS wavetable ROM converter

Decodes the Sequential Prophet VS factory wavetable ROM images
(`PVSMSB.BIN` / `PVSLSB.BIN`) into WAV files and C++ headers, using the ROM
format reverse-engineered against the reference `VS-WAVES.DAT` dump.
The dump can be found here: https://www.sequencer.de/synthesizer/threads/prophet-vs-waves.121446/
## The ROM format

- The two ROM chip dumps are interleaved byte-for-byte into one memory
  image: `mem[0]=MSB[0], mem[1]=LSB[0], mem[2]=MSB[1], ...`
- The wavetable region starts at a fixed byte offset (`tableStartBytes =
  31936`) into that interleaved image.
- From there, each waveform occupies a fixed 192-byte "slot":
  - The first **128 bytes** are plain **signed 8-bit** samples, one byte per
    waveform sample — the coarse part of each 12-bit sample.
  - The remaining **64 bytes** pack two 4-bit "fine" nibbles per byte, high
    nibble first: `tailByte[i]` holds the fine nibble for sample `2*i` in
    its upper 4 bits and for sample `2*i+1` in its lower 4 bits.
  - They recombine as `sample12 = int8(headByte) * 16 + fineNibble`
    (range -2048..2047), and `sample16 = sample12 * 16` (matches the
    `VS-WAVES.DAT` convention, whose low nibble is always 0).
- ROM slot index and `VS-WAVES.DAT` waveform index differ by a fixed
  offset: `romIndex = vsIndex + 48` (e.g. VS wave 32, the cosine, is ROM
  slot 80).

This was validated against all 95 available factory waves (VS index
32-126): mean sample correlation 0.99999, mean RMS error ~41 out of a
+/-32768 range (~0.13%), with a small, symmetric, noise-like residual left
over.

All of the above are configurable command-line flags if you want to
experiment with different assumptions (see `--help`).

## Setup

```sh
npm install
```

## Usage

Run directly with `ts-node` (no build step needed):

```sh
npx ts-node src/convert.ts \
  --msb /path/to/PVSMSB.BIN \
  --lsb /path/to/PVSLSB.BIN \
  --out ./output \
  --all
```

Or compile to plain JS first:

```sh
npm run build
node dist/convert.js --msb PVSMSB.BIN --lsb PVSLSB.BIN --out ./output --all
```

### Output selection

Pass any combination of these flags (default: all of them, if none given):

| flag | output |
|---|---|
| `--wav-combined` | one 16-bit WAV file with every selected waveform back to back (`prophet_vs_waves_all.wav`) |
| `--wav-separate` | one 16-bit WAV file per waveform, under `wav/wave_NNN.wav` |
| `--header16` | one C++ header (`prophet_vs_waves_16bit.h`), each waveform as an inline `int16_t[]` at 16-bit scale |
| `--data12` | one raw binary file per waveform under `data12/wave_NNN.i12` (little-endian `int16`, true 12-bit range -2048..2047) |
| `--header12` | one C++ header (`prophet_vs_waves_12bit.h`), each waveform as an inline `int16_t[]` in the true 12-bit range |
| `--chart` | one HTML file (`prophet_vs_waves_chart.html`) with a small-multiples SVG chart of every decoded waveform — open it in any browser, no server or dependency needed |

### Chart options

```
--chart-which <which>   Which values to plot: samples16 (default) or samples12
--chart-columns <n>     Waveform tiles per row in the chart grid (default: 10)
```

The chart plots every decoded waveform on the same fixed y-axis (the full
16-bit or 12-bit range, depending on `--chart-which`), so waveform shapes and
amplitudes are directly comparable at a glance — the same kind of grid used
to validate the ROM decode against `VS-WAVES.DAT` during development.

### Other options

```
--out <dir>           Output directory (default: ./output)
--start <n>           First VS-WAVES.DAT waveform index to decode (default: 32)
--count <n>           Number of waveform indices to attempt (default: 94, i.e. up to
                       index 125 — see "Default range" below)
--rom-offset <n>      romIndex = vsIndex + romOffset (default: 48)
--table-start <n>     Byte offset of ROM slot 0 in the interleaved image (default: 31936)
--slot-size <n>       Bytes per ROM waveform slot (default: 192)
--head-size <n>       Bytes of plain 8-bit samples at the start of each slot (default: 128)
--sample-rate <n>     Sample rate written into WAV headers (default: 32000 — arbitrary;
                       the real VS oscillator rate depends on the note/pitch played)
--verbose             Print per-wave progress
--help                Show usage
```

Waveform indices whose corresponding ROM slot falls outside the ROM data
(e.g. requesting indices beyond what the dump contains) are silently
skipped, with a summary line printed at the end.

## Default range

By default the converter decodes the 94 factory waveforms, VS-WAVES indices
**32-125** (`--start 32 --count 94`), skipping:

- **0-31** — the user-programmable slots. They don't have a fixed factory
  ROM counterpart the way 32-125 do, so decoding them with the default
  `--rom-offset 48` would produce *something*, but it's unvalidated.
- **126** — the last available ROM slot, which is silent/empty.

Pass `--start 0 --count 128` to get every index the ROM data can produce
instead.

## Notes

- Wave 127 (and generally, whatever sits past the last physical ROM slot)
  will simply be skipped as out of range, regardless of `--count`.
