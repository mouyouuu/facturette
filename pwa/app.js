const STORAGE_KEY = "facturette-pwa-state-v1";
const MAX_HISTORY = 50;

const DEFAULT_CLIENTS = [
  {
    id: "alpha-record",
    name: "Alpha Record",
    address: "60 rue fran\u00e7ois 1er 75008 PARIS, FR",
    siren: "993 532 373 00012",
    vat: "FR49693532373"
  }
];

const DEFAULT_PROFILES = [
  {
    id: "mohamed-soumah",
    label: "Mohamed Soumah",
    name: "MONSIEUR MOHAMED SOUMAH (EI)",
    tradeName: "Mouyou",
    address: "4 rue Genevi\u00e8ve de Galard 78440 Gargenville, FR",
    siret: "948 473 905",
    vat: "FR59948473905",
    rcs: "948473905 RCS Gargenville",
    rm: "948473905 RM 95",
    iban: "FR0517748019841TRC5CSIBNW29",
    bic: "DBLKFR22XXX",
    domain: "Photographie / Vid\u00e9o"
  },
  {
    id: "second-profile",
    label: "Deuxi\u00e8me profil",
    name: "",
    tradeName: "",
    address: "",
    siret: "",
    vat: "",
    rcs: "",
    rm: "",
    iban: "",
    bic: "",
    domain: "Photographie / Vid\u00e9o"
  }
];

const els = {};
let appState = loadState();
let toastTimer = 0;

document.addEventListener("DOMContentLoaded", init);

function init() {
  [
    "headerTitle",
    "nextNumber",
    "invoiceForm",
    "documentType",
    "profileSelect",
    "issueDate",
    "paymentDelay",
    "clientSelect",
    "clientSummary",
    "serviceDescription",
    "quantity",
    "unitPrice",
    "vatRate",
    "totalHt",
    "vatAmount",
    "totalTtc",
    "resetButton",
    "invoicePreview",
    "monthPreview",
    "clientSearch",
    "clientForm",
    "newClientName",
    "newClientAddress",
    "newClientSiren",
    "newClientVat",
    "clientList",
    "clientCount",
    "historyList",
    "profileForm",
    "profileEditSelect",
    "profileLabel",
    "profileDomain",
    "profileName",
    "profileTradeName",
    "profileAddress",
    "profileSiret",
    "profileVat",
    "profileRcs",
    "profileRm",
    "profileIban",
    "profileBic",
    "toast",
    "printArea"
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });

  setFormDefaults();
  bindEvents();
  renderAll();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
}

function bindEvents() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => switchScreen(button.dataset.tab));
  });

  ["input", "change"].forEach((eventName) => {
    els.invoiceForm.addEventListener(eventName, updatePreview);
  });

  els.invoiceForm.addEventListener("submit", handleGenerateDocument);
  els.resetButton.addEventListener("click", () => {
    setFormDefaults();
    renderAll();
    showToast("Formulaire reinitialise.");
  });

  els.clientForm.addEventListener("submit", handleAddClient);
  els.clientSearch.addEventListener("input", renderClients);
  els.profileForm.addEventListener("submit", handleSaveProfile);
  els.profileEditSelect.addEventListener("change", populateProfileFields);
}

function loadState() {
  const fallback = {
    clients: clone(DEFAULT_CLIENTS),
    profiles: clone(DEFAULT_PROFILES),
    history: [],
    config: { nextInvoiceNumber: 29 }
  };

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!stored || typeof stored !== "object") return fallback;

    const next = {
      clients: Array.isArray(stored.clients) ? stored.clients : fallback.clients,
      profiles: Array.isArray(stored.profiles) ? stored.profiles : fallback.profiles,
      history: Array.isArray(stored.history) ? stored.history.slice(0, MAX_HISTORY) : [],
      config: {
        nextInvoiceNumber: Number(stored.config?.nextInvoiceNumber) || 29
      }
    };

    if (!next.clients.some((client) => client.id === "alpha-record")) {
      next.clients.unshift(clone(DEFAULT_CLIENTS[0]));
    }

    if (!next.profiles.some((profile) => profile.id === "mohamed-soumah")) {
      next.profiles.unshift(clone(DEFAULT_PROFILES[0]));
    }

    if (!next.profiles.some((profile) => profile.id === "second-profile")) {
      next.profiles.push(clone(DEFAULT_PROFILES[1]));
    }

    return next;
  } catch (_) {
    return fallback;
  }
}

