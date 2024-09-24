const canvas = document.getElementById('lissajousCanvas');
const ctx = canvas.getContext('2d');

const width = canvas.width;
const height = canvas.height;

// Initialize default values
let freqX = Number(document.getElementById('freqX').value);
let freqY = Number(document.getElementById('freqY').value);
let phaseShift = 0; // Start with phase shift at 0

const dt = 0.02; // Time increment
let time = 0; // Time variable for animation
const phaseSpeed = 5 / (2*Math.PI); // Speed of the phase shift change
let userIsAdjusting = false; // Flag to check if user is adjusting the phase slider

const phaseSlider = document.getElementById('phaseSlider'); // Slider element
const phaseValueDisplay = document.getElementById('phaseValue'); // Value display element

// Function to automatically update phase shift between [0, π]
function updatePhaseShift() {
    // Only automatically update the phase shift if the user is not adjusting it
    if (!userIsAdjusting) {
        // Cycle the phase shift between 0 and π
        phaseShift = (time * phaseSpeed) % (2*Math.PI);

        // Update the slider and the value display
        phaseSlider.value = phaseShift.toFixed(2);
        phaseValueDisplay.textContent = phaseShift.toFixed(2);
    }
}

// Function to draw the Lissajous curve and the moving points
function drawLissajous(t) {
    ctx.clearRect(0, 0, width, height); // Clear canvas before each frame

    // Draw the Lissajous curve
    ctx.beginPath();
    for (let i = 0; i < 1000; i++) {
        let x = width / 2 + 200 * Math.sin(freqX * t + phaseShift);
        let y = height / 2 + 200 * Math.sin(freqY * t);

        ctx.lineTo(x, y);
        t += dt; // Increment time for each point
    }

    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Calculate the current positions of the moving points
    let xPos = width / 2 + 200 * Math.sin(freqX * time + phaseShift);
    let yPos = height / 2 + 200 * Math.sin(freqY * time);

    // Draw the moving point along the x-axis at the bottom of the canvas
    ctx.beginPath();
    ctx.arc(xPos, height - 10, 5, 0, 2 * Math.PI); // Circle at the bottom
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.stroke();

    // Draw the moving point along the y-axis at the left of the canvas
    ctx.beginPath();
    ctx.arc(10, yPos, 5, 0, 2 * Math.PI); // Circle at the left
    ctx.fillStyle = 'green';
    ctx.fill();
    ctx.stroke();
}

// Function to animate the curve continuously
function animate() {
    time += dt; // Increment the global time for animation
    updatePhaseShift(); // Update phase shift automatically
    drawLissajous(time); // Call draw function with updated time
    requestAnimationFrame(animate); // Call the animate function continuously
}

// Update parameters and restart the animation when inputs change
document.getElementById('freqX').addEventListener('input', (e) => {
    freqX = Number(e.target.value);
});

document.getElementById('freqY').addEventListener('input', (e) => {
    freqY = Number(e.target.value);
});

// Listen for changes to the slider to allow user input
phaseSlider.addEventListener('input', (e) => {
    userIsAdjusting = true; // Detect that the user is adjusting the slider
    phaseShift = Number(e.target.value); // Manually set phase shift to slider value
    phaseValueDisplay.textContent = phaseShift.toFixed(2); // Update displayed value
    time = phaseShift / phaseSpeed;
    console.log('User is adjusting the slider...');
});

// Reset the flag when the user releases the slider
phaseSlider.addEventListener('change', () => {
    userIsAdjusting = false; // Detect that the user has finished adjusting the slider
    console.log('User finished adjusting the slider.');
});


animate();
