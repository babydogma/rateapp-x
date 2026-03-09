/* =========================================================
   RATEAPP X — SCRIPT (SWIPE DELETE STABLE VERSION)
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
  filterBad: document.getElementById("filterBad")
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
  if(rating >= 9) return 45;
  if(rating >= 7) return 35;
  if(rating >= 5) return 25;
  if(rating >= 3) return 15;
  return 5;
}

function debounce(fn, ms){
  let t;
  return (...a)=>{
    clearTimeout(t);
    t=setTimeout(()=>fn(...a),ms);
  }
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
  .order("created_at",{ascending:false});

  if(error) throw error;
  return data;
},

async updateCard(idField,idValue,payload){
  const { error } = await supabaseClient
  .from("cards")
  .update(payload)
  .eq(idField,idValue);

  if(error) throw error;
},

async deleteCard(createdAt){
  const { error } = await supabaseClient
  .from("cards")
  .delete()
  .eq("created_at",createdAt);

  if(error) throw error;
},

async uploadPhoto(file){

  const fileName = Date.now()+"-"+file.name;

  await supabaseClient.storage
  .from("photos")
  .upload(fileName,file);

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

if(state.cards.length===0){
DOM.stats.textContent="Пока нет карточек";
return;
}

const sum = state.cards.reduce((acc,c)=>acc+(c.rating||0),0);
const avg = (sum/state.cards.length).toFixed(1);

DOM.stats.textContent =
`Средняя оценка: ${avg} • Карточек: ${state.cards.length}`;
}

function getFilteredCards(){

if(!state.ratingFilter) return state.cards;

if(state.ratingFilter==="good"){
return state.cards.filter(c=>c.rating>=7);
}

if(state.ratingFilter==="mid"){
return state.cards.filter(c=>c.rating>=4 && c.rating<7);
}

if(state.ratingFilter==="bad"){
return state.cards.filter(c=>c.rating<4);
}

return state.cards;
}

/* =========================
   CARD BUILD
========================= */

function buildCardElement(card){

const wrapper = document.createElement("div");
wrapper.className="swipe-wrapper";

const deleteBg = document.createElement("div");
deleteBg.className="delete-bg";
deleteBg.textContent="🗑";

const el = document.createElement("div");
el.className="card";

el.style.setProperty('--hue', getHue(card.rating||0));
el.style.setProperty('--rating', card.rating||0);

el.innerHTML=`

<img class="card__image" src="${card.image_url||''}">

<div class="card__content">

<textarea class="card__textarea" placeholder="Описание...">${card.text||""}</textarea>

<div class="rating">${card.rating||0}/10</div>

<input
type="range"
class="slider"
min="0"
max="10"
step="0.5"
value="${card.rating||0}"
>

<select class="category-select"></select>

<div class="created">${formatDateSimple(card.created_at)}</div>

</div>
`;

wrapper.appendChild(deleteBg);
wrapper.appendChild(el);

setupCardEvents(wrapper,el,card);

return wrapper;
}

/* =========================
   RENDER
========================= */

function renderCards(){

DOM.grid.innerHTML="";

const cards = getFilteredCards();

cards.forEach(card=>{
DOM.grid.appendChild(buildCardElement(card));
});

}

/* =========================
   CARD EVENTS
========================= */

function setupCardEvents(wrapper,el,card){

const img = el.querySelector(".card__image");
const textarea = el.querySelector(".card__textarea");
const slider = el.querySelector(".slider");
const ratingEl = el.querySelector(".rating");
const select = el.querySelector(".category-select");

/* IMAGE MODAL */

img.addEventListener("click",()=>{
if(!card.image_url) return;
DOM.modalImg.src = card.image_url;
DOM.imageModal.classList.add("active");
});

/* CATEGORY SELECT */

getCategories().forEach(c=>{

const opt = document.createElement("option");
opt.value=c.id;
opt.textContent=c.id;

if(c.id===card.category) opt.selected=true;

select.appendChild(opt);

});

/* TEXT SAVE */

textarea.addEventListener("input",
debounce(async(e)=>{

try{

await API.updateCard("created_at",card.created_at,
{ text:e.target.value });

card.text=e.target.value;

}catch{}

},600)
);

/* SLIDER */

slider.addEventListener("input",()=>{

const newRating = Number(slider.value);

ratingEl.textContent =
(newRating%1===0?
newRating.toFixed(0):
newRating.toFixed(1))
+"/10";

el.style.setProperty('--hue', getHue(newRating));
el.style.setProperty('--rating', newRating);

});

slider.addEventListener("change", async()=>{

const newRating = Number(slider.value);

try{

await API.updateCard(
"created_at",
card.created_at,
{ rating:newRating }
);

card.rating=newRating;
renderStats();

}catch{
alert("Ошибка обновления рейтинга");
}

});

/* CATEGORY CHANGE */

select.addEventListener("change", async()=>{

try{

await API.updateCard(
"created_at",
card.created_at,
{ category:select.value }
);

card.category=select.value;

}catch{
alert("Ошибка обновления категории");
}

});

/* =========================
   SWIPE DELETE
========================= */

let startX=0;
let currentX=0;
let moved=false;

wrapper.addEventListener("touchstart",(e)=>{

if(
e.target.closest("textarea")||
e.target.closest("input")||
e.target.closest("select")
){
return;
}

startX=e.touches[0].clientX;
currentX=startX;
moved=false;

});

wrapper.addEventListener("touchmove",(e)=>{

currentX=e.touches[0].clientX;

let diff=currentX-startX;

if(Math.abs(diff)>8){
moved=true;
}

if(diff<0){

const resistance = diff*0.35;

el.style.transform=`translateX(${resistance}px)`;

}

});

wrapper.addEventListener("touchend", async()=>{

if(!moved){
el.style.transform="";
return;
}

const diff=currentX-startX;

if(diff<-160){

el.classList.add("removing");

setTimeout(async()=>{

try{

await API.deleteCard(card.created_at);

state.cards = state.cards.filter(
c=>c.created_at!==card.created_at
);

renderCards();
renderStats();

}catch{

el.classList.remove("removing");
el.style.transform="";

}

},300);

}else{

el.style.transform="";

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
   NAV
========================= */

document.querySelectorAll(".nav-emoji").forEach(btn=>{

btn.addEventListener("click",()=>{

const page=btn.dataset.page;

if(page==="home") window.location.href="/index.html";
if(page==="categories") window.location.href="/categories.html";

});

});

/* =========================
   ADD CARD
========================= */

if(DOM.addBtn && DOM.photoInput){

DOM.addBtn.addEventListener("click",()=>{
DOM.photoInput.click();
});

}

if(DOM.photoInput){

DOM.photoInput.addEventListener("change", async(e)=>{

const file=e.target.files[0];
if(!file) return;

try{

const imageUrl = await API.uploadPhoto(file);

const newCard = await API.insertCard({

image_url:imageUrl,
text:"",
rating:0,
category:"Разное"

});

state.cards.unshift(newCard);

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
   MODAL CLOSE
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

const cards = await API.fetchCards();
const categoryFromUrl = getCategoryFromUrl();

state.activeCategory=categoryFromUrl;

if(categoryFromUrl){

state.cards = cards.filter(c=>c.category===categoryFromUrl);

if(DOM.stats){
DOM.stats.textContent=`Категория: ${categoryFromUrl}`;
}

}else{

state.cards = cards;

}

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
