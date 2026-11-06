// REQ-002: non-blocking success / error / info messages.
// Errors use role="alert" (announced immediately); others use role="status".

export default function NotificationContainer({ notifications, onDismiss }) {
    return (
        <div className="notification-container" aria-label="Notifications">
            {notifications.map(({ id, type, message }) => (
                <div
                    key={id}
                    role={type === 'error' ? 'alert' : 'status'}
                    className={`notification notification-${type}`}
                >
                    <span className="notification-message">{message}</span>
                    <button
                        type="button"
                        className="notification-dismiss"
                        aria-label="Dismiss notification"
                        onClick={() => onDismiss(id)}
                    >
                        &times;
                    </button>
                </div>
            ))}
        </div>
    );
}
