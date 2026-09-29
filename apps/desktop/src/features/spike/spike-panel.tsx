/**
 * SPIKE-001 evidence panel (experimental, not a product feature).
 *
 * The component owns UI state only: every SAP interaction goes through the
 * injected `SapPort` (ADR-001 Rules 1/7). It never queries the DOM of the SAP
 * window, injects keys, reads cookies or touches WebView internals itself —
 * that is the adapter's and the native runtime's job.
 *
 * Login is performed manually by the tester in the controlled window; the panel
 * only polls the session state until an authenticated screen appears.
 */

import { useCallback, useRef, useState } from "react";

import type { SapPort, SapScreenState } from "@sap-rfui/ports";
import { StatusBadge } from "@sap-rfui/ui";
import type { StatusTone } from "@sap-rfui/ui";

import type { ExperimentResult, SpikeRunConfig, SpikeRunReport } from "./spike-experiments";
import { EXPERIMENTS, formatReportAsMarkdown, runSpikeExperiments } from "./spike-experiments";
import "./spike-panel.css";

const STATUS_TONE: Record<ExperimentResult["status"], StatusTone> = {
  PASS: "success",
  PARTIAL: "warning",
  FAIL: "danger",
  SKIPPED: "neutral",
};

const DEFAULT_TEST_VALUE = "SPIKE001";
const DEFAULT_LOGIN_GUARD_MS = 300_000;
const DEFAULT_NAVIGATION_GUARD_MS = 15_000;

export interface SpikePanelProps {
  readonly port: SapPort;
}

function summarizeScreen(screen: SapScreenState): string {
  return [
    `title=${screen.title ?? "n/a"}`,
    `origin=${screen.origin ?? "n/a"}`,
    `texts=${screen.texts.length}`,
    `fields=${screen.fields.length}`,
    `controls=${screen.buttons.length}`,
    `frames=${screen.frameCount}/${screen.frames.filter((frame) => frame.accessible).length} accessible`,
    `signature=${screen.signature}`,
  ].join(" · ");
}

