import { NavLink } from "react-router-dom";
import { IconChat, IconCalendar, IconStories, IconProfile } from "./TabIcons";
import styles from "./BottomNav.module.css";

const tabs = [
  { to: "/", label: "Чаты", Icon: IconChat },
  { to: "/events", label: "События", Icon: IconCalendar },
  { to: "/stories", label: "Истории", Icon: IconStories },
  { to: "/profile", label: "Профиль", Icon: IconProfile },
] as const;

export function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="Основное меню">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            isActive ? `${styles.link} ${styles.linkActive}` : styles.link
          }
          end={to === "/"}
        >
          <span className={styles.icon} aria-hidden>
            <Icon className={styles.iconSvg} />
          </span>
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
