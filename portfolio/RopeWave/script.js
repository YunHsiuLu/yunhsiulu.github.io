const canvas = document.getElementById('ropeCanvas');
const ctx = canvas.getContext('2d');

const sourceButtons = [...document.querySelectorAll('[data-source]')];
const boundaryButtons = [...document.querySelectorAll('[data-boundary]')];
const pulseButtons = [...document.querySelectorAll('[data-pulse]')];
const amplitudeSlider = document.getElementById('amplitude');
const frequencySlider = document.getElementById('frequency');
const dampingSlider = document.getElementById('damping');
const mediumSelect = document.getElementById('mediumMode');
const boundaryGroup = document.getElementById('boundaryGroup');
const pauseButton = document.getElementById('pauseButton');
const resetButton = document.getElementById('resetButton');
const amplitudeValue = document.getElementById('amplitudeValue');
const frequencyValue = document.getElementById('frequencyValue');
const dampingValue = document.getElementById('dampingValue');
const speedReadout = document.getElementById('speedReadout');
const timeReadout = document.getElementById('timeReadout');

const state = {
  source: 'manual',
  boundary: 'absorbing',
  medium: 'uniform',
  paused: false,
  dragging: false,
  manualTarget: 0,
  manualValue: 0,
  time: 0,
  lastStamp: 0
};

const points = 240;
const y = new Float32Array(points);
const yOld = new Float32Array(points);
const yNew = new Float32Array(points);
const speeds = new Float32Array(points);
const idealPulses = [];
const pixelRatio = Math.max(1, window.devicePixelRatio || 1);

let viewWidth = 1200;
let viewHeight = 520;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  viewWidth = rect.width;
  viewHeight = rect.height;
  canvas.width = Math.round(rect.width * pixelRatio);
  canvas.height = Math.round(rect.height * pixelRatio);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function setActive(buttons, selectedButton, className = 'is-active') {
  buttons.forEach((button) => {
    const active = button === selectedButton;
    button.classList.toggle(className, active);
    button.setAttribute('aria-pressed', active);
  });
}

function resetRope() {
  y.fill(0);
  yOld.fill(0);
  yNew.fill(0);
  idealPulses.length = 0;
  state.manualTarget = 0;
  state.manualValue = 0;
  state.time = 0;
}

function updateMedium() {
  state.medium = mediumSelect.value;
  for (let i = 0; i < points; i += 1) {
    const rightSide = i >= points / 2;
    if (state.medium === 'light-heavy') speeds[i] = rightSide ? 0.58 : 1;
    else if (state.medium === 'heavy-light') speeds[i] = rightSide ? 1 : 0.58;
    else speeds[i] = 1;
  }

  const composite = state.medium !== 'uniform';
  boundaryGroup.classList.toggle('is-muted', composite);
  speedReadout.textContent = composite ? '1.00 / 0.58' : speeds[0].toFixed(2);
  resetRope();
}

function updateLabels() {
  amplitudeValue.textContent = `${amplitudeSlider.value} px`;
  frequencyValue.textContent = `${Number(frequencySlider.value).toFixed(2)} Hz`;
  dampingValue.textContent = `${Number(dampingSlider.value).toFixed(1)}%`;
}

function sourceDisplacement(dt) {
  if (state.source === 'oscillator') {
    const amp = Number(amplitudeSlider.value);
    const freq = Number(frequencySlider.value);
    return amp * Math.sin(2 * Math.PI * freq * state.time);
  }

  state.manualValue += (state.manualTarget - state.manualValue) * Math.min(1, dt * 18);
  return state.manualValue;
}

function absorbRightEnd(strength) {
  const start = points - 78;
  for (let i = start; i < points; i += 1) {
    const edge = (i - start) / (points - 1 - start);
    const fade = Math.max(0, 1 - strength * edge * edge);
    yNew[i] *= fade;
    y[i] *= fade;
    yOld[i] *= fade;
  }
  yNew[points - 1] = 0;
  y[points - 1] = 0;
  yOld[points - 1] = 0;
}

