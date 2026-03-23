/* =========================================================
   RATEAPP X — FINANCE
========================================================= */

const SUPABASE_URL = "https://qlogmylywwdbczxolidl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nVqkHQmgMKoA_F_ft7yfXQ_OWjYq7f4";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const state = {
  entries: [],
  filter: "all",
  pendingDeleteId: null,
  requiredTemplates: [],
  requiredMarks: [],
  editingRequiredTemplateId: null
};

const DOM = {
  financeList: document.getElementById("financeList"),
  financeStats: document.getElementById("financeStats"),

  summaryIncome: document.getElementById("summaryIncome"),
  summaryExpense: document.getElementById("summaryExpense"),
  summaryBalance: document.getElementById("summaryBalance"),
  summaryDaily: document.getElementById("summaryDaily"),

  filterAll: document.getElementById("financeFilterAll"),
  filterExpense: document.getElementById("financeFilterExpense"),
  filterIncome: document.getElementById("financeFilterIncome"),

  modal: document.getElementById("financeModal"),
  modalCancel: document.getElementById("financeModalCancel"),
  modalSave: document.getElementById("financeModalSave"),

  confirmModal: document.getElementById("financeConfirmModal"),
  confirmCancel: document.getElementById("financeConfirmCancel"),
  confirmDelete: document.getElementById("financeConfirmDelete"),

  typeInput: document.getElementById("financeTypeInput"),
  amountInput: document.getElementById("financeAmountInput"),
  categoryInput: document.getElementById("financeCategoryInput"),
  dateInput: document.getElementById("financeDateInput"),
  commentInput: document.getElementById("financeCommentInput"),

  addFinanceBtn: document.getElementById("addFinanceBtn"),

  financeRequiredList: document.getElementById("financeRequiredList"),

  requiredPaymentModal: document.getElementById("requiredPaymentModal"),
  requiredPaymentModalTitle: document.getElementById("requiredPaymentModalTitle"),
  requiredPaymentAmountInput: document.getElementById("requiredPaymentAmountInput"),
  requiredPaymentFrequencyInput: document.getElementById("requiredPaymentFrequencyInput"),
  requiredPaymentEndDateInput: document.getElementById("requiredPaymentEndDateInput"),
  requiredPaymentActiveInput: document.getElementById("requiredPaymentActiveInput"),
  requiredPaymentModalCancel: document.getElementById("requiredPaymentModalCancel"),
  requiredPaymentModalPay: document.getElementById("requiredPaymentModalPay"),
  requiredPaymentModalSave: document.getElementById("requiredPaymentModalSave"),
  
  financeRequiredAccordion: document.getElementById("financeRequiredAccordion"),
financeRequiredToggle: document.getElementById("financeRequiredToggle")
};

const API = {
  async fetchEntries() {
    const { data, error } = await supabaseClient
      .from("finance_entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchEntries error:", error);
      return [];
    }

    return data || [];
  },

async fetchRequiredMarks() {
  const { data, error } = await supabaseClient
    .from("finance_required_marks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchRequiredMarks error:", error);
    return [];
  }

  return data || [];
},

async insertRequiredMark(mark) {
  const { data, error } = await supabaseClient
    .from("finance_required_marks")
    .insert(mark)
    .select();

  if (error) {
    console.error("insertRequiredMark error:", error);
    throw error;
  }

  return data?.[0] || null;
},

  async insertEntry(entry) {
    const { data, error } = await supabaseClient
      .from("finance_entries")
      .insert(entry)
      .select();

    if (error) {
      console.error("insertEntry error:", error);
      throw error;
    }

    return data?.[0] || null;
  },

  async deleteEntry(id) {
    const { error } = await supabaseClient
      .from("finance_entries")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("deleteEntry error:", error);
      throw error;
    }
  },

  async fetchRequiredTemplates() {
    const { data, error } = await supabaseClient
      .from("finance_required_templates")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("fetchRequiredTemplates error:", error);
      return [];
    }

    return data || [];
  },

  async updateRequiredTemplate(id, updates) {
    const { data, error } = await supabaseClient
      .from("finance_required_templates")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) {
      console.error("updateRequiredTemplate error:", error);
      throw error;
    }

    return data?.[0] || null;
  }
};

