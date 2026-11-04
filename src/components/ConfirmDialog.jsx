// REQ-002: replaces window.confirm() (used for deleting a club).

import Modal from './Modal.jsx';

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', onConfirm, onCancel }) {
    return (
        <Modal title={title} onClose={onCancel}>
            <p>{message}</p>
            <div className="button-group">
                <button type="button" className="button list-delete" onClick={onConfirm}>{confirmLabel}</button>
                <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
            </div>
        </Modal>
    );
}
