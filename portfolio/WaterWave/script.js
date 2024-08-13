const canvas = document.getElementById('waveCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 400;

const numPoints = 10000;
const A = 50;  // 垂直振幅
const B = 50;  // 水平振幅
const k = (2 * Math.PI) / 500;  // 波數
const omega = (2 * Math.PI) / 5;  // 角頻率
const specialIndex = numPoints / 2;  // 特別紅點的位置

const initialX = Array.from({length: numPoints}, (_, i) => (i / numPoints) * canvas.width);
const y = Array.from({length: numPoints}, (_, i) => canvas.height / 2);

let redPointPath = []; // 用來儲存紅點的軌跡

function drawWave(frame) {
    ctx.clearRect(0, canvas.height / 2 - A - 5, canvas.width, 2 * A + 10); // 只清除波動部分範圍

    const t = frame / 30;

    // 計算垂直和水平的簡諧運動
    const newY = y.map((_, i) => canvas.height / 2 + A * Math.cos(k * initialX[i] - omega * t));
    const newX = initialX.map((xi) => xi + B * Math.sin(k * xi - omega * t));

    // 繪製波形
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;
    ctx.beginPath();
    newX.forEach((xi, i) => ctx.lineTo(xi, newY[i]));
    ctx.stroke();

    // 更新紅點位置，並添加到軌跡列表
    redPointPath.push({x: newX[specialIndex], y: newY[specialIndex]});
    if (redPointPath.length > 100) redPointPath.shift(); // 限制軌跡長度以避免記憶體使用過多

    // 繪製紅點的軌跡
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 1;
    ctx.beginPath();
    redPointPath.forEach((point, index) => {
        if (index === 0) {
            ctx.moveTo(point.x, point.y);
        } else {
            ctx.lineTo(point.x, point.y);
        }
    });
    ctx.stroke();

    // 繪製特別的紅點
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(newX[specialIndex], newY[specialIndex], 5, 0, Math.PI * 2);
    ctx.fill();

    requestAnimationFrame(() => drawWave(frame + 1));
}

drawWave(0);

