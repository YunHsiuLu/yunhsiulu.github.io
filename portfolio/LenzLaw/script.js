const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// --- 模擬狀態變數 ---
// 線圈中心位置
const coilCenterX = canvas.width / 2;
const coilCenterY = canvas.height / 2;
const coilRadius = 60;
const coilWidth = 140; // 線圈總長度

// 磁鐵變數
let magnetX = 150;
let magnetY = coilCenterY;
const magnetW = 120;
const magnetH = 40;

// 拖曳控制
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// 物理變數
let sensitivity = 20; // 從滑桿讀取
let lastFlux = 0;
let currentFlux = 0;
let inducedCurrent = 0; // 電流值
let smoothCurrent = 0;  // 用於平滑顯示

// Chart.js 設置
const maxDataPoints = 100;
const ctxChart = document.getElementById('chartCurrent').getContext('2d');
const currentChart = new Chart(ctxChart, {
    type: 'line',
    data: {
        labels: Array(maxDataPoints).fill(''),
        datasets: [{
            label: 'Induced Current (I)',
            data: [],
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.2)',
            borderWidth: 2,
            tension: 0.4, // 平滑曲線
            pointRadius: 0,
            fill: true
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false, // 關閉動畫以獲得即時響應
        scales: {
            x: { display: false },
            y: { 
                suggestedMin: -50, 
                suggestedMax: 50,
                grid: { color: '#eee' }
            }
        },
        plugins: {
            legend: { display: false },
            title: { display: true, text: 'Induced Current vs Time' }
        }
    }
});

// --- UI 綁定 ---
const ui = {
    slider: document.getElementById('slider-turns'),
    valCurrent: document.getElementById('val-current'),
    valFlux: document.getElementById('val-flux')
};

ui.slider.addEventListener('input', () => {
    sensitivity = parseInt(ui.slider.value);
});

// --- 滑鼠/觸控事件 ---
function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

canvas.addEventListener('mousedown', (e) => {
    const pos = getPos(e);
    // 簡單的碰撞檢測
    if (pos.x > magnetX - magnetW/2 && pos.x < magnetX + magnetW/2 &&
        pos.y > magnetY - magnetH/2 && pos.y < magnetY + magnetH/2) {
        isDragging = true;
        dragOffsetX = pos.x - magnetX;
        dragOffsetY = pos.y - magnetY;
        document.querySelector('.overlay-hint').style.display = 'none'; // 隱藏提示
    }
});

window.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const pos = getPos(e);
        magnetX = pos.x - dragOffsetX;
        magnetY = pos.y - dragOffsetY;
        
        // 限制磁鐵不要跑出畫布太遠
        magnetX = Math.max(50, Math.min(canvas.width - 50, magnetX));
        magnetY = Math.max(50, Math.min(canvas.height - 50, magnetY));
    }
});

window.addEventListener('mouseup', () => {
    isDragging = false;
});

// --- 繪圖函數 ---

function drawCoilBack() {
    // 畫線圈的後半部分 (被磁鐵遮擋的部分)
    const turns = 12;
    const spacing = coilWidth / turns;
    
    ctx.lineWidth = 4;
    
    for (let i = 0; i < turns; i++) {
        const x = (coilCenterX - coilWidth / 2) + i * spacing;
        
        // 根據電流改變顏色 (視覺化電流方向與大小)
        // 電流為正: 亮黃色; 電流為負: 亮橘色; 零: 灰色
        let r = 150, g = 150, b = 150;
        if (Math.abs(smoothCurrent) > 1) {
            const intensity = Math.min(1, Math.abs(smoothCurrent) / 40);
            if (smoothCurrent > 0) {
                // 黃色/綠色調
                r = 150 + 105 * intensity;
                g = 150 + 105 * intensity;
                b = 150 - 150 * intensity;
            } else {
                // 紅色/橘色調
                r = 150 + 105 * intensity;
                g = 150 - 100 * intensity;
                b = 150 - 100 * intensity;
            }
        }
        
        ctx.strokeStyle = `rgb(${r},${g},${b})`;
        
        ctx.beginPath();
        // 繪製橢圓的上半弧 (作為後方線條)
        ctx.ellipse(x, coilCenterY, spacing * 0.8, coilRadius, 0, Math.PI, 0); 
        ctx.stroke();
    }
}

