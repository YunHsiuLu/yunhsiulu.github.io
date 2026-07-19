const svg = document.querySelector("#circuitBoard");
const scopeCanvas = document.querySelector("#scopeCanvas");
const scopeCtx = scopeCanvas.getContext("2d");

const ui = {
  modeText: document.querySelector("#modeText"),
  messageText: document.querySelector("#messageText"),
  componentTools: document.querySelector("#componentTools"),
  wireBtn: document.querySelector("#wireBtn"),
  selectBtn: document.querySelector("#selectBtn"),
  deleteBtn: document.querySelector("#deleteBtn"),
  rotateBtn: document.querySelector("#rotateBtn"),
  runBtn: document.querySelector("#runBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  propertyPanel: document.querySelector("#propertyPanel"),
  scopeToggle: document.querySelector("#scopeToggle"),
  scopeLegend: document.querySelector("#scopeLegend"),
  simTime: document.querySelector("#simTime"),
  timeStep: document.querySelector("#timeStep"),
};

const SVG_NS = "http://www.w3.org/2000/svg";
const GRID = 28;
const NODE_TOLERANCE = 16;
const colors = ["#1d6b5f", "#9a5f12", "#3269a8"];

const labels = {
  dc: "DC",
  ground: "GND",
  resistor: "R",
  capacitor: "C",
  inductor: "L",
  voltmeter: "V",
  ammeter: "A",
  label: "Text",
};

const defaults = {
  dc: { value: 5, unit: "V" },
  resistor: { value: 1000, unit: "ohm" },
  capacitor: { value: 0.000001, unit: "F" },
  inductor: { value: 0.01, unit: "H" },
  voltmeter: { value: 0, unit: "V" },
  ammeter: { value: 0, unit: "A" },
  ground: { value: 0, unit: "" },
  label: { value: 0, unit: "" },
};

const state = {
  mode: "select",
  components: [],
  wires: [],
  selected: null,
  wireStart: null,
  nextId: 1,
  traces: [],
};

function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

function snap(value) {
  return Math.round(value / GRID) * GRID;
}

function formatValue(component) {
  if (component.type === "label") return component.text || "Label";
  if (component.type === "ground") return "";
  const value = Number(component.value);
  if (!Number.isFinite(value)) return "";
  if (component.type === "resistor") return `${formatEngineering(value)}Ω`;
  if (component.type === "capacitor") return `${formatEngineering(value)}F`;
  if (component.type === "inductor") return `${formatEngineering(value)}H`;
  if (component.type === "dc") return `${formatEngineering(value)}V`;
  return component.measurement || "";
}

function formatEngineering(value) {
  const abs = Math.abs(value);
  if (abs === 0) return "0";
  const units = [
    { factor: 1e-6, prefix: "µ" },
    { factor: 1e-3, prefix: "m" },
    { factor: 1, prefix: "" },
    { factor: 1e3, prefix: "k" },
    { factor: 1e6, prefix: "M" },
  ];
  let unit = units[2];
  for (const candidate of units) {
    if (abs >= candidate.factor) unit = candidate;
  }
  return `${(value / unit.factor).toFixed(abs / unit.factor >= 100 ? 0 : 2).replace(/\.?0+$/, "")}${unit.prefix}`;
}

function setMode(mode) {
  state.mode = mode;
  state.wireStart = null;
  document.querySelectorAll("button[data-tool], #wireBtn, #selectBtn").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tool === mode || button.id === `${mode}Btn`);
  });
  const text = mode === "wire" ? "導線模式" : mode === "select" ? "選取模式" : `放置 ${labels[mode]}`;
  ui.modeText.textContent = text;
  ui.messageText.textContent =
    mode === "wire" ? "點選兩個端點建立導線。" : mode === "select" ? "拖曳零件可移動，選取後可改值。" : "在格線上點一下放置零件。";
  render();
}

function getBoardPoint(event) {
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const transformed = pt.matrixTransform(svg.getScreenCTM().inverse());
  return { x: snap(transformed.x), y: snap(transformed.y) };
}

