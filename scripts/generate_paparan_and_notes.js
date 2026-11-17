/**
 * GENERATOR SLIDE PRESENTASI & CATATAN PEMBICARA (12 SLIDE - TAGLINE & PANTUN PERENCANAAN)
 * KPU KABUPATEN NGAWI - SATKER 657811
 * PILKADA SERENTAK 2029
 * 
 * Target Output: D:\OFFICE\2026\Aplikasi\Si Prabu\PPT Perencanaan\
 * - Paparan_RKB_KPU_Ngawi_2029.pptx
 * - Catatan_Pembicara_Paparan_RKB.docx
 */

const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');
const docx = require('docx');
const {
  Document, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, HeadingLevel, PageBreak, Header, Footer
} = docx;

const OUTPUT_DIR = 'D:\\OFFICE\\2026\\Aplikasi\\Si Prabu\\PPT Perencanaan';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ============================================================================
// DATA MASTER RKB KPU KABUPATEN NGAWI (SSOT RIIL DARI SI-PRABU)
// ============================================================================
const STATS = {
  grandTotal: '68.936.096.599',
  kabupaten: {
    total: '56.634.070.929',
    pct: '82,15%'
  },
  provinsi: {
    total: '12.302.025.670',
    pct: '17,85%'
  },
  dpt: '750.525',
  kk: '359.141',
  ppk: '19',
  pps: '217',
  tps: '1.393',
  paslon: '5',
  rekap1Sasaran: [
    { label: 'KPU Satker Kabupaten', total: '14.624.772.099', pct: '21,21%' },
    { label: 'PPK (19 Kecamatan)', total: '5.549.496.700', pct: '8,05%' },
    { label: 'PPS (217 Desa / Kel)', total: '20.851.297.800', pct: '30,25%' },
    { label: 'TPS (1.393 KPPS/Linmas)', total: '15.467.855.000', pct: '22,44%' },
    { label: 'Pantarlih (359.141 KK)', total: '3.981.325.000', pct: '5,78%' },
    { label: 'Fasilitasi Paslon Bupati', total: '8.461.350.000', pct: '12,27%' }
  ],
  rekap3Divisi: [
    { code: 'KUL', name: 'Divisi Keuangan, Umum & Logistik', total: '37.817.643.763', pct: '54,86%', desc: 'Honorarium Ad Hoc (26,17 M) • Logistik TPS (7,50 M) • Operasional Gudang' },
    { code: 'PARSDM', name: 'Divisi Sosdiklih, Parmas & SDM', total: '21.026.181.000', pct: '30,50%', desc: 'Sosdiklih & Media (6,80 M) • Event/EO (7,50 M) • Santunan Kerja (2,28 M)' },
    { code: 'TEKNIS', name: 'Divisi Teknis Penyelenggaraan', total: '6.370.496.800', pct: '9,24%', desc: 'Pencalonan Paslon • Bimtek Tungsura 1.393 KPPS • Rekapitulasi C-Hasil' },
    { code: 'RENDATIN', name: 'Divisi Perencanaan, Data & Informasi', total: '2.586.375.036', pct: '3,75%', desc: 'Pemutakhiran Sidalih 359.141 KK • Bimtek Operator • Jaringan Data' },
    { code: 'HUKUM', name: 'Divisi Hukum & Pengawasan', total: '1.135.400.000', pct: '1,65%', desc: 'Advokasi Sengketa PHPU di MK • Telaah Regulasi • Kode Etik Penyelenggara' }
  ],
  rekap5CostSharing: [
    { code: 'KUL', name: 'Keuangan, Umum & Logistik', kab: '30.022.447.793', kabPct: '79,4%', prov: '7.795.195.970', provPct: '20,6%' },
    { code: 'PARSDM', name: 'Sosdiklih, Parmas & SDM', kab: '17.785.379.000', kabPct: '84,6%', prov: '3.240.802.000', provPct: '15,4%' },
    { code: 'TEKNIS', name: 'Teknis Penyelenggaraan', kab: '5.217.092.800', kabPct: '81,9%', prov: '1.153.404.000', provPct: '18,1%' },
    { code: 'RENDATIN', name: 'Perencanaan, Data & Informasi', kab: '2.473.751.336', kabPct: '95,6%', prov: '112.623.700', provPct: '4,4%' },
    { code: 'HUKUM', name: 'Hukum & Pengawasan', kab: '1.135.400.000', kabPct: '100,0%', prov: '0', provPct: '0,0%' }
  ],
  stakeholder: [
    {
      instansi: 'DPRD Kabupaten Ngawi',
      tanggal: '28 November 2026',
      istilah: 'Audiensi dan Konsultasi Kelembagaan',
      agenda: '• Pemaparan proyeksi kebutuhan riil anggaran Pilkada 2029\n• Permohonan dukungan komitmen fiskal daerah bersama Komisi & Pimpinan DPRD\n• Transparansi postur pembiayaan demi kepastian tahapan demokrasi daerah'
    },
    {
      instansi: 'Bakesbangpol Kabupaten Ngawi',
      tanggal: '28 November 2026',
      istilah: 'Koordinasi Teknis Kesiapan Pendanaan Hibah',
      agenda: '• Penyelarasan draf NPHD bersama leading sector hibah Pemkab Ngawi\n• Verifikasi administrasi keuangan daerah & sinkronisasi tahapan pencairan APBD\n• Harmonisasi regulasi transfer dana hibah demi kelancaran operasional Satker'
    }
  ]
};

