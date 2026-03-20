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

  wakeCountInput: document.getElementById("wakeCountInput"),
  dreamTypeInput: document.getElementById("dreamTypeInput"),

  moodRatingInput: document.getElementById("moodRatingInput"),
  moodRatingValue: document.getElementById("moodRatingValue"),

  noteInput: document.getElementById("sleepNoteInput"),

  confirmModal: document.getElementById("sleepConfirmModal"),
  confirmTitle: document.getElementById("sleepConfirmTitle"),
  confirmText: document.getElementById("sleepConfirmText"),
  confirmCancel: document.getElementById("sleepConfirmCancel"),
  confirmDelete: document.getElementById("sleepConfirmDelete")
  
  summarySwitcher: document.getElementById("sleepSummarySwitcher"),
  summaryPanel: document.getElementById("sleepSummaryPanel"),
};

const modalState = {
  onConfirm: null,
  mode: "create",
  editingId: null
};

const summaryState = {
  openedRange: 7
};

/* =========================
   FETCH / CRUD
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

async function updateSleepEntry(id, payload) {
  const { error } = await supabaseClient
    .from("sleep_entries")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("updateSleepEntry error:", error);
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

function clampHalf(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  const rounded = Math.round(num * 2) / 2;
  return Math.max(0, Math.min(10, rounded));
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

function formatAutoSleepRating(value) {
  const safe = clampHalf(value);
  return Number.isInteger(safe) ? `${safe}/10` : `${safe.toFixed(1)}/10`;
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
   AUTO SLEEP RATING
========================= */

function getBaseSleepRating(durationMinutes) {
  const hours = (Number(durationMinutes) || 0) / 60;

  if (hours < 5) return 2;
  if (hours <= 6) return 4;
  if (hours <= 7) return 6;
  if (hours <= 8) return 8;
  if (hours <= 9) return 9;
  return 7;
}

function getWakePenalty(wakeCountValue) {
  const value = String(wakeCountValue || "0");

  if (value === "0") return 0;
  if (value === "1") return -0.5;
  if (value === "2") return -1;
  if (value === "3") return -1.5;
  return -2;
}

function getDreamAdjustment(dreamTypeValue) {
  const value = String(dreamTypeValue || "neutral");

  if (value === "nightmare") return -1;
  if (value === "good") return 1;
  return 0;
}

function getAutoSleepRating(durationMinutes, wakeCountValue, dreamTypeValue) {
  const base = getBaseSleepRating(durationMinutes);
  const wakePenalty = getWakePenalty(wakeCountValue);
  const dreamAdjustment = getDreamAdjustment(dreamTypeValue);

  return clampHalf(base + wakePenalty + dreamAdjustment);
}

/* =========================
   STATUS / LABELS
========================= */

function getMoodEmoji(moodRating) {
  const mood = clampRating(moodRating);

  if (mood <= 2) return "😢";
  if (mood <= 5) return "🙂";
  if (mood <= 8) return "😌";
  return "🥹";
}

function getSleepStatus(durationMinutes, sleepRating, moodRating) {
  const hours = (Number(durationMinutes) || 0) / 60;
  const rating = clampHalf(sleepRating);
  const moodEmoji = getMoodEmoji(moodRating);

  let level = 0;
  // 0 = Плохой сон
  // 1 = Нормально
  // 2 = Хороший сон
  // 3 = Отличный сон
  // 4 = Пересып

  if (hours < 5) {
    level = 0;
  } else if (hours <= 6.5) {
    level = 1;
  } else if (hours <= 7.5) {
    level = 2;
  } else if (hours <= 8.5) {
    level = 3;
  } else {
    level = 4;
  }

  if (rating < 4) {
    level = Math.min(level, 0);
  } else if (rating < 6) {
    level = Math.min(level, 1);
  } else if (rating < 8) {
    level = Math.min(level, 2);
  } else if (rating < 9) {
    level = Math.min(level, 3);
  }

  if (hours > 8.5) {
    level = 4;
  }

  const statuses = [
    { label: "Плохой сон", className: "is-bad" },
    { label: "Нормально", className: "is-mid" },
    { label: "Хороший сон", className: "is-good" },
    { label: "Отличный сон", className: "is-great" },
    { label: "Пересып", className: "is-oversleep" }
  ];

  const base = statuses[level];

  return {
    label: `${base.label} ${moodEmoji}`,
    className: base.className,
    moodEmoji
  };
}

