/**
 * Turning a payslip into a PDF the employee can keep.
 *
 * The markup comes from the server — it is the same A4 document the web app
 * prints — so nothing about the layout is decided here. This only puts the file
 * somewhere with a name worth seeing in a Files app or a chat thread: expo-print
 * writes to a cache path with a random name, and "a1b2c3d4-….pdf" is not what
 * anyone wants to find six months later when HR asks for a payslip.
 */
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { isAvailableAsync, shareAsync } from 'expo-sharing';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * A4 at 72 PPI, and roughly the 10mm page margin the web payslip prints with.
 *
 * expo-print defaults to US Letter (612x792), which would reflow the document
 * the browser lays out on A4 and put the phone's PDF a page-size away from the
 * one HR hands out. `margins` is honoured on iOS only; on Android the sheet's
 * own inner padding keeps the content off the edge.
 */
const A4 = { width: 595, height: 842 };
const PAGE_MARGIN = { top: 28, right: 28, bottom: 28, left: 28 };

/** "Payslip Aug 2026.pdf", with anything a file system would object to removed. */
export function payslipFileName(year: number, month: number, employeeCode?: string | null): string {
  const period = MONTHS[month - 1] ? `${MONTHS[month - 1]} ${year}` : String(year);
  const who = employeeCode ? ` ${employeeCode}` : '';
  return `Payslip ${period}${who}`.replace(/[^\w.\- ]+/g, '_').trim() + '.pdf';
}

/**
 * Renders the payslip to a PDF and hands it to the phone's share sheet, which is
 * where "Save to Files" / "Save to Drive" live on both platforms.
 *
 * @returns where the file went, and whether the share sheet actually opened —
 *          a phone without one needs to be told the path instead.
 * @throws with a message written for the person.
 */
export async function sharePayslipPdf(
  html: string,
  fileName: string,
): Promise<{ uri: string; shared: boolean }> {
  const { uri } = await Print.printToFileAsync({ html, base64: false, ...A4, margins: PAGE_MARGIN });

  const folder = `${FileSystem.cacheDirectory}payslips/`;
  try {
    await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
  } catch {
    // Already there.
  }

  let target = `${folder}${fileName}`;
  try {
    const existing = await FileSystem.getInfoAsync(target);
    if (existing.exists) await FileSystem.deleteAsync(target, { idempotent: true });
    await FileSystem.moveAsync({ from: uri, to: target });
  } catch {
    // A rename is a nicety. If the cache will not have it, share the file
    // expo-print produced rather than failing the whole download.
    target = uri;
  }

  if (!(await isAvailableAsync())) return { uri: target, shared: false };

  await shareAsync(target, {
    mimeType: 'application/pdf',
    dialogTitle: fileName,
    UTI: 'com.adobe.pdf',
  });

  return { uri: target, shared: true };
}

/** Opens the OS print preview — the other route to a saved PDF, and to a printer. */
export async function printPayslip(html: string): Promise<void> {
  await Print.printAsync({ html, ...A4, margins: PAGE_MARGIN });
}