// ============================================================================
// DATA 12 SLIDE LENGKAP BESERTA SPEAKER NOTES
// ============================================================================
const SLIDES = [
  {
    num: 1,
    tag: 'PEMBUKA / IDENTITAS',
    title: 'USULAN PERENCANAAN KEBUTUHAN ANGGARAN BELANJA (RKB)\nPEMILIHAN BUPATI DAN WAKIL BUPATI TAHUN 2029',
    subtitle: 'Komisi Pemilihan Umum Kabupaten Ngawi — Satker 657811\nDisajikan di Hadapan Komisi Pemilihan Umum Provinsi Jawa Timur',
    type: 'cover',
    notes: `Assalamu’alaikum Warahmatullahi Wabarakatuh, Selamat pagi/siang, Salam sejahtera bagi kita semua.\n\nYth. Ketua dan Anggota Komisi Pemilihan Umum Provinsi Jawa Timur, Bapak/Ibu Sekretaris, Pejabat Fungsional, serta Tim Pemeriksa Usulan Anggaran KPU Provinsi Jawa Timur yang kami hormati.\n\nPuji syukur kita panjatkan ke hadirat Allah SWT, Tuhan Yang Maha Esa. Pada kesempatan hari ini, kami dari jajaran Komisi Pemilihan Umum Kabupaten Ngawi hadir secara lengkap untuk memaparkan draf usulan perencanaan Rencana Kebutuhan Biaya (RKB) Pemilihan Bupati dan Wakil Bupati Ngawi Tahun 2029 yang diselenggarakan secara serentak bersama Pemilihan Gubernur dan Wakil Gubernur Jawa Timur.\n\nPrinsip utama yang kami pegang teguh dalam penyusunan usulan ini adalah: Rasional, Taat Asas Regulasi, Berorientasi Kebutuhan Riil Lapangan (Single Source of Truth), serta Menjunjung Tinggi Efisiensi Fiskal Daerah. Kami memohon arahan, telaah, dan penyelarasan dari KPU Provinsi Jawa Timur agar postur anggaran yang kami bawa memiliki keterpaduan penuh dengan kebijakan pendanaan bersama se-Jawa Timur.`
  },
  {
    num: 2,
    tag: 'LANDASAN YURIDIS',
    title: 'Dasar Hukum Penyusunan Anggaran Hibah Pemilihan',
    subtitle: 'Hierarki Regulasi Penyelenggaraan Pemilu, Keuangan Daerah, dan Standar Biaya Masukan',
    type: 'cards',
    items: [
      { header: '1. UU Pemilihan Kepala Daerah', text: 'UU No. 1 Tahun 2015 jo. UU No. 6 Tahun 2020 (Payung Hukum Pemilihan Gubernur, Bupati, dan Walikota Serentak).' },
      { header: '2. Regulasi Pendanaan APBD (NPHD)', text: 'Permendagri No. 54/2019 jo. Permendagri No. 41/2020 (Tata Cara Pendanaan Hibah Pilkada & Skema Pendanaan Bersama).' },
      { header: '3. Standar Biaya Masukan (SBM & SBML)', text: 'PMK Standar Biaya Masukan Kemenkeu & Keputusan KPU RI tentang SBML Honorarium serta Tahapan Pemilihan.' },
      { header: '4. Keputusan Gubernur Jawa Timur No. 188', text: 'Keputusan Gubernur Jawa Timur Nomor 188/87/KPTS/013/2022 tentang Komponen Pendanaan Bersama (Cost-Sharing) Pilkada Serentak Jawa Timur.' }
    ],
    notes: `Bapak/Ibu Pimpinan KPU Provinsi yang kami hormati,\n\nPada slide kedua ini, kami menegaskan landasan yuridis formal penyusunan anggaran hibah Pilkada 2029:\n1. UU No. 1/2015 jo. UU No. 6/2020 sebagai payung hukum pelaksanaan Pilkada serentak.\n2. Permendagri No. 54/2019 jo. Permendagri No. 41/2020 yang mengatur tata cara pendanaan belanja hibah Pilkada bersumber APBD.\n3. PMK Standar Biaya Masukan (SBM) Kemenkeu dan Keputusan KPU RI mengenai SBML honorarium dan tahapan pemilihan.\n4. Keputusan Gubernur Jawa Timur Nomor 188/87/KPTS/013/2022 yang menjadi pedoman sah pembagian beban fiskal bersama (Cost-Sharing) antara Pemprov Jawa Timur dan Pemkab Ngawi.\n\nDengan regulasi yang komprehensif ini, seluruh usulan belanja memiliki kepastian dan legitimasi hukum yang kuat.`
  },
  {
    num: 3,
    tag: 'TATA KELOLA INTERNAL',
    title: 'Alur SOP Penyusunan Anggaran Internal: KAK Divisi ke Pleno',
    subtitle: 'Mekanisme Bottom-Up Berjenjang Berbasis Kebutuhan Riil, Kepatuhan SBML & Kelengkapan Administrasi',
    type: 'steps',
    steps: [
      {
        num: '01',
        title: 'Pengajuan Usulan Divisi',
        desc: '• Disusun 5 Komisioner Divisi & Kasubag\n• Berbasis rincian output riil & tahapan\n• Menjamin kepemilikan program (ownership)'
      },
      {
        num: '02',
        title: 'Telaah SBM & Verifikasi Berkas',
        desc: '• Telaah Standar SBM & SBML KPU RI\n• Verifikasi 3 Kelengkapan Administrasi Wajib:\n  1. Nodin Resmi Divisi & Kasubag\n  2. Lampiran RKB Bertandatangan\n  3. Dokumen KAK Kegiatan Lengkap'
      },
      {
        num: '03',
        title: 'Pengesahan Rapat Pleno',
        desc: '• Konsolidasi kolektif kolegial Komisioner\n• Penyelarasan lintas divisi & fiskal\n• Disahkan sah dalam Berita Acara Pleno'
      }
    ],
    notes: `Bapak/Ibu sekalian,\n\nDi internal KPU Kabupaten Ngawi, draf RKB ini tidak disusun secara sepihak oleh pengelola keuangan saja, melainkan melalui SOP tata kelola internal 3 tahap yang sangat ketat:\n\nTahap Pertama (Pengajuan Usulan Divisi): Dimulai dari pengajuan usulan kegiatan oleh masing-masing Komisioner Divisi bersama Kepala Subbagian (Kasubag) pengampu. Hal ini menjamin aspek kepemilikan program (sense of ownership) dan kesesuaian operasional lapangan.\n\nTahap Kedua (Telaah SBM & Verifikasi Administrasi): Tim Keuangan dan Pejabat Pembuat Komitmen (PPK) melakukan penyisiran teknis berlapis. Selain menelaah kepatuhan unit cost terhadap SBM Kemenkeu dan SBML KPU RI untuk mencegah duplikasi biaya, tim verifikasi mewajibkan 3 kelengkapan dokumen administrasi:\n1. Nota Dinas (Nodin) resmi dari Komisioner Divisi dan Kasubag pengusul;\n2. Lampiran RKB yang telah ditandatangani secara sah; serta\n3. Dokumen KAK Kegiatan yang terperinci memuat rincian output dan kerangka waktu.\n\nTahap Ketiga (Pengesahan Rapat Pleno): Seluruh draf usulan yang lolos telaah dan verifikasi dibawa ke Rapat Pleno Terbuka Komisioner untuk dibahas, diselaraskan, dan disahkan secara bulat melalui Berita Acara Pleno Resmi. Dokumen inilah yang hari ini kami bawa ke hadapan KPU Provinsi Jawa Timur.`
  },
  {
    num: 4,
    tag: 'PARAMETER DATA WILAYAH (SSOT)',
    title: 'Profil Kewilayahan & Demografi Basis Kebutuhan',
    subtitle: 'Komputasi Anggaran Didasarkan Mutlak pada Single Source of Truth Data Riil Kabupaten Ngawi',
    type: 'metrics',
    metrics: [
      { val: '19', label: 'Kecamatan (PPK)', sub: '19 Kantor Sekretariat PPK & Aula Rapat' },
      { val: '217', label: 'Desa / Kelurahan (PPS)', sub: '213 Desa + 4 Kelurahan se-Kabupaten' },
      { val: '1.393', label: 'TPS Tersebar Merata', sub: 'Tempat Pemungutan Suara Reguler & Khusus' },
      { val: '359.141', label: 'Kepala Keluarga (KK)', sub: 'Basis Riil Beban Coklit Petugas Pantarlih' },
      { val: '750.525', label: 'Daftar Pemilih Tetap (DPT)', sub: 'Dasar Presisi Cetak Surat Suara & Formulir' },
      { val: '5', label: 'Pasangan Calon (Simulasi)', sub: 'Proyeksi Maksimal Fasilitasi Debat & APK' }
    ],
    notes: `Pimpinan dan Anggota KPU Provinsi Jawa Timur yang kami hormati,\n\nKekuatan utama usulan anggaran KPU Kabupaten Ngawi berpijak pada Single Source of Truth (SSOT) data parameter kewilayahan yang teruji:\n- Kami membawahi 19 Kecamatan dan 217 Desa/Kelurahan.\n- Jumlah TPS diproyeksikan sebanyak 1.393 TPS.\n- Satu parameter kunci yang sangat kami tekankan: Beban kerja pemutakhiran data pemilih (Coklit) oleh Pantarlih kami hitung berbasis 359.141 Kepala Keluarga (KK). Angka ini adalah data riil lapangan hasil sinkronisasi data kependudukan dan pengalaman Pemilu terakhir, bukan estimasi kasar.\n- Jumlah DPT sebesar 750.525 pemilih menjadi dasar penghitungan surat suara dan perlengkapan pemungutan suara.\n- Simulasi pencalonan disiapkan untuk 5 Pasangan Calon guna mengantisipasi skenario kompetisi elektoral paling dinamis.\n\nSetiap rupiah dalam RKB kami berakar langsung pada parameter-parameter data riil ini.`
  },
  {
    num: 5,
    tag: 'REKAP PERENCANAAN NO. 1',
    title: 'Distribusi Alokasi Berdasarkan Sasaran Belanja',
    subtitle: 'Porsi Terbesar Anggaran Mengalir Langsung ke Penyelenggara Desa dan TPS',
    type: 'table_rekap1',
    notes: `Bapak/Ibu sekalian,\n\nSlide kelima ini menyajikan Rekapitulasi Perencanaan No. 1 dari SI-PRABU, yaitu distribusi alokasi anggaran berdasarkan kelompok sasaran belanja, yang kini kami tampilkan dalam bentuk Interactive Donut Chart:\n\nPerhatikan bahwa 66,52% atau sebesar Rp 45,86 Miliar dari total anggaran bersama mengalir langsung ke garda depan:\nSecara hierarkis berjenjang dari kabupaten hingga tingkat operasional lapangan:\n1. KPU Satker Kabupaten: Rp 14,62 Miliar (21,21%)\n2. PPK (19 Kecamatan): Rp 5,55 Miliar (8,05%)\n3. PPS (217 Desa/Kelurahan): Rp 20,85 Miliar (30,25%)\n4. TPS (1.393 KPPS/Linmas): Rp 15,47 Miliar (22,44%)\n5. Pantarlih Coklit (359.141 KK): Rp 3,98 Miliar (5,78%)\n6. Fasilitasi Pasangan Calon: Rp 8,46 Miliar (12,27%)\n\nIni membuktikan secara gamblang bahwa KPU Kabupaten Ngawi tidak memboroskan anggaran di level satker kantor, melainkan memfokuskan sumber daya fiskal sepenuhnya untuk keberhasilan pemungutan suara di tingkat akar rumput.`
  },
  {
    num: 6,
    tag: 'REKAP PERENCANAAN NO. 3',
    title: 'Distribusi Alokasi per Komisioner Divisi',
    subtitle: 'Porsi Terbesar pada Divisi KUL untuk Membayar Hak Honorarium Belasan Ribu Personel Ad Hoc',
    type: 'table_rekap3',
    notes: `Pimpinan KPU Provinsi yang kami hormati,\n\nSlide keenam ini memvisualisasikan Rekapitulasi Perencanaan No. 3, yakni penyebaran pagu anggaran per Komisioner Divisi pengampu melalui Horizontal Bar Chart:\n\nKami ingin memberikan penajaman khusus mengenai posisi Divisi KUL dan Divisi PARSDM:\n- Divisi Keuangan, Umum & Logistik (KUL) mengampu pagu terbesar yakni Rp 37,82 Miliar atau 54,86%. Mengapa KUL paling besar? Karena seluruh kluster pembayaran Honorarium Badan Ad Hoc (Akun 521213 senilai Rp 26,17 Miliar) serta pengadaan logistik utama pemungutan suara (Rp 7,50 Miliar) diadministrasikan di bawah Divisi KUL.\n- Divisi Sosdiklih, Parmas & SDM (PARSDM) mengampu Rp 21,03 Miliar atau 30,50%, yang difokuskan pada pendidikan pemilih, publikasi, sosialisasi, event tatap muka, bimtek terpadu, dan santunan kecelakaan kerja ad hoc (Akun 521219).\n- Tiga divisi lainnya menyerap porsi yang proporsional sesuai tahapan: Divisi Teknis Rp 6,37 Miliar (9,24%), Divisi Rendatin Rp 2,59 Miliar (3,75%), dan Divisi Hukum Rp 1,14 Miliar (1,65%).`
  },
  {
    num: 7,
    tag: 'PORTOFOLIO DIVISI',
    title: 'Fokus Program Prioritas 5 Komisioner Divisi',
    subtitle: 'Rincian Output Kunci dan Tanggung Jawab Manajerial Tiap Komisioner',
    type: 'divisi_focus',
    notes: `Pimpinan KPU Provinsi yang kami hormati,\n\nSlide ini mempertegas rincian output dari masing-masing Komisioner Divisi:\n- Divisi KUL memastikan zero delay pada pembayaran hak honorarium ribuan personel ad hoc tepat waktu, serta memastikan 'tepat jenis, tepat jumlah, tepat kualitas, dan tepat waktu' pada distribusi logistik TPS.\n- Divisi PARSDM menargetkan peningkatan partisipasi pemilih di atas 80% dengan menjangkau basis pemilih marjinal, pemula, dan disabilitas di 217 desa, sekaligus menjamin santunan resiko kerja lapangan.\n- Divisi Teknis menjamin tahapan pencalonan steril dari maladministrasi serta rekapitulasi berjenjang yang transparan.\n- Divisi Rendatin memastikan akurasi data pemilih bebas dari data ganda dan invalid melalui optimalisasi sistem Sidalih.\n- Divisi Hukum menjamin kepatuhan regulasi dan kesiapan advokasi jika terjadi perselisihan hasil pemilu (PHPU).\n\nDengan pembagian peran yang tegas ini, kami menjamin seluruh mata anggaran memiliki pimpinan penanggung jawab yang jelas.`
  },
  {
    num: 8,
    tag: 'REKAP PERENCANAAN NO. 5',
    title: 'Formula & Rekapitulasi Pendanaan Bersama (Cost-Sharing)',
    subtitle: 'Komparasi Proporsional Beban Fiskal APBD Kabupaten Ngawi vs APBD Provinsi Jawa Timur',
    type: 'cost_sharing_overview',
    notes: `Bapak/Ibu Tim Anggaran KPU Provinsi Jawa Timur yang kami muliakan,\n\nPada slide kedelapan ini, kami menampilkan Dual Chart Dashboard Rekapitulasi Perencanaan No. 5, yaitu Formula Pendanaan Bersama (Cost-Sharing):\n\nDari total usulan bersama Rp 68,94 Miliar:\n- Beban APBD Kabupaten Ngawi (NPHD Pemkab) dialokasikan sebesar Rp 56,63 Miliar atau 82,15%.\n- Dukungan Sharing APBD Provinsi Jawa Timur dialokasikan sebesar Rp 12,30 Miliar atau 17,85%.\n\nMelalui Stacked Column Chart di sebelah kanan, terlihat jelas bahwa beban terbesar sharing Provinsi difokuskan pada Divisi KUL (sebesar Rp 7,80 Miliar untuk honor Pantarlih dan sharing PPK) serta Divisi PARSDM (sebesar Rp 3,24 Miliar untuk operasional PPS dan konsumsi KPPS).\n\nFormula ini telah kami susun secara harmonis agar tidak ada satu pun komponen biaya yang tumpang tindih atau dibiayai ganda (double-funding) antara Pemkab Ngawi dan Pemprov Jatim.`
  },
  {
    num: 9,
    tag: 'KLUSTER BADAN AD HOC',
    title: 'Kluster Belanja Badan Ad Hoc: Honorarium & Operasional',
    subtitle: 'Distribusi Pagu Paling Produktif Menjangkau 15.000+ Penyelenggara di 217 Desa dan 1.393 TPS',
    type: 'adhoc_cluster',
    notes: `Bapak/Ibu sekalian,\n\nSlide kesembilan ini menyajikan profil belanja badan ad hoc senilai total Rp 45,86 Miliar yang divisualisasikan dalam Column Chart dan 4 Kartu Personel secara hierarkis terstruktur (PPK, PPS, TPS, dan Pantarlih):\n\n1. Tingkat PPK (19 Kecamatan): Menyerap Rp 5,55 Miliar (12,1%) untuk 152 personel (anggota PPK dan sekretariat kecamatan) beserta operasional pendukung kecamatan.\n2. Tingkat PPS (217 Desa/Kelurahan): Menyerap porsi terbesar senilai Rp 20,85 Miliar (45,5%) untuk membiayai 1.302 personel (anggota PPS dan staf sekretariat) beserta operasional sekretariat desa.\n3. Tingkat TPS (1.393 TPS): Menyerap Rp 15,47 Miliar (33,7%) untuk 12.537 personel KPPS dan Petugas Linmas di 1.393 TPS, termasuk bantuan operasional TPS dan konsumsi hari H.\n4. Tingkat Pantarlih: Menyerap Rp 3,98 Miliar (8,7%) untuk 1.393+ petugas pemutakhiran data pemilih yang bertugas door-to-door melayani 359.141 KK.\n\nSekali lagi kami tegaskan: Seluruh pembayaran honorarium ad hoc ini (Akun 521213: Rp 26,17 Miliar) dikelola di bawah tertib perbendaharaan Divisi KUL KPU Ngawi, dan 100% patuh pada standar SBML Kemenkeu.`
  },
  {
    num: 10,
    tag: 'KEPATUHAN STANDAR BIAYA (SBML)',
    title: 'Kepatuhan SBML: Standar Honorarium & Biaya Santunan Ad Hoc',
    subtitle: '100% Selaras dengan Surat Menkeu No. S-647/MK.02/2022 & Keputusan KPU RI No. 472 Tahun 2022',
    type: 'sbml_compliance',
    notes: `Bapak/Ibu Pimpinan dan Tim Pemeriksa KPU Provinsi Jawa Timur yang kami hormati,\n\nPada slide kesepuluh ini, kami menyajikan bukti kepatuhan mutlak perencanaan anggaran KPU Kabupaten Ngawi terhadap Standar Biaya Masukan Lainnya (SBML) yang diterbitkan oleh Kementerian Keuangan RI dan KPU RI:\n\n1. Kepatuhan Honorarium Badan Ad Hoc (Akun 521213 senilai Rp 26,17 Miliar):\n   Seluruh satuan honorarium penyelenggara ad hoc kami patuhi 100% sesuai plafon SBML Surat Menkeu Nomor S-647/MK.02/2022 dan Keputusan KPU RI Nomor 472 Tahun 2022:\n   - Tingkat PPK (19 Kecamatan): Ketua Rp 2.500.000/OB, Anggota Rp 2.200.000/OB, Sekretaris Rp 1.850.000/OB, dan Staf Pelaksana Rp 1.300.000/OB.\n   - Tingkat PPS (217 Desa/Kelurahan): Ketua Rp 1.500.000/OB, Anggota Rp 1.300.000/OB, Sekretaris Rp 1.150.000/OB, dan Staf Pelaksana Rp 1.050.000/OB.\n   - Tingkat Pantarlih: Rp 1.000.000/bulan untuk melayani pemutakhiran data 359.141 Kepala Keluarga.\n   - Tingkat KPPS (1.393 TPS): Ketua Rp 900.000/OB, Anggota Rp 850.000/OB, dan Petugas Ketertiban/Linmas TPS Rp 650.000/OB.\n   Kami tegaskan: Tidak ada mark-up dan tidak ada pengurangan hak honorarium sepeser pun. Seluruhnya tepat 100% pada batas plafon resmi tanpa deviasi (Rp 0).\n\n2. Kepatuhan Biaya Santunan Kecelakaan Kerja (Akun 521219 senilai Rp 2,28 Miliar):\n   Sebagai bentuk penghormatan kemanusiaan dan jaminan keselamatan kerja, KPU Ngawi mengalokasikan santunan kecelakaan kerja lapangan yang diampu oleh Divisi PARSDM dengan 5 standar kategori resmi SBML:\n   - Santunan Meninggal Dunia: Rp 36.000.000 per orang.\n   - Santunan Cacat Permanen: Rp 30.800.000 per orang.\n   - Santunan Luka/Sakit Berat: Rp 16.500.000 per orang.\n   - Bantuan Biaya Pemakaman: Rp 10.000.000 per orang.\n   - Santunan Luka/Sakit Sedang: Rp 8.250.000 per orang.\n\nSatu hal yang menjadi komitmen moral KPU Kabupaten Ngawi: Perlindungan santunan ini tidak diskriminatif. Kami memasukkan secara penuh petugas Pantarlih/PPDP dengan alokasi khusus Rp 456.600.000 untuk 1.393+ petugas coklit door-to-door, setara dengan perlindungan yang dinikmati KPPS, PPS, dan PPK.\n\nDengan kepatuhan 100% pada SBML ini, kami menjamin usulan anggaran KPU Ngawi akuntabel, terlindungi secara hukum, dan clean and clear dari potensi temuan auditor keuangan negara.`
  },
  {
    num: 11,
    tag: 'KONSOLIDASI STAKEHOLDER',
    title: 'Upaya Komunikasi & Konsolidasi Pemangku Kepentingan Daerah',
    subtitle: 'Progres Koordinasi Strategis Bersama Lembaga Legislatif dan Eksekutif Kabupaten Ngawi',
    type: 'stakeholder_cards',
    notes: `Pimpinan dan Anggota KPU Provinsi Jawa Timur yang kami banggakan,\n\nSebelum memasuki kesimpulan, pada slide kesebelas ini kami laporkan langkah proaktif komunikasi kelembagaan yang telah dan sedang kami laksanakan bersama pemangku kepentingan di Kabupaten Ngawi:\n\n1. Audiensi dan Konsultasi Kelembagaan bersama Pimpinan dan Komisi DPRD Kabupaten Ngawi (28 November 2026):\n   KPU Kabupaten Ngawi berinisiatif memaparkan proyeksi kebutuhan anggaran Pilkada 2029 di hadapan wakil rakyat guna membangun kesepahaman, transparansi, serta permohonan dukungan politik anggaran demi kelancaran pesta demokrasi daerah.\n\n2. Koordinasi Teknis Kesiapan Pendanaan Hibah bersama Bakesbangpol Kabupaten Ngawi (28 November 2026):\n   Sebagai leading sector urusan hibah daerah, kami berkoordinasi intensif dengan jajaran Bakesbangpol Pemkab Ngawi untuk menyelaraskan draf usulan NPHD, verifikasi persyaratan administrasi keuangan daerah, serta sinkronisasi kerangka waktu pencairan APBD.\n\nLangkah konsolidasi simultan ini membuktikan bahwa KPU Kabupaten Ngawi terus menjalin sinergi erat dengan pemerintah daerah dan legislatif demi kepastian pendanaan Pilkada.`
  },
  {
    num: 12,
    tag: 'KOMITMEN & PENUTUP',
    title: 'Komitmen Integritas Penyelenggaraan Pilkada 2029',
    subtitle: 'Komisi Pemilihan Umum Kabupaten Ngawi — Satker 657811',
    type: 'closing',
    notes: `Bapak/Ibu Pimpinan dan Tim Pemeriksa KPU Provinsi Jawa Timur yang kami muliakan,\n\nSebagai penutup dari seluruh paparan usulan Rencana Kebutuhan Biaya (RKB) KPU Kabupaten Ngawi hari ini, kami tidak menyampaikan kesimpulan teknis yang berpanjang-panjang, melainkan mempersembahkan komitmen moral dan profesional seluruh jajaran komisioner dan sekretariat dalam satu tagline penutup:\n\n“AKUNTABEL DI SETIAP RUPIAH, MELAYANI DI SETIAP TAHAPAN”\n\nDan izinkan kami menutup paparan hari ini dengan dua bait pantun khas Bumi Oepak Ngawi:\n\nPergi ke Ngawi membeli gerabah,\nSinggah sebentar di Benteng Pendem.\nPerencanaan presisi tertib amanah,\nPilkada sukses, Jawa Timur adem tentrem.\n\n(Cakep!)\n\nKayu jati diukir rapi,\nKuat terpancang penopang istana.\nUsulan RKB kami serahkan sepenuh hati,\nSiap diselaraskan demi sukses pilkada.\n\nMatur suwun sanget atas bimbingan, perhatian, dan arahan Pimpinan KPU Provinsi Jawa Timur.\nWabilahi taufiq wal hidayah, Wassalamu’alaikum Warahmatullahi Wabarakatuh.`
  }
];

