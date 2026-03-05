/* =========================================================
   RATEAPP X — STRUCTURED SCRIPT (SAFE IMPROVED VERSION)
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
   3. CACHE
========================= */

const CACHE_KEY = "rateapp_cards_cache";

function saveCardsCache(cards){
  try{
    localStorage.setItem(CACHE_KEY, JSON.stringify(cards));
  }catch{}
}

function loadCardsCache(){
  try{
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  }catch{
    return null;
  }
}

/* =========================
   4. CATEGORIES
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

/* =========================
   5. DOM
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
  filterBad: document.getElementById("filterBad")
};

/* =========================
   6. UTILS
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
  return (...a)=>{
    clearTimeout(t);
    t=setTimeout(()=>fn(...a),ms);
  };
}

function getCategoryFromUrl(){
  const params = new URLSearchParams(window.location.search);
  return params.get("category") || localStorage.getItem("selectedCategory");
}

/* безопасный ключ карточки */

function getCardKey(card){
  return card.id ?? card.created_at;
}

function getCardField(card){
  return card.id ? "id" : "created_at";
}

/* =========================
   7. API
========================= */

const API = {

  async fetchCards(){

    const { data, error } = await supabaseClient
      .from("cards")
      .select("*")
      .order("created_at",{ascending:false});

    if(error) throw error;
    return data;
  },

  async updateCard(card, payload){

    const field = getCardField(card);
    const key = getCardKey(card);

    const { error } = await supabaseClient
      .from("cards")
      .update(payload)
      .eq(field,key);

    if(error) throw error;
  },

  async deleteCard(card){

    const field = getCardField(card);
    const key = getCardKey(card);

    const { error } = await supabaseClient
      .from("cards")
      .delete()
      .eq(field,key);

    if(error) throw error;
  },

  async uploadPhoto(file){

    const fileName = Date.now()+"-"+file.name;

    await supabaseClient.storage
      .from("photos")
      .upload(fileName,file);

    const {data} =
      supabaseClient.storage.from("photos").getPublicUrl(fileName);

    return data.publicUrl;
  },

  async insertCard(payload){

    const {data} = await supabaseClient
      .from("cards")
      .insert([payload])
      .select()
      .limit(1);

    return data[0];
  }

};

/* =========================
   8. UI
========================= */

function renderStats(){

  if(state.cards.length===0){
    DOM.stats.textContent="Пока нет карточек";
    return;
  }

  const sum=state.cards.reduce((a,c)=>a+(c.rating||0),0);
  const avg=(sum/state.cards.length).toFixed(1);

  DOM.stats.textContent=
    `Средняя оценка: ${avg} • Карточек: ${state.cards.length}`;
}

function getFilteredCards(){

  if(!state.ratingFilter) return state.cards;

  if(state.ratingFilter==="good"){
    return state.cards.filter(c=>c.rating>=7);
  }

  if(state.ratingFilter==="mid"){
    return state.cards.filter(c=>c.rating>=4&&c.rating<7);
  }

  if(state.ratingFilter==="bad"){
    return state.cards.filter(c=>c.rating<4);
  }

  return state.cards;
}

function buildCardElement(card){

  const el=document.createElement("div");
  el.className="card";
  el.style.setProperty('--hue',getHue(card.rating||0));

  el.innerHTML=`
  <img class="card__image" loading="lazy" src="${card.image_url||""}">
  <button class="card__delete">✕</button>
  <textarea class="card__textarea" placeholder="Описание">${card.text||""}</textarea>
  <div class="rating">${card.rating||0}/10</div>
  <input type="range" min="0" max="10" step="0.5" value="${card.rating||0}" class="slider">
  <select class="category-select"></select>
  <div class="created">${formatDateSimple(card.created_at)}</div>
  `;

  setupCardEvents(el,card);
  return el;
}

function renderCards(){

  DOM.grid.innerHTML="";

  const cards=getFilteredCards();

  cards.forEach(card=>{
    DOM.grid.appendChild(buildCardElement(card));
  });
}

/* =========================
   9. CARD EVENTS
========================= */

