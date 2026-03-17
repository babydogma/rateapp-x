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

async function moveCardsToDefaultCategory(deletedCategoryName) {
  const client = supabase.createClient(
    "https://qlogmylywwdbczxolidl.supabase.co",
    "sb_publishable_nVqkHQmgMKoA_F_ft7yfXQ_OWjYq7f4"
  );

  const { error } = await client
    .from("cards")
    .update({ category: "Разное" })
    .eq("category", deletedCategoryName);

  if (error) {
    console.error("moveCardsToDefaultCategory error:", error);
    throw error;
  }
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

    const wrapper = document.createElement("div");
    wrapper.className = "swipe-wrapper";

    const deleteBg = document.createElement("div");
    deleteBg.className = "delete-bg";
    deleteBg.textContent = "Удалить";

    const el = document.createElement("div");
    el.className = "category-block";

    el.innerHTML = `
      <div class="cat-emoji">${cat.emoji}</div>
      <div class="cat-title">${cat.name} (${count})</div>
      <button class="category-edit">✏️</button>
    `;

    /* ПЕРЕХОД В КАТЕГОРИЮ */
    el.addEventListener("click", () => {
      localStorage.setItem("activeCategory", cat.name);
      window.location.href = "index.html";
    });

    /* РЕДАКТИРОВАНИЕ */
    el.querySelector(".category-edit").onclick = (e) => {
  e.stopPropagation();

  const newName = prompt("Новое название", cat.name);
  if (!newName) return;

  const trimmedName = newName.trim();
  if (!trimmedName) return;

  const newEmoji = prompt("Эмодзи", cat.emoji);
  if (!newEmoji) return;

  const trimmedEmoji = newEmoji.trim() || cat.emoji;

  const duplicate = categories.some(
    (item, i) => i !== index && item.name === trimmedName
  );

  if (duplicate) {
    alert("Категория с таким названием уже есть");
    return;
  }

  categories[index] = {
    name: trimmedName,
    emoji: trimmedEmoji
  };

  saveCategories(categories);
  init();
};

    enableCategorySwipeDelete(wrapper, el, cat, categories, cards);

    wrapper.appendChild(deleteBg);
    wrapper.appendChild(el);
    DOM.grid.appendChild(wrapper);
  });

  DOM.stats.textContent =
    `Категорий: ${categories.length} • Карточек: ${cards.length}`;
}

function enableCategorySwipeDelete(wrapper, categoryEl, cat, categories, cards) {
  let startX = 0;
  let diff = 0;

  categoryEl.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
  });

  categoryEl.addEventListener("touchmove", (e) => {
    diff = e.touches[0].clientX - startX;

    if (diff < 0) {
      categoryEl.style.transform = `translateX(${diff}px)`;
    }
  });

  categoryEl.addEventListener("touchend", async () => {
    if (diff < -120) {
      if (cat.name === "Разное") {
        alert('Категорию "Разное" удалять нельзя');
        categoryEl.style.transform = "";
        diff = 0;
        return;
      }

      const hasCards = cards.some(
        (c) => (c.category || "Разное") === cat.name
      );

      let confirmText = `Удалить категорию "${cat.name}"?`;

      if (hasCards) {
        confirmText =
          `Удалить категорию "${cat.name}"?\n\n` +
          `Все карточки из неё будут автоматически перенесены в "Разное".`;
      }

      const approved = confirm(confirmText);

      if (approved) {
        try {
          if (hasCards) {
            await moveCardsToDefaultCategory(cat.name);
          }

          const updated = categories.filter((item) => item.name !== cat.name);
          saveCategories(updated);

          init();
          return;
        } catch (error) {
          console.error(error);
          alert("Не удалось удалить категорию");
        }
      }
    }

    categoryEl.style.transform = "";
    diff = 0;
  });
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
