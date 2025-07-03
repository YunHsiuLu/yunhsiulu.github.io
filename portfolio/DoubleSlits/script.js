document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('simulation-canvas');
    const ctx = canvas.getContext('2d');

    const wavelengthSlider = document.getElementById('wavelength');
    const slitSeparationSlider = document.getElementById('slit-separation');
    const slitWidthSlider = document.getElementById('slit-width');
    const screenDistanceSlider = document.getElementById('screen-distance');

    const wavelengthValue = document.getElementById('wavelength-value');
    const slitSeparationValue = document.getElementById('slit-separation-value');
    const slitWidthValue = document.getElementById('slit-width-value');
    const screenDistanceValue = document.getElementById('screen-distance-value');
    
    const sliders = [
        { slider: wavelengthSlider, display: wavelengthValue, unit: 'nm' },
        { slider: slitSeparationSlider, display: slitSeparationValue, unit: 'μm' },
        { slider: slitWidthSlider, display: slitWidthValue, unit: 'μm' },
        { slider: screenDistanceSlider, display: screenDistanceValue, unit: 'm' }
    ];

    sliders.forEach(({ slider, display, unit }) => {
        slider.addEventListener('input', () => {
            let value = parseFloat(slider.value);
            if (unit === 'm') {
                display.textContent = `${(value / 100).toFixed(2)} ${unit}`;
            } else {
                display.textContent = `${value.toFixed(slider.step.includes('.') ? 1 : 0)} ${unit}`;
            }
            drawSimulation();
            drawExperimentalModel();
        });
    });
    var color;
    function drawSimulation() {
        const width = 1600;
        const height = 300;
        canvas.width = width;
        canvas.height = height;

        const lambda = parseFloat(wavelengthSlider.value) * 1e-9; // m
        const d = parseFloat(slitSeparationSlider.value) * 1e-6; // m
        const a = parseFloat(slitWidthSlider.value) * 1e-6; // m
        const L = parseFloat(screenDistanceSlider.value) * 1e-2; // m

        const screenWidth = 0.4; // 40 cm wide screen simulation
        
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < width; i++) {
            const y = (i - width / 2) * (screenWidth / width);
            const theta = Math.atan(y / L);
            
            // Interference term
            const beta = (Math.PI * d * Math.sin(theta)) / lambda;
            const interference = Math.cos(beta) * Math.cos(beta);

            // Diffraction term
            const alpha = (Math.PI * a * Math.sin(theta)) / lambda;
            const diffraction = alpha === 0 ? 1 : Math.pow(Math.sin(alpha) / alpha, 2);

            const intensity = interference * diffraction;
            
            color = wavelengthToRgb(parseFloat(wavelengthSlider.value));

            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, height);
            ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity})`;
            ctx.stroke();
        }
    }

    function wavelengthToRgb(wavelength) {
        let r, g, b;
        if (wavelength >= 380 && wavelength <= 440) {
            r = -(wavelength - 440) / (440 - 380);
            g = 0.0;
            b = 1.0;
        } else if (wavelength >= 440 && wavelength <= 490) {
            r = 0.0;
            g = (wavelength - 440) / (490 - 440);
            b = 1.0;
        } else if (wavelength >= 490 && wavelength <= 510) {
            r = 0.0;
            g = 1.0;
            b = -(wavelength - 510) / (510 - 490);
        } else if (wavelength >= 510 && wavelength <= 580) {
            r = (wavelength - 510) / (580 - 510);
            g = 1.0;
            b = 0.0;
        } else if (wavelength >= 580 && wavelength <= 645) {
            r = 1.0;
            g = -(wavelength - 645) / (645 - 580);
            b = 0.0;
        } else if (wavelength >= 645 && wavelength <= 750) {
            r = 1.0;
            g = 0.0;
            b = 0.0;
        } else {
            r = 0.0;
            g = 0.0;
            b = 0.0;
        }

        // Intensity factor adjustment
        let factor;
        if (wavelength >= 380 && wavelength <= 420) {
            factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
        } else if (wavelength >= 420 && wavelength <= 645) {
            factor = 1.0;
        } else if (wavelength >= 645 && wavelength <= 750) {
            factor = 0.3 + 0.7 * (750 - wavelength) / (750 - 645);
        } else {
            factor = 0.0;
        }

        return {
            r: Math.round(255 * r * factor),
            g: Math.round(255 * g * factor),
            b: Math.round(255 * b * factor)
        };
    }

    function drawExperimentalModel() {
        const modelCanvas = document.getElementById('model-canvas');
        const modelCtx = modelCanvas.getContext('2d');
        const width = 1600;
        const height = 300;
        modelCanvas.width = width;
        modelCanvas.height = height;

        const slitSeparation = parseFloat(document.getElementById('slit-separation').value);
        const slitWidth = parseFloat(document.getElementById('slit-width').value);
        const screenDistance = parseFloat(document.getElementById('screen-distance').value)

        modelCtx.clearRect(0, 0, width, height);

        // Define proportions for drawing
        const screenX = width - 50;
        const barrierX = (screenX-width/1.2)*(2-screenDistance/100) + width/2;

        // Draw light source
        modelCtx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        modelCtx.beginPath();
        modelCtx.arc(50, height / 2, 20, 0, 2 * Math.PI);
        modelCtx.fill();

        // Draw barrier
        modelCtx.fillStyle = '#607d8b';
        modelCtx.fillRect(barrierX - 10, 0, 20, height);

        // Draw slits
        const slitY1 = height / 2 - (slitSeparation / 2) * (height / 200);
        const slitY2 = height / 2 + (slitSeparation / 2) * (height / 200);
        const slitPixelWidth = Math.max(2, slitWidth * (height / 400));

        modelCtx.clearRect(barrierX - 10, slitY1 - slitPixelWidth / 2, 20, slitPixelWidth);
        modelCtx.clearRect(barrierX - 10, slitY2 - slitPixelWidth / 2, 20, slitPixelWidth);

        // Draw screen
        modelCtx.strokeStyle = '#37474f';
        modelCtx.lineWidth = 2;
        modelCtx.beginPath();
        modelCtx.moveTo(screenX, 0);
        modelCtx.lineTo(screenX, height);
        modelCtx.stroke();

        // Draw lines representing light paths
        modelCtx.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        modelCtx.lineWidth = 8;

        // From source to slits
        modelCtx.beginPath();
        modelCtx.moveTo(65, height / 2);
        modelCtx.lineTo(barrierX - 10, slitY1);
        modelCtx.moveTo(65, height / 2);
        modelCtx.lineTo(barrierX - 10, slitY2);
        modelCtx.stroke();

                
        // Add labels
        modelCtx.fillStyle = '#000';
        modelCtx.font = '40px Arial';
        modelCtx.textAlign = 'center';
        modelCtx.fillText('Light Source', width/12, height / 2 + 100);
        modelCtx.fillText('Barrier', barrierX - 100, height/5);
        modelCtx.fillText('Screen', width*11/12, height/5);

    }

    // Initial draw
    drawSimulation();
    drawExperimentalModel();
});