function getWakeCountLabel(wakeCountValue) {
  const value = String(wakeCountValue || "0");
  if (value === "4plus") return "более 3";
  return value;
}

function getDreamLabel(dreamTypeValue) {
  const value = String(dreamTypeValue || "neutral");

  if (value === "nightmare") return "кошмар";
  if (value === "good") return "кайф";
  return "ничего такого";
}

function getStatusMeta(durationMinutes, sleepRating, moodRating) {
  const status = getSleepStatus(durationMinutes, sleepRating, moodRating);

  return {
    label: status.label,
    className: status.className
  };
}

function getRangeEntries(entries, days) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  return entries.filter((entry) => {
    if (!entry.sleep_date) return false;
    const date = new Date(`${entry.sleep_date}T00:00:00`);
    return date >= start && date <= end;
  });
}

function getWeekdayShort(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("ru-RU", { weekday: "short" });
}

function buildSummaryInsight(entries) {
  if (!entries.length) return "Пока недостаточно данных для вывода";

  const badCount = entries.filter((e) => {
    const status = getStatusMeta(e.duration_minutes, clampHalf(e.sleep_rating), clampRating(e.mood_rating));
    return status.className === "is-bad";
  }).length;

  const oversleepCount = entries.filter((e) => {
    const status = getStatusMeta(e.duration_minutes, clampHalf(e.sleep_rating), clampRating(e.mood_rating));
    return status.className === "is-oversleep";
  }).length;

  const wakeHeavyCount = entries.filter((e) => String(e.wake_count || "0") === "3" || String(e.wake_count || "0") === "4plus").length;
  const nightmareCount = entries.filter((e) => String(e.dream_type || "neutral") === "nightmare").length;

  if (wakeHeavyCount >= Math.max(2, Math.ceil(entries.length / 3))) {
    return "Часто мешают пробуждения";
  }

  if (nightmareCount >= Math.max(2, Math.ceil(entries.length / 4))) {
    return "Есть влияние кошмаров на качество сна";
  }

  if (oversleepCount >= Math.max(2, Math.ceil(entries.length / 3))) {
    return "Часто встречается пересып";
  }

  if (badCount >= Math.max(2, Math.ceil(entries.length / 3))) {
    return "Сон нестабильный, много слабых ночей";
  }

  return "В целом сон выглядит довольно стабильным";
}

function buildSummaryData(entries, days) {
  const filtered = getRangeEntries(entries, days);

  if (!filtered.length) {
    return {
      entries: [],
      avgSleep: "0.0",
      avgMood: "0.0",
      avgDuration: "0ч 0м",
      count: 0,
      counts: {
        bad: 0,
        mid: 0,
        good: 0,
        great: 0,
        oversleep: 0
      },
      insight: "Нет записей за выбранный период"
    };
  }

  const counts = {
    bad: 0,
    mid: 0,
    good: 0,
    great: 0,
    oversleep: 0
  };

  filtered.forEach((entry) => {
    const status = getStatusMeta(entry.duration_minutes, clampHalf(entry.sleep_rating), clampRating(entry.mood_rating));

    if (status.className === "is-bad") counts.bad += 1;
    if (status.className === "is-mid") counts.mid += 1;
    if (status.className === "is-good") counts.good += 1;
    if (status.className === "is-great") counts.great += 1;
    if (status.className === "is-oversleep") counts.oversleep += 1;
  });

  const avgSleep = (
    filtered.reduce((sum, e) => sum + clampHalf(e.sleep_rating), 0) / filtered.length
  ).toFixed(1);

  const avgMood = (
    filtered.reduce((sum, e) => sum + clampRating(e.mood_rating), 0) / filtered.length
  ).toFixed(1);

  const avgDurationMinutes = Math.round(
    filtered.reduce((sum, e) => sum + (Number(e.duration_minutes) || 0), 0) / filtered.length
  );

  return {
    entries: filtered,
    avgSleep,
    avgMood,
    avgDuration: formatDuration(avgDurationMinutes),
    count: filtered.length,
    counts,
    insight: buildSummaryInsight(filtered)
  };
}

