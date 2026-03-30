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
  pendingDelete: null,
  cardModalMode: "create",
  editingCardId: null,
  cardPhotoFile: null,
  cardPhotoUrl: ""
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
  saveDescription: document.getElementById("saveDescription"),
    cardModal: document.getElementById("cardModal"),
  cardModalTitle: document.getElementById("cardModalTitle"),
  cardModalCancel: document.getElementById("cardModalCancel"),
  cardModalSave: document.getElementById("cardModalSave"),
  cardModalDelete: document.getElementById("cardModalDelete"),

  cardPhotoPickBtn: document.getElementById("cardPhotoPickBtn"),
  
  cardTitleInput: document.getElementById("cardTitleInput"),
  cardDescriptionInput: document.getElementById("cardDescriptionInput"),
  cardRatingInput: document.getElementById("cardRatingInput"),
  cardRatingValue: document.getElementById("cardRatingValue"),
  cardCategoryInput: document.getElementById("cardCategoryInput")
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

function setCardModalRatingUI() {
  if (!DOM.cardRatingInput || !DOM.cardRatingValue) return;
  DOM.cardRatingValue.textContent = `${Number(DOM.cardRatingInput.value) || 0}/10`;
  setSliderProgress(DOM.cardRatingInput);
}

function fillCardCategoryOptions(selectedValue = "Разное") {
  if (!DOM.cardCategoryInput) return;

  const categories = getStoredCategories();
  DOM.cardCategoryInput.innerHTML = categories
    .map((item) => {
      const selected = item.name === selectedValue ? "selected" : "";
      return `<option value="${escapeHtml(item.name)}" ${selected}>${escapeHtml(item.emoji)} ${escapeHtml(item.name)}</option>`;
    })
    .join("");
}

function resetCardModal() {
  state.cardModalMode = "create";
  state.editingCardId = null;
  state.cardPhotoFile = null;
  state.cardPhotoUrl = "";

  if (DOM.cardModalTitle) DOM.cardModalTitle.textContent = "Новая карточка";
  if (DOM.cardTitleInput) DOM.cardTitleInput.value = "";
  if (DOM.cardDescriptionInput) DOM.cardDescriptionInput.value = "";
  if (DOM.cardRatingInput) DOM.cardRatingInput.value = "0";
  fillCardCategoryOptions(state.activeCategory || "Разное");
  setCardModalRatingUI();

  if (DOM.cardPhotoPickBtn) {
    DOM.cardPhotoPickBtn.classList.remove("has-photo");
    DOM.cardPhotoPickBtn.style.backgroundImage = "";
    DOM.cardPhotoPickBtn.innerHTML = `
      <span class="card-photo-pick__plus">+</span>
      <span class="card-photo-pick__text">Добавить фото</span>
    `;
  }

  if (DOM.cardModalDelete) DOM.cardModalDelete.hidden = true;
}

function openCardModal(card = null) {
  if (!DOM.cardModal) return;

  if (card) {
    state.cardModalMode = "edit";
    state.editingCardId = card.id;
    state.cardPhotoFile = null;
    state.cardPhotoUrl = card.image_url || "";

    if (DOM.cardModalTitle) DOM.cardModalTitle.textContent = "Редактировать карточку";
    if (DOM.cardTitleInput) DOM.cardTitleInput.value = card.text || "";
    if (DOM.cardDescriptionInput) DOM.cardDescriptionInput.value = card.description || "";
    if (DOM.cardRatingInput) DOM.cardRatingInput.value = String(Number(card.rating) || 0);
    fillCardCategoryOptions(card.category || "Разное");
    setCardModalRatingUI();

    if (DOM.cardPhotoPickBtn) {
      if (card.image_url) {
        DOM.cardPhotoPickBtn.classList.add("has-photo");
        DOM.cardPhotoPickBtn.style.backgroundImage = `url("${card.image_url}")`;
        DOM.cardPhotoPickBtn.innerHTML = "";
      } else {
        DOM.cardPhotoPickBtn.classList.remove("has-photo");
        DOM.cardPhotoPickBtn.style.backgroundImage = "";
        DOM.cardPhotoPickBtn.innerHTML = `
          <span class="card-photo-pick__plus">+</span>
          <span class="card-photo-pick__text">Добавить фото</span>
        `;
      }
    }

    if (DOM.cardModalDelete) DOM.cardModalDelete.hidden = false;
  } else {
    resetCardModal();
  }

  DOM.cardModal.classList.add("active");
}

