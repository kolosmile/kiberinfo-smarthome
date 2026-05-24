const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send(channel, payload) {
      if (channel !== 'mqtt-publish') {
        return;
      }

      ipcRenderer.send(channel, payload);
    },
  },
});
