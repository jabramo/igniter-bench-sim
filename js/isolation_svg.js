// Interactive Hardware Safety & Isolation Diagram — Mirrors Figure 6 (isolation.png)

export function renderIsolationSvg(container) {
  container.innerHTML = `
  <div class="iso-stage">
    <svg id="isoSvg" viewBox="0 0 1060 445" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Hardware Safety Chain and Isolation Circuit">
      <defs>
        <marker id="arrDark" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#243040"/>
        </marker>
        <marker id="arrRed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#B3261E"/>
        </marker>
        <marker id="arrMuted" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#9AA5B4"/>
        </marker>
      </defs>

      <!-- ===== RAIL 1: CONTROL CHAIN (24 V) ===== -->
      <text x="16" y="20" class="iso-rail-title">1. Control chain (24 V) — Hardware only, no PLC override</text>

      <!-- Wires rail 1 -->
      <line id="wCtl1" x1="146" y1="64" x2="180" y2="64" stroke="#243040" stroke-width="2" marker-end="url(#arrDark)"/>
      <line id="wCtl2" x1="322" y1="64" x2="356" y2="64" stroke="#243040" stroke-width="2" marker-end="url(#arrDark)"/>
      <line id="wCtl3" x1="498" y1="64" x2="532" y2="64" stroke="#243040" stroke-width="2" marker-end="url(#arrDark)"/>
      <path id="wCtlGp" d="M 674 64 L 704 64 L 704 38 L 732 38" fill="none" stroke="#9AA5B4" stroke-width="2" marker-end="url(#arrMuted)"/>
      <path id="wCtlArm" d="M 674 64 L 704 64 L 704 94 L 732 94" fill="none" stroke="#9AA5B4" stroke-width="2" marker-end="url(#arrMuted)"/>

      <!-- Boxes rail 1 -->
      <rect x="16" y="40" width="130" height="48" rx="6" fill="#FFFFFF" stroke="#243040" stroke-width="1.5"/>
      <text x="81" y="61" text-anchor="middle" class="iso-box-title">+24 V</text>
      <text x="81" y="76" text-anchor="middle" class="iso-box-sub">backed-up supply</text>

      <rect id="boxEstop" x="182" y="40" width="140" height="48" rx="6" fill="#FBE3D6" stroke="#243040" stroke-width="1.5"/>
      <text x="252" y="61" text-anchor="middle" class="iso-box-title">E-STOP</text>
      <text id="subEstop" x="252" y="76" text-anchor="middle" class="iso-box-sub">2-ch NC · CLOSED</text>

      <rect id="boxSafRelay" x="358" y="40" width="140" height="48" rx="6" fill="#FBE3D6" stroke="#243040" stroke-width="1.5"/>
      <text x="428" y="61" text-anchor="middle" class="iso-box-title">Safety relay</text>
      <text id="subSafRelay" x="428" y="76" text-anchor="middle" class="iso-box-sub">OK (energized)</text>

      <rect id="boxKey" x="534" y="40" width="140" height="48" rx="6" fill="#FBE3D6" stroke="#243040" stroke-width="1.5"/>
      <text x="604" y="61" text-anchor="middle" class="iso-box-title">ARM key</text>
      <text id="subKey" x="604" y="76" text-anchor="middle" class="iso-box-sub">Position: SAFE</text>

      <rect id="boxGpCoil" x="734" y="16" width="196" height="44" rx="6" fill="#FBE3D6" stroke="#243040" stroke-width="1.5"/>
      <text x="832" y="35" text-anchor="middle" class="iso-box-title">Glow plug contactor coil</text>
      <text id="subGpCoil" x="832" y="49" text-anchor="middle" class="iso-box-sub">OFF (ARMED only)</text>

      <rect id="boxArmCoil" x="734" y="72" width="196" height="44" rx="6" fill="#FBE3D6" stroke="#243040" stroke-width="1.5"/>
      <text x="832" y="91" text-anchor="middle" class="iso-box-title">Valve arming relay coil</text>
      <text id="subArmCoil" x="832" y="105" text-anchor="middle" class="iso-box-sub">OFF (ARMED only)</text>

      <!-- Mechanical dashed links from coils -->
      <path d="M 832 116 L 832 142 L 252 142 L 252 174" fill="none" stroke="#8C99A8" stroke-width="1.3" stroke-dasharray="5 4"/>
      <line x1="804" y1="142" x2="804" y2="174" stroke="#8C99A8" stroke-width="1.3" stroke-dasharray="5 4"/>
      <rect x="372" y="131" width="320" height="14" fill="#FFFFFF"/>
      <text x="532" y="141" text-anchor="middle" class="iso-dash-lbl">2-pole force-guided: coil drives both contacts + NC feedback together</text>

      <!-- Mechanical dashed link from GP contactor coil to GP contactor -->
      <path d="M 930 38 L 1032 38 L 1032 426 L 252 426 L 252 402" fill="none" stroke="#8C99A8" stroke-width="1.3" stroke-dasharray="5 4"/>
      <text x="952" y="420" text-anchor="end" class="iso-dash-lbl">coil switches glow plug contactor</text>

      <!-- ===== RAIL 2: VALVE POWER (2-POLE FORCE-GUIDED) ===== -->
      <text x="16" y="160" class="iso-rail-title">2. Valve power — 2-pole disconnect (+24 V and 0 V return)</text>

      <!-- Wires rail 2 -->
      <line id="wVal1" x1="146" y1="202" x2="180" y2="202" stroke="#B3261E" stroke-width="2.6" marker-end="url(#arrRed)"/>
      <line id="wVal2" x1="322" y1="202" x2="356" y2="202" stroke="#9AA5B4" stroke-width="2.6" marker-end="url(#arrMuted)"/>
      <line id="wVal3" x1="518" y1="202" x2="552" y2="202" stroke="#9AA5B4" stroke-width="2.6" marker-end="url(#arrMuted)"/>
      <line id="wVal4" x1="696" y1="202" x2="730" y2="202" stroke="#9AA5B4" stroke-width="2.6" marker-end="url(#arrMuted)"/>
      <line id="wVal5" x1="876" y1="202" x2="910" y2="202" stroke="#9AA5B4" stroke-width="2.6" marker-end="url(#arrMuted)"/>

      <!-- Valve bus tap to AMBER ARMED lamp & test jacks -->
      <path id="wBusTap" d="M 339 202 L 339 282 L 356 282" fill="none" stroke="#9AA5B4" stroke-width="2" marker-end="url(#arrMuted)"/>
      <text x="332" y="246" text-anchor="end" class="iso-bus-lbl" id="lblBusV">valve bus: 0.0 V</text>

      <!-- Force-guided feedback tap to GREEN SAFE lamp -->
      <line x1="804" y1="226" x2="804" y2="256" stroke="#8C99A8" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#arrMuted)"/>
      <text x="812" y="245" class="iso-dash-lbl">force-guided NC feedback</text>

      <!-- Boxes rail 2 -->
      <rect x="16" y="176" width="130" height="52" rx="6" fill="#FFFFFF" stroke="#243040" stroke-width="1.5"/>
      <text x="81" y="198" text-anchor="middle" class="iso-box-title">+24 V</text>
      <text x="81" y="213" text-anchor="middle" class="iso-box-sub">valve supply</text>

      <rect id="boxArmC1" x="182" y="176" width="140" height="52" rx="6" fill="#DCE9F7" stroke="#1F4E79" stroke-width="1.5"/>
      <text x="252" y="197" text-anchor="middle" class="iso-box-title">Arming contact 1</text>
      <text id="subArmC1" x="252" y="213" text-anchor="middle" class="iso-box-sub">+24 V side · OPEN</text>

      <rect id="boxEl2024" x="358" y="176" width="160" height="52" rx="6" fill="#DCE9F7" stroke="#1F4E79" stroke-width="1.5"/>
      <text x="438" y="197" text-anchor="middle" class="iso-box-title">EL9100 + EL2024</text>
      <text id="subEl2024" x="438" y="213" text-anchor="middle" class="iso-box-sub">Unpowered (0.0 V)</text>

      <rect id="boxValves" x="554" y="176" width="142" height="52" rx="6" fill="#F2F2F2" stroke="#243040" stroke-width="1.5"/>
      <text x="625" y="197" text-anchor="middle" class="iso-box-title">Solenoid valves</text>
      <text id="subValves" x="625" y="213" text-anchor="middle" class="iso-box-sub">SV-101 (8) · SV-201 (20)</text>

      <rect id="boxArmC2" x="732" y="176" width="144" height="52" rx="6" fill="#DCE9F7" stroke="#1F4E79" stroke-width="1.5"/>
      <text x="804" y="197" text-anchor="middle" class="iso-box-title">Arming contact 2</text>
      <text id="subArmC2" x="804" y="213" text-anchor="middle" class="iso-box-sub">0 V side · OPEN</text>

      <rect x="912" y="176" width="102" height="52" rx="6" fill="#FFFFFF" stroke="#243040" stroke-width="1.5"/>
      <text x="963" y="198" text-anchor="middle" class="iso-box-title">0 V</text>
      <text x="963" y="213" text-anchor="middle" class="iso-box-sub">24 V return</text>

      <!-- Indicator boxes: AMBER ARMED & GREEN SAFE -->
      <rect id="boxArmedLamp" x="358" y="256" width="274" height="58" rx="6" fill="#F8FAFC" stroke="#9AA5B4" stroke-width="1.5"/>
      <text id="ttlArmedLamp" x="495" y="274" text-anchor="middle" class="iso-box-title">AMBER "ARMED" lamp + Test Jacks</text>
      <text id="subArmedOpto" x="495" y="289" text-anchor="middle" class="iso-box-sub">+ PLC input via optocoupler</text>
      <text id="subArmedLamp" x="495" y="304" text-anchor="middle" class="iso-box-sub">OFF · Test Jacks = 0.00 V DC</text>

      <rect id="boxSafeLamp" x="698" y="258" width="214" height="52" rx="6" fill="#E2F2E2" stroke="#1E7B34" stroke-width="1.8"/>
      <text id="ttlSafeLamp" x="805" y="279" text-anchor="middle" class="iso-box-title" fill="#1E7B34">GREEN "SAFE" lamp + PLC input</text>
      <text id="subSafeLamp" x="805" y="295" text-anchor="middle" class="iso-box-sub" fill="#1E7B34">ON · Contacts verified OPEN</text>

      <!-- ===== RAIL 3: GLOW PLUG POWER ===== -->
      <text x="16" y="336" class="iso-rail-title">3. Glow plug power — Contactor isolates even if DC SSR fails shorted</text>

      <line id="wGp1" x1="146" y1="374" x2="180" y2="374" stroke="#B3261E" stroke-width="2.6" marker-end="url(#arrRed)"/>
      <line id="wGp2" x1="322" y1="374" x2="356" y2="374" stroke="#9AA5B4" stroke-width="2.6" marker-end="url(#arrMuted)"/>
      <line id="wGp3" x1="498" y1="374" x2="532" y2="374" stroke="#9AA5B4" stroke-width="2.6" marker-end="url(#arrMuted)"/>
      <line id="wGp4" x1="696" y1="374" x2="730" y2="374" stroke="#9AA5B4" stroke-width="2.6" marker-end="url(#arrMuted)"/>

      <rect x="16" y="346" width="130" height="56" rx="6" fill="#FFFFFF" stroke="#243040" stroke-width="1.5"/>
      <text x="81" y="364" text-anchor="middle" class="iso-box-title">GP Supply (14)</text>
      <text x="81" y="378" text-anchor="middle" class="iso-box-sub">9.6–24 V (PLC PV)</text>
      <text id="subIsoPsu" x="81" y="392" text-anchor="middle" class="iso-box-sub">Set 24.0 V</text>

      <rect id="boxGpCont" x="182" y="346" width="140" height="56" rx="6" fill="#DCE9F7" stroke="#1F4E79" stroke-width="1.5"/>
      <text x="252" y="369" text-anchor="middle" class="iso-box-title">GP Contactor</text>
      <text id="subGpCont" x="252" y="385" text-anchor="middle" class="iso-box-sub">OPEN (Isolated)</text>

      <rect id="boxGpSsr" x="358" y="346" width="140" height="56" rx="6" fill="#DCE9F7" stroke="#1F4E79" stroke-width="1.5"/>
      <text x="428" y="369" text-anchor="middle" class="iso-box-title">DC SSR (17)</text>
      <text id="subGpSsr" x="428" y="385" text-anchor="middle" class="iso-box-sub">PLC timing · OFF</text>

      <rect x="534" y="346" width="162" height="56" rx="6" fill="#F2F2F2" stroke="#243040" stroke-width="1.5"/>
      <text x="615" y="364" text-anchor="middle" class="iso-box-title">Hall Sensor (15)</text>
      <text x="615" y="378" text-anchor="middle" class="iso-box-sub">24 V, 0–10 V out</text>
      <text id="subIsoHall" x="615" y="392" text-anchor="middle" class="iso-box-sub">0.0 A DC (isolated)</text>

      <rect id="boxIsoGp" x="732" y="346" width="166" height="56" rx="6" fill="#F2F2F2" stroke="#243040" stroke-width="1.5"/>
      <text x="815" y="364" text-anchor="middle" class="iso-box-title">Glow Plug (13)</text>
      <text x="815" y="378" text-anchor="middle" class="iso-box-sub">Kelvin V sense (16)</text>
      <text id="subIsoGp" x="815" y="392" text-anchor="middle" class="iso-box-sub">0.0 W · Cold</text>
    </svg>
  </div>
  `;
}

