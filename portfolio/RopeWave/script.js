const canvas = document.getElementById('ropeCanvas');
const ctx = canvas.getContext('2d');

const sourceButtons = [...document.querySelectorAll('[data-source]')];
const boundaryButtons = [...document.querySelectorAll('[data-boundary]')];
const pulseButtons = [...document.querySelectorAll('[data-pulse]')];
const harmonicStepButtons = [...document.querySelectorAll('[data-harmonic-step]')];
const harmonicOrderInput = document.getElementById('harmonicOrder');
const harmonicFrequency = document.getElementById('harmonicFrequency');
const applyHarmonicButton = document.getElementById('applyHarmonic');
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
const lengthReadout = document.getElementById('lengthReadout');
const speedReadout = document.getElementById('speedReadout');
const timeReadout = document.getElementById('timeReadout');

const state = {
  source: 'manual',
  boundary: 'absorbing',
  medium: 'uniform',
  pulseType: 'half-sine',
  paused: false,
  dragging: false,
  manualTarget: 0,
  manualValue: 0,
  time: 0,
  lastStamp: 0
};

const points = 240;
const ropeLengthMeters = 4;
const baseWaveSpeed = 1;
const fundamentalFrequency = baseWaveSpeed / (2 * ropeLengthMeters);
const gridSpacingMeters = ropeLengthMeters / (points - 1);
const simulationStep = 0.006;
const y = new Float32Array(points);
const yOld = new Float32Array(points);
const yNew = new Float32Array(points);
const speeds = new Float32Array(points);
const idealPulses = [];
const manualHistory = [];
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
  manualHistory.length = 0;
  state.manualTarget = 0;
  state.manualValue = 0;
  state.time = 0;
}

function updateMedium() {
  state.medium = mediumSelect.value;
  for (let i = 0; i < points; i += 1) {
    const rightSide = i >= points / 2;
    if (state.medium === 'light-heavy') speeds[i] = rightSide ? 0.58 : baseWaveSpeed;
    else if (state.medium === 'heavy-light') speeds[i] = rightSide ? baseWaveSpeed : 0.58;
    else speeds[i] = baseWaveSpeed;
  }

  const composite = state.medium !== 'uniform';
  boundaryGroup.classList.toggle('is-muted', composite);
  lengthReadout.textContent = `${ropeLengthMeters.toFixed(2)} m`;
  speedReadout.textContent = composite ? '1.00 / 0.58 m/s' : `${speeds[0].toFixed(2)} m/s`;
  resetRope();
}

function updateLabels() {
  amplitudeValue.textContent = `${amplitudeSlider.value} px`;
  frequencyValue.textContent = `${Number(frequencySlider.value).toFixed(3)} Hz`;
  dampingValue.textContent = `${Number(dampingSlider.value).toFixed(1)}%`;
  updateHarmonicReadout();
}

function clampHarmonicOrder(value) {
  const maxOrder = Number(harmonicOrderInput.max);
  const order = Math.round(Number(value));
  if (!Number.isFinite(order)) return 1;
  return Math.max(1, Math.min(maxOrder, order));
}

function harmonicFrequencyFor(order) {
  return order * fundamentalFrequency;
}

function updateHarmonicReadout() {
  if (!harmonicOrderInput || !harmonicFrequency) return;
  const order = clampHarmonicOrder(harmonicOrderInput.value);
  harmonicOrderInput.value = String(order);
  harmonicFrequency.textContent = `${harmonicFrequencyFor(order).toFixed(3)} Hz`;
}

function applyHarmonicOrder(order = harmonicOrderInput.value) {
  const nextOrder = clampHarmonicOrder(order);
  const nextFrequency = harmonicFrequencyFor(nextOrder);
  harmonicOrderInput.value = String(nextOrder);
  frequencySlider.value = nextFrequency.toFixed(3);
  state.source = 'oscillator';
  setActive(sourceButtons, sourceButtons.find((item) => item.dataset.source === 'oscillator'));
  updateLabels();
  resetRope();
}

function sourceDisplacement(dt) {
  if (state.source === 'oscillator') {
    return oscillatorSourceAt(state.time);
  }

  state.manualValue += (state.manualTarget - state.manualValue) * Math.min(1, dt * 18);
  return state.manualValue;
}

function recordManualSource(value) {
  manualHistory.push({ time: state.time, value });

  const longestDelay = (ropeLengthMeters * 2.2) / Math.min(0.58, baseWaveSpeed);
  while (manualHistory.length > 2 && manualHistory[1].time < state.time - longestDelay) {
    manualHistory.shift();
  }
}

