import type { AppSnapshot, DeplogApi } from "../src/shared/types";

const { contextBridge, ipcRenderer } = require("electron");

const api: DeplogApi = {
  getSnapshot: () => ipcRenderer.invoke("deplog:get-snapshot"),
  subscribe: (listener) => {
    const wrapped = (_event: Electron.IpcRendererEvent, snapshot: AppSnapshot) => {
      listener(snapshot);
    };

    ipcRenderer.on("deplog:snapshot-updated", wrapped);
    return () => {
      ipcRenderer.removeListener("deplog:snapshot-updated", wrapped);
    };
  },
  openExternal: (url) => ipcRenderer.invoke("deplog:open-external", url),
  quit: () => ipcRenderer.invoke("deplog:quit")
};

contextBridge.exposeInMainWorld("deplog", api);
