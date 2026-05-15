# Android Frontend

This folder is a separate mobile-app starter for the inventory system. It is intentionally isolated from the existing `frontend/` web app so the current system stays unchanged.

## What this is

- A standalone Expo-based React Native starter for Android.
- A clean place to build a mobile client that can reuse the backend APIs.
- No changes are made to the current web frontend.
- The mobile app now logs in to the Spring Boot backend and loads live dashboard data.

## Suggested next steps

1. Install the mobile dependencies.
2. Wire the app to the Spring Boot backend.
3. Add authentication and API screens for products, inventory, and reports.

## Run idea

```bash
cd "android frontend"
npm install
npx expo install expo-camera
npx expo start
```

For a physical phone, set the backend URL inside the app to your computer's LAN IP. On this setup, the backend URL is `http://192.168.1.11:8080`. `localhost` will not work from the phone because it points to the device itself.

Demo credentials:

- Username: `admin`
- Password: `Admin@123`

To launch on Android from the Expo menu, press `a` after the dev server starts. If you want a full native Android build later, install Android Studio and use `npx expo run:android` after the Android SDK is configured.
