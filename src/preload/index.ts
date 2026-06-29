import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  events: {
    getAll: () => ipcRenderer.invoke('events:getAll'),
    create: (data: unknown) => ipcRenderer.invoke('events:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('events:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('events:delete', id)
  },
  groups: {
    getAll: () => ipcRenderer.invoke('groups:getAll'),
    create: (data: unknown) => ipcRenderer.invoke('groups:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('groups:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('groups:delete', id)
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value)
  }
})
