import * as THREE from "three";

const canvas = document.getElementById("cube-canvas");
const lastMoveEl = document.getElementById("last-move");
const moveCountEl = document.getElementById("move-count");
const cubeStatusEl = document.getElementById("cube-status");
const scrambleButton = document.getElementById("scramble-button");
const resetButton = document.getElementById("reset-button");
const recordButton = document.getElementById("record-button");
const recordButtonLabel = document.getElementById("record-button-label");
const recordingStatusEl = document.getElementById("recording-status");
const shortcutForm = document.getElementById("shortcut-form");
const shortcutKeyInput = document.getElementById("shortcut-key");
const shortcutNameInput = document.getElementById("shortcut-name");
const recordedSequenceEl = document.getElementById("recorded-sequence");
const cancelShortcutButton = document.getElementById("cancel-shortcut-button");
const shortcutList = document.getElementById("shortcut-list");

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
camera.position.set(0, 0, 8.6);
camera.lookAt(0, 0, 0);

const world = new THREE.Group();
scene.add(world);

const cubeRoot = new THREE.Group();
world.add(cubeRoot);

const ambient = new THREE.HemisphereLight(0xffffff, 0x222833, 2.4);
scene.add(ambient);

const key = new THREE.DirectionalLight(0xffffff, 2.6);
key.position.set(4, 7, 6);
scene.add(key);

const fill = new THREE.DirectionalLight(0x7cc7ff, 1.2);
fill.position.set(-5, 2, -4);
scene.add(fill);

const cubies = [];
const moveQueue = [];
const spacing = 1.08;
const turnDuration = 170;
const quarterTurn = Math.PI / 2;
let activeTurn = null;
let moveCount = 0;
let isScrambling = false;
let isRecording = false;
let recordedMoves = [];
let pendingRecording = [];
let shortcuts = {};

const shortcutStorageKey = "rubiksCubeShortcutsV1";

const targetViewQuaternion = new THREE.Quaternion();
const viewTurnQuaternion = new THREE.Quaternion();
const inverseViewQuaternion = new THREE.Quaternion();

const stickerColors = {
  x1: 0xe03832,
  x_1: 0xff8a1d,
  y1: 0xfff4df,
  y_1: 0xf4d13d,
  z1: 0x29a354,
  z_1: 0x2978df,
};

const faceSpecs = [
  { key: "x1", normal: [1, 0, 0], rotation: [0, Math.PI / 2, 0], coord: "x", value: 1 },
  { key: "x_1", normal: [-1, 0, 0], rotation: [0, -Math.PI / 2, 0], coord: "x", value: -1 },
  { key: "y1", normal: [0, 1, 0], rotation: [-Math.PI / 2, 0, 0], coord: "y", value: 1 },
  { key: "y_1", normal: [0, -1, 0], rotation: [Math.PI / 2, 0, 0], coord: "y", value: -1 },
  { key: "z1", normal: [0, 0, 1], rotation: [0, 0, 0], coord: "z", value: 1 },
  { key: "z_1", normal: [0, 0, -1], rotation: [0, Math.PI, 0], coord: "z", value: -1 },
];

const moveFaces = {
  R: new THREE.Vector3(1, 0, 0),
  L: new THREE.Vector3(-1, 0, 0),
  U: new THREE.Vector3(0, 1, 0),
  D: new THREE.Vector3(0, -1, 0),
  F: new THREE.Vector3(0, 0, 1),
  B: new THREE.Vector3(0, 0, -1),
  M: new THREE.Vector3(1, 0, 0),
};

const faceAxes = {
  R: "x",
  L: "x",
  M: "x",
  U: "y",
  D: "y",
  F: "z",
  B: "z",
};

const keyboardMoves = new Map([
  ["j", "R'"],
  ["k", "R"],
  ["f", "L"],
  ["d", "L'"],
  ["h", "F"],
  ["g", "F'"],
  ["u", "U"],
  ["r", "U'"],
  ["x", "D"],
  [".", "D'"],
  [",", "B"],
  ["c", "B'"],
  [" ", "M"],
  ["o", "M'"],
]);

