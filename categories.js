/* =========================================================
   RATEAPP X — CATEGORIES PAGE
========================================================= */

const SUPABASE_URL = "https://qlogmylywwdbczxolidl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nVqkHQmgMKoA_F_ft7yfXQ_OWjYq7f4";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const DEFAULT_CATEGORIES = [
  { name: "Разное", emoji: "📦" },
  { name: "Еда", emoji: "🍔" },
  { name: "Фильм", emoji: "🎬" },
  { name: "Сериалы", emoji: "📺" },
  { name: "Семья", emoji: "👨‍👩‍👧" }
];

const DOM = {
  grid: document.getElementById("categoriesGrid"),
  stats: document.getElementById("categoriesStats"),
  addBtn: document.getElementById("addCategoryBtn")
};

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setupNavigation() {
  document.querySelectorAll(".nav-emoji").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;

      if (page === "home") {
        window.location.href = "index.html";
      }

      if (page === "categories") {
        window.location.href = "categories.html";
      }
    });
  });
}

async function fetchCards() {
  const { data, error } = await supabaseClient
    .from("cards")
    .select("category");

  if (error) {
    console.error("fetchCards error:", error);
    return [];
  }

  return data || [];
}

function buildCategoryMap(cards) {
  const map = new Map();

  DEFAULT_CATEGORIES.forEach((item) => {
    map.set(item.name, {
      name: item.name,
      emoji: item.emoji,
      count: 0
    });
  });

  cards.forEach((card) => {
    const name = (card.category || "Разное").trim() || "Разное";

    if (!map.has(name)) {
      map.set(name, {
        name,
        emoji: "🏷️",
        count: 0
      });
    }

    map.get(name).count += 1;
  });

  return [...map.values()];
}

function renderStats(categories, totalCards) {
  if (!DOM.stats) return;
  DOM.stats.textContent = `Категорий: ${categories.length} • Карточек: ${totalCards}`;
}

function buildCategoryCard(category) {
  const el = document.createElement("div");
  el.className = "category-block";

  el.innerHTML = `
    <div class="cat-emoji">${escapeHtml(category.emoji)}</div>
    <div class="cat-title">${escapeHtml(category.name)} (${category.count})</div>
  `;

  el.addEventListener("click", () => {
    alert(`Категория: ${category.name}\nКарточек: ${category.count}`);
  });

  return el;
}

function renderCategories(categories) {
  if (!DOM.grid) return;

  DOM.grid.innerHTML = "";

  categories.forEach((category) => {
    DOM.grid.appendChild(buildCategoryCard(category));
  });
}

function setupAddCategory() {
  if (!DOM.addBtn) return;

  DOM.addBtn.addEventListener("click", () => {
    const name = prompt("Введите название новой категории");
    if (!name) return;

    const trimmed = name.trim();
    if (!trimmed) return;

    alert(
      `Категория "${trimmed}" будет доступна после того, как ты выберешь её в карточках.\n\n` +
      `Если хочешь, следующим сообщением я могу сразу дать тебе версию, где свои категории создаются и сохраняются полноценно.`
    );
  });
}

async function init() {
  setupNavigation();
  setupAddCategory();

  const cards = await fetchCards();
  const categories = buildCategoryMap(cards);

  renderCategories(categories);
  renderStats(categories, cards.length);
}

init();
