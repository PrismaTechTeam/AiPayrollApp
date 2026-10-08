/**
 * The person's own account — picture, name, two-factor — through the same web
 * controllers the dashboard uses, so both clients read and write one record.
 * Every call carries the caller's own user id: ValidateUserAccess on the server
 * compares it with the JWT. Nothing here depends on a tenant, which is the
 * point — this works before HR has approved anything.
 */
import axiosInstance from '../axiosInstance';
import { ENDPOINTS } from '../endpoints';
import { serverMessage } from '../../lib/serverMessage';

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

/**
 * Why a call to these web controllers failed, in words a person can act on.
 *
 * They answer with ResponseHelper.Fail(reason, title): `message` is a heading
 * ("Verification Failed") and `errors[0]` the reason ("Invalid verification
 * code. Please try again."). serverMessage now reads the reason first and
 * gives a 5xx (whose errors[0] is a raw exception) the fallback, for every
 * module; this name is kept so the account screens read as before.
 */
export function accountErrorMessage(err: unknown, fallback: string): string {
  return serverMessage(err, fallback);
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
    // The id goes in the query as well as the body. On a DELETE, ValidateUserAccess
    // looks only at ?UserId= (or a route value), never the body, so with the id in
    // the body alone every removal came back 401. The body still binds the action's
    // [FromBody] parameter.
    await axiosInstance.delete(ENDPOINTS.USER_PROFILE.REMOVE_AVATAR, {
      params: { UserId: userId },
      data: { userId },
    });
  },

  async updateName(userId: string, firstName: string, lastName: string): Promise<void> {
    // update-profile-details writes every field of the profile, and a field left
    // out is written as empty: sending only the name wiped the phone number,
    // address, date of birth and user type kept on the web profile. So read the
    // record first and send it back whole, with only the name changed. If the
    // read fails, nothing is written.
    const current = await axiosInstance.get(ENDPOINTS.USER_PROFILE.GET_PROFILE, { params: { UserId: userId } });
    const profile = current.data?.content ?? {};
    // The server stores FullName and splits it on the first space — the same
    // shape the web sends, so a name saved on either client reads back the same.
    await axiosInstance.put(ENDPOINTS.USER_PROFILE.UPDATE_DETAILS, {
      userId,
      fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
      phoneNumber: profile.phoneNumber ?? null,
      address: profile.address ?? null,
      dateOfBirth: profile.dateOfBirth ?? null,
      userType: profile.userType ?? null,
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
