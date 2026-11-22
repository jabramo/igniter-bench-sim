// Single-Page Controller — Live + Post-Run Scrubbing across P&ID, State Machine & Safety Chain
import { KEY_POS, STATES, SCENARIOS } from './config.js';
import { IgniterBenchSim } from './plc_sim.js';
import { processRunBundle } from './postproc.js';
import { renderPidSvg, updatePidSvg } from './pid_svg.js';
import { renderStatesSvg, updateStatesSvg } from './states_svg.js';
import { renderIsolationSvg, updateIsolationSvg } from './isolation_svg.js';
import { drawLiveScope, getScopeFractionFromClientX, drawSyncReportPlot, drawFftPlot } from './scope.js';
import { drawLogicTiming, getTimingFractionFromClientX } from './timing_plot.js';

const $ = (id) => document.getElementById(id);

// Simple plaintext access gate (case-insensitive)
const ACCESS_PASSWORD = 'gox-ch4-igniter';
const SESSION_KEY = 'igniter_sim_unlocked';

function unlockApp() {
  $('authGate').classList.add('hidden');
  $('appRoot').classList.remove('hidden');
  sessionStorage.setItem(SESSION_KEY, '1');
}

if (sessionStorage.getItem(SESSION_KEY) === '1') {
  unlockApp();
}

$('authInput').addEventListener('input', () => {
  $('authError').classList.add('hidden');
});

$('authForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const entered = $('authInput').value.trim().toLowerCase();
  if (entered === ACCESS_PASSWORD) {
    $('authError').classList.add('hidden');
    unlockApp();
  } else {
    $('authError').classList.remove('hidden');
    $('authInput').select();
  }
});

let syncAligned = true;
let latestReport = null;

// Review / Scrub State (active automatically once a run completes)
let reviewBundle = null;
let scrubIdx = 0;
let scrubPlaying = false;
let isDraggingScope = false;

// Initialize 1 ms PLC + Physics Engine
const sim = new IgniterBenchSim((completedBundle) => {
  const report = processRunBundle(completedBundle);
  latestReport = report;

  // Freeze curves & enable synced interactive scrubbing across all diagrams
  reviewBundle = completedBundle;
  scrubIdx = Math.max(0, completedBundle.samples.length - 1);
  scrubPlaying = false;
  enableScrubBars(completedBundle);
  renderPostRunReport(report);
});

// ---- Mount All 3 Engineering Diagrams ----
renderPidSvg($('pidContainer'));
renderStatesSvg($('statesContainer'));
renderIsolationSvg($('isoContainer'));

// ---- Build 4 One-Click Demo Buttons (Click = Arm & Run Immediately) ----
const scenContainer = $('scenarioPills');
SCENARIOS.forEach((scen) => {
  const btn = document.createElement('button');
  btn.className = 'scen-pill';
  btn.dataset.scen = scen.id;
  btn.title = scen.desc;
  btn.innerHTML = `<span>&#9654; ${scen.short}</span><span class="scen-badge">${scen.badge}</span>`;
  btn.addEventListener('click', () => runScenario(scen.id));
  scenContainer.appendChild(btn);
});

function setPlayIcons(playing) {
  const icon = playing ? '&#10074;&#10074;' : '&#9654;';
  $('btnScrubPlay').innerHTML = icon;
  $('btnScrubPlayIso').innerHTML = icon;
}

function syncScrubSliders(idx, skipEl = null) {
  const s1 = $('scrubSlider');
  const s2 = $('scrubSliderIso');
  if (s1 && s1 !== skipEl) s1.value = String(idx);
  if (s2 && s2 !== skipEl) s2.value = String(idx);
}

function exitReviewMode() {
  reviewBundle = null;
  scrubPlaying = false;
  $('scrubBar').classList.add('hidden');
  $('scrubBarIso').classList.add('hidden');
  $('liveScopeCanvas').classList.remove('scrubbable');
  $('timingCanvas').classList.remove('scrubbable');
  setPlayIcons(false);
}

