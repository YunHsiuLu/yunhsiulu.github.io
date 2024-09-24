const canvas = document.getElementById('waveCanvas');
const ctx = canvas.getContext('2d');
const frequencySlider = document.getElementById('frequencySlider');
const frequencyValue = document.getElementById('frequencyValue');
const waveCountSlider = document.getElementById('waveCountSlider');
const waveCountValue = document.getElementById('waveCountValue');

canvas.width = 800;
canvas.height = 400;

const numParticles = 200;
const A = 50;  // Amplitude (scaled for display)

let frame = 0;

const x = Array.from({ length: numParticles }, (_, i) => (i / numParticles) * canvas.width);

function drawWave() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const omega = parseFloat(frequencySlider.value);
    const speed = 50;
    const waveCount = parseInt(waveCountSlider.value, 10);
    const k = (2 * Math.PI * waveCount) / canvas.width;  // Adjust wave number based on wave count

    const t = frame / speed;

    const y1 = x.map((xi) => A * Math.sin(k * xi - omega * t));
    const y2 = x.map((xi) => A * Math.sin(k * xi + omega * t));
    const yStanding = y1.map((yi, i) => yi + y2[i]);

    // Draw incoming wave 1
    ctx.strokeStyle = 'red';
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    x.forEach((xi, i) => ctx.lineTo(xi, canvas.height / 2 - y1[i]));
    ctx.stroke();

    // Draw incoming wave 2
    ctx.strokeStyle = 'green';
    ctx.beginPath();
    x.forEach((xi, i) => ctx.lineTo(xi, canvas.height / 2 - y2[i]));
    ctx.stroke();

    // Draw standing wave
    ctx.strokeStyle = 'blue';
    ctx.setLineDash([]);
    ctx.beginPath();
    x.forEach((xi, i) => ctx.lineTo(xi, canvas.height / 2 - yStanding[i]));
    ctx.stroke();

    // Update node and antinode positions
    const nodeIndex = Math.floor((numParticles) / 2);
    const antinodeIndex = nodeIndex + Math.floor((numParticles) / (4*waveCount));

    // Draw node (Green dot)
    ctx.fillStyle = 'green';
    ctx.beginPath();
    ctx.arc(x[nodeIndex], canvas.height / 2 - yStanding[nodeIndex], 5, 0, Math.PI * 2);
    ctx.fill();

    // Draw antinode (Red dot)
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(x[antinodeIndex], canvas.height / 2 - yStanding[antinodeIndex], 5, 0, Math.PI * 2);
    ctx.fill();

    frame++;
    requestAnimationFrame(drawWave);
}

frequencySlider.addEventListener('input', () => {
    frequencyValue.textContent = Number(frequencySlider.value).toFixed(1);
});

waveCountSlider.addEventListener('input', () => {
    waveCountValue.textContent = waveCountSlider.value;
});

drawWave();


