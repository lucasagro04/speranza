# 📧 Email Notifications Setup (2 Minutes!)

Get instant email alerts when your favorite Arc Raiders events go live!

---

## 🚀 Quick Setup (100% Free)

### Step 1: Get Your Free API Key

1. Go to **[resend.com/signup](https://resend.com/signup)**
2. Sign up with your email (takes 30 seconds)
3. Verify your email
4. Copy your **API Key** from the dashboard

---

### Step 2: Add API Key to Your Project

1. Open your project folder
2. Create a file named `.env.local` (if you don't have one)
3. Add this line:

```bash
RESEND_API_KEY=re_your_api_key_here
```

**Replace** `re_your_api_key_here` with your actual API key from Resend.

---

### Step 3: Restart Your Server

In your terminal, stop the server (Ctrl+C) and restart:

```bash
npm run dev
```

---

### Step 4: Enable Notifications in the App

1. Go to the **Events** tab
2. Enter your email address
3. Click **🔔 Enable Alerts**

**Done!** ✅

---

## 🎯 How It Works

- Every minute, the app checks for your favorite events (Matriarch, Harvester, Dam Night Raids)
- When an event starts, you get a **beautiful email notification** with:
  - Event name & map
  - Duration
  - End time
- Works on **iPhone, Mac, Android** - anywhere you get emails!

---

## 💡 Why Email is Perfect

✅ **Completely FREE** (100 emails/day limit, way more than enough)  
✅ **2-minute setup** (vs 10 minutes for SMS)  
✅ **No monthly costs** (unlike SMS services)  
✅ **Works everywhere** (iPhone, Mac, Android, desktop)  
✅ **Instant notifications** (just like texts on iPhone)

---

## 🔒 Is It Safe?

- **Resend** is a trusted email API used by thousands of developers
- Your email is stored **only in your browser** (localStorage)
- We only send you alerts for events you care about
- No spam, no marketing emails

---

## ❓ Troubleshooting

**Not receiving emails?**

1. Check your spam/junk folder
2. Make sure your API key is correct in `.env.local`
3. Verify you restarted the server after adding the API key
4. Check the browser console for any errors

**Still having issues?**

- Make sure notifications are enabled in the app
- Verify your email address is typed correctly
- Check that your favorite events are actually starting (Dam Night Raids, Matriarch, Harvester)

---

## 🎮 You're All Set!

Next time your favorite event goes live, you'll get a beautiful email alert! 🔥

**Example Email:**

```
Subject: 🎮 Matriarch Hunt is LIVE on Peninsula!

---

Arc Raiders Alert!

Matriarch Hunt is now LIVE on Peninsula!

Duration: 45 minutes
Ends at: 3:45 PM

🔥 LIVE NOW - JOIN THE RAID!

Good luck, Raider! 🚀
```

---

## 📊 Free Tier Limits

- **100 emails per day** (more than enough for Arc Raiders events)
- **3,000 emails per month**
- No credit card required

**Need more?** Resend's paid plan is only $20/month for 50,000 emails (but you won't need it!)

---

Enjoy your notifications! 🎉
