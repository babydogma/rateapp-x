/* =========================================================
   RATEAPP X — STRUCTURED SCRIPT
========================================================= */

/* =========================
   1. CONFIG
========================= */

const SUPABASE_URL = "https://qlogmylywwdbczxolidl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nVqkHQmgMKoA_F_ft7yfXQ_OWjYq7f4";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* =========================
   2. STATE
========================= */

const state = {
  cards: [],
  loading: false,
  activeCategory: null,
  ratingFilter: null
};

/* =========================
   3. CATEGORIES
========================= */

const DEFAULT_CATEGORIES = [
  { id: "Фильм", emoji: "🎬" },
  { id: "Сериалы", emoji: "📺" },
  { id: "Еда", emoji: "🍔" },
  { id: "Семья", emoji: "👪" },
  { id: "Разное", emoji: "🔖" }
];

function getCategories(){
  const saved = localStorage.getItem("categories");
  return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
}

function saveCategories(cats){
  localStorage.setItem("categories", JSON.stringify(cats));
}

/* ===== УДАЛЕНИЕ КАТЕГОРИИ ===== */

async function deleteCategory(categoryId){

  if(categoryId === "Разное"){
    alert('Категорию "Разное" удалить нельзя');
    return;
  }

  const confirmDelete = confirm(
    `Удалить категорию "${categoryId}"?\nКарточки будут перемещены в "Разное".`
  );

  if(!confirmDelete) return;

  try{

    let categories = getCategories();
    let misc = categories.find(c => c.id === "Разное");

    if(!misc){
      misc = { id: "Разное", emoji: "🔖" };
      categories.push(misc);
      saveCategories(categories);
    }

    await supabaseClient
      .from("cards")
      .update({ category: "Разное" })
      .eq("category", categoryId);

    categories = categories.filter(c => c.id !== categoryId);
    saveCategories(categories);

    alert("Категория удалена");
    window.location.reload();

  } catch {
    alert("Ошибка удаления категории");
  }
}

/* =========================
   4. DOM
========================= */

const DOM = {
  grid: document.getElementById("grid"),
  stats: document.getElementById("stats"),
  photoInput: document.getElementById("photoInput"),
  addBtn: document.getElementById("addBtn"),
  imageModal: document.getElementById("imageModal"),
  modalImg: document.getElementById("modalImg"),
  filterGood: document.getElementById("filterGood"),
  filterMid: document.getElementById("filterMid"),
  filterBad: document.getElementById("filterBad"),
};

/* =========================
   5. API
========================= */

const API = {

  async fetchCards(){
    const { data } = await supabaseClient.from("cards").select("*").order("created_at", { ascending: false });
    return data || [];
  },

  async insertCard(card){
    const { data } = await supabaseClient.from("cards").insert(card).select();
    return data[0];
  },

  async updateCard(key, value, updates){
    await supabaseClient.from("cards").update(updates).eq(key, value);
  },

  async deleteCard(created_at){
    await supabaseClient.from("cards").delete().eq("created_at", created_at);
  },
   
  async uploadPhoto(file){
  const fileName = `${Date.now()}_${file.name}`;
  await supabaseClient.storage.from("photos").upload(fileName, file);
  const { data } = supabaseClient.storage.from("photos").getPublicUrl(fileName);
  return data.publicUrl;  // Точный фикс для v2
}

};

/* =========================
   6. UTILS
========================= */

function getHue(rating = 0){
  return (rating / 10) * 60 + 0;  // От 0 (красный) до 60 (золотой)
}

