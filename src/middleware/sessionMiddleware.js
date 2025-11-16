import browser from "../utlis/Browser.js";
import { loadSession, hasValidSession } from "../utlis/SessionManager.js";

/**
 * Middleware to check if user has a valid session and restore it
 * If no session exists, returns error requiring login
 */
export async function requireSession(req, res, next) {
  try {
    // Get username from body (POST) or query (GET)
    const username = req.body.username || req.query.username;
    
    if (!username) {
      return res.status(400).json({ 
        success: false, 
        message: "Username is required" 
      });
    }
    
    // Check if valid session exists
    const hasSession = await hasValidSession(username);
    
    if (!hasSession) {
      return res.status(401).json({ 
        success: false, 
        message: "No valid session found. Please login first.",
        requiresLogin: true
      });
    }
    
    console.log(`✅ Valid session found for ${username}`);
    
    // Load session into browser
    try {
      const browserPages = await browser.browser.pages();
      const page = browserPages[0];
      await loadSession(page, username);
      console.log(`🔓 Session restored for ${username}`);
      
      // Attach page to request for use in route handlers
      req.page = page;
      req.username = username;
      
      next();
    } catch (loadError) {
      console.error('❌ Error loading session:', loadError.message);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to restore session. Please login again.",
        requiresLogin: true
      });
    }
    
  } catch (error) {
    console.error('❌ Session middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error: " + error.message 
    });
  }
}

/**
 * Middleware to optionally restore session if it exists
 * Does not require login - will load session if available
 */
export async function optionalSession(req, res, next) {
  try {
    const { username } = req.body;
    
    if (!username) {
      console.log('⚠️  No username provided, skipping session restore');
      return next();
    }
    
    // Check if valid session exists
    const hasSession = await hasValidSession(username);
    
    if (!hasSession) {
      console.log(`⚠️  No valid session for ${username}, continuing without session`);
      return next();
    }
    
    console.log(`✅ Valid session found for ${username}`);
    
    // Try to load session into browser
    try {
      const browserPages = await browser.browser.pages();
      const page = browserPages[0];
      await loadSession(page, username);
      console.log(`🔓 Session restored for ${username}`);
      
      // Attach page to request for use in route handlers
      req.page = page;
      req.username = username;
      req.hasSession = true;
      
    } catch (loadError) {
      console.error('⚠️  Error loading session:', loadError.message);
      req.hasSession = false;
    }
    
    next();
    
  } catch (error) {
    console.error('❌ Optional session middleware error:', error);
    // Continue even if there's an error
    next();
  }
}

