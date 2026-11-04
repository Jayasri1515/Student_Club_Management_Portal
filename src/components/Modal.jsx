// REQ-002: accessible modal dialog.
// - role="dialog" + aria-modal="true" + aria-labelledby the title
// - focus moves into the dialog on open and is trapped with Tab / Shift+Tab
// - ESC (or a backdrop click) calls onClose
// - focus returns to the element that opened the dialog when it closes
// Render it conditionally: it is "open" for as long as it is mounted.

import { useEffect, useId, useRef } from 'react';

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ title, onClose, children }) {
    const titleId = useId();
    const dialogRef = useRef(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    });

    useEffect(() => {
        const opener = document.activeElement;
        const dialog = dialogRef.current;
        const focusables = dialog.querySelectorAll(FOCUSABLE);
        // Prefer the first form field; fall back to the first focusable, then the dialog.
        const initial = dialog.querySelector('input, select, textarea') ?? focusables[0] ?? dialog;
        initial.focus();

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                onCloseRef.current?.();
            }
        };
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            if (opener && typeof opener.focus === 'function' && opener.isConnected) {
                opener.focus();
            }
        };
    }, []);

    const handleTrapFocus = (event) => {
        if (event.key !== 'Tab') return;
        const items = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE));
        if (items.length === 0) {
            event.preventDefault();
            return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    return (
        <div
            className="popup-backdrop slide-in"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose?.();
            }}
        >
            <div
                ref={dialogRef}
                className="popup-content"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                onKeyDown={handleTrapFocus}
            >
                <div className="card card-sm">
                    <div className="header-with-button">
                        <h2 id={titleId} className="card-title">{title}</h2>
                        <button type="button" onClick={onClose} className="modal-close-button" aria-label="Close dialog">
                            &times;
                        </button>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
