/* --- Настройки Supabase (оставь как есть) --- */
const SUPABASE_URL = "https://qlogmylywwdbczxolidl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nVqkHQmgMKoA_F_ft7yfXQ_OWjYq7f4";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* --- DOM --- */
const grid = document.getElementById("grid");
const stats = document.getElementById("stats");
const photoInput = document.getElementById("photoInput");
const homeBtn = document.getElementById("homeBtn");
const catsBtn = document.getElementById("catsBtn");

/* --- утилиты --- */
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

/* --- Статистика из DOM --- */
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

/* --- Создать DOM карточку --- */
function buildCardElement(card, index=0){
  const el = document.createElement("div");
  el.className = "card";
  el.style.animationDelay = (index * 0.07) + "s";
  el.style.boxShadow = `0 35px 60px -25px ${getGlowColor(card.rating || 0)}`;

  const createdAtRaw = card.created_at;

  el.innerHTML = `
    <img src="${card.image_url || ""}">
    <div class="delete-btn">✕</div>
    <textarea placeholder="Описание">${card.text || ""}</textarea>
    <div class="rating">${card.rating || 0}/10</div>
    <input type="range" min="0" max="10" value="${card.rating || 0}" class="slider">
    <div class="created">${formatDateSimple(createdAtRaw)}</div>
  `;

  // удаление
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

    el.classList.add("fade-out");
    setTimeout(() => {
      if(el.parentNode) el.parentNode.removeChild(el);
      updateStatsFromDOM();
    }, 260);
  };

  // правка текста — debounce
  el.querySelector("textarea").oninput = debounce(async (e) => {
    const txt = e.target.value;
    await supabaseClient
      .from("cards")
      .update({ text: txt })
      .eq("created_at", createdAtRaw);
  }, 700);

  // слайдер (оптимистичный update)
  const slider = el.querySelector(".slider");
  const ratingEl = el.querySelector(".rating");

  slider.addEventListener("change", async () => {
    const prev = Number(ratingEl.textContent.split("/")[0]) || 0;
    const newRating = Number(slider.value);

    // оптимистичный UI
    ratingEl.textContent = newRating + "/10";
    el.style.boxShadow = `0 35px 60px -25px ${getGlowColor(newRating)}`;
    updateStatsFromDOM();

    const { error: updateError } = await supabaseClient
      .from("cards")
      .update({ rating: newRating })
      .eq("created_at", createdAtRaw);

    if(updateError){
      console.error(updateError);
      ratingEl.textContent = prev + "/10";
      el.style.boxShadow = `0 35px 60px -25px ${getGlowColor(prev)}`;
      updateStatsFromDOM();
      alert("Ошибка обновления рейтинга: " + (updateError.message || updateError));
      return;
    }
  });

  return el;
}

/* --- Загрузка карточек --- */
async function loadCards(){
  const { data, error } = await supabaseClient
    .from("cards")
    .select("*")
    .order("created_at", { ascending: false });

  if(error){
    console.error(error);
    stats.textContent = "Ошибка загрузки";
    return;
  }

  // фильтр по категории, если параметр в URL есть
  const urlParams = new URLSearchParams(window.location.search);
  const catParam = urlParams.get('cat');
  let cards = data || [];

  if(catParam){
    const wanted = catParam.toString().toLowerCase();
    cards = cards.filter(c => ((c.category || '') + '').toLowerCase() === wanted);
  }

  grid.innerHTML = "";
  if(!cards || cards.length === 0){
    updateStatsFromDOM();
    return;
  }

  cards.forEach((card, i) => {
    const el = buildCardElement(card, i);
    grid.appendChild(el);
  });

  updateStatsFromDOM();
}

/* --- Загрузка фото и вставка записи --- */
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
      category: "" /* оставляем пустой, можно обновить позже */
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

/* debounce */
function debounce(fn, ms){
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

/* --- NAV (простая навигация между страницами) --- */
homeBtn.addEventListener("click", () => {
  homeBtn.classList.add("nav-active");
  catsBtn.classList.remove("nav-active");
  // переключаем на главную (убираем возможный фильтр в URL)
  window.location.href = '/';
});
catsBtn.addEventListener("click", () => {
  catsBtn.classList.add("nav-active");
  homeBtn.classList.remove("nav-active");
  window.location.href = '/categories.html';
});

/* регистрация service worker */
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/service-worker.js').catch(()=>{/* silent */});
}

/* старт */
homeBtn.classList.add("nav-active");
loadCards();