function enableScrubBars(bundle) {
  const maxIdx = Math.max(0, bundle.samples.length - 1);
  $('scrubSlider').max = String(maxIdx);
  $('scrubSliderIso').max = String(maxIdx);
  syncScrubSliders(scrubIdx);
  $('scrubBar').classList.remove('hidden');
  $('scrubBarIso').classList.remove('hidden');
  $('liveScopeCanvas').classList.add('scrubbable');
  $('timingCanvas').classList.add('scrubbable');
  setPlayIcons(false);
}

function runScenario(scenId) {
  const scen = SCENARIOS.find((s) => s.id === scenId);
  if (!scen) return;
  exitReviewMode();
  sim.applyScenario(scen);
  syncFaultCheckboxes();
  document.querySelectorAll('.scen-pill').forEach((b) => {
    b.classList.toggle('active', b.dataset.scen === scenId);
  });
  sim.startRun();
}

// ---- Interactive Scrubber Controls (Both Sliders + Direct Drag on Scope & Timing + Play/Pause) ----
const scopeCanvas = $('liveScopeCanvas');
const timingCanvas = $('timingCanvas');
let isDraggingTiming = false;

function onSliderScrub(sliderEl) {
  if (!reviewBundle) return;
  scrubPlaying = false;
  setPlayIcons(false);
  scrubIdx = Math.max(0, Math.min(reviewBundle.samples.length - 1, Number(sliderEl.value)));
  syncScrubSliders(scrubIdx, sliderEl);
}

$('scrubSlider').addEventListener('input', (e) => onSliderScrub(e.target));
$('scrubSliderIso').addEventListener('input', (e) => onSliderScrub(e.target));

function scrubFromFraction(frac) {
  if (!reviewBundle || reviewBundle.samples.length < 2) return;
  scrubPlaying = false;
  setPlayIcons(false);
  scrubIdx = Math.round(frac * (reviewBundle.samples.length - 1));
  syncScrubSliders(scrubIdx);
}

scopeCanvas.addEventListener('pointerdown', (e) => {
  if (!reviewBundle) return;
  isDraggingScope = true;
  scopeCanvas.setPointerCapture(e.pointerId);
  scrubFromFraction(getScopeFractionFromClientX(scopeCanvas, e.clientX));
});
scopeCanvas.addEventListener('pointermove', (e) => {
  if (!isDraggingScope || !reviewBundle) return;
  scrubFromFraction(getScopeFractionFromClientX(scopeCanvas, e.clientX));
});
scopeCanvas.addEventListener('pointerup', () => { isDraggingScope = false; });
scopeCanvas.addEventListener('pointercancel', () => { isDraggingScope = false; });

timingCanvas.addEventListener('pointerdown', (e) => {
  if (!reviewBundle) return;
  isDraggingTiming = true;
  timingCanvas.setPointerCapture(e.pointerId);
  scrubFromFraction(getTimingFractionFromClientX(timingCanvas, e.clientX));
});
timingCanvas.addEventListener('pointermove', (e) => {
  if (!isDraggingTiming || !reviewBundle) return;
  scrubFromFraction(getTimingFractionFromClientX(timingCanvas, e.clientX));
});
timingCanvas.addEventListener('pointerup', () => { isDraggingTiming = false; });
timingCanvas.addEventListener('pointercancel', () => { isDraggingTiming = false; });

function toggleScrubPlay() {
  if (!reviewBundle) return;
  if (scrubPlaying) {
    scrubPlaying = false;
    setPlayIcons(false);
  } else {
    if (scrubIdx >= reviewBundle.samples.length - 5) scrubIdx = 0;
    scrubPlaying = true;
    setPlayIcons(true);
  }
}
$('btnScrubPlay').addEventListener('click', toggleScrubPlay);
$('btnScrubPlayIso').addEventListener('click', toggleScrubPlay);

// ---- Operator Panel Wiring (Touching live hardware exits scrub so you see live response!) ----
document.querySelectorAll('.key-pos').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (reviewBundle) exitReviewMode();
    sim.setKeyPosition(btn.dataset.key);
  });
});

$('btnStart').addEventListener('click', () => {
  exitReviewMode();
  sim.startRun();
});

