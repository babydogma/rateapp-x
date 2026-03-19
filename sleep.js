const SUPABASE_URL = "https://qlogmylywwdbczxolidl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nVqkHQmgMKoA_F_ft7yfXQ_OWjYq7f4";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const DOM = {
  list: document.getElementById("sleepList"),
  stats: document.getElementById("sleepStats"),
  addBtn: document.getElementById("addSleepBtn"),

  modal: document.getElementById("sleepModal"),
  modalCancel: document.getElementById("sleepModalCancel"),
  modalSave: document.getElementById("sleepModalSave"),

  dateInput: document.getElementById("sleepDateInput"),
  bedInput: document.getElementById("bedTimeInput"),
  wakeInput: document.getElementById("wakeTimeInput"),

  sleepRatingInput: document.getElementById("sleepRatingInput"),
  sleepRatingValue: document.getElementById("sleepRatingValue"),

  moodRatingInput: document.getElementById("moodRatingInput"),
  moodRatingValue: document.getElementById("moodRatingValue"),

  noteInput: document.getElementById("sleepNoteInput"),

  confirmModal: document.getElementById("sleepConfirmModal"),
  confirmTitle: document.getElementById("sleepConfirmTitle"),
  confirmText: document.getElementById("sleepConfirmText"),
  confirmCancel: document.getElementById("sleepConfirmCancel"),
  confirmDelete: document.getElementById("sleepConfirmDelete")
};

const modalState = {
  onConfirm: null
};

/* =========================
   FETCH / DELETE
========================= */

async function fetchSleep() {
  const { data, error } = await supabaseClient
    .from("sleep_entries")
    .select("*")
    .order("sleep_date", { ascending: false });

  if (error) {
    console.error("fetchSleep error:", error);
    return { data: [], error };
  }

  return { data: data || [], error: null };
}

async function deleteSleepEntry(id) {
  const { error } = await supabaseClient
    .from("sleep_entries")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteSleepEntry error:", error);
    throw error;
  }
}

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

function isValidTime(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || "").trim());
}

function clampRating(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(10, num));
}

function calcDuration(bed, wake) {
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);

  let b = bh * 60 + bm;
  let w = wh * 60 + wm;

  if (w <= b) w += 1440;

  return w - b;
}

