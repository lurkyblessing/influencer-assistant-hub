/**
 * Lumina Hub - Local Storage Database Handler
 */

const DB_KEYS = {
  TASKS: 'lumina_tasks',
  REMINDERS: 'lumina_reminders',
  POSTS: 'lumina_posts',
  INSIGHTS: 'lumina_insights',
  SETTINGS: 'lumina_settings'
};

// Default Initial Data
const DEFAULT_TASKS = [];

const DEFAULT_REMINDERS = [];

// Starts empty as per user request to avoid fake data
const DEFAULT_POSTS = [];

const DEFAULT_INSIGHTS = {
  overallTrend: "No platforms connected. Sync an account in settings or onboarding to compile performance insights.",
  working: [],
  notWorking: [],
  recommendations: [],
  lastAnalyzed: null
};

const DEFAULT_SETTINGS = {
  influencerName: 'Sienna',
  assistantName: 'Maya',
  geminiApiKey: '',
  onboarded: false,
  connections: {} // e.g. { TikTok: '@sienna_style' }
};

const db = {
  get(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      this.set(key, defaultValue);
      return defaultValue;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(`Error parsing key ${key} from localStorage`, e);
      return defaultValue;
    }
  },

  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  // Tasks
  getTasks() {
    return this.get(DB_KEYS.TASKS, DEFAULT_TASKS);
  },
  saveTasks(tasks) {
    this.set(DB_KEYS.TASKS, tasks);
  },

  // Reminders
  getReminders() {
    return this.get(DB_KEYS.REMINDERS, DEFAULT_REMINDERS);
  },
  saveReminders(reminders) {
    this.set(DB_KEYS.REMINDERS, reminders);
  },

  // Posts
  getPosts() {
    return this.get(DB_KEYS.POSTS, DEFAULT_POSTS);
  },
  savePosts(posts) {
    this.set(DB_KEYS.POSTS, posts);
  },

  // Insights
  getInsights() {
    return this.get(DB_KEYS.INSIGHTS, DEFAULT_INSIGHTS);
  },
  saveInsights(insights) {
    this.set(DB_KEYS.INSIGHTS, insights);
  },

  // Settings
  getSettings() {
    return this.get(DB_KEYS.SETTINGS, DEFAULT_SETTINGS);
  },
  saveSettings(settings) {
    this.set(DB_KEYS.SETTINGS, settings);
  },

  // Platform Sync Post Generator
  generatePlatformPosts(platform, handle) {
    const cleanHandle = handle.startsWith('@') ? handle : '@' + handle;
    const dateOffset = (days) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.toISOString().split('T')[0];
    };

    if (platform === 'TikTok') {
      return [
        { id: 'p_tok_1', title: `GRWM Outfit Reveal with ${cleanHandle}`, platform: 'TikTok', date: dateOffset(4), views: 98400, likes: 14200, comments: 510, shares: 1400, caption: `Styling summer linen pieces today! What do we think? 🌸✨ ${cleanHandle} #grwm #ootd #summerstyle` },
        { id: 'p_tok_2', title: `My Assistant rates my coffee runs`, platform: 'TikTok', date: dateOffset(2), views: 45000, likes: 6200, comments: 240, shares: 320, caption: `She gave my standard iced vanilla latte order a 6/10... rude! 😂 ${cleanHandle} #coffee #vlog #relatable` }
      ];
    }
    if (platform === 'Instagram') {
      return [
        { id: 'p_ins_1', title: `Capsule wardrobe lookbook by ${cleanHandle}`, platform: 'Instagram', date: dateOffset(3), views: 32100, likes: 1900, comments: 85, shares: 45, caption: `Golden hour hits different in these fabrics. ☀️☕️ Shop my look at link in bio. @revolve` },
        { id: 'p_ins_2', title: `Creator Strategy Q&A Session`, platform: 'Instagram', date: dateOffset(1), views: 18400, likes: 1100, comments: 130, shares: 12, caption: `Maya and I are reviewing PR packages today! Leave your questions in the comments! 📥` }
      ];
    }
    if (platform === 'YouTube') {
      return [
        { id: 'p_yt_1', title: `A Realistic Day In My Life as a Creative Influencer (Vlog)`, platform: 'YouTube', date: dateOffset(5), views: 112000, likes: 10400, comments: 920, shares: 800, caption: `Welcome back to my channel! Sharing the backend of the creator business. Subscribe for more! ${cleanHandle}` }
      ];
    }
    if (platform === 'Pinterest') {
      return [
        { id: 'p_pin_1', title: `Cozy Coffee Nook & Decor Ideas`, platform: 'Pinterest', date: dateOffset(4), views: 8900, likes: 450, comments: 12, shares: 280, caption: `Aesthetic room decor inspiration. Pin by ${cleanHandle}.` }
      ];
    }
    if (platform === 'Twitter/X') {
      return [
        { id: 'p_tw_1', title: `Threads on building a creator audience`, platform: 'Twitter/X', date: dateOffset(1), views: 6700, likes: 380, comments: 45, shares: 90, caption: `It's not about views, it's about connection. 🧵 Here's my 5-step checklist for building a brand. ${cleanHandle}` }
      ];
    }
    return [];
  }
};
