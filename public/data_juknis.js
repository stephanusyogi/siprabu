/**
 * SI-PRABU v3.0 - DATA JUKNIS STANDAR 28 KEGIATAN KEPUTUSAN KPU NO. 543 TAHUN 2022
 * Lampiran V: Petunjuk Teknis Penyusunan Anggaran Kebutuhan Barang/Jasa dan Honorarium
 * Pemilihan Gubernur/Bupati/Walikota (Bab II Huruf B & C, Hal. 25-89).
 */

const JUKNIS_KPT543_DATA = [
  {
    nomor: 1,
    nama: "Perencanaan Program dan Anggaran",
    tahapan: "PERSIAPAN",
    divisi: "Rendatin",
    subbag: "Subbag Perencanaan, Data dan Informasi",
    deskripsi: "Usulan kebutuhan pendanaan kegiatan Pemilihan dibahas bersama antara TAPD dengan KPU Kabupaten/Kota untuk Pemilihan Bupati dan Wakil Bupati. Menjadi pintu gerbang legal seluruh siklus anggaran Pemilihan.",
    bentuk_kegiatan: [
      "Rapat penyusunan Rencana Kebutuhan Barang (RKB) / Rencana Anggaran Biaya (RAB) internal Satker.",
      "Rapat pembahasan internal KPU dan koordinasi bersama TAPD serta DPRD Kabupaten Ngawi.",
      "Koordinasi/benchmarking dengan KPU Provinsi Jawa Timur dan KPU Kabupaten/Kota lain yang telah menyelenggarakan Pemilihan.",
      "Perbaikan, sinkronisasi, dan finalisasi dokumen usulan pendanaan."
    ],
    komponen_belanja: [
      {
        akun: "521211",
        nama: "Belanja Bahan",
        item: "Alat Tulis Kantor (block note, ballpoint, map), publikasi fisik (spanduk, backdrop rapat), konsumsi rapat persiapan & pembahasan, tas/seminar kit, penggandaan modul & penjilidan dokumen RKB/RAB."
      },
      {
        akun: "521213",
        nama: "Honor Output Kegiatan",
        item: "Honorarium Pokja Penyusunan, Perencanaan, Perubahan/Revisi Rencana Anggaran Pemilihan (maksimal 13 orang untuk KPU Kab/Kota, masa kerja paling lama 3 bulan)."
      },
      {
        akun: "521219",
        nama: "Belanja Paket Meeting / Transportasi",
        item: "Biaya transportasi dalam kota peserta dan panitia rapat koordinasi bersama instansi terkait."
      }
    ],
    rambu_larangan: [
      "Pengusulan kebutuhan pendanaan wajib berpedoman pada SBM, SBML Kemenkeu, dan Harga Pasar yang wajar.",
      "Apabila tidak tercantum dalam SBM/SBML, wajib mengacu pada Standar Satuan Harga (SSH/ASB) yang ditetapkan Bupati Ngawi.",
      "Apabila Pilgub diselenggarakan bersamaan dengan Pilbup, pendanaan dibebankan secara proporsional (cost-sharing) sesuai kesepakatan Gubernur dan Bupati."
    ],
    output_spj: [
      "Dokumen RKB/RAB Usulan Resmi KPU Kabupaten Ngawi.",
      "Berita Acara Hasil Pembahasan Bersama TAPD.",
      "Surat Keputusan (SK) Pembentukan Pokja Perencanaan beserta Laporan Hasil Pelaksanaan Bab I-IV."
    ]
  },
  {
    nomor: 2,
    nama: "Penyusunan dan Penandatanganan NPHD serta Registrasi/Pengesahan Hibah",
    tahapan: "PERSIAPAN",
    divisi: "Keuangan, Umum & Logistik",
    subbag: "Subbag Keuangan, Umum dan Logistik",
    deskripsi: "Penyusunan naskah hibah, penandatanganan Naskah Perjanjian Hibah Daerah (NPHD) oleh Bupati Ngawi dan Ketua KPU, penerbitan nomor register hibah di Kanwil DJPB, pembukaan rekening hibah di KPPN, hingga revisi pengesahan DIPA Program 076.CQ.",
    bentuk_kegiatan: [
      "Penyusunan draf NPHD dan pakta integritas bersama Bagian Tata Pemerintahan / BPKAD Pemkab Ngawi.",
      "Seremonial penandatanganan NPHD oleh Bupati Ngawi dan Ketua KPU Kabupaten Ngawi.",
      "Permohonan penerbitan nomor register hibah uang luar negeri/dalam negeri kepada Kepala Kanwil Ditjen Perbendaharaan (DJPB).",
      "Permohonan izin pembukaan rekening penampung hibah ke KPPN setempat.",
      "Pengajuan revisi anggaran penambahan pagu belanja hibah pada DIPA Satker KPU Kabupaten Ngawi ke Kanwil DJPB."
    ],
    komponen_belanja: [
      {
        akun: "521211",
        nama: "Belanja Bahan",
        item: "ATK penyiapan berkas, meterai naskah perjanjian, konsumsi rapat harmonisasi naskah NPHD, penggandaan dan penjilidan buku NPHD resmi."
      },
      {
        akun: "524111",
        nama: "Perjalanan Dinas Biasa / Luar Kota",
        item: "Perjalanan dinas konsultasi dan pengurusan nomor register hibah ke Kanwil DJPB Jawa Timur di Surabaya."
      },
      {
        akun: "524113",
        nama: "Perjalanan Dinas Dalam Kota",
        item: "Transportasi koordinasi ke Kantor Pelayanan Perbendaharaan Negara (KPPN) dan BPKAD Pemkab Ngawi."
      }
    ],
    rambu_larangan: [
      "Ketua KPU Kabupaten/Kota menandatangani NPHD bukan bertindak sebagai Pengguna Anggaran (PA), melainkan sebagai penerima hibah lembaga.",
      "Dana hibah dalam bentuk uang TIDAK BOLEH digunakan sebelum terbit Nomor Register dari Kanwil DJPB dan disahkan ke dalam DIPA.",
      "Jumlah yang diregistrasikan ke DJPB wajib sama persis dengan nominal rupiah yang tercantum pada NPHD.",
      "Jika masih ada sisa dana hibah setelah seluruh tahapan berakhir, KPU WAJIB mengembalikan sisa dana hibah ke Kas Daerah paling lambat 3 bulan setelah berakhirnya tahapan."
    ],
    output_spj: [
      "Naskah Perjanjian Hibah Daerah (NPHD) Asli bermeterai dan bertandatangan Bupati & Ketua KPU.",
      "Surat Pakta Integritas Penggunaan Dana Hibah.",
      "Surat Penerbitan Nomor Register Hibah dari Kepala Kanwil DJPB.",
      "Surat Persetujuan Izin Pembukaan Rekening Penampung Hibah dari KPPN.",
      "DIPA Petikan Hasil Revisi Penambahan Pagu Belanja Hibah Langsung (076.CQ)."
    ]
  },
  {
    nomor: 3,
    nama: "Penyusunan Produk Hukum (Keputusan) dan Berita Acara Penyelenggara Pemilihan",
    tahapan: "PERSIAPAN",
    divisi: "Hukum & Pengawasan",
    subbag: "Subbag Hukum dan SDM",
    deskripsi: "Penyusunan seluruh instrumen regulasi turunan berupa Keputusan KPU Kabupaten Ngawi dan Berita Acara Rapat Pleno untuk memberikan kepastian hukum pada setiap tahapan Pemilihan.",
    bentuk_kegiatan: [
      "Rapat pembahasan dan perumusan naskah Keputusan KPU dan Berita Acara Pleno.",
      "Pengadaan alat tulis kantor, penggandaan naskah bahan draf regulasi, dan konsumsi rapat.",
      "Pembentukan Kelompok Kerja (Pokja) Penyusunan Produk Hukum.",
      "Pembekalan materi/peningkatan kompetensi legal drafting penyusunan keputusan.",
      "Pengesahan, pendokumentasian fisik, dan publikasi digital pada laman JDIH KPU Kabupaten Ngawi."
    ],
    komponen_belanja: [
      {
        akun: "521211",
        nama: "Belanja Bahan",
        item: "ATK drafting regulasi, map arsip hukum, konsumsi rapat penyusunan keputusan, penggandaan naskah SK dan Berita Acara Pleno."
      },
      {
        akun: "521213",
        nama: "Honor Output Kegiatan",
        item: "Honorarium Pokja Penyusunan Produk-Produk Hukum / Keputusan (maksimal 13 orang untuk KPU Kab/Kota, masa kerja paling lama 3 bulan)."
      }
    ],
    rambu_larangan: [
      "Masa kerja Pokja Produk Hukum dibatasi paling lama 3 bulan.",
      "Personel yang masuk dalam Pokja Produk Hukum terikat aturan pengendalian honorarium: maksimal hanya boleh menerima honor dari 2 Pokja dalam satu tahun anggaran.",
      "Setiap produk hukum yang diterbitkan wajib diadministrasikan dan diunggah ke portal JDIH resmi."
    ],
    output_spj: [
      "Surat Keputusan (SK) KPU Kabupaten Ngawi tentang Penetapan Pedoman Teknis / Hasil Tahapan.",
      "Berita Acara (BA) Rapat Pleno Komisioner KPU.",
      "Laporan Hasil Kerja Pokja Penyusunan Produk Hukum (Bab I Pendahuluan s.d Bab IV Penutup)."
    ]
  },
  {
    nomor: 4,
    nama: "Sosialisasi, Penyuluhan, Bimbingan Teknis, dan Relawan Demokrasi",
    tahapan: "PERSIAPAN",
    divisi: "Sosdiklih, Parmas & SDM",
    subbag: "Subbag Teknis Penyelenggaraan Pemilu, Partisipasi dan Hubungan Masyarakat",
    deskripsi: "Pelaksanaan sosialisasi dan pendidikan pemilih kepada berbagai basis masyarakat guna meningkatkan partisipasi pemilih, termasuk pembentukan Program Gerakan Relawan Demokrasi.",
    bentuk_kegiatan: [
      "Sosialisasi tatap muka / penyuluhan ke basis pemilih (pemula, perempuan, disabilitas, keagamaan, komunitas marjinal).",
      "Sosialisasi melalui media cetak, media elektronik, radio lokal, dan media digital/medsos.",
      "Pemasangan Alat Peraga Sosialisasi (APS) seperti spanduk, baliho, dan pembagian brosur/leaflet.",
      "Rekrutmen dan pembekalan Program Relawan Demokrasi (masa tugas 3 bulan).",
      "Penyelenggaraan bimbingan teknis sosialisasi kepada jajaran PPK dan PPS."
    ],
    komponen_belanja: [
      {
        akun: "521211",
        nama: "Belanja Bahan",
        item: "Spanduk sosialisasi, pamflet/leaflet, konsumsi peserta & narasumber sosialisasi, perlengkapan kit peserta, atribut/rompi Relawan Demokrasi."
      },
      {
        akun: "521213",
        nama: "Honor Output Kegiatan",
        item: "Honor Pokja Sosialisasi dan Partisipasi Masyarakat / Bimtek (maksimal 15 orang, masa kerja paling lama 3 bulan) dan Honor Narasumber ahli/profesional."
      },
      {
        akun: "521219",
        nama: "Belanja Paket Meeting / Transportasi",
        item: "Uang transport peserta penyuluhan tatap muka dan uang transport/operasional kegiatan Relawan Demokrasi."
      }
    ],
    rambu_larangan: [
      "RELAWAN DEMOKRASI DIBAYARKAN DENGAN UANG TRANSPORT ATAU MEKANISME LAIN YANG BERKENAAN DENGAN TUGASNYA, DAN TIDAK DIPERKENANKAN MEMBAYAR DENGAN MEKANISME HONORARIUM PER BULAN (OB) KARENA BELUM MEMILIKI STANDAR SBML.",
      "Jika ada pembayaran per bulan (OB), menjadi tanggung jawab mutlak KPA Satker dengan justifikasi yang sah.",
      "Masa kerja Relawan Demokrasi paling lama 3 bulan menyesuaikan tahapan berjalan."
    ],
    output_spj: [
      "Laporan pelaksanaan sosialisasi per basis pemilih beserta dokumentasi foto & daftar hadir.",
      "SK Pembentukan Relawan Demokrasi dan rekapitulasi laporan kegiatan lapangan.",
      "Laporan Kinerja Pokja Sosialisasi & Parmas."
    ]
  },
  {
    nomor: 5,
    nama: "Pembentukan dan Pembubaran Badan Ad Hoc (PPK, PPS, KPPS, dan Pantarlih)",
    tahapan: "PENYELENGGARAAN",
    divisi: "Sosdiklih, Parmas & SDM",
    subbag: "Subbag Hukum dan SDM",
    deskripsi: "Seleksi terbuka, penetapan, pelantikan resmi, pengambilan sumpah/janji rohaniwan, pembekalan bimtek tata kerja, hingga pembubaran badan ad hoc penyelenggara di tingkat kecamatan, desa, dan TPS.",
    bentuk_kegiatan: [
      "Pengumuman pendaftaran dan penerimaan berkas pendaftaran calon anggota PPK, PPS, KPPS, dan Pantarlih.",
      "Pelaksanaan seleksi administrasi, seleksi tertulis (CAT/manual), dan tes wawancara.",
      "Rapat pleno penetapan calon anggota terpilih.",
      "Upacara pelantikan resmi dan pengambilan sumpah/janji oleh rohaniwan.",
      "Bimbingan teknis awal tata kerja dan integritas penyelenggara adhoc."
    ],
    komponen_belanja: [
      {
        akun: "521211",
        nama: "Belanja Bahan",
        item: "ATK pendaftaran/ujian, konsumsi rapat panitia seleksi, konsumsi upacara pelantikan, sewa gedung/sound system pelantikan, penggandaan naskah sumpah dan pakta integritas."
      },
      {
        akun: "521213",
        nama: "Honor Output Kegiatan",
        item: "Honorarium Pokja Fasilitasi Pembentukan Badan Ad Hoc (maksimal 15 orang, masa kerja paling lama 3 bulan) dan honor rohaniwan pelantikan (sesuai SBM)."
      },
      {
        akun: "521219",
        nama: "Belanja Paket Meeting / Transportasi",
        item: "Uang transport calon anggota PPK/PPS saat menghadiri tahapan tes wawancara dan pelantikan di ibukota kabupaten."
      }
    ],
    rambu_larangan: [
      "Jadwal pembentukan PPK: paling lambat 9 bulan sebelum pemungutan suara dan dibubarkan paling lambat 2 bulan setelah pemungutan suara.",
      "Jadwal pembentukan PPS: paling lambat 8 bulan sebelum pemungutan suara dan dibubarkan paling lambat 2 bulan setelah pemungutan suara.",
      "Jadwal pembentukan KPPS: paling lambat 1 bulan sebelum pemungutan suara.",
      "Pantarlih/PPDP diangkat dan diberhentikan dengan Keputusan KPU Kabupaten/Kota."
    ],
    output_spj: [
      "Surat Keputusan (SK) Penetapan Anggota PPK, PPS, KPPS, dan Pantarlih.",
      "Berita Acara Pengambilan Sumpah/Janji Pelantikan.",
      "Pakta Integritas Badan Ad Hoc bertandatangan.",
      "Laporan Pelaksanaan Kerja Pokja Pembentukan Badan Ad Hoc."
    ]
  },
  {
    nomor: 6,
    nama: "Pemutakhiran Data Pemilih dan Penyusunan Daftar Pemilih (Coklit s.d DPT)",
    tahapan: "PENYELENGGARAAN",
    divisi: "Rendatin",
    subbag: "Subbag Perencanaan, Data dan Informasi",
    deskripsi: "Rangkaian pengelolaan data pemilih menggunakan aplikasi SIDALIH, pencocokan dan penelitian (Coklit) oleh Pantarlih di lapangan, rekapitulasi terbuka DPS, DPSHP, DPT, hingga pemeliharaan DPTb.",
    bentuk_kegiatan: [
      "Bimtek pengoperasian SIDALIH bagi operator KPU Kabupaten/Kota, PPK, dan PPS.",
      "Pengadaan kelengkapan Coklit (formulir tanda bukti, stiker Coklit, buku panduan pemutakhiran, ATK Pantarlih).",
      "Pelaksanaan Coklit secara sensus door-to-door oleh Pantarlih di seluruh TPS.",
      "Penyusunan, penetapan, dan pengumuman DPS di kantor desa/kelurahan.",
      "Penerimaan tanggapan masyarakat dan perbaikan DPS menjadi DPSHP.",
      "Rapat pleno terbuka rekapitulasi dan penetapan Daftar Pemilih Tetap (DPT) di tingkat PPS, PPK, dan KPU Kab/Kota.",
      "Penyusunan Daftar Pemilih Tambahan (DPTb) menjelang hari pemungutan suara."
    ],
    komponen_belanja: [
      {
        akun: "521211",
        nama: "Belanja Bahan",
        item: "Formulir Model A-Daftar Pemilih, stiker bukti Coklit per KK, buku saku/panduan Pantarlih, ATK Coklit, konsumsi rapat pleno terbuka DPS/DPT di tingkat PPS, PPK, dan KPU Kab/Kota, penggandaan salinan DPT untuk Paslon & Bawaslu."
      },
      {
        akun: "521213",
        nama: "Honor Output Kegiatan",
        item: "Honorarium Pokja Pemutakhiran Data Pemilih dan Penyusunan Daftar Pemilih (maksimal 15 orang, masa kerja paling lama 3 bulan)."
      },
      {
        akun: "521219",
        nama: "Belanja Transportasi / Meeting",
        item: "Transportasi koordinasi dan rapat pleno rekapitulasi data pemilih berjenjang."
      }
    ],
    rambu_larangan: [
      "Kegiatan pemutakhiran data pemilih dilaksanakan 6 bulan sebelum hari pemungutan suara.",
      "SIDALIH memerlukan dukungan koneksi internet berkecepatan minimal 1 Mbps.",
      "Salinan DPT wajib diserahkan dalam bentuk softcopy dan hardcopy kepada Bawaslu, Tim Paslon tingkat kecamatan/kabupaten, dan Dispendukcapil."
    ],
    output_spj: [
      "Berita Acara & SK Penetapan Rekapitulasi DPS, DPSHP, dan DPT tingkat Kabupaten.",
      "Rekapitulasi Formulir Model A-Kabko Rekapitulasi Daftar Pemilih.",
      "Laporan Hasil Kerja Pokja Mutarlih."
    ]
  },
  {
    nomor: 7,
    nama: "Penyerahan, Verifikasi Dukungan dan Rekapitulasi Calon Perseorangan",
    tahapan: "PENYELENGGARAAN",
    divisi: "Teknis Penyelenggaraan",
    subbag: "Subbag Teknis Penyelenggaraan Pemilu, Partisipasi dan Hubungan Masyarakat",
    deskripsi: "Penerimaan berkas syarat dukungan bakal pasangan calon perseorangan, verifikasi administrasi kesesuaian identitas/kegandaan di SILON, verifikasi faktual door-to-door metode sensus oleh PPS, dan pleno rekapitulasi dukungan.",
    bentuk_kegiatan: [
      "Penerimaan penyerahan dokumen syarat dukungan (KTP-el/Suket & Form B.1-KWK Perseorangan).",
      "Penelitian administrasi kelengkapan dokumen dan analisis kegandaan dukungan dengan DPT/DP4.",
      "Verifikasi faktual (Verfak) sensus door-to-door oleh PPS mendatangi tempat tinggal pendukung.",
      "Penelitian faktual masa perbaikan dukungan pasangan calon.",
      "Rapat pleno terbuka rekapitulasi hasil verifikasi faktual di tingkat PPS, PPK, dan KPU Kabupaten/Kota."
    ],
    komponen_belanja: [
      {
        akun: "521211",
        nama: "Belanja Bahan",
        item: "ATK penerimaan berkas, map arsip dukungan, lembar kerja verifikator, konsumsi tim verifikator administrasi, konsumsi rapat pleno rekapitulasi dukungan."
      },
      {
        akun: "521213",
        nama: "Honor Output Kegiatan",
        item: "Honorarium Pokja Verifikasi Persyaratan Pasangan Calon Perseorangan (maksimal 15 orang, masa kerja paling lama 3 bulan)."
      },
      {
        akun: "521219",
        nama: "Belanja Transportasi Lapangan",
        item: "Uang transport / biaya perjalanan verifikator lapangan (PPS) mendatangi tempat tinggal pendukung (sensus)."
      }
    ],
    rambu_larangan: [
      "Penyerahan dokumen syarat dukungan diserahkan paling lambat 28 hari sebelum waktu pendaftaran pasangan calon dimulai.",
      "Verifikasi faktual wajib dilakukan dengan cara sensus (mendatangi langsung setiap pendukung) didampingi pengawas.",
      "Jika tidak ada bakal pasangan calon perseorangan yang menyerahkan dukungan, alokasi anggaran kegiatan ini TIDAK BOLEH direalisasikan."
    ],
    output_spj: [
      "Berita Acara Penerimaan Dokumen Syarat Dukungan Perseorangan.",
      "Berita Acara Hasil Verifikasi Administrasi dan Verifikasi Faktual tingkat PPS, PPK, dan KPU Kab/Kota.",
      "SK Penetapan Pemenuhan Syarat Dukungan Pasangan Calon Perseorangan."
    ]
  },
  {
    nomor: 8,
    nama: "Pencalonan (Pendaftaran, Pemeriksaan Kesehatan, Penelitian Berkas & Pengundian Nomor Urut)",
    tahapan: "PENYELENGGARAAN",
    divisi: "Teknis Penyelenggaraan",
    subbag: "Subbag Teknis Penyelenggaraan Pemilu, Partisipasi dan Hubungan Masyarakat",
    deskripsi: "Pengumuman masa pendaftaran, penerimaan berkas pendaftaran paslon dari Parpol/Gabungan Parpol/Perseorangan, pemeriksaan kemampuan kesehatan rohani-jasmani & bebas narkoba, verifikasi ijazah/keabsahan dokumen, penetapan paslon resmi, dan rapat pleno pengundian nomor urut.",
    bentuk_kegiatan: [
      "Pengumuman pendaftaran melalui media massa cetak/elektronik dan papan pengumuman/web KPU.",
      "Penerimaan pendaftaran dan berkas persyaratan pasangan calon.",
      "Koordinasi bersama Ikatan Dokter Indonesia (IDI) dan penetapan RS Pemerintah untuk pemeriksaan kesehatan.",
      "Pelaksanaan pemeriksaan kesehatan rohani, jasmani, dan bebas narkotika bagi pasangan calon.",
      "Penelitian keabsahan dokumen persyaratan calon (termasuk verfak klarifikasi ijazah ke instansi penerbit).",
      "Penerimaan dan penelitian dokumen perbaikan persyaratan calon.",
      "Rapat pleno penetapan pasangan calon peserta Pemilihan.",
      "Rapat pleno terbuka pengundian dan pengumuman nomor urut pasangan calon."
    ],
    komponen_belanja: [
      {
        akun: "521211",
        nama: "Belanja Bahan",
        item: "ATK pendaftaran, dekorasi/backdrop aula pendaftaran, konsumsi tim verifikator berkas, konsumsi pleno penetapan dan pengundian nomor urut, plakat/nomor urut paslon."
      },
      {
        akun: "521213",
        nama: "Honor Output Kegiatan",
        item: "Honorarium Pokja Pendaftaran dan Penetapan Pasangan Calon (maksimal 13 orang, masa kerja paling lama 3 bulan)."
      },
      {
        akun: "522191",
        nama: "Belanja Jasa Lainnya (Pemeriksaan Kesehatan)",
        item: "Biaya pelaksanaan tes pemeriksaan kesehatan rohani, jasmani, dan tes bebas narkoba bagi pasangan calon di RS Pemerintah rujukan KPU & IDI."
      },
      {
        akun: "524111",
        nama: "Perjalanan Dinas Klarifikasi Berkas",
        item: "Biaya perjas luar daerah/kota untuk verifikasi klarifikasi keabsahan ijazah/dokumen ke sekolah/universitas/pengadilan penerbit."
      }
    ],
    rambu_larangan: [
      "Pemeriksaan kesehatan paslon wajib berkoordinasi dengan IDI dan dilaksanakan di rumah sakit pemerintah yang ditunjuk resmi.",
      "Pengundian nomor urut wajib dihadiri Paslon, Bawaslu, parpol pengusung, tim kampanye, media massa, dan tokoh masyarakat secara transparan."
    ],
    output_spj: [
      "Berita Acara Penerimaan Pendaftaran Pasangan Calon.",
      "Surat Keterangan Hasil Pemeriksaan Kesehatan dari Rumah Sakit Pemerintah.",
      "Berita Acara Penelitian Persyaratan Calon & SK Penetapan Pasangan Calon.",
      "Berita Acara dan SK Penetapan Nomor Urut Pasangan Calon."
    ]
  },
  {
    nomor: 9,
    nama: "Pelaksanaan Kegiatan Kampanye (Debat Publik, APK, Bahan Kampanye & Iklan Media)",
    tahapan: "PENYELENGGARAAN",
    divisi: "Sosdiklih, Parmas & SDM",
    subbag: "Subbag Teknis Penyelenggaraan Pemilu, Partisipasi dan Hubungan Masyarakat",
    deskripsi: "Fasilitasi resmi kampanye yang dibiayai APBD meliputi penyelenggaraan Debat Publik/Terbuka Paslon yang disiarkan TV/Radio, pencetakan bahan kampanye, pengadaan dan pemasangan alat peraga kampanye (APK), serta fasilitasi iklan di media massa.",
    bentuk_kegiatan: [
      "Penyelenggaraan Debat Publik antar Paslon yang disiarkan live melalui lembaga penyiaran publik/swasta.",
      "Pencetakan Bahan Kampanye (selebaran/flyer, brosur, pamflet, poster).",
      "Pembuatan dan pemasangan Alat Peraga Kampanye (baliho di tingkat kabupaten, umbul-umbul di tingkat kecamatan, spanduk di tingkat desa).",
      "Penayangan iklan kampanye di media cetak, televisi, radio, dan media online selama 14 hari sebelum masa tenang.",
      "Rapat koordinasi penetapan titik lokasi APK dan jadwal kampanye bersama Forkopimda & tim paslon."
    ],
    komponen_belanja: [
      {
        akun: "521211",
        nama: "Belanja Bahan (Cetak APK & BK)",
        item: "Cetak bahan kampanye (maksimal sejumlah KK), cetak baliho/umbul-umbul/spanduk, konsumsi rapat koordinasi kampanye."
      },
      {
        akun: "521213",
        nama: "Honor Output Kegiatan",
        item: "Honorarium Pokja Pelaksanaan Kampanye (maks 15 orang, masa kerja paling lama 3 bulan), Honor Moderator Debat Publik (kalangan profesional/akademisi), dan Honor Tim Panelis/Perumus Materi Debat."
      },
      {
        akun: "522141",
        nama: "Belanja Sewa (Gedung & Siaran Debat)",
        item: "Sewa gedung/studio debat publik, sewa sistem audio/lighting/LED display debat, sewa frekuensi/kanal siaran televisi/radio siaran langsung."
      },
      {
        akun: "522191",
        nama: "Belanja Jasa Lainnya (Pemasangan APK & Iklan)",
        item: "Biaya pemasangan dan pemeliharaan APK di titik lokasi kecamatan/desa, biaya penayangan iklan kampanye di koran/media cetak dan media elektronik."
      }
    ],
    rambu_larangan: [
      "KPU hanya memfasilitasi debat terbuka, bahan kampanye, APK, dan iklan media massa. Pertemuan tatap muka dan dialog dibiayai mandiri oleh Paslon.",
      "Desain dan materi APK/BK dibuat dan dibiayai oleh Paslon sesuai batasan ukuran yang ditetapkan KPU.",
      "Jumlah bahan kampanye yang dicetak KPU paling banyak sejumlah Kepala Keluarga (KK) pada daerah Pemilihan untuk setiap pasangan calon.",
      "Pembersihan APK sebelum hari pemungutan suara menjadi tanggung jawab bersama tim kampanye dikoordinasikan dengan Bawaslu dan Satpol PP."
    ],
    output_spj: [
      "SPK / Kontrak Pencetakan Bahan Kampanye dan APK.",
      "Berita Acara Serah Terima (BAST) Bahan Kampanye kepada Penghubung Paslon.",
      "Kontrak Kerjasama Penyiaran Debat Publik & Iklan Media Massa.",
      "Dokumentasi video/audio siaran debat dan kliping iklan media."
    ]
  },
  {
    nomor: 10,
    nama: "Laporan Audit Dana Kampanye (LADK, LPSDK, dan LPPDK)",
    tahapan: "PENYELENGGARAAN",
    divisi: "Hukum & Pengawasan",
    subbag: "Subbag Hukum dan SDM",
    deskripsi: "Pelayanan helpdesk pelaporan dana kampanye peserta pemilihan melalui sistem informasi dana kampanye, fasilitasi pembekalan pelaporan bersama asosiasi profesi akuntan (IAI/IAPI), pengadaan Kantor Akuntan Publik (KAP) independen, dan pengumuman hasil audit kepada masyarakat.",
    bentuk_kegiatan: [
      "Pembentukan Pokja Pelayanan dan Fasilitasi Pelaporan Dana Kampanye.",
      "Bimbingan teknis dan konsultasi helpdesk pelaporan dana kampanye (LADK, LPSDK, LPPDK) bagi penghubung paslon.",
      "Koordinasi bersama Institut Akuntan Publik Indonesia (IAPI) untuk penyediaan kantor akuntan publik.",
      "Pengadaan jasa profesi Kantor Akuntan Publik (KAP) independen untuk audit kepatuhan dana kampanye.",
      "Penyerahan laporan dana kampanye dari paslon kepada KAP melalui KPU.",
      "Penerimaan dan pengumuman Laporan Hasil Audit (LHA) dana kampanye kepada publik."
    ],
    komponen_belanja: [
      {
        akun: "521211",
        nama: "Belanja Bahan",
        item: "ATK helpdesk, penggandaan modul petunjuk teknis dana kampanye, konsumsi rapat fasilitasi dan koordinasi bersama tim paslon & KAP."
      },
      {
        akun: "521213",
        nama: "Honor Output Kegiatan",
        item: "Honorarium Pokja Pelayanan & Pelaporan Dana Kampanye (maksimal 15 orang, masa kerja sejak pencalonan sampai dengan masa kampanye berakhir), honor narasumber pembekalan dana kampanye."
      },
      {
        akun: "522191",
        nama: "Belanja Jasa Profesi (Kantor Akuntan Publik)",
        item: "Biaya kontrak jasa profesi Kantor Akuntan Publik (KAP) untuk mengaudit laporan penerimaan dan pengeluaran dana kampanye setiap paslon."
      },
      {
        akun: "524111",
        nama: "Perjalanan Dinas Koordinasi",
        item: "Perjalanan dinas konsultasi pengelolaan dana kampanye ke KPU RI dan koordinasi jasa KAP ke IAPI."
      }
    ],
    rambu_larangan: [
      "KAP yang ditunjuk wajib berizin resmi Kementerian Keuangan dan tergabung dalam IAPI.",
      "Anggota Pokja dari unsur eksternal yang bukan ASN/Pejabat Negara (misal perwakilan IAI/IAPI) dapat diikutsertakan dalam Pokja tetapi TIDAK DIBAYARKAN HONORARIUMNYA."
    ],
    output_spj: [
      "Tanda Terima Penerimaan LADK, LPSDK, dan LPPDK dari setiap Paslon.",
      "Kontrak Perjanjian Kerja Sama KPU dengan Kantor Akuntan Publik (KAP).",
      "Laporan Hasil Audit (LHA) Kepatuhan Dana Kampanye dari KAP.",
      "Pengumuman Resmi Hasil Audit Dana Kampanye kepada Publik."
    ]
  },
  {
    nomor: 11,
    nama: "Proses Pemungutan Suara, Perhitungan Suara, dan Rekapitulasi Hasil Penghitungan Suara",
    tahapan: "PENYELENGGARAAN",
    divisi: "Teknis Penyelenggaraan",
    subbag: "Subbag Teknis Penyelenggaraan Pemilu, Partisipasi dan Hubungan Masyarakat",
    deskripsi: "Penyelenggaraan pemungutan dan penghitungan suara di TPS hari H, pencatatan Formulir Model C-Hasil, pengiriman kotak suara berjenjang, rapat pleno terbuka rekapitulasi perolehan suara di PPK dan KPU Kabupaten/Kota, pengoperasian Sirekap, dan penetapan paslon terpilih.",
    bentuk_kegiatan: [
      "Persiapan pemungutan suara (penyampaian surat pemberitahuan/C-Pemberitahuan kepada pemilih).",
      "Pelaksanaan pemungutan dan penghitungan suara di TPS oleh KPPS.",
      "Pengunggahan foto formulir Model C-Hasil ke aplikasi Sirekap oleh KPPS.",
      "Penyegelan dan penyerahan kotak suara beserta dokumen dari KPPS ke PPS untuk diteruskan ke PPK.",
      "Rapat pleno terbuka rekapitulasi penghitungan perolehan suara tingkat kecamatan oleh PPK.",
      "Rapat pleno terbuka rekapitulasi dan penetapan perolehan suara tingkat kabupaten oleh KPU Kabupaten/Kota.",
      "Rapat pleno penetapan pasangan calon Bupati dan Wakil Bupati terpilih (jika tidak ada sengketa MK)."
    ],
    komponen_belanja: [
      {
        akun: "521211",
        nama: "Belanja Bahan",
        item: "ATK rekapitulasi pleno, penggandaan salinan formulir D-Hasil untuk saksi dan bawaslu, konsumsi rapat pleno terbuka tungsura (makan & snack peserta pleno, saksi paslon, bawaslu, panitia)."
      },
      {
        akun: "521213",
        nama: "Honor Output Kegiatan",
        item: "Honorarium Pokja Pelaksanaan Pemungutan & Penghitungan Suara serta Rekapitulasi & Penetapan Paslon Terpilih (maksimal 15 orang, masa kerja paling lama 3 bulan)."
      },
      {
        akun: "521219",
        nama: "Belanja Paket Meeting / Transportasi",
        item: "Sewa gedung/aula besar pelaksanaan rapat pleno terbuka rekapitulasi tingkat kabupaten, uang transport peserta pleno dari kecamatan."
      }
    ],
    rambu_larangan: [
      "Rapat pleno rekapitulasi wajib diselenggarakan secara terbuka, tertib, dan dihadiri saksi resmi ber-mandat serta jajaran Panwaslu/Bawaslu.",
      "KPU Kabupaten/Kota wajib menyimpan, menjaga, dan mengamankan keutuhan kotak suara beserta formulir di gudang berkeamanan tinggi.",
      "Penggunaan formulir rekapitulasi yang dicetak melalui aplikasi Sirekap wajib mempedomani PKPU Tungsura."
    ],
    output_spj: [
      "Berita Acara & Sertifikat Hasil Penghitungan Suara di TPS (Model C.Hasil).",
      "Berita Acara & Sertifikat Rekapitulasi Hasil Penghitungan Suara Tingkat Kecamatan (Model D.Hasil-Kecamatan).",
      "Berita Acara & Sertifikat Rekapitulasi Hasil Penghitungan Suara Tingkat Kabupaten (Model D.Hasil-Kabko).",
      "SK KPU Kabupaten Ngawi tentang Penetapan Hasil Pemilihan dan Penetapan Paslon Terpilih."
    ]
  },
  {
    nomor: 12,
    nama: "Advokasi Hukum dan Penyelesaian Sengketa Pemilihan",
    tahapan: "PENYELENGGARAAN",
    divisi: "Hukum & Pengawasan",
    subbag: "Subbag Hukum dan SDM",
    deskripsi: "Pendampingan hukum, penanganan sengketa proses di Bawaslu dan PTUN, penanganan sengketa Perselisihan Hasil Pemilihan (PHP) di Mahkamah Konstitusi (MK), pengadaan jasa kuasa hukum/pengacara, dan kerja sama Jaksa Pengacara Negara (JPN).",
    bentuk_kegiatan: [
      "Inventarisasi potensi permasalahan hukum tahapan pencalonan dan hasil pemilihan.",
      "Pembentukan Tim Kerja / Pokja Penyelesaian Sengketa Hukum (dibentuk apabila terjadi sengketa).",
      "Penyusunan naskah jawaban termohon, keterangan tertulis, dan matrik bantahan.",
      "Penunjukan/pengadaan jasa kantor hukum (advokat/pengacara) untuk pendampingan persidangan.",
      "Koordinasi dan pendampingan bersama Jaksa Pengacara Negara (JPN) Kejaksaan Negeri Ngawi.",
      "Menghadiri sidang penyelesaian sengketa di Bawaslu, Pengadilan Tinggi Tata Usaha Negara (PTTUN), atau Mahkamah Konstitusi di Jakarta."
    ],
    komponen_belanja: [
      {
        akun: "521211",
        nama: "Belanja Bahan",
        item: "ATK penyusunan jawaban termohon, materai, penggandaan ratusan rangkap alat bukti dan legalisir pos, konsumsi tim kerja hukum."
      },
      {
        akun: "521213",
        nama: "Honor Output Kegiatan",
        item: "Honorarium Pokja Penyelesaian Sengketa Hukum (maksimal 13 orang, dibentuk apabila terjadi sengketa, masa kerja paling lama 3 bulan)."
      },
      {
        akun: "522191",
        nama: "Belanja Jasa Profesi (Advokat / Pengacara)",
        item: "Biaya penunjukan / kontrak jasa pengacara untuk membela KPU dalam perkara sengketa pemilihan di PTUN dan Mahkamah Konstitusi."
      },
      {
        akun: "524111",
        nama: "Perjalanan Dinas Sidang",
        item: "Biaya perjalanan dinas komisioner dan tim hukum menghadiri sidang di Mahkamah Konstitusi Jakarta atau PTUN Surabaya (tiket, hotel, uang harian)."
      }
    ],
    rambu_larangan: [
      "Pokja Sengketa Hukum HANYA DIBENTUK APABILA TERJADI SENGKETA RESMI di Bawaslu, PTUN, atau Mahkamah Konstitusi.",
      "Jika tidak terdapat permohonan perselisihan hasil pemilihan di MK, maka anggaran jasa pengacara dan Pokja Sengketa tidak boleh direalisasikan."
    ],
    output_spj: [
      "Surat Kuasa Khusus (SKK) kepada Advokat atau Jaksa Pengacara Negara (JPN).",
      "Dokumen Jawaban Termohon dan Daftar Alat Bukti (Bukti T-1 s.d T-selesai).",
      "Salinan Putusan / Ketetapan Resmi Mahkamah Konstitusi / PTTUN / Bawaslu.",
      "Laporan Hasil Penanganan Perkara Sengketa Hukum."
    ]
  },
  {
    nomor: 13,
    nama: "Pengadaan dan Pendistribusian Perlengkapan Pemungutan dan Penghitungan Suara",
    tahapan: "PENYELENGGARAAN",
    divisi: "Keuangan, Umum & Logistik",
    subbag: "Subbag Keuangan, Umum dan Logistik",
    deskripsi: "Pengadaan surat suara, formulir plano/salinan, kotak suara, bilik, segel pecah telur, tinta halal, alat coblos, sampul, dan tanda pengenal, serta pendistribusian pergi-pulang (PP) berjenjang hingga ke TPS.",
    bentuk_kegiatan: [
      "Rapat persiapan tim Pokja ULP/PBJ membahas metode pengadaan, HPS, dan spesifikasi teknis logistik.",
      "Penyusunan Harga Perhitungan Sendiri (HPS) melalui survei pasar.",
      "Pelaksanaan pelelangan / e-Purchasing melalui Katalog Elektronik (LKPP).",
      "Pencetakan surat suara di percetakan berlisensi dengan pengamanan ketat aparat Kepolisian.",
      "Penggandaan formulir pemungutan dan penghitungan suara, sampul, dan buku panduan.",
      "Pengadaan perlengkapan TPS (kotak suara, bilik, tinta sidik jari bersertifikat halal MUI & lolos lab, segel pecah telur, kabel ties, bantalan, paku coblos, template braille).",
      "Distribusi logistik pergi-pulang (PP) berjenjang: Gudang KPU $\\rightarrow$ PPK (Kecamatan) $\\rightarrow$ PPS (Desa) $\\rightarrow$ KPPS (TPS) termasuk biaya bongkar muat kuli lokal."
    ],
    komponen_belanja: [
      {
        akun: "521211",
        nama: "Belanja Bahan / Cetakan Logistik",
        item: "Cetak surat suara (rumus: DPT + 2,5% + 2.000 lbr), cetak formulir C/D-KWK, sampul biasa & kubus, kotak suara, bilik, tinta sidik jari halal, segel kertas pecah telur, bantalan & alat coblos, tanda pengenal, template braille tunanetra, ATK TPS."
      },
      {
        akun: "521213",
        nama: "Honor Output Kegiatan & Pokja",
        item: "Honor Pokja Pengadaan & Distribusi Logistik (maks 13 orang, maks 3 bln), Honor Pokja ULP/PBJ pengadaan, Sekretariat ULP, dan Tim Teknis Ahli yang direkrut PPK."
      },
      {
        akun: "522151",
        nama: "Belanja Distribusi / Pengiriman (Pergi-Pulang)",
        item: "Biaya sewa armada truk ekspedisi logistik PP, biaya ongkos kuli bongkar muat di gudang dan lokasi drop kecamatan/desa, biaya transit sementara."
      },
      {
        akun: "521213",
        nama: "Honorarium Pengelola Keuangan Satker",
        item: "Honorarium Pejabat Pembuat Komitmen (PPK Satker), Bendahara Pengeluaran Pembantu (BPP), Staf Pengelola Keuangan, dan Tenaga Operator Komputer (Sidalih, Silog, Silon, Sirekap)."
      }
    ],
    rambu_larangan: [
      "Tinta sidik jari WAJIB memiliki sertifikat uji laboratorium terakreditasi dan sertifikat halal MUI.",
      "Segel WAJIB menggunakan kertas stiker getas/pecah telur (brittle paper sticker) agar rusak jika dibuka paksa.",
      "Komponen biaya distribusi dihitung Pergi-Pulang (PP) dan sudah mencakup bongkar muat, transit, serta konsumsi petugas pengangkut.",
      "Pencetakan surat suara dan penyimpanan di gudang percetakan wajib dijaga ketat oleh personel Polri."
    ],
    output_spj: [
      "Kontrak Pengadaan Barang dan Jasa Logistik beserta jaminan pelaksanaan.",
      "Surat Keterangan Uji Laboratorium dan Sertifikat Halal Tinta Sidik Jari.",
      "Berita Acara Serah Terima (BAST) Hasil Pekerjaan Pencetakan Surat Suara.",
      "Berita Acara Serah Terima (BAST) Pendistribusian Logistik dari KPU ke PPK, PPK ke PPS, dan PPS ke KPPS."
    ]
  },
  {
    nomor: 14,
    nama: "Pelatihan dan Bimbingan Teknis Terpadu Penyelenggara (PPK, PPS, dan KPPS)",
    tahapan: "PENYELENGGARAAN",
    divisi: "Sosdiklih, Parmas & SDM",
    subbag: "Subbag Teknis Penyelenggaraan Pemilu, Partisipasi dan Hubungan Masyarakat",
    deskripsi: "Penyelenggaraan pelatihan bimbingan teknis (Training of Trainers/ToT) secara berjenjang dari KPU Kabupaten ke PPK, PPK ke PPS, dan PPS ke KPPS mengenai pemungutan, penghitungan suara, penggunaan Sirekap, dan integritas penyelenggara.",
    bentuk_kegiatan: [
      "Rapat kerja persiapan bimtek terpadu.",
      "Bimbingan teknis tatap muka bagi PPK dan PPS di ibukota kabupaten.",
      "Bimbingan teknis tatap muka bagi seluruh anggota KPPS di tingkat desa/kelurahan.",
      "Simulasi pemungutan, penghitungan suara, dan praktik unggah formulir Sirekap Mobile."
    ],
    komponen_belanja: [
      {
        akun: "521211",
        nama: "Belanja Bahan",
        item: "Penggandaan buku panduan KPPS/PPS, modul bimtek, ATK peserta (blocknote, pulpen), konsumsi makan dan snack peserta bimtek."
      },
      {
        akun: "521213",
        nama: "Honor Output Kegiatan",
        item: "Honor Panitia Pelaksana Bimtek (sesuai standar SBM) dan Honor Narasumber ahli/profesional."
      },
      {
        akun: "521219",
        nama: "Belanja Paket Meeting / Transportasi",
        item: "Sewa gedung pertemuan bimtek (jika di luar kantor KPU) dan uang transport peserta bimtek dari kecamatan/desa."
      }
    ],
    rambu_larangan: [
      "Pelaksanaan bimtek dijadwalkan secara ketat sesuai timeline tahapan berjalan.",
      "Biaya panitia pelaksana dan narasumber wajib mengacu pada pagu batas tertinggi SBM Kemenkeu."
    ],
    output_spj: [
      "Daftar hadir (presensi) peserta bimbingan teknis bertandatangan.",
      "Buku Modul Panduan Teknis KPPS/PPS.",
      "Laporan Pelaksanaan Bimtek beserta dokumentasi foto kegiatan."
    ]
  },
  {
    nomor: 15,
    nama: "Rapat Kerja dan Supervisi Penyelenggaraan Pemilihan",
    tahapan: "PENYELENGGARAAN",
    divisi: "Semua Divisi",
    subbag: "Sekretariat KPU Kabupaten Ngawi",
    deskripsi: "Penyelenggaraan rapat-rapat kerja koordinasi lintas sektoral bersama Forkopimda, instansi vertikal, dinas terkait, serta supervisi persiapan dan pelaksanaan tahapan pemilihan ke tingkat PPK dan PPS.",
    bentuk_kegiatan: [
      "Rapat koordinasi kesiapan pengamanan pemilihan bersama Polres, Kodim, dan Satpol PP Ngawi.",
      "Rapat koordinasi kesiapan logistik dan mitigasi bencana kerawanan cuaca bersama BPBD.",
      "Rapat kerja evaluasi periodik bersama jajaran PPK se-Kabupaten Ngawi.",
      "Supervisi terpadu komisioner dan sekretariat KPU ke kantor PPK dan PPS."
    ],
    komponen_belanja: [
      {
        akun: "521211",
        nama: "Belanja Bahan",
        item: "ATK rapat kerja, spanduk rakor, konsumsi makan dan kudapan peserta rapat koordinasi."
      },
      {
        akun: "521219",
        nama: "Belanja Paket Meeting Dalam Kota",
        item: "Sewa ruangan/aula pertemuan (jika aula kantor KPU tidak mencukupi kapasitas) dan transport peserta rapat koordinasi luar kantor."
      }
    ],
    rambu_larangan: [
      "Rapat kerja dilaksanakan secara selektif, efektif, dan efisien untuk mendukung kelancaran tahapan.",
      "Tidak diperkenankan menduplikasi pembiayaan dengan rapat kerja rutin dinas perkantoran biasa."
    ],
    output_spj: [
      "Surat Undangan Rapat Koordinasi resmi.",
      "Daftar Presensi Kehadiran Peserta.",
      "Notulensi / Risalah Rapat Kerja yang memuat poin-poin kesepakatan.",
      "Dokumentasi foto pelaksanaan rakor."
    ]
  },
  {
    nomor: 16,
    nama: "Perjalanan Dinas Tahapan Pemilihan",
    tahapan: "PENYELENGGARAAN",
    divisi: "Semua Divisi",
    subbag: "Subbag Keuangan, Umum dan Logistik",
    deskripsi: "Biaya perjalanan dinas komisioner dan staf sekretariat dalam rangka konsultasi ke KPU RI, rapat kerja/bimtek ke KPU Provinsi Jatim, serta monitoring dan supervisi persiapan tahapan hingga ke tingkat TPS.",
    bentuk_kegiatan: [
      "Perjalanan dinas konsultasi kebijakan tahapan ke KPU RI di Jakarta.",
      "Perjalanan dinas menghadiri raker, bimtek, atau koordinasi yang diselenggarakan KPU Provinsi Jawa Timur di Surabaya.",
      "Perjalanan dinas monitoring dan supervisi persiapan tahapan ke PPK, PPS, dan TPS di 19 kecamatan se-Kabupaten Ngawi.",
      "Perjalanan dinas klarifikasi dan pengantaran dokumen tahapan pemilihan."
    ],
    komponen_belanja: [
      {
        akun: "524111",
        nama: "Belanja Perjalanan Dinas Biasa (Luar Daerah)",
        item: "Tiket transportasi (kereta api eksekutif/pesawat), uang harian perjalanan dinas, dan biaya penginapan hotel sesuai standar SBM Kemenkeu."
      },
      {
        akun: "524113",
        nama: "Belanja Perjalanan Dinas Dalam Kota",
        item: "Biaya transportasi lokal / uang harian perjalanan dinas dalam kota lebih dari 8 jam untuk supervisi monitoring ke pelosok kecamatan."
      }
    ],
    rambu_larangan: [
      "Perjalanan dinas ke KPU RI di Jakarta oleh KPU Kab/Kota WAJIB MENDAPATKAN IZIN ATAU REKOMENDASI TERTULIS DARI KPU PROVINSI JAWA TIMUR.",
      "Konsultasi masalah teknis wajib dioptimalkan ke KPU Provinsi terlebih dahulu.",
      "Pertanggungjawaban tiket, boarding pass, bill hotel, dan SPPD wajib riil dan akuntabel."
    ],
    output_spj: [
      "Surat Tugas resmi yang ditandatangani Ketua / KPA KPU Kabupaten Ngawi.",
      "Surat Perintah Perjalanan Dinas (SPPD) dengan stempel dan tanda tangan pejabat instansi yang dikunjungi.",
      "Tiket perjalanan asli, boarding pass, dan bukti kuitansi hotel/penginapan.",
      "Laporan Hasil Pelaksanaan Perjalanan Dinas."
    ]
  },
  {
    nomor: 17,
    nama: "Evaluasi dan Pelaporan Tahapan serta Laporan Pertanggungjawaban (LPJ) Hibah",
    tahapan: "PENYELENGGARAAN",
    divisi: "Rendatin",
    subbag: "Subbag Perencanaan, Data dan Informasi",
    deskripsi: "Penyusunan laporan pertanggungjawaban akhir penyelenggaraan Pemilihan kepada KPU RI, penyusunan buku laporan evaluasi komprehensif, penyampaian LPJ Belanja Hibah kepada Bupati Ngawi, dan rekonsiliasi pengembalian sisa kas hibah ke Kas Daerah.",
    bentuk_kegiatan: [
      "Rapat evaluasi akhir seluruh rangkaian tahapan pemilihan bersama PPK.",
      "Penyusunan dan pencetakan buku Laporan Penyelenggaraan Pemilihan Bupati dan Wakil Bupati Ngawi.",
      "Penyusunan Laporan Pertanggungjawaban (LPJ) Penggunaan Belanja Hibah Pilkada.",
      "Penyerahan resmi LPJ Belanja Hibah kepada Bupati Ngawi dan BPKAD.",
      "Penyetoran sisa lebih perhitungan penggunaan dana hibah ke Rekening Kas Umum Daerah (RKUD)."
    ],
    komponen_belanja: [
      {
        akun: "521211",
        nama: "Belanja Bahan",
        item: "ATK penyusunan evaluasi, pencetakan dan penjilidan hard cover buku laporan akhir pemilihan, konsumsi tim penyusun laporan evaluasi."
      },
      {
        akun: "521219",
        nama: "Belanja Transportasi / Meeting",
        item: "Konsumsi rapat koordinasi finalisasi LPJ hibah dan transport pengiriman berkas fisik laporan ke Pemkab dan KPU Provinsi."
      }
    ],
    rambu_larangan: [
      "Laporan penggunaan Belanja Hibah kegiatan Pemilihan WAJIB DISAMPAIKAN KEPADA BUPATI PALING LAMBAT 3 BULAN SETELAH BERAKHIRNYA SELURUH TAHAPAN PEMILIHAN.",
      "Dalam hal masih terdapat sisa dana hibah, KPU WAJIB MENGEMBALIKAN SISA DANA HIBAH PALING LAMBAT 3 BULAN setelah tahapan berakhir ke Kas Daerah."
    ],
    output_spj: [
      "Buku Laporan Penyelenggaraan Pemilihan Bupati dan Wakil Bupati Ngawi.",
      "Buku Laporan Pertanggungjawaban (LPJ) Keuangan Penggunaan Dana Hibah Pilkada.",
      "Tanda Terima Penyerahan LPJ dari Pemerintah Kabupaten Ngawi.",
      "Surat Tanda Setor (STS) pengembalian sisa dana hibah ke Kas Daerah (jika ada sisa kas)."
    ]
  },
  {
    nomor: 18,
    nama: "Pemeliharaan Gedung Kantor dan Kendaraan Dinas Operasional",
    tahapan: "OPERASIONAL",
    divisi: "Keuangan, Umum & Logistik",
    subbag: "Subbag Keuangan, Umum dan Logistik",
    deskripsi: "Pemeliharaan gedung kantor KPU, inventaris sarana prasarana, serta servis kendaraan dinas roda 4 dan roda 2 agar selalu dalam kondisi siap pakai untuk menunjang kelancaran tahapan.",
    bentuk_kegiatan: [
      "Pemeliharaan gedung dan bangunan kantor (pengecatan, perbaikan instalasi listrik, AC, toilet, atap).",
      "Perbaikan dan pemeliharaan inventaris kantor penunjang kerja tahapan.",
      "Servis rutin berkala, penggantian oli, dan pergantian suku cadang kendaraan dinas roda 4 dan roda 2."
    ],
    komponen_belanja: [
      {
        akun: "523111",
        nama: "Belanja Pemeliharaan Gedung dan Bangunan",
        item: "Biaya perbaikan gedung kantor satker KPU, servis sistem pendingin ruangan (AC), perbaikan sanitasi/listrik."
      },
      {
        akun: "523121",
        nama: "Belanja Pemeliharaan Peralatan dan Mesin",
        item: "Biaya servis rutin, penggantian oli mesin, ban, aki, dan suku cadang mobil dan motor dinas operasional KPU."
      }
    ],
    rambu_larangan: [
      "Biaya pemeliharaan kantor dan kendaraan dinas dari dana hibah HANYA DAPAT DIBEBANKAN APABILA ALOKASI APBN (RUPIAH MURNI) TIDAK MENCUKUPI ATAU BELUM DIANGGARKAN.",
      "DILARANG KERAS TERJADI DUPLIKASI ANGGARAN PEMELIHARAAN DENGAN DIPA APBN RUTIN KPU."
    ],
    output_spj: [
      "Surat Perintah Kerja (SPK) Pemeliharaan Gedung / Servis Kendaraan.",
      "Kuitansi pembayaran dari bengkel resmi / penyedia jasa servis berizin.",
      "Foto dokumentasi fisik sebelum, sedang, dan sesudah pemeliharaan (kondisi 0%, 50%, 100%)."
    ]
  },
  {
    nomor: 19,
    nama: "Bahan Bakar Minyak (BBM) Kendaraan Operasional Roda 4 dan Roda 2",
    tahapan: "OPERASIONAL",
    divisi: "Keuangan, Umum & Logistik",
    subbag: "Subbag Keuangan, Umum dan Logistik",
    deskripsi: "Penyediaan BBM untuk mobilitas operasional kendaraan dinas roda 4 dan roda 2 selama tahapan Pemilihan berlangsung di wilayah Kabupaten Ngawi.",
    bentuk_kegiatan: [
      "Penyediaan BBM operasional mobil dinas komisioner dan sekretariat KPU.",
      "Penyediaan BBM operasional mobil pendistribusian dan supervisi tahapan.",
      "Penyediaan BBM operasional kendaraan roda 2 dinas untuk pemantauan lapangan."
    ],
    komponen_belanja: [
      {
        akun: "521211",
        nama: "Belanja Bahan (BBM)",
        item: "Pembelian BBM jenis Pertamax / Dexlite / solar untuk mobil dinas dan sepeda motor dinas operasional."
      }
    ],
    rambu_larangan: [
      "Berlaku untuk kendaraan alokasi APBN, kendaraan pinjam pakai dari Pemkab Ngawi, dan kendaraan sewa yang belum mendapat alokasi BBM rutin.",
      "Wajib dipastikan tidak terjadi duplikasi dengan anggaran BBM rutin APBN Satker KPU.",
      "Standar pemakaian BBM wajib mengacu pada indeks besaran liter/bulan sesuai ketentuan SBM Kemenkeu."
    ],
    output_spj: [
      "Struk asli pembelian BBM di SPBU resmi Pertamina.",
      "Buku kendali pemakaian kendaraan dinas (log book jarak tempuh/kilometer).",
      "Kupon BBM / daftar nominatif pemakaian bahan bakar per nomor polisi kendaraan."
    ]
  },
  {
    nomor: 20,
    nama: "Pelayanan Administrasi Perkantoran (KPU, PPK, PPS, dan KPPS)",
    tahapan: "OPERASIONAL",
    divisi: "Semua Divisi",
    subbag: "Sekretariat KPU dan Badan Ad Hoc",
    deskripsi: "Biaya operasional rutin administrasi perkantoran untuk KPU Kabupaten Ngawi, 19 Sekretariat PPK, 217 Sekretariat PPS, dan seluruh TPS (KPPS) se-Kabupaten Ngawi.",
    bentuk_kegiatan: [
      "Operasional KPU Kab/Kota: ATK harian, daya & jasa (listrik, telepon, air, internet satker), sidang/rapat rutin pleno, honor petugas pengamanan kantor (satpam/jagad lobi), dokumentasi & publikasi.",
      "Operasional PPK: ATK PPK, langganan internet/listrik kecamatan, konsumsi sidang/rapat rutin, sewa komputer & printer data pemilu, sewa kantor sekretariat PPK (jika kantor camat tidak menyediakan ruangan), transport dinas koordinasi ke KPU.",
      "Operasional PPS: ATK PPS, listrik/internet desa, konsumsi rapat rutin pleno desa, sewa kantor PPS (jika balai desa tidak menyediakan), transport koordinasi ke PPK.",
      "Operasional KPPS (TPS): ATK TPS, konsumsi hari H (makan & snack untuk 7 KPPS + 2 Linmas), biaya pembuatan TPS (tenda, meja, kursi, sound system, papan pengumuman)."
    ],
    komponen_belanja: [
      {
        akun: "521111",
        nama: "Belanja Keperluan Perkantoran (ATK)",
        item: "Kertas HVS, tinta printer, ordner, map, alat tulis harian kantor KPU, PPK, PPS, dan ATK KPPS di TPS."
      },
      {
        akun: "521112",
        nama: "Belanja Langganan Daya dan Jasa",
        item: "Pembayaran tagihan listrik PLN, telepon, air PDAM, dan internet broadband kantor KPU, PPK, dan PPS."
      },
      {
        akun: "521211",
        nama: "Belanja Bahan (Konsumsi & Rapat)",
        item: "Konsumsi sidang/rapat biasa di kantor KPU, PPK, PPS, dan konsumsi makan-minum KPPS & Linmas di TPS."
      },
      {
        akun: "522141",
        nama: "Belanja Sewa Gedung Kantor / Perangkat",
        item: "Sewa gedung kantor PPK/PPS (jika Pemda tidak menyediakan fasilitas pinjam pakai), sewa komputer dan printer untuk pengolahan data tahapan di PPK."
      },
      {
        akun: "521219",
        nama: "Belanja Pembuatan TPS & Perjalanan Dinas Adhoc",
        item: "Biaya pembuatan tenda TPS fisik (meja, kursi, terpal, sound system) dan uang transport perjalanan dinas/rapat kerja jajaran PPK/PPS."
      }
    ],
    rambu_larangan: [
      "Sewa gedung kantor PPK dan PPS HANYA DIPERBOLEHKAN APABILA PEMDA / KECAMATAN / DESA TIDAK MENYEDIAKAN RUANGAN PINJAM PAKAI.",
      "Pengamanan kantor KPU dari hibah hanya boleh dibayarkan jika tidak duplikasi dengan pengamanan rutin APBN dan tidak duplikasi dengan biaya pengamanan instansi Polri/TNI.",
      "Biaya pembuatan TPS harus mencakup perlengkapan utama tempat pencoblosan."
    ],
    output_spj: [
      "Struk tagihan resmi listrik PLN, PDAM, Telkom, dan bukti transfer internet.",
      "Surat Keterangan Camat/Kades terkait ketiadaan gedung kantor (jika menganggarkan sewa kantor PPK/PPS).",
      "Kuitansi sewa komputer/printer PPK.",
      "Tanda terima konsumsi dan kuitansi sewa tenda pembuatan TPS oleh KPPS."
    ]
  },
  {
    nomor: 21,
    nama: "Sewa Kendaraan Roda 4, Roda 2, atau Kendaraan Lainnya",
    tahapan: "OPERASIONAL",
    divisi: "Keuangan, Umum & Logistik",
    subbag: "Subbag Keuangan, Umum dan Logistik",
    deskripsi: "Penyewaan kendaraan dinas roda 4 operasional pimpinan/sekretariat, kendaraan roda 2 operasional PPK, atau armada angkut logistik jika Pemda tidak meminjamkan kendaraan aset daerah.",
    bentuk_kegiatan: [
      "Sewa kendaraan roda 4 untuk mobilitas komisioner dan pejabat perbendaharaan.",
      "Sewa kendaraan roda 2 untuk ketua/anggota PPK menjangkau TPS di medan sulit/terpencil.",
      "Sewa kendaraan angkutan barang khusus distribusi logistik."
    ],
    komponen_belanja: [
      {
        akun: "522141",
        nama: "Belanja Sewa Kendaraan",
        item: "Biaya sewa bulanan mobil operasional roda 4, sewa motor roda 2 untuk PPK, atau sewa armada per trip/kegiatan."
      }
    ],
    rambu_larangan: [
      "Sewa kendaraan DILAKUKAN HANYA APABILA TIDAK ADA BANTUAN KENDARAAN PINJAM PAKAI DARI PEMKAB NGAWI.",
      "Biaya sewa kendaraan TERSEBUT SUDAH WAJIB TERMASUK BIAYA ASURANSI KECELAKAAN / JAMINAN KECELAKAAN KENDARAAN."
    ],
    output_spj: [
      "Surat Perjanjian Sewa Kendaraan (Kontrak) dengan perusahaan rental berizin resmi.",
      "Salinan STNK dan polis asuransi kecelakaan kendaraan.",
      "Berita Acara Serah Terima (BAST) fisik kendaraan sewa."
    ]
  },
  {
    nomor: 22,
    nama: "Pengelolaan Logistik Pemilihan (Gudang, Sortir-Lipat, Pengepakan, Perakitan)",
    tahapan: "OPERASIONAL",
    divisi: "Keuangan, Umum & Logistik",
    subbag: "Subbag Keuangan, Umum dan Logistik",
    deskripsi: "Manajemen pergudangan logistik, sewa gudang utama, pengamanan gudang 24 jam, upah sortir-lipat surat suara, pengesetan formulir, perakitan kotak & bilik suara, dan pengepakan perlengkapan TPS.",
    bentuk_kegiatan: [
      "Sewa gedung gudang logistik penyimpanan kotak, bilik, dan surat suara.",
      "Pengamanan gudang logistik siang dan malam bersama aparat keamanan.",
      "Pelaksanaan kegiatan sortir dan pelipatan surat suara oleh tenaga kerja masyarakat setempat.",
      "Pengesetan dan pengelompokan formulir plano dan salinan per TPS.",
      "Perakitan kotak dan bilik suara (pemasangan klem, pengencangan baut).",
      "Pengepakan seluruh jenis logistik ke dalam kotak suara per TPS sesuai alokasi."
    ],
    komponen_belanja: [
      {
        akun: "522141",
        nama: "Belanja Sewa Gudang Logistik",
        item: "Biaya sewa gedung gudang logistik KPU untuk jangka waktu tahapan sampai dengan barang dihapuskan."
      },
      {
        akun: "521211",
        nama: "Belanja Bahan Pengepakan",
        item: "Lakban coklat/bening, plastik transparan pembungkus kotak suara, gunting, spidol, konsumsi panitia pengawas sortir-lipat."
      },
      {
        akun: "521213",
        nama: "Upah Tenaga Kerja Lepas & Pengamanan",
        item: "Upah borongan sortir dan pelipatan surat suara per lembar, honor tenaga pengamanan gudang logistik (OB)."
      }
    ],
    rambu_larangan: [
      "Sewa gudang digunakan apabila tidak terdapat fasilitas gedung milik KPU atau bantuan gedung pinjam pakai dari Pemkab Ngawi.",
      "Gudang wajib aman dari kebocoran air, bebas banjir, bebas rayap, dan dipasang alat pemadam api ringan (APAR).",
      "Pengepakan logistik ke dalam kotak suara wajib diawasi ketat oleh Bawaslu dan aparat kepolisian."
    ],
    output_spj: [
      "Surat Perjanjian Sewa Gudang Logistik.",
      "Berita Acara Pembayaran Upah Sortir-Lipat Surat Suara disertai daftar nominatif penerima upah (nama, NIK, jumlah lembar).",
      "Berita Acara Surat Suara Rusak / Cacat Cetak.",
      "Berita Acara Pengepakan dan Segel Kotak Suara."
    ]
  },
  {
    nomor: 23,
    nama: "Belanja Modal Peralatan dan Mesin (Aset BMN)",
    tahapan: "OPERASIONAL",
    divisi: "Keuangan, Umum & Logistik",
    subbag: "Subbag Keuangan, Umum dan Logistik",
    deskripsi: "Pengadaan barang inventaris aset kantor penunjang tahapan pemilihan, seperti PC/komputer, notebook, printer multifungsi, ADF scanner untuk Sirekap, LCD proyektor, meubelair rapat, dan genset darurat.",
    bentuk_kegiatan: [
      "Penyusunan Rencana Kebutuhan Belanja Modal Peralatan dan Mesin dalam usulan NPHD.",
      "Pengadaan peralatan TI dan mesin kantor melalui e-Katalog LKPP.",
      "Penerimaan, pemeriksaan spesifikasi teknis, dan pengujian fungsi alat.",
      "Pencatatan dan pembukuan barang inventaris ke dalam aplikasi SIMAK BMN / SAKTI Kemenkeu."
    ],
    komponen_belanja: [
      {
        akun: "532111",
        nama: "Belanja Modal Peralatan dan Mesin",
        item: "Pengadaan Personal Computer (PC), notebook/laptop perencana, printer scanner kecepatan tinggi Sirekap, proyektor rapat, sound system rapat pleno, genset genset darurat."
      }
    ],
    rambu_larangan: [
      "BELANJA MODAL PERALATAN DAN MESIN SAMA SEKALI TIDAK BOLEH DIGUNAKAN UNTUK PENGADAAN KENDARAAN BERMOTOR (MOBIL / MOTOR DINAS).",
      "Pengusulan belanja modal harus sangat selektif sesuai ketersediaan anggaran hibah daerah.",
      "SELURUH BARANG MODAL YANG DIBELI DARI DANA HIBAH WAJIB DICATAT DAN DIBUKUKAN KE DALAM SISTEM INFORMASI MANAJEMEN ASET / SIMAK BMN KPU RI."
    ],
    output_spj: [
      "Surat Pesanan / Kontrak Pengadaan Belanja Modal di e-Katalog.",
      "Berita Acara Pemeriksaan Hasil Pekerjaan (BAPHP) dan BAST Barang Modal.",
      "Faktur Pajak dan Kuitansi Pembayaran.",
      "Bukti Kartu Inventaris Barang (KIB) dan Berita Acara Pembukuan SIMAK BMN."
    ]
  },
  {
    nomor: 24,
    nama: "Santunan Kecelakaan Kerja Badan Penyelenggara Ad Hoc",
    tahapan: "OPERASIONAL",
    divisi: "Hukum & SDM",
    subbag: "Subbag Hukum dan SDM",
    deskripsi: "Pemberian dana santunan kecelakaan kerja bagi anggota dan sekretariat PPK, PPS, KPPS, Petugas Ketertiban TPS (Linmas), dan Pantarlih/PPDP yang mengalami kecelakaan kerja atau meninggal dunia saat melaksanakan tugas.",
    bentuk_kegiatan: [
      "Penerimaan laporan peristiwa kecelakaan kerja atau meninggal dunia dari jajaran PPK/PPS.",
      "Verifikasi berkas medis (surat kematian, rekam medis RS/Puskesmas, kronologis kejadian).",
      "Penerbitan Surat Keputusan Sekretaris KPU Kabupaten Ngawi tentang Penetapan Penerima Santunan.",
      "Penyaluran dana santunan secara transfer langsung ke rekening korban atau ahli waris sah."
    ],
    komponen_belanja: [
      {
        akun: "521219",
        nama: "Belanja Santunan Kecelakaan Kerja",
        item: "Bantuan santunan finansial: Meninggal dunia (Rp 36.000.000), Cacat permanen (Rp 30.800.000), Luka berat (Rp 16.500.000), Luka sedang (Rp 8.250.000), dan bantuan biaya pemakaman (Rp 10.000.000) sesuai KPT KPU 59/2023."
      }
    ],
    rambu_larangan: [
      "SANTUNAN BUKAN DALAM BENTUK KERJASAMA PREMI DENGAN BADAN ASURANSI KOMERSIAL ATAU SEJENISNYA.",
      "Pemberian santunan bersifat mendadak/urgent atas kejadian riil di lapangan dan DITETAPKAN DENGAN KEPUTUSAN SEKRETARIS KPU KABUPATEN NGAWI.",
      "Pemberian santunan harus memenuhi kriteria kecelakaan yang terjadi dalam rentang waktu pelaksanaan tugas tahapan pemilihan."
    ],
    output_spj: [
      "Surat Keterangan Kematian / Resume Medis dari Rumah Sakit atau Puskesmas.",
      "Laporan Kronologis Kejadian Kecelakaan Kerja dari PPK/PPS setempat.",
      "Surat Keputusan (SK) Sekretaris KPU Kabupaten Ngawi tentang Penetapan Penerima Santunan Kecelakaan Kerja.",
      "Surat Keterangan Ahli Waris dari Kelurahan/Desa dan Kuitansi / Bukti Transfer Bank ke rekening penerima."
    ]
  },
  {
    nomor: 25,
    nama: "Alat Pelindung Diri (APD) dan Protokol Bencana Non-Alam",
    tahapan: "OPERASIONAL",
    divisi: "Keuangan, Umum & Logistik",
    subbag: "Subbag Keuangan, Umum dan Logistik",
    deskripsi: "Penyediaan sarana perlindungan kesehatan dan pencegahan penularan penyakit/bencana non-alam bagi seluruh penyelenggara pemilu (KPU, PPK, PPS, KPPS, Pantarlih, dan Relawan Demokrasi).",
    bentuk_kegiatan: [
      "Pengadaan masker medis, sabun cair cuci tangan, sarung tangan plastik, face shield, hand sanitizer, desinfektan, thermogun, dan kantong sampah medis.",
      "Pengemasan paket APD per TPS dan per sekretariat adhoc.",
      "Pendistribusian paket APD bersamaan dengan distribusi logistik pemilu."
    ],
    komponen_belanja: [
      {
        akun: "521211",
        nama: "Belanja Bahan APD",
        item: "Masker medis 3 lapis, botol hand sanitizer, sabun cuci tangan, sarung tangan plastik pemilih, face shield, alat pengukur suhu tubuh (thermogun non-kontak), cairan desinfektan, kantong sampah medis."
      },
      {
        akun: "522151",
        nama: "Belanja Distribusi APD",
        item: "Biaya pengiriman dan pendistribusian paket APD dari gudang KPU menuju PPK dan TPS."
      }
    ],
    rambu_larangan: [
      "Penyediaan dan penggunaan APD menyesuaikan dengan regulasi resmi protokol kesehatan bencana non-alam yang berlaku saat tahapan berjalan.",
      "Alokasi anggaran APD harus memperhatikan ketersediaan pagu hibah dan azas efisiensi anggaran."
    ],
    output_spj: [
      "Surat Pesanan / SPK Pengadaan Paket APD.",
      "Berita Acara Pemeriksaan Barang APD.",
      "Berita Acara Serah Terima (BAST) APD ke PPK, PPS, dan KPPS."
    ]
  },
  {
    nomor: 26,
    nama: "Biaya Komunikasi Penyelenggara Pemilihan (Paket Data Internet)",
    tahapan: "OPERASIONAL",
    divisi: "Semua Divisi",
    subbag: "Sekretariat KPU dan Badan Ad Hoc",
    deskripsi: "Pemberian biaya bantuan komunikasi / kuota data internet bagi jajaran KPU Kabupaten, PPK, PPS, KPPS, dan Relawan Demokrasi untuk mendukung koordinasi real-time, rapat virtual, serta sinkronisasi aplikasi Sirekap dan Sidalih.",
    bentuk_kegiatan: [
      "Pendataan nomor telepon seluler resmi petugas penyelenggara ad hoc.",
      "Pengisian pulsa atau kuota paket data internet secara berkala pada masa tahapan aktif.",
      "Rekapitulasi tanda terima pulsa komunikasi."
    ],
    komponen_belanja: [
      {
        akun: "521211",
        nama: "Belanja Bahan (Pulsa / Kuota Data)",
        item: "Paket kuota data internet bulanan untuk komisioner, staf sekretariat KPU, PPK, PPS, dan kuota unggah Sirekap untuk KPPS."
      }
    ],
    rambu_larangan: [
      "Pemberian biaya komunikasi wajib mengedepankan prinsip efisiensi dan efektivitas untuk menghasilkan output kegiatan yang tepat.",
      "Besaran biaya komunikasi mengacu pada standar SBM Kemenkeu yang mengatur biaya komunikasi pejabat/pegawai dan aturan edaran KPU RI."
    ],
    output_spj: [
      "Daftar Nominatif Petugas Penerima Biaya Komunikasi (by name, by phone number, by position).",
      "Bukti pembelian kuota / pulsa elektrik dari provider telekomunikasi resmi.",
      "Tanda terima penerimaan bantuan pulsa komunikasi."
    ]
  },
  {
    nomor: 27,
    nama: "Pemeriksaan Kesehatan Penyelenggara Pemilihan (Skrining / Rapid Test)",
    tahapan: "OPERASIONAL",
    divisi: "Hukum & SDM",
    subbag: "Subbag Hukum dan SDM",
    deskripsi: "Pemeriksaan skrining kesehatan berkala (rapid test, swab antigen, atau tes kesehatan penunjang) bagi jajaran komisioner, pegawai sekretariat KPU, PPK, PPS, KPPS, dan Pantarlih guna memastikan keselamatan kerja di lapangan.",
    bentuk_kegiatan: [
      "Koordinasi bersama Dinas Kesehatan Kabupaten Ngawi dan Rumah Sakit Daerah.",
      "Pelaksanaan pemeriksaan uji sampel kesehatan massal bagi petugas penyelenggara sebelum hari pemungutan suara.",
      "Penerbitan surat keterangan bebas gejala/sehat untuk bertugas di TPS."
    ],
    komponen_belanja: [
      {
        akun: "522191",
        nama: "Belanja Jasa Pemeriksaan Kesehatan",
        item: "Biaya jasa tenaga medis dan kit rapid test / swab antigen / tes laboratorium kesehatan yang diselenggarakan Dinkes atau laboratorium terakreditasi."
      }
    ],
    rambu_larangan: [
      "Pemeriksaan kesehatan dilaksanakan sesuai dengan ketentuan protokol kesehatan yang ditetapkan KPU dan instansi berwenang.",
      "Pembiayaan disesuaikan dengan ketersediaan anggaran yang ada dan mengacu pada standar tarif pelayanan kesehatan daerah."
    ],
    output_spj: [
      "Surat Perjanjian Kerjasama (MoU/SPK) dengan Dinas Kesehatan / Rumah Sakit / Laboratorium.",
      "Daftar hadir petugas yang mengikuti pemeriksaan kesehatan.",
      "Laporan Rekapitulasi Hasil Pemeriksaan Kesehatan dari pihak berwenang."
    ]
  },
  {
    nomor: 28,
    nama: "Media Telekonferensi Berbayar (Lisensi Aplikasi Rapat Daring)",
    tahapan: "OPERASIONAL",
    divisi: "Rendatin",
    subbag: "Subbag Perencanaan, Data dan Informasi",
    deskripsi: "Pengadaan layanan akun lisensi aplikasi telekonferensi berbasis web berbayar (seperti Zoom Pro/Business) untuk menunjang kelancaran rapat koordinasi jarak jauh, bimbingan teknis virtual, dan rapat pleno daring tanpa batas durasi.",
    bentuk_kegiatan: [
      "Pengadaan lisensi software aplikasi video conference berbayar kapasitas 300 s.d 1.000 peserta.",
      "Pemanfaatan akun untuk rapat koordinasi mingguan antara KPU Kabupaten dengan 19 PPK dan instansi terkait.",
      "Penyelenggaraan sosialisasi daring kepada pemilih dan pemantau pemilu."
    ],
    komponen_belanja: [
      {
        akun: "522112",
        nama: "Belanja Langganan Daya dan Jasa (Lisensi Software)",
        item: "Biaya langganan lisensi aplikasi rapat online berbayar (Zoom Pro / Google Workspace / Microsoft Teams) durasi tahunan atau bulanan selama tahapan."
      }
    ],
    rambu_larangan: [
      "Digunakan sesuai kebutuhan nyata yang menerapkan prinsip efisiensi dan efektivitas untuk menekan biaya perjalanan dinas tatap muka.",
      "Pengadaan lisensi harus berpedoman pada ketentuan PBJ pemerintah pengadaan barang digital/perangkat lunak."
    ],
    output_spj: [
      "Faktur Tagihan / Invoice Resmi Pembelian Lisensi Aplikasi dari Provider Resmi.",
      "Bukti Pembayaran / Transfer Bank atau Kartu Kredit Pemerintah (KKP).",
      "Tangkapan layar (screenshot) profil akun lisensi berbayar aktif atas nama Satker KPU Kabupaten Ngawi."
    ]
  },
  {
    nomor: "II.1",
    nama: "HONORARIUM KELOMPOK KERJA (POKJA) PEMILIHAN",
    tahapan: "HONORARIUM",
    divisi: "Semua Divisi Teknis & Kesekretariatan KPU",
    subbag: "Subbag Keuangan, Umum & Logistik (KUL) & Subbag Teknis/Hukum",
    deskripsi: "Standar satuan biaya, kaidah pembentukan, alokasi personel, masa kerja, dan norma hukum pengendalian pemberian honorarium output kegiatan bagi Kelompok Kerja (Pokja) KPU Kabupaten/Kota serta Penanggung Jawab Pengelola Keuangan Satker (Lampiran IV & Lampiran V Bab II Huruf B & C KPT 543/2022 jo. KPT KPU 472/2022 dan Surat Menkeu S-647/MK.02/2022).",
    bentuk_kegiatan: [
      "Pembentukan Tim Kelompok Kerja (Pokja) resmi berbasis Surat Keputusan (SK) Kuasa Pengguna Anggaran (KPA) / Ketua KPU untuk tugas yang bersifat temporer, koordinatif lintas instansi, dan menghasilkan output/keluaran spesifik terukur.",
      "Penyelenggaraan kegiatan teknis oleh 11 Pokja Resmi KPU Kab/Kota: 1) Anggaran & NPHD, 2) Produk Hukum/Keputusan, 3) Pembentukan Badan Ad Hoc, 4) Pemutakhiran Data Pemilih, 5) Verifikasi Paslon Perseorangan, 6) Pendaftaran & Penetapan Paslon, 7) Sosialisasi & Bimtek/Parmas, 8) Kampanye & Dana Kampanye, 9) Pengadaan & Distribusi Logistik, 10) Tungsura & Rekapitulasi Suara, serta 11) Penyelesaian Sengketa Hukum (dibentuk jika ada sengketa).",
      "Penyelenggaraan rapat koordinasi berkala pokja lintas instansi vertikal dan perangkat daerah (Polres, Kodim, Bakesbangpol, Dispendukcapil, Satpol PP, Dinkes, Kejaksaan Negeri Ngawi, dsb).",
      "Penyusunan produk keluaran terukur pokja (Keputusan, SOP, Berita Acara Pleno, Modul/Bahan Bimtek, atau Dokumen Rekapitulasi).",
      "Pemberian honorarium Penanggung Jawab Pengelola Keuangan Hibah (PPK Satker, Bendahara Pengeluaran Pembantu/BPP, Pokja Pengadaan PBJ/ULP, dan Operator Sidalih/Silog/Silon/Sirekap).",
      "Penyusunan berkas pertanggungjawaban administratif dan Laporan Pelaksanaan Tugas Pokja (Sistematika Bab I s.d. Bab IV) yang disahkan KPA sebagai syarat mutlak pembayaran honorarium."
    ],
    komponen_belanja: [
      {
        akun: "521213",
        nama: "Honor Pengarah Pokja KPU Kab/Kota",
        item: "Ketua / Anggota KPU Kab/Kota yang membidangi divisinya (maksimal 2 orang pengarah per Pokja). Besaran tarif: Rp 2.000.000 / OB (SBM Pilkada Lampiran II KPT 472/2022)."
      },
      {
        akun: "521213",
        nama: "Honor Penanggung Jawab Pokja",
        item: "Ketua / Anggota KPU Kab/Kota yang membidangi divisinya (1 orang per Pokja). Besaran tarif: Rp 1.800.000 / OB (SBM Pilkada Lampiran II KPT 472/2022)."
      },
      {
        akun: "521213",
        nama: "Honor Ketua Pokja",
        item: "Anggota KPU Kab/Kota atau Sekretaris KPU Kab/Kota (1 orang per Pokja). Besaran tarif: Rp 1.500.000 / OB (SBM Pilkada Lampiran II KPT 472/2022)."
      },
      {
        akun: "521213",
        nama: "Honor Sekretaris Pokja",
        item: "Sekretaris KPU Kab/Kota atau Kepala Subbagian (Kasubbag) yang membidangi (1 orang per Pokja). Besaran tarif: Rp 1.300.000 / OB (SBM Pilkada Lampiran II KPT 472/2022)."
      },
      {
        akun: "521213",
        nama: "Honor Anggota Pokja",
        item: "Pejabat Fungsional, Staf Pelaksana ASN/PPPK internal KPU, serta pejabat perwakilan instansi eksternal Pemda/vertikal. Besaran tarif: Rp 1.200.000 / OB (SBM Pilkada Lampiran II KPT 472/2022)."
      },
      {
        akun: "521213",
        nama: "Honor Penanggung Jawab Pengelola Keuangan Satker",
        item: "Pejabat Pembuat Komitmen (PPK Satker), Bendahara Pengeluaran Pembantu (BPP), Pokja PBJ/ULP, Sekretariat ULP, dan Tenaga Pendukung/Operator Komputer aplikasi kepemiluan (Sidalih, Sirekap, Silog, Silon, BMN) mengacu pada SBM Kemenkeu yang berlaku."
      },
      {
        akun: "521211",
        nama: "Belanja Bahan & Konsumsi Rapat Pokja",
        item: "Konsumsi rapat kerja/koordinasi pokja (makan dan kudapan/snack) serta alat tulis kantor (ATK) pendukung rapat pokja."
      }
    ],
    rambu_larangan: [
      "KUOTA POKJA TINGKAT SATKER: Jumlah Pokja yang dapat diberikan honorarium di tingkat KPU Kabupaten/Kota adalah MAKSIMAL 5 (LIMA) POKJA dari seluruh tahapan Pemilihan (Dasar: KPT KPU 472/2022 Diktum Keempat huruf a angka 5). Satker wajib memprioritaskan 5 Pokja paling esensial/inti.",
      "PEMBATASAN RANGKAP INDIVIDU: Setiap personel (Komisioner, Pejabat Struktural, ASN/PPPK) PALING BANYAK MENERIMA HONORARIUM DARI 2 (DUA) TIM/POKJA DALAM 1 TAHUN ANGGARAN. (Dasar: KPT KPU 543/2022 Lampiran V Bab II.C.1.a hal. 66 jo. KPT KPU 472/2022 Diktum Keempat huruf b & PMK SBM Kemenkeu).",
      "DURASI KERJA POKJA MAKSIMAL 3 BULAN: Masa kerja setiap Pokja dibatasi paling lama 3 bulan berturut-turut. (Dasar: KPT KPU 543/2022 Lampiran IV & Lampiran V hal. 66 jo. KPT KPU 472/2022 Diktum Keempat huruf a angka 4).",
      "KUOTA PERSONEL INTERNAL KPU: Jumlah personil yang berasal dari internal KPU Kab/Kota di setiap Pokja PALING BANYAK 10 ORANG. Sisanya (kuota total 13 s.d 15 orang) wajib melibatkan instansi pemerintah eksternal. (Dasar: KPT KPU 543/2022 hal. 70 jo. KPT 472/2022).",
      "LARANGAN DUPLIKASI HONORARIUM (IRISAN PEMILU & PILKADA): Dalam hal terdapat irisan rangkaian tahapan pelaksanaan Pemilu dan Pilkada Serentak, TIDAK DIPERKENANKAN DUPLIKASI pemberian honorarium pada bulan yang sama. (Dasar: KPT KPU 472/2022 Diktum Keenam).",
      "LARANGAN OUTSOURCE/KONTRAK: Tenaga pendukung outsource/kontrak (satpam, sopir, pramusaji) DILARANG DIANGKAT sebagai penerima honor Pokja. (Dasar: KPT KPU 543/2022 hal. 37 & hal. 70).",
      "BEBAS DUPLIKASI APBN: Honorarium pengelola keuangan hibah hanya boleh dibebankan jika beban kerja bertambah dan tidak terjadi duplikasi pembayaran dari DIPA APBN. (Dasar: KPT KPU 543/2022 Lampiran V hal. 49)."
    ],
    output_spj: [
      "Surat Keputusan (SK) Kuasa Pengguna Anggaran (KPA) / Ketua KPU tentang Pembentukan Kelompok Kerja (Pokja) beserta lampiran susunan personel.",
      "Surat Tugas resmi dari KPA / Ketua KPU bagi seluruh personel yang ditugaskan dalam Pokja.",
      "Undangan Rapat Koordinasi, Daftar Hadir (Presensi Asli), dan Risalah / Notulensi Rapat Pembahasan Pokja.",
      "Laporan Hasil Pelaksanaan Tugas Pokja Lengkap (Format Baku: Bab I Pendahuluan, Bab II Gambaran Umum, Bab III Hasil Kegiatan/Keluaran Terukur, Bab IV Penutup) yang disahkan KPA.",
      "Daftar Nominatif Tanda Terima Pembayaran Honorarium Pokja (by name, by NIK, No. Rekening Bank, bukti potong PPh Pasal 21, dan SP2D / Bukti Transfer Payroll Bank)."
    ]
  },
  {
    nomor: "II.2",
    nama: "HONORARIUM BADAN AD HOC PEMILIHAN (PPK, PPS, KPPS, PANTARLIH)",
    tahapan: "HONORARIUM",
    divisi: "Divisi Sosdiklih, Parmas & SDM",
    subbag: "Subbag Hukum dan SDM & Subbag Keuangan, Umum & Logistik",
    deskripsi: "Standar satuan biaya, kaidah pembentukan, masa kerja, tata cara penyaluran, dan akuntabilitas pembayaran honorarium bulanan bagi Badan Penyelenggara Pemilihan Ad Hoc di tingkat kecamatan (PPK & Sekretariat), desa/kelurahan (PPS & Sekretariat), serta TPS (KPPS, Pantarlih, dan Linmas) sesuai standar SBML Surat Menkeu S-647/MK.02/2022 jo. KPT KPU 472/2022 dan KPT KPU 543/2022.",
    bentuk_kegiatan: [
      "Honorarium Panitia Pemilihan Kecamatan (PPK): Masa kerja paling lama 9 (sembilan) bulan (dibentuk paling lambat 9 bulan sebelum pemungutan suara, dibubarkan paling lambat 2 bulan setelah pemungutan suara). Komposisi per kecamatan: 1 Ketua PPK, 4 Anggota PPK, 1 Sekretaris PPK, dan maksimal 3 Staf Sekretariat PPK (total 9 orang).",
      "Honorarium Panitia Pemungutan Suara (PPS): Masa kerja paling lama 8 (delapan) bulan (dibentuk paling lambat 8 bulan sebelum pemungutan suara, dibubarkan paling lambat 2 bulan setelah pemungutan suara). Komposisi per desa/kelurahan: 1 Ketua PPS, 2 Anggota PPS, 1 Sekretaris PPS, dan maksimal 2 Staf Sekretariat PPS (total 6 orang).",
      "Honorarium Kelompok Penyelenggara Pemungutan Suara (KPPS): Masa kerja 1 (satu) bulan (dibentuk paling lambat 1 bulan sebelum hari H pemungutan suara). Komposisi per TPS: 1 Ketua KPPS dan 6 Anggota KPPS (total 7 orang).",
      "Honorarium Petugas Ketertiban TPS (PAM TPS / Linmas): Masa kerja 1 (satu) bulan, berjumlah 2 (dua) orang per TPS yang bertugas membantu pengamanan pemungutan dan penghitungan suara di TPS.",
      "Honorarium Petugas Pemutakhiran Data Pemilih (Pantarlih / PPDP): Masa kerja 1 s.d. 2 bulan untuk melaksanakan pencocokan dan penelitian (coklit) data pemilih ke rumah-rumah warga per TPS.",
      "Penyaluran Santunan Kecelakaan Kerja bagi Badan Penyelenggara Ad Hoc yang mengalami kecelakaan/insiden kerja selama masa tugas (meninggal dunia, cacat permanen, luka berat, luka sedang, dan bantuan pemakaman) sesuai KPT KPU No. 59 Tahun 2023.",
      "Penyaluran honorarium secara non-tunai (cashless transfer) melalui rekening bank resmi penerima atau rekening penampung operasional BPP / Sekretariat PPK."
    ],
    komponen_belanja: [
      {
        akun: "512111 / 521219",
        nama: "Honor Panitia Pemilihan Kecamatan (PPK)",
        item: "Ketua PPK: Rp 2.500.000/OB; Anggota PPK (4 orang): @ Rp 2.200.000/OB; Sekretaris PPK (1 orang): Rp 1.850.000/OB; Staf Sekretariat PPK (maks 3 orang): @ Rp 1.300.000/OB. Masa kerja paling lama 9 bulan."
      },
      {
        akun: "512111 / 521219",
        nama: "Honor Panitia Pemungutan Suara (PPS)",
        item: "Ketua PPS: Rp 1.500.000/OB; Anggota PPS (2 orang): @ Rp 1.300.000/OB; Sekretaris PPS (1 orang): Rp 1.150.000/OB; Staf Sekretariat PPS (maks 2 orang): @ Rp 1.050.000/OB. Masa kerja paling lama 8 bulan."
      },
      {
        akun: "512111 / 521219",
        nama: "Honor Kelompok Penyelenggara Pemungutan Suara (KPPS)",
        item: "Ketua KPPS (1 orang): Rp 900.000 s.d. Rp 1.200.000/OB; Anggota KPPS (6 orang): @ Rp 850.000 s.d. Rp 1.100.000/OB. Masa kerja: 1 bulan."
      },
      {
        akun: "512111 / 521219",
        nama: "Honor Petugas Ketertiban TPS / Linmas",
        item: "Petugas Ketertiban TPS (2 orang per TPS): @ Rp 650.000 s.d. Rp 700.000/OB. Masa kerja: 1 bulan."
      },
      {
        akun: "512111 / 521219",
        nama: "Honor Petugas Pemutakhiran Data Pemilih (Pantarlih/PPDP)",
        item: "Petugas Pemutakhiran Data Pemilih: Rp 1.000.000/OB. Masa kerja: 1 s.d. 2 bulan."
      },
      {
        akun: "512111 / 521219",
        nama: "Santunan Kecelakaan Kerja Badan Ad Hoc (KPT 59/2023)",
        item: "Meninggal dunia (Rp 36.000.000/orang), Cacat permanen (Rp 30.800.000/orang), Luka berat (Rp 16.500.000/orang), Luka sedang (Rp 8.250.000/orang), dan Bantuan biaya pemakaman (Rp 10.000.000/orang)."
      }
    ],
    rambu_larangan: [
      "STANDAR SBML MERUPAKAN BATAS TERTINGGI: Besaran satuan biaya honorarium tahapan Pemilihan yang ditetapkan dalam Surat Menkeu S-647/2022 jo. KPT 472/2022 dan KPT 543/2022 merupakan BATAS TERTINGGI (Plafon Maksimal). Satker dapat menyesuaikan di bawah batas tersebut sesuai kemampuan riil APBD yang dituangkan dalam NPHD.",
      "BATAS MASA KERJA MUTLAK: PPK maksimal 9 bulan, PPS maksimal 8 bulan, KPPS 1 bulan, dan Pantarlih 1 s.d 2 bulan. Pembayaran honorarium di luar masa kerja SK pengangkatan dilarang keras.",
      "PEMBAGIAN BEBAN PENDANAAN BERSAMA (COST SHARING): Komponen honorarium Ad Hoc wajib mempedomani Keputusan Gubernur Jawa Timur Nomor 188/87/KPTS/013/2022 tentang Pendanaan Bersama Pilkada Serentak (misal beban honor PPK/Pantarlih ditanggung APBD Provinsi Jatim, sedangkan KPPS/Linmas ditanggung APBD Kabupaten Ngawi).",
      "NETRALITAS & INTEGRITAS PENERIMA: Anggota Ad Hoc dilarang berstatus anggota/pengurus partai politik, tim kampanye, maupun saksi pasangan calon.",
      "AKUNTABILITAS PENYALURAN NON-TUNAI: Penyaluran honorarium wajib diutamakan secara transfer bank langsung ke rekening penerima untuk menjamin transparansi dan mencegah potongan liar.",
      "LARANGAN PEMOTONGAN PAJAK TIDAK SAH: Pemotongan PPh Pasal 21 wajib mengacu pada tarif perpajakan yang sah (ASN Gol I/II & Non-ASN di bawah PTKP tarif 0%, ASN Gol III tarif 5%, ASN Gol IV tarif 15%)."
    ],
    output_spj: [
      "Surat Keputusan (SK) Pengangkatan Anggota PPK dan Sekretariat PPK bertandatangan Ketua/KPA KPU Kabupaten Ngawi.",
      "Surat Keputusan (SK) Pengangkatan Anggota PPS dan Sekretariat PPS bertandatangan Ketua KPU Kabupaten Ngawi.",
      "Surat Keputusan (SK) Pengangkatan KPPS dan Petugas Ketertiban TPS (Linmas) bertandatangan Ketua PPS atas nama KPU.",
      "Surat Keputusan (SK) Pengangkatan Pantarlih/PPDP bertandatangan KPU Kabupaten Ngawi.",
      "Daftar Nominatif Tanda Terima Pembayaran Honorarium Ad Hoc lengkap (*by name, by NIK, jabatan, nomor rekening, jumlah bruto, potongan PPh 21, dan jumlah netto*).",
      "Bukti Transfer Bank Massal (Payroll Bank) atau Surat Perintah Membayar / SP2D Bank Penyalur.",
      "Surat Setoran Pajak (SSP) / Bukti Pembayaran Pajak PPh Pasal 21 ke Kas Negara."
    ]
  }
];

