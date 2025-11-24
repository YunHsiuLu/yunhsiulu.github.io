// --- Canvas 初始化 ---
const simCanvas = document.getElementById('simCanvas');
const simCtx = simCanvas.getContext('2d');
const graphCanvas = document.getElementById('graphCanvas');
const graphCtx = graphCanvas.getContext('2d');

// --- 物理常數 ---
const SPEED_OF_SOUND = 343; // m/s
const METERS_PER_PIXEL = 0.5; // 畫布比例：1 pixel = 0.5 meter (800px = 400m)
const TIME_SCALE = 0.5; // 動畫時間縮放 (0.5倍速播放，方便觀察)

// --- 狀態變數 ---
let isPaused = false;
let time = 0;
let lastFrameTime = 0;
let emissionTimer = 0;

// 聲波陣列
const waves = [];
// 頻率歷史數據 (用於繪圖)
const freqHistory = [];
const MAX_HISTORY = 400;

// 物理物件
const source = {
    x: 200,
    y: simCanvas.height / 2,
    v: 0,
    a: 0,
    baseFreq: 200
};

const observer = {
    x: 600,
    y: simCanvas.height / 2 + 40, // 稍微錯開y軸
    v: 0,
    a: 0
};

// --- UI 元素 ---
const ui = {
    vSrcVal: document.getElementById('val-v-src'),
    vSrcSlider: document.getElementById('slider-v-src'),
    aSrcInput: document.getElementById('input-a-src'),
    fSrcVal: document.getElementById('val-f-src'),
    fSrcSlider: document.getElementById('slider-f-src'),

    vObsVal: document.getElementById('val-v-obs'),
    vObsSlider: document.getElementById('slider-v-obs'),
    aObsInput: document.getElementById('input-a-obs'),
    
    fObsDisplay: document.getElementById('display-f-obs'),
    
    btnReset: document.getElementById('btn-reset'),
    btnPause: document.getElementById('btn-pause')
};

// --- 互動事件 ---
// 聲源控制
ui.vSrcSlider.addEventListener('input', (e) => {
    source.v = parseFloat(e.target.value);
    ui.vSrcVal.textContent = source.v;
});
ui.aSrcInput.addEventListener('change', (e) => {
    source.a = parseFloat(e.target.value);
});
ui.fSrcSlider.addEventListener('input', (e) => {
    source.baseFreq = parseFloat(e.target.value);
    ui.fSrcVal.textContent = source.baseFreq;
});

// 觀察者控制
ui.vObsSlider.addEventListener('input', (e) => {
    observer.v = parseFloat(e.target.value);
    ui.vObsVal.textContent = observer.v;
});
ui.aObsInput.addEventListener('change', (e) => {
    observer.a = parseFloat(e.target.value);
});

// 按鈕
ui.btnPause.addEventListener('click', () => isPaused = !isPaused);
ui.btnReset.addEventListener('click', resetSimulation);

function resetSimulation() {
    // 重置位置
    source.x = 200;
    observer.x = 600;
    
    // 速度重置回滑桿數值 (忽略之前的加速度累積)
    source.v = parseFloat(ui.vSrcSlider.value);
    observer.v = parseFloat(ui.vObsSlider.value);
    
    // 清空波與歷史
    waves.length = 0;
    freqHistory.length = 0;
    
    // 重繪
    drawSimulation();
    drawGraph();
}

// --- 物理計算核心 ---
function calculateDoppler() {
    // 向量計算：右為正
    // 相對位置向量 (Source -> Observer)
    const dx = observer.x - source.x;
    
    // 判斷觀察者是否「朝向」聲源移動
    // 如果 observer.v 為負 (向左) 且 dx > 0 (Obs在右)，則是接近 (+v_effect)
    // 如果 observer.v 為正 (向右) 且 dx < 0 (Obs在左)，則是接近 (+v_effect)
    // 簡單來說，我們定義 vObsTowards 為「觀察者朝聲源移動的速度分量」
    let vObsTowards = 0;
    if (dx > 0) vObsTowards = -observer.v; 
    else vObsTowards = observer.v;

    // 判斷聲源是否「朝向」觀察者移動
    // 定義 vSrcTowards 為「聲源朝觀察者移動的速度分量」
    let vSrcTowards = 0;
    if (dx > 0) vSrcTowards = source.v;
    else vSrcTowards = -source.v;

    // 都卜勒公式: f' = f * (c + v_obs_towards) / (c - v_src_towards)
    const c = SPEED_OF_SOUND;
    const numerator = c + vObsTowards;
    const denominator = c - vSrcTowards;

    // 避免除以零 (聲爆點)
    if (denominator <= 0.1) return 9999; 

    return source.baseFreq * (numerator / denominator);
}

// --- 繪圖邏輯 ---
function drawSimulation() {
    simCtx.clearRect(0, 0, simCanvas.width, simCanvas.height);

    // 畫地平線
    simCtx.beginPath();
    simCtx.moveTo(0, simCanvas.height/2 + 20);
    simCtx.lineTo(simCanvas.width, simCanvas.height/2 + 20);
    simCtx.strokeStyle = '#e0e0e0';
    simCtx.stroke();

    // 1. 畫波前
    simCtx.lineWidth = 1;
    waves.forEach(w => {
        simCtx.beginPath();
        simCtx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
        // 顏色隨距離變淡
        const alpha = Math.max(0, 1 - w.r / 600);
        simCtx.strokeStyle = `rgba(100, 100, 100, ${alpha})`;
        simCtx.stroke();
    });

    // 2. 畫聲源 (紅色)
    simCtx.fillStyle = '#d9534f';
    simCtx.beginPath();
    simCtx.arc(source.x, source.y, 8, 0, Math.PI * 2);
    simCtx.fill();
    simCtx.fillStyle = '#333';
    simCtx.fillText("S", source.x - 4, source.y - 12);
    drawArrow(simCtx, source.x, source.y, source.v, '#d9534f');

    // 3. 畫觀察者 (藍色)
    simCtx.fillStyle = '#0275d8';
    simCtx.beginPath();
    simCtx.arc(observer.x, observer.y, 8, 0, Math.PI * 2);
    simCtx.fill();
    simCtx.fillText("Obs", observer.x - 10, observer.y - 12);
    drawArrow(simCtx, observer.x, observer.y, observer.v, '#0275d8');
}

