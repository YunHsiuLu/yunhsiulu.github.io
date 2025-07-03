const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');

const energyGraphCanvas = document.getElementById('energyGraphCanvas');
const energyGraphCtx = energyGraphCanvas.getContext('2d');

const starMassSlider = document.getElementById('starMass');
const planetMassSlider = document.getElementById('planetMass');
const orbitRadiusSlider = document.getElementById('orbitRadius');
const initialVelocityMagnitudeSlider = document.getElementById('initialVelocityMagnitude');
const initialVelocityAngleSlider = document.getElementById('initialVelocityAngle');
const resetButton = document.getElementById('resetButton');
const pauseButton = document.getElementById('pauseButton');

const starMassValueSpan = document.getElementById('starMassValue');
const planetMassValueSpan = document.getElementById('planetMassValue');
const orbitRadiusValueSpan = document.getElementById('orbitRadiusValue');
const initialVelocityMagnitudeValueSpan = document.getElementById('initialVelocityMagnitudeValue');
const initialVelocityAngleValueSpan = document.getElementById('initialVelocityAngleValue');

const kineticEnergySpan = document.getElementById('kineticEnergy');
const potentialEnergySpan = document.getElementById('potentialEnergy');
const totalEnergySpan = document.getElementById('totalEnergy');

// Constants
const G = 6.67430e-11; // Gravitational constant (m^3 kg^-1 s^-2)
const SCALE_DISTANCE = 1e9; // 1 unit in canvas = 1e9 meters (1,000,000 km) - Zoomed in
const SCALE_MASS = 1e24; // 1 unit in slider = 1e24 kg
const TIME_STEP = 3600 * 24; // 1 day in seconds

const Y_AXIS_PADDING_PERCENTAGE = 0.1; // 10% padding for y-axis limits

let star = {};
let planet = {};
let animationFrameId;
let planetPath = []; // To store trajectory points

let kineticEnergyData = [];
let potentialEnergyData = [];
const MAX_GRAPH_POINTS = 200; // Limit the number of points on the graph

let resetTimeoutId = null; // To store the timeout ID for resetting
let isPaused = false; // Track pause state

function initializeSimulation() {
    // Clear any pending reset timeouts
    if (resetTimeoutId) {
        clearTimeout(resetTimeoutId);
        resetTimeoutId = null;
    }

    const starMass = parseFloat(starMassSlider.value) * SCALE_MASS;
    const planetMass = parseFloat(planetMassSlider.value) * SCALE_MASS;
    const orbitRadius = parseFloat(orbitRadiusSlider.value) * 1e9; // Convert km to meters
    const initialVelocityMagnitude = parseFloat(initialVelocityMagnitudeSlider.value) * 1000; // km/s to m/s
    const initialVelocityAngleDegrees = parseFloat(initialVelocityAngleSlider.value);
    const initialVelocityAngleRadians = initialVelocityAngleDegrees * Math.PI / 180;

    star = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        mass: starMass,
        radius: 10 // Visual radius
    };

    // Initial position of the planet (relative to star)
    const planetInitialX = star.x + orbitRadius / SCALE_DISTANCE;
    const planetInitialY = star.y;

    // Calculate initial velocity components based on magnitude and angle
    const initialVx = (initialVelocityMagnitude / SCALE_DISTANCE) * Math.cos(initialVelocityAngleRadians);
    const initialVy = (initialVelocityMagnitude / SCALE_DISTANCE) * Math.sin(initialVelocityAngleRadians);

    planet = {
        x: planetInitialX,
        y: planetInitialY,
        mass: planetMass,
        radius: 5, // Visual radius
        vx: initialVx,
        vy: initialVy
    };

    planetPath = []; // Clear path on re-initialization
    planetPath.push({ x: planet.x, y: planet.y }); // Add initial position

    kineticEnergyData = [];
    potentialEnergyData = [];

    updateEnergyDisplay();
    draw();
    drawEnergyGraph(); // Call the combined graph function
    isPaused = false; // Ensure simulation starts unpaused
    pauseButton.textContent = 'Pause Simulation';
    startAnimation();
}

function calculateForce(body1, body2) {
    const dx = (body2.x - body1.x) * SCALE_DISTANCE;
    const dy = (body2.y - body1.y) * SCALE_DISTANCE;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return { fx: 0, fy: 0 };

    const forceMagnitude = (G * body1.mass * body2.mass) / (distance * distance);
    const angle = Math.atan2(dy, dx);

    const fx = forceMagnitude * Math.cos(angle);
    const fy = forceMagnitude * Math.sin(angle);

    return { fx, fy };
}

