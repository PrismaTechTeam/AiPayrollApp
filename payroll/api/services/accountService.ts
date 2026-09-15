/**
 * The person's own account — picture, name, two-factor — through the same web
 * controllers the dashboard uses, so both clients read and write one record.
 * Every call carries the caller's own user id: ValidateUserAccess on the server
 * compares it with the JWT. Nothing here depends on a tenant, which is the
 * point — this works before HR has approved anything.
 */
import axiosInstance from '../axiosInstance';
import { ENDPOINTS } from '../endpoints';

export interface TwoFactorSetup {
  /** otpauth:// URL for the authenticator app — as a QR or as a deep link. */
  totpUrl: string;
  /** The same secret, for typing in by hand when scanning is not possible. */
  key: string;
}

/** Pull the secret out of an otpauth URL when the server sent only the URL. */
function secretFromTotpUrl(totpUrl: string): string {
  const match = /[?&]secret=([^&]+)/i.exec(totpUrl);
  return match ? decodeURIComponent(match[1]) : '';
}

const accountService = {
  async getAvatarUrl(userId: string): Promise<string | null> {
    const response = await axiosInstance.get(ENDPOINTS.USER_PROFILE.GET_AVATAR, {
      params: { UserId: userId },
    });
    const url = response.data?.content;
    return typeof url === 'string' && url ? url : null;
  },

  async uploadAvatar(userId: string, fileUri: string, mimeType: string): Promise<void> {
    const form = new FormData();
    form.append('UserId', userId);
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    // React Native's FormData takes a {uri, name, type} descriptor where the web takes a File.
    form.append('Picture', { uri: fileUri, name: `avatar.${ext}`, type: mimeType } as unknown as Blob);
    await axiosInstance.post(ENDPOINTS.USER_PROFILE.UPLOAD_AVATAR, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // A photo on a slow connection outlives the default API timeout.
      timeout: 120000,
    });
  },

  async removeAvatar(userId: string): Promise<void> {
    await axiosInstance.delete(ENDPOINTS.USER_PROFILE.REMOVE_AVATAR, { data: { userId } });
  },

  async updateName(userId: string, firstName: string, lastName: string): Promise<void> {
    // The server stores FullName and splits it on the first space — the same
    // shape the web sends, so a name saved on either client reads back the same.
    await axiosInstance.put(ENDPOINTS.USER_PROFILE.UPDATE_DETAILS, {
      userId,
      fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
    });
  },

  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    const response = await axiosInstance.get(`${ENDPOINTS.TWO_FACTOR.STATUS}/${userId}`);
    return response.data?.content === true;
  },

  /** Generates (or regenerates) the authenticator secret. Nothing is enforced until confirmTwoFactor. */
  async beginTwoFactorSetup(userId: string): Promise<TwoFactorSetup> {
    const response = await axiosInstance.post(ENDPOINTS.TWO_FACTOR.ENABLE, { userId });
    const raw = response.data?.qrCodeUri ?? response.data?.content ?? response.data;
    if (typeof raw === 'string') {
      return { totpUrl: raw, key: secretFromTotpUrl(raw) };
    }
    const totpUrl: string = raw?.totpUrl ?? raw?.TotpUrl ?? '';
    const key: string = raw?.key ?? raw?.Key ?? secretFromTotpUrl(totpUrl);
    if (!totpUrl) throw new Error('The server did not return a setup code. Please try again.');
    return { totpUrl, key };
  },

  /** A wrong code answers 401; that is a wrong code, not an expired session. */
  async confirmTwoFactor(userId: string, code: string): Promise<void> {
    await axiosInstance.post(ENDPOINTS.TWO_FACTOR.VERIFY, { userId, code }, { skipAuthRefresh: true });
  },

  async disableTwoFactor(userId: string, code: string): Promise<void> {
    await axiosInstance.post(ENDPOINTS.TWO_FACTOR.DISABLE, { userId, code }, { skipAuthRefresh: true });
  },
};

export default accountService;