function addComponent(type, x, y, options = {}) {
  const component = {
    id: `c${state.nextId++}`,
    type,
    x,
    y,
    rotation: options.rotation || 0,
    value: options.value ?? defaults[type].value,
    text: options.text || (type === "label" ? "Label" : ""),
  };
  state.components.push(component);
  selectItem({ kind: "component", id: component.id });
  return component;
}

function getTerminals(component) {
  if (component.type === "label") return [];
  if (component.type === "ground") return [{ id: `${component.id}:0`, x: component.x, y: component.y - 28 }];
  if (component.type === "voltmeter" || component.type === "ammeter") {
    return rotatedTerminals(component, 54);
  }
  return rotatedTerminals(component, 84);
}

function rotatedTerminals(component, halfLength) {
  const angle = (component.rotation * Math.PI) / 180;
  const dx = Math.cos(angle) * halfLength;
  const dy = Math.sin(angle) * halfLength;
  return [
    { id: `${component.id}:0`, x: component.x - dx, y: component.y - dy },
    { id: `${component.id}:1`, x: component.x + dx, y: component.y + dy },
  ];
}

function terminalById(id) {
  for (const component of state.components) {
    const terminal = getTerminals(component).find((item) => item.id === id);
    if (terminal) return { ...terminal, component };
  }
  return null;
}

function findTerminal(point) {
  for (const component of state.components) {
    for (const terminal of getTerminals(component)) {
      const distance = Math.hypot(terminal.x - point.x, terminal.y - point.y);
      if (distance <= NODE_TOLERANCE) return { ...terminal, component };
    }
  }
  return null;
}

function addWire(from, to) {
  if (!from || !to || from.id === to.id) return;
  const exists = state.wires.some((wire) => {
    return (wire.from === from.id && wire.to === to.id) || (wire.from === to.id && wire.to === from.id);
  });
  if (!exists) {
    state.wires.push({ id: `w${state.nextId++}`, from: from.id, to: to.id });
  }
  state.wireStart = null;
  selectItem({ kind: "wire", id: state.wires[state.wires.length - 1].id });
}

function selectItem(item) {
  state.selected = item;
  renderProperties();
  render();
}

function selectedComponent() {
  if (!state.selected || state.selected.kind !== "component") return null;
  return state.components.find((component) => component.id === state.selected.id) || null;
}

function selectedWire() {
  if (!state.selected || state.selected.kind !== "wire") return null;
  return state.wires.find((wire) => wire.id === state.selected.id) || null;
}

function render() {
  svg.replaceChildren();
  renderWires();
  renderComponents();
}

function renderWires() {
  for (const wire of state.wires) {
    const from = terminalById(wire.from);
    const to = terminalById(wire.to);
    if (!from || !to) continue;
    const path = createSvgElement("path", {
      d: `M ${from.x} ${from.y} L ${to.x} ${to.y}`,
      class: `wire-path ${state.selected?.id === wire.id ? "is-selected" : ""}`,
      "data-wire": wire.id,
    });
    path.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      selectItem({ kind: "wire", id: wire.id });
    });
    svg.append(path);
  }
}

function renderComponents() {
  for (const component of state.components) {
    const group = createSvgElement("g", {
      class: `component ${state.selected?.id === component.id ? "is-selected" : ""}`,
      "data-component": component.id,
      transform: `translate(${component.x} ${component.y}) rotate(${component.rotation})`,
    });
    group.addEventListener("pointerdown", (event) => beginDrag(event, component));
    drawSymbol(group, component);
    svg.append(group);

    for (const terminal of getTerminals(component)) {
      const circle = createSvgElement("circle", {
        cx: terminal.x,
        cy: terminal.y,
        r: 7,
        class: `terminal ${state.wireStart?.id === terminal.id ? "is-pending" : ""}`,
        "data-terminal": terminal.id,
      });
      circle.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        handleTerminalClick(terminal);
      });
      svg.append(circle);
    }
  }
}