function updatePosition() {
    // Calculate force on planet due to star
    const { fx, fy } = calculateForce(star, planet);

    // Calculate acceleration of planet
    const ax = -fx / planet.mass; // Negative because force is attractive
    const ay = -fy / planet.mass;

    // Update velocity (Euler integration)
    planet.vx += ax * TIME_STEP / SCALE_DISTANCE;
    planet.vy += ay * TIME_STEP / SCALE_DISTANCE;

    // Update position
    planet.x += planet.vx * TIME_STEP;
    planet.y += planet.vy * TIME_STEP;

    // Add current position to path
    planetPath.push({ x: planet.x, y: planet.y });

    // Check if planet is out of bounds
    if (planet.x < 0 || planet.x > canvas.width || planet.y < 0 || planet.y > canvas.height) {
        stopAnimation();
        if (!resetTimeoutId) { // Prevent multiple timeouts
            resetTimeoutId = setTimeout(() => {
                initializeSimulation();
            }, 2000); // Reset after 2 seconds
        }
    }
}

function calculateEnergy() {
    // Kinetic Energy: 0.5 * m * v^2
    const actualVx = planet.vx * SCALE_DISTANCE;
    const actualVy = planet.vy * SCALE_DISTANCE;
    const kineticEnergy = 0.5 * planet.mass * (actualVx * actualVx + actualVy * actualVy);

    // Potential Energy: -G * M1 * M2 / r
    const dx = (star.x - planet.x) * SCALE_DISTANCE;
    const dy = (star.y - planet.y) * SCALE_DISTANCE;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const potentialEnergy = -G * star.mass * planet.mass / distance;

    const totalEnergy = kineticEnergy + potentialEnergy;

    return { kineticEnergy, potentialEnergy, totalEnergy };
}

function calculateEccentricity() {
    const { totalEnergy } = calculateEnergy();

    // Position vector from star to planet (in meters)
    const rx = (planet.x - star.x) * SCALE_DISTANCE;
    const ry = (planet.y - star.y) * SCALE_DISTANCE;

    // Velocity vector of planet (in m/s)
    const actualVx = planet.vx * SCALE_DISTANCE;
    const actualVy = planet.vy * SCALE_DISTANCE;

    // Specific angular momentum (h = r x v, in 2D: rx*vy - ry*vx)
    const h = (rx * actualVy) - (ry * actualVx);

    // Specific orbital energy (epsilon = E / m_planet)
    const epsilon = totalEnergy / planet.mass;

    // Eccentricity formula: e = sqrt(1 + (2 * epsilon * h^2) / (G^2 * M_star^2))
    // This formula is for a central force problem where the central body is fixed.
    const term = (2 * epsilon * h * h) / (G * G * star.mass * star.mass);
    const eccentricity = Math.sqrt(1 + term);

    return eccentricity;
}

