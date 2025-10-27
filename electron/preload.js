const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // IPC methods can be added here later
});
