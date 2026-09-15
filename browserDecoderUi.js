(function () {
  const waveformNames = [
    { pvs: "Sine", evolver: "Sine" },
    { pvs: "Saw", evolver: "Sawtooth" },
    { pvs: "Sqr", evolver: "Square" },
    { pvs: "WmBell", evolver: "WmBell" },
    { pvs: "RdBell", evolver: "RdBell" },
    { pvs: "R2Bell", evolver: "R2Bell" },
    { pvs: "W2Bell", evolver: "W2Bell" },
    { pvs: "FmtBell", evolver: "FmtBell" },
    { pvs: "FzReed", evolver: "FzReed" },
    { pvs: "FmtAOh", evolver: "FmtAOh" },
    { pvs: "FmtAhh", evolver: "FmtAhh" },
    { pvs: "TriPlus", evolver: "TriPlus" },
    { pvs: "DisBel", evolver: "DisBel" },
    { pvs: "Pulse1", evolver: "Pulse 1" },
    { pvs: "Pulse2", evolver: "Pulse 2" },
    { pvs: "SqrReed", evolver: "Square Reed" },
    { pvs: "Oohh", evolver: "Oohh" },
    { pvs: "Eehh", evolver: "Eehh" },
    { pvs: "FeedBack", evolver: "FeedBack" },
    { pvs: "Piano1", evolver: "Piano1" },
    { pvs: "E.Pno", evolver: "Electric Piano" },
    { pvs: "M.Harm", evolver: "M.Harm" },
    { pvs: "HiTop", evolver: "HiTop" },
    { pvs: "WmReed", evolver: "WmReed" },
    { pvs: "3 & 5", evolver: "3rd and 5th harmonics; fundamental absent" },
    { pvs: "Hollow", evolver: "Hollow" },
    { pvs: "Hvy7", evolver: "Heavy 7th harmonics" },
    { pvs: "BelOrg", evolver: "BelOrg" },
    { pvs: "BassBel", evolver: "BASSBELL (14th and 28th harmonics)" },
    { pvs: "Tine1", evolver: "Tine1" },
    { pvs: "PhSQR", evolver: "PhSQR" },
    { pvs: "Orient", evolver: "Orient" },
    { pvs: "HiPipe", evolver: "HiPipe" },
    { pvs: "Mass", evolver: "Mass" },
    { pvs: "ReedOrg", evolver: "ReedOrg" },
    { pvs: "OrgAhh", evolver: "OrgAhh" },
    { pvs: "MelOrg", evolver: "MelOrg" },
    { pvs: "FmtOrg", evolver: "FmtOrg" },
    { pvs: "Clar", evolver: "Clarinet" },
    { pvs: "AhhFem", evolver: "AhhFem" },
    { pvs: "AhhHom", evolver: "AhhHom" },
    { pvs: "AhhBass", evolver: "AhhBass" },
    { pvs: "RegVox", evolver: "RegVox" },
    { pvs: "Vocal", evolver: "VOCAL 1 (Detune oscs using either wave to bring out the vocal)" },
    { pvs: "Homme", evolver: "VOCAL 2 (Detune oscs using either wave to bring out the vocal)" },
    { pvs: "HiAhh", evolver: "HiAhh" },
    { pvs: "Bass", evolver: "Bass" },
    { pvs: "Guitar", evolver: "Guitar" },
    { pvs: "Nice", evolver: "Nice" },
    { pvs: "WWind", evolver: "WoodWind" },
    { pvs: "Oboe", evolver: "Oboe" },
    { pvs: "Harp", evolver: "Harp" },
    { pvs: "Pipe", evolver: "Pipe" },
    { pvs: "Hack1", evolver: "Hack1" },
    { pvs: "Hack2", evolver: "Hack2" },
    { pvs: "Hack3", evolver: "Hack3" },
    { pvs: "Pinch", evolver: "Pinch" },
    { pvs: "BellHrm", evolver: "BellHrm" },
    { pvs: "BellVox", evolver: "BellVox" },
    { pvs: "Hi Harm", evolver: "Hi Harm" },
    { pvs: "Hi Reed", evolver: "Hi Reed" },
    { pvs: "BellReed", evolver: "BellReed" },
    { pvs: "WmWhstl", evolver: "WmWhstl" },
    { pvs: "Wood", evolver: "Wood" },
    { pvs: "Pure", evolver: "Pure" },
    { pvs: "Med Pure", evolver: "Med Pure" },
    { pvs: "HiHarm", evolver: "HiHarm" },
    { pvs: "FullBell", evolver: "FullBell" },
    { pvs: "Bell", evolver: "Bell" },
    { pvs: "Pinch", evolver: "Pinch" },
    { pvs: "Clustr", evolver: "Clustr" },
    { pvs: "M.Pinch", evolver: "M.Pinch" },
    { pvs: "VoxPnch", evolver: "VoxPnch" },
    { pvs: "OrgPnch", evolver: "OrgPnch" },
    { pvs: "AhhPnch", evolver: "AhhPnch" },
    { pvs: "PnoOrg", evolver: "PnoOrg" },
    { pvs: "BrReed", evolver: "BrReed" },
    { pvs: "NoFund", evolver: "NoFund" },
    { pvs: "ReedHrm", evolver: "ReedHrm" },
    { pvs: "LiteFund", evolver: "LiteFund" },
    { pvs: "MelOrg", evolver: "MelOrg" },
    { pvs: "Bell", evolver: "Bell Partials 1" },
    { pvs: "Bell", evolver: "Bell" },
    { pvs: "3&5Saw", evolver: "Sawtooth 3rd and 5th" },
    { pvs: "5thSin", evolver: "Sine 5ths (2 sines an octave and a 5th apart)" },
    { pvs: "Sin2Oct", evolver: "Sine 2 Octave (2 sines, 2 octaves apart)" },
    { pvs: "Sin4Oct", evolver: "Sine 4 Octave (2 sines, 4 Octaves apart)" },
    { pvs: "Saw5th", evolver: "Sawtooth 5ths (2 saws, an octave and a 5th apart)" },
    { pvs: "Saw2Oct", evolver: "Sawtooth 2 Octaves (2 saws, 2 octaves apart)" },
    { pvs: "Sqr5th", evolver: "Square 5ths (2 squares, a 5th apart)" },
    { pvs: "Sqr5Oct", evolver: "Square Octave+5th (2 squares, an octave and a 5th apart)" },
    { pvs: "Sqr2Oct", evolver: "Square 2-Octaves (2 squares, 2 octaves apart)" },
    { pvs: "WarmLo", evolver: "Bell Partials 2" },
    { pvs: "Bells", evolver: "Null (Blank) Wave" },
    { pvs: "*null*", evolver: "?" },
    { pvs: "Noise", evolver: "?" },
  ];

  const TABLE_START_BYTES = 47296;
  const SLOT_SIZE = 192;
  const HEAD_SIZE = 128;
  const ROM_OFFSET = -32;
  const FIRST_FACTORY_WAVE = 32;
  const LAST_FACTORY_WAVE = 125;
  const SAMPLES_PER_WAVE = 128;
  const BYTES_PER_SAMPLE = 2;
  const BYTES_PER_WAVE = SAMPLES_PER_WAVE * BYTES_PER_SAMPLE;
  const SAMPLE_RATE = 32000;

  let decodedWaves = [];

  function interleaveRom(msb, lsb) {
    if (msb.length !== lsb.length) {
      throw new Error(`MSB (${msb.length}) and LSB (${lsb.length}) must be same length.`);
    }
    const mem = new Uint8Array(msb.length * 2);
    for (let i = 0; i < msb.length; i++) {
      mem[2 * i] = msb[i];
      mem[2 * i + 1] = lsb[i];
    }
    return mem;
  }

  function decodeWaveRange(mem, startIndex, count) {
    if (!Number.isInteger(startIndex) || !Number.isInteger(count) || count < 0) {
      throw new Error(`Invalid waveform range: startIndex=${startIndex}, count=${count}`);
    }
    if (startIndex < FIRST_FACTORY_WAVE || startIndex + count > LAST_FACTORY_WAVE + 1) {
      throw new Error(
        `Invalid waveform range: only VS indices ${FIRST_FACTORY_WAVE}-${LAST_FACTORY_WAVE} are allowed. Got start=${startIndex}, count=${count}.`
      );
    }

    const out = [];
    for (let waveformIndex = startIndex; waveformIndex < startIndex + count; waveformIndex++) {
      const romIndex = waveformIndex + ROM_OFFSET;
      const slotStart = TABLE_START_BYTES + romIndex * SLOT_SIZE;
      const slotEnd = slotStart + SLOT_SIZE;
      if (romIndex < 0 || slotStart < 0 || slotEnd > mem.length) continue;

      const samples12 = new Int16Array(HEAD_SIZE);
      const samples16 = new Int16Array(HEAD_SIZE);
      const fine = new Uint8Array(HEAD_SIZE);
      const tailStart = slotStart + HEAD_SIZE;

      for (let i = 0; i < SLOT_SIZE - HEAD_SIZE; i++) {
        const tailByte = mem[tailStart + i];
        const s0 = 2 * i;
        const s1 = s0 + 1;
        if (s0 < HEAD_SIZE) fine[s0] = (tailByte >> 4) & 0xf;
        if (s1 < HEAD_SIZE) fine[s1] = tailByte & 0xf;
      }

      for (let i = 0; i < HEAD_SIZE; i++) {
        const rawByte = mem[slotStart + i];
        const headSigned = rawByte >= 128 ? rawByte - 256 : rawByte;
        const sample12 = headSigned * 16 + fine[i];
        samples12[i] = sample12;
        samples16[i] = sample12 * 16;
      }

      out.push({
        waveformIndex,
        romIndex,
        samples12,
        samples16,
        name: (waveformNames[waveformIndex - 32] || {}).pvs || "?",
      });
    }
    return out;
  }

  function decodeVswaveData(data, startIndex, count) {
    if (!Number.isInteger(startIndex) || !Number.isInteger(count) || count < 0) {
      throw new Error(`Invalid VS-WAVES range: startIndex=${startIndex}, count=${count}`);
    }
    if (startIndex < FIRST_FACTORY_WAVE || startIndex + count > LAST_FACTORY_WAVE + 1) {
      throw new Error(
        `Invalid waveform range: only VS indices ${FIRST_FACTORY_WAVE}-${LAST_FACTORY_WAVE} are allowed. Got start=${startIndex}, count=${count}.`
      );
    }
    if (data.length % BYTES_PER_WAVE !== 0) {
      throw new Error(
        `VS-WAVES.DAT size ${data.length} is not a multiple of ${BYTES_PER_WAVE} bytes (128 samples x 16-bit); format assumption may not hold for this file.`
      );
    }

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const nWaves = data.length / BYTES_PER_WAVE;
    const out = [];

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

      out.push({
        waveformIndex,
        romIndex: waveformIndex,
        samples12,
        samples16,
        name: (waveformNames[waveformIndex - 32] || {}).pvs || "?",
      });
    }
    return out;
  }

  function selectedSampleKind(bitDepth) {
    return bitDepth.value === "12" ? "samples12" : "samples16";
  }

  function wavSamplesFor(wave, which) {
    return which === "samples16" ? wave.samples16 : wave.samples12;
  }

  function buildWavBuffer(samples16) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = SAMPLE_RATE * blockAlign;
    const dataSize = samples16.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    function writeAscii(offset, value) {
      for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
    }

    writeAscii(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeAscii(8, "WAVE");
    writeAscii(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, SAMPLE_RATE, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeAscii(36, "data");
    view.setUint32(40, dataSize, true);
    for (let i = 0; i < samples16.length; i++) {
      view.setInt16(44 + i * bytesPerSample, samples16[i], true);
    }
    return buffer;
  }

  function buildCombinedWavBuffer(waves, which) {
    const total = waves.reduce((sum, wave) => sum + wave.samples16.length, 0);
    const samples = new Int16Array(total);
    let offset = 0;
    for (const wave of waves) {
      const chunk = wavSamplesFor(wave, which);
      samples.set(chunk, offset);
      offset += chunk.length;
    }
    return buildWavBuffer(samples);
  }

  function buildSeparateWavBuffers(waves, which) {
    return waves.map((wave) => ({
      waveformIndex: wave.waveformIndex,
      buffer: buildWavBuffer(wavSamplesFor(wave, which)),
    }));
  }

  function buildRawBuffer(values) {
    const buffer = new ArrayBuffer(values.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < values.length; i++) {
      view.setInt16(i * 2, values[i], true);
    }
    return new Uint8Array(buffer);
  }

  function zipFiles(entries) {
    if (!window.fflate || typeof window.fflate.zipSync !== "function") {
      throw new Error("Zip support failed to load.");
    }
    const zipEntries = {};
    for (const entry of entries) {
      zipEntries[entry.name] = entry.data;
    }
    return window.fflate.zipSync(zipEntries);
  }

  function buildHeaderFile(waves, which) {
    const lines = [];
    lines.push("// Auto-generated by prophet-vs-wavetable-converter. Do not edit by hand.");
    lines.push("// Generated by browser UI.");
    lines.push(
      which === "samples16"
        ? "// Values are scaled to 16-bit (sample12 * 16)."
        : "// Values are the true 12-bit range (-2048..2047)."
    );
    lines.push("");
    lines.push("#pragma once");
    lines.push("#include <cstdint>");
    lines.push("#include <cstddef>");
    lines.push("");
    lines.push("namespace ProphetVS {");
    lines.push("");

    for (const wave of waves) {
      const entry = waveformNames[wave.waveformIndex - 32];
      const pvsName = (entry || {}).pvs || "?";
      const evolverName = (entry || {}).evolver || "?";
      const label = pvsName === evolverName ? pvsName : `${pvsName} (${evolverName})`;
      const values = wave[which];
      lines.push(`// waveform index ${wave.waveformIndex} - ${label}, ROM table offset ${wave.romIndex}`);
      lines.push(`inline constexpr int16_t ${which === "samples16" ? "wave16" : "wave12"}_${wave.waveformIndex}[${values.length}] = {`);
      for (let i = 0; i < values.length; i += 16) {
        const row = Array.from(values.slice(i, i + 16));
        lines.push(`    ${row.join(", ")}${i + 16 < values.length ? "," : ""}`);
      }
      lines.push("};");
      lines.push("");
    }

    const tableName = which === "samples16" ? "kWaves16" : "kWaves12";
    const arrayPrefix = which === "samples16" ? "wave16" : "wave12";
    lines.push(`inline constexpr int ${tableName}Count = ${waves.length};`);
    lines.push(`inline constexpr int ${tableName}WaveformIndex[${waves.length}] = {`);
    for (let i = 0; i < waves.length; i += 16) {
      const row = waves.slice(i, i + 16).map((wave) => wave.waveformIndex);
      lines.push(`    ${row.join(", ")}${i + 16 < waves.length ? "," : ""}`);
    }
    lines.push("};");
    lines.push(`inline constexpr const int16_t* const ${tableName}[${waves.length}] = {`);
    for (let i = 0; i < waves.length; i++) {
      lines.push(`    ${arrayPrefix}_${waves[i].waveformIndex}${i + 1 < waves.length ? "," : ""}`);
    }
    lines.push("};");
    lines.push("");
    lines.push("}  // namespace ProphetVS");
    lines.push("");
    return lines.join("\n");
  }

  function buildChartFile(waves, which) {
    const [yMin, yMax] = which === "samples12" ? [-2048, 2047] : [-32768, 32767];
    const tiles = waves
      .map((wave) => {
        const values = wave[which];
        const padTop = 18;
        const titleHeight = 12;
        const padBottom = 6;
        const padSide = 4;
        const plotY = padTop + titleHeight + 2;
        const plotW = 190 - 2 * padSide;
        const plotH = 130 - plotY - padBottom;
        const points = [];
        for (let i = 0; i < values.length; i++) {
          const x = padSide + (i / (values.length - 1)) * plotW;
          const norm = (values[i] - yMin) / (yMax - yMin);
          const y = plotY + (1 - norm) * plotH;
          points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
        }
        const zeroY = (plotY + (1 - (0 - yMin) / (yMax - yMin)) * plotH).toFixed(1);
        return `<div class="tile"><svg width="190" height="130" viewBox="0 0 190 130" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="190" height="130" fill="#ffffff" stroke="#dddddd"/><text x="${padSide}" y="${padTop}" font-family="monospace" font-size="10" fill="#333333">${wave.waveformIndex} - ${wave.name}</text><line x1="${padSide}" y1="${zeroY}" x2="${190 - padSide}" y2="${zeroY}" stroke="#cccccc" stroke-width="1"/><polyline points="${points.join(" ")}" fill="none" stroke="#d97706" stroke-width="1.2"/></svg></div>`;
      })
      .join("\n");

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Prophet VS wavetable — ${waves.length} decoded waveform(s)</title>
<style>
  body { margin: 0; padding: 16px 20px; background: #f7f7f5; font-family: -apple-system, Helvetica, Arial, sans-serif; color: #222; }
  h1 { font-size: 16px; margin: 0 0 4px 0; }
  p.meta { font-size: 12px; color: #666; margin: 0 0 16px 0; }
  .grid { display: grid; grid-template-columns: repeat(10, 190px); gap: 6px; }
  .tile { line-height: 0; }
  .tile svg { display: block; }
</style>
</head>
<body>
<h1>Prophet VS wavetable — ${waves.length} decoded waveform(s)</h1>
<p class="meta">${waves.length} waveform(s) &middot; generated ${new Date().toISOString()} &middot; y-axis fixed to [${yMin}, ${yMax}] (${which === "samples12" ? "12-bit" : "16-bit"} range) on every tile so waveforms are directly comparable</p>
<div class="grid">
${tiles}
</div>
</body>
</html>`;
  }

  function saveBlob(filename, blob) {
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function renderResults(waves, results, bitDepthInput) {
    const which = selectedSampleKind(bitDepthInput);
    const rows = waves
      .map((wave) => {
        const selected = wave[which];
        const first = selected[0] ?? 0;
        const last = selected[selected.length - 1] ?? 0;
        const points = [];
        const width = 160;
        const height = 52;
        const pad = 6;
        const plotW = width - pad * 2;
        const plotH = height - pad * 2;
        const [yMin, yMax] = which === "samples12" ? [-2048, 2047] : [-32768, 32767];
        for (let i = 0; i < selected.length; i++) {
          const x = pad + (i / (selected.length - 1)) * plotW;
          const norm = (selected[i] - yMin) / (yMax - yMin);
          const y = pad + (1 - norm) * plotH;
          points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
        }
        return `
          <div class="wave-item">
            <div class="wave-header">
              <span>wave${wave.waveformIndex}</span>
              <span>${wave.name}</span>
            </div>
            <div class="wave-plot">
              <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="${width}" height="${height}" fill="#fff" stroke="#d0d7de"/>
                <polyline points="${points.join(" ")}" fill="none" stroke="#d97706" stroke-width="1.5"/>
              </svg>
            </div>
            <div class="wave-meta">rom ${wave.romIndex} &nbsp; first ${first} &nbsp; last ${last}</div>
          </div>
        `;
      })
      .join("");
    results.innerHTML = rows;
  }

  function setupUi() {
    const msbInput = document.getElementById("msb-file");
    const lsbInput = document.getElementById("lsb-file");
    const vswaveInput = document.getElementById("vswave-file");
    const startInput = document.getElementById("start-index");
    const countInput = document.getElementById("count");
    const bitDepthInput = document.getElementById("bit-depth");
    const decodeButton = document.getElementById("decode-button");
    const saveCombined = document.getElementById("save-combined-wav");
    const saveSeparate = document.getElementById("save-separate-wavs");
    const saveSeparateRaw = document.getElementById("save-separate-raw");
    const saveHeader = document.getElementById("save-header");
    const saveChart = document.getElementById("save-chart");
    const status = document.getElementById("status");
    const results = document.getElementById("results");

    if (
      !msbInput ||
      !lsbInput ||
      !vswaveInput ||
      !startInput ||
      !countInput ||
      !bitDepthInput ||
      !decodeButton ||
      !saveCombined ||
      !saveSeparate ||
      !saveSeparateRaw ||
      !saveHeader ||
      !saveChart ||
      !status ||
      !results
    ) {
      return;
    }

    function toggleSaveButtons(enabled) {
      saveCombined.disabled = !enabled;
      saveSeparate.disabled = !enabled;
      saveSeparateRaw.disabled = !enabled;
      saveHeader.disabled = !enabled;
      saveChart.disabled = !enabled;
    }

    function resetResults() {
      decodedWaves = [];
      renderResults([], results, bitDepthInput);
      toggleSaveButtons(false);
    }

    function clearAlternativeSelection(source) {
      if (source === "rom") {
        vswaveInput.value = "";
      } else {
        msbInput.value = "";
        lsbInput.value = "";
      }
      resetResults();
    }

    msbInput.addEventListener("change", () => {
      if (msbInput.files && msbInput.files.length) {
        clearAlternativeSelection("rom");
        status.textContent = "ROM pair selected. VS-WAVES.DAT cleared.";
      }
    });

    lsbInput.addEventListener("change", () => {
      if (lsbInput.files && lsbInput.files.length) {
        clearAlternativeSelection("rom");
        status.textContent = "ROM pair selected. VS-WAVES.DAT cleared.";
      }
    });

    vswaveInput.addEventListener("change", () => {
      if (vswaveInput.files && vswaveInput.files.length) {
        clearAlternativeSelection("vswave");
        status.textContent = "VS-WAVES.DAT selected. ROM files cleared.";
      }
    });

    bitDepthInput.addEventListener("change", () => {
      renderResults(decodedWaves, results, bitDepthInput);
    });

    decodeButton.addEventListener("click", async () => {
      const msbFile = msbInput.files && msbInput.files[0];
      const lsbFile = lsbInput.files && lsbInput.files[0];
      const vswaveFile = vswaveInput.files && vswaveInput.files[0];
      const startIndex = Number(startInput.value);
      const count = Number(countInput.value);
      const hasRomPair = Boolean(msbFile && lsbFile);
      const hasVswave = Boolean(vswaveFile);

      if (!hasRomPair && !hasVswave) {
        status.textContent = "Select either the two ROM files or a VS-WAVES.DAT file.";
        resetResults();
        return;
      }
      if (hasRomPair && hasVswave) {
        status.textContent = "Use either MSB+LSB ROM files OR a VS-WAVES.DAT file, not both.";
        resetResults();
        return;
      }
      if (!Number.isInteger(startIndex) || !Number.isInteger(count) || count <= 0) {
        status.textContent = "Start and count must be integers, and count must be > 0.";
        resetResults();
        return;
      }

      try {
        decodedWaves = hasRomPair
          ? decodeWaveRange(
              interleaveRom(
                new Uint8Array(await msbFile.arrayBuffer()),
                new Uint8Array(await lsbFile.arrayBuffer())
              ),
              startIndex,
              count
            )
          : decodeVswaveData(new Uint8Array(await vswaveFile.arrayBuffer()), startIndex, count);

        if (decodedWaves.length === 0) {
          status.textContent = "No valid factory waveforms were decoded for that range.";
          resetResults();
          return;
        }

        status.textContent = `Decoded ${decodedWaves.length} waveform(s) from index ${startIndex}.`;
        renderResults(decodedWaves, results, bitDepthInput);
        toggleSaveButtons(true);
      } catch (err) {
        status.textContent = `Decode failed: ${err instanceof Error ? err.message : String(err)}`;
        resetResults();
      }
    });

    saveCombined.addEventListener("click", () => {
      if (decodedWaves.length === 0) return;
      saveBlob(
        "prophet_vs_waveforms_combined.wav",
        new Blob([buildCombinedWavBuffer(decodedWaves, selectedSampleKind(bitDepthInput))], { type: "audio/wav" })
      );
    });

    saveSeparate.addEventListener("click", () => {
      if (decodedWaves.length === 0) return;
      const zip = zipFiles(
        buildSeparateWavBuffers(decodedWaves, selectedSampleKind(bitDepthInput)).map((entry) => ({
          name: `wave_${String(entry.waveformIndex).padStart(3, "0")}.wav`,
          data: new Uint8Array(entry.buffer),
        }))
      );
      saveBlob("prophet_vs_waveforms_wav.zip", new Blob([zip], { type: "application/zip" }));
    });

    saveSeparateRaw.addEventListener("click", () => {
      if (decodedWaves.length === 0) return;
      const which = selectedSampleKind(bitDepthInput);
      const zip = zipFiles(
        decodedWaves.map((wave) => ({
          name: `wave_${String(wave.waveformIndex).padStart(3, "0")}.${which === "samples12" ? "i12" : "i16"}`,
          data: buildRawBuffer(wave[which]),
        }))
      );
      saveBlob("prophet_vs_waveforms_raw.zip", new Blob([zip], { type: "application/zip" }));
    });

    saveHeader.addEventListener("click", () => {
      if (decodedWaves.length === 0) return;
      saveBlob(
        "prophet_vs_waveforms.h",
        new Blob([buildHeaderFile(decodedWaves, selectedSampleKind(bitDepthInput))], {
          type: "text/plain;charset=utf-8",
        })
      );
    });

    saveChart.addEventListener("click", () => {
      if (decodedWaves.length === 0) return;
      saveBlob(
        "prophet_vs_waveforms_chart.html",
        new Blob([buildChartFile(decodedWaves, selectedSampleKind(bitDepthInput))], {
          type: "text/html;charset=utf-8",
        })
      );
    });

    toggleSaveButtons(false);
  }

  document.addEventListener("DOMContentLoaded", setupUi);
})();
