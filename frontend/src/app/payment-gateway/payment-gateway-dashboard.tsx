'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, CheckCircle2, ChevronDown, Clock3, CreditCard, FileSearch, Info, RefreshCw, Search, Store, Wallet } from 'lucide-react';
import { formatRupiah, parseMerchants, parsePayments, parsePortfolio, paymentStatus, paymentStatusLabel, type PaymentStatus } from './payment-data';
import styles from './payment-gateway.module.css';

interface Resource<T> {
  url: string;
  revision: number;
  data: T | null;
  error: string | null;
}

// Keying the result by both URL and refresh revision prevents the previous
// merchant's payments from flashing while a new request is in progress.
function useResource<T>(url: string | null, revision: number, parse: (data: unknown) => T) {
  const [result, setResult] = useState<Resource<T> | null>(null);

  useEffect(() => {
    if (!url) return;

    const controller = new AbortController();
    let active = true;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 12000);

    async function load() {
      try {
        const response = await fetch(url!, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Data belum tersedia. Silakan coba lagi.');
        const json: unknown = await response.json();
        const data = parse(json);
        if (active) setResult({ url: url!, revision, data, error: null });
      } catch (error: unknown) {
        if (!active) return;
        const message = timedOut
          ? 'Koneksi terlalu lama. Silakan coba lagi.'
          : error instanceof Error && error.message.startsWith('Data ')
            ? error.message
            : 'Data belum tersedia. Silakan coba lagi.';
        setResult({ url: url!, revision, data: null, error: message });
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void load();
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [url, revision, parse]);

  const current = url && result?.url === url && result.revision === revision ? result : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: Boolean(url && !current),
  };
}

export default function PaymentGatewayDashboard() {
  const [revision, setRevision] = useState(0);
  const [selectedMerchantId, setSelectedMerchantId] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const portfolio = useResource('/api/bni/portfolio-health', revision, parsePortfolio);
  const merchants = useResource('/api/bni/merchant-list', revision, parseMerchants);
  const selectedMerchant = merchants.data?.find((merchant) => merchant.id === selectedMerchantId) ?? merchants.data?.[0];
  const payments = useResource(
    selectedMerchant ? `/api/merchant/retention-logs?merchant_id=${encodeURIComponent(selectedMerchant.id)}` : null,
    revision,
    parsePayments,
  );
  const loading = portfolio.loading || merchants.loading || payments.loading;
  const refresh = () => setRevision((value) => value + 1);
  const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');
  const visiblePayments = payments.data?.filter((payment) => {
    const matchesStatus = statusFilter === 'all' || paymentStatus(payment.status) === statusFilter;
    const matchesQuery = `${payment.id} ${payment.memberName} ${payment.status}`.toLocaleLowerCase('id-ID').includes(normalizedQuery);
    return matchesStatus && matchesQuery;
  }) ?? [];
  const paidCount = payments.data?.filter((payment) => paymentStatus(payment.status) === 'paid').length;
  const pendingCount = payments.data?.filter((payment) => paymentStatus(payment.status) === 'pending').length;
  const otherCount = payments.data?.filter((payment) => paymentStatus(payment.status) === 'other').length;
  const listUnavailable = merchants.error || payments.error;

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.identity}>
            <Link href="/login" className={styles.brand}>Lanjut.id</Link>
            <span className={styles.role}><CreditCard size={14} aria-hidden="true" />Payment Gateway</span>
          </div>
          <Link href="/login" className={styles.backLink}><ArrowLeft size={15} aria-hidden="true" />Kembali ke login</Link>
        </header>

        <main className={styles.main}>
          <section className={styles.heading} aria-labelledby="dashboard-title">
            <div>
              <p className={styles.eyebrow}>PAYMENT GATEWAY PROVIDER</p>
              <h1 id="dashboard-title">Setiap pembayaran,<br className={styles.mobileBreak} /> lebih terpantau.</h1>
              <p className={styles.subtitle}>Pantau perputaran BNI Virtual Account dan pembayaran retensi merchant dalam satu tempat.</p>
            </div>
            <button type="button" className={styles.refresh} onClick={refresh} disabled={loading}>
              <RefreshCw size={16} className={loading ? styles.spinning : undefined} aria-hidden="true" />
              {loading ? 'Memuat data…' : 'Perbarui data'}
            </button>
          </section>

          {portfolio.error && (
            <div className={styles.notice} role="alert">
              <Info size={17} aria-hidden="true" />
              <p>Ringkasan portofolio belum dapat dimuat. Data pembayaran yang tersedia tetap dapat dilihat.</p>
              <button type="button" onClick={refresh} disabled={loading}>Coba lagi</button>
            </div>
          )}

          <section className={styles.metrics} aria-label="Ringkasan pembayaran" aria-busy={portfolio.loading}>
            <article className={`${styles.metric} ${styles.featured}`}>
              <div className={styles.metricTop}><span>Perputaran BNI VA</span><Wallet size={20} aria-hidden="true" /></div>
              <p className={styles.metricValue}>{portfolio.loading ? '…' : formatRupiah(portfolio.data?.monthlyTurnover ?? null)}</p>
              <p className={styles.metricHint}>Bulan berjalan · seluruh portofolio</p>
              <ArrowUpRight className={styles.metricDecoration} size={82} aria-hidden="true" />
            </article>
            <article className={styles.metric}>
              <div className={styles.metricTop}><span>Merchant dalam portofolio</span><Store size={20} aria-hidden="true" /></div>
              <p className={styles.metricValue}>{portfolio.loading ? '…' : portfolio.data?.merchantCount?.toLocaleString('id-ID') ?? '—'}</p>
              <p className={styles.metricHint}>Ringkasan merchant terhubung BNI</p>
            </article>
            <article className={styles.metric}>
              <div className={styles.metricTop}><span>Catatan pembayaran retensi</span><CreditCard size={20} aria-hidden="true" /></div>
              <p className={styles.metricValue}>{merchants.loading || payments.loading ? '…' : payments.data?.length.toLocaleString('id-ID') ?? '—'}</p>
              <p className={styles.metricHint}>{selectedMerchant?.name ?? 'Pilih merchant untuk melihat catatan'}</p>
            </article>
          </section>

          <section className={styles.payments} aria-labelledby="payments-title">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>AKTIVITAS MERCHANT</p>
                <h2 id="payments-title">Pembayaran retensi</h2>
                <p className={styles.subtitle}>Status BNI VA dari penawaran retensi merchant yang dipilih.</p>
              </div>
              <div className={styles.merchantField}>
                <label htmlFor="payment-merchant">Merchant</label>
                <div className={styles.selectWrap}>
                  <select
                    id="payment-merchant"
                    value={selectedMerchant?.id ?? ''}
                    onChange={(event) => { setSelectedMerchantId(event.target.value); setQuery(''); setStatusFilter('all'); }}
                    disabled={merchants.loading || !merchants.data?.length}
                  >
                    {!merchants.data?.length && <option value="">{merchants.loading ? 'Memuat merchant…' : 'Merchant belum tersedia'}</option>}
                    {merchants.data?.map((merchant) => <option key={merchant.id} value={merchant.id}>{merchant.name}</option>)}
                  </select>
                  <ChevronDown size={15} aria-hidden="true" />
                </div>
                {selectedMerchant?.category && <span className={styles.category}>{selectedMerchant.category}</span>}
              </div>
            </div>

            <div className={styles.paymentSummary} aria-live="polite">
              <span><CheckCircle2 size={15} aria-hidden="true" />Lunas / selesai <strong>{paidCount ?? '—'}</strong></span>
              <span><Clock3 size={15} aria-hidden="true" />Menunggu pembayaran <strong>{pendingCount ?? '—'}</strong></span>
              <span><Info size={15} aria-hidden="true" />Status lainnya <strong>{otherCount ?? '—'}</strong></span>
            </div>

            <div className={styles.toolbar}>
              <div className={styles.searchField}>
                <Search size={17} aria-hidden="true" />
                <input aria-label="Cari nama member atau ID catatan" type="search" placeholder="Cari nama member atau ID catatan" value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <div className={styles.statusField}>
                <label htmlFor="payment-status">Status</label>
                <select id="payment-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | PaymentStatus)}>
                  <option value="all">Semua status</option>
                  <option value="paid">Lunas / selesai</option>
                  <option value="pending">Menunggu pembayaran</option>
                  <option value="other">Status lainnya</option>
                </select>
              </div>
            </div>

            {merchants.loading || payments.loading ? (
              <div className={styles.emptyState} role="status"><RefreshCw size={25} className={styles.spinning} aria-hidden="true" /><h3>Memuat pembayaran retensi…</h3><p>Mengambil catatan merchant yang dipilih.</p></div>
            ) : listUnavailable ? (
              <div className={styles.emptyState} role="alert"><Info size={28} aria-hidden="true" /><h3>{merchants.error ? 'Daftar merchant belum tersedia' : 'Pembayaran belum dapat dimuat'}</h3><p>{listUnavailable}</p><button type="button" className={styles.retryButton} onClick={refresh} disabled={loading}>Coba lagi</button></div>
            ) : !merchants.data?.length ? (
              <div className={styles.emptyState}><Store size={30} aria-hidden="true" /><h3>Belum ada merchant</h3><p>Daftar merchant akan muncul setelah tersedia dalam portofolio.</p></div>
            ) : !payments.data?.length ? (
              <div className={styles.emptyState}><CreditCard size={30} aria-hidden="true" /><h3>Belum ada pembayaran retensi</h3><p>Merchant ini belum memiliki catatan pembayaran retensi.</p></div>
            ) : !visiblePayments.length ? (
              <div className={styles.emptyState} role="status"><FileSearch size={30} aria-hidden="true" /><h3>Tidak ada hasil yang cocok</h3><p>Coba nama member, ID catatan, atau status yang lain.</p><button type="button" className={styles.retryButton} onClick={() => { setQuery(''); setStatusFilter('all'); }}>Reset filter</button></div>
            ) : (
              <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Tabel pembayaran retensi, geser untuk melihat semua kolom">
                <table className={styles.table}>
                  <thead><tr><th scope="col">Member</th><th scope="col">ID catatan</th><th scope="col">Nominal</th><th scope="col">Status BNI VA</th><th scope="col">Waktu</th></tr></thead>
                  <tbody>{visiblePayments.map((payment) => (
                    <tr key={payment.id}>
                      <td><span className={styles.memberName}>{payment.memberName}</span></td>
                      <td className={styles.recordId}>{payment.id}</td>
                      <td><span className={styles.amount}>{formatRupiah(payment.amount)}</span>{payment.amount === 0 && <span className={styles.noCharge}>Tanpa biaya</span>}</td>
                      <td><span className={`${styles.statusBadge} ${styles[paymentStatus(payment.status)]}`}>{paymentStatusLabel(payment.status)}</span></td>
                      <td>{payment.timestamp}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}

            <div className={styles.tableFooter}>
              <span>{payments.data ? `${visiblePayments.length} dari ${payments.data.length} catatan` : 'Belum ada data untuk ditampilkan'}</span>
              <span>Metode pembayaran: BNI Virtual Account</span>
            </div>
          </section>

          <aside className={styles.scopeNote}><Info size={17} aria-hidden="true" /><p>Halaman ini menampilkan pembayaran dari aktivitas retensi, termasuk penyesuaian tanpa biaya. Perputaran bulanan mencakup seluruh portofolio dan dapat berbeda dari total catatan di atas.</p></aside>
        </main>
        <footer className={styles.footer}><span>Lanjut.id</span><span>Merchant retention & payment intelligence.</span></footer>
      </div>
    </div>
  );
}
