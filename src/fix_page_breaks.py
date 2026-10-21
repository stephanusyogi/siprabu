import sys
import os
import win32com.client

def fix_worksheet_breaks(file_path):
    abs_path = os.path.abspath(file_path)
    if not os.path.exists(abs_path):
        print(f"File not found: {abs_path}", file=sys.stderr)
        return False

    excel = None
    try:
        excel = win32com.client.Dispatch('Excel.Application')
        excel.Visible = False
        excel.DisplayAlerts = False

        wb = excel.Workbooks.Open(abs_path)
        ws = None
        for sheet in wb.Worksheets:
            if sheet.Name == 'RUH_Belanja_Resmi':
                ws = sheet
                break

        if not ws:
            wb.Close(False)
            return False

        # Switch to Page Break Preview to force Excel COM to calculate all breaks
        excel.ActiveWindow.View = 2

        used_rows = ws.UsedRange.Rows.Count
        total_breaks = ws.HPageBreaks.Count

        # Find row of TOTAL PAGU BELANJA
        total_row = None
        for r in range(used_rows, max(1, used_rows - 35), -1):
            val = ws.Cells(r, 1).Text
            if val and 'TOTAL PAGU BELANJA' in val.upper():
                total_row = r
                break

        if not total_row:
            wb.Close(False)
            return False

        # Cari baris akhir tanda tangan resmi (sebelum Penanda Riwayat File)
        sign_end_row = total_row + 6
        for r in range(total_row + 1, min(used_rows + 1, total_row + 20)):
            txt = ws.Cells(r, 1).Text
            if txt and '[PENANDA RIWAYAT' in txt.upper():
                sign_end_row = max(1, r - 3)
                break

        # Set Print Area Resmi Sheet RUH: hanya dari A1 sampai baris akhir tanda tangan (A1:K)
        # Baris Signature / Riwayat File di bawah berada di luar area print
        ws.PageSetup.PrintArea = f"$A$1:$K${sign_end_row}"

        # Set Print Area pada sheet lainnya agar Signature / Riwayat File di luar area print
        for s in wb.Worksheets:
            if s.Name == 'Matriks_Revisi':
                m_used = s.UsedRange.Rows.Count
                m_end = m_used
                for r in range(m_used, max(1, m_used - 20), -1):
                    txt = s.Cells(r, 1).Text
                    if txt and '[PENANDA RIWAYAT' in txt.upper():
                        m_end = max(1, r - 3)
                        break
                # Kolom No dan Level (L & M) diletakkan di luar area print: printArea terkunci di A1:K
                s.PageSetup.PrintArea = f"$A$1:$K${m_end}"
            elif s.Name == 'Data_Kertas_Kerja':
                k_used = s.UsedRange.Rows.Count
                k_end = k_used
                for r in range(k_used, max(1, k_used - 15), -1):
                    txt = s.Cells(r, 1).Text
                    if txt and '[PENANDA RIWAYAT' in txt.upper():
                        k_end = max(1, r - 3)
                        break
                s.PageSetup.PrintArea = f"$A$1:$P${k_end}"
            elif s.Name == 'Rekap_Alokasi':
                rk_used = s.UsedRange.Rows.Count
                rk_end = rk_used
                for r in range(rk_used, max(1, rk_used - 15), -1):
                    txt = s.Cells(r, 1).Text
                    if txt and '[PENANDA RIWAYAT' in txt.upper():
                        rk_end = max(1, r - 3)
                        break
                s.PageSetup.PrintArea = f"$A$1:$G${rk_end}"

        # Switch to Page Break Preview to force Excel COM to calculate all breaks based on PrintArea
        excel.ActiveWindow.View = 2
        total_breaks = ws.HPageBreaks.Count

        # If there are breaks, inspect the last break
        if total_breaks > 0:
            last_break_row = ws.HPageBreaks(total_breaks).Location.Row
            
            # Orphan signature: last break is between total_row and end of signature
            # Or total_row is right at the top of the last page without any data rows
            if last_break_row >= total_row:
                target_break = max(5, total_row - 2)
                # Set manual break 2 rows before total row
                ws.Rows(target_break).PageBreak = 1
                print(f"[AntiOrphan] Fixed: inserted manual page break at row {target_break} (Total row: {total_row})")
            else:
                print(f"[AntiOrphan] OK: last break at row {last_break_row} is before total row {total_row}")

            # Tambahkan garis bawah tebal (thick bottom border) pada baris terakhir setiap halaman cetak
            # Gunakan excel.Union untuk performa kilat (1 single batch call)
            final_breaks = ws.HPageBreaks.Count
            union_rng = None
            for i in range(1, final_breaks + 1):
                brk_row = ws.HPageBreaks(i).Location.Row
                last_row_of_page = brk_row - 1
                row_rng = ws.Range(f'A{last_row_of_page}:K{last_row_of_page}')
                if union_rng is None:
                    union_rng = row_rng
                else:
                    union_rng = excel.Union(union_rng, row_rng)

            if union_rng is not None:
                b = union_rng.Borders(9) # xlEdgeBottom = 9
                b.LineStyle = 1 # xlContinuous = 1
                b.Weight = 3 # xlMedium = 3 (garis tebal penutup tabel halaman)
                b.Color = 0 # Hitam

            # Samakan ketebalan garis paling kiri (Kolom A) dan paling kanan (Kolom K) dengan garis bawah (Weight = xlMedium = 3)
            # xlEdgeLeft = 7, xlEdgeRight = 10
            left_rng = ws.Range(f'A4:A{total_row}')
            b_left = left_rng.Borders(7)
            b_left.LineStyle = 1
            b_left.Weight = 3
            b_left.Color = 0

            right_rng = ws.Range(f'K4:K{total_row}')
            b_right = right_rng.Borders(10)
            b_right.LineStyle = 1
            b_right.Weight = 3
            b_right.Color = 0

            excel.ActiveWindow.View = 1 # xlNormalView
            wb.Save()
        else:
            excel.ActiveWindow.View = 1
            wb.Save()
            print("[AntiOrphan] Sheet fits within single page.")

        wb.Close(False)
        return True
    except Exception as e:
        print(f"[AntiOrphan] Error: {e}", file=sys.stderr)
        return False
    finally:
        if excel:
            try:
                excel.Quit()
            except:
                pass

if __name__ == '__main__':
    if len(sys.argv) > 1:
        fix_worksheet_breaks(sys.argv[1])
    else:
        fix_worksheet_breaks(r'C:\Users\noorj\.gemini\antigravity\scratch\siprabu_clean\temp_test.xlsx')
