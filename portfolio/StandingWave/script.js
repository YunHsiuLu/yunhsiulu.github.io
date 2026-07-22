const canvas = document.querySelector('#waveCanvas');
const ctx = canvas.getContext('2d');

const controls = {
  mode: document.querySelector('#mode'),
  boundary: document.querySelector('#boundary'),
  harmonic: document.querySelector('#harmonic'),
  amplitude: document.querySelector('#amplitude'),
  speed: document.querySelector('#speed'),
  components: document.querySelector('#components'),
  standing: document.querySelector('#standing'),
  guides: document.querySelector('#guides'),
  pressurePlot: document.querySelector('#pressurePlot'),
  displacementPlot: document.querySelector('#displacementPlot'),
  play: document.querySelector('#play'),
  pause: document.querySelector('#pause'),
  stepFrame: document.querySelector('#stepFrame'),
};

const outputs = {
  harmonic: document.querySelector('#harmonicValue'),
  amplitude: document.querySelector('#amplitudeValue'),
  speed: document.querySelector('#speedValue'),
};
const longitudinalOptions = document.querySelector('#longitudinalOptions');

let time = 0;
let lastTimestamp = 0;
let isPlaying = true;
const frameDuration = 1 / 60;

function readState() {
  return {
    mode: controls.mode.value,
    boundary: controls.boundary.value,
    harmonic: Number(controls.harmonic.value),
    amplitude: Number(controls.amplitude.value),
    speed: Number(controls.speed.value),
    components: controls.components.checked,
    standing: controls.standing.checked,
    guides: controls.guides.checked,
    pressurePlot: controls.pressurePlot.checked,
    displacementPlot: controls.displacementPlot.checked,
  };
}

function syncOutputs() {
  outputs.harmonic.textContent = controls.harmonic.value;
  outputs.amplitude.textContent = controls.amplitude.value;
  outputs.speed.textContent = Number(controls.speed.value).toFixed(1);
  controls.play.classList.toggle('is-active', isPlaying);
  controls.pause.classList.toggle('is-active', !isPlaying);
  controls.play.setAttribute('aria-pressed', String(isPlaying));
  controls.pause.setAttribute('aria-pressed', String(!isPlaying));
  longitudinalOptions.hidden = controls.mode.value !== 'longitudinal';
}

Object.values(controls).forEach((control) => control.addEventListener('input', syncOutputs));
controls.play.addEventListener('click', () => {
  isPlaying = true;
  lastTimestamp = 0;
  syncOutputs();
});
controls.pause.addEventListener('click', () => {
  isPlaying = false;
  lastTimestamp = 0;
  syncOutputs();
});
controls.stepFrame.addEventListener('click', () => {
  isPlaying = false;
  time += frameDuration * Number(controls.speed.value);
  lastTimestamp = 0;
  syncOutputs();
  drawFrame();
});
if (new URLSearchParams(location.search).get('mode') === 'longitudinal') {
  controls.mode.value = 'longitudinal';
}
syncOutputs();

function setupCanvas() {
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const width = canvas.clientWidth || 1100;
  const aspectRatio = controls.mode.value === 'longitudinal' ? 0.62 : 0.47;
  const minimumHeight = controls.mode.value === 'longitudinal' ? 420 : 0;
  const height = Math.round(Math.max(width * aspectRatio, minimumHeight));
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { width, height };
}

function waveNumber(state) {
  return (state.boundary === 'closed-open' ? state.harmonic - 0.5 : state.harmonic) * Math.PI;
}

function spatialValue(x, state) {
  const k = waveNumber(state);
  return state.boundary === 'open-open' ? Math.cos(k * x) : Math.sin(k * x);
}

function waveY(x, timeValue, state, direction = 1) {
  const k = waveNumber(state);
  const omega = 2.1;
  const phase = k * x + direction * omega * timeValue;
  return state.amplitude * (state.boundary === 'open-open' ? Math.cos(phase) : Math.sin(phase));
}

function standingValue(x, timeValue, state) {
  return 2 * state.amplitude * spatialValue(x, state) * Math.cos(2.1 * timeValue);
}

function drawLine(points, color, width = 3, dash = []) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
  ctx.restore();
}

function drawGrid(width, height, left, right, mid) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#081421';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(86,217,233,.12)';
  ctx.lineWidth = 1;
  for (let x = left; x <= right; x += (right - left) / 12) {
    ctx.beginPath();
    ctx.moveTo(x, 26);
    ctx.lineTo(x, height - 42);
    ctx.stroke();
  }
  for (let y = 42; y <= height - 42; y += 42) {
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(237,245,255,.35)';
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(left, mid);
  ctx.lineTo(right, mid);
  ctx.stroke();
  ctx.setLineDash([]);
}

