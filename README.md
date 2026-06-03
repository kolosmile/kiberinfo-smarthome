# Okosotthon vezérlőpult

Electron + Vite + React alapú dashboard 4 lámpa és 1 ventilátor vezérléséhez.

## Futtatás

```bash
npm install
npm run dev
```

Production renderer build:

```bash
npm run build
```

Windows `.exe` készítése:

```bash
npm run dist
```

A parancs két Windows `.exe` fájlt készít:

```text
release/Okosotthon-Vezerlopult-Setup-1.0.0.exe
release/Okosotthon-Vezerlopult-1.0.0.exe
```

A `Setup` verzió telepítő. Ezt érdemes használni bemutatóhoz, mert a telepített alkalmazás gyorsabban indul.

A `portable` verzió telepítés nélkül fut, de lassabban indulhat, mert minden indításkor ideiglenesen kicsomagolja az Electron alkalmazást.

Fejlesztői gyors teszthez a csomagolás után közvetlenül futtatható ez is:

```text
release/win-unpacked/Okosotthon Vezerlopult.exe
```

## MQTT

- Bróker: `mqtt://test.mosquitto.org`
- Topic: `bme/kiberfizikai/okosotthon/vezerles`
- IPC csatorna: `mqtt-publish`
- Port: `1883`
- QoS: `0`
- Retain: `false`
- Hitelesítés: nincs

Lámpa payload:

```json
{"device":"lamp_1","state":"on"}
```

Ventilátor payload:

```json
{"device":"fan_1","state":"on","speed":75}
```

Az MQTT kliens az Electron Main processben fut, a React renderer pedig a preload scriptben publikált `window.electron.ipcRenderer.send('mqtt-publish', payload)` API-n keresztül küldi az eseményeket.

## MaxWhere bekötés

A MaxWhere szimulációt MQTT subscriber oldalként kell bekötni. A vezérlőpult csak publikál, a MaxWhere oldalnak fel kell iratkoznia ugyanarra a topicra, majd a beérkező JSON alapján kell módosítania a szimuláció objektumait.

### Kapcsolati beállítások

Ezeket az értékeket kell használni a MaxWhere oldali MQTT kliensben:

```text
Protocol: MQTT
Broker host: test.mosquitto.org
Broker URL: mqtt://test.mosquitto.org
Port: 1883
Username: üres
Password: üres
Subscribe topic: bme/kiberfizikai/okosotthon/vezerles
Payload encoding: UTF-8 JSON
```

Ha a MaxWhere vagy a teszteléshez használt kliens böngészős/WebSocket alapú MQTT klienst használ, akkor nem a `1883` portot kell megadni. A `1883` csak natív TCP MQTT kapcsolathoz való.

WebSocket klienshez ezt használd:

```text
Protocol: wss://
Broker host: test.mosquitto.org
Port: 8081
Path: /mqtt
SSL/TLS: on
Username: üres
Password: üres
Subscribe topic: bme/kiberfizikai/okosotthon/vezerles
```

Ha a kliens nem HTTPS oldalról fut és engedi a titkosítatlan WebSocketet, ez is működhet:

```text
Protocol: ws://
Broker host: test.mosquitto.org
Port: 8080
Path: /mqtt
SSL/TLS: off
Username: üres
Password: üres
Subscribe topic: bme/kiberfizikai/okosotthon/vezerles
```

Fontos különbség:

| Kliens típusa | Host | Port | SSL/TLS | Path |
| --- | --- | --- | --- | --- |
| Natív MQTT TCP | `test.mosquitto.org` | `1883` | off | nincs |
| MQTT WebSocket | `test.mosquitto.org` | `8080` | off | `/mqtt` |
| MQTT WebSocket TLS | `test.mosquitto.org` | `8081` | on | `/mqtt` |

### Eszközazonosítók

| Eszköz | `device` érték | Várt mezők |
| --- | --- | --- |
| Lámpa 1 | `lamp_1` | `device`, `state` |
| Lámpa 2 | `lamp_2` | `device`, `state` |
| Lámpa 3 | `lamp_3` | `device`, `state` |
| Lámpa 4 | `lamp_4` | `device`, `state` |
| Ventilátor | `fan_1` | `device`, `state`, `speed` |