$('btnEstop').addEventListener('click', () => {
  if (!sim.estopPressed) {
    if (reviewBundle) exitReviewMode();
    sim.toggleEstop();
  } else {
    exitReviewMode();
    sim.resetStand();
  }
});

$('btnReset').addEventListener('click', () => {
  exitReviewMode();
  sim.hwFaults = { weldedRelay: false, shortedSsr: false, etherCatPull: false };
  sim.faults = { noIgnition: false, gpLowPower: false, hardStart: false, wireBreakPc: false };
  syncFaultCheckboxes();
  document.querySelectorAll('.scen-pill').forEach((b) => b.classList.remove('active'));
  sim.resetStand();
});

// ---- HMI Sequence Timing Inputs (R8: Locked while ARMED) ----
const settingMap = [
  ['inT1', 't1'],
  ['inT2', 't2'],
  ['inT3', 't3'],
];

settingMap.forEach(([elId, key]) => {
  $(elId).addEventListener('change', (e) => {
    sim.updateSetting(key, e.target.value);
    $('inT1').value = sim.settings.t1;
    $('inT2').value = sim.settings.t2;
    $('inT3').value = sim.settings.t3;
  });
});

// ---- Hardware Isolation Fault Toggles ----
$('chkWeldRelay').addEventListener('change', (e) => {
  if (reviewBundle) exitReviewMode();
  sim.hwFaults.weldedRelay = e.target.checked;
});
$('chkShortSsr').addEventListener('change', (e) => {
  if (reviewBundle) exitReviewMode();
  sim.hwFaults.shortedSsr = e.target.checked;
});

function syncFaultCheckboxes() {
  $('chkWeldRelay').checked = sim.hwFaults.weldedRelay;
  $('chkShortSsr').checked = sim.hwFaults.shortedSsr;
}

// ---- Sync Alignment Toggle (Section 4) ----
$('btnSyncAligned').addEventListener('click', () => setSyncMode(true));
$('btnSyncRaw').addEventListener('click', () => setSyncMode(false));

function setSyncMode(aligned) {
  syncAligned = aligned;
  $('btnSyncAligned').classList.toggle('active', aligned);
  $('btnSyncRaw').classList.toggle('active', !aligned);
  $('syncCaption').textContent = aligned
    ? '1 Hz EL2252 sync pulses align NI cDAQ (green) to PLC Pc (red) within < 0.2 ms.'
    : 'Uncorrected NI cDAQ trace (green) lags PLC Pc (red) from clock drift + 20 ms NI-9234 filter delay.';
  if (latestReport) {
    drawSyncReportPlot($('syncCanvas'), latestReport.bundle, syncAligned);
  }
}

// ---- Post-Run Analysis Rendering (Section 4) ----
function renderPostRunReport(rep) {
  $('reportEmpty').classList.add('hidden');
  $('reportContent').classList.remove('hidden');

  const out = rep.bundle.outcome;
  const tag = $('repOutcome');
  tag.textContent = out;
  tag.className = 'toast-tag' + (out === 'ABORT' ? ' abort' : out === 'NO-GO' ? ' nogo' : '');
  $('repFolder').textContent = `4. Post-Run Analysis — ${rep.folderName}`;
  $('repSubtitle').textContent = rep.bundle.abortReason
    ? `Aborted: ${rep.bundle.abortReason}`
    : rep.bundle.noGoReason
      ? rep.bundle.noGoReason
      : `Completed cleanly · ${rep.bundle.samples.length} PLC samples (1 kHz) + NI cDAQ aligned`;

  const m = rep.metrics;
  const kpis = [
    { lbl: 'Ignition Delay', val: m.ignition_delay_ms !== null ? `${m.ignition_delay_ms} ms` : '—', sub: 'Limit: < 250 ms (R5)' },
    { lbl: 'Mean Pc / Roughness', val: m.mean_pc_bar !== null ? `${m.mean_pc_bar} bar` : '—', sub: m.pc_roughness_pct !== null ? `${m.pc_roughness_pct}% RMS` : 'No burn' },
    { lbl: 'Blowdown O/F Ratio', val: m.mixture_ratio_of !== null ? `${m.mixture_ratio_of}` : '—', sub: m.mdot_gox_g_s ? `GOX ${m.mdot_gox_g_s} / CH4 ${m.mdot_ch4_g_s} g/s` : 'From acc dP/dt' },
    { lbl: 'Valve Open Delays', val: m.sv201_open_delay_ms !== null ? `${m.sv201_open_delay_ms} ms` : '—', sub: m.sv101_open_delay_ms !== null ? `SV-101: ${m.sv101_open_delay_ms} ms` : 'Measured on Pox/Pf' },
  ];

  $('kpiGrid').innerHTML = kpis
    .map(
      (k) => `
      <div class="kpi-card">
        <div class="kpi-lbl">${k.lbl}</div>
        <div class="kpi-val">${k.val}</div>
        <div class="kpi-sub">${k.sub}</div>
      </div>`
    )
    .join('');

  $('eventsTable').querySelector('tbody').innerHTML = rep.bundle.events
    .map(
      (e) => `
      <tr>
        <td class="mono">${e.tRun !== null ? e.tRun.toFixed(3) : '—'}</td>
        <td class="mono">${e.state}</td>
        <td>${e.msg}</td>
      </tr>`
    )
    .join('');

  requestAnimationFrame(() => {
    drawSyncReportPlot($('syncCanvas'), rep.bundle, syncAligned);
    drawFftPlot($('fftCanvas'), rep.pcFft);
  });
}

