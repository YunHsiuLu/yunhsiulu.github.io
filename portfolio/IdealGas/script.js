const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// DOM 元素
const inputs = {
    n: document.getElementById('mol'),
    v: document.getElementById('vol'),
    t: document.getElementById('temp'),
    m: document.getElementById('mass') // 新增分子量
};

const displays = {
    n: document.getElementById('val-mol'),
    v: document.getElementById('val-vol'),
    t: document.getElementById('val-temp'),
    m: document.getElementById('val-mass'),
    p: document.getElementById('res-pressure'),
    vrms: document.getElementById('res-vrms')
};

// 狀態變數
let particles = [];
const particleRadius = 4;
let containerWidth = 300;
const containerHeight = 400;

// 定義箱子的固定左邊界 (相對於 Canvas 左側的距離)
const CONTAINER_LEFT_MARGIN = 100; 

// 顏色常數
const TEMP_MIN = 100;
const TEMP_MAX = 1000;
const COLOR_MIN = { r: 0, g: 0, b: 255 };   // 藍色
const COLOR_MAX = { r: 255, g: 0, b: 0 };   // 紅色

// 物理常數 (模擬用)
const R_SIM = 0.05; 
// 速度係數，因為除以質量後數值會變小，這裡稍微放大一點以維持視覺效果
const SPEED_SCALE = 1.0; 

// 初始化 Canvas 大小
function resizeCanvas() {
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// 粒子類別
class Particle {
    constructor(x, y, speed) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
    }

    update(leftWall, rightWall, topWall, bottomWall, speedMag) {
        // 移動
        this.x += this.vx;
        this.y += this.vy;

        // 速度正規化 (反映溫度與質量)
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (currentSpeed !== 0) {
            this.vx = (this.vx / currentSpeed) * speedMag;
            this.vy = (this.vy / currentSpeed) * speedMag;
        }

        // 邊界碰撞 (彈性碰撞)
        // 檢查左右
        if (this.x - particleRadius < leftWall) {
            this.x = leftWall + particleRadius;
            this.vx = Math.abs(this.vx); // 強制向右
        } else if (this.x + particleRadius > rightWall) {
            this.x = rightWall - particleRadius;
            this.vx = -Math.abs(this.vx); // 強制向左
        }

        // 檢查上下
        if (this.y - particleRadius < topWall) {
            this.y = topWall + particleRadius;
            this.vy = Math.abs(this.vy); // 強制向下
        } else if (this.y + particleRadius > bottomWall) {
            this.y = bottomWall - particleRadius;
            this.vy = -Math.abs(this.vy); // 強制向上
        }
    }

    draw(color) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, particleRadius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.closePath();
    }
}

// 顏色內插
function lerpColor(val, minVal, maxVal, colorStart, colorEnd) {
    let t = (val - minVal) / (maxVal - minVal);
    if (t < 0) t = 0;
    if (t > 1) t = 1;

    const r = Math.round(colorStart.r + (colorEnd.r - colorStart.r) * t);
    const g = Math.round(colorStart.g + (colorEnd.g - colorStart.g) * t);
    const b = Math.round(colorStart.b + (colorEnd.b - colorStart.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
}

// 核心邏輯
function updateSimulation() {
    // 1. 讀取數值
    const n = parseFloat(inputs.n.value);
    const v_pixel = parseFloat(inputs.v.value);
    const t = parseFloat(inputs.t.value);
    const m = parseFloat(inputs.m.value); // 分子量

    // 2. 更新 UI
    displays.n.textContent = n.toFixed(1);
    displays.v.textContent = (v_pixel / 10).toFixed(1);
    displays.t.textContent = t;
    displays.m.textContent = m;

    containerWidth = v_pixel;

    // 3. 計算目標速度 
    // Vrms 正比於 sqrt(T / M)
    const targetSpeed = Math.sqrt(t / m) * SPEED_SCALE;

    // 4. 計算壓力 (P = nRT / V) - 注意這裡不除以 M，因為 n 是莫耳數
    const pressure = (n * t * R_SIM * 1000) / v_pixel; 
    displays.p.textContent = pressure.toFixed(2);

    // 5. 粒子數量管理
    const targetCount = Math.round(n * 50);
    
    // 計算邊界座標 (用於新生粒子)
    const centerY = canvas.height / 2;
    const top = centerY - containerHeight / 2;
    const left = CONTAINER_LEFT_MARGIN;
    
    if (particles.length < targetCount) {
        for (let i = particles.length; i < targetCount; i++) {
            // 新粒子出生在容器內隨機位置，避免一開始就出生在牆外
            const randX = left + Math.random() * (containerWidth - 20) + 10;
            const randY = top + Math.random() * (containerHeight - 20) + 10;
            particles.push(new Particle(randX, randY, targetSpeed));
        }
    } else if (particles.length > targetCount) {
        particles.splice(targetCount);
    }

    const color = lerpColor(t, TEMP_MIN, TEMP_MAX, COLOR_MIN, COLOR_MAX);

    return { targetSpeed, color };
}

function animate() {
    // 繪製背景 (淡灰藍色 #eef2f5)
    ctx.fillStyle = '#eef2f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const { targetSpeed, color } = updateSimulation();

    // 定義容器邊界
    // 垂直置中，水平固定左側
    const centerY = canvas.height / 2;
    const top = centerY - containerHeight / 2;
    const bottom = centerY + containerHeight / 2;
    const left = CONTAINER_LEFT_MARGIN;
    const right = left + containerWidth;

    // 繪製容器 (白色背景，黑色邊框)
    ctx.fillStyle = '#fff';
    ctx.fillRect(left, top, containerWidth, containerHeight);
    
    // 繪製邊框
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 4;
    ctx.strokeRect(left, top, containerWidth, containerHeight);

    // 繪製 "活塞" 感覺 (右邊那條線畫粗一點或換個顏色表示它是可動的)
    ctx.beginPath();
    ctx.moveTo(right, top);
    ctx.lineTo(right, bottom);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#888'; // 活塞顏色
    ctx.stroke();

    let sumVelocitySq = 0;

    particles.forEach(p => {
        // 傳入四個邊界座標
        p.update(left, right, top, bottom, targetSpeed);
        p.draw(color);
        
        const vSq = p.vx * p.vx + p.vy * p.vy;
        sumVelocitySq += vSq;
    });

    // 計算 Vrms
    if (particles.length > 0) {
        const rawVrms = Math.sqrt(sumVelocitySq / particles.length);
        // 這裡乘以一個常數是為了讓顯示的數字看起來像真實物理量級 (例如 300~500 m/s)
        // 因為像素速度和真實速度單位不同，這裡做個 mapping
        const displayVrms = rawVrms * 50; 
        displays.vrms.textContent = displayVrms.toFixed(2);
    } else {
        displays.vrms.textContent = "0.00";
    }

    requestAnimationFrame(animate);
}

// 事件監聽 (不需要特別做什麼，animate loop 會自動抓值)
Object.values(inputs).forEach(input => {
    input.addEventListener('input', () => {});
});

animate();
