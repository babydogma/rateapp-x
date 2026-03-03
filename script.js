// Supabase settings (оставь)
const SUPABASE_URL = "https://qlogmylywwdbczxolidl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nVqkHQmgMKoA_F_ft7yfXQ_OWjYq7f4";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* DOM */
const grid = document.getElementById("grid");
const stats = document.getElementById("stats");
const photoInput = document.getElementById("photoInput");

/* helpers */
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

/* update stats from DOM */
function updateStatsFromDOM(){
  const cards = Array.from(grid.querySelectorAll(".card"));
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

/* build card element */
function buildCardElement(card, index=0){
  const el = document.createElement("div");
  el.className = "card";
  el.style.animationDelay = (index*0.06) + "s";

  // template: left media, right side
  el.innerHTML = `
    <div class="card-inner">
      <div class="card-media">
        <img src="${card.image_url || ''}" alt="">
        <div class="title-card">${card.text || ''}</div>
      </div>
      <div class="card-side">
        <div class="mini-media" style="width:100%;height:90px;border-radius:12px;background:#0f0f0f;overflow:hidden">
          ${card.preview_html ? card.preview_html : ''}
        </div>
        <div style="width:100%;text-align:center" class="rating">${card.rating || 0}/10</div>
        <input type="range" min="0" max="10" value="${card.rating||0}" class="slider">
      </div>
    </div>

    <select class="select" aria-label="Категория">
      <option value="Фильм">Фильм</option>
      <option value="Сериалы">Сериалы</option>
      <option value="Еда">Еда</option>
      <option value="Семья">Семья</option>
      <option value="Разное">Разное</option>
    </select>

    <div class="created">${formatDateSimple(card.created_at)}</div>
    <div class="delete-btn">✕</div>
  `;

  // set select to current value
  const sel = el.querySelector(".select");
  sel.value = card.category || "Разное";

  // delete
  const createdRaw = card.created_at;
  el.querySelector(".delete-btn").addEventListener("click", async () => {
    if(!createdRaw) { alert("Ошибка удаления: id не найден"); return; }
    const { error } = await supabaseClient.from("cards").delete().eq("created_at", createdRaw);
    if(error){ console.error(error); alert("Ошибка удаления: " + error.message); return; }
    // анимация и удаление из DOM
    el.style.transition = "opacity .25s ease, transform .25s ease";
    el.style.opacity = 0; el.style.transform = "translateY(10px)";
    setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); updateStatsFromDOM(); }, 260);
  });

  // slider change (optimistic UI)
  const slider = el.querySelector(".slider");
  const ratingEl = el.querySelector(".rating");
  slider.addEventListener("change", async () => {
    const prev = Number(ratingEl.textContent.split("/")[0]) || 0;
    const newRating = Number(slider.value);
    ratingEl.textContent = newRating + "/10";
    el.style.boxShadow = `0 35px 60px -25px ${getGlowColor(newRating)}`;
    updateStatsFromDOM();
    const { error } = await supabaseClient.from("cards").update({ rating:newRating }).eq("created_at", createdRaw);
    if(error){ console.error(error); ratingEl.textContent = prev + "/10"; el.style.boxShadow = `0 35px 60px -25px ${getGlowColor(prev)}`; updateStatsFromDOM(); alert("Ошибка: " + error.message); }
  });

  // category change
  sel.addEventListener("change", async () => {
    const newCat = sel.value;
    const { error } = await supabaseClient.from("cards").update({ category:newCat }).eq("created_at", createdRaw);
    if(error){ console.error(error); alert("Ошибка сохранения категории: " + error.message); }
  });

  return el;
}

/* load and render */
async function loadCards(){
  const { data, error } = await supabaseClient.from("cards").select("*").order("created_at",{ascending:false});
  if(error){ console.error(error); stats.textContent="Ошибка загрузки"; return; }
  grid.innerHTML = "";
  if(!data || data.length===0){ updateStatsFromDOM(); return; }
  data.forEach((card,i)=>{ grid.appendChild(buildCardElement(card,i)); });
  updateStatsFromDOM();
}

/* upload image -> insert card */
photoInput.addEventListener("change", async (e) => {
  const file = e.target.files[0]; if(!file) return;
  const fileName = Date.now() + "-" + file.name;
  const { error:uploadError } = await supabaseClient.storage.from("photos").upload(fileName,file);
  if(uploadError){ console.error(uploadError); alert("Ошибка загрузки"); return; }
  const { data } = supabaseClient.storage.from("photos").getPublicUrl(fileName);
  const publicUrl = data.publicUrl;
  // insert with default category Разное
  const { data:inserted, error:insertError } = await supabaseClient.from("cards").insert([{ image_url:publicUrl, text:"", rating:0, category:"Разное" }]).select().limit(1);
  if(insertError){ console.error(insertError); alert("Ошибка записи"); return; }
  const newCard = Array.isArray(inserted)?inserted[0]:inserted;
  const el = buildCardElement(newCard,0);
  grid.insertBefore(el, grid.firstChild);
  updateStatsFromDOM();
  photoInput.value="";
});

/* register service worker gracefully */
if('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(()=>{});

/* init */
loadCards();

/* client navigation: simple hash handling for categories page */
document.getElementById("nav-cats")?.addEventListener("click", ()=>{ location.href = "/categories.html"; });
document.getElementById("nav-home")?.addEventListener("click", ()=>{ location.href = "/"; });
