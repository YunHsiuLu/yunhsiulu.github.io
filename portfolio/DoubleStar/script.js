const canvas = document.getElementById('starCanvas');
const ctx = canvas.getContext('2d');

// --- UI Elements ---
const inputs = {
    mass1: document.getElementById('mass1'),
    mass2: document.getElementById('mass2'),
    dist: document.getElementById('distance'),
    vScale: document.getElementById('velocity-scale'),
    speed: document.getElementById('sim-speed') // 新增速度輸入
};

const displays = {
    mass1: document.getElementById('mass1-display'),
    mass2: document.getElementById('mass2-display'),
    dist: document.getElementById('distance-display'),
    vScale: document.getElementById('velocity-display'),
    speed: document.getElementById('speed-display') // 新增速度顯示
};

const telemetry = {
    v1: document.getElementById('v1-value'),
    ke1: document.getElementById('ke1-value'),
    v2: document.getElementById('v2-value'),
    ke2: document.getElementById('ke2-value'),
    currDist: document.getElementById('curr-dist-value'),
};

// --- Simulation State ---
const G = 0.8; 
let star1 = { x: 0, y: 0, vx: 0, vy: 0, mass: 200, color: '#ff8c00', radius: 20, trail: [] };
let star2 = { x: 0, y: 0, vx: 0, vy: 0, mass: 100, color: '#4682b4', radius: 15, trail: [] };
let centerOfMass = { x: 0, y: 0 };

const MAX_TRAIL_LENGTH = 200;

// --- Resize Handling ---
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    centerOfMass.x = canvas.width / 2;
    centerOfMass.y = canvas.height / 2;
}
window.addEventListener('resize', resize);
resize();

// --- Initialization ---
function initSystem() {
    const m1 = parseInt(inputs.mass1.value);
    const m2 = parseInt(inputs.mass2.value);
    const initialDist = parseInt(inputs.dist.value);
    const vFactor = parseFloat(inputs.vScale.value);

    // Update Text
    displays.mass1.textContent = m1;
    displays.mass2.textContent = m2;
    displays.dist.textContent = initialDist;
    displays.vScale.textContent = vFactor.toFixed(2);

    // Setup Stars
    star1.mass = m1;
    star1.radius = 10 + Math.sqrt(m1); 
    star2.mass = m2;
    star2.radius = 10 + Math.sqrt(m2);

    // Position relative to Center of Mass
    const totalMass = m1 + m2;
    const r1 = (initialDist * m2) / totalMass;
    const r2 = (initialDist * m1) / totalMass;

    star1.x = centerOfMass.x - r1;
    star1.y = centerOfMass.y;
    star2.x = centerOfMass.x + r2;
    star2.y = centerOfMass.y;

    star1.trail = [];
    star2.trail = [];

    // Initial Velocity Calculation
    const force = (G * m1 * m2) / (initialDist * initialDist);
    const v1_circ = Math.sqrt( (force * r1) / m1 );
    const v2_circ = Math.sqrt( (force * r2) / m2 );

    star1.vx = 0;
    star1.vy = v1_circ * vFactor; 

    star2.vx = 0;
    star2.vy = -v2_circ * vFactor; 
}

// --- Physics Engine ---
function updatePhysics() {
    // 取得當前模擬速度 (dt)
    let dt = parseFloat(inputs.speed.value);
    displays.speed.textContent = dt.toFixed(1);

    // 如果速度為 0，則暫停物理計算，直接返回
    if (dt <= 0) return;

    const dx = star2.x - star1.x;
    const dy = star2.y - star1.y;
    const distSq = dx*dx + dy*dy;
    const dist = Math.sqrt(distSq);

    if (dist < (star1.radius + star2.radius)) return; 

    const force = (G * star1.mass * star2.mass) / distSq;
    const fx = force * (dx / dist);
    const fy = force * (dy / dist);

    // 更新速度 (v = v0 + a * dt)
    // 這裡我們將 dt 乘進去，實現時間快慢控制
    star1.vx += (fx / star1.mass) * dt;
    star1.vy += (fy / star1.mass) * dt;
    
    star2.vx -= (fx / star2.mass) * dt;
    star2.vy -= (fy / star2.mass) * dt;

    // 更新位置 (x = x0 + v * dt)
    star1.x += star1.vx * dt;
    star1.y += star1.vy * dt;
    
    star2.x += star2.vx * dt;
    star2.y += star2.vy * dt;

    // 軌跡更新邏輯 (依據速度決定採樣頻率，避免慢動作時點太密集)
    // 如果速度很快(dt大)，每一幀都紀錄；如果速度慢，則減少紀錄頻率
    let recordFrequency = dt > 0.5 ? 1 : 3;
    if (simulationFrame % recordFrequency === 0) {
        star1.trail.push({x: star1.x, y: star1.y});
        star2.trail.push({x: star2.x, y: star2.y});
        
        if (star1.trail.length > MAX_TRAIL_LENGTH) star1.trail.shift();
        if (star2.trail.length > MAX_TRAIL_LENGTH) star2.trail.shift();
    }
}

