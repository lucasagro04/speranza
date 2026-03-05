# Stash module (ARCTracker.io)

## 1. Is this possible?

**Yes, in the way we’ve implemented it.** There are two possible approaches:

### What we did: embed the Stash page

- The app has a **Stash** tab that embeds [ARCTracker.io’s Stash page](https://arctracker.io/stash) in an iframe.
- You use your **existing ARCTracker account** in that embedded view: when you’re logged in on ARCTracker.io in the same browser, the iframe can show your stash (if ARCTracker allows embedding and doesn’t block it for security).
- **No API key or backend needed.** No API is used; we only load their page inside ours.

### What’s not available today: a “pull data into our UI” API

- ARCTracker.io does **not** publish a public API for stash (or account) data.
- So we **cannot** “pull” your stash into our own layout (e.g. our own cards or list) without either:
  - An official API or partner access from ARCTracker, or  
  - Scraping or reusing their auth (not recommended: fragile and usually against their terms).
- If ARCTracker adds an API later, we could add a proper “Stash” module that fetches and displays your stash data directly.

---

## 2. How do I set it up?

1. **Open the Stash tab**  
   In the app, click the **Stash** tab in the header.

2. **Log in to ARCTracker (if needed)**  
   - If the embedded panel doesn’t show your stash, open [ARCTracker.io](https://arctracker.io) in another tab and log in.  
   - Then come back to the Stash tab and refresh; the iframe may now show your stash (same browser session).

3. **Link your ARC Raiders account (for real in-game stash)**  
   - Your **in-game** stash only syncs if you’ve linked your game account in ARCTracker.  
   - Go to [ARCTracker Settings](https://arctracker.io/settings) and follow their steps to link your ARC Raiders account.  
   - After linking, your stash on [ARCTracker.io/stash](https://arctracker.io/stash) (and in our Stash tab) will reflect your in-game inventory.

4. **If the embed is blocked**  
   Some sites block being shown in iframes. If the Stash tab stays blank or shows an error:
   - Use the direct link instead: [https://arctracker.io/stash](https://arctracker.io/stash).  
   - If you want a true “data in our UI” integration, you’d need to ask ARCTracker (e.g. via [their Discord](https://discord.gg/3EdnvjtcGW)) whether they offer an API or partner access for stash data.

---

**Summary:** The Stash tab embeds ARCTracker’s stash page so you can use it from our app. Log in and link your game account on ARCTracker to see your real in-game stash. A full “our UI + their data” integration would require an API from ARCTracker.