function renderSummary(entries, range) {
  if (!DOM.summaryPanel) return;

  const data = buildSummaryData(entries, range);
  const title = range === 7 ? "Сводка за 7 дней" : "Сводка за 30 дней";

  let stripHtml = "";

  if (range === 7) {
    stripHtml = `
      <div class="sleep-summary-strip sleep-summary-strip--7">
        ${data.entries.map((entry) => {
          const status = getStatusMeta(entry.duration_minutes, clampHalf(entry.sleep_rating), clampRating(entry.mood_rating));
          return `
            <div class="sleep-summary-day">
              <div class="sleep-summary-day__label">${escapeHtml(getWeekdayShort(entry.sleep_date))}</div>
              <div class="sleep-summary-dot ${status.className}"></div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  } else {
    stripHtml = `
      <div class="sleep-summary-strip sleep-summary-strip--30">
        ${data.entries.map((entry) => {
          const status = getStatusMeta(entry.duration_minutes, clampHalf(entry.sleep_rating), clampRating(entry.mood_rating));
          return `<div class="sleep-summary-dot ${status.className}"></div>`;
        }).join("")}
      </div>
    `;
  }

  DOM.summaryPanel.innerHTML = `
    <div class="sleep-summary-panel__title">${title}</div>
    ${stripHtml}
    <div class="sleep-summary-metrics">
      <div class="sleep-summary-line">
        <strong>Сон ${data.avgSleep}/10</strong> • ${data.avgDuration} • ${data.count} записей
      </div>
      <div class="sleep-summary-line">
        Настр. ${data.avgMood}/10 • Плохой ${data.counts.bad} • Хороший ${data.counts.good}
      </div>
    </div>
    <div class="sleep-summary-insight">${escapeHtml(data.insight)}</div>
  `;

  DOM.summaryPanel.hidden = false;
}

/* =========================
   MODAL
========================= */

function syncSleepSliderUI() {
  if (DOM.moodRatingInput && DOM.moodRatingValue) {
    DOM.moodRatingValue.textContent = formatRatingValue(DOM.moodRatingInput.value);
    setSliderProgress(DOM.moodRatingInput);
  }
}

function resetSleepForm() {
  if (DOM.dateInput) DOM.dateInput.value = getTodayDateString();
  if (DOM.bedInput) DOM.bedInput.value = "";
  if (DOM.wakeInput) DOM.wakeInput.value = "";
  if (DOM.wakeCountInput) DOM.wakeCountInput.value = "0";
  if (DOM.dreamTypeInput) DOM.dreamTypeInput.value = "neutral";
  if (DOM.moodRatingInput) DOM.moodRatingInput.value = "0";
  if (DOM.noteInput) DOM.noteInput.value = "";

  syncSleepSliderUI();
}

function openSleepModal(entry = null) {
  if (!DOM.modal) return;

  if (entry) {
    modalState.mode = "edit";
    modalState.editingId = entry.id;

    if (DOM.dateInput) DOM.dateInput.value = String(entry.sleep_date || "");
    if (DOM.bedInput) DOM.bedInput.value = String(entry.bed_time || "");
    if (DOM.wakeInput) DOM.wakeInput.value = String(entry.wake_time || "");
    if (DOM.wakeCountInput) DOM.wakeCountInput.value = String(entry.wake_count || "0");
    if (DOM.dreamTypeInput) DOM.dreamTypeInput.value = String(entry.dream_type || "neutral");
    if (DOM.moodRatingInput) DOM.moodRatingInput.value = String(clampRating(entry.mood_rating));
    if (DOM.noteInput) DOM.noteInput.value = String(entry.note || "");
  } else {
    modalState.mode = "create";
    modalState.editingId = null;
    resetSleepForm();
  }

  if (DOM.modalSave) {
    DOM.modalSave.textContent = "Сохранить";
  }

  syncSleepSliderUI();
  DOM.modal.classList.add("active");

  requestAnimationFrame(() => {
    DOM.dateInput?.focus();
  });
}

