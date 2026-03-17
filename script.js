/* =========================================================
   RATEAPP X — FIXED SCRIPT
========================================================= */

/* =========================
   CONFIG
========================= */

const SUPABASE_URL = "https://qlogmylywwdbczxolidl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nVqkHQmgMKoA_F_ft7yfXQ_OWjYq7f4";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

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

function ensureUndoToast() {
  let toast = document.getElementById("undoToast");

  if (toast) {
    return {
      toast,
      text: toast.querySelector(".undo-toast__text"),
      button: toast.querySelector(".undo-toast__button")
    };
  }

  toast = document.createElement("div");
  toast.id = "undoToast";
  toast.className = "undo-toast";
  toast.innerHTML = `
    <div class="undo-toast__text">Карточка удалена</div>
    <button type="button" class="undo-toast__button">Отменить</button>
  `;

  document.body.appendChild(toast);

  return {
    toast,
    text: toast.querySelector(".undo-toast__text"),
    button: toast.querySelector(".undo-toast__button")
  };
}

function hideUndoToast() {
  const toast = document.getElementById("undoToast");
  if (toast) {
    toast.classList.remove("active");
  }
}

function showUndoToast(message, onUndo) {
  const { toast, text, button } = ensureUndoToast();

  text.textContent = message;

  const newButton = button.cloneNode(true);
  button.replaceWith(newButton);

  newButton.addEventListener("click", () => {
    onUndo();
  });

  toast.classList.add("active");
}

async function finalizePendingDelete(cardId) {
  const pending = state.pendingDelete;

  if (!pending || pending.card.id !== cardId) return;

  try {
    await API.deleteCard(cardId);
  } catch (error) {
    console.error(error);
    state.cards.splice(pending.index, 0, pending.card);
    renderCards();
    renderStats();
    alert("Не удалось удалить карточку");
  } finally {
    if (state.pendingDelete && state.pendingDelete.card.id === cardId) {
      state.pendingDelete = null;
    }
    hideUndoToast();
  }
}

function scheduleCardDelete(card) {
  if (state.pendingDelete) {
    clearTimeout(state.pendingDelete.timerId);
    finalizePendingDelete(state.pendingDelete.card.id);
  }

  const index = state.cards.findIndex((c) => c.id === card.id);
  if (index === -1) return;

  const removedCard = state.cards[index];
  state.cards.splice(index, 1);

  renderCards();
  renderStats();

  const timerId = setTimeout(() => {
    finalizePendingDelete(card.id);
  }, DELETE_UNDO_MS);

  state.pendingDelete = {
    card: removedCard,
    index,
    timerId
  };

  showUndoToast("Карточка удалена", () => {
    if (!state.pendingDelete || state.pendingDelete.card.id !== card.id) return;

    clearTimeout(state.pendingDelete.timerId);
    state.cards.splice(state.pendingDelete.index, 0, state.pendingDelete.card);
    state.pendingDelete = null;

    hideUndoToast();
    renderCards();
    renderStats();
  });
}

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

function getCategoryNames(selectedValue) {
  const fromStorage = getStoredCategories().map((item) => item.name);
  return [...new Set([...fromStorage, selectedValue].filter(Boolean))];
}

/* =========================
   API
========================= */

const API = {
  async fetchCards() {
    const { data, error } = await supabaseClient
      .from("cards")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchCards error:", error);
      return [];
    }

    return data || [];
  },

  async insertCard(card) {
    const { data, error } = await supabaseClient
      .from("cards")
      .insert(card)
      .select();

    if (error) {
      console.error("insertCard error:", error);
      throw error;
    }

    return data?.[0] || null;
  },

  async updateCard(id, updates) {
    const { error } = await supabaseClient
      .from("cards")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("updateCard error:", error);
      throw error;
    }
  },

  async deleteCard(id) {
    const { error } = await supabaseClient
      .from("cards")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("deleteCard error:", error);
      throw error;
    }
  },

  async uploadPhoto(file) {
    const compressedBlob = await compressImageToSquare(file, 512, 0.85);
    const fileName = `${Date.now()}.jpg`;

    const { error: uploadError } = await supabaseClient
      .storage
      .from("photos")
      .upload(fileName, compressedBlob, {
        contentType: "image/jpeg",
        upsert: false
      });

    if (uploadError) {
      console.error("uploadPhoto error:", uploadError);
      throw uploadError;
    }

    const { data } = supabaseClient
      .storage
      .from("photos")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }
};

/* =========================
   UTILS
========================= */

function getHue(rating = 0) {
  return (rating / 10) * 60;
}

