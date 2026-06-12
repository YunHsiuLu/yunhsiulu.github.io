const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// --- 1. 真實物理常數與系統設定 ---
canvas.width = 600;
canvas.height = 600;
const G = 6.67430e-11;
const AU = 1.495978707e11;
const M_SUN = 1.989e30;
const M_MOON = 7.342e22;
const D_MOON = 384400000;

// 物理引擎設定
const fixed_dt = 3600; // 底層物理步長：每次運算 1 小時
let total_days = 0;
let isRunning = true;
let simSpeed = 24; // 畫面更新一次，跑幾次物理迴圈
let frameCounter = 0;

// 畫面平移與縮放設定
let offsetX = canvas.width / 2;
let offsetY = canvas.height / 2;
let scale = canvas.width / (2 * 18 * AU); // 初始視野拉遠至 18 AU (看見哈雷彗星)
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// --- 2. 天體類別定義 ---
class Planet {
    constructor(name, mass, semi_major_axis, eccentricity, inclination_deg, color, radius) {
        this.name = name;
        this.mass = mass;
        this.a = semi_major_axis * AU;
        this.e = eccentricity;
        this.color = color;
        this.radius = radius; // 畫布上的顯示半徑

        const r_p = this.a * (1 - this.e); // 近日點距離
        this.x = r_p;
        this.y = 0;
        this.z = 0;

        // 活力公式計算近日點切線速度
        const v_perihelion = Math.sqrt((G * M_SUN / this.a) * ((1 + this.e) / (1 - this.e)));
        const incl_rad = inclination_deg * Math.PI / 180;
        
        this.vx = 0;
        this.vy = v_perihelion * Math.cos(incl_rad);
        this.vz = v_perihelion * Math.sin(incl_rad);

        // 預先計算靜態軌道點 (極座標方程式轉卡氏)
        this.orbitPoints = [];
        for (let theta = 0; theta <= Math.PI * 2; theta += 0.02) {
            let r_theta = this.a * (1 - this.e * this.e) / (1 + this.e * Math.cos(theta));
            let ox = r_theta * Math.cos(theta);
            let oy = r_theta * Math.sin(theta) * Math.cos(incl_rad); // 投影至 2D 平面
            this.orbitPoints.push({ x: ox, y: oy });
        }
    }

    update(dt) {
        const r = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        const ax = -G * M_SUN * this.x / (r * r * r);
        const ay = -G * M_SUN * this.y / (r * r * r);
        const az = -G * M_SUN * this.z / (r * r * r);
        
        this.vx += ax * dt;
        this.vy += ay * dt;
        this.vz += az * dt;
        
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.z += this.vz * dt;
    }

    getVelocity() {
        // 回傳公里/秒
        return Math.sqrt(this.vx**2 + this.vy**2 + this.vz**2) / 1000;
    }
}

// 衛星類別 (月球)
class Satellite {
    constructor(parent, mass, semi_major_axis_m, eccentricity, inclination_deg, color) {
        this.parent = parent;
        this.mass = mass;
        this.a = semi_major_axis_m;
        this.e = eccentricity;
        this.color = color;

        const r_p = this.a * (1 - this.e);
        this.rel_x = r_p;
        this.rel_y = 0;
        this.rel_z = 0;

        const v_perihelion = Math.sqrt((G * parent.mass / this.a) * ((1 + this.e) / (1 - this.e)));
        const incl_rad = inclination_deg * Math.PI / 180;
        
        this.rel_vx = 0;
        this.rel_vy = v_perihelion * Math.cos(incl_rad);
        this.rel_vz = v_perihelion * Math.sin(incl_rad);

        this.x = this.parent.x + this.rel_x;
        this.y = this.parent.y + this.rel_y;

        // 相對軌道環
        this.relOrbitPoints = [];
        for (let theta = 0; theta <= Math.PI * 2; theta += 0.1) {
            let r_theta = this.a * (1 - this.e * this.e) / (1 + this.e * Math.cos(theta));
            this.relOrbitPoints.push({
                x: r_theta * Math.cos(theta),
                y: r_theta * Math.sin(theta) * Math.cos(incl_rad)
            });
        }
    }

    update(dt) {
        const r = Math.sqrt(this.rel_x**2 + this.rel_y**2 + this.rel_z**2);
        const ax = -G * this.parent.mass * this.rel_x / (r*r*r);
        const ay = -G * this.parent.mass * this.rel_y / (r*r*r);
        const az = -G * this.parent.mass * this.rel_z / (r*r*r);
        
        this.rel_vx += ax * dt;
        this.rel_vy += ay * dt;
        this.rel_vz += az * dt;
        
        this.rel_x += this.rel_vx * dt;
        this.rel_y += this.rel_vy * dt;
        this.rel_z += this.rel_vz * dt;
        
        this.x = this.parent.x + this.rel_x;
        this.y = this.parent.y + this.rel_y;
    }
}

