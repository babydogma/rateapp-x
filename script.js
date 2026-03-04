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
  activeCategory: null
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
  modalImg: document.getElementById("modalImg")
};

/* =========================
   5. UTILS
========================= */

function formatDateSimple(datestr){
  if(!datestr) return "";
  const d = new Date(datestr);
  if(isNaN(d)) return "";
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
}

function getHue(rating){
  return (rating / 10) * 150;
}

function debounce(fn, ms){
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(()=> fn(...a), ms);
  };
}

function getCategoryFromUrl(){
  const params = new URLSearchParams(window.location.search);
  return params.get("category");
}

/* =========================
   6. API
========================= */

const API = {

  async fetchCards(){
    const { data, error } = await supabaseClient
      .from("cards")
      .select("*")
      .order("created_at", { ascending: false });

    if(error) throw error;
    return data;
  },

  async updateCard(idField, idValue, payload){
    const { error } = await supabaseClient
      .from("cards")
      .update(payload)
      .eq(idField, idValue);

    if(error) throw error;
  },

  async deleteCard(createdAt){
    const { error } = await supabaseClient
      .from("cards")
      .delete()
      .eq("created_at", createdAt);

    if(error) throw error;
  },

  async uploadPhoto(file){
    const fileName = Date.now() + "-" + file.name;

    await supabaseClient.storage
      .from("photos")
      .upload(fileName, file);

    const { data } =
      supabaseClient.storage.from("photos").getPublicUrl(fileName);

    return data.publicUrl;
  },

  async insertCard(payload){
    const { data } = await supabaseClient
      .from("cards")
      .insert([payload])
      .select()
      .limit(1);

    return data[0];
  }

};

/* =========================
   7. UI
========================= */

function renderStats(){
  if(state.cards.length === 0){
    DOM.stats.textContent = "Пока нет карточек";
    return;
  }

  const sum = state.cards.reduce((acc,c)=> acc + (c.rating || 0), 0);
  const avg = (sum / state.cards.length).toFixed(1);

  DOM.stats.textContent =
    `Средняя оценка: ${avg} • Карточек: ${state.cards.length}`;
}

function buildCardElement(card){

  const el = document.createElement("div");
  el.className = "card";
  el.style.setProperty('--hue', getHue(card.rating || 0));

  el.innerHTML = `
    <img class="card__image" src="${card.image_url || ""}">
    <button class="card__delete">✕</button>
    <textarea class="card__textarea" placeholder="Описание">${card.text || ""}</textarea>
    <div class="rating">${card.rating || 0}/10</div>
    <input type="range" min="0" max="10" value="${card.rating || 0}" class="slider">
    <select class="category-select"></select>
    <div class="created">${formatDateSimple(card.created_at)}</div>
  `;

  setupCardEvents(el, card);
  return el;
}

function renderCards(){
  DOM.grid.innerHTML = "";
  state.cards.forEach(card=>{
    DOM.grid.appendChild(buildCardElement(card));
  });
}

/* =========================
   8. CARD EVENTS
========================= */

function setupCardEvents(el, card){

  const img = el.querySelector(".card__image");
  const delBtn = el.querySelector(".card__delete");
  const textarea = el.querySelector(".card__textarea");
  const slider = el.querySelector(".slider");
  const ratingEl = el.querySelector(".rating");
  const select = el.querySelector(".category-select");

  // ===== ОТКРЫТИЕ МОДАЛКИ =====
  img.addEventListener("click", () => {
    if (!card.image_url) return;
    DOM.modalImg.src = card.image_url;
    DOM.imageModal.classList.add("active");
  });

  getCategories().forEach(c=>{
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.id;
    if(c.id === card.category) opt.selected = true;
    select.appendChild(opt);
  });

  delBtn.addEventListener("click", async ()=>{
    try{
      await API.deleteCard(card.created_at);
      state.cards = state.cards.filter(c=>c.created_at !== card.created_at);
      renderCards();
      renderStats();
    } catch{
      alert("Ошибка удаления");
    }
  });

  textarea.addEventListener("input", debounce(async (e)=>{
    try{
      await API.updateCard("created_at", card.created_at, { text: e.target.value });
      card.text = e.target.value;
    } catch{}
  }, 600));

  slider.addEventListener("input", ()=>{
    const newRating = Number(slider.value);
    ratingEl.textContent = newRating + "/10";
    el.style.setProperty('--hue', getHue(newRating));
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

  select.addEventListener("change", async ()=>{
    try{
      await API.updateCard("created_at", card.created_at, { category: select.value });
      card.category = select.value;
    } catch{
      alert("Ошибка обновления категории");
    }
  });
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

/* ===== ЗАКРЫТИЕ МОДАЛКИ ===== */

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

  } catch{
    if(DOM.stats){
      DOM.stats.textContent = "Ошибка загрузки";
    }
  } finally{
    state.loading = false;
  }
}

init();