function saveState() {
  appState.history = appState.history.slice(0, MAX_HISTORY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function setFormDefaults() {
  els.documentType.value = "facture";
  els.issueDate.value = todayIso();
  els.paymentDelay.value = "8";
  els.serviceDescription.value = "";
  els.quantity.value = "1";
  els.unitPrice.value = "";
  els.vatRate.value = "0";
}

function renderAll() {
  renderProfileOptions();
  renderClientOptions();
  renderClients();
  renderHistory();
  populateProfileFields();
  updatePreview();
}

function switchScreen(name) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === name);
  });
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === name);
  });
  const titles = {
    document: "Document",
    clients: "Clients",
    history: "Historique",
    settings: "Reglages"
  };
  els.headerTitle.textContent = titles[name] || "Facturette";
}

function renderProfileOptions() {
  const options = appState.profiles
    .map((profile) => `<option value="${escapeAttr(profile.id)}">${escapeHtml(profile.label || profile.name || "Profil")}</option>`)
    .join("");

  const selectedProfile = els.profileSelect.value || appState.profiles[0]?.id || "";
  const selectedEditProfile = els.profileEditSelect.value || selectedProfile;
  els.profileSelect.innerHTML = options;
  els.profileEditSelect.innerHTML = options;
  els.profileSelect.value = appState.profiles.some((profile) => profile.id === selectedProfile)
    ? selectedProfile
    : appState.profiles[0]?.id || "";
  els.profileEditSelect.value = appState.profiles.some((profile) => profile.id === selectedEditProfile)
    ? selectedEditProfile
    : els.profileSelect.value;
}

function renderClientOptions() {
  const selectedClient = els.clientSelect.value || appState.clients[0]?.id || "";
  els.clientSelect.innerHTML = appState.clients
    .map((client) => `<option value="${escapeAttr(client.id)}">${escapeHtml(client.name || "Client")}</option>`)
    .join("");
  els.clientSelect.value = appState.clients.some((client) => client.id === selectedClient)
    ? selectedClient
    : appState.clients[0]?.id || "";
}

function renderClients() {
  const query = normalizeSearch(els.clientSearch?.value || "");
  const clients = appState.clients.filter((client) => {
    const haystack = normalizeSearch(`${client.name} ${client.address} ${client.siren} ${client.vat}`);
    return haystack.includes(query);
  });

  els.clientCount.textContent = `${appState.clients.length}`;
  els.clientList.innerHTML = clients.length
    ? clients
        .map(
          (client) => `
            <article class="list-card">
              <header>
                <div>
                  <h3>${escapeHtml(client.name)}</h3>
                  <p>${escapeHtml(client.address || "Adresse non renseignee")}</p>
                  <p>SIREN ${escapeHtml(client.siren || "-")} · TVA ${escapeHtml(client.vat || "-")}</p>
                </div>
              </header>
              <button class="danger" type="button" data-delete-client="${escapeAttr(client.id)}">Supprimer</button>
            </article>
          `
        )
        .join("")
    : `<article class="list-card"><p>Aucun client trouve.</p></article>`;

  els.clientList.querySelectorAll("[data-delete-client]").forEach((button) => {
    button.addEventListener("click", () => deleteClient(button.dataset.deleteClient));
  });
}

