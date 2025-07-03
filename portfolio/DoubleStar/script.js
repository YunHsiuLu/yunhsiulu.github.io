const canvas = document.getElementById('starCanvas');
const ctx = canvas.getContext('2d');

// Sliders
const mass1Slider = document.getElementById('mass1');
const mass2Slider = document.getElementById('mass2');
const distanceSlider = document.getElementById('distance');

// Slider Labels (for displaying values next to title)
const mass1Label = document.getElementById('mass1-label');
const mass2Label = document.getElementById('mass2-label');
const distanceLabel = document.getElementById('distance-label');

// Output Values (in properties panel)
const mass1Value = document.getElementById('mass1-value');
const mass2Value = document.getElementById('mass2-value');
const distanceValue = document.getElementById('distance-value'); // This is for the system properties panel
const r1Value = document.getElementById('r1-value');
const r2Value = document.getElementById('r2-value');
const v1Value = document.getElementById('v1-value');
const v2Value = document.getElementById('v2-value');
const ke1Value = document.getElementById('ke1-value');
const ke2Value = document.getElementById('ke2-value');
const pe1Value = document.getElementById('pe1-value');
const pe2Value = document.getElementById('pe2-value');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- Configuration ---
const G = 0.5;
const star1 = { mass: 20, radius: 20, color: '#ff8c00' };
const star2 = { mass: 10, radius: 10, color: '#4682b4' };
let distanceBetweenStars = distanceSlider.value;
let centerOfMass = { x: 0, y: 0 };

const orbitPath1 = [];
const orbitPath2 = [];
let animationFrame = 0;

// --- Physics Simulation Step (for pre-calculation) ---
function updatePhysics(s1, s2) {
    const dx = s2.x - s1.x;
    const dy = s2.y - s1.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);

    if (dist < s1.radius + s2.radius) return;

    const force = (G * s1.mass * s2.mass) / distSq;
    const forceX = (force * dx) / dist;
    const forceY = (force * dy) / dist;

    s1.vx += forceX / s1.mass;
    s1.vy += forceY / s1.mass;
    s2.vx -= forceX / s2.mass;
    s2.vy -= forceY / s2.mass;

    s1.x += s1.vx;
    s1.y += s1.vy;
    s2.x += s2.vx;
    s2.y += s2.vy;
}

// --- (Re)set and Pre-calculate Orbits ---
function resetAndCalculateOrbits() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const r = distanceBetweenStars;

    const totalMass = star1.mass + star2.mass;
    centerOfMass = { x: centerX, y: centerY };

    const r1 = (r * star2.mass) / totalMass;
    const r2 = (r * star1.mass) / totalMass;

    // Update display for individual orbital radii
    r1Value.textContent = r1.toFixed(2);
    r2Value.textContent = r2.toFixed(2);

    let tempStar1 = { ...star1, x: centerX - r1, y: centerY, vx: 0, vy: 0 };
    let tempStar2 = { ...star2, x: centerX + r2, y: centerY, vx: 0, vy: 0 };

    const v1 = Math.sqrt((G * star2.mass * star2.mass) / (totalMass * r));
    const v2 = Math.sqrt((G * star1.mass * star1.mass) / (totalMass * r));

    tempStar1.vy = -v1;
    tempStar2.vy = v2;

    orbitPath1.length = 0;
    orbitPath2.length = 0;

    const orbitalPeriod = Math.ceil(2 * Math.PI * Math.sqrt(Math.pow(r, 3) / (G * totalMass)));

    for (let i = 0; i < orbitalPeriod; i++) {
        updatePhysics(tempStar1, tempStar2);
        orbitPath1.push({ x: tempStar1.x, y: tempStar1.y, vx: tempStar1.vx, vy: tempStar1.vy });
        orbitPath2.push({ x: tempStar2.x, y: tempStar2.y, vx: tempStar2.vx, vy: tempStar2.vy });
    }
    animationFrame = 0;

    // Update initial slider values in properties panel
    mass1Value.textContent = star1.mass;
    mass2Value.textContent = star2.mass;
    distanceValue.textContent = distanceBetweenStars;
}

// --- Drawing ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawOrbit(orbitPath1, 'rgba(255, 140, 0, 0.5)');
    drawOrbit(orbitPath2, 'rgba(70, 130, 180, 0.5)');

    ctx.beginPath();
    ctx.arc(centerOfMass.x, centerOfMass.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();

    const pos1 = orbitPath1[animationFrame];
    const pos2 = orbitPath2[animationFrame];

    if (pos1) {
        drawStar(star1, pos1.x, pos1.y);
        const v1 = Math.sqrt(pos1.vx * pos1.vx + pos1.vy * pos1.vy);
        const ke1 = 0.5 * star1.mass * v1 * v1;
        const pe = -G * star1.mass * star2.mass / distanceBetweenStars; // System PE

        v1Value.textContent = v1.toFixed(2);
        ke1Value.textContent = ke1.toFixed(2);
        pe1Value.textContent = pe.toFixed(2);
    }
    if (pos2) {
        drawStar(star2, pos2.x, pos2.y);
        const v2 = Math.sqrt(pos2.vx * pos2.vx + pos2.vy * pos2.vy);
        const ke2 = 0.5 * star2.mass * v2 * v2;
        const pe = -G * star1.mass * star2.mass / distanceBetweenStars; // System PE

        v2Value.textContent = v2.toFixed(2);
        ke2Value.textContent = ke2.toFixed(2);
        pe2Value.textContent = pe.toFixed(2);
    }
}

function drawStar(star, x, y) {
    ctx.beginPath();
    ctx.arc(x, y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = star.color;
    ctx.fill();
}

function drawOrbit(path, color) {
    ctx.beginPath();
    if (path.length < 2) return;
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
}

// --- Event Listeners ---
mass1Slider.addEventListener('input', (e) => {
    star1.mass = parseInt(e.target.value, 10);
    mass1Label.querySelector('span').textContent = e.target.value;
    resetAndCalculateOrbits();
});

mass2Slider.addEventListener('input', (e) => {
    star2.mass = parseInt(e.target.value, 10);
    mass2Label.querySelector('span').textContent = e.target.value;
    resetAndCalculateOrbits();
});

distanceSlider.addEventListener('input', (e) => {
    distanceBetweenStars = parseInt(e.target.value, 10);
    distanceLabel.querySelector('span').textContent = e.target.value;
    resetAndCalculateOrbits();
});

// --- Main Loop ---
function animate() {
    if (orbitPath1.length > 0) {
        animationFrame = (animationFrame + 4) % orbitPath1.length;
    }
    draw();
    requestAnimationFrame(animate);
}

// --- Start ---
resetAndCalculateOrbits();
animate();
