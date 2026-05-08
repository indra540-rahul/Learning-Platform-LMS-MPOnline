import { useEffect, useState } from "react";
import { api } from "../services/api";

const REFRESH_INTERVAL = 30000;

export const useUnreadNotifications = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      try {
        const data = await api.notifications();
        if (active) {
          setNotifications(data);
        }
      } catch {
        if (active) {
          setNotifications([]);
        }
      }
    };

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, REFRESH_INTERVAL);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return { notifications, unreadCount };
};