// ============================================================================
// FUNGSI PEMBUAT POWERPOINT (PPTX) - 12 SLIDE (TAGLINE & PANTUN)
// ============================================================================
async function generatePowerPoint() {
  console.log('[PPTX] Memulai pembuatan file presentasi PowerPoint dengan Tagline & Pantun Penutup...');
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE'; // Standard Widescreen 16:9 modern (13.333" x 7.500")
  pres.author = 'KPU Kabupaten Ngawi (Satker 657811)';
  pres.company = 'Komisi Pemilihan Umum';
  pres.subject = 'Usulan Perencanaan RKB Pilkada Serentak 2029';
  pres.title = 'Paparan RKB KPU Ngawi 2029';

  const COLOR = {
    darkNavy: '0F172A',
    navy: '1E3A8A',
    blue: '2563EB',
    lightBlue: 'EFF6FF',
    slateDark: '1E293B',
    slateMuted: '64748B',
    slateLight: 'F8FAFC',
    border: 'CBD5E1',
    white: 'FFFFFF',
    amber: 'D97706',
    amberLight: 'FEF3C7',
    emerald: '059669',
    emeraldLight: 'D1FAE5',
    purple: '7C3AED',
    purpleLight: 'F3E8FF',
    rose: 'BE123C',
    roseLight: 'FFE4E6'
  };

  function addHeaderFooter(slide, tagText, titleText, subtitleText, slideNum) {
    // Header Tag Pill (Font 14)
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.8, y: 0.28, w: 4.8, h: 0.40,
      fill: { color: COLOR.lightBlue }, line: { color: COLOR.blue, width: 1.2 }
    });
    slide.addText(tagText, {
      x: 0.8, y: 0.28, w: 4.8, h: 0.40,
      fontSize: 14, fontFace: 'Calibri', bold: true, color: COLOR.navy, align: 'center', valign: 'middle'
    });

    // Title (Besar & Tegas - Font 22)
    slide.addText(titleText, {
      x: 0.8, y: 0.72, w: 11.73, h: 0.50,
      fontSize: 22, fontFace: 'Calibri', bold: true, color: COLOR.darkNavy, valign: 'top'
    });

    // Subtitle (Font 14)
    slide.addText(subtitleText, {
      x: 0.8, y: 1.20, w: 11.73, h: 0.35,
      fontSize: 14, fontFace: 'Calibri', color: COLOR.slateMuted, valign: 'top'
    });

    // Bottom Line & Footer (Font 14)
    slide.addShape(pres.shapes.LINE, {
      x: 0.8, y: 6.82, w: 11.73, h: 0,
      line: { color: COLOR.border, width: 0.8 }
    });
    slide.addText('KPU Kabupaten Ngawi — Satker 657811 | Perencanaan Pilkada 2029', {
      x: 0.8, y: 6.88, w: 8.5, h: 0.36,
      fontSize: 14, fontFace: 'Calibri', color: COLOR.slateMuted
    });
    slide.addText(`Slide ${slideNum} dari 12`, {
      x: 9.5, y: 6.88, w: 3.03, h: 0.36,
      fontSize: 14, fontFace: 'Calibri', bold: true, color: COLOR.navy, align: 'right'
    });
  }

  for (const s of SLIDES) {
    const slide = pres.addSlide();
    slide.bkgd = COLOR.white;
    if (s.notes) slide.notes = s.notes;

    // SLIDE 1: COVER
    if (s.type === 'cover') {
      slide.addShape(pres.shapes.RECTANGLE, {
        x: 0, y: 0, w: '100%', h: '100%',
        fill: { color: COLOR.darkNavy }
      });
      slide.addShape(pres.shapes.RECTANGLE, {
        x: 0, y: 0, w: 0.35, h: '100%',
        fill: { color: COLOR.amber }
      });

      // Main Title (Besar, Megah & Tanpa Tulisan Dokumen Resmi Pleno KPU Ngawi)
      slide.addText(s.title, {
        x: 1.2, y: 1.20, w: 11.2, h: 2.10,
        fontSize: 32, fontFace: 'Calibri', bold: true, color: COLOR.white, lineSpacingMultiple: 1.15
      });

      slide.addShape(pres.shapes.LINE, {
        x: 1.2, y: 3.50, w: 7.5, h: 0,
        line: { color: COLOR.blue, width: 4.0 }
      });

      slide.addText(s.subtitle, {
        x: 1.2, y: 3.70, w: 10.5, h: 1.1,
        fontSize: 15, fontFace: 'Calibri', color: '94A3B8', lineSpacingMultiple: 1.2
      });

      // Key Metrics Box in Cover (Font Minimal 14)
      const coverBoxes = [
        { label: 'TOTAL PAGU BERSAMA', val: 'Rp 68,94 M' },
        { label: 'BEBAN APBD KABUPATEN', val: 'Rp 56,63 M (82,1%)' },
        { label: 'SHARING APBD PROVINSI', val: 'Rp 12,30 M (17,9%)' }
      ];
      coverBoxes.forEach((cb, idx) => {
        const bx = 1.2 + (idx * 3.8);
        slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
          x: bx, y: 5.20, w: 3.5, h: 1.35,
          fill: { color: '1E293B' }, line: { color: '334155', width: 1.2 }
        });
        slide.addText(cb.label, {
          x: bx + 0.2, y: 5.32, w: 3.1, h: 0.35,
          fontSize: 14, fontFace: 'Calibri', bold: true, color: '94A3B8'
        });
        slide.addText(cb.val, {
          x: bx + 0.2, y: 5.68, w: 3.1, h: 0.75,
          fontSize: 22, fontFace: 'Consolas', bold: true, color: COLOR.amber
        });
      });
      continue;
    }

    addHeaderFooter(slide, s.tag, s.title, s.subtitle, s.num);

    // SLIDE 2: CARDS (Dasar Hukum - Font Minimal 14)
    if (s.type === 'cards') {
      const items = s.items;
      items.forEach((it, idx) => {
        const cy = 1.55 + (idx * 1.00);
        slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
          x: 0.8, y: cy, w: 11.73, h: 0.92,
          fill: { color: COLOR.slateLight }, line: { color: COLOR.border, width: 0.8 }
        });
        slide.addShape(pres.shapes.RECTANGLE, {
          x: 0.8, y: cy, w: 0.18, h: 0.92,
          fill: { color: COLOR.navy }
        });
        slide.addText(it.header, {
          x: 1.2, y: cy + 0.08, w: 11.0, h: 0.36,
          fontSize: 16, fontFace: 'Calibri', bold: true, color: COLOR.navy
        });
        slide.addText(it.text, {
          x: 1.2, y: cy + 0.44, w: 11.0, h: 0.44,
          fontSize: 14, fontFace: 'Calibri', color: COLOR.textDark
        });
      });
    }

    // SLIDE 3: STEPS (SOP Penyusunan - Font Minimal 14)
    else if (s.type === 'steps') {
      const steps = s.steps;
      steps.forEach((st, idx) => {
        const sx = 0.8 + (idx * 4.0);
        slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
          x: sx, y: 1.60, w: 3.73, h: 4.95,
          fill: { color: COLOR.slateLight }, line: { color: COLOR.border, width: 1 }
        });
        slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
          x: sx + 0.3, y: 1.85, w: 1.0, h: 0.95,
          fill: { color: COLOR.navy }
        });
        slide.addText(st.num, {
          x: sx + 0.3, y: 1.85, w: 1.0, h: 0.95,
          fontSize: 24, fontFace: 'Calibri', bold: true, color: COLOR.white, align: 'center', valign: 'middle'
        });
        slide.addText(st.title, {
          x: sx + 0.3, y: 2.95, w: 3.13, h: 0.65,
          fontSize: 17, fontFace: 'Calibri', bold: true, color: COLOR.navy
        });
        slide.addShape(pres.shapes.LINE, {
          x: sx + 0.3, y: 3.65, w: 3.13, h: 0,
          line: { color: COLOR.border, width: 0.8 }
        });
        slide.addText(st.desc, {
          x: sx + 0.3, y: 3.75, w: 3.13, h: 2.65,
          fontSize: 14, fontFace: 'Calibri', color: COLOR.textDark, lineSpacingMultiple: 1.15
        });
      });
    }

    // SLIDE 4: METRICS (Parameter SSOT - Font Minimal 14)
    else if (s.type === 'metrics') {
      const metrics = s.metrics;
      metrics.forEach((m, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const mx = 0.8 + (col * 4.0);
        const my = 1.60 + (row * 2.50);

        slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
          x: mx, y: my, w: 3.73, h: 2.28,
          fill: { color: COLOR.slateLight }, line: { color: COLOR.border, width: 1 }
        });
        slide.addShape(pres.shapes.RECTANGLE, {
          x: mx, y: my, w: 3.73, h: 0.08,
          fill: { color: idx === 3 ? COLOR.amber : COLOR.blue }
        });
        slide.addText(m.val, {
          x: mx + 0.25, y: my + 0.12, w: 3.23, h: 0.75,
          fontSize: 34, fontFace: 'Calibri', bold: true, color: idx === 3 ? COLOR.amber : COLOR.navy
        });
        slide.addText(m.label, {
          x: mx + 0.25, y: my + 0.88, w: 3.23, h: 0.45,
          fontSize: 16, fontFace: 'Calibri', bold: true, color: COLOR.darkNavy
        });
        slide.addText(m.sub, {
          x: mx + 0.25, y: my + 1.35, w: 3.23, h: 0.85,
          fontSize: 14, fontFace: 'Calibri', color: COLOR.slateMuted, lineSpacingMultiple: 1.15
        });
      });
    }

    // SLIDE 5: DOUGHNUT CHART + DASHBOARD (Rekap 1 - Font Minimal 14)
    else if (s.type === 'table_rekap1') {
      const doughnutData = [{
        name: 'Porsi Anggaran',
        labels: [
          'KPU Kab (21,2%)',
          'PPK 19 Kec (8,1%)',
          'PPS 217 Desa (30,2%)',
          'TPS 1.393 (22,4%)',
          'Pantarlih (5,8%)',
          'Paslon (12,3%)'
        ],
        values: [14.62, 5.55, 20.85, 15.47, 3.98, 8.46]
      }];

      slide.addChart(pres.ChartType.doughnut, doughnutData, {
        x: 0.8, y: 1.60, w: 6.0, h: 4.90,
        holeSize: 52,
        showLegend: true,
        legendPos: 'b',
        legendFontSize: 14,
        showPercent: true,
        chartColors: ['1E3A8A', '2563EB', '64748B', 'D97706', '059669', '7C3AED'],
        dataLabelColor: 'FFFFFF',
        dataLabelFontSize: 14,
        dataLabelFontBold: true
      });

      // Right: Side Dashboard Panel
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 7.1, y: 1.60, w: 5.43, h: 4.90,
        fill: { color: COLOR.slateLight }, line: { color: COLOR.border, width: 1 }
      });

      // Callout Box
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 7.35, y: 1.75, w: 4.93, h: 1.25,
        fill: { color: COLOR.lightBlue }, line: { color: COLOR.blue, width: 1.2 }
      });
      slide.addText('TOTAL ANGGARAN LANGSUNG KE LAPANGAN', {
        x: 7.5, y: 1.82, w: 4.63, h: 0.32,
        fontSize: 14, fontFace: 'Calibri', bold: true, color: COLOR.navy
      });
      slide.addText('66,52% (Rp 45,86 Miliar)', {
        x: 7.5, y: 2.15, w: 4.63, h: 0.52,
        fontSize: 26, fontFace: 'Calibri', bold: true, color: COLOR.blue
      });
      slide.addText('Dialokasikan untuk operasional & honorarium desa & TPS.', {
        x: 7.5, y: 2.68, w: 4.63, h: 0.30,
        fontSize: 14, fontFace: 'Calibri', color: COLOR.slateMuted
      });

      // 6 Metric Badges
      const sasaranList = [
        { label: 'KPU Satker Kab', val: 'Rp 14,62 M (21,21%)', color: '2563EB' },
        { label: 'PPK (19 Kecamatan)', val: 'Rp 5,55 M (8,05%)', color: '059669' },
        { label: 'PPS (217 Desa/Kel)', val: 'Rp 20,85 M (30,25%)', color: '1E3A8A' },
        { label: 'TPS (1.393 TPS)', val: 'Rp 15,47 M (22,44%)', color: 'D97706' },
        { label: 'Pantarlih Coklit', val: 'Rp 3,98 M (5,78%)', color: '7C3AED' },
        { label: 'Fasilitasi Paslon', val: 'Rp 8,46 M (12,27%)', color: 'BE123C' }
      ];

      sasaranList.forEach((st, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const px = 7.35 + (col * 2.52);
        const py = 3.12 + (row * 0.95);

        slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
          x: px, y: py, w: 2.41, h: 0.86,
          fill: { color: COLOR.white }, line: { color: COLOR.border, width: 0.8 }
        });
        slide.addShape(pres.shapes.RECTANGLE, {
          x: px, y: py, w: 0.1, h: 0.86,
          fill: { color: st.color }
        });
        slide.addText(st.label, {
          x: px + 0.18, y: py + 0.08, w: 2.15, h: 0.32,
          fontSize: 14, fontFace: 'Calibri', bold: true, color: COLOR.navy
        });
        slide.addText(st.val, {
          x: px + 0.18, y: py + 0.42, w: 2.15, h: 0.38,
          fontSize: 14, fontFace: 'Consolas', bold: true, color: COLOR.darkNavy
        });
      });

      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 7.35, y: 6.05, w: 4.93, h: 0.40,
        fill: { color: COLOR.emeraldLight }, line: { color: COLOR.emerald, width: 0.8 }
      });
      slide.addText('Belanja Satker Kabupaten ditekan 21,21% demi efektivitas hari-H.', {
        x: 7.45, y: 6.05, w: 4.73, h: 0.40,
        fontSize: 14, fontFace: 'Calibri', bold: true, color: COLOR.emerald, align: 'center', valign: 'middle'
      });
    }

    // SLIDE 6: HORIZONTAL BAR CHART + DIVISION BREAKDOWN (Rekap 3 - Font Minimal 14)
    else if (s.type === 'table_rekap3') {
      const barData = [{
        name: 'Pagu Anggaran',
        labels: [
          'HUKUM (1,6%)',
          'RENDATIN (3,8%)',
          'TEKNIS (9,2%)',
          'PARSDM (30,5%)',
          'KUL (54,9%)'
        ],
        values: [1.14, 2.59, 6.37, 21.03, 37.82]
      }];

      slide.addChart(pres.ChartType.bar, barData, {
        x: 0.8, y: 1.60, w: 6.3, h: 4.90,
        barDir: 'bar',
        showLegend: false,
        showValue: true,
        chartColors: ['2563EB'],
        dataLabelColor: '1E3A8A',
        dataLabelFontSize: 14,
        dataLabelFontBold: true,
        catAxisLabelFontSize: 14,
        catAxisLabelColor: COLOR.navy
      });

      // Right: 5 Division Info Badges
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 7.35, y: 1.60, w: 5.18, h: 4.90,
        fill: { color: COLOR.slateLight }, line: { color: COLOR.border, width: 1 }
      });

      const divBreakdown = [
        {
          code: 'KUL (Rp 37,82 M / 54,9%)',
          color: COLOR.blue,
          desc: 'Honorarium Ad Hoc (26,17 M) • Logistik TPS • Gudang'
        },
        {
          code: 'PARSDM (Rp 21,03 M / 30,5%)',
          color: COLOR.emerald,
          desc: 'Sosdiklih & Media • Event/Debat • Santunan Kerja (2,28 M)'
        },
        {
          code: 'TEKNIS (Rp 6,37 M / 9,2%)',
          color: COLOR.amber,
          desc: 'Pencalonan • Bimtek Tungsura 1.393 KPPS • Rekapitulasi'
        },
        {
          code: 'RENDATIN (Rp 2,59 M / 3,8%)',
          color: COLOR.purple,
          desc: 'Pemutakhiran Sidalih 359.141 KK • Operator Data'
        },
        {
          code: 'HUKUM (Rp 1,14 M / 1,6%)',
          color: COLOR.rose,
          desc: 'Advokasi Sengketa PHPU di MK • Telaah Regulasi & Etik'
        }
      ];

      divBreakdown.forEach((db, idx) => {
        const dy = 1.75 + (idx * 0.94);
        slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
          x: 7.55, y: dy, w: 4.78, h: 0.84,
          fill: { color: COLOR.white }, line: { color: COLOR.border, width: 0.8 }
        });
        slide.addShape(pres.shapes.RECTANGLE, {
          x: 7.55, y: dy, w: 0.14, h: 0.84,
          fill: { color: db.color }
        });
        slide.addText(db.code, {
          x: 7.8, y: dy + 0.08, w: 4.4, h: 0.32,
          fontSize: 15, fontFace: 'Calibri', bold: true, color: db.color
        });
        slide.addText(db.desc, {
          x: 7.8, y: dy + 0.40, w: 4.4, h: 0.38,
          fontSize: 14, fontFace: 'Calibri', color: COLOR.textDark
        });
      });
    }

    // SLIDE 7: DIVISI FOCUS (Font Minimal 14)
    else if (s.type === 'divisi_focus') {
      const items = [
        { div: 'Divisi KUL\n(Rp 37,82 M / 54,9%)', color: COLOR.blue, text: '• Honorarium 15.000+ personel ad hoc non-tunai tepat waktu\n• Pengadaan logistik surat suara, kotak, bilik e-Katalog LKPP\n• Pergudangan & distribusi aman ke 19 kecamatan & 217 desa' },
        { div: 'Divisi PARSDM\n(Rp 21,03 M / 30,5%)', color: COLOR.emerald, text: '• Sosialisasi intensif pemilih marjinal, pemula, disabilitas\n• Kemitraan media massa, seni budaya lokal & debat paslon\n• Jaminan santunan perlindungan kecelakaan kerja ad hoc' },
        { div: 'Divisi TEKNIS\n(Rp 6,37 M / 9,2%)', color: COLOR.amber, text: '• Verifikasi administrasi & faktual pencalonan bupati/wabup\n• Bimtek terpadu Tungsura bagi 1.393 KPPS & 19 PPK\n• Rekapitulasi penghitungan suara berjenjang model C-Hasil' },
        { div: 'Divisi RENDATIN\n(Rp 2,59 M / 3,8%)', color: COLOR.purple, text: '• Pemutakhiran berkelanjutan 359.141 KK & 750.525 DPT Sidalih\n• Bimbingan teknis operator data guna eliminasi data ganda\n• Penguatan server, keamanan siber & jaringan komunikasi' },
        { div: 'Divisi HUKUM\n(Rp 1,14 M / 1,6%)', color: COLOR.rose, text: '• Telaah legalitas keputusan KPU & regulasi teknis tahapan\n• Advokasi penanganan sengketa PHPU di Mahkamah Konstitusi\n• Pengawasan internal & penegakan kode etik penyelenggara' }
      ];
      items.forEach((it, idx) => {
        const iy = 1.55 + (idx * 1.00);
        slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
          x: 0.8, y: iy, w: 11.73, h: 0.92,
          fill: { color: COLOR.slateLight }, line: { color: COLOR.border, width: 0.8 }
        });
        slide.addShape(pres.shapes.RECTANGLE, {
          x: 0.8, y: iy, w: 0.20, h: 0.92,
          fill: { color: it.color }
        });
        slide.addText(it.div, {
          x: 1.15, y: iy + 0.08, w: 3.5, h: 0.76,
          fontSize: 15, fontFace: 'Calibri', bold: true, color: it.color, lineSpacingMultiple: 1.1
        });
        slide.addText(it.text, {
          x: 4.8, y: iy + 0.08, w: 7.5, h: 0.76,
          fontSize: 14, fontFace: 'Calibri', color: COLOR.textDark, lineSpacingMultiple: 1.1
        });
      });
    }

    // SLIDE 8: DUAL CHART DASHBOARD (Cost Sharing - Font Minimal 14)
    else if (s.type === 'cost_sharing_overview') {
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 0.8, y: 1.60, w: 5.3, h: 4.90,
        fill: { color: COLOR.slateLight }, line: { color: COLOR.border, width: 1 }
      });
      slide.addText('KOMPOSISI MAKRO SHARING FISKAL', {
        x: 1.05, y: 1.75, w: 4.8, h: 0.35,
        fontSize: 16, fontFace: 'Calibri', bold: true, color: COLOR.navy, align: 'center'
      });

      const donutData = [{
        name: 'Sharing Fiskal',
        labels: ['Kab. Ngawi (82,15%)', 'Prov. Jatim (17,85%)'],
        values: [56.63, 12.30]
      }];
      slide.addChart(pres.ChartType.doughnut, donutData, {
        x: 1.0, y: 2.10, w: 4.9, h: 3.20,
        holeSize: 55,
        showLegend: true,
        legendPos: 'b',
        legendFontSize: 14,
        showPercent: true,
        chartColors: ['1E3A8A', 'D97706'],
        dataLabelColor: 'FFFFFF',
        dataLabelFontSize: 14,
        dataLabelFontBold: true
      });

      slide.addText('Total Bersama: Rp 68,94 Miliar\nAPBD Kab: Rp 56,63 M (82,1%) | APBD Prov: Rp 12,30 M (17,9%)', {
        x: 1.05, y: 5.75, w: 4.8, h: 0.60,
        fontSize: 14, fontFace: 'Calibri', bold: true, color: COLOR.navy, align: 'center'
      });

      // Right Chart: Stacked Column Chart
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 6.35, y: 1.60, w: 6.18, h: 4.90,
        fill: { color: COLOR.slateLight }, line: { color: COLOR.border, width: 1 }
      });
      slide.addText('BEBAN FISKAL PER KOMISIONER DIVISI (Rp M)', {
        x: 6.55, y: 1.75, w: 5.78, h: 0.35,
        fontSize: 16, fontFace: 'Calibri', bold: true, color: COLOR.navy, align: 'center'
      });

      const stackData = [
        {
          name: 'APBD Kab. Ngawi',
          labels: ['KUL', 'PARSDM', 'TEKNIS', 'RENDATIN', 'HUKUM'],
          values: [30.02, 17.79, 5.22, 2.47, 1.14]
        },
        {
          name: 'Sharing Prov. Jatim',
          labels: ['KUL', 'PARSDM', 'TEKNIS', 'RENDATIN', 'HUKUM'],
          values: [7.80, 3.24, 1.15, 0.11, 0.00]
        }
      ];

      slide.addChart(pres.ChartType.bar, stackData, {
        x: 6.55, y: 2.10, w: 5.78, h: 3.80,
        barDir: 'col',
        barGrouping: 'stacked',
        showLegend: true,
        legendPos: 't',
        legendFontSize: 14,
        showValue: true,
        chartColors: ['1E3A8A', 'D97706'],
        dataLabelColor: 'FFFFFF',
        dataLabelFontSize: 14,
        dataLabelFontBold: true
      });

      slide.addText('Provinsi menanggung porsi signifikan pada KUL (Rp 7,80 M) & PARSDM (Rp 3,24 M)', {
        x: 6.55, y: 6.02, w: 5.78, h: 0.38,
        fontSize: 14, fontFace: 'Calibri', italic: true, color: COLOR.slateMuted, align: 'center'
      });
    }

    // SLIDE 9: COLUMN CHART + AD HOC STATS (Font Minimal 14)
    else if (s.type === 'adhoc_cluster') {
      const adhocData = [{
        name: 'Pagu Ad Hoc (Rp M)',
        labels: [
          'PPK 19 Kec (12,1%)',
          'PPS 217 Desa (45,5%)',
          'TPS 1.393 (33,7%)',
          'Pantarlih (8,7%)'
        ],
        values: [5.55, 20.85, 15.47, 3.98]
      }];

      slide.addChart(pres.ChartType.bar, adhocData, {
        x: 0.8, y: 1.60, w: 6.20, h: 4.90,
        barDir: 'col',
        showLegend: false,
        showValue: true,
        chartColors: ['1E3A8A'],
        dataLabelColor: '1E3A8A',
        dataLabelFontSize: 14,
        dataLabelFontBold: true,
        catAxisLabelFontSize: 14,
        catAxisLabelColor: COLOR.navy
      });

      // Right: 4 Personnel Count Badges
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 7.25, y: 1.60, w: 5.28, h: 4.90,
        fill: { color: COLOR.slateLight }, line: { color: COLOR.border, width: 1 }
      });

      const personnelCards = [
        { level: 'PPK (19 Kecamatan)', orang: '152 Orang', sub: '5 Komisioner + 3 Sekretariat x 19 Kecamatan', color: COLOR.blue },
        { level: 'PPS (217 Desa/Kelurahan)', orang: '1.302 Orang', sub: '3 Komisioner + 3 Sekretariat x 217 Desa', color: COLOR.emerald },
        { level: 'TPS (1.393 TPS)', orang: '12.537 Orang', sub: '7 KPPS + 2 Petugas Linmas x 1.393 TPS', color: COLOR.amber },
        { level: 'Pantarlih / PPDP Coklit', orang: '1.393+ Petugas', sub: 'Pencocokan & Penelitian Mandiri 359.141 KK', color: COLOR.purple }
      ];

      personnelCards.forEach((pc, idx) => {
        const py = 1.75 + (idx * 0.96);
        slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
          x: 7.45, y: py, w: 4.88, h: 0.86,
          fill: { color: COLOR.white }, line: { color: COLOR.border, width: 0.8 }
        });
        slide.addShape(pres.shapes.RECTANGLE, {
          x: 7.45, y: py, w: 0.14, h: 0.86,
          fill: { color: pc.color }
        });
        slide.addText(pc.level, {
          x: 7.7, y: py + 0.08, w: 2.7, h: 0.32,
          fontSize: 15, fontFace: 'Calibri', bold: true, color: pc.color
        });
        slide.addText(pc.orang, {
          x: 10.3, y: py + 0.08, w: 1.9, h: 0.32,
          fontSize: 16, fontFace: 'Consolas', bold: true, color: COLOR.darkNavy, align: 'right'
        });
        slide.addText(pc.sub, {
          x: 7.7, y: py + 0.42, w: 4.5, h: 0.38,
          fontSize: 14, fontFace: 'Calibri', color: COLOR.slateMuted
        });
      });

      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 7.45, y: 5.70, w: 4.88, h: 0.68,
        fill: { color: COLOR.lightBlue }, line: { color: COLOR.blue, width: 1.2 }
      });
      slide.addText('Honorarium Ad Hoc (Akun 521213: Rp 26,17 M) dikelola Divisi KUL — 100% Sesuai SBML Menkeu S-647/MK.02/2022.', {
        x: 7.55, y: 5.74, w: 4.68, h: 0.60,
        fontSize: 14, fontFace: 'Calibri', bold: true, color: COLOR.navy, align: 'center'
      });
    }

    // SLIDE 10: KEPATUHAN STANDAR BIAYA MASUKAN LAINNYA (SBML - Font Minimal 14)
    else if (s.type === 'sbml_compliance' || s.type === 'santunan_table') {
      // 1. LEFT PANEL: HONORARIUM BADAN AD HOC (AKUN 521213)
      const lx = 0.8;
      const cardW = 5.72;
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: lx, y: 1.58, w: cardW, h: 4.30,
        fill: { color: COLOR.slateLight }, line: { color: COLOR.blue, width: 1.4 }
      });

      // Header Card Honor
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: lx + 0.2, y: 1.74, w: cardW - 0.4, h: 0.62,
        fill: { color: COLOR.navy }
      });
      slide.addText('1. STANDAR HONORARIUM AD HOC (AKUN 521213)', {
        x: lx + 0.3, y: 1.78, w: 3.3, h: 0.28,
        fontSize: 15, fontFace: 'Calibri', bold: true, color: COLOR.white
      });
      slide.addText('Total Pagu: Rp 26.171.600.000 (Divisi KUL)', {
        x: lx + 0.3, y: 2.06, w: 3.3, h: 0.26,
        fontSize: 14, fontFace: 'Calibri', color: '93C5FD'
      });
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: lx + cardW - 2.0, y: 1.84, w: 1.8, h: 0.42,
        fill: { color: COLOR.emerald }
      });
      slide.addText('100% PATUH SBML', {
        x: lx + cardW - 2.0, y: 1.84, w: 1.8, h: 0.42,
        fontSize: 14, fontFace: 'Calibri', bold: true, color: COLOR.white, align: 'center', valign: 'middle'
      });

      // Sub-cards Honor: PPK, PPS, Pantarlih, KPPS
      const honorList = [
        {
          role: 'PPK (19 Kecamatan)',
          color: COLOR.blue,
          rates: 'Ketua: Rp 2.500.000/OB  |  Anggota: Rp 2.200.000/OB\nSekretaris: Rp 1.850.000/OB  |  Staf: Rp 1.300.000/OB'
        },
        {
          role: 'PPS (217 Desa / Kelurahan)',
          color: COLOR.emerald,
          rates: 'Ketua: Rp 1.500.000/OB  |  Anggota: Rp 1.300.000/OB\nSekretaris: Rp 1.150.000/OB  |  Staf: Rp 1.050.000/OB'
        },
        {
          role: 'Pantarlih / PPDP Coklit (359.141 KK)',
          color: COLOR.purple,
          rates: 'Petugas Coklit: Rp 1.000.000 / Bulan (1.393+ Petugas)'
        },
        {
          role: 'KPPS & Pengamanan TPS (1.393 TPS)',
          color: COLOR.amber,
          rates: 'Ketua: Rp 900.000/OB  |  Anggota: Rp 850.000/OB\nPetugas Linmas / Ketertiban TPS: Rp 650.000/OB'
        }
      ];

      honorList.forEach((h, idx) => {
        const hy = 2.42 + (idx * 0.77);
        slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
          x: lx + 0.2, y: hy, w: cardW - 0.4, h: 0.71,
          fill: { color: COLOR.white }, line: { color: COLOR.border, width: 0.8 }
        });
        slide.addShape(pres.shapes.RECTANGLE, {
          x: lx + 0.2, y: hy, w: 0.12, h: 0.71,
          fill: { color: h.color }
        });
        slide.addText(h.role, {
          x: lx + 0.38, y: hy + 0.04, w: cardW - 0.6, h: 0.28,
          fontSize: 15, fontFace: 'Calibri', bold: true, color: h.color
        });
        slide.addText(h.rates, {
          x: lx + 0.38, y: hy + 0.32, w: cardW - 0.6, h: 0.36,
          fontSize: 14, fontFace: 'Calibri', color: COLOR.slateDark, lineSpacingMultiple: 1.05
        });
      });

      // Verification Footer Left Card
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: lx + 0.2, y: 5.52, w: cardW - 0.4, h: 0.32,
        fill: { color: COLOR.lightBlue }, line: { color: COLOR.blue, width: 0.8 }
      });
      slide.addText('Status: 100% Sesuai Plafon Tertinggi SBML (Deviasi Rp 0)', {
        x: lx + 0.2, y: 5.52, w: cardW - 0.4, h: 0.32,
        fontSize: 14, fontFace: 'Calibri', bold: true, color: COLOR.navy, align: 'center', valign: 'middle'
      });

      // 2. RIGHT PANEL: SANTUNAN KECELAKAAN KERJA (AKUN 521219)
      const rx = 6.81;
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: rx, y: 1.58, w: cardW, h: 4.30,
        fill: { color: COLOR.slateLight }, line: { color: COLOR.rose, width: 1.4 }
      });

      // Header Card Santunan
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: rx + 0.2, y: 1.74, w: cardW - 0.4, h: 0.62,
        fill: { color: COLOR.rose }
      });
      slide.addText('2. SANTUNAN KECELAKAAN KERJA (AKUN 521219)', {
        x: rx + 0.3, y: 1.78, w: 3.3, h: 0.28,
        fontSize: 15, fontFace: 'Calibri', bold: true, color: COLOR.white
      });
      slide.addText('Total Pagu: Rp 2.283.000.000 (Divisi PARSDM)', {
        x: rx + 0.3, y: 2.06, w: 3.3, h: 0.26,
        fontSize: 14, fontFace: 'Calibri', color: 'FFE4E6'
      });
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: rx + cardW - 2.0, y: 1.84, w: 1.8, h: 0.42,
        fill: { color: COLOR.darkNavy }
      });
      slide.addText('SBML KPU RI', {
        x: rx + cardW - 2.0, y: 1.84, w: 1.8, h: 0.42,
        fontSize: 14, fontFace: 'Calibri', bold: true, color: COLOR.amber, align: 'center', valign: 'middle'
      });

      // 5 Santunan Categories
      const santunanItems = [
        { jenis: 'Santunan Meninggal Dunia', tarif: 'Rp 36.000.000' },
        { jenis: 'Santunan Cacat Permanen', tarif: 'Rp 30.800.000' },
        { jenis: 'Santunan Luka / Sakit Berat', tarif: 'Rp 16.500.000' },
        { jenis: 'Bantuan Biaya Pemakaman', tarif: 'Rp 10.000.000' },
        { jenis: 'Santunan Luka / Sakit Sedang', tarif: 'Rp 8.250.000' }
      ];

      santunanItems.forEach((sItem, idx) => {
        const sy = 2.42 + (idx * 0.47);
        slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
          x: rx + 0.2, y: sy, w: cardW - 0.4, h: 0.42,
          fill: { color: COLOR.white }, line: { color: COLOR.border, width: 0.8 }
        });
        slide.addText(sItem.jenis, {
          x: rx + 0.35, y: sy + 0.06, w: 3.2, h: 0.30,
          fontSize: 14, fontFace: 'Calibri', bold: true, color: COLOR.darkNavy
        });
        slide.addText(sItem.tarif, {
          x: rx + 3.4, y: sy + 0.06, w: 1.9, h: 0.30,
          fontSize: 15, fontFace: 'Consolas', bold: true, color: COLOR.rose, align: 'right'
        });
      });

      // Pantarlih Protection Card (Bottom of Right Panel)
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: rx + 0.2, y: 4.85, w: cardW - 0.4, h: 0.97,
        fill: { color: COLOR.roseLight }, line: { color: COLOR.rose, width: 1 }
      });
      slide.addText('PROTEKSI SETARA HINGGA TINGKAT PANTARLIH / PPDP', {
        x: rx + 0.35, y: 4.90, w: cardW - 0.7, h: 0.28,
        fontSize: 15, fontFace: 'Calibri', bold: true, color: COLOR.rose
      });
      slide.addText('• Alokasi Khusus Pantarlih: Rp 456.600.000 untuk 1.393+ petugas coklit.\n• Perlindungan adil setara bagi seluruh ad hoc tanpa diskriminasi.', {
        x: rx + 0.35, y: 5.20, w: cardW - 0.7, h: 0.55,
        fontSize: 14, fontFace: 'Calibri', color: '881337', lineSpacingMultiple: 1.10
      });

      // 3. BOTTOM BANNER ACROSS BOTH
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 0.8, y: 5.96, w: 11.73, h: 0.60,
        fill: { color: COLOR.darkNavy }, line: { color: COLOR.amber, width: 1.5 }
      });
      slide.addText('LANDASAN SBML: Surat Menkeu No. S-647/MK.02/2022 jo. Keputusan KPU RI No. 472/2022\nSeluruh Komponen Honorarium & Santunan Terverifikasi 100% Patuh Plafon Standar Biaya Masukan Lainnya.', {
        x: 0.9, y: 5.98, w: 11.53, h: 0.56,
        fontSize: 14, fontFace: 'Calibri', bold: true, color: COLOR.white, align: 'center', lineSpacingMultiple: 1.10
      });
    }

    // SLIDE 11: STAKEHOLDER CARDS (Audiensi & Koordinasi - Font Minimal 14)
    else if (s.type === 'stakeholder_cards') {
      STATS.stakeholder.forEach((st, idx) => {
        const sx = 0.8 + (idx * 6.01);
        slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
          x: sx, y: 1.60, w: 5.72, h: 4.95,
          fill: { color: COLOR.slateLight }, line: { color: idx === 0 ? COLOR.navy : COLOR.emerald, width: 1.2 }
        });

        slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
          x: sx + 0.3, y: 1.82, w: 5.12, h: 0.68,
          fill: { color: idx === 0 ? COLOR.navy : COLOR.emerald }
        });
        slide.addText(st.instansi, {
          x: sx + 0.3, y: 1.82, w: 5.12, h: 0.68,
          fontSize: 17, fontFace: 'Calibri', bold: true, color: COLOR.white, align: 'center', valign: 'middle'
        });

        slide.addText('Bentuk Komunikasi Protokoler:', {
          x: sx + 0.3, y: 2.62, w: 5.12, h: 0.30,
          fontSize: 14, fontFace: 'Calibri', color: COLOR.slateMuted
        });
        slide.addText(st.istilah, {
          x: sx + 0.3, y: 2.92, w: 5.12, h: 0.48,
          fontSize: 16, fontFace: 'Calibri', bold: true, color: COLOR.darkNavy
        });

        slide.addText(`Jadwal Pelaksanaan: ${st.tanggal}`, {
          x: sx + 0.3, y: 3.45, w: 5.12, h: 0.32,
          fontSize: 15, fontFace: 'Calibri', bold: true, color: COLOR.blue
        });

        slide.addShape(pres.shapes.LINE, {
          x: sx + 0.3, y: 3.85, w: 5.12, h: 0,
          line: { color: COLOR.border, width: 0.8 }
        });

        slide.addText('Fokus Substansi & Target Output:', {
          x: sx + 0.3, y: 3.98, w: 5.12, h: 0.30,
          fontSize: 14, fontFace: 'Calibri', color: COLOR.slateMuted
        });
        slide.addText(st.agenda, {
          x: sx + 0.3, y: 4.30, w: 5.12, h: 2.15,
          fontSize: 14, fontFace: 'Calibri', color: COLOR.textDark, lineSpacingMultiple: 1.15
        });
      });
    }

    // SLIDE 12: GRAND FINALE - TAGLINE & PANTUN PERENCANAAN (Font Minimal 14)
    else if (s.type === 'closing') {
      // 1. TOP: GRAND EXECUTIVE TAGLINE BANNER (Dark Navy & Vibrant Gold Accent)
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 0.8, y: 1.58, w: 11.73, h: 2.50,
        fill: { color: COLOR.darkNavy }, line: { color: COLOR.amber, width: 2.5 }
      });

      // Top Tagline Pill
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 3.46, y: 1.74, w: 6.40, h: 0.44,
        fill: { color: '1E293B' }, line: { color: COLOR.amber, width: 1.2 }
      });
      slide.addText('TAGLINE & KOMITMEN UTAMA KPU KABUPATEN NGAWI', {
        x: 3.46, y: 1.74, w: 6.40, h: 0.44,
        fontSize: 14, fontFace: 'Calibri', bold: true, color: COLOR.amber, align: 'center', valign: 'middle'
      });

      // THE GRAND TAGLINE (Font 26pt Bold White)
      slide.addText('“AKUNTABEL DI SETIAP RUPIAH, MELAYANI DI SETIAP TAHAPAN”', {
        x: 1.0, y: 2.22, w: 11.33, h: 0.65,
        fontSize: 26, fontFace: 'Calibri', bold: true, color: COLOR.white, align: 'center'
      });

      // Sub-Tagline / Visi Penyelenggaraan (Font 15pt)
      slide.addText('Anggaran Presisi Berbasis Data Riil, Menjamin Pemilihan Serentak 2029 yang Berintegritas, Transparan, dan Bermartabat bagi Seluruh Masyarakat Kabupaten Ngawi.', {
        x: 1.2, y: 2.88, w: 10.93, h: 0.55,
        fontSize: 15, fontFace: 'Calibri', italic: true, bold: true, color: '93C5FD', align: 'center'
      });

      // Official Pleno Signature Badge (Font 14)
      slide.addText('Disahkan secara resmi melalui Berita Acara Rapat Pleno Komisioner KPU Kabupaten Ngawi — Satker 657811', {
        x: 1.2, y: 3.52, w: 10.93, h: 0.35,
        fontSize: 14, fontFace: 'Calibri', italic: true, color: '94A3B8', align: 'center'
      });

      // 2. BOTTOM: DUAL PANTUN CARDS SIDE BY SIDE
      // Pantun 1: Sinergi Perencanaan
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 0.8, y: 4.25, w: 5.72, h: 2.30,
        fill: { color: COLOR.slateLight }, line: { color: COLOR.blue, width: 1.4 }
      });
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 1.1, y: 4.40, w: 4.2, h: 0.38,
        fill: { color: COLOR.lightBlue }, line: { color: COLOR.blue, width: 1 }
      });
      slide.addText('PANTUN SINERGI PERENCANAAN', {
        x: 1.1, y: 4.40, w: 4.2, h: 0.38,
        fontSize: 14, fontFace: 'Calibri', bold: true, color: COLOR.navy, align: 'center', valign: 'middle'
      });

      slide.addText('Pergi ke Ngawi membeli gerabah,\nSinggah sebentar di Benteng Pendem.\nPerencanaan presisi tertib amanah,\nPilkada sukses, Jawa Timur adem tentrem.', {
        x: 1.1, y: 4.88, w: 5.12, h: 1.55,
        fontSize: 15, fontFace: 'Calibri', italic: true, bold: true, color: COLOR.darkNavy, lineSpacingMultiple: 1.20
      });

      // Pantun 2: Harmonisasi & Kemitraan
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 6.81, y: 4.25, w: 5.72, h: 2.30,
        fill: { color: COLOR.amberLight }, line: { color: COLOR.amber, width: 1.4 }
      });
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 7.11, y: 4.40, w: 4.4, h: 0.38,
        fill: { color: COLOR.white }, line: { color: COLOR.amber, width: 1 }
      });
      slide.addText('PANTUN HARMONISASI & INTEGRITAS', {
        x: 7.11, y: 4.40, w: 4.4, h: 0.38,
        fontSize: 14, fontFace: 'Calibri', bold: true, color: COLOR.amber, align: 'center', valign: 'middle'
      });

      slide.addText('Kayu jati diukir rapi,\nKuat terpancang penopang istana.\nUsulan RKB kami serahkan sepenuh hati,\nSiap diselaraskan demi sukses pilkada.', {
        x: 7.11, y: 4.88, w: 5.12, h: 1.55,
        fontSize: 15, fontFace: 'Calibri', italic: true, bold: true, color: '78350F', lineSpacingMultiple: 1.20
      });
    }
  }

  const pptxPath = path.join(OUTPUT_DIR, 'Paparan_RKB_KPU_Ngawi_2029.pptx');
  await pres.writeFile({ fileName: pptxPath });
  console.log(`[PPTX] Berhasil disimpan di: ${pptxPath} (${(fs.statSync(pptxPath).size / 1024).toFixed(1)} KB)`);
  return pptxPath;
}

