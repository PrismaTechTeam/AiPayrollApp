# Cloudflare tunnel setup for mobile app

Use this when the app must talk to your **local backend** from a device (e.g. physical phone or another machine). The tunnel gives a public HTTPS URL that forwards to `https://localhost:7133`.

---

## Checklist (order matters)

### 1. Backend is running

```bash
cd AiPayrollApi/Payroll
dotnet run
```

Leave this running. The API should be at **https://localhost:7133** (or the port in your launchSettings).

### 2. Start the Cloudflare tunnel

```bash
cd AiPayrollApp
./start-tunnel.sh
```

- The script starts **cloudflared** and waits for a URL like `https://xxxxx.trycloudflare.com`.
- It **updates `payroll/api/endpoint.ts`** with that URL (replacing the fallback in `getEnvVar('EXPO_PUBLIC_API_URL', '...')`).
- **Leave this terminal open.** If you close it, the tunnel stops and the URL stops working.

Note the URL the script prints (e.g. `https://peripheral-eds-raid-exciting.trycloudflare.com`). It is **different every time** you run the script.

### 3. Reload the Expo app

After the tunnel is running and `endpoint.ts` is updated:

- **Reload the app** (shake device → Reload, or press `r` in the Expo terminal) so it picks up the new base URL.
- If you had already opened the app before running the tunnel, a full reload is required.

### 4. Confirm the app uses the tunnel URL

When you tap **Sign In**, check the **Metro/Expo console**. You should see:

```text
[Login] API base URL: https://xxxxx.trycloudflare.com | Use this to verify Cloudflare tunnel.
```

- If you see **`https://localhost:7133`** or **`https://10.0.2.2:7133`** instead, the app is **not** using the tunnel. Then:
  - Ensure you ran `./start-tunnel.sh` from **AiPayrollApp** (so `payroll/api/endpoint.ts` was updated).
  - Ensure you **reloaded** the app after the tunnel started.
  - Optionally set **`EXPO_PUBLIC_API_URL`** in `AiPayrollApp/.env` to the tunnel URL so it overrides the file (e.g. `EXPO_PUBLIC_API_URL=https://your-current-tunnel.trycloudflare.com`).

### 5. Optional: Pin URL in .env

If you don’t want to rely on the script updating `endpoint.ts`:

1. Run `./start-tunnel.sh` once and copy the printed URL.
2. In **AiPayrollApp/.env** add:
   ```env
   EXPO_PUBLIC_API_URL=https://your-tunnel-url.trycloudflare.com
   ```
3. Restart Expo (`npm start`). The app will use this URL until you change it.

**Important:** That URL only works while the **same** tunnel is running. If you stop and restart `start-tunnel.sh`, you get a **new** URL and must update `.env` (or run the script and let it update `endpoint.ts`, then reload).

---

## Troubleshooting

| Symptom | What to check |
|--------|----------------|
| Login fails / network error | 1) Backend running? 2) Tunnel still running (terminal open)? 3) Console shows tunnel URL in `[Login] API base URL:`? 4) Reload app after tunnel start. |
| `[Login] API base URL: https://localhost:7133` | App is not using the tunnel. Update `payroll/api/endpoint.ts` (run `./start-tunnel.sh`) or set `EXPO_PUBLIC_API_URL` in `.env`, then reload. |
| Tunnel script says “endpoint.ts updated” but app still uses old URL | Reload the app (or restart Expo). JS is loaded from disk on reload. |
| “Connection refused” or timeout to tunnel URL | Backend not running on 7133, or tunnel process died. Restart backend and run `./start-tunnel.sh` again. |
| Backend returns 401/500 on firebase-login | Not a tunnel issue: Firebase token or backend auth config. Check backend logs. |

### Quick test from terminal

With the tunnel running, from your machine:

```bash
curl -s -o /dev/null -w "%{http_code}" https://YOUR_TUNNEL_URL.trycloudflare.com/swagger/index.html
```

Use the URL printed by `start-tunnel.sh`. A 200/302 means the tunnel is reaching your backend.

---

## Flow summary

1. **Firebase** (email/password) → done on Firebase servers; no tunnel needed.
2. **Backend** (firebase-login with ID token) → request goes to **API base URL** (tunnel URL if set) + `/api/mobile/auth/firebase-login`.
3. **Base URL** comes from: `EXPO_PUBLIC_API_URL` in `.env` → else `app.json` extra `apiUrl` → else fallback in `payroll/api/endpoint.ts` (updated by `start-tunnel.sh`).

So: **tunnel must be running**, **endpoint.ts or .env must have that tunnel URL**, and **app must be reloaded** after a new tunnel URL is set.