function sampleManualHistory(sampleTime) {
  if (sampleTime < 0 || manualHistory.length === 0) return 0;
  if (sampleTime <= manualHistory[0].time) return manualHistory[0].value;

  const last = manualHistory[manualHistory.length - 1];
  if (sampleTime >= last.time) return last.value;

  let low = 0;
  let high = manualHistory.length - 1;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (manualHistory[mid].time <= sampleTime) low = mid;
    else high = mid;
  }

  const before = manualHistory[low];
  const after = manualHistory[high];
  const ratio = (sampleTime - before.time) / Math.max(0.0001, after.time - before.time);
  return before.value + (after.value - before.value) * ratio;
}

function clampDisplacement(value) {
  const limit = Number(amplitudeSlider.value) * 2;
  return Math.max(-limit, Math.min(limit, value));
}

function oscillatorSourceAt(sampleTime) {
  if (sampleTime < 0) return 0;

  const amp = Number(amplitudeSlider.value);
  const freq = Number(frequencySlider.value);
  const rampDuration = Math.min(0.8, Math.max(0.18, 0.5 / Math.max(freq, 0.001)));
  const ramp = Math.min(1, sampleTime / rampDuration);
  const smoothRamp = ramp * ramp * (3 - 2 * ramp);
  return amp * smoothRamp * Math.sin(2 * Math.PI * freq * sampleTime);
}

function manualDisplacement(position) {
  if (state.source !== 'manual') return 0;

  const x = position * gridSpacingMeters;
  const damping = Number(dampingSlider.value) / 100;
  const attenuation = Math.exp(-damping * x * 8);
  const sourceAt = (delayMeters, speed = baseWaveSpeed) => sampleManualHistory(state.time - delayMeters / speed);

  if (state.medium !== 'uniform') {
    const interfaceX = ropeLengthMeters / 2;
    const rightSpeed = state.medium === 'light-heavy' ? 0.58 : baseWaveSpeed;
    const reflectedSign = state.medium === 'light-heavy' ? -1 : 1;

    if (x < interfaceX) {
      const incident = sourceAt(x);
      const reflected = 0.42 * reflectedSign * sourceAt(2 * interfaceX - x);
      return clampDisplacement((incident + reflected) * attenuation);
    }

    const incidentAtInterface = sourceAt(interfaceX + (x - interfaceX) * (baseWaveSpeed / rightSpeed));
    return clampDisplacement(0.72 * incidentAtInterface * attenuation);
  }

  const incident = sourceAt(x);
  if (state.boundary === 'absorbing') {
    const fadeStart = ropeLengthMeters * 0.86;
    const edge = x <= fadeStart ? 0 : (x - fadeStart) / (ropeLengthMeters - fadeStart);
    return clampDisplacement(incident * attenuation * Math.max(0, 1 - edge * edge));
  }

  const reflectedSign = state.boundary === 'fixed' ? -1 : 1;
  const reflected = reflectedSign * sourceAt(2 * ropeLengthMeters - x);
  return clampDisplacement((incident + reflected) * attenuation);
}

function stepOscillatorRope(dt) {
  let remaining = dt;
  while (remaining > 0) {
    const h = Math.min(simulationStep, remaining);
    const damping = Number(dampingSlider.value) * 3.2;
    const limit = Number(amplitudeSlider.value) * 2;

    y[0] = oscillatorSourceAt(state.time);
    yOld[0] = oscillatorSourceAt(Math.max(0, state.time - h));

    for (let i = 1; i < points - 1; i += 1) {
      const courant = (speeds[i] * h) / gridSpacingMeters;
      const velocity = y[i] - yOld[i];
      const curvature = y[i + 1] - 2 * y[i] + y[i - 1];
      const next = 2 * y[i] - yOld[i] + courant * courant * curvature - damping * h * velocity;
      yNew[i] = Math.max(-limit, Math.min(limit, next));
    }

    yNew[0] = oscillatorSourceAt(state.time + h);

    if (state.medium === 'uniform' && state.boundary === 'absorbing') {
      yNew[points - 1] = y[points - 2];
    } else if (state.medium === 'uniform' && state.boundary === 'free') {
      yNew[points - 1] = yNew[points - 2];
    } else {
      yNew[points - 1] = 0;
    }

    if (state.medium === 'uniform' && state.boundary === 'absorbing') {
      const spongeStart = Math.floor(points * 0.82);
      for (let i = spongeStart; i < points; i += 1) {
        const edge = (i - spongeStart) / (points - spongeStart - 1);
        const sponge = Math.max(0, 1 - edge * edge * 0.18);
        yNew[i] *= sponge;
      }
    }

    for (let i = 0; i < points; i += 1) {
      yOld[i] = y[i];
      y[i] = yNew[i];
    }

    state.time += h;
    remaining -= h;
  }
}

function pulseShape(type, progress, flipped = false) {
  const sampleProgress = flipped ? 1 - progress : progress;
  if (progress < 0 || progress > 1) return 0;
  if (type === 'square') return 1;
  if (type === 'triangle') return 1 - Math.abs(sampleProgress * 2 - 1);
  if (type === 'sine') return Math.sin(2 * Math.PI * sampleProgress);
  return Math.sin(Math.PI * sampleProgress);
}