function formatDate(dateStr) {
  if (!dateStr) return "";

  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);

  return `${day}.${month}.${year}`;
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setSliderProgress(slider) {
  const min = Number(slider.min || 0);
  const max = Number(slider.max || 10);
  const value = Number(slider.value || 0);
  const progress = ((value - min) / (max - min)) * 100;
  slider.style.setProperty("--progress", `${progress}%`);
}

function updateFilterButtons() {
  const map = [
    { el: DOM.filterGood, value: "good" },
    { el: DOM.filterMid, value: "mid" },
    { el: DOM.filterBad, value: "bad" }
  ];

  map.forEach(({ el, value }) => {
    if (!el) return;
    el.classList.toggle("active", state.ratingFilter === value);
  });
}

function getCategoryOptions(selectedValue) {
  const values = getCategoryNames(selectedValue);

  return values
    .map((name) => {
      const safe = escapeHtml(name);
      const selected = name === selectedValue ? "selected" : "";
      return `<option value="${safe}" ${selected}>${safe}</option>`;
    })
    .join("");
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = reject;

    img.src = src;
  });
}

async function compressImageToSquare(file, size = 512, quality = 0.85) {
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  const srcSize = Math.min(img.width, img.height);
  const sx = (img.width - srcSize) / 2;
  const sy = (img.height - srcSize) / 2;

  ctx.drawImage(
    img,
    sx,
    sy,
    srcSize,
    srcSize,
    0,
    0,
    size,
    size
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Не удалось сжать изображение"));
        return;
      }
      resolve(blob);
    }, "image/jpeg", quality);
  });
}

function getVisibleCards() {
  let cards = [...state.cards];

  if (state.activeCategory) {
    cards = cards.filter(
      (c) => (c.category || "Разное") === state.activeCategory
    );
  }

  if (state.ratingFilter === "good") {
    cards = cards.filter((c) => Number(c.rating) >= 8);
  }

  if (state.ratingFilter === "mid") {
    cards = cards.filter((c) => Number(c.rating) >= 5 && Number(c.rating) < 8);
  }

  if (state.ratingFilter === "bad") {
    cards = cards.filter((c) => Number(c.rating) < 5);
  }

  return cards;
}

/* =========================
   STATS
========================= */

function renderStats() {
  if (!DOM.stats) return;

  const visibleCards = getVisibleCards();

  if (!visibleCards.length) {
    DOM.stats.textContent = "Карточек: 0";
    return;
  }

  const avg = (
    visibleCards.reduce((sum, card) => sum + (Number(card.rating) || 0), 0) /
    visibleCards.length
  ).toFixed(1);

  DOM.stats.textContent = `Средняя оценка: ${avg} • Карточек: ${visibleCards.length}`;
}

/* =========================
   RENDER CARDS
========================= */

function renderCards() {
  if (!DOM.grid) return;

  DOM.grid.innerHTML = "";

  const cards = getVisibleCards();

  cards.forEach((card) => {
    DOM.grid.appendChild(buildCard(card));
  });

  updateFilterButtons();
}

/* =========================
   BUILD CARD
========================= */

function buildCard(card) {
  const el = document.createElement("div");
  el.className = "card";

  const safeTitle = escapeHtml(card.text || "");
  const selectedCategory = card.category || "Разное";

  el.innerHTML = `
    <div class="delete-bg">Удалить</div>

    <div class="card-content">
      <img
        class="card__image"
        src="${escapeHtml(card.image_url || "")}"
        alt="Фото карточки"
        onerror="this.src='https://via.placeholder.com/140x140/111/fff?text=Фото';"
      >

      <div class="card-right-column">
        <div class="card__title" data-placeholder="Добавить название">${safeTitle}</div>

        <button class="card-more-btn" type="button">Подробнее</button>

        <div class="rating">${Number(card.rating) || 0}/10</div>

        <input
          type="range"
          class="slider"
          min="0"
          max="10"
          step="0.5"
          value="${Number(card.rating) || 0}"
        >

        <select class="category-select">
          ${getCategoryOptions(selectedCategory)}
        </select>

        <div class="created">${formatDate(card.created_at)}</div>
      </div>
    </div>
  `;

  el.style.setProperty("--hue", getHue(Number(card.rating) || 0));
  el.style.setProperty("--rating", Number(card.rating) || 0);

  const slider = el.querySelector(".slider");
  setSliderProgress(slider);

  setupCardEvents(el, card);
  enableSwipeDelete(el, card);

  return el;
}

/* =========================
   CARD EVENTS
========================= */