function nodePositions(state, left, span) {
  const count = state.boundary === 'closed-closed' ? state.harmonic + 1 : state.harmonic;
  const denominator = state.boundary === 'closed-open' ? state.harmonic - 0.5 : state.harmonic;
  const offset = state.boundary === 'open-open' ? 0.5 : 0;
  return Array.from({ length: count }, (_, i) => {
    const normalized = (i + offset) / denominator;
    return { normalized, x: left + normalized * span };
  });
}

function antinodePositions(state, left, span) {
  const count = state.boundary === 'open-open' ? state.harmonic + 1 : state.harmonic;
  const denominator = state.boundary === 'closed-open' ? state.harmonic - 0.5 : state.harmonic;
  const offset = state.boundary === 'open-open' ? 0 : 0.5;
  return Array.from({ length: count }, (_, i) => {
    const normalized = (i + offset) / denominator;
    return { normalized, x: left + normalized * span };
  });
}

function drawGuides(state, left, right, top, bottom) {
  const span = right - left;
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  nodePositions(state, left, span).forEach(({ x }) => {
    ctx.strokeStyle = 'rgba(198,243,107,.34)';
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  });

  antinodePositions(state, left, span).forEach(({ x }) => {
    ctx.strokeStyle = 'rgba(255,173,109,.34)';
    ctx.setLineDash([2, 7]);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  });
  ctx.restore();
}

function drawLabels(state, left, right, mid, height, scale = 0, nodeLabel = '波節', antinodeLabel = '波腹') {
  const span = right - left;
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  nodePositions(state, left, span).forEach(({ x }) => {
    ctx.fillStyle = '#c6f36b';
    ctx.beginPath();
    ctx.arc(x, mid, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(nodeLabel, x, height - 24);
  });

  ctx.fillStyle = '#ffad6d';
  antinodePositions(state, left, span).forEach(({ normalized, x }) => {
    const y = mid - standingValue(normalized, time, state) * scale;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(antinodeLabel, x, 24);
  });
}

function drawTransverse(width, height, state) {
  const left = 58;
  const right = width - 42;
  const mid = height * 0.52;
  const span = right - left;
  drawGrid(width, height, left, right, mid);

  const samples = 520;
  const incident = [];
  const reflected = [];
  const standing = [];
  for (let i = 0; i <= samples; i += 1) {
    const normalized = i / samples;
    const x = left + normalized * span;
    incident.push({ x, y: mid - waveY(normalized, time, state, -1) * 0.62 });
    reflected.push({ x, y: mid - waveY(normalized, time, state, 1) * 0.62 });
    standing.push({ x, y: mid - standingValue(normalized, time, state) * 0.62 });
  }

  if (state.components) {
    drawLine(incident, 'rgba(255,107,122,.68)', 2, [7, 7]);
    drawLine(reflected, 'rgba(86,217,233,.62)', 2, [4, 7]);
  }
  if (state.standing) {
    if (state.guides) drawGuides(state, left, right, 30, height - 38);
    drawLine(standing, '#c6f36b', 4);
    drawLabels(state, left, right, mid, height, 0.62);
  }
}

function drawTube(state, left, right, top, bottom) {
  const leftClosed = state.boundary !== 'open-open';
  const rightClosed = state.boundary === 'closed-closed';

  ctx.save();
  ctx.fillStyle = 'rgba(15,39,57,.82)';
  ctx.fillRect(left, top, right - left, bottom - top);

  ctx.strokeStyle = '#66849b';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(right, top);
  ctx.moveTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(237,245,255,.44)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, top - 1);
  ctx.lineTo(right, top - 1);
  ctx.moveTo(left, bottom - 1);
  ctx.lineTo(right, bottom - 1);
  ctx.stroke();

  const drawClosedEnd = (x) => {
    ctx.strokeStyle = '#8fa9bb';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(x, top - 2);
    ctx.lineTo(x, bottom + 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(237,245,255,.52)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, top + 2);
    ctx.lineTo(x, bottom - 2);
    ctx.stroke();
  };

  const drawOpenEnd = (x, direction) => {
    ctx.strokeStyle = '#66849b';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + direction * 15, top - 10);
    ctx.moveTo(x, bottom);
    ctx.lineTo(x + direction * 15, bottom + 10);
    ctx.stroke();
  };

  if (leftClosed) drawClosedEnd(left);
  else drawOpenEnd(left, -1);
  if (rightClosed) drawClosedEnd(right);
  else drawOpenEnd(right, 1);

  ctx.fillStyle = 'rgba(237,245,255,.82)';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';
  ctx.fillText(leftClosed ? '封閉端' : '開口端', left - (leftClosed ? 2 : 16), top - 16);
  ctx.textAlign = 'right';
  ctx.fillText(rightClosed ? '封閉端' : '開口端', right + (rightClosed ? 2 : 16), top - 16);
  ctx.restore();
}

