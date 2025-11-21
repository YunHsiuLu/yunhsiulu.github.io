const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// --- 物理參數初始化 ---
let m1 = 10, m2 = 10;
let k1 = 5, k2 = 5, k3 = 5;

// 幾何參數
const wallLeft = 50;
const wallRight = 750;
const yBase = canvas.height / 2;
const equilibrium1 = wallLeft + (wallRight - wallLeft) / 3; // 左邊物體平衡點
const equilibrium2 = wallLeft + 2 * (wallRight - wallLeft) / 3; // 右邊物體平衡點

// 動態變數 (相對於平衡點的位移 x, 速度 v)
let x1 = -60; // 初始位移讓它開始動
let v1 = 0;
let x2 = 60;
let v2 = 0;

const dt = 0.1; // 模擬時間步長
const damping = 0.002; // 輕微阻尼

// --- Chart.js 設置 ---
// 動能圖表
const ctxKE = document.getElementById('chartKE').getContext('2d');
const keChart = new Chart(ctxKE, {
    type: 'line',
    data: {
        labels: Array(50).fill(''), // 僅顯示最近 50 幀
        datasets: [
            { label: 'M1 KE', borderColor: '#007bff', backgroundColor: 'rgba(0,123,255,0.1)', data: [], borderWidth: 1, pointRadius: 0, fill: true },
            { label: 'M2 KE', borderColor: '#dc3545', backgroundColor: 'rgba(220,53,69,0.1)', data: [], borderWidth: 1, pointRadius: 0, fill: true }
        ]
    },
    options: {
        responsive: true,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
            x: { display: false },
            y: { beginAtZero: true, title: { display: true, text: 'Energy' } }
        }
    }
});

// FFT 圖表
const ctxFFT = document.getElementById('chartFFT').getContext('2d');
const fftChart = new Chart(ctxFFT, {
    type: 'line', // 使用 Line 比較容易看清兩個波峰
    data: {
        labels: [],
        datasets: [
            { label: 'M1 Freq', borderColor: '#007bff', data: [], borderWidth: 2, pointRadius: 0 },
            { label: 'M2 Freq', borderColor: '#dc3545', data: [], borderWidth: 2, pointRadius: 0 }
        ]
    },
    options: {
        responsive: true,
        animation: { duration: 0 }, // 關閉動畫以提高效能
        scales: {
            x: { title: { display: true, text: 'Frequency (Hz)' }, ticks: { maxTicksLimit: 10 } },
            y: { display: false, beginAtZero: true }
        }
    }
});

// FFT 緩衝區
const fftSize = 256;
let historyX1 = [];
let historyX2 = [];

// --- UI 控制綁定 ---
const inputs = {
    m1: document.getElementById('m1'),
    m2: document.getElementById('m2'),
    k1: document.getElementById('k1'),
    k2: document.getElementById('k2'),
    k3: document.getElementById('k3')
};

const labels = {
    m1: document.getElementById('val-m1'),
    m2: document.getElementById('val-m2'),
    k1: document.getElementById('val-k1'),
    k2: document.getElementById('val-k2'),
    k3: document.getElementById('val-k3')
};

function updateParams() {
    m1 = parseFloat(inputs.m1.value);
    m2 = parseFloat(inputs.m2.value);
    k1 = parseFloat(inputs.k1.value);
    k2 = parseFloat(inputs.k2.value);
    k3 = parseFloat(inputs.k3.value);

    labels.m1.textContent = m1;
    labels.m2.textContent = m2;
    labels.k1.textContent = k1;
    labels.k2.textContent = k2;
    labels.k3.textContent = k3;
}

Object.keys(inputs).forEach(k => inputs[k].addEventListener('input', updateParams));

document.getElementById('btn-reset').addEventListener('click', () => {
    x1 = -60; v1 = 0;
    x2 = 60; v2 = 0;
    historyX1 = [];
    historyX2 = [];
    keChart.data.datasets[0].data = [];
    keChart.data.datasets[1].data = [];
    keChart.update();
});

// --- 物理與繪圖核心 ---