export function SpikePanel({ port }: SpikePanelProps) {
  const [sapUrl, setSapUrl] = useState("");
  const [testValue, setTestValue] = useState(DEFAULT_TEST_VALUE);
  const [loginGuardSeconds, setLoginGuardSeconds] = useState(DEFAULT_LOGIN_GUARD_MS / 1000);
  const [navigationGuardMs, setNavigationGuardMs] = useState(DEFAULT_NAVIGATION_GUARD_MS);
  const [includeCertificateCheck, setIncludeCertificateCheck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [results, setResults] = useState<ExperimentResult[]>([]);
  const [report, setReport] = useState<SpikeRunReport | null>(null);
  const logEnd = useRef<HTMLParagraphElement | null>(null);

  const record = useCallback((line: string) => {
    const stamp = new Date().toISOString().slice(11, 23);
    setLog((previous) => [...previous, `${stamp} ${line}`].slice(-400));
    queueMicrotask(() => {
      // jsdom has no scrollIntoView; the follow-up is a convenience, not a behaviour.
      const anchor = logEnd.current;
      if (anchor && typeof anchor.scrollIntoView === "function") {
        anchor.scrollIntoView({ block: "end" });
      }
    });
  }, []);

  const config = useCallback(
    (): SpikeRunConfig => ({
      sapUrl: sapUrl.trim(),
      testValue,
      loginGuardMs: Math.max(10, loginGuardSeconds) * 1000,
      navigationGuardMs: navigationGuardMs,
      includeCertificateCheck,
    }),
    [sapUrl, testValue, loginGuardSeconds, navigationGuardMs, includeCertificateCheck],
  );

  const requireUrl = useCallback((): string | null => {
    const url = sapUrl.trim();
    if (url.length === 0) {
      record("URL не задан — укажите non-production адрес RFUI (EWD/EWT)");
      return null;
    }
    return url;
  }, [sapUrl, record]);

  const withBusy = useCallback(
    async (action: () => Promise<void>) => {
      if (busy) {
        record("эксперименты уже выполняются — дождитесь завершения");
        return;
      }
      setBusy(true);
      try {
        await action();
      } catch (cause) {
        record(`необработанная ошибка адаптера: ${String(cause)}`);
      } finally {
        setBusy(false);
      }
    },
    [busy, record],
  );

  const appendResult = useCallback(
    (result: ExperimentResult) => {
      setResults((previous) => [...previous.filter((item) => item.id !== result.id), result]);
      record(`${result.id} → ${result.status} (${result.durationMs} ms)`);
    },
    [record],
  );

  const openRuntime = () =>
    withBusy(async () => {
      const url = requireUrl();
      if (!url) {
        return;
      }
      const opened = await port.open(url, { persistentSession: true });
      if (!opened.ok) {
        record(`open → ${opened.error.category}: ${opened.error.message}`);
        return;
      }
      record("open → ok · контролируемое WebView-окно создано");
      const info = await port.readRuntimeInfo();
      if (info.ok) {
        record(
          `runtime: origin=${info.value.origin} readyState=${info.value.readyState} rfuiMarkers=${info.value.hasRfuiMarkers} domReadable=${info.value.domReadable}`,
        );
      } else {
        record(`runtime info → ${info.error.category}: ${info.error.message}`);
      }
    });

  const runAll = () =>
    withBusy(async () => {
      const current = config();
      if (current.sapUrl.length === 0) {
        record("URL не задан — укажите non-production адрес RFUI (EWD/EWT)");
        return;
      }
      setResults([]);
      setReport(null);
      record(`запуск EXP-001 … EXP-011 · origin=${safeOrigin(current.sapUrl)}`);
      record(
        "EXP-002 ожидает ручной вход тестировщика в окне SAP (пароль не автоматизируется и не читается)",
      );
      const produced = await runSpikeExperiments(port, current, { onResult: appendResult });
      setReport(produced);
      record(`итог прогона: ${produced.overall}`);
    });

  const runOne = (id: string) =>
    withBusy(async () => {
      const current = config();
      if (current.sapUrl.length === 0 && id !== "EXP-011") {
        record("URL не задан — укажите non-production адрес RFUI (EWD/EWT)");
        return;
      }
      record(`запуск ${id}`);
      const produced = await runSpikeExperiments(port, current, {
        only: [id],
        onResult: appendResult,
      });
      setReport((previous) => mergeRun(previous, produced));
    });

  const readSnapshot = () =>
    withBusy(async () => {
      const screen = await port.readScreenState();
      record(
        screen.ok
          ? `screen · ${summarizeScreen(screen.value)}`
          : `screen → ${screen.error.category}`,
      );
      if (screen.ok) {
        screen.value.texts
          .slice(0, 5)
          .forEach((text, index) => record(`text[${index}] ${text.slice(0, 120)}`));
      }
    });

  const takeScreenshot = () =>
    withBusy(async () => {
      const shot = await port.captureScreenshot(`spike-${Date.now()}`);
      record(
        shot.ok
          ? `screenshot → ${shot.value.width}x${shot.value.height} PNG (локальный каталог доказательств, вне репозитория)`
          : `screenshot → ${shot.error.category}: ${shot.error.message}`,
      );
    });

  const closeRuntime = () =>
    withBusy(async () => {
      const closed = await port.close();
      record(
        closed.ok
          ? `close → ${closed.value ? "окно закрыто" : "окно не было открыто"}`
          : `close → ${closed.error.category}`,
      );
    });

  return (
    <div className="grid spike">
      <article className="panel">
        <h3 className="panel__title">Параметры прогона</h3>
        <label className="spike__field">
          <span>URL SAP RFUI (только non-production: EWD / EWT)</span>
          <input
            className="spike__input"
            type="text"
            value={sapUrl}
            placeholder="https://&lt;host&gt;:44300/sap/bc/bsp/sap/&lt;rfui_app&gt;/start.htm"
            onChange={(event) => setSapUrl(event.target.value)}
          />
        </label>
        <label className="spike__field">
          <span>Тестовое значение сканера</span>
          <input
            className="spike__input"
            type="text"
            value={testValue}
            onChange={(event) => setTestValue(event.target.value)}
          />
        </label>
        <div className="spike__row">
          <label className="spike__field">
            <span>Ожидание ручного входа, c</span>
            <input
              className="spike__input"
              type="number"
              min={10}
              value={loginGuardSeconds}
              onChange={(event) => setLoginGuardSeconds(Number(event.target.value))}
            />
          </label>
          <label className="spike__field">
            <span>Гард навигации, мс</span>
            <input
              className="spike__input"
              type="number"
              min={2000}
              value={navigationGuardMs}
              onChange={(event) => setNavigationGuardMs(Number(event.target.value))}
            />
          </label>
        </div>
        <label className="spike__check">
          <input
            type="checkbox"
            checked={includeCertificateCheck}
            onChange={(event) => setIncludeCertificateCheck(event.target.checked)}
          />
          <span>Проверить недействительный сертификат (EXP-011, нужен доступ в интернет)</span>
        </label>

        <div className="spike__actions">
          <button
            type="button"
            className="ui-button"
            disabled={busy}
            onClick={() => void openRuntime()}
          >
            Открыть SAP RFUI
          </button>
          <button type="button" className="ui-button" disabled={busy} onClick={() => void runAll()}>
            Запустить EXP-001 … EXP-011
          </button>
          <button
            type="button"
            className="ui-button"
            disabled={busy}
            onClick={() => void readSnapshot()}
          >
            Читать состояние экрана
          </button>
          <button
            type="button"
            className="ui-button"
            disabled={busy}
            onClick={() => void takeScreenshot()}
          >
            Скриншат области SAP
          </button>
          <button
            type="button"
            className="ui-button"
            disabled={busy}
            onClick={() => void closeRuntime()}
          >
            Закрыть окно SAP
          </button>
        </div>
        <p className="panel__footnote">
          Вход выполняется вручную в открывшемся окне. Адаптер не читает поля пароля, значения
          cookies и токены — они не попадают ни в доказательства, ни в журнал.
        </p>
      </article>

      <article className="panel">
        <h3 className="panel__title">Отдельные эксперименты</h3>
        <ul className="pending-list spike__experiments">
          {EXPERIMENTS.map((experiment) => {
            const result = results.find((item) => item.id === experiment.id);
            return (
              <li key={experiment.id} className="spike__experiment">
                <button
                  type="button"
                  className="spike__run"
                  disabled={busy}
                  onClick={() => void runOne(experiment.id)}
                >
                  {experiment.id}
                </button>
                <span className="spike__experiment-title">{experiment.title}</span>
                {result ? (
                  <StatusBadge label={result.status} tone={STATUS_TONE[result.status]} mono />
                ) : (
                  <StatusBadge label="—" tone="neutral" mono />
                )}
              </li>
            );
          })}
        </ul>
        {report ? (
          <p className="kv">
            Итог прогона: <strong>{report.overall}</strong> · SAP origin {report.sapOrigin}
          </p>
        ) : null}
      </article>

      <article className="panel spike__evidence">
        <h3 className="panel__title">Доказательства (журнал)</h3>
        <div className="spike__log" role="log" aria-live="polite">
          {log.length === 0 ? (
            <p className="panel__footnote">Журнал пуст — запустите эксперименты.</p>
          ) : null}
          {log.map((line, index) => (
            <p key={`${index}-${line.slice(0, 24)}`} className="spike__log-line">
              {line}
            </p>
          ))}
          <p ref={logEnd} />
        </div>
      </article>

      {results.length > 0 ? (
        <article className="panel">
          <h3 className="panel__title">Результаты по экспериментам</h3>
          <ol className="spike__results">
            {results.map((result) => (
              <li key={result.id}>
                <p>
                  <StatusBadge label={result.status} tone={STATUS_TONE[result.status]} mono />{" "}
                  <strong>{result.id}</strong> — {result.title}
                </p>
                <ul className="pending-list">
                  {result.evidence.slice(0, 12).map((line, index) => (
                    <li key={`${result.id}-${index}`}>{line}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </article>
      ) : null}

      {report ? (
        <article className="panel">
          <h3 className="panel__title">Markdown-доказательства (для SPIKE-001-results.md)</h3>
          <textarea
            className="spike__markdown"
            readOnly
            rows={16}
            value={formatReportAsMarkdown(report)}
          />
          <p className="panel__footnote">
            Скопируйте блок в <code>docs/spikes/SPIKE-001-results.md</code>; перед коммитом
            убедитесь, что в тексте нет учётных данных и продуктивных данных.
          </p>
        </article>
      ) : null}
    </div>
  );
}

function safeOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "invalid-url";
  }
}

/** Keeps evidence from earlier single-experiment runs inside the visible report. */
function mergeRun(previous: SpikeRunReport | null, produced: SpikeRunReport): SpikeRunReport {
  if (!previous) {
    return produced;
  }
  const merged = [...previous.results];
  for (const result of produced.results) {
    const index = merged.findIndex((item) => item.id === result.id);
    if (index === -1) {
      merged.push(result);
    } else {
      merged[index] = result;
    }
  }
  merged.sort((a, b) => a.id.localeCompare(b.id));
  return { ...produced, results: merged };
}