function drawSymbol(group, component) {
  const label = labels[component.type];
  if (component.type === "dc") {
    group.append(createSvgElement("line", { x1: -84, y1: 0, x2: -34, y2: 0, class: "component-lead" }));
    group.append(createSvgElement("line", { x1: 34, y1: 0, x2: 84, y2: 0, class: "component-lead" }));
    group.append(createSvgElement("line", { x1: -16, y1: -28, x2: -16, y2: 28, class: "component-symbol" }));
    group.append(createSvgElement("line", { x1: 14, y1: -16, x2: 14, y2: 16, class: "component-symbol" }));
    appendText(group, "+", -28, -34, "component-label");
    appendText(group, formatValue(component), 0, 45, "component-value");
    return;
  }
  if (component.type === "resistor") {
    group.append(createSvgElement("line", { x1: -84, y1: 0, x2: -42, y2: 0, class: "component-lead" }));
    group.append(createSvgElement("rect", { x: -42, y: -16, width: 84, height: 32, rx: 5, class: "component-body" }));
    group.append(createSvgElement("line", { x1: 42, y1: 0, x2: 84, y2: 0, class: "component-lead" }));
  } else if (component.type === "capacitor") {
    group.append(createSvgElement("line", { x1: -84, y1: 0, x2: -14, y2: 0, class: "component-lead" }));
    group.append(createSvgElement("line", { x1: -14, y1: -28, x2: -14, y2: 28, class: "component-symbol" }));
    group.append(createSvgElement("line", { x1: 14, y1: -28, x2: 14, y2: 28, class: "component-symbol" }));
    group.append(createSvgElement("line", { x1: 14, y1: 0, x2: 84, y2: 0, class: "component-lead" }));
  } else if (component.type === "inductor") {
    group.append(createSvgElement("line", { x1: -84, y1: 0, x2: -42, y2: 0, class: "component-lead" }));
    for (let i = 0; i < 4; i += 1) {
      group.append(createSvgElement("path", { d: `M ${-42 + i * 21} 0 A 10.5 16 0 0 1 ${-21 + i * 21} 0`, class: "component-symbol" }));
    }
    group.append(createSvgElement("line", { x1: 42, y1: 0, x2: 84, y2: 0, class: "component-lead" }));
  } else if (component.type === "ground") {
    group.append(createSvgElement("line", { x1: 0, y1: -28, x2: 0, y2: -4, class: "component-lead" }));
    group.append(createSvgElement("line", { x1: -24, y1: -4, x2: 24, y2: -4, class: "component-symbol" }));
    group.append(createSvgElement("line", { x1: -16, y1: 8, x2: 16, y2: 8, class: "component-symbol" }));
    group.append(createSvgElement("line", { x1: -8, y1: 20, x2: 8, y2: 20, class: "component-symbol" }));
  } else if (component.type === "voltmeter" || component.type === "ammeter") {
    group.append(createSvgElement("line", { x1: -54, y1: 0, x2: -28, y2: 0, class: "component-lead" }));
    group.append(createSvgElement("circle", { cx: 0, cy: 0, r: 28, class: "component-body" }));
    group.append(createSvgElement("line", { x1: 28, y1: 0, x2: 54, y2: 0, class: "component-lead" }));
  } else if (component.type === "label") {
    appendText(group, component.text || "Label", 0, 0, "component-label");
    return;
  }
  appendText(group, label, 0, 0, "component-label");
  appendText(group, formatValue(component), 0, 42, "component-value");
}

function appendText(group, text, x, y, className) {
  const item = createSvgElement("text", { x, y, class: className });
  item.textContent = text;
  group.append(item);
}

function beginDrag(event, component) {
  event.stopPropagation();
  selectItem({ kind: "component", id: component.id });
  if (state.mode !== "select") return;
  const start = getBoardPoint(event);
  const origin = { x: component.x, y: component.y };
  svg.setPointerCapture(event.pointerId);

  function move(moveEvent) {
    const point = getBoardPoint(moveEvent);
    component.x = origin.x + point.x - start.x;
    component.y = origin.y + point.y - start.y;
    render();
  }

  function up(upEvent) {
    svg.releasePointerCapture(upEvent.pointerId);
    svg.removeEventListener("pointermove", move);
    svg.removeEventListener("pointerup", up);
  }

  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerup", up);
}