const wideKeyboardMoves = new Map([
  ["j", "r'"],
  ["k", "r"],
  ["f", "l"],
  ["d", "l'"],
  ["h", "f"],
  ["g", "f'"],
  ["u", "u"],
  ["r", "u'"],
  ["x", "d"],
  [".", "d'"],
  [",", "b"],
  ["c", "b'"],
]);

const reusableVector = new THREE.Vector3();
const reusableQuaternion = new THREE.Quaternion();

function buildCube() {
  cubies.length = 0;
  cubeRoot.clear();

  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0x111216,
    roughness: 0.62,
    metalness: 0.12,
  });

  const coreGeometry = new THREE.BoxGeometry(0.98, 0.98, 0.98);
  const stickerGeometry = new THREE.PlaneGeometry(0.74, 0.74);

  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      for (let z = -1; z <= 1; z += 1) {
        const cubie = new THREE.Group();
        cubie.userData.coord = { x, y, z };
        cubie.userData.stickers = [];
        cubie.position.set(x * spacing, y * spacing, z * spacing);

        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        cubie.add(core);

        for (const spec of faceSpecs) {
          if ({ x, y, z }[spec.coord] !== spec.value) continue;

          const sticker = new THREE.Mesh(
            stickerGeometry,
            new THREE.MeshStandardMaterial({
              color: stickerColors[spec.key],
              roughness: 0.45,
              metalness: 0,
              side: THREE.DoubleSide,
            }),
          );
          sticker.position.set(
            spec.normal[0] * 0.501,
            spec.normal[1] * 0.501,
            spec.normal[2] * 0.501,
          );
          sticker.rotation.set(spec.rotation[0], spec.rotation[1], spec.rotation[2]);
          cubie.add(sticker);
          cubie.userData.stickers.push({
            color: spec.key,
            normal: new THREE.Vector3(...spec.normal),
          });
        }

        cubeRoot.add(cubie);
        cubies.push(cubie);
      }
    }
  }

  moveCount = 0;
  activeTurn = null;
  moveQueue.length = 0;
  delete canvas.dataset.lastResolvedMove;
  targetViewQuaternion.identity();
  world.quaternion.identity();
  updateStatus("等待按鍵");
  updateSolvedStatus(true);
}

function enqueueMove(notation, silent = false) {
  const base = notation[0];
  const face = base.toUpperCase();
  const screenNormal = moveFaces[face];
  if (!screenNormal) return;

  inverseViewQuaternion.copy(targetViewQuaternion).invert();
  reusableVector.copy(screenNormal).applyQuaternion(inverseViewQuaternion);
  reusableVector.set(
    Math.round(reusableVector.x),
    Math.round(reusableVector.y),
    Math.round(reusableVector.z),
  );

  const axis =
    Math.abs(reusableVector.x) === 1
      ? "x"
      : Math.abs(reusableVector.y) === 1
        ? "y"
        : "z";
  const layer = reusableVector[axis];
  const layers =
    face === "M" ? [0] : base === base.toLowerCase() ? [0, layer] : [layer];

  const inverse = notation.endsWith("'");
  const resolvedMove = {
    notation,
    axis,
    layers,
    angle: (inverse ? 1 : -1) * layer * quarterTurn,
    silent,
  };
  moveQueue.push(resolvedMove);
  canvas.dataset.lastResolvedMove = JSON.stringify({
    axis,
    layers,
    angle: resolvedMove.angle,
  });
}

function startNextTurn(now) {
  if (activeTurn || moveQueue.length === 0) return;

  const queued = moveQueue.shift();
  const axisVector = axisToVector(queued.axis);
  const selected = cubies.filter((cubie) =>
    queued.layers.includes(cubie.userData.coord[queued.axis]),
  );

  activeTurn = {
    ...queued,
    axisVector,
    selected: selected.map((cubie) => ({
      cubie,
      position: cubie.position.clone(),
      quaternion: cubie.quaternion.clone(),
    })),
    startedAt: now,
  };

  updateStatus(queued.notation, queued.silent);
  updateSolvedStatus(false);
}

