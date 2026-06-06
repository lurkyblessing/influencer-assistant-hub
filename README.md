# Lumina Hub 🌸✨

Lumina Hub is a premium, collaborative workspace for influencers and their assistants. Powered by a custom Pantone design language, it helps you structure tasks, schedule posts, manage brand sponsorships, and leverage advanced AI analysis for social media engagement.

## Features Included
- **Dual Workspace Modes**: View and organize tasks as either the **Influencer** (Sienna) or the **Assistant** (Maya).
- **Interactive Kanban Task Board**: Easy coordination between creator and editor/manager.
- **Content Calendar Grid**: Track dates and platforms for all scheduled drops.
- **AI Engagement Strategy Engine**: Submit post analytics and automatically compile reports showing **What worked**, **What didn't**, and **Strategy recommendations** for your next posts.
- **AI Content Copilot**: Generate short-form hooks, scripts, captions, and brand partnership letters using either Google's Gemini API or the smart heuristic offline copilot.

---

## 🎨 Pantone Palette Tokens
- **Background Base**: `#433331` (Java Chocolate)
- **Primary Accents**: `#CF5C78` (Fruit Dove Rose) & `#973443` (Deep Claret Wine)
- **Contrast Accents**: `#EDD0DD` (Cradle Pink) & `#EFEBE7` (White Alyssum)

---

## How to Run & Access Lumina Hub

### Option 1: Open Directly
Simply double-click the [index.html](file:///Users/blessingbafunso/.gemini/antigravity/scratch/influencer-assistant-hub/index.html) file inside your finder/browser.

### Option 2: Host a Local Dev Server (Allow your Assistant to access!)
If your assistant is on the same Wi-Fi network, you can serve the directory using Python. Run the following command in your terminal:

```bash
# In the influencer-assistant-hub folder:
python3 -m http.server 8000
```

Once running:
1. **You** can access it at: `http://localhost:8000`
2. **Your Assistant** can access it by using your computer's local IP address on the network (e.g., `http://192.168.1.X:8000`).

*(To find your local IP address on Mac, hold Option and click your Wi-Fi icon, or run `ipconfig getifaddr en0` in Terminal).*

---

## Setting Up Gemini API Key
To enable real, semantic AI generation:
1. Open Lumina Hub in your browser.
2. Go to the **Settings** tab.
3. Paste your Google Gemini API key into the input field.
4. Click **Save Settings**.
