const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const fs = require("fs");
const path = require("path");

const APP_NAME = "Facturette";
const DATA_DIR_NAME = "Facturette";
const MAX_HISTORY = 50;

const DEFAULT_CLIENTS = [
  {
    id: "alpha-record",
    name: "Alpha Record",
    address: "60 rue françois 1er 75008 PARIS, FR",
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
    address: "4 rue Geneviève de Galard 78440 Gargenville, FR",
    siret: "948 473 905",
    vat: "FR59948473905",
    rcs: "948473905 RCS Gargenville",
    rm: "948473905 RM 95",
    iban: "FR0517748019841TRC5CSIBNW29",
    bic: "DBLKFR22XXX",
    domain: "Photographie / Vidéo"
  },
  {
    id: "second-profile",
    label: "Deuxième profil",
    name: "",
    tradeName: "",
    address: "",
    siret: "",
    vat: "",
    rcs: "",
    rm: "",
    iban: "",
    bic: "",
    domain: "Photographie / Vidéo"
  }
];

let mainWindow;
const smokeMode = process.argv.includes("--smoke-regenerate")
  ? "regenerate"
  : process.argv.includes("--smoke-test")
    ? "new"
    : "";
const isSmokeTest = Boolean(smokeMode);

function getDataDir() {
  return path.join(app.getPath("appData"), DATA_DIR_NAME);
}

function getFilePaths() {
  const dataDir = getDataDir();
  return {
    dataDir,
    clients: path.join(dataDir, "clients.json"),
    history: path.join(dataDir, "history.json"),
    config: path.join(dataDir, "config.json"),
    profiles: path.join(dataDir, "profiles.json")
  };
}

function ensureDataDir() {
  fs.mkdirSync(getDataDir(), { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) {
      writeJson(filePath, fallback);
      return structuredCloneSafe(fallback);
    }
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw.trim()) return structuredCloneSafe(fallback);
    return JSON.parse(raw);
  } catch (error) {
    const backupPath = `${filePath}.broken-${Date.now()}`;
    try {
      if (fs.existsSync(filePath)) fs.copyFileSync(filePath, backupPath);
    } catch (_) {
      // Keep loading even if a backup cannot be created.
    }
    writeJson(filePath, fallback);
    return structuredCloneSafe(fallback);
  }
}

