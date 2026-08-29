import type { FC } from "react";
import type { ReceivedNotification } from "../utility/notification";

interface NotificationToastProps {
  notification: ReceivedNotification | null;
  onClose: () => void;
}

export const NotificationToast: FC<NotificationToastProps> = ({ notification, onClose }) => {
  if (!notification) return null;

  return (
    <div className="toast-container" role="alert" aria-live="assertive">
      <div className="toast-card">
        <div className="toast-icon-wrapper">
          <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="toast-pulse" />
        </div>
        <div className="toast-content">
          <div className="toast-header">
            <span className="toast-badge">{notification.type.toUpperCase()}</span>
            <span className="toast-time">{notification.receivedAt}</span>
          </div>
          <h4 className="toast-title">{notification.title}</h4>
          <p className="toast-body">{notification.body}</p>
        </div>
        <button
          className="toast-close"
          onClick={onClose}
          aria-label="Close notification"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
