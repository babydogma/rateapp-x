/* =========================================================
   RATEAPP X — MAIN SCRIPT
========================================================= */

/* =========================
   STATE
========================= */

const state = {
  cards: [],
  ratingFilter: null,
  activeCategory: null,
  pendingDelete: null
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
  filterBad: document.getElementById("filterBad"),
  descriptionModal: document.getElementById("descriptionModal"),
  descriptionInput: document.getElementById("descriptionInput"),
  saveDescription: document.getElementById("saveDescription")
};

const DEFAULT_CATEGORIES = [
  { name: "Разное", emoji: "📦" },
  { name: "Еда", emoji: "🍔" },
  { name: "Фильм", emoji: "🎬" },
  { name: "Сериалы", emoji: "📺" },
  { name: "Семья", emoji: "👨‍👩‍👧" }
];

const DELETE_UNDO_MS = 5000;

/* =========================
   STORAGE
========================= */

function getStoredCategories() {
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

function getCategoryMetaByName(name) {
  const categories = getStoredCategories();
  return categories.find((item) => item.name === name) || {
    name: name || "Разное",
    emoji: "📁"
  };
}

function getCategoryNames(selectedValue) {
  const fromStorage = getStoredCategories().map((item) => item.name);
  return [...new Set([...fromStorage, selectedValue].filter(Boolean))];
}

/* =========================
   ADD CARD
========================= */

if (DOM.addBtn) {
  DOM.addBtn.addEventListener("click", () => {
    DOM.photoInput?.click();
  });
}

if (DOM.photoInput) {
  DOM.photoInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      DOM.addBtn.disabled = true;

      const url = await API.uploadPhoto(file);

      const newCard = await API.insertCard({
        image_url: url,
        text: "",
        rating: 0,
        category: state.activeCategory || "Разное",
        description: ""
      });

      if (newCard) {
        state.cards.unshift(newCard);
        renderCards();
        renderStats();
      }
    } catch (error) {
      console.error(error);
      alert("Не удалось загрузить фото");
    } finally {
      DOM.photoInput.value = "";
      DOM.addBtn.disabled = false;
    }
  });
}

/* =========================
   IMAGE MODAL
========================= */

if (DOM.imageModal) {
  DOM.imageModal.addEventListener("click", () => {
    DOM.imageModal.classList.remove("active");
    DOM.modalImg.src = "";
  });
}

/* =========================
   DESCRIPTION MODAL
========================= */

if (DOM.descriptionModal) {
  DOM.descriptionModal.addEventListener("click", (e) => {
    if (e.target === DOM.descriptionModal) {
      DOM.descriptionModal.classList.remove("active");
    }
  });
}

/* =========================
   FILTERS
========================= */

function setupFilters() {
  DOM.filterGood?.addEventListener("click", () => {
    state.ratingFilter = state.ratingFilter === "good" ? null : "good";
    renderCards();
    renderStats();
  });

  DOM.filterMid?.addEventListener("click", () => {
    state.ratingFilter = state.ratingFilter === "mid" ? null : "mid";
    renderCards();
    renderStats();
  });

  DOM.filterBad?.addEventListener("click", () => {
    state.ratingFilter = state.ratingFilter === "bad" ? null : "bad";
    renderCards();
    renderStats();
  });
}

/* =========================
   NAVIGATION
========================= */

function setupNavigation() {
  document.querySelectorAll(".nav-emoji").forEach((btn) => {
    btn.addEventListener("click", () => {
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
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".category-select-wrap")) {
      closeAllCategorySelects();
    }
  });
}

/* =========================
   INIT
========================= */

async function init() {
  setupNavigation();
  setupFilters();

  state.activeCategory = localStorage.getItem("activeCategory");

  const cards = await API.fetchCards();
  state.cards = cards;

  renderCards();
  renderStats();
}

init();
