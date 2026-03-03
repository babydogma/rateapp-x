// script.js (фикс: категории по умолчанию + select под слайдер)
const SUPABASE_URL = "https://qlogmylywwdbczxolidl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nVqkHQmgMKoA_F_ft7yfXQ_OWjYq7f4";

if (!window.supabase) {
  alert("Ошибка: Supabase SDK не загружен. Проверь подключение <script> в index.html");
  throw new Error("supabase lib missing");
}
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* DOM */
const grid = document.getElementById("grid");
const stats = document.getElementById("stats");
const photoInput = document.getElementById("photoInput");

/* дефолтные категории — всегда в селекте */
const defaultCategories = ["фильм","сериалы","еда","семья","разное"];

/* утилиты */
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
function debounce(fn, ms){
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}
function escapeHtml(s){
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}

/* categories from DB (safe) */
async function getCategoriesSafe(){
  try {
    const { data, error } = await supabaseClient
      .from('cards')
      .select('category');
    if(error) return { ok:false, error };
    const map = new Map();
    data.forEach(r => {
      const c = (r.category || '').trim();
      if(c) map.set(c, (map.get(c) || 0) + 1);
    });
    // собрать список: сперва дефолтные (если их нет в map — count 0), затем реальные
    const outMap = new Map();
    defaultCategories.forEach(dc => outMap.set(dc, outMap.get(dc) || 0));
    map.forEach((count, cat) => outMap.set(cat, (outMap.get(cat) || 0) + count));
    const out = Array.from(outMap.entries()).map(([category, count]) => ({ category, count }));
    return { ok:true, data: out };
  } catch (e) {
    return { ok:false, error: e };
  }
}

/* update stats from DOM */
function updateStatsFromDOM(){
  if(!grid) return;
  const cards = Array.from(grid.querySelectorAll(".card"));
  const count = cards.length;
  if(count === 0){
    if(stats) stats.textContent = "Пока нет карточек";
    return;
  }
  let sum = 0;
  cards.forEach(c => {
    const ratingText = c.querySelector(".rating")?.textContent || "0/10";
    const num = Number(ratingText.split("/")[0]) || 0;
    sum += num;
  });
  if(stats) stats.textContent = `Средняя оценка: ${(sum/count).toFixed(1)} • Карточек: ${count}`;
}

/* build card element — select ПОД слайдером */
async function buildCardElement(card, index=0, allCategoriesList = []){
  const el = document.createElement("div");
  el.className = "card";
  el.style.animationDelay = (index * 0.07) + "s";
  el.style.boxShadow = `0 35px 60px -25px ${getGlowColor(card.rating || 0)}`;

  const createdAtRaw = card.created_at;
  const catValue = card.category || '';

  el.innerHTML = `
    <img src="${card.image_url || ""}">
    <div class="delete-btn">✕</div>
    <textarea placeholder="Описание">${card.text || ""}</textarea>
    <div class="rating">${card.rating || 0}/10</div>
    <input type="range" min="0" max="10" value="${card.rating || 0}" class="slider">
    <select class="category-select">
      <option value="">— нет —</option>
      ${allCategoriesList.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
    </select>
    <div class="created">${formatDateSimple(createdAtRaw)}</div>
  `;

  // применяем выбранную категорию
  try {
    const sel = el.querySelector('.category-select');
    if(sel && catValue) sel.value = catValue;
  } catch(e){}

  // delete
  el.querySelector(".delete-btn").onclick = async () => {
    if(!createdAtRaw){ alert("Ошибка удаления: uuid/id не найден для этой карточки"); return; }
    try {
      const { error: delError } = await supabaseClient
        .from("cards")
        .delete()
        .eq("created_at", createdAtRaw);
      if(delError) throw delError;
      el.classList.add("fade-out");
      setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); updateStatsFromDOM(); }, 260);
    } catch(e) {
      console.error("Ошибка удаления:", e);
      alert("Ошибка удаления: " + (e.message || e));
    }
  };

  // save text (debounced)
  el.querySelector("textarea").oninput = debounce(async (e) => {
    const txt = e.target.value;
    if(!createdAtRaw) return;
    try {
      const { error } = await supabaseClient
        .from("cards")
        .update({ text: txt })
        .eq("created_at", createdAtRaw);
      if(error) throw error;
    } catch(e) { console.error("Ошибка сохранения текста:", e); }
  }, 700);

  // slider
  const slider = el.querySelector(".slider");
  const ratingEl = el.querySelector(".rating");
  slider.addEventListener("change", async () => {
    const prev = Number(ratingEl.textContent.split("/")[0]) || 0;
    const newRating = Number(slider.value);
    ratingEl.textContent = newRating + "/10";
    el.style.boxShadow = `0 35px 60px -25px ${getGlowColor(newRating)}`;
    updateStatsFromDOM();
    if(!createdAtRaw){ alert("Ошибка обновления рейтинга: uuid/id не найден"); return; }
    try {
      const { error: updateError } = await supabaseClient
        .from("cards")
        .update({ rating: newRating })
        .eq("created_at", createdAtRaw);
      if(updateError) throw updateError;
    } catch(e) {
      ratingEl.textContent = prev + "/10";
      el.style.boxShadow = `0 35px 60px -25px ${getGlowColor(prev)}`;
      updateStatsFromDOM();
      console.error("Ошибка обновления рейтинга:", e);
      alert("Ошибка обновления рейтинга: " + (e.message || e));
    }
  });

  // category change
  const sel = el.querySelector('.category-select');
  if(sel){
    sel.addEventListener('change', async () => {
      const newCat = sel.value || null;
      if(!createdAtRaw) return;
      try {
        const { error } = await supabaseClient
          .from('cards')
          .update({ category: newCat })
          .eq('created_at', createdAtRaw);
        if(error) throw error;
        updateStatsFromDOM();
      } catch(e) {
        console.error("Ошибка сохранения категории:", e);
        alert("Ошибка сохранения категории: " + (e.message || e));
      }
    });
  }

  return el;
}

