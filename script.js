/* =========================================================
   RATEAPP X — STRUCTURED SCRIPT
========================================================= */

/* =========================
   1. CONFIG
========================= */

const SUPABASE_URL = "https://qlogmylywwdbczxolidl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nVqkHQmgMKoA_F_ft7yfXQ_OWjYq7f4";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

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
   3. DOM
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
   UTILS
========================= */

function formatDateSimple(datestr){
  if(!datestr) return "";

  const d = new Date(datestr);

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

/* =========================
   API
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

    const { data, error } = await supabaseClient
      .from("cards")
      .update(payload)
      .eq(idField,idValue)
      .select();

    if(error){
      console.error("Supabase update error:",error);
      throw error;
    }

    return data;

  },

  async deleteCard(createdAt){

    const { error } = await supabaseClient
      .from("cards")
      .delete()
      .eq("created_at",createdAt);

    if(error) throw error;

  },

  async uploadPhoto(file){

    const fileName =
      Date.now() + "-" + file.name.replace(/\s/g,"");

    const { error } = await supabaseClient
      .storage
      .from("photos")
      .upload(fileName,file,{
        cacheControl:"3600",
        upsert:false
      });

    if(error){
      console.error("Upload error:",error);
      throw error;
    }

    const { data } = supabaseClient
      .storage
      .from("photos")
      .getPublicUrl(fileName);

    return data.publicUrl;

  },

  async insertCard(payload){

    const { data, error } = await supabaseClient
      .from("cards")
      .insert([payload])
      .select()
      .limit(1);

    if(error){
      console.error("Insert error:",error);
      throw error;
    }

    return data[0];

  }

};

/* =========================
   STATS
========================= */

function renderStats(){

  if(!DOM.stats) return;

  if(state.cards.length===0){
    DOM.stats.textContent="Пока нет карточек";
    return;
  }

  const sum =
    state.cards.reduce(
      (acc,c)=>acc+(c.rating||0),
      0
    );

  const avg =
    (sum/state.cards.length).toFixed(1);

  DOM.stats.textContent =
    `⭐ ${avg} average • ${state.cards.length} cards`;

}

/* =========================
   CARDS
========================= */

function buildCardElement(card){

  const el = document.createElement("div");

  el.className="card";

  el.style.setProperty('--hue',getHue(card.rating||0));

  el.innerHTML=`

<img class="card__image" src="${card.image_url||""}">

<button class="card__delete">✕</button>

<textarea class="card__textarea">${card.text||""}</textarea>

<div class="rating">${card.rating||0}/10</div>

<input type="range"
min="0"
max="10"
step="0.5"
value="${card.rating||0}"
class="slider">

`;

  setupCardEvents(el,card);

  return el;

}

function renderCards(){

  if(!DOM.grid) return;

  DOM.grid.innerHTML="";

  state.cards.forEach(card=>{
    DOM.grid.appendChild(
      buildCardElement(card)
    );
  });

}

/* =========================
   CARD EVENTS
========================= */

function setupCardEvents(el,card){

  const slider =
    el.querySelector(".slider");

  const ratingEl =
    el.querySelector(".rating");

  const textarea =
    el.querySelector(".card__textarea");

  const delBtn =
    el.querySelector(".card__delete");

  slider.addEventListener("input",()=>{

    const v=Number(slider.value);

    ratingEl.textContent=
      (v%1===0?v.toFixed(0):v.toFixed(1))+"/10";

    el.style.setProperty('--hue',getHue(v));

  });

  slider.addEventListener("change",async()=>{

    const v=Number(slider.value);

    try{

      await API.updateCard(
        "created_at",
        card.created_at,
        {rating:v}
      );

      card.rating=v;

      renderStats();

    }catch(e){

      alert("Ошибка обновления рейтинга");

      console.error(e);

    }

  });

  textarea.addEventListener(
    "input",
    debounce(async(e)=>{

      try{

        await API.updateCard(
          "created_at",
          card.created_at,
          {text:e.target.value}
        );

        card.text=e.target.value;

      }catch{}

    },600)
  );

  delBtn.addEventListener("click",async()=>{

    try{

      await API.deleteCard(card.created_at);

      state.cards =
        state.cards.filter(
          c=>c.created_at!==card.created_at
        );

      renderCards();

      renderStats();

    }catch{

      alert("Ошибка удаления");

    }

  });

}

/* =========================
   ADD PHOTO
========================= */

if(DOM.addBtn && DOM.photoInput){

  DOM.addBtn.onclick=()=>{
    DOM.photoInput.click();
  };

}

if(DOM.photoInput){

  DOM.photoInput.addEventListener(
    "change",
    async(e)=>{

      const file=e.target.files[0];

      if(!file) return;

      try{

        const imageUrl =
          await API.uploadPhoto(file);

        const newCard =
          await API.insertCard({

            image_url:imageUrl,
            text:"",
            rating:0,
            category:"Разное"

          });

        state.cards.unshift(newCard);

        renderCards();
        renderStats();

      }catch(err){

        alert("Ошибка добавления карточки");

        console.error(err);

      }

      DOM.photoInput.value="";

    }
  );

}

/* =========================
   INIT
========================= */

async function init(){

  try{

    const cards =
      await API.fetchCards();

    state.cards=cards;

    renderCards();

    renderStats();

  }catch{

    if(DOM.stats)
      DOM.stats.textContent="Ошибка загрузки";

  }

}

init();
