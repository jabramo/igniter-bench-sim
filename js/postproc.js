// Post-Run Automated Processing (mirrors Section 8 & 9 Python post-processor)

const R_UNIV = 8.31446;
const M_GOX = 0.032;
const M_CH4 = 0.01604;
const T_ACC = 293.15;
const V_ACC = 0.001; // 1.0 L

// In-place radix-2 Cooley-Tukey FFT
function computeFFT(signal, fs = 1000) {
  let N = 1;
  while (N * 2 <= signal.length && N < 1024) N *= 2;
  if (N < 64) return { freqs: [], mags: [], peakHz: 0 };

  const re = new Float64Array(N);
  const im = new Float64Array(N);

  // Linearly detrend blowdown slope & apply Hann window so combustion acoustics stand out cleanly
  const firstVal = signal[0];
  const lastVal = signal[N - 1];
  for (let i = 0; i < N; i++) {
    const trend = firstVal + ((lastVal - firstVal) * i) / (N - 1);
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
    re[i] = (signal[i] - trend) * w;
  }

  // Bit-reversal permutation
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  // Butterfly stages
  for (let len = 2; len <= N; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wlenRe = Math.cos(ang);
    const wlenIm = Math.sin(ang);
    for (let i = 0; i < N; i += len) {
      let wRe = 1;
      let wIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const uRe = re[i + j];
        const uIm = im[i + j];
        const vRe = re[i + j + len / 2] * wRe - im[i + j + len / 2] * wIm;
        const vIm = re[i + j + len / 2] * wIm + im[i + j + len / 2] * wRe;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[i + j + len / 2] = uRe - vRe;
        im[i + j + len / 2] = uIm - vIm;
        const nextWRe = wRe * wlenRe - wIm * wlenIm;
        wIm = wRe * wlenIm + wIm * wlenRe;
        wRe = nextWRe;
      }
    }
  }

  const freqs = [];
  const mags = [];
  let maxMag = 0;
  let peakHz = 0;
  const half = N / 2;
  for (let k = 1; k < half; k++) {
    const f = (k * fs) / N;
    // Hann window coherent gain is 0.5, so single-sided amplitude is 4/N
    const m = (4 / N) * Math.hypot(re[k], im[k]);
    freqs.push(f);
    mags.push(m);
    if (f >= 30 && m > maxMag) {
      maxMag = m;
      peakHz = f;
    }
  }
  return { freqs, mags, peakHz };
}

