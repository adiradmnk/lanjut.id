"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, type FormEvent } from "react";
import { Dialog } from "radix-ui";
import { ArrowDown, ArrowLeft, ArrowRight, Bath, BedDouble, Building2, Check, CheckCircle2, ChevronDown, ChevronRight, Copy, Heart, Images, KeyRound, Loader2, MapPin, Menu, MessageCircle, Monitor, Search, Share2, ShieldCheck, Sparkles, Users, Utensils, WashingMachine, Wifi, Wind, X } from "lucide-react";
import styles from "./rukita-demo.module.css";

const ROOMS = [
  { id:"ses-mch-gen-1-1", title:"Studio Essential", subtitle:"Ruang nyaman untuk keseharianmu", price:1800000, image:1, size:"12 m\u00b2", floor:"Lantai 1", tag:"Pilihan favorit" },
  { id:"ses-mch-gen-1-2", title:"Studio Comfort", subtitle:"Tempat pulang, tempat jadi diri sendiri", price:1800000, image:2, size:"12 m\u00b2", floor:"Lantai 2", tag:"Nyaman & praktis" },
  { id:"ses-mch-gen-1-3", title:"Deluxe Room", subtitle:"Lebih banyak ruang untuk cerita baru", price:2800000, image:3, size:"18 m\u00b2", floor:"Lantai 3", tag:"Lebih luas" },
] as const;
type Room = typeof ROOMS[number];
type Checkout = { trx_id:string; va_number:string; amount:number; expired_at?:string; execution_status?:string };
type Member = { id:string; merchant_id:string; name:string };
const rupiah = (amount:number) => new Intl.NumberFormat("id-ID", {style:"currency",currency:"IDR",maximumFractionDigits:0}).format(amount);
const facilities = [{icon:Wifi,label:"Wi-Fi"},{icon:Wind,label:"AC"},{icon:Bath,label:"Kamar mandi dalam"},{icon:BedDouble,label:"Fully furnished"},{icon:Utensils,label:"Dapur bersama"},{icon:WashingMachine,label:"Area laundry"},{icon:ShieldCheck,label:"Akses keamanan"},{icon:Monitor,label:"Area kerja"}];

const REASON_OPTIONS = [
  "Biaya sewa bulanan melebihi anggaran saat ini",
  "Pindah lokasi kerja / kampus / WFH",
  "Fasilitas kamar atau area bersama kurang memadai",
  "Masalah kebisingan / kenyamanan lingkungan kost",
  "Menemukan tempat tinggal lain dengan penawaran lebih baik",
  "Lainnya (tuliskan alasan Anda)"
];

async function request<T>(url:string, init?:RequestInit):Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(()=>null);
  if (!response.ok || !data || data.status === "error") throw new Error(data?.message || data?.error || `Permintaan belum berhasil (${response.status}). Silakan coba lagi.`);
  return data as T;
}

