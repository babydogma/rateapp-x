const DOM = {
  list: document.getElementById("sleepList"),
  addBtn: document.getElementById("addSleepBtn"),

  modal: document.getElementById("sleepModal"),
  modalCancel: document.getElementById("sleepModalCancel"),
  modalSave: document.getElementById("sleepModalSave"),

  dateInput: document.getElementById("sleepDateInput"),
  bedInput: document.getElementById("bedTimeInput"),
  wakeInput: document.getElementById("wakeTimeInput"),

  wakeCountInput: document.getElementById("wakeCountInput"),
  wakeAfterSleepInput: document.getElementById("wakeAfterSleepInput"),
  dreamTypeInput: document.getElementById("dreamTypeInput"),
  fallAsleepSpeedInput: document.getElementById("fallAsleepSpeedInput"),

  energyAfterSleepInput: document.getElementById("energyAfterSleepInput"),
  energyAfterSleepValue: document.getElementById("energyAfterSleepValue"),

  noteInput: document.getElementById("sleepNoteInput"),

  confirmModal: document.getElementById("sleepConfirmModal"),
  confirmTitle: document.getElementById("sleepConfirmTitle"),
  confirmText: document.getElementById("sleepConfirmText"),
  confirmCancel: document.getElementById("sleepConfirmCancel"),
  confirmDelete: document.getElementById("sleepConfirmDelete"),

  summarySwitcher: document.getElementById("sleepSummarySwitcher"),
  summaryPanel: document.getElementById("sleepSummaryPanel"),

  monthFilterWrap: document.getElementById("sleepMonthFilterWrap"),
  monthFilterBtn: document.getElementById("sleepMonthFilterBtn"),
  monthFilterMenu: document.getElementById("sleepMonthFilterMenu"),
};

const modalState = {
  onConfirm: null,
  mode: "create",
  editingId: null
};

const summaryState = {
  openedRange: 7,
  selectedMonth: null,
  selectedYear: null
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

function clamp(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, num));
}

function clampRating(value) {
  return clamp(value, 0, 10);
}

function clampHalf(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  const rounded = Math.round(num * 2) / 2;
  return Math.max(0, Math.min(10, rounded));
}

function clampPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
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
  const safe = Math.max(0, Number(minutes) || 0);
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

function formatPercent(value) {
  return `${clampPercent(value)}%`;
}

function formatApproxMinutes(value) {
  const safe = Math.max(0, Math.round(Number(value) || 0));
  return `~${safe} мин`;
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

function getNormalizedSleepDate(dateStr) {
  if (!dateStr) return "";
  return dateStr;
}

/* =========================
   DATE / TIMELINE
========================= */

function getAnchorDate(entries) {
  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const latestEntryDate = entries.reduce((latest, entry) => {
    if (!entry.sleep_date) return latest;
    const entryDate = new Date(`${entry.sleep_date}T12:00:00`);
    return entryDate > latest ? entryDate : latest;
  }, todayOnly);

  return latestEntryDate > todayOnly ? latestEntryDate : todayOnly;
}

function buildTimelineDays(entries, days) {
  const anchorDate = getAnchorDate(entries);
  const byDate = new Map();

  entries.forEach((entry) => {
    if (!entry.sleep_date) return;
    byDate.set(entry.sleep_date, entry);
  });

  const result = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(
      anchorDate.getFullYear(),
      anchorDate.getMonth(),
      anchorDate.getDate()
    );
    date.setDate(date.getDate() - i);

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const key = `${yyyy}-${mm}-${dd}`;

    result.push({
      date: key,
      entry: byDate.get(key) || null
    });
  }

  return result;
}

function getDaySummaryParts(dateStr) {
  const date = new Date(`${dateStr}T12:00:00`);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const weekday = date.toLocaleDateString("ru-RU", { weekday: "short" });

  return {
    dateLabel: `${day}.${month}`,
    weekdayLabel: weekday.charAt(0).toUpperCase() + weekday.slice(1)
  };
}

function getMonthNameRu(month) {
  const names = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ];
  return names[month - 1] || "";
}

function getMonthLabel(month, year) {
  return `${getMonthNameRu(month)} ${year}`;
}

function getAvailableMonths(entries) {
  const seen = new Set();
  const result = [];

  entries.forEach((entry) => {
    if (!entry.sleep_date) return;

    const [year, month] = entry.sleep_date.split("-").map(Number);
    const key = `${year}-${String(month).padStart(2, "0")}`;

    if (seen.has(key)) return;
    seen.add(key);

    result.push({ year, month, key });
  });

  result.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  return result;
}

