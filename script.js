const svgNS = "http://www.w3.org/2000/svg";
let networkLayers = [];
let connections = [];
let selectedNodes = {};

const hiddenLayersCountSelect = document.getElementById("hiddenLayersCount");
const hiddenLayer2Control = document.getElementById("hiddenLayer2Control");
const buildNetworkButton = document.getElementById("buildNetwork");
const activationSelect = document.getElementById("activationFunction");

hiddenLayersCountSelect.addEventListener("change", () => {
  hiddenLayer2Control.style.display =
    hiddenLayersCountSelect.value === "2" ? "inline" : "none";
});

buildNetworkButton.addEventListener("click", () => {
  buildNetwork();
});

function randomNormal() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function activate(x, type) {
  if (type === "relu") {
    return Math.max(0, x);
  }
  if (type === "logistic") {
    return 1 / (1 + Math.exp(-x));
  }
  return x;
}

function drawActivationSketch(type, container) {
  const svgElem = document.createElementNS(svgNS, "svg");
  svgElem.setAttribute("width", "50");
  svgElem.setAttribute("height", "30");
  if (type === "relu") {
    const poly = document.createElementNS(svgNS, "polyline");
    poly.setAttribute("points", "0,25 25,25 50,0");
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke", "#333");
    poly.setAttribute("stroke-width", "2");
    svgElem.appendChild(poly);
  } else if (type === "logistic") {
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", "M0,25 C15,25 35,0 50,0");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#333");
    path.setAttribute("stroke-width", "2");
    svgElem.appendChild(path);
  }
  container.appendChild(svgElem);
}

function getCenterRight(el) {
  const rect = el.getBoundingClientRect();
  const contRect = document
    .getElementById("network-container")
    .getBoundingClientRect();
  return {
    x: rect.right - contRect.left,
    y: rect.top - contRect.top + rect.height / 2,
  };
}

function getCenterLeft(el) {
  const rect = el.getBoundingClientRect();
  const contRect = document
    .getElementById("network-container")
    .getBoundingClientRect();
  return {
    x: rect.left - contRect.left,
    y: rect.top - contRect.top + rect.height / 2,
  };
}

function updateConnectionLabels() {
  const svg = document.getElementById("connections-svg");
  const texts = svg.querySelectorAll("text.label");
  texts.forEach((t) => t.remove());

  connections.forEach((conn) => {
    const selected = selectedNodes[conn.toLayer];
    if (selected !== undefined && selected !== "") {
      if (conn.toIndex !== parseInt(selected, 10)) {
        conn.lineElem.style.display = "none";
      } else {
        conn.lineElem.style.display = "";
        const fromElem = networkLayers[conn.fromLayer].nodes[conn.fromIndex].element;
        const toElem = networkLayers[conn.toLayer].nodes[conn.toIndex].element;
        const start = getCenterRight(fromElem);
        const end = getCenterLeft(toElem);
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2 - 4;
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const textWeight = document.createElementNS(svgNS, "text");
        textWeight.setAttribute("x", midX);
        textWeight.setAttribute("y", midY);
        textWeight.setAttribute("font-size", "12");
        textWeight.setAttribute("fill", "red");
        textWeight.setAttribute("text-anchor", "middle");
        textWeight.setAttribute("transform", `rotate(${angle}, ${midX}, ${midY})`);
        textWeight.textContent = conn.weight.toFixed(2);
        textWeight.classList.add("label");
        svg.appendChild(textWeight);
      }
    } else {
      conn.lineElem.style.display = "";
    }
  });

  Object.keys(selectedNodes).forEach((layerIndex) => {
    if (selectedNodes[layerIndex] !== "") {
      const selIndex = parseInt(selectedNodes[layerIndex], 10);
      const targetNode = networkLayers[layerIndex].nodes[selIndex];
      const nodeRect = targetNode.element.getBoundingClientRect();
      const contRect = document
        .getElementById("network-container")
        .getBoundingClientRect();
      const biasX = nodeRect.left - contRect.left - 5;
      const biasY = nodeRect.top - contRect.top + nodeRect.height / 2;
      const textBias = document.createElementNS(svgNS, "text");
      textBias.setAttribute("x", biasX);
      textBias.setAttribute("y", biasY);
      textBias.setAttribute("font-size", "12");
      textBias.setAttribute("fill", "blue");
      textBias.setAttribute("text-anchor", "end");
      textBias.textContent = targetNode.bias.toFixed(2);
      textBias.classList.add("label");
      svg.appendChild(textBias);
    }
  });
}

