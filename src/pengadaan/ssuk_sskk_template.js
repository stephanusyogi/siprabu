/**
 * SI-PRABU — Template Baku BAB I. SSUK (67 Klausul) & BAB II. SSKK (Huruf A s.d. Y)
 * Diadaptasi 100% dari format dokumen resmi KPU Kabupaten Ngawi ("SSUK DAN SSKK.docx")
 * dengan tata letak 2 kolom berdampingan (Kiri: Pokok Pasal/Klausul, Kanan: Uraian Ketentuan)
 * dan disempurnakan agar dinamis mengikuti Paket Pengadaan (Tahap 7 Draft vs Tahap 13 Final).
 */

const SSUK_67_ROWS = [
  { section: 'A. KETENTUAN UMUM' },
  {
    no: '1.',
    title: 'Definisi',
    items: [
      ['1.1', 'Barang adalah setiap benda baik berwujud maupun tidak berwujud, bergerak maupun tidak bergerak, yang dapat diperdagangkan, dipakai, dipergunakan atau dimanfaatkan oleh pengguna barang.'],
      ['1.2', 'Pengguna Anggaran yang selanjutnya disebut PA adalah Pejabat pemegang kewenangan penggunaan anggaran Kementerian/Lembaga/Satuan Kerja Perangkat Daerah atau Pejabat yang disamakan pada Institusi lain Pengguna APBN/APBD;'],
      ['1.3', 'Kuasa Pengguna Anggaran yang selanjutnya disebut KPA adalah pejabat yang ditetapkan oleh PA untuk menggunakan APBN atau ditetapkan Kepala Daerah untuk menggunakan APBD;'],
      ['1.4', 'Pejabat Pembuat Komitmen yang selanjutnya disebut PPK adalah pejabat yang bertanggung jawab atas pelaksanaan pengadaan barang/jasa.'],
      ['1.5', 'Aparat Pengawas Intern Pemerintah atau pengawas intern pada institusi lain yang selanjutnya disebut APIP adalah aparat yang melakukan pengawasan melalui audit, reviu, evaluasi, pemantauan dan kegiatan pengawasan lain terhadap penyelenggaraan tugas dan fungsi organisasi.'],
      ['1.6', 'Penyedia adalah badan usaha atau orang perseorangan yang menyediakan barang/jasa;'],
      ['1.7', 'Subpenyedia adalah penyedia yang mengadakan perjanjian kerja dengan penyedia penanggung jawab kontrak, untuk melaksanakan sebagian pekerjaan (subkontrak);'],
      ['1.8', 'Kemitraan adalah kerja sama usaha antarpenyedia baik penyedia nasional maupun penyedia asing, yang masing-masing pihak mempunyai hak, kewajiban dan tanggung jawab yang jelas berdasarkan perjanjian tertulis;'],
      ['1.9', 'Surat Pesanan/Surat Perintah Kerja/Kontrak adalah perjanjian tertulis antara PPK dengan Penyedia dan mencakup Syarat-Syarat Umum Kontrak (SSUK) ini dan Syarat-Syarat Khusus Kontrak (SSKK) serta dokumen lain yang merupakan bagian dari Kontrak;'],
      ['1.10', 'Nilai Kontrak adalah total harga yang tercantum dalam Kontrak.'],
      ['1.11', 'Hari adalah hari kalender;'],
      ['1.12', 'Daftar kuantitas dan harga (rincian harga penawaran) adalah daftar kuantitas yang telah diisi harga satuan dan jumlah biaya keseluruhannya yang merupakan bagian dari penawaran/kontrak;'],
      ['1.13', 'Pekerjaan utama adalah jenis pekerjaan yang secara langsung menunjang terwujudnya dan berfungsinya suatu barang sesuai peruntukannya yang ditetapkan dalam Dokumen Pemilihan/Pengadaan;'],
      ['1.14', 'Jadwal waktu pelaksanaan adalah jadwal yang menunjukkan kebutuhan waktu yang diperlukan untuk menyelesaikan pekerjaan, terdiri atas tahap pelaksanaan yang disusun secara logis, realistik dan dapat dilaksanakan;'],
      ['1.15', 'Bagian pekerjaan yang disubkontrakkan adalah bagian pekerjaan bukan pekerjaan utama yang ditetapkan dalam Dokumen Pemilihan, yang pelaksanaannya diserahkan kepada penyedia lain dan disetujui terlebih dahulu oleh PPK;'],
      ['1.16', 'Masa Kontrak adalah jangka waktu berlakunya Kontrak ini terhitung sejak tanggal penandatanganan kontrak sampai dengan serah terima barang/berakhirnya masa pemeliharaan;'],
      ['1.17', 'Tanggal mulai kerja adalah tanggal mulai kerja penyedia yang terhitung sejak tanggal penerbitan Surat Pesanan / SPMK / tanggal efektif yang ditetapkan dalam Kontrak;'],
      ['1.18', 'Tanggal penyelesaian pekerjaan adalah tanggal penyerahan pekerjaan selesai, dinyatakan dalam Berita Acara Serah Terima (BAST) pekerjaan yang diterbitkan oleh Pejabat Pembuat Komitmen;'],
      ['1.19', 'Tempat Tujuan Akhir adalah lokasi yang tercantum dalam Syarat-Syarat Khusus Kontrak (SSKK) dan merupakan tempat di mana Barang akan dipergunakan oleh PPK;'],
      ['1.20', 'Tempat Tujuan Pengiriman adalah tempat di mana kewajiban pengiriman barang oleh Penyedia dilaksanakan sesuai dengan SSKK.']
    ]
  },
  {
    no: '2.',
    title: 'Penerapan',
    items: [
      ['', 'SSUK diterapkan secara luas dalam pelaksanaan pekerjaan pengadaan barang/jasa tetapi tidak dapat bertentangan dengan ketentuan-ketentuan dalam Dokumen Kontrak lain yang lebih tinggi berdasarkan urutan hierarki dalam Surat Perjanjian/Surat Pesanan.']
    ]
  },
  {
    no: '3.',
    title: 'Bahasa dan Hukum',
    items: [
      ['3.1', 'Bahasa kontrak harus dalam Bahasa Indonesia kecuali dalam rangka pinjaman/hibah luar negeri menggunakan Bahasa Indonesia dan bahasa nasional pemberi pinjaman/hibah tersebut dan/atau Bahasa Inggris.'],
      ['3.2', 'Hukum yang digunakan adalah hukum yang berlaku di Indonesia, kecuali dalam rangka pinjaman/hibah luar negeri menggunakan hukum yang berlaku di Indonesia atau hukum yang berlaku di negara pemberi pinjaman/hibah (tergantung kesepakatan pemerintah dan negara pemberi pinjaman/hibah).']
    ]
  },
  {
    no: '4.',
    title: 'Larangan Korupsi, Kolusi, dan Nepotisme (KKN) serta Penipuan',
    items: [
      ['4.1', 'Berdasarkan etika pengadaan barang/jasa pemerintah, para pihak dilarang untuk:\na. menawarkan, menerima atau menjanjikan untuk memberi atau menerima hadiah atau imbalan berupa apa saja atau melakukan tindakan lainnya untuk mempengaruhi siapapun yang diketahui atau patut dapat diduga berkaitan dengan pengadaan ini;\nb. membuat dan/atau menyampaikan dokumen dan/atau keterangan lain yang tidak benar untuk memenuhi persyaratan dalam Dokumen Pemilihan.'],
      ['4.2', 'Penyedia menjamin bahwa yang bersangkutan (termasuk semua anggota kemitraan/KSO apabila berbentuk kemitraan/KSO) dan subpenyedianya (jika ada) tidak akan melakukan tindakan yang dilarang di atas.'],
      ['4.3', 'Penyedia yang menurut penilaian PPK terbukti melakukan larangan-larangan di atas dapat dikenakan sanksi-sanksi administratif oleh PPK sebagai berikut:\na. Pemutusan Kontrak;\nb. Jaminan Pelaksanaan dicairkan dan disetor sebagaimana ditetapkan dalam SSKK (apabila ada);\nc. Sisa uang muka harus dilunasi oleh Penyedia; dan\nd. Pengenaan Daftar Hitam.'],
      ['4.4', 'Pengenaan sanksi administratif di atas dilaporkan oleh PPK kepada Menteri/Pimpinan Lembaga/Kepala Daerah/Pimpinan Institusi Lainnya.'],
      ['4.5', 'PPK yang terlibat dalam KKN dan penipuan dikenakan sanksi berdasarkan ketentuan peraturan perundang-undangan.']
    ]
  },
  {
    no: '5.',
    title: 'Asal Barang',
    items: [
      ['5.1', 'Penyedia harus menyampaikan asal material/bahan yang terdiri dari rincian komponen dalam negeri dan komponen impor.'],
      ['5.2', 'Asal barang merupakan tempat barang diperoleh, antara lain tempat barang ditambang, tumbuh, atau diproduksi.'],
      ['5.3', 'Barang yang diadakan harus diutamakan barang yang manufaktur, pabrikasi, perakitan, dan penyelesaian akhir pekerjaannya dilakukan di Indonesia (Produksi Dalam Negeri / TKDN).']
    ]
  },
  {
    no: '6.',
    title: 'Korespondensi',
    items: [
      ['6.1', 'Semua korespondensi dapat berbentuk surat, e-mail dan/atau faksimili dengan alamat tujuan para pihak yang tercantum dalam SSKK.'],
      ['6.2', 'Semua pemberitahuan, permohonan, atau persetujuan berdasarkan Kontrak ini harus dibuat secara tertulis dalam Bahasa Indonesia, dan dianggap telah diberitahukan jika telah disampaikan secara langsung kepada Wakil Sah Para Pihak, atau jika disampaikan melalui surat tercatat, e-mail, dan/atau faksimili ditujukan ke alamat yang tercantum dalam SSKK.']
    ]
  },
  {
    no: '7.',
    title: 'Wakil Sah Para Pihak',
    items: [
      ['', 'Setiap tindakan yang dipersyaratkan atau diperbolehkan untuk dilakukan, dan setiap dokumen yang dipersyaratkan atau diperbolehkan untuk dibuat berdasarkan Kontrak ini oleh PPK atau Penyedia hanya dapat dilakukan atau dibuat oleh pejabat yang disebutkan dalam SSKK. Khusus untuk penyedia perseorangan, Penyedia tidak boleh diwakilkan.']
    ]
  },
  {
    no: '8.',
    title: 'Pembukuan',
    items: [
      ['', 'Penyedia diharapkan untuk melakukan pencatatan keuangan yang akurat dan sistematis sehubungan dengan pengadaan Barang ini berdasarkan standar akuntansi yang berlaku.']
    ]
  },
  {
    no: '9.',
    title: 'Perpajakan',
    items: [
      ['', 'Penyedia, Subpenyedia (jika ada), dan Personil yang bersangkutan berkewajiban untuk membayar semua pajak, bea, retribusi, dan pungutan lain yang sah yang dibebankan oleh peraturan perpajakan atas pelaksanaan Kontrak ini. Semua pengeluaran perpajakan ini dianggap telah termasuk dalam Nilai Kontrak.']
    ]
  },
  {
    no: '10.',
    title: 'Pengalihan dan/atau Subkontrak',
    items: [
      ['10.1', 'Penyedia dilarang untuk mengalihkan sebagian atau seluruh Kontrak ini. Pengalihan seluruh Kontrak hanya diperbolehkan dalam hal pergantian nama Penyedia, baik sebagai akibat peleburan (merger) maupun akibat lainnya.'],
      ['10.2', 'Penyedia dilarang untuk mensubkontrakkan pekerjaan utama yang disebutkan dalam daftar kuantitas dalam Kontrak ini.'],
      ['10.3', 'Subkontrak sebagian pekerjaan utama hanya diperbolehkan kepada Penyedia spesialis setelah persetujuan tertulis dari PPK. Penyedia tetap bertanggung jawab atas bagian pekerjaan yang disubkontrakkan.'],
      ['10.4', 'Jika ketentuan di atas dilanggar maka Kontrak diputuskan dan Penyedia dikenakan sanksi yang diatur dalam SSKK.']
    ]
  },
  {
    no: '11.',
    title: 'Pengabaian',
    items: [
      ['', 'Jika terjadi pengabaian oleh satu Pihak terhadap pelanggaran ketentuan tertentu Kontrak oleh Pihak yang lain maka pengabaian tersebut tidak menjadi pengabaian yang terus-menerus selama Masa Kontrak atau seketika menjadi pengabaian terhadap pelanggaran ketentuan yang lain. Pengabaian hanya dapat mengikat jika dapat dibuktikan secara tertulis dan ditandatangani oleh Wakil Sah Pihak yang melakukan pengabaian.']
    ]
  },
  {
    no: '12.',
    title: 'Penyedia Mandiri',
    items: [
      ['', 'Penyedia berdasarkan Kontrak ini bertanggung jawab penuh terhadap personil dan subpenyedianya (jika ada) serta pekerjaan yang dilakukan oleh mereka.']
    ]
  },
  {
    no: '13.',
    title: 'Kemitraan / Kerja Sama Operasi (KSO)',
    items: [
      ['', 'Kemitraan/KSO memberi kuasa kepada salah satu anggota yang disebut dalam Surat Perjanjian untuk bertindak atas nama kemitraan/KSO dalam pelaksanaan hak dan kewajiban terhadap PPK berdasarkan Kontrak ini. (Tidak diberlakukan dalam Kontrak/Surat Perjanjian/Surat Pesanan ini).']
    ]
  },
  {
    no: '14.',
    title: 'Pengawasan Pelaksanaan Pekerjaan',
    items: [
      ['', 'Selama berlangsungnya pelaksanaan pekerjaan, PPK dapat mengawasi pelaksanaan pekerjaan.']
    ]
  },

  { section: 'B. PELAKSANAAN PENGADAAN, SERAH TERIMA, AMANDEMEN DAN PEMUTUSAN KONTRAK' },
  {
    no: '15.',
    title: 'Jadwal Pelaksanaan Pekerjaan',
    items: [
      ['15.1', 'Kontrak ini berlaku efektif pada tanggal penandatanganan Surat Perjanjian/Surat Pesanan oleh para pihak atau pada tanggal yang ditetapkan dalam SSKK;'],
      ['15.2', 'Pekerjaan pengadaan Barang mulai dilaksanakan pada tanggal yang ditetapkan dalam SSKK;'],
      ['15.3', 'Barang harus diserahkan pada tanggal yang ditetapkan dalam SSKK;'],
      ['15.4', 'Apabila penyedia berpendapat tidak dapat menyelesaikan pekerjaan sesuai jadwal karena keadaan di luar pengendaliannya dan penyedia telah melaporkan kejadian tersebut kepada PPK, maka PPK dapat melakukan penjadwalan kembali pelaksanaan tugas penyedia dengan adendum kontrak.']
    ]
  },
  {
    no: '16.',
    title: 'Surat Pesanan',
    items: [
      ['16.1', 'SP/SPK/Kontrak harus sudah disetujui/ditandatangani oleh penyedia sesuai dengan yang dipersyaratkan dengan dibubuhi meterai/tanda tangan elektronik selambat-lambatnya 3 (tiga) hari sejak tanggal penerbitan Surat Pesanan/klik Surat Pesanan.'],
      ['16.2', 'Tanggal penandatanganan SP/SPK/Kontrak oleh penyedia ditetapkan sebagai tanggal awal berlakunya SP/SPK/Kontrak.'],
      ['16.3', 'Dalam hal terjadi keterlambatan penandatanganan atau penerbitan Kontrak, PPK atau Pihak Pertama memberitahu kondisi tersebut kepada Pihak Kedua.'],
      ['16.4', 'Dalam hal pelaksanaan proses penandatanganan Kontrak dibatalkan karena suatu hal yang bukan merupakan kehendak Pihak Pertama, maka Pihak Kedua tidak dapat menuntut Pihak Pertama dan paket dinyatakan gagal.']
    ]
  },
  {
    no: '17.',
    title: 'Komunikasi dan Koordinasi',
    items: [
      ['17.1', 'Pihak Pertama dan Pihak Kedua berkomunikasi dan berkoordinasi secara profesional dengan tujuan mencapai keluaran terbaik sesuai yang diperjanjikan.'],
      ['17.2', 'Para pihak dapat menunjuk perwakilan dan menyepakati tata cara komunikasi dan koordinasi.']
    ]
  },
  {
    no: '18.',
    title: 'Rapat Persiapan Pelaksanaan Kontrak',
    items: [
      ['18.1', 'Apabila diperlukan, selambat-lambatnya 7 (tujuh) hari sejak diterbitkannya SP/SPK/Kontrak dan sebelum pelaksanaan pekerjaan, PPK bersama dengan penyedia, unsur perencanaan, dan unsur pengawasan, harus sudah menyelenggarakan rapat persiapan pelaksanaan kontrak.'],
      ['18.2', 'Beberapa hal yang dibahas dan disepakati dalam rapat persiapan pelaksanaan kontrak adalah:\na. tata cara pengaturan pelaksanaan pekerjaan;\nb. jadwal pelaksanaan pekerjaan;\nc. penyusunan rencana dan pelaksanaan pemeriksaan lokasi pekerjaan, apabila ada;\nd. rincian rencana pengiriman dan rencana pabrikasi barang, jika barang yang akan diadakan memerlukan pabrikasi.']
    ]
  },

  { subsection: 'B.1 Pelaksanaan Pengadaan' },
  {
    no: '19.',
    title: 'Lingkup Pekerjaan',
    items: [
      ['', 'Barang yang akan diadakan harus sesuai dengan spesifikasi teknis dan daftar kuantitas dan harga.']
    ]
  },
  {
    no: '20.',
    title: 'Standar',
    items: [
      ['', 'Penyedia harus menyediakan barang yang memenuhi spesifikasi dan standar yang ditetapkan dalam Spesifikasi Teknis dan Gambar yang disusun berdasarkan standar yang ditetapkan dalam SSKK.']
    ]
  },
  {
    no: '21.',
    title: 'Pemeriksaan Bersama',
    items: [
      ['21.1', 'Apabila diperlukan, pada tahap awal pelaksanaan Kontrak, PPK bersama-sama dengan penyedia melakukan pemeriksaan kondisi lapangan.'],
      ['21.2', 'Untuk pemeriksaan bersama ini, PA/KPA dapat membentuk Panitia/Pejabat Peneliti Pelaksanaan Kontrak atau Tim Teknis atas usul PPK.'],
      ['21.3', 'Hasil pemeriksaan bersama dituangkan dalam Berita Acara. Apabila dalam pemeriksaan bersama mengakibatkan perubahan isi Kontrak, maka harus dituangkan dalam adendum Kontrak.']
    ]
  },
  {
    no: '22.',
    title: 'Inspeksi Pabrikasi',
    items: [
      ['22.1', 'PPK atau Tim Inspeksi yang ditunjuk PPK dapat melakukan inspeksi atas proses pabrikasi barang/peralatan khusus sebagaimana ditetapkan dalam SSKK.'],
      ['22.2', 'Jadwal, tempat dan ruang lingkup inspeksi sesuai SSKK.'],
      ['22.3', 'Biaya pelaksanaan inspeksi tidak termasuk dalam harga Kontrak.']
    ]
  },
  {
    no: '23.',
    title: 'Pengepakan',
    items: [
      ['23.1', 'Penyedia berkewajiban atas tanggungannya sendiri untuk mengepak Barang sedemikian rupa sehingga Barang terhindar dan terlindungi dari risiko kerusakan atau kehilangan selama masa transportasi atau pada saat pengiriman dari tempat asal Barang sampai ke Tempat Tujuan Akhir.'],
      ['23.2', 'Metode pengepakan diatur lebih lanjut dalam SSKK;'],
      ['23.3', 'Penyedia harus melakukan pengepakan, penandaan, dan penyertaan dokumen identitas Barang di dalam dan di luar paket Barang sebagaimana ditetapkan dalam SSKK.']
    ]
  },
  {
    no: '24.',
    title: 'Pengiriman',
    items: [
      ['24.1', 'Penyedia berkewajiban untuk menyelesaikan pengiriman barang sesuai dengan jadwal pengiriman. Dokumen rincian pengiriman dan dokumen terkait lainnya diatur dalam SSKK.'],
      ['24.2', 'Sarana transportasi yang dipakai diatur dalam SSKK.'],
      ['24.3', 'Untuk barang-barang yang mudah rusak atau berisiko tinggi, penyedia harus memberikan informasi secara rinci tentang cara penanganannya.']
    ]
  },
  {
    no: '25.',
    title: 'Asuransi',
    items: [
      ['25.1', 'Penyedia harus mengasuransikan barang-barang yang akan diserahkan sesuai dengan ketentuan peraturan perundang-undangan yang berlaku dan ketentuan yang tercantum dalam SSKK;'],
      ['25.2', 'Penyedia harus mengasuransikan pengiriman barang-barang sesuai dengan ketentuan peraturan perundang-undangan yang berlaku dan ketentuan yang tercantum dalam SSKK;'],
      ['25.3', 'Barang yang dikirimkan secara CIF (Cost, Insurance and Freight) harus diasuransikan untuk pertanggungan yang tercantum dalam SSKK terhadap kerusakan atau kehilangan yang mungkin terjadi selama pabrikasi atau proses perolehan, transportasi, penyimpanan dan pengiriman sampai dengan Tempat Tujuan Pengiriman;'],
      ['25.4', 'Asuransi terhadap Barang harus diteruskan sampai ke Tempat Tujuan Akhir, sebagaimana ditetapkan dalam SSKK;'],
      ['25.5', 'Penerima manfaat harus dijelaskan dalam dokumen asuransi sebagaimana ditetapkan dalam SSKK;'],
      ['25.6', 'Semua biaya penutupan asuransi telah termasuk dalam nilai kontrak.']
    ]
  },
  {
    no: '26.',
    title: 'Transportasi',
    items: [
      ['26.1', 'Penyedia bertanggung jawab untuk mengatur pengangkutan Barang (termasuk pemuatan dan penyimpanan) sampai dengan Tempat Tujuan Pengiriman.'],
      ['26.2', 'Transportasi Barang harus diteruskan sampai dengan Tempat Tujuan Akhir sebagaimana ditetapkan dalam SSKK.'],
      ['26.3', 'Semua biaya transportasi (termasuk pemuatan dan penyimpanan) telah termasuk di dalam Nilai Kontrak.'],
      ['26.4', 'Penyedia wajib dan bertanggung jawab untuk menggunakan metode pengiriman (moda transportasi) tercepat selama waktu pelaksanaan pekerjaan.']
    ]
  },
  {
    no: '27.',
    title: 'Risiko',
    items: [
      ['', 'Semua risiko terhadap kerusakan atau kehilangan Barang tetap berada pada Penyedia pada saat proses pengiriman sampai dengan serah terima (BAST).']
    ]
  },
  {
    no: '28.',
    title: 'Pemeriksaan dan Pengujian',
    items: [
      ['28.1', 'PPK berhak untuk melakukan pemeriksaan dan pengujian atas Barang untuk memastikan kecocokannya dengan spesifikasi dan persyaratan yang telah ditentukan dalam kontrak.'],
      ['28.2', 'Pemeriksaan dan pengujian dapat dilakukan sendiri oleh penyedia dan disaksikan oleh PPK atau diwakilkan kepada pihak ketiga/Tim Teknis.'],
      ['28.3', 'Pemeriksaan dan Pengujian dilaksanakan sebagaimana diatur dalam SSKK.'],
      ['28.4', 'Biaya pemeriksaan dan pengujian ditanggung oleh Penyedia.'],
      ['28.5', 'Pemeriksaan dan pengujian dilakukan di tempat yang ditentukan dalam SSKK, dan dihadiri oleh PPK. Penyedia berkewajiban untuk memberikan akses kepada PPK tanpa biaya. Jika pemeriksaan dan pengujian dilakukan di luar Tempat Tujuan Akhir maka semua biaya kehadiran PPK merupakan tanggungan PPK.'],
      ['28.6', 'Jika hasil pemeriksaan dan pengujian tidak sesuai dengan jenis dan mutu Barang yang ditetapkan dalam Kontrak, PPK berhak untuk menolak Barang tersebut dan Penyedia atas biaya sendiri berkewajiban untuk memperbaiki atau mengganti Barang tersebut.'],
      ['28.7', 'Atas pelaksanaan pemeriksaan dan pengujian yang terpisah dari serah terima Barang, PPK membuat Berita Acara Pemeriksaan (BAPHP) yang ditandatangani oleh PPK dan Penyedia.']
    ]
  },
  {
    no: '29.',
    title: 'Uji Coba',
    items: [
      ['29.1', 'Setelah barang dikirim, barang diuji-coba oleh penyedia disaksikan oleh PPK;'],
      ['29.2', 'Hasil uji coba dituangkan dalam berita acara;'],
      ['29.3', 'Apabila pengoperasian barang tersebut memerlukan keahlian khusus maka harus dilakukan pelatihan kepada PPK/pengguna oleh penyedia, biaya pelatihan termasuk dalam harga barang;'],
      ['29.4', 'Apabila hasil uji coba tidak sesuai dengan spesifikasi yang ditentukan dalam Kontrak, maka penyedia memperbaiki atau mengganti barang tersebut dengan biaya sepenuhnya ditanggung penyedia.']
    ]
  },
  {
    no: '30.',
    title: 'Waktu Penyelesaian Pekerjaan',
    items: [
      ['30.1', 'Kecuali Kontrak diputuskan lebih awal, penyedia berkewajiban menyelesaikan pekerjaan selambat-lambatnya pada tanggal penyelesaian yang ditetapkan dalam SSKK.'],
      ['30.2', 'Jika pekerjaan tidak selesai pada tanggal penyelesaian bukan akibat Keadaan Kahar atau Peristiwa Kompensasi atau karena kesalahan atau kelalaian penyedia maka penyedia dikenakan denda.'],
      ['30.3', 'Jika keterlambatan tersebut semata-mata disebabkan oleh Peristiwa Kompensasi maka PPK dikenakan kewajiban pembayaran ganti rugi. Denda atau ganti rugi tidak dikenakan jika Tanggal Penyelesaian disepakati oleh Para Pihak untuk diperpanjang.'],
      ['30.4', 'Tanggal Penyelesaian yang dimaksud dalam Pasal ini adalah tanggal penyelesaian semua pekerjaan.']
    ]
  },
  {
    no: '31.',
    title: 'Serah Terima Barang',
    items: [
      ['31.1', 'Setelah pekerjaan selesai 100/100 (seratus perseratus), penyedia mengajukan permintaan secara tertulis kepada PPK untuk penyerahan pekerjaan;'],
      ['31.2', 'Serah terima Barang dilakukan di tempat sebagaimana ditetapkan dalam SSKK;'],
      ['31.3', 'Dalam rangka penilaian hasil pekerjaan, PPK memeriksa dan memastikan Barang yang diterima sesuai dengan yang diperjanjikan;'],
      ['31.4', 'PPK melakukan penilaian terhadap hasil pekerjaan yang telah diselesaikan oleh penyedia. Apabila terdapat kekurangan-kekurangan dan/atau cacat hasil pekerjaan, PPK meminta penyedia memperbaiki/menyelesaikannya;'],
      ['31.5', 'PPK berkewajiban untuk memeriksa kebenaran dokumen identitas Barang dan membandingkan kesesuaiannya dengan dokumen rincian pengiriman;'],
      ['31.6', 'Jika identitas Barang tidak sesuai dengan dokumen rincian pengiriman PPK dapat secara langsung meminta Penyedia melakukan pemeriksaan serta pengujian (jika diperlukan) Barang;'],
      ['31.7', 'Jika Barang dianggap tidak memenuhi persyaratan Kontrak maka PPK berhak untuk menolak Barang tersebut;'],
      ['31.8', 'Atas pelaksanaan serah terima Barang, PPK membuat Berita Acara Serah Terima (BAST) yang ditandatangani oleh PPK dan Penyedia;'],
      ['31.9', 'Jika pengoperasian Barang memerlukan keahlian khusus maka Penyedia berkewajiban untuk melakukan pelatihan (jika ada) sebagaimana tercantum dalam Jadwal Pengiriman dan Penyelesaian kepada PPK atau pihak lain yang ditunjuk oleh PPK. Biaya pelatihan termasuk dalam Nilai Kontrak;'],
      ['31.10', 'Penilaian hasil pekerjaan dilaksanakan oleh PPK;'],
      ['31.11', 'PPK menerima penyerahan pekerjaan setelah:\na. seluruh hasil pekerjaan dilaksanakan sesuai dengan ketentuan Kontrak dan diterima oleh PPK; dan\nb. Penyedia menyerahkan sertifikat garansi kepada PPK (apabila diperlukan);'],
      ['31.12', 'Jika Barang tidak dikirimkan sesuai dengan Jadwal Pengiriman bukan akibat Keadaan Kahar atau karena kesalahan atau kelalaian Penyedia maka Penyedia dikenakan denda keterlambatan.']
    ]
  },
  {
    no: '32.',
    title: 'Incoterms',
    items: [
      ['32.1', 'Kecuali diatur lain dalam SSKK maka istilah pengiriman dan implikasinya terhadap hak dan kewajiban Para Pihak diatur berdasarkan Incoterms.'],
      ['32.2', 'Istilah-istilah pengiriman EXW, FOB dan CIF yang digunakan dalam Kontrak ini tunduk kepada edisi terbaru Incoterms yang tercantum dalam SSKK dan sebagaimana diterbitkan oleh the International Chamber of Commerce.']
    ]
  },

  { subsection: 'B.2 Garansi dan Layanan Tambahan' },
  {
    no: '33.',
    title: 'Jaminan Bebas Cacat Mutu / Garansi',
    items: [
      ['a.', 'Penyedia dengan jaminan pabrikan dari produsen pabrikan (jika ada) berkewajiban untuk menjamin bahwa selama penggunaan secara wajar oleh PPK, Barang tidak mengandung cacat mutu yang disebabkan oleh tindakan atau kelalaian Penyedia, atau cacat mutu akibat desain, bahan, dan cara kerja.'],
      ['b.', 'Apabila terdapat kekurangan dan/atau kerusakan Barang/Logistik setelah dilakukan proses pemeriksaan/penyortiran, maka pemenuhan disampaikan kepada Penyedia sesuai batas waktu yang ditetapkan dalam SSKK setelah pelaksanaan pekerjaan berakhir.'],
      ['c.', 'Penyedia bertanggung jawab melakukan penggantian dan mengirimkan Barang/Logistik serta diterima KPU Kabupaten Ngawi sesuai batas waktu dalam SSKK setelah menerima Berita Acara Hasil Pemeriksaan/Penyortiran.'],
      ['d.', 'Jika Penyedia tidak memperbaiki atau mengganti Barang akibat cacat mutu dalam jangka waktu yang ditentukan maka PPK akan menghitung biaya perbaikan yang diperlukan, dan PPK secara langsung atau melalui pihak ketiga yang ditunjuk oleh PPK akan melakukan perbaikan tersebut. Penyedia berkewajiban untuk membayar biaya perbaikan atau penggantian tersebut sesuai dengan klaim yang diajukan secara tertulis oleh PPK. Biaya tersebut dapat dipotong oleh PPK dari nilai tagihan atau jaminan pelaksanaan Penyedia.'],
      ['e.', 'Terlepas dari kewajiban penggantian biaya, PPK memasukkan Penyedia yang lalai memperbaiki cacat mutu ke dalam Daftar Hitam.']
    ]
  },
  {
    no: '34.',
    title: 'Pedoman Pengoperasian dan Perawatan',
    items: [
      ['34.1', 'Apabila diperlukan, Penyedia diwajibkan memberikan petunjuk kepada PPK tentang pedoman pengoperasian dan perawatan dalam jangka waktu sebagaimana ditetapkan dalam SSKK.']
    ]
  },
  {
    no: '35.',
    title: 'Layanan Tambahan',
    items: [
      ['', 'Penyedia harus melaksanakan beberapa atau semua layanan lanjutan sebagaimana tercantum dalam SSKK.']
    ]
  },

  { subsection: 'B.3 Perubahan Kontrak' },
  {
    no: '36.',
    title: 'Perubahan Kontrak',
    items: [
      ['36.1', 'Kontrak hanya dapat diubah melalui adendum kontrak.'],
      ['36.2', 'Perubahan Kontrak bisa dilaksanakan apabila disetujui oleh para pihak dan dituangkan melalui amandemen/adendum Kontrak, meliputi:\na. perubahan pekerjaan disebabkan oleh sesuatu hal yang dilakukan oleh para pihak dalam kontrak sehingga mengubah lingkup pekerjaan dalam kontrak;\nb. perubahan jadwal pelaksanaan pekerjaan akibat adanya perubahan pekerjaan;\nc. perubahan harga kontrak akibat adanya perubahan pekerjaan, perubahan pelaksanaan pekerjaan dan/atau penyesuaian harga.'],
      ['36.3', 'Untuk kepentingan perubahan kontrak, PA/KPA dapat membentuk Panitia/Pejabat Peneliti Pelaksanaan Kontrak atas usul PPK.']
    ]
  },
  {
    no: '37.',
    title: 'Perubahan Lingkup Pekerjaan',
    items: [
      ['37.1', 'Apabila terdapat perbedaan yang signifikan antara keadaan di lapangan pada saat pelaksanaan dengan gambar dan spesifikasi yang ditentukan dalam dokumen Kontrak, maka PPK bersama penyedia dapat melakukan perubahan Kontrak yang meliputi antara lain:\na. menambah atau mengurangi volume pekerjaan yang tercantum dalam Kontrak;\nb. mengurangi atau menambah jenis pekerjaan;\nc. mengubah spesifikasi pekerjaan sesuai dengan keadaan di lapangan; dan/atau\nd. melaksanakan pekerjaan tambah yang belum tercantum dalam Kontrak yang diperlukan untuk menyelesaikan seluruh pekerjaan.'],
      ['37.2', 'Pekerjaan tambah harus mempertimbangkan tersedianya anggaran dan paling tinggi 10% (sepuluh perseratus) dari nilai Kontrak awal.'],
      ['37.3', 'Perintah perubahan pekerjaan dibuat oleh PPK secara tertulis kepada penyedia kemudian dilanjutkan dengan negosiasi teknis dan harga dengan tetap mengacu pada ketentuan yang tercantum dalam Kontrak awal.'],
      ['37.4', 'Hasil negosiasi tersebut dituangkan dalam Berita Acara sebagai dasar penyusunan adendum Kontrak.']
    ]
  },
  {
    no: '38.',
    title: 'Perpanjangan Waktu Pelaksanaan Pekerjaan',
    items: [
      ['38.1', 'Perpanjangan waktu pelaksanaan dapat diberikan oleh PPK atas pertimbangan yang layak dan wajar untuk hal-hal sebagai berikut:\na. pekerjaan tambah;\nb. perubahan desain;\nc. keterlambatan yang disebabkan oleh PPK;\nd. masalah yang timbul di luar kendali penyedia; dan/atau\ne. Keadaan Kahar.'],
      ['38.2', 'Waktu penyelesaian pekerjaan dapat diperpanjang sekurang-kurangnya sama dengan waktu terhentinya kontrak akibat Keadaan Kahar.'],
      ['38.3', 'PPK dapat menyetujui perpanjangan waktu pelaksanaan setelah melakukan penelitian terhadap usulan tertulis yang diajukan oleh penyedia.'],
      ['38.4', 'PPK dapat menugaskan Panitia/Pejabat Peneliti Pelaksanaan Kontrak untuk meneliti kelayakan usaha perpanjangan waktu pelaksanaan.'],
      ['38.5', 'Persetujuan perpanjangan waktu pelaksanaan dituangkan dalam adendum Kontrak.']
    ]
  },

  { subsection: 'B.4 Keadaan Kahar' },
  {
    no: '39.',
    title: 'Pengertian',
    items: [
      ['39.1', 'Yang dimaksud Keadaan Kahar dalam Kontrak ini adalah suatu keadaan yang terjadi di luar kehendak para pihak dan tidak dapat diperkirakan sebelumnya, sehingga kewajiban yang ditentukan dalam Kontrak menjadi tidak dapat dipenuhi. Yang digolongkan Keadaan Kahar adalah:\na. Bencana alam;\nb. Bencana non alam;\nc. Bencana sosial;\nd. Pemogokan;\ne. Kebakaran; dan/atau\nf. Gangguan industri lainnya sebagaimana dinyatakan melalui keputusan bersama Menteri Keuangan dan menteri teknis terkait.'],
      ['39.2', 'Tidak termasuk Keadaan Kahar adalah hal-hal yang merugikan akibat perbuatan atau kelalaian Para Pihak.'],
      ['39.3', 'Jangka waktu yang ditetapkan dalam Kontrak untuk pemenuhan kewajiban Pihak yang tertimpa Keadaan Kahar harus diperpanjang sekurang-kurangnya sama dengan jangka waktu terhentinya Kontrak akibat Keadaan Kahar.'],
      ['39.4', 'Pada saat terjadinya Keadaan Kahar, Kontrak ini akan dihentikan sementara hingga Keadaan Kahar berakhir dengan ketentuan, Penyedia berhak untuk menerima pembayaran sesuai dengan prestasi atau kemajuan pelaksanaan pekerjaan yang telah dicapai. Jika selama masa Keadaan Kahar PPK memerintahkan secara tertulis kepada Penyedia untuk meneruskan pekerjaan sedapat mungkin maka Penyedia berhak untuk menerima pembayaran sebagaimana ditentukan dalam Kontrak dan mendapat penggantian biaya yang wajar sesuai dengan yang telah dikeluarkan untuk bekerja dalam situasi demikian. Penggantian biaya ini harus diatur dalam suatu adendum Kontrak.']
    ]
  },
  {
    no: '40.',
    title: 'Bukan Cidera Janji',
    items: [
      ['40.1', 'Kegagalan salah satu Pihak untuk memenuhi kewajibannya yang ditentukan dalam Kontrak bukan merupakan cidera janji atau wanprestasi jika ketidakmampuan tersebut diakibatkan oleh Keadaan Kahar, dan Pihak yang ditimpa Keadaan Kahar:\na. telah mengambil semua tindakan yang sepatutnya untuk memenuhi kewajiban dalam Kontrak; dan\nb. telah memberitahukan secara tertulis kepada Pihak lain dalam Kontrak selambat-lambatnya 14 (empat belas) hari sejak terjadinya Keadaan Kahar, dengan menyertakan salinan pernyataan Keadaan Kahar yang dikeluarkan oleh pihak/instansi yang berwenang sesuai ketentuan peraturan perundang-undangan.'],
      ['40.2', 'Keterlambatan pengadaan akibat Keadaan Kahar tidak dikenakan sanksi.']
    ]
  },
  {
    no: '41.',
    title: 'Perpanjangan Waktu',
    items: [
      ['', 'Jangka waktu yang ditetapkan dalam Kontrak untuk pemenuhan kewajiban Pihak yang tertimpa Keadaan Kahar harus diperpanjang sekurang-kurangnya sama dengan jangka waktu terhentinya Kontrak akibat Keadaan Kahar.']
    ]
  },
  {
    no: '42.',
    title: 'Pembayaran',
    items: [
      ['', 'Pada saat terjadinya Keadaan Kahar, Kontrak ini akan dihentikan sementara hingga Keadaan Kahar berakhir dengan ketentuan Penyedia berhak untuk menerima pembayaran sesuai dengan prestasi atau kemajuan pelaksanaan pengadaan yang telah dicapai. Jika selama masa Keadaan Kahar, PPK memerintahkan secara tertulis kepada Penyedia untuk meneruskan pengadaan sedapat mungkin maka Penyedia berhak untuk menerima pembayaran sebagaimana ditentukan dalam Kontrak dan mendapat penggantian biaya yang wajar sesuai dengan yang telah dikeluarkan untuk melanjutkan pengadaan dalam situasi demikian.']
    ]
  },

  { subsection: 'B.5 Pemutusan dan Penghentian' },
  {
    no: '43.',
    title: 'Pemutusan oleh Pejabat Pembuat Komitmen',
    items: [
      ['43.1', 'Menyimpang dari Pasal 1266 dan 1267 Kitab Undang-Undang Hukum Perdata, PPK dapat memutuskan Kontrak ini melalui pemberitahuan tertulis kepada Penyedia setelah terjadinya hal-hal sebagai berikut:\na. Penyedia lalai/cidera janji dalam melaksanakan kewajibannya dan tidak memperbaiki kelalaiannya dalam jangka waktu yang telah ditetapkan;\nb. Penyedia gagal mengirimkan Barang sesuai dengan Jadwal Pengiriman dan Penyelesaian. Pemutusan dapat dilakukan hanya terhadap bagian tertentu dari pengadaan yang gagal dikirimkan atau diselesaikan. Dalam hal terjadi pemutusan, PPK dengan caranya sendiri dapat memperoleh pasokan Barang yang gagal dikirimkan atau diselesaikan. Penyedia berkewajiban untuk mengganti selisih biaya (jika ada) yang dikeluarkan oleh PPK di atas Nilai Kontrak ini untuk memasok Barang tersebut. Penyedia tetap berkewajiban untuk meneruskan pelaksanaan bagian lain dari pengadaan dalam Kontrak ini yang tidak diputuskan;\nc. Penyedia berada dalam keadaan pailit;\nd. Penyedia tidak mempertahankan keberlakuan Surat Jaminan Pelaksanaan;\ne. denda keterlambatan pelaksanaan pekerjaan akibat kesalahan Penyedia sudah melampaui 5% (lima perseratus) dari nilai Kontrak;\nf. Penyedia terbukti melakukan KKN, kecurangan dan/atau pemalsuan dalam proses Pengadaan yang diputuskan oleh instansi yang berwenang; dan/atau\ng. pengaduan tentang penyimpangan prosedur, dugaan KKN dan/atau pelanggaran persaingan sehat dalam pelaksanaan pengadaan dinyatakan benar oleh instansi yang berwenang.'],
      ['43.2', 'Dalam hal pemutusan Kontrak dilakukan karena kesalahan penyedia:\na. Jaminan Pelaksanaan dicairkan (apabila ada);\nb. sisa Uang Muka harus dilunasi oleh penyedia atau Jaminan Uang Muka dicairkan;\nc. penyedia membayar denda; dan/atau\nd. penyedia dimasukkan dalam Daftar Hitam.']
    ]
  },
  {
    no: '44.',
    title: 'Pemutusan oleh Penyedia',
    items: [
      ['44.1', 'Menyimpang dari Pasal 1266 dan 1267 Kitab Undang-Undang Hukum Perdata, Penyedia dapat memutuskan Kontrak ini melalui pemberitahuan tertulis kepada PPK apabila PPK tidak menerbitkan SPP untuk pembayaran tagihan angsuran sesuai dengan yang disepakati sebagaimana tercantum dalam SSKK; atau'],
      ['44.2', 'Dalam hal pemutusan Kontrak dilakukan karena PPK terlibat penyimpangan prosedur, dugaan KKN dan/atau pelanggaran persaingan sehat dalam pelaksanaan pengadaan, maka PPK dikenakan sanksi berdasarkan peraturan perundang-undangan.']
    ]
  },
  {
    no: '45.',
    title: 'Penghentian Kontrak',
    items: [
      ['', 'Penghentian Kontrak dapat dilakukan karena pekerjaan sudah selesai atau terjadi Keadaan Kahar.']
    ]
  },
  {
    no: '46.',
    title: 'Pembayaran setelah Penghentian/Pemutusan',
    items: [
      ['', 'Dalam hal Kontrak dihentikan atau diputus, maka PPK wajib membayar kepada penyedia sesuai dengan prestasi pekerjaan yang telah dicapai sampai dengan tanggal berlakunya penghentian/pemutusan kontrak.']
    ]
  },

  { section: 'C. HAK DAN KEWAJIBAN PENYEDIA' },
  {
    no: '47.',
    title: 'Hak dan Kewajiban Penyedia',
    items: [
      ['', 'Penyedia mempunyai Hak dan Kewajiban:\na. menerima pembayaran untuk pelaksanaan pekerjaan sesuai dengan harga yang telah ditentukan dalam kontrak;\nb. berhak meminta fasilitas-fasilitas dalam bentuk sarana dan prasarana dari PPK untuk kelancaran pelaksanaan pekerjaan sesuai ketentuan kontrak;\nc. melaporkan pelaksanaan pekerjaan secara periodik kepada PPK;\nd. melaksanakan dan menyelesaikan pekerjaan sesuai dengan jadwal pelaksanaan pekerjaan yang telah ditetapkan dalam kontrak;\ne. memberikan keterangan-keterangan yang diperlukan untuk pemeriksaan pelaksanaan yang dilakukan PPK;\nf. menyerahkan hasil pekerjaan sesuai dengan jadwal penyerahan pekerjaan yang telah ditetapkan dalam kontrak; dan\ng. penyedia harus mengambil langkah-langkah yang cukup memadai untuk melindungi lingkungan tempat kerja dan membatasi perusakan dan gangguan kepada masyarakat maupun miliknya akibat kegiatan penyedia.']
    ]
  },
  {
    no: '48.',
    title: 'Tanggung Jawab',
    items: [
      ['', 'Penyedia berkewajiban untuk memasok Barang sesuai dengan Lingkup Pengadaan, dan Jadwal Pengiriman dan Penyelesaian.']
    ]
  },
  {
    no: '49.',
    title: 'Penggunaan Dokumen-Dokumen Kontrak dan Informasi',
    items: [
      ['', 'Penyedia tidak diperkenankan menggunakan dan menginformasikan dokumen kontrak atau dokumen lainnya yang berhubungan dengan kontrak untuk kepentingan pihak lain, misalnya spesifikasi teknis dan/atau gambar-gambar, kecuali dengan izin tertulis dari PPK.']
    ]
  },
  {
    no: '50.',
    title: 'Hak Kekayaan Intelektual',
    items: [
      ['', 'Penyedia berkewajiban untuk melindungi Pejabat Pembuat Komitmen dari segala tuntutan atau klaim dari pihak ketiga atas pelanggaran Hak Kekayaan Intelektual.']
    ]
  },
  {
    no: '51.',
    title: 'Penanggungan',
    items: [
      ['', 'Penyedia berkewajiban untuk melindungi, membebaskan, dan menanggung tanpa batas PPK beserta instansinya terhadap semua bentuk tuntutan, tanggung jawab, kewajiban, kehilangan, kerugian, denda, gugatan atau tuntutan hukum, proses pemeriksaan hukum, dan biaya yang dikenakan terhadap PPK beserta instansinya sehubungan dengan klaim yang timbul dari pengadaan Barang yang tidak sesuai dengan spesifikasi dan persyaratan Kontrak ini atas kehilangan atau kerusakan harta benda, dan cidera tubuh, sakit atau kematian pihak ketiga.']
    ]
  },
  {
    no: '52.',
    title: 'Tindakan Penyedia yang Mensyaratkan Persetujuan PPK',
    items: [
      ['', 'Penyedia berkewajiban untuk mendapatkan lebih dahulu persetujuan tertulis PPK sebelum melakukan tindakan-tindakan berikut:\na. mensubkontrakkan sebagian pengadaan Barang ini;\nb. mengubah atau memutakhirkan program mutu;\nc. tindakan lain yang diatur dalam SSKK.']
    ]
  },
  {
    no: '53.',
    title: 'Usaha Mikro, Usaha Kecil dan Koperasi Kecil',
    items: [
      ['53.1', 'Apabila penyedia yang ditunjuk adalah penyedia Usaha Mikro, Usaha Kecil dan koperasi kecil, maka dalam kontrak dimuat ketentuan bahwa pekerjaan tersebut harus dilaksanakan sendiri oleh penyedia yang ditunjuk dan dilarang diserahkan atau disubkontrakkan kepada pihak lain.'],
      ['53.2', 'Apabila penyedia yang terpilih adalah penyedia bukan Usaha Mikro, Usaha Kecil dan koperasi kecil, maka dalam kontrak dimuat:\na. penyedia wajib bekerja sama dengan penyedia Usaha Mikro, Usaha Kecil dan koperasi kecil, antara lain dengan mensubkontrakkan sebagian pekerjaannya;\nb. dalam melaksanakan kewajiban di atas penyedia terpilih tetap bertanggung jawab penuh atas keseluruhan pekerjaan tersebut;\nc. bentuk kerja sama tersebut hanya untuk sebagian pekerjaan yang bukan pekerjaan utama; dan\nd. membuat laporan periodik mengenai pelaksanaan ketetapan di atas.'],
      ['53.3', 'Apabila ketentuan tersebut di atas dilanggar, maka penyedia dikenakan sanksi yang ditetapkan dalam SSKK.']
    ]
  },
  {
    no: '54.',
    title: 'Kerjasama Antara Penyedia dan Sub Penyedia',
    items: [
      ['54.1', 'Penyedia yang bukan berstatus Usaha Mikro dan Usaha Kecil serta koperasi kecil dapat bekerja sama dengan penyedia Usaha Mikro dan Usaha Kecil serta koperasi kecil sebagaimana ditetapkan dalam SSKK, yaitu dengan mensubkontrakkan sebagian pekerjaan yang bukan pekerjaan utama.'],
      ['54.2', 'Bagian pekerjaan yang disubkontrakkan tersebut harus diatur dalam Kontrak dan disetujui terlebih dahulu oleh PPK.'],
      ['54.3', 'Penyedia tetap bertanggung jawab atas bagian pekerjaan yang disubkontrakkan tersebut.'],
      ['54.4', 'Ketentuan-ketentuan dalam subkontrak harus mengacu kepada Kontrak serta menganut prinsip kesetaraan.']
    ]
  },
  {
    no: '55.',
    title: 'Denda',
    items: [
      ['', 'Penyedia berkewajiban untuk membayar sanksi finansial berupa denda sebagai akibat wanprestasi atau cidera janji terhadap kewajiban-kewajiban Penyedia dalam Kontrak ini. PPK mengenakan denda dengan memotong angsuran pembayaran prestasi pengadaan Penyedia. Pembayaran Denda tidak mengurangi tanggung jawab kontraktual Penyedia.']
    ]
  },
  {
    no: '56.',
    title: 'Jaminan (Apabila Ada)',
    items: [
      ['56.1', 'Jaminan Pelaksanaan diberikan kepada PPK selambat-lambatnya 14 (empat belas) hari kerja setelah diterbitkannya Surat Penunjukan Penyedia Barang/Jasa (SPPBJ) sebelum dilakukan penandatanganan kontrak dengan besar:\na. 5% (lima perseratus) dari nilai kontrak; atau\nb. 5% (lima perseratus) dari nilai total Harga Perkiraan Sendiri (HPS) bagi penawaran yang lebih kecil dari 80% (delapan puluh perseratus) HPS.'],
      ['56.2', 'Masa berlakunya Jaminan Pelaksanaan sekurang-kurangnya sejak tanggal penandatanganan kontrak sampai dengan serah terima pekerjaan.'],
      ['56.3', 'Jaminan Pelaksanaan dikembalikan setelah pekerjaan dinyatakan selesai 100% (seratus perseratus) dan setelah menyerahkan sertifikat garansi;'],
      ['56.4', 'Jaminan Uang Muka diberikan kepada PPK dalam rangka pengambilan uang muka dengan nilai 100% (seratus perseratus) dari besarnya uang muka;'],
      ['56.5', 'Nilai Jaminan Uang Muka dapat dikurangi secara proporsional sesuai dengan pencapaian prestasi pekerjaan;'],
      ['56.6', 'Masa berlakunya Jaminan Uang Muka sekurang-kurangnya sejak tanggal persetujuan pemberian uang muka sampai dengan tanggal serah terima barang;'],
      ['56.7', 'Besarnya jaminan, bentuk dan masa berlakunya jaminan-jaminan tersebut di atas disesuaikan dengan ketentuan dalam Dokumen Pengadaan.']
    ]
  },
  {
    no: '57.',
    title: 'Laporan Hasil Pekerjaan',
    items: [
      ['57.1', 'Pemeriksaan pekerjaan dilakukan selama pelaksanaan Kontrak untuk menetapkan volume pekerjaan atas kegiatan yang telah dilaksanakan guna pembayaran hasil pekerjaan. Hasil pemeriksaan pekerjaan dituangkan dalam laporan kemajuan hasil pekerjaan.'],
      ['57.2', 'Untuk kepentingan pengendalian dan pengawasan, dibuat laporan realisasi mengenai seluruh aktivitas pekerjaan.'],
      ['57.3', 'Laporan pelaksanaan pekerjaan dibuat oleh penyedia, apabila diperlukan diperiksa oleh konsultan/Tim Teknis dan disetujui oleh wakil PPK.']
    ]
  },

  { section: 'D. HAK DAN KEWAJIBAN PEJABAT PEMBUAT KOMITMEN' },
  {
    no: '58.',
    title: 'Hak dan Kewajiban PPK',
    items: [
      ['', 'PPK mempunyai Hak dan Kewajiban:\na. mengawasi dan memeriksa pekerjaan yang dilaksanakan oleh penyedia;\nb. meminta laporan-laporan secara periodik mengenai pelaksanaan pekerjaan yang dilakukan oleh penyedia;\nc. membayar pekerjaan sesuai dengan harga yang tercantum dalam kontrak yang telah ditetapkan kepada penyedia; dan\nd. memberikan fasilitas berupa sarana dan prasarana yang dibutuhkan oleh penyedia untuk kelancaran pelaksanaan pekerjaan sesuai ketentuan kontrak.']
    ]
  },
  {
    no: '59.',
    title: 'Fasilitas',
    items: [
      ['', 'PPK dapat memberikan fasilitas berupa sarana dan prasarana atau kemudahan lainnya untuk kelancaran pelaksanaan pengadaan sebagaimana yang tercantum dalam SSKK.']
    ]
  },
  {
    no: '60.',
    title: 'Pembayaran',
    items: [
      ['60.1', 'Uang muka (apabila ada):\na. Uang Muka dapat diberikan kepada Penyedia untuk:\n   1) pembayaran uang tanda jadi kepada pemasok barang/material; dan/atau\n   2) persiapan teknis lain yang diperlukan bagi pelaksanaan Pengadaan Barang.\nb. besaran uang muka ditentukan dalam SSKK dan dibayar setelah penyedia menyerahkan Jaminan Uang Muka senilai uang muka yang diterima;\nc. penyedia harus mengajukan permohonan pengambilan uang muka secara tertulis kepada PPK disertai dengan rencana penggunaan uang muka untuk melaksanakan pekerjaan sesuai Kontrak;\nd. PPK harus mengajukan Surat Permintaan Pembayaran (SPP) kepada Pejabat Penandatangan Surat Perintah Membayar (PPSPM) untuk permohonan tersebut pada huruf c, paling lambat 7 (tujuh) hari kerja setelah Jaminan Uang Muka diterima;\ne. Jaminan Uang Muka diterbitkan oleh bank umum, perusahaan penjaminan, atau Perusahaan Asuransi Umum yang memiliki izin untuk menjual produk jaminan (suretyship) yang ditetapkan oleh Menteri Keuangan;\nf. pengembalian uang muka harus diperhitungkan berangsur-angsur secara proporsional pada setiap pembayaran prestasi pekerjaan dan paling lambat harus lunas pada saat pekerjaan mencapai prestasi 100% (seratus perseratus);\ng. untuk kontrak tahun jamak, nilai Jaminan Uang Muka secara bertahap dapat dikurangi sesuai dengan pencapaian prestasi pekerjaan.'],
      ['60.2', 'Prestasi pekerjaan:\na. pembayaran prestasi hasil pekerjaan yang disepakati dilakukan oleh PPK, dengan ketentuan:\n   1) penyedia telah mengajukan tagihan disertai laporan kemajuan hasil pekerjaan;\n   2) pembayaran dilakukan dengan sistem bulanan, sistem termin atau pembayaran secara sekaligus, sesuai ketentuan dalam SSKK;\n   3) pembayaran harus dipotong angsuran uang muka, denda (apabila ada), pajak dan uang retensi; dan\n   4) untuk kontrak yang mempunyai subkontrak, permintaan pembayaran harus dilengkapi bukti pembayaran kepada seluruh subpenyedia sesuai dengan prestasi pekerjaan.\nb. Penyelesaian pembayaran hanya dapat dilaksanakan setelah barang dinyatakan diterima sesuai dengan Berita Acara Serah Terima (BAST) barang dan bilamana dianggap perlu dilengkapi dengan berita acara hasil uji coba.\nc. Pembayaran dengan L/C mengikuti ketentuan umum yang berlaku di bidang perdagangan.\nd. PPK dalam kurun waktu 7 (tujuh) hari kerja setelah pengajuan permintaan pembayaran dari penyedia harus sudah mengajukan Surat Permintaan Pembayaran (SPP) kepada Pejabat Penandatangan Surat Perintah Membayar (PPSPM).\ne. Bila terdapat ketidaksesuaian dalam perhitungan angsuran, tidak akan menjadi alasan untuk menunda pembayaran. PPK dapat meminta penyedia untuk menyampaikan perhitungan prestasi sementara dengan mengesampingkan hal-hal yang sedang menjadi perselisihan dan besarnya tagihan yang dapat disetujui untuk dibayar setinggi-tingginya sesuai ketentuan dalam SSKK.'],
      ['60.3', 'Denda dan ganti rugi:\na. denda merupakan sanksi finansial yang dikenakan kepada penyedia karena terjadinya cidera janji/wanprestasi;\nb. ganti rugi merupakan sanksi finansial yang dikenakan kepada PPK karena terjadinya cidera janji/wanprestasi;\nc. besarnya denda yang dikenakan kepada penyedia atas keterlambatan penyelesaian pekerjaan untuk setiap hari keterlambatan adalah:\n   1) 1/1000 (satu perseribu) dari sisa harga bagian kontrak yang belum dikerjakan, apabila bagian pekerjaan yang sudah dilaksanakan dapat berfungsi; atau\n   2) 1/1000 (satu perseribu) dari harga kontrak (sebelum PPN / DPP sesuai PMK 84/2025), apabila bagian pekerjaan yang sudah dilaksanakan belum berfungsi;\n   sesuai yang ditetapkan dalam SSKK;\nd. besarnya ganti rugi yang dibayar oleh PPK atas keterlambatan pembayaran adalah sebesar bunga dari nilai tagihan yang terlambat dibayar, berdasarkan tingkat suku bunga yang berlaku pada saat itu menurut ketetapan Bank Indonesia, atau dapat diberikan kompensasi;\ne. tata cara pembayaran denda dan/atau ganti rugi diatur dalam SSKK;\nf. ganti rugi dan kompensasi kepada peserta dituangkan dalam adendum kontrak;\ng. pembayaran ganti rugi dan kompensasi dilakukan oleh PPK, apabila penyedia telah mengajukan tagihan disertai perhitungan dan data-data.']
    ]
  },
  {
    no: '61.',
    title: 'Peristiwa Kompensasi',
    items: [
      ['61.1', 'Peristiwa kompensasi dapat diberikan kepada penyedia dalam hal sebagai berikut:\na. PPK mengubah jadwal yang dapat mempengaruhi pelaksanaan pekerjaan;\nb. keterlambatan pembayaran kepada penyedia;\nc. PPK tidak memberikan gambar-gambar, spesifikasi dan/atau instruksi sesuai jadwal yang dibutuhkan;\nd. PPK menginstruksikan kepada pihak penyedia untuk melakukan pengujian tambahan yang setelah dilaksanakan pengujian ternyata tidak ditemukan kerusakan/kegagalan/penyimpangan;\ne. PPK memerintahkan penundaan pelaksanaan pekerjaan;\nf. ketentuan lain dalam SSKK.'],
      ['61.2', 'Jika Peristiwa Kompensasi mengakibatkan pengeluaran tambahan dan/atau keterlambatan penyelesaian pekerjaan maka PPK berkewajiban untuk membayar ganti rugi dan/atau memberikan perpanjangan waktu penyelesaian pekerjaan.'],
      ['61.3', 'Ganti rugi hanya dapat dibayarkan jika berdasarkan data penunjang dan perhitungan kompensasi yang diajukan oleh penyedia kepada PPK, dapat dibuktikan kerugian nyata akibat Kompensasi.'],
      ['61.4', 'Jika terjadi Peristiwa Kompensasi sehingga penyelesaian pekerjaan akan melampaui Tanggal Penyelesaian maka penyedia berhak untuk meminta perpanjangan Tanggal Penyelesaian berdasarkan data penunjang. Perpanjangan Tanggal Penyelesaian harus dilakukan melalui adendum Kontrak jika perpanjangan tersebut mengubah Masa Kontrak.'],
      ['61.5', 'Penyedia tidak berhak atas ganti rugi dan/atau perpanjangan waktu penyelesaian pekerjaan jika penyedia gagal atau lalai untuk memberikan peringatan dini dalam mengantisipasi atau mengatasi dampak Kompensasi.']
    ]
  },
  {
    no: '62.',
    title: 'Harga Kontrak',
    items: [
      ['62.1', 'PPK membayar kepada penyedia atas pelaksanaan pekerjaan dalam kontrak sebesar harga kontrak;'],
      ['62.2', 'Harga Kontrak telah memperhitungkan keuntungan dan beban pajak serta biaya overhead.']
    ]
  },
  {
    no: '63.',
    title: 'Penangguhan',
    items: [
      ['63.1', 'PPK dapat menangguhkan pembayaran setiap angsuran prestasi pekerjaan penyedia jika penyedia gagal atau lalai memenuhi kewajiban kontraktualnya.'],
      ['63.2', 'PPK secara tertulis memberitahukan kepada penyedia tentang penangguhan hak pembayaran disertai alasan-alasan yang jelas mengenai penangguhan tersebut. Penyedia diberi kesempatan untuk memperbaiki dalam jangka waktu tertentu.'],
      ['63.3', 'Pembayaran yang ditangguhkan harus disesuaikan dengan proporsi kegagalan atau kelalaian penyedia.'],
      ['63.4', 'Jika dipandang perlu oleh PPK, penangguhan pembayaran akibat keterlambatan penyerahan pekerjaan dapat dilakukan bersamaan dengan pengenaan denda kepada penyedia.']
    ]
  },
  {
    no: '64.',
    title: 'Penyesuaian Harga (untuk Kontrak Harga Satuan atau Kontrak Gabungan)',
    items: [
      ['', 'Tidak diberlakukan.']
    ]
  },
  {
    no: '65.',
    title: 'Pengawasan dan Pemeriksaan',
    items: [
      ['', 'PPK berwenang melakukan pengawasan dan pemeriksaan terhadap pelaksanaan pekerjaan yang dilaksanakan oleh penyedia. Apabila diperlukan, PPK dapat memerintahkan kepada pihak ketiga/Tim Teknis untuk melakukan pengawasan dan pemeriksaan atas semua pelaksanaan pekerjaan yang dilaksanakan oleh penyedia.']
    ]
  },

  { section: 'E. PENYELESAIAN PERSELISIHAN' },
  {
    no: '66.',
    title: 'Penyelesaian Perselisihan',
    items: [
      ['', 'Cara penyelesaian perselisihan atau sengketa antara para pihak dalam Kontrak yang meliputi musyawarah, arbitrase, mediasi, konsiliasi atau pengadilan sesuai dengan ketentuan peraturan perundang-undangan sebagaimana ditetapkan dalam SSKK.']
    ]
  },
  {
    no: '67.',
    title: 'Itikad Baik',
    items: [
      ['67.1', 'Para pihak bertindak berdasarkan asas saling percaya yang disesuaikan dengan hak-hak yang terdapat dalam kontrak.'],
      ['67.2', 'Para pihak setuju untuk melaksanakan perjanjian dengan jujur tanpa menonjolkan kepentingan masing-masing pihak. Apabila selama kontrak, salah satu pihak merasa dirugikan, maka diupayakan tindakan yang terbaik untuk mengatasi keadaan tersebut.']
    ]
  }
];

