const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// --- 狀態變數 ---
let bunnies = [];
let generation = 0;
let autoRunInterval = null;

// 圖表歷史數據
let historyLabels = [];
let historyAA = [];
let historyAa = [];
let historyaa = [];
let historyP = [];
let historyQ = [];

// --- DOM 元素 ---
const inputs = {
    p: document.getElementById('init-p'),
    popSize: document.getElementById('pop-size'),
    fitAA: document.getElementById('fit-AA'),
    fitAa: document.getElementById('fit-Aa'),
    fitaa: document.getElementById('fit-aa')
};

const displays = {
    p: document.getElementById('val-p'),
    pop: document.getElementById('val-pop'),
    fitAA: document.getElementById('val-fit-AA'),
    fitAa: document.getElementById('val-fit-Aa'),
    fitaa: document.getElementById('val-fit-aa'),
    gen: document.getElementById('gen-count'),
    popCount: document.getElementById('pop-count')
};

// --- 初始化 Chart.js ---
const commonChartOptions = {
    responsive: true,
    animation: { duration: 500 },
    scales: {
        y: { beginAtZero: true, max: 1.0, ticks: { callback: v => (v * 100).toFixed(0) + '%' } }
    },
    plugins: {
        tooltip: {
            callbacks: { label: (ctx) => ctx.dataset.label + ': ' + (ctx.raw * 100).toFixed(1) + '%' }
        }
    }
};

const chartGeno = new Chart(document.getElementById('chartGeno'), {
    type: 'line',
    data: {
        labels: historyLabels,
        datasets: [
            { label: 'AA (White)', borderColor: '#aaa', backgroundColor: '#eee', data: historyAA, fill: false, tension: 0.1 },
            { label: 'Aa (Brown)', borderColor: '#D2691E', backgroundColor: '#D2691E', data: historyAa, fill: false, tension: 0.1 },
            { label: 'aa (Black)', borderColor: '#333', backgroundColor: '#000', data: historyaa, fill: false, tension: 0.1 }
        ]
    },
    options: commonChartOptions
});

const chartAllele = new Chart(document.getElementById('chartAllele'), {
    type: 'line',
    data: {
        labels: historyLabels,
        datasets: [
            { label: 'Allele A (p)', borderColor: '#2980b9', data: historyP, tension: 0.1, borderWidth: 2 },
            { label: 'Allele a (q)', borderColor: '#c0392b', data: historyQ, tension: 0.1, borderWidth: 2 }
        ]
    },
    options: commonChartOptions
});

// --- 兔子類別 (視覺效果) ---
class Bunny {
    constructor(genotype) {
        this.genotype = genotype; // 'AA', 'Aa', 'aa'
        this.x = Math.random() * (canvas.width - 40) + 20;
        this.y = Math.random() * (canvas.height * 0.5) + (canvas.height * 0.4); // 只在草地上
        this.vx = (Math.random() - 0.5) * 2; // 隨機水平速度
        this.hopPhase = Math.random() * Math.PI * 2; // 跳躍相位
    }

