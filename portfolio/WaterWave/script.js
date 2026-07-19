const canvas = document.getElementById('waveCanvas');
const ctx = canvas.getContext('2d');

const controls = {
    togglePlay: document.getElementById('togglePlay'),
    stepFrame: document.getElementById('stepFrame'),
    speed: document.getElementById('speedSlider'),
    amplitude: document.getElementById('amplitudeSlider'),
    showArrows: document.getElementById('showArrows'),
    showPath: document.getElementById('showPath'),
    showOrbit: document.getElementById('showOrbit'),
    showComponents: document.getElementById('showComponents'),
};

const outputs = {
    speed: document.getElementById('speedValue'),
    amplitude: document.getElementById('amplitudeValue'),
};

const state = {
    running: true,
    time: 0,
    lastTimestamp: 0,
    path: [],
};

const config = {
    waveLength: 500,
    period: 5,
    particleCount: 54,
    curveSamples: 360,
    trackedIndex: 27,
    orbitEvery: 9,
};

function syncOutputs() {
    outputs.speed.textContent = `${Number(controls.speed.value).toFixed(1)}×`;
    outputs.amplitude.textContent = controls.amplitude.value;
    controls.togglePlay.textContent = state.running ? '暫停' : '播放';
}

function canvasSize() {
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const width = canvas.clientWidth || 1000;
    const height = Math.round(width * 0.52);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { width, height };
}

function waveConstants() {
    return {
        amplitude: Number(controls.amplitude.value),
        k: (2 * Math.PI) / config.waveLength,
        omega: (2 * Math.PI) / config.period,
    };
}

function particleAt(baseX, restY, t, constants) {
    const phase = constants.k * baseX - constants.omega * t;
    return {
        x: baseX + constants.amplitude * Math.sin(phase),
        y: restY + constants.amplitude * Math.cos(phase),
        vx: -constants.amplitude * constants.omega * Math.cos(phase),
        vy: constants.amplitude * constants.omega * Math.sin(phase),
        horizontal: constants.amplitude * Math.sin(phase),
        vertical: constants.amplitude * Math.cos(phase),
        phase,
    };
}

function drawArrow(x, y, vx, vy, length, color) {
    const magnitude = Math.hypot(vx, vy);
    if (magnitude < 0.001) return;

    const ux = vx / magnitude;
    const uy = vy / magnitude;
    const endX = x + ux * length;
    const endY = y + uy * length;
    const head = 8;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - ux * head - uy * head * 0.55, endY - uy * head + ux * head * 0.55);
    ctx.lineTo(endX - ux * head + uy * head * 0.55, endY - uy * head - ux * head * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawBackground(width, height, restY) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#081421';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(86, 217, 233, 0.11)';
    ctx.lineWidth = 1;
    for (let x = 48; x < width; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 28);
        ctx.lineTo(x, height - 36);
        ctx.stroke();
    }
    for (let y = 42; y < height; y += 42) {
        ctx.beginPath();
        ctx.moveTo(28, y);
        ctx.lineTo(width - 28, y);
        ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(237, 245, 255, 0.32)';
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(36, restY);
    ctx.lineTo(width - 36, restY);
    ctx.stroke();
    ctx.setLineDash([]);

    drawProgressArrow(width);
}

function drawProgressArrow(width) {
    const startX = Math.max(220, width * 0.62);
    const y = 74;
    drawArrow(startX, y, 1, 0, Math.min(130, width * 0.15), '#ff8f5a');
    ctx.fillStyle = 'rgba(237, 245, 255, 0.88)';
    ctx.font = '800 15px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('波的前進方向', startX, y - 24);
}

function drawWaveCurve(width, restY, constants) {
    ctx.strokeStyle = '#56d9e9';
    ctx.lineWidth = 3;
    ctx.beginPath();

    for (let i = 0; i <= config.curveSamples; i += 1) {
        const baseX = (i / config.curveSamples) * width;
        const point = particleAt(baseX, restY, state.time, constants);
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
    }

    ctx.stroke();
}

function drawTrackedPath() {
    if (!controls.showPath.checked || state.path.length < 2) return;

    ctx.strokeStyle = 'rgba(255, 92, 115, 0.82)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    state.path.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
}

