(() => {
  // UI 
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const collisionsEl = document.getElementById("collisions");
  const piEl = document.getElementById("pi");
  const digitsInput = document.getElementById("digits");
  const resetBtn = document.getElementById("resetBtn");
  const toggleBtn = document.getElementById("toggleBtn");

  // 物理與動畫狀態
  let m1, m2;
  let x1, v1; // 小方塊 (質量1)
  let x2, v2; // 大方塊 (質量100^N)
  let w1, w2; // 寬度
  
  let count = 0;
  let isRunning = false;
  let animationId = null;
  
  // 幾何參數
  const wallX = 50;
  const floorY = 250;

  // 初始化
  function init() {
    if (animationId) cancelAnimationFrame(animationId);
    
    const N = parseInt(digitsInput.value) || 0;
    // 限制 N 避免瀏覽器崩潰 (最大建議 7)
    const clampedN = Math.max(0, Math.min(7, N));
    if (clampedN !== N) digitsInput.value = clampedN;

    count = 0;
    m1 = 1;
    m2 = Math.pow(100, clampedN);

    // 初始位置與速度
    w1 = 30;
    // 根據 N 調整大方塊視覺大小（不影響物理判定）
    w2 = clampedN === 0 ? 50 : Math.min(200, 50 + clampedN * 20);

    x1 = 200;
    v1 = 0;

    x2 = 500; // 初始距離
    v2 = -2 / Math.pow(2, clampedN); // 稍微調整初始速度讓動畫節奏適中
    if (clampedN === 0) v2 = -2;     // N=0 時速度快一點才不用等
    
    isRunning = true;
    toggleBtn.textContent = "暫停";
    toggleBtn.classList.remove("paused");
    
    updateUI();
    loop();
  }

  // 物理核心：處理單次碰撞與移動
  // 回傳 false 代表已經結束（無法追上）
  function stepPhysics() {
    if (v1 >= 0 && v2 >= 0 && v1 <= v2) {
      return false; // 結束條件：兩者都向右且小方塊比大方塊慢（永遠追不上）
    }

    // 計算下一次事件時間
    // 事件 A: 小方塊撞牆 (v1 < 0 時發生)
    let tWall = Infinity;
    if (v1 < 0) {
      tWall = (x1 - wallX) / -v1;
    }

    // 事件 B: 方塊互撞 (v1 > v2 時發生，即小方塊向右追大方塊，或兩者迎面)
    let tCollide = Infinity;
    if (v1 > v2) {
      tCollide = (x2 - (x1 + w1)) / (v1 - v2);
    }

    // 找出最近的事件
    let dt = Math.min(tWall, tCollide);
    
    // 如果時間無限大，或已經沒有碰撞趨勢
    if (!isFinite(dt)) return false;

    // 1. 移動物體到碰撞瞬間
    x1 += v1 * dt;
    x2 += v2 * dt;

    // 2. 處理碰撞
    if (tWall < tCollide) {
      // 撞牆：完全彈性碰撞 (mWall -> 無限大)
      x1 = wallX; // 強制校正位置，防止誤差
      v1 *= -1;
      count++;
    } else {
      // 方塊互撞：一維彈性碰撞公式
      x1 = x2 - w1; // 強制校正位置：小方塊緊貼大方塊左側
      
      const v1_old = v1;
      const v2_old = v2;
      
      // 彈性碰撞公式
      // v1_new = ((m1 - m2)*v1 + 2*m2*v2) / (m1 + m2)
      // v2_new = ((m2 - m1)*v2 + 2*m1*v1) / (m1 + m2)
      
      const sumM = m1 + m2;
      v1 = ((m1 - m2) * v1_old + 2 * m2 * v2_old) / sumM;
      v2 = ((m2 - m1) * v2_old + 2 * m1 * v1_old) / sumM;
      
      count++;
    }
    
    return true;
  }

  // 動畫迴圈
  function loop() {
    if (!isRunning) return;

    const N = parseInt(digitsInput.value);
    
    // 關鍵優化：根據 N 決定每一幀要跑多少次物理運算
    // 這樣才能在 N 很大時看起來順暢，不用等待
    let stepsPerFrame = 1;
    if (N === 0) stepsPerFrame = 1;
    else if (N === 1) stepsPerFrame = 10;
    else if (N === 2) stepsPerFrame = 100;
    else if (N === 3) stepsPerFrame = 2000;
    else if (N === 4) stepsPerFrame = 30000;
    else if (N === 5) stepsPerFrame = 500000;
    else stepsPerFrame = 2000000; // N >= 6 全速運算

    for (let i = 0; i < stepsPerFrame; i++) {
      const active = stepPhysics();
      if (!active) {
        isRunning = false;
        toggleBtn.textContent = "完成";
        break;
      }
    }
    
    render();
    updateUI();

    if (isRunning) {
      animationId = requestAnimationFrame(loop);
    }
  }

  function updateUI() {
    collisionsEl.textContent = count.toLocaleString("en-US");
    const N = parseInt(digitsInput.value);
    // 顯示估算出的 Pi (除以 10^N)
    const piValue = count / Math.pow(10, N);
    // 為了美觀，如果是整數就不顯示小數點
    if (N === 0) piEl.textContent = piValue;
    else piEl.textContent = piValue.toFixed(N);
  }

  function render() {
    // 清空畫布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 繪製背景元素
    ctx.fillStyle = "#1a1a1a"; // 地板顏色
    ctx.fillRect(0, floorY, canvas.width, 5);
    
    // 繪製牆壁
    ctx.fillStyle = "#555";
    ctx.fillRect(0, 0, wallX, floorY);
    
    // 繪製標尺線 (裝飾用)
    ctx.strokeStyle = "#333";
    ctx.beginPath();
    for(let i=wallX; i<canvas.width; i+=50) {
      ctx.moveTo(i, floorY);
      ctx.lineTo(i, floorY + 10);
    }
    ctx.stroke();

    // --- 繪製小方塊 ---
    ctx.fillStyle = "#4dabf7"; // 亮藍色
    ctx.fillRect(x1, floorY - w1, w1, w1);
    // 邊框
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(x1, floorY - w1, w1, w1);
    // 文字
    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("1kg", x1 + w1/2, floorY - w1 - 10);

    // --- 繪製大方塊 ---
    ctx.fillStyle = "#ff6b6b"; // 亮紅色
    ctx.fillRect(x2, floorY - w2, w2, w2);
    // 邊框
    ctx.strokeRect(x2, floorY - w2, w2, w2);
    // 文字
    ctx.fillStyle = "white";
    ctx.fillText(`100^${digitsInput.value} kg`, x2 + w2/2, floorY - w2 - 10);
  }

  // 事件監聽
  resetBtn.addEventListener("click", init);
  
  toggleBtn.addEventListener("click", () => {
    if (toggleBtn.textContent === "完成") {
      init(); // 如果已完成，點擊則重置
      return;
    }

    if (isRunning) {
      isRunning = false;
      cancelAnimationFrame(animationId);
      toggleBtn.textContent = "繼續";
      toggleBtn.classList.add("paused");
    } else {
      isRunning = true;
      toggleBtn.classList.remove("paused");
      toggleBtn.textContent = "暫停";
      loop();
    }
  });

  digitsInput.addEventListener("change", init);

  // 啟動
  init();
})();
