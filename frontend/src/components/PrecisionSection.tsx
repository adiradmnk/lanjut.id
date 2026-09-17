import React from 'react';

const LOGO_ICON =
  'https://cdn.prod.website-files.com/6720dd1ab6df0da205830ab1/6870f623cf3df417ce45df05_icon%20logo%20eternacloud.png';

/* Color palette tokens:
   #007979 (teal-primary), #24B1B1 (teal-light), #FFE2AF (cream-warm), #E37434 (orange-coral) */
const LINE_GRADIENT =
  'linear-gradient(180deg, #24B1B1 0%, #007979 30%, #FFE2AF 65%, #E37434 85%, rgba(227, 116, 52, 0) 102%)';

const PILLARS = [
  {
    label: 'Automated Churn Risk Detection',
    items: ['Attendance Drop Scan (2/8 Sessions)', '7-Day Renewal Expiry Alert', 'Frequency Anomaly Flag', 'Zero False-Positive Filter'],
    leftVw: 2.8,
    bottomVw: 7,
  },
  {
    label: 'AI Grievance Translator',
    items: ['Google Gemini API & NLP', 'Natural Language Understanding', 'Root-Cause Intent Extraction', 'Schedule Conflict Classification'],
    leftVw: 22.4,
    bottomVw: 9.08,
  },
  {
    label: 'Capacity & Margin Engine',
    items: ['Empty Slot Matching (4 Seats Left)', 'Merchant Min-Margin Lock (≥20%)', 'Zero-Loss Prorated Discount', 'Deterministic Validation'],
    leftVw: 41.2,
    bottomVw: 11.16,
  },
  {
    label: '1-Click BNI VA & RM Intelligence',
    items: ['Instant BNI Virtual Account (988...)', 'Idempotent Webhook Verification', 'Staircase.ai Risk Score for RM', 'UU PDP Privacy Compliance'],
    leftVw: 61.1,
    bottomVw: 13.24,
  },
];

