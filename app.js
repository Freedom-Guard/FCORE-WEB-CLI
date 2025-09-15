const logBox = document.getElementById("log");
const pathInput = document.getElementById("path");
const argsInput = document.getElementById("args");
const sendBtn = document.getElementById("send");
const pauseBtn = document.getElementById("pause");
const clearBtn = document.getElementById("clear");
const filterSelect = document.getElementById("filter");
const searchInput = document.getElementById("search");
const modeToggle = document.getElementById("mode");
const errorDiv = document.getElementById("error-message");
const settingsBtn = document.getElementById("settings-btn");
const settingsDiv = document.getElementById("settings");
const portInput = document.getElementById("port");
const saveSettingsBtn = document.getElementById("save-settings");

let isPaused = false;
let currentFilter = "ALL";
let currentSearch = "";
let controller = null;
let logLines = [];
let currentPort = localStorage.getItem("freedomCorePort") || 8087;
portInput.value = currentPort;

const getLevelClass = (line) => {
  if (line.includes("INFO")) return "INFO";
  if (line.includes("WARN")) return "WARN";
  if (line.includes("ERROR")) return "ERROR";
  if (line.includes("DEBUG")) return "DEBUG";
  return "UNKNOWN";
};

const highlightText = (line, search) => {
  if (!search) return line;
  const regex = new RegExp(`(${search})`, "gi");
  return line.replace(regex, '<span class="highlight">$1</span>');
};

const appendLog = (line, level) => {
  const span = document.createElement("span");
  span.className = `log-line ${level}`;
  span.innerHTML = highlightText(line, currentSearch) + "<br />";
  logBox.appendChild(span);
  logBox.scrollTop = logBox.scrollHeight;
};

const applyFilters = () => {
  logBox.innerHTML = "";
  logLines.forEach(log => {
    if (currentFilter === "ALL" || log.line.includes(currentFilter)) {
      if (!currentSearch || log.line.toLowerCase().includes(currentSearch.toLowerCase())) {
        appendLog(log.line, log.level);
      }
    }
  });
};

async function* streamingFetch(url) {
  controller = new AbortController();
  const response = await fetch(url, { signal: controller.signal });
  if (!response.body) throw new Error("Response body is null, cannot stream.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value, { stream: true });
  }
}

const consumeLogs = async (url) => {
  try {
    errorDiv.style.display = "none";
    for await (const chunk of streamingFetch(url)) {
      const lines = chunk.split("\n").filter(Boolean);
      lines.forEach(line => {
        const level = getLevelClass(line);
        logLines.push({line, level});
        if (!isPaused) appendLog(line, level);
      });
    }
  } catch {
    errorDiv.style.display = "block";
  }
};

sendBtn.addEventListener("click", () => {
  const path = pathInput.value || "/version";
  const args = argsInput.value ? "?" + argsInput.value : "";
  consumeLogs(`http://localhost:${currentPort}` + path + args);
});

pauseBtn.addEventListener("click", () => {
  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? "Resume" : "Pause";
  if (!isPaused) applyFilters();
});

clearBtn.addEventListener("click", () => {
  logLines = [];
  logBox.innerHTML = "";
});

filterSelect.addEventListener("change", (e) => {
  currentFilter = e.target.value;
  applyFilters();
});

searchInput.addEventListener("input", (e) => {
  currentSearch = e.target.value;
  applyFilters();
});

modeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
  document.body.classList.toggle("dark-mode");
});

settingsBtn.addEventListener("click", () => {
  settingsDiv.style.display = settingsDiv.style.display === "none" ? "block" : "none";
});

saveSettingsBtn.addEventListener("click", () => {
  const port = parseInt(portInput.value) || 8087;
  localStorage.setItem("freedomCorePort", port);
  location.reload();
});

document.addEventListener("DOMContentLoaded", () => {
  consumeLogs(`http://localhost:${currentPort}/logs/stream`);
});