function formatMoney(value = 0) {
  return `${Number(value || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })} ₽`;
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
}

function formatMonthYear(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}.${year}`;
}

function getTodayISO() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentMonthPeriodKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getCurrentWeekPeriodKey() {
  const weekStart = getWeekStart(new Date());
  const year = weekStart.getFullYear();
  const month = String(weekStart.getMonth() + 1).padStart(2, "0");
  const day = String(weekStart.getDate()).padStart(2, "0");
  return `${year}-W-${month}-${day}`;
}

function getTemplatePeriodKey(template) {
  return template.frequency === "weekly"
    ? getCurrentWeekPeriodKey()
    : getCurrentMonthPeriodKey();
}

function getCurrentMonthEntries(entries) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  return entries.filter((entry) => {
    const date = new Date(entry.entry_date);
    return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
  });
}

function getVisibleEntries() {
  if (state.filter === "expense") {
    return state.entries.filter((entry) => entry.type === "expense");
  }

  if (state.filter === "income") {
    return state.entries.filter((entry) => entry.type === "income");
  }

  return [...state.entries];
}

function getRequiredTemplateState(template) {
  const today = new Date(getTodayISO());
  const endDate = template.end_date ? new Date(template.end_date) : null;

  const isDisabled = !template.is_active;
  const isEnded = Boolean(endDate && endDate < today);

  return {
    isDisabled,
    isEnded,
    isArchived: isDisabled || isEnded
  };
}

function getVisibleRequiredTemplates() {
  return [...state.requiredTemplates].sort((a, b) => {
    const stateA = getRequiredTemplateState(a);
    const stateB = getRequiredTemplateState(b);

    const rankA = stateA.isDisabled ? 2 : stateA.isEnded ? 1 : 0;
    const rankB = stateB.isDisabled ? 2 : stateB.isEnded ? 1 : 0;

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    return Number(a.sort_order || 0) - Number(b.sort_order || 0);
  });
}

function getFrequencyLabel(value) {
  return value === "weekly" ? "Еженедельно" : "Ежемесячно";
}

function getRequiredMeta(template) {
  const base = getFrequencyLabel(template.frequency);
  const { isDisabled, isEnded } = getRequiredTemplateState(template);
  const isPaid = isTemplatePaidForCurrentPeriod(template);

  if (isDisabled) {
    return `${base} • отключен`;
  }

  if (isEnded) {
    return `${base} • завершен`;
  }

  if (isPaid) {
    return `${base} • оплачено`;
  }

  if (template.end_date) {
    return `${base} • до ${formatMonthYear(template.end_date)}`;
  }

  return base;
}

function isTemplatePaidForCurrentPeriod(template) {
  const periodKey = getTemplatePeriodKey(template);

  return state.requiredMarks.some(
    (mark) =>
      Number(mark.template_id) === Number(template.id) &&
      mark.period_key === periodKey
  );
}

function updateFilterButtons() {
  DOM.filterAll?.classList.toggle("active", state.filter === "all");
  DOM.filterExpense?.classList.toggle("active", state.filter === "expense");
  DOM.filterIncome?.classList.toggle("active", state.filter === "income");
}

function setupRequiredAccordion() {
  DOM.financeRequiredToggle?.addEventListener("click", () => {
    DOM.financeRequiredAccordion?.classList.toggle("is-open");
  });
}

function renderStats() {
  const monthEntries = getCurrentMonthEntries(state.entries);

  const income = monthEntries
    .filter((entry) => entry.type === "income")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  const expense = monthEntries
    .filter((entry) => entry.type === "expense")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  const balance = income - expense;

  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const daysLeft = Math.max(lastDayOfMonth - currentDay + 1, 1);
  const daily = balance / daysLeft;

  DOM.summaryIncome.textContent = formatMoney(income);
  DOM.summaryExpense.textContent = formatMoney(expense);
  DOM.summaryBalance.textContent = formatMoney(balance);
  DOM.summaryDaily.textContent = formatMoney(daily);

  const visibleEntries = getVisibleEntries();
  DOM.financeStats.textContent = `Операций: ${visibleEntries.length}`;
}

function buildEntryCard(entry) {
  const el = document.createElement("article");
  const isExpense = entry.type === "expense";

  el.className = `finance-entry ${isExpense ? "is-expense" : "is-income"}`;

  const amountPrefix = isExpense ? "−" : "+";
  const safeCategory = escapeHtml(entry.category || "Прочее");
  const safeComment = escapeHtml(entry.comment || "");
  const safeDate = formatDate(entry.entry_date);

  el.innerHTML = `
    <div class="finance-entry__main">
      <div class="finance-entry__left">
        <div class="finance-entry__category">${safeCategory}</div>
        <div class="finance-entry__comment ${safeComment ? "" : "is-empty"}">
          ${safeComment || "Без комментария"}
        </div>
      </div>

      <div class="finance-entry__right">
        <div class="finance-entry__amount">${amountPrefix}${formatMoney(entry.amount)}</div>
        <div class="finance-entry__date">${safeDate}</div>
      </div>
    </div>

    <div class="finance-entry__footer">
      <span class="finance-entry__badge">${isExpense ? "Расход" : "Доход"}</span>
      <button class="finance-entry__delete" type="button">Удалить</button>
    </div>
  `;

  const deleteBtn = el.querySelector(".finance-entry__delete");
  deleteBtn.addEventListener("click", () => openDeleteModal(entry.id));

  return el;
}

function renderEntries() {
  if (!DOM.financeList) return;

  const entries = getVisibleEntries();
  DOM.financeList.innerHTML = "";

  if (!entries.length) {
    DOM.financeList.innerHTML = `
      <div class="finance-empty">
        Пока пусто. Нажми + и добавь первую операцию.
      </div>
    `;
    updateFilterButtons();
    return;
  }

  entries.forEach((entry) => {
    DOM.financeList.appendChild(buildEntryCard(entry));
  });

  updateFilterButtons();
}

function renderRequiredTemplates() {
  if (!DOM.financeRequiredList) return;

  const items = getVisibleRequiredTemplates();
  DOM.financeRequiredList.innerHTML = "";

  if (!items.length) {
    DOM.financeRequiredList.innerHTML = `
      <div class="finance-required-empty">
        Нет обязательных платежей
      </div>
    `;
    return;
  }

  items.forEach((template) => {
    const { isDisabled, isEnded, isArchived } = getRequiredTemplateState(template);
    const isPaid = isTemplatePaidForCurrentPeriod(template);

    const card = document.createElement("button");
    card.type = "button";
    card.className = `finance-required-card
  ${isPaid ? " is-paid" : ""}
  ${isEnded ? " is-ended" : ""}
  ${isDisabled ? " is-disabled" : ""}
  ${isArchived ? " is-archived" : ""}`;
  
    card.innerHTML = `
      <div class="finance-required-card__left">
        <div class="finance-required-card__title">
          ${escapeHtml(template.title)}
        </div>
        <div class="finance-required-card__meta">
          ${escapeHtml(getRequiredMeta(template))}
        </div>
      </div>

      <div class="finance-required-card__right">
        <div class="finance-required-card__amount">
          ${formatMoney(template.amount)}
        </div>
      </div>
    `;

    card.addEventListener("click", () => openRequiredTemplateModal(template.id));

    DOM.financeRequiredList.appendChild(card);
  });
}

function openModal() {
  DOM.modal?.classList.add("active");
}

function closeModal() {
  DOM.modal?.classList.remove("active");
}

function resetModalFields() {
  DOM.typeInput.value = "expense";
  DOM.amountInput.value = "";
  DOM.categoryInput.value = "Прочее";
  DOM.dateInput.value = getTodayISO();
  DOM.commentInput.value = "";
}

function openDeleteModal(id) {
  state.pendingDeleteId = id;
  DOM.confirmModal?.classList.add("active");
}

function closeDeleteModal() {
  state.pendingDeleteId = null;
  DOM.confirmModal?.classList.remove("active");
}

function openRequiredTemplateModal(id) {
  const isPaid = isTemplatePaidForCurrentPeriod(template);

if (DOM.requiredPaymentModalPay) {
  DOM.requiredPaymentModalPay.textContent = isPaid ? "Уже оплачено" : "Оплачено";
  DOM.requiredPaymentModalPay.disabled = isPaid;
}

  const template = state.requiredTemplates.find((item) => Number(item.id) === Number(id));
  if (!template) return;

  state.editingRequiredTemplateId = template.id;

  DOM.requiredPaymentModalTitle.textContent = template.title;
  DOM.requiredPaymentAmountInput.value = Number(template.amount || 0);
  DOM.requiredPaymentFrequencyInput.value = template.frequency || "monthly";
  DOM.requiredPaymentEndDateInput.value = template.end_date || "";
  DOM.requiredPaymentActiveInput.checked = Boolean(template.is_active);

  DOM.requiredPaymentModal?.classList.add("active");
}

function closeRequiredTemplateModal() {
  state.editingRequiredTemplateId = null;
  DOM.requiredPaymentModal?.classList.remove("active");
}

async function saveRequiredTemplate() {
  if (!state.editingRequiredTemplateId) return;

  const amount = Number(DOM.requiredPaymentAmountInput.value);
  const frequency = DOM.requiredPaymentFrequencyInput.value;
  const endDate = DOM.requiredPaymentEndDateInput.value || null;
  const isActive = DOM.requiredPaymentActiveInput.checked;

  if (amount < 0) {
    alert("Сумма не может быть меньше нуля");
    return;
  }

  try {
    DOM.requiredPaymentModalSave.disabled = true;

    const updated = await API.updateRequiredTemplate(state.editingRequiredTemplateId, {
      amount,
      frequency,
      end_date: endDate,
      is_active: isActive
    });

    if (updated) {
      const index = state.requiredTemplates.findIndex(
        (item) => Number(item.id) === Number(updated.id)
      );

      if (index !== -1) {
        state.requiredTemplates[index] = updated;
      }

      renderRequiredTemplates();
      closeRequiredTemplateModal();
    }
  } catch (error) {
    console.error(error);
    alert("Не удалось сохранить обязательный платеж");
  } finally {
    DOM.requiredPaymentModalSave.disabled = false;
  }
}

async function saveEntry() {
  const type = DOM.typeInput.value;
  const amount = Number(DOM.amountInput.value);
  const category = DOM.categoryInput.value.trim() || "Прочее";
  const entryDate = DOM.dateInput.value || getTodayISO();
  const comment = DOM.commentInput.value.trim();

  if (!amount || amount <= 0) {
    alert("Введите нормальную сумму");
    return;
  }

  try {
    DOM.modalSave.disabled = true;

    const newEntry = await API.insertEntry({
      type,
      amount,
      category,
      entry_date: entryDate,
      comment
    });

    if (newEntry) {
      state.entries.unshift(newEntry);
      renderEntries();
      renderStats();
      closeModal();
      resetModalFields();
    }
  } catch (error) {
    console.error(error);
    alert("Не удалось сохранить операцию");
  } finally {
    DOM.modalSave.disabled = false;
  }
}

async function confirmDelete() {
  if (!state.pendingDeleteId) return;

  const id = state.pendingDeleteId;

  try {
    DOM.confirmDelete.disabled = true;
    await API.deleteEntry(id);

    state.entries = state.entries.filter((entry) => entry.id !== id);
    renderEntries();
    renderStats();
    closeDeleteModal();
  } catch (error) {
    console.error(error);
    alert("Не удалось удалить операцию");
  } finally {
    DOM.confirmDelete.disabled = false;
  }
}

function setupFilters() {
  DOM.filterAll?.addEventListener("click", () => {
    state.filter = "all";
    renderEntries();
    renderStats();
  });

  DOM.filterExpense?.addEventListener("click", () => {
    state.filter = "expense";
    renderEntries();
    renderStats();
  });

  DOM.filterIncome?.addEventListener("click", () => {
    state.filter = "income";
    renderEntries();
    renderStats();
  });
}

function setupModal() {
  DOM.addFinanceBtn?.addEventListener("click", () => {
    resetModalFields();
    openModal();
  });

  DOM.modalCancel?.addEventListener("click", closeModal);
  DOM.modalSave?.addEventListener("click", saveEntry);

  DOM.modal?.addEventListener("click", (e) => {
    if (e.target === DOM.modal) {
      closeModal();
    }
  });

  DOM.confirmCancel?.addEventListener("click", closeDeleteModal);
  DOM.confirmDelete?.addEventListener("click", confirmDelete);

  DOM.confirmModal?.addEventListener("click", (e) => {
    if (e.target === DOM.confirmModal) {
      closeDeleteModal();
    }
  });

  DOM.requiredPaymentModalCancel?.addEventListener("click", closeRequiredTemplateModal);
  DOM.requiredPaymentModalPay?.addEventListener("click", payRequiredTemplate);
  DOM.requiredPaymentModalSave?.addEventListener("click", saveRequiredTemplate);

  DOM.requiredPaymentModal?.addEventListener("click", (e) => {
    if (e.target === DOM.requiredPaymentModal) {
      closeRequiredTemplateModal();
    }
  });
}

function setupNavigation() {
  document.querySelectorAll(".nav-emoji").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;

      if (page === "home") {
        localStorage.removeItem("activeCategory");
        window.location.href = "index.html";
      }

      if (page === "finance") {
        window.location.href = "finance.html";
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

async function init() {
  setupNavigation();
  setupFilters();
  setupModal();
  setupRequiredAccordion();
  resetModalFields();

  const [entries, requiredTemplates, requiredMarks] = await Promise.all([
  API.fetchEntries(),
  API.fetchRequiredTemplates(),
  API.fetchRequiredMarks()
]);

state.entries = entries;
state.requiredTemplates = requiredTemplates;
state.requiredMarks = requiredMarks;

  renderRequiredTemplates();
  renderEntries();
  renderStats();
}

init();

async function payRequiredTemplate() {
  if (!state.editingRequiredTemplateId) return;

  const template = state.requiredTemplates.find(
    (item) => Number(item.id) === Number(state.editingRequiredTemplateId)
  );

  if (!template) return;

  const amount = Number(template.amount || 0);

  if (!amount || amount <= 0) {
    alert("Сначала укажи сумму обязательного платежа");
    return;
  }

  const periodKey = getTemplatePeriodKey(template);

  const alreadyPaid = state.requiredMarks.some(
    (mark) =>
      Number(mark.template_id) === Number(template.id) &&
      mark.period_key === periodKey
  );

  if (alreadyPaid) {
    alert("Этот платеж уже отмечен как оплаченный в текущем периоде");
    return;
  }

  try {
    DOM.requiredPaymentModalPay.disabled = true;

    const newEntry = await API.insertEntry({
      type: "expense",
      amount,
      category: template.title,
      entry_date: getTodayISO(),
      comment: "Обязательный платеж"
    });

    const newMark = await API.insertRequiredMark({
      template_id: template.id,
      period_key: periodKey
    });

    if (newEntry) {
      state.entries.unshift(newEntry);
    }

    if (newMark) {
      state.requiredMarks.unshift(newMark);
    }

    renderRequiredTemplates();
    renderEntries();
    renderStats();
    closeRequiredTemplateModal();
  } catch (error) {
    console.error(error);
    alert("Не удалось зафиксировать оплату");
  } finally {
    DOM.requiredPaymentModalPay.disabled = false;
  }
}