function drawArrow(ctx, x, y, v, color) {
    if (Math.abs(v) < 5) return; // 速度太小不畫箭頭
    const len = v * 0.3; // 縮放箭頭長度
    const endX = x + len;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    // 箭頭
    ctx.beginPath();
    const headSize = 5;
    if (v > 0) {
        ctx.moveTo(endX, y);
        ctx.lineTo(endX - headSize, y - headSize);
        ctx.lineTo(endX - headSize, y + headSize);
    } else {
        ctx.moveTo(endX, y);
        ctx.lineTo(endX + headSize, y - headSize);
        ctx.lineTo(endX + headSize, y + headSize);
    }
    ctx.fillStyle = color;
    ctx.fill();
}

function drawGraph() {
    graphCtx.clearRect(0, 0, graphCanvas.width, graphCanvas.height);
    
    // 網格背景
    graphCtx.strokeStyle = "#f9f9f9";
    graphCtx.beginPath();
    for(let i=0; i<graphCanvas.width; i+=20) { graphCtx.moveTo(i,0); graphCtx.lineTo(i,graphCanvas.height); }
    for(let i=0; i<graphCanvas.height; i+=20) { graphCtx.moveTo(0,i); graphCtx.lineTo(graphCanvas.width,i); }
    graphCtx.stroke();

    if (freqHistory.length < 2) return;

    // 繪製基準線 (Source Freq)
    const baseY = mapFreqToY(source.baseFreq);
    graphCtx.strokeStyle = "#d9534f"; // 紅色虛線
    graphCtx.setLineDash([5, 5]);
    graphCtx.beginPath();
    graphCtx.moveTo(0, baseY);
    graphCtx.lineTo(graphCanvas.width, baseY);
    graphCtx.stroke();
    graphCtx.setLineDash([]);

    // 繪製觀察頻率曲線
    graphCtx.strokeStyle = "#0275d8"; // 藍色實線
    graphCtx.lineWidth = 2;
    graphCtx.beginPath();
    
    const stepX = graphCanvas.width / MAX_HISTORY;
    
    freqHistory.forEach((freq, index) => {
        const x = index * stepX;
        const y = mapFreqToY(freq);
        if (index === 0) graphCtx.moveTo(x, y);
        else graphCtx.lineTo(x, y);
    });
    graphCtx.stroke();
}

function mapFreqToY(f) {
    // 將頻率映射到 Canvas Y 軸 (範圍 0 ~ 600Hz)
    const minF = 0;
    const maxF = 600;
    let percent = (f - minF) / (maxF - minF);
    // 限制在畫布內
    if(percent < 0) percent = 0;
    if(percent > 1) percent = 1;
    return graphCanvas.height - (percent * graphCanvas.height);
}

// --- 動畫迴圈 ---
function animate(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const deltaTime = (timestamp - lastFrameTime) / 1000; // 秒
    lastFrameTime = timestamp;

    if (!isPaused) {
        const dt = deltaTime * TIME_SCALE; // 套用慢動作

        // 1. 更新速度 (v = v0 + at)
        source.v += source.a * dt;
        observer.v += observer.a * dt;

        // 2. 更新位置 (x = x0 + vt)
        // 注意：速度單位 m/s, 位置單位 pixel, 需轉換
        source.x += (source.v / METERS_PER_PIXEL) * dt;
        observer.x += (observer.v / METERS_PER_PIXEL) * dt;

        // 3. 更新介面顯示數值
        ui.vSrcSlider.value = source.v; // 讓滑桿跟著動
        ui.vSrcVal.textContent = Math.round(source.v);
        ui.vObsSlider.value = observer.v;
        ui.vObsVal.textContent = Math.round(observer.v);

        // 4. 產生波 (Emission)
        // 視覺上不需要每秒產生 200 個波，會太密，我們降低頻率顯示
        const visualRate = 0.1; // 每 0.1 秒畫一個圈
        emissionTimer += dt;
        if (emissionTimer > visualRate) {
            waves.push({
                x: source.x,
                y: source.y,
                r: 0
            });
            emissionTimer = 0;
        }

        // 5. 波的擴散
        for (let i = waves.length - 1; i >= 0; i--) {
            waves[i].r += (SPEED_OF_SOUND / METERS_PER_PIXEL) * dt;
            // 移除太大的波
            if (waves[i].r > 1000) waves.splice(i, 1);
        }

        // 6. 計算與記錄頻率
        const obsFreq = calculateDoppler();
        
        // 顯示
        if (obsFreq > 2000) ui.fObsDisplay.textContent = "Sonic Boom!";
        else ui.fObsDisplay.textContent = obsFreq.toFixed(1);

        // 記錄到歷史陣列
        // 如果是聲爆，限制最高點以免圖表壞掉
        const graphVal = (obsFreq > 600) ? 600 : obsFreq;
        freqHistory.push(graphVal);
        if (freqHistory.length > MAX_HISTORY) freqHistory.shift();
        
        time += dt;
    }

    drawSimulation();
    drawGraph();
    requestAnimationFrame(animate);
}

// --- 啟動 ---
requestAnimationFrame(animate);