`state` értékei:

```text
on
off
```

`speed` értéke csak a ventilátornál van jelen, 0 és 100 közötti egész szám.

### MaxWhere oldali működés

1. A MaxWhere szimuláció indulásakor csatlakozzon a `mqtt://test.mosquitto.org` brokerhez.
2. Sikeres kapcsolódás után iratkozzon fel erre a topicra: `bme/kiberfizikai/okosotthon/vezerles`.
3. Minden beérkező üzenetet UTF-8 szövegként kell olvasni.
4. A szöveget JSON-ként kell parse-olni.
5. A `device` mező alapján ki kell választani a MaxWhere jelenet megfelelő objektumát.
6. A `state` mező alapján be vagy ki kell kapcsolni az adott objektumot.
7. `fan_1` esetén a `speed` mezőt is fel kell használni a ventilátor animációs sebességéhez.

### Minta logika

Az alábbi kód nem a konkrét MaxWhere API-t hívja, hanem azt mutatja, hova kell bekötni a MaxWhere-es objektumvezérlést:

```js
import mqtt from 'mqtt';

const MQTT_BROKER_URL = 'mqtt://test.mosquitto.org';
const MQTT_TOPIC = 'bme/kiberfizikai/okosotthon/vezerles';

const client = mqtt.connect(MQTT_BROKER_URL);

client.on('connect', () => {
  client.subscribe(MQTT_TOPIC);
});

client.on('message', (_topic, payloadBuffer) => {
  const payloadText = payloadBuffer.toString('utf8');
  const message = JSON.parse(payloadText);

  switch (message.device) {
    case 'lamp_1':
    case 'lamp_2':
    case 'lamp_3':
    case 'lamp_4':
      setMaxWhereLamp(message.device, message.state === 'on');
      break;

    case 'fan_1':
      setMaxWhereFan({
        enabled: message.state === 'on',
        speed: message.speed,
      });
      break;
  }
});
```

A MaxWhere-t készítő oldalon a fenti két függvényt kell a saját objektumokra illeszteni:

```js
function setMaxWhereLamp(device, enabled) {
  // device alapján objektum kiválasztása:
  // lamp_1 -> MaxWhere Lámpa 1
  // lamp_2 -> MaxWhere Lámpa 2
  // lamp_3 -> MaxWhere Lámpa 3
  // lamp_4 -> MaxWhere Lámpa 4
  //
  // enabled === true: fény bekapcsolása / emissive anyag / látható fényforrás
  // enabled === false: fény kikapcsolása
}

function setMaxWhereFan({ enabled, speed }) {
  // enabled === true: ventilátor animáció indítása
  // enabled === false: ventilátor animáció leállítása
  // speed: 0..100, ezt kell az animáció sebességére skálázni
}
```

### Ajánlott objektumnév megfeleltetés MaxWhere-ben

| MQTT `device` | MaxWhere objektum neve |
| --- | --- |
| `lamp_1` | `Lamp_1` |
| `lamp_2` | `Lamp_2` |
| `lamp_3` | `Lamp_3` |
| `lamp_4` | `Lamp_4` |
| `fan_1` | `Fan_1` |

Ha más objektumneveket használtok a MaxWhere jelenetben, akkor csak a fenti megfeleltetési táblát kell átírni a szimulációs kódban.

### Gyors tesztelés MaxWhere nélkül

MQTT Explorerrel vagy bármely MQTT klienssel fel lehet iratkozni erre:

```text
bme/kiberfizikai/okosotthon/vezerles
```

Ha a vezérlőpulton kapcsolsz egy lámpát, ilyen üzenetnek kell megjelennie:

```json
{"device":"lamp_1","state":"on"}
```

Ha a ventilátort állítod:

```json
{"device":"fan_1","state":"on","speed":75}
```

Fontos: a `test.mosquitto.org` nyilvános broker. Bemutatóhoz jó, de éles vagy több csapatos használatnál érdemes egy egyedi topicot választani, hogy mások üzenetei ne zavarjanak be.
