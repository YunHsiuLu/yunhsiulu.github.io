const canvas = document.getElementById('mirrorCanvas');
const ctx = canvas.getContext('2d');
const mirrorTypeSelect = document.getElementById('mirrorType');
const objectDistanceInput = document.getElementById('objectDistance');
const objectDistanceValue = document.getElementById('objectDistanceValue');

canvas.width = 800;
canvas.height = 400;

const centerX = canvas.width * 2 / 3;
const centerY = canvas.height / 2;  // 將水平線下移

function drawMirror(isConcave) {
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - canvas.height / 2);
    for (let y = - canvas.height / 2; y <= canvas.height; y++) {
        const x = isConcave ? -Math.pow(y / 100, 2) * 50 : Math.pow(y / 100, 2) * 50;
        ctx.lineTo(centerX + x, centerY + y);
    }
    ctx.stroke();

    // 繪製水平線
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.stroke();
    ctx.strokeStyle = 'black';  // 重置為默認顏色
}

function drawObject(distance) {
    const objectHeight = 80;  // 增加物體高度
    ctx.fillStyle = 'blue';
    ctx.fillRect(centerX - distance - 5, centerY - objectHeight, 10, objectHeight);
    // 畫一個箭頭指向上方
    ctx.beginPath();
    ctx.moveTo(centerX - distance, centerY - objectHeight);
    ctx.lineTo(centerX - distance, centerY - objectHeight - 10);
    ctx.lineTo(centerX - distance + 5, centerY - objectHeight - 5);
    ctx.lineTo(centerX - distance - 5, centerY - objectHeight - 5);
    ctx.lineTo(centerX - distance, centerY - objectHeight - 10);
    ctx.fill();
}

function drawImage(objectDistance, isConcave) {
    let focalLength = 100;
    if (!isConcave) focalLength = -focalLength;

    let imageDistance = (objectDistance * focalLength) / (objectDistance - focalLength);

    let magnification = Math.abs((focalLength - imageDistance) / focalLength);
    let imageHeight = 80 * magnification;  // 調整高度
    
    console.log(focalLength, imageDistance, magnification)

    ctx.fillStyle = 'red';
    ctx.setLineDash([5, 5]);
    
    if (isConcave) {
        if (objectDistance > focalLength) {
            // 縮小倒立實像
            ctx.setLineDash([]);
            ctx.fillRect(centerX - imageDistance - 5, centerY, 10, imageHeight);
            // 畫一個箭頭指向下方
            ctx.beginPath();
            ctx.moveTo(centerX - imageDistance, centerY + imageHeight);
            ctx.lineTo(centerX - imageDistance, centerY + imageHeight + 10);
            ctx.lineTo(centerX - imageDistance + 5, centerY + imageHeight + 5);
            ctx.lineTo(centerX - imageDistance - 5, centerY + imageHeight + 5);
            ctx.lineTo(centerX - imageDistance, centerY + imageHeight + 10);
            ctx.fill();
        } else {
            // 放大正立虛像
            imageDistance = -imageDistance;
            ctx.fillRect(centerX + imageDistance - 5, centerY - imageHeight, 10, imageHeight);
            // 畫一個箭頭指向上方
            ctx.beginPath();
            ctx.moveTo(centerX + imageDistance, centerY - imageHeight);
            ctx.lineTo(centerX + imageDistance, centerY - imageHeight - 10);
            ctx.lineTo(centerX + imageDistance + 5, centerY - imageHeight - 5);
            ctx.lineTo(centerX + imageDistance - 5, centerY - imageHeight - 5);
            ctx.lineTo(centerX + imageDistance, centerY - imageHeight - 10);
            ctx.fill();
        }
    } else {
        // 凸面鏡：縮小正立虛像
        ctx.fillRect(centerX + Math.abs(imageDistance) - 5, centerY - imageHeight, 10, imageHeight);
        // 畫一個箭頭指向上方
        ctx.beginPath();
        ctx.moveTo(centerX + Math.abs(imageDistance), centerY - imageHeight);
        ctx.lineTo(centerX + Math.abs(imageDistance), centerY - imageHeight - 10);
        ctx.lineTo(centerX + Math.abs(imageDistance) + 5, centerY - imageHeight - 5);
        ctx.lineTo(centerX + Math.abs(imageDistance) - 5, centerY - imageHeight - 5);
        ctx.lineTo(centerX + Math.abs(imageDistance), centerY - imageHeight - 10);
        ctx.fill();
    }
    ctx.setLineDash([]);
}

function updateSimulation() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const isConcave = mirrorTypeSelect.value === 'concave';
    const objectDistance = parseInt(objectDistanceInput.value);
    
    drawMirror(isConcave);
    drawObject(objectDistance);
    drawImage(objectDistance, isConcave);
}

mirrorTypeSelect.addEventListener('change', updateSimulation);
objectDistanceInput.addEventListener('input', () => {
    objectDistanceValue.textContent = objectDistanceInput.value;
    updateSimulation();
});

updateSimulation();
