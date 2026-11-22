// High-DPI Interactive Logic Timing Diagram (WaveDrom-inspired, mirrors Report Section 12b)
import { ABORT_LIMITS } from './config.js';

const PAD = { l: 184, r: 18, t: 14, b: 22 };

const STATE_STYLES = {
  SAFE:      { fill: '#E2F2E2', stroke: '#1E7B34', text: '#1E7B34' },
  READY:     { fill: '#FFF4C2', stroke: '#B36B00', text: '#8A5200' },
  COUNTDOWN: { fill: '#FDE8D0', stroke: '#B36B00', text: '#8A4519' },
  GP_HEAT:   { fill: '#DCE9F7', stroke: '#1F4E79', text: '#1F4E79' },
  OX_OPEN:   { fill: '#D5F0EE', stroke: '#0D8A7B', text: '#0B695E' },
  IGN_WAIT:  { fill: '#E2F2E2', stroke: '#1E7B34', text: '#1E7B34' },
  BURN:      { fill: '#FBE3D6', stroke: '#C2410C', text: '#9A3412' },
  SHUTDOWN:  { fill: '#ECEFF4', stroke: '#5A6778', text: '#334155' },
  ABORT:     { fill: '#FDECEC', stroke: '#B3261E', text: '#B3261E' },
};

const GROUPS = [
  { name: 'Hardware', rows: [0, 1] },
  { name: 'PLC',      rows: [2, 3] },
  { name: 'Outputs',  rows: [4, 5, 6] },
  { name: 'Checks',   rows: [7, 8, 9] },
];

const ROWS = [
  { label: 'Key ARMED / bus live', type: 'bit', color: '#1F4E79', get: (s) => (s.hw?.valveBusLive ? 1 : 0) },
  { label: 'E-stop pressed',       type: 'bit', color: '#B3261E', get: (s) => (s.estopPressed ? 1 : 0) },
  { label: 'Sequence state',       type: 'state' },
  { label: 'RECORD (logging)',     type: 'bit', color: '#1E7B34', get: () => 1 },
  { label: 'Glow plug (SSR)',      type: 'bit', color: '#B36B00', get: (s) => (s.gpCmd ? 1 : 0) },
  { label: 'GOX valve SV-201',     type: 'bit', color: '#1F4E79', get: (s) => (s.sv201Cmd ? 1 : 0) },
  { label: 'CH4 valve SV-101',     type: 'bit', color: '#0D8A7B', get: (s) => (s.sv101Cmd ? 1 : 0) },
  { label: 'GP power / continuity OK', type: 'bit', color: '#1E7B34', get: (s) => (s.gpOk ? 1 : 0) },
  { label: 'Pc > P_ign (3.5 bar)', type: 'bit', color: '#C2410C', get: (s) => (s.pt301 > ABORT_LIMITS.pIgnBar ? 1 : 0) },
  { label: 'ABORT (latched)',      type: 'bit', color: '#B3261E', get: (s) => (s.abort ? 1 : 0) },
];

function prepCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(400, Math.round(rect.width));
  const h = Math.max(240, Math.round(rect.height));
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

export function getTimingFractionFromClientX(canvas, clientX) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const pw = Math.max(1, rect.width - PAD.l - PAD.r);
  return Math.max(0, Math.min(1, (x - PAD.l) / pw));
}

