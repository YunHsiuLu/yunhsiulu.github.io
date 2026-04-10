const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const wlInput = document.getElementById('wavelength');
const dInput = document.getElementById('distance');
const wlVal = document.getElementById('wl-val');
const dVal = document.getElementById('d-val');

/**
 * 主要繪圖函式
 */
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const L = parseFloat(wlInput.value);
    const D = parseFloat(dInput.value);
    wlVal.innerText = L;
    dVal.innerText = D;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const s1 = { x: centerX - D / 2, y: centerY };
    const s2 = { x: centerX + D / 2, y: centerY };

    // 1. 繪製背景參考波紋
    drawWaveGuides(s1, s2, L);

    // 2. 計算並繪製干涉線
    const maxN = Math.floor(D / L) + 1;

    for (let n = 0; n <= maxN; n++) {
        // 腹線：黑色實線 (路徑差 = n * λ)
        drawHyperbola(s1, s2, n * L, '#000000', []);
        
        // 節線：灰色虛線 (路徑差 = (n + 0.5) * λ)
        drawHyperbola(s1, s2, (n + 0.5) * L, '#999999', [6, 4]);
    }

    // 3. 繪製波源點
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(s1.x, s1.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s2.x, s2.y, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // 4. 標註 S1, S2
    ctx.font = "italic 12px Arial";
    ctx.fillText("S1", s1.x - 10, s1.y - 10);
    ctx.fillText("S2", s2.x - 10, s2.y - 10);
}

/**
 * 繪製雙曲線 (干涉線)
 */
function drawHyperbola(s1, s2, diff, color, dash) {
    // 中央腹線情況
    if (diff < 0.1) {
        ctx.strokeStyle = color;
        ctx.setLineDash(dash);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo((s1.x + s2.x) / 2, 0);
        ctx.lineTo((s1.x + s2.x) / 2, canvas.height);
        ctx.stroke();
        return;
    }

    const d = Math.abs(s1.x - s2.x);
    if (diff >= d) return; 

    ctx.strokeStyle = color;
    ctx.setLineDash(dash);
    ctx.lineWidth = 1.5;

    const a = diff / 2;
    const c = d / 2;
    const b = Math.sqrt(c * c - a * a);

    [-1, 1].forEach(side => {
        ctx.beginPath();
        let first = true;
        for (let y = 0; y <= canvas.height; y += 2) {
            const ty = y - canvas.height / 2;
            const tx = side * a * Math.sqrt(1 + (ty * ty) / (b * b));
            const x = tx + (canvas.width / 2);
            
            if (first) {
                ctx.moveTo(x, y);
                first = false;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    });
}

/**
 * 繪製極淡的參考圓圈 (球面波)
 */
function drawWaveGuides(s1, s2, L) {
    ctx.globalAlpha = 0.05; 
    ctx.strokeStyle = '#000';
    ctx.setLineDash([]);
    for (let r = L; r < 600; r += L) {
        ctx.beginPath(); ctx.arc(s1.x, s1.y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(s2.x, s2.y, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
}

// 監聽輸入事件
wlInput.addEventListener('input', draw);
dInput.addEventListener('input', draw);

// 初始執行一次
draw();