// Reconstruct a complete P&ID + State Machine + Hardwired Safety Chain snapshot at a scrubbed millisecond
function buildReplaySnapshot(bundle, sample, liveSnap) {
  return {
    ...liveSnap,
    simTime: sample.t,
    state: sample.state,
    tRel: sample.tRel,
    tRun: sample.t,
    keyPos: sample.keyPos ?? bundle.keyPosAtStart ?? liveSnap.keyPos,
    estopPressed: !!sample.estopPressed,
    estopLatched: !!sample.estopLatched,
    noGoReason: bundle.noGoReason || '',
    p: {
      pt101: sample.pt101,
      pt201: sample.pt201,
      pt102: sample.pt102,
      pt202: sample.pt202,
      pt301: sample.pt301,
    },
    mA: {
      ...liveSnap.mA,
      pt301: sample.pt301mA,
    },
    tBody: sample.tc301,
    gpV: sample.gpV,
    gpI: sample.gpI,
    gpP: sample.gpP,
    gpPAvg: sample.gpPAvg,
    gpOkLatched: sample.gpOk === 1,
    gpTempNorm: sample.gpTempNorm ?? 0,
    gpActuallyPowered: !!sample.gpPowered,
    outCmd: {
      gox: sample.sv201Cmd === 1,
      ch4: sample.sv101Cmd === 1,
      gp: sample.gpCmd === 1,
    },
    sv201Energized: !!sample.sv201Energized,
    sv101Energized: !!sample.sv101Energized,
    valveLiftGox: sample.valveLiftGox ?? 0,
    valveLiftCh4: sample.valveLiftCh4 ?? 0,
    ignited: !!sample.ignited,
    hw: sample.hw ? { ...sample.hw } : liveSnap.hw,
    hwFaults: sample.hwFaults ? { ...sample.hwFaults } : liveSnap.hwFaults,
    settings: bundle.settings,
  };
}