function particleCompression(normalized, state) {
  const k = waveNumber(state);
  const derivative = state.boundary === 'open-open'
    ? -k * Math.sin(k * normalized)
    : k * Math.cos(k * normalized);
  return -derivative * Math.cos(2.1 * time) / k;
}

function drawDistributionPlot(state, left, right, baseline, amplitude, valueAt, color, label) {
  const span = right - left;
  const points = [];
  for (let i = 0; i <= 360; i += 1) {
    const normalized = i / 360;
    points.push({
      x: left + normalized * span,
      y: baseline - valueAt(normalized, state) * amplitude,
    });
  }

  ctx.save();
  ctx.strokeStyle = 'rgba(237,245,255,.28)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 7]);
  ctx.beginPath();
  ctx.moveTo(left, baseline);
  ctx.lineTo(right, baseline);
  ctx.stroke();
  ctx.restore();
  drawLine(points, color, 3);

  ctx.save();
  ctx.fillStyle = 'rgba(237,245,255,.88)';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label, left, baseline - amplitude - 7);
  ctx.restore();
}

function particleNoise(seed) {
  const value = Math.sin(seed * 91.345 + 12.789) * 43758.5453;
  return value - Math.floor(value);
}

function drawLongitudinal(width, height, state) {
  const compact = width < 520;
  const left = compact ? 34 : 78;
  const right = width - (compact ? 30 : 62);
  const mid = height * 0.52;
  const span = right - left;
  const tubeTop = mid - 66;
  const tubeBottom = mid + 66;
  drawGrid(width, height, left, right, mid);

  const plotAmplitude = Math.min(compact ? 26 : 34, state.amplitude * 0.46);
  if (state.standing && state.pressurePlot) {
    drawDistributionPlot(
      state,
      left,
      right,
      tubeTop - 62,
      plotAmplitude,
      particleCompression,
      '#ffad6d',
      '氣壓分布（密集程度）',
    );
  }
  if (state.standing && state.displacementPlot) {
    drawDistributionPlot(
      state,
      left,
      right,
      tubeBottom + 58,
      plotAmplitude,
      (normalized, currentState) => spatialValue(normalized, currentState) * Math.cos(2.1 * time),
      '#56d9e9',
      '分子位移分布',
    );
  }

  drawTube(state, left, right, tubeTop, tubeBottom);
  if (state.standing && state.guides) {
    drawGuides(state, left, right, tubeTop + 7, tubeBottom - 7);
  }

  const particleCount = 520;
  const displacementScale = Math.min(state.amplitude * 0.62, span / (waveNumber(state) * 1.6));

  for (let i = 0; i < particleCount; i += 1) {
    const normalized = i / (particleCount - 1);
    const baseX = left + normalized * span;
    const displacement = spatialValue(normalized, state) * Math.cos(2.1 * time) * displacementScale;
    const compression = particleCompression(normalized, state);
    const jitterX = (particleNoise(i * 1.73) - 0.5) * 3.2;
    const minX = state.boundary === 'open-open' ? left - 18 : left + 8;
    const maxX = state.boundary === 'closed-closed' ? right - 8 : right + 18;
    const x = Math.max(minX, Math.min(maxX, baseX + displacement + jitterX));
    const y = tubeTop + 12 + particleNoise(i * 2.91) * (tubeBottom - tubeTop - 24);
    const alpha = 0.55 + Math.max(-0.12, compression * 0.3);
    const radius = 2.7 + Math.max(0, compression) * 0.45;
    ctx.fillStyle = `rgba(86,217,233,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.standing) {
    drawLabels(state, left, right, mid, height, 0, '位移波節', '位移波腹');
  }
  if (!compact) {
    ctx.fillStyle = 'rgba(237,245,255,.76)';
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('密集處為高壓，鬆散處為低壓；氣壓與位移的節、腹位置相反', left, height - 56);
  }
}

function drawFrame() {
  const state = readState();
  const { width, height } = setupCanvas();
  if (state.mode === 'longitudinal') drawLongitudinal(width, height, state);
  else drawTransverse(width, height, state);
}

function draw(timestamp = 0) {
  const delta = lastTimestamp ? (timestamp - lastTimestamp) / 1000 : 0;
  lastTimestamp = timestamp;
  const state = readState();
  if (isPlaying) time += delta * state.speed;

  const { width, height } = setupCanvas();
  if (state.mode === 'longitudinal') drawLongitudinal(width, height, state);
  else drawTransverse(width, height, state);

  requestAnimationFrame(draw);
}

window.addEventListener('resize', setupCanvas);
requestAnimationFrame(draw);
