/**
 * Picking, describing and opening the files attached to a request.
 *
 * The rules here mirror the server's, but they are a courtesy, not the control:
 * the server re-checks the size, the extension, the declared type and the actual
 * bytes, and is the only thing standing between the bucket and a renamed
 * executable. Checking on the phone too just means someone finds out before
 * spending 30 seconds uploading.
 */
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import type { IconName } from '../components/auth/PrimaryButton';

/** Matches RequestFileValidator.MaxFileSizeBytes on the server. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Matches RequestFileValidator.MaxAttachmentsPerRequest. */
export const MAX_FILES_PER_SIDE = 10;

export const ALLOWED_EXTENSIONS = [
  '.pdf', '.jpg', '.jpeg', '.png', '.heic', '.webp',
  '.doc', '.docx', '.xls', '.xlsx',
] as const;

/** What the picker hands back, in the shape FormData needs. */
export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export const ALLOWED_LABEL = 'PDF, Word, Excel or an image';

/** The document picker's own filter. Images come from the image picker instead. */
const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

/** Guesses a content type from the name when the picker did not supply one. */
function mimeFor(name: string, given?: string | null): string {
  if (given && given !== 'application/octet-stream') return given;
  switch (extensionOf(name)) {
    case '.pdf': return 'application/pdf';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.png': return 'image/png';
    case '.heic': return 'image/heic';
    case '.webp': return 'image/webp';
    case '.doc': return 'application/msword';
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.xls': return 'application/vnd.ms-excel';
    case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default: return 'application/octet-stream';
  }
}

/**
 * Why a picked file cannot be sent, or null when it can.
 * Returned rather than thrown so the caller decides how to say it.
 */
export function rejectionReason(file: PickedFile): string | null {
  const ext = extensionOf(file.name);
  if (!ext) return 'That file has no extension, so we cannot tell what it is.';
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    return `${ext} files cannot be attached. Attach a ${ALLOWED_LABEL}.`;
  }
  if (file.size != null && file.size === 0) return 'That file is empty.';
  if (file.size != null && file.size > MAX_FILE_BYTES) {
    return `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_FILE_BYTES)}.`;
  }
  return null;
}

export type PickSource = 'camera' | 'library' | 'document';

/**
 * Opens the chosen picker. Returns null when the person backs out, and throws
 * only when the OS refuses permission, so a cancel is never an error.
 */
export async function pickFile(source: PickSource): Promise<PickedFile | null> {
  if (source === 'document') {
    const result = await DocumentPicker.getDocumentAsync({
      type: DOCUMENT_MIME_TYPES,
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return null;
    const asset = result.assets[0];
    const name = asset.name || 'document';
    return { uri: asset.uri, name, mimeType: mimeFor(name, asset.mimeType), size: asset.size ?? undefined };
  }

  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Camera access is off for this app. Turn it on in your phone settings to take a photo.');
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return null;
    return fromImageAsset(result.assets[0]);
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo access is off for this app. Turn it on in your phone settings to attach an image.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
  if (result.canceled || !result.assets?.[0]) return null;
  return fromImageAsset(result.assets[0]);
}

function fromImageAsset(asset: ImagePicker.ImagePickerAsset): PickedFile {
  // The camera hands back a cache path with no useful name; give it one that
  // carries the right extension so the server can identify it.
  const fallback = `photo_${Date.now()}.jpg`;
  const name = asset.fileName && extensionOf(asset.fileName) ? asset.fileName : fallback;
  return {
    uri: asset.uri,
    name,
    mimeType: mimeFor(name, asset.mimeType),
    size: asset.fileSize ?? undefined,
  };
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  // One decimal, but never a trailing ".0": the limit reads "10 MB", not "10.0 MB".
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

/** The icon that best describes a file, from its name. */
export function iconForFile(fileName: string): IconName {
  switch (extensionOf(fileName)) {
    case '.pdf': return 'file-pdf-box';
    case '.doc':
    case '.docx': return 'file-word-outline';
    case '.xls':
    case '.xlsx': return 'file-excel-outline';
    case '.jpg':
    case '.jpeg':
    case '.png':
    case '.heic':
    case '.webp': return 'file-image-outline';
    default: return 'file-outline';
  }
}

export function isImage(fileName: string): boolean {
  return ['.jpg', '.jpeg', '.png', '.heic', '.webp'].includes(extensionOf(fileName));
}
