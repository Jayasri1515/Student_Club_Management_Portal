// REQ-002: replaces window.confirm() (used for deleting a club).
// The message is exposed through aria-describedby, and initial focus goes to the
// non-destructive Cancel button.

import { useId } from 'react';
import Modal from './Modal.jsx';

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', onConfirm, onCancel }) {
    const messageId = useId();
    return (
        <Modal title={title} onClose={onCancel} describedBy={messageId}>
            <p id={messageId}>{message}</p>
            <div className="button-group">
                <button type="button" className="button list-delete" onClick={onConfirm}>{confirmLabel}</button>
                <button type="button" className="button secondary" onClick={onCancel} data-autofocus>Cancel</button>
            </div>
        </Modal>
    );
}
