const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '/')));

const API_KEY = process.env.GEMINI_API_KEY;

// Fallback sequence for Google Gemini API models
const MODELS_TO_TRY = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
];

async function callGeminiFallback(promptText) {
    if (!API_KEY) {
        throw new Error("GEMINI_API_KEY environment variable is missing.");
    }

    let lastError = null;

    for (const model of MODELS_TO_TRY) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }]
                })
            });

            if (response.ok) {
                const data = await response.json();
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) return text;
            } else {
                const errText = await response.text();
                console.warn(`Model ${model} failed (${response.status}): ${errText}`);
            }
        } catch (err) {
            console.warn(`Attempt with ${model} threw error:`, err.message);
            lastError = err;
        }
    }

    throw lastError || new Error("All Gemini models failed to respond.");
}

// ================= API ENDPOINT 1: RECOVERY PLAN GENERATOR =================
app.post('/api/recovery-plan', async (req, res) => {
    try {
        const { activity, effort, sleep, sore, area, stress, sport, secondarySports, age, gender, season } = req.body;

        const prompt = `
You are an elite sports science recovery specialist. Generate a evidence-based, study-backed recovery plan for an athlete with the following profile:

ATHLETE PROFILE:
- Primary In-Season Sport: ${sport || 'Not specified'}
- Off-Season / Secondary Sports: ${secondarySports || 'None'}
- Age: ${age || '20'} | Gender: ${gender || 'Unspecified'}
- Current Season Phase: ${season || 'In-Season'}

TODAY'S METRICS:
- Workout/Activity: ${activity}
- Effort Level (1-3): ${effort}
- Sleep Last Night: ${sleep} hours
- Soreness Level (1-3): ${sore} | Focus Area: ${area}
- Stress Level (1-3): ${stress}

INSTRUCTIONS:
1. Consider the athlete's multi-sport demands (e.g. balancing basketball court-impact with cross-country aerobic volume).
2. Recommend 3 concrete, evidence-based recovery interventions (e.g., Cold Water Immersion for acute in-season soreness [Machado et al.], Sauna/Heat for vascular adaptation, Foam Rolling for DOMS [Behm et al.], Active recovery walks at <50% HRmax).
3. Include short scientific rationale for why these work for their current season phase.
4. Keep the output clean, highly structured, encouraging, and easy to read with bullet points.
`;

        const planText = await callGeminiFallback(prompt);
        res.json({ plan: planText });

    } catch (error) {
        console.error('Error generating recovery plan:', error);
        res.status(500).json({ plan: "Unable to generate plan right now. Please check server logs and try again." });
    }
});

// ================= API ENDPOINT 2: AI RECIPE GENERATOR =================
app.post('/api/generate-recipe', async (req, res) => {
    try {
        const { category, sport, season } = req.body;

        const prompt = `
Create a single performance nutrition recipe for an athlete playing ${sport || 'competitive sports'} (${season || 'In-Season'}).
Category: ${category} (options: Pre-Training Fuel, Post-Training Recovery, Nutritious Snack, Recovery Dinner).

Requirements:
- Short, actionable title.
- Brief explanation of why it supports athletic performance/recovery.
- 3 to 5 simple ingredients with measurements.
- Preparation time under 25 minutes.

Format output as plain text formatted like this:
Title: [Recipe Name]
Prep Time: [Time]
Why it Works: [1 sentence]
Ingredients:
- [Item 1]
- [Item 2]
- [Item 3]
`;

        const recipeText = await callGeminiFallback(prompt);
        res.json({ recipe: recipeText });

    } catch (error) {
        console.error('Error generating recipe:', error);
        res.status(500).json({ error: "Failed to fetch AI recipe." });
    }
});

// Serve frontend route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'recovery-coach-improved.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
