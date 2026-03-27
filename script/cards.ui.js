/* =========================
   CARDS UI
========================= */

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

function getDescriptionPreview(description) {
  const trimmed = String(description || "").trim();
  if (!trimmed) {
    return {
      text: "Описание пока не добавлено",
      empty: true
    };
  }

  const normalized = trimmed.replace(/\s+/g, " ");
  const shortText = normalized.length > 90
    ? `${normalized.slice(0, 90).trim()}…`
    : normalized;

  return {
    text: shortText,
    empty: false
  };
}

function getMoreButtonLabel(description) {
  return String(description || "").trim() ? "Редактировать описание" : "Добавить описание";
}

function updateDescriptionUI(card, previewEl, buttonEl) {
  const preview = getDescriptionPreview(card.description);

  previewEl.textContent = preview.text;
  previewEl.classList.toggle("is-empty", preview.empty);
  buttonEl.textContent = getMoreButtonLabel(card.description);
}

function updateCategoryChipUI(categoryName, chipLabelEl) {
  const meta = getCategoryMetaByName(categoryName || "Разное");
  chipLabelEl.textContent = `${meta.emoji} ${meta.name}`;
}

function closeAllCategorySelects(exceptWrap = null) {
  document.querySelectorAll(".category-select-wrap.is-open").forEach((wrap) => {
    if (exceptWrap && wrap === exceptWrap) return;
    wrap.classList.remove("is-open");
  });
}

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

function renderCards() {
  if (!DOM.grid) return;

  DOM.grid.innerHTML = "";

  const cards = getVisibleCards();

  cards.forEach((card) => {
    DOM.grid.appendChild(buildCard(card));
  });

  updateFilterButtons();
}

function setupCardEvents(el, card) {
  const img = el.querySelector(".card__image");

  img.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!card.image_url) return;
    DOM.modalImg.src = card.image_url;
    DOM.imageModal.classList.add("active");
  });

  el.addEventListener("click", () => {
    openCardModal(card);
  });
}

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

  cardEl.addEventListener("touchend", () => {
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
