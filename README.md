This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# ASHI - React Native + NestJS Full Stack Application

A BLE szenzor monitorozó alkalmazás valós idejű adatmegjelenítéssel.

**▶️ Indítás egy paranccsal**: [INDITAS.md](INDITAS.md) | **📦 Átadás (1.0.0)**: [ATADAS.md](ATADAS.md) | **⚡ Gyors Start**: [QUICK_START.md](QUICK_START.md) | **📖 Teljes Info**: [PROJECT_STATUS.md](PROJECT_STATUS.md)

---

## Getting Started

>**Note**: Make sure you have completed the [React Native - Environment Setup](https://reactnative.dev/docs/environment-setup) instructions till "Creating a new application" step, before proceeding.

⚠️ **IMPORTANTES**: Olvasd el: [DATABASE_SETUP.md](DATABASE_SETUP.md) & [iOS_BUILD.md](iOS_BUILD.md)

## Step 1: Frontend - Start the Metro Server

## Ashi Full Stack Quick Start (DB + Backend + Mobile)

Use this order when you want the complete stack running locally.

1. Start PostgreSQL and ensure the `stepalign` database exists.
2. Set backend connection in `stepalign-backend/.env`:

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/stepalign"
```

3. Install dependencies:

```bash
npm install
npm --prefix stepalign-backend install
```

4. Run Prisma migration:

```bash
npx prisma migrate deploy --schema stepalign-backend/prisma/schema.prisma
```

5. Start backend (default port: `3000`):

```bash
npm run backend:start
```

6. Start Metro in another terminal (default port: `8081`):

```bash
npm start
```

7. (Optional, for physical phone testing) expose Metro with auto tunnel selection:

```bash
npm run dev:tunnel
```

This prints a public URL your phone can open on the same network or mobile data.
- Provider order in `auto` mode:
   1. `ngrok` (if auth token is configured)
   2. `localhost.run` (`https://...lhr.life` style URL)
   3. `localtunnel` (`https://...loca.lt`, may ask password)

Force a specific provider if needed:

```bash
TUNNEL_PROVIDER=localhostrun npm run dev:tunnel
# or
TUNNEL_PROVIDER=localtunnel npm run dev:tunnel

# or using dedicated scripts
npm run dev:tunnel:localhostrun
npm run dev:tunnel:localtunnel
```

Quick check URL example:

```bash
https://your-tunnel-domain/index.bundle?platform=android&dev=true&minify=false
```

8. Launch the app in a third terminal:

```bash
npm run android
# or
npm run ios
```

## Mobile demo without Metro tunnel

If you want to show the app on another Android phone during development, the most stable path is sharing an APK (no Metro needed).

1. Build APK:

```bash
npm run android:demo:build
```

2. Start a public install link:

```bash
npm run android:demo:share
```

Default `android:demo:share` mode uses local Wi-Fi link (`http://<your-ip>:8090/app-release.apk`) which is the most stable during development.

If you need internet/public sharing, use:

```bash
npm run android:demo:share:tunnel
```

The script writes the latest active link to `/tmp/ashi_apk_share.current`.
Keep that terminal running while others download/install, otherwise the public link stops working.

Shortcut on macOS (opens backend and Metro in separate Terminal windows):

```bash
npm run dev:all
```

If `DATABASE_URL` is missing, `dev:all` will skip backend and still start Metro + tunnel.

If `8081` is already in use, another Metro/dev server is running.

First, you will need to start **Metro**, the JavaScript _bundler_ that ships _with_ React Native.

To start Metro, run the following command from the _root_ of your React Native project:

```bash
# using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Start your Application

Let Metro Bundler run in its _own_ terminal. Open a _new_ terminal from the _root_ of your React Native project. Run the following command to start your _Android_ or _iOS_ app:

### For Android

```bash
# using npm
npm run android

# OR using Yarn
yarn android
```

### For iOS

```bash
# using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up _correctly_, you should see your new app running in your _Android Emulator_ or _iOS Simulator_ shortly provided you have set up your emulator/simulator correctly.

This is one way to run your app — you can also run it directly from within Android Studio and Xcode respectively.

## Step 3: Modifying your App

Now that you have successfully run the app, let's modify it.

1. Open `App.tsx` in your text editor of choice and edit some lines.
2. For **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Developer Menu** (<kbd>Ctrl</kbd> + <kbd>M</kbd> (on Window and Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (on macOS)) to see your changes!

   For **iOS**: Hit <kbd>Cmd ⌘</kbd> + <kbd>R</kbd> in your iOS Simulator to reload the app and see your changes!

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [Introduction to React Native](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you can't get this to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
