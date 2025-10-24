// script.js
(() => {
  // UI
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const collisionsEl = document.getElementById("collisions");
  const piEl = document.getElementById("pi");
  const digitsInput = document.getElementById("digits");
  const speedSlider = document.getElementById("speed");
  const speedVal = document.getElementById("speedVal");
  const resetBtn = document.getElementById("resetBtn");
  const toggleBtn = document.getElementById("toggleBtn");
  const stepBtn = document.getElementById("stepBtn");

  // Simulation state
  let small, big;
  let collisions = 0;
  let running = true;
  let animationId = null;
  let lastTimestamp = null;
  const BASE_FPS = 60;
  const BASE_DT = 1 / BASE_FPS;
  let speedMultiplier = parseFloat(speedSlider.value);

  // visual params
  const floorY = canvas.height - 30;
  const leftWallX = 20;

  // Initialize / Reset
  function initSimulation() {
    cancelAnimationFrame(animationId);
    collisions = 0;
    updateUI();

    // clamp N
    let N = Math.max(0, Math.min(6, Math.floor(Number(digitsInput.value) || 0)));
    digitsInput.value = N;

    // masses
    const m_small = 1;
    const m_big = Math.pow(100, N); // 100^N

    // geometry (pixels)
    small = {
      size: 40,
      x: leftWallX + 30,   // left edge
      y: floorY - 40,
      mass: m_small,
      v: 0
    };

    big = {
      size: 120,
      x: leftWallX + 420,  // left edge
      y: floorY - 120,
      mass: m_big,
      v: -60 // px / s (to the left). change with speed multiplier
    };

    lastTimestamp = null;
    running = true;
    toggleBtn.textContent = "暫停";
    requestAnimationFrame(loop);
  }

  // Update UI display
  function updateUI() {
    collisionsEl.textContent = collisions.toLocaleString();
    const N = Math.max(0, Math.min(6, Math.floor(Number(digitsInput.value) || 0)));
    const piEstimate = collisions / Math.pow(10, N);
    // show with some precision
    piEl.textContent = piEstimate.toFixed(Math.max(0, Math.min(12, N + 3)));
    speedVal.textContent = speedMultiplier.toFixed(1) + "×";
  }

  // Physics: event-driven handling within dt (seconds)
  function simulateStep(dt) {
    // safety clamp
    const MAX_ITERS = 200;
    let dtRemain = dt;
    const EPS = 1e-9;

    // fix small initial penetration issues
    if (small.x < leftWallX) {
      small.x = leftWallX;
    }
    if (small.x + small.size > big.x) {
      small.x = big.x - small.size;
    }

    // iterate over events during dt
    for (let iter = 0; iter < MAX_ITERS && dtRemain > 1e-12; iter++) {
      // times until events (seconds), default Infinity = no event
      let tWall = Infinity;
      if (small.v < 0) {
        // want time when small.x + small.v * t = leftWallX
        tWall = (leftWallX - small.x) / small.v;
        if (tWall < EPS) tWall = Infinity; // ignore immediate/negative small times
      }

      let relV = small.v - big.v;
      let gap = big.x - (small.x + small.size); // >0 when separated
      let tBlock = Infinity;
      if (relV > 0) { // approaching
        tBlock = gap / relV;
        if (tBlock < EPS) tBlock = Infinity;
      }

      // choose earliest event within dtRemain
      let tMin = Math.min(tWall, tBlock);

      if (!isFinite(tMin) || tMin > dtRemain) {
        // no event in dtRemain -> advance both by dtRemain
        small.x += small.v * dtRemain;
        big.x += big.v * dtRemain;
        dtRemain = 0;
        break;
      }

      // advance to event time tMin
      small.x += small.v * tMin;
      big.x += big.v * tMin;

      // handle event
      if (tMin === tWall) {
        // small hits wall
        // clamp and invert velocity (elastic)
        small.x = leftWallX;
        small.v = -small.v;
        collisions++;
        updateUI();
      } else if (tMin === tBlock) {
        // block-block collision: compute elastic 1D outcome
        // ensure exact contact
        small.x = big.x - small.size;

        const m1 = small.mass, m2 = big.mass;
        const u1 = small.v, u2 = big.v;

        const v1 = ((m1 - m2) * u1 + 2 * m2 * u2) / (m1 + m2);
        const v2 = ((m2 - m1) * u2 + 2 * m1 * u1) / (m1 + m2);

        small.v = v1;
        big.v = v2;

        collisions++;
        updateUI();
      }

      dtRemain -= tMin;
    }

    // final safety clamps (prevent tiny penetrations)
    if (small.x < leftWallX) small.x = leftWallX;
    if (small.x + small.size > big.x) small.x = big.x - small.size;
  }

  // Draw
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // floor and wall
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // floor line
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, floorY + 0.5);
    ctx.lineTo(canvas.width, floorY + 0.5);
    ctx.stroke();

    // left wall
    ctx.fillStyle = "#111";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(leftWallX - 2, floorY + 0.5);
    ctx.lineTo(leftWallX - 2, 10);
    ctx.stroke();

    // big block (grey)
    ctx.fillStyle = "#5a5a5a";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.fillRect(Math.round(big.x), big.y, big.size, big.size);
    ctx.strokeRect(Math.round(big.x) + 1, big.y + 1, big.size - 2, big.size - 2);

    // small block (bright)
    ctx.fillStyle = "#e7e7e7";
    ctx.fillRect(Math.round(small.x), small.y, small.size, small.size);
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(small.x) + 0.5, small.y + 0.5, small.size - 1, small.size - 1);

    // labels
    ctx.fillStyle = "#fff";
    ctx.font = "16px serif";
    ctx.fillText("1 kg", Math.round(small.x) , small.y - 8);

    ctx.fillStyle = "#fff";
    ctx.font = "18px serif";
    const N = Math.max(0, Math.min(6, Math.floor(Number(digitsInput.value) || 0)));
    ctx.fillText(`${Number(big.mass).toLocaleString()} kg`, Math.round(big.x), big.y - 8);
  }

  // animation loop
  function loop(timestamp) {
    if (!running) {
      lastTimestamp = null;
      return;
    }
    if (!lastTimestamp) lastTimestamp = timestamp;
    // compute elapsed (ms)
    let elapsedMs = timestamp - lastTimestamp;
    // clamp large dt to avoid jumps (e.g., when tab was hidden)
    if (elapsedMs > 200) elapsedMs = 200;
    lastTimestamp = timestamp;

    // convert to seconds; apply speed multiplier
    const dt = (elapsedMs / 1000) * speedMultiplier;

    simulateStep(dt);
    draw();

    animationId = requestAnimationFrame(loop);
  }

  // UI events
  resetBtn.addEventListener("click", () => initSimulation());
  toggleBtn.addEventListener("click", () => {
    running = !running;
    if (running) {
      toggleBtn.textContent = "暫停";
      lastTimestamp = null;
      requestAnimationFrame(loop);
    } else {
      toggleBtn.textContent = "繼續";
      cancelAnimationFrame(animationId);
    }
  });
  stepBtn.addEventListener("click", () => {
    // run a single logical step = 1/60s * speedMultiplier (but do not start continuous loop)
    const dt = BASE_DT * speedMultiplier;
    simulateStep(dt);
    draw();
  });

  speedSlider.addEventListener("input", (e) => {
    speedMultiplier = Number(e.target.value);
    speedVal.textContent = speedMultiplier.toFixed(1) + "×";
    updateUI();
  });

  // digits change resets
  digitsInput.addEventListener("change", () => {
    initSimulation();
  });

  // start
  initSimulation();

  // expose for debugging (optional)
  window._sim = { getState: () => ({ small, big, collisions }) };
})();

