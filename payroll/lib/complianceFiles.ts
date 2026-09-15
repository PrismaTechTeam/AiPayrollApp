/**
 * Picking a file for a compliance document.
 *
 * Separate from requestAttachments because the server's allow-list is
 * *narrower* here: DocumentFileValidator accepts PDF, JPEG and PNG only, and it
 * decides by reading the bytes, not the extension. Word and Excel are attachable
 * to a request but are refused on an identity document. Reusing the request
 * picker would have let someone choose a .docx, wait out the upload and then be
 * told no — the one failure this file exists to prevent.
 */
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { formatBytes, MAX_FILE_BYTES, type PickedFile, type PickSource } from './requestAttachments';

export { formatBytes, MAX_FILE_BYTES };
export type { PickedFile, PickSource };

/** Mirrors DocumentFileValidator.Signatures on the server. */
export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'] as const;

export const ALLOWED_LABEL = 'a PDF, JPEG or PNG';

/** The document picker's own filter — the same three, expressed as MIME types. */
const DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

function mimeFor(name: string, given?: string | null): string {
  if (given && given !== 'application/octet-stream') return given;
  switch (extensionOf(name)) {
    case '.pdf': return 'application/pdf';
    case '.png': return 'image/png';
    default: return 'image/jpeg';
  }
}

/**
 * Why this file cannot be sent, or null when it can. Returned rather than
 * thrown so the caller decides how to say it.
 */
export function rejectionReason(file: PickedFile): string | null {
  const ext = extensionOf(file.name);
  if (!ext) return 'That file has no extension, so we cannot tell what it is.';

  // HEIC is what an iPhone saves by default and it is not on the server's list.
  // Naming it explicitly turns a baffling refusal into a next step.
  if (ext === '.heic' || ext === '.heif') {
    return 'That photo is in HEIC format, which we cannot accept. Take the photo with the camera here instead, and it will be saved as a JPEG.';
  }
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    return `${ext} files cannot be used for a document. Upload ${ALLOWED_LABEL}.`;
  }
  if (file.size != null && file.size === 0) return 'That file is empty.';
  if (file.size != null && file.size > MAX_FILE_BYTES) {
    return `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_FILE_BYTES)}. If it is a phone photo, take it again at a lower resolution.`;
  }
  return null;
}

/**
 * Opens the chosen picker. Returns null when the person backs out, and throws
 * only when the OS refuses permission, so a cancel is never an error.
 */
export async function pickDocumentFile(source: PickSource): Promise<PickedFile | null> {
  if (source === 'document') {
    const result = await DocumentPicker.getDocumentAsync({
      type: DOCUMENT_MIME_TYPES,
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return null;
    const asset = result.assets[0];
    const name = asset.name || 'document.pdf';
    return { uri: asset.uri, name, mimeType: mimeFor(name, asset.mimeType), size: asset.size ?? undefined };
  }

  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Camera access is off for this app. Turn it on in your phone settings to photograph a document.');
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return null;
    return fromImageAsset(result.assets[0]);
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo access is off for this app. Turn it on in your phone settings to upload a photo.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
  if (result.canceled || !result.assets?.[0]) return null;
  return fromImageAsset(result.assets[0]);
}

function fromImageAsset(asset: ImagePicker.ImagePickerAsset): PickedFile {
  // The camera hands back a cache path with no useful name; give it one that
  // carries the right extension so the server can identify it.
  const fallback = `document_${Date.now()}.jpg`;
  const name = asset.fileName && extensionOf(asset.fileName) ? asset.fileName : fallback;
  return {
    uri: asset.uri,
    name,
    mimeType: mimeFor(name, asset.mimeType),
    size: asset.fileSize ?? undefined,
  };
}
