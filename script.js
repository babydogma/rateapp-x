// script.js
const SUPABASE_URL = "https://qlogmylywwdbczxolidl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nVqkHQmgMKoA_F_ft7yfXQ_OWjYq7f4";

if (!window.supabase) {
  alert("Ошибка: Supabase SDK не загружен. Проверь подключение <script> в index.html");
  throw new Error("supabase lib missing");
}

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const grid = document.getElementById("grid");
const stats = document.getElementById("stats");
const photoInput = document.getElementById("photoInput");

function showError(msg, err) {
  console.error(msg, err);
  try { stats.textContent = "Ошибка: " + (msg || "неизвестно"); } catch(e){}
  alert((msg || "Ошибка") + (err && err.message ? "\n\n" + err.message : ""));
}

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

  el.querySelector(".delete-btn").onclick = async () => {
    if(!createdAtRaw){
      alert("Ошибка удаления: uuid/id не найден для этой карточки");
      return;
    }

    try {
      const { error: delError } = await supabaseClient
        .from("cards")
        .delete()
        .eq("created_at", createdAtRaw);

      if(delError) throw delError;

      el.classList.add("fade-out");
      setTimeout(() => {
        if(el.parentNode) el.parentNode.removeChild(el);
        updateStatsFromDOM();
      }, 260);

    } catch (e) {
      showError("Ошибка удаления: ", e);
    }
  };

  el.querySelector("textarea").oninput = debounce(async (e) => {
    const txt = e.target.value;
    if(!createdAtRaw) return;
    try {
      const { error } = await supabaseClient
        .from("cards")
        .update({ text: txt })
        .eq("created_at", createdAtRaw);
      if(error) throw error;
    } catch (e) {
      showError("Ошибка сохранения текста:", e);
    }
  }, 700);

  const slider = el.querySelector(".slider");
  const ratingEl = el.querySelector(".rating");

  slider.addEventListener("change", async () => {
    const prev = Number(ratingEl.textContent.split("/")[0]) || 0;
    const newRating = Number(slider.value);

    ratingEl.textContent = newRating + "/10";
    el.style.boxShadow = `0 35px 60px -25px ${getGlowColor(newRating)}`;
    updateStatsFromDOM();

    if(!createdAtRaw){
      alert("Ошибка обновления рейтинга: uuid/id не найден");
      return;
    }

    try {
      const { error: updateError } = await supabaseClient
        .from("cards")
        .update({ rating: newRating })
        .eq("created_at", createdAtRaw);
      if(updateError) throw updateError;
    } catch (e) {
      ratingEl.textContent = prev + "/10";
      el.style.boxShadow = `0 35px 60px -25px ${getGlowColor(prev)}`;
      updateStatsFromDOM();
      showError("Ошибка обновления рейтинга:", e);
    }
  });

  return el;
}

async function loadCards(){
  try {
    stats.textContent = "Загрузка...";
    const { data, error } = await supabaseClient
      .from("cards")
      .select("*")
      .order("created_at", { ascending: false });

    if(error) throw error;
    grid.innerHTML = "";
    if(!data || data.length === 0){
      updateStatsFromDOM();
      return;
    }
    data.forEach((card, i) => {
      const el = buildCardElement(card, i);
      grid.appendChild(el);
    });
    updateStatsFromDOM();
  } catch (e) {
    showError("Ошибка при загрузке карточек — проверь права таблицы 'cards' и подключение.", e);
  }
}

photoInput.addEventListener("change", async (ev) => {
  const file = ev.target.files[0];
  if(!file) return;

  const fileName = Date.now() + "-" + file.name;

  try {
    const uploadResp = await supabaseClient
      .storage
      .from("photos")
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if(uploadResp.error) throw uploadResp.error;

    const { data: urlData } = supabaseClient
      .storage
      .from("photos")
      .getPublicUrl(fileName);
    const publicUrl = urlData?.publicUrl;
    if(!publicUrl){
      throw new Error("Не удалось получить publicUrl. Проверь настройки bucket 'photos'.");
    }

    // вставка записи и получение вставленной строки
    const { data: insertedArr, error: insertError } = await supabaseClient
      .from("cards")
      .insert([{
        image_url: publicUrl,
        text: "",
        rating: 0
      }])
      .select();

    if(insertError) throw insertError;

    // insertedArr может быть массив => берем первый элемент
    const newCard = Array.isArray(insertedArr) ? insertedArr[0] : insertedArr;
    const el = buildCardElement(newCard, 0);
    grid.insertBefore(el, grid.firstChild);
    updateStatsFromDOM();
    photoInput.value = "";
  } catch (e) {
    showError("Ошибка загрузки фото или вставки записи. Проверь bucket 'photos' и права таблицы 'cards'.", e);
  }
});

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/service-worker.js').catch(()=>{/* silent */});
}

loadCards();
