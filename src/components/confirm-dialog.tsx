/**
 * CONFIRM DIALOG — the React replacement for `window.confirm()`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * IT MUST STAY BLOCKING
 * ─────────────────────────────────────────────────────────────────────────
 * The legacy reads:
 *
 *     if (!confirm('Are you sure you want to cancel this travel request?')) return;
 *
 * The destructive action happens ONLY on an explicit yes. A naive React port
 * that opens a dialog and carries on would cancel the request before the user
 * answered, which is a behaviour change nobody asked for and a bad one.
 *
 * `useConfirm()` therefore hands back a promise, so the call site keeps the
 * shape — and the meaning — of the original:
 *
 *     if (!(await confirm('Are you sure ...'))) return;
 *
 * Nothing after that line runs until the user has chosen.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHERE THIS IS AND IS NOT USED
 * ─────────────────────────────────────────────────────────────────────────
 * Used by travel-request (Increment 4). Expense will need it in Increment 5
 * (`expense.controller.js:233`), which is why it lives in `src/components/`
 * rather than inside the feature.
 *
 * The itinerary deliberately still calls `globalThis.confirm` (Itinerary.tsx).
 * Its scenarios observe the NATIVE dialog through Playwright's dialog handler,
 * so swapping it would break them, and nothing authorises that change. The
 * inconsistency is real and recorded rather than silently resolved.
 */
import { useCallback, useRef, useState, type ReactElement } from 'react';

interface PendingConfirm {
  readonly message: string;
  readonly resolve: (answer: boolean) => void;
}

export interface UseConfirmResult {
  /** Resolves true only if the user explicitly confirms. */
  readonly confirm: (message: string) => Promise<boolean>;
  /** Render this somewhere in the tree. */
  readonly dialog: ReactElement | null;
}

export function useConfirm(): UseConfirmResult {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const pendingRef = useRef<PendingConfirm | null>(null);

  const settle = useCallback((answer: boolean): void => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    current?.resolve(answer);
  }, []);

  const confirm = useCallback((message: string): Promise<boolean> => {
    // A second request while one is open answers the first with "no" rather
    // than stranding its promise for ever.
    pendingRef.current?.resolve(false);
    return new Promise<boolean>((resolve) => {
      const next = { message, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const dialog =
    pending === null ? null : (
      <ConfirmDialog
        message={pending.message}
        onConfirm={() => {
          settle(true);
        }}
        onCancel={() => {
          settle(false);
        }}
      />
    );

  return { confirm, dialog };
}

export interface ConfirmDialogProps {
  readonly message: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
}

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
}: ConfirmDialogProps): ReactElement {
  return (
    <>
      <div
        className="modal fade in"
        role="dialog"
        aria-modal="true"
        data-testid="confirm-dialog"
        style={{ display: 'block' }}
      >
        <div className="modal-dialog modal-sm" role="document">
          <div className="modal-content">
            <div className="modal-body">
              {/* The message is the assertion target: the baseline asks
                  "I am asked '<message>'". Kept verbatim from the legacy. */}
              <p data-testid="confirm-message">{message}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-default" onClick={onCancel}>
                {cancelLabel}
              </button>
              <button type="button" className="btn btn-primary" onClick={onConfirm}>
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Clicking the backdrop declines, matching a dismissed window.confirm. */}
      <div className="modal-backdrop fade in" onClick={onCancel} />
    </>
  );
}
