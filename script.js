const canvas = document.getElementById('waveCanvas');
const ctx = canvas.getContext('2d');

const numParticles = 200;
const x = Array.from({ length: numParticles }, (_, i) => i * (canvas.width / numParticles));
const A = 50;  // Amplitude in pixels
const k = 2 * Math.PI / 100;  // Wave number
const omega = 2 * Math.PI / 60;  // Angular frequency
const nodeIndex = 0;
const antinodeIndex = numParticles / 4;
let frame = 0;

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate displacements
    const y1 = x.map(xi => A * Math.sin(k * xi - omega * frame));
    const y2 = x.map(xi => A * Math.sin(k * xi + omega * frame));
    const yStanding = y1.map((y, i) => y + y2[i]);
    
    // Draw incoming waves
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.beginPath();
    y1.forEach((yi, i) => {
        ctx.lineTo(x[i], canvas.height / 2 - yi);
    });
    ctx.stroke();
    
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
    ctx.beginPath();
    y2.forEach((yi, i) => {
        ctx.lineTo(x[i], canvas.height / 2 - yi);
    });
    ctx.stroke();
    
    // Draw standing wave
    ctx.strokeStyle = 'blue';
    ctx.beginPath();
    yStanding.forEach((yi, i) => {
        ctx.lineTo(x[i], canvas.height / 2 - yi);
    });
    ctx.stroke();
    
    // Draw node
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(x[nodeIndex], canvas.height / 2 - yStanding[nodeIndex], 5, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw antinode
    ctx.fillStyle = 'green';
    ctx.beginPath();
    ctx.arc(x[antinodeIndex], canvas.height / 2 - yStanding[antinodeIndex], 5, 0, 2 * Math.PI);
    ctx.fill();
    
    frame += 1;
    requestAnimationFrame(draw);
}

draw();