function updateActiveTurn(now) {
  if (!activeTurn) return;

  const progress = Math.min((now - activeTurn.startedAt) / turnDuration, 1);
  const eased = 1 - Math.pow(1 - progress, 3);
  const angle = activeTurn.angle * eased;

  reusableQuaternion.setFromAxisAngle(activeTurn.axisVector, angle);

  for (const item of activeTurn.selected) {
    item.cubie.position.copy(item.position).applyAxisAngle(activeTurn.axisVector, angle);
    item.cubie.quaternion.copy(item.quaternion).premultiply(reusableQuaternion);
  }

  if (progress >= 1) finishTurn();
}

function finishTurn() {
  const { axisVector, angle, selected } = activeTurn;
  reusableQuaternion.setFromAxisAngle(axisVector, angle);

  for (const item of selected) {
    const coord = item.cubie.userData.coord;
    reusableVector
      .set(coord.x, coord.y, coord.z)
      .applyAxisAngle(axisVector, angle);

    coord.x = Math.round(reusableVector.x);
    coord.y = Math.round(reusableVector.y);
    coord.z = Math.round(reusableVector.z);

    item.cubie.position.set(coord.x * spacing, coord.y * spacing, coord.z * spacing);
    item.cubie.quaternion.copy(item.quaternion).premultiply(reusableQuaternion).normalize();
  }

  activeTurn = null;
  updateSolvedStatus();
}

function axisToVector(axis) {
  if (axis === "x") return new THREE.Vector3(1, 0, 0);
  if (axis === "y") return new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3(0, 0, 1);
}

function updateStatus(text, silent = false) {
  lastMoveEl.textContent = text;
  if (!silent && moveFaces[text[0]?.toUpperCase()]) {
    moveCount += 1;
  }
  moveCountEl.textContent = String(moveCount);
}

function startRecording() {
  if (isScrambling || activeTurn || moveQueue.length > 0) {
    recordingStatusEl.textContent = "請等待轉動完成";
    return;
  }

  isRecording = true;
  recordedMoves = [];
  pendingRecording = [];
  shortcutForm.hidden = true;
  recordButton.classList.add("is-recording");
  recordButton.setAttribute("aria-pressed", "true");
  recordButtonLabel.textContent = "結束錄製";
  recordingStatusEl.textContent = "錄製中：0 步";
  scrambleButton.disabled = true;
  resetButton.disabled = true;
}

function stopRecording() {
  isRecording = false;
  recordButton.classList.remove("is-recording");
  recordButton.setAttribute("aria-pressed", "false");
  recordButtonLabel.textContent = "開始錄製";
  scrambleButton.disabled = false;
  resetButton.disabled = false;

  if (recordedMoves.length === 0) {
    recordingStatusEl.textContent = "沒有錄製任何步驟";
    shortcutForm.hidden = true;
    return;
  }

  pendingRecording = [...recordedMoves];
  const availableSlot = findAvailableShortcutSlot();
  shortcutKeyInput.value = availableSlot;
  shortcutNameInput.value = shortcuts[availableSlot]?.name ?? "";
  recordedSequenceEl.textContent = `${pendingRecording.length} 步：${pendingRecording.join(" ")}`;
  recordingStatusEl.textContent = `錄製完成，共 ${pendingRecording.length} 步`;
  shortcutForm.hidden = false;
  shortcutNameInput.focus();
}

function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

function recordMove(notation) {
  if (!isRecording) return;
  recordedMoves.push(notation);
  recordingStatusEl.textContent = `錄製中：${recordedMoves.length} 步`;
}

function saveShortcut(event) {
  event.preventDefault();
  if (pendingRecording.length === 0) return;

  const digit = shortcutKeyInput.value;
  const name = shortcutNameInput.value.trim() || `快捷鍵 ${digit}`;
  shortcuts[digit] = { name, moves: [...pendingRecording] };

  if (!persistShortcuts()) return;

  pendingRecording = [];
  shortcutForm.hidden = true;
  shortcutNameInput.blur();
  recordingStatusEl.textContent = `已儲存：${digit} ${name}`;
  renderShortcuts();
}

function cancelShortcut() {
  pendingRecording = [];
  shortcutForm.hidden = true;
  shortcutNameInput.blur();
  recordingStatusEl.textContent = "已取消儲存";
}

