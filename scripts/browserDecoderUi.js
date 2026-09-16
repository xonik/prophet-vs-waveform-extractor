import { buildChartFile, buildCombinedWavBytes, buildHeaderFile, buildRawBytes, buildSeparateWavBytes } from "../src/exportShared";
import { decodeWaveRangeFromRomPair } from "../src/decodeROM";
import { decodeVswaveData } from "../src/decodeVswave";
import { waveformNames } from "../src/waveformNames";

const { zipSync } = require("fflate");
const SAMPLE_RATE = 32000;

let decodedWaves = [];

function selectedSampleKind(bitDepth) {
  return bitDepth.value === "12" ? "samples12" : "samples16";
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

function zipFiles(entries) {
  return zipSync(
    Object.fromEntries(entries.map((entry) => [entry.name, entry.data]))
  );
}

function renderResults(waves, results, bitDepthInput) {
  const which = selectedSampleKind(bitDepthInput);
  const [yMin, yMax] = which === "samples12" ? [-2048, 2047] : [-32768, 32767];
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
            <span>${waveformNames[wave.waveformIndex - 32]?.pvs ?? "?"}</span>
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
    !msbInput || !lsbInput || !vswaveInput || !startInput || !countInput ||
    !bitDepthInput || !decodeButton || !saveCombined || !saveSeparate ||
    !saveSeparateRaw || !saveHeader || !saveChart || !status || !results
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
    results.innerHTML = "";
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
      let statusMessage;
      if (hasRomPair) {
        const { waves, swappedRomOrder } = decodeWaveRangeFromRomPair(
          new Uint8Array(await msbFile.arrayBuffer()),
          new Uint8Array(await lsbFile.arrayBuffer()),
          startIndex,
          count
        );
        decodedWaves = waves;
        statusMessage = swappedRomOrder
          ? `Decoded ${decodedWaves.length} waveform(s) from index ${startIndex}. ROM order sanity check failed, so MSB and LSB were swapped automatically.`
          : `Decoded ${decodedWaves.length} waveform(s) from index ${startIndex}.`;
      } else {
        decodedWaves = decodeVswaveData(new Uint8Array(await vswaveFile.arrayBuffer()), startIndex, count);
        statusMessage = `Decoded ${decodedWaves.length} waveform(s) from index ${startIndex}.`;
      }

      if (decodedWaves.length === 0) {
        status.textContent = "No valid factory waveforms were decoded for that range.";
        resetResults();
        return;
      }

      status.textContent = statusMessage;
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
      new Blob([buildCombinedWavBytes(decodedWaves, selectedSampleKind(bitDepthInput), SAMPLE_RATE)], {
        type: "audio/wav",
      })
    );
  });

  saveSeparate.addEventListener("click", () => {
    if (decodedWaves.length === 0) return;
    const zip = zipFiles(
      buildSeparateWavBytes(decodedWaves, selectedSampleKind(bitDepthInput), SAMPLE_RATE).map((entry) => ({
        name: `wave_${String(entry.waveformIndex).padStart(3, "0")}.wav`,
        data: entry.bytes,
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
        data: buildRawBytes(wave[which]),
      }))
    );
    saveBlob("prophet_vs_waveforms_raw.zip", new Blob([zip], { type: "application/zip" }));
  });

  saveHeader.addEventListener("click", () => {
    if (decodedWaves.length === 0) return;
    saveBlob(
      "prophet_vs_waveforms.h",
      new Blob([buildHeaderFile(decodedWaves, selectedSampleKind(bitDepthInput), "Generated by browser UI.")], {
        type: "text/plain;charset=utf-8",
      })
    );
  });

  saveChart.addEventListener("click", () => {
    if (decodedWaves.length === 0) return;
    saveBlob(
      "prophet_vs_waveforms_chart.html",
      new Blob(
        [
          buildChartFile(decodedWaves, {
            which: selectedSampleKind(bitDepthInput),
            title: `Prophet VS wavetable — ${decodedWaves.length} decoded waveform(s)`,
          }),
        ],
        { type: "text/html;charset=utf-8" }
      )
    );
  });

  toggleSaveButtons(false);
}

document.addEventListener("DOMContentLoaded", setupUi);
