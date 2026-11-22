// High-DPI Engineering Canvas Plots (Live 1 kHz Scope, Post-Run Sync Alignment, Burn FFT)
import { ABORT_LIMITS } from './config.js';

function prepCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(300, Math.round(rect.width));
  const h = Math.max(120, Math.round(rect.height));
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

const SCOPE_PAD = { l: 44, r: 46, t: 18, b: 22 };

export function getScopeFractionFromClientX(canvas, clientX) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const pw = Math.max(1, rect.width - SCOPE_PAD.l - SCOPE_PAD.r);
  return Math.max(0, Math.min(1, (x - SCOPE_PAD.l) / pw));
}

export function drawLiveScope(canvas, options) {
  if (!canvas) return;
  const { samples, settings, tMax, scrubIdx = null, t0Offset = null, mode = 'idle' } = options;
  const { ctx, w, h } = prepCanvas(canvas);
  const pad = SCOPE_PAD;
  const pw = w - pad.l - pad.r;
  const ph = h - pad.t - pad.b;

  // Clean light background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  // Grid lines (Left axis: 0..40 bar, Right axis: 0..400 W — zero clipping on Pox/Pf or 360 W GP inrush)
  ctx.strokeStyle = '#E8EDF3';
  ctx.lineWidth = 1;
  ctx.font = '10px Consolas, "Courier New", monospace';
  ctx.fillStyle = '#6B7785';

  const maxBar = 40;
  const maxW = 400;
  const yTicks = [0, 8, 16, 24, 32, 40];
  yTicks.forEach((bar) => {
    const y = pad.t + ph - (bar / maxBar) * ph;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + pw, y);
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.fillText(`${bar}`, pad.l - 6, y + 3);

    const watts = Math.round((bar / maxBar) * maxW);
    ctx.textAlign = 'left';
    ctx.fillText(`${watts}`, pad.l + pw + 6, y + 3);
  });

  // Axis unit headers
  ctx.fillStyle = '#1F4E79';
  ctx.font = 'bold 9.5px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('bar', 6, 12);
  ctx.fillStyle = '#B36B00';
  ctx.textAlign = 'right';
  ctx.fillText('GP W', w - 6, 12);

  // GP power window band (subtle amber tint on right axis)
  if (settings) {
    const yTop = pad.t + ph - (settings.pMax / maxW) * ph;
    const yBot = pad.t + ph - (settings.pMin / maxW) * ph;
    ctx.fillStyle = 'rgba(255, 244, 194, 0.42)';
    ctx.fillRect(pad.l, yTop, pw, yBot - yTop);
  }

  // Reference lines: P_ign (3.5 bar) & P_c,max (18 bar)
  const drawRef = (bar, label, color) => {
    const y = pad.t + ph - (bar / maxBar) * ph;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + pw, y);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = '9.5px Consolas, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(label, pad.l + pw - 4, y - 3);
    ctx.restore();
  };
  drawRef(ABORT_LIMITS.pIgnBar, 'P_ign 3.5 bar', '#1E7B34');
  drawRef(ABORT_LIMITS.pCMaxBar, 'P_c,max 18 bar', '#B3261E');

  // Border box
  ctx.strokeStyle = '#CFD8E3';
  ctx.lineWidth = 1;
  ctx.strokeRect(pad.l, pad.t, pw, ph);

  if (mode === 'idle' || !samples || samples.length < 2) {
    ctx.fillStyle = '#7A8797';
    ctx.font = '11.5px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Click a 1-Click Demo above — curves freeze after run so you can scrub back & forth', pad.l + pw / 2, pad.t + ph / 2);
    return;
  }

  const span = Math.max(1.0, tMax || samples[samples.length - 1].t);
  const xOf = (t) => pad.l + (Math.max(0, Math.min(span, t)) / span) * pw;
  const yBar = (v) => pad.t + ph - (Math.max(0, Math.min(maxBar, v)) / maxBar) * ph;
  const yW = (v) => pad.t + ph - (Math.max(0, Math.min(maxW, v)) / maxW) * ph;

  // X ticks
  ctx.fillStyle = '#6B7785';
  ctx.font = '10px Consolas, monospace';
  ctx.textAlign = 'center';
  const stepSec = span > 10 ? 2 : 1;
  for (let ts = 0; ts <= Math.floor(span); ts += stepSec) {
    ctx.fillText(`${ts}s`, xOf(ts), h - 6);
  }

  // Optional T0 vertical marker
  if (t0Offset !== null && t0Offset <= span) {
    const xT0 = xOf(t0Offset);
    ctx.save();
    ctx.strokeStyle = 'rgba(31, 78, 121, 0.55)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(xT0, pad.t);
    ctx.lineTo(xT0, pad.t + ph);
    ctx.stroke();
    ctx.fillStyle = '#1F4E79';
    ctx.font = 'bold 9px Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('T0', xT0 + 3, pad.t + 10);
    ctx.restore();
  }

  // Plot stride for crisp 60 fps drawing of 1 kHz arrays
  const stride = Math.max(1, Math.floor(samples.length / 900));
  const plotSeries = (getter, yFn, color, lw = 1.8) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    for (let i = 0; i < samples.length; i += stride) {
      const p = samples[i];
      const x = xOf(p.t);
      const y = yFn(getter(p));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    const last = samples[samples.length - 1];
    ctx.lineTo(xOf(last.t), yFn(getter(last)));
    ctx.stroke();
  };

  plotSeries((p) => p.gpPAvg, yW, '#B36B00', 1.6);
  plotSeries((p) => p.pt202, yBar, '#1F4E79', 1.7);
  plotSeries((p) => p.pt102, yBar, '#0D8A7B', 1.7);
  plotSeries((p) => p.pt301, yBar, '#C0181F', 2.1);

  // Interactive scrub cursor in Review mode
  if (mode === 'review' && scrubIdx !== null && samples[scrubIdx]) {
    const sp = samples[scrubIdx];
    const cx = xOf(sp.t);
    ctx.save();
    ctx.strokeStyle = '#1A2330';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx, pad.t);
    ctx.lineTo(cx, pad.t + ph);
    ctx.stroke();

    const dot = (y, col) => {
      ctx.beginPath();
      ctx.arc(cx, y, 3.3, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    };
    dot(yW(sp.gpPAvg), '#B36B00');
    dot(yBar(sp.pt202), '#1F4E79');
    dot(yBar(sp.pt102), '#0D8A7B');
    dot(yBar(sp.pt301), '#C0181F');
    ctx.restore();
  }
}

