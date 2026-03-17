document.getElementById("sleepStats").textContent = "JS загружен";

const SUPABASE_URL = "https://qlogmylywwdbczxolidl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nVqkHQmgMKoA_F_ft7yfXQ_OWjYq7f4";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const list = document.getElementById("sleepList");
const stats = document.getElementById("sleepStats");
const addBtn = document.getElementById("addSleepBtn");

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

function render(entries, loadError = null) {
  list.innerHTML = "";

  if (loadError) {
    stats.textContent = `Ошибка: ${loadError.message}`;

    const errorCard = document.createElement("div");
    errorCard.className = "card";
    errorCard.innerHTML = `
      <div class="card-content">
        <div class="card-right-column">
          <div class="card__title">Не удалось загрузить записи сна</div>
          <div class="card__description-preview is-empty">
            ${loadError.message}
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

    el.innerHTML = `
      <div class="card-content">
        <div class="card-right-column">
          <div class="card__title">${entry.sleep_date || "Без даты"}</div>
          <div class="card__description-preview">
            ${entry.bed_time || "--:--"} → ${entry.wake_time || "--:--"} • ${formatDuration(entry.duration_minutes)}
          </div>
          <div class="rating">Сон: ${Number(entry.sleep_rating) || 0}/10</div>
          <div class="card__description-preview">
            Настроение: ${Number(entry.mood_rating) || 0}/10
          </div>
          <div class="card__description-preview ${entry.note ? "" : "is-empty"}">
            ${entry.note || "Без заметки"}
          </div>
        </div>
      </div>
    `;

    list.appendChild(el);
  });

  const avgSleep = (
    entries.reduce((sum, e) => sum + (Number(e.sleep_rating) || 0), 0) / entries.length
  ).toFixed(1);

  const avgDuration = Math.round(
    entries.reduce((sum, e) => sum + (Number(e.duration_minutes) || 0), 0) / entries.length
  );

  stats.textContent = `Средний сон: ${avgSleep}/10 • ${formatDuration(avgDuration)} • Записей: ${entries.length}`;
}

addBtn.onclick = async () => {
  const date = prompt("Дата (2026-03-17)");
  const bed = prompt("Во сколько лёг (01:30)");
  const wake = prompt("Во сколько встал (08:40)");
  const rating = Number(prompt("Оценка сна 0-10"));
  const mood = Number(prompt("Настроение 0-10"));
  const note = prompt("Заметка") || "";

  if (!date || !bed || !wake) return;

  const duration = calcDuration(bed, wake);

  const { error } = await supabaseClient
    .from("sleep_entries")
    .insert({
      sleep_date: date,
      bed_time: bed,
      wake_time: wake,
      duration_minutes: duration,
      sleep_rating: Number.isFinite(rating) ? rating : 0,
      mood_rating: Number.isFinite(mood) ? mood : 0,
      note
    });

  if (error) {
    console.error("insertSleep error:", error);
    alert(`Не удалось добавить запись: ${error.message}`);
    return;
  }

  init();
};

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

async function init() {
  stats.textContent = "Грузим записи сна...";

  const result = await fetchSleep();
  render(result.data, result.error);
}

init();