function formatDateSimple(dateStr){
  const date = new Date(dateStr);
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function getCategoryFromUrl(){
  const params = new URLSearchParams(location.search);
  return params.get("category");
}

function openUploadFromUrl(){
  const params = new URLSearchParams(location.search);
  if(params.get("openUpload") === "1"){
    DOM.photoInput.click();
  }
}

/* =========================
   7. RENDER CARDS
========================= */

function renderCards(){
  DOM.grid.innerHTML = "";

  let filtered = state.cards;

  if(state.ratingFilter === "good") filtered = filtered.filter(c => c.rating >= 8);
  if(state.ratingFilter === "mid") filtered = filtered.filter(c => c.rating >= 5 && c.rating < 8);
  if(state.ratingFilter === "bad") filtered = filtered.filter(c => c.rating < 5);

  filtered.forEach(card => {
    DOM.grid.appendChild(buildCardElement(card));
  });
}

/* =========================
   8. CARD ELEMENT
========================= */

function buildCardElement(card){

  const el = document.createElement("div");
  el.className = "card";

  el.innerHTML = `
  <div class="swipe-wrapper">
    <div class="delete-bg">Удалить</div>
    <div class="card-content">
      <img class="card__image" src="${card.image_url || ''}" alt="" onerror="this.src='https://via.placeholder.com/140x140/111/fff?text=Фото';">

      <div class="card-right-column">
        <div class="card__title" data-placeholder="Добавить название">${card.text || ""}</div>
        <div class="rating">${card.rating || 0}/10</div>
        <input type="range" class="slider" min="0" max="10" step="0.5" value="${card.rating || 0}">
        <select class="category-select"></select>
        <div class="created">${formatDateSimple(card.created_at || card.created)}</div>
      </div>
    </div>
  </div>
`;

  el.style.setProperty('--hue', getHue(card.rating));
  el.style.setProperty('--glow-strength', Math.min(card.rating / 10 * 2, 2));

  setupCardEvents(el, card);
  enableSwipeDelete(el, card);

  const titleEl = el.querySelector('.card__title');
  titleEl.addEventListener('click', () => {
    if (titleEl.querySelector('input')) return;

    const currentText = titleEl.textContent.trim() === 'Добавить название' ? '' : titleEl.textContent;
    titleEl.innerHTML = `<input type="text" value="${currentText}" placeholder="Введите название">`;
    const input = titleEl.querySelector('input');
    input.focus();

    input.addEventListener('blur', async () => {
      const newTitle = input.value.trim();
      try {
        await API.updateCard("created_at", card.created_at, { text: newTitle });
        card.text = newTitle;
        titleEl.textContent = newTitle || 'Добавить название';
      } catch {
        alert("Ошибка сохранения названия");
      }
    });
  });

  return el;
}

/* =========================
   9. CARD EVENTS
========================= */

function setupCardEvents(el, card){

  const img = el.querySelector(".card__image");
  img.onclick = () => {
    DOM.modalImg.src = card.image_url;
    DOM.imageModal.classList.add("active");
  };

  const slider = el.querySelector(".slider");
  const rating = el.querySelector(".rating");

  slider.addEventListener("input", (e)=>{
    const val = Number(e.target.value);
    rating.textContent = `${val}/10`;
    el.style.setProperty('--hue', getHue(val));
    el.style.setProperty('--glow-strength', Math.min(val / 10 * 2, 2));
  });

  slider.addEventListener("change", async ()=>{
    const newRating = Number(slider.value);
    try{
      await API.updateCard("created_at", card.created_at, { rating: newRating });
      card.rating = newRating;
      renderStats();
    } catch{
      alert("Ошибка обновления рейтинга");
    }
  });

  const categorySelect = el.querySelector(".category-select");

  getCategories().forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = cat.id;
    categorySelect.appendChild(opt);
  });

  categorySelect.value = card.category || "Разное";

  categorySelect.addEventListener("change", async (e)=>{
    const newCat = e.target.value;
    try{
      await API.updateCard("created_at", card.created_at, { category: newCat });
      card.category = newCat;
      if(state.activeCategory && state.activeCategory !== newCat){
        state.cards = state.cards.filter(c => c.created_at !== card.created_at);
        renderCards();
        renderStats();
      }
    } catch{
      alert("Ошибка смены категории");
    }
  });

}

/* =========================
   10. STATS
========================= */

function calculateAvgRating(){
  if(!state.cards.length) return "0.0";
  const sum = state.cards.reduce((acc, c) => acc + (c.rating || 0), 0);
  return (sum / state.cards.length).toFixed(1);
}

function renderStats(){
  DOM.stats.textContent = `Средняя оценка: ${calculateAvgRating()} • Карточек: ${state.cards.length}`;
}

/* =========================
   11. FILTERS
========================= */