// --- 3. 初始化星體 ---
const planets = [
    new Planet("Mercury", 3.30e23, 0.387, 0.2056, 7.00, '#aaaaaa', 3),
    new Planet("Venus", 4.87e24, 0.723, 0.0067, 3.39, '#daa520', 4),
    new Planet("Earth", 5.97e24, 1.000, 0.0167, 0.00, '#1e90ff', 4),
    new Planet("Mars", 6.42e23, 1.524, 0.0934, 1.85, '#ff6347', 3),
    new Planet("Jupiter", 1.90e27, 5.204, 0.0489, 1.30, '#ffa500', 7),
    new Planet("Saturn", 5.68e26, 9.582, 0.0565, 2.49, '#f0e68c', 6),
    new Planet("Uranus", 8.68e25, 19.20, 0.0457, 0.77, '#add8e6', 5),
    new Planet("Neptune", 1.02e26, 30.05, 0.0113, 1.77, '#0000ff', 5),
    new Planet("Halley's Comet", 2.2e14, 17.8, 0.967, 162.2, '#00ffff', 2)
];
const earthObj = planets.find(p => p.name === "Earth");
const halleyObj = planets.find(p => p.name === "Halley's Comet");
// 月球視覺距離放大 40 倍以利觀察
const moon = new Satellite(earthObj, M_MOON, D_MOON * 40, 0.0549, 5.14, '#ffffff'); 

// --- 4. 初始化 Chart.js ---
const chartCtx = document.getElementById('speedChart').getContext('2d');
const speedChart = new Chart(chartCtx, {
    type: 'line',
    data: {
        labels: Array(100).fill(''),
        datasets: [
            { label: '哈雷彗星 (km/s)', borderColor: '#00ffff', data: [], borderWidth: 2, pointRadius: 0, tension: 0.2 },
            { label: '地球 (km/s)', borderColor: '#1e90ff', data: [], borderWidth: 2, pointRadius: 0, tension: 0.2 }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
            y: { beginAtZero: true, max: 60, title: { display: true, text: '軌道速度 (km/s)' } },
            x: { display: false }
        }
    }
});

// --- 5. 渲染與動畫迴圈 ---
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 畫靜態軌道
    planets.forEach(p => {
        ctx.beginPath();
        p.orbitPoints.forEach((pt, idx) => {
            let px = offsetX + pt.x * scale;
            let py = offsetY + pt.y * scale;
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.25;
        ctx.stroke();
    });
    ctx.globalAlpha = 1.0;

    // 畫月球的動態軌道環
    ctx.beginPath();
    moon.relOrbitPoints.forEach((pt, idx) => {
        let px = offsetX + (earthObj.x + pt.x) * scale;
        let py = offsetY + (earthObj.y + pt.y) * scale;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.strokeStyle = moon.color;
    ctx.globalAlpha = 0.4;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // 畫星體
    planets.forEach(p => {
        ctx.beginPath();
        ctx.arc(offsetX + p.x * scale, offsetY + p.y * scale, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
    });
    // 畫太陽
    ctx.beginPath(); ctx.arc(offsetX, offsetY, 8, 0, Math.PI*2); ctx.fillStyle = 'gold'; ctx.fill();
    // 畫月球
    ctx.beginPath(); ctx.arc(offsetX + moon.x * scale, offsetY + moon.y * scale, 2, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill();

    // 物理與數據更新
    if (isRunning) {
        for (let i = 0; i < simSpeed; i++) {
            planets.forEach(p => p.update(fixed_dt));
            moon.update(fixed_dt);
            total_days += fixed_dt / 86400;
        }

        // 減少 DOM 更新與 Chart 更新的頻率以提升效能
        frameCounter++;
        if (frameCounter % 5 === 0) {
            const hSpeed = halleyObj.getVelocity();
            const eSpeed = earthObj.getVelocity();
            
            document.getElementById('timeVal').innerText = `${Math.floor(total_days / 365.25)} Y, ${Math.floor(total_days % 365.25)} D`;
            document.getElementById('halleySpeedVal').innerText = hSpeed.toFixed(1);
            document.getElementById('earthSpeedVal').innerText = eSpeed.toFixed(1);

            speedChart.data.datasets[0].data.push(hSpeed);
            speedChart.data.datasets[1].data.push(eSpeed);
            
            if (speedChart.data.datasets[0].data.length > 100) {
                speedChart.data.datasets[0].data.shift();
                speedChart.data.datasets[1].data.shift();
            }
            speedChart.update('none');
        }
    }

    requestAnimationFrame(render);
}

// --- 6. 事件監聽 (滑鼠互動與 UI) ---
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    
    // 以滑鼠為中心點進行縮放
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    offsetX = mx - (mx - offsetX) * zoomFactor;
    offsetY = my - (my - offsetY) * zoomFactor;
    scale *= zoomFactor;
});

canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});
window.addEventListener('mousemove', (e) => {
    if (isDragging) {
        offsetX += (e.clientX - lastMouseX);
        offsetY += (e.clientY - lastMouseY);
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
});
window.addEventListener('mouseup', () => isDragging = false);

const speedSlider = document.getElementById('speedSlider');
const speedDisplay = document.getElementById('speedValDisplay');
speedSlider.addEventListener('input', () => {
    simSpeed = parseInt(speedSlider.value);
    speedDisplay.innerText = simSpeed;
});

document.getElementById('toggleBtn').addEventListener('click', () => isRunning = !isRunning);
document.getElementById('resetBtn').addEventListener('click', () => {
    offsetX = canvas.width / 2;
    offsetY = canvas.height / 2;
    scale = canvas.width / (2 * 18 * AU); // 重置為能看見哈雷彗星的縮放度
});

// 啟動
render();