/* load cards with optional category filter */
async function loadCards(category = null){
  try {
    if(stats) stats.textContent = "Загрузка...";
    let query = supabaseClient.from("cards").select("*").order("created_at", { ascending: false });
    if(category && category !== '') query = query.eq("category", category);
    const { data, error } = await query;
    if(error) throw error;

    if(!grid) return;
    grid.innerHTML = "";

    const catsResp = await getCategoriesSafe();
    const allCats = (catsResp.ok && Array.isArray(catsResp.data)) ? catsResp.data.map(x=>x.category) : defaultCategories.slice();

    if(!data || data.length === 0){ updateStatsFromDOM(); return; }

    data.forEach((card, i) => {
      // build card (synchronous)
      buildCardElement(card, i, allCats).then(el => grid.appendChild(el));
    });

    setTimeout(updateStatsFromDOM, 120);
  } catch (e) {
    const msg = e && e.message ? e.message.toLowerCase() : '';
    if(msg.includes('column') && msg.includes('category')){
      if(stats) stats.textContent = "Колонка `category` отсутствует в таблице cards. Выполните SQL:\nALTER TABLE public.cards ADD COLUMN IF NOT EXISTS category text;";
    } else {
      console.error("Ошибка загрузки карточек:", e);
      if(stats) stats.textContent = "Ошибка загрузки";
    }
  }
}

/* upload handler (не менял логику) */
if(photoInput){
  photoInput.addEventListener("change", async (ev) => {
    const file = ev.target.files[0]; if(!file) return;
    const fileName = Date.now() + "-" + file.name;
    try {
      const uploadResp = await supabaseClient.storage.from("photos").upload(fileName, file, { cacheControl: '3600', upsert: false });
      if(uploadResp.error) throw uploadResp.error;
      const { data: urlData } = supabaseClient.storage.from("photos").getPublicUrl(fileName);
      const publicUrl = urlData?.publicUrl;
      if(!publicUrl) throw new Error("Не удалось получить publicUrl");
      const { data: insertedArr, error: insertError } = await supabaseClient.from("cards").insert([{ image_url: publicUrl, text: "", rating: 0 }]).select();
      if(insertError) throw insertError;
      const newCard = Array.isArray(insertedArr) ? insertedArr[0] : insertedArr;
      if(grid){
        const catsResp = await getCategoriesSafe();
        const allCats = (catsResp.ok && Array.isArray(catsResp.data)) ? catsResp.data.map(x=>x.category) : defaultCategories.slice();
        const el = await buildCardElement(newCard, 0, allCats);
        grid.insertBefore(el, grid.firstChild);
        updateStatsFromDOM();
      }
      photoInput.value = "";
    } catch(e){
      console.error("Ошибка загрузки/вставки:", e);
      alert("Ошибка загрузки: " + (e.message || e));
    }
  });
}

/* boot */
(async function boot(){
  const params = new URLSearchParams(location.search);
  const selectedCategory = params.get('category') || null;
  await loadCards(selectedCategory);
})();