function handleTerminalClick(terminal) {
  if (state.mode !== "wire") {
    selectItem({ kind: "component", id: terminal.component.id });
    return;
  }
  if (!state.wireStart) {
    state.wireStart = terminal;
    ui.messageText.textContent = "已選取第一個端點，請點第二個端點。";
    render();
    return;
  }
  addWire(state.wireStart, terminal);
  ui.messageText.textContent = "導線已建立。";
  render();
}

function renderProperties() {
  const component = selectedComponent();
  const wire = selectedWire();
  ui.propertyPanel.replaceChildren();
  if (component) {
    const title = document.createElement("p");
    title.textContent = `${labels[component.type]}：${component.id}`;
    ui.propertyPanel.append(title);

    if (component.type === "label") {
      addTextField("文字", component.text || "", (value) => {
        component.text = value;
        render();
      });
    } else if (!["ground", "voltmeter", "ammeter"].includes(component.type)) {
      addNumberField("數值", component.value, (value) => {
        component.value = value;
        render();
      });
    } else if (component.type === "voltmeter" || component.type === "ammeter") {
      const note = document.createElement("p");
      note.textContent = component.measurement || "執行模擬後顯示量測曲線。";
      ui.propertyPanel.append(note);
    }
    addNumberField("角度", component.rotation, (value) => {
      component.rotation = ((value % 360) + 360) % 360;
      render();
    });
  } else if (wire) {
    const title = document.createElement("p");
    title.textContent = `導線：${wire.id}`;
    ui.propertyPanel.append(title);
  } else {
    const text = document.createElement("p");
    text.textContent = "選取零件或導線端點後可調整數值。";
    ui.propertyPanel.append(text);
  }
}

function addNumberField(label, value, onInput) {
  const row = document.createElement("label");
  row.className = "field-row";
  const span = document.createElement("span");
  span.textContent = label;
  const input = document.createElement("input");
  input.type = "number";
  input.step = "any";
  input.value = value;
  const unit = document.createElement("small");
  unit.textContent = "";
  input.addEventListener("input", () => onInput(Number(input.value)));
  row.append(span, input, unit);
  ui.propertyPanel.append(row);
}

function addTextField(label, value, onInput) {
  const row = document.createElement("label");
  row.className = "field-row";
  const span = document.createElement("span");
  span.textContent = label;
  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  const unit = document.createElement("small");
  input.addEventListener("input", () => onInput(input.value));
  row.append(span, input, unit);
  ui.propertyPanel.append(row);
}

function deleteSelected() {
  if (!state.selected) return;
  if (state.selected.kind === "component") {
    const componentId = state.selected.id;
    state.components = state.components.filter((component) => component.id !== componentId);
    state.wires = state.wires.filter((wire) => !wire.from.startsWith(`${componentId}:`) && !wire.to.startsWith(`${componentId}:`));
  } else {
    state.wires = state.wires.filter((wire) => wire.id !== state.selected.id);
  }
  state.selected = null;
  renderProperties();
  render();
}

function rotateSelected() {
  const component = selectedComponent();
  if (!component) return;
  component.rotation = (component.rotation + 90) % 360;
  renderProperties();
  render();
}

function clearAll() {
  state.components = [];
  state.wires = [];
  state.selected = null;
  state.wireStart = null;
  renderProperties();
  state.traces = [];
  drawScope([]);
  render();
}

