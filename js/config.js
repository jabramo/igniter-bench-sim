// GOX / GCH4 Igniter Test Bench — System Constants & Report Metadata

export const COLORS = {
  accent: '#1F4E79',
  ctlFill: '#DCE9F7',
  daqFill: '#E2F2E2',
  safFill: '#FBE3D6',
  fldFill: '#F2F2F2',
  roomFill: '#FAFAFA',
  balloon: '#C0181F',
  green: '#1E7B34',
  red: '#B3261E',
  amber: '#B36B00',
  amberBg: '#FFF4C2',
  ink: '#1C2430',
  muted: '#5A6675',
  border: '#D1D9E2',
};

export const STATES = {
  SAFE: 'SAFE',
  READY: 'READY',
  COUNTDOWN: 'COUNTDOWN',
  GP_HEAT: 'GP_HEAT',
  OX_OPEN: 'OX_OPEN',
  IGN_WAIT: 'IGN_WAIT',
  BURN: 'BURN',
  SHUTDOWN: 'SHUTDOWN',
  ABORT: 'ABORT',
};

export const KEY_POS = {
  SAFE: 'SAFE',
  ARMED: 'ARMED',
};

// PLC-enforced HMI parameter bounds (Section 7.8 & Section 13)
export const PARAM_BOUNDS = {
  t1: { min: 1.0, max: 30.0, step: 0.5, unit: 's' },
  t2: { min: 0, max: 500, step: 10, unit: 'ms' },
  t3: { min: 0.1, max: 5.0, step: 0.1, unit: 's' },
  pMin: { min: 20, max: 190, step: 5, unit: 'W' },
  pMax: { min: 30, max: 200, step: 5, unit: 'W' },
  vGp: { min: 12.0, max: 24.0, step: 0.5, unit: 'V' },
};

export const DEFAULT_SETTINGS = {
  t1: 2.5,     // Crisp for 1-minute demo (report range 1-30 s)
  t2: 100,     // 100 ms GOX lead
  t3: 2.0,     // 2.0 s burn from T0
  pMin: 110,   // 110 W low limit
  pMax: 180,   // 180 W high limit
  vGp: 24.0,   // 24 V PSU-301 setpoint (~144 W steady)
};

// Controls-engineer protected abort limits (Section 7.6)
export const ABORT_LIMITS = {
  ignWindowSec: 0.250,         // Fixed per R5 (not HMI adjustable)
  ignDebounceSamples: 5,       // 5 consecutive 1 ms samples > P_ign
  pIgnBar: 3.5,                // Well above ~1.9 bar cold flow, below ~11 bar hot Pc
  pCMaxBar: 18.0,              // Hard start / blockage over-pressure
  minDpInjBar: 3.0,            // Backflow margin: Pox - Pc and Pf - Pc
  leakRiseBar: 2.2,            // Pf rise before CH4 opens
  valveConfirmBar: 4.0,        // Downstream P rise confirming valve open
  valveConfirmDelaySec: 0.085, // Confirmation timeout
  tankMinBar: 30.0,
  tankMaxBar: 52.0,
  tBodyMaxC: 180.0,
  mALowFault: 3.6,             // Broken 4-20 mA wire
  mAHighFault: 21.0,           // Shorted 4-20 mA loop
  gpPowerWindowSec: 0.5,       // Power in [Pmin, Pmax] for full last 0.5 s
  gpPowerAvgSec: 0.1,          // 100 ms moving average
  etherCatWatchdogMs: 20,
};

// 3 core 1-click scenarios covering the report's key requirements & test runs
export const SCENARIOS = [
  {
    id: 'nominal',
    short: 'Nominal Hot Fire',
    badge: 'Run 1',
    desc: 'GP heats to ~144 W (24 V), GOX leads CH4 by t2, ignition < 0.25 s, clean blowdown burn.',
    key: 'ARMED',
    faults: {},
  },
  {
    id: 'no_ignition',
    short: 'No Ignition (0.25 s)',
    badge: 'Run 3 · R5',
    desc: 'Unlit cold flow (~1.9 bar < 3.5 bar). PLC latches ABORT at exactly 0.250 s.',
    key: 'ARMED',
    faults: { noIgnition: true },
  },
  {
    id: 'gp_low',
    short: 'GP Power No-Go',
    badge: 'R6 Interlock',
    desc: 'Degraded glow plug draws ~64 W (< 110 W). Clean no-go — valves never open.',
    key: 'ARMED',
    faults: { gpLowPower: true },
  },
];