function renderHistory() {
  els.historyList.innerHTML = appState.history.length
    ? appState.history
        .map((item) => {
          const label = documentLabel(item.documentType);
          return `
            <article class="list-card">
              <header>
                <div>
                  <h3>${escapeHtml(label)} n&deg;${escapeHtml(item.number)} · ${formatCurrency(item.totals?.totalTtc || 0)}</h3>
                  <p>${escapeHtml(formatDateLabel(item.issueDate))} · ${escapeHtml(item.client?.name || "Client")}</p>
                  <p>${escapeHtml(item.service?.description || "Prestation")}</p>
                </div>
              </header>
              <div class="list-actions">
                <button class="ghost" type="button" data-regen="${escapeAttr(item.id)}">Regenerer</button>
                <button class="danger" type="button" data-delete-history="${escapeAttr(item.id)}">Supprimer</button>
              </div>
            </article>
          `;
        })
        .join("")
    : `<article class="list-card"><p>Aucun document genere pour le moment.</p></article>`;

  els.historyList.querySelectorAll("[data-regen]").forEach((button) => {
    button.addEventListener("click", () => regenerateHistoryItem(button.dataset.regen));
  });
  els.historyList.querySelectorAll("[data-delete-history]").forEach((button) => {
    button.addEventListener("click", () => deleteHistory(button.dataset.deleteHistory));
  });
}

function updatePreview() {
  const invoice = makeInvoice();
  els.invoicePreview.innerHTML = renderInvoice(invoice);
  els.clientSummary.innerHTML = renderClientSummary(invoice.client);
  els.totalHt.textContent = formatCurrency(invoice.totals.totalHt);
  els.vatAmount.textContent = formatCurrency(invoice.totals.vatAmount);
  els.totalTtc.textContent = formatCurrency(invoice.totals.totalTtc);
  els.monthPreview.textContent = invoice.monthLabel;
  els.nextNumber.textContent = `${documentLabel(invoice.documentType)} n\u00b0${invoice.number}`;
}

function handleGenerateDocument(event) {
  event.preventDefault();
  const invoice = makeInvoice();
  const error = validateInvoice(invoice);
  if (error) {
    showToast(error);
    return;
  }

  invoice.number = Number(appState.config.nextInvoiceNumber) || 29;
  const entry = makeHistoryEntry(invoice);
  appState.history = [entry, ...appState.history].slice(0, MAX_HISTORY);
  appState.config.nextInvoiceNumber = invoice.number + 1;
  saveState();
  renderHistory();
  updatePreview();
  printInvoice(invoice);
  showToast(`${documentLabel(invoice.documentType)} n\u00b0${invoice.number} pret a exporter.`);
}

function handleAddClient(event) {
  event.preventDefault();
  const client = {
    id: `client-${Date.now()}`,
    name: els.newClientName.value.trim(),
    address: els.newClientAddress.value.trim(),
    siren: els.newClientSiren.value.trim(),
    vat: els.newClientVat.value.trim()
  };

  if (!client.name) {
    showToast("Le nom du client est obligatoire.");
    return;
  }

  appState.clients.push(client);
  saveState();
  els.clientForm.reset();
  renderClientOptions();
  els.clientSelect.value = client.id;
  renderClients();
  updatePreview();
  showToast("Client ajoute.");
}

function handleSaveProfile(event) {
  event.preventDefault();
  const profile = readProfileFields();
  if (!profile.label) {
    showToast("Le libelle du profil est obligatoire.");
    return;
  }

  const index = appState.profiles.findIndex((item) => item.id === profile.id);
  if (index >= 0) {
    appState.profiles[index] = profile;
  } else {
    appState.profiles.push(profile);
  }

  saveState();
  renderProfileOptions();
  els.profileSelect.value = profile.id;
  els.profileEditSelect.value = profile.id;
  updatePreview();
  showToast("Profil enregistre.");
}

