import { NavLink } from "react-router-dom";
import { IconCalendar } from "./TabIcons";
import styles from "./BottomNav.module.css";

const tabs = [{ to: "/events", label: "События", Icon: IconCalendar }] as const;

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
          end
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