// Compact P&ID hover metadata (exact Table 1 from Section 2.1)
export const PID_ITEMS = {
  '1':   { tag: 'BOT-100', name: 'CH4 K-Bottle (200 bar)', sig: 'Manual · Closed pre-run', role: 'Closed before firing so a stuck valve can only release accumulator gas.' },
  '2':   { tag: 'PI-100',  name: 'CH4 Bottle Gauge', sig: 'Local 0–200 bar', role: 'Local Bourdon gauge upstream of regulator.' },
  '3':   { tag: 'PCV-100', name: 'CH4 Regulator', sig: 'Manual · Set 50 bar', role: 'Sets CH4 accumulator fill pressure.' },
  '4':   { tag: 'PI-101',  name: 'CH4 Acc Local Gauge', sig: 'Local 0–50 bar', role: 'Local analog readout on CH4 run accumulator.' },
  '5a':  { tag: 'HV-101',  name: 'CH4 Manual Vent', sig: 'Manual · Click to vent', role: 'Vents CH4 accumulator by hand after run (when SAFE).' },
  '5b':  { tag: 'ACC-101', name: 'CH4 Run Accumulator', sig: '1.0 L Blowdown', role: 'Holds all CH4 for one run; dP/dt gives post-run mass flow.' },
  '7':   { tag: 'PT-101',  name: 'CH4 Accumulator PT', sig: '4–20 mA · EL3058 (1 kHz)', role: 'Fill check, tank-range abort, post-run mass flow.' },
  '8':   { tag: 'SV-101',  name: 'CH4 Solenoid Valve', sig: '24 V DO NC · EL2024', role: 'Opens at T0 + t2. Powered only through armed valve bus.' },
  '9':   { tag: 'CV-101',  name: 'CH4 Check Valve', sig: 'Passive', role: 'Prevents backflow into CH4 feed line.' },
  '10':  { tag: 'PT-102',  name: 'Fuel Injection PT (Pf)', sig: '4–20 mA · 7.5 kHz splitter', role: 'PLC + NI DAQ via 7.5 kHz wideband splitter; confirms SV-101 opened, detects leak during GP_HEAT.' },
  '11':  { tag: 'TA-301',  name: 'Igniter Test Article', sig: 'GOX / GCH4 Chamber', role: 'Igniter chamber with exhaust, Pc tap, glow plug, and body TC.' },
  '12':  { tag: 'PT-301',  name: 'Chamber Pressure (Pc)', sig: '4–20 mA · 7.5 kHz splitter', role: '0–25 bar to PLC + NI DAQ via 7.5 kHz wideband splitter; ignition check (5 samples > 3.5 bar in 0.25 s), flame-out, over-pressure.' },
  '13':  { tag: 'GP-301',  name: 'Glow Plug', sig: '12–24 V DC · 20–200 W', role: 'Ignites mixture; body return requires isolated Hall sensor & TCs.' },
  '14':  { tag: 'PSU-301', name: 'Programmable GP Supply', sig: '9.6–26.4 V · PLC PV + Inhibit', role: 'Mean Well RSP-750-24 (1U) set from HMI via isolated PLC PV; constant-current inrush limiting & inhibit.' },
  '15':  { tag: 'IT-301',  name: 'Glow Plug Current Transducer', sig: '0–10 V · EL3174 (24 V)', role: 'DIN-rail DC current transducer (Phoenix MCR-S; wire passes through, 0–50 A → 0–10 V, 40 ms step); isolated from body return.' },
  '16':  { tag: 'ET-301',  name: 'Glow Plug Voltage (Kelvin)', sig: '4-wire Kelvin · 0–30 V → 0–10 V', role: '4-wire Kelvin sense at plug terminals via isolated 0–30 V → 0–10 V transducer into EL3174; P = V·I and R = V/I every 1 ms.' },
  '17':  { tag: 'JS-301',  name: 'GP Switch (SSR + Heatsink + Contactor)', sig: 'DO + Safety Chain', role: 'Heatsinked DC SSR for wear-free timing; mechanical contactor isolates if SSR shorts.' },
  '18':  { tag: 'PT-202',  name: 'GOX Injection PT (Pox)', sig: '4–20 mA · 7.5 kHz splitter', role: 'PLC + NI DAQ via 7.5 kHz wideband splitter; confirms SV-201 opened and verifies injector backflow margin.' },
  '19':  { tag: 'CV-201',  name: 'GOX Check Valve', sig: 'Passive', role: 'Prevents backflow into GOX feed line.' },
  '20':  { tag: 'SV-201',  name: 'GOX Solenoid Valve', sig: '24 V DO NC · EL2024', role: 'Opens at T0 when GP power latches OK and key is ARMED.' },
  '21':  { tag: 'PT-201',  name: 'GOX Accumulator PT', sig: '4–20 mA · EL3058 (1 kHz)', role: 'Fill check, tank-range abort, post-run GOX mass flow.' },
  '23a': { tag: 'HV-201',  name: 'GOX Manual Vent', sig: 'Manual · Click to vent', role: 'Vents GOX accumulator by hand after run (when SAFE).' },
  '23b': { tag: 'ACC-201', name: 'GOX Run Accumulator', sig: '1.0 L Blowdown', role: 'Holds all GOX for one run; dP/dt gives post-run mass flow.' },
  '24':  { tag: 'PI-201',  name: 'GOX Acc Local Gauge', sig: 'Local 0–50 bar', role: 'Local analog readout on GOX run accumulator.' },
  '25':  { tag: 'PCV-200', name: 'GOX Regulator', sig: 'Manual · Set 50 bar', role: 'Sets GOX accumulator fill pressure.' },
  '26':  { tag: 'PI-200',  name: 'GOX Bottle Gauge', sig: 'Local 0–200 bar', role: 'Local Bourdon gauge upstream of regulator.' },
  '27':  { tag: 'BOT-200', name: 'GOX K-Bottle (200 bar)', sig: 'Manual · Closed pre-run', role: 'Closed before firing (pre-run checklist item).' },
  'TC':  { tag: 'TC-301',  name: 'Igniter Body TC (Added)', sig: 'Type K · EL3314 (~150 ms)', role: 'Added per R10 for igniter body over-temperature abort (> 180 °C).' },
};