function setupCardEvents(el,card){

  const img=el.querySelector(".card__image");
  const delBtn=el.querySelector(".card__delete");
  const textarea=el.querySelector(".card__textarea");
  const slider=el.querySelector(".slider");
  const ratingEl=el.querySelector(".rating");
  const select=el.querySelector(".category-select");

  img.addEventListener("click",()=>{
    if(!card.image_url)return;
    DOM.modalImg.src=card.image_url;
    DOM.imageModal.classList.add("active");
  });

  getCategories().forEach(c=>{
    const opt=document.createElement("option");
    opt.value=c.id;
    opt.textContent=c.id;
    if(c.id===card.category)opt.selected=true;
    select.appendChild(opt);
  });

  delBtn.addEventListener("click",async()=>{

    try{

      await API.deleteCard(card);

      state.cards=
        state.cards.filter(c=>getCardKey(c)!==getCardKey(card));

      saveCardsCache(state.cards);

      renderCards();
      renderStats();

    }catch{
      alert("Ошибка удаления");
    }

  });

  textarea.addEventListener("input",
    debounce(async(e)=>{

      try{

        await API.updateCard(card,{text:e.target.value});

        card.text=e.target.value;
        saveCardsCache(state.cards);

      }catch{}

  },600));

  slider.addEventListener("input",()=>{

    const newRating=Number(slider.value);

    ratingEl.textContent=
      (newRating%1===0?newRating.toFixed(0):newRating.toFixed(1))+"/10";

    el.style.setProperty('--hue',getHue(newRating));
  });

  slider.addEventListener("change",async()=>{

    const newRating=Number(slider.value);

    try{

      await API.updateCard(card,{rating:newRating});

      card.rating=newRating;

      saveCardsCache(state.cards);

      renderStats();

    }catch{

      alert("Ошибка обновления рейтинга");

    }

  });

  select.addEventListener("change",async()=>{

    try{

      await API.updateCard(card,{category:select.value});

      card.category=select.value;
      saveCardsCache(state.cards);

    }catch{

      alert("Ошибка обновления категории");

    }

  });

}

/* =========================
   FILTERS
========================= */

function setupFilters(){

  if(DOM.filterGood){
    DOM.filterGood.onclick=()=>{
      state.ratingFilter=state.ratingFilter==="good"?null:"good";
      renderCards();
    };
  }

  if(DOM.filterMid){
    DOM.filterMid.onclick=()=>{
      state.ratingFilter=state.ratingFilter==="mid"?null:"mid";
      renderCards();
    };
  }

  if(DOM.filterBad){
    DOM.filterBad.onclick=()=>{
      state.ratingFilter=state.ratingFilter==="bad"?null:"bad";
      renderCards();
    };
  }

}

/* =========================
   PHOTO UPLOAD
========================= */

if(DOM.addBtn&&DOM.photoInput){

  DOM.addBtn.addEventListener("click",()=>{
    DOM.photoInput.click();
  });

}

if(DOM.photoInput){

  DOM.photoInput.addEventListener("change",async(e)=>{

    const file=e.target.files[0];
    if(!file)return;

    if(!file.type.startsWith("image/")){
      alert("Можно загружать только изображения");
      return;
    }

    if(file.size>8*1024*1024){
      alert("Файл слишком большой (макс 8MB)");
      return;
    }

    try{

      const imageUrl=await API.uploadPhoto(file);

      const newCard=await API.insertCard({
        image_url:imageUrl,
        text:"",
        rating:0,
        category:"Разное"
      });

      state.cards.unshift(newCard);

      saveCardsCache(state.cards);

      renderCards();
      renderStats();

      DOM.photoInput.value="";

    }catch(err){

      alert("Ошибка добавления карточки");
      console.error(err);

    }

  });

}

/* =========================
   MODAL
========================= */

if(DOM.imageModal){

  DOM.imageModal.addEventListener("click",()=>{
    DOM.imageModal.classList.remove("active");
  });

}

/* =========================
   INIT
========================= */

async function init(){

  try{

    state.loading=true;

    const cached=loadCardsCache();

    if(cached){
      state.cards=cached;
      renderCards();
      renderStats();
    }

    const cards=await API.fetchCards();

    const categoryFromUrl=getCategoryFromUrl();

    state.activeCategory=categoryFromUrl;

    if(categoryFromUrl){

      state.cards=cards.filter(c=>c.category===categoryFromUrl);

      if(DOM.stats){
        DOM.stats.textContent=`Категория: ${categoryFromUrl}`;
      }

    }else{

      state.cards=cards;

    }

    saveCardsCache(cards);

    renderCards();
    renderStats();
    setupFilters();

  }catch{

    if(DOM.stats){
      DOM.stats.textContent="Ошибка загрузки";
    }

  }finally{

    state.loading=false;

  }

}

init();
