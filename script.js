/* ================================
   RateApp X — Full Updated Script
   ================================ */

const SUPABASE_URL = "https://qlogmylywwdbczxolidl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nVqkHQmgMKoA_F_ft7yfXQ_OWjYq7f4";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const CATEGORIES = [
  { id: "Фильм", emoji: "🎬" },
  { id: "Сериалы", emoji: "📺" },
  { id: "Еда", emoji: "🍔" },
  { id: "Семья", emoji: "👪" },
  { id: "Разное", emoji: "🔖" }
];

const grid = document.getElementById("grid");
const stats = document.getElementById("stats");
const photoInput = document.getElementById("photoInput");
const addBtn = document.getElementById("addBtn");

/* ================================
   Helpers
   ================================ */

function formatDateSimple(datestr){
  if(!datestr) return "";
  const d = new Date(datestr);
  if(isNaN(d)) return "";
  return d.toLocaleDateString("ru-RU");
}

function getGlowColor(rating){
  const hue = 10 + (rating * 4);
  return `hsl(${hue}, 80%, 55%)`;
}

function getQueryParam(name){
  const url = new URL(location.href);
  return url.searchParams.get(name);
}

function debounce(fn, ms){
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(()=> fn(...a), ms);
  };
}

/* ================================
   Stats
   ================================ */

function updateStatsFromDOM(){
  const cards = Array.from(grid.querySelectorAll(".lux-card-wrapper"));
  const count = cards.length;

  if(count === 0){
    stats.textContent = "Пока нет карточек";
    return;
  }

  let sum = 0;
  cards.forEach(c => {
    const ratingText = c.querySelector(".rating")?.textContent || "0/10";
    const num = Number(ratingText.split("/")[0]) || 0;
    sum += num;
  });

  stats.textContent =
    `Средняя оценка: ${(sum/count).toFixed(1)} • Карточек: ${count}`;
}

function buildCardElement(card){

  const createdAtRaw = card.created_at;
  const categoryVal = card.category || "Разное";

  const el = document.createElement("div");
  el.className = "lux-card-wrapper";

  el.innerHTML = `
    <div class="lux-glow"></div>
    <div class="lux-border"></div>

    <div class="lux-card">

      <div class="lux-top">
        <img src="${card.image_url || ""}">
        <button class="delete-btn">✕</button>
      </div>

      <textarea placeholder="Описание">${card.text || ""}</textarea>

      <div class="rating">${card.rating || 0}/10</div>
      <input type="range" min="0" max="10"
             value="${card.rating || 0}"
             class="slider">

      <select class="category-select"></select>

      <div class="created">
        ${formatDateSimple(createdAtRaw)}
      </div>

    </div>
  `;

  /* ---------- CATEGORY ---------- */

  const sel = el.querySelector(".category-select");

  CATEGORIES.forEach(c=>{
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.emoji} ${c.id}`;
    if(c.id === categoryVal) opt.selected = true;
    sel.appendChild(opt);
  });

  /* ---------- DELETE ---------- */

  el.querySelector(".delete-btn").onclick = async () => {

    if(!confirm("Удалить карточку?")) return;

    const { error } = await supabaseClient
      .from("cards")
      .delete()
      .eq("created_at", createdAtRaw);

    if(error){
      alert("Ошибка удаления");
      return;
    }

    el.style.transform = "scale(.9)";
    el.style.opacity = "0";

    setTimeout(()=>{
      el.remove();
      updateStatsFromDOM();
    }, 250);
  };

  /* ---------- TEXT ---------- */

  el.querySelector("textarea").oninput =
    debounce(async (e)=>{
      await supabaseClient
        .from("cards")
        .update({ text: e.target.value })
        .eq("created_at", createdAtRaw);
    }, 600);

  /* ---------- RATING ---------- */

  const slider = el.querySelector(".slider");
  const ratingEl = el.querySelector(".rating");

  slider.addEventListener("input", ()=>{
    const val = Number(slider.value);
    ratingEl.textContent = val + "/10";
    updateStatsFromDOM();
  });

  slider.addEventListener("change", async ()=>{
    await supabaseClient
      .from("cards")
      .update({ rating: Number(slider.value) })
      .eq("created_at", createdAtRaw);
  });

  /* ---------- CATEGORY CHANGE ---------- */

  sel.addEventListener("change", async ()=>{
    await supabaseClient
      .from("cards")
      .update({ category: sel.value })
      .eq("created_at", createdAtRaw);
  });

  return el;
}

/* ================================
   Load Cards
   ================================ */

async function loadCards(){

  const categoryFilter = getQueryParam('category');

  let query = supabaseClient
    .from("cards")
    .select("*")
    .order("created_at", { ascending: false });

  if(categoryFilter){
    query = query.eq('category', categoryFilter);
  }

  const { data, error } = await query;

  if(error){
    stats.textContent = "Ошибка загрузки";
    return;
  }

  grid.innerHTML = "";

  data.forEach(card=>{
    grid.appendChild(buildCardElement(card));
  });

  updateStatsFromDOM();
}

/* ================================
   Upload
   ================================ */

photoInput.addEventListener("change", async (e)=>{

  const file = e.target.files[0];
  if(!file) return;

  const fileName = Date.now() + "-" + file.name;

  await supabaseClient.storage
    .from("photos")
    .upload(fileName, file);

  const { data } = supabaseClient.storage
    .from("photos")
    .getPublicUrl(fileName);

  const { data: inserted } = await supabaseClient
    .from("cards")
    .insert([{
      image_url: data.publicUrl,
      text: "",
      rating: 0,
      category: "Разное"
    }])
    .select()
    .limit(1);

  const newCard = inserted[0];

  grid.insertBefore(
    buildCardElement(newCard),
    grid.firstChild
  );

  updateStatsFromDOM();
  photoInput.value = "";
});

/* ================================
   Nav
   ================================ */

addBtn.addEventListener("click",
  ()=> photoInput.click());

document.querySelectorAll('.nav-emoji')
  .forEach(btn=>{
    btn.onclick = ()=>{
      const page = btn.dataset.page;
      if(page === 'home')
        location.href = '/index.html';
      if(page === 'categories')
        location.href = '/categories.html';
    };
  });

/* ================================
   Service Worker
   ================================ */

if('serviceWorker' in navigator){
  navigator.serviceWorker
    .register('/service-worker.js')
    .catch(()=>{});
}

/* START */
loadCards();
