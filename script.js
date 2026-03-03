// script.js — shared logic for index.html
// Supabase init
const SUPABASE_URL = "https://qlogmylywwdbczxolidl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nVqkHQmgMKoA_F_ft7yfXQ_OWjYq7f4";
const supabase = window.supabase;
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// categories list (id used for hash / internal)
const CATEGORIES = [
  { id: 'film', label: 'Фильм', emoji: '🎬' },
  { id: 'series', label: 'Сериалы', emoji: '📺' },
  { id: 'food', label: 'Еда', emoji: '🍔' },
  { id: 'family', label: 'Семья', emoji: '👪' },
  { id: 'other', label: 'Разное', emoji: '🏷️' }
];

const grid = document.getElementById('grid');
const stats = document.getElementById('stats');
const photoInput = document.getElementById('photoInput');
const navCats = document.getElementById('nav-cats');
const navHome = document.getElementById('nav-home');

// small helper
function formatDate(datestr){
  if(!datestr) return "";
  const d = new Date(datestr);
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yy = d.getFullYear();
  return `${dd}.${mm}.${yy}`;
}
function glowColor(r){ const hue = 10 + (r*4); return `hsl(${hue},80%,50%)` }

// build select options (reusable)
function makeCategorySelect(currentId){
  const sel = document.createElement('select');
  sel.className = 'select-cat';
  CATEGORIES.forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.label;
    if(c.id === currentId) opt.selected = true;
    sel.appendChild(opt);
  });
  return sel;
}

// update top stats from DOM (local)
function updateStatsFromDOM(){
  const cards = Array.from(grid.querySelectorAll('.card'));
  const count = cards.length;
  if(count === 0){
    stats.textContent = "Пока нет карточек";
    return;
  }
  let sum = 0;
  cards.forEach(c=>{
    const r = Number((c.querySelector('.rating')?.textContent || "0/10").split('/')[0]) || 0;
    sum += r;
  });
  stats.textContent = `Средняя оценка: ${(sum/count).toFixed(1)} • Карточек: ${count}`;
}

// create one card element
function createCardElement(card){
  const el = document.createElement('article');
  el.className = 'card';

  el.innerHTML = `
    <button class="delete-btn" title="Удалить">✕</button>
    <img src="${card.image_url||''}" alt="">
    <textarea placeholder="Описание">${card.text || ''}</textarea>
    <div class="rating">${card.rating || 0}/10</div>
    <input type="range" min="0" max="10" value="${card.rating || 0}" class="slider">
    <div class="created">${formatDate(card.created_at)}</div>
  `;

  // shadow/glow based on rating
  el.style.boxShadow = `0 35px 60px -25px ${glowColor(card.rating || 0)}`;

  // delete
  el.querySelector('.delete-btn').addEventListener('click', async () => {
    const createdAt = card.created_at;
    if(!createdAt) return alert('Ошибка: id отсутствует');
    const { error } = await supabaseClient.from('cards').delete().eq('created_at', createdAt);
    if(error){ console.error(error); alert('Ошибка удаления'); return; }
    el.remove();
    updateStatsFromDOM();
  });

  // textarea debounce update
  const ta = el.querySelector('textarea');
  let t;
  ta.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(async ()=>{
      await supabaseClient.from('cards').update({ text: ta.value }).eq('created_at', card.created_at).catch(e=>console.warn(e));
    },700);
  });

  // slider rating
  const slider = el.querySelector('.slider');
  const rEl = el.querySelector('.rating');
  slider.addEventListener('input', () => {
    const v = Number(slider.value);
    rEl.textContent = v + '/10';
    el.style.boxShadow = `0 35px 60px -25px ${glowColor(v)}`;
    updateStatsFromDOM(); // optimistic local
  });
  slider.addEventListener('change', async () => {
    const newVal = Number(slider.value);
    const { error } = await supabaseClient.from('cards').update({ rating: newVal }).eq('created_at', card.created_at);
    if(error){
      console.error(error);
      alert('Ошибка обновления рейтинга');
      // reload value back from DB (simple)
      loadCards();
    }
  });

  // category select under slider (placed after slider)
  const select = makeCategorySelect(card.category || 'other');
  select.addEventListener('change', async ()=>{
    const newCat = select.value;
    const { error } = await supabaseClient.from('cards').update({ category: newCat }).eq('created_at', card.created_at);
    if(error){
      console.error(error);
      alert('Ошибка сохранения категории');
      return;
    }
  });
  el.appendChild(select);

  return el;
}


// load all cards
async function loadCards(){
  try{
    const { data, error } = await supabaseClient.from('cards').select('*').order('created_at',{ascending:false});
    if(error){ console.error(error); stats.textContent='Ошибка загрузки'; return; }
    grid.innerHTML = '';
    if(!data || data.length===0){ updateStatsFromDOM(); return; }
    data.forEach(card=>{
      const el = createCardElement(card);
      grid.appendChild(el);
    });
    updateStatsFromDOM();
  }catch(e){
    console.error(e);
    stats.textContent='Ошибка';
  }
}


// upload image + create card
photoInput.addEventListener('change', async (ev)=>{
  const file = ev.target.files && ev.target.files[0];
  if(!file) return;
  const fileName = Date.now() + '-' + file.name.replace(/\s+/g,'_');

  const { error: uploadError } = await supabaseClient.storage.from('photos').upload(fileName, file);
  if(uploadError){ console.error(uploadError); alert('Ошибка загрузки'); return; }

  const { data } = supabaseClient.storage.from('photos').getPublicUrl(fileName);
  const publicUrl = data.publicUrl;

  const { data: inserted, error: insertError } = await supabaseClient.from('cards').insert([{
    image_url: publicUrl, text: '', rating: 0, category: 'other'
  }]).select().limit(1);

  if(insertError){ console.error(insertError); alert('Ошибка записи'); return; }

  const newCard = Array.isArray(inserted) ? inserted[0] : inserted;
  const el = createCardElement(newCard);
  grid.insertBefore(el, grid.firstChild);
  updateStatsFromDOM();
  photoInput.value = '';
});


// nav buttons
if(navCats) navCats.addEventListener('click', ()=> location.href = '/categories.html');
if(navHome) navHome.addEventListener('click', ()=> location.href = '/index.html');

// service worker (optional)
if('serviceWorker' in navigator){
  navigator.serviceWorker?.register('/service-worker.js').catch(()=>{/* silent */});
}

// init
loadCards();
