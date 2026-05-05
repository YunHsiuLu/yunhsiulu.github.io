// --- 常數設定 ---
const g = 9.81;
const m1 = 1.0;
const m2 = 1.0;
const L1 = 1.0;
const L2 = 1.0;
const dt = 0.016; // 物理計算步長 (s)

// --- 狀態變數 ---
let theta1 = Math.PI / 2;
let theta2 = Math.PI / 2;
let omega1 = 0;
let omega2 = 0;
let isRunning = false;
let trace = []; 

// 時間與歷史數據儲存
let simulationTime = 0;
let historyData = []; // 儲存格式: { t, total1, total2, ke1, pe1, ke2, pe2, p1_state, p2_state }

// --- DOM 元素 ---
const inputTheta1 = document.getElementById('theta1');
const inputTheta2 = document.getElementById('theta2');
const btnStart = document.getElementById('btn-start');
const btnReset = document.getElementById('btn-reset');
const checkTrace = document.getElementById('show-trace');
const radioRecent = document.querySelector('input[name="time-range"][value="recent"]');
const radioAll = document.querySelector('input[name="time-range"][value="all"]');

// Canvas 相關
const simCanvas = document.getElementById('simCanvas');
const simCtx = simCanvas.getContext('2d');
let width, height, centerX, centerY, scale;

// Chart.js 相關
let energyChart, phaseChart1, phaseChart2;

// --- 初始化 ---
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    updateFromInputs();

    // 輸入框監聽
    inputTheta1.addEventListener('input', () => { if (!isRunning) resetPhysics(); });
    inputTheta2.addEventListener('input', () => { if (!isRunning) resetPhysics(); });

    // 按鈕監聽
    btnStart.addEventListener('click', () => {
        isRunning = !isRunning;
        btnStart.textContent = isRunning ? "Pause" : "Start";
    });

    btnReset.addEventListener('click', () => {
        isRunning = false;
        btnStart.textContent = "Start";
        resetPhysics();
        // 重置時清空圖表
        historyData = [];
        simulationTime = 0;
        updateCharts(true); // 強制更新清空畫面
    });

    // 監聽時間範圍切換
    // 當切換 Recent/All 時，不需清空數據，只需強制重繪圖表即可
    const rangeHandler = () => updateCharts(true);
    radioRecent.addEventListener('change', rangeHandler);
    radioAll.addEventListener('change', rangeHandler);

    initCharts();
    requestAnimationFrame(loop);
}

function resizeCanvas() {
    const container = document.querySelector('.simulation-area');
    simCanvas.width = container.clientWidth - 20;
    simCanvas.height = container.clientHeight - 20;
    width = simCanvas.width;
    height = simCanvas.height;
    centerX = width / 2;
    centerY = height / 3; 
    scale = Math.min(width, height) / 4.2; 
    draw();
}

function getSafeAngle(inputElement) {
    const val = parseFloat(inputElement.value);
    return isNaN(val) ? 0 : val * Math.PI / 180;
}

function updateFromInputs() {
    if (!isRunning) {
        theta1 = getSafeAngle(inputTheta1);
        theta2 = getSafeAngle(inputTheta2);
        omega1 = 0;
        omega2 = 0;
        trace = [];
        draw();
    }
}

function resetPhysics() {
    theta1 = getSafeAngle(inputTheta1);
    theta2 = getSafeAngle(inputTheta2);
    omega1 = 0;
    omega2 = 0;
    trace = [];
    simulationTime = 0;
    historyData = [];
    draw();
}

// --- 物理引擎 (RK4) ---
function derivatives(t1, t2, w1, w2) {
    const dtheta = t1 - t2;
    const den1 = (2 * m1 + m2 - m2 * Math.cos(2 * t1 - 2 * t2));
    const den2 = (L2 / L1) * den1;

    const num1 = -g * (2 * m1 + m2) * Math.sin(t1) 
               - m2 * g * Math.sin(t1 - 2 * t2) 
               - 2 * Math.sin(dtheta) * m2 * (w2 * w2 * L2 + w1 * w1 * L1 * Math.cos(dtheta));
    const dw1 = num1 / (L1 * den1);

    const num2 = 2 * Math.sin(dtheta) * (w1 * w1 * L1 * (m1 + m2) 
               + g * (m1 + m2) * Math.cos(t1) 
               + w2 * w2 * L2 * m2 * Math.cos(dtheta));
    const dw2 = num2 / (L2 * den1);

    return { dt1: w1, dt2: w2, dw1: dw1, dw2: dw2 };
}