function updateEnergyDisplay() {
    const { kineticEnergy, potentialEnergy, totalEnergy } = calculateEnergy();
    kineticEnergySpan.textContent = kineticEnergy.toExponential(2);
    potentialEnergySpan.textContent = potentialEnergy.toExponential(2);
    totalEnergySpan.textContent = totalEnergy.toExponential(2);

    kineticEnergyData.push(kineticEnergy);
    potentialEnergyData.push(potentialEnergy);

    if (kineticEnergyData.length > MAX_GRAPH_POINTS) {
        kineticEnergyData.shift(); // Remove oldest data point
        potentialEnergyData.shift();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Trajectory
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; // Semi-transparent white
    ctx.lineWidth = 1;
    if (planetPath.length > 1) {
        ctx.moveTo(planetPath[0].x, planetPath[0].y);
        for (let i = 1; i < planetPath.length; i++) {
            ctx.lineTo(planetPath[i].x, planetPath[i].y);
        }
    }
    ctx.stroke();
    ctx.closePath();

    // Draw Star
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'yellow';
    ctx.fill();
    ctx.closePath();

    // Draw Planet
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'blue';
    ctx.fill();
    ctx.closePath();

    // Display Eccentricity
    const eccentricity = calculateEccentricity();
    ctx.fillStyle = 'white'; // Clear font color
    ctx.font = '18px Arial'; // Clear font size
    ctx.fillText(`Eccentricity: ${eccentricity.toFixed(4)}`, star.x + star.radius + 20, star.y);
}

function drawEnergyGraph() {
    energyGraphCtx.clearRect(0, 0, energyGraphCanvas.width, energyGraphCanvas.height);

    if (kineticEnergyData.length === 0) return;

    // Combine data to find overall min/max for consistent scaling
    const allEnergyData = [...kineticEnergyData, ...potentialEnergyData];
    let minValue = Math.min(...allEnergyData);
    let maxValue = Math.max(...allEnergyData);

    // Apply padding to widen the y-axis limits
    const padding = (maxValue - minValue) * Y_AXIS_PADDING_PERCENTAGE;
    minValue -= padding;
    maxValue += padding;

    const range = (maxValue === minValue) ? 1 : (maxValue - minValue);

    // Draw y-axis (zero line if applicable)
    const zeroY = energyGraphCanvas.height - ((0 - minValue) / range) * energyGraphCanvas.height;
    if (zeroY > 0 && zeroY < energyGraphCanvas.height) {
        energyGraphCtx.beginPath();
        energyGraphCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        energyGraphCtx.moveTo(0, zeroY);
        energyGraphCtx.lineTo(energyGraphCanvas.width, zeroY);
        energyGraphCtx.stroke();
    }

    // Draw Kinetic Energy
    energyGraphCtx.beginPath();
    energyGraphCtx.strokeStyle = 'orange';
    energyGraphCtx.lineWidth = 2;
    energyGraphCtx.moveTo(0, energyGraphCanvas.height - ((kineticEnergyData[0] - minValue) / range) * energyGraphCanvas.height);
    for (let i = 1; i < kineticEnergyData.length; i++) {
        const x = (i / (MAX_GRAPH_POINTS - 1)) * energyGraphCanvas.width;
        const y = energyGraphCanvas.height - ((kineticEnergyData[i] - minValue) / range) * energyGraphCanvas.height;
        energyGraphCtx.lineTo(x, y);
    }
    energyGraphCtx.stroke();
    // Label for Kinetic Energy
    if (kineticEnergyData.length > 0) {
        const lastX = energyGraphCanvas.width;
        const lastY = energyGraphCanvas.height - ((kineticEnergyData[kineticEnergyData.length - 1] - minValue) / range) * energyGraphCanvas.height;
        energyGraphCtx.fillStyle = 'orange';
        energyGraphCtx.font = '12px Arial';
        energyGraphCtx.fillText('Kinetic Energy', lastX - 90, lastY - 5);
    }

    // Draw Potential Energy
    energyGraphCtx.beginPath();
    energyGraphCtx.strokeStyle = 'purple';
    energyGraphCtx.lineWidth = 2;
    energyGraphCtx.moveTo(0, energyGraphCanvas.height - ((potentialEnergyData[0] - minValue) / range) * energyGraphCanvas.height);
    for (let i = 1; i < potentialEnergyData.length; i++) {
        const x = (i / (MAX_GRAPH_POINTS - 1)) * energyGraphCanvas.width;
        const y = energyGraphCanvas.height - ((potentialEnergyData[i] - minValue) / range) * energyGraphCanvas.height;
        energyGraphCtx.lineTo(x, y);
    }
    energyGraphCtx.stroke();
    // Label for Potential Energy
    if (potentialEnergyData.length > 0) {
        const lastX = energyGraphCanvas.width;
        const lastY = energyGraphCanvas.height - ((potentialEnergyData[potentialEnergyData.length - 1] - minValue) / range) * energyGraphCanvas.height;
        energyGraphCtx.fillStyle = 'purple';
        energyGraphCtx.font = '12px Arial';
        energyGraphCtx.fillText('Potential Energy', lastX - 90, lastY + 15);
    }
}

function animate() {
    if (!isPaused) {
        updatePosition();
        updateEnergyDisplay();
        draw();
        drawEnergyGraph(); // Draw the combined graph in each animation frame
    }
    animationFrameId = requestAnimationFrame(animate);
}

function startAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    animationFrameId = requestAnimationFrame(animate);
}

function stopAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        pauseButton.textContent = 'Resume Simulation';
        stopAnimation();
    } else {
        pauseButton.textContent = 'Pause Simulation';
        startAnimation();
    }
}

// Event Listeners
starMassSlider.addEventListener('input', () => {
    starMassValueSpan.textContent = starMassSlider.value;
    stopAnimation();
    initializeSimulation();
});

planetMassSlider.addEventListener('input', () => {
    planetMassValueSpan.textContent = planetMassSlider.value;
    stopAnimation();
    initializeSimulation();
});

orbitRadiusSlider.addEventListener('input', () => {
    orbitRadiusValueSpan.textContent = orbitRadiusSlider.value;
    stopAnimation();
    initializeSimulation();
});

initialVelocityMagnitudeSlider.addEventListener('input', () => {
    initialVelocityMagnitudeValueSpan.textContent = initialVelocityMagnitudeSlider.value;
    stopAnimation();
    initializeSimulation();
});

initialVelocityAngleSlider.addEventListener('input', () => {
    initialVelocityAngleValueSpan.textContent = initialVelocityAngleSlider.value;
    stopAnimation();
    initializeSimulation();
});

resetButton.addEventListener('click', () => {
    stopAnimation();
    initializeSimulation();
});

pauseButton.addEventListener('click', togglePause);

// Initial setup
initializeSimulation();