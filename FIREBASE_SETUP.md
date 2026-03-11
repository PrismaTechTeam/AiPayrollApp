# Firebase Auth setup (mobile login)

The app uses **Firebase Authentication** for email/password login (same project as the web dashboard).

---

## If you already have Firebase on web (AiPayrollWeb)

Use the **same 3 values** as in `AiPayrollWeb/.env.development`:

1. In **AiPayrollApp/** create a file **`.env`** (or copy from `.env.example`).
2. Add these lines, copying the values from the web file:

| In AiPayrollWeb `.env.development` | In AiPayrollApp `.env` |
|-----------------------------------|-------------------------|
| `VITE_FIREBASE_API_KEY=...`       | `EXPO_PUBLIC_FIREBASE_API_KEY=...` (same value) |
| `VITE_FIREBASE_AUTH_DOMAIN=...`   | `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...` (same value) |
| `VITE_FIREBASE_PROJECT_ID=...`    | `EXPO_PUBLIC_FIREBASE_PROJECT_ID=...` (same value) |

3. Restart Expo (`npm start` in AiPayrollApp). Login on mobile will use the same Firebase project as the web.

---

## If you are setting up Firebase from scratch

## 1. Add a Web app in Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com/) and select your project (e.g. the one used in `google-services.json`).
2. Go to **Project settings** (gear) → **Your apps**.
3. Click **Add app** → choose **Web** (</>).
4. Register the app (e.g. name: "Payroll Mobile").
5. Copy the `firebaseConfig` object you see (you don’t need to add the SDK script to a website).

You’ll see something like:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

## 2. Give the config to the app

Use **one** of these.

### Option A: `.env` (recommended for local dev)

In `AiPayrollApp/` create or edit `.env`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123...
```

Restart Expo after changing `.env` (`npm start`).

### Option B: `app.json` extra

In `app.json`, under `expo.extra`, add:

```json
"extra": {
  "firebaseApiKey": "your_api_key_here",
  "firebaseAuthDomain": "your-project.firebaseapp.com",
  "firebaseProjectId": "your-project-id",
  "firebaseStorageBucket": "your-project.appspot.com",
  "firebaseMessagingSenderId": "123456789",
  "firebaseAppId": "1:123456789:web:abc123..."
}
```

## 3. Enable Email/Password in Firebase

1. In Firebase Console go to **Authentication** → **Sign-in method**.
2. Enable **Email/Password**.

## 4. Run the app

1. From `AiPayrollApp/`: `npm install` (installs `firebase` if not already).
2. `npm start`, then open on device/simulator.
3. Use an email/password that exists in Firebase Auth (e.g. create a test user under **Authentication** → **Users**).

If config is missing, the login screen will show: *"Firebase is not configured. Add a Web app in Firebase Console and set EXPO_PUBLIC_FIREBASE_* in .env..."*.

Config is read in `payroll/lib/firebase.ts`.