function populateProfileFields() {
  const profile = appState.profiles.find((item) => item.id === els.profileEditSelect.value) || appState.profiles[0] || {};
  els.profileLabel.value = profile.label || "";
  els.profileDomain.value = profile.domain || "";
  els.profileName.value = profile.name || "";
  els.profileTradeName.value = profile.tradeName || "";
  els.profileAddress.value = profile.address || "";
  els.profileSiret.value = profile.siret || "";
  els.profileVat.value = profile.vat || "";
  els.profileRcs.value = profile.rcs || "";
  els.profileRm.value = profile.rm || "";
  els.profileIban.value = profile.iban || "";
  els.profileBic.value = profile.bic || "";
}

function readProfileFields() {
  return {
    id: els.profileEditSelect.value || `profile-${Date.now()}`,
    label: els.profileLabel.value.trim(),
    domain: els.profileDomain.value.trim(),
    name: els.profileName.value.trim(),
    tradeName: els.profileTradeName.value.trim(),
    address: els.profileAddress.value.trim(),
    siret: els.profileSiret.value.trim(),
    vat: els.profileVat.value.trim(),
    rcs: els.profileRcs.value.trim(),
    rm: els.profileRm.value.trim(),
    iban: els.profileIban.value.replace(/\s+/g, "").trim(),
    bic: els.profileBic.value.trim().toUpperCase()
  };
}

function deleteClient(clientId) {
  appState.clients = appState.clients.filter((client) => client.id !== clientId);
  if (!appState.clients.length) appState.clients = clone(DEFAULT_CLIENTS);
  saveState();
  renderClientOptions();
  renderClients();
  updatePreview();
  showToast("Client supprime.");
}

function deleteHistory(historyId) {
  appState.history = appState.history.filter((item) => item.id !== historyId);
  saveState();
  renderHistory();
  showToast("Document retire de l'historique.");
}

function regenerateHistoryItem(historyId) {
  const item = appState.history.find((entry) => entry.id === historyId);
  if (!item) return;
  loadHistoryIntoForm(item);
  switchScreen("document");
  const invoice = invoiceFromHistory(item);
  printInvoice(invoice);
  showToast(`${documentLabel(invoice.documentType)} n\u00b0${invoice.number} regenere sans changer le compteur.`);
}

function loadHistoryIntoForm(item) {
  els.documentType.value = item.documentType === "devis" ? "devis" : "facture";
  els.issueDate.value = item.issueDate || todayIso();
  const delay = daysBetween(parseIsoDate(item.issueDate), parseIsoDate(item.dueDate));
  els.paymentDelay.value = Number.isFinite(delay) ? String(Math.max(0, delay)) : "8";
  els.serviceDescription.value = item.service?.description || "";
  els.quantity.value = String(item.service?.quantity || 1);
  els.unitPrice.value = String(item.service?.unitPrice || "");
  els.vatRate.value = String(item.service?.vatRate || 0);
  updatePreview();
}

function makeInvoice(numberOverride) {
  const issueDate = parseIsoDate(els.issueDate.value) || new Date();
  const delay = Math.max(0, Number.parseInt(els.paymentDelay.value || "0", 10));
  const dueDate = addDays(issueDate, delay);
  const quantity = Math.max(1, Number.parseFloat(els.quantity.value || "1"));
  const unitPrice = Math.max(0, Number.parseFloat(els.unitPrice.value || "0"));
  const vatRate = Math.max(0, Number.parseFloat(els.vatRate.value || "0"));
  const totalHt = roundMoney(quantity * unitPrice);
  const vatAmount = roundMoney(totalHt * (vatRate / 100));
  const totalTtc = roundMoney(totalHt + vatAmount);

  return {
    number: (numberOverride ?? Number(appState.config.nextInvoiceNumber)) || 29,
    documentType: els.documentType.value === "devis" ? "devis" : "facture",
    issueDate: toIsoDate(issueDate),
    dueDate: toIsoDate(dueDate),
    issueDateLabel: formatDate(issueDate),
    dueDateLabel: formatDate(dueDate),
    monthLabel: monthLabel(issueDate),
    profile: clone(getSelectedProfile()),
    client: clone(getSelectedClient()),
    service: {
      description: els.serviceDescription.value.trim(),
      quantity,
      unitPrice,
      vatRate
    },
    totals: {
      totalHt,
      vatAmount,
      totalTtc
    }
  };
}

