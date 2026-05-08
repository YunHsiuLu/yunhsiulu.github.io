const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// Adjust canvas resolution for sharpness
const dpr = window.devicePixelRatio || 1;
canvas.width = 1000 * dpr;
canvas.height = 500 * dpr;
ctx.scale(dpr, dpr);

const margin = { top: 80, right: 50, bottom: 80, left: 50 };
const width = 1000 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const spectrum = [
    { name: "γ-ray", log: -11.5, f: "10^20", e: "1.24 MeV", color: "#4B0082", info: "伽瑪射線：具有極高能量與穿透力，常用於醫療放射治療、核子醫學及天文觀測。其波長極短，能穿透大部分物質。" },
    { name: "X-ray", log: -10, f: "10^18", e: "12.4 keV", color: "#4682B4", info: "X射線：常用於診斷性醫學影像、安全檢查及工業探傷。其能量足以電離原子，因此具備一定的生物效應。" },
    { name: "UV", log: -8, f: "10^16", e: "124 eV", color: "#9400D3", info: "紫外線：主要來自太陽輻射，具殺菌作用，能促進人體合成維生素D，但過量暴露會造成皮膚曬傷甚至病變。" },
    { name: "Visible", log: -6.4, f: "4.3-7.5e14", e: "1.8-3.1 eV", color: "#27ae60", isVisible: true, info: "可見光：人類肉眼唯一能感知的電磁波範圍。包含紅、橙、黃、綠、藍、靛、紫等色，波長約 380nm 到 780nm。" },
    { name: "Infrared", log: -4.5, f: "10^13", e: "0.1 eV", color: "#B22222", info: "紅外線：熱輻射的主要形式。廣泛應用於遙控器、熱顯像儀、光纖通訊及夜視設備。" },
    { name: "Microwave", log: -2.5, f: "10^10", e: "40 μeV", color: "#d35400", info: "微波：波長在公分級別。用於雷達、通訊（如Wi-Fi）、衛星導航以及加熱食物的微波爐。" },
    { name: "Radio", log: 1.5, f: "10^6", e: "< 1 neV", color: "#2c3e50", info: "廣播波：波長最長的電磁波，可用於調頻/調幅廣播、電視訊號傳輸及長距離無線電通訊。" }
];

const apps = [
    { name: "Wi-Fi / BT", log: -1.0, color: "#7f8c8d" },
    { name: "4G / 5G", log: 0.2, color: "#7f8c8d" },
    { name: "AM Radio", log: 2.5, color: "#7f8c8d" }
];

function mapLogToX(logVal) {
    return ((logVal - (-12)) / (3 - (-12))) * width + margin.left;
}

function drawSuperscript(text, base, x, y, fontSize) {
    ctx.font = `${fontSize}px Arial`;
    ctx.fillText(base, x, y);
    const baseWidth = ctx.measureText(base).width;
    ctx.font = `${fontSize * 0.7}px Arial`;
    ctx.fillText(text, x + baseWidth, y - fontSize * 0.4);
}

