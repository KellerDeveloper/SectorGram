import { Link } from "react-router-dom";
import styles from "./AppLogo.module.css";

export function AppLogo() {
  return (
    <Link to="/" className={styles.link} aria-label="Sector — на главную">
      <img src="/logo.png" alt="Sector" className={styles.img} />
    </Link>
  );
}
