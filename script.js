// script.js
const SUPABASE_URL = "https://qlogmylywwdbczxolidl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nVqkHQmgMKoA_F_ft7yfXQ_OWjYq7f4";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const grid = document.getElementById("grid");
const stats = document.getElementById("stats");
const photoInput = document.getElementById("photoInput");

function formatDateSimple(datestr){
  if(!datestr) return "";
  const d = new Date(datestr);
  if(isNaN(d)) return "";
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = d.getFullYear();
  return `${dd}.${mm}.${yy}`;
}
function getGlowColor(r){ const hue = 10 + (r*4); return `hsl(${hue},80%,55%)`; }
function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

function getCategoryFromUrl(){
  try{ const p = new URLSearchParams(location.search); return p.get("category") || null; }catch(e){ return null; }
}

function updateStatsFromDOM(){
  if(!stats) return;
  const cards = grid ? qsa(".card", grid) : [];
  const count = cards.length;
  if(count === 0){ stats.textContent = "Пока нет карточек"; return; }
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
  el.style.animationDelay = (index*0.06)+"s";
  el.style.boxShadow = `0 35px 60px -25px ${getGlowColor(card.rating||0)}`;
  const createdAtRaw = card.created_at;
  const categoryVal = card.category || "Разное";

  el.innerHTML = `
    <img src="${card.image_url || ''}" alt="">
    <div class="delete-btn" title="Удалить">✕</div>
    <textarea placeholder="Описание">${card.text || ""}</textarea>
    <div class="rating">${card.rating || 0}/10</div>
    <input type="range" min="0" max="10" value="${card.rating || 0}" class="slider">
    <select class="category-select">
      <option>Фильм</option><option>Сериалы</option><option>Еда</option><option>Семья</option><option>Разное</option>
    </select>
    <div class="created">${formatDateSimple(createdAtRaw)}</div>
  `;

  const sel = el.querySelector(".category-select");
  sel.value = categoryVal;

  el.querySelector(".delete-btn").onclick = async () => {
    if(!createdAtRaw){ alert("Ошибка удаления: id не найден"); return; }
    const { error: delError } = await supabaseClient.from("cards").delete().eq("created_at", createdAtRaw);
    if(delError){ console.error(delError); alert("Ошибка удаления: "+(delError.message || delError)); return; }
    el.classList.add("fade-out");
    setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); updateStatsFromDOM(); }, 260);
  };

  el.querySelector("textarea").oninput = debounce(async (e)=>{
    const txt = e.target.value;
    if(!createdAtRaw) return;
    const { error } = await supabaseClient.from("cards").update({ text: txt }).eq("created_at", createdAtRaw);
    if(error) console.error("Ошибка обновления текста:", error);
  },700);

  const slider = el.querySelector(".slider");
  const ratingEl = el.querySelector(".rating");
  slider.addEventListener("input", ()=> {
    ratingEl.textContent = slider.value + "/10";
    el.style.boxShadow = `0 35px 60px -25px ${getGlowColor(Number(slider.value))}`;
  });
  slider.addEventListener("change", async ()=>{
    const newRating = Number(slider.value);
    const prev = Number(ratingEl.textContent.split("/")[0]) || 0;
    ratingEl.textContent = newRating + "/10";
    updateStatsFromDOM();
    if(!createdAtRaw){ alert("Ошибка обновления рейтинга: id не найден"); return; }
    const { error: updateError } = await supabaseClient.from("cards").update({ rating: newRating }).eq("created_at", createdAtRaw);
    if(updateError){
      console.error(updateError);
      ratingEl.textContent = prev + "/10";
      el.style.boxShadow = `0 35px 60px -25px ${getGlowColor(prev)}`;
      updateStatsFromDOM();
      alert("Ошибка обновления рейтинга: " + (updateError.message || updateError));
      return;
    }
  });

  sel.addEventListener("change", async ()=>{
    const newCat = sel.value;
    if(!createdAtRaw) return;
    const { error } = await supabaseClient.from("cards").update({ category: newCat }).eq("created_at", createdAtRaw);
    if(error){ console.error("Ошибка обновления категории:", error); alert("Ошибка обновления категории"); }
  });

  return el;
}

async function loadCards(){
  if(!grid) return;
  stats.textContent = "Загрузка...";
  try{
    const { data, error } = await supabaseClient.from("cards").select("*").order("created_at",{ascending:false});
    if(error){ console.error(error); stats.textContent = "Ошибка загрузки"; return; }
    let cards = Array.isArray(data) ? data : [];
    const cat = getCategoryFromUrl();
    if(cat) cards = cards.filter(c => (c.category || "Разное") === cat);
    grid.innerHTML = "";
    if(!cards.length){ updateStatsFromDOM(); return; }
    cards.forEach((c,i)=> grid.appendChild(buildCardElement(c,i)));
    updateStatsFromDOM();
  }catch(e){
    console.error(e); stats.textContent = "Ошибка загрузки";
  }
}

if(photoInput){
  photoInput.addEventListener("change", async (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const fileName = Date.now() + "-" + file.name.replace(/\s+/g,"_");
    const { error: uploadError } = await supabaseClient.storage.from("photos").upload(fileName, file);
    if(uploadError){ console.error(uploadError); alert("Ошибка загрузки"); return; }
    const { data } = supabaseClient.storage.from("photos").getPublicUrl(fileName);
    const publicUrl = data.publicUrl;
    const { data: inserted, error: insertError } = await supabaseClient.from("cards").insert([{ image_url: publicUrl, text:"", rating:0, category:"Разное" }]).select().limit(1);
    if(insertError){ console.error(insertError); alert("Ошибка записи в БД"); return; }
    const newCard = Array.isArray(inserted) ? inserted[0] : inserted;
    if(grid && newCard){
      const el = buildCardElement(newCard, 0);
      grid.insertBefore(el, grid.firstChild);
      updateStatsFromDOM();
    }
    photoInput.value = "";
  });
}

function debounce(fn, ms){
  let t;
  return (...a)=>{ clearTimeout(t); t = setTimeout(()=>fn(...a), ms); };
}

if('serviceWorker' in navigator){
  navigator.serviceWorker && navigator.serviceWorker.register('/service-worker.js').catch(()=>{/* silent */});
}

/* init — запускаем loadCards если на главной */
(function init(){
  const path = location.pathname || "";
  const isCategories = path.includes("categories");
  if(!isCategories){
    // index-like page
    loadCards();
  }else{
    // categories page — статистику можно оставить "Загрузка..." или убрать
    if(stats) stats.textContent = "";
  }
})();