function clampDisplacement(value) {
  const limit = Number(amplitudeSlider.value) * 2;
  return Math.max(-limit, Math.min(limit, value));
}

function pulseShape(type, progress) {
  if (progress < 0 || progress > 1) return 0;
  if (type === 'square') return 1;
  if (type === 'triangle') return 1 - Math.abs(progress * 2 - 1);
  if (type === 'sine') return Math.sin(2 * Math.PI * progress);
  return Math.sin(Math.PI * progress);
}

function pulseSample(type, center, width, position) {
  const start = center - width / 2;
  return pulseShape(type, (position - start) / width);
}

function idealPulseDisplacement(pulse, position) {
  const rightPoint = points - 1;
  const start = pulse.center - pulse.width / 2;
  let value = pulse.amplitude * pulseShape(pulse.type, (position - start) / pulse.width);

  if (
    state.medium === 'uniform'
    && (state.boundary === 'fixed' || state.boundary === 'free')
    && pulse.direction > 0
    && pulse.center + pulse.width / 2 > rightPoint
  ) {
    const reflectionSign = state.boundary === 'fixed' ? -1 : 1;
    value += pulse.amplitude * reflectionSign * pulseSample(pulse.type, pulse.center, pulse.width, 2 * rightPoint - position);
  }

  return clampDisplacement(value);
}

function sendPulse(type) {
  state.source = 'manual';
  setActive(sourceButtons, sourceButtons.find((button) => button.dataset.source === 'manual'));
  y.fill(0);
  yOld.fill(0);
  yNew.fill(0);
  idealPulses.length = 0;
  state.manualTarget = 0;
  state.manualValue = 0;

  idealPulses.push({
    type,
    center: 20,
    width: type === 'square' ? 28 : 36,
    amplitude: Number(amplitudeSlider.value),
    direction: 1,
    split: false,
    speed: 44
  });
}

function splitAtInterface(pulse, interfacePoint) {
  if (pulse.split || pulse.direction < 0 || pulse.center + pulse.width / 2 < interfacePoint) return;
  const lightToHeavy = state.medium === 'light-heavy';
  const reflectedSign = lightToHeavy ? -1 : 1;

  pulse.split = true;
  pulse.amplitude *= 0.72;
  pulse.speed = lightToHeavy ? 28 : 44;

  idealPulses.push({
    type: pulse.type,
    center: interfacePoint - (pulse.center + pulse.width / 2 - interfacePoint) - pulse.width / 2,
    width: pulse.width,
    amplitude: pulse.amplitude * 0.42 * reflectedSign,
    direction: -1,
    split: true,
    speed: lightToHeavy ? 44 : 28
  });
}

function reflectAtRightEnd(pulse, rightPoint) {
  if (pulse.direction < 0 || pulse.center + pulse.width / 2 < rightPoint) return;
  if (state.medium === 'uniform' && state.boundary === 'absorbing') {
    pulse.absorbing = true;
    return;
  }
  if (state.medium === 'uniform' && pulse.center - pulse.width / 2 <= rightPoint) return;

  pulse.center = 2 * rightPoint - pulse.center;
  pulse.direction = -1;
  if (state.medium === 'uniform' && state.boundary === 'fixed') pulse.amplitude *= -1;
}

function updateIdealPulses(dt) {
  const interfacePoint = points / 2;
  const rightPoint = points - 1;

  for (const pulse of idealPulses) {
    pulse.center += pulse.direction * pulse.speed * dt;
    if (state.medium !== 'uniform') splitAtInterface(pulse, interfacePoint);
    reflectAtRightEnd(pulse, rightPoint);
    if (pulse.absorbing) pulse.amplitude *= Math.max(0, 1 - dt * 5);
  }

  for (let i = idealPulses.length - 1; i >= 0; i -= 1) {
    const pulse = idealPulses[i];
    const outsideLeft = pulse.direction < 0 && pulse.center + pulse.width / 2 < 0;
    const outsideRight = pulse.absorbing && Math.abs(pulse.amplitude) < 0.5;
    if (outsideLeft || outsideRight) idealPulses.splice(i, 1);
  }
}

