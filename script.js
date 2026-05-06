const state = {
  clients: [],
  profiles: [],
  history: [],
  config: { nextInvoiceNumber: 29 },
  selectedClientId: "",
  selectedProfileId: "",
  paths: {},
  styles: ""
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  bindEvents();

  try {
    state.styles = await loadStyles();
    const data = await window.facturette.loadData();
    state.clients = data.clients || [];
    state.profiles = data.profiles || [];
    state.history = data.history || [];
    state.config = data.config || { nextInvoiceNumber: 29 };
    state.paths = data.paths || {};
    state.selectedProfileId = state.profiles[0]?.id || "";
    state.selectedClientId = state.clients[0]?.id || "";

    setStartupDefaults();
    renderProfileOptions();
    populateProfileFields();
    renderClientOptions();
    renderHistory();
    updatePreview();
    showToast("Facturette est prête.", "success");
  } catch (error) {
    showToast(error.message || "Impossible de charger Facturette.", "error");
  }
}

function cacheElements() {
  [
    "storagePath",
    "nextNumber",
    "invoiceForm",
    "profileSelect",
    "profileLabel",
    "profileName",
    "profileTradeName",
    "profileDomain",
    "profileAddress",
    "profileSiret",
    "profileVat",
    "profileRcs",
    "profileRm",
    "profileIban",
    "profileBic",
    "saveProfileButton",
    "documentType",
    "issueDate",
    "paymentDelay",
    "clientSearch",
    "clientSelect",
    "deleteClientButton",
    "selectedClientDetails",
    "newClientName",
    "newClientAddress",
    "newClientSiren",
    "newClientVat",
    "addClientButton",
    "serviceDescription",
    "quantity",
    "unitPrice",
    "vatRate",
    "resetButton",
    "invoicePreview",
    "historyGrid",
    "toast"
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  els.invoiceForm.addEventListener("input", () => {
    updateProfileDraft();
    updatePreview();
  });

  els.invoiceForm.addEventListener("change", () => {
    updateProfileDraft();
    updatePreview();
  });

  els.invoiceForm.addEventListener("submit", handleGeneratePdf);

  els.profileSelect.addEventListener("change", () => {
    state.selectedProfileId = els.profileSelect.value;
    populateProfileFields();
    updatePreview();
  });

  els.saveProfileButton.addEventListener("click", handleSaveProfile);

  els.clientSearch.addEventListener("input", () => {
    renderClientOptions();
    updatePreview();
  });

  els.clientSelect.addEventListener("change", () => {
    state.selectedClientId = els.clientSelect.value;
    renderSelectedClient();
    updatePreview();
  });

  els.addClientButton.addEventListener("click", handleAddClient);
  els.deleteClientButton.addEventListener("click", handleDeleteClient);
  els.resetButton.addEventListener("click", () => {
    resetInvoiceFields();
    updatePreview();
    showToast("Formulaire réinitialisé.", "success");
  });

  els.historyGrid.addEventListener("click", handleHistoryClick);
}

async function loadStyles() {
  try {
    const response = await fetch("styles.css");
    return await response.text();
  } catch (_) {
    return "";
  }
}

function setStartupDefaults() {
  els.documentType.value = "facture";
  els.issueDate.value = todayIso();
  els.paymentDelay.value = "8";
  els.serviceDescription.value = "Shooting";
  els.quantity.value = "1";
  els.unitPrice.value = "250.00";
  els.vatRate.value = "0";
}

function resetInvoiceFields() {
  els.documentType.value = "facture";
  els.issueDate.value = todayIso();
  els.paymentDelay.value = "8";
  els.clientSearch.value = "";
  state.selectedClientId = state.clients[0]?.id || "";
  els.serviceDescription.value = "";
  els.quantity.value = "1";
  els.unitPrice.value = "";
  els.vatRate.value = "0";
  renderClientOptions();
}

function renderProfileOptions() {
  els.profileSelect.innerHTML = state.profiles
    .map((profile) => `<option value="${escapeAttr(profile.id)}">${escapeHtml(profile.label || profile.name || "Profil")}</option>`)
    .join("");
  els.profileSelect.value = state.selectedProfileId;
}

function getSelectedProfileFromState() {
  return state.profiles.find((profile) => profile.id === state.selectedProfileId) || state.profiles[0] || {};
}

function populateProfileFields() {
  const profile = getSelectedProfileFromState();
  els.profileSelect.value = profile.id || "";
  els.profileLabel.value = profile.label || "";
  els.profileName.value = profile.name || "";
  els.profileTradeName.value = profile.tradeName || "";
  els.profileDomain.value = profile.domain || "";
  els.profileAddress.value = profile.address || "";
  els.profileSiret.value = profile.siret || "";
  els.profileVat.value = profile.vat || "";
  els.profileRcs.value = profile.rcs || "";
  els.profileRm.value = profile.rm || "";
  els.profileIban.value = profile.iban || "";
  els.profileBic.value = profile.bic || "";
}

function readProfileFields() {
  const current = getSelectedProfileFromState();
  return {
    id: current.id || state.selectedProfileId || `profile-${Date.now()}`,
    label: els.profileLabel.value.trim(),
    name: els.profileName.value.trim(),
    tradeName: els.profileTradeName.value.trim(),
    domain: els.profileDomain.value.trim(),
    address: els.profileAddress.value.trim(),
    siret: els.profileSiret.value.trim(),
    vat: els.profileVat.value.trim(),
    rcs: els.profileRcs.value.trim(),
    rm: els.profileRm.value.trim(),
    iban: els.profileIban.value.replace(/\s+/g, ""),
    bic: els.profileBic.value.trim().toUpperCase()
  };
}

function updateProfileDraft() {
  if (!state.selectedProfileId) return;
  const index = state.profiles.findIndex((profile) => profile.id === state.selectedProfileId);
  if (index < 0) return;
  state.profiles[index] = readProfileFields();
  renderProfileOptions();
}

async function handleSaveProfile() {
  try {
    const profile = readProfileFields();
    if (!profile.label) {
      showToast("Ajoute un libellé au profil.", "error");
      return;
    }
    state.profiles = await window.facturette.saveProfile(profile);
    state.selectedProfileId = profile.id;
    renderProfileOptions();
    populateProfileFields();
    updatePreview();
    showToast("Profil enregistré.", "success");
  } catch (error) {
    showToast(error.message || "Impossible d'enregistrer le profil.", "error");
  }
}

function filteredClients() {
  const query = els.clientSearch.value.trim().toLowerCase();
  if (!query) return state.clients;
  return state.clients.filter((client) => {
    return [client.name, client.address, client.siren, client.vat]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

function renderClientOptions() {
  const clients = filteredClients();
  if (!clients.some((client) => client.id === state.selectedClientId)) {
    state.selectedClientId = clients[0]?.id || state.clients[0]?.id || "";
  }
  els.clientSelect.innerHTML = clients
    .map((client) => `<option value="${escapeAttr(client.id)}">${escapeHtml(client.name)}</option>`)
    .join("");
  els.clientSelect.value = state.selectedClientId;
  renderSelectedClient();
}

function getSelectedClient() {
  return state.clients.find((client) => client.id === state.selectedClientId) || state.clients[0] || {};
}

function renderSelectedClient() {
  const client = getSelectedClient();
  if (!client.name) {
    els.selectedClientDetails.innerHTML = "Aucun client sélectionné.";
    return;
  }
  els.selectedClientDetails.innerHTML = `
    <strong>${escapeHtml(client.name)}</strong>
    <span>${lineBreaks(client.address)}</span><br>
    <span>SIREN : ${escapeHtml(client.siren || "-")}</span><br>
    <span>TVA : ${escapeHtml(client.vat || "-")}</span>
  `;
}

async function handleAddClient() {
  const client = {
    id: `client-${Date.now()}`,
    name: els.newClientName.value.trim(),
    address: els.newClientAddress.value.trim(),
    siren: els.newClientSiren.value.trim(),
    vat: els.newClientVat.value.trim()
  };

  if (!client.name) {
    showToast("Le nom du client est obligatoire.", "error");
    return;
  }

  try {
    state.clients = await window.facturette.saveClient(client);
    state.selectedClientId = client.id;
    els.clientSearch.value = "";
    els.newClientName.value = "";
    els.newClientAddress.value = "";
    els.newClientSiren.value = "";
    els.newClientVat.value = "";
    renderClientOptions();
    updatePreview();
    showToast("Client ajouté.", "success");
  } catch (error) {
    showToast(error.message || "Impossible d'ajouter le client.", "error");
  }
}

async function handleDeleteClient() {
  const client = getSelectedClient();
  if (!client.id) return;
  if (!window.confirm(`Supprimer ${client.name} de la base clients ?`)) return;

  try {
    state.clients = await window.facturette.deleteClient(client.id);
    state.selectedClientId = state.clients[0]?.id || "";
    renderClientOptions();
    updatePreview();
    showToast("Client supprimé.", "success");
  } catch (error) {
    showToast(error.message || "Impossible de supprimer le client.", "error");
  }
}

function makeInvoice(numberOverride) {
  const issueDate = parseDateInput(els.issueDate.value) || new Date();
  const paymentDelay = Math.max(0, Number.parseInt(els.paymentDelay.value || "0", 10));
  const dueDate = addDays(issueDate, paymentDelay);
  const quantity = Math.max(1, Number.parseInt(els.quantity.value || "1", 10));
  const unitPrice = Math.max(0, Number.parseFloat(els.unitPrice.value || "0"));
  const vatRate = Number.parseFloat(els.vatRate.value || "0");
  const totalHt = roundMoney(quantity * unitPrice);
  const vatAmount = roundMoney(totalHt * (vatRate / 100));
  const totalTtc = roundMoney(totalHt + vatAmount);

  return {
    number: numberOverride ?? state.config.nextInvoiceNumber ?? 29,
    documentType: normalizeDocumentType(els.documentType.value),
    issueDate: toIsoDate(issueDate),
    dueDate: toIsoDate(dueDate),
    issueDateLabel: formatDateFr(issueDate),
    dueDateLabel: formatDateFr(dueDate),
    monthLabel: monthYearFr(issueDate),
    profile: readProfileFields(),
    client: getSelectedClient(),
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

function updatePreview() {
  const invoice = makeInvoice();
  els.invoicePreview.innerHTML = renderInvoice(invoice);
  els.nextNumber.textContent = `${documentLabel(invoice.documentType)} n°${state.config.nextInvoiceNumber ?? 29}`;
  els.storagePath.textContent = state.paths.dataDir ? `Données : ${state.paths.dataDir}` : "Données locales";
}

async function handleGeneratePdf(event) {
  event.preventDefault();
  const invoice = makeInvoice();
  const validation = validateInvoice(invoice);
  if (validation) {
    showToast(validation, "error");
    return;
  }

  try {
    const html = await buildPdfDocument({ ...invoice, number: "__INVOICE_NUMBER__" });
    const result = await window.facturette.generatePdf({
      mode: "new",
      invoice,
      html
    });
    state.config = result.config;
    state.history = result.history;
    renderHistory();
    updatePreview();
    showToast(`PDF généré sur le Bureau : ${documentFileName(invoice.documentType, result.number)}`, "success");
  } catch (error) {
    showToast(error.message || "Impossible de générer le PDF.", "error");
  }
}

function validateInvoice(invoice) {
  if (!invoice.profile.name) return "Complète le nom du profil entrepreneur.";
  if (!invoice.profile.address) return "Complète l'adresse du profil entrepreneur.";
  if (!invoice.profile.iban) return "Complète l'IBAN du profil entrepreneur.";
  if (!invoice.profile.bic) return "Complète le BIC du profil entrepreneur.";
  if (!invoice.client.name) return "Sélectionne ou ajoute un client.";
  if (!invoice.service.description) return "Ajoute une description de prestation.";
  if (invoice.service.unitPrice <= 0) return "Ajoute un prix unitaire supérieur à 0.";
  return "";
}

async function buildPdfDocument(invoice) {
  const invoiceHtml = renderInvoice(invoice);
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8">
    <style>${state.styles}</style>
  </head>
  <body class="pdf-render">${invoiceHtml}</body>
</html>`;
}

function renderInvoice(invoice) {
  const description = invoice.service.description || "Prestation";
  const profile = invoice.profile || {};
  const client = invoice.client || {};
  const vatRate = invoice.service.vatRate || 0;
  const label = documentLabel(invoice.documentType);

  return `
    <article class="invoice-page">
      <section class="invoice-top">
        <h2 class="invoice-title">${escapeHtml(label.toUpperCase())}° ${escapeHtml(invoice.number)}</h2>
        <p class="invoice-date-line"><strong>Date d'émission :</strong> ${escapeHtml(invoice.issueDateLabel)}</p>
        <p class="invoice-date-line"><strong>Date limite de paiement :</strong> ${escapeHtml(invoice.dueDateLabel)}</p>
      </section>

      <section class="invoice-identity">
        <div class="sender-block">
          <p><strong>${escapeHtml(profile.name || "")}</strong></p>
          ${profile.tradeName ? `<p>${escapeHtml(profile.tradeName)}</p>` : ""}
          <p>${lineBreaks(profile.address || "")}</p>
          <p><strong>SIREN :</strong> ${escapeHtml(profile.siret || "")}</p>
          <p><strong>N° de TVA :</strong> ${escapeHtml(profile.vat || "")}</p>
          <p><strong>Numéro RCS :</strong> ${escapeHtml(profile.rcs || "")}</p>
          <p><strong>Numéro RM :</strong> ${escapeHtml(profile.rm || "")}</p>
        </div>
        <div class="client-block">
          <p><strong>${escapeHtml(client.name || "")}</strong></p>
          <p>${lineBreaks(client.address || "")}</p>
          <p><strong>SIREN :</strong> ${escapeHtml(client.siren || "")}</p>
          <p><strong>TVA :</strong> ${escapeHtml(client.vat || "")}</p>
        </div>
      </section>

      <section class="month-block">
        <h3>${escapeHtml(invoice.monthLabel)}</h3>
        <p class="service-summary">${escapeHtml(description)}</p>
      </section>

      <table class="invoice-table" aria-label="Lignes de facture">
        <thead>
          <tr>
            <th>Détails</th>
            <th>Qté</th>
            <th>Prix unitaire</th>
            <th>TVA %</th>
            <th>Total HT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="detail-cell">${escapeHtml(description)}</td>
            <td>${escapeHtml(invoice.service.quantity)}</td>
            <td>${formatCurrency(invoice.service.unitPrice)}</td>
            <td>${formatPercent(vatRate)}</td>
            <td>${formatCurrency(invoice.totals.totalHt)}</td>
          </tr>
        </tbody>
      </table>

      <section class="totals-zone">
        <table class="summary-table" aria-label="TVA">
          <thead>
            <tr>
              <th>Base HT</th>
              <th>TVA</th>
              <th>Montant TVA</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${formatCurrency(invoice.totals.totalHt)}</td>
              <td>${formatPercent(vatRate)}</td>
              <td>${formatCurrency(invoice.totals.vatAmount)}</td>
            </tr>
          </tbody>
        </table>

        <table class="total-table" aria-label="Totaux">
          <tbody>
            <tr>
              <td><strong>Total HT</strong></td>
              <td>${formatCurrency(invoice.totals.totalHt)}</td>
            </tr>
            <tr>
              <td>TVA</td>
              <td>${formatCurrency(invoice.totals.vatAmount)}</td>
            </tr>
            <tr class="grand-total">
              <td>Total</td>
              <td>${formatCurrency(invoice.totals.totalTtc)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <p class="vat-mention">TVA non applicable, article 293B du CGI</p>

      <section class="payment-zone">
        <table class="payment-table" aria-label="Informations de paiement">
          <thead>
            <tr>
              <th>Informations de paiement</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <p class="payment-line"><strong>IBAN :</strong> ${escapeHtml(profile.iban || "")}</p>
                <p class="payment-line"><strong>BIC :</strong> ${escapeHtml(profile.bic || "")}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer class="invoice-footer">${escapeHtml(label)} n°${escapeHtml(invoice.number)} - Page 1 / 1</footer>
    </article>
  `;
}

function renderHistory() {
  if (!state.history.length) {
    els.historyGrid.innerHTML = `<p class="empty-state">Aucune facture générée pour le moment.</p>`;
    return;
  }

  els.historyGrid.innerHTML = state.history
    .map((item) => {
      const service = item.service?.description || "Prestation";
      const client = item.client?.name || "Client";
      const amount = formatCurrency(item.totals?.totalTtc || 0);
      const label = documentLabel(item.documentType);
      return `
        <article class="history-card">
          <h3>${escapeHtml(label)} n°${escapeHtml(item.number)}</h3>
          <p>${escapeHtml(formatIsoDateFr(item.issueDate))} · ${escapeHtml(client)}</p>
          <p>${escapeHtml(service)}</p>
          <p><strong>${amount}</strong></p>
          <div class="history-actions">
            <button class="button secondary" type="button" data-action="regen" data-id="${escapeAttr(item.id)}">Régénérer</button>
            <button class="button ghost" type="button" data-action="delete" data-id="${escapeAttr(item.id)}">Supprimer</button>
          </div>
        </article>
      `;
    })
    .join("");
}

async function handleHistoryClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const item = state.history.find((entry) => entry.id === button.dataset.id);
  if (!item) return;

  if (button.dataset.action === "delete") {
    if (!window.confirm(`Supprimer ${documentLabel(item.documentType).toLowerCase()} n°${item.number} de l'historique ?`)) return;
    try {
      state.history = await window.facturette.deleteHistory(item.id);
      renderHistory();
      showToast("Facture retirée de l'historique.", "success");
    } catch (error) {
      showToast(error.message || "Impossible de supprimer l'historique.", "error");
    }
    return;
  }

  await regenerateHistoryInvoice(item);
}

async function regenerateHistoryInvoice(item) {
  try {
    loadHistoryIntoForm(item);
    const invoice = invoiceFromHistory(item);
    const html = await buildPdfDocument(invoice);
    const result = await window.facturette.generatePdf({
      mode: "regenerate",
      invoice,
      html
    });
    state.history = result.history;
    state.config = result.config;
    renderHistory();
    updatePreview();
    showToast(`${documentFileName(invoice.documentType, result.number)} régénéré sur le Bureau.`, "success");
  } catch (error) {
    showToast(error.message || "Impossible de régénérer le PDF.", "error");
  }
}

function loadHistoryIntoForm(item) {
  const matchingProfile = state.profiles.find((profile) => profile.id === item.profile?.id);
  if (matchingProfile) {
    state.selectedProfileId = matchingProfile.id;
    renderProfileOptions();
    populateProfileFields();
  }

  const matchingClient = state.clients.find((client) => client.id === item.client?.id);
  if (matchingClient) {
    state.selectedClientId = matchingClient.id;
    els.clientSearch.value = "";
    renderClientOptions();
  }

  els.documentType.value = normalizeDocumentType(item.documentType);
  els.issueDate.value = item.issueDate || todayIso();
  const issue = parseDateInput(item.issueDate) || new Date();
  const due = parseDateInput(item.dueDate) || addDays(issue, 8);
  els.paymentDelay.value = String(diffDays(issue, due));
  els.serviceDescription.value = item.service?.description || "";
  els.quantity.value = String(item.service?.quantity || 1);
  els.unitPrice.value = Number(item.service?.unitPrice || 0).toFixed(2);
  els.vatRate.value = String(item.service?.vatRate ?? 0);
}

function invoiceFromHistory(item) {
  const issue = parseDateInput(item.issueDate) || new Date();
  const due = parseDateInput(item.dueDate) || addDays(issue, 8);
  return {
    number: item.number,
    documentType: normalizeDocumentType(item.documentType),
    issueDate: toIsoDate(issue),
    dueDate: toIsoDate(due),
    issueDateLabel: formatDateFr(issue),
    dueDateLabel: formatDateFr(due),
    monthLabel: monthYearFr(issue),
    profile: item.profile || readProfileFields(),
    client: item.client || getSelectedClient(),
    service: item.service || {
      description: els.serviceDescription.value.trim(),
      quantity: 1,
      unitPrice: 0,
      vatRate: 0
    },
    totals: item.totals || makeInvoice(item.number).totals
  };
}

function normalizeDocumentType(value) {
  return value === "devis" ? "devis" : "facture";
}

function documentLabel(type) {
  return normalizeDocumentType(type) === "devis" ? "Devis" : "Facture";
}

function documentFileName(type, number) {
  return `${documentLabel(type)}_${number}.pdf`;
}

function todayIso() {
  return toIsoDate(new Date());
}

function parseDateInput(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function diffDays(start, end) {
  const diff = end.getTime() - start.getTime();
  return Math.max(0, Math.round(diff / 86400000));
}

function formatDateFr(date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function formatIsoDateFr(value) {
  const date = parseDateInput(value);
  return date ? formatDateFr(date) : "";
}

function monthYearFr(date) {
  const months = [
    "JANVIER",
    "FÉVRIER",
    "MARS",
    "AVRIL",
    "MAI",
    "JUIN",
    "JUILLET",
    "AOÛT",
    "SEPTEMBRE",
    "OCTOBRE",
    "NOVEMBRE",
    "DÉCEMBRE"
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function formatPercent(value) {
  const normalized = Number(value || 0);
  return `${String(normalized).replace(".", ",")} %`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function lineBreaks(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

let toastTimer;

function showToast(message, type = "success") {
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.className = `toast visible ${type}`;
  toastTimer = window.setTimeout(() => {
    els.toast.className = "toast";
  }, 3600);
}
