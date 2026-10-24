# 🏛️ BLUEPRINT & PRODUCT REQUIREMENTS DOCUMENT (PRD)
## SISTEM INFORMASI PERENCANAAN ANGGARAN KPU KABUPATEN NGAWI (SI-PRABU)
- **Lead Developer & System Architect:** `emenje`
- **Repositori Resmi:** https://github.com/stephanusyogi/siprabu (Branch: `main`)
- **Status Dokumen:** Single Source of Truth (SSOT)

---

## DAFTAR KESEPAKATAN ARSITEKTUR & ATURAN SISTEM

### [KESEPAKATAN-01] Visi, Ruang Lingkup & Fondasi Modul SI-PRABU
- **Definisi Aplikasi:** SI-PRABU adalah aplikasi yang dirancang untuk **Perencanaan** dan **Pelaksanaan** Anggaran **Pilkada Serentak Tahun 2029**.
- **Struktur Modul Perencanaan:** Terdiri dari 2 (dua) fase:
  1. **Pra-NPHD (Pagu Dinamis):** Plafon/pagu anggaran bersifat dinamis (mengikuti perubahan/akumulasi rincian kebutuhan yang disusun).
  2. **Pasca-NPHD (Pagu Statis):** Plafon/pagu anggaran bersifat statis (terkunci tetap pada nilai NPHD yang telah disahkan).
- **Fokus Pengembangan Saat Ini:**
  - **Fokus Aktif:** **Modul Perencanaan** (Pra-NPHD & Pasca-NPHD).
  - **Target Pengembangan Ke Depan:** **Modul Pelaksanaan**.