function drawOrbit(baseX, restY, radius, emphasized = false) {
    if (!controls.showOrbit.checked) return;

    ctx.save();
    ctx.strokeStyle = emphasized ? 'rgba(255, 92, 115, 0.78)' : 'rgba(237, 245, 255, 0.36)';
    ctx.lineWidth = emphasized ? 2.2 : 1.4;
    ctx.setLineDash(emphasized ? [] : [7, 5]);
    ctx.beginPath();
    ctx.arc(baseX, restY, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function hasTeachingOrbit(index, baseX, width, radius) {
    const fullyVisible = baseX - radius > 24 && baseX + radius < width - 24;
    return controls.showOrbit.checked && fullyVisible && (index === config.trackedIndex || index % config.orbitEvery === 0);
}

function drawComponents(baseX, restY, point, emphasized = false) {
    if (!controls.showComponents.checked) return;

    const color = emphasized ? '#ff5c73' : 'rgba(255, 92, 115, 0.72)';
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = emphasized ? 2.4 : 1.8;

    drawArrow(baseX, restY, point.horizontal, 0, Math.abs(point.horizontal), color);
    drawArrow(baseX + point.horizontal, restY, 0, point.vertical, Math.abs(point.vertical), color);

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = emphasized ? 'rgba(255, 92, 115, 0.5)' : 'rgba(255, 92, 115, 0.32)';
    ctx.beginPath();
    ctx.moveTo(baseX, restY);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    ctx.restore();
}

function drawParticles(width, restY, constants) {
    const spacing = width / (config.particleCount - 1);
    const arrowLength = Math.max(20, constants.amplitude * 0.55);
    let trackedPoint = null;

    for (let i = 0; i < config.particleCount; i += 1) {
        const baseX = i * spacing;
        const point = particleAt(baseX, restY, state.time, constants);
        const isTracked = i === config.trackedIndex;
        const showTeachingOrbit = hasTeachingOrbit(i, baseX, width, constants.amplitude);

        if (isTracked) trackedPoint = point;

        if (showTeachingOrbit) {
            drawOrbit(baseX, restY, constants.amplitude, isTracked);
        }

        if (isTracked || i % 18 === 0) {
            drawComponents(baseX, restY, point, isTracked);
        }

        ctx.fillStyle = isTracked ? '#ff5c73' : '#4aa8ff';
        ctx.beginPath();
        ctx.arc(point.x, point.y, isTracked ? 6.5 : showTeachingOrbit ? 5.2 : 3.8, 0, Math.PI * 2);
        ctx.fill();

        if (controls.showArrows.checked && showTeachingOrbit) {
            drawArrow(point.x, point.y, point.vx, point.vy, isTracked ? arrowLength * 1.35 : arrowLength, isTracked ? '#ff5c73' : '#c6f36b');
        }
    }

    if (trackedPoint && state.running) {
        state.path.push({ x: trackedPoint.x, y: trackedPoint.y });
        if (state.path.length > 180) state.path.shift();
    }

    return trackedPoint;
}

function drawInfo(width, height, constants, trackedPoint) {
    ctx.fillStyle = 'rgba(237, 245, 255, 0.88)';
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`時間 t = ${state.time.toFixed(2)} s`, 24, 22);
    ctx.fillText(`週期 T = ${config.period} s，波長 λ = ${config.waveLength}px`, 24, 44);
    ctx.fillText('每個代表質點被設定為等半徑圓周運動；藍色曲線連起同一時刻的水面位置', 24, 66);

    if (!state.running) {
        ctx.fillStyle = 'rgba(198, 243, 107, 0.95)';
        ctx.font = '800 22px system-ui, sans-serif';
        ctx.fillText('已暫停：可按「單步」逐格觀察速度方向', 24, height - 42);
    }

    if (trackedPoint) {
        const speed = Math.hypot(trackedPoint.vx, trackedPoint.vy);
        ctx.fillStyle = 'rgba(255, 92, 115, 0.95)';
        ctx.font = '700 13px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`紅點速率 ∝ ${speed.toFixed(1)}`, width - 24, 22);
    }
}

function render() {
    const { width, height } = canvasSize();
    const restY = height * 0.55;
    const constants = waveConstants();

    drawBackground(width, height, restY);
    drawWaveCurve(width, restY, constants);
    drawTrackedPath();
    const trackedPoint = drawParticles(width, restY, constants);
    drawInfo(width, height, constants, trackedPoint);
}

function animate(timestamp = 0) {
    if (!state.lastTimestamp) state.lastTimestamp = timestamp;
    const delta = Math.min((timestamp - state.lastTimestamp) / 1000, 0.08);
    state.lastTimestamp = timestamp;

    if (state.running) {
        state.time += delta * Number(controls.speed.value);
    }

    render();
    requestAnimationFrame(animate);
}

controls.togglePlay.addEventListener('click', () => {
    state.running = !state.running;
    syncOutputs();
});

controls.stepFrame.addEventListener('click', () => {
    if (state.running) state.running = false;
    state.time += 1 / 20;
    syncOutputs();
    render();
});

controls.speed.addEventListener('input', syncOutputs);
controls.amplitude.addEventListener('input', () => {
    state.path = [];
    syncOutputs();
    render();
});
controls.showArrows.addEventListener('change', render);
controls.showPath.addEventListener('change', render);
controls.showOrbit.addEventListener('change', render);
controls.showComponents.addEventListener('change', render);
window.addEventListener('resize', render);

syncOutputs();
requestAnimationFrame(animate);
