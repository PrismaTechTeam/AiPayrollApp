/**
 * Fetching an attachment's bytes and handing them to whatever the phone uses to
 * open that kind of file.
 *
 * The bytes come through the API rather than from a signed bucket URL, so every
 * read is authorised and logged — which means the download has to carry the
 * access token, and the plain `Linking.openURL` route is not available.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { shareAsync, isAvailableAsync } from 'expo-sharing';
import { API_CONFIG } from '../api/config';
import { tokenManager } from '../api/tokenManager';

/** Strips anything a file system would object to, and keeps a usable name. */
function safeLocalName(fileName: string): string {
  const cleaned = fileName.replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned.slice(0, 120) : `attachment_${Date.now()}`;
}

/**
 * Opens a file the server handed us a pre-signed link to.
 *
 * Claim receipts work the other way round from request attachments: the API
 * answers with a short-lived storage URL instead of the bytes. So the token must
 * NOT be sent — the signature is the authorisation, and an Authorization header
 * alongside it is rejected outright by some storage providers.
 *
 * @throws with a message written for the person, never a raw status code.
 */
export async function openSignedUrl(url: string, fileName: string): Promise<void> {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('This file is no longer available. Please try again.');
  }

  const folder = `${FileSystem.cacheDirectory}claim-receipts/`;
  try {
    await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
  } catch {
    // Already there.
  }

  const target = `${folder}${safeLocalName(fileName)}`;
  try {
    const existing = await FileSystem.getInfoAsync(target);
    if (existing.exists) await FileSystem.deleteAsync(target, { idempotent: true });
  } catch {
    // Nothing to clean up.
  }

  const result = await FileSystem.downloadAsync(url, target);

  if (result.status === 401 || result.status === 403) {
    await FileSystem.deleteAsync(target, { idempotent: true });
    // A signed link has minutes on it, so the usual cause is a stale one.
    throw new Error('That link has expired. Go back and open the receipt again.');
  }
  if (result.status === 404) {
    await FileSystem.deleteAsync(target, { idempotent: true });
    throw new Error('This receipt is no longer available. It may have been removed.');
  }
  if (result.status >= 400) {
    await FileSystem.deleteAsync(target, { idempotent: true });
    throw new Error('Could not download the receipt. Please try again.');
  }

  if (!(await isAvailableAsync())) {
    throw new Error('This phone cannot open files from the app.');
  }

  await shareAsync(result.uri, { dialogTitle: fileName });
}

/**
 * Downloads one attachment to a cache file and opens the share sheet on it.
 *
 * @param path  Server path from requestService.attachmentContentUrl(...)
 * @throws with a message written for the person, never a raw status code.
 */
export async function openAttachment(path: string, fileName: string): Promise<void> {
  const token = await tokenManager.getAccessToken();
  if (!token) throw new Error('Your session has ended. Sign in again to open this file.');

  const folder = `${FileSystem.cacheDirectory}request-attachments/`;
  try {
    await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
  } catch {
    // Already there — the only failure that matters shows up on the write below.
  }

  const target = `${folder}${safeLocalName(fileName)}`;

  // A file left from a previous open would otherwise be shared instead of the
  // fresh one when a name repeats.
  try {
    const existing = await FileSystem.getInfoAsync(target);
    if (existing.exists) await FileSystem.deleteAsync(target, { idempotent: true });
  } catch {
    // Nothing to clean up.
  }

  const result = await FileSystem.downloadAsync(
    `${API_CONFIG.baseUrl}${path}`,
    target,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (result.status === 401 || result.status === 403) {
    await FileSystem.deleteAsync(target, { idempotent: true });
    throw new Error('You do not have access to this file.');
  }
  if (result.status === 404) {
    await FileSystem.deleteAsync(target, { idempotent: true });
    throw new Error('This file is no longer available. It may have been removed.');
  }
  if (result.status >= 400) {
    await FileSystem.deleteAsync(target, { idempotent: true });
    throw new Error('Could not download the file. Please try again.');
  }

  if (!(await isAvailableAsync())) {
    throw new Error('This phone cannot open files from the app.');
  }

  await shareAsync(result.uri, { dialogTitle: fileName });
}
