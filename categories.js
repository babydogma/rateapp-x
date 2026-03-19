/* =========================
   CATEGORIES FULL SYSTEM
========================= */

const DOM = {
  grid: document.getElementById("categoriesGrid"),
  stats: document.getElementById("categoriesStats"),
  addBtn: document.getElementById("addCategoryBtn"),

  categoryModal: document.getElementById("categoryModal"),
  categoryModalTitle: document.getElementById("categoryModalTitle"),
  categoryNameInput: document.getElementById("categoryNameInput"),
  categoryEmojiInput: document.getElementById("categoryEmojiInput"),
  categoryModalCancel: document.getElementById("categoryModalCancel"),
  categoryModalSave: document.getElementById("categoryModalSave"),

  confirmModal: document.getElementById("confirmModal"),
  confirmModalTitle: document.getElementById("confirmModalTitle"),
  confirmModalText: document.getElementById("confirmModalText"),
  confirmModalCancel: document.getElementById("confirmModalCancel"),
  confirmModalConfirm: document.getElementById("confirmModalConfirm")
};

const DEFAULT_CATEGORIES = [
  { name: "Разное", emoji: "📦" },
  { name: "Еда", emoji: "🍔" },
  { name: "Фильм", emoji: "🎬" },
  { name: "Сериалы", emoji: "📺" },
  { name: "Семья", emoji: "👨‍👩‍👧" }
];

const SUPABASE_URL = "https://qlogmylywwdbczxolidl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nVqkHQmgMKoA_F_ft7yfXQ_OWjYq7f4";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const modalState = {
  mode: "create",
  editIndex: null,
  onConfirm: null
};

/* =========================
   UTILS
========================= */

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
   STORAGE
========================= */

