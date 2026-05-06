const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("facturette", {
  loadData: () => ipcRenderer.invoke("app:load"),
  saveClient: (client) => ipcRenderer.invoke("client:save", client),
  deleteClient: (clientId) => ipcRenderer.invoke("client:delete", clientId),
  saveProfile: (profile) => ipcRenderer.invoke("profile:save", profile),
  generatePdf: (payload) => ipcRenderer.invoke("pdf:generate", payload),
  deleteHistory: (historyId) => ipcRenderer.invoke("history:delete", historyId)
});
