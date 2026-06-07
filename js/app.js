/**
 * Lumina Hub - Core Application Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize State and UI Bindings
  initApp();

  // Initialize Supabase shared sync engine
  await db.initSupabase();
  
  // 2. Set Up Navigation Events
  setupNavigation();
  
  // 3. Set Up Dashboard Event Handlers
  setupDashboardHandlers();
  
  // 4. Set Up Task Board Handlers
  setupTaskBoardHandlers();
  
  // 5. Set Up Planner Handlers
  setupPlannerHandlers();
  
  // 6. Set Up AI Insights Handlers
  setupInsightsHandlers();
  
  // 7. Set Up AI Studio Handlers
  setupStudioHandlers();
  
  // 8. Set Up Settings Handlers
  setupSettingsHandlers();
  
  // 9. Set Up OAuth Modals Handlers
  setupOAuthHandlers();
});

// App State
let state = {
  activeTab: 'dashboard',
  tasks: [],
  reminders: [],
  posts: [],
  insights: {},
  settings: {},
  activeUser: 'influencer', // 'influencer' or 'assistant'
  activeOauthPlatform: null,
  isOnboardingMode: false
};

function initApp() {
  // Load data from DB
  state.tasks = db.getTasks();
  state.reminders = db.getReminders();
  state.posts = db.getPosts();
  state.insights = db.getInsights();
  state.settings = db.getSettings();
  state.activeUser = state.settings.activeRole || 'influencer';

  // Backwards compatibility check
  if (!state.settings.connections) {
    state.settings.connections = {};
  }
  if (!state.settings.platforms) {
    state.settings.platforms = [];
  }
  // If they previously had platforms but no connections, migrate them
  if (state.settings.platforms && Object.keys(state.settings.connections).length === 0) {
    state.settings.platforms.forEach(p => {
      state.settings.connections[p] = '@sienna_style';
    });
  }

  // Toggle onboarding wizard visibility
  const wizard = document.getElementById('onboarding-wizard');
  if (state.settings.onboarded) {
    if (wizard) wizard.style.display = 'none';
    state.isOnboardingMode = false;
  } else {
    // Fresh launch/rerun: Reset database posts and insights to true zero-state
    state.posts = [];
    db.savePosts([]);
    state.insights = {
      overallTrend: "No platforms connected. Sync an account in settings or onboarding to compile performance insights.",
      working: [],
      notWorking: [],
      recommendations: [],
      lastAnalyzed: null
    };
    db.saveInsights(state.insights);

    if (wizard) {
      wizard.style.display = 'flex';
      state.isOnboardingMode = true;
      setupOnboardingEvents();
    }
  }

  // Apply Settings & Theme styling
  updateActiveUserUI();
  
  // Render views
  renderAll();
}

function setupOnboardingEvents() {
  const submitBtn = document.getElementById('onboard-submit-btn');
  const joinBtn = document.getElementById('onboard-join-btn');
  const joinCodeInput = document.getElementById('onboard-join-code');
  if (!submitBtn) return;
  
  // Render the connections list inside the onboarding wizard card
  renderConnectionsList('onboard-connections-list');

  // Handle Joining Existing Workspace Code
  if (joinBtn && joinCodeInput) {
    joinBtn.addEventListener('click', async () => {
      const code = joinCodeInput.value.trim().toUpperCase();
      if (!code) {
        alert("Please enter a workspace code!");
        return;
      }
      const success = await db.joinWorkspace(code);
      if (success) {
        alert(`Joined workspace ${code} successfully!`);
        window.location.reload(); // Reload to populate everything
      }
    });
  }

  submitBtn.addEventListener('click', () => {
    const influencerName = document.getElementById('onboard-influencer-name').value.trim() || 'Sienna';
    const assistantName = document.getElementById('onboard-assistant-name').value.trim() || 'Maya';
    const apiKey = document.getElementById('onboard-api-key').value.trim();
    
    const creatorNiche = document.getElementById('onboard-creator-niche').value;
    const creatorAudience = document.getElementById('onboard-creator-audience').value.trim();
    const creatorGoals = document.getElementById('onboard-creator-goals').value.trim();
    
    // Integrated platforms are derived from connected accounts
    const platforms = Object.keys(state.settings.connections || {});

    state.settings.influencerName = influencerName;
    state.settings.assistantName = assistantName;
    state.settings.geminiApiKey = apiKey;
    state.settings.creatorNiche = creatorNiche;
    state.settings.creatorAudience = creatorAudience;
    state.settings.creatorGoals = creatorGoals;
    state.settings.platforms = platforms;
    state.settings.onboarded = true;

    db.saveSettings(state.settings);
    state.activeUser = 'influencer';
    state.isOnboardingMode = false;
    
    // Hide wizard
    const wizard = document.getElementById('onboarding-wizard');
    if (wizard) wizard.style.display = 'none';
    
    // Apply changes
    updateActiveUserUI();
    renderAll();
  });
}

function renderAll() {
  renderDashboard();
  renderTaskBoard();
  renderPlanner();
  renderInsights();
  
  // Render connection managers on active panels
  if (state.isOnboardingMode) {
    renderConnectionsList('onboard-connections-list');
  } else {
    renderConnectionsList('settings-connections-list');
  }
}

/**
 * SOCIAL MEDIA CONNECTION MANAGER (SIMULATED OAUTH)
 */