function closeSleepModal() {
  DOM.modal?.classList.remove("active");
  modalState.mode = "create";
  modalState.editingId = null;
}

async function saveSleepEntry() {
  const date = String(DOM.dateInput?.value || "").trim();
  const bed = String(DOM.bedInput?.value || "").trim();
  const wake = String(DOM.wakeInput?.value || "").trim();
  const wakeCount = String(DOM.wakeCountInput?.value || "0").trim();
  const dreamType = String(DOM.dreamTypeInput?.value || "neutral").trim();
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
  const sleepRating = getAutoSleepRating(duration, wakeCount, dreamType);

  const payload = {
    sleep_date: date,
    bed_time: bed,
    wake_time: wake,
    duration_minutes: duration,
    sleep_rating: sleepRating,
    mood_rating: moodRating,
    wake_count: wakeCount,
    dream_type: dreamType,
    note
  };

  if (DOM.modalSave) {
    DOM.modalSave.disabled = true;
  }

  try {
    if (modalState.mode === "edit" && modalState.editingId) {
      await updateSleepEntry(modalState.editingId, payload);
    } else {
      const { error } = await supabaseClient
        .from("sleep_entries")
        .insert(payload);

      if (error) {
        console.error("insertSleep error:", error);
        alert(`Не удалось добавить запись: ${error.message}`);
        return;
      }
    }

    closeSleepModal();
    await init();
  } catch (error) {
    console.error(error);
    alert(`Не удалось сохранить запись: ${error.message}`);
  } finally {
    if (DOM.modalSave) {
      DOM.modalSave.disabled = false;
    }
  }
}

function setupSleepModal() {
  if (!DOM.modal) return;

  DOM.addBtn?.addEventListener("click", () => openSleepModal(null));
  DOM.modalCancel?.addEventListener("click", closeSleepModal);
  DOM.modalSave?.addEventListener("click", saveSleepEntry);

  DOM.modal.addEventListener("click", (e) => {
    if (e.target === DOM.modal) {
      closeSleepModal();
    }
  });

  DOM.moodRatingInput?.addEventListener("input", syncSleepSliderUI);

  resetSleepForm();
}

function updateSummaryToggleUI() {
  if (!DOM.summarySwitcher) return;

  DOM.summarySwitcher.querySelectorAll("[data-range]").forEach((btn) => {
    const range = Number(btn.dataset.range);
    btn.classList.toggle("is-active", summaryState.openedRange === range);
  });

  if (DOM.summaryPanel) {
    DOM.summaryPanel.hidden = summaryState.openedRange == null;
  }
}

function setupSummaryToggle() {
  if (!DOM.summarySwitcher) return;

  DOM.summarySwitcher.querySelectorAll("[data-range]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const range = Number(btn.dataset.range);

      if (summaryState.openedRange === range) {
        summaryState.openedRange = null;
        updateSummaryToggleUI();
        if (DOM.summaryPanel) {
          DOM.summaryPanel.innerHTML = "";
          DOM.summaryPanel.hidden = true;
        }
        return;
      }

      summaryState.openedRange = range;
      updateSummaryToggleUI();
      renderSummary(window.__sleepEntries || [], range);
    });
  });

  updateSummaryToggleUI();
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

