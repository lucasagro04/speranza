# Twitch Live Streams Setup Guide

Follow these steps to enable the Twitch Live Streams feature in Arc-Hub.

---

## Step 1: Create a Twitch Developer Account

1. Go to [https://dev.twitch.tv/console](https://dev.twitch.tv/console)
2. Log in with your Twitch account (or create one if you don't have it)
3. Click **"Register Your Application"**

---

## Step 2: Register Your Application

Fill in the application form:

- **Name**: `Arc-Hub` (or any name you prefer)
- **OAuth Redirect URLs**: `http://localhost:3000` (just for the app registration)
- **Category**: Choose `Website Integration`
- **Client Type**: Choose `Confidential`

Click **"Create"** to register your app.

---

## Step 3: Get Your Credentials

After creating the app:

1. Click **"Manage"** on your newly created application
2. You'll see your **Client ID** - copy this
3. Click **"New Secret"** to generate a **Client Secret** - copy this immediately (you won't see it again!)

---

## Step 4: Add Credentials to Your Project

1. Open your `.env.local` file in the project root (create it if it doesn't exist)
2. Add these two lines with your credentials:

```bash
TWITCH_CLIENT_ID=your_client_id_here
TWITCH_CLIENT_SECRET=your_client_secret_here
```

**Example:**
```bash
TWITCH_CLIENT_ID=abc123def456ghi789
TWITCH_CLIENT_SECRET=xyz987uvw654rst321
```

---

## Step 5: Restart Your Development Server

1. Stop your development server (Ctrl+C or Cmd+C in the terminal)
2. Start it again:
   ```bash
   npm run dev
   ```

---

## Step 6: Test It Out!

1. Refresh your Arc-Hub page
2. Click on the **"Live Streams"** tab
3. You should see your favorite streamers when they're live playing Arc Raiders!

---

## Troubleshooting

**Not seeing any streams?**
- Make sure your favorite streamers (NickMercs, TFue, HutchMF, Clokesy) are actually live
- Verify they're streaming Arc Raiders specifically
- Check your browser console for any error messages

**"Twitch API not configured" error?**
- Double-check your `.env.local` file has the correct variable names
- Make sure there are no spaces around the `=` sign
- Restart your development server after adding credentials

---

## Monitored Streamers

The app currently tracks these streamers:
- **NickMercs** (@nickmercs)
- **TFue** (@tfue)
- **HutchMF** (@hutchmf)
- **Clokesy** (@clokesy)

Only streams playing Arc Raiders will be displayed!

---

## 🎮 You're All Set!

Your Twitch integration is now live. The app will check for streams every 60 seconds automatically.
