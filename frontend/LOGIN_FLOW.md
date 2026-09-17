# Login dan dashboard

- `/` mengarah langsung ke `/login`.
- Role `merchant` mengarah ke `/merchant`, memakai dashboard merchant lama.
- Role `payment_gateway` mengarah ke `/payment-gateway`.
- `/bni` menjadi alias yang mengarah ke `/payment-gateway`.
- `/member` tetap digunakan untuk tautan member dari dashboard merchant.

## Integrasi Google Auth berikutnya

Implementasikan `signIn()` di `src/lib/login.ts` menggunakan integrasi Google Auth pilihanmu. Fungsi mengembalikan `{ role }` dari akun/session yang telah diverifikasi. `LoginAction.tsx` memanggil fungsi tersebut, kemudian menggunakan `getDashboardPath(role)` untuk menentukan tujuan. Role yang tidak dikenal tidak diarahkan ke dashboard.

Google Auth, penyimpanan session, otorisasi server, dan pembatasan akses langsung ke dashboard belum diimplementasikan. Mapping ini hanya navigasi frontend; role akun harus ditetapkan oleh sistem akun yang terpercaya, bukan disimpulkan dari pilihan pratinjau atau alamat email.

Saat `npm run dev`, tombol Login membuka pilihan **Pratinjau lokal** apabila autentikasi belum tersedia. Ini hanya navigasi untuk memeriksa kedua UI dan tidak membuat session atau menyimpan role. Pilihan pratinjau tidak ditampilkan pada build produksi. Jika Google Auth belum dikonfigurasi, versi produksi menampilkan pesan bahwa login belum tersedia.

## Konten payment gateway dari kode lama

- Ringkasan volume VA bulanan: kontrak frontend lama `/api/bni/portfolio-health`.
- Daftar merchant: kontrak frontend lama `/api/bni/merchant-list`.
- Status, nominal, waktu, dan member pembayaran retensi: kontrak frontend lama `/api/merchant/retention-logs?merchant_id=...`.

Pembayaran retensi bukan ledger seluruh transaksi gateway. Dashboard tidak mengklaim data settlement batch, payout, fee, atau refund yang belum tersedia. Semua akses data pada halaman payment gateway bersifat GET; tidak ada perubahan backend.
