const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 500;
canvas.height = 400;

// --- 1. 物理參數 ---
let params = {
    f: 0.05,        // 頻率
    v: 1.5,         // 固定波速
    d: 120,         // 波源間距
    t: 0,
    phaseDiff: 0,   // 0: 同相, 1: 反相
    showLines: true,
    isRunning: true
};

let s1 = { x: 250 - params.d/2, y: 200 };
let s2 = { x: 250 + params.d/2, y: 200 };

// --- 2. 輔助函式 ---
function getLambda() { return params.v / params.f; }

function updateSources() {
    s1.x = 250 - params.d / 2;
    s2.x = 250 + params.d / 2;
}

// LaTeX 重新渲染函式
function refreshMath() {
    if (typeof renderMathInElement === 'function') {
        renderMathInElement(document.getElementById('math-settings'), {
            delimiters: [
                {left: '$', right: '$', display: false}
            ],
            throwOnError : false
        });
    }
}

// --- 3. 繪圖核心 ---
function draw() {
    if (params.isRunning) params.t += 0.2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const lambda = getLambda();
    const k = (2 * Math.PI) / lambda;
    const gridSize = 4; // 網格大小，數值越小畫質越細但越耗能

    // A. 繪製波紋 (黑白灰階)
    for (let i = 0; i < canvas.width; i += gridSize) {
        for (let j = 0; j < canvas.height; j += gridSize) {
            const r1 = Math.sqrt((i - s1.x) ** 2 + (j - s1.y) ** 2);
            const r2 = Math.sqrt((i - s2.x) ** 2 + (j - s2.y) ** 2);

            const amp1 = Math.cos(k * r1 - params.t);
            const amp2 = Math.cos(k * r2 - params.t + params.phaseDiff * Math.PI);
            
            // 合成振幅正規化 (-1 ~ 1 轉為 0 ~ 255)
            const totalAmp = (amp1 + amp2) / 2; 
            const gray = Math.floor((totalAmp + 1) * 127.5); 
            
            ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
            ctx.fillRect(i, j, gridSize, gridSize);
        }
    }

    // B. 繪製理論腹線與節線
    if (params.showLines) drawTheoreticalLines(lambda);

    // C. 繪製波源點
    drawSource(s1);
    drawSource(s2);

    requestAnimationFrame(draw);
}

function drawSource(s) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#e74c3c";
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawTheoreticalLines(lambda) {
    const d = params.d;
    const maxN = Math.floor(d / lambda) + 1;
    const centerX = 250;
    const centerY = 200;

    for (let n = -maxN; n <= maxN; n++) {
        const pd_anti = (n + (params.phaseDiff * 0.5)) * lambda;
        const pd_node = (n + 0.5 - (params.phaseDiff * 0.5)) * lambda;

        if (Math.abs(pd_anti) < d) drawHyperbola(pd_anti, false); 
        if (Math.abs(pd_node) < d) drawHyperbola(pd_node, true);
    }

    function drawHyperbola(pathDiff, isDash) {
        ctx.beginPath();
        ctx.setLineDash(isDash ? [5, 5] : []);
        ctx.strokeStyle = isDash ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.7)";
        
        if (pathDiff === 0) {
            ctx.moveTo(centerX, 0); ctx.lineTo(centerX, canvas.height);
            ctx.stroke(); return;
        }

        const a = Math.abs(pathDiff) / 2;
        const c = d / 2;
        const b = Math.sqrt(c * c - a * a);

        for (let ty = -3; ty <= 3; ty += 0.1) {
            const dy = b * Math.sinh(ty);
            const dx = a * Math.cosh(ty) * (pathDiff > 0 ? 1 : -1);
            ctx.lineTo(centerX + dx, centerY + dy);
        }
        ctx.stroke();
    }
}

// --- 4. 控制項綁定 ---
document.getElementById('fSlider').addEventListener('input', (e) => {
    params.f = parseFloat(e.target.value);
    document.getElementById('fDisplay').innerText = params.f.toFixed(2);
    document.getElementById('fVal').innerText = params.f.toFixed(2);
});

document.getElementById('dSlider').addEventListener('input', (e) => {
    params.d = parseInt(e.target.value);
    document.getElementById('dDisplay').innerText = params.d;
    document.getElementById('distVal').innerText = params.d;
    updateSources();
});

document.getElementById('phaseSlider').addEventListener('input', (e) => {
    params.phaseDiff = parseInt(e.target.value);
    const label = params.phaseDiff === 0 ? "同相 (0)" : "反相 ($\\pi$)";
    document.getElementById('phaseDisplay').innerHTML = label;
    refreshMath(); // 相位改變包含 LaTeX 符號，需刷新
});

document.getElementById('playBtn').addEventListener('click', () => params.isRunning = !params.isRunning);
document.getElementById('resetBtn').addEventListener('click', () => location.reload());
document.getElementById('showLines').addEventListener('change', (e) => params.showLines = e.target.checked);

// 初始化渲染
window.onload = () => {
    refreshMath();
    draw();
};
