// script.js (с поддержкой категорий)
const SUPABASE_URL = "https://qlogmylywwdbczxolidl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nVqkHQmgMKoA_F_ft7yfXQ_OWjYq7f4";

if (!window.supabase) {
  alert("Ошибка: Supabase SDK не загружен. Проверь подключение <script> в index.html");
  throw new Error("supabase lib missing");
}

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM разные для страниц:
const grid = document.getElementById("grid");
const stats = document.getElementById("stats") || document.getElementById("stats-cats");
const photoInput = document.getElementById("photoInput");
const catsRoot = document.getElementById("cats-root");

// утилиты
function showError(msg, err) {
  console.error(msg, err);
  try { if(stats) stats.textContent = "Ошибка: " + (msg || "неизвестно"); } catch(e){}
  // не показываем alert слишком часто, но можно раскомментировать
  // alert((msg || "Ошибка") + (err && err.message ? "\n\n" + err.message : ""));
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

/* ========== CATEGORY HELPERS ========== */

/**
 * Получаем distinct категории из таблицы cards и count по каждой
 * Возвращает { ok: true, data: [{category, count}, ...] } или { ok:false, error }
 */
async function getCategoriesFromDB(){
  try {
    // Если колонки category нет — Supabase вернёт ошибку, поймаем её
    const { data, error } = await supabaseClient
      .from('cards')
      .select('category, count:category', { count: 'exact' })
      .limit(0);
    // выше — просто проверка на существование столбца — но она не вернёт distinct
    // Поэтому делаем более корректный запрос ниже:
    const { data: rows, error: e2 } = await supabaseClient
      .rpc('distinct_categories_with_count') // попробуем RPC (если не существует — fallback)
      .catch(()=>null);

    // fallback: обычный select distinct
    if(!rows){
      const { data: distinct, error: err } = await supabaseClient
        .from('cards')
        .select('category, id', { count: 'exact' });

      if(err) {
        return { ok:false, error: err };
      }

      // агрегируем вручную
      const map = new Map();
      distinct.forEach(r => {
        const c = r.category || '';
        map.set(c, (map.get(c)||0) + 1);
      });
      const out = Array.from(map.entries()).map(([category, count]) => ({ category, count }));
      return { ok:true, data: out };
    } else {
      return { ok:true, data: rows };
    }
  } catch (e) {
    return { ok:false, error: e };
  }
}

/* Более универсальный вариант: SELECT DISTINCT category и подсчёт локально.
   Этот вариант безопасен и не требует дополнительной RPC/функции.
*/
async function getCategoriesSafe(){
  try {
    const { data, error } = await supabaseClient
      .from('cards')
      .select('category'); // получим все категории (может быть мало)
    if(error) return { ok:false, error };

    const map = new Map();
    data.forEach(r => {
      const c = (r.category || '').trim();
      map.set(c, (map.get(c) || 0) + 1);
    });
    const out = Array.from(map.entries())
      .filter(([cat]) => cat !== '') // убрать пустые
      .map(([category, count]) => ({ category, count }));
    return { ok:true, data: out };
  } catch (e) {
    return { ok:false, error: e };
  }
}

/* ========== STATS ========== */

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

/* ========== CARD BUILD ========== */

async function buildCardElement(card, index=0, allCategoriesList = []){
  const el = document.createElement("div");
  el.className = "card";
  el.style.animationDelay = (index * 0.07) + "s";
  el.style.boxShadow = `0 35px 60px -25px ${getGlowColor(card.rating || 0)}`;

  const createdAtRaw = card.created_at;

  // категория — если есть (вставляем селект)
  const catValue = card.category || '';

  // build innerHTML
  el.innerHTML = `
    <img src="${card.image_url || ""}">
    <div class="delete-btn">✕</div>
    <textarea placeholder="Описание">${card.text || ""}</textarea>
    <div style="display:flex;gap:8px;align-items:center;justify-content:space-between">
      <div style="flex:1"><div class="rating">${card.rating || 0}/10</div></div>
      <div style="min-width:140px">
        <select class="category-select" style="width:100%;padding:6px;border-radius:8px;background:#141415;color:#e7e3dc;border:1px solid rgba(212,175,55,0.12)">
          <option value="">— нет —</option>
          ${allCategoriesList.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
        </select>
      </div>
    </div>
    <input type="range" min="0" max="10" value="${card.rating || 0}" class="slider">
    <div class="created">${formatDateSimple(createdAtRaw)}</div>
  `;

  // установить выбранную категорию (если есть)
  try {
    const sel = el.querySelector('.category-select');
    if(sel && catValue) sel.value = catValue;
  } catch(e){/* ignore */}

  // delete
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

  // text save
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

  // category change
  const catSelect = el.querySelector('.category-select');
  if(catSelect){
    catSelect.addEventListener('change', async () => {
      const newCat = catSelect.value || null;
      try {
        const { error } = await supabaseClient
          .from('cards')
          .update({ category: newCat })
          .eq('created_at', createdAtRaw);
        if(error) throw error;
        // всё ок — обновляем статистику/UI
        updateStatsFromDOM();
      } catch (e) {
        showError("Ошибка сохранения категории:", e);
      }
    });
  }

  // slider
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

// простая экранировка для option
function escapeHtml(s){
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}

/* ========== LOAD & RENDER ========== */

/**
 * loadCards(category) - если category задана (строка), подставляет .eq('category', category)
 */
async function loadCards(category = null){
  try {
    if(stats) stats.textContent = "Загрузка...";
    let query = supabaseClient
      .from("cards")
      .select("*")
      .order("created_at", { ascending: false });

    if(category && category !== '') {
      query = query.eq("category", category);
    }

    const { data, error } = await query;
    if(error) throw error;

    if(!grid) return;
    grid.innerHTML = "";

    // получаем категории для селектов
    const catsResp = await getCategoriesSafe();
    const allCats = (catsResp.ok && Array.isArray(catsResp.data)) ? catsResp.data.map(x=>x.category) : [];

    if(!data || data.length === 0){
      updateStatsFromDOM();
      return;
    }

    data.forEach((card, i) => {
      // buildCardElement может быть асинхронной, потому что мы добавляли
      // возможность подгружать категории — используем await
      // но чтобы не ломать производительность, сразу append синхронно:
      const elPromise = buildCardElement(card, i, allCats);
      // buildCardElement возвращает элемент (или промис элемента) — поддержим оба варианта
      if(elPromise instanceof Promise){
        elPromise.then(el => grid.appendChild(el));
      } else {
        grid.appendChild(elPromise);
      }
    });

    // небольшая задержка, чтобы карточки успели вставиться и stats корректно посчитались
    setTimeout(updateStatsFromDOM, 120);
  } catch (e) {
    // если ошибка связана с отсутствием столбца category => подсказываем что сделать
    const msg = e && e.message ? e.message.toLowerCase() : '';
    if(msg.includes('column') && msg.includes('category')) {
      if(stats) stats.textContent = "Колонка `category` отсутствует в таблице cards. Выполните SQL:\nALTER TABLE public.cards ADD COLUMN IF NOT EXISTS category text;";
    } else {
      showError("Ошибка при загрузке карточек — проверь права таблицы 'cards' и подключение.", e);
    }
  }
}

/* ========== CATEGORIES PAGE ========== */

async function renderCategoriesPage(){
  if(!catsRoot) return;
  catsRoot.innerHTML = "<div style='color:#c6b27a'>Загрузка категорий...</div>";
  const resp = await getCategoriesSafe();
  if(!resp.ok){
    catsRoot.innerHTML = `<div style="color:salmon">Ошибка получения категорий: ${resp.error?.message || resp.error}</div>`;
    return;
  }
  const data = resp.data || [];
  if(data.length === 0){
    catsRoot.innerHTML = `<div style="color:#c6b27a">Категорий пока нет — назначь категории карточкам (выпадающий список на карточке).</div>`;
    return;
  }

  // список
  const list = document.createElement('div');
  list.style.display = 'grid';
  list.style.gap = '12px';

  data.forEach(item => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.padding = '12px';
    row.style.background = 'rgba(255,255,255,0.02)';
    row.style.borderRadius = '12px';

    const left = document.createElement('div');
    left.innerHTML = `<strong style="color:#d4af37">${escapeHtml(item.category)}</strong><div style="font-size:12px;color:#c6b27a">${item.count} карточек</div>`;

    const right = document.createElement('div');
    const btn = document.createElement('button');
    btn.textContent = 'Открыть';
    btn.style.background = 'transparent';
    btn.style.border = '1px solid rgba(212,175,55,0.18)';
    btn.style.color = '#d4af37';
    btn.style.padding = '8px 12px';
    btn.style.borderRadius = '8px';
    btn.style.cursor = 'pointer';

    btn.onclick = () => {
      // перейдем на главную с query param ?category=...
      const url = '/' + '?category=' + encodeURIComponent(item.category);
      location.href = url;
    };

    right.appendChild(btn);
    row.appendChild(left);
    row.appendChild(right);
    list.appendChild(row);
  });

  catsRoot.innerHTML = '';
  catsRoot.appendChild(list);
}

/* ========== UPLOAD HANDLER (без изменений логики) ========== */

if(photoInput){
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

      const newCard = Array.isArray(insertedArr) ? insertedArr[0] : insertedArr;
      if(grid){
        const catsResp = await getCategoriesSafe();
        const allCats = (catsResp.ok && Array.isArray(catsResp.data)) ? catsResp.data.map(x=>x.category) : [];
        const el = await buildCardElement(newCard, 0, allCats);
        grid.insertBefore(el, grid.firstChild);
        updateStatsFromDOM();
      }

      photoInput.value = "";
    } catch (e) {
      showError("Ошибка загрузки фото или вставки записи. Проверь bucket 'photos' и права таблицы 'cards'.", e);
    }
  });
}

/* ========== BOOT ========== */

(async function boot(){
  // если мы на странице categories.html — отрисуем список
  const pathname = location.pathname || '/';
  // если есть ?category= в query, берем
  const params = new URLSearchParams(location.search);
  const selectedCategory = params.get('category') || null;

  if(pathname.endsWith('/categories.html') || pathname.endsWith('/categories')) {
    if(stats) stats.textContent = "Загрузка категорий...";
    await renderCategoriesPage();
    if(stats) stats.textContent = "Категории";
    return;
  }

  // иначе — главная
  await loadCards(selectedCategory);
})();
