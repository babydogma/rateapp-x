/* =========================
   CATEGORIES FULL SYSTEM
========================= */

const DOM = {
  grid: document.getElementById("categoriesGrid"),
  stats: document.getElementById("categoriesStats"),
  addBtn: document.getElementById("addCategoryBtn")
};

const DEFAULT_CATEGORIES = [
  { name: "Разное", emoji: "📦" },
  { name: "Еда", emoji: "🍔" },
  { name: "Фильм", emoji: "🎬" },
  { name: "Сериалы", emoji: "📺" },
  { name: "Семья", emoji: "👨‍👩‍👧" }
];

/* =========================
   STORAGE
========================= */

function getCategories() {
  const saved = localStorage.getItem("categories");
  return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
}

function saveCategories(categories) {
  localStorage.setItem("categories", JSON.stringify(categories));
}

/* =========================
   FETCH CARDS
========================= */

async function fetchCards() {
  const { data } = await supabase
    .createClient(
      "https://qlogmylywwdbczxolidl.supabase.co",
      "sb_publishable_nVqkHQmgMKoA_F_ft7yfXQ_OWjYq7f4"
    )
    .from("cards")
    .select("category");

  return data || [];
}

/* =========================
   RENDER
========================= */

function renderCategories(categories, cards) {
  DOM.grid.innerHTML = "";

  categories.forEach((cat, index) => {
    const count = cards.filter(
      (c) => (c.category || "Разное") === cat.name
    ).length;

    const el = document.createElement("div");
    el.className = "category-block";

    el.innerHTML = `
      <div class="cat-emoji">${cat.emoji}</div>
      <div class="cat-title">${cat.name} (${count})</div>
      <button class="category-edit">✏️</button>
    `;

    /* 👉 ПЕРЕХОД В КАТЕГОРИЮ */
    el.addEventListener("click", () => {
      localStorage.setItem("activeCategory", cat.name);
      window.location.href = "index.html";
    });

    /* 👉 РЕДАКТИРОВАНИЕ */
    el.querySelector(".category-edit").onclick = (e) => {
      e.stopPropagation();

      const newName = prompt("Новое название", cat.name);
      if (!newName) return;

      const newEmoji = prompt("Эмодзи", cat.emoji);
      if (!newEmoji) return;

      categories[index] = {
        name: newName,
        emoji: newEmoji
      };

      saveCategories(categories);
      init();
    };

    DOM.grid.appendChild(el);
  });

  DOM.stats.textContent =
    `Категорий: ${categories.length} • Карточек: ${cards.length}`;
}

/* =========================
   ADD CATEGORY
========================= */

function setupAdd(categories) {
  DOM.addBtn.onclick = () => {
    const name = prompt("Название категории");
    if (!name) return;

    const emoji = prompt("Эмодзи", "📁") || "📁";

    categories.push({ name, emoji });
    saveCategories(categories);

    init();
  };
}

/* =========================
   NAVIGATION
========================= */

function setupNavigation() {
  document.querySelectorAll(".nav-emoji").forEach((btn) => {
    btn.onclick = () => {
      const page = btn.dataset.page;

      if (page === "home") window.location.href = "index.html";
      if (page === "categories") window.location.href = "categories.html";
    };
  });
}

/* =========================
   INIT
========================= */

async function init() {
  setupNavigation();

  const categories = getCategories();
  const cards = await fetchCards();

  renderCategories(categories, cards);
  setupAdd(categories);
}

init();