export function drawLogicTiming(canvas, options) {
  if (!canvas) return;
  const { samples, tMax, scrubIdx = null, t0Offset = null, mode = 'idle' } = options;
  const { ctx, w, h } = prepCanvas(canvas);
  const pw = w - PAD.l - PAD.r;
  const ph = h - PAD.t - PAD.b;
  const rowH = ph / ROWS.length;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  // Subtle horizontal lane dividers & group brackets
  ROWS.forEach((row, r) => {
    const yTop = PAD.t + r * rowH;
    const yMid = yTop + rowH * 0.5;
    if (r > 0) {
      ctx.strokeStyle = '#EEF2F6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD.l, yTop);
      ctx.lineTo(PAD.l + pw, yTop);
      ctx.stroke();
    }
    ctx.fillStyle = '#1F4E79';
    ctx.font = '10.5px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(row.label, PAD.l - 8, yMid + 3.5);
  });

  // Left-side WaveDrom-style group brackets
  ctx.strokeStyle = '#6B93C0';
  ctx.fillStyle = '#1F4E79';
  ctx.lineWidth = 1.2;
  ctx.font = 'bold 9.5px "Segoe UI", system-ui, sans-serif';
  GROUPS.forEach((g) => {
    const y0 = PAD.t + g.rows[0] * rowH + 4;
    const y1 = PAD.t + (g.rows[g.rows.length - 1] + 1) * rowH - 4;
    const bx = 24;
    ctx.beginPath();
    ctx.moveTo(bx + 5, y0);
    ctx.lineTo(bx, y0 + 3);
    ctx.lineTo(bx, y1 - 3);
    ctx.lineTo(bx + 5, y1);
    ctx.stroke();

    ctx.save();
    ctx.translate(14, (y0 + y1) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(g.name, 0, 3);
    ctx.restore();
  });

  // Plot frame border
  ctx.strokeStyle = '#D2DAE4';
  ctx.lineWidth = 1;
  ctx.strokeRect(PAD.l, PAD.t, pw, ph);

  if (mode === 'idle' || !samples || samples.length < 2) {
    ctx.fillStyle = '#7A8797';
    ctx.font = '11.5px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Run any 1-Click Demo to populate the 1 kHz digital logic timing traces', PAD.l + pw / 2, PAD.t + ph / 2);
    return;
  }

  const span = Math.max(1.0, tMax || samples[samples.length - 1].t);
  const xOf = (t) => PAD.l + (Math.max(0, Math.min(span, t)) / span) * pw;

  // Vertical time gridlines + X ticks
  ctx.font = '10px Consolas, monospace';
  ctx.textAlign = 'center';
  const stepSec = span > 10 ? 2 : 1;
  for (let ts = 0; ts <= Math.floor(span); ts += stepSec) {
    const x = xOf(ts);
    ctx.save();
    ctx.strokeStyle = '#E8EDF3';
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(x, PAD.t);
    ctx.lineTo(x, PAD.t + ph);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#6B7785';
    ctx.fillText(`${ts}s`, x, h - 6);
  }

  // T0 marker across all lanes
  if (t0Offset !== null && t0Offset <= span) {
    const xT0 = xOf(t0Offset);
    ctx.save();
    ctx.strokeStyle = 'rgba(31, 78, 121, 0.5)';
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xT0, PAD.t);
    ctx.lineTo(xT0, PAD.t + ph);
    ctx.stroke();
    ctx.fillStyle = '#1F4E79';
    ctx.font = 'bold 9px Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('T0', xT0 + 3, PAD.t + 10);
    ctx.restore();
  }

  // Build state segments for row 2 ("Sequence state")
  const stateSegs = [];
  let segStart = 0;
  for (let i = 1; i <= samples.length; i++) {
    if (i === samples.length || samples[i].state !== samples[segStart].state) {
      stateSegs.push({
        state: samples[segStart].state,
        t0: samples[segStart].t,
        t1: samples[i - 1].t,
      });
      segStart = i;
    }
  }

  const stride = Math.max(1, Math.floor(samples.length / 900));

  ROWS.forEach((row, r) => {
    const yTop = PAD.t + r * rowH;
    const yHi = yTop + rowH * 0.22;
    const yLo = yTop + rowH * 0.78;

    if (row.type === 'state') {
      // Draw beveled WaveDrom-style state blocks
      stateSegs.forEach((seg) => {
        const x0 = xOf(seg.t0);
        const x1 = xOf(seg.t1);
        const sw = x1 - x0;
        if (sw < 1) return;
        const st = STATE_STYLES[seg.state] || STATE_STYLES.SHUTDOWN;
        const bev = Math.min(4, sw * 0.2);

        ctx.beginPath();
        ctx.moveTo(x0, (yHi + yLo) / 2);
        ctx.lineTo(x0 + bev, yHi);
        ctx.lineTo(x1 - bev, yHi);
        ctx.lineTo(x1, (yHi + yLo) / 2);
        ctx.lineTo(x1 - bev, yLo);
        ctx.lineTo(x0 + bev, yLo);
        ctx.closePath();
        ctx.fillStyle = st.fill;
        ctx.fill();
        ctx.strokeStyle = st.stroke;
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // Draw state name if wide enough
        if (sw >= 34) {
          ctx.save();
          ctx.fillStyle = st.text;
          ctx.font = 'bold 9px Consolas, monospace';
          ctx.textAlign = 'center';
          const lbl = sw < 56 ? seg.state.slice(0, 5) : seg.state;
          ctx.fillText(lbl, (x0 + x1) / 2, (yHi + yLo) / 2 + 3.2);
          ctx.restore();
        }
      });
      return;
    }

    // Digital 0/1 square wave with subtle high-state fill
    ctx.beginPath();
    let prevVal = row.get(samples[0]);
    let prevX = xOf(samples[0].t);
    ctx.moveTo(prevX, prevVal ? yHi : yLo);

    for (let i = stride; i < samples.length; i += stride) {
      const val = row.get(samples[i]);
      const x = xOf(samples[i].t);
      if (val !== prevVal) {
        ctx.lineTo(x, prevVal ? yHi : yLo);
        ctx.lineTo(x, val ? yHi : yLo);
        prevVal = val;
      }
      prevX = x;
    }
    const lastS = samples[samples.length - 1];
    const lastVal = row.get(lastS);
    const lastX = xOf(lastS.t);
    if (lastVal !== prevVal) {
      ctx.lineTo(lastX, prevVal ? yHi : yLo);
    }
    ctx.lineTo(lastX, lastVal ? yHi : yLo);

    ctx.strokeStyle = row.color;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  });

  // Synchronized scrub cursor line
  if (mode === 'review' && scrubIdx !== null && samples[scrubIdx]) {
    const cx = xOf(samples[scrubIdx].t);
    ctx.save();
    ctx.strokeStyle = '#1A2330';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx, PAD.t);
    ctx.lineTo(cx, PAD.t + ph);
    ctx.stroke();
    ctx.restore();
  }
}