export default function PrecisionSection() {
  return (
    <section
      id="pillars"
      style={{
        backgroundColor: '#0b2238',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: 'clamp(48px, 8vw, 120px) clamp(16px, 4vw, 60px) clamp(48px, 5.56vw, 80px)',
        gap: 'clamp(32px, 4vw, 56px)',
        position: 'relative',
        zIndex: 2,
      }}
    >
      {/* Block 1 — Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '36px',
        }}
      >
        {/* Badge pill */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(36, 177, 177, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: 'clamp(14px, 1.1vw, 18px)',
            fontWeight: 500,
            borderRadius: '36px',
            padding: 'clamp(8px, 0.9vw, 14px) clamp(12px, 1.25vw, 20px)',
            color: '#FFE2AF',
            whiteSpace: 'nowrap',
          }}
        >
          <svg
            width="19"
            height="18"
            style={{ flexShrink: 0 }}
            viewBox="0 0 17 16"
            fill="none"
          >
            <g clipPath="url(#prec-clip)">
              <circle cx="8.5" cy="8" r="7" stroke="#24B1B1" fill="none" />
              <path
                d="M9.5 11.5V10.5H7.5V11.5H9.5ZM7.5 14.5C7.5 15.0523 7.94772 15.5 8.5 15.5C9.05228 15.5 9.5 15.0523 9.5 14.5H7.5ZM8.5 11.5H7.5V14.5H8.5H9.5V11.5H8.5Z"
                fill="#24B1B1"
              />
              <path
                d="M12 7H11V9H12V7ZM15 9C15.5523 9 16 8.55228 16 8C16 7.44772 15.5523 7 15 7V9ZM12 8V9H15V8V7L12 7V8Z"
                fill="#24B1B1"
              />
              <path
                d="M5 9H6V7H5V9ZM2 7C1.44772 7 1 7.44772 1 8C1 8.55228 1.44772 9 2 9V7ZM5 8V7H2V8V9H5V8Z"
                fill="#24B1B1"
              />
              <path
                d="M7.5 4.5V5.5H9.5V4.5H7.5ZM9.5 1.5C9.5 0.947715 9.05228 0.5 8.5 0.5C7.94772 0.5 7.5 0.947715 7.5 1.5H9.5ZM8.5 4.5H9.5V1.5H8.5H7.5V4.5H8.5Z"
                fill="#24B1B1"
              />
            </g>
            <defs>
              <clipPath id="prec-clip">
                <rect width="16" height="16" fill="white" transform="translate(0.5)" />
              </clipPath>
            </defs>
          </svg>
          LANJUT Architecture
        </div>

        {/* Heading + subtext */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: 'clamp(700px, 60vw, 900px)',
            gap: '22px',
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 56px)',
              fontWeight: 500,
              color: '#FFFFFF',
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            <span
              className="sm:whitespace-nowrap"
              style={{ display: 'block' }}
            >
              Autonomous Retention Layer for Merchants.
            </span>
            <span
              style={{
                backgroundImage:
                  'linear-gradient(90deg, #24B1B1, #FFE2AF 50%, #E37434)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
                paddingBottom: '0.3vw',
                display: 'block',
              }}
            >
              Operational Health Intelligence for BNI RM.
            </span>
          </h2>

          <p
            style={{
              fontSize: 'clamp(15px, 1.2vw, 20px)',
              color: 'rgba(255, 255, 255, 0.7)',
              margin: 0,
              maxWidth: '820px',
              lineHeight: 1.6,
            }}
          >
            Menyelamatkan pelanggan yang hampir berhenti lewat penyesuaian layanan otomatis yang menguntungkan merchant, sekaligus menyediakan ringkasan sinyal operasional real-time bagi Relationship Manager BNI.
          </p>
        </div>
      </div>

      {/* Block 2 — Pillars container */}
      <div
        style={{
          width: '100%',
          maxWidth: '82.292vw',
          margin: '0 auto',
        }}
      >
        {/* Desktop pillars — hidden lg:block */}
        <div
          className="hidden lg:block"
          style={{
            position: 'relative',
            width: '82.292vw',
            height: '31.94vw',
            color: '#FFFFFF',
          }}
        >
          {PILLARS.map((pillar) => (
            <div
              key={pillar.label}
              style={{
                position: 'absolute',
                bottom: `${pillar.bottomVw}vw`,
                left: `${pillar.leftVw}vw`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
              }}
            >
              {/* Chip */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundImage:
                    'linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(0, 121, 121, 0.4))',
                  border: '1px solid rgba(36, 177, 177, 0.45)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  fontSize: '18px',
                  fontWeight: 500,
                  borderRadius: '20px',
                  paddingTop: '0.972vw',
                  paddingBottom: '0.972vw',
                  paddingLeft: '1.736vw',
                  paddingRight: '1.736vw',
                  whiteSpace: 'nowrap',
                  gap: '8px',
                  color: '#FFFFFF',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
                }}
              >
                <img
                  src={LOGO_ICON}
                  alt=""
                  style={{ width: '1.111vw', height: 'auto', display: 'inline-block' }}
                />
                {pillar.label}
              </div>

              {/* Line + items wrapper */}
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                }}
              >
                {/* Items container */}
                <div
                  style={{
                    position: 'absolute',
                    top: '0.56vw',
                    left: '1.94vw',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '15px',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {pillar.items.map((item) => (
                    <div
                      key={item}
                      style={{
                        paddingTop: '0.69vw',
                        paddingBottom: '0.69vw',
                        paddingLeft: '1.04vw',
                        paddingRight: '1.04vw',
                        display: 'flex',
                        alignItems: 'flex-start',
                        color: 'rgba(255, 255, 255, 0.9)',
                        background: 'rgba(11, 34, 56, 0.85)',
                        borderRadius: '6px',
                        border: '1px solid rgba(36, 177, 177, 0.25)',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>

                {/* Vertical gradient line */}
                <div
                  style={{
                    backgroundImage: LINE_GRADIENT,
                    width: '2px',
                    height: '14.24vw',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Mobile & Tablet pillars — flex flex-col lg:hidden w-full */}
        <div className="flex flex-col lg:hidden w-full gap-4 text-left">
          {PILLARS.map((pillar, index) => (
            <div
              key={pillar.label}
              className="w-full rounded-2xl p-5 sm:p-6 transition-all duration-200"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(36, 177, 177, 0.3)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
            >
              {/* Pillar Header Badge */}
              <div className="flex items-center gap-3 mb-4">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-[#007979] bg-[#FFE2AF]">
                  0{index + 1}
                </span>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium text-white bg-[#007979]/40 border border-[#24B1B1]/40">
                  <img
                    src={LOGO_ICON}
                    alt=""
                    className="w-3.5 h-3.5 object-contain"
                  />
                  <span>{pillar.label}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {pillar.items.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2.5 p-3 rounded-xl text-xs sm:text-sm text-white/90 bg-[#071624]/60 border border-[#24B1B1]/15"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#24B1B1] shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          SECTIONS 2: SOLUTIONS & ECOSYSTEM MODULES (#solutions)
          ════════════════════════════════════════════════════════════════ */}
      <div id="solutions" className="w-full max-w-6xl pt-16 text-left">
        <div className="mb-10 text-center">
          <span className="inline-block text-xs font-semibold tracking-widest text-[#24B1B1] uppercase mb-2">
            Integrated Solutions
          </span>
          <h3 className="text-2xl sm:text-4xl font-semibold text-white tracking-tight">
            Tiga Sudut Pandang, Satu Ekosistem Otonom
          </h3>
          <p className="text-sm sm:text-base text-white/65 max-w-2xl mx-auto mt-2">
            Dirancang menghubungkan operasional harian merchant dengan sistem mitigasi risiko dan e-collection BNI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-white/[0.04] border border-[#24B1B1]/30 flex flex-col justify-between hover:border-[#24B1B1] transition-all">
            <div>
              <span className="text-xs font-semibold text-[#FFE2AF] uppercase tracking-wider block mb-2">
                Merchant Operations
              </span>
              <h4 className="text-xl font-semibold text-white mb-2">Merchant AI Portal</h4>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed mb-4">
                Mendeteksi pola penurunan frekuensi member gym/UMKM, menghitung kapasitas utilisasi, dan menyusun penawaran retensi otomatis sebelum member churn.
              </p>
            </div>
            <a
              href="/merchant"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#007979] text-white text-xs sm:text-sm font-medium hover:bg-[#006060] transition-colors"
            >
              Buka Merchant Portal →
            </a>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-white/[0.04] border border-[#24B1B1]/30 flex flex-col justify-between hover:border-[#24B1B1] transition-all">
            <div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-2">
                BNI Group Intelligence
              </span>
              <h4 className="text-xl font-semibold text-white mb-2">BNI Risk Supervisor</h4>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed mb-4">
                Dasbor pengawasan Relationship Manager BNI untuk memonitor kesehatan arus kas debitur KUR, rasio NPL terproyeksi, dan perputaran dana di rekening BNI.
              </p>
            </div>
            <a
              href="/bni"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#007979] text-white text-xs sm:text-sm font-medium hover:bg-[#006060] transition-colors"
            >
              Buka BNI Supervisor →
            </a>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-white/[0.04] border border-[#24B1B1]/30 flex flex-col justify-between hover:border-[#24B1B1] transition-all">
            <div>
              <span className="text-xs font-semibold text-[#E37434] uppercase tracking-wider block mb-2">
                Frictionless Checkout
              </span>
              <h4 className="text-xl font-semibold text-white mb-2">Member Renewal Flow</h4>
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed mb-4">
                Tautan unik anti-manipulasi (HMAC-SHA256) memungkinkan member memilih opsi perpanjangan fleksibel dan menerbitkan BNI Virtual Account SNAP seketika.
              </p>
            </div>
            <a
              href="/member"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#007979] text-white text-xs sm:text-sm font-medium hover:bg-[#006060] transition-colors"
            >
              Simulasi Checkout Member →
            </a>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          SECTIONS 3: COMPANY & ECOSYSTEM SYNERGY (#company)
          ════════════════════════════════════════════════════════════════ */}
      <div id="company" className="w-full max-w-6xl pt-16 text-left">
        <div className="p-8 sm:p-10 rounded-2xl bg-gradient-to-r from-[#071624] to-[#007979]/20 border border-[#24B1B1]/30 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold text-[#FFE2AF] uppercase tracking-widest block mb-2">
              Strategic BNI Group Synergy
            </span>
            <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-3">
              Mengunci Nilai Ekonomi dalam Ekosistem Tertutup BNI
            </h3>
            <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
              Alih-alih membiarkan merchant UMKM kolaps karena churn pelanggan dan gagal bayar pinjaman, LANJUT × BNI AEGIS menjaga kesinambungan bisnis debitur sekaligus memaksimalkan CASA, fee-based income BNI e-Collection, dan penyaluran kredit produktif.
            </p>
          </div>
          <div className="shrink-0 flex flex-col gap-3 w-full md:w-auto">
            <a
              href="/demo"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#24B1B1] text-[#071624] font-semibold text-sm hover:bg-[#FFE2AF] transition-colors"
            >
              Uji Telemetri Sistem →
            </a>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          SECTIONS 4: PRICING & FINANCIAL IMPACT (#pricing)
          ════════════════════════════════════════════════════════════════ */}
      <div id="pricing" className="w-full max-w-6xl pt-16 pb-8 text-center">
        <span className="inline-block text-xs font-semibold tracking-widest text-[#24B1B1] uppercase mb-2">
          Business Value & ROI
        </span>
        <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-8">
          Dampak Terukur bagi Merchant dan Bank BNI
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="text-3xl sm:text-4xl font-bold text-[#24B1B1] block mb-2">+28%</span>
            <h5 className="text-sm font-semibold text-white mb-1">Merchant Retention Lift</h5>
            <p className="text-xs text-white/60">Penyelamatan member yang berisiko churn melalui tawaran slot jam sepi otomatis.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="text-3xl sm:text-4xl font-bold text-emerald-400 block mb-2">-86%</span>
            <h5 className="text-sm font-semibold text-white mb-1">Potensi Penurunan NPL</h5>
            <p className="text-xs text-white/60">Early warning system menjaga arus kas UMKM tetap mampu melunasi cicilan pinjaman BNI.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="text-3xl sm:text-4xl font-bold text-[#FFE2AF] block mb-2">100%</span>
            <h5 className="text-sm font-semibold text-white mb-1">Closed-Loop BNI Flow</h5>
            <p className="text-xs text-white/60">Semua perpanjangan otomatis disalurkan melalui BNI SNAP e-Collection Virtual Account.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
