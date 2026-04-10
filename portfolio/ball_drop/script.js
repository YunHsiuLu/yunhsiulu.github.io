const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// --- 1. 物理參數 ---
canvas.width = 400;
canvas.height = 500;
const g = 0.6;          // 重力加速度
let e = 1.0;            // 恢復係數 (由拉桿連動)
const radius = 20;      
const massScale = 10;   // 能量顯示倍率
const dt = 1;           

let x = 200, y = 100;   
let vy = 0;             
let isDragging = false; 
let isFalling = false;  
let initialTotalEnergy = 0; // 能量錨點，用於修正 e=1 時的數值誤差

// --- 2. 初始化 Chart.js ---
const chartCtx = document.getElementById('energyChart').getContext('2d');
const maxDataPoints = 120;

const energyChart = new Chart(chartCtx, {
    type: 'line',
    data: {
        labels: Array(maxDataPoints).fill(''),
        datasets: [
            { label: '總能 (TE)', borderColor: '#f39c12', data: [], borderWidth: 3, pointRadius: 0, fill: false, tension: 0.1 },
            { label: '位能 (PE)', borderColor: '#3498db', data: [], borderWidth: 2, pointRadius: 0, fill: false, tension: 0.4 },
            { label: '動能 (KE)', borderColor: '#e74c3c', data: [], borderWidth: 2, pointRadius: 0, fill: false, tension: 0.4 }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
            y: { beginAtZero: true, max: 300, title: { display: true, text: '能量 (J)' } },
            x: { display: false }
        }
    }
});

// --- 3. 物理運算核心 ---
function updatePhysics() {
    if (isFalling && !isDragging) {
        let oldVy = vy;
        vy += g * dt;
        y += (oldVy + vy) / 2 * dt; // 半隱式尤拉法提升精度

        // 地面碰撞判定
        if (y + radius >= canvas.height) {
            y = canvas.height - radius; // 防止穿透地面
            
            if (vy > 0) {
                if (e >= 0.99) {
                    // e=1 修正：基於能量守恆強制反轉速度，抵消離散時間誤差
                    vy = -Math.sqrt(Math.abs(2 * initialTotalEnergy / massScale));
                } else {
                    vy = -vy * e;
                    // 更新當前參考能量，以便隨後的彈跳計算
                    const currentHeight = Math.max(0, canvas.height - radius - y);
                    initialTotalEnergy = (g * massScale * currentHeight) + (0.5 * massScale * (vy * vy));
                }
            }

            // 靜止判定
            if (Math.abs(vy) < 1.2 && e < 1.0) vy = 0;
        }
    }

    // 計算能量
    const height = Math.max(0, canvas.height - radius - y);
    const PE = g * massScale * height;
    const KE = 0.5 * massScale * (vy * vy);
    const TE = PE + KE;

    // 更新顯示文字
    document.getElementById('peVal').innerText = Math.round(PE);
    document.getElementById('keVal').innerText = Math.round(KE);
    document.getElementById('teVal').innerText = Math.round(TE);

    // 更新圖表數據
    energyChart.data.datasets[0].data.push(TE);
    energyChart.data.datasets[1].data.push(PE);
    energyChart.data.datasets[2].data.push(KE);

    if (energyChart.data.datasets[0].data.length > maxDataPoints) {
        energyChart.data.datasets.forEach(ds => ds.data.shift());
    }
    energyChart.update('none');
}

// --- 4. 渲染與事件 ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 繪製球體
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = isDragging ? "#adb5bd" : "#e67e22";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#2c3e50";
    ctx.stroke();

    updatePhysics();
    requestAnimationFrame(draw);
}

// UI 控制與滑鼠事件
const eSlider = document.getElementById('eSlider');
const eDisplay = document.getElementById('eValDisplay');

eSlider.addEventListener('input', () => {
    e = parseFloat(eSlider.value);
    eDisplay.innerText = e.toFixed(1);
});

canvas.addEventListener('mousedown', (evt) => {
    const rect = canvas.getBoundingClientRect();
    const mx = evt.clientX - rect.left, my = evt.clientY - rect.top;
    if (Math.sqrt((mx - x)**2 + (my - y)**2) < radius) {
        isDragging = true; isFalling = false; vy = 0;
        energyChart.data.datasets.forEach(ds => ds.data = []);
    }
});

window.addEventListener('mousemove', (evt) => {
    if (isDragging) {
        const rect = canvas.getBoundingClientRect();
        x = Math.min(Math.max(radius, evt.clientX - rect.left), canvas.width - radius);
        y = Math.min(Math.max(radius, evt.clientY - rect.top), canvas.height - radius);
    }
});

window.addEventListener('mouseup', () => isDragging = false);

document.getElementById('dropBtn').addEventListener('click', () => {
    if (isDragging) return;
    const h = canvas.height - radius - y;
    initialTotalEnergy = (g * massScale * h) + (0.5 * massScale * (vy * vy));
    energyChart.options.scales.y.max = Math.max(initialTotalEnergy * 1.15, 50);
    energyChart.update();
    isFalling = true;
});

document.getElementById('resetBtn').addEventListener('click', () => {
    x = 200; y = 100; vy = 0; isFalling = false;
    energyChart.data.datasets.forEach(ds => ds.data = []);
    energyChart.options.scales.y.max = 300;
    energyChart.update();
});

draw();