function step(dt) {
  const safeDt = Math.min(dt, 1 / 35);
  const damping = Number(dampingSlider.value) / 100;
  const courant = 0.54;

  y[0] = clampDisplacement(sourceDisplacement(safeDt));
  yOld[0] = y[0];

  for (let i = 1; i < points - 1; i += 1) {
    const leftSpeed = (speeds[i - 1] + speeds[i]) * 0.5;
    const rightSpeed = (speeds[i] + speeds[i + 1]) * 0.5;
    const leftFlux = leftSpeed * leftSpeed * (y[i - 1] - y[i]);
    const rightFlux = rightSpeed * rightSpeed * (y[i + 1] - y[i]);
    const laplacian = courant * courant * (leftFlux + rightFlux);
    yNew[i] = clampDisplacement((2 * y[i] - yOld[i] + laplacian) * (1 - damping));
  }

  if (state.medium === 'uniform' && state.boundary === 'absorbing') {
    absorbRightEnd(0.42);
  } else if (state.medium !== 'uniform') {
    yNew[points - 1] = yNew[points - 2];
    absorbRightEnd(0.08);
  } else if (state.boundary === 'fixed') {
    yNew[points - 1] = 0;
  } else {
    yNew[points - 1] = yNew[points - 2];
  }

  for (let i = 0; i < points; i += 1) {
    yOld[i] = clampDisplacement(y[i]);
    y[i] = clampDisplacement(yNew[i]);
  }

  state.time += safeDt;
}

