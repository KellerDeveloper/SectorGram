import { Link } from "react-router-dom";
import styles from "./AppLogo.module.css";

export function AppLogo() {
  return (
    <Link to="/" className={styles.link} aria-label="Sektor — на главную">
      <img src="/logo.png" alt="" className={styles.img} width={809} height={254} />
      <span className={styles.text}>Sektor</span>
    </Link>
  );
}