function physicsStep() {
    let k1 = derivatives(theta1, theta2, omega1, omega2);
    let k2 = derivatives(theta1 + 0.5*dt*k1.dt1, theta2 + 0.5*dt*k1.dt2, omega1 + 0.5*dt*k1.dw1, omega2 + 0.5*dt*k1.dw2);
    let k3 = derivatives(theta1 + 0.5*dt*k2.dt1, theta2 + 0.5*dt*k2.dt2, omega1 + 0.5*dt*k2.dw1, omega2 + 0.5*dt*k2.dw2);
    let k4 = derivatives(theta1 + dt*k3.dt1, theta2 + dt*k3.dt2, omega1 + dt*k3.dw1, omega2 + dt*k3.dw2);

    theta1 += (dt/6) * (k1.dt1 + 2*k2.dt1 + 2*k3.dt1 + k4.dt1);
    theta2 += (dt/6) * (k1.dt2 + 2*k2.dt2 + 2*k3.dt2 + k4.dt2);
    omega1 += (dt/6) * (k1.dw1 + 2*k2.dw1 + 2*k3.dw1 + k4.dw1);
    omega2 += (dt/6) * (k1.dw2 + 2*k2.dw2 + 2*k3.dw2 + k4.dw2);

    simulationTime += dt;
}

// --- 繪圖 ---
function draw() {
    simCtx.clearRect(0, 0, width, height);

    const x1 = centerX + L1 * scale * Math.sin(theta1);
    const y1 = centerY + L1 * scale * Math.cos(theta1);
    const x2 = x1 + L2 * scale * Math.sin(theta2);
    const y2 = y1 + L2 * scale * Math.cos(theta2);

    if (checkTrace.checked) {
        if (isRunning) trace.push({x: x2, y: y2});
        if (trace.length > 500) trace.shift();

        simCtx.beginPath();
        simCtx.strokeStyle = 'rgba(100, 100, 255, 0.5)';
        simCtx.lineWidth = 1;
        for (let i = 0; i < trace.length - 1; i++) {
            simCtx.moveTo(trace[i].x, trace[i].y);
            simCtx.lineTo(trace[i+1].x, trace[i+1].y);
        }
        simCtx.stroke();
    }

    simCtx.beginPath();
    simCtx.strokeStyle = '#333';
    simCtx.lineWidth = 3;
    simCtx.moveTo(centerX, centerY);
    simCtx.lineTo(x1, y1);
    simCtx.lineTo(x2, y2);
    simCtx.stroke();

    simCtx.beginPath(); simCtx.fillStyle = '#ff4d4d'; simCtx.arc(x1, y1, 10, 0, 2 * Math.PI); simCtx.fill();
    simCtx.beginPath(); simCtx.fillStyle = '#007bff'; simCtx.arc(x2, y2, 10, 0, 2 * Math.PI); simCtx.fill();
    simCtx.beginPath(); simCtx.fillStyle = '#000'; simCtx.arc(centerX, centerY, 5, 0, 2 * Math.PI); simCtx.fill();
}

function calculateEnergy() {
    const y1_phy = -L1 * Math.cos(theta1);
    const y2_phy = y1_phy - L2 * Math.cos(theta2);
    const v1_sq = Math.pow(L1 * omega1, 2);
    const v2_sq = Math.pow(L1 * omega1, 2) + Math.pow(L2 * omega2, 2) + 
                  2 * L1 * L2 * omega1 * omega2 * Math.cos(theta1 - theta2);

    const PE1 = m1 * g * y1_phy;
    const PE2 = m2 * g * y2_phy;
    const KE1 = 0.5 * m1 * v1_sq;
    const KE2 = 0.5 * m2 * v2_sq;

    return { pe1: PE1, ke1: KE1, total1: PE1 + KE1, pe2: PE2, ke2: KE2, total2: PE2 + KE2 };
}

