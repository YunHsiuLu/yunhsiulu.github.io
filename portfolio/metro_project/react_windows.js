// react_windows.js
import { redLineStations } from './metroLines/red/red-line.js';
import { blueLineStations } from './metroLines/blue/blue-line.js';
import { orangeLineStations } from './metroLines/orange/orange-line.js';

const interactivePoints = [
  ...redLineStations,
  ...blueLineStations,
  ...orangeLineStations
];

const THRESHOLD = 20;
const img = document.getElementById('mrt-map');
const windowRoot = document.getElementById('react-window-root');
let currentPopup = null;
let currentPoint = null;

async function loadStationInfo(label, color) {
  try {
    const module = await import(`./metroLines/${color}/${label}.js`);
    return module.default || module;
  } catch (e) {
    console.error(`無法載入 ${label}.js:`, e);
    return { title: label, description: `找不到 ${label} 的資訊` };
  }
}

async function createReactWindow(x, y, label, color) {
  // 若已經有視窗且不是同一個點，先隱藏
  if (currentPopup && currentPoint !== label) {
    currentPopup.style.display = 'none';
  }
  // 載入資訊
  const info = await loadStationInfo(label, color);
  // 建立或更新視窗
  if (!currentPopup) {
    currentPopup = document.createElement('div');
    currentPopup.id = 'react-popup';
    currentPopup.style.position = 'absolute';
    currentPopup.style.background = '#fff';
    currentPopup.style.border = '1px solid #888';
    currentPopup.style.padding = '12px';
    currentPopup.style.borderRadius = '8px';
    currentPopup.style.boxShadow = '2px 2px 8px #aaa';
    currentPopup.style.zIndex = '10';
    windowRoot.appendChild(currentPopup);

    // 點擊視窗本身時，不會關閉
    currentPopup.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
  currentPopup.innerHTML = `
    <h3>${info.title || label}</h3>
    <p>${info.description || '無資訊'}</p>
  `;
  currentPopup.style.left = (x + 20) + 'px';
  currentPopup.style.top = (y + 20) + 'px';
  currentPopup.style.display = 'block';
  currentPoint = label;
}

function hideReactWindow() {
  if (currentPopup) {
    currentPopup.style.display = 'none';
    currentPoint = null;
  }
}

// 點擊圖片時，檢查是否在任何一個站點附近
img.addEventListener('click', function(event) {
  const rect = img.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;

  let found = false;
  for (const pt of interactivePoints) {
    const dx = pt.x - clickX;
    const dy = pt.y - clickY;
    if (Math.sqrt(dx*dx + dy*dy) < THRESHOLD) {
      createReactWindow(pt.x, pt.y, pt.label, pt.c);
      found = true;
      break;
    }
  }
  if (!found) hideReactWindow();
});

// 點擊文件其他地方時，隱藏視窗（但點擊視窗本身不會觸發）
document.addEventListener('click', function(event) {
  if (
    currentPopup &&
    !currentPopup.contains(event.target) &&
    !img.contains(event.target)
  ) {
    hideReactWindow();
  }
});

