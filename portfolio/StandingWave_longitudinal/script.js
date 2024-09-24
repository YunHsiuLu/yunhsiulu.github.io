const canvas = document.getElementById('waveCanvas');
const ctx = canvas.getContext('2d');

// Get the sliders and their corresponding display spans
const frequencySlider = document.getElementById('frequencySlider');
const waveCountSlider = document.getElementById('waveCountSlider');
const frequencyValue = document.getElementById('frequencyValue');
const waveCountValue = document.getElementById('waveCountValue');

// Update the slider display values
frequencyValue.innerText = frequencySlider.value;
waveCountValue.innerText = waveCountSlider.value;

// Resize the canvas to fill the window
canvas.width = window.innerWidth;
canvas.height = 300; // Adjust based on your needs

const particleCount = 100;
let amplitude = 50;
let frequency = parseFloat(frequencySlider.value); // Start with slider's value
let waveCount = parseInt(waveCountSlider.value); // Start with slider's value
const particles = [];

// Particle class to store each particle's properties
class Particle {
    constructor(x, y, phaseShift) {
        this.x = x;
        this.y = y;
        this.phaseShift = phaseShift;
        this.initialX = x;
    }

    // Function to update the position of each particle
    update(time) {
        this.x = this.initialX + Math.sin(frequency * (time + this.phaseShift)) * amplitude;
    }

    // Function to draw the particle
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2); // Drawing small circles for each particle
        ctx.fillStyle = '#61dafb'; // Particle color
        ctx.fill();
        ctx.closePath();
    }
}

// Generate particles along the horizontal axis
function generateParticles() {
    particles.length = 0; // Clear previous particles
    for (let i = 0; i < particleCount; i++) {
        let x = (i / particleCount) * canvas.width;
        let y = canvas.height / 2; // Keep particles centered vertically
        let phaseShift = i * (waveCount * Math.PI / particleCount); // Adjust the phase shift with wave count

        particles.push(new Particle(x, y, phaseShift));
    }
}

// Animate the particles
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas for each frame

    let time = Date.now() * 0.003; // Control speed of the wave

    particles.forEach((particle) => {
        particle.update(time); // Update particle position
        particle.draw(); // Draw particle on canvas
    });

    requestAnimationFrame(animate); // Loop animation
}

// Event listeners for the sliders to update frequency and wave count in real time
frequencySlider.addEventListener('input', () => {
    frequency = parseFloat(frequencySlider.value); // Update frequency based on slider
    frequencyValue.innerText = frequencySlider.value; // Display updated value
});

waveCountSlider.addEventListener('input', () => {
    waveCount = parseInt(waveCountSlider.value); // Update wave count based on slider
    waveCountValue.innerText = waveCountSlider.value; // Display updated value
    generateParticles(); // Regenerate particles with new wave count
});

// Initialize particles and start the animation
generateParticles();
animate();

