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

/* утиль: формат даты -> DD.MM.YYYY */
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

/* read query param */
function getQueryParam(name){
  const url = new URL(location.href);
  return url.searchParams.get(name);
}

/* обновление статистики на основе DOM (без перезапроса) */
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

/* строим DOM-карточку (вставляем <select class="category-select">) */
function buildCardElement(card, index=0){
  const el = document.createElement("div");
  el.className = "card";
  el.style.boxShadow = `0 35px 60px -25px ${getGlowColor(card.rating || 0)}`;
  el.classList.add("card-glow");
  const createdAtRaw = card.created_at;

  // category default
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

  // populate category select
  const sel = el.querySelector(".category-select");
  CATEGORIES.forEach(c=>{
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.id;
    if(c.id === categoryVal) opt.selected = true;
    sel.appendChild(opt);
  });

  // delete handler (same as before)
  el.querySelector(".delete-btn").onclick = async () => {
    if(!createdAtRaw){
      alert("Ошибка удаления: uuid/id не найден для этой карточки");
      return;
    }

    const { error: delError } = await supabaseClient
      .from("cards")
      .delete()
      .eq("created_at", createdAtRaw);

    if(delError){
      console.error(delError);
      alert("Ошибка удаления: " + (delError.message || delError));
      return;
    }

    // плавно удаляем из DOM
    el.classList.add("fade-out");
    setTimeout(()=> {
      if(el.parentNode) el.parentNode.removeChild(el);
      updateStatsFromDOM();
    }, 260);
  };

  // textarea oninput debounce -> update text
  el.querySelector("textarea").oninput = debounce(async (e)=> {
    const txt = e.target.value;
    if(!createdAtRaw) return;
    await supabaseClient
      .from("cards")
      .update({ text: txt })
      .eq("created_at", createdAtRaw);
  }, 700);

    // slider change -> live UI update while dragging (input) + persist on release (change)
  const slider = el.querySelector(".slider");
  const ratingEl = el.querySelector(".rating");

  // 1) live update while dragging: сразу меняем число и свечение карточки
  slider.addEventListener("input", () => {
    const newRating = Number(slider.value) || 0;
    ratingEl.textContent = newRating + "/10";
    // обновляем визуальное свечение (box-shadow) мгновенно
    el.style.boxShadow = `0 35px 60px -25px ${getGlowColor(newRating)}`;
    updateStatsFromDOM();
  });

  // 2) on change (release) — сохраняем в БД и откатываем при ошибке
  slider.addEventListener("change", async () => {
    const prev = Number(ratingEl.textContent.split("/")[0]) || 0;
    const newRating = Number(slider.value) || 0;

    // optimistic UI уже сделан на input, теперь persist
    if(!createdAtRaw){
      // если нет id/created_at — откатываем и сообщаем
      alert("Ошибка обновления рейтинга: uuid/id не найден");
      slider.value = prev;
      ratingEl.textContent = prev + "/10";
      el.style.boxShadow = `0 35px 60px -25px ${getGlowColor(prev)}`;
      updateStatsFromDOM();
      return;
    }

    const { error: updateError } = await supabaseClient
      .from("cards")
      .update({ rating: newRating })
      .eq("created_at", createdAtRaw);

    if(updateError){
      console.error(updateError);
      // rollback UI
      slider.value = prev;
      ratingEl.textContent = prev + "/10";
      el.style.boxShadow = `0 35px 60px -25px ${getGlowColor(prev)}`;
      updateStatsFromDOM();
      alert("Ошибка обновления рейтинга: " + (updateError.message || updateError));
      return;
    }

    // успех — ничего больше не делаем (UI уже в нужном состоянии)
  });

  // category select change -> optimistic + db update
  sel.addEventListener("change", async () => {
    const prev = card.category || "Разное";
    const newCat = sel.value;

    // optimistic visually nothing else needed except stats maybe
    // update DB
    if(!createdAtRaw) {
      alert("Ошибка обновления категории: uuid/id не найден");
      sel.value = prev;
      return;
    }

    const { error: upd } = await supabaseClient
      .from("cards")
      .update({ category: newCat })
      .eq("created_at", createdAtRaw);

    if(upd){
      console.error(upd);
      sel.value = prev;
      alert("Ошибка обновления категории: " + (upd.message || upd));
      return;
    }
    // update local card.category for future prev uses
    card.category = newCat;
  });

  return el;
}

/* загрузка карточек (с учётом фильтра ?category=) */
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
    console.error(error);
    stats.textContent = "Ошибка загрузки";
    return;
  }

  grid.innerHTML = "";
  if(!data || data.length === 0){
    updateStatsFromDOM();
    return;
  }

  data.forEach((card,i)=>{
    const el = buildCardElement(card, i);
    grid.appendChild(el);
  });

  updateStatsFromDOM();
}

/* загрузка фото -> storage -> insert + prepend в DOM (default category Разное) */
photoInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if(!file) return;

  const fileName = Date.now() + "-" + file.name;

  const { error: uploadError } = await supabaseClient
    .storage
    .from("photos")
    .upload(fileName, file);

  if(uploadError){
    console.error(uploadError);
    alert("Ошибка загрузки");
    return;
  }

  const { data } = supabaseClient
    .storage
    .from("photos")
    .getPublicUrl(fileName);

  const publicUrl = data.publicUrl;

  const { data: inserted, error: insertError } = await supabaseClient
    .from("cards")
    .insert([{
      image_url: publicUrl,
      text: "",
      rating: 0,
      category: "Разное"
    }])
    .select()
    .limit(1);

  if(insertError){
    console.error(insertError);
    alert("Ошибка записи в БД");
    return;
  }

  const newCard = Array.isArray(inserted) ? inserted[0] : inserted;
  const el = buildCardElement(newCard, 0);
  grid.insertBefore(el, grid.firstChild);
  updateStatsFromDOM();
  photoInput.value = "";
});

/* add button opens file dialog */
addBtn.addEventListener("click", ()=> photoInput.click());

/* nav emoji buttons for quick switch */
document.querySelectorAll('.nav-emoji').forEach(btn=>{
  btn.onclick = () => {
    const page = btn.dataset.page;
    if(page === 'home') location.href = '/index.html';
    if(page === 'categories') location.href = '/categories.html';
  };
});

/* helper debounce */
function debounce(fn, ms){
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(()=> fn(...a), ms);
  };
}

/* if page opened with ?openUpload=1 we open file dialog */
if(getQueryParam('openUpload') === '1'){
  // small delay to ensure DOM ready
  setTimeout(()=> { photoInput.click(); }, 300);
}

/* service worker registration (silent failure ok) */
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/service-worker.js').catch(()=>{/* ignore */});
}

/* старт загрузки */
loadCards();