function playShortcut(digit) {
  if (isRecording || !shortcuts[digit]) return;

  const shortcut = shortcuts[digit];
  for (const move of shortcut.moves) enqueueMove(move);
  recordingStatusEl.textContent = `執行 ${digit}：${shortcut.name}（${shortcut.moves.length} 步）`;
}

function deleteShortcut(digit) {
  if (!shortcuts[digit]) return;
  const name = shortcuts[digit].name;
  delete shortcuts[digit];
  if (!persistShortcuts()) return;
  recordingStatusEl.textContent = `已刪除：${digit} ${name}`;
  renderShortcuts();
}

function findAvailableShortcutSlot() {
  for (let digit = 0; digit <= 9; digit += 1) {
    if (!shortcuts[String(digit)]) return String(digit);
  }
  return "0";
}

function loadShortcuts() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(shortcutStorageKey) ?? "{}");
    const validShortcuts = {};

    for (let digit = 0; digit <= 9; digit += 1) {
      const key = String(digit);
      const shortcut = saved[key];
      if (
        typeof shortcut?.name === "string" &&
        Array.isArray(shortcut.moves) &&
        shortcut.moves.length > 0 &&
        shortcut.moves.every((move) => moveFaces[move[0]?.toUpperCase()])
      ) {
        validShortcuts[key] = {
          name: shortcut.name.slice(0, 20),
          moves: [...shortcut.moves],
        };
      }
    }

    return validShortcuts;
  } catch {
    return {};
  }
}

function persistShortcuts() {
  try {
    window.localStorage.setItem(shortcutStorageKey, JSON.stringify(shortcuts));
    return true;
  } catch {
    recordingStatusEl.textContent = "無法儲存快捷鍵";
    return false;
  }
}

function renderShortcuts() {
  shortcutList.replaceChildren();
  const configuredDigits = Object.keys(shortcuts).sort();

  if (configuredDigits.length === 0) {
    const empty = document.createElement("p");
    empty.className = "shortcut-empty";
    empty.textContent = "尚未設定快捷鍵";
    shortcutList.append(empty);
    return;
  }

  for (const digit of configuredDigits) {
    const shortcut = shortcuts[digit];
    const item = document.createElement("div");
    item.className = "shortcut-item";

    const runButton = document.createElement("button");
    runButton.type = "button";
    runButton.className = "shortcut-run";
    runButton.dataset.shortcut = digit;

    const keycap = document.createElement("kbd");
    keycap.textContent = digit;

    const details = document.createElement("span");
    details.className = "shortcut-details";
    const name = document.createElement("strong");
    name.textContent = shortcut.name;
    const moves = document.createElement("small");
    moves.textContent = shortcut.moves.join(" ");
    details.append(name, moves);
    runButton.append(keycap, details);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "shortcut-delete";
    deleteButton.dataset.deleteShortcut = digit;
    deleteButton.setAttribute("aria-label", `刪除快捷鍵 ${digit}`);
    deleteButton.textContent = "×";

    item.append(runButton, deleteButton);
    shortcutList.append(item);
  }
}

function updateSolvedStatus(solved = isCubeSolved()) {
  cubeStatusEl.textContent = solved ? "完成" : "未完成";
  cubeStatusEl.classList.toggle("is-solved", solved);
  cubeStatusEl.classList.toggle("is-unsolved", !solved);
}

function isCubeSolved() {
  const faces = new Map(faceSpecs.map((spec) => [spec.key, { count: 0, colors: new Set() }]));

  for (const cubie of cubies) {
    for (const sticker of cubie.userData.stickers) {
      reusableVector.copy(sticker.normal).applyQuaternion(cubie.quaternion);
      const faceKey = normalToFaceKey(reusableVector);
      if (!faceKey) return false;

      const face = faces.get(faceKey);
      face.count += 1;
      face.colors.add(sticker.color);
    }
  }

  return [...faces.values()].every((face) => face.count === 9 && face.colors.size === 1);
}

function normalToFaceKey(normal) {
  const x = Math.round(normal.x);
  const y = Math.round(normal.y);
  const z = Math.round(normal.z);

  if (x === 1) return "x1";
  if (x === -1) return "x_1";
  if (y === 1) return "y1";
  if (y === -1) return "y_1";
  if (z === 1) return "z1";
  if (z === -1) return "z_1";
  return null;
}