function buildCircuitModel() {
  const terminals = [];
  const terminalIndex = new Map();
  for (const component of state.components) {
    for (const terminal of getTerminals(component)) {
      terminalIndex.set(terminal.id, terminals.length);
      terminals.push(terminal.id);
    }
  }

  const parent = terminals.map((_, index) => index);
  const find = (index) => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  };
  const union = (a, b) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  };
  for (const wire of state.wires) {
    if (terminalIndex.has(wire.from) && terminalIndex.has(wire.to)) union(terminalIndex.get(wire.from), terminalIndex.get(wire.to));
  }

  const nodeMap = new Map();
  let nextNode = 1;
  let groundNode = 0;
  for (const component of state.components) {
    if (component.type === "ground") {
      const terminal = getTerminals(component)[0];
      if (terminal) groundNode = find(terminalIndex.get(terminal.id));
    }
  }
  nodeMap.set(groundNode, 0);
  const getNode = (terminalId) => {
    const root = find(terminalIndex.get(terminalId));
    if (!nodeMap.has(root)) nodeMap.set(root, nextNode++);
    return nodeMap.get(root);
  };

  const elements = state.components
    .filter((component) => !["ground", "label"].includes(component.type))
    .map((component) => {
      const terms = getTerminals(component);
      return { component, a: getNode(terms[0].id), b: getNode(terms[1].id) };
    });
  return { elements, nodeCount: nextNode };
}

function simulate() {
  const model = buildCircuitModel();
  const dc = model.elements.find((item) => item.component.type === "dc");
  const resistor = model.elements.find((item) => item.component.type === "resistor");
  const capacitor = model.elements.find((item) => item.component.type === "capacitor");
  const inductor = model.elements.find((item) => item.component.type === "inductor");
  const voltmeters = model.elements.filter((item) => item.component.type === "voltmeter");
  const ammeters = model.elements.filter((item) => item.component.type === "ammeter");
  const totalTime = clamp(Number(ui.simTime.value) || 0.04, 0.001, 10);
  const dt = clamp(Number(ui.timeStep.value) || 0.00005, 0.000001, 0.01);

  let traces = [];
  if (dc && resistor && capacitor && sameSeriesNode(dc, resistor, capacitor)) {
    traces = simulateRC(dc, resistor, capacitor, totalTime, dt);
  } else if (dc && inductor && capacitor && !resistor) {
    traces = simulateLC(dc, inductor, capacitor, totalTime, dt);
  } else if (dc && resistor && inductor && capacitor) {
    traces = simulateRLC(dc, resistor, inductor, capacitor, totalTime, dt);
  } else {
    ui.messageText.textContent = "目前求解器支援單迴路 RC、LC、RLC。請用範例或建立單一閉合迴路。";
    drawScope([]);
    return;
  }

  attachMeterReadings(traces, voltmeters, ammeters);
  state.traces = traces;
  drawScope(traces);
  ui.messageText.textContent = "模擬完成。";
}

function sameSeriesNode() {
  return true;
}

function simulateRC(dc, resistor, capacitor, totalTime, dt) {
  const vs = Math.abs(Number(dc.component.value)) || 5;
  const r = Math.max(Math.abs(Number(resistor.component.value)) || 1000, 1e-9);
  const c = Math.max(Math.abs(Number(capacitor.component.value)) || 1e-6, 1e-12);
  let vc = 0;
  const vTrace = { label: "Vc", unit: "V", color: colors[0], data: [] };
  const iTrace = { label: "I", unit: "A", color: colors[1], data: [] };
  for (let t = 0; t <= totalTime; t += dt) {
    const i = (vs - vc) / r;
    vTrace.data.push({ t, y: vc });
    iTrace.data.push({ t, y: i });
    vc += (i / c) * dt;
  }
  return [vTrace, iTrace];
}

function simulateLC(dc, inductor, capacitor, totalTime, dt) {
  const vs = Math.abs(Number(dc.component.value)) || 5;
  const l = Math.max(Math.abs(Number(inductor.component.value)) || 0.01, 1e-12);
  const c = Math.max(Math.abs(Number(capacitor.component.value)) || 1e-6, 1e-12);
  let vc = vs;
  let i = 0;
  const vTrace = { label: "Vc", unit: "V", color: colors[0], data: [] };
  const iTrace = { label: "I", unit: "A", color: colors[1], data: [] };
  for (let t = 0; t <= totalTime; t += dt) {
    vTrace.data.push({ t, y: vc });
    iTrace.data.push({ t, y: i });
    const di = (-vc / l) * dt;
    i += di;
    vc += (i / c) * dt;
  }
  return [vTrace, iTrace];
}

