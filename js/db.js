/**
 * Lumina Hub - Local Storage & Shared Supabase Database Handler
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
  connections: {},
  workspaceId: null // e.g. "LUMINA-4821"
};

const db = {
  supabase: null,
  isSyncing: false,

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

  // Local helper to save all current memory variables to LocalStorage
  saveAllLocal() {
    if (window.state) {
      this.set(DB_KEYS.TASKS, window.state.tasks || []);
      this.set(DB_KEYS.REMINDERS, window.state.reminders || []);
      this.set(DB_KEYS.POSTS, window.state.posts || []);
      this.set(DB_KEYS.SETTINGS, window.state.settings || {});
      this.set(DB_KEYS.INSIGHTS, window.state.insights || {});
    }
  },

  // Tasks
  getTasks() {
    return this.get(DB_KEYS.TASKS, DEFAULT_TASKS);
  },
  saveTasks(tasks) {
    this.set(DB_KEYS.TASKS, tasks);
    if (window.state) window.state.tasks = tasks;
    this.syncToCloud();
  },

  // Reminders
  getReminders() {
    return this.get(DB_KEYS.REMINDERS, DEFAULT_REMINDERS);
  },
  saveReminders(reminders) {
    this.set(DB_KEYS.REMINDERS, reminders);
    if (window.state) window.state.reminders = reminders;
    this.syncToCloud();
  },

  // Posts
  getPosts() {
    return this.get(DB_KEYS.POSTS, DEFAULT_POSTS);
  },
  savePosts(posts) {
    this.set(DB_KEYS.POSTS, posts);
    if (window.state) window.state.posts = posts;
    this.syncToCloud();
  },

  // Insights
  getInsights() {
    return this.get(DB_KEYS.INSIGHTS, DEFAULT_INSIGHTS);
  },
  saveInsights(insights) {
    this.set(DB_KEYS.INSIGHTS, insights);
    if (window.state) window.state.insights = insights;
    this.syncToCloud();
  },

  // Settings
  getSettings() {
    return this.get(DB_KEYS.SETTINGS, DEFAULT_SETTINGS);
  },
  saveSettings(settings) {
    this.set(DB_KEYS.SETTINGS, settings);
    if (window.state) window.state.settings = settings;
    this.syncToCloud();
  },

  // Platform Sync - Mock Data generation removed per strict API enforcement

  // Initialize connection keys and real-time listeners
  async initSupabase() {
    try {
      const resp = await fetch('/api/config');
      const config = await resp.json();
      
      if (config.supabaseUrl && config.supabaseAnonKey && window.supabase) {
        this.supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
        console.log("Supabase Client Initialized Successfully!");

        // Auto-assign workspace code if not present
        if (window.state && window.state.settings) {
          if (!window.state.settings.workspaceId) {
            window.state.settings.workspaceId = 'LUMINA-' + Math.floor(1000 + Math.random() * 9000);
            this.set(DB_KEYS.SETTINGS, window.state.settings);
          }
          
          // Pull initial state from cloud
          await this.pullFromCloud();
          
          // Bind real-time change listener
          this.subscribeToWorkspace(window.state.settings.workspaceId);
        }
      }
    } catch (e) {
      console.warn("Failed to initialize database sync. Falling back to offline local storage.", e);
    }
  },

  // Pull shared workspace data from cloud
  async pullFromCloud() {
    if (!this.supabase || !window.state?.settings?.workspaceId) return;

    const workspaceId = window.state.settings.workspaceId;
    try {
      const { data, error } = await this.supabase
        .from('lumina_workspaces')
        .select('data')
        .eq('id', workspaceId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is code for no rows found (expected for new code)
        console.error("Supabase pull error:", error);
        return;
      }

      if (data && data.data) {
        const cloud = data.data;
        // Merge cloud data to local state
        window.state.tasks = cloud.tasks || [];
        window.state.reminders = cloud.reminders || [];
        window.state.posts = cloud.posts || [];
        window.state.insights = cloud.insights || {};
        
        // Preserve local workspaceId but fetch names/keys
        const oldWorkspaceId = window.state.settings.workspaceId;
        window.state.settings = cloud.settings || window.state.settings;
        window.state.settings.workspaceId = oldWorkspaceId;

        // Save local cache copy
        this.saveAllLocal();

        if (window.renderAll) {
          window.renderAll();
        }
      } else {
        // Upload current offline data to initialize new workspace row on cloud
        await this.syncToCloud(true);
      }
    } catch (err) {
      console.error("Error pulling database state:", err);
    }
  },

  // Sync current memory data back to Supabase
  async syncToCloud(force = false) {
    if (!this.supabase || !window.state?.settings?.workspaceId) return;
    if (this.isSyncing && !force) return;

    this.isSyncing = true;
    const workspaceId = window.state.settings.workspaceId;
    
    // Construct package
    const payload = {
      settings: window.state.settings,
      tasks: window.state.tasks,
      reminders: window.state.reminders,
      posts: window.state.posts,
      insights: window.state.insights
    };

    try {
      const { error } = await this.supabase
        .from('lumina_workspaces')
        .upsert({ id: workspaceId, data: payload, updated_at: new Date() });

      if (error) {
        console.error("Supabase push failed:", error);
      }
    } catch (err) {
      console.error("Supabase push exception:", err);
    } finally {
      this.isSyncing = false;
    }
  },

  // Join an existing workspace
  async joinWorkspace(workspaceId) {
    if (!this.supabase || !workspaceId) return false;

    try {
      const { data, error } = await this.supabase
        .from('lumina_workspaces')
        .select('data')
        .eq('id', workspaceId)
        .single();

      if (error) {
        alert("Workspace Code not found! Please double check the code.");
        return false;
      }

      if (data && data.data) {
        // Overwrite local state
        const cloud = data.data;
        window.state.tasks = cloud.tasks || [];
        window.state.reminders = cloud.reminders || [];
        window.state.posts = cloud.posts || [];
        window.state.insights = cloud.insights || {};
        window.state.settings = cloud.settings || {};
        window.state.settings.workspaceId = workspaceId; // Use joined ID
        window.state.settings.onboarded = true; // Auto onboard since pulling set up workspace

        this.saveAllLocal();
        
        // Resubscribe to new workspace channel
        this.subscribeToWorkspace(workspaceId);

        if (window.renderAll) {
          window.renderAll();
        }
        return true;
      }
    } catch (e) {
      console.error("Join workspace exception", e);
    }
    return false;
  },

  // Listen to postgres updates in real-time
  subscribeToWorkspace(workspaceId) {
    if (!this.supabase) return;

    // Remove old subscriptions if any
    this.supabase.removeAllChannels();

    this.supabase.channel('workspace-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lumina_workspaces', filter: `id=eq.${workspaceId}` },
        (payload) => {
          if (payload.new && payload.new.data && !this.isSyncing) {
            console.log("Real-time Update Received!");
            const cloud = payload.new.data;
            
            window.state.tasks = cloud.tasks || [];
            window.state.reminders = cloud.reminders || [];
            window.state.posts = cloud.posts || [];
            window.state.insights = cloud.insights || {};
            
            // Preserve workspaceId
            const oldId = window.state.settings.workspaceId;
            window.state.settings = cloud.settings || window.state.settings;
            window.state.settings.workspaceId = oldId;

            this.saveAllLocal();

            if (window.renderAll) {
              window.renderAll();
            }
          }
        }
      )
      .subscribe();
  }
};