function closeCardModal() {
  DOM.cardModal?.classList.remove("active");
}

async function saveCardFromModal() {
  const title = String(DOM.cardTitleInput?.value || "").trim();
  const description = String(DOM.cardDescriptionInput?.value || "").trim();
  const rating = Number(DOM.cardRatingInput?.value || 0);
  const category = String(DOM.cardCategoryInput?.value || "Разное");

  let imageUrl = state.cardPhotoUrl || "";

  if (state.cardPhotoFile) {
    imageUrl = await API.uploadPhoto(state.cardPhotoFile);
  }

  if (!imageUrl) {
    alert("Сначала добавь фото");
    return;
  }

  const payload = {
    image_url: imageUrl,
    text: title,
    description,
    rating,
    category
  };

  DOM.cardModalSave.disabled = true;

  try {
    if (state.cardModalMode === "edit" && state.editingCardId) {
      await API.updateCard(state.editingCardId, payload);

      const target = state.cards.find((item) => item.id === state.editingCardId);
      if (target) {
        Object.assign(target, payload);
      }
    } else {
      const newCard = await API.insertCard(payload);
      if (newCard) {
        state.cards.unshift(newCard);
      }
    }

    closeCardModal();
    renderCards();
    renderStats();
  } catch (error) {
    console.error(error);
    alert("Не удалось сохранить карточку");
  } finally {
    DOM.cardModalSave.disabled = false;
    DOM.photoInput.value = "";
  }
}

async function deleteCardFromModal() {
  if (!state.editingCardId) return;

  try {
    await API.deleteCard(state.editingCardId);
    state.cards = state.cards.filter((card) => card.id !== state.editingCardId);
    closeCardModal();
    renderCards();
    renderStats();
  } catch (error) {
    console.error(error);
    alert("Не удалось удалить карточку");
  }
}

function setupCardModal() {
  DOM.addBtn?.addEventListener("click", () => openCardModal(null));

  DOM.cardModalCancel?.addEventListener("click", closeCardModal);
  DOM.cardModalSave?.addEventListener("click", saveCardFromModal);
  DOM.cardModalDelete?.addEventListener("click", deleteCardFromModal);

  DOM.cardModal?.addEventListener("click", (e) => {
    if (e.target === DOM.cardModal) {
      closeCardModal();
    }
  });

  DOM.cardRatingInput?.addEventListener("input", setCardModalRatingUI);

  DOM.cardPhotoPickBtn?.addEventListener("click", () => {
    DOM.photoInput?.click();
  });

  DOM.photoInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    state.cardPhotoFile = file;
    const localUrl = URL.createObjectURL(file);
    state.cardPhotoUrl = localUrl;

    if (DOM.cardPhotoPickBtn) {
      DOM.cardPhotoPickBtn.classList.add("has-photo");
      DOM.cardPhotoPickBtn.style.backgroundImage = `url("${localUrl}")`;
      DOM.cardPhotoPickBtn.innerHTML = "";
    }

    DOM.photoInput.value = "";
  });
}

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
}
/* =========================
   INIT
========================= */

async function init() {
  setupNavigation();
  setupFilters();
  setupCardModal();

  state.activeCategory = localStorage.getItem("activeCategory");

  const cards = await API.fetchCards();
  state.cards = cards;

  renderCards();
  renderStats();
}

init();