// --- Update UI Stats ---
function updateTelemetry() {
    // 計算顯示用的數值 (這裡顯示的是瞬時速度大小，與時間流逝速度無關)
    const v1 = Math.hypot(star1.vx, star1.vy);
    const v2 = Math.hypot(star2.vx, star2.vy);
    const sep = Math.hypot(star2.x - star1.x, star2.y - star1.y);

    const ke1 = 0.5 * star1.mass * v1 * v1;
    const ke2 = 0.5 * star2.mass * v2 * v2;

    telemetry.v1.textContent = v1.toFixed(2);
    telemetry.ke1.textContent = Math.round(ke1);
    telemetry.v2.textContent = v2.toFixed(2);
    telemetry.ke2.textContent = Math.round(ke2);
    telemetry.currDist.textContent = sep.toFixed(1);
}

// --- Drawing ---
function draw() {
    // 使用半透明黑色覆蓋，產生長殘影效果 (Motion Blur)
    // 如果想要清晰的線條軌跡，可改回 clearRect
    // ctx.fillStyle = 'rgba(26, 26, 26, 0.2)'; 
    // ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 為了讓暫停時畫面乾淨，這裡使用 clearRect
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Center of Mass
    ctx.beginPath();
    ctx.arc(centerOfMass.x, centerOfMass.y, 4, 0, Math.PI*2);
    ctx.fillStyle = '#666';
    ctx.fill();
    ctx.fillStyle = '#888';
    ctx.fillText("COM", centerOfMass.x + 8, centerOfMass.y + 4);

    // Draw Trails
    drawTrail(star1.trail, star1.color);
    drawTrail(star2.trail, star2.color);

    // Draw Stars
    drawStar(star1);
    drawStar(star2);
}

function drawStar(star) {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    
    const gradient = ctx.createRadialGradient(star.x, star.y, star.radius * 0.2, star.x, star.y, star.radius * 2);
    gradient.addColorStop(0, star.color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.fillStyle = gradient;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; // 讓兩星重疊時變更亮
    ctx.fillStyle = star.color;
    ctx.shadowBlur = 20;
    ctx.shadowColor = star.color;
    ctx.fill();
    ctx.restore();
}

function drawTrail(trail, color) {
    if (trail.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.moveTo(trail[0].x, trail[0].y);
    for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(trail[i].x, trail[i].y);
    }
    ctx.stroke();
}

// --- Main Loop ---
let simulationFrame = 0;
function loop() {
    updatePhysics();
    updateTelemetry();
    draw();
    simulationFrame++;
    requestAnimationFrame(loop);
}

// --- Events ---
inputs.mass1.addEventListener('input', initSystem);
inputs.mass2.addEventListener('input', initSystem);
inputs.dist.addEventListener('input', initSystem);
inputs.vScale.addEventListener('input', initSystem);

// 速度滑桿不需要重新初始化系統，只需要在 updatePhysics 裡讀取即可
// 但為了更新顯示數值，可以加個事件
inputs.speed.addEventListener('input', () => {
    displays.speed.textContent = parseFloat(inputs.speed.value).toFixed(1);
});

document.getElementById('btn-reset').addEventListener('click', () => {
    // 重置時將速度設回 1.0
    inputs.speed.value = 1.0;
    displays.speed.textContent = "1.0";
    initSystem();
});

// Start
initSystem();
loop();