function buildNetwork() {
  const inputCount = parseInt(document.getElementById("inputCount").value, 10);
  const hiddenLayersCount = parseInt(hiddenLayersCountSelect.value, 10);
  const hiddenLayer1Nodes = parseInt(
    document.getElementById("hiddenLayer1Nodes").value,
    10,
  );
  const hiddenLayer2Nodes =
    hiddenLayersCount === 2
      ? parseInt(document.getElementById("hiddenLayer2Nodes").value, 10)
      : 0;
  const outputCount = parseInt(document.getElementById("outputCount").value, 10);
  const activationType = activationSelect.value;

  const container = document.getElementById("network-container");
  container.innerHTML = '<svg id="connections-svg"></svg>';
  const svg = document.getElementById("connections-svg");
  svg.setAttribute("width", container.clientWidth);
  svg.setAttribute("height", container.clientHeight);

  networkLayers = [];
  connections = [];
  selectedNodes = {};

  networkLayers.push({ name: "Inmatningslager", type: "input", nodes: [] });
  for (let i = 0; i < inputCount; i += 1) {
    networkLayers[0].nodes.push({ value: 0, element: null });
  }

  networkLayers.push({ name: "Doldt lager 1", type: "hidden", nodes: [] });
  for (let i = 0; i < hiddenLayer1Nodes; i += 1) {
    networkLayers[1].nodes.push({ pre: 0, post: 0, bias: randomNormal(), element: null });
  }

  if (hiddenLayersCount === 2) {
    networkLayers.push({ name: "Doldt lager 2", type: "hidden", nodes: [] });
    for (let i = 0; i < hiddenLayer2Nodes; i += 1) {
      networkLayers[2].nodes.push({ pre: 0, post: 0, bias: randomNormal(), element: null });
    }
    networkLayers.push({ name: "Utmatningslager", type: "output", nodes: [] });
    for (let i = 0; i < outputCount; i += 1) {
      networkLayers[3].nodes.push({ value: 0, bias: randomNormal(), element: null });
    }
  } else {
    networkLayers.push({ name: "Utmatningslager", type: "output", nodes: [] });
    for (let i = 0; i < outputCount; i += 1) {
      networkLayers[2].nodes.push({ value: 0, bias: randomNormal(), element: null });
    }
  }

  for (let l = 0; l < networkLayers.length - 1; l += 1) {
    const layerFrom = networkLayers[l];
    const layerTo = networkLayers[l + 1];
    for (let i = 0; i < layerFrom.nodes.length; i += 1) {
      for (let j = 0; j < layerTo.nodes.length; j += 1) {
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", 0);
        line.setAttribute("y1", 0);
        line.setAttribute("x2", 0);
        line.setAttribute("y2", 0);
        line.setAttribute("stroke", "#555");
        line.setAttribute("stroke-width", "1.5");
        svg.appendChild(line);
        connections.push({
          fromLayer: l,
          fromIndex: i,
          toLayer: l + 1,
          toIndex: j,
          weight: randomNormal(),
          lineElem: line,
        });
      }
    }
  }

  networkLayers.forEach((layer, layerIndex) => {
    const layerDiv = document.createElement("div");
    layerDiv.className = "layer";

    const nodesContainer = document.createElement("div");
    nodesContainer.className = "nodes-container";

    const label = document.createElement("div");
    label.className = "layer-label";
    label.textContent = layer.name;
    nodesContainer.appendChild(label);

    layer.nodes.forEach((node, nodeIndex) => {
      const nodeDiv = document.createElement("div");
      nodeDiv.classList.add("node");
      node.element = nodeDiv;

      if (layer.type === "input") {
        nodeDiv.classList.add("input-node");
        const inputElem = document.createElement("input");
        inputElem.type = "text";
        inputElem.value = "0";
        inputElem.style.width = "40px";
        nodeDiv.appendChild(inputElem);
        node.inputElement = inputElem;
      } else if (layer.type === "hidden") {
        nodeDiv.classList.add("hidden-node");
        const preBox = document.createElement("div");
        preBox.className = "node-box pre-box";
        preBox.textContent = "0";
        const actBox = document.createElement("div");
        actBox.className = "node-box act-box";
        drawActivationSketch(activationType, actBox);
        const postBox = document.createElement("div");
        postBox.className = "node-box post-box";
        postBox.textContent = "0";
        nodeDiv.appendChild(preBox);
        nodeDiv.appendChild(actBox);
        nodeDiv.appendChild(postBox);
        node.preBox = preBox;
        node.postBox = postBox;
      } else if (layer.type === "output") {
        nodeDiv.classList.add("output-node");
        nodeDiv.textContent = "0";
      }
      nodesContainer.appendChild(nodeDiv);
    });

    layerDiv.appendChild(nodesContainer);

    if (layer.type === "hidden" || layer.type === "output") {
      const controlsDiv = document.createElement("div");
      controlsDiv.className = "layer-controls";
      const computeBtn = document.createElement("button");
      computeBtn.textContent = "Beräkna lager";
      computeBtn.addEventListener("click", () => {
        computeLayer(layerIndex, activationSelect.value);
      });
      controlsDiv.appendChild(computeBtn);
      const select = document.createElement("select");
      const optIngen = document.createElement("option");
      optIngen.value = "";
      optIngen.textContent = "Ingen";
      select.appendChild(optIngen);
      for (let i = 0; i < layer.nodes.length; i += 1) {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = `Nod ${i + 1}`;
        select.appendChild(opt);
      }
      select.addEventListener("change", (event) => {
        selectedNodes[layerIndex] = event.target.value;
        updateConnectionLabels();
      });
      controlsDiv.appendChild(select);
      layerDiv.appendChild(controlsDiv);
    }
    container.appendChild(layerDiv);
  });

  updateAllConnectionPositions();
  networkLayers.forEach((layer, index) => {
    if (layer.type === "hidden" || layer.type === "output") {
      selectedNodes[index] = "";
    }
  });
}

