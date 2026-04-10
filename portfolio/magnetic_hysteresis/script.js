const dCanvas = document.getElementById('domainCanvas'), dCtx = dCanvas.getContext('2d');
const detCanvas = document.getElementById('detector'), detCtx = detCanvas.getContext('2d');
const fieldSlider = document.getElementById('fieldSlider');

let M = 0; 
let lastChartH = null;
const Be = 8; // 地磁強度
const randomNorth = Math.random() * 360; 
let domains = [];

// 初始化磁疇
function initDomains() {
    dCanvas.width = dCanvas.offsetWidth;
    domains = [];
    for(let i=0; i<22; i++) {
        for(let j=0; j<4; j++) {
            domains.push({ 
                x: 40 + i * (dCanvas.width-80)/21, 
                y: 30 + j * (dCanvas.height-60)/3, 
                angle: Math.random() * Math.PI * 2 
            });
        }
    }
}

// 初始化 B-H 圖表
const chart = new Chart(document.getElementById('hChart'), {
    type: 'scatter',
    data: { 
        datasets: [{ 
            label: 'B-H', 
            borderColor: '#e74c3c', 
            showLine: true, 
            pointRadius: 0, 
            data: [], 
            tension: 0.1, 
            borderWidth: 3 
        }] 
    },
    options: { 
        scales: { 
            x: { type: 'linear', position: 'center', min:-110, max:110, ticks: {font:{size:14}}, title:{display:true, text:'外部場 H', font:{size:16, weight:'bold'}} }, 
            y: { type: 'linear', position: 'center', min:-120, max:120, ticks: {font:{size:14}}, title:{display:true, text:'總感應場 B', font:{size:16, weight:'bold'}} } 
        },
        plugins: { legend: { display: false } },
        animation: false, 
        maintainAspectRatio: false 
    }
});

// 繪製指南針/磁場檢測計
function drawCompass(ctx, angle) {
    ctx.clearRect(0,0,200,200);
    ctx.save(); ctx.translate(100, 100);
    ctx.beginPath(); ctx.arc(0,0,85,0,Math.PI*2); ctx.strokeStyle="#2c3e50"; ctx.lineWidth=3; ctx.stroke();
    ctx.rotate(angle);
    ctx.fillStyle="#e74c3c"; ctx.beginPath(); ctx.moveTo(0,-70); ctx.lineTo(10,0); ctx.lineTo(-10,0); ctx.fill();
    ctx.fillStyle="#bdc3c7"; ctx.beginPath(); ctx.moveTo(0,70); ctx.lineTo(10,0); ctx.lineTo(-10,0); ctx.fill();
    ctx.restore();
}

// 動態更新主邏輯
function update() {
    const rot = parseFloat(document.getElementById('rotSlider').value);
    const H = parseFloat(fieldSlider.value);
    // 定義軟/硬鐵材料特性：f = 矯頑力係數, s = 磁化速度
    const mat = document.getElementById('matType').value === 'soft' ? {f:3, s:0.25} : {f:22, s:0.12};

    // 磁滯物理引擎核心：只有當外場差值超過矯正力時，磁化強度 M 才會改變
    let diff = H - M;
    if (Math.abs(diff) > mat.f) M += (diff - Math.sign(diff) * mat.f) * mat.s;

    // 計算地磁與外場的向量疊加
    let earthAngle = (randomNorth - rot) * Math.PI / 180;
    let finalAngle = Math.atan2(Be * Math.sin(earthAngle) + H + M, Be * Math.cos(earthAngle));
    drawCompass(detCtx, finalAngle);

    // 繪製微觀磁疇
    dCtx.clearRect(0,0,dCanvas.width,dCanvas.height);
    domains.forEach(d => {
        let alignStrength = Math.min(Math.abs(M)/100, 1);
        if (alignStrength > 0.05) {
            let target = M > 0 ? 0 : Math.PI;
            let aDiff = target - d.angle;
            while(aDiff > Math.PI) aDiff -= Math.PI*2;
            while(aDiff < -Math.PI) aDiff += Math.PI*2;
            d.angle += aDiff * alignStrength * 0.15;
        }
        dCtx.save(); dCtx.translate(d.x, d.y); dCtx.rotate(d.angle);
        dCtx.beginPath(); dCtx.strokeStyle="#2c3e50"; dCtx.lineWidth=2;
        dCtx.moveTo(-10,0); dCtx.lineTo(10,0); dCtx.lineTo(5,-4); dCtx.stroke();
        dCtx.restore();
    });

    // 更新 B-H 圖表數據
    let currentB = M + H * 0.15;
    if (lastChartH === null || Math.abs(H - lastChartH) > 0.8) {
        chart.data.datasets[0].data.push({x: H, y: currentB});
        lastChartH = H;
        if (chart.data.datasets[0].data.length > 400) chart.data.datasets[0].data.shift();
    }
    chart.update('none');

    // 更新介面數值
    document.getElementById('rotText').innerText = rot;
    document.getElementById('fieldVal').innerText = Math.round(H);
    document.getElementById('angleText').innerText = Math.round(finalAngle * 180 / Math.PI) + "°";
    
    requestAnimationFrame(update);
}

// 全系統重設（消磁程序）
function fullReset() {
    fieldSlider.value = 0;
    M = 0; 
    chart.data.datasets[0].data = [];
    domains.forEach(d => d.angle = Math.random() * Math.PI * 2);
}

// 監聽視窗縮放
window.addEventListener('resize', initDomains);

// 啟動執行
initDomains();
update();