function ensureSelectedMonth(entries) {
  const months = getAvailableMonths(entries);

  if (!months.length) {
    const today = new Date();
    summaryState.selectedMonth = today.getMonth() + 1;
    summaryState.selectedYear = today.getFullYear();
    return;
  }

  const hasSelected = months.some(
    (item) =>
      item.month === summaryState.selectedMonth &&
      item.year === summaryState.selectedYear
  );

  if (!hasSelected) {
    summaryState.selectedMonth = months[0].month;
    summaryState.selectedYear = months[0].year;
  }
}

function getMonthEntries(entries, year, month) {
  return entries
    .filter((entry) => {
      if (!entry.sleep_date) return false;
      const [entryYear, entryMonth] = entry.sleep_date.split("-").map(Number);
      return entryYear === year && entryMonth === month;
    })
    .sort((a, b) => new Date(`${a.sleep_date}T12:00:00`) - new Date(`${b.sleep_date}T12:00:00`));
}

function setupMonthFilter(entries) {
  if (!DOM.monthFilterBtn || !DOM.monthFilterMenu) return;

  ensureSelectedMonth(entries);
  const months = getAvailableMonths(entries);

  DOM.monthFilterBtn.textContent = getMonthLabel(
    summaryState.selectedMonth,
    summaryState.selectedYear
  );

  DOM.monthFilterMenu.innerHTML = months.map((item) => {
    const active =
      item.month === summaryState.selectedMonth &&
      item.year === summaryState.selectedYear;

    return `
      <button
        type="button"
        class="sleep-month-filter-option ${active ? "is-active" : ""}"
        data-month="${item.month}"
        data-year="${item.year}"
      >
        ${escapeHtml(getMonthLabel(item.month, item.year))}
      </button>
    `;
  }).join("");

  DOM.monthFilterMenu.querySelectorAll("[data-month][data-year]").forEach((btn) => {
    btn.addEventListener("click", () => {
      summaryState.selectedMonth = Number(btn.dataset.month);
      summaryState.selectedYear = Number(btn.dataset.year);
      DOM.monthFilterMenu.hidden = true;
      renderSummary(window.__sleepEntries || [], 30);
    });
  });
}

