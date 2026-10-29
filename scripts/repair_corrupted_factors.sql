-- ============================================================================
-- REPARASI FAKTOR PENGALI RAB_BARIS SI-PRABU (HOSTINGER & LOKAL)
-- Mengembalikan faktor volume baris yang sempat terduplikasi variabelnya
-- ============================================================================
START TRANSACTION;

-- [ID 894506] -. Peserta
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = 1393, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 894506;

-- [ID 894535] -. Peserta
UPDATE rab_baris SET f1_val = 3, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = 1393, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 894535;

-- [ID 894577] -. PPDP
UPDATE rab_baris SET f1_val = 2784, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 894577;

-- [ID 894585] -. PPDP
UPDATE rab_baris SET f1_val = 2784, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 894585;

-- [ID 894586] -. PPL
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = 1393, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 894586;

-- [ID 894587] -. Paslon
UPDATE rab_baris SET f1_val = 5, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 894587;

-- [ID 894598] -. Paslon
UPDATE rab_baris SET f1_val = 5, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 894598;

-- [ID 894627] -. Mantan PPDP
UPDATE rab_baris SET f1_val = 0, f1_unit = '', f1_var = '', f2_val = NULL, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 894627;

-- [ID 894633] -. PPL
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = 1393, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 894633;

-- [ID 894634] -. Tim Kampanye Paslon
UPDATE rab_baris SET f1_val = 5, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 894634;

-- [ID 894645] -. Tim Kampanye Paslon
UPDATE rab_baris SET f1_val = 5, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 894645;

-- [ID 894677] -. PPDP
UPDATE rab_baris SET f1_val = 2784, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 894677;

-- [ID 894678] -. PPL
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = 1393, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 894678;

-- [ID 894679] -. Paslon
UPDATE rab_baris SET f1_val = 5, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 894679;

-- [ID 894690] -. Paslon
UPDATE rab_baris SET f1_val = 5, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 894690;

-- [ID 894775] -. Tim Paslon Perseorangan
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = 2, f2_unit = '', f2_var = '', f3_val = 1, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 894775;

-- [ID 894783] -. Tim Paslon Perseorangan
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = 2, f2_unit = '', f2_var = '', f3_val = 10, f3_unit = '', f3_var = '', f4_val = 1, f4_unit = '', f4_var = '' WHERE id = 894783;

-- [ID 894795] -. Verifikasi Faktual Dukungan Bakal Paslon Perseorangan
UPDATE rab_baris SET f1_val = 2, f1_unit = '', f1_var = '', f2_val = 10, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 894795;

-- [ID 894796] -. Verifikasi Faktual Hasil Perbaikan DukunganBakal Paslon Perseorangan
UPDATE rab_baris SET f1_val = 2, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 894796;

-- [ID 895022] -. KPPS
UPDATE rab_baris SET f1_val = 3, f1_unit = '', f1_var = '', f2_val = 1393, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895022;

-- [ID 895030] -. Tingkat KPPS
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = 1393, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895030;

-- [ID 895036] -. Tingkat KPPS
UPDATE rab_baris SET f1_val = 14, f1_unit = '', f1_var = '', f2_val = 1393, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895036;

-- [ID 895089] -. Saksi Paslon
UPDATE rab_baris SET f1_val = 5, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = 45, f3_unit = '', f3_var = '', f4_val = 1393, f4_unit = '', f4_var = '' WHERE id = 895089;

-- [ID 895098] 2). Dari Kecamatan Ke Desa/Kelurahan/sebutan lainnya (PPS)
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = 2, f2_unit = '', f2_var = '', f3_val = 1393, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895098;

-- [ID 895099] 3). Dari Desa/Kel ke KPPS (TPS)
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = 2, f2_unit = '', f2_var = '', f3_val = 1393, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895099;

-- [ID 895451] 4). PPDP
UPDATE rab_baris SET f1_val = 40, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895451;

-- [ID 895679] 2). Masker medis
UPDATE rab_baris SET f1_val = 9, f1_unit = '', f1_var = '', f2_val = 3, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895679;

-- [ID 895680] 3). Sarung Tangan (LATEX)
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = NULL, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895680;

-- [ID 895681] 4). Sarung tangan plastik
UPDATE rab_baris SET f1_val = 10, f1_unit = '', f1_var = '', f2_val = NULL, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895681;