// ============================================================================
// FUNGSI PEMBUAT BUKU CATATAN PEMBICARA (WORD / DOCX) - 12 SLIDE
// ============================================================================
async function generateWordNotes() {
  console.log('[DOCX] Memulai pembuatan file Buku Catatan Pembicara Word (12 Slide)...');

  const doc = new Document({
    creator: 'KPU Kabupaten Ngawi',
    title: 'Catatan Pembicara Paparan RKB Pilkada 2029',
    description: 'Naskah Panduan Presenter & Pertahanan Anggaran Paparan KPU Provinsi Jawa Timur',
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22, color: '1E293B' }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'KPU KABUPATEN NGAWI — SATKER 657811 | BUKU PANDUAN PEMBICARA (12 SLIDE)', size: 16, color: '64748B', bold: true })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Panduan Eksekutif Presentasi RKB Pilkada Serentak 2029 di KPU Provinsi Jawa Timur', size: 16, color: '94A3B8' })
                ]
              })
            ]
          })
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({ text: 'BUKU PEGANGAN & CATATAN LENGKAP PEMBICARA', bold: true, size: 32, color: '0F172A' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 240 },
            children: [
              new TextRun({ text: 'USULAN RKB PEMILIHAN BUPATI & WAKIL BUPATI NGAWI TAHUN 2029 (12 SLIDE EKSEKUTIF)', bold: true, size: 24, color: '1E3A8A' }),
              new TextRun({ text: '\nDisajikan pada Forum Telaah Anggaran Bersama Komisi Pemilihan Umum Provinsi Jawa Timur', italic: true, size: 20, color: '64748B' })
            ]
          }),

          // Ringkasan Eksekutif Box
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: 'EFF6FF' },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 12, color: '2563EB' },
                      bottom: { style: BorderStyle.SINGLE, size: 12, color: '2563EB' },
                      left: { style: BorderStyle.SINGLE, size: 12, color: '2563EB' },
                      right: { style: BorderStyle.SINGLE, size: 12, color: '2563EB' }
                    },
                    children: [
                      new Paragraph({
                        spacing: { before: 120, after: 80 },
                        children: [
                          new TextRun({ text: 'RINGKASAN PARAMETER & ANGGARAN UTAMA:', bold: true, color: '1E3A8A', size: 20 })
                        ]
                      }),
                      new Paragraph({
                        spacing: { before: 40, after: 40 },
                        children: [
                          new TextRun({ text: '• Total Kebutuhan Bersama: ', bold: true }),
                          new TextRun({ text: 'Rp 68.936.096.599', bold: true, color: '1E3A8A' }),
                          new TextRun({ text: ' (Beban APBD Kab. Ngawi: Rp 56,63 M / 82,15% | Sharing APBD Prov. Jatim: Rp 12,30 M / 17,85%)' })
                        ]
                      }),
                      new Paragraph({
                        spacing: { before: 40, after: 40 },
                        children: [
                          new TextRun({ text: '• Parameter Kewilayahan (SSOT): ', bold: true }),
                          new TextRun({ text: '19 PPK (Kecamatan), 217 PPS (Desa/Kelurahan), 1.393 TPS, 359.141 KK, 750.525 DPT, 5 Paslon' })
                        ]
                      }),
                      new Paragraph({
                        spacing: { before: 40, after: 40 },
                        children: [
                          new TextRun({ text: '• Prioritas Belanja: ', bold: true }),
                          new TextRun({ text: '66,52% (Rp 45,86 Miliar) mengalir langsung ke penyelenggara ad hoc di PPS Desa, TPS/KPPS, PPK, dan Pantarlih' })
                        ]
                      }),
                      new Paragraph({
                        spacing: { before: 40, after: 120 },
                        children: [
                          new TextRun({ text: '• Tagline Resmi: ', bold: true, color: 'D97706' }),
                          new TextRun({ text: '“AKUNTABEL DI SETIAP RUPIAH, MELAYANI DI SETIAP TAHAPAN”', bold: true, color: '1E3A8A' })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          new Paragraph({ spacing: { before: 200, after: 100 }, children: [] }),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: 'PETUNJUK UMUM & STRATEGI DIPLOMASI ANGGARAN', bold: true, color: '0F172A', size: 24 })]
          }),
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: '1. Sikap Presenter: ', bold: true }),
              new TextRun({ text: 'Sampaikan paparan dengan tenang, percaya diri, dan terbuka terhadap masukan. Tegaskan bahwa usulan KPU Kabupaten Ngawi telah terverifikasi secara internal dan disahkan dalam Berita Acara Rapat Pleno Komisioner.' })
            ]
          }),
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: '2. Penguasaan Data Riil (SSOT): ', bold: true }),
              new TextRun({ text: 'Jika ditanya mengenai dasar penghitungan jumlah petugas, selalu rujuk pada parameter 359.141 KK untuk Pantarlih dan 1.393 TPS untuk KPPS/Linmas. Angka ini tidak bisa diganggu gugat karena merupakan fakta empiris kependudukan Kabupaten Ngawi.' })
            ]
          }),
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: '3. Penjelasan Honorarium Ad Hoc pada Divisi KUL: ', bold: true }),
              new TextRun({ text: 'Apabila pimpinan bertanya mengapa honorarium masuk di Divisi KUL dan bukan Divisi PARSDM, jelaskan bahwa Akun 521213 (Honorarium Badan Ad Hoc senilai Rp 26,17 Miliar) secara tata kelola perbendaharaan dikelola oleh Divisi KUL, sedangkan PARSDM mengampu sosialisasi, partisipasi masyarakat, pembentukan ad hoc, dan santunan kecelakaan kerja (Akun 521219).' })
            ]
          }),

          new Paragraph({ spacing: { before: 200, after: 200 }, children: [new PageBreak()] }),

          // RINCIAN 12 SLIDE
          ...SLIDES.flatMap((sl) => {
            return [
              new Paragraph({
                spacing: { before: 240, after: 80 },
                children: [
                  new TextRun({ text: `SLIDE ${sl.num}: ${sl.title.replace(/\\n/g, ' ')}`, bold: true, color: '1E3A8A', size: 22 })
                ]
              }),
              new Paragraph({
                spacing: { before: 0, after: 120 },
                children: [
                  new TextRun({ text: `Kategori: ${sl.tag} | Sub-Judul: ${sl.subtitle.replace(/\\n/g, ' ')}`, italic: true, color: '64748B', size: 18 })
                ]
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        shading: { fill: 'F8FAFC' },
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
                          bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
                          left: { style: BorderStyle.SINGLE, size: 12, color: '1E3A8A' },
                          right: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' }
                        },
                        children: [
                          new Paragraph({
                            spacing: { before: 80, after: 80 },
                            children: [
                              new TextRun({ text: 'NASKAH LISAN LENGKAP PEMBICARA (KATA DEMI KATA):', bold: true, color: '0F172A', size: 18 })
                            ]
                          }),
                          ...sl.notes.split('\n\n').map(p => new Paragraph({
                            spacing: { before: 40, after: 40 },
                            children: [new TextRun({ text: p, size: 20 })]
                          }))
                        ]
                      })
                    ]
                  })
                ]
              }),
              new Paragraph({ spacing: { before: 160, after: 160 }, children: [] })
            ];
          }),

          new Paragraph({ spacing: { before: 200, after: 200 }, children: [new PageBreak()] }),

          // SIMULASI PERTAHANAN ANGGARAN (Q&A DEFENSE)
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: 'SIMULASI ANTISIPASI TANYA-JAWAB KRITIS (Q&A DEFENSE)', bold: true, color: '0F172A', size: 24 })]
          }),
          new Paragraph({
            spacing: { before: 120, after: 40 },
            children: [
              new TextRun({ text: 'Pertanyaan 1: Mengapa Honor Ad Hoc masuk Divisi KUL dan bukan Divisi PARSDM?', bold: true, color: '1E3A8A', size: 20 })
            ]
          }),
          new Paragraph({
            spacing: { before: 0, after: 100 },
            children: [
              new TextRun({ text: 'Jawaban Resmi: ', bold: true, color: '059669' }),
              new TextRun({ text: 'Secara struktur DIPA dan tata kelola perbendaharaan APBD, pembayaran gaji dan honorarium (Akun 521213: Rp 26.165.335.000) adalah fungsi kebendaharaan dan verifikasi administrasi keuangan yang melekat pada Sekretariat dan Komisioner Divisi KUL. Sedangkan Divisi PARSDM berfokus pada substansi sosialisasi, seleksi personil, bimbingan teknis, dan jaminan santunan perlindungan kerja (Akun 521219).' })
            ]
          }),
          new Paragraph({
            spacing: { before: 120, after: 40 },
            children: [
              new TextRun({ text: 'Pertanyaan 2: Bagaimana dasar perhitungan beban sharing APBD Provinsi Rp 12,30 Miliar?', bold: true, color: '1E3A8A', size: 20 })
            ]
          }),
          new Paragraph({
            spacing: { before: 0, after: 100 },
            children: [
              new TextRun({ text: 'Jawaban Resmi: ', bold: true, color: '059669' }),
              new TextRun({ text: 'Beban sharing Provinsi sebesar Rp 12.302.025.670 (17,85%) disusun berpedoman pada kesepakatan bersama KPU Provinsi Jawa Timur, mencakup komponen spesifik: Honorarium Pantarlih (Rp 2,78 M), sharing honor PPK (Rp 2,11 M), operasional pleno PPS 217 desa (Rp 1,56 M), konsumsi KPPS 1.393 TPS (Rp 1,15 M), serta penggandaan logistik Pilgub, sehingga tidak terjadi tumpang tindih dengan APBD Kabupaten.' })
            ]
          }),
          new Paragraph({
            spacing: { before: 120, after: 40 },
            children: [
              new TextRun({ text: 'Pertanyaan 3: Mengapa alokasi santunan kerja (Akun 521219) mencakup Pantarlih?', bold: true, color: '1E3A8A', size: 20 })
            ]
          }),
          new Paragraph({
            spacing: { before: 0, after: 100 },
            children: [
              new TextRun({ text: 'Jawaban Resmi: ', bold: true, color: '059669' }),
              new TextRun({ text: 'Pantarlih bekerja langsung door-to-door menjangkau 359.141 KK di medan geografis Kabupaten Ngawi yang luas. Memberikan perlindungan santunan senilai Rp 456.600.000 bagi 1.393+ petugas Pantarlih setara dengan jenjang KPPS dan PPS adalah mandat moral dan amanat SBML KPU RI demi kepastian perlindungan keselamatan kerja para pejuang demokrasi.' })
            ]
          }),
          new Paragraph({
            spacing: { before: 120, after: 40 },
            children: [
              new TextRun({ text: 'Pertanyaan 4: Sejauh mana kepastian komitmen hibah dari Pemerintah Kabupaten Ngawi?', bold: true, color: '1E3A8A', size: 20 })
            ]
          }),
          new Paragraph({
            spacing: { before: 0, after: 100 },
            children: [
              new TextRun({ text: 'Jawaban Resmi: ', bold: true, color: '059669' }),
              new TextRun({ text: 'KPU Kabupaten Ngawi telah mengambil langkah simultan pada 28 November 2026 melalui Audiensi dan Konsultasi Kelembagaan bersama DPRD Kabupaten Ngawi, serta Koordinasi Teknis Kesiapan Pendanaan Hibah bersama Bakesbangpol Pemkab Ngawi. Pemda dan Legislatif menyambut positif dan berkomitmen penuh mengalokasikan anggaran Pilkada 2029 sesuai kerangka waktu NPHD.' })
            ]
          })
        ]
      }
    ]
  });

  const docxPath = path.join(OUTPUT_DIR, 'Catatan_Pembicara_Paparan_RKB.docx');
  const buffer = await docx.Packer.toBuffer(doc);
  fs.writeFileSync(docxPath, buffer);
  console.log(`[DOCX] Berhasil disimpan di: ${docxPath} (${(fs.statSync(docxPath).size / 1024).toFixed(1)} KB)`);
  return docxPath;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
async function main() {
  try {
    console.log('================================================================');
    console.log('  GENERATOR PAPARAN & BUKU PEMBICARA KPU KABUPATEN NGAWI');
    console.log('  Mode: 12 Slide dengan Tagline Mantap & Pantun Perencanaan');
    console.log('  Folder Output: ' + OUTPUT_DIR);
    console.log('================================================================');

    const pptxFile = await generatePowerPoint();
    const docxFile = await generateWordNotes();

    console.log('----------------------------------------------------------------');
    console.log('  PROSES GENERATE 100% SUKSES!');
    console.log('  File PPTX: ' + pptxFile);
    console.log('  File DOCX: ' + docxFile);
    console.log('================================================================');
    process.exit(0);
  } catch (err) {
    console.error('GAGAL membuat presentasi dan dokumen:', err);
    process.exit(1);
  }
}

main();
