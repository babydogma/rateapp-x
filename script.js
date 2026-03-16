/* =========================================================
   RATEAPP X — CLEAN SCRIPT
========================================================= */

/* =========================
   CONFIG
========================= */

const SUPABASE_URL = "https://qlogmylywwdbczxolidl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nVqkHQmgMKoA_F_ft7yfXQ_OWjYq7f4";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* =========================
   STATE
========================= */

const state = {
  cards: [],
  ratingFilter: null,
  activeCategory: null
};

/* =========================
   DOM
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
   API
========================= */

const API = {

  async fetchCards(){
    const { data } = await supabaseClient
      .from("cards")
      .select("*")
      .order("created_at", { ascending:false });

    return data || [];
  },

  async insertCard(card){
    const { data } = await supabaseClient
      .from("cards")
      .insert(card)
      .select();

    return data[0];
  },

  async updateCard(key,value,updates){
    await supabaseClient
      .from("cards")
      .update(updates)
      .eq(key,value);
  },

  async deleteCard(id){
    await supabaseClient
      .from("cards")
      .delete()
      .eq("created_at",id);
  },

  async uploadPhoto(file){

  const img = new Image();
  const reader = new FileReader();

  const dataURL = await new Promise(resolve=>{
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(file);
  });

  img.src = dataURL;

  await new Promise(resolve=>{
    img.onload = resolve;
  });

  const size = 512;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  const min = Math.min(img.width, img.height);

  const sx = (img.width - min)/2;
  const sy = (img.height - min)/2;

  ctx.drawImage(
    img,
    sx,
    sy,
    min,
    min,
    0,
    0,
    size,
    size
  );

  const blob = await new Promise(resolve=>{
    canvas.toBlob(resolve,"image/jpeg",0.85);
  });

  const fileName = `${Date.now()}.jpg`;

  await supabaseClient
    .storage
    .from("photos")
    .upload(fileName,blob);

  const { data } =
    supabaseClient
      .storage
      .from("photos")
      .getPublicUrl(fileName);

  return data.publicUrl;
}

/* =========================
   UTILS
========================= */

function getHue(rating=0){
  return (rating/10)*60;
}

function formatDate(dateStr){
  if(!dateStr) return "";

  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2,"0");
  const month = String(d.getMonth()+1).padStart(2,"0");
  const year = String(d.getFullYear()).slice(-2);

  return `${day}.${month}.${year}`;
}

/* =========================
   STATS
========================= */

function renderStats(){

  if(!state.cards.length){
    DOM.stats.textContent = "Карточек: 0";
    return;
  }

  const avg = (
    state.cards.reduce((s,c)=>s+(c.rating||0),0)
    / state.cards.length
  ).toFixed(1);

  DOM.stats.textContent =
    `Средняя оценка: ${avg} • Карточек: ${state.cards.length}`;
}

/* =========================
   RENDER CARDS
========================= */

function renderCards(){

  DOM.grid.innerHTML="";

  let cards = state.cards;

  if(state.ratingFilter==="good")
    cards = cards.filter(c=>c.rating>=8);

  if(state.ratingFilter==="mid")
    cards = cards.filter(c=>c.rating>=5 && c.rating<8);

  if(state.ratingFilter==="bad")
    cards = cards.filter(c=>c.rating<5);

  cards.forEach(card=>{
    DOM.grid.appendChild(buildCard(card));
  });

}

/* =========================
   BUILD CARD
========================= */

function buildCard(card){

  const el = document.createElement("div");
  el.className="card";

  el.innerHTML=`

  <div class="delete-bg">Удалить</div>

  <div class="card-content">

    <img
      class="card__image"
      src="${card.image_url||''}"
      onerror="this.src='https://via.placeholder.com/140x140/111/fff?text=Фото';"
    >

    <div class="card-right-column">

      <div class="card__title"
      data-placeholder="Добавить название">
      ${card.text||""}
      </div>

      <button class="card-more-btn">
      Подробнее
      </button>

      <div class="rating">
      ${card.rating||0}/10
      </div>

      <input
        type="range"
        class="slider"
        min="0"
        max="10"
        step="0.5"
        value="${card.rating||0}"
      >

      <select class="category-select">
        <option>Разное</option>
        <option>Еда</option>
        <option>Фильм</option>
        <option>Сериалы</option>
        <option>Семья</option>
      </select>

      <div class="created">
        ${formatDate(card.created_at)}
      </div>

    </div>

  </div>
  `;

  el.style.setProperty("--hue",getHue(card.rating));

  setupCardEvents(el,card);
  enableSwipeDelete(el,card);

  return el;
}

/* =========================
   CARD EVENTS
========================= */

