// Initialize Canvas
const canvas = document.getElementById("simulationCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 600;
canvas.height = 300;

const particles = [];
const maxChartPoints = 30; // 限制圖表的資料點數量
const updateInterval = 10; // 每次碰撞更新一次圖表資料
const numParticlesInput = document.getElementById("numParticles");
const numParticlesValue = document.getElementById("numParticlesValue");
const frequencyInput = document.getElementById("frequency");
const frequencyValue = document.getElementById("frequencyValue");

let collisionTimes = 0;
let redRatioData = [];

// Initialize CanvasJS chart
let collisionChart = new CanvasJS.Chart("chartContainer", {
  animationEnabled: true,
  theme: "light2",
  title: {
    text: "分子碰撞次數 v.s. 紅色分子佔比",
  },
  axisX: {
    title: "Collision Times",
    interval: 10,
  },
  axisY: {
    title: "Red Molecule Ratio",
    includeZero: true,
    maximum: 1,
  },
  data: [
    {
      type: "line", // 使用折線圖
      markerType: "none", // 移除數據點標記
      dataPoints: [],
    },
  ],
});

collisionChart.render();

// Particle class
class Particle {
  constructor(x, y, radius, color, dx, dy, gene1, gene2) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.dx = dx;
    this.dy = dy;
    this.gene1 = gene1;
    this.gene2 = gene2;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
  }

  update() {
    this.x += this.dx;
    this.y += this.dy;

    // Check for collisions with walls
    if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) {
      this.dx = -this.dx;
      collisionTimes++;
      calculateRedRatio();
    }

    if (this.y - this.radius < 0 || this.y + this.radius > canvas.height) {
      this.dy = -this.dy;
      collisionTimes++;
      calculateRedRatio();
    }

    // Check for collisions with other particles
    for (let other of particles) {
      if (this === other) continue;
      console.log("before: ", this.color, other.color);
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.radius + other.radius) {
        // Swap velocities
        [this.dx, other.dx] = [other.dx, this.dx];
        [this.dy, other.dy] = [other.dy, this.dy];

        // Exchange genes
        let new1_gene1 = (Math.random() < 0.5) ? this.gene1 : this.gene2;
        let new1_gene2 = (Math.random() < 0.5) ? other.gene1 : other.gene2;
        let new2_gene1 = (Math.random() < 0.5) ? this.gene1 : this.gene2;
        let new2_gene2 = (Math.random() < 0.5) ? other.gene2 : other.gene2;

        this.gene1 = new1_gene1;
        this.gene2 = new2_gene1;
        other.gene1 = new1_gene2;
        other.gene2 = new2_gene2;
        this.color = (this.gene1 === "T" || this.gene2 === "T") ? "red" : "blue";
        other.color = (other.gene1 === "T" || other.gene2 === "T") ? "red" : "blue";
        
        console.log("after: ", this.color, other.color);
        collisionTimes++;
        calculateRedRatio();
      }
    }
  }
}

// Create particles
function createParticles() {
  particles.length = 0;
  const numParticles = parseInt(numParticlesInput.value);
  const tFrequency = parseFloat(frequencyInput.value);

  for (let i = 0; i < numParticles; i++) {
    const radius = 5;
    const x = Math.random() * (canvas.width - 2 * radius) + radius;
    const y = Math.random() * (canvas.height - 2 * radius) + radius;
    const dx = (Math.random() - 0.5) * 4;
    const dy = (Math.random() - 0.5) * 4;
    const gene1 = Math.random() < tFrequency ? "T" : "t";
    const gene2 = Math.random() < tFrequency ? "T" : "t";
    const color = (gene1 === "T" || gene2 === "T") ? "red" : "blue";
    particles.push(new Particle(x, y, radius, color, dx, dy, gene1, gene2));
  }

  collisionTimes = 0;
  redRatioData = [];
  collisionChart.options.data[0].dataPoints = [];
  collisionChart.render();
}

// Calculate and update red molecule ratio
function calculateRedRatio() {
  const redRatio = particles.filter((p) => p.color === "red").length / particles.length;
  if (collisionTimes % updateInterval === 0) {
    redRatioData.push({ x: collisionTimes, y: redRatio });
    while (redRatioData.length > maxChartPoints) {
      redRatioData.shift(); // 移除超出最大數量的資料點
    }

    collisionChart.options.data[0].dataPoints = redRatioData;
    collisionChart.render();
  }
}

// Animation loop
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach((particle) => {
    particle.update();
    particle.draw();
  });

  requestAnimationFrame(animate);
}

// Event listeners
numParticlesInput.addEventListener("input", () => {
  numParticlesValue.textContent = numParticlesInput.value;
  createParticles();
});
frequencyInput.addEventListener("input", () => {
  frequencyValue.textContent = frequencyInput.value;
  createParticles();
});

// Initialize
createParticles();
animate();

