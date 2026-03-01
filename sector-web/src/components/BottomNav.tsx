import { NavLink } from "react-router-dom";
import styles from "./BottomNav.module.css";

const tabs = [
  { to: "/", label: "Чаты", icon: "💬" },
  { to: "/events", label: "События", icon: "📅" },
  { to: "/stories", label: "Истории", icon: "📷" },
  { to: "/profile", label: "Профиль", icon: "👤" },
] as const;

export function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="Основное меню">
      {tabs.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            isActive ? `${styles.link} ${styles.linkActive}` : styles.link
          }
          end={to === "/"}
        >
          <span className={styles.icon} aria-hidden>
            {icon}
          </span>
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