function setupFilters(){
  if(DOM.filterGood){
    DOM.filterGood.onclick = () => {
      state.ratingFilter = state.ratingFilter === "good" ? null : "good";
      DOM.filterGood.classList.toggle("active");
      renderCards();
    };
  }

  if(DOM.filterMid){
    DOM.filterMid.onclick = () => {
      state.ratingFilter = state.ratingFilter === "mid" ? null : "mid";
      DOM.filterMid.classList.toggle("active");
      renderCards();
    };
  }

  if(DOM.filterBad){
    DOM.filterBad.onclick = () => {
      state.ratingFilter = state.ratingFilter === "bad" ? null : "bad";
      DOM.filterBad.classList.toggle("active");
      renderCards();
    };
  }
}

/* =========================
   NAVIGATION
========================= */

document.querySelectorAll(".nav-emoji").forEach(btn => {
  btn.addEventListener("click", () => {
    const page = btn.dataset.page;
    if(page === "home") window.location.href = "/index.html";
    if(page === "categories") window.location.href = "/categories.html";
  });
});

if (DOM.addBtn && DOM.photoInput) {
  DOM.addBtn.addEventListener("click", () => {
    DOM.photoInput.click();
  });
}

if (DOM.photoInput) {
  DOM.photoInput.addEventListener("change", async (e) => {

    const file = e.target.files[0];
    if (!file) return;

    try {

      const imageUrl = await API.uploadPhoto(file);

      const newCard = await API.insertCard({
        image_url: imageUrl,
        text: "",
        rating: 0,
        category: "Разное"
      });

      state.cards.unshift(newCard);
      renderCards();
      renderStats();

      DOM.photoInput.value = "";

    } catch (err) {
      alert("Ошибка добавления карточки");
      console.error(err);
    }

  });
}

if (DOM.imageModal) {
  DOM.imageModal.addEventListener("click", () => {
    DOM.imageModal.classList.remove("active");
  });
}

/* =========================
   INIT
========================= */

async function init(){

  try{
    state.loading = true;

    const cards = await API.fetchCards();
    const categoryFromUrl = getCategoryFromUrl();

    state.activeCategory = categoryFromUrl;

    if(categoryFromUrl){
      state.cards = cards.filter(c => c.category === categoryFromUrl);
      if(DOM.stats){
        DOM.stats.textContent = `Категория: ${categoryFromUrl}`;
      }
    } else {
      state.cards = cards;
    }

    renderCards();
    renderStats();
    setupFilters();

  } catch{
    if(DOM.stats){
      DOM.stats.textContent = "Ошибка загрузки";
    }
  } finally{
    state.loading = false;
  }
}

init();

/* =========================
   SWIPE DELETE
========================= */

function enableSwipeDelete(wrapperEl, card) {
  const cardEl = wrapperEl.querySelector('.card-content');
  let startX = 0;
  let currentX = 0;
  let isDragging = false;
  const threshold = 50;  // Порог для удаления (px)

  // Игнорируем свайп, если touch на интерактивных элементах
  function shouldIgnoreTouch(target) {
    return target.closest('textarea, input, select, button');
  }

  wrapperEl.addEventListener('touchstart', (e) => {
    if (shouldIgnoreTouch(e.target)) return;
    startX = e.touches[0].clientX;
    isDragging = true;
    cardEl.style.transition = 'none';  // Отключаем transition для плавного drag
  });

  wrapperEl.addEventListener('touchmove', (e) => {
    if (!isDragging || shouldIgnoreTouch(e.target)) return;
    currentX = e.touches[0].clientX - startX;
    if (currentX < 0) {  // Только влево
      cardEl.style.transform = `translateX(${currentX}px)`;
    }
  });

  wrapperEl.addEventListener('touchend', async () => {
    if (!isDragging) return;
    isDragging = false;
    cardEl.style.transition = 'transform 0.25s ease';  // Включаем обратно

    if (currentX < -threshold) {
      // Подтверждение (опционально: убери confirm для instant-delete)
      if (confirm('Удалить карточку?')) {
        try {
          await API.deleteCard(card.created_at);
          cardEl.classList.add('removing');
          setTimeout(() => {
            state.cards = state.cards.filter(c => c.created_at !== card.created_at);
            renderCards();
            renderStats();
          }, 350);  // Ждем анимацию
        } catch {
          alert('Ошибка удаления');
        }
      } else {
        // Откат свайпа
        cardEl.style.transform = 'translateX(0)';
      }
    } else {
      // Откат свайпа
      cardEl.style.transform = 'translateX(0)';
    }
    currentX = 0;
  });
}
