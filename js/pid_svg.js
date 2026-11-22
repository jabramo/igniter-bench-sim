// Interactive P&ID SVG — Faithful 1:1 recreation of Figure 1 (pid_igniter_report.png)
import { PID_ITEMS } from './config.js';

function balloon(id, cx, cy, lx, ly) {
  const leader =
    lx !== undefined
      ? `<line x1="${cx}" y1="${cy}" x2="${lx}" y2="${ly}" stroke="#C0181F" stroke-width="1.2"/>`
      : '';
  const fontSize = String(id).length > 2 ? 8.5 : 9.5;
  return `
    <g class="pid-item" data-item="${id}">
      ${leader}
      <circle cx="${cx}" cy="${cy}" r="10.5" fill="#C0181F" stroke="#FFFFFF" stroke-width="1.2"/>
      <text x="${cx}" y="${cy + 3.4}" text-anchor="middle" fill="#FFFFFF" font-size="${fontSize}" font-weight="700">${id}</text>
    </g>
  `;
}

export function renderPidSvg(container) {
  container.innerHTML = `
  <div class="pid-stage">
    <svg id="pidSvg" viewBox="0 0 1120 462" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="GOX/GCH4 Igniter Test Bench P&ID">
      <defs>
        <linearGradient id="plumeOuter" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="#D9480F" stop-opacity="0.92"/>
          <stop offset="55%" stop-color="#F59F00" stop-opacity="0.72"/>
          <stop offset="100%" stop-color="#FFF3BF" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="plumeCore" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="#FFF9DB" stop-opacity="0.98"/>
          <stop offset="65%" stop-color="#FFD43B" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#FF922B" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="ch4Fill" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="#0D8A7B" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#0D8A7B" stop-opacity="0.08"/>
        </linearGradient>
        <linearGradient id="goxFill" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="#1F4E79" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#1F4E79" stop-opacity="0.08"/>
        </linearGradient>
        <clipPath id="clipAccCh4">
          <rect x="196" y="218" width="44" height="106" rx="14"/>
        </clipPath>
        <clipPath id="clipAccGox">
          <rect x="880" y="218" width="44" height="106" rx="14"/>
        </clipPath>
      </defs>

      <!-- Subtle side labels -->
      <text x="58" y="425" text-anchor="middle" class="pid-bold">CH₄ K-bottle</text>
      <text x="58" y="439" text-anchor="middle" class="pid-sub" id="lblBottleCh4">CLOSED (Safe)</text>
      <text x="1062" y="425" text-anchor="middle" class="pid-bold">GOX K-bottle</text>
      <text x="1062" y="439" text-anchor="middle" class="pid-sub" id="lblBottleGox">CLOSED (Safe)</text>

      <!-- ========== LEFT LEG: CH4 SUPPLY & FEED ========== -->
      <!-- Main piping -->
      <path d="M 58 214 L 58 175 L 492 175" fill="none" stroke="#243040" stroke-width="2.4" stroke-linejoin="round"/>
      <!-- Animated CH4 flow overlay (upstream of valve to chamber) -->
      <line id="flowCh4" x1="298" y1="175" x2="492" y2="175" stroke="#0D8A7B" stroke-width="4" stroke-dasharray="9 6" opacity="0" class="flow-right"/>
      <!-- Vent & Accumulator tee -->
      <line x1="218" y1="108" x2="218" y2="218" stroke="#243040" stroke-width="2.2"/>
      <!-- Animated CH4 vent plume -->
      <line id="flowVentCh4" x1="218" y1="120" x2="218" y2="88" stroke="#0D8A7B" stroke-width="3.5" stroke-dasharray="5 4" opacity="0"/>

      <!-- (1) CH4 K-bottle -->
      <g class="pid-item" data-item="1">
        <rect x="34" y="222" width="48" height="184" rx="18" fill="#F8FAFC" stroke="#243040" stroke-width="2"/>
        <rect x="49" y="212" width="18" height="12" rx="2" fill="#E2E8F0" stroke="#243040" stroke-width="1.6"/>
        <text x="58" y="312" text-anchor="middle" class="pid-mono-sm" fill="#5A6675">200 bar</text>
        <rect x="42" y="324" width="32" height="15" rx="3" id="badgeBottleCh4" fill="#E2F2E2" stroke="#1E7B34" stroke-width="1"/>
        <text x="58" y="335" text-anchor="middle" font-size="8.5" font-weight="700" id="txtBottleCh4" fill="#1E7B34">SHUT</text>
      </g>

      <!-- (2) PI 200 bar -->
      <line x1="58" y1="175" x2="58" y2="132" stroke="#243040" stroke-width="1.6"/>
      <g class="pid-item" data-item="2">
        <circle cx="58" cy="112" r="20" fill="#FFFFFF" stroke="#243040" stroke-width="1.6"/>
        <text x="58" y="109" text-anchor="middle" class="pid-inst">PI</text>
        <text x="58" y="121" text-anchor="middle" class="pid-inst-sub">200 bar</text>
      </g>

      <!-- (3) Regulator PCV-100 -->
      <g class="pid-item" data-item="3">
        <polygon points="102,165 120,175 102,185" fill="#FFFFFF" stroke="#243040" stroke-width="1.8"/>
        <polygon points="138,165 120,175 138,185" fill="#FFFFFF" stroke="#243040" stroke-width="1.8"/>
        <line x1="120" y1="175" x2="120" y2="156" stroke="#243040" stroke-width="1.6"/>
        <path d="M 109 156 A 11 11 0 0 1 131 156 Z" fill="#FFFFFF" stroke="#243040" stroke-width="1.6"/>
        <text x="120" y="199" text-anchor="middle" class="pid-tag">PCV-100</text>
      </g>

      <!-- (4) PI 50 bar -->
      <line x1="172" y1="175" x2="172" y2="132" stroke="#243040" stroke-width="1.6"/>
      <g class="pid-item" data-item="4">
        <circle cx="172" cy="112" r="20" fill="#FFFFFF" stroke="#243040" stroke-width="1.6"/>
        <text x="172" y="109" text-anchor="middle" class="pid-inst">PI</text>
        <text x="172" y="121" text-anchor="middle" class="pid-inst-sub">50 bar</text>
      </g>

      <!-- (5a) Manual Vent HV-101 -->
      <g class="pid-item" data-item="5a">
        <polygon id="symVentCh4A" points="209,122 218,136 227,122" fill="#FFFFFF" stroke="#243040" stroke-width="1.7"/>
        <polygon id="symVentCh4B" points="209,150 218,136 227,150" fill="#FFFFFF" stroke="#243040" stroke-width="1.7"/>
        <line x1="218" y1="136" x2="200" y2="136" stroke="#243040" stroke-width="1.7"/>
        <line x1="200" y1="128" x2="200" y2="144" stroke="#243040" stroke-width="2"/>
        <polygon points="214,109 218,100 222,109" fill="#243040"/>
        <text x="218" y="90" text-anchor="middle" class="pid-italic">vent</text>
      </g>

      <!-- (5b) CH4 Run Accumulator ACC-101 -->
      <g class="pid-item" data-item="5b">
        <rect x="196" y="218" width="44" height="106" rx="14" fill="#FFFFFF" stroke="#243040" stroke-width="2"/>
        <rect id="accCh4Level" x="196" y="218" width="44" height="106" fill="url(#ch4Fill)" clip-path="url(#clipAccCh4)"/>
        <text x="218" y="274" text-anchor="middle" class="pid-mono-bold" id="txtAccCh4">50.0</text>
        <text x="218" y="287" text-anchor="middle" class="pid-unit">bar</text>
        <text x="218" y="340" text-anchor="middle" class="pid-tag">ACC-101</text>
        <text x="218" y="352" text-anchor="middle" class="pid-sub">CH₄ Accumulator</text>
      </g>

      <!-- (7) PT-101 (CH4 Acc Pressure) -->
      <line x1="264" y1="175" x2="264" y2="132" stroke="#243040" stroke-width="1.6"/>
      <g class="pid-item" data-item="7">
        <circle cx="264" cy="112" r="20" fill="#DCE9F7" stroke="#1F4E79" stroke-width="1.7"/>
        <text x="264" y="109" text-anchor="middle" class="pid-inst" fill="#1F4E79">PT</text>
        <text x="264" y="121" text-anchor="middle" class="pid-inst-sub" fill="#1F4E79">101</text>
        <rect x="236" y="64" width="56" height="22" rx="4" fill="#FFFFFF" stroke="#1F4E79" stroke-width="1.2"/>
        <text x="264" y="79" text-anchor="middle" class="pid-readout" id="valPt101">50.0 bar</text>
      </g>

      <!-- (8) SV-101 Fuel Solenoid Valve -->
      <g class="pid-item" data-item="8">
        <polygon id="sv101TriL" points="298,165 316,175 298,185" fill="#FFFFFF" stroke="#243040" stroke-width="1.9"/>
        <polygon id="sv101TriR" points="334,165 316,175 334,185" fill="#FFFFFF" stroke="#243040" stroke-width="1.9"/>
        <line x1="316" y1="175" x2="316" y2="152" stroke="#243040" stroke-width="1.8"/>
        <rect id="sv101Coil" x="305" y="131" width="22" height="21" rx="2" fill="#FFFFFF" stroke="#243040" stroke-width="1.8"/>
        <text id="sv101Letter" x="316" y="146" text-anchor="middle" font-size="11" font-weight="700" fill="#243040">S</text>
        <text x="316" y="201" text-anchor="middle" class="pid-bold-sm">Fuel valve</text>
        <text x="316" y="213" text-anchor="middle" class="pid-tag">SV-101 (NC)</text>
      </g>

      <!-- (9) CV-101 Check Valve -->
      <g class="pid-item" data-item="9">
        <polygon points="358,166 376,175 358,184" fill="#FFFFFF" stroke="#243040" stroke-width="1.8"/>
        <line x1="376" y1="165" x2="376" y2="185" stroke="#243040" stroke-width="2.2"/>
      </g>

      <!-- (10) PT-102 Fuel Injection Pressure Pf -->
      <line x1="418" y1="175" x2="418" y2="132" stroke="#243040" stroke-width="1.6"/>
      <g class="pid-item" data-item="10">
        <circle cx="418" cy="112" r="20" fill="#DCE9F7" stroke="#1F4E79" stroke-width="1.7"/>
        <text x="418" y="109" text-anchor="middle" class="pid-inst" fill="#1F4E79">PT</text>
        <text x="418" y="121" text-anchor="middle" class="pid-inst-sub" fill="#1F4E79">Pf</text>
        <rect x="388" y="64" width="60" height="22" rx="4" fill="#FFFFFF" stroke="#1F4E79" stroke-width="1.2"/>
        <text x="418" y="79" text-anchor="middle" class="pid-readout" id="valPt102">1.0 bar</text>
      </g>

      <!-- ========== CENTER: TEST ARTICLE (11), CHAMBER, EXHAUST, Pc (12), GP (13), TC-301 ========== -->
      <!-- Dashed Test Article Enclosure -->
      <rect x="462" y="34" width="196" height="240" fill="#FAFBFD" stroke="#8C99A8" stroke-width="1.4" stroke-dasharray="6 4" rx="4"/>
      <text x="472" y="51" text-anchor="start" class="pid-bold-sm" fill="#1F4E79">Test article</text>

      <!-- Exhaust Plume (only visible when ignited) -->
      <g id="exhaustPlume" opacity="0">
        <path d="M 546 76 Q 540 32 560 6 Q 580 32 574 76 Z" fill="url(#plumeOuter)"/>
        <path d="M 552 76 Q 549 44 560 22 Q 571 44 568 76 Z" fill="url(#plumeCore)"/>
      </g>

      <!-- Chamber & Exhaust Stack -->
      <path id="chamberBody" d="M 492 146 L 540 146 L 540 74 L 580 74 L 580 146 L 628 146 L 628 206 L 492 206 Z" fill="#FFFFFF" stroke="#243040" stroke-width="2.2" stroke-linejoin="round"/>
      <!-- Chamber internal glow when ignited -->
      <rect id="chamberGlow" x="494" y="148" width="132" height="56" fill="#FF922B" opacity="0"/>
      <text x="560" y="99" text-anchor="middle" class="pid-italic" font-size="9">exhaust</text>
      <text x="560" y="111" text-anchor="middle" class="pid-italic" font-size="10">↑</text>
      <text x="560" y="172" text-anchor="middle" class="pid-mono-lg" id="txtChamberPc">1.0 bar</text>
      <text x="560" y="187" text-anchor="middle" class="pid-sub" id="txtChamberState">COLD / AMBIENT</text>

      <!-- (12) PT-301 Chamber Pressure Pc tap -->
      <path d="M 628 158 L 642 158 L 642 64 L 680 64 L 680 56" fill="none" stroke="#243040" stroke-width="1.6"/>
      <g class="pid-item" data-item="12">
        <circle id="pt301Circle" cx="680" cy="36" r="20" fill="#DCE9F7" stroke="#1F4E79" stroke-width="1.8"/>
        <text x="680" y="33" text-anchor="middle" class="pid-inst" fill="#1F4E79">PT</text>
        <text x="680" y="45" text-anchor="middle" class="pid-inst-sub" fill="#1F4E79">Pc</text>
        <rect id="pt301Box" x="708" y="21" width="76" height="30" rx="4" fill="#FFFFFF" stroke="#1F4E79" stroke-width="1.4"/>
        <text x="746" y="35" text-anchor="middle" class="pid-readout-lg" id="valPt301">1.01 bar</text>
        <text x="746" y="46" text-anchor="middle" class="pid-ma" id="maPt301">4.65 mA</text>
      </g>

      <!-- Added TC-301 Body Thermocouple -->
      <path d="M 612 206 L 612 232 L 640 232" fill="none" stroke="#1E7B34" stroke-width="1.6"/>
      <g class="pid-item" data-item="TC">
        <rect x="640" y="219" width="70" height="26" rx="4" fill="#E2F2E2" stroke="#1E7B34" stroke-width="1.4"/>
        <text x="675" y="230" text-anchor="middle" font-size="8.5" font-weight="700" fill="#1E7B34">TC-301</text>
        <text x="675" y="241" text-anchor="middle" class="pid-readout" id="valTc301" fill="#1C2430">23.0 °C</text>
      </g>

      <!-- (13) Glow Plug GP-301 -->
      <g class="pid-item" data-item="13">
        <!-- Hot glow tip protruding into chamber -->
        <rect id="gpTip" x="554" y="196" width="12" height="12" rx="3" fill="#CBD5E1" stroke="#243040" stroke-width="1.4"/>
        <rect id="gpBody" x="548" y="206" width="24" height="26" rx="2" fill="#FFF4C2" stroke="#B36B00" stroke-width="1.8"/>
        <text x="560" y="223" text-anchor="middle" font-size="10" font-weight="700" fill="#1C2430">GP</text>
        <text x="598" y="222" class="pid-sub" text-anchor="start">Glow plug</text>
      </g>

      <!-- ========== BOTTOM: GLOW PLUG ELECTRICAL CIRCUIT (14, 15, 16, 17) ========== -->
      <!-- Circuit wires -->
      <path id="gpWireL" d="M 554 232 L 554 282 L 452 282 L 452 406 L 512 406" fill="none" stroke="#243040" stroke-width="2"/>
      <path id="gpWireR1" d="M 566 232 L 566 282 L 668 282 L 668 318" fill="none" stroke="#243040" stroke-width="2"/>
      <path id="gpWireR2" d="M 668 360 L 668 406 L 608 406" fill="none" stroke="#243040" stroke-width="2"/>
      <!-- Voltmeter tap -->
      <path d="M 526 382 L 526 356 L 594 356 L 594 382" fill="none" stroke="#243040" stroke-width="1.5"/>

      <!-- (15) Ammeter / Hall Current Sensor IT-301 -->
      <g class="pid-item" data-item="15">
        <circle cx="452" cy="340" r="18" fill="#DCE9F7" stroke="#1F4E79" stroke-width="1.7"/>
        <text x="452" y="344" text-anchor="middle" font-size="12" font-weight="700" fill="#1F4E79">A</text>
        <rect x="372" y="328" width="56" height="24" rx="4" fill="#FFFFFF" stroke="#1F4E79" stroke-width="1.2"/>
        <text x="400" y="344" text-anchor="middle" class="pid-readout" id="valGpI">0.0 A</text>
      </g>

      <!-- (16) Voltmeter ET-301 -->
      <g class="pid-item" data-item="16">
        <circle cx="560" cy="356" r="16" fill="#DCE9F7" stroke="#1F4E79" stroke-width="1.7"/>
        <text x="560" y="360" text-anchor="middle" font-size="11.5" font-weight="700" fill="#1F4E79">V</text>
        <text x="560" y="334" text-anchor="middle" class="pid-readout" id="valGpV">0.0 V</text>
      </g>

      <!-- (14) Programmable DC Power Supply PSU-301 -->
      <g class="pid-item" data-item="14">
        <rect x="506" y="382" width="108" height="48" rx="4" fill="#FFFFFF" stroke="#243040" stroke-width="1.9"/>
        <text x="560" y="399" text-anchor="middle" class="pid-bold-sm">DC Power Supply</text>
        <text x="560" y="413" text-anchor="middle" class="pid-mono-bold" id="valGpP" fill="#1F4E79">0.0 W</text>
        <text x="560" y="425" text-anchor="middle" class="pid-sub" id="valGpGate">Gate: 110–180 W</text>
      </g>

      <!-- (17) Switch / Relay JS-301 (Contactor + DC SSR) -->
      <g class="pid-item" data-item="17">
        <circle cx="668" cy="318" r="3.5" fill="#FFFFFF" stroke="#243040" stroke-width="1.8"/>
        <circle cx="668" cy="360" r="3.5" fill="#FFFFFF" stroke="#243040" stroke-width="1.8"/>
        <line id="gpSwitchBlade" x1="668" y1="360" x2="684" y2="322" stroke="#243040" stroke-width="2.4" stroke-linecap="round"/>
        <text x="692" y="335" class="pid-bold-sm">SSR + Contactor</text>
        <text x="692" y="348" class="pid-sub" id="txtGpSwitch">OPEN (Isolated)</text>
      </g>

      <!-- ========== RIGHT LEG: GOX SUPPLY & FEED ========== -->
      <!-- Main piping -->
      <path d="M 1062 214 L 1062 175 L 628 175" fill="none" stroke="#243040" stroke-width="2.4" stroke-linejoin="round"/>
      <!-- Animated GOX flow overlay -->
      <line id="flowGox" x1="822" y1="175" x2="628" y2="175" stroke="#1E64A8" stroke-width="4" stroke-dasharray="9 6" opacity="0" class="flow-left"/>
      <!-- Vent & Accumulator tee -->
      <line x1="902" y1="108" x2="902" y2="218" stroke="#243040" stroke-width="2.2"/>
      <!-- Animated GOX vent plume -->
      <line id="flowVentGox" x1="902" y1="120" x2="902" y2="88" stroke="#1E64A8" stroke-width="3.5" stroke-dasharray="5 4" opacity="0"/>

      <!-- (18) PT-202 Oxygen Injection Pressure Pox -->
      <line x1="702" y1="175" x2="702" y2="132" stroke="#243040" stroke-width="1.6"/>
      <g class="pid-item" data-item="18">
        <circle cx="702" cy="112" r="20" fill="#DCE9F7" stroke="#1F4E79" stroke-width="1.7"/>
        <text x="702" y="109" text-anchor="middle" class="pid-inst" fill="#1F4E79">PT</text>
        <text x="702" y="121" text-anchor="middle" class="pid-inst-sub" fill="#1F4E79">Pox</text>
        <rect x="672" y="64" width="60" height="22" rx="4" fill="#FFFFFF" stroke="#1F4E79" stroke-width="1.2"/>
        <text x="702" y="79" text-anchor="middle" class="pid-readout" id="valPt202">1.0 bar</text>
      </g>

      <!-- (19) CV-201 Check Valve -->
      <g class="pid-item" data-item="19">
        <polygon points="762,166 744,175 762,184" fill="#FFFFFF" stroke="#243040" stroke-width="1.8"/>
        <line x1="744" y1="165" x2="744" y2="185" stroke="#243040" stroke-width="2.2"/>
      </g>

      <!-- (20) SV-201 Oxygen Solenoid Valve -->
      <g class="pid-item" data-item="20">
        <polygon id="sv201TriL" points="786,165 804,175 786,185" fill="#FFFFFF" stroke="#243040" stroke-width="1.9"/>
        <polygon id="sv201TriR" points="822,165 804,175 822,185" fill="#FFFFFF" stroke="#243040" stroke-width="1.9"/>
        <line x1="804" y1="175" x2="804" y2="152" stroke="#243040" stroke-width="1.8"/>
        <rect id="sv201Coil" x="793" y="131" width="22" height="21" rx="2" fill="#FFFFFF" stroke="#243040" stroke-width="1.8"/>
        <text id="sv201Letter" x="804" y="146" text-anchor="middle" font-size="11" font-weight="700" fill="#243040">S</text>
        <text x="804" y="201" text-anchor="middle" class="pid-bold-sm">Oxygen valve</text>
        <text x="804" y="213" text-anchor="middle" class="pid-tag">SV-201 (NC)</text>
      </g>

      <!-- (21) PT-201 (GOX Acc Pressure) -->
      <line x1="856" y1="175" x2="856" y2="132" stroke="#243040" stroke-width="1.6"/>
      <g class="pid-item" data-item="21">
        <circle cx="856" cy="112" r="20" fill="#DCE9F7" stroke="#1F4E79" stroke-width="1.7"/>
        <text x="856" y="109" text-anchor="middle" class="pid-inst" fill="#1F4E79">PT</text>
        <text x="856" y="121" text-anchor="middle" class="pid-inst-sub" fill="#1F4E79">201</text>
        <rect x="828" y="64" width="56" height="22" rx="4" fill="#FFFFFF" stroke="#1F4E79" stroke-width="1.2"/>
        <text x="856" y="79" text-anchor="middle" class="pid-readout" id="valPt201">50.0 bar</text>
      </g>

      <!-- (23a) Manual Vent HV-201 -->
      <g class="pid-item" data-item="23a">
        <polygon id="symVentGoxA" points="893,122 902,136 911,122" fill="#FFFFFF" stroke="#243040" stroke-width="1.7"/>
        <polygon id="symVentGoxB" points="893,150 902,136 911,150" fill="#FFFFFF" stroke="#243040" stroke-width="1.7"/>
        <line x1="902" y1="136" x2="884" y2="136" stroke="#243040" stroke-width="1.7"/>
        <line x1="884" y1="128" x2="884" y2="144" stroke="#243040" stroke-width="2"/>
        <polygon points="898,109 902,100 906,109" fill="#243040"/>
        <text x="902" y="90" text-anchor="middle" class="pid-italic">vent</text>
      </g>

      <!-- (23b) GOX Run Accumulator ACC-201 -->
      <g class="pid-item" data-item="23b">
        <rect x="880" y="218" width="44" height="106" rx="14" fill="#FFFFFF" stroke="#243040" stroke-width="2"/>
        <rect id="accGoxLevel" x="880" y="218" width="44" height="106" fill="url(#goxFill)" clip-path="url(#clipAccGox)"/>
        <text x="902" y="274" text-anchor="middle" class="pid-mono-bold" id="txtAccGox">50.0</text>
        <text x="902" y="287" text-anchor="middle" class="pid-unit">bar</text>
        <text x="902" y="340" text-anchor="middle" class="pid-tag">ACC-201</text>
        <text x="902" y="352" text-anchor="middle" class="pid-sub">GOX Accumulator</text>
      </g>

      <!-- (24) PI 50 bar -->
      <line x1="948" y1="175" x2="948" y2="132" stroke="#243040" stroke-width="1.6"/>
      <g class="pid-item" data-item="24">
        <circle cx="948" cy="112" r="20" fill="#FFFFFF" stroke="#243040" stroke-width="1.6"/>
        <text x="948" y="109" text-anchor="middle" class="pid-inst">PI</text>
        <text x="948" y="121" text-anchor="middle" class="pid-inst-sub">50 bar</text>
      </g>

      <!-- (25) Regulator PCV-200 -->
      <g class="pid-item" data-item="25">
        <polygon points="982,165 1000,175 982,185" fill="#FFFFFF" stroke="#243040" stroke-width="1.8"/>
        <polygon points="1018,165 1000,175 1018,185" fill="#FFFFFF" stroke="#243040" stroke-width="1.8"/>
        <line x1="1000" y1="175" x2="1000" y2="156" stroke="#243040" stroke-width="1.6"/>
        <path d="M 989 156 A 11 11 0 0 1 1011 156 Z" fill="#FFFFFF" stroke="#243040" stroke-width="1.6"/>
        <text x="1000" y="199" text-anchor="middle" class="pid-tag">PCV-200</text>
      </g>

      <!-- (26) PI 200 bar -->
      <line x1="1062" y1="175" x2="1062" y2="132" stroke="#243040" stroke-width="1.6"/>
      <g class="pid-item" data-item="26">
        <circle cx="1062" cy="112" r="20" fill="#FFFFFF" stroke="#243040" stroke-width="1.6"/>
        <text x="1062" y="109" text-anchor="middle" class="pid-inst">PI</text>
        <text x="1062" y="121" text-anchor="middle" class="pid-inst-sub">200 bar</text>
      </g>

      <!-- (27) GOX K-bottle -->
      <g class="pid-item" data-item="27">
        <rect x="1038" y="222" width="48" height="184" rx="18" fill="#F8FAFC" stroke="#243040" stroke-width="2"/>
        <rect x="1053" y="212" width="18" height="12" rx="2" fill="#E2E8F0" stroke="#243040" stroke-width="1.6"/>
        <text x="1062" y="312" text-anchor="middle" class="pid-mono-sm" fill="#5A6675">200 bar</text>
        <rect x="1046" y="324" width="32" height="15" rx="3" id="badgeBottleGox" fill="#E2F2E2" stroke="#1E7B34" stroke-width="1"/>
        <text x="1062" y="335" text-anchor="middle" font-size="8.5" font-weight="700" id="txtBottleGox" fill="#1E7B34">SHUT</text>
      </g>

      <!-- ========== REPORT ITEM BALLOONS (1-27 + TC) ========== -->
      ${balloon('1', 16, 304, 34, 304)}
      ${balloon('2', 26, 86, 44, 98)}
      ${balloon('3', 102, 138, 114, 148)}
      ${balloon('4', 142, 86, 158, 98)}
      ${balloon('5a', 202, 54, 214, 122)}
      ${balloon('5b', 256, 268, 240, 268)}
      ${balloon('7', 292, 92, 280, 102)}
      ${balloon('8', 340, 124, 326, 134)}
      ${balloon('9', 367, 210, 367, 185)}
      ${balloon('10', 446, 92, 434, 102)}
      ${balloon('11', 456, 24, 466, 36)}
      ${balloon('12', 652, 18, 666, 26)}
      ${balloon('13', 524, 244, 548, 224)}
      ${balloon('14', 502, 452, 524, 430)}
      ${balloon('15', 426, 312, 439, 327)}
      ${balloon('16', 592, 344, 575, 352)}
      ${balloon('17', 698, 306, 678, 328)}
      ${balloon('18', 734, 92, 720, 102)}
      ${balloon('19', 753, 210, 753, 185)}
      ${balloon('20', 830, 124, 815, 134)}
      ${balloon('21', 886, 92, 872, 102)}
      ${balloon('23a', 918, 54, 906, 122)}
      ${balloon('23b', 862, 268, 880, 268)}
      ${balloon('24', 978, 86, 962, 98)}
      ${balloon('25', 1018, 138, 1006, 148)}
      ${balloon('26', 1094, 86, 1076, 98)}
      ${balloon('27', 1104, 304, 1086, 304)}
      ${balloon('TC', 724, 232, 710, 232)}
    </svg>
    <div id="pidTooltip" class="pid-tooltip hidden"></div>
  </div>
  `;

  // Hover tooltips for every P&ID item
  const tooltip = container.querySelector('#pidTooltip');
  const stage = container.querySelector('.pid-stage');
  container.querySelectorAll('.pid-item').forEach((el) => {
    el.addEventListener('mouseenter', (ev) => {
      const id = el.getAttribute('data-item');
      const info = PID_ITEMS[id];
      if (!info) return;
      tooltip.innerHTML = `
        <div class="tt-head">
          <span class="tt-balloon">${id}</span>
          <strong>${info.tag}</strong>
          <span class="tt-sig">${info.sig}</span>
        </div>
        <div class="tt-name">${info.name}</div>
        <div class="tt-role">${info.role}</div>
      `;
      tooltip.classList.remove('hidden');
      positionTooltip(ev);
    });
    el.addEventListener('mousemove', positionTooltip);
    el.addEventListener('mouseleave', () => tooltip.classList.add('hidden'));
  });

  function positionTooltip(ev) {
    const rect = stage.getBoundingClientRect();
    let x = ev.clientX - rect.left + 14;
    let y = ev.clientY - rect.top + 14;
    if (x + 280 > rect.width) x = ev.clientX - rect.left - 286;
    if (y + 110 > rect.height) y = ev.clientY - rect.top - 115;
    tooltip.style.left = `${Math.max(8, x)}px`;
    tooltip.style.top = `${Math.max(8, y)}px`;
  }
}