function simulateRLC(dc, resistor, inductor, capacitor, totalTime, dt) {
  const vs = Math.abs(Number(dc.component.value)) || 5;
  const r = Math.max(Math.abs(Number(resistor.component.value)) || 1000, 1e-9);
  const l = Math.max(Math.abs(Number(inductor.component.value)) || 0.01, 1e-12);
  const c = Math.max(Math.abs(Number(capacitor.component.value)) || 1e-6, 1e-12);
  let vc = 0;
  let i = 0;
  const vTrace = { label: "Vc", unit: "V", color: colors[0], data: [] };
  const iTrace = { label: "I", unit: "A", color: colors[1], data: [] };
  for (let t = 0; t <= totalTime; t += dt) {
    vTrace.data.push({ t, y: vc });
    iTrace.data.push({ t, y: i });
    const di = ((vs - r * i - vc) / l) * dt;
    i += di;
    vc += (i / c) * dt;
  }
  return [vTrace, iTrace];
}

function attachMeterReadings(traces, voltmeters, ammeters) {
  const voltage = traces.find((trace) => trace.unit === "V");
  const current = traces.find((trace) => trace.unit === "A");
  const lastVoltage = voltage?.data.at(-1)?.y ?? 0;
  const lastCurrent = current?.data.at(-1)?.y ?? 0;
  for (const meter of voltmeters) meter.component.measurement = `${lastVoltage.toFixed(3)} V`;
  for (const meter of ammeters) meter.component.measurement = `${lastCurrent.toExponential(3)} A`;
  renderProperties();
  render();
}

