import { app, BrowserWindow, ipcMain } from 'electron';
import mqtt from 'mqtt';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MQTT_BROKER_URL = 'mqtt://test.mosquitto.org';
const MQTT_TOPIC = 'bme/kiberfizikai/okosotthon/vezerles';
const ALLOWED_DEVICES = new Set(['lamp_1', 'lamp_2', 'lamp_3', 'lamp_4', 'fan_1']);
const ALLOWED_STATES = new Set(['on', 'off']);

let mainWindow;
let mqttClient;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 720,
    minHeight: 560,
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    mainWindow.loadURL('http://127.0.0.1:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

function connectMqtt() {
  mqttClient = mqtt.connect(MQTT_BROKER_URL, {
    clientId: `kiberinfo_smarthome_${Math.random().toString(16).slice(2)}`,
    reconnectPeriod: 3000,
    connectTimeout: 10000,
  });

  mqttClient.on('connect', () => {
    console.log(`MQTT connected: ${MQTT_BROKER_URL}`);
  });

  mqttClient.on('reconnect', () => {
    console.log('MQTT reconnecting...');
  });

  mqttClient.on('error', (error) => {
    console.error('MQTT error:', error.message);
  });
}

function isValidPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  if (!ALLOWED_DEVICES.has(payload.device) || !ALLOWED_STATES.has(payload.state)) {
    return false;
  }

  if (payload.device.startsWith('lamp_')) {
    return Object.keys(payload).every((key) => ['device', 'state'].includes(key));
  }

  return (
    payload.device === 'fan_1' &&
    typeof payload.speed === 'number' &&
    Number.isInteger(payload.speed) &&
    payload.speed >= 0 &&
    payload.speed <= 100
  );
}

ipcMain.on('mqtt-publish', (_event, payload) => {
  if (!isValidPayload(payload)) {
    console.warn('Rejected invalid MQTT payload:', payload);
    return;
  }

  if (!mqttClient?.connected) {
    console.warn('MQTT client is not connected; payload was not published:', payload);
    return;
  }

  mqttClient.publish(MQTT_TOPIC, JSON.stringify(payload), { qos: 0, retain: false }, (error) => {
    if (error) {
      console.error('MQTT publish failed:', error.message);
      return;
    }

    console.log(`MQTT published to ${MQTT_TOPIC}:`, payload);
  });
});

app.whenReady().then(() => {
  connectMqtt();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  mqttClient?.end(true);
});