function invoiceFromHistory(item) {
  const issueDate = parseIsoDate(item.issueDate) || new Date();
  const dueDate = parseIsoDate(item.dueDate) || addDays(issueDate, 8);
  return {
    number: Number(item.number),
    documentType: item.documentType === "devis" ? "devis" : "facture",
    issueDate: toIsoDate(issueDate),
    dueDate: toIsoDate(dueDate),
    issueDateLabel: formatDate(issueDate),
    dueDateLabel: formatDate(dueDate),
    monthLabel: item.monthLabel || monthLabel(issueDate),
    profile: clone(item.profile || {}),
    client: clone(item.client || {}),
    service: clone(item.service || {}),
    totals: clone(item.totals || {})
  };
}

function makeHistoryEntry(invoice) {
  return {
    id: `${invoice.documentType}-${invoice.number}-${Date.now()}`,
    number: invoice.number,
    documentType: invoice.documentType,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    monthLabel: invoice.monthLabel,
    profile: clone(invoice.profile),
    client: clone(invoice.client),
    service: clone(invoice.service),
    totals: clone(invoice.totals),
    createdAt: new Date().toISOString()
  };
}

function validateInvoice(invoice) {
  if (!invoice.profile.name) return "Complete le nom du profil entrepreneur.";
  if (!invoice.profile.address) return "Complete l'adresse du profil entrepreneur.";
  if (!invoice.profile.iban) return "Complete l'IBAN du profil entrepreneur.";
  if (!invoice.profile.bic) return "Complete le BIC du profil entrepreneur.";
  if (!invoice.client.name) return "Selectionne ou ajoute un client.";
  if (!invoice.service.description) return "Ajoute une description de prestation.";
  if (invoice.service.unitPrice <= 0) return "Ajoute un prix superieur a 0.";
  return "";
}

function renderClientSummary(client) {
  if (!client?.name) return "Aucun client selectionne.";
  return `
    <strong>${escapeHtml(client.name)}</strong><br />
    ${escapeHtml(client.address || "Adresse non renseignee")}<br />
    SIREN ${escapeHtml(client.siren || "-")} · TVA ${escapeHtml(client.vat || "-")}
  `;
}

