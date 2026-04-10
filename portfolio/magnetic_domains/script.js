const canvas = document.getElementById('domainCanvas');
const ctx = canvas.getContext('2d');
const magnet = document.getElementById('magnet');
const stage = document.getElementById('stage');
const hContainer = document.getElementById('hFieldContainer');
const mText = document.getElementById('mFieldText');

let dipoles = [];
let isDragging = false, offsetX, offsetY;
const dipoleRows = 12, dipoleCols = 24;
const matX = 225, matY = 175, matW = 400, matH = 200;

function init() {
    canvas.width = stage.offsetWidth;
    canvas.height = stage.offsetHeight;
    dipoles = [];
    const spacingX = (matW - 40) / (dipoleCols - 1);
    const spacingY = (matH - 40) / (dipoleRows - 1);
    
    for (let i = 0; i < dipoleCols; i++) {
        for (let j = 0; j < dipoleRows; j++) {
            dipoles.push({
                x: matX + 20 + i * spacingX, 
                y: matY + 20 + j * spacingY,
                angle: Math.random() * Math.PI * 2,
                friction: 0.3, // 足夠的摩擦力以維持剩磁
                speed: 0.12
            });
        }
    }
}

function updatePhysics() {
    const magN_X = magnet.offsetLeft + 37.5, magN_Y = magnet.offsetTop + 35;
    const magS_X = magnet.offsetLeft + 112.5, magS_Y = magnet.offsetTop + 35;

    // 邊緣判定（判定為無外場）
    const margin = 25;
    const isAtEdge = (magnet.offsetLeft < margin || magnet.offsetLeft > stage.offsetWidth - magnet.offsetWidth - margin ||
                      magnet.offsetTop < margin || magnet.offsetTop > stage.offsetHeight - magnet.offsetHeight - margin);

    // 更新外場讀數 UI
    const newHTML = isAtEdge ? "\\(\\vec{H} \\approx 0\\)" : "\\(\\vec{H}_{net}\\)";
    if (hContainer.innerHTML !== newHTML) {
        hContainer.innerHTML = newHTML;
        if (window.MathJax) MathJax.typeset([hContainer]);
    }

    let mVectorX = 0; // 用於計算宏觀磁化強度 M
    dipoles.forEach(d => {
        if (!isAtEdge) {
            let distN = Math.sqrt((d.x - magN_X)**2 + (d.y - magN_Y)**2);
            let distS = Math.sqrt((d.x - magS_X)**2 + (d.y - magS_Y)**2);
            
            const power = 250000;
            let bNx = (power / (distN**2)) * (d.x - magN_X) / distN;
            let bNy = (power / (distN**2)) * (d.y - magN_Y) / distN;
            let bSx = -(power / (distS**2)) * (d.x - magS_X) / distS;
            let bSy = -(power / (distS**2)) * (d.y - magS_Y) / distS;

            let totalBx = bNx + bSx, totalBy = bNy + bSy;
            let totalB = Math.sqrt(totalBx**2 + totalBy**2);
            let target = Math.atan2(totalBy, totalBx);

            if (totalB > d.friction) {
                let diff = target - d.angle;
                while(diff > Math.PI) diff -= Math.PI * 2;
                while(diff < -Math.PI) diff += Math.PI * 2;
                d.angle += diff * d.speed;
            }
        }
        mVectorX += Math.cos(d.angle);
    });
    
    // 磁性狀態判定：即使 H=0，只要小箭頭整齊，就顯示剩磁
    const mIntensity = Math.abs(mVectorX / dipoles.length);
    if (mIntensity > 0.8) {
        mText.innerText = "強磁飽和";
        mText.style.color = "#ff4757";
    } else if (mIntensity > 0.15) {
        mText.innerText = isAtEdge ? "保有剩磁" : "受感應磁化";
        mText.style.color = "#ffa502";
    } else {
        mText.innerText = "無磁性";
        mText.style.color = "#2ed573";
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 材料外框
    ctx.lineWidth = 4; 
    ctx.strokeStyle = "#7f8c8d"; 
    ctx.strokeRect(matX, matY, matW, matH);
    
    // 繪製磁偶極
    dipoles.forEach(d => {
        ctx.save(); 
        ctx.translate(d.x, d.y); 
        ctx.rotate(d.angle);
        ctx.beginPath(); 
        ctx.lineWidth = 2; 
        ctx.strokeStyle = "#2c3e50"; 
        ctx.moveTo(-7, 0); 
        ctx.lineTo(7, 0); 
        ctx.stroke();
        
        ctx.beginPath(); 
        ctx.fillStyle = "#e74c3c"; 
        ctx.moveTo(7, 0); 
        ctx.lineTo(2, -4); 
        ctx.lineTo(2, 4); 
        ctx.fill();
        ctx.restore();
    });
}

function animate() { 
    updatePhysics(); 
    draw(); 
    requestAnimationFrame(animate); 
}

// 磁鐵拖曳邏輯
magnet.onmousedown = e => {
    isDragging = true;
    offsetX = e.clientX - magnet.offsetLeft; 
    offsetY = e.clientY - magnet.offsetTop;
};

document.onmousemove = e => {
    if (!isDragging) return;
    let x = Math.max(0, Math.min(e.clientX - offsetX, stage.offsetWidth - 150));
    let y = Math.max(0, Math.min(e.clientY - offsetY, stage.offsetHeight - 70));
    magnet.style.left = x + 'px'; 
    magnet.style.top = y + 'px';
};

document.onmouseup = () => isDragging = false;

// 消磁功能
function degauss() {
    dipoles.forEach(d => d.angle = Math.random() * Math.PI * 2);
}

// 啟動
init();
animate();