export function updatePidSvg(snap) {
  const $ = (id) => document.getElementById(id);
  if (!$('pidSvg')) return;

  // Pressures & TC
  $('valPt101').textContent = `${snap.p.pt101.toFixed(1)} bar`;
  $('valPt201').textContent = `${snap.p.pt201.toFixed(1)} bar`;
  $('valPt102').textContent = `${snap.p.pt102.toFixed(1)} bar`;
  $('valPt202').textContent = `${snap.p.pt202.toFixed(1)} bar`;
  $('valPt301').textContent = `${snap.p.pt301.toFixed(2)} bar`;
  $('maPt301').textContent = `${snap.mA.pt301.toFixed(2)} mA`;
  $('txtChamberPc').textContent = `${snap.p.pt301.toFixed(1)} bar`;
  $('valTc301').textContent = `${snap.tBody.toFixed(1)} °C`;
  $('txtAccCh4').textContent = snap.p.pt101.toFixed(1);
  $('txtAccGox').textContent = snap.p.pt201.toFixed(1);

  // PT-301 alert coloring (wire break or over-pressure)
  const pcFault = snap.mA.pt301 < 3.6 || snap.p.pt301 > 18.0;
  $('pt301Box').setAttribute('stroke', pcFault ? '#B3261E' : '#1F4E79');
  $('pt301Box').setAttribute('fill', pcFault ? '#FDECEC' : '#FFFFFF');
  $('maPt301').setAttribute('fill', pcFault ? '#B3261E' : '#5A6675');

  // Accumulator fill level rectangles (height 106px mapped to 0..50 bar)
  const setFill = (id, p) => {
    const frac = Math.max(0.02, Math.min(1, p / 50));
    const h = 106 * frac;
    $(id).setAttribute('y', String(218 + (106 - h)));
    $(id).setAttribute('height', String(h));
  };
  setFill('accCh4Level', snap.p.pt101);
  setFill('accGoxLevel', snap.p.pt201);

  // Solenoid valves (SV-101 CH4, SV-201 GOX)
  const setValve = (prefix, open, activeColor) => {
    $(`${prefix}TriL`).setAttribute('fill', open ? activeColor : '#FFFFFF');
    $(`${prefix}TriR`).setAttribute('fill', open ? activeColor : '#FFFFFF');
    $(`${prefix}Coil`).setAttribute('fill', open ? activeColor : '#FFFFFF');
    $(`${prefix}Coil`).setAttribute('stroke', open ? activeColor : '#243040');
    $(`${prefix}Letter`).setAttribute('fill', open ? '#FFFFFF' : '#243040');
  };
  setValve('sv101', snap.valveLiftCh4 > 0.25, '#0D8A7B');
  setValve('sv201', snap.valveLiftGox > 0.25, '#1F4E79');

  // Animated flow lines
  $('flowCh4').setAttribute('opacity', snap.valveLiftCh4 > 0.2 ? '0.9' : '0');
  $('flowGox').setAttribute('opacity', snap.valveLiftGox > 0.2 ? '0.9' : '0');
  $('flowVentCh4').setAttribute('opacity', snap.ventCh4Open && snap.p.pt101 > 1.2 ? '0.85' : '0');
  $('flowVentGox').setAttribute('opacity', snap.ventGoxOpen && snap.p.pt201 > 1.2 ? '0.85' : '0');

  // Manual vent valve coloring
  $('symVentCh4A').setAttribute('fill', snap.ventCh4Open ? '#0D8A7B' : '#FFFFFF');
  $('symVentCh4B').setAttribute('fill', snap.ventCh4Open ? '#0D8A7B' : '#FFFFFF');
  $('symVentGoxA').setAttribute('fill', snap.ventGoxOpen ? '#1F4E79' : '#FFFFFF');
  $('symVentGoxB').setAttribute('fill', snap.ventGoxOpen ? '#1F4E79' : '#FFFFFF');

  // K-bottle badges
  const bFill = snap.bottlesClosed ? '#E2F2E2' : '#FFF4C2';
  const bStroke = snap.bottlesClosed ? '#1E7B34' : '#B36B00';
  const bText = snap.bottlesClosed ? 'SHUT' : 'OPEN';
  const bSub = snap.bottlesClosed ? 'CLOSED (Safe)' : 'OPEN (Checklist!)';
  for (const s of ['Ch4', 'Gox']) {
    $(`badgeBottle${s}`).setAttribute('fill', bFill);
    $(`badgeBottle${s}`).setAttribute('stroke', bStroke);
    $(`txtBottle${s}`).setAttribute('fill', bStroke);
    $(`txtBottle${s}`).textContent = bText;
    $(`lblBottle${s}`).textContent = bSub;
  }

  // Glow plug thermal color & electrical readouts
  const t = snap.gpTempNorm;
  if (t > 0.05) {
    const r = Math.round(203 + 52 * t);
    const g = Math.round(213 - 110 * t);
    const b = Math.round(225 - 210 * t);
    $('gpTip').setAttribute('fill', `rgb(${r},${g},${b})`);
    $('gpBody').setAttribute('fill', snap.gpActuallyPowered ? '#FFE08A' : '#FFF4C2');
  } else {
    $('gpTip').setAttribute('fill', '#CBD5E1');
    $('gpBody').setAttribute('fill', '#FFF4C2');
  }

  $('valGpV').textContent = `${snap.gpV.toFixed(1)} V`;
  $('valGpI').textContent = `${snap.gpI.toFixed(1)} A`;
  $('valGpP').textContent = `${snap.gpPAvg.toFixed(1)} W`;
  $('valGpGate').textContent = snap.gpOkLatched
    ? `POWER OK (${snap.settings.pMin}–${snap.settings.pMax} W)`
    : `Gate: ${snap.settings.pMin}–${snap.settings.pMax} W`;
  $('valGpGate').setAttribute('fill', snap.gpOkLatched ? '#1E7B34' : '#5A6675');

  // Switch blade (17) & energized wires
  if (snap.gpActuallyPowered) {
    $('gpSwitchBlade').setAttribute('x2', '668');
    $('gpSwitchBlade').setAttribute('y2', '318');
    $('gpSwitchBlade').setAttribute('stroke', '#B3261E');
    $('gpWireL').setAttribute('stroke', '#B3261E');
    $('gpWireR1').setAttribute('stroke', '#B3261E');
    $('gpWireR2').setAttribute('stroke', '#B3261E');
    $('txtGpSwitch').textContent = 'CLOSED (Energized)';
    $('txtGpSwitch').setAttribute('fill', '#B3261E');
  } else {
    $('gpSwitchBlade').setAttribute('x2', '684');
    $('gpSwitchBlade').setAttribute('y2', '322');
    $('gpSwitchBlade').setAttribute('stroke', '#243040');
    $('gpWireL').setAttribute('stroke', '#243040');
    $('gpWireR1').setAttribute('stroke', '#243040');
    $('gpWireR2').setAttribute('stroke', '#243040');
    $('txtGpSwitch').textContent = snap.hw.gpContactorClosed ? 'Contactor ON · SSR OFF' : 'OPEN (Isolated)';
    $('txtGpSwitch').setAttribute('fill', '#5A6675');
  }

  // Combustion chamber glow & exhaust plume
  if (snap.ignited) {
    const flicker = 0.85 + 0.15 * Math.sin(snap.simTime * 85);
    $('exhaustPlume').setAttribute('opacity', String(flicker.toFixed(2)));
    $('chamberGlow').setAttribute('opacity', '0.22');
    $('txtChamberState').textContent = 'IGNITED · BURN';
    $('txtChamberState').setAttribute('fill', '#B3261E');
  } else if (snap.valveLiftGox > 0.2 || snap.valveLiftCh4 > 0.2) {
    $('exhaustPlume').setAttribute('opacity', '0');
    $('chamberGlow').setAttribute('opacity', '0');
    $('txtChamberState').textContent = 'COLD FLOW (UNLIT)';
    $('txtChamberState').setAttribute('fill', '#1F4E79');
  } else {
    $('exhaustPlume').setAttribute('opacity', '0');
    $('chamberGlow').setAttribute('opacity', '0');
    $('txtChamberState').textContent = snap.gpTempNorm > 0.35 ? 'GLOW PLUG HOT' : 'COLD / AMBIENT';
    $('txtChamberState').setAttribute('fill', snap.gpTempNorm > 0.35 ? '#B36B00' : '#5A6675');
  }
}