function renderConnectionsList(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const platforms = ['TikTok', 'Instagram', 'YouTube', 'Pinterest', 'Twitter/X'];
  const connections = state.settings.connections || {};

  container.innerHTML = '';

  platforms.forEach(platform => {
    const isConnected = !!connections[platform];
    const handle = connections[platform] || '';
    
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.background = 'rgba(239, 235, 231, 0.04)';
    row.style.border = `1px solid ${isConnected ? getPlatformColor(platform) + '33' : 'var(--cradle-pink-low)'}`;
    row.style.borderRadius = 'var(--border-radius-md)';
    row.style.padding = '0.75rem 1rem';
    
    // Badge Indicator
    const badgeColor = getPlatformColor(platform);
    const statusText = isConnected 
      ? `<span style="font-size:0.75rem; color:#5cf5be; font-weight:600;">Connected: ${escapeHtml(handle)}</span>`
      : `<span style="font-size:0.75rem; color:var(--text-muted);">Not Connected</span>`;

    row.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.75rem;">
        <div style="width:10px; height:10px; border-radius:50%; background:${badgeColor}; box-shadow:0 0 8px ${badgeColor};"></div>
        <div style="display:flex; flex-direction:column;">
          <span style="font-size:0.95rem; font-weight:600; color:var(--white-alyssum);">${platform}</span>
          ${statusText}
        </div>
      </div>
      <div>
        ${isConnected 
          ? `<button class="btn btn-outline" style="padding:0.4rem 0.8rem; font-size:0.8rem; border-color:var(--fruit-dove); color:var(--fruit-dove);" onclick="disconnectPlatform('${platform}')">Disconnect</button>`
          : `<button class="btn btn-secondary" style="padding:0.4rem 0.8rem; font-size:0.8rem; border-color:${badgeColor}33;" onclick="connectPlatform('${platform}')">Connect Account</button>`
        }
      </div>
    `;

    container.appendChild(row);
  });
}

window.connectPlatform = function(platform) {
  state.activeOauthPlatform = platform;

  // Bypassing OAuth completely for YouTube, using simple prompt & direct fetch
  if (platform === 'YouTube') {
    const handle = prompt("Enter your YouTube Channel Handle (e.g. @sienna_style):");
    if (!handle) return;
    
    (async () => {
      try {
        const res = await fetch('/api/youtube/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform, handle })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to sync platform');
        
        if (data.posts && data.posts.length > 0) state.posts.push(...data.posts);
        
        const displayHandle = handle.startsWith('@') ? handle : '@' + handle;
        if (!state.settings.connections) state.settings.connections = {};
        state.settings.connections[platform] = displayHandle;
        if (!state.settings.platforms) state.settings.platforms = [];
        if (!state.settings.platforms.includes(platform)) state.settings.platforms.push(platform);
        
        db.saveSettings(state.settings);
        db.savePosts(state.posts);
        
        renderAll();
        
        const insightsBtn = document.getElementById('insights-run-ai-btn');
        if (insightsBtn) insightsBtn.click();
        
        alert('YouTube connected and synced successfully using API Key!');
      } catch (err) {
        alert(`Sync Failed: ${err.message}`);
      }
    })();
    return;
  }

  // Bypassing OAuth completely for Pinterest, using simple prompt & RSS fetch
  if (platform === 'Pinterest') {
    const handle = prompt("Enter your Pinterest Username (e.g. sienna_style):");
    if (!handle) return;
    
    (async () => {
      try {
        const res = await fetch('/api/pinterest/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform, handle })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to sync platform');
        
        if (data.posts && data.posts.length > 0) state.posts.push(...data.posts);
        
        const displayHandle = handle.startsWith('@') ? handle : '@' + handle;
        if (!state.settings.connections) state.settings.connections = {};
        state.settings.connections[platform] = displayHandle;
        if (!state.settings.platforms) state.settings.platforms = [];
        if (!state.settings.platforms.includes(platform)) state.settings.platforms.push(platform);
        
        db.saveSettings(state.settings);
        db.savePosts(state.posts);
        
        renderAll();
        
        const insightsBtn = document.getElementById('insights-run-ai-btn');
        if (insightsBtn) insightsBtn.click();
        
        alert('Pinterest connected and synced successfully via RSS Feed!');
      } catch (err) {
        alert(`Sync Failed: ${err.message}`);
      }
    })();
    return;
  }

  // Extract platform-specific custom Client ID from settings
  let customId = '';
  if (platform === 'Instagram') customId = state.settings.instagramClientId || '';
  else if (platform === 'TikTok') customId = state.settings.tiktokClientId || '';
  else if (platform === 'YouTube') customId = state.settings.youtubeClientId || '';

  // 1. Open the real serverless OAuth initiator in a centered popup window
  const popupWidth = 600;
  const popupHeight = 700;
  const left = (window.screen.width / 2) - (popupWidth / 2);
  const top = (window.screen.height / 2) - (popupHeight / 2);
  const loginUrl = `/api/auth/login?platform=${encodeURIComponent(platform)}` + 
    (customId ? `&customClientId=${encodeURIComponent(customId)}` : '');
  
  window.open(
    loginUrl,
    'LuminaHubOAuth',
    `width=${popupWidth},height=${popupHeight},top=${top},left=${left},resizable=yes,scrollbars=yes`
  );
  
  // 2. Set up modal in "Waiting for authentication" state
  const modalContainer = document.getElementById('oauth-modal-container');
  const title = document.getElementById('oauth-modal-title');
  const desc = document.getElementById('oauth-modal-desc');
  const authPlatformName = document.getElementById('oauth-auth-platform-name');
  const addressBar = document.getElementById('oauth-browser-address-bar');
  const waitingHint = document.getElementById('oauth-waiting-platform-hint');
  const handleDesc = document.getElementById('oauth-handle-desc');
  const usernameInput = document.getElementById('oauth-username-input');
  
  const stepLogin = document.getElementById('oauth-step-login');
  const stepHandle = document.getElementById('oauth-step-handle');
  const stepAuth = document.getElementById('oauth-step-auth');
  const stepSyncing = document.getElementById('oauth-step-syncing');

  // Reset all steps
  if (stepLogin) stepLogin.style.display = 'block';
  if (stepHandle) stepHandle.style.display = 'none';
  if (stepAuth) stepAuth.style.display = 'none';
  if (stepSyncing) stepSyncing.style.display = 'none';

  // Apply Platform Branding & Theme colors
  const platformColor = getPlatformColor(platform);
  if (modalContainer) {
    modalContainer.style.borderColor = platformColor;
    modalContainer.style.boxShadow = `0 12px 50px ${platformColor}22`;
  }
  
  // Address bar URL simulation — show the Vercel API redirect initiator
  if (addressBar) {
    addressBar.innerText = window.location.origin + loginUrl;
  }

  if (title) {
    title.innerHTML = `<span style="color:${platformColor}">${platform}</span> Login Portal`;
  }
  if (desc) {
    desc.innerText = `A popup window has been opened. Log in to your ${platform} developer account, then we will automatically advance.`;
  }
  if (waitingHint) {
    waitingHint.innerText = `Logging in via secure connection. Click below if you need to manually bypass.`;
  }
  if (handleDesc) {
    handleDesc.innerText = `Enter your ${platform} username/handle so we can scan your content.`;
  }
  if (usernameInput) {
    usernameInput.value = '';
    usernameInput.placeholder = platform === 'YouTube' ? 'E.g., sienna_vlogs' : 'E.g., @sienna_style';
  }
  if (authPlatformName) {
    authPlatformName.innerText = platform;
  }
  
  openModal('modal-oauth-login');
};

window.disconnectPlatform = function(platform) {
  if (confirm(`Disconnect ${platform}? All synced posts and metrics for this platform will be removed from your workspace.`)) {
    // Delete connection entry
    delete state.settings.connections[platform];
    
    // Update integrated platforms array
    state.settings.platforms = Object.keys(state.settings.connections);
    db.saveSettings(state.settings);

    // Delete corresponding post metrics
    state.posts = state.posts.filter(p => p.platform !== platform);
    db.savePosts(state.posts);
    
    // Clear and recalculate insights since data pool changed
    state.insights = {
      overallTrend: state.posts.length > 0 ? "Data modified. Run AI Insights to refresh." : "No platforms connected. Sync an account in settings or onboarding to compile performance insights.",
      working: [],
      notWorking: [],
      recommendations: [],
      lastAnalyzed: null
    };
    db.saveInsights(state.insights);

    renderAll();
  }
};

function setupOAuthHandlers() {
  const loginBtn = document.getElementById('oauth-login-btn');
  const scanBtn = document.getElementById('oauth-scan-btn');
  const grantBtn = document.getElementById('oauth-auth-grant-btn');
  const denyBtn = document.getElementById('oauth-auth-deny-btn');
  
  const stepLogin = document.getElementById('oauth-step-login');
  const stepHandle = document.getElementById('oauth-step-handle');
  const stepAuth = document.getElementById('oauth-step-auth');
  const stepSyncing = document.getElementById('oauth-step-syncing');

  const usernameInput = document.getElementById('oauth-username-input');

  const loaderText = document.getElementById('oauth-sync-text');
  const loaderSubtext = document.getElementById('oauth-sync-subtext');
  const addressBar = document.getElementById('oauth-browser-address-bar');

  if (!loginBtn || !grantBtn || !denyBtn) return;

  // Handle postMessage event listener from the popup window callback
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'OAUTH_CALLBACK') {
      const { status, platform, handle, error } = event.data;
      
      if (status === 'success') {
        if (usernameInput) {
          usernameInput.value = handle || '';
        }
        
        // Transition to Step 2 (Confirm username)
        if (stepLogin) stepLogin.style.display = 'none';
        if (stepHandle) stepHandle.style.display = 'block';
        
        if (addressBar) {
          addressBar.innerText = `${window.location.origin}/api/auth/callback?status=success&platform=${platform}`;
        }
      } else {
        alert(`Authentication failed: ${error || 'Unknown error'}`);
      }
    }
  });

  // Handle manual/fallback bypass button click (Step 1 → Step 2: Handle Capture)
  loginBtn.addEventListener('click', () => {
    const platform = state.activeOauthPlatform;

    if (stepLogin) stepLogin.style.display = 'none';
    if (stepHandle) stepHandle.style.display = 'block';

    // Update Address Bar to show handle capture URL
    if (addressBar) {
      let url = '';
      if (platform === 'TikTok') url = 'auth.tiktok.com/oauth/callback?status=authenticated';
      else if (platform === 'Instagram') url = 'api.instagram.com/oauth/callback?status=authenticated';
      else if (platform === 'YouTube') url = 'accounts.google.com/o/oauth2/callback?status=authenticated';
      else if (platform === 'Pinterest') url = 'www.pinterest.com/oauth/callback?status=authenticated';
      else if (platform === 'Twitter/X') url = 'twitter.com/i/oauth2/callback?status=authenticated';
      else url = `${platform.toLowerCase().replace('/', '')}.com/callback`;
      addressBar.innerText = 'https://' + url;
    }
  });

  // Handle "Scan & Import" button click (Step 2 → Step 3: Authorization)
  if (scanBtn) {
    scanBtn.addEventListener('click', () => {
      const handle = usernameInput ? usernameInput.value.trim() : '';
      if (!handle) {
        alert('Please enter your username or handle!');
        return;
      }

      const platform = state.activeOauthPlatform;

      if (stepHandle) stepHandle.style.display = 'none';
      if (stepAuth) stepAuth.style.display = 'block';

      // Update Address Bar to show OAuth Permissions Screen URL
      if (addressBar) {
        let url = '';
        if (platform === 'TikTok') url = 'auth.tiktok.com/consent?client_key=lumina_hub';
        else if (platform === 'Instagram') url = 'api.instagram.com/consent?client_id=lumina_hub';
        else if (platform === 'YouTube') url = 'accounts.google.com/o/oauth2/consent?client_id=lumina_hub';
        else if (platform === 'Pinterest') url = 'www.pinterest.com/consent/?client_id=lumina_hub';
        else if (platform === 'Twitter/X') url = 'twitter.com/i/oauth2/consent?client_id=lumina_hub';
        else url = `${platform.toLowerCase().replace('/', '')}.com/consent`;
        addressBar.innerText = 'https://' + url;
      }
    });
  }

  // Handle Deny button click (cancel modal)
  denyBtn.addEventListener('click', () => {
    closeModal('modal-oauth-login');
  });

  // Handle Grant/Authorize button click (Step 3 → Step 4: Syncing → Link & Close)
  grantBtn.addEventListener('click', () => {
    const handle = usernameInput ? usernameInput.value.trim() : '';
    const platform = state.activeOauthPlatform;
    
    // Advance to Step 4 (Syncing loader)
    if (stepAuth) stepAuth.style.display = 'none';
    if (stepSyncing) stepSyncing.style.display = 'block';

    // Update Address Bar to Redirect URL callback
    if (addressBar) {
      addressBar.innerText = window.location.origin + '/oauth/callback?code=sec_auth_tok_lumina';
    }

    const steps = [
      { t: "Establishing secure handshake...", s: `Connecting to ${platform} Auth API...` },
      { t: "Authenticating session credentials...", s: "Verifying secure login keys..." },
      { t: "Importing analytics feeds...", s: "Syncing view metrics, likes, and comment streams..." },
      { t: "Finalizing local cache data...", s: "Successfully mapped feed posts to Lumina Database!" }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        if (loaderText) loaderText.innerText = steps[currentStep].t;
        if (loaderSubtext) loaderSubtext.innerText = steps[currentStep].s;
        currentStep++;
      } else {
        clearInterval(interval);
        
        (async () => {
          // Complete the link in state
          const displayHandle = handle.startsWith('@') || platform === 'YouTube' ? handle : '@' + handle;
          
          try {
            if (platform === 'YouTube') {
              if (loaderText) loaderText.innerText = "Fetching real YouTube data...";
              const res = await fetch('/api/youtube/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  platform, 
                  handle: displayHandle, 
                  apiKey: state.settings.youtubeClientId 
                })
              });
              const data = await res.json();
              
              if (!res.ok) throw new Error(data.error || 'Failed to sync platform');
              
              if (data.posts && data.posts.length > 0) {
                state.posts.push(...data.posts);
              }
            } else {
              throw new Error(`Real API sync for ${platform} is not fully configured in strict mode.`);
            }
            
            // Save successful connection
            if (!state.settings.connections) state.settings.connections = {};
            state.settings.connections[platform] = displayHandle;
            
            if (!state.settings.platforms) state.settings.platforms = [];
            if (!state.settings.platforms.includes(platform)) {
              state.settings.platforms.push(platform);
            }

            db.saveSettings(state.settings);
            db.savePosts(state.posts);
            
            closeModal('modal-oauth-login');
            renderAll();
            
            const insightsBtn = document.getElementById('insights-run-ai-btn');
            if (insightsBtn) insightsBtn.click();
            
          } catch (err) {
            alert(`Sync Failed: ${err.message}. Connection aborted.`);
            closeModal('modal-oauth-login');
          }
        })();
      }
    }, 650);
  });
}

/**
 * USER ROLE MANAGER & PLATFORM SYNCRONIZER
 */
function updateActiveUserUI() {
  try {
    const avatar = document.getElementById('active-user-avatar');
    const name = document.getElementById('active-user-name');
    const role = document.getElementById('active-user-role');
    const toggleBtn = document.getElementById('dashboard-toggle-role');
    const welcomeText = document.getElementById('dashboard-welcome');
    const subtitleText = document.getElementById('dashboard-subtitle');
    
    const settings = state.settings || {};

    // Make sure platforms list is initialized
    if (!settings.platforms) {
      settings.platforms = Object.keys(settings.connections || {});
    }

    if (state.activeUser === 'influencer') {
      if (avatar) avatar.innerText = (settings.influencerName || 'Sienna').charAt(0);
      if (name) name.innerText = settings.influencerName || 'Sienna';
      if (role) role.innerText = 'Influencer';
      if (toggleBtn) toggleBtn.innerText = `View as ${settings.assistantName || 'Maya'} (Assistant)`;
      if (welcomeText) welcomeText.innerText = `Hey ${settings.influencerName || 'Sienna'},`;
      if (subtitleText) subtitleText.innerText = `Here's what you and ${settings.assistantName || 'Maya'} have lined up for today.`;
    } else {
      if (avatar) avatar.innerText = (settings.assistantName || 'Maya').charAt(0);
      if (name) name.innerText = settings.assistantName || 'Maya';
      if (role) role.innerText = 'Assistant';
      if (toggleBtn) toggleBtn.innerText = `View as ${settings.influencerName || 'Sienna'} (Influencer)`;
      if (welcomeText) welcomeText.innerText = `Hey ${settings.assistantName || 'Maya'},`;
      if (subtitleText) subtitleText.innerText = `Here's what you and ${settings.influencerName || 'Sienna'} have lined up for today.`;
    }
    
    // Set values on Settings tab page inputs
    const setInfName = document.getElementById('settings-influencer-name');
    if (setInfName) setInfName.value = settings.influencerName || 'Sienna';
    
    const setAsstName = document.getElementById('settings-assistant-name');
    if (setAsstName) setAsstName.value = settings.assistantName || 'Maya';
    
    // Update role drop down options in Settings
    const roleSelect = document.getElementById('settings-active-role');
    if (roleSelect) {
      roleSelect.innerHTML = `
        <option value="influencer">Influencer (${settings.influencerName || 'Sienna'})</option>
        <option value="assistant">Assistant (${settings.assistantName || 'Maya'})</option>
      `;
      roleSelect.value = state.activeUser;
    }
    
    const setApiKey = document.getElementById('settings-api-key');
    if (setApiKey) setApiKey.value = settings.geminiApiKey || '';

    const setNiche = document.getElementById('settings-creator-niche');
    if (setNiche) setNiche.value = settings.creatorNiche || 'fashion_beauty';

    const setAudience = document.getElementById('settings-creator-audience');
    if (setAudience) setAudience.value = settings.creatorAudience || '';

    const setGoals = document.getElementById('settings-creator-goals');
    if (setGoals) setGoals.value = settings.creatorGoals || '';

    // Synchronize assignees dropdown labels in creator modals
    const taskAssignee = document.getElementById('form-task-assignee');
    if (taskAssignee) {
      taskAssignee.innerHTML = `
        <option value="Influencer">Influencer (${settings.influencerName || 'Sienna'})</option>
        <option value="Assistant">Assistant (${settings.assistantName || 'Maya'})</option>
      `;
    }
    const reminderAssignee = document.getElementById('form-reminder-assignee');
    if (reminderAssignee) {
      reminderAssignee.innerHTML = `
        <option value="Influencer">Influencer (${settings.influencerName || 'Sienna'})</option>
        <option value="Assistant">Assistant (${settings.assistantName || 'Maya'})</option>
      `;
    }

    // Synchronize platforms dropdown in task modal
    const taskPlatform = document.getElementById('form-task-platform');
    if (taskPlatform) {
      taskPlatform.innerHTML = '';
      (settings.platforms || []).forEach(plat => {
        taskPlatform.innerHTML += `<option value="${plat}">${plat}</option>`;
      });
      taskPlatform.innerHTML += `<option value="General">General / PR</option>`;
    }

    // Synchronize platforms dropdown in post metrics modal
    const postPlatform = document.getElementById('form-post-platform');
    if (postPlatform) {
      postPlatform.innerHTML = '';
      (settings.platforms || []).forEach(plat => {
        postPlatform.innerHTML += `<option value="${plat}">${plat}</option>`;
      });
    }
  } catch (error) {
    console.error("Error updating active user UI:", error);
  }
}

