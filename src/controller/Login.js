import login from '../utlis/login.js';
import browser from '../utlis/Browser.js';
import UserSession  from '../models/UserSession.js';
const User=UserSession;
import { saveSession, loadSession, hasValidSession } from '../utlis/SessionManager.js';

export default async function Login(req, res){
    try {
        const { username, password, instagram2faSecret } = req.body;

        if (!username || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Username and password are required' 
            });
        }

            // Find or create user in database
        let user = await User.findOne({ username });
        if (!user) {
            console.log(`📝 Creating new user in database: ${username}`);
            user = new User({
                username,
                password,
                instagram2faSecret: instagram2faSecret || null
            });
            await user.save();
        } else {
            // Update credentials if changed
            if (password !== user.password || instagram2faSecret !== user.instagram2faSecret) {
                user.password = password;
                if (instagram2faSecret) user.instagram2faSecret = instagram2faSecret;
                await user.save();
                console.log(`📝 Updated user credentials in database: ${username}`);
            }
        }

        const Broserpage = await browser.browser.pages();
        const page = Broserpage[0];

        // Authenticate proxy if configured
        if (process.env.PROXY_USERNAME && process.env.PROXY_PASSWORD) {
            await page.authenticate({
                username: process.env.PROXY_USERNAME,
                password: process.env.PROXY_PASSWORD
            });
        }

        // Check if user has a valid saved session
        const hasSession = await hasValidSession(username);
        
        if (hasSession) {
            console.log(`📂 Found valid session for ${username}, attempting to restore...`);
            
            // Try to load saved session data
            const loadResult = await loadSession(page, username);
            
            if (loadResult) {
                // Navigate to Instagram to check if session is still valid
                await page.goto('https://www.instagram.com/', {
                    waitUntil: 'networkidle2',
                    timeout: 60000
                });

                await new Promise(resolve => setTimeout(resolve, 5000));

                // Enhanced session validation
                const sessionCheck = await page.evaluate(() => {
                    const checks = {
                        hasLoginForm: document.querySelector('input[name="username"]') !== null,
                        hasProfilePicture: document.querySelector('img[alt*="profile picture"]') !== null,
                        hasNewPostButton: document.querySelector('svg[aria-label="New post"]') !== null,
                        hasDirectMessages: document.querySelector('a[href*="/direct/"]') !== null,
                        hasCreateButton: Array.from(document.querySelectorAll('span')).some(span => 
                            span.textContent.trim() === 'Create'),
                        hasHomeButton: document.querySelector('a[href="/"]') !== null,
                        currentUrl: window.location.href,
                        pageTitle: document.title
                    };
                    
                    // If login form is present, definitely not logged in
                    if (checks.hasLoginForm) {
                        return { isLoggedIn: false, reason: 'Login form detected', checks };
                    }
                    
                    // Count logged-in indicators
                    const loggedInIndicators = [
                        checks.hasProfilePicture,
                        checks.hasNewPostButton,
                        checks.hasDirectMessages,
                        checks.hasCreateButton,
                        checks.hasHomeButton
                    ];
                    
                    const loggedInCount = loggedInIndicators.filter(Boolean).length;
                    const isLoggedIn = loggedInCount >= 2;
                    
                    return {
                        isLoggedIn,
                        reason: isLoggedIn ? `Found ${loggedInCount} logged-in indicators` : 'Insufficient logged-in indicators',
                        checks
                    };
                });

                console.log('📊 Session restoration check:', sessionCheck);

                if (sessionCheck.isLoggedIn) {
                    console.log(`✅ Successfully restored session for ${username} - ${sessionCheck.reason}`);
                    
                    await User.findOneAndUpdate(
                        { username },
                        { $set: { lastLogin: new Date() } }
                    );

                    return res.status(200).json({ 
                        success: true,
                        message: 'Session restored successfully - already logged in',
                        sessionRestored: true,
                        sessionDetails: sessionCheck,
                        username
                    });
                } else {
                    console.log(`⚠️ Saved session expired for ${username} - ${sessionCheck.reason}`);
                    // Invalidate the session in database
                    await User.findOneAndUpdate(
                        { username },
                        { $set: { isValid: false } }
                    );
                }
            }
        } else {
            console.log(`📝 No valid session found for ${username}, performing fresh login...`);
        }

        // Perform fresh login 
        const result = await login(page, user.instagram2faSecret, username, password); 
         
        if(result.success){ 
            res.status(200).json({  
                success: true, 
                message: result.message, 
                sessionSaved: result.sessionSaved, 
                sessionId: result.sessionId,
                username 
            }); 
        }else{ 
            res.status(500).json({  
                success: false, 
                message: result.message, 
                username 
            }); 
        }
    } catch (error) {
        console.error('❌ Login error:', error.message);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
}