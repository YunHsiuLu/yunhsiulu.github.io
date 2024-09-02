const canvas = document.getElementById('waveCanvas');
const frequencySlider = document.getElementById('frequencySlider');
const frequencyValue = document.getElementById('frequencyValue');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 400;

let particles = [];
const waveLength = 100;
const waveAmplitude = waveLength / 5;
const rows = 12;
const cols = 100;
const particleCount = rows * cols;
let frame = 0;

function initParticles() {
    particles = [];
    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            particles.push({
                x: (i+0.5) / cols * canvas.width,
                y: (j+0.5) / rows * canvas.height,
                //y: canvas.height / 2,
                originalX: (i+0.5) / cols * canvas.width,
            });
        }
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const waveFrequency = frequencySlider.value;
    const speed = 50;
    const t = frame / speed;
    
    particles.forEach((particle, index) => {
        let dot_radius = 3;
        let dot_color = '#34a0bd';
        particle.x = particle.originalX + Math.sin(waveFrequency * (t - Math.floor(index/rows) / 10)) * waveAmplitude;
        ctx.beginPath();
        if (600 <= index && index < 612) {
            dot_radius = 5;
            dot_color = '#dd4a55';
        }
        ctx.arc(particle.x, particle.y, dot_radius, 0, Math.PI * 2, false);
        ctx.fillStyle = dot_color;
        ctx.fill();
        ctx.closePath();
    });
    frame++;
    if (frame == 5000) frame = 0;
    requestAnimationFrame(animateParticles);
}

frequencySlider.addEventListener('input', () => {
    frequencyValue.textContent = frequencySlider.value;
})

initParticles();
animateParticles();

