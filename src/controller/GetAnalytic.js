import fs from 'fs/promises';
import axios from 'axios';
import dotenv from 'dotenv';
import waitFor from '../utlis/waitFor.js';
import browser from '../utlis/Browser.js';

dotenv.config();

function cleanJsonResponse(text) {
    let cleaned = text.trim();
    // Remove markdown code blocks (```json, ```javascript, ```)
    cleaned = cleaned.replace(/```(?:json|javascript)?\s*/g, '');
    cleaned = cleaned.replace(/```/g, '');
    return cleaned.trim();
}

async function analyzeInstagramScreenshotWithGemini(imagePath) {
    try {
        // Check if API key is configured
        if (!process.env.OPENROUTER_API_KEY) {
            console.error('❌ OPENROUTER_API_KEY not configured');
            console.log('💡 Please add OPENROUTER_API_KEY to your .env file');
            console.log('💡 Get your API key from: https://openrouter.ai/keys');
            return {
                error: 'API key not configured',
                message: 'OPENROUTER_API_KEY environment variable is required',
                note: 'Get your API key from https://openrouter.ai/keys and add it to .env file'
            };
        }

        console.log('📸 Reading Instagram analytics screenshot from:', imagePath);

        const imageBuffer = await fs.readFile(imagePath);
        const base64Image = imageBuffer.toString('base64');
        const imageDataUrl = `data:image/png;base64,${base64Image}`;

        console.log('🤖 Analyzing Instagram analytics with Gemini...');

        const prompt = `You are an expert at analyzing Instagram post analytics screenshots.

Analyze this Instagram post analytics image and extract all the data you can see.
Please return ONLY a valid JSON object (no markdown code blocks, no explanation) with the following structure:

{
  "accounts_reached": number or null,
  "impressions": number or null,
  "likes": number or null,
  "comments": number or null,
  "shares": number or null,
  "saves": number or null,
  "profile_visits": number or null,
  "follows": number or null,
  "website_clicks": number or null,
  "email_clicks": number or null,
  "text_message_clicks": number or null,
  "get_directions_clicks": number or null,
  "call_clicks": number or null,
  "reach_breakdown": {
    "followers": number or null,
    "non_followers": number or null
  },
  "impressions_breakdown": {
    "from_home": number or null,
    "from_hashtags": number or null,
    "from_profile": number or null,
    "from_explore": number or null,
    "from_other": number or null
  },
  "audience_insights": {
    "top_locations": [],
    "age_range": {},
    "gender_breakdown": {},
    "most_active_times": []
  },
  "engagement_rate": string or null,
  "post_performance": {
    "compared_to_average": string or null,
    "performance_indicator": string or null
  },
  "story_metrics": {
    "story_impressions": number or null,
    "story_reach": number or null,
    "story_exits": number or null,
    "story_replies": number or null,
    "story_shares": number or null
  },
  "additional_metrics": {}
}

Important:
- Extract all numeric values you can see in the Instagram analytics screenshot
- For percentage values, keep them as strings with % symbol
- If a value is "0" or not visible, use null
- Include any additional metrics you find in the "additional_metrics" object
- Return ONLY the JSON object, no additional text
- Ensure all numbers are actual numbers, not strings (except percentages)
- Look for Instagram-specific metrics like accounts reached, impressions, profile visits, etc.`;

        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'google/gemini-2.5-flash',
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: imageDataUrl } }
                    ]
                }],
                temperature: 0.1,
                max_tokens: 4096
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://github.com/instagram-automation',
                    'X-Title': 'Instagram Analytics Automation',
                    'Content-Type': 'application/json'
                }
            }
        );

        const text = response.data.choices[0].message.content;
        console.log('✅ Gemini analysis complete');

        try {
            const cleanedText = cleanJsonResponse(text);
            const analyticsData = JSON.parse(cleanedText);

            // Ensure tmp directory exists
            try {
                await fs.mkdir('tmp', { recursive: true });
            } catch (e) {
                // Directory might already exist
            }

            await fs.writeFile('tmp/instagram-analytics-data.json', JSON.stringify(analyticsData, null, 2));
            console.log('💾 Analytics data saved to tmp/instagram-analytics-data.json');

            return analyticsData;
        } catch (parseError) {
            console.error('⚠️ Failed to parse JSON:', parseError.message);
            return {
                error: 'Failed to parse JSON',
                rawResponse: text
            };
        }
    } catch (error) {
        console.error('❌ Gemini analysis error:', error.message);

        // Specific error handling
        if (error.response) {
            if (error.response.status === 401) {
                console.error('❌ Authentication failed: Invalid OPENROUTER_API_KEY');
                console.log('💡 Please check your API key in .env file');
                console.log('💡 Get a valid key from: https://openrouter.ai/keys');
                return {
                    error: 'Authentication failed',
                    message: 'Invalid or expired OPENROUTER_API_KEY',
                    statusCode: 401,
                    solution: 'Check your API key at https://openrouter.ai/keys'
                };
            } else if (error.response.status === 429) {
                console.error('❌ Rate limit exceeded for OpenRouter API');
                return {
                    error: 'Rate limit exceeded',
                    message: 'Too many requests to OpenRouter API',
                    statusCode: 429,
                    solution: 'Wait a few minutes before trying again'
                };
            } else if (error.response.status === 402) {
                console.error('❌ Insufficient credits on OpenRouter account');
                return {
                    error: 'Insufficient credits',
                    message: 'Your OpenRouter account needs credits',
                    statusCode: 402,
                    solution: 'Add credits to your OpenRouter account'
                };
            }
        }

        if (error.code === 'ENOENT') {
            console.error('❌ Screenshot file not found:', imagePath);
            return {
                error: 'File not found',
                message: `Screenshot file does not exist: ${imagePath}`,
                solution: 'Make sure the screenshot was created successfully'
            };
        }

        return {
            error: 'Unknown error',
            message: error.message,
            solution: 'Check the console for more details'
        };
    }
}