function buildSskk25Rows(ctx, { isDraftStage7 = true, formatRupiah, terbilangRupiah, formatTanggalIndo }) {
  const { paket, penyedia, ppk, settings } = ctx;
  const bentuk = paket.bentuk_kontrak || 'Surat Pesanan';
  const jenis = paket.jenis_kontrak || 'Lumsum';
  const slaHari = Number(paket.masa_pelaksanaan_hari || 14);
  const slaTerbilang = terbilangRupiah(slaHari).replace(/\s*rupiah$/i, '').toLowerCase();
  const lokasiStr = paket.lokasi_pekerjaan || 'Kantor KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi';
  const umPersen = Number(paket.persen_uang_muka ?? 0);
  const hpsBasis = Number(paket.nilai_hps || paket.nilai_pagu || 0);
  const nilaiKontrakFinal = Number(paket.nilai_kontrak || hpsBasis || 0);
  const umNominal = Math.round(((isDraftStage7 ? hpsBasis : nilaiKontrakFinal) * umPersen) / 100);
  const caraBayar = paket.cara_pembayaran || 'Sekaligus (100% melalui SPM-LS setelah BAST 100%)';
  const basisDenda = paket.basis_denda || '1/1000 (satu perseribu) per hari dari Harga Kontrak sebelum PPN (DPP)';
  const garansiStr = paket.ketentuan_garansi || 'Sertifikat Garansi Purna Jual Resmi Pabrikan Minimal 1 Tahun (365 Hari Kalender) — Bebas Retensi 5%';
  const sengketaStr = paket.penyelesaian_sengketa || 'Musyawarah untuk Mufakat, dilanjutkan Layanan Penyelesaian Sengketa (LPS) LKPP';

  const namaPenyedia = !isDraftStage7 && penyedia && penyedia.nama_perusahaan
    ? penyedia.nama_perusahaan
    : '[DRAFT — Diisi Nama Badan Usaha Penyedia Terpilih setelah Tahap 9]';
  const namaDirektur = !isDraftStage7 && penyedia && penyedia.nama_direktur
    ? `${penyedia.nama_direktur} (${penyedia.jabatan_penandatangan || 'Direktur'})`
    : '[DRAFT — Diisi Nama Direktur / Wakil Sah Penyedia Terpilih]';
  const alamatPenyedia = !isDraftStage7 && penyedia && penyedia.alamat_perusahaan
    ? penyedia.alamat_perusahaan
    : '[DRAFT — Diisi Alamat Kantor Penyedia Terpilih]';
  const namaBank = !isDraftStage7 && penyedia && penyedia.nama_bank
    ? penyedia.nama_bank
    : '[DRAFT — Diisi Nama Bank Umum Penyedia pada Tahap 12]';
  const noRek = !isDraftStage7 && penyedia && penyedia.nomor_rekening
    ? penyedia.nomor_rekening
    : '[DRAFT — Diisi Nomor Rekening Bank Penyedia pada Tahap 12]';
  const atasNamaRek = !isDraftStage7 && penyedia && (penyedia.atas_nama_rekening || penyedia.nama_perusahaan)
    ? (penyedia.atas_nama_rekening || penyedia.nama_perusahaan)
    : '[DRAFT — Diisi Nama Pemilik Rekening Badan Usaha Penyedia]';
  const npwpPenyedia = !isDraftStage7 && penyedia && penyedia.npwp
    ? penyedia.npwp
    : '[DRAFT — Diisi NPWP Penyedia Terpilih]';

  const nilaiPembayaranStr = isDraftStage7
    ? `[DRAFT — Nilai Kontrak Final diisi setelah Negosiasi Tahap 9 & Penandatanganan Kontrak Tahap 13; Batas Tertinggi HPS: ${formatRupiah(hpsBasis)}]`
    : `${formatRupiah(nilaiKontrakFinal)} (${terbilangRupiah(nilaiKontrakFinal)})`;

  return [
    [
      'A. Pengertian',
      `1. Pengguna Anggaran adalah Pejabat pemegang kewenangan penggunaan anggaran pada : Komisi Pemilihan Umum Republik Indonesia.\n2. Tempat Tujuan Akhir adalah : ${lokasiStr}.`
    ],
    [
      'B. Korespondensi',
      `Alamat Para Pihak sebagai berikut:\nSatuan Kerja PPK : ${settings.nama_satker || 'Komisi Pemilihan Umum Kabupaten Ngawi'}\nNama : ${ppk.nama_lengkap || 'MOHAMMAD NOOR JIHAN'}\nAlamat Kantor : ${settings.alamat_satker || 'Jl. Untung Suropati No. 48, Ngawi'}\nTelepon : (0351) 743832\ne-mail : kab_ngawi@kpu.go.id\n\nPenyedia : ${namaPenyedia}\nNama Wakil Sah : ${namaDirektur}\nAlamat : ${alamatPenyedia}`
    ],
    [
      'C. Wakil Sah Para Pihak',
      `Wakil Sah Para Pihak sebagai berikut:\nUntuk PPK : ${ppk.nama_lengkap || 'MOHAMMAD NOOR JIHAN'} (NIP. ${ppk.nip || '19840101 200912 1 001'})\nUntuk Penyedia : ${namaDirektur}\nUntuk Paket Pekerjaan : ${(paket.nama_paket || '-').toUpperCase()}\nPengawas Pekerjaan : ${ppk.nama_lengkap || 'MOHAMMAD NOOR JIHAN'} (PPK KPU Kabupaten Ngawi dibantu Tim Teknis/Pengelola BMN).`
    ],
    [
      'D. Jenis Kontrak',
      `1. Kontrak berdasarkan cara pembayaran : Kontrak ${jenis} (Pasal 27 Perpres Nomor 46 Tahun 2025).\n2. Kontrak berdasarkan pembebanan Tahun Anggaran : Tahun Tunggal (TA ${paket.tahun_anggaran || '2026'}).\n3. Kontrak berdasarkan sumber pendanaan : ${paket.sumber_dana || 'APBN DIPA'} Satker KPU Kabupaten Ngawi Tahun Anggaran ${paket.tahun_anggaran || '2026'} (MAK ${paket.kode_akun_mak || '532111'} — ${paket.nama_akun_mak || 'Belanja Modal Peralatan dan Mesin'}).\n4. Kontrak berdasarkan jenis pekerjaan tunggal yaitu : ${(paket.nama_paket || '-').toUpperCase()}.`
    ],
    [
      'E. Tanggal Berlaku Kontrak',
      isDraftStage7
        ? `Kontrak mulai berlaku efektif terhitung sejak tanggal penandatanganan ${bentuk} oleh Para Pihak pada Tahap 13.`
        : `Kontrak mulai berlaku terhitung sejak tanggal ${formatTanggalIndo(paket.tgl_mulai_kerja || '2026-05-18')} (sejak ${bentuk} ditandatangani).`
    ],
    [
      'F. Jadwal Pelaksanaan Pekerjaan',
      `Penyedia harus menyelesaikan pekerjaan selama : ${slaHari} (${slaTerbilang}) Hari Kalender terhitung dimulai dari tanggal efektif ${bentuk}.`
    ],
    [
      'G. Serah Terima',
      `Serah terima barang/pekerjaan dilakukan pada Tempat Tujuan Akhir di : ${lokasiStr}.`
    ],
    [
      'H. Pemenuhan Kekurangan / Garansi Cacat Mutu',
      `1. ${garansiStr}.\n2. Apabila terdapat kekurangan kuantitas dan/atau kerusakan/cacat produksi (Dead on Arrival / DOA) saat pemeriksaan dan uji fungsi, maka pemberitahuan pemenuhan disampaikan kepada Penyedia maksimal 7 (tujuh) Hari Kalender.\n3. Penyedia bertanggung jawab melakukan penggantian unit baru (one-to-one replacement) dan mengirimkan serta diterima KPU Kabupaten Ngawi maksimal 7 (tujuh) Hari Kalender setelah menerima Berita Acara Hasil Pemeriksaan.`
    ],
    [
      'I. Pemeriksaan dan Pengujian',
      `Fungsi Pemeriksaan fisik, kelengkapan nomor seri pabrik (Serial Number), dan pengujian/uji coba operasional (Testing & Commissioning) dilaksanakan di ${lokasiStr}.`
    ],
    [
      'J. Pembayaran Tagihan',
      'Batas akhir waktu yang disepakati untuk penerbitan Surat Permintaan Pembayaran (SPP-LS) oleh PPK untuk pembayaran tagihan adalah maksimal 7 (tujuh) hari kerja / 14 (empat belas) hari kalender terhitung sejak tagihan dan kelengkapan dokumen penunjang yang tidak diperselisihkan diterima secara lengkap dan sah oleh PPK.'
    ],
    [
      'K. Inspeksi Pabrikasi',
      'PPK atau personil/Tim Teknis yang ditugaskan oleh PPK berkoordinasi dan memenuhi kaidah administratif dengan Penyedia apabila diperlukan pemeriksaan ketersediaan stok/inspeksi sebelum pengiriman.'
    ],
    [
      'L. Sanksi',
      'Pelanggaran terhadap ketentuan Pengalihan dan/atau Subkontrak pekerjaan utama dikenakan sanksi Pemutusan Kontrak secara sepihak oleh PPK dan pengenaan sanksi Daftar Hitam (Blacklist).'
    ],
    [
      'M. Tindakan Penyedia yang Mensyaratkan Persetujuan PPK',
      'Tindakan lain oleh Penyedia yang memerlukan persetujuan tertulis terlebih dahulu dari PPK adalah : Perubahan jadwal pengiriman, penyesuaian tipe/seri komponen yang setara/lebih tinggi, dan penggunaan Dokumen Kontrak untuk keperluan lain.'
    ],
    [
      'N. Kepemilikan Dokumen',
      'Penyedia diperbolehkan menggunakan salinan dokumen dari pekerjaan pengadaan ini dengan pembatasan sebagai berikut : Harus seizin tertulis dari PPK KPU Kabupaten Ngawi.'
    ],
    [
      'O. Fasilitas',
      'PPK memberikan fasilitas berupa akses lokasi ruangan instalasi dan daya listrik pengujian pada saat barang tiba di Kantor KPU Kabupaten Ngawi.'
    ],
    [
      'P. Sumber Pembiayaan',
      `Kontrak Pengadaan ${paket.jenis_pengadaan || 'Barang'} ini dibiayai dari ${paket.sumber_dana || 'APBN DIPA'} Satker KPU Kabupaten Ngawi Tahun Anggaran ${paket.tahun_anggaran || '2026'} (Kode RUP: ${paket.kode_rup || 'RUP-2026-657811-01'}, MAK ${paket.kode_akun_mak || '532111'}).`
    ],
    [
      'Q. Pembayaran Uang Muka',
      umPersen === 0
        ? 'Pekerjaan Pengadaan Barang ini TIDAK DIBERIKAN UANG MUKA (0%).'
        : `Dapat diberikan Uang Muka sebesar ${umPersen}% (${formatRupiah(umNominal)}) setelah Penyedia menyerahkan Jaminan Uang Muka senilai 100% dari nilai Uang Muka sesuai Pasal 29 Perpres Nomor 46 Tahun 2025.`
    ],
    [
      'R. Sistem Pembayaran',
      `Pembayaran pekerjaan dilakukan dengan cara : ${caraBayar}.`
    ],
    [
      'S. Pembayaran Pekerjaan',
      `PPK berkewajiban untuk melakukan Pembayaran kepada Penyedia sesuai dengan ketentuan ${bentuk} sebesar ${nilaiPembayaranStr}, sudah termasuk pajak PPN ${paket.tarif_ppn ?? 11}% dan dipungut ${paket.jenis_pph || 'PPh Pasal 22 (1,5%)'} sesuai ketentuan perpajakan APBN.\n\nDengan mekanisme pembayaran melalui Transfer SPM-LS KPPN ke Rekening Penyedia:\nNama Bank : ${namaBank}\nNomor Rekening : ${noRek}\nAtas Nama : ${atasNamaRek}\nNPWP : ${npwpPenyedia}\n\nDokumen penunjang yang dipersyaratkan untuk mengajukan tagihan pembayaran prestasi pekerjaan : Surat Permohonan Pembayaran, Kwitansi/Invoice, e-Faktur Pajak, Bukti Pemungutan Pajak, Berita Acara Pemeriksaan Hasil Pekerjaan (BAPHP), Berita Acara Uji Fungsi, Berita Acara Serah Terima (BAST), Sertifikat Garansi Resmi & Daftar Serial Number BMN, Rekening Koran, dan NPWP.`
    ],
    [
      'T. Denda dan Ganti Rugi',
      `Besarnya denda keterlambatan penyelesaian pekerjaan sebesar 1/1000 (satu perseribu / 1‰) untuk setiap Hari Kalender keterlambatan dengan basis pengenaan : ${basisDenda} (sesuai Pasal 78 ayat (5) Perpres Nomor 46 Tahun 2025 jo. PMK Nomor 84 Tahun 2025).`
    ],
    [
      'U. Metode Pengepakan',
      'Dikemas dalam kotak/karton orisinil tersegel pabrik (100% Brand New In Box / BNIB) dengan pelindung busa anti-guncangan dan pembungkus kedap air serta diberi label identitas barang.'
    ],
    [
      'V. Pengiriman',
      `1. Barang dikirimkan secara langsung (Franco) ke ${lokasiStr}.\n2. Pejabat Pembuat Komitmen (PPK) bersama Tim Teknis/Pengelola BMN melakukan pemeriksaan fisik dan uji fungsi setelah Penyedia melaporkan barang tiba dan siap diperiksa.\n3. Setelah pekerjaan dinyatakan selesai 100% dan berfungsi baik oleh PPK, selanjutnya diterbitkan Berita Acara Pemeriksaan Hasil Pekerjaan (BAPHP) dan Berita Acara Serah Terima (BAST).`
    ],
    [
      'W. Kompensasi',
      'Penyedia dapat memperoleh kompensasi perpanjangan waktu apabila keterlambatan murni disebabkan oleh perintah tertulis atau kelalaian PPK sesuai Pasal 61 SSUK.'
    ],
    [
      'X. Harga Kontrak',
      `Kontrak Pengadaan ini dibiayai dari sumber pendanaan ${paket.sumber_dana || 'APBN DIPA'} KPU Kabupaten Ngawi Tahun Anggaran ${paket.tahun_anggaran || '2026'} dan bersifat mengikat (${jenis}).`
    ],
    [
      'Y. Penyesuaian Harga',
      'Tidak diberlakukan.'
    ]
  ];
}

module.exports = {
  SSUK_67_ROWS,
  buildSskk25Rows
};
