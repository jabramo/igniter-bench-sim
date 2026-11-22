// GOX / GCH4 Igniter Test Bench — 1 ms PLC + Physics + Safety Chain Engine
import { STATES, KEY_POS, DEFAULT_SETTINGS, PARAM_BOUNDS, ABORT_LIMITS } from './config.js';

const P_AMB = 1.013; // bar abs
const R_UNIV = 8.31446; // J/(mol K)
const M_GOX = 0.032; // kg/mol
const M_CH4 = 0.01604; // kg/mol
const T_ACC = 293.15; // K
const V_ACC = 0.001; // 1.0 L run accumulator each

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// Fast deterministic-ish noise generator for realistic 1 kHz sensor texture
let rngState = 1337;
function randn() {
  rngState = (rngState * 1664525 + 1013904223) >>> 0;
  const u1 = Math.max(1e-6, rngState / 4294967296);
  rngState = (rngState * 1664525 + 1013904223) >>> 0;
  const u2 = rngState / 4294967296;
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export class IgniterBenchSim {
  constructor(onRunComplete) {
    this.onRunComplete = onRunComplete || (() => {});
    this.runNumber = 0;
    this.runHistory = [];
    this.fastMode = true; // 1.5 s countdown / 1.5 s post-run (vs 5 s real) for crisp 1-min demo

    // HMI Settings (validated & clamped by PLC)
    this.settings = { ...DEFAULT_SETTINGS };

    // Hardware safety & panel state
    this.keyPos = KEY_POS.SAFE;
    this.keyRemoved = false;
    this.estopPressed = false;
    this.estopLatched = false; // Safety relay requires manual reset after E-STOP release
    this.bottlesClosed = true; // Pre-run checklist item (K-bottles closed)
    this.ventCh4Open = false;
    this.ventGoxOpen = false;

    // Injectable scenario & hardware faults
    this.activeScenarioId = 'nominal';
    this.faults = {
      noIgnition: false,
      gpLowPower: false,
      hardStart: false,
      wireBreakPc: false,
    };
    this.hwFaults = {
      weldedRelay: false,
      shortedSsr: false,
      etherCatPull: false,
    };

    // PLC runtime
    this.simTime = 0; // monotonic wall sim seconds
    this.plcCycle = 0;
    this.state = STATES.SAFE;
    this.stateEntryTime = 0;
    this.runStartTime = 0;
    this.t0Time = null; // GOX valve command time
    this.ch4CmdTime = null;
    this.ignDetectedTime = null;
    this.recording = false;
    this.abortLatched = false;
    this.abortReason = '';
    this.abortRuleId = null;
    this.noGoReason = '';
    this.etherCatDropTimer = 0;
    this.etherCatWatchdogTripped = false;
    this.heartbeatPhase = 0;

    // Sequence commands (before output interlock layer)
    this.seqCmd = { gox: false, ch4: false, gp: false };
    // Final PLC output commands (after independent interlock pass)
    this.outCmd = { gox: false, ch4: false, gp: false };
    // Interlock status booleans for HMI transparency
    this.interlocks = {
      gox: { seq: false, noAbort: true, keyArmed: false, gpOk: false, allowed: false },
      ch4: { seq: false, noAbort: true, keyArmed: false, gpOk: false, goxOpen: false, allowed: false },
      gp:  { seq: false, noAbort: true, keyTestOrArmed: false, allowed: false },
    };

    // Glow plug electro-thermal state
    this.gpTempNorm = 0; // 0 = cold, 1 = hot steady
    this.gpV = 0;
    this.gpI = 0;
    this.gpP = 0;
    this.gpR = 1.6;
    this.gpPowerBuf = new Float32Array(100); // 100 ms moving average
    this.gpPowerIdx = 0;
    this.gpPowerSum = 0;
    this.gpPowerAvg = 0;
    this.gpInRangeMs = 0;
    this.gpOkLatched = false;

    // Pneumatic & combustion physical state
    this.pAccCh4 = 50.0;
    this.pAccGox = 50.0;
    this.pInjF = P_AMB;
    this.pInjOx = P_AMB;
    this.pChamber = P_AMB;
    this._pChamberBulk = P_AMB;
    this.tBody = 23.0;
    this.tBodySampled = 23.0; // TC-301 sampled every ~150 ms per EL3314
    this.tcSampleAccum = 0;

    // Actual solenoid mechanical spool position (0 = closed, 1 = open)
    this.valveLiftGox = 0;
    this.valveLiftCh4 = 0;
    this.sv201EnergizeMs = 0;
    this.sv101EnergizeMs = 0;
    this.sv201Energized = false;
    this.sv101Energized = false;
    this.gpActuallyPowered = false;

    // Combustion state
    this.ignited = false;
    this.fuelMixTime = 0;
    this.ignDelayTarget = 0.078;
    this.ignDebounceCount = 0;
    this.hardStartPulse = 0;
    this.mdotGox = 0; // kg/s
    this.mdotCh4 = 0; // kg/s
    this.accelG = 0;

    // 4-20 mA sensor readings (what the PLC actually sees!)
    this.mA = { pt101: 20.0, pt201: 20.0, pt102: 4.32, pt202: 4.32, pt301: 4.65 };
    this.plcP = { pt101: 50.0, pt201: 50.0, pt102: P_AMB, pt202: P_AMB, pt301: P_AMB };

    // Live scope rolling buffer (for live screen, 10 ms decimated = 100 Hz display)
    this.liveScope = [];
    this.maxLivePoints = 1200; // 12 seconds visible live

    // Full-fidelity 1 kHz run recording (populated while this.recording === true)
    this.currentRunData = null;
    this.events = [];
    this.lastRunBundle = null;

    this._updateHardwareChain();
    this._updateSensors(0.001);
  }

  // ---- Configuration & Controls ----

  updateSetting(key, rawValue) {
    if (this.keyPos === KEY_POS.ARMED) return false; // Locked while armed (R8)
    const b = PARAM_BOUNDS[key];
    if (!b) return false;
    let val = clamp(Number(rawValue), b.min, b.max);
    const next = { ...this.settings, [key]: val };
    // Cross-checks enforced in PLC (Section 7.8)
    if (next.pMin >= next.pMax) {
      if (key === 'pMin') next.pMin = next.pMax - 5;
      else next.pMax = next.pMin + 5;
    }
    if (next.t2 / 1000 >= next.t3) {
      if (key === 't2') next.t2 = Math.max(0, Math.floor((next.t3 - 0.1) * 1000));
      else next.t3 = Math.max(0.2, +(next.t2 / 1000 + 0.1).toFixed(1));
    }
    this.settings = next;
    return true;
  }

  setKeyPosition(pos) {
    if (pos !== KEY_POS.SAFE && this.keyRemoved) return false;
    const prev = this.keyPos;
    this.keyPos = pos;
    this._logEvent(`KEY -> ${pos}`);
    this._updateHardwareChain();

    // Turning key to SAFE during an active run drops hardware power and aborts cleanly
    if (pos === KEY_POS.SAFE && this._isRunningState()) {
      this._triggerAbort(null, 'Key turned to SAFE during active sequence');
    } else if (prev !== pos && !this.abortLatched && !this._isRunningState()) {
      this._evaluateReadyState();
    }
    return true;
  }

  toggleKeyRemoved() {
    if (this.keyPos !== KEY_POS.SAFE) return false;
    this.keyRemoved = !this.keyRemoved;
    this._logEvent(this.keyRemoved ? 'KEY REMOVED (Lockout at stand)' : 'KEY INSERTED (SAFE)');
    return true;
  }

  toggleEstop() {
    if (!this.estopPressed) {
      this.estopPressed = true;
      this.estopLatched = true;
      this._updateHardwareChain();
      this._logEvent('E-STOP PRESSED — Safety relay opened (hardware power cut)');
      if (this._isRunningState()) {
        this._triggerAbort(null, 'Hardware E-STOP pressed (safety relay cut actuator power; logging continues)');
      } else {
        this.abortLatched = true;
        this.abortReason = 'Hardware E-STOP pressed';
        this.state = STATES.ABORT;
      }
    } else {
      this.estopPressed = false;
      this._logEvent('E-STOP released (safety relay still requires manual reset)');
      this._updateHardwareChain();
    }
  }

  resetSafetyRelay() {
    if (this.estopPressed) return false;
    if (!this.estopLatched) return true;
    this.estopLatched = false;
    this._logEvent('Safety relay manually reset');
    this._updateHardwareChain();
    return true;
  }

  pressAbortButton() {
    this._logEvent('ABORT pushbutton pressed (NC loop opened)');
    if (this._isRunningState() || this.state === STATES.READY) {
      this._triggerAbort(null, 'Operator ABORT pushbutton (wired NC)');
    }
  }

  resetAbort() {
    // Per states.png & Section 7.2: requires operator reset AND key in SAFE
    if (this.keyPos !== KEY_POS.SAFE) return false;
    if (this.estopPressed || this.estopLatched) return false;
    this.abortLatched = false;
    this.abortReason = '';
    this.abortRuleId = null;
    this.noGoReason = '';
    this.etherCatWatchdogTripped = false;
    this.etherCatDropTimer = 0;
    this.gpOkLatched = false;
    this.ignited = false;
    this.recording = false;
    this.t0Time = null;
    this.state = STATES.SAFE;
    this._logEvent('ABORT reset by operator (Key in SAFE)');
    return true;
  }

  refillAccumulators() {
    if (this._isRunningState()) return false;
    this.ventCh4Open = false;
    this.ventGoxOpen = false;
    this.pAccCh4 = 50.0;
    this.pAccGox = 50.0;
    this.pInjF = P_AMB;
    this.pInjOx = P_AMB;
    this.pChamber = P_AMB;
    this._pChamberBulk = P_AMB;
    this.tBody = 23.0;
    this.tBodySampled = 23.0;
    this.gpTempNorm = 0;
    this.bottlesClosed = true;
    this._updateSensors(0.001);
    this._evaluateReadyState();
    this._logEvent('Accumulators refilled to 50.0 bar; K-bottles closed');
    return true;
  }

  toggleVent(side) {
    if (this._isRunningState()) return false;
    if (side === 'ch4') this.ventCh4Open = !this.ventCh4Open;
    if (side === 'gox') this.ventGoxOpen = !this.ventGoxOpen;
    return true;
  }

  toggleBottlesClosed() {
    if (this._isRunningState()) return false;
    this.bottlesClosed = !this.bottlesClosed;
    this._evaluateReadyState();
    return true;
  }

  applyScenario(scenario) {
    // Cleanly reset stand & configure scenario for effortless 1-click demo
    this.estopPressed = false;
    this.estopLatched = false;
    this.keyRemoved = false;
    this.hwFaults = { weldedRelay: false, shortedSsr: false, etherCatPull: false };
    this.etherCatWatchdogTripped = false;
    this.etherCatDropTimer = 0;
    this.abortLatched = false;
    this.abortReason = '';
    this.abortRuleId = null;
    this.noGoReason = '';
    this.recording = false;
    this.currentRunData = null;
    this.seqCmd = { gox: false, ch4: false, gp: false };
    this.outCmd = { gox: false, ch4: false, gp: false };
    this.gpOkLatched = false;
    this.gpInRangeMs = 0;
    this.gpPowerBuf.fill(0);
    this.gpPowerSum = 0;
    this.gpPowerAvg = 0;
    this.ignited = false;
    this.fuelMixTime = 0;
    this.ignDebounceCount = 0;
    this.valveLiftCh4 = 0;
    this.valveLiftGox = 0;
    this.ventCh4Open = false;
    this.ventGoxOpen = false;
    this.pAccCh4 = 50.0;
    this.pAccGox = 50.0;
    this.pInjF = P_AMB;
    this.pInjOx = P_AMB;
    this.pChamber = P_AMB;
    this._pChamberBulk = P_AMB;
    this.tBody = 23.0;
    this.tBodySampled = 23.0;
    this.gpTempNorm = 0;
    this.bottlesClosed = true;
    this.t0Time = null;
    this.ch4CmdTime = null;
    this.ignDetectedTime = null;

    this.activeScenarioId = scenario.id;
    this.faults = {
      noIgnition: !!scenario.faults.noIgnition,
      gpLowPower: !!scenario.faults.gpLowPower,
      hardStart: !!scenario.faults.hardStart,
      wireBreakPc: !!scenario.faults.wireBreakPc,
    };

    this.keyPos = scenario.key || KEY_POS.ARMED;
    this._updateHardwareChain();
    this._updateSensors(0.001);
    this._evaluateReadyState();
    this.liveScope = [];
    this.events = [];
    this._logEvent(`Scenario loaded: ${scenario.short} (Key: ${this.keyPos})`);
  }

  getStartInhibitReason() {
    if (this._isRunningState()) return 'Sequence running...';
    if (this.abortLatched) return 'ABORT latched — click RESET';
    if (this.estopPressed || this.estopLatched) return 'E-STOP active — click RESET';
    if (this.keyPos === KEY_POS.SAFE) return 'Turn ARM key to ARMED';
    if (!this.hw.plcRelayAgree) return 'Safety relay fault — clear welded contact';
    if (this.hwFaults.etherCatPull || this.etherCatWatchdogTripped) return 'EtherCAT watchdog fault';
    if (this._anySensorFault()) return '4–20 mA sensor fault active';
    return '';
  }

  resetStand() {
    // One-click clean reset: releases E-STOP, resets safety relay & abort, refills accumulators to 50 bar, returns key to SAFE
    this.estopPressed = false;
    this.estopLatched = false;
    this.keyRemoved = false;
    this.abortLatched = false;
    this.abortReason = '';
    this.abortRuleId = null;
    this.noGoReason = '';
    this.recording = false;
    this.currentRunData = null;
    this.seqCmd = { gox: false, ch4: false, gp: false };
    this.outCmd = { gox: false, ch4: false, gp: false };
    this.gpOkLatched = false;
    this.gpInRangeMs = 0;
    this.gpPowerBuf.fill(0);
    this.gpPowerSum = 0;
    this.gpPowerAvg = 0;
    this.ignited = false;
    this.fuelMixTime = 0;
    this.ignDebounceCount = 0;
    this.valveLiftCh4 = 0;
    this.valveLiftGox = 0;
    this.sv201EnergizeMs = 0;
    this.sv101EnergizeMs = 0;
    this.ventCh4Open = false;
    this.ventGoxOpen = false;
    this.pAccCh4 = 50.0;
    this.pAccGox = 50.0;
    this.pInjF = P_AMB;
    this.pInjOx = P_AMB;
    this.pChamber = P_AMB;
    this._pChamberBulk = P_AMB;
    this.tBody = 23.0;
    this.tBodySampled = 23.0;
    this.gpTempNorm = 0;
    this.bottlesClosed = true;
    this.t0Time = null;
    this.ch4CmdTime = null;
    this.ignDetectedTime = null;
    this.keyPos = KEY_POS.SAFE;
    this.state = STATES.SAFE;
    this._updateHardwareChain();
    this._updateSensors(0.001);
    this._logEvent('Stand reset to SAFE (50 bar ready)');
  }

  startRun() {
    // Auto-top-off accumulators before a fresh run so evaluators never get stuck on refill
    if (!this._isRunningState() && !this.abortLatched && (this.pAccCh4 < 45 || this.pAccGox < 45)) {
      this.pAccCh4 = 50.0;
      this.pAccGox = 50.0;
      this._updateSensors(0.001);
    }
    const inhibit = this.getStartInhibitReason();
    if (inhibit) return { ok: false, reason: inhibit };

    this.runNumber += 1;
    this.runStartTime = this.simTime;
    this.t0Time = null;
    this.ch4CmdTime = null;
    this.ignDetectedTime = null;
    this.noGoReason = '';
    this.gpOkLatched = false;
    this.gpInRangeMs = 0;
    this.gpPowerBuf.fill(0);
    this.gpPowerSum = 0;
    this.gpPowerAvg = 0;
    this.ignited = false;
    this.fuelMixTime = 0;
    this.ignDebounceCount = 0;
    this.hardStartPulse = 0;
    this.ignDelayTarget = this.faults.hardStart ? 0.135 : 0.072 + (this.runNumber % 3) * 0.008;

    this.recording = true;
    this.events = [];
    this.liveScope = [];
    this.currentRunData = {
      runNumber: this.runNumber,
      startedAtIso: new Date().toISOString(),
      scenarioId: this.activeScenarioId,
      keyPosAtStart: this.keyPos,
      settings: { ...this.settings },
      pAccGoxStart: this.pAccGox,
      pAccCh4Start: this.pAccCh4,
      samples: [], // 1 kHz PLC + NI sync records
      events: [],
      outcome: 'RUNNING',
      abortReason: '',
      noGoReason: '',
    };

    this._enterState(STATES.COUNTDOWN);
    this._logEvent(`RUN #${String(this.runNumber).padStart(4, '0')} STARTED (ARMED) — TwinCAT Scope + FlexLogger recording ON`);
    return { ok: true };
  }

  // ---- Core 1 ms PLC Scan + Physics Tick ----

  stepMs(count = 1) {
    for (let i = 0; i < count; i++) {
      this._tickOneMs();
    }
  }

  _tickOneMs() {
    const dt = 0.001;
    this.simTime += dt;
    this.plcCycle += 1;
    this.heartbeatPhase = (this.plcCycle % 500) < 250; // 2 Hz visual heartbeat

    // 1. Update hardware safety chain (no PLC involvement)
    this._updateHardwareChain();

    // 2. EtherCAT output watchdog check (Section 10.7: 20 ms timeout)
    if (this.hwFaults.etherCatPull) {
      this.etherCatDropTimer += 1;
      if (this.etherCatDropTimer >= ABORT_LIMITS.etherCatWatchdogMs && !this.etherCatWatchdogTripped) {
        this.etherCatWatchdogTripped = true;
        this._logEvent('EtherCAT output watchdog tripped (20 ms) — EL2024 outputs forced OFF');
        if (this._isRunningState()) {
          this._triggerAbort(null, 'EtherCAT cable fault — 20 ms output watchdog dropped all outputs');
        }
      }
    } else {
      this.etherCatDropTimer = 0;
      this.etherCatWatchdogTripped = false;
    }

    // 3. Read sensors (4-20 mA + Hall + V + TC)
    this._updateSensors(dt);

    // 4. Glow plug 100 ms moving average & 0.5 s power-window check (Section 7.5)
    const oldVal = this.gpPowerBuf[this.gpPowerIdx];
    this.gpPowerSum = this.gpPowerSum - oldVal + this.gpP;
    this.gpPowerBuf[this.gpPowerIdx] = this.gpP;
    this.gpPowerIdx = (this.gpPowerIdx + 1) % 100;
    this.gpPowerAvg = this.gpPowerSum / 100;

    if (this.state === STATES.GP_HEAT) {
      if (this.gpPowerAvg >= this.settings.pMin && this.gpPowerAvg <= this.settings.pMax && this.gpR > 0.3 && this.gpR < 15) {
        this.gpInRangeMs += 1;
      } else {
        this.gpInRangeMs = 0;
      }
    } else if (this.state === STATES.COUNTDOWN || this.state === STATES.READY || this.state === STATES.SAFE) {
      this.gpInRangeMs = 0;
    }

    // 5. Run PLC state machine & abort checks
    this._runStateMachine(dt);

    // 6. Run independent final-pass Output Interlock layer (Section 7.3)
    this._runOutputInterlocks();

    // 7. Step physical stand plant (solenoids, blowdown accumulators, combustion, thermal)
    this._stepPlantPhysics(dt);

    // 8. Record 1 kHz PLC + NI cDAQ streams while recording
    if (this.recording && this.currentRunData) {
      const tRun = this.simTime - this.runStartTime;
      const tRel = this.t0Time !== null ? this.simTime - this.t0Time : null;
      const syncPulse = (Math.floor(tRun * 1000) % 1000) < 50 ? 1 : 0; // 1 Hz, 50 ms EL2252 timestamped pulse

      // Record every 1 ms for true 1 kHz fidelity & exact P&ID scrubbing replay
      this.currentRunData.samples.push({
        t: tRun,
        tRel,
        state: this.state,
        pt101: this.plcP.pt101,
        pt201: this.plcP.pt201,
        pt102: this.plcP.pt102,
        pt202: this.plcP.pt202,
        pt301: this.plcP.pt301,
        pt301True: this.pChamber,
        pt301mA: this.mA.pt301,
        tc301: this.tBodySampled,
        gpV: this.gpV,
        gpI: this.gpI,
        gpP: this.gpP,
        gpPAvg: this.gpPowerAvg,
        sv201Cmd: this.outCmd.gox ? 1 : 0,
        sv101Cmd: this.outCmd.ch4 ? 1 : 0,
        gpCmd: this.outCmd.gp ? 1 : 0,
        gpOk: this.gpOkLatched ? 1 : 0,
        abort: this.abortLatched ? 1 : 0,
        sync: syncPulse,
        accelG: this.accelG,
        valveLiftGox: this.valveLiftGox,
        valveLiftCh4: this.valveLiftCh4,
        sv201Energized: this.sv201Energized,
        sv101Energized: this.sv101Energized,
        gpTempNorm: this.gpTempNorm,
        ignited: this.ignited,
        gpPowered: this.gpActuallyPowered,
        keyPos: this.keyPos,
        estopPressed: this.estopPressed,
        estopLatched: this.estopLatched,
        hw: { ...this.hw },
        hwFaults: { ...this.hwFaults },
        valveBusV: this.hw.valveBusVoltage,
      });
    }

    // 9. Decimated 100 Hz live strip-chart buffer (always running so screen feels alive)
    if (this.plcCycle % 10 === 0) {
      this.liveScope.push({
        t: this.recording ? this.simTime - this.runStartTime : this.simTime,
        tRel: this.t0Time !== null ? this.simTime - this.t0Time : null,
        pc: this.plcP.pt301,
        pox: this.plcP.pt202,
        pf: this.plcP.pt102,
        pAccGox: this.plcP.pt201,
        pAccCh4: this.plcP.pt101,
        gpP: this.gpPowerAvg,
        gpI: this.gpI,
        tBody: this.tBodySampled,
        state: this.state,
        sv201: this.outCmd.gox ? 1 : 0,
        sv101: this.outCmd.ch4 ? 1 : 0,
        gpCmd: this.outCmd.gp ? 1 : 0,
      });
      if (this.liveScope.length > this.maxLivePoints) {
        this.liveScope.shift();
      }
    }
  }

  _updateHardwareChain() {
    const safetyRelayOk = !this.estopPressed && !this.estopLatched;
    // SAFE: both off | ARMED: both 2-pole valve arming relay and glow plug contactor energized
    const gpContactorCoil = safetyRelayOk && this.keyPos === KEY_POS.ARMED;
    const armingRelayCoil = safetyRelayOk && this.keyPos === KEY_POS.ARMED;

    // 2-pole force-guided arming relay (Section 10.2 & 10.5)
    const contact1Closed = armingRelayCoil || this.hwFaults.weldedRelay; // +24 V side
    const contact2Closed = armingRelayCoil; // 0 V return side
    // Force-guided feedback NC contact CANNOT close if main contact 1 is welded!
    const safeFeedbackClosed = !armingRelayCoil && !this.hwFaults.weldedRelay;

    const valveBusVoltage = contact1Closed ? 24.0 : 0.0;
    const valveBusLive = contact1Closed && contact2Closed;
    const safeLampOn = safeFeedbackClosed;
    const armedLampOn = valveBusVoltage > 18.0;

    // PLC cross-check: key, relay feedback, and bus voltage must agree
    let plcRelayAgree = true;
    if (this.keyPos === KEY_POS.ARMED) {
      plcRelayAgree = !safeFeedbackClosed && armedLampOn;
    } else {
      plcRelayAgree = safeFeedbackClosed && !armedLampOn;
    }

    this.hw = {
      safetyRelayOk,
      gpContactorCoil,
      gpContactorClosed: gpContactorCoil,
      armingRelayCoil,
      contact1Closed,
      contact2Closed,
      safeFeedbackClosed,
      valveBusVoltage,
      valveBusLive,
      safeLampOn,
      armedLampOn,
      plcRelayAgree,
    };
  }

  _updateSensors(dt) {
    // Convert true bar -> 4-20 mA with tiny realistic noise
    const toMA = (val, fs, faultZero = false) => {
      if (faultZero) return 0.0;
      const noise = randn() * 0.008;
      return clamp(4.0 + (val / fs) * 16.0 + noise, 3.8, 20.3);
    };

    const wireBroken = this.faults.wireBreakPc && this.state === STATES.BURN && this.t0Time !== null && (this.simTime - this.t0Time) > 0.65;

    this.mA.pt101 = toMA(this.pAccCh4, 50.0);
    this.mA.pt201 = toMA(this.pAccGox, 50.0);
    this.mA.pt102 = toMA(this.pInjF, 50.0);
    this.mA.pt202 = toMA(this.pInjOx, 50.0);
    this.mA.pt301 = toMA(this.pChamber, 25.0, wireBroken);

    // PLC converts 4-20 mA back to engineering units
    const fromMA = (ma, fs) => Math.max(0, ((ma - 4.0) / 16.0) * fs);
    this.plcP.pt101 = fromMA(this.mA.pt101, 50.0);
    this.plcP.pt201 = fromMA(this.mA.pt201, 50.0);
    this.plcP.pt102 = fromMA(this.mA.pt102, 50.0);
    this.plcP.pt202 = fromMA(this.mA.pt202, 50.0);
    this.plcP.pt301 = fromMA(this.mA.pt301, 25.0);

    // TC-301 sampled every 150 ms (EL3314 mains-filtered conversion time, Section 8.1)
    this.tcSampleAccum += dt;
    if (this.tcSampleAccum >= 0.15) {
      this.tcSampleAccum = 0;
      this.tBodySampled = this.tBody + randn() * 0.15;
    }
  }

  _anySensorFault() {
    const vals = Object.values(this.mA);
    return vals.some((ma) => ma < ABORT_LIMITS.mALowFault || ma > ABORT_LIMITS.mAHighFault);
  }

  _runStateMachine(dt) {
    const elapsedInState = this.simTime - this.stateEntryTime;
    const countdownDur = this.fastMode ? 1.5 : 5.0;
    const postLogDur = this.fastMode ? 1.2 : 5.0;

    // Global Abort #8: Sensor wire fault (< 3.6 mA or > 21 mA) — Always active when running
    if (this._isRunningState() && this.state !== STATES.SHUTDOWN && this._anySensorFault()) {
      const badTag = this.mA.pt301 < ABORT_LIMITS.mALowFault ? 'PT-301 (Pc)' : 'Control PT';
      this._triggerAbort(8, `Abort #8: ${badTag} loop fault (${this.mA.pt301.toFixed(2)} mA < 3.6 mA — broken wire)`);
      return;
    }

    // Global Abort #7: Body over-temp or tank OOR when armed & running
    if (this._isRunningState() && this.state !== STATES.SHUTDOWN && this.tBodySampled > ABORT_LIMITS.tBodyMaxC) {
      this._triggerAbort(7, `Abort #7: Igniter body TC-301 over-temp (${this.tBodySampled.toFixed(1)} °C > 180 °C)`);
      return;
    }

    switch (this.state) {
      case STATES.SAFE:
      case STATES.READY:
        this.seqCmd = { gox: false, ch4: false, gp: false };
        this._evaluateReadyState();
        break;

      case STATES.COUNTDOWN:
        this.seqCmd = { gox: false, ch4: false, gp: false };
        if (elapsedInState >= countdownDur) {
          this._enterState(STATES.GP_HEAT);
          this._logEvent(`GP_HEAT started — Glow plug energized for t1 = ${this.settings.t1.toFixed(1)} s`);
        }
        break;

      case STATES.GP_HEAT:
        this.seqCmd = { gox: false, ch4: false, gp: true };
        // Abort #5: Fuel valve leak check during GP_HEAT
        if (this.plcP.pt102 > ABORT_LIMITS.leakRiseBar) {
          this._triggerAbort(5, `Abort #5: Pf rose to ${this.plcP.pt102.toFixed(1)} bar during GP_HEAT (CH4 valve leak)`);
          return;
        }
        if (elapsedInState >= this.settings.t1) {
          // Check glow plug power in [Pmin, Pmax] for full last 0.5 s (Section 7.5)
          if (this.gpInRangeMs >= ABORT_LIMITS.gpPowerWindowSec * 1000) {
            this.gpOkLatched = true;
            this.t0Time = this.simTime;
            this._logEvent(`T0: GP power latched OK (${this.gpPowerAvg.toFixed(1)} W in [${this.settings.pMin}, ${this.settings.pMax}] W)`);
            this._enterState(STATES.OX_OPEN);
            this._logEvent('OX_OPEN: SV-201 (GOX) commanded OPEN');
          } else {
            // Clean no-go (Section 7.5 & 12b) — valves NEVER commanded
            this.gpOkLatched = false;
            this.noGoReason = `GP power out of range at T0 (${this.gpPowerAvg.toFixed(1)} W vs [${this.settings.pMin}, ${this.settings.pMax}] W) — Clean No-Go`;
            if (this.currentRunData) {
              this.currentRunData.outcome = 'NO-GO';
              this.currentRunData.noGoReason = this.noGoReason;
            }
            this._logEvent(this.noGoReason);
            this._enterState(STATES.SHUTDOWN);
          }
        }
        break;

      case STATES.OX_OPEN:
        this.seqCmd = { gox: true, ch4: false, gp: true };
        // Abort #3: Over-pressure
        if (this.plcP.pt301 > ABORT_LIMITS.pCMaxBar) {
          this._triggerAbort(3, `Abort #3: Chamber over-pressure (${this.plcP.pt301.toFixed(1)} bar > 18.0 bar)`);
          return;
        }
        // Abort #5: Fuel leak before CH4 opens
        if (this.plcP.pt102 > ABORT_LIMITS.leakRiseBar) {
          this._triggerAbort(5, `Abort #5: Pf rose before CH4 valve command (fuel leak)`);
          return;
        }
        // Abort #6: Confirm GOX valve opened
        if (elapsedInState >= ABORT_LIMITS.valveConfirmDelaySec && this.plcP.pt202 < ABORT_LIMITS.valveConfirmBar) {
          this._triggerAbort(6, `Abort #6: Pox failed to rise (${this.plcP.pt202.toFixed(1)} bar) — SV-201 did not open`);
          return;
        }
        if (elapsedInState >= this.settings.t2 / 1000) {
          this.ch4CmdTime = this.simTime;
          this._enterState(STATES.IGN_WAIT);
          this._logEvent(`IGN_WAIT: SV-101 (CH4) commanded OPEN (0.250 s ignition window started)`);
        }
        break;

      case STATES.IGN_WAIT:
        this.seqCmd = { gox: true, ch4: true, gp: true };
        // Abort #3: Over-pressure (hard start)
        if (this.plcP.pt301 > ABORT_LIMITS.pCMaxBar) {
          this._triggerAbort(3, `Abort #3: Hard start over-pressure (Pc = ${this.plcP.pt301.toFixed(1)} bar > 18.0 bar)`);
          return;
        }
        // Ignition debounce: 5 consecutive 1 ms samples above P_ign (Section 7.4)
        if (this.plcP.pt301 > ABORT_LIMITS.pIgnBar) {
          this.ignDebounceCount += 1;
        } else {
          this.ignDebounceCount = 0;
        }

        if (this.ignDebounceCount >= ABORT_LIMITS.ignDebounceSamples) {
          this.ignDetectedTime = this.simTime;
          const ignMs = ((this.simTime - this.ch4CmdTime) * 1000).toFixed(0);
          this._logEvent(`IGNITION CONFIRMED: Pc > ${ABORT_LIMITS.pIgnBar} bar (5-sample debounce) in ${ignMs} ms`);
          this._enterState(STATES.BURN);
          return;
        }

        // Abort #1: Fixed 0.250 s ignition timeout (R5)
        if (elapsedInState >= ABORT_LIMITS.ignWindowSec) {
          this._triggerAbort(1, `Abort #1: No ignition within 0.250 s (Pc = ${this.plcP.pt301.toFixed(2)} bar < ${ABORT_LIMITS.pIgnBar} bar)`);
          return;
        }
        break;

      case STATES.BURN: {
        this.seqCmd = { gox: true, ch4: true, gp: true };
        // Abort #3: Over-pressure
        if (this.plcP.pt301 > ABORT_LIMITS.pCMaxBar) {
          this._triggerAbort(3, `Abort #3: Chamber over-pressure (Pc = ${this.plcP.pt301.toFixed(1)} bar > 18.0 bar)`);
          return;
        }
        // Abort #2: Flame-out
        if (this.plcP.pt301 < ABORT_LIMITS.pIgnBar) {
          this._triggerAbort(2, `Abort #2: Flame-out during burn (Pc dropped to ${this.plcP.pt301.toFixed(2)} bar < ${ABORT_LIMITS.pIgnBar} bar)`);
          return;
        }
        // Abort #4: Backflow margin (Pox - Pc and Pf - Pc), with 80 ms valve-opening blanking window
        if (elapsedInState >= 0.08 && ((this.plcP.pt202 - this.plcP.pt301) < ABORT_LIMITS.minDpInjBar || (this.plcP.pt102 - this.plcP.pt301) < ABORT_LIMITS.minDpInjBar)) {
          this._triggerAbort(4, `Abort #4: Low injector dP backflow margin (< 3.0 bar)`);
          return;
        }
        // t3 measured from T0 (GOX valve opening)
        if (this.t0Time !== null && (this.simTime - this.t0Time) >= this.settings.t3) {
          if (this.currentRunData) this.currentRunData.outcome = 'NOMINAL';
          this._logEvent(`SHUTDOWN: t3 (${this.settings.t3.toFixed(1)} s from T0) reached — closing valves & glow plug OFF`);
          this._enterState(STATES.SHUTDOWN);
        }
        break;
      }

      case STATES.SHUTDOWN:
        this.seqCmd = { gox: false, ch4: false, gp: false };
        if (elapsedInState >= postLogDur) {
          this._finalizeRecording();
          this.gpOkLatched = false;
          this.t0Time = null;
          this._evaluateReadyState();
        }
        break;

      case STATES.ABORT:
        this.seqCmd = { gox: false, ch4: false, gp: false };
        // Per Section 10.6: logging continues even after ABORT or E-STOP!
        if (this.recording && elapsedInState >= postLogDur) {
          this._finalizeRecording();
        }
        break;
    }
  }

  _runOutputInterlocks() {
    // Independent safety check run LAST in every 1 ms PLC cycle (Section 7.3)
    const noAbort = !this.abortLatched && this.hw.safetyRelayOk && !this.etherCatWatchdogTripped;
    const keyArmed = this.keyPos === KEY_POS.ARMED;

    const goxAllowed = this.seqCmd.gox && noAbort && keyArmed && this.gpOkLatched;
    const ch4Allowed = this.seqCmd.ch4 && noAbort && goxAllowed;
    const gpAllowed = this.seqCmd.gp && noAbort && keyArmed;

    this.interlocks = {
      gox: { seq: this.seqCmd.gox, noAbort, keyArmed, gpOk: this.gpOkLatched, allowed: goxAllowed },
      ch4: { seq: this.seqCmd.ch4, noAbort, keyArmed, gpOk: this.gpOkLatched, goxOpen: goxAllowed, allowed: ch4Allowed },
      gp:  { seq: this.seqCmd.gp, noAbort, keyArmed, allowed: gpAllowed },
    };

    this.outCmd = {
      gox: goxAllowed,
      ch4: ch4Allowed,
      gp: gpAllowed,
    };
  }

  _stepPlantPhysics(dt) {
    // --- Glow plug electrical & thermal (24 V nominal: 15 A / 360 W cold inrush -> 6.0 A / 144 W steady) ---
    const ssrConducting = (this.outCmd.gp && !this.etherCatWatchdogTripped) || this.hwFaults.shortedSsr;
    this.gpActuallyPowered = this.hw.gpContactorClosed && ssrConducting;

    const rCold = this.faults.gpLowPower ? 3.2 : 1.6;
    const rHot = this.faults.gpLowPower ? 9.0 : 4.0; // 24V^2 / 4.0 = 144 W nominal; 64 W degraded
    this.gpR = rCold + (rHot - rCold) * this.gpTempNorm;

    if (this.gpActuallyPowered) {
      this.gpV = this.settings.vGp + randn() * 0.03;
      this.gpI = clamp(this.gpV / this.gpR, 0, 20.0); // Programmable PSU current limit (20 A)
      this.gpP = this.gpV * this.gpI;
      this.gpTempNorm = clamp(this.gpTempNorm + (1 - this.gpTempNorm) * (dt / 0.55), 0, 1);
    } else {
      this.gpV = this.hw.gpContactorClosed ? this.settings.vGp * 0.0 : 0.0;
      this.gpI = 0.0;
      this.gpP = 0.0;
      this.gpTempNorm = clamp(this.gpTempNorm - this.gpTempNorm * (dt / 3.5), 0, 1);
    }

    // --- Solenoid valve actuation (hardware valve bus required!) ---
    this.sv201Energized = this.outCmd.gox && this.hw.valveBusLive && !this.etherCatWatchdogTripped;
    this.sv101Energized = this.outCmd.ch4 && this.hw.valveBusLive && !this.etherCatWatchdogTripped;

    // Realistic armature pull-in dead-time (15 ms / 19 ms) + spool stroke -> ~24 ms / ~28 ms measured opening (report: 10-50 ms)
    this.sv201EnergizeMs = this.sv201Energized ? Math.min(100, this.sv201EnergizeMs + 1) : 0;
    this.sv101EnergizeMs = this.sv101Energized ? Math.min(100, this.sv101EnergizeMs + 1) : 0;
    const goxRate = this.sv201EnergizeMs >= 15 ? (1 / 0.014) : (!this.sv201Energized ? -(1 / 0.018) : 0);
    const ch4Rate = this.sv101EnergizeMs >= 19 ? (1 / 0.015) : (!this.sv101Energized ? -(1 / 0.018) : 0);
    this.valveLiftGox = clamp(this.valveLiftGox + goxRate * dt, 0, 1);
    this.valveLiftCh4 = clamp(this.valveLiftCh4 + ch4Rate * dt, 0, 1);

    // --- Manual vents (HV-101 / HV-201) ---
    if (this.ventCh4Open && this.pAccCh4 > P_AMB) {
      this.pAccCh4 = Math.max(P_AMB, this.pAccCh4 - (this.pAccCh4 - P_AMB) * 1.4 * dt);
    }
    if (this.ventGoxOpen && this.pAccGox > P_AMB) {
      this.pAccGox = Math.max(P_AMB, this.pAccGox - (this.pAccGox - P_AMB) * 1.4 * dt);
    }

    // --- Blowdown flow & injection pressures ---
    const goxOpenFrac = this.valveLiftGox > 0.15 ? (this.valveLiftGox - 0.15) / 0.85 : 0;
    const ch4OpenFrac = this.valveLiftCh4 > 0.15 ? (this.valveLiftCh4 - 0.15) / 0.85 : 0;

    // Choked mass flow (kg/s) proportional to accumulator pressure
    const cGox = 0.00034; // ~15 g/s at 45 bar
    const cCh4 = 0.000105; // ~4.8 g/s at 45 bar -> O/F ~ 3.1
    this.mdotGox = goxOpenFrac * cGox * Math.max(0, this.pAccGox - this.pChamber);
    this.mdotCh4 = ch4OpenFrac * cCh4 * Math.max(0, this.pAccCh4 - this.pChamber);

    // Ideal-gas accumulator pressure drop: dP = -(mdot / M) * R * T / V * dt (bar = Pa / 1e5)
    const dPgox = (this.mdotGox / M_GOX) * R_UNIV * T_ACC / V_ACC / 1e5 * dt;
    const dPch4 = (this.mdotCh4 / M_CH4) * R_UNIV * T_ACC / V_ACC / 1e5 * dt;
    this.pAccGox = Math.max(P_AMB, this.pAccGox - dPgox);
    this.pAccCh4 = Math.max(P_AMB, this.pAccCh4 - dPch4);

    // Injection manifold pressures (PT-202, PT-102)
    const pOxTarget = goxOpenFrac > 0 ? this.pChamber + (this.pAccGox - this.pChamber) * 0.56 * goxOpenFrac : this.pChamber;
    const pFTarget = ch4OpenFrac > 0 ? this.pChamber + (this.pAccCh4 - this.pChamber) * 0.52 * ch4OpenFrac : this.pChamber;
    this.pInjOx += (pOxTarget - this.pInjOx) * (dt / 0.014);
    this.pInjF += (pFTarget - this.pInjF) * (dt / 0.014);

    // --- Ignition & Combustion ---
    const bothFlowing = goxOpenFrac > 0.4 && ch4OpenFrac > 0.4;
    if (bothFlowing && !this.ignited) {
      this.fuelMixTime += dt;
      const gpHotEnough = this.gpTempNorm > 0.55;
      if (gpHotEnough && !this.faults.noIgnition && this.fuelMixTime >= this.ignDelayTarget) {
        this.ignited = true;
        if (this.faults.hardStart) {
          this.hardStartPulse = 13.0; // Energetic hard-start spike > 18 bar
        }
      }
    } else if (!bothFlowing) {
      this.ignited = false;
      this.fuelMixTime = 0;
    }

    // Chamber pressure target (bulk filling + in-chamber acoustic combustion modes)
    let pCTarget = P_AMB;
    let acousticOsc = 0;
    if (this.ignited) {
      const supplyScale = clamp((this.pAccGox + this.pAccCh4) / 100.0, 0.35, 1.15);
      this.hardStartPulse *= Math.exp(-dt / 0.045);
      pCTarget = 12.2 * supplyScale + this.hardStartPulse;
      acousticOsc =
        0.16 * Math.sin(2 * Math.PI * 215 * this.simTime) +
        0.09 * Math.sin(2 * Math.PI * 430 * this.simTime + 1.1) +
        0.04 * randn();
    } else if (goxOpenFrac > 0.05 || ch4OpenFrac > 0.05) {
      // Unlit cold flow pressure (~1.4 - 1.95 bar)
      pCTarget = P_AMB + 0.55 * goxOpenFrac + 0.38 * ch4OpenFrac;
    }

    const pcTau = this.ignited ? 0.012 : 0.025;
    if (this._pChamberBulk === undefined) this._pChamberBulk = this.pChamber;
    this._pChamberBulk += (pCTarget - this._pChamberBulk) * (dt / pcTau);
    this.pChamber = Math.max(P_AMB, this._pChamberBulk + acousticOsc);

    // --- Thermal soak on igniter body (TC-301) ---
    if (this.ignited) {
      this.tBody += 26.0 * dt; // warms smoothly during 2 s burn (~75 °C peak)
    } else if (this.gpActuallyPowered) {
      this.tBody += 2.2 * dt;
    } else {
      this.tBody += (23.0 - this.tBody) * (dt / 18.0);
    }

    // --- IEPE Accelerometer signal (NI-9234, coupled to combustion acoustics + valve clicks) ---
    if (this.ignited) {
      this.accelG =
        2.8 * Math.sin(2 * Math.PI * 215 * this.simTime + 0.4) +
        1.9 * Math.sin(2 * Math.PI * 430 * this.simTime) +
        1.1 * Math.sin(2 * Math.PI * 680 * this.simTime) +
        0.9 * randn();
    } else {
      this.accelG = 0.08 * randn();
    }
  }

  _triggerAbort(ruleId, reason) {
    if (this.abortLatched && this.state === STATES.ABORT) return;
    this.abortLatched = true;
    this.abortRuleId = ruleId;
    this.abortReason = reason;
    this.seqCmd = { gox: false, ch4: false, gp: false };
    this.outCmd = { gox: false, ch4: false, gp: false };
    this._enterState(STATES.ABORT);
    if (this.currentRunData) {
      this.currentRunData.outcome = 'ABORT';
      this.currentRunData.abortReason = reason;
    }
    this._logEvent(`ABORT LATCHED: ${reason}`);
  }

  _enterState(nextState) {
    this.state = nextState;
    this.stateEntryTime = this.simTime;
  }

  _isRunningState() {
    return (
      this.state === STATES.COUNTDOWN ||
      this.state === STATES.GP_HEAT ||
      this.state === STATES.OX_OPEN ||
      this.state === STATES.IGN_WAIT ||
      this.state === STATES.BURN ||
      this.state === STATES.SHUTDOWN
    );
  }

  _evaluateReadyState() {
    if (this.abortLatched) {
      this.state = STATES.ABORT;
      return;
    }
    if (this.keyPos !== KEY_POS.SAFE && !this.getStartInhibitReason()) {
      this.state = STATES.READY;
    } else {
      this.state = STATES.SAFE;
    }
  }

  _logEvent(msg) {
    const tRun = this.recording ? this.simTime - this.runStartTime : null;
    const tRel = this.t0Time !== null ? this.simTime - this.t0Time : null;
    const entry = {
      wall: new Date().toISOString().split('T')[1].slice(0, 12),
      tRun: tRun !== null ? Number(tRun.toFixed(3)) : null,
      tRel: tRel !== null ? Number(tRel.toFixed(3)) : null,
      state: this.state,
      msg,
    };
    this.events.push(entry);
    if (this.currentRunData) {
      this.currentRunData.events.push(entry);
    }
  }

  _finalizeRecording() {
    if (!this.recording || !this.currentRunData) return;
    this.recording = false;
    this._logEvent('Logging stopped — post-processing started');
    this.currentRunData.pAccGoxEnd = this.pAccGox;
    this.currentRunData.pAccCh4End = this.pAccCh4;
    this.currentRunData.t0OffsetSec = this.t0Time !== null ? this.t0Time - this.runStartTime : null;
    this.currentRunData.ch4OffsetSec = this.ch4CmdTime !== null ? this.ch4CmdTime - this.runStartTime : null;
    this.currentRunData.ignOffsetSec = this.ignDetectedTime !== null ? this.ignDetectedTime - this.runStartTime : null;
    this.lastRunBundle = this.currentRunData;
    this.currentRunData = null;
    this.onRunComplete(this.lastRunBundle);
  }

  getSnapshot() {
    return {
      simTime: this.simTime,
      plcCycle: this.plcCycle,
      runNumber: this.runNumber,
      state: this.state,
      tRel: this.t0Time !== null ? this.simTime - this.t0Time : null,
      tRun: this.recording ? this.simTime - this.runStartTime : null,
      recording: this.recording,
      keyPos: this.keyPos,
      keyRemoved: this.keyRemoved,
      estopPressed: this.estopPressed,
      estopLatched: this.estopLatched,
      bottlesClosed: this.bottlesClosed,
      ventCh4Open: this.ventCh4Open,
      ventGoxOpen: this.ventGoxOpen,
      abortLatched: this.abortLatched,
      abortReason: this.abortReason,
      abortRuleId: this.abortRuleId,
      noGoReason: this.noGoReason,
      heartbeat: this.heartbeatPhase && !this.etherCatWatchdogTripped,
      hw: { ...this.hw },
      hwFaults: { ...this.hwFaults },
      interlocks: this.interlocks,
      outCmd: { ...this.outCmd },
      sv201Energized: this.sv201Energized,
      sv101Energized: this.sv101Energized,
      valveLiftGox: this.valveLiftGox,
      valveLiftCh4: this.valveLiftCh4,
      gpActuallyPowered: this.gpActuallyPowered,
      gpTempNorm: this.gpTempNorm,
      gpV: this.gpV,
      gpI: this.gpI,
      gpP: this.gpP,
      gpPAvg: this.gpPowerAvg,
      gpR: this.gpR,
      gpOkLatched: this.gpOkLatched,
      gpInRangeMs: this.gpInRangeMs,
      ignited: this.ignited,
      p: { ...this.plcP },
      mA: { ...this.mA },
      tBody: this.tBodySampled,
      settings: { ...this.settings },
      startInhibit: this.getStartInhibitReason(),
      isRunning: this._isRunningState(),
    };
  }
}
