/**
 * Lumina Hub - AI Engine
 * Integrates Gemini API with smart local fallback mechanics
 */

const ai = {
  // Call Gemini API or use smart fallback
  async generate(prompt, systemInstruction = "") {
    const settings = db.getSettings();
    const apiKey = settings.geminiApiKey;

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-gemini-api-key': apiKey } : {})
        },
        body: JSON.stringify({ prompt, systemInstruction })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to communicate with AI server");
      }

      const data = await response.json();
      return data.text || "No content returned from AI model.";
    } catch (error) {
      console.error("AI Server Error, falling back to local engine:", error);
      return `[Heuristic Fallback due to API error: ${error.message}]\n\n` + this.fallbackGenerate(prompt);
    }
  },

  // Fallback generator for studio tools
  fallbackGenerate(prompt) {
    const p = prompt.toLowerCase();
    
    if (p.includes("hook") || p.includes("script")) {
      return `✨ AI-Generated Video Outline & Hooks ✨

💡 Video Title Concept: ${prompt.slice(0, 50)}...

🔥 3 HIGH-CONVERTING HOOK OPTIONS:
1. "The exact reason your [Topic] is failing, and the 5-second fix nobody is talking about..."
2. "If you are still doing [Topic] like this in 2026, we need to have a serious talk."
3. "My assistant literally banned me from sharing this, but here is my secret to..."

📹 VIDEO STRUCTURE:
- [0:00 - 0:05] Hook (deliver with dynamic visual switch)
- [0:05 - 0:30] The Value / Method (show step-by-step close ups, keep pacing fast)
- [0:30 - 0:45] Actionable Takeaway (why this works compared to traditional ways)
- [0:45 - 0:60] Call to Action (ask them to comment their favorite part for a detailed guide)

📌 STRATEGIC NOTES:
- Pacing: Jump cuts every 2.5 seconds to keep attention.
- Captions: Use bold text highlights for words like "Secret", "Failing", "Fix".`;
    }

    if (p.includes("caption") || p.includes("hashtag")) {
      return `✍️ AI-Generated Caption & Hashtags ✍️

📝 CAPTION OPTIONS:

Option 1 (Relatable & Engaging - Best for TikTok/Reels):
"I don’t know who needs to hear this, but ${prompt.replace(/generate a caption for/i, '').trim()} is officially my new personality trait. 🤫 Let me know if you guys want a full tutorial on how Maya (my assistant) and I pulled this off! 👇"

Option 2 (Sleek & Aesthetic - Best for Instagram):
"A little behind-the-scenes magic today. ✨ Focused on ${prompt.replace(/generate a caption for/i, '').trim()}. Living in our zone and getting things done. ☕️🤎

Code: HQ10 for discount on the fit."

Option 3 (Detailed & Value-First - Best for YouTube Shorts):
"If you want to scale your content game, stop scrolling. Here is exactly how we structured this post. Save this for your next brainstorm session! 📌"

🔥 TRENDING HASHTAG SUITE:
#lifestylevlog #contentcreator #grwm #aesthetic #influencerlife #productivityhacks #creatorspace #trendingnow`;
    }

    if (p.includes("pitch") || p.includes("brand") || p.includes("negotiat")) {
      return `✉️ AI-Generated Brand Pitch Outreach / Reply ✉️

Subject: Collaboration Inquiry: [Influencer Name] x [Brand Name]

Hi [Brand PR Contact],

I hope you are having an amazing week!

My name is Maya, and I am the manager/assistant for [Influencer Name]. We have been following [Brand Name] for a while, and we absolutely love your latest launch. [Influencer Name]'s audience of highly engaged beauty and lifestyle enthusiasts (currently averaging [Avg Views] views per post) is a perfect fit for your brand's aesthetic.

We would love to discuss a partnership for their upcoming content calendar. We are currently booking sponsorships for next month and would love to put together a custom package of TikTok vlogs, Instagram Reels, and dedicated Stories.

Could you let me know if you are open to collaborations at this time? We'd be happy to share our media kit and latest statistics.

Looking forward to hearing from you!

Warmly,
Maya (Manager to [Influencer Name])`;
    }

    return `🤖 Lumina AI Assistant: 
    
I processed your request regarding "${prompt}". 
For more custom responses tailored exactly to your brand, please add your Gemini API Key in the Settings tab!`;
  },

  // Engagement analysis engine
  async analyzeEngagement(posts) {
    if (posts.length === 0) {
      return {
        overallTrend: "No posts logged yet. Log your first few posts to trigger AI Strategy Insights!",
        working: ["Log posts with views and likes to see what formats perform best."],
        notWorking: ["We need post data to analyze what content is underperforming."],
        recommendations: ["Log at least 3 posts to get custom AI strategic suggestions."]
      };
    }

    const settings = db.getSettings();
    const apiKey = settings.geminiApiKey;

    if (apiKey && apiKey.trim() !== "") {
      const prompt = `Analyze these post metrics and provide an engagement report.
      Posts Data: ${JSON.stringify(posts)}
      
      Format the response strictly in JSON matching this exact structure:
      {
        "overallTrend": "One or two sentences summarizing recent performance.",
        "working": ["Insight 1", "Insight 2", "Insight 3"],
        "notWorking": ["Insight 1", "Insight 2"],
        "recommendations": ["Recommendation 1", "Recommendation 2"]
      }
      Do not output any markdown formatting, only output raw JSON.`;

      try {
        const responseText = await this.generate(prompt, "You are a professional social media strategist. Respond ONLY with a valid raw JSON object matching the requested schema. No markdown formatting codeblocks.");
        // Try parsing JSON
        const cleanJson = responseText.replace(/```json/i, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      } catch (error) {
        console.error("Error parsing AI JSON, falling back to local analyzer:", error);
        return this.heuristicAnalyze(posts);
      }
    } else {
      // Simulate Heuristic Analysis
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(this.heuristicAnalyze(posts));
        }, 1500);
      });
    }
  },

  // Smart local heuristic analyzer based on real post data ratios
  heuristicAnalyze(posts) {
    // Calculate engagement rate: (likes + comments + shares) / views
    const analyzedPosts = posts.map(p => {
      const likes = parseInt(p.likes) || 0;
      const comments = parseInt(p.comments) || 0;
      const shares = parseInt(p.shares) || 0;
      const views = parseInt(p.views) || 1;
      const engRate = ((likes + comments + shares) / views) * 100;
      return { ...p, engRate, totalEng: likes + comments + shares };
    });

    // Sort by engagement rate
    const sortedByEng = [...analyzedPosts].sort((a, b) => b.engRate - a.engRate);
    const sortedByViews = [...analyzedPosts].sort((a, b) => b.views - a.views);

    const bestEng = sortedByEng[0];
    const worstEng = sortedByEng[sortedByEng.length - 1];
    const bestViews = sortedByViews[0];

    const platforms = posts.map(p => p.platform);
    const uniquePlatforms = [...new Set(platforms)];
    
    // Average views per platform
    const platformAverages = uniquePlatforms.map(plat => {
      const platPosts = posts.filter(p => p.platform === plat);
      const avgViews = platPosts.reduce((acc, curr) => acc + (parseInt(curr.views) || 0), 0) / platPosts.length;
      return { platform: plat, avgViews };
    }).sort((a, b) => b.avgViews - a.avgViews);

    const topPlatform = platformAverages[0]?.platform || "N/A";

    const overallTrend = `Analyzed ${posts.length} posts. Your top performing content is on ${topPlatform} with an average of ${Math.round(platformAverages[0]?.avgViews || 0).toLocaleString()} views. Most engaging post was "${bestEng.title}" with a ${(bestEng.engRate).toFixed(1)}% engagement rate.`;

    const working = [];
    const notWorking = [];
    const recommendations = [];

    // Formulate working list
    working.push(`Posts on ${topPlatform} are leading in raw reach, averaging ${Math.round(platformAverages[0]?.avgViews || 0).toLocaleString()} views.`);
    working.push(`"${bestEng.title}" (${bestEng.platform}) had exceptional engagement. Posts with keywords like "${bestEng.title.split(' ')[0]}" or matching formats tend to drive ${Math.round(bestEng.engRate)}% interaction rates.`);
    if (bestViews.shares > 500) {
      working.push(`Content like "${bestViews.title}" has a high shareability index, which triggers viral algorithm feeds.`);
    }

    // Formulate notWorking list
    if (worstEng && worstEng.id !== bestEng.id) {
      notWorking.push(`"${worstEng.title}" (${worstEng.platform}) underperformed in engagement, hitting only ${(worstEng.engRate).toFixed(1)}% interaction.`);
    }
    const lowestViews = sortedByViews[sortedByViews.length - 1];
    if (lowestViews && lowestViews.id !== bestViews.id) {
      notWorking.push(`"${lowestViews.title}" on ${lowestViews.platform} struggled for discovery views. Review if the hook was too slow or didn't address a clear topic.`);
    }

    // Formulate recommendations
    recommendations.push(`Double down on the format used in "${bestEng.title}" on ${bestEng.platform} next week.`);
    recommendations.push(`Schedule posts on ${topPlatform} during high-traffic hours to capitalize on natural discovery momentum.`);
    recommendations.push(`Ask your assistant to draft a script script outline using the AI Hook Builder for a follow-up to "${bestViews.title}".`);

    return {
      overallTrend,
      working,
      notWorking,
      recommendations,
      lastAnalyzed: new Date().toISOString()
    };
  }
};
