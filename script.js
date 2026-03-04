const SUPABASE_URL = "https://qlogmylywwdbczxolidl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nVqkHQmgMKoA_F_ft7yfXQ_OWjYq7f4";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const grid = document.getElementById("grid");
const stats = document.getElementById("stats");
const photoInput = document.getElementById("photoInput");
const addBtn = document.getElementById("addBtn");

/* ===== ПЕРЕХОД ОТ КРАСНОГО К ИЗУМРУДУ ===== */
/* 0 → 0deg (красный)
   10 → 150deg (изумруд)
*/
function getHue(rating){
  return (rating / 10) * 150;
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
    sum += Number(ratingText.split("/")[0]) || 0;
  });

  stats.textContent =
    `Средняя оценка: ${(sum/count).toFixed(1)} • Карточек: ${count}`;
}

function buildCardElement(card){

  const el = document.createElement("div");
  el.className = "card";

  el.innerHTML = `
    <img src="${card.image_url || ""}">
    <textarea placeholder="Описание">${card.text || ""}</textarea>
    <div class="rating">${card.rating || 0}/10</div>
    <input type="range" min="0" max="10" value="${card.rating || 0}" class="slider">
    <div class="created">${new Date().toLocaleDateString()}</div>
  `;

  const slider = el.querySelector(".slider");
  const ratingEl = el.querySelector(".rating");

  function updateVisual(){

    const value = Number(slider.value);
    const percent = (value / 10) * 100;
    const hue = getHue(value);

    slider.style.setProperty("--progress", percent + "%");
    slider.style.setProperty("--hue", hue);
    el.style.setProperty("--hue", hue);

    ratingEl.textContent = value + "/10";
  }

  slider.addEventListener("input", updateVisual);

  updateVisual();

  return el;
}

/* загрузка */
async function loadCards(){

  const { data } = await supabaseClient
    .from("cards")
    .select("*")
    .order("created_at", { ascending: false });

  grid.innerHTML = "";
  data.forEach(card => {
    grid.appendChild(buildCardElement(card));
  });

  updateStatsFromDOM();
}

/* добавление */
photoInput.addEventListener("change", async (e)=>{

  const file = e.target.files[0];
  if(!file) return;

  const fileName = Date.now() + "-" + file.name;

  await supabaseClient.storage.from("photos").upload(fileName, file);

  const { data } =
    supabaseClient.storage.from("photos").getPublicUrl(fileName);

  const { data: inserted } = await supabaseClient
    .from("cards")
    .insert([{
      image_url: data.publicUrl,
      rating: 0
    }])
    .select()
    .limit(1);

  grid.prepend(buildCardElement(inserted[0]));
  updateStatsFromDOM();
});

addBtn.addEventListener("click", ()=> photoInput.click());

loadCards();