function getWeekdayShortRu(dateStr) {
  const date = new Date(`${dateStr}T12:00:00`);
  const weekday = date.toLocaleDateString("ru-RU", { weekday: "short" });
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

function getMonthWeeks(entries, year, month) {
  const byDate = new Map();

  entries.forEach((entry) => {
    if (entry.sleep_date) {
      byDate.set(entry.sleep_date, entry);
    }
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const weeks = [];
  let currentWeek = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    currentWeek.push({
      date: key,
      dayLabel: getWeekdayShortRu(key),
      entry: byDate.get(key) || null
    });

    if (currentWeek.length === 7 || day === daysInMonth) {
      weeks.push({
        startDate: currentWeek[0].date,
        endDate: currentWeek[currentWeek.length - 1].date,
        days: currentWeek
      });
      currentWeek = [];
    }
  }

  return weeks;
}

function getDateShortLabel(dateStr) {
  const date = new Date(`${dateStr}T12:00:00`);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
}

function getWeekRangeLabel(startDateStr, endDateStr) {
  return `${getDateShortLabel(startDateStr)} — ${getDateShortLabel(endDateStr)}`;
}

/* =========================
   LABELS
========================= */

function getFallAsleepMinutes(fallAsleepSpeedValue) {
  const value = String(fallAsleepSpeedValue || "medium");

  if (value === "fast") return 10;
  if (value === "slow") return 40;
  if (value === "very_slow") return 70;
  return 20;
}

function getFallAsleepLabel(fallAsleepSpeedValue) {
  const value = String(fallAsleepSpeedValue || "medium");

  if (value === "fast") return "быстро";
  if (value === "slow") return "долго";
  if (value === "very_slow") return "очень долго";
  return "средне";
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

function getWakeAfterSleepLabel(value) {
  const safe = Number(value) || 0;

  if (safe <= 0) return "почти не было";
  if (safe <= 5) return "до 5 мин";
  if (safe <= 15) return "5–15 мин";
  if (safe <= 30) return "15–30 мин";
  if (safe <= 60) return "30–60 мин";
  return "60+ мин";
}

/* =========================
   SLEEP MODEL V2
========================= */

function getEstimatedWasoMinutesFromWakeCount(wakeCountValue) {
  const value = String(wakeCountValue || "0");

  if (value === "0") return 0;
  if (value === "1") return 8;
  if (value === "2") return 18;
  if (value === "3") return 30;
  return 45;
}

function getWakeAfterSleepMinutesValue(rawValue, wakeCountValue = "0") {
  const parsed = Number(rawValue);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return getEstimatedWasoMinutesFromWakeCount(wakeCountValue);
}

function getTotalSleepTimeMinutes(timeInBedMinutes, sleepLatencyMinutes, wasoMinutes) {
  return Math.max(timeInBedMinutes - sleepLatencyMinutes - wasoMinutes, 0);
}

function getSleepEfficiencyPercent(totalSleepTimeMinutes, timeInBedMinutes) {
  if (!timeInBedMinutes || timeInBedMinutes <= 0) return 0;
  return clampPercent((totalSleepTimeMinutes / timeInBedMinutes) * 100);
}

function getDurationScore(tstMinutes) {
  const h = tstMinutes / 60;

  if (h < 4.5) return 1.0;
  if (h < 5.5) return 3.0;
  if (h < 6.5) return 5.0;
  if (h < 7.0) return 6.5;
  if (h <= 8.5) return 9.5;
  if (h <= 9.5) return 8.0;
  if (h <= 10.5) return 6.0;
  return 4.5;
}

function getContinuityScore(se, solMinutes, wasoMinutes, dreamTypeValue) {
  let score = 10 - Math.max(0, (85 - se) / 6);

  if (solMinutes > 20) score -= 0.5;
  if (solMinutes > 40) score -= 0.75;
  if (solMinutes > 60) score -= 0.75;

  if (wasoMinutes >= 15) score -= 0.5;
  if (wasoMinutes >= 30) score -= 0.75;
  if (wasoMinutes >= 45) score -= 0.75;

  if (dreamTypeValue === "nightmare") score -= 0.75;
  if (dreamTypeValue === "good") score += 0.25;

  return clampHalf(Math.max(0, Math.min(10, score)));
}

function getFinalSleepScore(durationScore, continuityScore, subjectiveScore) {
  const raw =
    durationScore * 0.40 +
    continuityScore * 0.35 +
    subjectiveScore * 0.25;

  return clampHalf(raw);
}

function getSleepStatusV2(tstMinutes, se, finalScore, energyAfterSleep, wakeCountValue, wasoMinutes) {
  const hours = (Number(tstMinutes) || 0) / 60;
  const energy = Number(energyAfterSleep) || 0;
  const waso = Number(wasoMinutes) || 0;
  const wakeRaw = String(wakeCountValue || "0");
  const wakeCount = wakeRaw === "4plus" ? 4 : Number(wakeRaw) || 0;

  if (hours >= 9.5 && se >= 80 && finalScore >= 7 && energy >= 6) {
    return { label: "Пересып", emoji: "🥴", className: "is-oversleep" };
  }

  if (finalScore < 4.5) {
    return { label: "Плохо", emoji: "😵", className: "is-bad" };
  }

  if (finalScore < 6.5) {
    return { label: "Пойдёт", emoji: "🙂", className: "is-mid" };
  }

  if (energy <= 2 && finalScore < 6) {
    return { label: "Плохо", emoji: "😵", className: "is-bad" };
  }

  if ((wakeCount >= 4 || waso >= 45) && energy <= 3 && finalScore < 7) {
    return { label: "Плохо", emoji: "😵", className: "is-bad" };
  }

  if (energy <= 4 || finalScore < 8.5) {
    return { label: "Нормально", emoji: "😊", className: "is-good" };
  }

  return { label: "Отлично", emoji: "🥹", className: "is-great" };
}

function getSleepInsightData({ durationMinutes, wakeCount, energy, fallAsleepSpeed, wasoMinutes }) {
  const hours = (Number(durationMinutes) || 0) / 60;
  const energyVal = Number(energy) || 0;
  const wakeRaw = String(wakeCount || "0");
  const wakeVal = wakeRaw === "4plus" ? 4 : Number(wakeRaw) || 0;
  const fallValue = String(fallAsleepSpeed || "medium");
  const waso = Number(wasoMinutes) || 0;

  if (hours < 6) {
    return {
      insight: "Сна было мало — восстановление слабое.",
      advice: "Сегодня лучше лечь пораньше."
    };
  }

  if (waso >= 30 || wakeVal >= 3) {
    return {
      insight: "Сон был прерывистым, это заметно снижает восстановление.",
      advice: "Стоит понаблюдать, что именно будит тебя ночью."
    };
  }

  if (fallValue === "slow" || fallValue === "very_slow") {
    return {
      insight: "Засыпание было долгим — сон начался менее плавно.",
      advice: "Попробуй сделать вечерний режим спокойнее."
    };
  }

  if (energyVal <= 4 && hours >= 7) {
    return {
      insight: "По времени сон был нормальный, но по ощущениям восстановление слабое.",
      advice: ""
    };
  }

  if (wakeVal >= 2 && hours < 7) {
    return {
      insight: "Сон был и коротким, и прерывистым — восстановление среднее.",
      advice: ""
    };
  }

  if (wakeVal >= 2 || waso >= 15) {
    return {
      insight: "Ночное бодрствование слегка снизило качество сна.",
      advice: ""
    };
  }

  return {
    insight: "Сон прошёл стабильно — организм восстановился.",
    advice: ""
  };
}

/* =========================
   SUMMARY
========================= */

function getStatusMeta(durationMinutes, sleepEfficiency, sleepScore, energyAfterSleep, wakeCountValue, wasoMinutes) {
  return getSleepStatusV2(
    durationMinutes,
    sleepEfficiency,
    sleepScore,
    energyAfterSleep,
    wakeCountValue,
    wasoMinutes
  );
}

function getRangeEntries(entries, days) {
  if (!entries.length) return [];

  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const latestEntryDate = entries.reduce((latest, entry) => {
    if (!entry.sleep_date) return latest;
    const entryDate = new Date(`${entry.sleep_date}T12:00:00`);
    return entryDate > latest ? entryDate : latest;
  }, todayOnly);

  const anchorDate = latestEntryDate > todayOnly ? latestEntryDate : todayOnly;

  const end = new Date(
    anchorDate.getFullYear(),
    anchorDate.getMonth(),
    anchorDate.getDate(),
    23, 59, 59, 999
  );

  const start = new Date(
    anchorDate.getFullYear(),
    anchorDate.getMonth(),
    anchorDate.getDate()
  );
  start.setDate(start.getDate() - (days - 1));

  return entries
    .filter((entry) => {
      if (!entry.sleep_date) return false;
      const date = new Date(`${entry.sleep_date}T12:00:00`);
      return date >= start && date <= end;
    })
    .sort((a, b) => new Date(`${a.sleep_date}T12:00:00`) - new Date(`${b.sleep_date}T12:00:00`));
}

function buildSummaryInsight(entries, stats) {
  if (!entries.length) return "Нет записей за выбранный период";

  const wakeHeavyCount = entries.filter((e) => {
    const waso = Number(e.wake_after_sleep_minutes) || 0;
    return waso >= 30 || ["2", "3", "4plus"].includes(String(e.wake_count || "0"));
  }).length;

  const wakeHeavyShare = wakeHeavyCount / entries.length;

  if (stats.avgSleepDurationMinutes < 6 * 60) {
    return "Основная проблема — недосып";
  }

  if (stats.avgSleepLatencyMinutes > 30) {
    return "Основная проблема — долгое засыпание";
  }

  if (stats.avgSleepEfficiency < 75) {
    return "Сон получается не очень эффективным — слишком много потерь ночью";
  }

  if (wakeHeavyShare >= 0.3) {
    return "Сон часто рвётся из-за ночного бодрствования";
  }

  if (stats.avgSleepScore >= 6 && stats.avgEnergy <= 4.5) {
    return "Сон выглядит терпимым, но восстановление по ощущениям слабое";
  }

  return "Сон в целом выглядит довольно стабильным";
}

function buildSummaryData(entries, days) {
  const filtered = days >= 9999 ? [...entries] : getRangeEntries(entries, days);

  const counts = {
    bad: 0,
    mid: 0,
    good: 0,
    great: 0,
    oversleep: 0
  };

  if (!filtered.length) {
    return {
      entries: [],
      count: 0,
      counts,
      avgSleepScore: "0.0",
      avgEnergy: "0.0",
      avgDuration: "0ч 0м",
      avgEfficiency: "0%",
      avgLatency: "~0 мин",
      avgWakeAfterSleep: "~0 мин",
      avgSleepDurationMinutes: 0,
      avgSleepLatencyMinutes: 0,
      avgWakeAfterSleepMinutes: 0,
      avgSleepEfficiency: 0,
      insight: "Нет записей за выбранный период"
    };
  }

  filtered.forEach((entry) => {
    const status = getStatusMeta(
  Number(entry.sleep_duration_minutes) || 0,
  clampPercent(entry.sleep_efficiency),
  clampHalf(entry.sleep_score),
  clampRating(entry.energy_after_sleep),
  String(entry.wake_count || "0"),
  Number(entry.wake_after_sleep_minutes) || 0
);

    if (status.className === "is-bad") counts.bad += 1;
    if (status.className === "is-mid") counts.mid += 1;
    if (status.className === "is-good") counts.good += 1;
    if (status.className === "is-great") counts.great += 1;
    if (status.className === "is-oversleep") counts.oversleep += 1;
  });

  const avgSleepScoreRaw =
    filtered.reduce((sum, e) => sum + clampHalf(e.sleep_score), 0) / filtered.length;

  const avgEnergyRaw =
    filtered.reduce((sum, e) => sum + clampRating(e.energy_after_sleep), 0) / filtered.length;

  const avgSleepDurationMinutes = Math.round(
    filtered.reduce((sum, e) => sum + (Number(e.sleep_duration_minutes) || 0), 0) / filtered.length
  );

  const avgSleepLatencyMinutes = Math.round(
    filtered.reduce((sum, e) => sum + (Number(e.sleep_latency_minutes) || 0), 0) / filtered.length
  );

  const avgWakeAfterSleepMinutes = Math.round(
    filtered.reduce((sum, e) => sum + (Number(e.wake_after_sleep_minutes) || 0), 0) / filtered.length
  );

  const avgSleepEfficiency = Math.round(
    filtered.reduce((sum, e) => sum + clampPercent(e.sleep_efficiency), 0) / filtered.length
  );

  return {
    entries: filtered,
    count: filtered.length,
    counts,
    avgSleepScore: avgSleepScoreRaw.toFixed(1),
    avgEnergy: avgEnergyRaw.toFixed(1),
    avgDuration: formatDuration(avgSleepDurationMinutes),
    avgEfficiency: formatPercent(avgSleepEfficiency),
    avgLatency: formatApproxMinutes(avgSleepLatencyMinutes),
    avgWakeAfterSleep: formatApproxMinutes(avgWakeAfterSleepMinutes),
    avgSleepDurationMinutes,
    avgSleepLatencyMinutes,
    avgWakeAfterSleepMinutes,
    avgSleepEfficiency,
    insight: buildSummaryInsight(filtered, {
      avgSleepScore: avgSleepScoreRaw,
      avgEnergy: avgEnergyRaw,
      avgSleepDurationMinutes,
      avgSleepLatencyMinutes,
      avgWakeAfterSleepMinutes,
      avgSleepEfficiency
    })
  };
}

function renderSummary(entries, range) {
  if (!DOM.summaryPanel) return;

  let data;
  let title;
  let stripHtml = "";
  let monthFilterHtml = "";

  if (range === 7) {
    data = buildSummaryData(entries, 7);
    title = "Сводка за 7 дней";

    const timeline = buildTimelineDays(entries, 7);

    stripHtml = `
      <div class="sleep-summary-strip sleep-summary-strip--7">
        ${timeline.map((day) => {
          let statusClass = "is-empty";

          if (day.entry) {
            const status = getStatusMeta(
              Number(day.entry.sleep_duration_minutes) || 0,
              clampPercent(day.entry.sleep_efficiency),
              clampHalf(day.entry.sleep_score),
              clampRating(day.entry.energy_after_sleep),
              String(day.entry.wake_count || "0"),
              Number(day.entry.wake_after_sleep_minutes) || 0
            );
            statusClass = status.className;
          }

          const labels = getDaySummaryParts(day.date);

          return `
            <div class="sleep-summary-day">
              <div class="sleep-summary-day__date">${escapeHtml(labels.dateLabel)}</div>
              <div class="sleep-summary-dot ${statusClass}"></div>
              <div class="sleep-summary-day__weekday">${escapeHtml(labels.weekdayLabel)}</div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  } else {
    ensureSelectedMonth(entries);

    const monthEntries = getMonthEntries(
      entries,
      summaryState.selectedYear,
      summaryState.selectedMonth
    );

    data = buildSummaryData(monthEntries, 9999);
    title = "Сводка за месяц";

    const monthWeeks = getMonthWeeks(
      monthEntries,
      summaryState.selectedYear,
      summaryState.selectedMonth
    );

    monthFilterHtml = `
      <div class="sleep-month-filter-wrap" id="sleepMonthFilterWrap">
        <button
          type="button"
          class="sleep-month-filter-btn"
          id="sleepMonthFilterBtn"
        >
          ${escapeHtml(getMonthLabel(summaryState.selectedMonth, summaryState.selectedYear))}
        </button>
        <div class="sleep-month-filter-menu" id="sleepMonthFilterMenu" hidden></div>
      </div>
    `;

    stripHtml = `
      <div class="sleep-summary-month-weeks">
        ${monthWeeks.map((week) => {
          return `
            <div class="sleep-summary-week-block">
              <div class="sleep-summary-week-range">
                ${escapeHtml(getWeekRangeLabel(week.startDate, week.endDate))}
              </div>

              <div class="sleep-summary-week-days">
                ${week.days.map((day) => {
                  let statusClass = "is-empty";

                  if (day.entry) {
                    const status = getStatusMeta(
                      Number(day.entry.sleep_duration_minutes) || 0,
                      clampPercent(day.entry.sleep_efficiency),
                      clampHalf(day.entry.sleep_score),
                      clampRating(day.entry.energy_after_sleep),
                      String(day.entry.wake_count || "0"),
                      Number(day.entry.wake_after_sleep_minutes) || 0
                    );
                    statusClass = status.className;
                  }

                  return `
                    <div class="sleep-summary-week-day">
                      <div class="sleep-summary-dot ${statusClass}"></div>
                      <div class="sleep-summary-weekday-label">
                        ${escapeHtml(day.dayLabel)}
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  DOM.summaryPanel.innerHTML = `
    <div class="sleep-summary-head">
      <div class="sleep-summary-panel__title">${title}</div>
      ${monthFilterHtml}
    </div>

    ${stripHtml}

    <div class="sleep-summary-metrics sleep-summary-metrics--focus">
      <div class="sleep-summary-line sleep-summary-line--focus">
  <strong>Качество ${data.avgSleepScore}/10</strong> • Энергия ${data.avgEnergy}/10
</div>
      <div class="sleep-summary-line sleep-summary-line--focus sleep-summary-line--muted">
  Ср. длительность: ${data.avgDuration} • Засыпание: ${data.avgLatency} • Ночью: ${data.avgWakeAfterSleep}
</div>
    </div>

    <div class="sleep-summary-insight sleep-summary-insight--focus">
      ${escapeHtml(data.insight)}
    </div>
  `;

  DOM.summaryPanel.hidden = false;

  if (range === 30) {
    DOM.monthFilterWrap = document.getElementById("sleepMonthFilterWrap");
    DOM.monthFilterBtn = document.getElementById("sleepMonthFilterBtn");
    DOM.monthFilterMenu = document.getElementById("sleepMonthFilterMenu");

    setupMonthFilter(entries);

    DOM.monthFilterBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      DOM.monthFilterMenu.hidden = !DOM.monthFilterMenu.hidden;
    });

    document.addEventListener("click", handleMonthFilterOutsideClick, { once: true });
  }
}

function handleMonthFilterOutsideClick(e) {
  if (!DOM.monthFilterWrap || !DOM.monthFilterMenu) return;
  if (DOM.monthFilterWrap.contains(e.target)) return;
  DOM.monthFilterMenu.hidden = true;
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
   MODAL
========================= */

function syncSleepSliderUI() {
  if (DOM.energyAfterSleepInput && DOM.energyAfterSleepValue) {
    DOM.energyAfterSleepValue.textContent = formatRatingValue(DOM.energyAfterSleepInput.value);
    setSliderProgress(DOM.energyAfterSleepInput);
  }
}

function syncWakeCountRadioUI(value = "0") {
  const safeValue = String(value || "0");
  const group = document.getElementById("wakeCountGroup");

  if (DOM.wakeCountInput) {
    DOM.wakeCountInput.value = safeValue;
  }

  if (!group) return;

  group.querySelectorAll(".sleep-radio").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.value === safeValue);
  });
}

function resetSleepForm() {
  if (DOM.dateInput) DOM.dateInput.value = getTodayDateString();
  if (DOM.bedInput) DOM.bedInput.value = "";
  if (DOM.wakeInput) DOM.wakeInput.value = "";
  if (DOM.wakeCountInput) DOM.wakeCountInput.value = "0";
  if (DOM.wakeAfterSleepInput) DOM.wakeAfterSleepInput.value = "15";
  syncWakeCountRadioUI("0");
  if (DOM.dreamTypeInput) DOM.dreamTypeInput.value = "neutral";
  if (DOM.fallAsleepSpeedInput) DOM.fallAsleepSpeedInput.value = "medium";
  if (DOM.energyAfterSleepInput) DOM.energyAfterSleepInput.value = "0";
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
    syncWakeCountRadioUI(String(entry.wake_count || "0"));
    if (DOM.wakeAfterSleepInput) {
      const currentWaso = Number(entry.wake_after_sleep_minutes);
      DOM.wakeAfterSleepInput.value = String(
        Number.isFinite(currentWaso)
          ? currentWaso
          : getEstimatedWasoMinutesFromWakeCount(entry.wake_count)
      );
    }
    if (DOM.dreamTypeInput) DOM.dreamTypeInput.value = String(entry.dream_type || "neutral");
    if (DOM.fallAsleepSpeedInput) DOM.fallAsleepSpeedInput.value = String(entry.fall_asleep_speed || "medium");
    if (DOM.energyAfterSleepInput) DOM.energyAfterSleepInput.value = String(clampRating(entry.energy_after_sleep));
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
  const selectedDate = String(DOM.dateInput?.value || "").trim();
  const bedTime = String(DOM.bedInput?.value || "").trim();
  const wakeTime = String(DOM.wakeInput?.value || "").trim();
  const wakeCount = String(DOM.wakeCountInput?.value || "0").trim();
  let wakeAfterSleepMinutes = getWakeAfterSleepMinutesValue(
  DOM.wakeAfterSleepInput?.value,
  wakeCount
);

if (wakeCount === "4plus" && wakeAfterSleepMinutes < 15) {
  wakeAfterSleepMinutes = 15;
}

  const dreamType = String(DOM.dreamTypeInput?.value || "neutral").trim();
  const fallAsleepSpeed = String(DOM.fallAsleepSpeedInput?.value || "medium").trim();
  const energyAfterSleep = clampRating(DOM.energyAfterSleepInput?.value);
  const note = String(DOM.noteInput?.value || "").trim();

  if (!selectedDate) {
    alert("Выбери дату");
    DOM.dateInput?.focus();
    return;
  }

  if (!isValidTime(bedTime)) {
    alert("Выбери корректное время, когда лёг");
    DOM.bedInput?.focus();
    return;
  }

  if (wakeTime && !isValidTime(wakeTime)) {
    alert("Выбери корректное время, когда встал");
    DOM.wakeInput?.focus();
    return;
  }

  const hasWakeTime = Boolean(wakeTime);

  const sleepDate = getNormalizedSleepDate(selectedDate);
  const timeInBedMinutes = hasWakeTime ? calcDuration(bedTime, wakeTime) : 0;
  const sleepLatencyMinutes = getFallAsleepMinutes(fallAsleepSpeed);

  const sleepDurationMinutes = hasWakeTime
    ? getTotalSleepTimeMinutes(
        timeInBedMinutes,
        sleepLatencyMinutes,
        wakeAfterSleepMinutes
      )
    : 0;

  const sleepEfficiency = hasWakeTime
    ? getSleepEfficiencyPercent(sleepDurationMinutes, timeInBedMinutes)
    : 0;

  const durationScore = hasWakeTime
    ? getDurationScore(sleepDurationMinutes)
    : 0;

  const continuityScore = hasWakeTime
    ? getContinuityScore(
        sleepEfficiency,
        sleepLatencyMinutes,
        wakeAfterSleepMinutes,
        dreamType
      )
    : 0;

  const sleepScore = hasWakeTime
    ? getFinalSleepScore(durationScore, continuityScore, energyAfterSleep)
    : 0;

  const payload = {
    sleep_date: sleepDate,
    bed_time: bedTime,
    wake_time: wakeTime || null,
    wake_count: wakeCount,
    wake_after_sleep_minutes: hasWakeTime ? wakeAfterSleepMinutes : 0,
    dream_type: dreamType,
    fall_asleep_speed: fallAsleepSpeed,
    sleep_latency_minutes: hasWakeTime ? sleepLatencyMinutes : 0,
    sleep_duration_minutes: sleepDurationMinutes,
    sleep_efficiency: sleepEfficiency,
    sleep_score: sleepScore,
    energy_after_sleep: energyAfterSleep,
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

  DOM.energyAfterSleepInput?.addEventListener("input", syncSleepSliderUI);

  document.querySelectorAll("#wakeCountGroup .sleep-radio").forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = String(btn.dataset.value || "0");
      syncWakeCountRadioUI(value);
    });
  });

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
  if (!DOM.list) return;

  window.__sleepEntries = entries || [];
  DOM.list.innerHTML = "";

  if (loadError) {
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

    const sleepScore = clampHalf(entry.sleep_score);
    const energyAfterSleep = clampRating(entry.energy_after_sleep);
    const sleepDurationMinutes = Number(entry.sleep_duration_minutes) || 0;
    const sleepEfficiency = clampPercent(entry.sleep_efficiency);
    const sleepLatencyMinutes = Number(entry.sleep_latency_minutes) || getFallAsleepMinutes(entry.fall_asleep_speed);
    const wakeAfterSleepMinutes = getWakeAfterSleepMinutesValue(
      entry.wake_after_sleep_minutes,
      entry.wake_count
    );

    const wakeCount = String(entry.wake_count || "0");
    const dreamType = String(entry.dream_type || "neutral");
    const fallAsleepSpeed = String(entry.fall_asleep_speed || "medium");
    const safeNote = String(entry.note || "").trim();

    const status = getSleepStatusV2(
  sleepDurationMinutes,
  sleepEfficiency,
  sleepScore,
  energyAfterSleep,
  wakeCount,
  wakeAfterSleepMinutes
);

    const insightData = getSleepInsightData({
      durationMinutes: sleepDurationMinutes,
      wakeCount,
      energy: energyAfterSleep,
      fallAsleepSpeed,
      wasoMinutes: wakeAfterSleepMinutes
    });

    el.innerHTML = `
      <div class="card-content sleep-card-content sleep-card-content--focus">
        <div class="card-right-column sleep-card-column sleep-card-column--focus">

          <div class="sleep-card-head">
            <div class="sleep-card-date">${escapeHtml(formatSleepDate(entry.sleep_date))}</div>
            <div class="sleep-status-chip ${status.className}">
              ${escapeHtml(status.emoji)} ${escapeHtml(status.label)}
            </div>
          </div>

          <div class="sleep-main">
            <div class="sleep-time-range">
              ${escapeHtml(entry.bed_time || "--:--")} → ${escapeHtml(entry.wake_time || "--:--")}
            </div>

            <div class="sleep-duration-main">
              ${escapeHtml(formatDuration(sleepDurationMinutes))}
            </div>
          </div>

          <div class="sleep-inline-meta">
            <span>Пробуждений: ${escapeHtml(getWakeCountLabel(wakeCount))}</span>
            <span>Ночью: ${escapeHtml(getWakeAfterSleepLabel(wakeAfterSleepMinutes))}</span>
            <span>Снилось: ${escapeHtml(getDreamLabel(dreamType))}</span>
            <span>Засыпание: ${escapeHtml(getFallAsleepLabel(fallAsleepSpeed))} (${escapeHtml(formatApproxMinutes(sleepLatencyMinutes))})</span>
          </div>

          <div class="sleep-stats-line">
            Сон: ${formatAutoSleepRating(sleepScore)} • Энергия: ${energyAfterSleep}/10
          </div>

          <div class="sleep-ai-block sleep-ai-block--focus">
            <div class="sleep-ai-text">
              ${escapeHtml(insightData.insight)}
            </div>
            ${
              insightData.advice
                ? `<div class="sleep-ai-advice">${escapeHtml(insightData.advice)}</div>`
                : ""
            }
          </div>

          <div class="sleep-note-block sleep-note-block--focus ${safeNote ? "" : "is-empty"}" data-role="sleep-note-edit">
            ${safeNote ? escapeHtml(safeNote) : "Без заметки"}
          </div>

        </div>
      </div>
    `;

    el.addEventListener("click", () => openSleepModal(entry));
    enableSleepSwipeDelete(wrapper, el, entry);

    wrapper.appendChild(deleteBg);
    wrapper.appendChild(el);
    DOM.list.appendChild(wrapper);
  });

  if (summaryState.openedRange != null) {
    renderSummary(entries, summaryState.openedRange);
  } else if (DOM.summaryPanel) {
    DOM.summaryPanel.innerHTML = "";
    DOM.summaryPanel.hidden = true;
  }

  updateSummaryToggleUI();
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
  const result = await fetchSleep();
  render(result.data, result.error);
}

setupNavigation();
setupSleepModal();
setupConfirm();
setupSummaryToggle();
init();
