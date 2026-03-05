# Xbox profile linking

To show your Xbox profile (gamertag, avatar, gamerscore, online status) in the **Active Community** tab:

1. Get a free API key from [OpenXBL](https://xbl.io/getting-started).
2. Add it to `.env.local`:
   ```
   OPENXBL_API_KEY=your_key_here
   ```
3. Restart the dev server, open **Active Community**, enter your gamertag, and click **Link profile**.

**Note:** Arc Raiders in-game stats (kills, wins, K/D, etc.) are not available via public Xbox APIs. Your linked profile shows your Xbox identity and presence; for full Arc Raiders stats, use [MetaForge](https://metaforge.app/arc-raiders).