function draw() {
    ctx.clearRect(0, 0, 1000, 500);

    // 1. Draw Axes Titles
    ctx.fillStyle = "#333";
    ctx.font = "italic 16px serif";
    ctx.fillText("Frequency f (Hz)", width / 2 + margin.left - 50, margin.top - 55);
    ctx.fillText("Wavelength λ (m)", width / 2 + margin.left - 50, 500 - margin.bottom + 55);

    // 2. Draw Ticks and Grid
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 1;
    ctx.textAlign = "center";
    for (let i = 0; i <= 15; i += 3) {
        let logWl = -12 + i;
        let logFreq = 20 - i;
        let x = mapLogToX(logWl);

        // Grid line
        ctx.beginPath();
        ctx.moveTo(x, margin.top - 10);
        ctx.lineTo(x, 500 - margin.bottom + 10);
        ctx.stroke();

        // Bottom labels (Wavelength)
        drawSuperscript(logWl.toString(), "10", x - 10, 500 - margin.bottom + 30, 13);
        
        // Top labels (Frequency)
        drawSuperscript(logFreq.toString(), "10", x - 10, margin.top - 25, 13);
    }

    // 3. Draw Waveform (Left dense, Right sparse)
    ctx.beginPath();
    ctx.strokeStyle = "#1a237e";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    
    for (let x = margin.left; x <= margin.left + width; x++) {
        let relX = (x - margin.left) / width;
        // Reduced frequency factor for less crowded wave
        let freqFactor = 12 / (relX * 6 + 1.2);
        let y = (margin.top + height / 2) + Math.sin(relX * width * 0.12 * freqFactor) * 40;
        if (x === margin.left) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 4. Highlight Visible Light
    const vStart = mapLogToX(-6.45); // Adjusted for better visual center
    const vEnd = mapLogToX(-6.0);
    ctx.fillStyle = "rgba(255, 165, 0, 0.15)";
    ctx.fillRect(vStart, margin.top, vEnd - vStart, height);
    
    // Arrows for Visible Light - Staggered to prevent overlap
    ctx.strokeStyle = "#8e44ad"; ctx.lineWidth = 1.5;
    drawArrow(vStart, margin.top + 25, vStart, margin.top + 5);
    ctx.fillStyle = "#8e44ad"; ctx.font = "bold 11px Arial";
    ctx.textAlign = "right";
    ctx.fillText("380nm", vStart - 5, margin.top + 20);

    ctx.strokeStyle = "#c0392b";
    drawArrow(vEnd, margin.top + 45, vEnd, margin.top + 5);
    ctx.fillStyle = "#c0392b";
    ctx.textAlign = "left";
    ctx.fillText("780nm", vEnd + 5, margin.top + 40);
    ctx.textAlign = "center";

    // 5. Section Labels
    spectrum.forEach(item => {
        let x = mapLogToX(item.log);
        ctx.fillStyle = item.color;
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(item.name, x, margin.top + 80);
        
        // Pointer
        ctx.beginPath();
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 1;
        ctx.moveTo(x, margin.top + 90);
        ctx.lineTo(x, margin.top + 115);
        ctx.stroke();

        item.area = { x1: x - 40, x2: x + 40, y1: margin.top + 60, y2: margin.top + 100 };
    });

    // 6. Application Labels (Bottom)
    apps.forEach(app => {
        let x = mapLogToX(app.log);
        ctx.fillStyle = "#7f8c8d";
        ctx.font = "12px Arial";
        ctx.fillText(app.name, x, 500 - margin.bottom - 40);
        
        ctx.beginPath();
        ctx.setLineDash([2, 2]);
        ctx.moveTo(x, 500 - margin.bottom - 55);
        ctx.lineTo(x, 500 - margin.bottom - 90);
        ctx.stroke();
        ctx.setLineDash([]);
    });
}

function drawArrow(fromx, fromy, tox, toy) {
    const headlen = 7;
    const angle = Math.atan2(toy - fromy, tox - fromx);
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
}

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width * dpr);
    const scaleY = canvas.height / (rect.height * dpr);
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    spectrum.forEach(item => {
        if (mx >= item.area.x1 && mx <= item.area.x2 && my >= item.area.y1 && my <= item.area.y2) {
            updatePanel(item);
        }
    });
});

function updatePanel(item) {
    document.getElementById('wlVal').innerHTML = item.log < 0 ? `10<sup>${item.log}</sup>` : `10<sup>${item.log}</sup>`;
    document.getElementById('freqVal').innerHTML = item.f.includes('^') ? item.f.replace('^', '<sup>') + '</sup>' : item.f;
    document.getElementById('eVal').innerText = item.e;
    
    let html = `<h4 style="color:${item.color}">${item.name}</h4><p>${item.info}</p>`;
    
    if (item.isVisible) {
        html += `
            <div class="rainbow-container">
                <div class="rainbow-bar"></div>
                <div class="rainbow-labels">
                    <span>380nm (紫)</span>
                    <span>555nm (綠)</span>
                    <span>780nm (紅)</span>
                </div>
            </div>
        `;
    }
    
    document.getElementById('descriptionBox').innerHTML = html;
}

draw();
window.addEventListener('resize', draw);
