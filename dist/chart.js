"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CHART_OPTIONS = void 0;
exports.buildWaveformChartHtml = buildWaveformChartHtml;
const waveformNames_1 = require("./waveformNames");
exports.DEFAULT_CHART_OPTIONS = {
    columns: 10,
    tileWidth: 190,
    tileHeight: 130,
    which: "samples16",
    title: "Prophet VS wavetable — decoded waveforms",
};
function escapeXml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
/** Build one small self-contained SVG plotting a single waveform's samples. */
function svgForWave(samples, width, height, waveformIndex, romIndex, yMin, yMax) {
    const padTop = 18;
    const titleHeight = 12;
    const padBottom = 6;
    const padSide = 4;
    const plotY = padTop + titleHeight + 2;
    const plotW = width - 2 * padSide;
    const plotH = height - plotY - padBottom;
    const name = waveformNames_1.waveformNames[waveformIndex - 32]?.pvs ?? "?";
    const n = samples.length;
    const points = [];
    for (let i = 0; i < n; i++) {
        const x = padSide + (n <= 1 ? 0 : (i / (n - 1)) * plotW);
        const norm = (samples[i] - yMin) / (yMax - yMin); // 0..1
        const y = plotY + (1 - norm) * plotH;
        points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    const zeroY = (plotY + (1 - (0 - yMin) / (yMax - yMin)) * plotH).toFixed(1);
    return [
        `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`,
        `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" stroke="#dddddd"/>`,
        `<text x="${padSide}" y="${padTop}" font-family="monospace" font-size="10" fill="#333333">${waveformIndex} - ${name}</text>`,
        `<line x1="${padSide}" y1="${zeroY}" x2="${width - padSide}" y2="${zeroY}" stroke="#cccccc" stroke-width="1"/>`,
        `<polyline points="${points.join(" ")}" fill="none" stroke="#d97706" stroke-width="1.2"/>`,
        `</svg>`,
    ].join("");
}
/** Build a full standalone HTML page containing a grid of per-waveform SVG charts. */
function buildWaveformChartHtml(waves, opts = exports.DEFAULT_CHART_OPTIONS) {
    const [yMin, yMax] = opts.which === "samples12" ? [-2048, 2047] : [-32768, 32767];
    const tiles = waves
        .map((w) => {
        const values = w[opts.which];
        const svg = svgForWave(values, opts.tileWidth, opts.tileHeight, w.waveformIndex, w.romIndex, yMin, yMax);
        return `<div class="tile">${svg}</div>`;
    })
        .join("\n");
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeXml(opts.title)}</title>
<style>
  body { margin: 0; padding: 16px 20px; background: #f7f7f5; font-family: -apple-system, Helvetica, Arial, sans-serif; color: #222; }
  h1 { font-size: 16px; margin: 0 0 4px 0; }
  p.meta { font-size: 12px; color: #666; margin: 0 0 16px 0; }
  .grid { display: grid; grid-template-columns: repeat(${opts.columns}, ${opts.tileWidth}px); gap: 6px; }
  .tile { line-height: 0; }
  .tile svg { display: block; }
</style>
</head>
<body>
<h1>${escapeXml(opts.title)}</h1>
<p class="meta">${waves.length} waveform(s) &middot; generated ${new Date().toISOString()} &middot; y-axis fixed to [${yMin}, ${yMax}] (${opts.which === "samples12" ? "12-bit" : "16-bit"} range) on every tile so waveforms are directly comparable</p>
<div class="grid">
${tiles}
</div>
</body>
</html>
`;
}