export default async function GetAnalytic(req, res) {
    try {
        const { postId } = req.body;

        if (!postId  ) {
            return res.status(400).json({
                error: 'Missing required parameters',
                message: 'postId is required'
            });
        }   

        let analyticsData;

        // Navigate to Instagram insights and take screenshot
        console.log('🔍 Navigating to Instagram insights for post:', postId);
            
            const browserPages = await browser.browser.pages();
            const page = browserPages[0] || await browser.browser.newPage();
            
            // Set up proxy authentication if configured
            if (process.env.PROXY_USERNAME && process.env.PROXY_PASSWORD) {
                await page.authenticate({
                    username: process.env.PROXY_USERNAME,
                    password: process.env.PROXY_PASSWORD
                });
            }

            // Navigate to Instagram insights
            await page.goto(`https://www.instagram.com/insights/media/${postId}/`);
            await waitFor(5000);

            // Wait for analytics to load
            try {
                await page.waitForSelector('[data-testid="insights-metrics"]', { timeout: 10000 });
            } catch (e) {
                console.log('⚠️ Analytics selector not found, proceeding with screenshot');
            }

            await waitFor(3000);

            // Take screenshot of the analytics page
            const timestamp = Date.now();
            const screenshotFileName = `instagram-analytics-${postId}-${timestamp}.png`;
            const screenshotPath = `tmp/${screenshotFileName}`;

            // Ensure tmp directory exists
            try {
                await fs.mkdir('tmp', { recursive: true });
            } catch (e) {
                // Directory might already exist
            }

            await page.screenshot({
                path: screenshotPath,
                fullPage: true
            });

            console.log('📸 Screenshot saved:', screenshotPath);

            // Analyze the screenshot
            analyticsData = await analyzeInstagramScreenshotWithGemini(screenshotPath);
        analyticsData.screenshotPath = screenshotPath;

        // Return the analytics data
        res.json({
            success: true,
            postId: postId || 'from_screenshot',
            timestamp: new Date().toISOString(),
            analytics: analyticsData
        });

    } catch (error) {
        console.error('❌ GetAnalytic error:', error.message);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}