function window.__sleepEntries = entries || [];render(entries, loadError = null) {
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
    if (DOM.summaryPanel) {
  DOM.summaryPanel.innerHTML = "";
  DOM.summaryPanel.hidden = true;
}
updateSummaryToggleUI();
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
    if (summaryState.openedRange != null) {
  renderSummary(entries, summaryState.openedRange);
} else if (DOM.summaryPanel) {
  DOM.summaryPanel.innerHTML = "";
  DOM.summaryPanel.hidden = true;
}
updateSummaryToggleUI();
    return;
  }

  entries.forEach((entry) => {
    const wrapper = document.createElement("div");
    wrapper.className = "swipe-wrapper sleep-entry-wrap";

    const deleteBg = document.createElement("div");
    deleteBg.className = "delete-bg";
    deleteBg.textContent = "Удалить";

    const el = document.createElement("div");
    el.className = "card sleep-entry-card";

    const sleepRating = clampHalf(entry.sleep_rating);
    const moodRating = clampRating(entry.mood_rating);
    const wakeCount = String(entry.wake_count || "0");
    const dreamType = String(entry.dream_type || "neutral");
    const safeNote = String(entry.note || "").trim();
    const status = getSleepStatus(entry.duration_minutes, sleepRating, moodRating);
    const noteClass = safeNote ? "" : "is-empty";

    el.innerHTML = `
      <div class="card-content sleep-card-content">
        <div class="card-right-column sleep-card-column">
          <div class="sleep-card-head">
            <div class="sleep-card-date">${escapeHtml(formatSleepDate(entry.sleep_date))}</div>
            <div class="sleep-status-chip ${status.className}">${escapeHtml(status.label)}</div>
          </div>

          <div class="sleep-chip-row">
            <div class="sleep-info-chip">🌙 ${escapeHtml(entry.bed_time || "--:--")}</div>
            <div class="sleep-info-chip">☀️ ${escapeHtml(entry.wake_time || "--:--")}</div>
            <div class="sleep-info-chip">⏱ ${escapeHtml(formatDuration(entry.duration_minutes))}</div>
          </div>

          <div class="sleep-chip-row">
            <div class="sleep-info-chip">Пробуждений: ${escapeHtml(getWakeCountLabel(wakeCount))}</div>
            <div class="sleep-info-chip">Снилось: ${escapeHtml(getDreamLabel(dreamType))}</div>
          </div>

          <div class="sleep-chip-row sleep-chip-row--metrics">
            <div class="sleep-metric-chip">
              <span>Сон</span>
              <strong>${formatAutoSleepRating(sleepRating)}</strong>
            </div>
            <div class="sleep-metric-chip">
              <span>Настроение</span>
              <strong>${moodRating}/10</strong>
            </div>
          </div>

          <div class="sleep-note-block ${noteClass}" data-role="sleep-note-edit">
            ${safeNote ? escapeHtml(safeNote) : "Без заметки"}
          </div>
        </div>
      </div>
    `;

    const noteBlock = el.querySelector('[data-role="sleep-note-edit"]');
    noteBlock?.addEventListener("click", (e) => {
      e.stopPropagation();
      openSleepModal(entry);
    });

    enableSleepSwipeDelete(wrapper, el, entry);

    wrapper.appendChild(deleteBg);
    wrapper.appendChild(el);
    DOM.list.appendChild(wrapper);
  });

  const avgSleep = (
    entries.reduce((sum, e) => sum + clampHalf(e.sleep_rating), 0) / entries.length
  ).toFixed(1);

  const avgDuration = Math.round(
    entries.reduce((sum, e) => sum + (Number(e.duration_minutes) || 0), 0) / entries.length
  );

  if (summaryState.openedRange != null) {
  renderSummary(entries, summaryState.openedRange);
} else if (DOM.summaryPanel) {
  DOM.summaryPanel.innerHTML = "";
  DOM.summaryPanel.hidden = true;
}

updateSummaryToggleUI();

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
  const result = await fetchSleep();
  render(result.data, result.error);
}

setupNavigation();
setupSleepModal();
setupConfirm();
setupSummaryToggle();
init();
