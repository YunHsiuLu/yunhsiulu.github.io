const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const n1Input = document.getElementById('n1');
const n2Input = document.getElementById('n2');

let draggingBlue = false;
let bluePoint = { x: 100, y: 100 };
let redPoint = { x: 300, y: 250 };
let greenPoint = { x: 0, y: 0 };

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if the click is inside the blue point
    if (Math.hypot(mouseX - bluePoint.x, mouseY - bluePoint.y) < 10) {
        draggingBlue = true;
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (draggingBlue) {
        const rect = canvas.getBoundingClientRect();
        bluePoint.x = e.clientX - rect.left;
        bluePoint.y = e.clientY - rect.top;
        draw();  // Redraw everything when dragging
    }
});

canvas.addEventListener('mouseup', () => {
    draggingBlue = false;
});

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const x2 = canvas.width / 2;  // Interface point (x-coord)
    const y2 = canvas.height / 2;  // Interface point (y-coord)
    
    let n1 = parseFloat(n1Input.value);
    let n2 = parseFloat(n2Input.value);
    if (bluePoint.y > y2) {
        n1 = parseFloat(n2Input.value);
        n2 = parseFloat(n1Input.value);
        console.log("below the water!")
    }

    // Draw the boundary (interface between two media)
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.strokeStyle = 'black';
    ctx.stroke();

    // Draw the incident ray from bluePoint to the interface
    ctx.beginPath();
    ctx.moveTo(bluePoint.x, bluePoint.y);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'blue';
    ctx.stroke();

    // Calculate the angle of incidence (relative to the normal)
    const incidentAngle = Math.atan2(Math.abs(x2 - bluePoint.x), Math.abs(y2 - bluePoint.y));
    
    // Apply Snell's law to calculate the refracted angle
    const refractedAngle = Math.asin((n1 / n2) * Math.sin(incidentAngle));

    // Calculate the refracted ray's ending y-coordinate based on the new angle
    let y3 = 0; // Depth
    let x3 = 0;
    let y4 = 0;
    let x4 = 0;
    let isGreen = 1;
    let isRed = 1;

    if (Math.round(bluePoint.y) == y2) isRed = 0;

    if ((Math.abs(Math.sin(incidentAngle) - 1 / n1) <= 0.01) && (n1 > n2)) {
        isGreen = 0;
        x3 = canvas.width;
        y3 = y2;
    }
    else if (Math.sin(incidentAngle) > 1 / n1 && n1 > n2) {
        isGreen = 0;
        x3 = 2*x2 - bluePoint.x;
        y3 = bluePoint.y;
    }
    else {
        if (bluePoint.y < y2) {
            y3 = canvas.height * 3 / 4;
            x3 = x2 + Math.pow(-1, (bluePoint.x > x2)) * (y3 - y2) * Math.tan(refractedAngle);

            y4 = y2 + (y3 - y2) * n1 / n2;
            if (incidentAngle != 0) y4 = y2 + Math.pow(-1, (bluePoint.y > y2)) * (y3 - y2) * Math.tan(refractedAngle) / Math.tan(incidentAngle);
            x4 = x2 + Math.pow(-1, (bluePoint.x > x2)) * (y4 - y2) * Math.tan(incidentAngle);

        }
        else if (bluePoint.y > y2) {
            y3 = canvas.height * 3 / 7;
            x3 = x2 + Math.pow(-1, (bluePoint.x < x2)) * (y3 - y2) * Math.tan(refractedAngle);

            y4 = y2 + (y3 - y2) * n1 / n2;
            if (incidentAngle != 0) y4 = y2 + Math.pow(-1, (bluePoint.y < y2)) * (y3 - y2) * Math.tan(refractedAngle) / Math.tan(incidentAngle);
            x4 = x2 + Math.pow(-1, (bluePoint.x < x2)) * (y4 - y2) * Math.tan(incidentAngle);
        }
    }

    // Update red point position
    redPoint.x = x3;
    redPoint.y = y3;
    greenPoint.x = x4;
    greenPoint.y = y4;

    // Draw the refracted ray
    if (isRed) {
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(redPoint.x, redPoint.y);
        ctx.strokeStyle = 'red';
        ctx.stroke();
    }

    // Draw the apparent ray
    if (isGreen) {
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(x2, y2);
        ctx.lineTo(greenPoint.x, greenPoint.y);
        ctx.strokeStyle = 'green';
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Draw the draggable blue point
    ctx.beginPath();
    ctx.arc(bluePoint.x, bluePoint.y, 10, 0, 2 * Math.PI);
    ctx.fillStyle = 'blue';
    ctx.fill();

    // Draw the red point at the end of the refracted ray
    if (isRed) {
        ctx.beginPath();
        ctx.arc(redPoint.x, redPoint.y, 10, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
    }

    // Draw the green point at the end of the apparent ray
    if (isGreen) {
        ctx.beginPath();
        ctx.arc(greenPoint.x, greenPoint.y, 10, 0, 2 * Math.PI);
        ctx.fillStyle = 'green';
        ctx.fill();
    }
}

// Update the canvas whenever the refractive indices change
n1Input.addEventListener('input', draw);
n2Input.addEventListener('input', draw);

// Initial drawing
draw();

