import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const NotificationContext = createContext(null);

let notificationId = 0;

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: 'text-emerald-500',
    progress: 'bg-emerald-500',
  },
  error: {
    bg: 'bg-red-500/10 dark:bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'text-red-500',
    progress: 'bg-red-500',
  },
  warning: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: 'text-amber-500',
    progress: 'bg-amber-500',
  },
  info: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'text-blue-500',
    progress: 'bg-blue-500',
  },
};

function Toast({ notification, onDismiss }) {
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef(null);
  const { type = 'info', title, message, duration = 4000 } = notification;

  const colors = COLORS[type] || COLORS.info;
  const Icon = ICONS[type] || Info;

  const dismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(notification.id), 300);
  }, [notification.id, onDismiss]);

  useEffect(() => {
    if (duration > 0) {
      timerRef.current = setTimeout(dismiss, duration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [duration, dismiss]);

  return (
    <div
      className={`
        relative overflow-hidden pointer-events-auto
        w-80 max-w-[calc(100vw-2rem)]
        ${colors.bg} ${colors.border} border
        backdrop-blur-xl rounded-xl shadow-glass-lg
        ${isExiting ? 'toast-exit' : 'toast-enter'}
      `}
    >
      <div className="flex items-start gap-3 p-4">
        <div className={`shrink-0 mt-0.5 ${colors.icon}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
          )}
          {message && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{message}</p>
          )}
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
        >
          <X size={16} />
        </button>
      </div>

      {/* Countdown progress bar */}
      {duration > 0 && (
        <div className="h-[2px] w-full bg-slate-200/20 dark:bg-slate-700/30">
          <div
            className={`h-full ${colors.progress} opacity-60`}
            style={{
              animation: `progress-countdown ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const notify = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = ++notificationId;
    setNotifications(prev => [...prev, { id, type, title, message, duration }]);
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}

      {/* Toast Container — top-right */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        {notifications.map(n => (
          <Toast key={n.id} notification={n} onDismiss={dismiss} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
};
