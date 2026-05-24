import React from 'react';
import ReactDOM from 'react-dom/client';
import { Lightbulb, Fan, Power, Gauge } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import './styles.css';

const lamps = [
  { id: 'lamp_1', name: 'Lámpa 1' },
  { id: 'lamp_2', name: 'Lámpa 2' },
  { id: 'lamp_3', name: 'Lámpa 3' },
  { id: 'lamp_4', name: 'Lámpa 4' },
];

function publishPayload(payload) {
  window.electron?.ipcRenderer?.send('mqtt-publish', payload);
}

function App() {
  const [lampStates, setLampStates] = React.useState(
    Object.fromEntries(lamps.map((lamp) => [lamp.id, false])),
  );
  const [fanEnabled, setFanEnabled] = React.useState(false);
  const [fanSpeed, setFanSpeed] = React.useState(75);

  function handleLampToggle(device, checked) {
    setLampStates((current) => ({
      ...current,
      [device]: checked,
    }));

    publishPayload({
      device,
      state: checked ? 'on' : 'off',
    });
  }

  function handleFanToggle(checked) {
    setFanEnabled(checked);

    publishPayload({
      device: 'fan_1',
      state: checked ? 'on' : 'off',
      speed: fanSpeed,
    });
  }

  function handleFanSpeedChange([speed]) {
    setFanSpeed(speed);

    if (fanEnabled) {
      publishPayload({
        device: 'fan_1',
        state: 'on',
        speed,
      });
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-2 border-b border-border pb-6">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            BME Kiberfizikai Rendszerek
          </p>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Okosotthon vezérlőpult
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Lámpák és ventilátor vezérlése Electron IPC-n keresztül, MQTT publikálással.
              </p>
            </div>
            <div className="rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              Topic:{' '}
              <span className="font-mono text-foreground">
                bme/kiberfizikai/okosotthon/vezerles
              </span>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {lamps.map((lamp) => {
            const enabled = lampStates[lamp.id];

            return (
              <Card key={lamp.id} className="transition-colors">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={[
                        'flex h-11 w-11 items-center justify-center rounded-md border',
                        enabled
                          ? 'border-amber-300 bg-amber-100 text-amber-700'
                          : 'border-border bg-muted text-muted-foreground',
                      ].join(' ')}
                    >
                      <Lightbulb className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <CardTitle>{lamp.name}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {enabled ? 'Bekapcsolva' : 'Kikapcsolva'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={enabled}
                    aria-label={`${lamp.name} kapcsoló`}
                    onCheckedChange={(checked) => handleLampToggle(lamp.id, checked)}
                  />
                </CardHeader>
              </Card>
            );
          })}
        </section>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div
                className={[
                  'flex h-14 w-14 items-center justify-center rounded-md border',
                  fanEnabled
                    ? 'border-sky-300 bg-sky-100 text-sky-700'
                    : 'border-border bg-muted text-muted-foreground',
                ].join(' ')}
              >
                <Fan
                  className={['h-7 w-7', fanEnabled ? 'animate-spin-slow' : ''].join(' ')}
                  aria-hidden="true"
                />
              </div>
              <div>
                <CardTitle className="text-xl">Ventilátor</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {fanEnabled
                    ? `Bekapcsolva, ${fanSpeed}% fordulatszám`
                    : 'Kikapcsolva, a sebességállítás inaktív'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
              <Power className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium">{fanEnabled ? 'Be' : 'Ki'}</span>
              <Switch
                checked={fanEnabled}
                aria-label="Ventilátor kapcsoló"
                onCheckedChange={handleFanToggle}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 rounded-md bg-muted/60 p-4 md:grid-cols-[auto_1fr_auto] md:items-center">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Gauge className="h-4 w-4" aria-hidden="true" />
                Sebesség
              </div>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[fanSpeed]}
                disabled={!fanEnabled}
                aria-label="Ventilátor sebesség"
                onValueChange={handleFanSpeedChange}
              />
              <output className="text-right font-mono text-lg font-semibold tabular-nums">
                {fanSpeed}%
              </output>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
