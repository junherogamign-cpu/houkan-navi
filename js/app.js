function splitConclusion(text) {
  const contrast = text.indexOf("が、");
  if (contrast > 0) {
    return {
      conclusion: text.slice(0, contrast) + "。",
      detail: text.slice(contrast + 2).trim()
    };
  }
  const end = text.indexOf("。");
  if (end >= 0 && end < text.length - 1) {
    return { conclusion: text.slice(0, end + 1), detail: text.slice(end + 1).trim() };
  }
  return { conclusion: text, detail: "" };
}

function addPoint(container, text, className) {
  if (!text) return;
  const paragraph = document.createElement("p");
  paragraph.className = className || "point-detail";
  paragraph.textContent = text;
  container.appendChild(paragraph);
}

function getWarningDetails(warning) {
  const withoutHeading = warning.innerHTML.replace(/^\s*<b>[\s\S]*?<\/b>/i, "");
  return withoutHeading.split(/<br\s*\/?\s*>/i).map((fragment) => {
    const textOnly = document.createElement("div");
    textOnly.innerHTML = fragment;
    return textOnly.textContent.trim();
  }).filter(Boolean);
}

function renderChecklist(items, target) {
  target.replaceChildren();
  items.forEach((text, index) => {
    const label = document.createElement("label");
    label.className = "result-check-item";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "result-check-input";
    checkbox.id = "result-check-" + index;
    const copy = document.createElement("span");
    copy.textContent = text;
    label.htmlFor = checkbox.id;
    label.append(checkbox, copy);
    target.appendChild(label);
  });
}

function answer() {
  const insurance = document.querySelector('input[name="insurance"]:checked')?.value || "わからない";
  const condition = document.getElementById("condition").value.trim();
  const question = document.getElementById("question").value.trim();
  const check = document.getElementById("check").checked;
  const result = document.getElementById("result");
  const pointsPanel = document.getElementById("resultPoints");
  const checksPanel = document.getElementById("resultChecks");
  const sourcesPanel = document.getElementById("resultSources");
  const pointsContent = pointsPanel.querySelector(".result-points-content");
  const checksContent = checksPanel.querySelector(".result-check-content");
  const sourcesContent = sourcesPanel.querySelector(".result-source-content");

  // Preserve rule text and links while arranging their existing content by purpose.
  result.innerHTML = window.NaviRules.answer({ insurance, condition, question, check });
  const title = result.querySelector("h2");
  if (title) title.textContent = "結論";

  const answerText = result.querySelector(".answer");
  const box = result.querySelector(".box");
  const warning = result.querySelector(".warn");
  const source = result.querySelector(".source");
  pointsContent.replaceChildren();
  checksContent.replaceChildren();
  sourcesContent.replaceChildren();

  const split = splitConclusion(answerText?.textContent.trim() || "");
  if (answerText) answerText.textContent = split.conclusion;
  addPoint(pointsContent, split.detail);

  const boxLead = box?.querySelector("b")?.textContent.trim() || "";
  const boxItems = Array.from(box?.querySelectorAll("li") || []).map((item) => item.textContent.trim()).filter(Boolean);
  addPoint(pointsContent, boxLead, "point-lead");

  if (warning) {
    getWarningDetails(warning).forEach((text) => addPoint(pointsContent, text));
  }

  if (check && warning && boxItems.length) {
    renderChecklist(boxItems, checksContent);
  } else if (boxItems.length) {
    const list = document.createElement("ul");
    boxItems.forEach((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      list.appendChild(item);
    });
    pointsContent.appendChild(list);
  }

  if (box) box.remove();
  if (warning) warning.remove();
  if (source) {
    const link = source.querySelector("a");
    if (link) link.textContent = "厚生労働省の資料を確認 →";
    sourcesContent.appendChild(source);
  }

  result.style.display = "block";
  pointsPanel.style.display = pointsContent.childElementCount ? "block" : "none";
  checksPanel.style.display = checksContent.childElementCount ? "block" : "none";
  sourcesPanel.style.display = source ? "block" : "none";
  if (question) result.scrollIntoView({ behavior: "smooth", block: "start" });
}
window.answer = answer;