export default function RukitaDemoPage() {
  const [selectedRoom,setSelectedRoom] = useState<Room>(ROOMS[0]);
  const [memberId,setMemberId] = useState("mem-0003");
  const [mode,setMode] = useState<"booking"|"extend">("booking");
  const [loading,setLoading] = useState(false);
  const [result,setResult] = useState<Checkout|null>(null);
  const [error,setError] = useState<string|null>(null);
  const [notice,setNotice] = useState<string|null>(null);
  const [copied,setCopied] = useState(false);
  const [saved,setSaved] = useState(false);
  const [menuOpen,setMenuOpen] = useState(false);
  const [photo,setPhoto] = useState(1);
  const [query,setQuery] = useState("");
  const [filter,setFilter] = useState("");
  const [paid,setPaid] = useState(false);
  const [checkoutMember,setCheckoutMember] = useState("");
  const [toast,setToast] = useState<string|null>(null);

  // Pre-checkout AI chat gate: the booking form no longer submits straight away — it opens a
  // short chat about the picked room first, and only the "Konfirmasi Booking" button inside
  // that chat actually calls checkout.
  const [chatOpen,setChatOpen] = useState(false);
  const [hasChatted,setHasChatted] = useState(false);
  const [chatMessages,setChatMessages] = useState<{role:"user"|"assistant";text:string}[]>([]);
  const [chatInput,setChatInput] = useState("");
  const [chatSending,setChatSending] = useState(false);

  // Pop-up Survey State (Triggers 3 seconds after page opens)
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [otherReason, setOtherReason] = useState("");
  const [surveySubmitted, setSurveySubmitted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSurveyModal(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleToggleReason = (reason: string) => {
    if (selectedReasons.includes(reason)) {
      setSelectedReasons(selectedReasons.filter(r => r !== reason));
    } else {
      setSelectedReasons([...selectedReasons, reason]);
    }
  };

  const handleSurveySubmit = (e: FormEvent) => {
    e.preventDefault();
    setSurveySubmitted(true);
    setTimeout(() => {
      setShowSurveyModal(false);
    }, 1500);
  };

  const filteredRooms=ROOMS.filter(room=>`${room.title} ${room.floor}`.toLowerCase().includes(filter.toLowerCase()));
  const locked=loading || (!!result && !paid);

  function selectRoom(room:Room) {
    if(locked)return;
    setSelectedRoom(room);setResult(null);setPaid(false);setError(null);setNotice(null);
    setHasChatted(false);setChatMessages([]);
    document.getElementById("booking")?.scrollIntoView({behavior:"smooth",block:"center"});
  }
  function checkout(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(locked)return;
    if(!hasChatted){setChatOpen(true);return;}
    submitBooking();
  }
  async function submitBooking() {
    if(locked)return;
    setLoading(true);setError(null);setNotice(null);setPaid(false);
    try {
      const id=memberId.trim();if(!id)throw new Error("Isi ID penghuni terlebih dahulu.");
      const session=await request<{member:Member}>(`/api/member/resolve-magic-token?member_id=${encodeURIComponent(id)}`);
      if(session.member.merchant_id!=="mch-gen-1")throw new Error("Akun penghuni ini tidak terdaftar pada properti demo. Gunakan akun untuk merchant mch-gen-1.");
      const data=await request<Checkout>("/api/member/checkout-va",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({member_id:session.member.id,session_id:selectedRoom.id,amount:selectedRoom.price})});
      if(!data.trx_id || !data.va_number || typeof data.amount!=="number")throw new Error("Nomor pembayaran belum tersedia. Silakan hubungi pengelola sebelum mencoba kembali.");
      setCheckoutMember(session.member.id);setResult(data);
    }catch(e){setError(e instanceof Error?e.message:"Pembayaran belum dapat dibuat.");}
    finally{setLoading(false);}
  }
  async function sendChatMessage() {
    const text=chatInput.trim();if(!text||chatSending)return;
    setChatMessages(prev=>[...prev,{role:"user",text}]);
    setChatInput("");setChatSending(true);
    try {
      const history=chatMessages.map(m=>({role:m.role,content:m.text}));
      const data=await request<{reply:string}>("/api/member/rukita-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({room_title:selectedRoom.title,room_price_idr:selectedRoom.price,room_meta:{size:selectedRoom.size,floor:selectedRoom.floor,tag:selectedRoom.tag},message:text,history})});
      setChatMessages(prev=>[...prev,{role:"assistant",text:data.reply}]);
    }catch(e){
      setChatMessages(prev=>[...prev,{role:"assistant",text:e instanceof Error?e.message:"Maaf, terjadi kendala menghubungi asisten AI."}]);
    }finally{setChatSending(false);}
  }
  function confirmBookingFromChat() {
    setHasChatted(true);setChatOpen(false);
    submitBooking();
  }
  async function checkPayment() {
    if(!result)return;setLoading(true);setError(null);setNotice(null);
    try {
      const data=await request<{transactions:{trx_id:string;status:string;execution_status:string}[]}>(`/api/member/transactions?member_id=${encodeURIComponent(checkoutMember)}`);
      const transaction=data.transactions?.find(t=>t.trx_id===result.trx_id);
      if(!transaction)throw new Error("Transaksi belum ditemukan. Coba periksa kembali.");
      if(transaction.status==="PAID") {setPaid(true);setNotice(transaction.execution_status==="APPLIED"?"Pembayaran diterima dan booking berhasil diaktifkan.":"Pembayaran diterima. Pengelola sedang menyelesaikan aktivasi booking.");}
      else if(transaction.status==="PENDING")setNotice("Pembayaran belum diterima. Setelah transfer, periksa kembali di sini.");
      else {setNotice(`Transaksi ${transaction.status.toLowerCase()}. Silakan buat booking baru.`);setResult(null);}
    }catch(e){setError(e instanceof Error?e.message:"Gagal memeriksa pembayaran.");}finally{setLoading(false);}
  }
  async function cancelCheckout() {
    if(!result)return;setLoading(true);setError(null);
    try {
      const data=await request<{trx?:{status:string}}>(`/api/member/checkout/${encodeURIComponent(result.trx_id)}/cancel`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({member_id:checkoutMember})});
      if(data.trx?.status!=="CANCELLED")throw new Error("Transaksi belum dibatalkan. Periksa status pembayaran terlebih dahulu.");
      setResult(null);setNotice("Booking dibatalkan. Kamu bisa memilih kamar kembali.");
    }catch(e){setError(e instanceof Error?e.message:"Pembatalan gagal.");}finally{setLoading(false);}
  }
  async function copy(value:string, kind:"va"|"share") {
    try {await navigator.clipboard.writeText(value);if(kind==="va")setCopied(true);else setToast("Tautan hunian disalin.");}
    catch {if(kind==="va")setError("Nomor VA belum tersalin. Silakan salin nomornya secara manual.");else setToast("Tautan belum tersalin. Salin alamat dari browser kamu.");}
  }
  function search(event:FormEvent) {event.preventDefault();setFilter(query.trim());document.getElementById("kamar")?.scrollIntoView({behavior:"smooth"});}

  return <div className={styles.page}>
    <header className={styles.header}><div className={styles.headerInner}>
      <Link href="/rukita-demo" className={styles.logo} aria-label="Rukita demo, beranda">rukita<span>&bull;</span></Link>
      <nav className={styles.desktopNav} aria-label="Navigasi utama"><a href="#kamar">Cari hunian <ChevronDown size={14}/></a><a href="#tentang">Tentang hunian</a><a href="#fasilitas">Fasilitas</a></nav>
      <div className={styles.headerActions}><span className={styles.demoLabel}>DEMO EXPERIENCE</span><a href="#booking" className={styles.headerButton}><Users size={16}/> Penghuni Rukita</a><button className={styles.menuButton} aria-label="Buka menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X/>:<Menu/>}</button></div>
    </div>{menuOpen&&<nav className={styles.mobileNav} aria-label="Navigasi mobile">{[["kamar","Cari hunian"],["tentang","Tentang hunian"],["fasilitas","Fasilitas"],["booking","Booking"]].map(([id,label])=><a href={`#${id}`} onClick={()=>setMenuOpen(false)} key={id}>{label}</a>)}</nav>}</header>
    <main className={styles.main}>
      <div className={styles.topRow}><div className={styles.breadcrumb}><Link href="/">Beranda</Link><ChevronRight size={13}/><a href="#tentang">Kost Jakarta Selatan</a><ChevronRight size={13}/><span>Rukita Kemang</span></div><div className={styles.social}><button onClick={()=>void copy(window.location.href,"share")}><Share2 size={16}/> Bagikan</button><button aria-pressed={saved} onClick={()=>setSaved(!saved)}><Heart size={16} fill={saved?"currentColor":"none"}/>{saved?"Tersimpan":"Simpan"}</button></div></div>
      <Dialog.Root><section className={styles.gallery} aria-label="Galeri hunian">
        {[1,2,3,4,5].map((number)=><Dialog.Trigger asChild key={number}><button className={`${styles.photo} ${number===1?styles.mainPhoto:""}`} onClick={()=>setPhoto(number)} aria-label={`Lihat foto hunian ${number}`}><Image src={`/rukita-demo/room-${number}.jpg`} alt={number===1?"Kamar dengan ranjang nyaman, meja kerja, dan interior kayu terang":`Detail interior hunian, foto ${number}`} fill sizes={number===1?"(max-width: 700px) 100vw, 50vw":"25vw"} priority={number===1}/>{number===1&&<span className={styles.photoBrand}>rukita <small>coliving</small></span>}</button></Dialog.Trigger>)}
        <Dialog.Trigger asChild><button className={styles.galleryButton} onClick={()=>setPhoto(1)}><Images size={16}/> Lihat semua foto</button></Dialog.Trigger>
      </section><Dialog.Portal><Dialog.Overlay className={styles.overlay}/><Dialog.Content className={styles.photoDialog}><Dialog.Title className={styles.dialogTitle}>Jelajahi hunianmu</Dialog.Title><Dialog.Description className={styles.photoCaption}>Referensi interior Rukita Coastal Matraman ? {photo} / 5</Dialog.Description><Dialog.Close className={styles.closeButton} aria-label="Tutup galeri"><X/></Dialog.Close><div className={styles.largePhoto}><Image src={`/rukita-demo/room-${photo}.jpg`} alt={`Interior hunian, foto ${photo}`} fill sizes="90vw"/></div><div className={styles.photoControls}><button onClick={()=>setPhoto(photo===1?5:photo-1)} aria-label="Foto sebelumnya"><ArrowLeft/></button><span>{photo} / 5</span><button onClick={()=>setPhoto(photo===5?1:photo+1)} aria-label="Foto berikutnya"><ArrowRight/></button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
      <div className={styles.contentGrid}><div className={styles.details}>
        <section className={styles.introduction} id="tentang"><div className={styles.eyebrow}><span>RUKITA COLIVING</span><span><Users size={13}/> Campur</span></div><h1>Rukita Kemang</h1><p className={styles.address}><MapPin size={17}/> Kemang, Jakarta Selatan <a href="https://www.google.com/maps/search/Kemang+Jakarta+Selatan" target="_blank" rel="noreferrer">Lihat area <ArrowRight size={13}/></a></p><p className={styles.introCopy}>Pulang ke tempat yang bikin kamu nyaman.<br/>Hunian praktis dengan ruang untuk semua cerita barumu.</p><div className={styles.highlightRow}><span><BedDouble size={17}/> Furnished, tinggal masuk</span><span><Wifi size={17}/> Tetap terkoneksi</span><span><KeyRound size={17}/> Hidup lebih praktis</span></div></section>
        <nav className={styles.sectionNav} aria-label="Bagian halaman"><a href="#tentang">Tentang hunian</a><a href="#fasilitas">Fasilitas</a><a href="#kamar">Pilihan kamar <span>3</span></a><a href="#info">Info hunian</a></nav>
        <section className={styles.welcomeBanner}><span className={styles.bannerIcon}><Sparkles size={27}/></span><div><h2>Tempat baru. Cerita baru.</h2><p>Temukan ruang yang pas untuk versi terbaik dirimu.</p></div><a href="#kamar" aria-label="Lihat pilihan kamar"><ArrowDown size={21}/></a></section>
        <section className={styles.section} id="fasilitas"><div className={styles.sectionHeading}><div><span className={styles.overline}>EVERYDAY, MADE EASY</span><h2>Nyaman tanpa banyak urusan.</h2></div></div><p className={styles.sectionCopy}>Semua yang kamu butuhkan untuk istirahat, bekerja, dan menjalani hari.</p><div className={styles.facilities}>{facilities.map(({icon:Icon,label})=><div key={label}><Icon size={22} strokeWidth={1.5}/><span>{label}</span></div>)}</div></section>
        <section className={styles.section} id="kamar"><div className={styles.sectionHeading}><div><span className={styles.overline}>YOUR OWN LITTLE SPACE</span><h2>Pilih ruang yang paling kamu.</h2></div><span className={styles.roomCount}>{filteredRooms.length} tipe kamar</span></div><form className={styles.search} onSubmit={search}><Search size={18}/><input aria-label="Cari tipe kamar" value={query} onChange={e=>{setQuery(e.target.value);if(!e.target.value)setFilter("");}} placeholder="Cari tipe kamar atau lantai"/><button type="submit">Cari</button></form><p className={styles.catalogNote}>Pilihan dan harga katalog demo. Ketersediaan dikonfirmasi saat booking.</p><div className={styles.roomList}>{filteredRooms.map(room=><article className={`${styles.roomCard} ${selectedRoom.id===room.id?styles.selectedRoom:""}`} key={room.id}><div className={styles.roomImage}><Image src={`/rukita-demo/room-${room.image}.jpg`} alt={`Ilustrasi ${room.title}`} fill sizes="(max-width: 600px) 90vw, 240px"/><span>{room.tag}</span></div><div className={styles.roomBody}><div className={styles.roomTitle}><h3>{room.title}</h3>{selectedRoom.id===room.id&&<CheckCircle2 size={20}/>}</div><p>{room.subtitle}</p><div className={styles.roomMeta}><span><Building2 size={14}/> {room.floor}</span><span><BedDouble size={14}/> {room.size}</span><span><Wind size={14}/> AC</span></div><div className={styles.roomBottom}><div><strong>{rupiah(room.price)}</strong><small> / bulan</small></div><button disabled={locked} onClick={()=>selectRoom(room)}>{selectedRoom.id===room.id?"Terpilih":"Pilih kamar"}{selectedRoom.id===room.id?<Check size={15}/>:<ArrowRight size={15}/>}</button></div></div></article>)}</div>{filteredRooms.length===0&&<div className={styles.empty}><Search/><h3>Kamar belum ditemukan</h3><p>Coba kata “studio”, “deluxe”, atau nomor lantai.</p><button onClick={()=>{setFilter("");setQuery("");}}>Tampilkan semua kamar</button></div>}</section>
        <section className={styles.section} id="info"><span className={styles.overline}>GOOD TO KNOW</span><h2>Sebelum mulai cerita baru.</h2><div className={styles.infoRows}><details><summary>Apa yang perlu disiapkan untuk booking?<ChevronDown size={18}/></summary><p>Pilih tipe kamar, masukkan ID penghuni yang terdaftar, lalu buat nomor pembayaran. Booking baru di demo ini tetap menggunakan akun penghuni yang sudah tersedia.</p></details><details><summary>Bagaimana cara perpanjang sewa?<ChevronDown size={18}/></summary><p>Pilih tab Perpanjang sewa dan tipe kamar, kemudian gunakan ID penghuni yang sama. Konfirmasi pembayaran dilakukan dari status transaksi, bukan dari tombol simulasi.</p></details><details><summary>Apakah ini website resmi Rukita?<ChevronDown size={18}/></summary><p>Ini demo integrasi Lanjut.id dengan referensi tampilan Rukita. Foto adalah referensi interior, bukan representasi unit dalam katalog demo. Untuk hunian dan pemesanan resmi, kunjungi <a href="https://www.rukita.co/" target="_blank" rel="noreferrer">rukita.co</a>.</p></details></div></section>
      </div>
      <aside className={styles.bookingColumn}><section className={styles.bookingCard} id="booking"><div className={styles.bookingIntro}><span>Ruang pilihanmu</span><span className={styles.bookingBrand}>rukita</span></div><h2>{selectedRoom.title}</h2><div className={styles.bookingPrice}><strong>{rupiah(result?.amount ?? selectedRoom.price)}</strong><span>/ bulan</span></div><div className={styles.bookingTabs} role="group" aria-label="Jenis booking"><button disabled={locked} aria-pressed={mode==="booking"} className={mode==="booking"?styles.activeTab:""} onClick={()=>setMode("booking")}>Booking kamar</button><button disabled={locked} aria-pressed={mode==="extend"} className={mode==="extend"?styles.activeTab:""} onClick={()=>setMode("extend")}>Perpanjang sewa</button></div><form onSubmit={checkout}><label className={styles.fieldLabel} htmlFor="rukita-member">ID penghuni</label><div className={styles.memberField}><Users size={18}/><input id="rukita-member" required value={memberId} disabled={locked} onChange={e=>setMemberId(e.target.value)} placeholder="Masukkan ID penghuni" autoComplete="off"/></div><p className={styles.fieldHint}>Gunakan akun penghuni yang terdaftar di properti demo.</p><div className={styles.bookingSummary}><div><span>Kamar pilihan</span><strong>{selectedRoom.title}</strong></div><div><span>Periode sewa</span><strong>1 bulan</strong></div><div><span>Metode pembayaran</span><strong>Virtual Account</strong></div></div><div className={styles.total}><span>Total pembayaran</span><strong>{rupiah(result?.amount ?? selectedRoom.price)}</strong></div>{!result&&<button className={styles.primaryButton} disabled={loading} type="submit">{loading?<Loader2 className={styles.spin} size={18}/>:null}{loading?"Menyiapkan booking...":mode==="booking"?"Lanjut booking":"Lanjut perpanjang"}{!loading&&<ArrowRight size={18}/>}</button>}</form>
        {error&&<p role="alert" className={styles.error}>{error}</p>}{notice&&<p role="status" className={styles.notice}>{notice}</p>}{result&&<div className={styles.payment}><p><CheckCircle2 size={17}/>{paid?"Pembayaran diterima":"Nomor pembayaran siap"}</p>{!paid&&<><span>Virtual Account</span><div className={styles.va}><strong>{result.va_number}</strong><button aria-label="Salin nomor Virtual Account" onClick={()=>void copy(result.va_number,"va")}>{copied?<Check size={18}/>:<Copy size={18}/>}</button></div>{copied&&<small role="status">Nomor disalin</small>}<small>ID transaksi: {result.trx_id}</small>{result.expired_at&&<small>Berlaku hingga {new Date(result.expired_at).toLocaleString("id-ID")}</small>}<button className={styles.primaryButton} disabled={loading} onClick={()=>void checkPayment()}>{loading?<Loader2 size={17} className={styles.spin}/>:<ShieldCheck size={17}/>}Periksa pembayaran</button><button className={styles.cancelButton} disabled={loading} onClick={()=>void cancelCheckout()}>Batalkan booking ini</button></>}</div>}<p className={styles.secureNote}><ShieldCheck size={14}/> Status pembayaran terhubung ke sistem</p></section><div className={styles.helpCard}><MessageCircle size={23}/><div><strong>Masih ada yang bikin penasaran?</strong><p>Kenali cara sewa dan kehidupan di Rukita.</p><a href="https://www.rukita.co/faq?group=rukita" target="_blank" rel="noreferrer">Baca panduan Rukita <ArrowRight size={14}/></a></div></div></aside></div>
      <section className={styles.closing}><span className={styles.closingMark}>r.</span><div><span>MORE THAN A ROOM</span><h2>Ruang untuk hidup.<br/>Tempat untuk bertumbuh.</h2></div><a href="#kamar">Temukan ruangmu <ArrowRight size={19}/></a></section>
    </main><footer className={styles.footer}><Link href="/rukita-demo" className={styles.footerLogo}>rukita<span>&bull;</span></Link><p>Demo pengalaman hunian &middot; Integrasi Lanjut.id<br/><small>Bukan kanal pemesanan resmi Rukita. Foto: Rukita Coastal Matraman.</small></p><Link href="/">Kembali ke Lanjut.id <ArrowRight size={15}/></Link></footer>{toast&&<div role="status" className={styles.toast}>{toast}<button aria-label="Tutup notifikasi" onClick={()=>setToast(null)}><X size={16}/></button></div>}

    {/* 3-Second Pop-up Survey Modal */}
    {showSurveyModal && (
      <div 
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          backgroundColor: "rgba(16, 38, 35, 0.75)",
          backdropFilter: "blur(4px)"
        }}
      >
        <div 
          style={{
            width: "100%",
            maxWidth: "480px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            padding: "24px",
            color: "#163b3a",
            fontFamily: "inherit",
            border: "1px solid #e0e5dc"
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingBottom: "12px", borderBottom: "1px solid #e9e9e5" }}>
            <div>
              <span style={{ fontSize: "10px", letterSpacing: "1.2px", fontWeight: 600, color: "#009c96", textTransform: "uppercase" }}>Survei Penghuni</span>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#163b3a", marginTop: "4px", lineHeight: 1.3 }}>
                Mengapa Anda tidak memperpanjang masa tinggal?
              </h3>
              <p style={{ fontSize: "11px", color: "#6e7b63", marginTop: "4px" }}>
                Pilih alasan yang sesuai untuk membantu kami meningkatkan kenyamanan hunian Anda.
              </p>
            </div>
            <button 
              onClick={() => setShowSurveyModal(false)}
              style={{ background: "#f4f5f0", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "grid", placeItems: "center", color: "#68716a", cursor: "pointer", marginLeft: "12px", flexShrink: 0 }}
              aria-label="Tutup"
            >
              <X size={15} />
            </button>
          </div>

          {surveySubmitted ? (
            <div style={{ padding: "32px 0", textAlign: "center" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#e7f3ed", color: "#009c96", display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
                <Check size={20} />
              </div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#163b3a" }}>Terima kasih atas masukan Anda</p>
              <p style={{ fontSize: "11px", color: "#6e7b63", marginTop: "4px" }}>Respons Anda telah tersimpan ke sistem evaluasi retensi.</p>
            </div>
          ) : (
            <form onSubmit={handleSurveySubmit} style={{ marginTop: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "360px", overflowY: "auto", paddingRight: "4px" }}>
                {REASON_OPTIONS.map((reason, idx) => {
                  const checked = selectedReasons.includes(reason);
                  const isLast = idx === REASON_OPTIONS.length - 1;

                  return (
                    <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label 
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "10px",
                          padding: "9px 12px",
                          borderRadius: "7px",
                          border: checked ? "1px solid #009c96" : "1px solid #e0e5dc",
                          backgroundColor: checked ? "#e7f3ed" : "#fcfcfb",
                          color: checked ? "#163b3a" : "#424c48",
                          fontSize: "11.5px",
                          cursor: "pointer",
                          transition: "all 0.15s"
                        }}
                      >
                        <input 
                          type="checkbox"
                          style={{ marginTop: "2px", accentColor: "#009c96", cursor: "pointer" }}
                          checked={checked}
                          onChange={() => handleToggleReason(reason)}
                        />
                        <span style={{ lineHeight: 1.4 }}>{reason}</span>
                      </label>

                      {/* Free text input for the last option */}
                      {isLast && checked && (
                        <div style={{ paddingLeft: "10px", paddingTop: "2px" }}>
                          <textarea
                            value={otherReason}
                            onChange={(e) => setOtherReason(e.target.value)}
                            placeholder="Tuliskan alasan spesifik Anda di sini..."
                            rows={3}
                            style={{
                              width: "100%",
                              fontSize: "11px",
                              borderRadius: "6px",
                              border: "1px solid #009c96",
                              backgroundColor: "#ffffff",
                              padding: "8px 10px",
                              color: "#163b3a",
                              outline: "none",
                              resize: "none",
                              boxSizing: "border-box"
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #e9e9e5" }}>
                <button
                  type="button"
                  onClick={() => setShowSurveyModal(false)}
                  style={{
                    padding: "8px 14px",
                    fontSize: "11px",
                    color: "#6e7b63",
                    background: "transparent",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer"
                  }}
                >
                  Nanti saja
                </button>
                <button
                  type="submit"
                  disabled={selectedReasons.length === 0}
                  style={{
                    padding: "8px 18px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#ffffff",
                    backgroundColor: "#163b3a",
                    border: "none",
                    borderRadius: "6px",
                    cursor: selectedReasons.length === 0 ? "not-allowed" : "pointer",
                    opacity: selectedReasons.length === 0 ? 0.5 : 1
                  }}
                >
                  Kirim Jawaban
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    )}

    {chatOpen && (
      <div style={{ position: "fixed", inset: 0, background: "rgba(10,20,15,0.55)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
        <div style={{ background: "#fff", borderRadius: "16px", padding: "20px", maxWidth: "440px", width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#163b3a" }}>Tanya dulu sebelum booking</h3>
              <p style={{ fontSize: "11px", color: "#6e7b63", marginTop: "4px" }}>
                Ngobrol sama asisten AI soal {selectedRoom.title} sebelum lanjut booking.
              </p>
            </div>
            <button onClick={() => setChatOpen(false)} style={{ background: "#f4f5f0", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "grid", placeItems: "center", color: "#68716a", cursor: "pointer", marginLeft: "12px", flexShrink: 0 }} aria-label="Tutup">
              <X size={15} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", margin: "16px 0", display: "flex", flexDirection: "column", gap: "10px", minHeight: "140px" }}>
            {chatMessages.length === 0 && (
              <p style={{ fontSize: "12px", color: "#8a938c" }}>Contoh: "Kamar ini cocok untuk 2 orang gak?" atau "Ada dapur bersama?"</p>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", background: m.role === "user" ? "#163b3a" : "#f4f5f0", color: m.role === "user" ? "#fff" : "#163b3a", borderRadius: "10px", padding: "8px 12px", fontSize: "13px" }}>
                {m.text}
              </div>
            ))}
            {chatSending && <p style={{ fontSize: "12px", color: "#8a938c" }}>Asisten sedang mengetik...</p>}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); sendChatMessage(); }} style={{ display: "flex", gap: "8px" }}>
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Tulis pertanyaan..." disabled={chatSending}
              style={{ flex: 1, border: "1px solid #e2e5df", borderRadius: "8px", padding: "8px 10px", fontSize: "13px" }} />
            <button type="submit" disabled={chatSending || !chatInput.trim()} style={{ background: "#163b3a", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", cursor: "pointer", opacity: chatSending || !chatInput.trim() ? 0.5 : 1 }}>
              Kirim
            </button>
          </form>

          <button onClick={confirmBookingFromChat} disabled={loading}
            style={{ marginTop: "12px", background: "#009c96", color: "#fff", border: "none", borderRadius: "8px", padding: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            {loading ? "Memproses..." : "Konfirmasi & Lanjutkan Booking"}
          </button>
        </div>
      </div>
    )}
  </div>;
}
