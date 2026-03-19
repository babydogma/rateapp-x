const SUPABASE_URL = "https://qlogmylywwdbczxolidl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nVqkHQmgMKoA_F_ft7yfXQ_OWjYq7f4";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const list = document.getElementById("sleepList");
const stats = document.getElementById("sleepStats");
const addBtn = document.getElementById("addSleepBtn");

/* =========================
   FETCH
========================= */

async function fetchSleep() {
  const { data, error } = await supabaseClient
    .from("sleep_entries")
    .select("*")
    .order("sleep_date", { ascending: false });

  if (error) {
    console.error("fetchSleep error:", error);
    return { data: [], error };
  }

  return { data: data || [], error: null };
}

/* =========================
   UTILS
========================= */

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidTime(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || "").trim());
}

function clampRating(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(10, num));
}

function calcDuration(bed, wake) {
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);

  let b = bh * 60 + bm;
  let w = wh * 60 + wm;

  if (w <= b) w += 1440;

  return w - b;
}

function formatDuration(minutes) {
  const safe = Number(minutes) || 0;
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${h}ч ${m}м`;
}

function formatSleepDate(dateStr) {
  if (!dateStr) return "Без даты";

  const [year, month, day] = dateStr.split("-");
  return `${day}.${month}.${year}`;
}

function normalizeSleepDate(value) {
  const raw = String(value || "").trim();

  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const ruMatch = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (ruMatch) {
    const [, day, month, year] = ruMatch;
    return `${year}-${month}-${day}`;
  }

  return null;
}

/* =========================
   RENDER
========================= */

function render(entries, loadError = null) {
  if (!list || !stats) return;

  list.innerHTML = "";

  if (loadError) {
    stats.textContent = `Ошибка: ${loadError.message}`;

    const errorCard = document.createElement("div");
    errorCard.className = "card";
    errorCard.innerHTML = `
      <div class="card-content">
        <div class="card-right-column">
          <div class="card__title">Ошибка загрузки сна</div>
          <div class="card__description-preview is-empty">
            ${escapeHtml(loadError.message)}
          </div>
        </div>
      </div>
    `;
    list.appendChild(errorCard);
    return;
  }

  if (!entries.length) {
    stats.textContent = "Записей сна: 0";

    const emptyCard = document.createElement("div");
    emptyCard.className = "card";
    emptyCard.innerHTML = `
      <div class="card-content">
        <div class="card-right-column">
          <div class="card__title">Пока нет записей сна</div>
          <div class="card__description-preview is-empty">
            Нажми на + и добавь первую запись
          </div>
        </div>
      </div>
    `;
    list.appendChild(emptyCard);
    return;
  }

  entries.forEach((entry) => {
    const el = document.createElement("div");
    el.className = "card";

    const sleepRating = clampRating(entry.sleep_rating);
    const moodRating = clampRating(entry.mood_rating);
    const safeNote = String(entry.note || "").trim();

    el.innerHTML = `
      <div class="card-content">
        <div class="card-right-column">
          <div class="card__title">${escapeHtml(formatSleepDate(entry.sleep_date))}</div>
          <div class="card__description-preview">
            ${escapeHtml(entry.bed_time || "--:--")} → ${escapeHtml(entry.wake_time || "--:--")} • ${escapeHtml(formatDuration(entry.duration_minutes))}
          </div>
          <div class="rating">Сон: ${sleepRating}/10</div>
          <div class="card__description-preview">
            Настроение: ${moodRating}/10
          </div>
          <div class="card__description-preview ${safeNote ? "" : "is-empty"}">
            ${safeNote ? escapeHtml(safeNote) : "Без заметки"}
          </div>
        </div>
      </div>
    `;

    list.appendChild(el);
  });

  const avgSleep = (
    entries.reduce((sum, e) => sum + clampRating(e.sleep_rating), 0) / entries.length
  ).toFixed(1);

  const avgDuration = Math.round(
    entries.reduce((sum, e) => sum + (Number(e.duration_minutes) || 0), 0) / entries.length
  );

  stats.textContent = `Средний сон: ${avgSleep}/10 • ${formatDuration(avgDuration)} • Записей: ${entries.length}`;
}

/* =========================
   ADD
========================= */

if (addBtn) {
  addBtn.onclick = async () => {
    const rawDate = prompt("Дата (2026-03-17 или 19.03.2026)");
    const bed = prompt("Во сколько лёг (01:30)");
    const wake = prompt("Во сколько встал (08:40)");
    const rating = prompt("Оценка сна 0-10");
    const mood = prompt("Настроение 0-10");
    const note = prompt("Заметка") || "";

    if (!rawDate || !bed || !wake) return;

    const date = normalizeSleepDate(rawDate);

    if (!date) {
      alert("Дата должна быть в формате 2026-03-17 или 19.03.2026");
      return;
    }

    if (!isValidTime(bed) || !isValidTime(wake)) {
      alert("Время должно быть в формате HH:MM, например 01:30");
      return;
    }

    const duration = calcDuration(bed, wake);

    const { error } = await supabaseClient
      .from("sleep_entries")
      .insert({
        sleep_date: date,
        bed_time: bed,
        wake_time: wake,
        duration_minutes: duration,
        sleep_rating: clampRating(rating),
        mood_rating: clampRating(mood),
        note: String(note).trim()
      });

    if (error) {
      console.error("insertSleep error:", error);
      alert(`Не удалось добавить запись: ${error.message}`);
      return;
    }

    init();
  };
}

/* =========================
   NAV
========================= */

document.querySelectorAll(".nav-emoji").forEach((btn) => {
  btn.onclick = () => {
    const page = btn.dataset.page;

    if (page === "home") {
      localStorage.removeItem("activeCategory");
      location.href = "index.html";
    }

    if (page === "sleep") {
      location.href = "sleep.html";
    }

    if (page === "categories") {
      location.href = "categories.html";
    }
  };
});

/* =========================
   INIT
========================= */

async function init() {
  if (stats) {
    stats.textContent = "Грузим записи сна...";
  }

  const result = await fetchSleep();
  render(result.data, result.error);
}

init();
