// ===== Estado da aplicação =====
// Modelagem orientada a objetos: cada registro é um "HabitEntry"
class HabitEntry {
  constructor({ date, food = [], move = [], moveMinutes = 0, sleepHours = 0, sleep = [], mood = 3, notes = "" }) {
    this.date = date; // formato YYYY-MM-DD
    this.food = food;
    this.move = move;
    this.moveMinutes = Number(moveMinutes) || 0;
    this.sleepHours = Number(sleepHours) || 0;
    this.sleep = sleep;
    this.mood = Number(mood);
    this.notes = notes.trim();
  }

  // Considera "alimentação ok" se ao menos 2 hábitos alimentares marcados
  isFoodGood() { return this.food.length >= 2; }

  // Considera "dia ativo" se houve caminhada/treino/alongamento ou >=20min
  isMoveGood() { return this.move.length >= 1 || this.moveMinutes >= 20; }

  // Considera "sono ok" se >= 7h
  isSleepGood() { return this.sleepHours >= 7; }
}

// Armazenamento em memória (lista de registros), simulando uma estrutura de dados simples
const habitLog = [];

// ===== Utilidades de data =====
function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  return toISODate(new Date());
}

function formatLongDate(isoStr) {
  const d = new Date(isoStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

function lastNDates(n) {
  const dates = [];
  const base = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    dates.push(toISODate(d));
  }
  return dates;
}

// ===== Render: rótulo de data no formulário =====
function renderTodayLabel() {
  const el = document.getElementById("todayLabel");
  const today = new Date();
  el.textContent = "Registro de " + today.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long"
  });
}

// ===== Toast =====
let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

// ===== Formulário: captura de dados =====
function getCheckedValues(form, name) {
  return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map(i => i.value);
}

function handleFormSubmit(e) {
  e.preventDefault();
  const form = e.target;

  const entry = new HabitEntry({
    date: todayISO(),
    food: getCheckedValues(form, "food"),
    move: getCheckedValues(form, "move"),
    moveMinutes: form.moveMinutes.value,
    sleepHours: form.sleepHours.value,
    sleep: getCheckedValues(form, "sleep"),
    mood: form.querySelector('input[name="mood"]:checked')?.value || 3,
    notes: form.notes.value
  });

  // Substitui registro existente do mesmo dia (mantém um registro por dia)
  const existingIndex = habitLog.findIndex(e => e.date === entry.date);
  if (existingIndex >= 0) {
    habitLog[existingIndex] = entry;
    showToast("Registro de hoje atualizado!");
  } else {
    habitLog.push(entry);
    showToast("Registro salvo. Continue assim!");
  }

  renderAll();
}

// ===== Cálculo do painel (últimos 7 dias) =====
function computeWeekStats() {
  const week = lastNDates(7);
  const entriesByDate = new Map(habitLog.map(e => [e.date, e]));

  let foodCount = 0, moveCount = 0, sleepCount = 0;

  const days = week.map(date => {
    const entry = entriesByDate.get(date);
    const food = !!entry && entry.isFoodGood();
    const move = !!entry && entry.isMoveGood();
    const sleep = !!entry && entry.isSleepGood();
    if (food) foodCount++;
    if (move) moveCount++;
    if (sleep) sleepCount++;
    return { date, hasEntry: !!entry, food, move, sleep };
  });

  return {
    days,
    foodPct: Math.round((foodCount / 7) * 100),
    movePct: Math.round((moveCount / 7) * 100),
    sleepPct: Math.round((sleepCount / 7) * 100)
  };
}

