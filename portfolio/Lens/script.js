function initializeSimulation() {
    // 初始化物體距離為最小值，顯示最短物距的結果
    updateSimulation();
}

function updateSimulation() {
    const slider = document.getElementById("distance-slider");
    const distanceValue = document.getElementById("distance-value");
    const object = document.getElementById("object");
    const image = document.getElementById("image");
    const scale = document.getElementById("scale");

    const u = parseFloat(slider.value); // 物距
    distanceValue.textContent = `${u.toFixed(2)} cm`;

    const f = -50; // 假設焦距為 -50 cm
    let v; // 成像距離

    // 當物體與透鏡的距離為 0 時，成像與物體重疊，距離為 0
    if (u === 0) {
        v = 0;
    } else {
        v = 1 / ((1 / f) - (1 / u)); // 計算成像距離
    }

    // 清除之前的刻度
    while (scale.firstChild) {
        scale.removeChild(scale.firstChild);
    }

    // 設置刻度，從透鏡邊緣開始，單位為公分
    const minDistance = 0;
    const maxDistance = 100; // 根據視窗範圍設置最大距離
    const numMarks = 5; // 刻度數量
    const step = maxDistance / numMarks; // 每個刻度的距離間隔

    for (let i = 0; i <= numMarks; i++) {
        const markDistance = minDistance + i * step;
        const xPosition = 200 - (markDistance * 2); // 刻度的位置，從透鏡左側開始
        
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", xPosition);
        line.setAttribute("y1", "145");
        line.setAttribute("x2", xPosition);
        line.setAttribute("y2", "155");
        line.setAttribute("stroke", "black");
        line.setAttribute("stroke-width", "2");

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", xPosition - 10);
        text.setAttribute("y", "170");
        text.setAttribute("font-size", "12");
        text.textContent = `${markDistance.toFixed(0)} cm`;

        scale.appendChild(line);
        scale.appendChild(text);
    }

    // 設定物體位置，物距最小值對應透鏡左側邊界
    const objectHeight = 100; // 物體的固定高度
    object.setAttribute("x1", 200 - (u * 2)); // X位置根據物體距離來變化
    object.setAttribute("x2", 200 - (u * 2));
    object.setAttribute("y1", 150);
    object.setAttribute("y2", 150 - objectHeight); // 高度不變

    // 當物體與透鏡距離為 0 cm 時，成像與物體重疊
    let imageXPosition = 200 + (v * 2); // 計算成像位置
    if (u === 0) {
        imageXPosition = 200; // 當物體距離為0時，成像位置與物體重疊
    }

    // 計算成像高度（與物距成反比），成像是正立虛像
    let imageHeight = objectHeight;
    if (u === 0) {
        // 當物體與透鏡在最小距離時，成像高度與物體相同
        imageHeight = objectHeight;
    } else {
        // 當物體與透鏡距離越遠，成像應越來越小
        imageHeight = objectHeight * Math.abs(v / u); // 根據成像距離公式計算成像高度變化
    }

    // 設定成像位置和高度，保持正立方向
    image.setAttribute("x1", imageXPosition); // 當物距為0時，成像位置與物體重疊
    image.setAttribute("x2", imageXPosition);
    image.setAttribute("y1", 150);
    image.setAttribute("y2", 150 - imageHeight); // 成像高度與物體高度成比例
}
