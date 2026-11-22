// Interactive Sequence State Machine SVG — Faithful recreation of Report Figure (states.png)

export function renderStatesSvg(container) {
  container.innerHTML = `
  <div class="states-stage">
    <svg id="statesSvg" viewBox="0 0 1180 232" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="PLC Sequence State Machine">
      <defs>
        <marker id="stArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#243040"/>
        </marker>
        <marker id="stArrMuted" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#7A8797"/>
        </marker>
        <marker id="stArrAmber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#A66B00"/>
        </marker>
        <marker id="stArrRed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#B3261E"/>
        </marker>
      </defs>

      <!-- Top return path: SHUTDOWN -> SAFE/READY ("run complete") -->
      <path id="trRunDone" d="M 1112 52 L 1112 18 L 70 18 L 70 50" fill="none" stroke="#7A8797" stroke-width="1.5" marker-end="url(#stArrMuted)"/>
      <text x="590" y="13" text-anchor="middle" class="st-lbl" fill="#5A6778">run complete</text>

      <!-- Main forward transition arrows (generous 56-62px gaps for zero label crowding) -->
      <line id="trStart" x1="130" y1="78" x2="184" y2="78" stroke="#243040" stroke-width="1.8" marker-end="url(#stArr)"/>
      <text x="157" y="70" text-anchor="middle" class="st-lbl">START</text>

      <line id="trCd" x1="300" y1="78" x2="362" y2="78" stroke="#243040" stroke-width="1.8" marker-end="url(#stArr)"/>
      <text x="331" y="59" text-anchor="middle" class="st-lbl">countdown</text>
      <text x="331" y="70" text-anchor="middle" class="st-lbl">done</text>

      <line id="trGp" x1="478" y1="78" x2="538" y2="78" stroke="#243040" stroke-width="1.8" marker-end="url(#stArr)"/>
      <text x="508" y="59" text-anchor="middle" class="st-lbl">t1 done,</text>
      <text x="508" y="70" text-anchor="middle" class="st-lbl">power OK</text>

      <line id="trOx" x1="656" y1="78" x2="710" y2="78" stroke="#243040" stroke-width="1.8" marker-end="url(#stArr)"/>
      <text x="683" y="59" text-anchor="middle" class="st-lbl">t2 done,</text>
      <text x="683" y="70" text-anchor="middle" class="st-lbl">GP OK</text>

      <line id="trIgn" x1="824" y1="78" x2="880" y2="78" stroke="#243040" stroke-width="1.8" marker-end="url(#stArr)"/>
      <text x="852" y="59" text-anchor="middle" class="st-lbl">ignition</text>
      <text x="852" y="70" text-anchor="middle" class="st-lbl">seen</text>

      <line id="trBurn" x1="990" y1="78" x2="1050" y2="78" stroke="#243040" stroke-width="1.8" marker-end="url(#stArr)"/>
      <text x="1020" y="70" text-anchor="middle" class="st-lbl">t3 reached</text>

      <!-- Amber no-go path: GP_HEAT -> SHUTDOWN -->
      <path id="trNoGo" d="M 442 104 L 442 134 L 1112 134 L 1112 106" fill="none" stroke="#A66B00" stroke-width="1.6" marker-end="url(#stArrAmber)"/>
      <text x="1026" y="148" text-anchor="middle" class="st-lbl" fill="#9E5E00">glow plug power out of range at T0: no-go</text>

      <!-- Red abort collector bus from COUNTDOWN, GP_HEAT, OX_OPEN, IGN_WAIT, BURN -> ABORT -->
      <g id="trAbortBus" stroke="#B3261E" stroke-width="1.5" fill="none">
        <line x1="242" y1="104" x2="242" y2="156"/>
        <line x1="414" y1="104" x2="414" y2="156"/>
        <line x1="598" y1="104" x2="598" y2="156"/>
        <line x1="768" y1="104" x2="768" y2="156"/>
        <line x1="936" y1="104" x2="936" y2="156"/>
        <line x1="242" y1="156" x2="936" y2="156"/>
        <line x1="598" y1="156" x2="598" y2="176" marker-end="url(#stArrRed)"/>
      </g>
      <text x="606" y="169" text-anchor="start" class="st-lbl" fill="#B3261E">any abort condition (incl. no ignition in 0.25 s) or E-STOP</text>

      <!-- Return path: ABORT -> SAFE/READY ("operator reset, key in SAFE") -->
      <path id="trAbortReset" d="M 538 200 L 70 200 L 70 106" fill="none" stroke="#7A8797" stroke-width="1.5" marker-end="url(#stArrMuted)"/>
      <text x="220" y="194" text-anchor="middle" class="st-lbl" fill="#5A6778">operator reset, key in SAFE</text>

      <!-- ===== STATE BOXES ===== -->
      <g class="st-node" id="stBox_SAFE">
        <rect x="10" y="52" width="120" height="52" rx="8" fill="#E2F2E2" stroke="#1E7B34" stroke-width="1.8"/>
        <text x="70" y="73" text-anchor="middle" class="st-title" fill="#1E7B34">SAFE / READY</text>
        <text x="70" y="90" text-anchor="middle" class="st-sub" fill="#475569">key, sensors &amp; tanks OK</text>
      </g>

      <g class="st-node" id="stBox_COUNTDOWN">
        <rect x="186" y="52" width="114" height="52" rx="8" fill="#DCE9F7" stroke="#1F4E79" stroke-width="1.6"/>
        <text x="243" y="73" text-anchor="middle" class="st-title" fill="#1A2330">COUNTDOWN</text>
        <text x="243" y="90" text-anchor="middle" class="st-sub" fill="#475569">horn, logging ON</text>
      </g>

      <g class="st-node" id="stBox_GP_HEAT">
        <rect x="364" y="52" width="114" height="52" rx="8" fill="#DCE9F7" stroke="#1F4E79" stroke-width="1.6"/>
        <text x="421" y="73" text-anchor="middle" class="st-title" fill="#1A2330">GP_HEAT</text>
        <text x="421" y="90" text-anchor="middle" class="st-sub" fill="#475569">glow plug on for t1</text>
      </g>

      <g class="st-node" id="stBox_OX_OPEN">
        <rect x="540" y="52" width="116" height="52" rx="8" fill="#DCE9F7" stroke="#1F4E79" stroke-width="1.6"/>
        <text x="598" y="73" text-anchor="middle" class="st-title" fill="#1A2330">OX_OPEN</text>
        <text x="598" y="90" text-anchor="middle" class="st-sub" fill="#475569">GOX open, GP cont. OK</text>
      </g>

      <g class="st-node" id="stBox_IGN_WAIT">
        <rect x="712" y="52" width="112" height="52" rx="8" fill="#DCE9F7" stroke="#1F4E79" stroke-width="1.6"/>
        <text x="768" y="73" text-anchor="middle" class="st-title" fill="#1A2330">IGN_WAIT</text>
        <text x="768" y="90" text-anchor="middle" class="st-sub" fill="#475569">CH₄ open, wait Pc</text>
      </g>

      <g class="st-node" id="stBox_BURN">
        <rect x="882" y="52" width="108" height="52" rx="8" fill="#DCE9F7" stroke="#1F4E79" stroke-width="1.6"/>
        <text x="936" y="73" text-anchor="middle" class="st-title" fill="#1A2330">BURN</text>
        <text x="936" y="90" text-anchor="middle" class="st-sub" fill="#475569">abort limits active</text>
      </g>

      <g class="st-node" id="stBox_SHUTDOWN">
        <rect x="1052" y="52" width="118" height="52" rx="8" fill="#DCE9F7" stroke="#1F4E79" stroke-width="1.6"/>
        <text x="1111" y="73" text-anchor="middle" class="st-title" fill="#1A2330">SHUTDOWN</text>
        <text x="1111" y="90" text-anchor="middle" class="st-sub" fill="#475569">valves shut, GP off</text>
      </g>

      <g class="st-node" id="stBox_ABORT">
        <rect x="538" y="178" width="120" height="44" rx="8" fill="#FDECEC" stroke="#B3261E" stroke-width="1.8"/>
        <text x="598" y="197" text-anchor="middle" class="st-title" fill="#B3261E">ABORT</text>
        <text x="598" y="212" text-anchor="middle" class="st-sub" fill="#5A6778">everything off, latched</text>
      </g>
    </svg>
  </div>
  `;
}

