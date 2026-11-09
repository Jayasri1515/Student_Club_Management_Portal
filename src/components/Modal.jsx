// REQ-002 / CR-006: accessible modal dialog.
// - role="dialog" + aria-modal="true" + aria-labelledby the title (+ optional aria-describedby)
// - focus moves into the dialog on open (an element marked data-autofocus wins,
//   then the first form field, then the first focusable element, then the dialog)
// - Tab / Shift+Tab are trapped inside the dialog, including when focus has
//   escaped to the page behind it
// - ESC closes only the top-most open dialog; a backdrop click calls onClose
//   unless closeOnBackdrop is false
// - focus returns to the element that opened the dialog when it closes
// Render it conditionally: it is "open" for as long as it is mounted.

import { useEffect, useId, useRef } from 'react';

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Open dialogs, oldest first. Only the last one reacts to the keyboard.
const openDialogs = [];

export default function Modal({ title, onClose, children, describedBy, closeOnBackdrop = true }) {
    const titleId = useId();
    const dialogRef = useRef(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    });

    useEffect(() => {
        const opener = document.activeElement;
        const dialog = dialogRef.current;
        const token = {};
        openDialogs.push(token);

        const initial =
            dialog.querySelector('[data-autofocus]') ??
            dialog.querySelector('input, select, textarea') ??
            dialog.querySelector(FOCUSABLE) ??
            dialog;
        initial.focus();

        const handleKeyDown = (event) => {
            if (openDialogs[openDialogs.length - 1] !== token) return;

            if (event.key === 'Escape') {
                event.preventDefault();
                onCloseRef.current?.();
                return;
            }

            if (event.key !== 'Tab') return;
            const items = Array.from(dialog.querySelectorAll(FOCUSABLE));
            if (items.length === 0) {
                event.preventDefault();
                dialog.focus();
                return;
            }
            const first = items[0];
            const last = items[items.length - 1];
            const active = document.activeElement;
            if (!dialog.contains(active)) {
                // Focus escaped (e.g. clicked on the backdrop): pull it back in.
                event.preventDefault();
                (event.shiftKey ? last : first).focus();
            } else if (event.shiftKey && (active === first || active === dialog)) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            const index = openDialogs.indexOf(token);
            if (index !== -1) openDialogs.splice(index, 1);
            if (opener && typeof opener.focus === 'function' && opener.isConnected) {
                opener.focus();
            }
        };
    }, []);

    return (
        <div
            className="popup-backdrop slide-in"
            onMouseDown={(event) => {
                if (closeOnBackdrop && event.target === event.currentTarget) onClose?.();
            }}
        >
            <div
                ref={dialogRef}
                className="popup-content"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={describedBy}
                tabIndex={-1}
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