function renderInvoice(invoice) {
  const profile = invoice.profile || {};
  const client = invoice.client || {};
  const description = invoice.service?.description || "Prestation";
  const vatRate = Number(invoice.service?.vatRate || 0);
  const label = documentLabel(invoice.documentType);

  return `
    <article class="invoice-page">
      <section class="invoice-top">
        <h2 class="invoice-title">${escapeHtml(label.toUpperCase())}&deg; ${escapeHtml(invoice.number)}</h2>
        <p class="invoice-date-line"><strong>Date d'emission :</strong> ${escapeHtml(invoice.issueDateLabel)}</p>
        <p class="invoice-date-line"><strong>Date limite de paiement :</strong> ${escapeHtml(invoice.dueDateLabel)}</p>
      </section>

      <section class="invoice-identity">
        <div class="sender-block">
          <p><strong>${escapeHtml(profile.name || "")}</strong></p>
          ${profile.tradeName ? `<p>${escapeHtml(profile.tradeName)}</p>` : ""}
          <p>${escapeHtml(profile.address || "")}</p>
          <p>SIRET : ${escapeHtml(profile.siret || "")}</p>
          <p>N&deg; TVA : ${escapeHtml(profile.vat || "")}</p>
          <p>RCS : ${escapeHtml(profile.rcs || "")}</p>
          <p>RM : ${escapeHtml(profile.rm || "")}</p>
        </div>
        <div class="client-block">
          <p><strong>${escapeHtml(client.name || "")}</strong></p>
          <p>${escapeHtml(client.address || "")}</p>
          <p>SIREN : ${escapeHtml(client.siren || "")}</p>
          <p>N&deg; TVA : ${escapeHtml(client.vat || "")}</p>
        </div>
      </section>

      <section class="month-block">
        <h3>${escapeHtml(invoice.monthLabel)}</h3>
        <p class="service-summary">${escapeHtml(description)}</p>
      </section>

      <table class="invoice-table" aria-label="Lignes du document">
        <thead>
          <tr>
            <th>Details</th>
            <th>Qte</th>
            <th>Prix unitaire</th>
            <th>TVA %</th>
            <th>Total HT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="detail-cell">${escapeHtml(description)}</td>
            <td>${escapeHtml(invoice.service.quantity || 1)}</td>
            <td>${formatCurrency(invoice.service.unitPrice || 0)}</td>
            <td>${formatPercent(vatRate)}</td>
            <td>${formatCurrency(invoice.totals.totalHt || 0)}</td>
          </tr>
        </tbody>
      </table>

      <section class="summary-zone">
        <div></div>
        <div>
          <table class="summary-table">
            <thead>
              <tr>
                <th>Base HT</th>
                <th>TVA</th>
                <th>Montant TVA</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${formatCurrency(invoice.totals.totalHt || 0)}</td>
                <td>${formatPercent(vatRate)}</td>
                <td>${formatCurrency(invoice.totals.vatAmount || 0)}</td>
              </tr>
            </tbody>
          </table>
          <table class="total-table">
            <tbody>
              <tr>
                <td><strong>Total HT</strong></td>
                <td>${formatCurrency(invoice.totals.totalHt || 0)}</td>
              </tr>
              <tr>
                <td>TVA</td>
                <td>${formatCurrency(invoice.totals.vatAmount || 0)}</td>
              </tr>
              <tr class="grand-total">
                <td>Total</td>
                <td>${formatCurrency(invoice.totals.totalTtc || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="payment-zone">
        <table class="payment-table">
          <thead>
            <tr>
              <th colspan="2">Informations de paiement</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>IBAN</td>
              <td>${escapeHtml(profile.iban || "")}</td>
            </tr>
            <tr>
              <td>BIC</td>
              <td>${escapeHtml(profile.bic || "")}</td>
            </tr>
          </tbody>
        </table>
        <p class="legal-note">TVA non applicable, article 293B du CGI</p>
      </section>

      <footer class="invoice-footer">${escapeHtml(label)} n&deg;${escapeHtml(invoice.number)} - Page 1 / 1</footer>
    </article>
  `;
}

function printInvoice(invoice) {
  els.printArea.innerHTML = renderInvoice(invoice);
  window.setTimeout(() => {
    window.print();
  }, 120);
}

function getSelectedProfile() {
  return appState.profiles.find((profile) => profile.id === els.profileSelect.value) || appState.profiles[0] || {};
}

function getSelectedClient() {
  return appState.clients.find((client) => client.id === els.clientSelect.value) || appState.clients[0] || {};
}

function documentLabel(type) {
  return type === "devis" ? "Devis" : "Facture";
}

function todayIso() {
  return toIsoDate(new Date());
}

function parseIsoDate(value) {
  if (!value) return null;
  const parts = String(value).split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function daysBetween(start, end) {
  if (!start || !end) return NaN;
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function formatDate(date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function formatDateLabel(isoDate) {
  const date = parseIsoDate(isoDate);
  return date ? formatDate(date) : "-";
}

function monthLabel(date) {
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }).toUpperCase();
}

function formatCurrency(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR"
  }).format(Number(value) || 0);
}

function formatPercent(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? `${number}%` : `${number.toFixed(1)}%`;
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function normalizeSearch(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = window.setTimeout(() => {
    els.toast.classList.remove("show");
  }, 3200);
}