function resizeRenderer() {
  const { clientWidth, clientHeight } = canvas;
  if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / Math.max(clientHeight, 1);
    camera.updateProjectionMatrix();
  }
}

function render(now = 0) {
  resizeRenderer();
  startNextTurn(now);
  updateActiveTurn(now);

  world.quaternion.slerp(targetViewQuaternion, 0.18);
  if (world.quaternion.angleTo(targetViewQuaternion) < 0.001) {
    world.quaternion.copy(targetViewQuaternion);
  }

  renderer.render(scene, camera);
  window.__rubiksDebug = {
    targetViewQuaternion: targetViewQuaternion.toArray(),
    actualViewQuaternion: world.quaternion.toArray(),
    queuedMoves: moveQueue.length,
    activeTurn: Boolean(activeTurn),
  };
  requestAnimationFrame(render);
}

function handleViewKey(key) {
  const turns = {
    ArrowLeft: { axis: new THREE.Vector3(0, 1, 0), angle: -quarterTurn },
    ArrowRight: { axis: new THREE.Vector3(0, 1, 0), angle: quarterTurn },
    ArrowUp: { axis: new THREE.Vector3(1, 0, 0), angle: -quarterTurn },
    ArrowDown: { axis: new THREE.Vector3(1, 0, 0), angle: quarterTurn },
  };
  const turn = turns[key];
  if (!turn) return false;

  viewTurnQuaternion.setFromAxisAngle(turn.axis, turn.angle);
  targetViewQuaternion.premultiply(viewTurnQuaternion).normalize();
  return true;
}

function scramble() {
  if (isScrambling) return;
  isScrambling = true;

  const choices = ["R", "L", "U", "D", "F", "B", "M"];
  let previousAxis = "";
  for (let i = 0; i < 24; i += 1) {
    let move = choices[Math.floor(Math.random() * choices.length)];
    while (faceAxes[move] === previousAxis) {
      move = choices[Math.floor(Math.random() * choices.length)];
    }
    previousAxis = faceAxes[move];
    enqueueMove(Math.random() > 0.5 ? `${move}'` : move, true);
  }

  const timer = window.setInterval(() => {
    if (!activeTurn && moveQueue.length === 0) {
      window.clearInterval(timer);
      isScrambling = false;
      updateStatus("scrambled", true);
    }
  }, 80);
}

window.addEventListener("keydown", (event) => {
  const activeTag = document.activeElement?.tagName;
  if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") {
    if (event.key === "Escape") cancelShortcut();
    return;
  }

  if (activeTag === "BUTTON" && (event.key === " " || event.key === "Enter")) return;

  const key = normalizeKeyboardEvent(event);

  if (!isRecording && /^[0-9]$/.test(key) && shortcuts[key]) {
    event.preventDefault();
    playShortcut(key);
    return;
  }

  if (handleViewKey(key)) {
    event.preventDefault();
    return;
  }

  const moveMap = event.shiftKey && wideKeyboardMoves.has(key) ? wideKeyboardMoves : keyboardMoves;

  if (moveMap.has(key)) {
    event.preventDefault();
    const notation = moveMap.get(key);
    enqueueMove(notation);
    recordMove(notation);
  }
});

function normalizeKeyboardEvent(event) {
  if (event.code === "Space") return " ";
  if (event.code === "Comma") return ",";
  if (event.code === "Period") return ".";
  if (event.key.length === 1) return event.key.toLowerCase();
  return event.key;
}

scrambleButton.addEventListener("click", scramble);
resetButton.addEventListener("click", buildCube);
recordButton.addEventListener("click", toggleRecording);
shortcutForm.addEventListener("submit", saveShortcut);
cancelShortcutButton.addEventListener("click", cancelShortcut);
shortcutList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-shortcut]");
  if (deleteButton) {
    deleteShortcut(deleteButton.dataset.deleteShortcut);
    return;
  }

  const runButton = event.target.closest("[data-shortcut]");
  if (runButton) playShortcut(runButton.dataset.shortcut);
});

shortcuts = loadShortcuts();
renderShortcuts();
buildCube();
requestAnimationFrame(render);
