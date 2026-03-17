const SUPABASE_URL = "https://qlogmylywwdbczxolidl.supabase.co";
const SUPABASE_KEY = "твои ключи";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const list = document.getElementById("sleepList");
const stats = document.getElementById("sleepStats");
const addBtn = document.getElementById("addSleepBtn");

/* =========================
   FETCH
========================= */

async function fetchSleep() {
  const { data } = await supabaseClient
    .from("sleep_entries")
    .select("*")
    .order("sleep_date", { ascending: false });

  return data || [];
}

/* =========================
   RENDER
========================= */

function render(entries) {
  list.innerHTML = "";

  entries.forEach(e => {
    const el = document.createElement("div");
    el.className = "card";

    el.innerHTML = `
      <div>${e.sleep_date}</div>
      <div>${e.bed_time} → ${e.wake_time}</div>
      <div>${Math.floor(e.duration_minutes / 60)}ч ${e.duration_minutes % 60}м</div>
      <div>Сон: ${e.sleep_rating}/10</div>
      <div>Настроение: ${e.mood_rating}/10</div>
      <div>${e.note || ""}</div>
    `;

    list.appendChild(el);
  });

  if (entries.length) {
    const avg = (
      entries.reduce((s, e) => s + e.sleep_rating, 0) / entries.length
    ).toFixed(1);

    stats.textContent = `Средний сон: ${avg}`;
  } else {
    stats.textContent = "Нет данных";
  }
}

/* =========================
   ADD
========================= */

function calcDuration(bed, wake) {
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);

  let b = bh * 60 + bm;
  let w = wh * 60 + wm;

  if (w <= b) w += 1440;

  return w - b;
}

addBtn.onclick = async () => {
  const date = prompt("Дата (2026-03-17)");
  const bed = prompt("Во сколько лёг (01:30)");
  const wake = prompt("Во сколько встал (08:40)");
  const rating = Number(prompt("Оценка сна 0-10"));
  const mood = Number(prompt("Настроение 0-10"));

  if (!date || !bed || !wake) return;

  const duration = calcDuration(bed, wake);

  await supabaseClient.from("sleep_entries").insert({
    sleep_date: date,
    bed_time: bed,
    wake_time: wake,
    duration_minutes: duration,
    sleep_rating: rating,
    mood_rating: mood,
    note: ""
  });

  init();
};

/* =========================
   NAV
========================= */

document.querySelectorAll(".nav-emoji").forEach(btn => {
  btn.onclick = () => {
    const page = btn.dataset.page;

    if (page === "home") location.href = "index.html";
    if (page === "categories") location.href = "categories.html";
    if (page === "sleep") location.href = "sleep.html";
  };
});

/* =========================
   INIT
========================= */

async function init() {
  const data = await fetchSleep();
  render(data);
}

init();