const ALL_STATES = ['SAFE', 'COUNTDOWN', 'GP_HEAT', 'OX_OPEN', 'IGN_WAIT', 'BURN', 'SHUTDOWN', 'ABORT'];

export function updateStatesSvg(snap) {
  if (!document.getElementById('statesSvg')) return;
  const activeKey = snap.state === 'READY' ? 'SAFE' : snap.state;

  ALL_STATES.forEach((st) => {
    const g = document.getElementById(`stBox_${st}`);
    if (!g) return;
    const rect = g.querySelector('rect');
    const title = g.querySelector('.st-title');
    const sub = g.querySelector('.st-sub');
    const isOn = st === activeKey;

    if (st === 'SAFE') {
      rect.setAttribute('fill', isOn ? '#1E7B34' : '#E2F2E2');
      rect.setAttribute('stroke', '#1E7B34');
      rect.setAttribute('stroke-width', isOn ? '2.4' : '1.6');
      title.setAttribute('fill', isOn ? '#FFFFFF' : '#1E7B34');
      sub.setAttribute('fill', isOn ? '#E2F2E2' : '#475569');
    } else if (st === 'ABORT') {
      rect.setAttribute('fill', isOn ? '#B3261E' : '#FDECEC');
      rect.setAttribute('stroke', '#B3261E');
      rect.setAttribute('stroke-width', isOn ? '2.4' : '1.6');
      title.setAttribute('fill', isOn ? '#FFFFFF' : '#B3261E');
      sub.setAttribute('fill', isOn ? '#FDECEC' : '#5A6778');
    } else if (st === 'BURN') {
      rect.setAttribute('fill', isOn ? '#C2410C' : '#DCE9F7');
      rect.setAttribute('stroke', isOn ? '#9A3412' : '#1F4E79');
      rect.setAttribute('stroke-width', isOn ? '2.4' : '1.5');
      title.setAttribute('fill', isOn ? '#FFFFFF' : '#1A2330');
      sub.setAttribute('fill', isOn ? '#FFEDD5' : '#475569');
    } else {
      rect.setAttribute('fill', isOn ? '#1F4E79' : '#DCE9F7');
      rect.setAttribute('stroke', '#1F4E79');
      rect.setAttribute('stroke-width', isOn ? '2.4' : '1.5');
      title.setAttribute('fill', isOn ? '#FFFFFF' : '#1A2330');
      sub.setAttribute('fill', isOn ? '#DCE9F7' : '#475569');
    }
  });

  const abortBus = document.getElementById('trAbortBus');
  if (abortBus) abortBus.setAttribute('stroke-width', activeKey === 'ABORT' ? '2.6' : '1.4');
  const noGoPath = document.getElementById('trNoGo');
  if (noGoPath) noGoPath.setAttribute('stroke-width', snap.noGoReason && activeKey === 'SHUTDOWN' ? '2.8' : '1.5');
}