function setupCardEvents(el, card) {
  const img = el.querySelector(".card__image");
  const slider = el.querySelector(".slider");
  const rating = el.querySelector(".rating");
  const title = el.querySelector(".card__title");
  const more = el.querySelector(".card-more-btn");
  const category = el.querySelector(".category-select");

  slider.addEventListener("touchstart", (e) => {
    e.stopPropagation();
  }, { passive: true });

  slider.addEventListener("touchmove", (e) => {
    e.stopPropagation();
  }, { passive: true });

  slider.addEventListener("touchend", (e) => {
    e.stopPropagation();
  }, { passive: true });

  img.addEventListener("click", () => {
    if (!card.image_url) return;
    DOM.modalImg.src = card.image_url;
    DOM.imageModal.classList.add("active");
  });

  slider.addEventListener("input", (e) => {
    const val = Number(e.target.value);
    rating.textContent = `${val}/10`;
    el.style.setProperty("--hue", getHue(val));
    el.style.setProperty("--rating", val);
    setSliderProgress(slider);
  });

  slider.addEventListener("change", async () => {
    const val = Number(slider.value);

    try {
      await API.updateCard(card.id, { rating: val });
      card.rating = val;
      renderStats();
    } catch (error) {
      alert("Не удалось сохранить рейтинг");
      console.error(error);
    }
  });

  title.addEventListener("click", () => {
    if (title.querySelector("input")) return;

    const current = card.text || "";

    title.innerHTML = `<input type="text" value="${escapeHtml(current)}" placeholder="Введите название">`;

    const input = title.querySelector("input");
    input.focus();
    input.select();

    const saveTitle = async () => {
      const newTitle = input.value.trim();

      try {
        await API.updateCard(card.id, { text: newTitle });
        card.text = newTitle;
        title.textContent = newTitle;
      } catch (error) {
        console.error(error);
        title.textContent = card.text || "";
        alert("Не удалось сохранить название");
      }
    };

    input.addEventListener("blur", saveTitle, { once: true });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        input.blur();
      }
    });
  });

  category.value = card.category || "Разное";

  category.addEventListener("change", async () => {
    const oldCategory = card.category || "Разное";
    const value = category.value;

    try {
      await API.updateCard(card.id, { category: value });
      card.category = value;

      if (state.activeCategory && oldCategory === state.activeCategory && value !== state.activeCategory) {
        renderCards();
      }

      renderStats();
    } catch (error) {
      console.error(error);
      category.value = oldCategory;
      alert("Не удалось сохранить категорию");
    }
  });

  more.addEventListener("click", () => {
    if (!DOM.descriptionModal || !DOM.descriptionInput || !DOM.saveDescription) return;

    DOM.descriptionInput.value = card.description || "";
    DOM.descriptionModal.classList.add("active");

    const saveHandler = async () => {
      const text = DOM.descriptionInput.value.trim();

      try {
        await API.updateCard(card.id, { description: text });
        card.description = text;
        DOM.descriptionModal.classList.remove("active");
      } catch (error) {
        console.error(error);
        alert("Не удалось сохранить описание");
      } finally {
        DOM.saveDescription.removeEventListener("click", saveHandler);
      }
    };

    DOM.saveDescription.replaceWith(DOM.saveDescription.cloneNode(true));
    DOM.saveDescription = document.getElementById("saveDescription");
    DOM.saveDescription.addEventListener("click", saveHandler);
  });
}

/* =========================
   SWIPE DELETE
========================= */

function enableSwipeDelete(cardEl, card) {
  let startX = 0;
  let diff = 0;
  let isSliderDrag = false;

  cardEl.addEventListener("touchstart", (e) => {
    isSliderDrag = Boolean(e.target.closest(".slider"));

    if (isSliderDrag) {
      diff = 0;
      return;
    }

    startX = e.touches[0].clientX;
  });

  cardEl.addEventListener("touchmove", (e) => {
    if (isSliderDrag) return;

    diff = e.touches[0].clientX - startX;

    if (diff < 0) {
      cardEl.style.transform = `translateX(${diff}px)`;
    }
  });

  cardEl.addEventListener("touchend", async () => {
    if (isSliderDrag) {
      isSliderDrag = false;
      cardEl.style.transform = "";
      diff = 0;
      return;
    }

        if (diff < -120) {
      scheduleCardDelete(card);
    }

    cardEl.style.transform = "";
    diff = 0;
  });
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

  state.activeCategory = localStorage.getItem("activeCategory");

  const cards = await API.fetchCards();
  state.cards = cards;

  renderCards();
  renderStats();
}

init();