function drawScope(traces) {
  const ratio = window.devicePixelRatio || 1;
  const rect = scopeCanvas.getBoundingClientRect();
  scopeCanvas.width = Math.max(1, Math.round(rect.width * ratio));
  scopeCanvas.height = Math.max(1, Math.round(rect.height * ratio));
  scopeCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const width = rect.width;
  const height = rect.height;
  scopeCtx.clearRect(0, 0, width, height);
  ui.scopeLegend.replaceChildren();
  if (!ui.scopeToggle.checked) return;

  const plot = { x: 42, y: 18, w: width - 58, h: height - 48 };
  scopeCtx.strokeStyle = "rgba(23, 33, 43, 0.18)";
  scopeCtx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = plot.y + (plot.h * i) / 4;
    scopeCtx.beginPath();
    scopeCtx.moveTo(plot.x, y);
    scopeCtx.lineTo(plot.x + plot.w, y);
    scopeCtx.stroke();
  }
  scopeCtx.strokeStyle = "#53606d";
  scopeCtx.strokeRect(plot.x, plot.y, plot.w, plot.h);

  if (!traces.length) {
    scopeCtx.fillStyle = "#61707f";
    scopeCtx.font = "14px system-ui";
    scopeCtx.fillText("尚無模擬資料", plot.x + 12, plot.y + 28);
    return;
  }

  const maxT = Math.max(...traces.flatMap((trace) => trace.data.map((point) => point.t)));
  let minY = Math.min(...traces.flatMap((trace) => trace.data.map((point) => point.y)));
  let maxY = Math.max(...traces.flatMap((trace) => trace.data.map((point) => point.y)));
  if (Math.abs(maxY - minY) < 1e-12) {
    maxY += 1;
    minY -= 1;
  }

  for (const trace of traces) {
    scopeCtx.strokeStyle = trace.color;
    scopeCtx.lineWidth = 2;
    scopeCtx.beginPath();
    trace.data.forEach((point, index) => {
      const x = plot.x + (point.t / maxT) * plot.w;
      const y = plot.y + plot.h - ((point.y - minY) / (maxY - minY)) * plot.h;
      if (index === 0) scopeCtx.moveTo(x, y);
      else scopeCtx.lineTo(x, y);
    });
    scopeCtx.stroke();

    const legend = document.createElement("span");
    legend.className = "legend-item";
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = trace.color;
    const label = document.createElement("span");
    const last = trace.data.at(-1)?.y ?? 0;
    label.textContent = `${trace.label}：${last.toPrecision(4)} ${trace.unit}`;
    legend.append(swatch, label);
    ui.scopeLegend.append(legend);
  }

  scopeCtx.fillStyle = "#61707f";
  scopeCtx.font = "12px system-ui";
  scopeCtx.fillText("t", plot.x + plot.w - 8, plot.y + plot.h + 24);
  scopeCtx.fillText(`${minY.toPrecision(3)}`, 4, plot.y + plot.h);
  scopeCtx.fillText(`${maxY.toPrecision(3)}`, 4, plot.y + 10);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function loadPreset(name) {
  clearAll();
  if (name === "rc") {
    const dc = addComponent("dc", 196, 196, { value: 5 });
    const r = addComponent("resistor", 392, 196, { value: 1000 });
    const c = addComponent("capacitor", 588, 196, { value: 0.0000047, rotation: 90 });
    const g = addComponent("ground", 588, 392);
    const v = addComponent("voltmeter", 742, 252, { rotation: 90 });
    connect(dc, 1, r, 0);
    connect(r, 1, c, 0);
    connect(c, 1, g, 0);
    connect(g, 0, dc, 0);
    connect(v, 0, c, 0);
    connect(v, 1, c, 1);
  } else if (name === "lc") {
    const dc = addComponent("dc", 196, 196, { value: 5 });
    const l = addComponent("inductor", 392, 196, { value: 0.02 });
    const c = addComponent("capacitor", 588, 196, { value: 0.00001, rotation: 90 });
    const g = addComponent("ground", 588, 392);
    connect(dc, 1, l, 0);
    connect(l, 1, c, 0);
    connect(c, 1, g, 0);
    connect(g, 0, dc, 0);
  } else if (name === "rlc") {
    const dc = addComponent("dc", 168, 196, { value: 5 });
    const r = addComponent("resistor", 336, 196, { value: 80 });
    const l = addComponent("inductor", 504, 196, { value: 0.04 });
    const c = addComponent("capacitor", 672, 196, { value: 0.00001, rotation: 90 });
    const g = addComponent("ground", 672, 392);
    const a = addComponent("ammeter", 504, 392);
    connect(dc, 1, r, 0);
    connect(r, 1, l, 0);
    connect(l, 1, c, 0);
    connect(c, 1, g, 0);
    connect(g, 0, a, 1);
    connect(a, 0, dc, 0);
  }
  state.selected = null;
  renderProperties();
  render();
  simulate();
}

function connect(a, terminalA, b, terminalB) {
  addWire(getTerminals(a)[terminalA], getTerminals(b)[terminalB]);
}

ui.componentTools.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-tool]");
  if (!button) return;
  setMode(button.dataset.tool);
});

ui.wireBtn.addEventListener("click", () => setMode("wire"));
ui.selectBtn.addEventListener("click", () => setMode("select"));
ui.deleteBtn.addEventListener("click", deleteSelected);
ui.rotateBtn.addEventListener("click", rotateSelected);
ui.resetBtn.addEventListener("click", clearAll);
ui.runBtn.addEventListener("click", simulate);
ui.scopeToggle.addEventListener("change", () => simulate());
window.addEventListener("resize", () => drawScope(state.traces));

document.querySelectorAll("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => loadPreset(button.dataset.preset));
});

svg.addEventListener("pointerdown", (event) => {
  const point = getBoardPoint(event);
  if (state.mode === "select") {
    selectItem(null);
  } else if (state.mode === "wire") {
    const terminal = findTerminal(point);
    if (terminal) handleTerminalClick(terminal);
  } else {
    addComponent(state.mode, point.x, point.y);
    setMode("select");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Delete" || event.key === "Backspace") deleteSelected();
  if (event.key.toLowerCase() === "r") rotateSelected();
  if (event.key.toLowerCase() === "w") setMode("wire");
  if (event.key === "Escape") setMode("select");
});

setMode("select");
loadPreset("rc");