function drawCoilFront() {
    // 畫線圈的前半部分 (遮擋磁鐵的部分)
    const turns = 12;
    const spacing = coilWidth / turns;
    
    ctx.lineWidth = 4;
    
    // 畫線圈的連接線 (上下兩條主線)
    ctx.strokeStyle = '#555';
    ctx.beginPath();
    ctx.moveTo(coilCenterX - coilWidth/2, coilCenterY - coilRadius - 10);
    ctx.lineTo(coilCenterX + coilWidth/2, coilCenterY - coilRadius - 10);
    ctx.stroke();
    
    for (let i = 0; i < turns; i++) {
        const x = (coilCenterX - coilWidth / 2) + i * spacing;
        
        // 顏色計算同上
        let r = 150, g = 150, b = 150;
        if (Math.abs(smoothCurrent) > 1) {
            const intensity = Math.min(1, Math.abs(smoothCurrent) / 40);
            if (smoothCurrent > 0) {
                r = 150 + 105 * intensity;
                g = 150 + 105 * intensity;
                b = 150 - 150 * intensity;
            } else {
                r = 150 + 105 * intensity;
                g = 150 - 100 * intensity;
                b = 150 - 100 * intensity;
            }
        }
        ctx.strokeStyle = `rgb(${r},${g},${b})`;

        ctx.beginPath();
        // 繪製橢圓的下半弧 (作為前方線條)
        ctx.ellipse(x, coilCenterY, spacing * 0.8, coilRadius, 0, 0, Math.PI);
        ctx.stroke();
        
        // 繪製電流方向箭頭 (如果電流夠大)
        if (Math.abs(smoothCurrent) > 5 && i === Math.floor(turns/2)) {
            ctx.fillStyle = 'white';
            const arrowDir = smoothCurrent > 0 ? 1 : -1;
            const arrowY = coilCenterY + coilRadius;
            
            ctx.beginPath();
            if(arrowDir > 0) {
                ctx.moveTo(x - 5, arrowY - 5);
                ctx.lineTo(x + 5, arrowY);
                ctx.lineTo(x - 5, arrowY + 5);
            } else {
                ctx.moveTo(x + 5, arrowY - 5);
                ctx.lineTo(x - 5, arrowY);
                ctx.lineTo(x + 5, arrowY + 5);
            }
            ctx.fill();
        }
    }
}

function drawMagnet() {
    ctx.save();
    ctx.translate(magnetX, magnetY);
    
    // N 極 (紅色)
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(-magnetW/2, -magnetH/2, magnetW/2, magnetH);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', -magnetW/4, 0);
    
    // S 極 (藍色)
    ctx.fillStyle = '#3498db';
    ctx.fillRect(0, -magnetH/2, magnetW/2, magnetH);
    ctx.fillStyle = 'white';
    ctx.fillText('S', magnetW/4, 0);
    
    // 邊框
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(-magnetW/2, -magnetH/2, magnetW, magnetH);
    
    ctx.restore();
}

function drawFieldLines() {
    // 簡單繪製幾條磁力線，增加視覺效果
    ctx.save();
    ctx.translate(magnetX, magnetY);
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 1;
    
    for(let s = 0.8; s <= 1.6; s += 0.4) {
        ctx.beginPath();
        ctx.ellipse(0, 0, magnetW * s, magnetH * s * 2, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}

// --- 主迴圈 ---
function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. 物理計算
    // 計算磁通量 (Flux)
    // 使用高斯函數模擬：距離線圈中心越近，通量越大
    // 為了簡化，我們主要考慮 X 軸的距離，Y 軸偏離會快速減少通量
    const dx = magnetX - coilCenterX;
    const dy = magnetY - coilCenterY;
    const distanceSquared = dx*dx + dy*dy;
    
    // Flux 模型: Phi = exp( -k * r^2 )
    // 方向性: 假設 N 極向右，當磁鐵在左側接近時通量增加，穿過後減少
    // 這裡我們模擬穿過線圈內部的通量總量
    const sigma = 8000; // 控制高斯分佈的寬度
    // 乘以 dx 的符號是錯誤的，通量是純量，但為了模擬進出方向性，
    // 我們通常看穿過面的 B 場。
    // 簡單模型：當磁鐵位於線圈中心時通量最大。
    // 通量方向：假設 N 極朝右。
    let rawFlux = 100 * Math.exp(-distanceSquared / sigma);
    
    // 修正：如果 Y 軸偏離太多，通量應該歸零
    if (Math.abs(dy) > coilRadius + 20) {
        rawFlux = 0;
    }

    currentFlux = rawFlux;
    
    // 計算感應電流 (Lenz's Law: I = - dPhi / dt)
    // dFlux = currentFlux - lastFlux
    // 我們需要加上靈敏度 (線圈匝數)
    const dFlux = currentFlux - lastFlux;
    const targetCurrent = -dFlux * sensitivity * 5; // *5 是增益係數
    
    // 平滑電流顯示 (Low-pass filter) 以避免圖表過度抖動
    smoothCurrent += (targetCurrent - smoothCurrent) * 0.2;
    
    lastFlux = currentFlux;
    inducedCurrent = smoothCurrent;
    
    // 2. 更新 UI 數值
    ui.valFlux.textContent = currentFlux.toFixed(2);
    ui.valCurrent.textContent = smoothCurrent.toFixed(2);
    
    // 3. 更新圖表
    const chartData = currentChart.data.datasets[0].data;
    chartData.push(smoothCurrent);
    if (chartData.length > maxDataPoints) {
        chartData.shift();
    }
    // 降低圖表刷新頻率以節省效能 (例如每2幀更新一次，或是直接更新)
    currentChart.update('none'); // 'none' 模式不執行動畫，效能較好
    
    // 4. 繪圖順序 (關鍵：製造穿插效果)
    drawCoilBack();   // 畫線圈後方
    drawFieldLines(); // 畫磁力線 (背景)
    drawMagnet();     // 畫磁鐵
    drawCoilFront();  // 畫線圈前方

    requestAnimationFrame(loop);
}

loop();
