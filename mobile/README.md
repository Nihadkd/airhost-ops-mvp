# ServNest Mobile

Expo-based mobile app for ServNest.

## Run locally

```bash
cd mobile
npm install
npm start
```

Then open with:
- Expo Go (iOS/Android)
- Android emulator
- iOS simulator (macOS)

## Current setup

- App name: `ServNest`
- Bundle/package id: `com.servnest.app`
- Embedded web experience via `react-native-webview`
- App home opens `"/dashboard"`
- Foreground reopen resets to dashboard only after more than 30 minutes in background, unless a deeplink or push opens a specific target
- Push foundation in app (`expo-notifications`): permission + Expo token + local test notification
- Live backend URL: `https://nextjs-saas-v1.vercel.app`
- EAS build profiles in `eas.json`

## Next steps to ship

1. Add final logo/icon and splash assets.
2. Replace `mobile/app.json` -> `extra.eas.projectId` with your real EAS project id.
3. Add backend endpoint for storing Expo push token per user.
4. Configure EAS build and submit:
   - `npx eas build -p android`
   - `npx eas build -p ios`
5. Distribute:
   - Android Internal Testing (Play Console)
   - iOS TestFlight (App Store Connect)
