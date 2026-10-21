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

        # If there are breaks, inspect the last break
        if total_breaks > 0:
            last_break_row = ws.HPageBreaks(total_breaks).Location.Row
            
            # Orphan signature: last break is between total_row and end of signature
            # Or total_row is right at the top of the last page without any data rows
            if last_break_row >= total_row:
                target_break = max(5, total_row - 2)
                # Set manual break 2 rows before total row
                ws.Rows(target_break).PageBreak = 1
                excel.ActiveWindow.View = 1 # xlNormalView
                wb.Save()
                print(f"[AntiOrphan] Fixed: inserted manual page break at row {target_break} (Total row: {total_row})")
            else:
                excel.ActiveWindow.View = 1 # xlNormalView
                wb.Save()
                print(f"[AntiOrphan] OK: last break at row {last_break_row} is before total row {total_row}")
        else:
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