// Data Ringkasan 11 Pokja KPU Kabupaten/Kota (Lampiran IV & V KPT 543/2022)
const POKJA_KPT543_DATA = [
  { no: 1, nama: "Pokja Penyusunan, Perencanaan, Perubahan/Revisi Rencana Anggaran Pemilihan", maks_orang: 13, internal_kpu: 10, masa_kerja: "Maksimal 3 Bulan" },
  { no: 2, nama: "Pokja Penyusunan Produk-Produk Hukum (Keputusan)", maks_orang: 13, internal_kpu: 10, masa_kerja: "Maksimal 3 Bulan" },
  { no: 3, nama: "Pokja Fasilitasi Pembentukan Badan Ad Hoc", maks_orang: 15, internal_kpu: 10, masa_kerja: "Maksimal 3 Bulan" },
  { no: 4, nama: "Pokja Pemutakhiran Data Pemilih dan Penyusunan Daftar Pemilih", maks_orang: 15, internal_kpu: 10, masa_kerja: "Maksimal 3 Bulan" },
  { no: 5, nama: "Pokja Verifikasi Persyaratan Pasangan Calon Perseorangan", maks_orang: 15, internal_kpu: 10, masa_kerja: "Maksimal 3 Bulan" },
  { no: 6, nama: "Pokja Pendaftaran dan Penetapan Pasangan Calon", maks_orang: 13, internal_kpu: 10, masa_kerja: "Maksimal 3 Bulan" },
  { no: 7, nama: "Pokja Sosialisasi dan Partisipasi Masyarakat / Penyuluhan / Bimtek", maks_orang: 15, internal_kpu: 10, masa_kerja: "Maksimal 3 Bulan" },
  { no: 8, nama: "Pokja Pelaksanaan Kampanye serta Fasilitasi dan Pelayanan Pelaporan Dana Kampanye", maks_orang: 15, internal_kpu: 10, masa_kerja: "Maksimal 3 Bulan" },
  { no: 9, nama: "Pokja Perencanaan, Pengadaan dan Pendistribusian Perlengkapan Pemungutan & Penghitungan Suara", maks_orang: 13, internal_kpu: 10, masa_kerja: "Maksimal 3 Bulan" },
  { no: 10, nama: "Pokja Pelaksanaan Pemungutan & Penghitungan Suara serta Rekapitulasi dan Penetapan Calon Terpilih", maks_orang: 15, internal_kpu: 10, masa_kerja: "Maksimal 3 Bulan" },
  { no: 11, nama: "Pokja Penyelesaian Sengketa Hukum", maks_orang: 13, internal_kpu: 10, masa_kerja: "Maksimal 3 Bulan (Dibentuk jika sengketa)" }
];