function drawSpring(xStart, xEnd, coils = 12) {
    ctx.beginPath();
    const width = 20;
    const steps = coils * 2;
    const stepX = (xEnd - xStart) / steps;
    
    ctx.moveTo(xStart, yBase);
    for (let i = 1; i < steps; i++) {
        const yOffset = (i % 2 === 0 ? 1 : -1) * (width / 2);
        ctx.lineTo(xStart + i * stepX, yBase + yOffset);
    }
    ctx.lineTo(xEnd, yBase);
    ctx.stroke();
}

function drawBox(x, color, label) {
    const size = 40;
    ctx.fillStyle = color;
    ctx.fillRect(x - size/2, yBase - size/2, size, size);
    ctx.strokeStyle = '#333';
    ctx.strokeRect(x - size/2, yBase - size/2, size, size);
    
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, yBase);
}

// 簡單的 DFT 計算 (計算每個物體的頻譜)
function calculateSpectrum(data) {
    const N = data.length;
    if (N < fftSize) return [];
    
    let spectrum = [];
    // 為了效能，只計算前 60 個頻率點 (低頻區是物理振動主要區域)
    const maxK = 60; 
    
    for (let k = 0; k < maxK; k++) {
        let real = 0, imag = 0;
        for (let n = 0; n < N; n++) {
            const angle = (2 * Math.PI * k * n) / N;
            // 加上 Hamming Window 減少頻譜洩漏
            const window = 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (N - 1));
            const sample = data[n] * window;
            
            real += sample * Math.cos(angle);
            imag -= sample * Math.sin(angle);
        }
        spectrum.push(Math.sqrt(real*real + imag*imag));
    }
    return spectrum;
}

let frameCount = 0;

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 物理計算 (Semi-implicit Euler)
    const a1 = (-k1 * x1 + k2 * (x2 - x1)) / m1 - damping * v1;
    const a2 = (-k2 * (x2 - x1) - k3 * x2) / m2 - damping * v2;

    v1 += a1 * dt;
    v2 += a2 * dt;
    x1 += v1 * dt;
    x2 += v2 * dt;

    // 絕對位置
    const pos1 = equilibrium1 + x1;
    const pos2 = equilibrium2 + x2;

    // 2. 繪圖
    // 牆壁
    ctx.fillStyle = '#ddd';
    ctx.fillRect(wallLeft - 10, yBase - 50, 10, 100);
    ctx.fillRect(wallRight, yBase - 50, 10, 100);

    // 彈簧
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#555';
    drawSpring(wallLeft, pos1 - 20);
    drawSpring(pos1 + 20, pos2 - 20);
    drawSpring(pos2 + 20, wallRight);

    // 物體
    drawBox(pos1, '#007bff', 'M1');
    drawBox(pos2, '#dc3545', 'M2');

    // 3. 更新動能圖表
    if (frameCount % 5 === 0) {
        const ke1 = 0.5 * m1 * v1 * v1;
        const ke2 = 0.5 * m2 * v2 * v2;
        
        const data1 = keChart.data.datasets[0].data;
        const data2 = keChart.data.datasets[1].data;
        
        data1.push(ke1);
        data2.push(ke2);
        
        if (data1.length > 50) {
            data1.shift();
            data2.shift();
        }
        keChart.update('none'); // 'none' 模式更新較順暢
    }

    // 4. 收集 FFT 數據
    historyX1.push(x1);
    historyX2.push(x2);
    if (historyX1.length > fftSize) {
        historyX1.shift();
        historyX2.shift();
    }

    // 5. 更新 FFT 圖表 (每 15 幀做一次運算，節省 CPU)
    if (frameCount % 15 === 0 && historyX1.length === fftSize) {
        const spec1 = calculateSpectrum(historyX1);
        const spec2 = calculateSpectrum(historyX2);
        
        // 產生頻率標籤 (假設 60Hz 更新率)
        // Freq resolution = Fs / N = 60 / 256 ~= 0.23 Hz
        if (fftChart.data.labels.length === 0) {
            fftChart.data.labels = spec1.map((_, i) => (i * 60 / fftSize).toFixed(1));
        }
        
        fftChart.data.datasets[0].data = spec1;
        fftChart.data.datasets[1].data = spec2;
        fftChart.update('none');
    }

    frameCount++;
    requestAnimationFrame(animate);
}

// 初始化
updateParams();
animate();