function setupCardEvents(el,card){

  const img = el.querySelector(".card__image");
  const slider = el.querySelector(".slider");
  const rating = el.querySelector(".rating");
  const title = el.querySelector(".card__title");
  const more = el.querySelector(".card-more-btn");

  img.onclick=()=>{
    DOM.modalImg.src=card.image_url;
    DOM.imageModal.classList.add("active");
  };

  slider.addEventListener("input",(e)=>{
    const val=Number(e.target.value);
    rating.textContent=`${val}/10`;
    el.style.setProperty("--hue",getHue(val));
  });

  slider.addEventListener("change",async()=>{
    const val=Number(slider.value);

    await API.updateCard(
      "created_at",
      card.created_at,
      {rating:val}
    );

    card.rating=val;
    renderStats();
  });

  title.onclick=()=>{

    if(title.querySelector("input")) return;

    const current=title.textContent.trim();

    title.innerHTML=
      `<input type="text" value="${current}" placeholder="Введите название">`;

    const input=title.querySelector("input");

    input.focus();

    input.onblur=async()=>{

      const newTitle=input.value.trim();

      await API.updateCard(
        "created_at",
        card.created_at,
        {text:newTitle}
      );

      card.text=newTitle;
      title.textContent=newTitle||"Добавить название";
    };

  };

  if(more){

    more.onclick=()=>{

      const modal =
        document.getElementById("descriptionModal");

      const input =
        document.getElementById("descriptionInput");

      const save =
        document.getElementById("saveDescription");

      input.value = card.description||"";

      modal.classList.add("active");

      save.onclick = async()=>{

        const text=input.value.trim();

        await API.updateCard(
          "created_at",
          card.created_at,
          {description:text}
        );

        card.description=text;
        modal.classList.remove("active");
      };
      
      const category = el.querySelector(".category-select");

category.value = card.category || "Разное";

category.addEventListener("change", async()=>{

  const value = category.value;

  await API.updateCard(
    "created_at",
    card.created_at,
    { category:value }
  );

  card.category = value;

});

    };

  }

}

/* =========================
   SWIPE DELETE
========================= */

function enableSwipeDelete(cardEl,card){

  let startX=0;
  let diff=0;

  cardEl.addEventListener("touchstart",(e)=>{
    startX=e.touches[0].clientX;
  });

  cardEl.addEventListener("touchmove",(e)=>{

    diff=e.touches[0].clientX-startX;

    if(diff<0){
      cardEl.style.transform=
        `translateX(${diff}px)`;
    }

  });

  cardEl.addEventListener("touchend",async()=>{

    if(diff<-120){

      if(confirm("Удалить карточку?")){

        await API.deleteCard(card.created_at);

        state.cards=
          state.cards.filter(
            c=>c.created_at!==card.created_at
          );

        renderCards();
        renderStats();
      }

    }

    cardEl.style.transform="";
    diff=0;

  });

}

/* =========================
   ADD CARD
========================= */

if(DOM.addBtn){

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

      const url = await API.uploadPhoto(file);

      const newCard = await API.insertCard({
        image_url:url,
        text:"",
        rating:0,
        category:"Разное"
      });

      state.cards.unshift(newCard);

      renderCards();
      renderStats();

      DOM.photoInput.value="";
    }
  );

}

/* =========================
   IMAGE MODAL
========================= */

if(DOM.imageModal){

  DOM.imageModal.onclick=()=>{
    DOM.imageModal.classList.remove("active");
  };

}

/* =========================
   FILTERS
========================= */

function setupFilters(){

  DOM.filterGood?.addEventListener(
    "click",
    ()=>{
      state.ratingFilter =
        state.ratingFilter==="good"
        ? null
        : "good";

      renderCards();
    }
  );

  DOM.filterMid?.addEventListener(
    "click",
    ()=>{
      state.ratingFilter =
        state.ratingFilter==="mid"
        ? null
        : "mid";

      renderCards();
    }
  );

  DOM.filterBad?.addEventListener(
    "click",
    ()=>{
      state.ratingFilter =
        state.ratingFilter==="bad"
        ? null
        : "bad";

      renderCards();
    }
  );

}

/* =========================
   INIT
========================= */

async function init(){

  const cards = await API.fetchCards();

  state.cards = cards;

  renderCards();
  renderStats();
  setupFilters();
}

init();

document.querySelectorAll(".nav-emoji").forEach(btn=>{

  btn.addEventListener("click",()=>{

    const page = btn.dataset.page;

    if(page==="categories"){
      window.location.href = "/categories.html";
    }

    if(page==="home"){
      window.location.href = "/";
    }

  });

});