// Data Standar Honorarium Badan Ad Hoc Pilkada (Lampiran IV KPT 543/2022 jo Surat Menkeu S-647/2022)
const ADHOC_HONOR_DATA = [
  { badan: "PPK", jabatan: "Ketua", besaran: 2500000, satuan: "OB", masa_kerja: "Paling lama 9 Bulan" },
  { badan: "PPK", jabatan: "Anggota (4 orang)", besaran: 2200000, satuan: "OB", masa_kerja: "Paling lama 9 Bulan" },
  { badan: "PPK", jabatan: "Sekretaris (1 orang)", besaran: 1850000, satuan: "OB", masa_kerja: "Paling lama 9 Bulan" },
  { badan: "PPK", jabatan: "Staf / Pelaksana (maks 3 orang)", besaran: 1300000, satuan: "OB", masa_kerja: "Paling lama 9 Bulan" },
  { badan: "PPS", jabatan: "Ketua", besaran: 1500000, satuan: "OB", masa_kerja: "Paling lama 8 Bulan" },
  { badan: "PPS", jabatan: "Anggota (2 orang)", besaran: 1300000, satuan: "OB", masa_kerja: "Paling lama 8 Bulan" },
  { badan: "PPS", jabatan: "Sekretaris (1 orang)", besaran: 1150000, satuan: "OB", masa_kerja: "Paling lama 8 Bulan" },
  { badan: "PPS", jabatan: "Staf / Pelaksana (maks 2 orang)", besaran: 1050000, satuan: "OB", masa_kerja: "Paling lama 8 Bulan" },
  { badan: "KPPS", jabatan: "Ketua KPPS", besaran: 1200000, satuan: "OB", masa_kerja: "1 Bulan" },
  { badan: "KPPS", jabatan: "Anggota KPPS (6 orang)", besaran: 1100000, satuan: "OB", masa_kerja: "1 Bulan" },
  { badan: "KPPS", jabatan: "Petugas Ketertiban TPS / Linmas (2 orang)", besaran: 700000, satuan: "OB", masa_kerja: "1 Bulan" },
  { badan: "PANTARLIH", jabatan: "Petugas Pemutakhiran Data Pemilih (PPDP)", besaran: 1000000, satuan: "OB", masa_kerja: "1 s.d 2 Bulan" }
];

// Export jika di lingkungan Node.js (untuk keperluan unit testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    JUKNIS_KPT543_DATA,
    POKJA_KPT543_DATA,
    ADHOC_HONOR_DATA
  };
}

// Global window exposure di browser
if (typeof window !== 'undefined') {
  window.JUKNIS_KPT543_DATA = JUKNIS_KPT543_DATA;
  window.POKJA_KPT543_DATA = POKJA_KPT543_DATA;
  window.ADHOC_HONOR_DATA = ADHOC_HONOR_DATA;
}
