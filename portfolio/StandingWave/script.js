const canvas = document.querySelector('#waveCanvas');
const ctx = canvas.getContext('2d');

const controls = {
  mode: document.querySelector('#mode'),
  harmonic: document.querySelector('#harmonic'),
  amplitude: document.querySelector('#amplitude'),
  speed: document.querySelector('#speed'),
  components: document.querySelector('#components'),
};

const outputs = {
  harmonic: document.querySelector('#harmonicValue'),
  amplitude: document.querySelector('#amplitudeValue'),
  speed: document.querySelector('#speedValue'),
};

let time = 0;
let lastTimestamp = 0;

function readState() {
  return {
    mode: controls.mode.value,
    harmonic: Number(controls.harmonic.value),
    amplitude: Number(controls.amplitude.value),
    speed: Number(controls.speed.value),
    components: controls.components.checked,
  };
}

function syncOutputs() {
  outputs.harmonic.textContent = controls.harmonic.value;
  outputs.amplitude.textContent = controls.amplitude.value;
  outputs.speed.textContent = Number(controls.speed.value).toFixed(1);
}

Object.values(controls).forEach((control) => control.addEventListener('input', syncOutputs));
if (new URLSearchParams(location.search).get('mode') === 'longitudinal') {
  controls.mode.value = 'longitudinal';
}
syncOutputs();

function setupCanvas() {
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const width = canvas.clientWidth || 1100;
  const height = Math.round(width * 0.47);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { width, height };
}

function waveY(x, timeValue, state, direction = 1) {
  const k = state.harmonic * Math.PI;
  const omega = 2.1;
  return state.amplitude * Math.sin(k * x + direction * omega * timeValue);
}

function standingValue(x, timeValue, state) {
  return 2 * state.amplitude * Math.sin(state.harmonic * Math.PI * x) * Math.cos(2.1 * timeValue);
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

function drawLabels(state, left, right, mid, height) {
  const span = right - left;
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i <= state.harmonic; i += 1) {
    const x = left + (i / state.harmonic) * span;
    ctx.fillStyle = '#c6f36b';
    ctx.beginPath();
    ctx.arc(x, mid, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText('波節', x, height - 24);
  }

  ctx.fillStyle = '#ffad6d';
  for (let i = 0; i < state.harmonic; i += 1) {
    const x = left + ((i + 0.5) / state.harmonic) * span;
    ctx.beginPath();
    ctx.arc(x, mid, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText('波腹', x, 24);
  }
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
  drawLine(standing, '#c6f36b', 4);
  drawLabels(state, left, right, mid, height);
}

function drawLongitudinal(width, height, state) {
  const left = 64;
  const right = width - 48;
  const mid = height * 0.52;
  const span = right - left;
  drawGrid(width, height, left, right, mid);

  const particleCount = 120;
  const rows = [-42, -14, 14, 42];
  const displacementScale = state.amplitude * 0.85;

  for (let i = 0; i < particleCount; i += 1) {
    const normalized = i / (particleCount - 1);
    const baseX = left + normalized * span;
    const displacement = standingValue(normalized, time, state) / (state.amplitude * 2 || 1) * displacementScale;
    const speedFactor = Math.abs(Math.sin(state.harmonic * Math.PI * normalized));
    rows.forEach((offset, rowIndex) => {
      ctx.fillStyle = `rgba(86,217,233,${0.36 + speedFactor * 0.5})`;
      ctx.beginPath();
      ctx.arc(baseX + displacement, mid + offset + Math.sin(rowIndex + normalized * 8) * 1.5, 4.2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  if (state.components) {
    const top = [];
    for (let i = 0; i <= 420; i += 1) {
      const normalized = i / 420;
      top.push({ x: left + normalized * span, y: mid - 118 - standingValue(normalized, time, state) * 0.24 });
    }
    drawLine(top, 'rgba(198,243,107,.9)', 3);
  }

  drawLabels(state, left, right, mid, height);
  ctx.fillStyle = 'rgba(237,245,255,.76)';
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('粒子左右振動；亮暗疏密代表壓縮與疏鬆區域', left, height - 56);
}

function draw(timestamp = 0) {
  const delta = lastTimestamp ? (timestamp - lastTimestamp) / 1000 : 0;
  lastTimestamp = timestamp;
  const state = readState();
  time += delta * state.speed;

  const { width, height } = setupCanvas();
  if (state.mode === 'longitudinal') drawLongitudinal(width, height, state);
  else drawTransverse(width, height, state);

  requestAnimationFrame(draw);
}

window.addEventListener('resize', setupCanvas);
requestAnimationFrame(draw);