// ---- Render Live & Scrubbed UI at 60 FPS ----
function renderFrame(liveSnap) {
  const inReview = reviewBundle !== null && !liveSnap.recording;
  const sample = inReview ? reviewBundle.samples[scrubIdx] : null;
  const viewSnap = inReview && sample ? buildReplaySnapshot(reviewBundle, sample, liveSnap) : liveSnap;

  // Header state & clock
  const hdrState = $('hdrState');
  hdrState.textContent = viewSnap.state;
  hdrState.className =
    'state-pill ' +
    (viewSnap.state === STATES.ABORT
      ? 'state-abort'
      : viewSnap.state === STATES.BURN
        ? 'state-burn'
        : viewSnap.state === STATES.READY
          ? 'state-ready'
          : viewSnap.state === STATES.SAFE
            ? 'state-safe'
            : 'state-run');

  if (inReview && sample) {
    $('lblClockMode').textContent = 'SCRUB REPLAY';
    $('valClock').textContent =
      sample.tRel !== null
        ? `T${sample.tRel >= 0 ? '+' : ''}${sample.tRel.toFixed(3)} s`
        : `${sample.t.toFixed(3)} s`;
  } else if (liveSnap.tRel !== null) {
    $('lblClockMode').textContent = 'T0 = GOX OPEN';
    $('valClock').textContent = `T${liveSnap.tRel >= 0 ? '+' : ''}${liveSnap.tRel.toFixed(3)} s`;
  } else if (liveSnap.tRun !== null) {
    $('lblClockMode').textContent = 'RUN TIME';
    $('valClock').textContent = `${liveSnap.tRun.toFixed(3)} s`;
  } else {
    $('lblClockMode').textContent = 'PLC 1 kHz';
    $('valClock').textContent = 'READY';
  }

  $('recPill').classList.toggle('active', liveSnap.recording);

  // Left Operator Panel reflects real physical controls (and lamps follow viewSnap so scrub shows lamp state!)
  document.querySelectorAll('.key-pos').forEach((b) => {
    b.classList.toggle('active', b.dataset.key === liveSnap.keyPos);
  });

  $('keyHint').textContent =
    liveSnap.keyPos === KEY_POS.SAFE
      ? 'Valves & glow plug isolated in hardware.'
      : 'ARMED: Valves + glow plug live; timing locked.';

  $('ledSafe').classList.toggle('on', viewSnap.hw.safeLampOn);
  $('ledArmed').classList.toggle('on', viewSnap.hw.armedLampOn);

  const tj = $('valTestJacks');
  tj.textContent = `${viewSnap.hw.valveBusVoltage.toFixed(2)} V DC`;
  tj.classList.toggle('live', viewSnap.hw.valveBusVoltage > 18);

  $('btnStart').disabled = !!liveSnap.startInhibit;
  const inh = $('startInhibit');
  if (liveSnap.startInhibit) {
    inh.textContent = liveSnap.startInhibit;
    inh.classList.remove('ok');
  } else {
    inh.textContent = 'Ready — press START to fire';
    inh.classList.add('ok');
  }

  const btnEstop = $('btnEstop');
  btnEstop.classList.toggle('latched', liveSnap.estopPressed);
  btnEstop.textContent = liveSnap.estopPressed ? 'E-STOP ACTIVE' : 'E-STOP';

  const locked = liveSnap.keyPos === KEY_POS.ARMED;
  $('hmiLockBadge').textContent = locked ? 'LOCKED · ARMED' : 'EDITABLE';
  $('hmiLockBadge').classList.toggle('locked', locked);
  settingMap.forEach(([elId]) => {
    $(elId).disabled = locked;
  });

  // Alert Banner
  const banner = $('alertBanner');
  if (liveSnap.abortLatched && liveSnap.abortReason) {
    banner.className = 'alert-banner abort';
    banner.innerHTML = `<span><strong>ABORT:</strong> ${liveSnap.abortReason}</span><span>Scrub curves below or click RESET</span>`;
  } else if (liveSnap.noGoReason) {
    banner.className = 'alert-banner nogo';
    banner.innerHTML = `<span><strong>NO-GO:</strong> ${liveSnap.noGoReason}</span><span>Valves never opened</span>`;
  } else {
    banner.className = 'alert-banner hidden';
  }

  // Scope Legend (follows scrubbed point!)
  $('legPc').textContent = viewSnap.p.pt301.toFixed(2);
  $('legPox').textContent = viewSnap.p.pt202.toFixed(1);
  $('legPf').textContent = viewSnap.p.pt102.toFixed(1);
  $('legGp').textContent = viewSnap.gpPAvg.toFixed(0);

  // 1. Update Live/Scrubbed P&ID
  updatePidSvg(viewSnap);

  // 1b. Update 1 kHz Scope & 2b. Logic Timing Diagram
  let timingOpts = { samples: null, mode: 'idle' };
  if (liveSnap.recording && sim.currentRunData) {
    const estTotal = (sim.fastMode ? 1.5 : 5.0) + liveSnap.settings.t1 + liveSnap.settings.t3 + (sim.fastMode ? 1.2 : 5.0);
    const curT = sim.currentRunData.samples.length / 1000;
    const tMaxLive = Math.max(estTotal, curT);
    const t0Live = sim.t0Time !== null ? sim.t0Time - sim.runStartTime : null;
    $('scopeHint').textContent = '(recording 1 kHz — holds automatically when done)';
    drawLiveScope(scopeCanvas, {
      samples: sim.currentRunData.samples,
      settings: liveSnap.settings,
      tMax: tMaxLive,
      t0Offset: t0Live,
      mode: 'live',
    });
    timingOpts = { samples: sim.currentRunData.samples, tMax: tMaxLive, t0Offset: t0Live, mode: 'live' };
  } else if (inReview) {
    const totalT = reviewBundle.samples[reviewBundle.samples.length - 1]?.t || 1;
    $('scopeHint').textContent = `(run held · ${reviewBundle.outcome} · scrubbable)`;
    if (sample) {
      const tLabel =
        sample.tRel !== null
          ? `t = ${sample.t.toFixed(3)} s (T${sample.tRel >= 0 ? '+' : ''}${sample.tRel.toFixed(3)} s)`
          : `t = ${sample.t.toFixed(3)} s`;
      $('scrubTime').textContent = tLabel;
      $('scrubTimeIso').textContent = tLabel;
    }
    drawLiveScope(scopeCanvas, {
      samples: reviewBundle.samples,
      settings: reviewBundle.settings,
      tMax: totalT,
      scrubIdx,
      t0Offset: reviewBundle.t0OffsetSec,
      mode: 'review',
    });
    timingOpts = {
      samples: reviewBundle.samples,
      tMax: totalT,
      scrubIdx,
      t0Offset: reviewBundle.t0OffsetSec,
      mode: 'review',
    };
  } else {
    $('scopeHint').textContent = '';
    drawLiveScope(scopeCanvas, {
      samples: null,
      settings: liveSnap.settings,
      mode: 'idle',
    });
  }

  // 2. Update Sequence State Machine & Logic Timing (tracks BOTH live & scrub!)
  updateStatesSvg(viewSnap);
  drawLogicTiming(timingCanvas, timingOpts);
  $('statesActivePill').textContent = `${inReview ? 'REPLAY: ' : 'STATE: '}${viewSnap.state}`;

  // 3. Update Hardwired Safety Chain & Isolation (tracks BOTH live & scrub!)
  updateIsolationSvg(viewSnap);
  const pill = $('isoSummaryPill');
  const prefix = inReview ? 'REPLAY · ' : '';
  if (viewSnap.hwFaults.weldedRelay) {
    pill.textContent = `${prefix}FAULT: WELDED RELAY — START BLOCKED`;
    pill.className = 'iso-status-pill fault';
  } else if (viewSnap.hw.valveBusLive) {
    pill.textContent = `${prefix}VALVE BUS: ${viewSnap.hw.valveBusVoltage.toFixed(2)} V (ARMED)`;
    pill.className = 'iso-status-pill live';
  } else {
    pill.textContent = `${prefix}VALVE BUS: ${viewSnap.hw.valveBusVoltage.toFixed(2)} V (ISOLATED)`;
    pill.className = 'iso-status-pill';
  }
}

// ---- Main Animation Loop ----
let lastTs = performance.now();
let accumMs = 0;

function loop(now) {
  const dtMs = Math.min(50, Math.max(0, now - lastTs));
  lastTs = now;
  accumMs += dtMs;
  const steps = Math.floor(accumMs);

  if (steps > 0) {
    if (!reviewBundle || sim.recording) {
      sim.stepMs(steps);
    } else {
      sim._updateHardwareChain();
      if (scrubPlaying) {
        scrubIdx += steps;
        if (scrubIdx >= reviewBundle.samples.length - 1) {
          scrubIdx = reviewBundle.samples.length - 1;
          scrubPlaying = false;
          setPlayIcons(false);
        }
        syncScrubSliders(scrubIdx);
      }
    }
    accumMs -= steps;
  }

  renderFrame(sim.getSnapshot());
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
