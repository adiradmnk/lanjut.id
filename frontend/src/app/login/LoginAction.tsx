'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CreditCard, Store, X } from 'lucide-react';
import { getDashboardPath, type AccountRole } from '@/lib/dashboard-routes';
import { signIn } from '@/lib/login';
import styles from './page.module.css';

export default function LoginAction() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !previewOpen) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [previewOpen]);

  const openDashboard = (role: unknown) => {
    const destination = getDashboardPath(role);
    if (!destination) {
      setMessage('Akun ini belum memiliki akses dashboard. Hubungi pengelola akun.');
      return;
    }
    setPreviewOpen(false);
    router.replace(destination);
  };

  const handleLogin = async () => {
    setLoading(true);
    setMessage('');
    try {
      const account = await signIn();
      if (account) {
        openDashboard(account.role);
      } else if (process.env.NODE_ENV === 'development') {
        setPreviewOpen(true);
      } else {
        setMessage('Login belum tersedia. Silakan coba lagi nanti.');
      }
    } catch {
      setMessage('Login belum berhasil. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const previewDashboard = (role: AccountRole) => {
    // Preview is navigation only: no session, cookie, or saved role is created.
    if (process.env.NODE_ENV === 'development') openDashboard(role);
  };

  return (
    <>
      <button type="button" className={styles.loginButton} onClick={handleLogin} disabled={loading}>
        <span>{loading ? 'Memproses…' : 'Login'}</span>
        <span className={styles.buttonIcon} aria-hidden="true"><ArrowRight size={20} /></span>
      </button>
      <p className={styles.loginMessage} role="status">{message}</p>

      {process.env.NODE_ENV === 'development' && (
        <dialog
          ref={dialogRef}
          className={styles.previewDialog}
          aria-labelledby="preview-title"
          aria-describedby="preview-description"
          onCancel={() => setPreviewOpen(false)}
          onClick={(event) => { if (event.target === event.currentTarget) setPreviewOpen(false); }}
        >
          <div className={styles.previewPanel}>
            <button className={styles.previewClose} type="button" aria-label="Tutup pratinjau" onClick={() => setPreviewOpen(false)}><X size={20} /></button>
            <span className={styles.previewEyebrow}>PRATINJAU LOKAL</span>
            <h2 id="preview-title">Pilih tampilan dashboard</h2>
            <p id="preview-description">Lihat pengalaman masing-masing peran. Pratinjau ini belum melakukan login akun.</p>
            <div className={styles.previewChoices}>
              <button type="button" onClick={() => previewDashboard('merchant')}>
                <Store size={24} aria-hidden="true" />
                <span><strong>Merchant</strong><small>Member, retensi, pendapatan, dan kapasitas.</small></span>
                <ArrowRight size={18} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => previewDashboard('payment_gateway')}>
                <CreditCard size={24} aria-hidden="true" />
                <span><strong>Payment Gateway</strong><small>Merchant terhubung dan pembayaran retensi BNI VA.</small></span>
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}