function formatDuration(minutes) {
  const safe = Number(minutes) || 0;
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${h}ч ${m}м`;
}

function formatSleepDate(dateStr) {
  if (!dateStr) return "Без даты";
  const [year, month, day] = dateStr.split("-");
  return `${day}.${month}.${year}`;
}

function formatRatingValue(value) {
  return `${clampRating(value)}/10`;
}

function setSliderProgress(slider) {
  if (!slider) return;

  const min = Number(slider.min || 0);
  const max = Number(slider.max || 10);
  const value = Number(slider.value || 0);
  const progress = ((value - min) / (max - min)) * 100;

  slider.style.setProperty("--progress", `${progress}%`);
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/* =========================
   MODAL
========================= */

function syncSleepSliderUI() {
  if (DOM.sleepRatingInput && DOM.sleepRatingValue) {
    DOM.sleepRatingValue.textContent = formatRatingValue(DOM.sleepRatingInput.value);
    setSliderProgress(DOM.sleepRatingInput);
  }

  if (DOM.moodRatingInput && DOM.moodRatingValue) {
    DOM.moodRatingValue.textContent = formatRatingValue(DOM.moodRatingInput.value);
    setSliderProgress(DOM.moodRatingInput);
  }
}

function resetSleepForm() {
  if (DOM.dateInput) DOM.dateInput.value = getTodayDateString();
  if (DOM.bedInput) DOM.bedInput.value = "";
  if (DOM.wakeInput) DOM.wakeInput.value = "";
  if (DOM.sleepRatingInput) DOM.sleepRatingInput.value = "0";
  if (DOM.moodRatingInput) DOM.moodRatingInput.value = "0";
  if (DOM.noteInput) DOM.noteInput.value = "";

  syncSleepSliderUI();
}

function openSleepModal() {
  if (!DOM.modal) return;

  resetSleepForm();
  DOM.modal.classList.add("active");

  requestAnimationFrame(() => {
    DOM.dateInput?.focus();
  });
}

function closeSleepModal() {
  DOM.modal?.classList.remove("active");
}

async function saveSleepEntry() {
  const date = String(DOM.dateInput?.value || "").trim();
  const bed = String(DOM.bedInput?.value || "").trim();
  const wake = String(DOM.wakeInput?.value || "").trim();
  const sleepRating = clampRating(DOM.sleepRatingInput?.value);
  const moodRating = clampRating(DOM.moodRatingInput?.value);
  const note = String(DOM.noteInput?.value || "").trim();

  if (!date) {
    alert("Выбери дату");
    DOM.dateInput?.focus();
    return;
  }

  if (!isValidTime(bed)) {
    alert("Выбери корректное время, когда лёг");
    DOM.bedInput?.focus();
    return;
  }

  if (!isValidTime(wake)) {
    alert("Выбери корректное время, когда встал");
    DOM.wakeInput?.focus();
    return;
  }

  const duration = calcDuration(bed, wake);

  if (DOM.modalSave) {
    DOM.modalSave.disabled = true;
  }

  try {
    const { error } = await supabaseClient
      .from("sleep_entries")
      .insert({
        sleep_date: date,
        bed_time: bed,
        wake_time: wake,
        duration_minutes: duration,
        sleep_rating: sleepRating,
        mood_rating: moodRating,
        note
      });

    if (error) {
      console.error("insertSleep error:", error);
      alert(`Не удалось добавить запись: ${error.message}`);
      return;
    }

    closeSleepModal();
    await init();
  } finally {
    if (DOM.modalSave) {
      DOM.modalSave.disabled = false;
    }
  }
}

function setupSleepModal() {
  if (!DOM.modal) return;

  DOM.addBtn?.addEventListener("click", openSleepModal);
  DOM.modalCancel?.addEventListener("click", closeSleepModal);
  DOM.modalSave?.addEventListener("click", saveSleepEntry);

  DOM.modal.addEventListener("click", (e) => {
    if (e.target === DOM.modal) {
      closeSleepModal();
    }
  });

  DOM.sleepRatingInput?.addEventListener("input", syncSleepSliderUI);
  DOM.moodRatingInput?.addEventListener("input", syncSleepSliderUI);

  resetSleepForm();
}

/* =========================
   CONFIRM
========================= */

function openConfirm({ title, text, onConfirm }) {
  modalState.onConfirm = onConfirm;

  if (DOM.confirmTitle) DOM.confirmTitle.textContent = title;
  if (DOM.confirmText) DOM.confirmText.textContent = text;

  DOM.confirmModal?.classList.add("active");
}

function closeConfirm() {
  DOM.confirmModal?.classList.remove("active");
  modalState.onConfirm = null;
}

function setupConfirm() {
  DOM.confirmCancel?.addEventListener("click", closeConfirm);

  DOM.confirmModal?.addEventListener("click", (e) => {
    if (e.target === DOM.confirmModal) {
      closeConfirm();
    }
  });

  DOM.confirmDelete?.addEventListener("click", async () => {
    const handler = modalState.onConfirm;
    closeConfirm();

    if (typeof handler === "function") {
      await handler();
    }
  });
}

/* =========================
   RENDER
========================= */

function render(entries, loadError = null) {
  if (!DOM.list || !DOM.stats) return;

  DOM.list.innerHTML = "";

  if (loadError) {
    DOM.stats.textContent = `Ошибка: ${loadError.message}`;

    const errorCard = document.createElement("div");
    errorCard.className = "card";
    errorCard.innerHTML = `
      <div class="card-content">
        <div class="card-right-column">
          <div class="card__title">Ошибка загрузки сна</div>
          <div class="card__description-preview is-empty">${escapeHtml(loadError.message)}</div>
        </div>
      </div>
    `;
    DOM.list.appendChild(errorCard);
    return;
  }

  if (!entries.length) {
    DOM.stats.textContent = "Записей сна: 0";

    const emptyCard = document.createElement("div");
    emptyCard.className = "card";
    emptyCard.innerHTML = `
      <div class="card-content">
        <div class="card-right-column">
          <div class="card__title">Пока нет записей сна</div>
          <div class="card__description-preview is-empty">Нажми на + и добавь первую запись</div>
        </div>
      </div>
    `;
    DOM.list.appendChild(emptyCard);
    return;
  }

  entries.forEach((entry) => {
    const wrapper = document.createElement("div");
    wrapper.className = "swipe-wrapper";

    const deleteBg = document.createElement("div");
    deleteBg.className = "delete-bg";
    deleteBg.textContent = "Удалить";

    const el = document.createElement("div");
    el.className = "card sleep-entry-card";

    const sleepRating = clampRating(entry.sleep_rating);
    const moodRating = clampRating(entry.mood_rating);
    const safeNote = String(entry.note || "").trim();

    el.innerHTML = `
      <div class="card-content">
        <div class="card-right-column">
          <div class="card__title">${escapeHtml(formatSleepDate(entry.sleep_date))}</div>
          <div class="card__description-preview">
            ${escapeHtml(entry.bed_time || "--:--")} → ${escapeHtml(entry.wake_time || "--:--")} • ${escapeHtml(formatDuration(entry.duration_minutes))}
          </div>
          <div class="rating">Сон: ${sleepRating}/10</div>
          <div class="card__description-preview">Настроение: ${moodRating}/10</div>
          <div class="card__description-preview ${safeNote ? "" : "is-empty"}">
            ${safeNote ? escapeHtml(safeNote) : "Без заметки"}
          </div>
        </div>
      </div>
    `;

    enableSleepSwipeDelete(wrapper, el, entry);

    wrapper.appendChild(deleteBg);
    wrapper.appendChild(el);
    DOM.list.appendChild(wrapper);
  });

  const avgSleep = (
    entries.reduce((sum, e) => sum + clampRating(e.sleep_rating), 0) / entries.length
  ).toFixed(1);

  const avgDuration = Math.round(
    entries.reduce((sum, e) => sum + (Number(e.duration_minutes) || 0), 0) / entries.length
  );

  DOM.stats.textContent = `Средний сон: ${avgSleep}/10 • ${formatDuration(avgDuration)} • Записей: ${entries.length}`;
}

/* =========================
   SWIPE DELETE
========================= */

function enableSleepSwipeDelete(wrapper, cardEl, entry) {
  let startX = 0;
  let startY = 0;
  let diffX = 0;
  let diffY = 0;
  let isHorizontal = false;

  cardEl.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    diffX = 0;
    diffY = 0;
    isHorizontal = false;
  }, { passive: true });

  cardEl.addEventListener("touchmove", (e) => {
    const touch = e.touches[0];
    diffX = touch.clientX - startX;
    diffY = touch.clientY - startY;

    if (!isHorizontal) {
      if (Math.abs(diffX) > 10 && Math.abs(diffX) > Math.abs(diffY)) {
        isHorizontal = true;
      } else if (Math.abs(diffY) > Math.abs(diffX)) {
        return;
      }
    }

    if (isHorizontal && diffX < 0) {
      const limited = Math.max(diffX, -140);
      cardEl.style.transform = `translateX(${limited}px)`;
    }
  }, { passive: true });

  cardEl.addEventListener("touchend", () => {
    if (isHorizontal && diffX < -120) {
      openConfirm({
        title: "Удаление записи",
        text: "Удалить эту запись сна?",
        onConfirm: async () => {
          try {
            await deleteSleepEntry(entry.id);
            await init();
          } catch (error) {
            console.error(error);
            alert("Не удалось удалить запись сна");
          }
        }
      });
    }

    cardEl.style.transform = "";
    diffX = 0;
    diffY = 0;
    isHorizontal = false;
  });
}

/* =========================
   NAV
========================= */

function setupNavigation() {
  document.querySelectorAll(".nav-emoji").forEach((btn) => {
    btn.onclick = () => {
      const page = btn.dataset.page;

      if (page === "home") {
        localStorage.removeItem("activeCategory");
        location.href = "index.html";
      }

      if (page === "sleep") {
        location.href = "sleep.html";
      }

      if (page === "categories") {
        location.href = "categories.html";
      }
    };
  });
}

/* =========================
   INIT
========================= */

async function init() {
  if (DOM.stats) {
    DOM.stats.textContent = "Грузим записи сна...";
  }

  const result = await fetchSleep();
  render(result.data, result.error);
}

setupNavigation();
setupSleepModal();
setupConfirm();
init();