export function drawSyncReportPlot(canvas, bundle, aligned = true) {
  if (!canvas || !bundle || bundle.samples.length < 10) return;
  const { ctx, w, h } = prepCanvas(canvas);
  const pad = { l: 46, r: 16, t: 18, b: 24 };
  const pw = w - pad.l - pad.r;
  const ph = h - pad.t - pad.b;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  const s = bundle.samples;
  const tMax = Math.max(0.5, s[s.length - 1].t);

  // Auto-scale Y ceiling cleanly above peak Pox/Pf/Pc so nothing clips
  let peakP = 20;
  for (let i = 0; i < s.length; i += 4) {
    peakP = Math.max(peakP, s[i].pt301, s[i].pt202, s[i].pt102);
  }
  const yMax = Math.max(25, Math.ceil((peakP + 2.5) / 5) * 5);

  // Grid
  ctx.strokeStyle = '#E8EDF3';
  ctx.lineWidth = 1;
  ctx.font = '10px Consolas, monospace';
  ctx.fillStyle = '#6B7785';
  const yStep = yMax > 30 ? 5 : 5;
  for (let b = 0; b <= yMax; b += yStep) {
    const y = pad.t + ph - (b / yMax) * ph;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + pw, y);
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.fillText(`${b}`, pad.l - 7, y + 3);
  }
  ctx.fillStyle = '#1F4E79';
  ctx.font = 'bold 9.5px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('bar', 6, 12);

  const xOf = (t) => pad.l + (t / tMax) * pw;
  const yOf = (v) => pad.t + ph - (Math.max(0, Math.min(yMax, v)) / yMax) * ph;

  // Draw 1 Hz EL2252 sync pulses along bottom
  ctx.fillStyle = 'rgba(30, 123, 52, 0.16)';
  for (let i = 0; i < s.length; i += 5) {
    if (s[i].sync === 1) {
      const x = xOf(s[i].t);
      ctx.fillRect(x, pad.t + ph - 16, 2, 16);
    }
  }

  // Mark T0 vertical line if GOX opened
  if (bundle.t0OffsetSec !== null) {
    const xT0 = xOf(bundle.t0OffsetSec);
    ctx.save();
    ctx.strokeStyle = '#1F4E79';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(xT0, pad.t);
    ctx.lineTo(xT0, pad.t + ph);
    ctx.stroke();
    ctx.fillStyle = '#1F4E79';
    ctx.font = 'bold 9.5px Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('T0 (GOX)', xT0 + 4, pad.t + 12);
    ctx.restore();
  }

  // Plot PLC Pc (1 kHz)
  const drawTrace = (getter, color, lw, offsetSec = 0, dash = []) => {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.setLineDash(dash);
    let first = true;
    for (let i = 0; i < s.length; i += 4) {
      const t = s[i].t + offsetSec;
      if (t < 0 || t > tMax) continue;
      const x = xOf(t);
      const y = yOf(getter(s[i]));
      if (first) {
        ctx.moveTo(x, y);
        first = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.restore();
  };

  drawTrace((p) => p.pt202, 'rgba(31,78,121,0.45)', 1.3);
  drawTrace((p) => p.pt102, 'rgba(13,138,123,0.45)', 1.3);
  drawTrace((p) => p.pt301, '#C0181F', 2.0);

  // NI cDAQ Pc copy — shows visible unaligned offset + drift if aligned === false!
  const niLag = aligned ? 0.0 : 0.085; // exaggerated slightly when unaligned for clear visual demo of drift+filter lag
  drawTrace((p) => p.pt301True, '#1E7B34', 1.6, niLag, aligned ? [5, 3] : []);

  // X ticks
  ctx.fillStyle = '#6B7785';
  ctx.font = '10px Consolas, monospace';
  ctx.textAlign = 'center';
  const step = tMax > 6 ? 2 : 1;
  for (let ts = 0; ts <= Math.floor(tMax); ts += step) {
    ctx.fillText(`${ts} s`, xOf(ts), h - 6);
  }

  ctx.strokeStyle = '#CFD8E3';
  ctx.strokeRect(pad.l, pad.t, pw, ph);
}

export function drawFftPlot(canvas, fftData) {
  if (!canvas) return;
  const { ctx, w, h } = prepCanvas(canvas);
  const pad = { l: 48, r: 16, t: 18, b: 24 };
  const pw = w - pad.l - pad.r;
  const ph = h - pad.t - pad.b;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  if (!fftData || fftData.freqs.length === 0) {
    ctx.fillStyle = '#8C99A8';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Run a hot fire to compute burn-phase Pc FFT spectrum', w / 2, h / 2);
    return;
  }

  const maxFreq = 500;
  let peakMag = 0;
  for (let i = 0; i < fftData.freqs.length; i++) {
    if (fftData.freqs[i] >= 30 && fftData.freqs[i] <= maxFreq && fftData.mags[i] > peakMag) {
      peakMag = fftData.mags[i];
    }
  }

  // Pick a clean rounded Y-axis ceiling so the peak fills ~75-85% of the chart
  const rawCeil = Math.max(0.01, peakMag * 1.25);
  const magStep = rawCeil <= 0.04 ? 0.01 : rawCeil <= 0.12 ? 0.02 : rawCeil <= 0.25 ? 0.05 : 0.1;
  const maxMag = Math.ceil(rawCeil / magStep) * magStep;

  // Horizontal grid + Y-axis amplitude scale (bar)
  ctx.strokeStyle = '#E8EDF3';
  ctx.lineWidth = 1;
  ctx.font = '10px Consolas, monospace';
  ctx.fillStyle = '#6B7785';
  const ySteps = 4;
  for (let s = 0; s <= ySteps; s++) {
    const val = (maxMag * s) / ySteps;
    const y = pad.t + ph - (s / ySteps) * ph;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + pw, y);
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.fillText(val.toFixed(maxMag < 0.1 ? 3 : 2), pad.l - 6, y + 3);
  }
  ctx.fillStyle = '#1F4E79';
  ctx.font = 'bold 9.5px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('bar', 6, 12);

  // Vertical frequency grid + X-axis labels
  ctx.font = '10px Consolas, monospace';
  ctx.fillStyle = '#6B7785';
  for (let f = 0; f <= maxFreq; f += 100) {
    const x = pad.l + (f / maxFreq) * pw;
    ctx.beginPath();
    ctx.moveTo(x, pad.t);
    ctx.lineTo(x, pad.t + ph);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillText(`${f} Hz`, x, h - 6);
  }

  // Spectrum fill & trace (30..500 Hz acoustic band)
  ctx.save();
  ctx.beginPath();
  ctx.rect(pad.l, pad.t, pw, ph);
  ctx.clip();

  ctx.beginPath();
  ctx.strokeStyle = '#1F4E79';
  ctx.fillStyle = 'rgba(31, 78, 121, 0.16)';
  ctx.lineWidth = 1.7;
  let startedFill = false;
  let lastX = pad.l;
  for (let i = 0; i < fftData.freqs.length; i++) {
    const f = fftData.freqs[i];
    if (f < 30) continue;
    if (f > maxFreq) break;
    const x = pad.l + (f / maxFreq) * pw;
    const y = pad.t + ph - (Math.min(maxMag, fftData.mags[i]) / maxMag) * ph;
    if (!startedFill) {
      ctx.moveTo(x, pad.t + ph);
      ctx.lineTo(x, y);
      startedFill = true;
    } else {
      ctx.lineTo(x, y);
    }
    lastX = x;
  }
  if (startedFill) {
    ctx.lineTo(lastX, pad.t + ph);
    ctx.closePath();
    ctx.fill();
  }

  ctx.beginPath();
  let startedLine = false;
  for (let i = 0; i < fftData.freqs.length; i++) {
    const f = fftData.freqs[i];
    if (f < 30) continue;
    if (f > maxFreq) break;
    const x = pad.l + (f / maxFreq) * pw;
    const y = pad.t + ph - (Math.min(maxMag, fftData.mags[i]) / maxMag) * ph;
    if (!startedLine) {
      ctx.moveTo(x, y);
      startedLine = true;
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  ctx.restore();

  if (fftData.peakHz >= 30 && peakMag > 0.003) {
    const px = pad.l + (fftData.peakHz / maxFreq) * pw;
    ctx.fillStyle = '#C0181F';
    ctx.font = 'bold 10px Consolas, monospace';
    ctx.textAlign = px > w - 120 ? 'right' : 'left';
    ctx.fillText(
      `Peak: ${fftData.peakHz.toFixed(0)} Hz (${peakMag.toFixed(2)} bar)`,
      px + (px > w - 120 ? -6 : 6),
      pad.t + 14
    );
  }

  ctx.strokeStyle = '#CFD8E3';
  ctx.strokeRect(pad.l, pad.t, pw, ph);
}