function computeLayer(layerIndex, activationType) {
  const prevLayer = networkLayers[layerIndex - 1];
  const currentLayer = networkLayers[layerIndex];
  currentLayer.nodes.forEach((node, nodeIndex) => {
    let sum = 0;
    connections
      .filter((conn) => conn.toLayer === layerIndex && conn.toIndex === nodeIndex)
      .forEach((conn) => {
        let prevVal;
        if (prevLayer.type === "input") {
          prevVal = parseFloat(prevLayer.nodes[conn.fromIndex].inputElement.value);
          if (Number.isNaN(prevVal)) prevVal = 0;
        } else if (prevLayer.type === "hidden") {
          prevVal = prevLayer.nodes[conn.fromIndex].post;
        }
        sum += prevVal * conn.weight;
      });
    sum += node.bias;
    if (currentLayer.type === "hidden") {
      node.pre = sum;
      node.post = activate(sum, activationType);
      node.preBox.textContent = node.pre.toFixed(2);
      node.postBox.textContent = node.post.toFixed(2);
    } else if (currentLayer.type === "output") {
      node.value = sum;
      node.element.textContent = node.value.toFixed(2);
    }
  });
  updateAllConnectionPositions();
  updateConnectionLabels();
}

function updateAllConnectionPositions() {
  connections.forEach((conn) => {
    const fromElem = networkLayers[conn.fromLayer].nodes[conn.fromIndex].element;
    const toElem = networkLayers[conn.toLayer].nodes[conn.toIndex].element;
    const start = getCenterRight(fromElem);
    const end = getCenterLeft(toElem);
    conn.lineElem.setAttribute("x1", start.x);
    conn.lineElem.setAttribute("y1", start.y);
    conn.lineElem.setAttribute("x2", end.x);
    conn.lineElem.setAttribute("y2", end.y);
  });
}