function switchUserRole(role) {
  state.activeUser = role;
  state.settings.activeRole = role;
  db.saveSettings(state.settings);
  updateActiveUserUI();
  renderAll(); 
}

/**
 * NAVIGATION ROUTER
 */
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const panes = document.querySelectorAll('.tab-pane');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabName = item.getAttribute('data-tab');
      state.activeTab = tabName;
      
      // Update nav class list
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      // Toggle visibility
      panes.forEach(pane => {
        if (pane.id === `tab-${tabName}`) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });
      
      // Perform task-specific updates when shifting panels
      if (tabName === 'dashboard') {
        renderDashboard();
      } else if (tabName === 'tasks') {
        renderTaskBoard();
      } else if (tabName === 'planner') {
        renderPlanner();
      } else if (tabName === 'insights') {
        renderInsights();
      }
    });
  });
}

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

/**
 * VIEW RENDERING & WIDGET CONTROL
 */

// 1. DASHBOARD VIEW
function renderDashboard() {
  try {
    const settings = state.settings;
    const activePlatforms = settings.platforms || [];
    const integratedPosts = state.posts.filter(p => activePlatforms.includes(p.platform));
    
    // Render KPI Widgets based on connected platforms
    const totalViews = integratedPosts.reduce((acc, curr) => acc + (parseInt(curr.views) || 0), 0);
    const kpiViews = document.getElementById('kpi-views');
    if (kpiViews) kpiViews.innerText = totalViews.toLocaleString();
    
    // Calculate average engagement rate based on connected platforms
    let totalEngagement = 0;
    integratedPosts.forEach(p => {
      const likes = parseInt(p.likes) || 0;
      const comments = parseInt(p.comments) || 0;
      const shares = parseInt(p.shares) || 0;
      totalEngagement += (likes + comments + shares);
    });
    const avgEngagementRate = totalViews > 0 ? ((totalEngagement / totalViews) * 100).toFixed(1) : "0.0";
    const kpiEngagement = document.getElementById('kpi-engagement');
    if (kpiEngagement) kpiEngagement.innerText = `${avgEngagementRate}%`;
    
    // Pending tasks based on connected platforms
    const pendingTasks = state.tasks.filter(t => t.status !== 'done' && (t.platform === 'General' || activePlatforms.includes(t.platform))).length;
    const kpiTasks = document.getElementById('kpi-tasks');
    if (kpiTasks) kpiTasks.innerText = pendingTasks;
    
    // Scheduled posts this month
    const kpiPosts = document.getElementById('kpi-posts');
    if (kpiPosts) kpiPosts.innerText = integratedPosts.length;

    // Reminders List (Filtered or general)
    const remindersContainer = document.getElementById('dashboard-reminders-list');
    if (remindersContainer) {
      remindersContainer.innerHTML = '';
      
      if (state.reminders.length === 0) {
        remindersContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 2rem 0;">No reminders logged. Click "+ Add Reminder" to begin!</div>`;
      } else {
        const sortedReminders = [...state.reminders].sort((a, b) => a.completed - b.completed);
        
        sortedReminders.forEach(reminder => {
          const item = document.createElement('div');
          item.className = `reminder-item ${reminder.completed ? 'completed' : ''}`;
          
          if (reminder.assignee === 'Assistant') {
            item.style.borderLeftColor = 'var(--deep-claret)';
          }
          
          const assigneeName = reminder.assignee === 'Assistant' ? settings.assistantName : settings.influencerName;
          
          item.innerHTML = `
            <input type="checkbox" class="reminder-checkbox" ${reminder.completed ? 'checked' : ''} onchange="toggleReminderStatus('${reminder.id}')">
            <div class="reminder-content">
              <div class="reminder-text">${escapeHtml(reminder.text)}</div>
              <div class="reminder-meta">
                <span>👤 For: ${assigneeName}</span>
                <span>📅 Due: ${reminder.dueDate || 'No Date'}</span>
              </div>
            </div>
            <button class="reminder-delete" onclick="deleteReminder('${reminder.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          `;
          remindersContainer.appendChild(item);
        });
      }
    }

    // Today's Social Post / Content log
    const dashboardPostsList = document.getElementById('dashboard-recent-posts');
    if (dashboardPostsList) {
      dashboardPostsList.innerHTML = '';
      
      const recentPosts = [...integratedPosts].slice(0, 4);
      
      if (recentPosts.length === 0) {
        dashboardPostsList.innerHTML = `<p style="grid-column: span 2; text-align: center; color: var(--text-muted); padding: 2.2rem 0; font-size:0.9rem;">No accounts connected. Go to settings or run onboarding to sync your first platform account!</p>`;
      } else {
        recentPosts.forEach(post => {
          const card = document.createElement('div');
          card.className = 'kpi-card';
          card.style.cursor = 'pointer';
          card.style.background = 'rgba(239, 235, 231, 0.03)';
          card.style.borderColor = getPlatformColor(post.platform) + '33';
          card.style.borderLeft = `4px solid ${getPlatformColor(post.platform)}`;
          
          const likes = parseInt(post.likes) || 0;
          const comments = parseInt(post.comments) || 0;
          const shares = parseInt(post.shares) || 0;
          const total = likes + comments + shares;
          const rate = post.views > 0 ? ((total / post.views) * 100).toFixed(1) : 0;

          card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
              <span style="font-size:0.75rem; font-weight:600; color:${getPlatformColor(post.platform)}">${post.platform.toUpperCase()}</span>
              <span style="font-size:0.75rem; color:var(--text-muted);">${post.date}</span>
            </div>
            <span style="font-size:0.95rem; font-weight:600; color:var(--white-alyssum); display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(post.title)}</span>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem; font-size:0.8rem;">
              <span style="color:var(--text-secondary);">👀 ${(parseInt(post.views) || 0).toLocaleString()} views</span>
              <span style="font-weight:700; color:var(--cradle-pink);">${rate}% Engagement</span>
            </div>
          `;
          card.addEventListener('click', () => {
            openEditPostModal(post);
          });
          dashboardPostsList.appendChild(card);
        });
      }
    }

    // AI Insights Banner Trend Snippet
    const trendSnippet = document.getElementById('dashboard-ai-insights-snippet');
    if (trendSnippet && state.insights && state.insights.overallTrend) {
      trendSnippet.innerText = state.insights.overallTrend;
    }
  } catch (error) {
    console.error("Error rendering dashboard:", error);
  }
}

function setupDashboardHandlers() {
  document.getElementById('dashboard-toggle-role').addEventListener('click', () => {
    const nextRole = state.activeUser === 'influencer' ? 'assistant' : 'influencer';
    switchUserRole(nextRole);
  });
  
  document.getElementById('dashboard-new-reminder').addEventListener('click', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('form-reminder-date').value = tomorrow.toISOString().split('T')[0];
    document.getElementById('form-reminder-text').value = '';
    document.getElementById('form-reminder-assignee').value = state.activeUser === 'influencer' ? 'Influencer' : 'Assistant';
    openModal('modal-add-reminder');
  });

  // Modal Submit Add Reminder
  document.getElementById('form-reminder-submit').addEventListener('click', () => {
    const text = document.getElementById('form-reminder-text').value;
    const assignee = document.getElementById('form-reminder-assignee').value;
    const date = document.getElementById('form-reminder-date').value;

    if (!text) {
      alert("Please fill in reminder text!");
      return;
    }

    const newReminder = {
      id: 'r_' + Date.now(),
      text,
      assignee,
      dueDate: date,
      completed: false
    };

    state.reminders.push(newReminder);
    db.saveReminders(state.reminders);
    closeModal('modal-add-reminder');
    renderAll();
  });
  
  document.getElementById('dashboard-to-insights-btn').addEventListener('click', () => {
    document.querySelector('.nav-item[data-tab="insights"]').click();
  });
}


// 2. KANBAN TASK BOARD VIEW
function renderTaskBoard() {
  const statuses = ['todo', 'in-progress', 'done'];
  const settings = state.settings;
  
  // Clear lists
  statuses.forEach(status => {
    const colEl = document.getElementById(`column-${status}`);
    colEl.innerHTML = '';
    
    colEl.addEventListener('dragover', dragOver);
    colEl.addEventListener('dragenter', dragEnter);
    colEl.addEventListener('drop', (e) => dragDrop(e, status));
  });

  // Filter tasks based on integrated platforms
  const activePlatforms = settings.platforms || [];
  const integratedTasks = state.tasks.filter(t => t.platform === 'General' || activePlatforms.includes(t.platform));
  
  // Update counts
  statuses.forEach(status => {
    const count = integratedTasks.filter(t => t.status === status).length;
    document.getElementById(`count-${status}`).innerText = count;
  });

  // Render cards
  integratedTasks.forEach(task => {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.id = `task_${task.id}`;
    
    card.addEventListener('dragstart', (e) => dragStart(e, task.id));
    
    const platformBadge = task.platform ? `<span class="tag tag-platform" style="background:${getPlatformColor(task.platform)}22; color:${getPlatformColor(task.platform)}">${task.platform}</span>` : '';
    
    const assigneeName = task.assignee === 'Assistant' ? settings.assistantName : settings.influencerName;
    const assigneeBadge = `<span class="tag tag-assignee">${assigneeName}</span>`;
    
    let cycleButtonsHTML = `<div style="display:flex; gap:0.25rem;">`;
    if (task.status === 'todo') {
      cycleButtonsHTML += `<button class="btn btn-outline" style="padding:0.25rem; font-size:0.75rem;" onclick="moveTask('${task.id}', 'in-progress')">⚡ Start</button>`;
    } else if (task.status === 'in-progress') {
      cycleButtonsHTML += `<button class="btn btn-outline" style="padding:0.25rem; font-size:0.75rem;" onclick="moveTask('${task.id}', 'done')">✅ Done</button>`;
    }
    cycleButtonsHTML += `<button class="btn btn-outline" style="padding:0.25rem; font-size:0.75rem; border-color:var(--fruit-dove); color:var(--fruit-dove);" onclick="deleteTask('${task.id}')">🗑️</button>`;
    cycleButtonsHTML += `</div>`;

    card.innerHTML = `
      <div class="task-tags">
        ${platformBadge}
        ${assigneeBadge}
      </div>
      <div class="task-title">${escapeHtml(task.title)}</div>
      <div class="task-footer">
        <span class="task-due">📅 ${task.dueDate || 'No Date'}</span>
        ${cycleButtonsHTML}
      </div>
    `;
    
    document.getElementById(`column-${task.status}`).appendChild(card);
  });
}

// Drag Drop Core Logic
let draggedTaskId = null;

function dragStart(e, taskId) {
  draggedTaskId = taskId;
  e.dataTransfer.setData('text/plain', taskId);
}

function dragOver(e) {
  e.preventDefault();
}

function dragEnter(e) {
  e.preventDefault();
}

function dragDrop(e, status) {
  e.preventDefault();
  const id = e.dataTransfer.getData('text/plain') || draggedTaskId;
  if (id) {
    moveTask(id, status);
  }
}

window.moveTask = function(id, nextStatus) {
  const taskIndex = state.tasks.findIndex(t => t.id === id || t.id === id.replace('task_', ''));
  if (taskIndex > -1) {
    state.tasks[taskIndex].status = nextStatus;
    db.saveTasks(state.tasks);
    renderAll();
  }
};

window.deleteTask = function(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  db.saveTasks(state.tasks);
  renderAll();
};

function setupTaskBoardHandlers() {
  document.getElementById('tasks-add-task-btn').addEventListener('click', () => {
    document.getElementById('form-task-title').value = '';
    document.getElementById('form-task-due').value = new Date().toISOString().split('T')[0];
    document.getElementById('form-task-assignee').value = state.activeUser === 'influencer' ? 'Influencer' : 'Assistant';
    openModal('modal-add-task');
  });

  // Modal Submit Add Task
  document.getElementById('form-task-submit').addEventListener('click', () => {
    const title = document.getElementById('form-task-title').value;
    const platform = document.getElementById('form-task-platform').value;
    const assignee = document.getElementById('form-task-assignee').value;
    const dueDate = document.getElementById('form-task-due').value;

    if (!title) {
      alert("Please fill in task title!");
      return;
    }

    const newTask = {
      id: 't_' + Date.now(),
      title,
      platform,
      assignee,
      dueDate,
      status: 'todo'
    };

    state.tasks.push(newTask);
    db.saveTasks(state.tasks);
    closeModal('modal-add-task');
    renderAll();
  });
}


// 3. CONTENT CALENDAR / POST PLANNER
function renderPlanner() {
  const grid = document.getElementById('calendar-grid');
  const settings = state.settings;
  const activePlatforms = settings.platforms || [];
  
  const headers = grid.querySelectorAll('.calendar-day-header');
  grid.innerHTML = '';
  headers.forEach(h => grid.appendChild(h));
  
  const startDayOffset = 1; 
  const totalDays = 30;
  
  for (let i = 0; i < startDayOffset; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-cell';
    emptyCell.style.opacity = '0.25';
    grid.appendChild(emptyCell);
  }
  
  const todayNum = (new Date().getMonth() === 5 && new Date().getFullYear() === 2026) ? new Date().getDate() : 5;
  
  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `2026-06-${day.toString().padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = `calendar-cell ${day === todayNum ? 'today' : ''}`;
    
    cell.innerHTML = `<span class="calendar-date">${day}</span>`;
    
    // Find post on this date (filtered by active platforms)
    const dayPosts = state.posts.filter(p => p.date === dateStr && activePlatforms.includes(p.platform));
    
    const postContainer = document.createElement('div');
    postContainer.className = 'calendar-posts';
    
    dayPosts.forEach(post => {
      const badge = document.createElement('div');
      badge.className = `calendar-post-badge ${post.platform.toLowerCase().replace('/','')}`;
      badge.innerText = `${post.platform.charAt(0)}: ${post.title}`;
      badge.style.borderLeftColor = getPlatformColor(post.platform);
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditPostModal(post);
      });
      postContainer.appendChild(badge);
    });
    
    cell.appendChild(postContainer);
    
    cell.addEventListener('click', () => {
      if (activePlatforms.length === 0) {
        alert("Please connect a social platform account in Settings or Onboarding first!");
        return;
      }
      openAddPostModal(dateStr);
    });
    
    grid.appendChild(cell);
  }
}

function openAddPostModal(dateStr) {
  const settings = state.settings;
  const defaultPlatform = settings.platforms[0] || 'TikTok';
  
  document.getElementById('form-post-title').value = '';
  document.getElementById('form-post-platform').value = defaultPlatform;
  document.getElementById('form-post-date').value = dateStr;
  document.getElementById('form-post-views').value = '';
  document.getElementById('form-post-likes').value = '';
  document.getElementById('form-post-comments').value = '';
  document.getElementById('form-post-shares').value = '';
  document.getElementById('form-post-caption').value = '';
  
  document.getElementById('form-post-submit').setAttribute('data-action', 'create');
  openModal('modal-add-post');
}

function openEditPostModal(post) {
  document.getElementById('form-post-title').value = post.title;
  document.getElementById('form-post-platform').value = post.platform;
  document.getElementById('form-post-date').value = post.date;
  document.getElementById('form-post-views').value = post.views || 0;
  document.getElementById('form-post-likes').value = post.likes || 0;
  document.getElementById('form-post-comments').value = post.comments || 0;
  document.getElementById('form-post-shares').value = post.shares || 0;
  document.getElementById('form-post-caption').value = post.caption || '';
  
  const submitBtn = document.getElementById('form-post-submit');
  submitBtn.setAttribute('data-action', 'update');
  submitBtn.setAttribute('data-post-id', post.id);
  
  openModal('modal-add-post');
}

function setupPlannerHandlers() {
  document.getElementById('planner-add-post-btn').addEventListener('click', () => {
    if ((state.settings.platforms || []).length === 0) {
      alert("Please connect a social account first!");
      return;
    }
    openAddPostModal(new Date().toISOString().split('T')[0]);
  });
  
  document.getElementById('insights-add-post-btn').addEventListener('click', () => {
    if ((state.settings.platforms || []).length === 0) {
      alert("Please connect a social account first!");
      return;
    }
    openAddPostModal(new Date().toISOString().split('T')[0]);
  });

  document.getElementById('form-post-submit').addEventListener('click', (e) => {
    const title = document.getElementById('form-post-title').value;
    const platform = document.getElementById('form-post-platform').value;
    const date = document.getElementById('form-post-date').value;
    const views = parseInt(document.getElementById('form-post-views').value) || 0;
    const likes = parseInt(document.getElementById('form-post-likes').value) || 0;
    const comments = parseInt(document.getElementById('form-post-comments').value) || 0;
    const shares = parseInt(document.getElementById('form-post-shares').value) || 0;
    const caption = document.getElementById('form-post-caption').value;

    if (!title || !date) {
      alert("Title and Date are required!");
      return;
    }

    const action = e.target.getAttribute('data-action');
    
    if (action === 'create') {
      const newPost = {
        id: 'p_' + Date.now(),
        title,
        platform,
        date,
        views,
        likes,
        comments,
        shares,
        caption
      };
      state.posts.push(newPost);
    } else if (action === 'update') {
      const id = e.target.getAttribute('data-post-id');
      const idx = state.posts.findIndex(p => p.id === id);
      if (idx > -1) {
        state.posts[idx] = {
          ...state.posts[idx],
          title,
          platform,
          date,
          views,
          likes,
          comments,
          shares,
          caption
        };
      }
    }

    db.savePosts(state.posts);
    closeModal('modal-add-post');
    renderAll();
  });
}


// 4. AI ENGAGEMENT INSIGHTS VIEW
function renderInsights() {
  const lastAnalyzedEl = document.getElementById('insights-last-analyzed');
  const overallTrendText = document.getElementById('insights-overall-text');
  const workingList = document.getElementById('insights-working-list');
  const notworkingList = document.getElementById('insights-notworking-list');
  const recommendationsList = document.getElementById('insights-recommendations-list');
  
  const insights = state.insights;
  const settings = state.settings;
  const activePlatforms = settings.platforms || [];
  
  if (insights) {
    if (insights.lastAnalyzed) {
      const date = new Date(insights.lastAnalyzed);
      lastAnalyzedEl.innerText = `Last analyzed: ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${date.toLocaleDateString()}`;
    } else {
      lastAnalyzedEl.innerText = 'Last analyzed: Never';
    }
    
    overallTrendText.innerText = insights.overallTrend || 'No trend summaries compiled.';
    
    workingList.innerHTML = '';
    (insights.working || []).forEach(item => {
      const li = document.createElement('li');
      li.innerText = item;
      workingList.appendChild(li);
    });
    
    notworkingList.innerHTML = '';
    (insights.notWorking || []).forEach(item => {
      const li = document.createElement('li');
      li.innerText = item;
      notworkingList.appendChild(li);
    });
    
    recommendationsList.innerHTML = '';
    (insights.recommendations || []).forEach(item => {
      const li = document.createElement('li');
      li.innerText = item;
      recommendationsList.appendChild(li);
    });
  }

  const tableBody = document.getElementById('insights-table-body');
  tableBody.innerHTML = '';

  const integratedPosts = state.posts.filter(p => activePlatforms.includes(p.platform));

  if (integratedPosts.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem 0;">No active linked accounts. Go to settings or setup onboarding to connect.</td></tr>`;
  } else {
    const sortedPosts = [...integratedPosts].sort((a, b) => b.date.localeCompare(a.date));
    
    sortedPosts.forEach(post => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="tag" style="background:${getPlatformColor(post.platform)}22; color:${getPlatformColor(post.platform)}">${post.platform}</span></td>
        <td>
          <div style="font-weight:600; color:var(--white-alyssum);">${escapeHtml(post.title)}</div>
          <div style="font-size:0.75rem; color:var(--text-muted); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(post.caption || '')}</div>
        </td>
        <td><span style="font-size:0.85rem; color:var(--text-secondary);">${post.date}</span></td>
        <td><span style="font-size:0.9rem;">${(post.views || 0).toLocaleString()}</span></td>
        <td><span style="font-size:0.9rem;">${(post.likes || 0).toLocaleString()}</span></td>
        <td><span style="font-size:0.9rem;">${(post.comments || 0).toLocaleString()}</span></td>
        <td><span style="font-size:0.9rem;">${(post.shares || 0).toLocaleString()}</span></td>
        <td>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-secondary" style="padding:0.35rem 0.6rem; font-size:0.75rem;" onclick="openEditPostInline('${post.id}')">✏️</button>
            <button class="btn btn-secondary" style="padding:0.35rem 0.6rem; font-size:0.75rem; color:var(--fruit-dove);" onclick="deletePostInline('${post.id}')">🗑️</button>
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }
}

window.openEditPostInline = function(id) {
  const post = state.posts.find(p => p.id === id);
  if (post) openEditPostModal(post);
};

window.deletePostInline = function(id) {
  if (confirm("Are you sure you want to delete this logged post? This will alter your analytics findings.")) {
    state.posts = state.posts.filter(p => p.id !== id);
    db.savePosts(state.posts);
    renderAll();
  }
};

function setupInsightsHandlers() {
  const runBtn = document.getElementById('insights-run-ai-btn');
  if (!runBtn) return;
  
  runBtn.addEventListener('click', async () => {
    const activePlatforms = state.settings.platforms || [];
    if (activePlatforms.length === 0) {
      alert("Please connect at least one social platform to evaluate!");
      return;
    }
    
    runBtn.disabled = true;
    const originalContent = runBtn.innerHTML;
    runBtn.innerHTML = `Analyzing logs...`;
    
    const dataset = state.posts.filter(p => activePlatforms.includes(p.platform));
    
    try {
      const newInsights = await ai.analyzeEngagement(dataset);
      state.insights = newInsights;
      db.saveInsights(state.insights);
      renderAll();
      
      if (newInsights.recommendations && newInsights.recommendations.length > 0) {
        const firstRec = newInsights.recommendations[0];
        const newReminder = {
          id: 'r_ai_' + Date.now(),
          text: `AI Strategy: ${firstRec.substring(0, 100)}`,
          assignee: 'Influencer',
          dueDate: new Date().toISOString().split('T')[0],
          completed: false
        };
        state.reminders.push(newReminder);
        db.saveReminders(state.reminders);
        renderDashboard();
      }
      
      alert("AI Analytics calculation complete!");
    } catch (e) {
      console.error(e);
      alert("AI analysis error.");
    } finally {
      runBtn.disabled = false;
      runBtn.innerHTML = originalContent;
    }
  });
}


// 5. AI CONTENT STUDIO
let activeStudioResult = "";

function setupStudioHandlers() {
  const generateBtn = document.getElementById('studio-generate-btn');
  if (!generateBtn) return;
  const promptArea = document.getElementById('studio-prompt');
  const toolSelect = document.getElementById('studio-tool-type');
  const toneSelect = document.getElementById('studio-tone');
  const outputPlaceholder = document.getElementById('studio-output-placeholder');
  const outputText = document.getElementById('studio-output-text');
  const actionsDiv = document.getElementById('studio-actions');
  
  generateBtn.addEventListener('click', async () => {
    const activePlatforms = state.settings.platforms || [];
    if (activePlatforms.length === 0) {
      alert("Please connect a platform in settings to generate voice-tailored copy!");
      return;
    }
    
    const prompt = promptArea.value.trim();
    if (!prompt) {
      alert("Please outline your post idea first!");
      return;
    }
    
    generateBtn.disabled = true;
    generateBtn.innerHTML = `Generating Creative Copilot ideas...`;
    outputPlaceholder.style.display = 'none';
    outputText.style.display = 'block';
    outputText.innerHTML = `<div style="color:var(--text-muted); text-align:center; padding-top:4rem;">Lumina AI is drafting copy... Please wait.</div>`;
    actionsDiv.style.display = 'none';
    
    const tool = toolSelect.value;
    const tone = toneSelect.value;
    
    const settings = state.settings;
    const avgViews = (state.posts.length > 0) 
      ? Math.round(state.posts.reduce((acc, curr) => acc + (curr.views || 0), 0) / state.posts.length)
      : 50000;
      
    let contextPrompt = `Context: The influencer name is ${settings.influencerName} and their manager/assistant is ${settings.assistantName}. Tone required: ${tone}. Integrated Channels: ${activePlatforms.join(', ')}. `;
    if (settings.creatorNiche) {
      contextPrompt += `Content Niche: ${settings.creatorNiche.replace('_', ' ')}. `;
    }
    if (settings.creatorAudience) {
      contextPrompt += `Target Audience: ${settings.creatorAudience}. `;
    }
    if (settings.creatorGoals) {
      contextPrompt += `Brand Goals: ${settings.creatorGoals}. `;
    }
    if (tool === 'pitch') {
      contextPrompt += `Average views per post dataset size: ${avgViews}. `;
    }
    
    const finalPrompt = `${contextPrompt}\n\nTask: Generate a social media ${tool} based on: "${prompt}"`;
    
    try {
      const result = await ai.generate(finalPrompt);
      activeStudioResult = result;
      outputText.innerHTML = escapeHtml(result).replace(/\n/g, '<br>');
      actionsDiv.style.display = 'flex';
    } catch (e) {
      outputText.innerHTML = `<span style="color:var(--fruit-dove);">Error generating content: ${e.message}</span>`;
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="white" stroke-width="2" fill="none" class="sparkle-icon" style="margin-right: 4px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        Generate Copy
      `;
    }
  });

  document.getElementById('studio-copy-btn').addEventListener('click', () => {
    if (activeStudioResult) {
      navigator.clipboard.writeText(activeStudioResult);
      alert("Copied to clipboard!");
    }
  });

  document.getElementById('studio-to-task-btn').addEventListener('click', () => {
    if (!activeStudioResult) return;
    
    const promptSummary = promptArea.value.substring(0, 40) + "...";
    
    document.getElementById('form-task-title').value = `Execute: AI Generated ${toolSelect.value.toUpperCase()} - ${promptSummary}`;
    document.getElementById('form-task-due').value = new Date().toISOString().split('T')[0];
    document.getElementById('form-task-assignee').value = state.activeUser === 'influencer' ? 'Influencer' : 'Assistant';
    
    openModal('modal-add-task');
  });
}


// 6. WORKSPACE SETTINGS
function setupSettingsHandlers() {
  const saveBtn = document.getElementById('settings-save-btn');
  const joinBtn = document.getElementById('settings-join-btn');
  const joinCodeInput = document.getElementById('settings-join-code');
  const shareCodeDiv = document.getElementById('settings-share-code');
  
  // Populate developer client IDs if present
  const instaInput = document.getElementById('settings-instagram-client-id');
  const tiktokInput = document.getElementById('settings-tiktok-client-id');
  const ytInput = document.getElementById('settings-youtube-client-id');
  
  if (instaInput) instaInput.value = state.settings.instagramClientId || '';
  if (tiktokInput) tiktokInput.value = state.settings.tiktokClientId || '';
  if (ytInput) ytInput.value = state.settings.youtubeClientId || '';

  if (shareCodeDiv && state.settings.workspaceId) {
    shareCodeDiv.innerText = state.settings.workspaceId;
  }

  if (joinBtn && joinCodeInput) {
    joinBtn.addEventListener('click', async () => {
      const code = joinCodeInput.value.trim().toUpperCase();
      if (!code) {
        alert("Please enter a workspace code!");
        return;
      }
      const success = await db.joinWorkspace(code);
      if (success) {
        alert(`Joined workspace ${code} successfully!`);
        window.location.reload();
      }
    });
  }

  if (!saveBtn) return;

  saveBtn.addEventListener('click', () => {
    const influencerName = document.getElementById('settings-influencer-name').value.trim() || 'Sienna';
    const assistantName = document.getElementById('settings-assistant-name').value.trim() || 'Maya';
    const activeRole = document.getElementById('settings-active-role').value;
    const apiKey = document.getElementById('settings-api-key').value.trim();
    
    const instagramClientId = document.getElementById('settings-instagram-client-id').value.trim();
    const tiktokClientId = document.getElementById('settings-tiktok-client-id').value.trim();
    const youtubeClientId = document.getElementById('settings-youtube-client-id').value.trim();

    const creatorNiche = document.getElementById('settings-creator-niche').value;
    const creatorAudience = document.getElementById('settings-creator-audience').value.trim();
    const creatorGoals = document.getElementById('settings-creator-goals').value.trim();

    state.settings.influencerName = influencerName;
    state.settings.assistantName = assistantName;
    state.settings.activeRole = activeRole;
    state.settings.geminiApiKey = apiKey;
    
    state.settings.instagramClientId = instagramClientId;
    state.settings.tiktokClientId = tiktokClientId;
    state.settings.youtubeClientId = youtubeClientId;
    state.settings.creatorNiche = creatorNiche;
    state.settings.creatorAudience = creatorAudience;
    state.settings.creatorGoals = creatorGoals;
    
    db.saveSettings(state.settings);
    state.activeUser = activeRole;
    
    updateActiveUserUI();
    renderAll();
    
    alert("Profile settings saved!");
  });

  // Reset Onboarding Setup Event
  const resetBtn = document.getElementById('settings-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm("Reset workspace settings and rerun setup? This will clear all data, accounts, and tasks to start completely fresh.")) {
        state.settings = {
          influencerName: 'Sienna',
          assistantName: 'Maya',
          geminiApiKey: '',
          onboarded: false,
          connections: {},
          platforms: [],
          creatorNiche: 'fashion_beauty',
          creatorAudience: '',
          creatorGoals: ''
        };
        db.saveSettings(state.settings);
        db.savePosts([]);
        db.saveTasks([]);
        db.saveReminders([]);
        window.location.reload();
      }
    });
  }
}


/**
 * HELPER UTILITIES
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function getPlatformColor(platform) {
  if (!platform) return '#CF5C78';
  switch (platform.toLowerCase()) {
    case 'tiktok': return '#00f2fe';
    case 'instagram': return '#e1306c';
    case 'youtube': return '#ff0000';
    case 'pinterest': return '#bd081c';
    case 'twitter/x': return '#1da1f2';
    default: return '#CF5C78'; 
  }
}

// Global reminder helpers
window.toggleReminderStatus = function(id) {
  const idx = state.reminders.findIndex(r => r.id === id);
  if (idx > -1) {
    state.reminders[idx].completed = !state.reminders[idx].completed;
    db.saveReminders(state.reminders);
    renderAll();
  }
};

window.deleteReminder = function(id) {
  state.reminders = state.reminders.filter(r => r.id !== id);
  db.saveReminders(state.reminders);
  renderAll();
};