    draw() {
        // 根據基因型決定顏色
        let color, earColor;
        if (this.genotype === 'AA') {
            color = '#FFFFFF'; earColor = '#FFC0CB'; // 白兔粉耳
        } else if (this.genotype === 'Aa') {
            color = '#D2691E'; earColor = '#8B4513'; // 棕兔深棕耳
        } else {
            color = '#333333'; earColor = '#555555'; // 黑兔灰耳
        }

        // 跳躍效果 (y 軸偏移)
        const hopY = Math.abs(Math.sin(Date.now() / 200 + this.hopPhase)) * 15;
        const drawY = this.y - hopY;

        ctx.fillStyle = color;
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;

        // 身體
        ctx.beginPath();
        ctx.ellipse(this.x, drawY, 12, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 頭
        ctx.beginPath();
        ctx.arc(this.x, drawY - 10, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 耳朵
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(this.x - 4, drawY - 20, 3, 8, -0.2, 0, Math.PI * 2); // 左耳
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.ellipse(this.x + 4, drawY - 20, 3, 8, 0.2, 0, Math.PI * 2); // 右耳
        ctx.fill();
        ctx.stroke();

        // 眼睛
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.x - 3, drawY - 12, 1, 0, Math.PI * 2);
        ctx.arc(this.x + 3, drawY - 12, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        this.x += this.vx;
        // 邊界反彈
        if (this.x < 20 || this.x > canvas.width - 20) this.vx *= -1;
    }
}

// --- 模擬邏輯核心 ---

function resetSimulation() {
    generation = 0;
    historyLabels.length = 0;
    historyAA.length = 0;
    historyAa.length = 0;
    historyaa.length = 0;
    historyP.length = 0;
    historyQ.length = 0;
    
    createInitialGeneration();
    updateCharts();
    
    if (autoRunInterval) {
        clearInterval(autoRunInterval);
        autoRunInterval = null;
        document.getElementById('btn-auto').textContent = 'Auto Run';
    }
}

function createInitialGeneration() {
    const p = parseFloat(inputs.p.value);
    const q = 1 - p;
    const size = parseInt(inputs.popSize.value);
    
    bunnies = [];
    
    // 根據 Hardy-Weinberg 比例 p^2, 2pq, q^2 生成初始群體
    for (let i = 0; i < size; i++) {
        const rand = Math.random();
        let genotype;
        
        if (rand < p * p) {
            genotype = 'AA';
        } else if (rand < p * p + 2 * p * q) {
            genotype = 'Aa';
        } else {
            genotype = 'aa';
        }
        bunnies.push(new Bunny(genotype));
    }
    
    recordStats();
}

function nextGeneration() {
    const fitAA = parseFloat(inputs.fitAA.value);
    const fitAa = parseFloat(inputs.fitAa.value);
    const fitaa = parseFloat(inputs.fitaa.value);
    const targetSize = parseInt(inputs.popSize.value);

    // 1. 計算當前存活基因庫 (Gene Pool after Selection)
    let genePoolA = 0;
    let genePoola = 0;

    bunnies.forEach(b => {
        // 每個個體貢獻基因到下一代的機率取決於 Fitness
        // 這裡我們用簡單的加權法：Fitness 就是該個體能貢獻基因的 "權重"
        if (b.genotype === 'AA') {
            genePoolA += 2 * fitAA;
        } else if (b.genotype === 'Aa') {
            genePoolA += 1 * fitAa;
            genePoola += 1 * fitAa;
        } else if (b.genotype === 'aa') {
            genePoola += 2 * fitaa;
        }
    });

    const totalAlleles = genePoolA + genePoola;

    // 如果群體滅絕
    if (totalAlleles === 0) {
        alert("Population Extinct! Resetting...");
        resetSimulation();
        return;
    }

    // 2. 計算修正後的等位基因頻率 p (Selection 後的 p)
    const newP = genePoolA / totalAlleles;
    const newQ = 1 - newP;

    // 3. 產生下一代 (Random Mating based on new p)
    bunnies = [];
    for (let i = 0; i < targetSize; i++) {
        const rand = Math.random();
        let genotype;
        // 假設隨機交配: AA = p^2, Aa = 2pq, aa = q^2
        if (rand < newP * newP) {
            genotype = 'AA';
        } else if (rand < newP * newP + 2 * newP * newQ) {
            genotype = 'Aa';
        } else {
            genotype = 'aa';
        }
        bunnies.push(new Bunny(genotype));
    }

    generation++;
    recordStats();
    updateCharts();
}

function recordStats() {
    let countAA = 0, countAa = 0, countaa = 0;
    bunnies.forEach(b => {
        if (b.genotype === 'AA') countAA++;
        else if (b.genotype === 'Aa') countAa++;
        else countaa++;
    });

    const total = bunnies.length;
    // 計算實際頻率
    const freqAA = countAA / total;
    const freqAa = countAa / total;
    const freqaa = countaa / total;

    // 計算 p (A 的頻率)
    const p = (2 * countAA + countAa) / (2 * total);
    const q = 1 - p;

    // 更新 UI
    displays.gen.textContent = generation;
    displays.popCount.textContent = total;

    // 更新歷史數據 (只保留最近 20 代以免圖表太擠，或者一直保留)
    historyLabels.push(generation);
    historyAA.push(freqAA);
    historyAa.push(freqAa);
    historyaa.push(freqaa);
    historyP.push(p);
    historyQ.push(q);
}

function updateCharts() {
    chartGeno.update();
    chartAllele.update();
}

// --- 動畫循環 ---
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 排序 y 軸讓前面的兔子蓋住後面的
    bunnies.sort((a, b) => a.y - b.y);

    bunnies.forEach(b => {
        b.update();
        b.draw();
    });

    requestAnimationFrame(animate);
}

// --- 事件監聽 ---
Object.keys(inputs).forEach(key => {
    inputs[key].addEventListener('input', (e) => {
        displays[key].textContent = e.target.value;
        // 如果是在第0代調整 p 或 size，實時重置
        if ((key === 'p' || key === 'popSize') && generation === 0) {
            resetSimulation();
        }
    });
});

document.getElementById('btn-next').addEventListener('click', nextGeneration);

document.getElementById('btn-reset').addEventListener('click', resetSimulation);

document.getElementById('btn-auto').addEventListener('click', () => {
    const btn = document.getElementById('btn-auto');
    if (autoRunInterval) {
        clearInterval(autoRunInterval);
        autoRunInterval = null;
        btn.textContent = 'Auto Run';
        btn.style.backgroundColor = '#f39c12';
    } else {
        nextGeneration(); // 馬上跑一代
        autoRunInterval = setInterval(nextGeneration, 1500); // 每1.5秒一代
        btn.textContent = 'Stop Auto';
        btn.style.backgroundColor = '#7f8c8d';
    }
});

// 啟動
resetSimulation();
animate();
