/* main script (index.html) — содержит также CATEGORIES и логику */
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
const imageModal = document.getElementById("imageModal");
const modalImg = document.getElementById("modalImg");

/* утиль */
function formatDateSimple(datestr){
  if(!datestr) return "";
  const d = new Date(datestr);
  if(isNaN(d)) return "";
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = d.getFullYear();
  return `${dd}.${mm}.${yy}`;
}

function getGlowColor(rating){
  const hue = 10 + (rating * 4);
  return `hsl(${hue}, 80%, 55%)`;
}

function getQueryParam(name){
  const url = new URL(location.href);
  return url.searchParams.get(name);
}

function updateStatsFromDOM(){
  const cards = Array.from(grid.querySelectorAll(".card"));
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

  stats.textContent = `Средняя оценка: ${(sum/count).toFixed(1)} • Карточек: ${count}`;
}

/* строим карточку */
function buildCardElement(card){

  const el = document.createElement("div");
  el.className = "card";
  el.style.boxShadow = `0 35px 60px -25px ${getGlowColor(card.rating || 0)}`;

  const createdAtRaw = card.created_at;
  const categoryVal = card.category || "Разное";

  el.innerHTML = `
    <img src="${card.image_url || ""}">
    <div class="delete-btn">✕</div>
    <textarea placeholder="Описание">${card.text || ""}</textarea>
    <div class="rating">${card.rating || 0}/10</div>
    <input type="range" min="0" max="10" value="${card.rating || 0}" class="slider">
    <select class="category-select"></select>
    <div class="created">${formatDateSimple(createdAtRaw)}</div>
  `;
  const img = el.querySelector("img");

img.addEventListener("click", () => {
  if(!img.src) return;

  modalImg.src = img.src;
  imageModal.classList.add("active");
});

  /* категории */
  const sel = el.querySelector(".category-select");
  CATEGORIES.forEach(c=>{
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.id;
    if(c.id === categoryVal) opt.selected = true;
    sel.appendChild(opt);
  });

  /* удаление */
  el.querySelector(".delete-btn").onclick = async () => {
    if(!createdAtRaw) return;

    const { error } = await supabaseClient
      .from("cards")
      .delete()
      .eq("created_at", createdAtRaw);

    if(error){
      alert("Ошибка удаления");
      return;
    }

    el.classList.add("fade-out");
    setTimeout(()=> {
      el.remove();
      updateStatsFromDOM();
    }, 260);
  };

  /* textarea */
  el.querySelector("textarea").oninput = debounce(async (e)=> {
    if(!createdAtRaw) return;

    await supabaseClient
      .from("cards")
      .update({ text: e.target.value })
      .eq("created_at", createdAtRaw);
  }, 700);

  /* ===== SLIDER LOGIC ===== */

  const slider = el.querySelector(".slider");
  const ratingEl = el.querySelector(".rating");

  let previousRating = Number(slider.value) || 0;

  // initial progress
  slider.style.setProperty('--progress', (slider.value / 10) * 100 + '%');

  /* 1) во время перетаскивания */
  slider.addEventListener("input", () => {

    const newRating = Number(slider.value) || 0;

    ratingEl.textContent = newRating + "/10";

    slider.style.setProperty('--progress', (slider.value / 10) * 100 + '%');

    el.style.boxShadow =
      `0 35px 60px -25px ${getGlowColor(newRating)}`;

    updateStatsFromDOM();
  });

  /* 2) при отпускании — сохраняем */
  slider.addEventListener("change", async () => {

    const newRating = Number(slider.value) || 0;

    if(!createdAtRaw){
      slider.value = previousRating;
      ratingEl.textContent = previousRating + "/10";
      slider.style.setProperty('--progress', (previousRating / 10) * 100 + '%');
      el.style.boxShadow =
        `0 35px 60px -25px ${getGlowColor(previousRating)}`;
      updateStatsFromDOM();
      return;
    }

    const { error } = await supabaseClient
      .from("cards")
      .update({ rating: newRating })
      .eq("created_at", createdAtRaw);

    if(error){
      slider.value = previousRating;
      ratingEl.textContent = previousRating + "/10";
      slider.style.setProperty('--progress', (previousRating / 10) * 100 + '%');
      el.style.boxShadow =
        `0 35px 60px -25px ${getGlowColor(previousRating)}`;
      updateStatsFromDOM();
      alert("Ошибка обновления рейтинга");
      return;
    }

    previousRating = newRating;
  });

  /* категория */
  sel.addEventListener("change", async () => {
    if(!createdAtRaw) return;

    const { error } = await supabaseClient
      .from("cards")
      .update({ category: sel.value })
      .eq("created_at", createdAtRaw);

    if(error){
      alert("Ошибка обновления категории");
    }
  });

  return el;
}

/* загрузка карточек */
async function loadCards(){

  let query = supabaseClient
    .from("cards")
    .select("*")
    .order("created_at", { ascending: false });

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

/* загрузка фото */
photoInput.addEventListener("change", async (e) => {

  const file = e.target.files[0];
  if(!file) return;

  const fileName = Date.now() + "-" + file.name;

  await supabaseClient
    .storage
    .from("photos")
    .upload(fileName, file);

  const { data } =
    supabaseClient.storage.from("photos").getPublicUrl(fileName);

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

  grid.prepend(buildCardElement(inserted[0]));
  updateStatsFromDOM();
  photoInput.value = "";
});

/* кнопка + */
addBtn.addEventListener("click", ()=> photoInput.click());

/* debounce */
function debounce(fn, ms){
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(()=> fn(...a), ms);
  };
}

/* service worker */
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/service-worker.js').catch(()=>{});
}

imageModal.addEventListener("click", () => {
  imageModal.classList.remove("active");
  modalImg.src = "";
});

loadCards();