// ===== Cálculo de sequência (streak) =====
function computeStreak() {
  const entriesByDate = new Map(habitLog.map(e => [e.date, e]));
  let streak = 0;
  let cursor = new Date();

  // Conta dias consecutivos a partir de hoje (para trás) com algum registro
  while (true) {
    const iso = toISODate(cursor);
    if (entriesByDate.has(iso)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// ===== Render: anéis do painel =====
const RING_CIRCUMFERENCE = 2 * Math.PI * 42; // ~263.9

function setRing(id, pct) {
  const ring = document.getElementById(id);
  const offset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * pct) / 100;
  ring.style.strokeDashoffset = offset;
}

function renderDashboard() {
  const stats = computeWeekStats();

  document.getElementById("streakValue").textContent = computeStreak();

  setRing("ringFood", stats.foodPct);
  setRing("ringMove", stats.movePct);
  setRing("ringSleep", stats.sleepPct);

  document.getElementById("valFood").textContent = stats.foodPct + "%";
  document.getElementById("valMove").textContent = stats.movePct + "%";
  document.getElementById("valSleep").textContent = stats.sleepPct + "%";

  // Tira semanal
  const strip = document.getElementById("weekStrip");
  strip.innerHTML = "";
  const today = todayISO();

  stats.days.forEach(day => {
    const pill = document.createElement("div");
    pill.className = "day-pill" + (day.date === today ? " today" : "");

    const label = document.createElement("span");
    label.className = "day-label";
    const d = new Date(day.date + "T00:00:00");
    label.textContent = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
    pill.appendChild(label);

    const dots = document.createElement("div");
    dots.className = "day-dots";

    [["food", day.food], ["move", day.move], ["sleep", day.sleep]].forEach(([cls, active]) => {
      const dot = document.createElement("span");
      dot.className = "dot" + (active ? ` on ${cls}` : "");
      dots.appendChild(dot);
    });

    pill.appendChild(dots);
    strip.appendChild(pill);
  });
}

// ===== Render: histórico =====
const FOOD_LABELS = { cafe: "Café da manhã", frutas: "Frutas/vegetais", agua: "Hidratação", evitei: "Sem ultraprocessados" };
const MOVE_LABELS = { caminhada: "Caminhada/pedal", treino: "Treino", alongamento: "Alongamento" };
const SLEEP_LABELS = { qualidade: "Sono contínuo", tela: "Menos telas" };
const MOOD_EMOJI = { 1: "😣", 2: "🙁", 3: "😐", 4: "🙂", 5: "😄" };

function renderHistory() {
  const list = document.getElementById("historyList");
  const empty = document.getElementById("historyEmpty");
  list.innerHTML = "";

  if (habitLog.length === 0) {
    list.appendChild(empty);
    return;
  }

  const sorted = [...habitLog].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  sorted.forEach(entry => {
    const li = document.createElement("li");
    li.className = "history-item";

    const date = document.createElement("div");
    date.className = "history-date";
    date.textContent = formatLongDate(entry.date);
    li.appendChild(date);

    const body = document.createElement("div");
    body.className = "history-body";

    const tags = document.createElement("div");
    tags.className = "history-tags";

    entry.food.forEach(f => tags.appendChild(makeTag(FOOD_LABELS[f] || f)));
    entry.move.forEach(m => tags.appendChild(makeTag(MOVE_LABELS[m] || m)));
    if (entry.moveMinutes > 0) tags.appendChild(makeTag(entry.moveMinutes + " min ativos"));
    if (entry.sleepHours > 0) tags.appendChild(makeTag(entry.sleepHours + "h de sono"));
    entry.sleep.forEach(s => tags.appendChild(makeTag(SLEEP_LABELS[s] || s)));

    body.appendChild(tags);

    if (entry.notes) {
      const note = document.createElement("p");
      note.className = "history-note";
      note.textContent = entry.notes;
      body.appendChild(note);
    }

    li.appendChild(body);

    const mood = document.createElement("span");
    mood.className = "history-mood";
    mood.textContent = MOOD_EMOJI[entry.mood] || "😐";
    mood.title = "Humor do dia";
    li.appendChild(mood);

    const remove = document.createElement("button");
    remove.className = "history-remove";
    remove.setAttribute("aria-label", "Remover registro de " + formatLongDate(entry.date));
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      const idx = habitLog.findIndex(e => e.date === entry.date);
      if (idx >= 0) {
        habitLog.splice(idx, 1);
        renderAll();
        showToast("Registro removido.");
      }
    });
    li.appendChild(remove);

    list.appendChild(li);
  });
}

function makeTag(text) {
  const span = document.createElement("span");
  span.className = "history-tag";
  span.textContent = text;
  return span;
}

// ===== Metas (sliders) =====
function setupGoalSlider(inputId, outputId) {
  const input = document.getElementById(inputId);
  const output = document.getElementById(outputId);
  output.textContent = input.value;
  input.addEventListener("input", () => {
    output.textContent = input.value;
  });
}

// ===== Render geral =====
function renderAll() {
  renderDashboard();
  renderHistory();
}

// ===== Inicialização =====
document.addEventListener("DOMContentLoaded", () => {
  renderTodayLabel();
  document.getElementById("loggerForm").addEventListener("submit", handleFormSubmit);

  setupGoalSlider("goalFood", "goalFoodVal");
  setupGoalSlider("goalMove", "goalMoveVal");
  setupGoalSlider("goalSleep", "goalSleepVal");

  renderAll();
});
