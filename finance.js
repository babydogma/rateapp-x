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

  requiredItems: [],
  requiredItemMarks: [],

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

  requiredPaymentItemsSection: document.getElementById("requiredPaymentItemsSection"),
  requiredPaymentItemsList: document.getElementById("requiredPaymentItemsList"),
  requiredPaymentAddItemBtn: document.getElementById("requiredPaymentAddItemBtn"),
  requiredPaymentItemForm: document.getElementById("requiredPaymentItemForm"),
  requiredPaymentItemTitleInput: document.getElementById("requiredPaymentItemTitleInput"),
  requiredPaymentItemAmountInput: document.getElementById("requiredPaymentItemAmountInput"),
  requiredPaymentItemDueDayInput: document.getElementById("requiredPaymentItemDueDayInput"),
  requiredPaymentItemSaveBtn: document.getElementById("requiredPaymentItemSaveBtn"),

  requiredPaymentSingleFields: document.getElementById("requiredPaymentSingleFields")
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

  async fetchRequiredItems() {
    const { data, error } = await supabaseClient
      .from("finance_required_items")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("fetchRequiredItems error:", error);
      return [];
    }

    return data || [];
  },

  async insertRequiredItem(item) {
    const { data, error } = await supabaseClient
      .from("finance_required_items")
      .insert(item)
      .select();

    if (error) {
      console.error("insertRequiredItem error:", error);
      throw error;
    }

    return data?.[0] || null;
  },

  async deleteRequiredItem(id) {
    const { error } = await supabaseClient
      .from("finance_required_items")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("deleteRequiredItem error:", error);
      throw error;
    }
  },

  async fetchRequiredItemMarks() {
    const { data, error } = await supabaseClient
      .from("finance_required_item_marks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchRequiredItemMarks error:", error);
      return [];
    }

    return data || [];
  },

  async insertRequiredItemMark(mark) {
    const { data, error } = await supabaseClient
      .from("finance_required_item_marks")
      .insert(mark)
      .select();

    if (error) {
      console.error("insertRequiredItemMark error:", error);
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

function isTemplatePaidForCurrentPeriod(template) {
  const periodKey = getTemplatePeriodKey(template);

  return state.requiredMarks.some(
    (mark) =>
      Number(mark.template_id) === Number(template.id) &&
      mark.period_key === periodKey
  );
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

function getCurrentEditingTemplate() {
  return state.requiredTemplates.find(
    (item) => Number(item.id) === Number(state.editingRequiredTemplateId)
  );
}

function getRequiredItemsForTemplate(templateId) {
  return state.requiredItems
    .filter((item) => Number(item.template_id) === Number(templateId) && item.is_active)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}

function isRequiredItemPaidForCurrentPeriod(item, template) {
  const periodKey = getTemplatePeriodKey(template);

  return state.requiredItemMarks.some(
    (mark) =>
      Number(mark.item_id) === Number(item.id) &&
      mark.period_key === periodKey
  );
}

function getGroupProgress(template) {
  const items = getRequiredItemsForTemplate(template.id);

  const totalAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const paidItems = items.filter((item) => isRequiredItemPaidForCurrentPeriod(item, template));
  const paidAmount = paidItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return {
    totalAmount,
    paidAmount,
    paidCount: paidItems.length,
    totalCount: items.length
  };
}

function updateFilterButtons() {
  DOM.filterAll?.classList.toggle("active", state.filter === "all");
  DOM.filterExpense?.classList.toggle("active", state.filter === "expense");
  DOM.filterIncome?.classList.toggle("active", state.filter === "income");
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

    let amountHtml = formatMoney(template.amount);
    let metaHtml = getRequiredMeta(template);
    let isPaid = isTemplatePaidForCurrentPeriod(template);

    if (template.kind === "group") {
      const progress = getGroupProgress(template);
      amountHtml = `${formatMoney(progress.paidAmount)} / ${formatMoney(progress.totalAmount)}`;
      metaHtml = `${progress.paidCount} из ${progress.totalCount} оплачено`;
      isPaid = progress.totalCount > 0 && progress.paidCount === progress.totalCount;
    }

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
          ${escapeHtml(metaHtml)}
        </div>
      </div>

      <div class="finance-required-card__right">
        <div class="finance-required-card__amount">
          ${amountHtml}
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

function resetRequiredItemForm() {
  if (DOM.requiredPaymentItemTitleInput) DOM.requiredPaymentItemTitleInput.value = "";
  if (DOM.requiredPaymentItemAmountInput) DOM.requiredPaymentItemAmountInput.value = "";
  if (DOM.requiredPaymentItemDueDayInput) DOM.requiredPaymentItemDueDayInput.value = "";
}

function setGroupModalFieldsVisibility(template) {
  const amountLabel = document.querySelector('label[for="requiredPaymentAmountInput"]');
  const frequencyLabel = document.querySelector('label[for="requiredPaymentFrequencyInput"]');
  const endDateLabel = document.querySelector('label[for="requiredPaymentEndDateInput"]');
  const activeToggle = DOM.requiredPaymentActiveInput?.closest(".finance-switch");

  const isGroup = template.kind === "group";

  if (amountLabel) amountLabel.style.display = isGroup ? "none" : "";
  if (DOM.requiredPaymentAmountInput) DOM.requiredPaymentAmountInput.style.display = isGroup ? "none" : "";

  if (frequencyLabel) frequencyLabel.style.display = "";
  if (DOM.requiredPaymentFrequencyInput) DOM.requiredPaymentFrequencyInput.style.display = "";

  if (endDateLabel) endDateLabel.style.display = isGroup ? "none" : "";
  if (DOM.requiredPaymentEndDateInput) DOM.requiredPaymentEndDateInput.style.display = isGroup ? "none" : "";

  if (activeToggle) activeToggle.style.display = isGroup ? "none" : "";

  if (DOM.requiredPaymentModalPay) {
    DOM.requiredPaymentModalPay.style.display = isGroup ? "none" : "";
  }
}

function setSingleFieldsVisible(visible) {
  if (DOM.requiredPaymentSingleFields) {
    DOM.requiredPaymentSingleFields.style.display = visible ? "" : "none";
    return;
  }

  const amountLabel = document.querySelector('label[for="requiredPaymentAmountInput"]');
  if (amountLabel) amountLabel.style.display = visible ? "" : "none";
  if (DOM.requiredPaymentAmountInput) DOM.requiredPaymentAmountInput.style.display = visible ? "" : "none";
}

function renderRequiredItemsInsideModal() {
  const template = getCurrentEditingTemplate();
  if (!template || !DOM.requiredPaymentItemsList) return;

  if (template.kind !== "group") {
    if (DOM.requiredPaymentItemsSection) {
      DOM.requiredPaymentItemsSection.style.display = "none";
    }
    return;
  }

  if (DOM.requiredPaymentItemsSection) {
    DOM.requiredPaymentItemsSection.style.display = "";
  }

  DOM.requiredPaymentItemsList.innerHTML = "";

  const items = getRequiredItemsForTemplate(template.id);

  if (!items.length) {
    DOM.requiredPaymentItemsList.innerHTML = `
      <div class="finance-required-empty">
        Пока нет вложенных платежей
      </div>
    `;
    return;
  }

  items.forEach((item) => {
    const isPaid = isRequiredItemPaidForCurrentPeriod(item, template);

    const row = document.createElement("div");
    row.className = `required-item-row ${isPaid ? "is-paid" : ""}`;

    row.innerHTML = `
      <div class="required-item-row__top">
        <div class="required-item-row__left">
          <div class="required-item-row__title">${escapeHtml(item.title)}</div>
          <div class="required-item-row__meta">Платеж: ${escapeHtml(item.due_date_label || `${String(item.due_day).padStart(2, "0")}.--`)}</div>
        </div>

        <div class="required-item-row__amount">${formatMoney(item.amount)}</div>
      </div>

      <div class="required-item-row__actions">
        <button class="required-item-row__btn required-item-row__btn--pay" type="button" ${isPaid ? "disabled" : ""}>
          ${isPaid ? "Оплачено" : "Оплатить"}
        </button>
        <button class="required-item-row__btn required-item-row__btn--delete" type="button">
          Удалить
        </button>
      </div>
    `;

    const payBtn = row.querySelector(".required-item-row__btn--pay");
    const deleteBtn = row.querySelector(".required-item-row__btn--delete");

    payBtn.addEventListener("click", async () => {
      const periodKey = getTemplatePeriodKey(template);
      const alreadyPaid = state.requiredItemMarks.some(
        (mark) =>
          Number(mark.item_id) === Number(item.id) &&
          mark.period_key === periodKey
      );

      if (alreadyPaid) {
        alert("Этот платеж уже отмечен как оплаченный в текущем периоде");
        return;
      }

      try {
        payBtn.disabled = true;

        const newEntry = await API.insertEntry({
          type: "expense",
          amount: Number(item.amount || 0),
          category: template.title,
          entry_date: getTodayISO(),
          comment: item.title
        });

        const newMark = await API.insertRequiredItemMark({
          item_id: item.id,
          period_key: periodKey
        });

        if (newEntry) {
          state.entries.unshift(newEntry);
        }

        if (newMark) {
          state.requiredItemMarks.unshift(newMark);
        }

        renderRequiredItemsInsideModal();
        renderRequiredTemplates();
        renderEntries();
        renderStats();
      } catch (error) {
        console.error(error);
        alert("Не удалось отметить оплату");
      } finally {
        payBtn.disabled = false;
      }
    });

    deleteBtn.addEventListener("click", async () => {
      try {
        await API.deleteRequiredItem(item.id);
        state.requiredItems = state.requiredItems.filter(
          (x) => Number(x.id) !== Number(item.id)
        );

        renderRequiredItemsInsideModal();
        renderRequiredTemplates();
      } catch (error) {
        console.error(error);
        alert("Не удалось удалить вложенный платеж");
      }
    });

    DOM.requiredPaymentItemsList.appendChild(row);
  });
}

function openRequiredTemplateModal(id) {
  const template = state.requiredTemplates.find(
    (item) => Number(item.id) === Number(id)
  );

  if (!template) return;

  const isPaid = isTemplatePaidForCurrentPeriod(template);

  state.editingRequiredTemplateId = template.id;
  setGroupModalFieldsVisibility(template);

  if (DOM.requiredPaymentModalTitle) {
    DOM.requiredPaymentModalTitle.textContent = template.title;
  }

  if (DOM.requiredPaymentAmountInput) {
    DOM.requiredPaymentAmountInput.value = Number(template.amount || 0);
  }

  if (DOM.requiredPaymentFrequencyInput) {
    DOM.requiredPaymentFrequencyInput.value = template.frequency || "monthly";
  }

  if (DOM.requiredPaymentEndDateInput) {
    DOM.requiredPaymentEndDateInput.value = template.end_date || "";
  }

  if (DOM.requiredPaymentActiveInput) {
    DOM.requiredPaymentActiveInput.checked = Boolean(template.is_active);
  }

  if (template.kind === "group") {
    setSingleFieldsVisible(false);

    if (DOM.requiredPaymentModalPay) {
      DOM.requiredPaymentModalPay.style.display = "none";
    }
  } else {
    setSingleFieldsVisible(true);

    if (DOM.requiredPaymentModalPay) {
      DOM.requiredPaymentModalPay.style.display = "";
      DOM.requiredPaymentModalPay.textContent = isPaid ? "Уже оплачено" : "Оплачено";
      DOM.requiredPaymentModalPay.disabled = isPaid;
    }
  }

  resetRequiredItemForm();
  if (DOM.requiredPaymentItemForm) {
    DOM.requiredPaymentItemForm.classList.remove("is-open");
  }

  renderRequiredItemsInsideModal();
  DOM.requiredPaymentModal?.classList.add("active");
}

function closeRequiredTemplateModal() {
  state.editingRequiredTemplateId = null;
  DOM.requiredPaymentModal?.classList.remove("active");
}

async function saveRequiredTemplate() {
  if (!state.editingRequiredTemplateId) return;

  const template = getCurrentEditingTemplate();
  if (!template) return;

  const updates = {
    frequency: DOM.requiredPaymentFrequencyInput?.value || "monthly",
    end_date: DOM.requiredPaymentEndDateInput?.value || null,
    is_active: Boolean(DOM.requiredPaymentActiveInput?.checked)
  };

  if (template.kind !== "group") {
    const amount = Number(DOM.requiredPaymentAmountInput?.value || 0);

    if (amount < 0) {
      alert("Сумма не может быть меньше нуля");
      return;
    }

    updates.amount = amount;
  }

  try {
    if (DOM.requiredPaymentModalSave) {
      DOM.requiredPaymentModalSave.disabled = true;
    }

    const updated = await API.updateRequiredTemplate(state.editingRequiredTemplateId, updates);

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
    if (DOM.requiredPaymentModalSave) {
      DOM.requiredPaymentModalSave.disabled = false;
    }
  }
}

async function payRequiredTemplate() {
  if (!state.editingRequiredTemplateId) return;

  const template = getCurrentEditingTemplate();
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
    if (DOM.requiredPaymentModalPay) {
      DOM.requiredPaymentModalPay.disabled = true;
    }

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
    if (DOM.requiredPaymentModalPay) {
      DOM.requiredPaymentModalPay.disabled = false;
    }
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

  DOM.requiredPaymentAddItemBtn?.addEventListener("click", () => {
    DOM.requiredPaymentItemForm?.classList.toggle("is-open");
  });

  DOM.requiredPaymentItemSaveBtn?.addEventListener("click", async () => {
    const template = getCurrentEditingTemplate();
    if (!template) return;

    const title = DOM.requiredPaymentItemTitleInput?.value.trim() || "";
    const amount = Number(DOM.requiredPaymentItemAmountInput?.value || 0);
    const dueDateValue = DOM.requiredPaymentItemDueDayInput?.value || "";

    if (!title) {
      alert("Введите название");
      return;
    }

    if (!amount || amount <= 0) {
      alert("Введите сумму");
      return;
    }

    if (!dueDateValue) {
  alert("Выбери дату платежа");
  return;
}

const pickedDate = new Date(dueDateValue);
const dueDay = pickedDate.getDate();
const dueMonth = String(pickedDate.getMonth() + 1).padStart(2, "0");
const dueDateLabel = `${String(dueDay).padStart(2, "0")}.${dueMonth}`;

    try {
      const sortOrder = getRequiredItemsForTemplate(template.id).length + 1;

      const newItem = await API.insertRequiredItem({
  template_id: template.id,
  title,
  amount,
  due_day: dueDay,
  due_date_label: dueDateLabel,
  is_active: true,
  sort_order: sortOrder
});

      if (newItem) {
        state.requiredItems.push(newItem);
        resetRequiredItemForm();
        DOM.requiredPaymentItemForm?.classList.remove("is-open");
        renderRequiredItemsInsideModal();
        renderRequiredTemplates();
      }
    } catch (error) {
      console.error(error);
      alert("Не удалось добавить вложенный платеж");
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
  resetModalFields();

  const [entries, requiredTemplates, requiredMarks, requiredItems, requiredItemMarks] = await Promise.all([
    API.fetchEntries(),
    API.fetchRequiredTemplates(),
    API.fetchRequiredMarks(),
    API.fetchRequiredItems(),
    API.fetchRequiredItemMarks()
  ]);

  state.entries = entries;
  state.requiredTemplates = requiredTemplates;
  state.requiredMarks = requiredMarks;
  state.requiredItems = requiredItems;
  state.requiredItemMarks = requiredItemMarks;

  renderRequiredTemplates();
  renderEntries();
  renderStats();
}

init();
