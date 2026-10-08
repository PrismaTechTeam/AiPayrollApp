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
import {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import axiosInstance from '../api/axiosInstance';
import { API_CONFIG } from '../api/config';
import { statusOfError } from './serverMessage';

/** Strips anything a file system would object to, and keeps a usable name. */
function safeLocalName(fileName: string): string {
  const cleaned = fileName.replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned.slice(0, 120) : `attachment_${Date.now()}`;
}

// ── File types ────────────────────────────────────────────────────────

/**
 * What the share sheet needs to offer the right apps. Android picks a viewer by
 * MIME type and iOS by UTI; without them a PDF is offered as a generic blob and
 * the phone answers "no app can open this".
 */
const FILE_TYPES: Record<string, { mime: string; uti: string }> = {
  '.pdf': { mime: 'application/pdf', uti: 'com.adobe.pdf' },
  '.jpg': { mime: 'image/jpeg', uti: 'public.jpeg' },
  '.jpeg': { mime: 'image/jpeg', uti: 'public.jpeg' },
  '.png': { mime: 'image/png', uti: 'public.png' },
  '.heic': { mime: 'image/heic', uti: 'public.heic' },
  '.webp': { mime: 'image/webp', uti: 'org.webmproject.webp' },
  '.doc': { mime: 'application/msword', uti: 'com.microsoft.word.doc' },
  '.docx': {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    uti: 'org.openxmlformats.wordprocessingml.document',
  },
  '.xls': { mime: 'application/vnd.ms-excel', uti: 'com.microsoft.excel.xls' },
  '.xlsx': {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    uti: 'org.openxmlformats.spreadsheetml.sheet',
  },
};

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot).toLowerCase() : '';
  return FILE_TYPES[ext] ? ext : '';
}

/** Header lookup that does not care how the platform cased the name. */
function headerOf(headers: Record<string, string> | undefined, name: string): string | null {
  if (!headers) return null;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name);
  return key ? headers[key] : null;
}

/** The file name the server attached, from Content-Disposition, preferring the UTF-8 form. */
function dispositionName(headers: Record<string, string> | undefined): string | null {
  const value = headerOf(headers, 'content-disposition');
  if (!value) return null;
  const star = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/.exec(value);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      // Fall through to the plain form.
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(value);
  return plain ? plain[1].trim() : null;
}

/** The extension a bare MIME type stands for, when the server sent a real one. */
function extensionForMime(mime: string | null): string {
  const bare = (mime ?? '').split(';')[0].trim().toLowerCase();
  const hit = Object.entries(FILE_TYPES).find(([, t]) => t.mime === bare);
  return hit ? hit[0] : '';
}

/**
 * The name the saved file gets. The caller's name wins when it already says
 * what the file is; otherwise the extension comes from the server — a training
 * certificate is asked for by session, and only the response knows whether the
 * sheet HR scanned is a PDF or a photo.
 */
function finalName(requested: string, headers: Record<string, string> | undefined): string {
  const local = safeLocalName(requested);
  if (extensionOf(local)) return local;

  const fromServer = dispositionName(headers);
  const ext = (fromServer && extensionOf(fromServer)) || extensionForMime(headerOf(headers, 'content-type'));
  return ext ? `${local}${ext}` : local;
}

// ── Download ──────────────────────────────────────────────────────────

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
 * Runs one download as if it were an axios request, so it goes through the same
 * interceptors as every other API call: the token is refreshed before it runs
 * when it is about to expire, and a 401 is refreshed and retried once. Calling
 * FileSystem.downloadAsync with the stored token directly skipped both, and a
 * download after a quiet spell failed as "no access" until some other screen
 * happened to refresh the session.
 *
 * The bytes still go straight to disk — the adapter only stands in for the
 * network layer — and a failed response's body is read back so the server's own
 * sentence ("Your employment has ended…") reaches the person.
 */
function downloadAdapter(url: string, target: string) {
  return async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const headers: Record<string, string> = {};
    const auth = config.headers?.get?.('Authorization') ?? config.headers?.Authorization;
    if (typeof auth === 'string' && auth) headers.Authorization = auth;

    await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => undefined);
    const result = await FileSystem.downloadAsync(url, target, { headers });

    const response: AxiosResponse = {
      data: result,
      status: result.status,
      statusText: '',
      headers: (result.headers ?? {}) as AxiosResponse['headers'],
      config,
    };
    if (result.status < 400) return response;

    let body: unknown = null;
    try {
      body = JSON.parse(await FileSystem.readAsStringAsync(target));
    } catch {
      // Not JSON — the status alone decides the wording.
    }
    await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => undefined);

    throw new AxiosError(
      `Request failed with status code ${result.status}`,
      result.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config,
      null,
      { ...response, data: body },
    );
  };
}

/** The person's version of a failed download. The server's own words win. */
function downloadFailure(err: unknown): string {
  const body = (err as { response?: { data?: { message?: unknown } } } | null)?.response?.data;
  if (body && typeof body.message === 'string' && body.message.trim()) return body.message;

  switch (statusOfError(err)) {
    case undefined:
      // No status means no response: the phone never reached the server.
      return 'Could not reach the server. Check your connection and try again.';
    case 401:
      return 'Your session has ended. Sign in again to open this file.';
    case 403:
      return 'You do not have access to this file.';
    case 404:
      return 'This file is no longer available. It may have been removed.';
    default:
      return 'Could not download the file. Please try again.';
  }
}

/**
 * Downloads one attachment to a cache file and opens the share sheet on it.
 *
 * @param path      Server path, e.g. from requestService.attachmentContentUrl(...)
 * @param fileName  The name to save it under. Without an extension, the server's
 *                  Content-Disposition or Content-Type supplies one.
 * @throws with a message written for the person, never a raw status code.
 */
export async function openAttachment(path: string, fileName: string): Promise<void> {
  const folder = `${FileSystem.cacheDirectory}request-attachments/`;
  try {
    await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
  } catch {
    // Already there — the only failure that matters shows up on the write below.
  }

  // Downloaded to a scratch name first and renamed once the response says what
  // it is. Unique per call, so two quick taps on the same file cannot delete
  // each other's bytes halfway through.
  const scratch = `${folder}dl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.part`;

  let result: FileSystem.FileSystemDownloadResult;
  try {
    const response = await axiosInstance.request<FileSystem.FileSystemDownloadResult>({
      url: path,
      method: 'GET',
      adapter: downloadAdapter(`${API_CONFIG.baseUrl}${path}`, scratch),
    });
    result = response.data;
  } catch (err) {
    await FileSystem.deleteAsync(scratch, { idempotent: true }).catch(() => undefined);
    throw new Error(downloadFailure(err));
  }

  const name = finalName(fileName, result.headers);
  let target = `${folder}${name}`;
  try {
    // A file left from a previous open would otherwise be shared instead of the
    // fresh one when a name repeats.
    await FileSystem.deleteAsync(target, { idempotent: true });
    await FileSystem.moveAsync({ from: result.uri, to: target });
  } catch {
    // The rename is a nicety; the downloaded bytes are still good to share.
    target = result.uri;
  }

  if (!(await isAvailableAsync())) {
    await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => undefined);
    throw new Error('This phone cannot open files from the app.');
  }

  const type = FILE_TYPES[extensionOf(name)];
  await shareAsync(target, {
    dialogTitle: name,
    ...(type ? { mimeType: type.mime, UTI: type.uti } : null),
  });
}