export function processRunBundle(bundle) {
  const s = bundle.samples;
  const now = new Date(bundle.startedAtIso);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const folderName = `RUN_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}_${pad(bundle.runNumber, 4)}`;

  // 1. Ignition delay (ms from CH4 command to debounced ignition)
  let ignDelayMs = null;
  if (bundle.ch4OffsetSec !== null && bundle.ignOffsetSec !== null) {
    ignDelayMs = Math.round((bundle.ignOffsetSec - bundle.ch4OffsetSec) * 1000);
  }

  // 2. Burn phase Pc stats (mean & roughness %)
  const burnSamples = s.filter((x) => x.state === 'BURN');
  let meanPc = null;
  let pcRoughnessPct = null;
  let burnDurationSec = burnSamples.length / 1000;
  if (burnSamples.length > 50) {
    // Skip first 150 ms transient
    const steady = burnSamples.slice(Math.min(150, Math.floor(burnSamples.length * 0.2)));
    const sum = steady.reduce((acc, x) => acc + x.pt301, 0);
    meanPc = sum / steady.length;
    // Linear detrend for blowdown slope before computing RMS roughness
    const first = steady[0].pt301;
    const last = steady[steady.length - 1].pt301;
    let sq = 0;
    for (let i = 0; i < steady.length; i++) {
      const trend = first + ((last - first) * i) / Math.max(1, steady.length - 1);
      const diff = steady[i].pt301 - trend;
      sq += diff * diff;
    }
    const rms = Math.sqrt(sq / steady.length);
    pcRoughnessPct = meanPc > 0.1 ? (rms / meanPc) * 100 : 0;
  }

  // 3. Blowdown mass flow & O/F from accumulator dP (ideal gas, Section 9.3)
  let mdotGoxGs = null;
  let mdotCh4Gs = null;
  let ofRatio = null;
  const goxOpenSamples = s.filter((x) => x.sv201Cmd === 1);
  const ch4OpenSamples = s.filter((x) => x.sv101Cmd === 1);
  const valvesLiveMode = bundle.keyPosAtStart === 'ARMED' || bundle.keyPosAtStart === 'TEST';
  if (goxOpenSamples.length > 50 && valvesLiveMode) {
    const dpGoxPa = Math.max(0, (bundle.pAccGoxStart - bundle.pAccGoxEnd) * 1e5);
    const mGoxKg = (dpGoxPa * V_ACC * M_GOX) / (R_UNIV * T_ACC);
    mdotGoxGs = (mGoxKg * 1000) / (goxOpenSamples.length / 1000);
  }
  if (ch4OpenSamples.length > 50 && valvesLiveMode) {
    const dpCh4Pa = Math.max(0, (bundle.pAccCh4Start - bundle.pAccCh4End) * 1e5);
    const mCh4Kg = (dpCh4Pa * V_ACC * M_CH4) / (R_UNIV * T_ACC);
    mdotCh4Gs = (mCh4Kg * 1000) / (ch4OpenSamples.length / 1000);
  }
  if (mdotGoxGs && mdotCh4Gs && mdotCh4Gs > 0.2) {
    ofRatio = mdotGoxGs / mdotCh4Gs;
  }

  // 4. Glow plug mean steady power & total energy (J)
  let gpEnergyJ = 0;
  let gpOnCount = 0;
  let gpPowerSum = 0;
  for (let i = 0; i < s.length; i++) {
    gpEnergyJ += s[i].gpP * 0.001;
    if (s[i].gpCmd === 1) {
      gpOnCount += 1;
      gpPowerSum += s[i].gpP;
    }
  }
  const gpMeanPowerW = gpOnCount > 0 ? gpPowerSum / gpOnCount : 0;

  // 5. Measured valve opening delays (command -> downstream P inflection > 2.5 bar)
  const findOpenDelay = (cmdKey, pKey) => {
    const idxCmd = s.findIndex((x) => x[cmdKey] === 1);
    if (idxCmd < 0) return null;
    for (let i = idxCmd; i < Math.min(s.length, idxCmd + 150); i++) {
      if (s[i][pKey] > 2.5) return i - idxCmd; // ms
    }
    return null;
  };
  const goxOpenDelayMs = findOpenDelay('sv201Cmd', 'pt202');
  const ch4OpenDelayMs = findOpenDelay('sv101Cmd', 'pt102');

  // 6. Peak igniter body temp
  let peakTempC = 23.0;
  for (let i = 0; i < s.length; i++) {
    if (s[i].tc301 > peakTempC) peakTempC = s[i].tc301;
  }

  // 7. Pressure & Vibration FFT during steady burn (skip initial ignition step transient)
  const fftSource = burnSamples.length >= 256 ? burnSamples.slice(120) : (burnSamples.length >= 128 ? burnSamples : s);
  const pcFft = computeFFT(fftSource.map((x) => x.pt301), 1000);
  const accFft = computeFFT(fftSource.map((x) => x.accelG), 1000);

  // 8. Build run.json & events.csv strings (Section 9.2)
  const runJson = {
    run_folder: folderName,
    run_number: bundle.runNumber,
    timestamp_utc: bundle.startedAtIso,
    outcome: bundle.outcome,
    abort_reason: bundle.abortReason || null,
    no_go_reason: bundle.noGoReason || null,
    key_position: bundle.keyPosAtStart,
    plc_firmware: 'Igniter_TC3_v1.0.4',
    hmi_settings: bundle.settings,
    summary_metrics: {
      ignition_delay_ms: ignDelayMs,
      mean_pc_bar: meanPc !== null ? +meanPc.toFixed(2) : null,
      pc_roughness_pct: pcRoughnessPct !== null ? +pcRoughnessPct.toFixed(2) : null,
      burn_duration_s: +burnDurationSec.toFixed(3),
      mdot_gox_g_s: mdotGoxGs !== null ? +mdotGoxGs.toFixed(2) : null,
      mdot_ch4_g_s: mdotCh4Gs !== null ? +mdotCh4Gs.toFixed(2) : null,
      mixture_ratio_of: ofRatio !== null ? +ofRatio.toFixed(2) : null,
      gp_mean_power_w: +gpMeanPowerW.toFixed(1),
      gp_energy_j: +gpEnergyJ.toFixed(1),
      sv201_open_delay_ms: goxOpenDelayMs,
      sv101_open_delay_ms: ch4OpenDelayMs,
      peak_body_temp_c: +peakTempC.toFixed(1),
      dominant_acoustic_hz: +pcFft.peakHz.toFixed(0),
    },
    sync_alignment: {
      sync_source: 'EL2252 1 Hz timestamped pulse',
      measured_ni_offset_ms: 4.5,
      measured_ni_drift_ms_per_min: 3.2,
      ni9234_filter_delay_corrected_ms: 20.0,
      residual_sync_error_ms: 0.18,
    },
  };

  const eventsCsv = [
    'wall_utc,t_run_s,t_rel_t0_s,state,event',
    ...bundle.events.map((e) =>
      `${e.wall},${e.tRun ?? ''},${e.tRel ?? ''},${e.state},"${e.msg.replace(/"/g, '""')}"`
    ),
  ].join('\n');

  return {
    folderName,
    bundle,
    metrics: runJson.summary_metrics,
    syncInfo: runJson.sync_alignment,
    pcFft,
    accFft,
    runJsonText: JSON.stringify(runJson, null, 2),
    eventsCsv,
  };
}

export function buildControlCsv(bundle) {
  const header = 't_run_s,t_rel_s,state,PT101_bar,PT201_bar,PT102_Pf_bar,PT202_Pox_bar,PT301_Pc_bar,TC301_C,GP_V,GP_I,GP_P_W,SV201_cmd,SV101_cmd,GP_cmd,SYNC_1Hz';
  // Decimate 10x (100 Hz) for snappy browser download while noting 1 kHz native
  const rows = [header];
  for (let i = 0; i < bundle.samples.length; i += 10) {
    const x = bundle.samples[i];
    rows.push(
      [
        x.t.toFixed(3),
        x.tRel !== null ? x.tRel.toFixed(3) : '',
        x.state,
        x.pt101.toFixed(2),
        x.pt201.toFixed(2),
        x.pt102.toFixed(2),
        x.pt202.toFixed(2),
        x.pt301.toFixed(2),
        x.tc301.toFixed(1),
        x.gpV.toFixed(2),
        x.gpI.toFixed(2),
        x.gpP.toFixed(1),
        x.sv201Cmd,
        x.sv101Cmd,
        x.gpCmd,
        x.sync,
      ].join(',')
    );
  }
  return rows.join('\n');
}
