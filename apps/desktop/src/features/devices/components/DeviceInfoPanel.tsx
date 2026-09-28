import type { DeviceSelection } from "@sap-rfui/application";

/**
 * Device info (PROMPT-002 §9): model, screen resolution, orientation,
 * scanner and keyboard capabilities of the effective profile.
 */
export function DeviceInfoPanel({ selection }: { readonly selection: DeviceSelection }) {
  const { profile } = selection;
  const yesNo = (value: boolean) => (value ? "есть" : "нет");

  return (
    <section className="devices-group" data-testid="device-info">
      <h4 className="devices-group__title">Основные параметры</h4>
      <dl className="kv">
        <div>
          <dt>Модель</dt>
          <dd>
            {profile.manufacturer ? `${profile.manufacturer} ${profile.model}` : profile.model}
          </dd>
        </div>
        <div>
          <dt>Разрешение экрана</dt>
          <dd data-testid="device-resolution">
            {profile.screen.width} × {profile.screen.height}
          </dd>
        </div>
        <div>
          <dt>Ориентация</dt>
          <dd data-testid="device-orientation">
            {profile.screen.orientation === "portrait" ? "вертикальная" : "горизонтальная"}
          </dd>
        </div>
        <div>
          <dt>Сканер</dt>
          <dd>{yesNo(profile.capabilities.scanner)}</dd>
        </div>
        <div>
          <dt>Клавиатура</dt>
          <dd>{yesNo(profile.capabilities.keyboard)}</dd>
        </div>
      </dl>
    </section>
  );
}