function pulseSample(type, center, width, position, flipped = false) {
  const start = center - width / 2;
  return pulseShape(type, (position - start) / width, flipped);
}

function idealPulseDisplacement(pulse, position) {
  const rightPoint = points - 1;
  const start = pulse.center - pulse.width / 2;
  let value = pulse.amplitude * pulseShape(pulse.type, (position - start) / pulse.width, pulse.flipped);

  if (
    state.medium === 'uniform'
    && (state.boundary === 'fixed' || state.boundary === 'free')
    && pulse.direction > 0
    && pulse.center + pulse.width / 2 > rightPoint
  ) {
    const reflectionSign = state.boundary === 'fixed' ? -1 : 1;
    value += pulse.amplitude * reflectionSign * pulseSample(pulse.type, pulse.center, pulse.width, 2 * rightPoint - position, pulse.flipped);
  }

  return clampDisplacement(value);
}

function sendPulse(type) {
  state.source = 'pulse';
  state.pulseType = type;
  setActive(sourceButtons, sourceButtons.find((button) => button.dataset.source === 'pulse'));
  setActive(pulseButtons, pulseButtons.find((button) => button.dataset.pulse === type));
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
    flipped: false,
    split: false,
    speed: (baseWaveSpeed / ropeLengthMeters) * (points - 1)
  });
}

function splitAtInterface(pulse, interfacePoint) {
  if (pulse.split || pulse.direction < 0 || pulse.center + pulse.width / 2 < interfacePoint) return;
  const lightToHeavy = state.medium === 'light-heavy';
  const reflectedSign = lightToHeavy ? -1 : 1;

  pulse.split = true;
  pulse.amplitude *= 0.72;
  pulse.speed = ((lightToHeavy ? 0.58 : baseWaveSpeed) / ropeLengthMeters) * (points - 1);

  idealPulses.push({
    type: pulse.type,
    center: interfacePoint - (pulse.center + pulse.width / 2 - interfacePoint) - pulse.width / 2,
    width: pulse.width,
    amplitude: pulse.amplitude * 0.42 * reflectedSign,
    direction: -1,
    flipped: !pulse.flipped,
    split: true,
    speed: ((lightToHeavy ? baseWaveSpeed : 0.58) / ropeLengthMeters) * (points - 1)
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
  pulse.flipped = !pulse.flipped;
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
  if (state.source === 'manual') {
    recordManualSource(clampDisplacement(sourceDisplacement(dt)));
    state.time += dt;
    return;
  }

  if (state.source === 'oscillator') {
    stepOscillatorRope(dt);
    return;
  }

  state.time += dt;
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
    let value = manualDisplacement(i) + y[i];
    for (const pulse of idealPulses) value += idealPulseDisplacement(pulse, i);
    displayY[i] = clampDisplacement(value);
  }
  window.__ropeDebug = { displayY: Array.from(displayY), source: state.source, boundary: state.boundary };

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
  const sourceLabel = state.source === 'oscillator'
    ? '振盪源'
    : state.source === 'pulse'
      ? '脈波源'
      : '手動源';
  ctx.fillText(sourceLabel, 22, midY + 44);

  const boundaryLabel = state.medium !== 'uniform'
    ? '組合繩：反射＋穿透'
    : state.boundary === 'fixed'
      ? '固定端：反射倒相'
      : state.boundary === 'free'
        ? '鬆弛端：反射同相'
        : '無邊界：單純傳播';
  ctx.fillStyle = '#b4c5d4';
  ctx.fillText(boundaryLabel, Math.max(leftPad, viewWidth - 220), viewHeight - 28);
}

function animate(stamp) {
  if (!state.lastStamp) state.lastStamp = stamp;
  const dt = Math.min((stamp - state.lastStamp) / 1000, 0.05);
  state.lastStamp = stamp;

  if (!state.paused) {
    step(dt);
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
    if (state.source === 'pulse') sendPulse(state.pulseType);
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

harmonicStepButtons.forEach((button) => {
  button.addEventListener('click', () => {
    applyHarmonicOrder(clampHarmonicOrder(harmonicOrderInput.value) + Number(button.dataset.harmonicStep));
  });
});

harmonicOrderInput.addEventListener('input', updateHarmonicReadout);
harmonicOrderInput.addEventListener('change', () => applyHarmonicOrder());
applyHarmonicButton.addEventListener('click', () => applyHarmonicOrder());

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
  if (state.source !== 'manual') resetRope();
  state.source = 'manual';
  setActive(sourceButtons, sourceButtons.find((button) => button.dataset.source === 'manual'));
  state.dragging = true;
  state.manualTarget = pointerToDisplacement(event);
  state.manualValue = state.manualTarget;
  recordManualSource(clampDisplacement(state.manualValue));
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
setActive(pulseButtons, pulseButtons.find((button) => button.dataset.pulse === state.pulseType));
requestAnimationFrame(animate);
