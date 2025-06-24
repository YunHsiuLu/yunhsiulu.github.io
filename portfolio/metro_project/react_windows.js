// react_windows.js
import { redLineStations } from './metroLines/red/red-line.js';
import { blueLineStations } from './metroLines/blue/blue-line.js';

const interactivePoints = [
  ...redLineStations,
  ...blueLineStations
];

const THRESHOLD = 20;
const HIDE_DELAY = 300; // 延遲隱藏時間（ms）

const img = document.getElementById('mrt-map');
const windowRoot = document.getElementById('react-window-root');
let currentPopup = null;
let hideTimer = null;
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
  // 如果已經有視窗，先取消延遲隱藏
  clearTimeout(hideTimer);
  // 如果已經有視窗，且不是同一個點，先隱藏
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
  }
  currentPopup.innerHTML = `
    <h3>${info.title || label}</h3>
    <p>${info.description || '無資訊'}</p>
  `;
  currentPopup.style.left = (x + 20) + 'px';
  currentPopup.style.top = (y + 20) + 'px';
  currentPopup.style.display = 'block';
  currentPoint = label;
  // 當滑鼠移到視窗上時，取消延遲隱藏
  currentPopup.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  // 當滑鼠離開視窗時，延遲隱藏
  currentPopup.addEventListener('mouseleave', () => {
    hideTimer = setTimeout(hideReactWindow, HIDE_DELAY);
  });
}

function hideReactWindow() {
  if (currentPopup) {
    currentPopup.style.display = 'none';
    currentPoint = null;
  }
}

img.addEventListener('mousemove', function(event) {
  const rect = img.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  let found = false;
  for (const pt of interactivePoints) {
    const dx = pt.x - mouseX;
    const dy = pt.y - mouseY;
    if (Math.sqrt(dx*dx + dy*dy) < THRESHOLD) {
      createReactWindow(pt.x, pt.y, pt.label, pt.c);
      found = true;
      break;
    }
  }
  if (!found && currentPopup) {
    // 如果不在任何點上，且沒有滑鼠在視窗上，才延遲隱藏
    if (!currentPopup.matches(':hover')) {
      hideTimer = setTimeout(hideReactWindow, HIDE_DELAY);
    }
  }
});

img.addEventListener('mouseleave', () => {
  if (currentPopup && !currentPopup.matches(':hover')) {
    hideTimer = setTimeout(hideReactWindow, HIDE_DELAY);
  }
});