function writeJson(filePath, value) {
  ensureDataDir();
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeClient(client) {
  return {
    id: client.id || `client-${Date.now()}`,
    name: String(client.name || "").trim(),
    address: String(client.address || "").trim(),
    siren: String(client.siren || "").trim(),
    vat: String(client.vat || "").trim()
  };
}

function normalizeProfile(profile) {
  return {
    id: profile.id || `profile-${Date.now()}`,
    label: String(profile.label || profile.name || "Profil").trim(),
    name: String(profile.name || "").trim(),
    tradeName: String(profile.tradeName || "").trim(),
    address: String(profile.address || "").trim(),
    siret: String(profile.siret || "").trim(),
    vat: String(profile.vat || "").trim(),
    rcs: String(profile.rcs || "").trim(),
    rm: String(profile.rm || "").trim(),
    iban: String(profile.iban || "").replace(/\s+/g, ""),
    bic: String(profile.bic || "").trim().toUpperCase(),
    domain: String(profile.domain || "").trim()
  };
}

function loadState() {
  ensureDataDir();
  const files = getFilePaths();
  const clients = readJson(files.clients, DEFAULT_CLIENTS).map(normalizeClient);
  const profiles = readJson(files.profiles, DEFAULT_PROFILES).map(normalizeProfile);
  const history = readJson(files.history, []);
  const config = readJson(files.config, { nextInvoiceNumber: 29 });

  if (!clients.some((client) => client.id === "alpha-record")) {
    clients.unshift(DEFAULT_CLIENTS[0]);
    writeJson(files.clients, clients);
  }

  if (!profiles.some((profile) => profile.id === "mohamed-soumah")) {
    profiles.unshift(DEFAULT_PROFILES[0]);
    writeJson(files.profiles, profiles);
  }

  if (!Number.isFinite(Number(config.nextInvoiceNumber))) {
    config.nextInvoiceNumber = 29;
    writeJson(files.config, config);
  }

  return {
    clients,
    profiles,
    history: history.slice(0, MAX_HISTORY),
    config,
    paths: {
      dataDir: files.dataDir,
      desktop: app.getPath("desktop")
    }
  };
}

function saveClients(clients) {
  writeJson(getFilePaths().clients, clients.map(normalizeClient));
}

function saveProfiles(profiles) {
  writeJson(getFilePaths().profiles, profiles.map(normalizeProfile));
}

function saveHistory(history) {
  writeJson(getFilePaths().history, history.slice(0, MAX_HISTORY));
}

function saveConfig(config) {
  writeJson(getFilePaths().config, config);
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 980,
    minWidth: 1060,
    minHeight: 760,
    show: false,
    icon: path.join(__dirname, "build", "icon.png"),
    backgroundColor: "#f4f6fb",
    title: APP_NAME,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  Menu.setApplicationMenu(null);
  await mainWindow.loadFile(path.join(__dirname, "index.html"));

  if (!isSmokeTest) {
    mainWindow.show();
  }

  return mainWindow;
}

function getDocumentType(invoice) {
  return invoice.documentType === "devis" ? "Devis" : "Facture";
}

function getPdfPath(number, invoice) {
  return path.join(app.getPath("desktop"), `${getDocumentType(invoice)}_${number}.pdf`);
}

async function renderPdf(html, number, invoice) {
  const printWindow = new BrowserWindow({
    show: false,
    width: 1240,
    height: 1754,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  try {
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
    const buffer = await printWindow.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      pageSize: "A4"
    });
    const pdfPath = getPdfPath(number, invoice);
    fs.writeFileSync(pdfPath, buffer);
    return pdfPath;
  } finally {
    if (!printWindow.isDestroyed()) {
      printWindow.close();
    }
  }
}

function makeHistoryEntry(invoice, pdfPath) {
  return {
    id: `invoice-${invoice.number}-${Date.now()}`,
    number: invoice.number,
    documentType: invoice.documentType === "devis" ? "devis" : "facture",
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    monthLabel: invoice.monthLabel,
    profile: invoice.profile,
    client: invoice.client,
    service: invoice.service,
    totals: invoice.totals,
    pdfPath,
    createdAt: new Date().toISOString()
  };
}

ipcMain.handle("app:load", () => loadState());

ipcMain.handle("client:save", (_event, client) => {
  const nextClient = normalizeClient(client);
  if (!nextClient.name) throw new Error("Le nom du client est obligatoire.");
  const state = loadState();
  const index = state.clients.findIndex((item) => item.id === nextClient.id);
  if (index >= 0) {
    state.clients[index] = nextClient;
  } else {
    state.clients.push(nextClient);
  }
  saveClients(state.clients);
  return state.clients;
});

ipcMain.handle("client:delete", (_event, clientId) => {
  const state = loadState();
  const clients = state.clients.filter((client) => client.id !== clientId);
  saveClients(clients);
  return clients;
});

ipcMain.handle("profile:save", (_event, profile) => {
  const nextProfile = normalizeProfile(profile);
  if (!nextProfile.label) throw new Error("Le libellé du profil est obligatoire.");
  const state = loadState();
  const index = state.profiles.findIndex((item) => item.id === nextProfile.id);
  if (index >= 0) {
    state.profiles[index] = nextProfile;
  } else {
    state.profiles.push(nextProfile);
  }
  saveProfiles(state.profiles);
  return state.profiles;
});

ipcMain.handle("history:delete", (_event, historyId) => {
  const state = loadState();
  const history = state.history.filter((item) => item.id !== historyId);
  saveHistory(history);
  return history;
});

ipcMain.handle("pdf:generate", async (_event, payload) => {
  const state = loadState();
  const mode = payload.mode === "regenerate" ? "regenerate" : "new";
  const invoice = structuredCloneSafe(payload.invoice);
  const number = mode === "new" ? Number(state.config.nextInvoiceNumber) : Number(invoice.number);

  if (!Number.isFinite(number)) {
    throw new Error("Numéro de facture invalide.");
  }

  invoice.number = number;
  const html = String(payload.html || "").replaceAll("__INVOICE_NUMBER__", String(number));
  const pdfPath = await renderPdf(html, number, invoice);

  if (mode === "new") {
    const nextHistory = [makeHistoryEntry(invoice, pdfPath), ...state.history].slice(0, MAX_HISTORY);
    const nextConfig = { ...state.config, nextInvoiceNumber: number + 1 };
    saveHistory(nextHistory);
    saveConfig(nextConfig);
    return {
      number,
      pdfPath,
      history: nextHistory,
      config: nextConfig
    };
  }

  const nextHistory = state.history.map((entry) => {
    if (Number(entry.number) !== number) return entry;
    return {
      ...entry,
      pdfPath,
      regeneratedAt: new Date().toISOString()
    };
  });
  saveHistory(nextHistory);

  return {
    number,
    pdfPath,
    history: nextHistory,
    config: state.config
  };
});

async function runSmokeTest(mode) {
  const script = `
    (async () => {
      const waitForReady = () => new Promise((resolve, reject) => {
        const started = Date.now();
        const tick = () => {
          const preview = document.getElementById("invoicePreview");
          const form = document.getElementById("invoiceForm");
          if (preview && form && (preview.textContent.includes("FACTURE") || preview.textContent.includes("DEVIS"))) {
            resolve();
            return;
          }
          if (Date.now() - started > 15000) {
            reject(new Error("L'interface ne s'est pas initialisée."));
            return;
          }
          setTimeout(tick, 150);
        };
        tick();
      });

      const waitForPdf = (expectedText) => new Promise((resolve, reject) => {
        const started = Date.now();
        const tick = () => {
          const toast = document.getElementById("toast")?.textContent || "";
          if (toast.includes(expectedText)) {
            resolve(toast);
            return;
          }
          if (toast.includes("Impossible") || toast.includes("obligatoire")) {
            reject(new Error(toast));
            return;
          }
          if (Date.now() - started > 25000) {
            reject(new Error("La génération PDF a dépassé le délai prévu."));
            return;
          }
          setTimeout(tick, 200);
        };
        tick();
      });

      await waitForReady();
      if (${JSON.stringify(mode)} === "regenerate") {
        const before = document.getElementById("nextNumber").textContent;
        const button = document.querySelector('button[data-action="regen"]');
        if (!button) throw new Error("Aucune facture historique à régénérer.");
        button.click();
        const toast = await waitForPdf("régénéré");
        const after = document.getElementById("nextNumber").textContent;
        if (before !== after) throw new Error("Le compteur a changé pendant la régénération.");
        return toast;
      }

      document.getElementById("serviceDescription").value = "Shooting";
      document.getElementById("quantity").value = "1";
      document.getElementById("unitPrice").value = "250.00";
      document.getElementById("vatRate").value = "0";
      document.getElementById("invoiceForm").requestSubmit();
      return waitForPdf("PDF généré");
    })();
  `;

  return mainWindow.webContents.executeJavaScript(script, true);
}

app.whenReady().then(async () => {
  await createWindow();

  if (isSmokeTest) {
    try {
      const result = await runSmokeTest(smokeMode);
      console.log(`SMOKE_TEST_OK ${result}`);
    } catch (error) {
      console.error(`SMOKE_TEST_FAILED ${error.message}`);
      process.exitCode = 1;
    } finally {
      app.quit();
    }
    return;
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
