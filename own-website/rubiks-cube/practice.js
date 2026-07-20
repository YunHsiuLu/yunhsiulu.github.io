const formulaData = window.RUBIKS_ALGORITHMS;
const simulator = window.rubiksCubeSimulator;

const practiceCanvas = document.getElementById("cube-canvas");
const formulaList = document.getElementById("formula-list");
const formulaSearch = document.getElementById("formula-search");
const formulaCount = document.getElementById("formula-count");
const formulaTypeButtons = [...document.querySelectorAll("[data-formula-type]")];
const currentCaseType = document.getElementById("current-case-type");
const currentCaseName = document.getElementById("current-case-name");
const currentCaseGroup = document.getElementById("current-case-group");
const currentAlgorithm = document.getElementById("current-algorithm");
const practiceStatus = document.getElementById("practice-status");
const stageCaseType = document.getElementById("stage-case-type");
const stageCaseName = document.getElementById("stage-case-name");
const toggleFormulaButton = document.getElementById("toggle-formula-button");
const reloadCaseButton = document.getElementById("reload-case-button");
const randomCaseButton = document.getElementById("random-case-button");

let activeType = "OLL";
let activeCase = null;
let caseReady = false;
let caseStartedAt = 0;

function renderFormulaList() {
  const query = formulaSearch.value.trim().toLowerCase();
  const cases = formulaData[activeType].filter((item) =>
    `${item.id} ${item.group}`.toLowerCase().includes(query),
  );

  formulaList.replaceChildren();
  formulaCount.textContent = `${cases.length} 個 ${activeType} 公式`;

  if (cases.length === 0) {
    const empty = document.createElement("p");
    empty.className = "formula-empty";
    empty.textContent = "找不到符合的公式";
    formulaList.append(empty);
    return;
  }

  for (const item of cases) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "formula-item";
    button.dataset.caseId = item.id;
    button.setAttribute("aria-current", String(activeCase?.id === item.id && activeCase?.type === activeType));

    const id = document.createElement("span");
    id.className = "formula-id";
    id.textContent = item.id;

    const group = document.createElement("span");
    group.className = "formula-meta";
    group.textContent = item.group;

    button.append(id, group);
    formulaList.append(button);
  }
}

function setFormulaVisibility(visible) {
  currentAlgorithm.hidden = !visible;
  toggleFormulaButton.textContent = visible ? "隱藏公式" : "顯示公式";
  toggleFormulaButton.setAttribute("aria-pressed", String(visible));
}

function setPracticeStatus(text, state = "") {
  practiceStatus.textContent = text;
  practiceStatus.classList.toggle("is-complete", state === "complete");
  practiceStatus.classList.toggle("is-active", state === "active");
}

async function selectCase(item, type = activeType) {
  activeCase = { ...item, type };
  caseReady = false;
  currentCaseType.textContent = type;
  currentCaseName.textContent = item.id;
  currentCaseGroup.textContent = item.group;
  currentAlgorithm.textContent = item.algorithm;
  stageCaseType.textContent = type;
  stageCaseName.textContent = item.id;
  setFormulaVisibility(false);
  setPracticeStatus("建立題目中");
  renderFormulaList();

  const selectedId = item.id;
  const loaded = await simulator.loadCase(item.algorithm);
  if (!loaded || activeCase?.id !== selectedId || activeCase?.type !== type) return;

  caseReady = true;
  caseStartedAt = performance.now();
  setPracticeStatus("請開始作答", "active");
  practiceCanvas.focus({ preventScroll: true });
}

function switchFormulaType(type) {
  if (!formulaData[type]) return;
  activeType = type;
  formulaSearch.value = "";
  for (const button of formulaTypeButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.formulaType === type));
  }
  renderFormulaList();
}

function chooseRandomCase() {
  const cases = formulaData[activeType];
  const pool = cases.length > 1 ? cases.filter((item) => item.id !== activeCase?.id) : cases;
  selectCase(pool[Math.floor(Math.random() * pool.length)], activeType);
}

formulaList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-case-id]");
  if (!button) return;
  const item = formulaData[activeType].find((candidate) => candidate.id === button.dataset.caseId);
  if (item) selectCase(item, activeType);
});

formulaSearch.addEventListener("input", renderFormulaList);

for (const button of formulaTypeButtons) {
  button.addEventListener("click", () => switchFormulaType(button.dataset.formulaType));
}

toggleFormulaButton.addEventListener("click", () => {
  setFormulaVisibility(currentAlgorithm.hidden);
  practiceCanvas.focus({ preventScroll: true });
});
reloadCaseButton.addEventListener("click", () => {
  if (activeCase) selectCase(activeCase, activeCase.type);
});
randomCaseButton.addEventListener("click", chooseRandomCase);

window.addEventListener("rubiks-turn-complete", (event) => {
  if (!caseReady || event.detail.settingCase) return;

  if (event.detail.solved) {
    caseReady = false;
    const elapsed = ((performance.now() - caseStartedAt) / 1000).toFixed(1);
    setPracticeStatus(`完成 · ${event.detail.moveCount} 步 · ${elapsed} 秒`, "complete");
  } else {
    setPracticeStatus(`作答中 · ${event.detail.moveCount} 步`, "active");
  }
});

renderFormulaList();
selectCase(formulaData.OLL.find((item) => item.id === "OLL 27"), "OLL");
