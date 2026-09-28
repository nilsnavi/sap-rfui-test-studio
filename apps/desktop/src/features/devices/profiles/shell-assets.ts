import rt40Photo from "../assets/urovo-rt40-shell.png";
import u2Photo from "../assets/urovo-u2-shell.png";
import wt6000Photo from "../assets/zebra-wt6000-shell.png";

/**
 * Visual shell assets (PROMPT-002 §15). The three terminal photos are the
 * legacy shell pictures extracted verbatim from
 * `reference/sap_rfui_emulator.html` (base64 payloads of the `rt40Photo`,
 * `u2Photo` and `wt6000Photo` <img> elements). Keys are `visualProfileId`
 * values from the Domain registry — components never branch on device ids.
 */
export const SHELL_PHOTOS: Readonly<Record<string, string>> = {
  "rt40-photo": rt40Photo,
  "u2-photo": u2Photo,
  "wt6000-photo": wt6000Photo,
};

export function shellPhotoFor(visualProfileId: string | undefined): string | null {
  if (visualProfileId === undefined) {
    return null;
  }
  return SHELL_PHOTOS[visualProfileId] ?? null;
}
