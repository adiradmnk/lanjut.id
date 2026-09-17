import type { Metadata } from 'next';
import LoginMotion from './LoginMotion';
import LoginAction from './LoginAction';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Login — Lanjut.id',
  description: 'Masuk ke ekosistem Lanjut.id untuk merchant retention dan BNI intelligence.',
};

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.background} aria-hidden="true">
        <LoginMotion />
        <div className={styles.fade} />
      </div>

      <header className={styles.header}>
        <span className={styles.brand}>Lanjut.id</span>
      </header>

      <main className={styles.content}>
        <h1 className={styles.headline}>
          Turning subscription churn into{' '}
          <span>merchant retention &amp; BNI intelligence.</span>
        </h1>

        <LoginAction />
      </main>
    </div>
  );
}