-- [ID 895682] 5). Face shield
UPDATE rab_baris SET f1_val = 9, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895682;

-- [ID 895683] 6). Hand Sanitiser 500ml
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = NULL, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895683;

-- [ID 895684] 7). Ember berkran
UPDATE rab_baris SET f1_val = 2, f1_unit = '', f1_var = '', f2_val = NULL, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895684;

-- [ID 895685] 8). Sabun Cuci Tangan 500ml
UPDATE rab_baris SET f1_val = 2, f1_unit = '', f1_var = '', f2_val = NULL, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895685;

-- [ID 895686] 9). Desinfektan 1 liter
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = NULL, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895686;

-- [ID 895687] 10). Sprayer
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = NULL, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895687;

-- [ID 895688] 11). Thermogun
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = NULL, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895688;

-- [ID 895689] 12). Plastik pembungkus
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = NULL, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895689;

-- [ID 895690] 13). Tisu kering
UPDATE rab_baris SET f1_val = 10, f1_unit = '', f1_var = '', f2_val = NULL, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895690;

-- [ID 895691] 14). Kantong Plastik Sampah
UPDATE rab_baris SET f1_val = 2, f1_unit = '', f1_var = '', f2_val = NULL, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895691;

-- [ID 895692] 15). Hazmat
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = NULL, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895692;

-- [ID 895693] 16). Suplemen
UPDATE rab_baris SET f1_val = 9, f1_unit = '', f1_var = '', f2_val = 30, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895693;

-- [ID 895705] -. PPDP
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = NULL, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895705;

-- [ID 895713] d. KPPS (188)
UPDATE rab_baris SET f1_val = 2, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895713;

-- [ID 895752] 1). Rapid Test (Antigen)
UPDATE rab_baris SET f1_val = 9, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895752;

-- [ID 895761] -. Snack
UPDATE rab_baris SET f1_val = 9, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895761;

-- [ID 895776] -. Snack
UPDATE rab_baris SET f1_val = 2784, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895776;

-- [ID 895878] a. Ketua
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = 1393, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895878;

-- [ID 895879] b. Anggota
UPDATE rab_baris SET f1_val = 6, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = 1393, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895879;

-- [ID 895880] c. Linmas
UPDATE rab_baris SET f1_val = 2, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = 1393, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895880;

-- [ID 895883] Honor Pantarlih
UPDATE rab_baris SET f1_val = 1, f1_unit = 'Bulan', f1_var = 'masa_kerja_pantarlih', f2_val = 2784, f2_unit = 'Org', f2_var = 'pantarlih', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 895883;

-- [ID 1000258] Konsumsi Peserta
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = 2784, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 1000258;

-- [ID 1000279] Konsumsi Peserta
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = 2784, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 1000279;

-- [ID 1000282] Bantrans Peserta
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = 2784, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 1000282;

-- [ID 1000294] Seminar Kit
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = 2784, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 1000294;

-- [ID 1000297] Tool Kit
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = 6, f2_unit = '', f2_var = '', f3_val = 217, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 1000297;

-- [ID 1000303] Konsumsi Peserta
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = 2784, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 1000303;

-- [ID 1000356] Salinan DPT (Saksi Paslon Pilgub)
UPDATE rab_baris SET f1_val = 3, f1_unit = '', f1_var = '', f2_val = 28, f2_unit = '', f2_var = '', f3_val = 1393, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 1000356;

-- [ID 1000397] Konsumsi pantarlih
UPDATE rab_baris SET f1_val = 2, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = 2784, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 1000397;

-- [ID 1000410] Bantuan transport peserta pantarlih
UPDATE rab_baris SET f1_val = 2, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = 2784, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 1000410;

-- [ID 1000441] KPPS
UPDATE rab_baris SET f1_val = 2, f1_unit = '', f1_var = '', f2_val = 1, f2_unit = '', f2_var = '', f3_val = 1393, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 1000441;

-- [ID 1000444] Tanda Pengenal KPPS
UPDATE rab_baris SET f1_val = 1, f1_unit = '', f1_var = '', f2_val = NULL, f2_unit = '', f2_var = '', f3_val = NULL, f3_unit = '', f3_var = '', f4_val = NULL, f4_unit = '', f4_var = '' WHERE id = 1000444;

COMMIT;
