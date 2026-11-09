// REQ-002: state for in-app notifications that replace window.alert().

import { useCallback, useEffect, useRef, useState } from 'react';

export const DEFAULT_DURATIONS = Object.freeze({ success: 5000, info: 5000, error: 8000 });

export function useNotifications(durations = DEFAULT_DURATIONS) {
    const [notifications, setNotifications] = useState([]);
    const nextId = useRef(1);
    const timers = useRef(new Map());

    const dismiss = useCallback((id) => {
        const timer = timers.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timers.current.delete(id);
        }
        setNotifications((current) => current.filter((n) => n.id !== id));
    }, []);

    const notify = useCallback(
        (type, message) => {
            const id = nextId.current++;
            setNotifications((current) => [...current, { id, type, message }]);
            const duration = durations[type] ?? DEFAULT_DURATIONS.info;
            if (duration > 0) {
                timers.current.set(id, setTimeout(() => dismiss(id), duration));
            }
            return id;
        },
        [dismiss, durations],
    );

    useEffect(() => {
        const activeTimers = timers.current;
        return () => {
            activeTimers.forEach((timer) => clearTimeout(timer));
            activeTimers.clear();
        };
    }, []);

    return {
        notifications,
        notify,
        dismiss,
        success: useCallback((message) => notify('success', message), [notify]),
        error: useCallback((message) => notify('error', message), [notify]),
        info: useCallback((message) => notify('info', message), [notify]),
    };
}
