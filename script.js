/* --- Настройки Supabase (оставь как есть) --- */
const SUPABASE_URL = "https://qlogmylywwdbczxolidl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nVqkHQmgMKoA_F_ft7yfXQ_OWjYq7f4";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* --- DOM --- */
const grid = document.getElementById("grid");
const stats = document.getElementById("stats");
const photoInput = document.getElementById("photoInput");

/* === Категории (с заглавной буквы, как просили) === */
const CATEGORIES = ['Фильм','Сериалы','Еда','Семья','Разное'];

/* формат даты -> DD.MM.YYYY */
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

/* Пересчитать и показать статистику (по текущему DOM) */
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

/* --- построить DOM-карточку (возвращает элемент) --- */
function buildCardElement(card, index=0){
  const el = document.createElement("div");
  el.className = "card";
  el.style.animationDelay = (index * 0.07) + "s";
  el.style.boxShadow = `0 35px 60px -25px ${getGlowColor(card.rating || 0)}`;

  const createdAtRaw = card.created_at;

  // build category select HTML
  const optionsHtml = ['<option value="">— нет —</option>']
    .concat(CATEGORIES.map(c => `<option value="${c}">${c}</option>`))
    .join("");

  el.innerHTML = `
    <img src="${card.image_url || ""}">
    <div class="delete-btn">✕</div>
    <textarea placeholder="Описание">${card.text || ""}</textarea>
    <div class="rating">${card.rating || 0}/10</div>
    <input type="range" min="0" max="10" value="${card.rating || 0}" class="slider">
    <select class="category-select">${optionsHtml}</select>
    <div class="created">${formatDateSimple(createdAtRaw)}</div>
  `;

  // set category value (card.category may be null/undefined)
  const selectEl = el.querySelector(".category-select");
  if(selectEl){
    // if card.category exists and exactly matches option, set it, otherwise keep empty
    if(card.category){
      // try exact match, otherwise try case-insensitive
      const match = Array.from(selectEl.options).find(o => o.value === card.category || o.value.toLowerCase() === String(card.category).toLowerCase());
      if(match) selectEl.value = match.value;
    }
  }

  // удалить — делаем плавное исчезновение в DOM и обновляем статистику
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

    // анимация исчезновения
    el.classList.add("fade-out");
    setTimeout(() => {
      if(el.parentNode) el.parentNode.removeChild(el);
      updateStatsFromDOM();
    }, 260);
  };

  // правка текста (локально + отправка)
  el.querySelector("textarea").oninput = debounce(async (e) => {
    const txt = e.target.value;
    try {
      await supabaseClient
        .from("cards")
        .update({ text: txt })
        .eq("created_at", createdAtRaw);
    } catch(err){
      console.error(err);
    }
  }, 700);

  // слайдер — локально обновляем, отправляем на сервер, НИКАК не перерисовываем всё
  const slider = el.querySelector(".slider");
  const ratingEl = el.querySelector(".rating");

  slider.addEventListener("change", async () => {
    const prev = Number(ratingEl.textContent.split("/")[0]) || 0;
    const newRating = Number(slider.value);

    // оптимистично обновляем UI
    ratingEl.textContent = newRating + "/10";
    el.style.boxShadow = `0 35px 60px -25px ${getGlowColor(newRating)}`;
    updateStatsFromDOM();

    // сохраняем в БД
    const { error: updateError } = await supabaseClient
      .from("cards")
      .update({ rating: newRating })
      .eq("created_at", createdAtRaw);

    if(updateError){
      // откатываем UI и статистику если ошибка
      console.error(updateError);
      ratingEl.textContent = prev + "/10";
      el.style.boxShadow = `0 35px 60px -25px ${getGlowColor(prev)}`;
      updateStatsFromDOM();
      alert("Ошибка обновления рейтинга: " + (updateError.message || updateError));
      return;
    }
    // всё ок
  });

  // смена категории — оптимистично обновляем и отправляем
  if(selectEl){
    selectEl.addEventListener("change", async () => {
      const prevVal = card.category || "";
      const newVal = selectEl.value || null; // null/empty to clear

      // optimistically keep UI
      card.category = newVal;
      // persist
      const { error: updateError } = await supabaseClient
        .from("cards")
        .update({ category: newVal })
        .eq("created_at", createdAtRaw);

      if(updateError){
        console.error(updateError);
        // rollback in UI
        selectEl.value = prevVal || "";
        card.category = prevVal;
        alert("Ошибка сохранения категории: " + (updateError.message || updateError));
        return;
      }

      // if main page had ?category= filter, and user changed category that no longer matches -> remove element from DOM
      const urlParams = new URLSearchParams(window.location.search);
      const activeFilter = urlParams.get('category');
      if(activeFilter && (!newVal || newVal !== activeFilter)){
        // remove element visually
        el.classList.add("fade-out");
        setTimeout(() => {
          if(el.parentNode) el.parentNode.removeChild(el);
          updateStatsFromDOM();
        }, 260);
      }
    });
  }

  return el;
}

/* --- загрузка карточек и рендер (с учётом ?category= в URL) --- */
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

  grid.innerHTML = "";

  if(!data || data.length === 0){
    updateStatsFromDOM(); // покажет "Пока нет карточек"
    return;
  }

  // category filter from URL
  const urlParams = new URLSearchParams(window.location.search);
  const filterCategory = urlParams.get('category'); // exact match expected (capitalized)

  let idx = 0;
  data.forEach((card) => {
    if(filterCategory){
      // If card.category stored in DB is lowercase, do case-insensitive compare
      const cardCat = card.category || "";
      if(String(cardCat).toLowerCase() !== String(filterCategory).toLowerCase()){
        return; // skip
      }
    }
    const el = buildCardElement(card, idx++);
    grid.appendChild(el);
  });

  updateStatsFromDOM();
}

/* --- загрузка фото (storage) и вставка записи --- */
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
      category: null
    }])
    .select()
    .limit(1);

  if(insertError){
    console.error(insertError);
    alert("Ошибка записи в БД");
    return;
  }

  // вставляем новую карточку в начало (чтобы порядок был как в loadCards)
  const newCard = Array.isArray(inserted) ? inserted[0] : inserted;
  const el = buildCardElement(newCard, 0);
  grid.insertBefore(el, grid.firstChild);
  updateStatsFromDOM();
  photoInput.value = "";
});

/* простая debounce для редактирования текста */
function debounce(fn, ms){
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

/* регистрация service worker (если есть) — аккуратно, silent catch */
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/service-worker.js').catch(()=>{/* silent */});
}

/* старт */
loadCards();
