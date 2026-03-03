/* --- Supabase setup (оставь ключи как есть) --- */
const SUPABASE_URL = "https://qlogmylywwdbczxolidl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nVqkHQmgMKoA_F_ft7yfXQ_OWjYq7f4";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* DOM */
const grid = document.getElementById('grid');
const stats = document.getElementById('stats');
const photoInput = document.getElementById('photoInput');
const addBtn = document.getElementById('addBtn');
const homeBtn = document.getElementById('homeBtn');
const catsBtn = document.getElementById('catsBtn');

/* categories list (id matches DB friendly values) */
const CATEGORIES = [
  { id: 'film', label: 'Фильм', emoji: '🎬' },
  { id: 'series', label: 'Сериалы', emoji: '📺' },
  { id: 'food', label: 'Еда', emoji: '🍔' },
  { id: 'family', label: 'Семья', emoji: '👪' },
  { id: 'other', label: 'Разное', emoji: '🏷️' }
];

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
function debounce(fn,ms=600){let t; return (...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);}}

/* build a card element */
function buildCardElement(card, idx=0){
  const el = document.createElement('div');
  el.className = 'card';
  el.style.boxShadow = `0 28px 60px -30px ${getGlowColor(card.rating||0)}`;

  const createdAtRaw = card.created_at;

  el.innerHTML = `
    <button class="delete-btn" title="Удалить">✕</button>
    <img src="${card.image_url||''}" alt="">
    <div class="title">${card.text || 'Описание'}</div>
    <div class="rating">${card.rating || 0}/10</div>
    <input type="range" min="0" max="10" value="${card.rating||0}" class="slider">
    <div class="select-wrap">
      <select class="select">
        ${CATEGORIES.map(c=>`<option value="${c.id}" ${c.id===card.category?'selected':''}>${c.label}</option>`).join('')}
      </select>
    </div>
    <div class="created">${formatDateSimple(createdAtRaw)}</div>
  `;

  // delete
  el.querySelector('.delete-btn').onclick = async () => {
    if(!createdAtRaw){ alert('Ошибка удаления: ключ не найден'); return; }
    const { error } = await supabase.from('cards').delete().eq('created_at', createdAtRaw);
    if(error){ console.error(error); alert('Ошибка удаления: '+(error.message||error)); return; }
    el.remove();
    updateStatsFromDOM();
  };

  // slider change — optimistic update; rollback on error
  const slider = el.querySelector('.slider');
  const ratingEl = el.querySelector('.rating');
  slider.addEventListener('input', () => {
    ratingEl.textContent = slider.value + '/10';
    el.style.boxShadow = `0 28px 60px -30px ${getGlowColor(Number(slider.value))}`;
    updateStatsFromDOM();
  });
  slider.addEventListener('change', async () => {
    const newRating = Number(slider.value);
    const { error } = await supabase.from('cards').update({ rating: newRating }).eq('created_at', createdAtRaw);
    if(error){ console.error(error); alert('Ошибка: '+(error.message||error)); await loadCards(); }
  });

  // category change
  el.querySelector('.select').addEventListener('change', async (e) => {
    const newCat = e.target.value;
    const { error } = await supabase.from('cards').update({ category: newCat }).eq('created_at', createdAtRaw);
    if(error){ console.error(error); alert('Ошибка обновления категории'); }
  });

  return el;
}

/* update stats by DOM (fast) */
function updateStatsFromDOM(){
  const cards = Array.from(document.querySelectorAll('.card'));
  if(cards.length===0){ stats.textContent = 'Пока нет карточек'; return; }
  let sum=0;
  cards.forEach(c=>{
    const v = Number((c.querySelector('.rating')?.textContent||'0/10').split('/')[0])||0;
    sum+=v;
  });
  stats.textContent = `Средняя оценка: ${(sum/cards.length).toFixed(1)} • Карточек: ${cards.length}`;
}

/* load cards (optionally filtered by category from URL param) */
async function loadCards(){
  const url = new URL(location.href);
  const categoryFilter = url.searchParams.get('category');

  const { data, error } = await supabase.from('cards')
    .select('*')
    .order('created_at', { ascending: false });

  if(error){ console.error(error); stats.textContent='Ошибка загрузки'; return; }
  grid.innerHTML = '';
  const arr = Array.isArray(data)?data:[];

  const filtered = categoryFilter ? arr.filter(d=>d.category===categoryFilter) : arr;

  filtered.forEach((card,i)=>{
    const el = buildCardElement(card,i);
    grid.appendChild(el);
  });

  updateStatsFromDOM();
}

/* upload flow */
addBtn && addBtn.addEventListener('click', ()=>photoInput && photoInput.click());
homeBtn && (homeBtn.onclick = ()=>location.href = '/');
catsBtn && (catsBtn.onclick = ()=>location.href = '/categories.html');

photoInput && photoInput.addEventListener('change', async (e)=>{
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  const fileName = Date.now() + '-' + file.name.replace(/\s+/g,'_');
  const { error: uploadError } = await supabase.storage.from('photos').upload(fileName, file);
  if(uploadError){ console.error(uploadError); alert('Ошибка загрузки'); return; }
  const { data } = supabase.storage.from('photos').getPublicUrl(fileName);
  const publicUrl = data?.publicUrl || '';
  const { data: inserted, error: insertError } = await supabase.from('cards')
    .insert([{ image_url: publicUrl, text: '', rating: 0, category: 'other' }])
    .select()
    .limit(1);
  if(insertError){ console.error(insertError); alert('Ошибка записи'); return; }
  const newCard = Array.isArray(inserted)?inserted[0]:inserted;
  const el = buildCardElement(newCard, 0);
  grid.insertBefore(el, grid.firstChild);
  updateStatsFromDOM();
  photoInput.value = '';
});

/* register service worker silently */
if('serviceWorker' in navigator){ navigator.serviceWorker.register('/service-worker.js').catch(()=>{}); }

/* start */
loadCards();
