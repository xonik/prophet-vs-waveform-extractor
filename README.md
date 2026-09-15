# Prophet VS wavetable ROM converter

Decodes the Sequential Prophet VS factory wavetables from ROM images
(called `PVSMSB.BIN` / `PVSLSB.BIN` here - that's not their original names, 
you need to find the ROMs yourself on the internet) into WAV files and C++ headers.

![Prophet VS waveform chart preview](media/chart_preview_full_1.png)

The dump can be found here: https://www.sequencer.de/synthesizer/threads/prophet-vs-waves.121446/

## Why does this script exist?

The waves are originally stored in the two prophet VS roms (MSB/high and LSB/low).

There are several version of the extracted VS waveforms out there. In particular, I found
one version with each wave in .AIF format, 336 samples per wave. There are also
several others, adapted for various synths. Some are upsampled, many are
payware.

The .aif one in particular is a bit weird. There are 94 waveforms in the
Prophet VS, plus 2 special ones (silence and white noise, which is generated
on the fly). The .aif one has 104, and there are gaps in the numbering. Also, 
after comparing the waves with known visualisations of each wave, it's clear 
that they are either reversed/inverted or do not start and stop at the correct 
phase. It may not be a problem, but I wanted the very original ones, untouched 
by humans so to speak.

I also verified the ROM decode against a reference dump created during research,
but the ROM remains the defining source of truth for the waveform content.

## The ROM format

- The two ROM chip dumps are interleaved byte-for-byte into one memory
  image: `mem[0]=MSB[0], mem[1]=LSB[0], mem[2]=MSB[1], ...`
- The factory wavetable starts at the absolute byte address of the first
  valid waveform (`tableStartBytes = 47296`) in the interleaved image.
- From there, each waveform occupies a fixed 192-byte "slot":
  - The first **128 bytes** are plain **signed 8-bit** samples, one byte per
    waveform sample — the coarse part of each 12-bit sample.
  - The remaining **64 bytes** pack two 4-bit "fine" nibbles per byte, high
    nibble first: `tailByte[i]` holds the fine nibble for sample `2*i` in
    its upper 4 bits and for sample `2*i+1` in its lower 4 bits.
  - They recombine as `sample12 = int8(headByte) * 16 + fineNibble`
    (range -2048..2047). Upconverting to 16 bit simply left shifts by four
    keeping the lowest bits at 0
    
- In ROM, the first factory waveform (VS wave 32) begins at absolute byte
  address 47296 in the interleaved image.

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

Or decode a prebuilt VS-WAVES.DAT dump instead of the physical ROM images:

```sh
npx ts-node src/convert.ts \
  --vswave /path/to/VS-WAVES.DAT \
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
amplitudes are directly comparable at a glance.

### Other options

```
--out <dir>           Output directory (default: ./output)
--start <n>           Waveform index to decode (default: 32)
--count <n>           Number of waveform indices to attempt (default: 94, i.e. up to
                       index 125 — see "Default range" below)
--vswave <path>       Decode directly from a VS-WAVES.DAT dump instead of MSB/LSB ROM images
--sample-rate <n>     Sample rate written into WAV headers (default: 32000 — arbitrary;
                       the real VS oscillator rate depends on the note/pitch played)
--verbose             Print per-wave progress
--help                Show usage
```

The ROM-backed factory waveform set is fixed to VS indices 32..125. Requests
that try to start before 32 or extend past 125 are rejected.

## Default range

By default the converter decodes the 94 factory waveforms, indices
**32-125** (`--start 32 --count 94`). This is the only validated ROM-backed
range, and it is intentionally enforced:

- **0-31** — user-programmable RAM slots, not part of the factory ROM set.
- **126** — silent placeholder wave.
- **127** — generated noise waveform, not a stored ROM waveform.