export function updateIsolationSvg(snap) {
  const $ = (id) => document.getElementById(id);
  if (!$('isoSvg')) return;
  const hw = snap.hw;

  const setWire = (id, live, isLoad = false) => {
    const el = $(id);
    if (!el) return;
    if (live) {
      el.setAttribute('stroke', isLoad ? '#B3261E' : '#1F4E79');
      el.setAttribute('marker-end', isLoad ? 'url(#arrRed)' : 'url(#arrDark)');
    } else {
      el.setAttribute('stroke', '#B8C2CF');
      el.setAttribute('marker-end', 'url(#arrMuted)');
    }
  };

  // Rail 1: Control chain
  setWire('wCtl1', true, false);
  setWire('wCtl2', !snap.estopPressed, false);
  setWire('wCtl3', hw.safetyRelayOk, false);
  setWire('wCtlGp', hw.gpContactorCoil, false);
  setWire('wCtlArm', hw.armingRelayCoil, false);

  $('subEstop').textContent = snap.estopPressed ? 'PRESSED (OPEN!)' : '2-ch NC · CLOSED';
  $('boxEstop').setAttribute('fill', snap.estopPressed ? '#FDECEC' : '#FBE3D6');
  $('boxEstop').setAttribute('stroke', snap.estopPressed ? '#B3261E' : '#243040');

  $('subSafRelay').textContent = hw.safetyRelayOk ? 'OK (energized)' : (snap.estopPressed ? 'TRIPPED' : 'NEEDS MANUAL RESET');
  $('boxSafRelay').setAttribute('fill', hw.safetyRelayOk ? '#FBE3D6' : '#FDECEC');
  $('subKey').textContent = `Position: ${snap.keyPos}${snap.keyRemoved ? ' (Removed)' : ''}`;
  $('subGpCoil').textContent = hw.gpContactorCoil ? 'ENERGIZED (24 V)' : 'OFF (ARMED only)';
  $('subArmCoil').textContent = hw.armingRelayCoil ? 'ENERGIZED (24 V)' : 'OFF (ARMED only)';

  // Rail 2: Valve power
  setWire('wVal1', true, true);
  setWire('wVal2', hw.contact1Closed, true);
  setWire('wBusTap', hw.contact1Closed, true);
  const anyValveFlow = snap.sv201Energized || snap.sv101Energized;
  setWire('wVal3', hw.contact1Closed && (snap.outCmd.gox || snap.outCmd.ch4), true);
  setWire('wVal4', anyValveFlow, true);
  setWire('wVal5', anyValveFlow && hw.contact2Closed, true);

  $('lblBusV').textContent = `valve bus: ${hw.valveBusVoltage.toFixed(1)} V`;
  $('lblBusV').setAttribute('fill', hw.valveBusVoltage > 18 ? '#B3261E' : '#5A6675');

  $('subArmC1').textContent = snap.hwFaults.weldedRelay
    ? 'WELDED CLOSED!'
    : `+24 V side · ${hw.contact1Closed ? 'CLOSED' : 'OPEN'}`;
  $('boxArmC1').setAttribute('fill', snap.hwFaults.weldedRelay ? '#FDECEC' : (hw.contact1Closed ? '#FFF4C2' : '#DCE9F7'));
  $('boxArmC1').setAttribute('stroke', snap.hwFaults.weldedRelay ? '#B3261E' : '#1F4E79');

  $('subArmC2').textContent = `0 V side · ${hw.contact2Closed ? 'CLOSED' : 'OPEN'}`;
  $('boxArmC2').setAttribute('fill', hw.contact2Closed ? '#FFF4C2' : '#DCE9F7');

  $('subEl2024').textContent = snap.hwFaults.etherCatPull
    ? 'WATCHDOG TRIPPED'
    : (hw.valveBusLive ? '24 V LIVE (Armed)' : (hw.contact1Closed ? '+24 V / No 0 V return' : 'Unpowered (0.0 V)'));
  $('subValves').textContent = anyValveFlow
    ? `ENERGIZED (${snap.sv201Energized ? 'GOX ' : ''}${snap.sv101Energized ? 'CH4' : ''})`
    : 'DE-ENERGIZED (NC Shut)';
  $('boxValves').setAttribute('fill', anyValveFlow ? '#DCE9F7' : '#F2F2F2');

  // AMBER ARMED lamp box
  if (hw.armedLampOn) {
    $('boxArmedLamp').setAttribute('fill', '#FFF4C2');
    $('boxArmedLamp').setAttribute('stroke', '#B36B00');
    $('ttlArmedLamp').setAttribute('fill', '#8A5200');
    $('subArmedOpto').setAttribute('fill', '#8A5200');
    $('subArmedLamp').textContent = `LIT · Test Jacks = ${hw.valveBusVoltage.toFixed(2)} V DC`;
    $('subArmedLamp').setAttribute('fill', '#8A5200');
  } else {
    $('boxArmedLamp').setAttribute('fill', '#F8FAFC');
    $('boxArmedLamp').setAttribute('stroke', '#9AA5B4');
    $('ttlArmedLamp').setAttribute('fill', '#5A6675');
    $('subArmedOpto').setAttribute('fill', '#5A6675');
    $('subArmedLamp').textContent = 'OFF · Test Jacks = 0.00 V DC';
    $('subArmedLamp').setAttribute('fill', '#5A6675');
  }

  // GREEN SAFE lamp box
  if (hw.safeLampOn) {
    $('boxSafeLamp').setAttribute('fill', '#E2F2E2');
    $('boxSafeLamp').setAttribute('stroke', '#1E7B34');
    $('ttlSafeLamp').setAttribute('fill', '#1E7B34');
    $('subSafeLamp').textContent = 'LIT · Force-guided contact CLOSED';
    $('subSafeLamp').setAttribute('fill', '#1E7B34');
  } else {
    $('boxSafeLamp').setAttribute('fill', snap.hwFaults.weldedRelay ? '#FDECEC' : '#F8FAFC');
    $('boxSafeLamp').setAttribute('stroke', snap.hwFaults.weldedRelay ? '#B3261E' : '#9AA5B4');
    $('ttlSafeLamp').setAttribute('fill', snap.hwFaults.weldedRelay ? '#B3261E' : '#5A6675');
    $('subSafeLamp').textContent = snap.hwFaults.weldedRelay
      ? 'FAULT: Welded contact blocks SAFE!'
      : 'OFF · Relay energized / not safe';
    $('subSafeLamp').setAttribute('fill', snap.hwFaults.weldedRelay ? '#B3261E' : '#5A6675');
  }

  // Rail 3: Glow plug power
  const ssrOn = snap.outCmd.gp || snap.hwFaults.shortedSsr;
  setWire('wGp1', true, true);
  setWire('wGp2', hw.gpContactorClosed, true);
  setWire('wGp3', snap.gpActuallyPowered, true);
  setWire('wGp4', snap.gpActuallyPowered, true);

  $('subIsoPsu').textContent = `Set ${snap.settings.vGp.toFixed(1)} V`;
  $('subGpCont').textContent = hw.gpContactorClosed ? 'CLOSED (ARMED)' : 'OPEN (Isolated!)';
  $('boxGpCont').setAttribute('fill', hw.gpContactorClosed ? '#FFF4C2' : '#DCE9F7');

  $('subGpSsr').textContent = snap.hwFaults.shortedSsr
    ? 'FAILED SHORTED!'
    : (snap.outCmd.gp ? 'ON (PLC Timing)' : 'OFF');
  $('boxGpSsr').setAttribute('fill', snap.hwFaults.shortedSsr ? '#FDECEC' : (ssrOn ? '#FFF4C2' : '#DCE9F7'));
  $('boxGpSsr').setAttribute('stroke', snap.hwFaults.shortedSsr ? '#B3261E' : '#1F4E79');

  $('subIsoHall').textContent = `${snap.gpI.toFixed(1)} A DC (isolated)`;
  $('subIsoGp').textContent = snap.gpActuallyPowered
    ? `${snap.gpPAvg.toFixed(0)} W · ENERGIZED`
    : (snap.hwFaults.shortedSsr ? '0.0 W · Saved by contactor!' : '0.0 W · Isolated');
  $('boxIsoGp').setAttribute('fill', snap.gpActuallyPowered ? '#FFF4C2' : '#F2F2F2');
}