// --- Chart.js ---
function initCharts() {
    // 1. 能量圖
    const ctxEnergy = document.getElementById('energyChart').getContext('2d');
    energyChart = new Chart(ctxEnergy, {
        type: 'line',
        data: {
            datasets: [
                { label: 'Total E1', data: [], borderColor: 'red', borderWidth: 2, fill: false, pointRadius: 0 },
                { label: 'Total E2', data: [], borderColor: 'blue', borderWidth: 2, fill: false, pointRadius: 0 },
                { label: 'KE1', data: [], borderColor: 'rgba(255, 99, 132, 0.5)', borderWidth: 1, hidden: true, pointRadius: 0 },
                { label: 'PE1', data: [], borderColor: 'rgba(255, 159, 64, 0.5)', borderWidth: 1, hidden: true, pointRadius: 0 },
                { label: 'KE2', data: [], borderColor: 'rgba(54, 162, 235, 0.5)', borderWidth: 1, hidden: true, pointRadius: 0 },
                { label: 'PE2', data: [], borderColor: 'rgba(153, 102, 255, 0.5)', borderWidth: 1, hidden: true, pointRadius: 0 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: { 
                // X軸設定為線性 (linear) 以顯示秒數
                x: { 
                    type: 'linear', 
                    title: { display: true, text: 'Time (s)' },
                    ticks: {
                        callback: function(value) { return value.toFixed(1); }
                    }
                }, 
                y: { beginAtZero: false } 
            },
            plugins: { legend: { display: false } },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });

    // Checkbox 控制
    document.querySelectorAll('.chart-controls input[data-set]').forEach(cb => {
        cb.addEventListener('change', (e) => {
            energyChart.getDatasetMeta(parseInt(e.target.dataset.set)).hidden = !e.target.checked;
            energyChart.update();
        });
        energyChart.getDatasetMeta(parseInt(cb.dataset.set)).hidden = !cb.checked;
    });

    // 2. 相圖設定 (共用設定)
    const phaseOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
            x: { title: { display: true, text: 'θ (rad)' }, type: 'linear' },
            y: { title: { display: true, text: 'ω (rad/s)' } }
        },
        plugins: { legend: { display: false } }
    };

    // 相圖 1
    const ctxPhase1 = document.getElementById('phaseChart1').getContext('2d');
    phaseChart1 = new Chart(ctxPhase1, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'P1', data: [], borderColor: 'red', backgroundColor: 'red',
                pointRadius: 1, showLine: true, borderWidth: 1
            }]
        },
        options: phaseOptions
    });

    // 相圖 2
    const ctxPhase2 = document.getElementById('phaseChart2').getContext('2d');
    phaseChart2 = new Chart(ctxPhase2, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'P2', data: [], borderColor: 'blue', backgroundColor: 'blue',
                pointRadius: 1, showLine: true, borderWidth: 1
            }]
        },
        options: phaseOptions
    });
}

function updateCharts(forceRender = false) {
    if (!isRunning && !forceRender) return;

    // 1. 計算當前數據並存入 History
    if (isRunning) {
        const energies = calculateEnergy();
        
        // 角度標準化 (-PI ~ PI)
        let p1_theta = ((theta1 + Math.PI) % (2 * Math.PI)) - Math.PI;
        let p2_theta = ((theta2 + Math.PI) % (2 * Math.PI)) - Math.PI;
        
        const dataPoint = {
            t: simulationTime,
            total1: energies.total1,
            total2: energies.total2,
            ke1: energies.ke1,
            pe1: energies.pe1,
            ke2: energies.ke2,
            pe2: energies.pe2,
            p1_state: { x: p1_theta, y: omega1 },
            p2_state: { x: p2_theta, y: omega2 }
        };

        historyData.push(dataPoint);
        
        // 為了效能，如果 History 太大 (例如超過 10分鐘)，可以考慮在這裡移除舊資料
        // 但為了 "Start後都記錄" 的需求，暫時保留全部
    }

    // 2. 決定顯示範圍
    const isRecent = radioRecent.checked;
    let displayData = [];

    if (isRecent) {
        // 近期模式：篩選最後 5 秒的數據
        const startTime = Math.max(0, simulationTime - 5.0);
        // 使用 filter 或是 findIndex 優化 (這裡資料量不大，filter 尚可)
        // 為了效能，我們從後面往前找第一個小於 startTime 的索引
        let startIndex = 0;
        for (let i = historyData.length - 1; i >= 0; i--) {
            if (historyData[i].t < startTime) {
                startIndex = i + 1;
                break;
            }
        }
        displayData = historyData.slice(startIndex);
    } else {
        // 全部模式
        displayData = historyData;
    }

    // 3. 更新圖表數據源 (Mapping)
    // 注意：這裡直接替換 data 陣列。Chart.js 處理這種替換通常效能是可以接受的。
    
    // 更新 Energy Chart
    energyChart.data.datasets[0].data = displayData.map(d => ({x: d.t, y: d.total1}));
    energyChart.data.datasets[1].data = displayData.map(d => ({x: d.t, y: d.total2}));
    energyChart.data.datasets[2].data = displayData.map(d => ({x: d.t, y: d.ke1}));
    energyChart.data.datasets[3].data = displayData.map(d => ({x: d.t, y: d.pe1}));
    energyChart.data.datasets[4].data = displayData.map(d => ({x: d.t, y: d.ke2}));
    energyChart.data.datasets[5].data = displayData.map(d => ({x: d.t, y: d.pe2}));

    // 更新 Phase Charts
    phaseChart1.data.datasets[0].data = displayData.map(d => d.p1_state);
    phaseChart2.data.datasets[0].data = displayData.map(d => d.p2_state);

    // 4. 觸發重繪 (使用 'none' 模式避免不必要的動畫效果，提升效能)
    energyChart.update('none');
    phaseChart1.update('none');
    phaseChart2.update('none');
}

// --- 主循環 ---
let frameCount = 0;
function loop() {
    if (isRunning) {
        // 每幀計算 2 次物理步長，讓動畫慢一點
        for(let i=0; i<2; i++) {
            physicsStep();
        }
        
        // 每 4 幀更新一次圖表
        if (frameCount % 4 === 0) { 
            updateCharts();
        }
        frameCount++;
    }
    draw();
    requestAnimationFrame(loop);
}

// 啟動
init();