function drawSpring(sourceY, baseY, leftPad) {
  const turns = 8;
  const startX = 18;
  const endX = leftPad - 16;
  ctx.beginPath();
  ctx.moveTo(startX, baseY);
  for (let i = 0; i <= turns * 2; i += 1) {
    const x = startX + ((endX - startX) * i) / (turns * 2);
    const offset = i % 2 === 0 ? -9 : 9;
    ctx.lineTo(x, (baseY + sourceY) / 2 + offset);
  }
  ctx.lineTo(endX, sourceY);
  ctx.strokeStyle = 'rgba(198, 243, 107, .72)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function draw() {
  const leftPad = 82;
  const rightPad = 42;
  const topPad = 54;
  const bottomPad = 58;
  const width = viewWidth - leftPad - rightPad;
  const midY = viewHeight * 0.52;
  const scale = Math.min(1.25, (viewHeight - topPad - bottomPad) / 260);
  const dx = width / (points - 1);

  ctx.clearRect(0, 0, viewWidth, viewHeight);

  ctx.fillStyle = '#081522';
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  ctx.strokeStyle = 'rgba(111, 148, 174, .28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftPad, midY);
  ctx.lineTo(viewWidth - rightPad, midY);
  ctx.stroke();

  if (state.medium !== 'uniform') {
    const interfaceX = leftPad + width / 2;
    ctx.fillStyle = state.medium === 'light-heavy' ? 'rgba(255, 173, 116, .08)' : 'rgba(86, 217, 233, .08)';
    ctx.fillRect(interfaceX, topPad, viewWidth - rightPad - interfaceX, viewHeight - topPad - bottomPad);
    ctx.strokeStyle = 'rgba(255, 173, 116, .72)';
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(interfaceX, topPad);
    ctx.lineTo(interfaceX, viewHeight - bottomPad);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffd6bf';
    ctx.font = '500 13px "Noto Sans TC", sans-serif';
    ctx.fillText('介面', interfaceX + 10, topPad + 22);
  }

  const displayY = new Float32Array(points);
  for (let i = 0; i < points; i += 1) {
    let value = y[i];
    for (const pulse of idealPulses) value += idealPulseDisplacement(pulse, i);
    displayY[i] = clampDisplacement(value);
  }

  drawSpring(midY - displayY[0] * scale, midY, leftPad);

  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < points; i += 1) {
    const x = leftPad + i * dx;
    const py = midY - displayY[i] * scale;
    if (i === 0) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  }
  ctx.strokeStyle = '#56d9e9';
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < points; i += 5) {
    const x = leftPad + i * dx;
    const py = midY - displayY[i] * scale;
    ctx.moveTo(x, py);
    ctx.arc(x, py, i === 0 ? 8 : 3.2, 0, Math.PI * 2);
  }
  ctx.fillStyle = '#c6f36b';
  ctx.fill();

  const endX = viewWidth - rightPad;
  if (state.medium === 'uniform' && state.boundary === 'fixed') {
    ctx.strokeStyle = '#ff7f99';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(endX + 8, midY - 76);
    ctx.lineTo(endX + 8, midY + 76);
    ctx.stroke();
    for (let i = -70; i <= 70; i += 18) {
      ctx.beginPath();
      ctx.moveTo(endX + 8, midY + i);
      ctx.lineTo(endX + 22, midY + i - 10);
      ctx.stroke();
    }
  } else if (state.medium === 'uniform' && state.boundary === 'free') {
    ctx.strokeStyle = '#ffad74';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(endX + 12, midY - displayY[points - 1] * scale, 14, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = '#edf5ff';
  ctx.font = '500 13px "Noto Sans TC", sans-serif';
  ctx.fillText(state.source === 'manual' ? '拖曳波源' : '簡諧振源', 22, midY + 44);

  const boundaryLabel = state.medium !== 'uniform'
    ? '組合繩：反射＋穿透'
    : state.boundary === 'fixed'
      ? '固定端：反射倒相'
      : state.boundary === 'free'
        ? '自由端：反射同相'
        : '吸收端：單純傳播';
  ctx.fillStyle = '#b4c5d4';
  ctx.fillText(boundaryLabel, Math.max(leftPad, viewWidth - 220), viewHeight - 28);
}

function animate(stamp) {
  if (!state.lastStamp) state.lastStamp = stamp;
  const dt = (stamp - state.lastStamp) / 1000;
  state.lastStamp = stamp;

  if (!state.paused) {
    const iterations = 2;
    for (let i = 0; i < iterations; i += 1) step(dt / iterations);
    updateIdealPulses(dt);
  }

  timeReadout.textContent = `${state.time.toFixed(1)} s`;
  draw();
  requestAnimationFrame(animate);
}

function pointerToDisplacement(event) {
  const rect = canvas.getBoundingClientRect();
  const yPos = event.clientY - rect.top;
  return Math.max(-145, Math.min(145, viewHeight * 0.52 - yPos));
}

sourceButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.source = button.dataset.source;
    setActive(sourceButtons, button);
    resetRope();
  });
});

boundaryButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.boundary = button.dataset.boundary;
    setActive(boundaryButtons, button);
    resetRope();
  });
});

pulseButtons.forEach((button) => {
  button.addEventListener('click', () => {
    sendPulse(button.dataset.pulse);
  });
});

[amplitudeSlider, frequencySlider, dampingSlider].forEach((slider) => {
  slider.addEventListener('input', updateLabels);
});

mediumSelect.addEventListener('change', updateMedium);
resetButton.addEventListener('click', resetRope);
pauseButton.addEventListener('click', () => {
  state.paused = !state.paused;
  pauseButton.textContent = state.paused ? '繼續' : '暫停';
});

canvas.addEventListener('pointerdown', (event) => {
  state.source = 'manual';
  setActive(sourceButtons, sourceButtons.find((button) => button.dataset.source === 'manual'));
  state.dragging = true;
  state.manualTarget = pointerToDisplacement(event);
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
  if (!state.dragging) return;
  state.manualTarget = pointerToDisplacement(event);
});

canvas.addEventListener('pointerup', (event) => {
  state.dragging = false;
  state.manualTarget = 0;
  canvas.releasePointerCapture(event.pointerId);
});

canvas.addEventListener('pointercancel', () => {
  state.dragging = false;
  state.manualTarget = 0;
});

window.addEventListener('resize', resizeCanvas);

resizeCanvas();
updateLabels();
updateMedium();
requestAnimationFrame(animate);