function getCategories() {
  try {
    const saved = localStorage.getItem("categories");
    const parsed = saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;

    if (!Array.isArray(parsed) || !parsed.length) {
      return DEFAULT_CATEGORIES;
    }

    const normalized = parsed
      .map((item) => ({
        name: String(item?.name || "").trim(),
        emoji: String(item?.emoji || "📁").trim() || "📁"
      }))
      .filter((item) => item.name);

    if (!normalized.some((item) => item.name === "Разное")) {
      normalized.unshift({ name: "Разное", emoji: "📦" });
    }

    return normalized;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

function saveCategories(categories) {
  localStorage.setItem("categories", JSON.stringify(categories));
}

/* =========================
   FETCH / UPDATE CARDS
========================= */

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

async function moveCardsToDefaultCategory(deletedCategoryName) {
  const { error } = await supabaseClient
    .from("cards")
    .update({ category: "Разное" })
    .eq("category", deletedCategoryName);

  if (error) {
    console.error("moveCardsToDefaultCategory error:", error);
    throw error;
  }
}

async function renameCardsCategory(oldName, newName) {
  const { error } = await supabaseClient
    .from("cards")
    .update({ category: newName })
    .eq("category", oldName);

  if (error) {
    console.error("renameCardsCategory error:", error);
    throw error;
  }
}

/* =========================
   MODALS
========================= */

function openCategoryModal({ mode, category = null, index = null }) {
  modalState.mode = mode;
  modalState.editIndex = index;

  DOM.categoryModalTitle.textContent =
    mode === "edit" ? "Редактировать категорию" : "Новая категория";

  DOM.categoryModalSave.textContent =
    mode === "edit" ? "Сохранить" : "Создать";

  DOM.categoryNameInput.value = category?.name || "";
  DOM.categoryEmojiInput.value = category?.emoji || "📁";

  DOM.categoryModal.classList.add("active");

  requestAnimationFrame(() => {
    DOM.categoryNameInput.focus();
    DOM.categoryNameInput.select();
  });
}

function closeCategoryModal() {
  DOM.categoryModal.classList.remove("active");
  DOM.categoryNameInput.value = "";
  DOM.categoryEmojiInput.value = "";
  modalState.mode = "create";
  modalState.editIndex = null;
}

function openConfirmModal({ title, text, confirmText = "Удалить", onConfirm }) {
  modalState.onConfirm = onConfirm;

  DOM.confirmModalTitle.textContent = title;
  DOM.confirmModalText.textContent = text;
  DOM.confirmModalConfirm.textContent = confirmText;

  DOM.confirmModal.classList.add("active");
}

function closeConfirmModal() {
  DOM.confirmModal.classList.remove("active");
  modalState.onConfirm = null;
}

function setupModals() {
  DOM.categoryModalCancel.onclick = closeCategoryModal;

  DOM.categoryModal.addEventListener("click", (e) => {
    if (e.target === DOM.categoryModal) {
      closeCategoryModal();
    }
  });

  DOM.confirmModalCancel.onclick = closeConfirmModal;

  DOM.confirmModal.addEventListener("click", (e) => {
    if (e.target === DOM.confirmModal) {
      closeConfirmModal();
    }
  });

  DOM.confirmModalConfirm.onclick = async () => {
    const handler = modalState.onConfirm;
    closeConfirmModal();

    if (typeof handler === "function") {
      await handler();
    }
  };

  DOM.categoryModalSave.onclick = async () => {
    const name = DOM.categoryNameInput.value.trim();
    const emoji = DOM.categoryEmojiInput.value.trim() || "📁";

    if (!name) {
      DOM.categoryNameInput.focus();
      return;
    }

    const categories = getCategories();

    if (modalState.mode === "create") {
      const duplicate = categories.some((item) => item.name === name);

      if (duplicate) {
        alert("Категория с таким названием уже есть");
        return;
      }

      categories.push({ name, emoji });
      saveCategories(categories);
      closeCategoryModal();
      init();
      return;
    }

    if (modalState.mode === "edit") {
      const index = modalState.editIndex;
      if (index === null || !categories[index]) {
        closeCategoryModal();
        return;
      }

      const oldCategory = categories[index];

      const duplicate = categories.some(
        (item, i) => i !== index && item.name === name
      );

      if (duplicate) {
        alert("Категория с таким названием уже есть");
        return;
      }

      try {
        if (name !== oldCategory.name) {
          await renameCardsCategory(oldCategory.name, name);
        }

        categories[index] = { name, emoji };
        saveCategories(categories);

        const activeCategory = localStorage.getItem("activeCategory");
        if (activeCategory === oldCategory.name) {
          localStorage.setItem("activeCategory", name);
        }

        closeCategoryModal();
        init();
      } catch (error) {
        console.error(error);
        alert("Не удалось переименовать категорию");
      }
    }
  };
}

/* =========================
   RENDER
========================= */

function renderCategories(categories, cards) {
  if (!DOM.grid || !DOM.stats) return;

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
      <div class="cat-emoji">${escapeHtml(cat.emoji)}</div>
      <div class="cat-title">${escapeHtml(cat.name)} (${count})</div>
      <button class="category-edit" type="button">✏️</button>
    `;

    el.addEventListener("click", () => {
      localStorage.setItem("activeCategory", cat.name);
      window.location.href = "index.html";
    });

    el.querySelector(".category-edit").onclick = (e) => {
      e.stopPropagation();
      openCategoryModal({
        mode: "edit",
        category: cat,
        index
      });
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

      const text = hasCards
        ? `Удалить категорию «${cat.name}»? Карточки из неё будут перенесены в «Разное».`
        : `Удалить категорию «${cat.name}»?`;

      openConfirmModal({
        title: "Удаление категории",
        text,
        confirmText: "Удалить",
        onConfirm: async () => {
          try {
            if (hasCards) {
              await moveCardsToDefaultCategory(cat.name);
            }

            const updated = categories.filter((item) => item.name !== cat.name);
            saveCategories(updated);

            const activeCategory = localStorage.getItem("activeCategory");
            if (activeCategory === cat.name) {
              localStorage.removeItem("activeCategory");
            }

            init();
          } catch (error) {
            console.error(error);
            alert("Не удалось удалить категорию");
          }
        }
      });
    }

    categoryEl.style.transform = "";
    diff = 0;
  });
}

/* =========================
   ADD CATEGORY
========================= */

function setupAdd() {
  if (!DOM.addBtn) return;

  DOM.addBtn.onclick = () => {
    openCategoryModal({ mode: "create" });
  };
}

/* =========================
   NAVIGATION
========================= */

function setupNavigation() {
  document.querySelectorAll(".nav-emoji").forEach((btn) => {
    btn.onclick = () => {
      const page = btn.dataset.page;

      if (page === "home") {
        localStorage.removeItem("activeCategory");
        window.location.href = "index.html";
      }

      if (page === "sleep") {
        window.location.href = "sleep.html";
      }

      if (page === "categories") {
        window.location.href = "categories.html";
      }
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
  setupAdd();
}

setupModals();
init();
