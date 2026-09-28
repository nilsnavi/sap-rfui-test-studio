/**
 * Device profile domain model (PROMPT-002 §5, SPEC-001 §3, ADR-001 Rule 10).
 *
 * Pure TypeScript: no React, no DOM, no validation libraries. A `DeviceProfile`
 * describes *what the device is* (resolution, orientation, capabilities);
 * `DeviceGeometry` below describes *how the shell is drawn* — the two concepts
 * are intentionally separate and never merged.
 */

export type DeviceOrientation = "portrait" | "landscape";

export interface DeviceCapabilities {
  readonly scanner: boolean;
  readonly keyboard: boolean;
  readonly functionKeys: boolean;
}

export interface DeviceScreenSize {
  readonly width: number;
  readonly height: number;
  readonly orientation: DeviceOrientation;
}

export interface DeviceProfile {
  readonly id: string;
  readonly manufacturer?: string;
  readonly model: string;
  readonly displayName: string;
  readonly screen: DeviceScreenSize;
  readonly capabilities: DeviceCapabilities;
  /** Presentation asset key resolved by the desktop shell; never a file path. */
  readonly visualProfileId?: string;
  /**
   * Reserved for the SAP connection sprint (M2). The device feature must not
   * populate or consume SAP data before SPIKE-001 (PROMPT-002 §4 scope boundary).
   */
  readonly recommendedSapService?: string;
}

/**
 * Physical shell geometry in device-independent pixels (PROMPT-002 §6).
 *
 * Values are migrated from `reference/sap_rfui_emulator.html`
 * (`applyScreenSize()` branches); the screen rectangle is expressed relative to
 * the shell origin, so `screenX + screenWidth <= shellWidth` and
 * `screenY + screenHeight <= shellHeight` must always hold.
 */
export interface DeviceGeometry {
  readonly shellWidth: number;
  readonly shellHeight: number;
  readonly screenX: number;
  readonly screenY: number;
  /** Visual (physical) screen area width — the logical resolution is scaled into it. */
  readonly screenWidth: number;
  /** Visual (physical) screen area height — the logical resolution is scaled into it. */
  readonly screenHeight: number;
  readonly cornerRadius?: number;
  /** Shell is rendered from a photo asset covering the full shell rect. */
  readonly shellKind: "photo" | "neutral";
  /** Inner black frame padding around the logical screen (neutral shell only, legacy: 12px). */
  readonly bezelPadding?: number;
  /** Top offset of the physical keypad block (neutral shell only, legacy: screenH + 104). */
  readonly keypadTop?: number;
}
