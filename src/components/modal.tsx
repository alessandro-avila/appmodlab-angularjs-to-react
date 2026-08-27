/**
 * MODAL — the React replacement for Bootstrap 3's jQuery modal
 * (ADR-007 category 2).
 *
 * The legacy call is `$('#bookingConfirmationModal').modal('show')`
 * (`hotel-booking.controller.js:241`). That is jQuery AND `bootstrap.js`, not
 * `ui.bootstrap` — finding D-8 records that `ui.bootstrap` is declared and never
 * used, which has misled readers into thinking these modals are Angular-managed.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * `bootstrap.min.js` CANNOT BE REMOVED YET.
 * ─────────────────────────────────────────────────────────────────────────
 * Three modules call `.modal()`, and only one of them is migrating here:
 *
 *   app/components/hotel-booking/hotel-booking.controller.js:241   <- Increment 2
 *   app/components/travel-request/travel-request.controller.js:246 <- Increment 4
 *   app/components/expense-reconciliation/expense.controller.js:223 <- Increment 5
 *
 * `app/index.html:62` must therefore keep loading `bootstrap.min.js` until the
 * last of those migrates. Finding D-6 says the same thing from the other side:
 * Bootstrap 3's JavaScript components require jQuery, so the two cannot be
 * removed independently.
 *
 * Rendered inline rather than through a portal, because the markup this replaces
 * was inline and the baseline reads it with ordinary selectors.
 */
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';

export interface ModalProps {
  readonly id: string;
  readonly open: boolean;
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly closeLabel?: string;
}

export function Modal({
  id,
  open,
  title,
  onClose,
  children,
  closeLabel = 'Close',
}: ModalProps): ReactElement | null {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Escape closes it, as Bootstrap's modal does.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Bootstrap adds `modal-open` to <body> to suppress background scrolling.
  useEffect(() => {
    if (!open) return undefined;
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, [open]);

  useEffect(() => {
    if (open) dialogRef.current?.focus?.();
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="modal fade in"
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        data-testid={id}
        style={{ display: 'block' }}
      >
        <div className="modal-dialog" role="document">
          <div className="modal-content" ref={dialogRef} tabIndex={-1}>
            <div className="modal-header">
              <button type="button" className="close" aria-label="Dismiss" onClick={onClose}>
                <span aria-hidden="true">&times;</span>
              </button>
              <h4 className="modal-title" id={`${id}-title`}>
                {title}
              </h4>
            </div>
            <div className="modal-body">{children}</div>
            <div className="modal-footer">
              <button type="button" className="btn btn-default" onClick={onClose}>
                {closeLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Bootstrap renders the backdrop as a sibling element. */}
      <div className="modal-backdrop fade in" onClick={onClose} />
    </>
  );
}
