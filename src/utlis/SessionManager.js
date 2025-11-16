import UserSession from '../models/UserSession.js';

/**
 * Sanitize object keys by replacing dots and other MongoDB-incompatible characters
 * MongoDB doesn't allow dots (.) in field names
 */
function sanitizeKeys(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Replace dots with a safe placeholder
    const sanitizedKey = key.replace(/\./g, '___DOT___');
    sanitized[sanitizedKey] = value;
  }
  return sanitized;
}

/**
 * Restore original keys by replacing placeholder with dots
 */
function restoreKeys(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const restored = {};
  for (const [key, value] of Object.entries(obj)) {
    // Restore dots from placeholder
    const restoredKey = key.replace(/___DOT___/g, '.');
    restored[restoredKey] = value;
  }
  return restored;
}

/**
 * Save browser session (cookies, localStorage, sessionStorage) to database
 */
export async function saveSession(page, username, type) {
  try {
    console.log(`💾 Saving session for user: ${username}`);
    
    // Get cookies from the browser
    const cookies = await page.cookies();
    
    // Get localStorage data
    const localStorage = await page.evaluate(() => {
      let data = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        data[key] = window.localStorage.getItem(key);
      }
      return data;
    });
    
    // Get sessionStorage data
    const sessionStorage = await page.evaluate(() => {
      let data = {};
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        data[key] = window.sessionStorage.getItem(key);
      }
      return data;
    });
    
    // Get user agent
    const userAgent = await page.evaluate(() => navigator.userAgent);
    
    // Sanitize localStorage and sessionStorage keys to remove dots
    const sanitizedLocalStorage = sanitizeKeys(localStorage);
    const sanitizedSessionStorage = sanitizeKeys(sessionStorage);
    
    console.log(userAgent, 'userAgent');
    console.log(type, 'type');
    console.log(username, 'username');
    console.log(`📊 Cookies count: ${cookies.length}`);
    console.log(`📊 localStorage keys: ${Object.keys(localStorage).length}`);
    console.log(`📊 sessionStorage keys: ${Object.keys(sessionStorage).length}`);
    
    // Update or create session in database
    const session = await UserSession.findOneAndUpdate(
      { username },
      {
        cookies,
        localStorage: sanitizedLocalStorage,
        type,
        sessionStorage: sanitizedSessionStorage,
        userAgent,
        lastLogin: Date.now(),
        isValid: true,
        $inc: { 'metadata.loginCount': 1 }
      },
      { upsert: true, new: true }
    );
    
    console.log(`✅ Session saved successfully for ${username}`);
    console.log(`📊 Total cookies saved: ${cookies.length}`);
    console.log(`📊 Sanitized localStorage keys: ${Object.keys(sanitizedLocalStorage).length}`);
    console.log(`📊 Sanitized sessionStorage keys: ${Object.keys(sanitizedSessionStorage).length}`);
    
    return session;
  } catch (error) {
    console.error('❌ Error saving session:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

/**
 * Load session from database and restore it in the browser
 */
export async function loadSession(page, username) {
  try {
    console.log(`📂 Loading session for user: ${username}`);
    
    // Find session in database
    const session = await UserSession.findOne({ username });
    
    if (!session) {
      console.log(`⚠️  No saved session found for ${username}`);
      return null;
    }
    
    // Check if session is still valid
    if (!session.isSessionValid()) {
      console.log(`⚠️  Session expired for ${username}. Need fresh login.`);
      return null;
    }
    
    console.log(`✅ Session found for ${username} (Last login: ${session.lastLogin.toLocaleString()})`);
    
    // Set cookies with validation
    if (session.cookies && session.cookies.length > 0) {
      const validCookies = session.cookies
        .filter(cookie => {
          return cookie && 
                 cookie.name && 
                 cookie.value !== undefined && 
                 cookie.domain;
        })
        .map(cookie => {
          // Clean cookie object - remove null/undefined fields that Puppeteer doesn't like
          const cleanCookie = {
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain
          };
          
          // Only add optional fields if they have valid values
          if (cookie.path) cleanCookie.path = cookie.path;
          if (cookie.expires && cookie.expires > 0) cleanCookie.expires = cookie.expires;
          if (cookie.httpOnly !== null && cookie.httpOnly !== undefined) cleanCookie.httpOnly = cookie.httpOnly;
          if (cookie.secure !== null && cookie.secure !== undefined) cleanCookie.secure = cookie.secure;
          if (cookie.sameSite) cleanCookie.sameSite = cookie.sameSite;
          
          return cleanCookie;
        });
      
      if (validCookies.length > 0) {
        try {
          await page.setCookie(...validCookies);
          console.log(`🍪 Restored ${validCookies.length} cookies`);
          if (session.cookies.length !== validCookies.length) {
            console.log(`⚠️  Skipped ${session.cookies.length - validCookies.length} invalid cookies`);
          }
        } catch (cookieError) {
          console.error(`⚠️  Error setting cookies in bulk: ${cookieError.message}`);
          // Try setting cookies one by one to identify problematic ones
          let successCount = 0;
          for (const cookie of validCookies) {
            try {
              await page.setCookie(cookie);
              successCount++;
            } catch (err) {
              console.warn(`⚠️  Failed to set cookie ${cookie.name}: ${err.message}`);
            }
          }
          console.log(`🍪 Restored ${successCount} cookies individually`);
        }
      } else {
        console.log(`⚠️  No valid cookies to restore`);
      }
    }
    
    // Restore localStorage (convert sanitized keys back to original)
    if (session.localStorage && Object.keys(session.localStorage).length > 0) {
      const restoredLocalStorage = restoreKeys(session.localStorage);
      
      await page.evaluateOnNewDocument((localStorageData) => {
        for (const [key, value] of Object.entries(localStorageData)) {
          try {
            if (key && value !== null && value !== undefined) {
              localStorage.setItem(key, value);
            }
          } catch (e) {
            console.warn(`Failed to set localStorage item: ${key}`, e.message);
          }
        }
      }, restoredLocalStorage);
      console.log(`📦 Restored ${Object.keys(restoredLocalStorage).length} localStorage items`);
    }
    
    // Restore sessionStorage (convert sanitized keys back to original)
    if (session.sessionStorage && Object.keys(session.sessionStorage).length > 0) {
      const restoredSessionStorage = restoreKeys(session.sessionStorage);
      
      await page.evaluateOnNewDocument((sessionStorageData) => {
        for (const [key, value] of Object.entries(sessionStorageData)) {
          try {
            if (key && value !== null && value !== undefined) {
              sessionStorage.setItem(key, value);
            }
          } catch (e) {
            console.warn(`Failed to set sessionStorage item: ${key}`, e.message);
          }
        }
      }, restoredSessionStorage);
      console.log(`📦 Restored ${Object.keys(restoredSessionStorage).length} sessionStorage items`);
    }
    
    // Set user agent
    if (session.userAgent) {
      await page.setUserAgent(session.userAgent);
      console.log(`🌐 User agent restored`);
    }
    
    // Mark session as used
    await session.markAsUsed();
    
    return session;
  } catch (error) {
    console.error('❌ Error loading session:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

/**
 * Check if a valid session exists for a user
 */
export async function hasValidSession(username) {
  try {
    const session = await UserSession.findOne({ username });
    
    if (!session) {
      return false;
    }
    
    return session.isSessionValid();
  } catch (error) {
    console.error('❌ Error checking session:', error.message);
    return false;
  }
}

/**
 * Invalidate a user's session
 */
export async function invalidateSession(username) {
  try {
    await UserSession.findOneAndUpdate(
      { username },
      { isValid: false }
    );
    console.log(`🔒 Session invalidated for ${username}`);
  } catch (error) {
    console.error('❌ Error invalidating session:', error.message);
    throw error;
  }
}

/**
 * Delete a user's session
 */
export async function deleteSession(username) {
  try {
    await UserSession.findOneAndDelete({ username });
    console.log(`🗑️  Session deleted for ${username}`);
  } catch (error) {
    console.error('❌ Error deleting session:', error.message);
    throw error;
  }
}

/**
 * Get all sessions (useful for admin/debugging)
 */
export async function getAllSessions() {
  try {
    const sessions = await UserSession.find({});
    return sessions;
  } catch (error) {
    console.error('❌ Error getting all sessions:', error.message);
    throw error;
  }
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions() {
  try {
    const sessions = await UserSession.find({});
    let deletedCount = 0;
    
    for (const session of sessions) {
      if (!session.isSessionValid()) {
        await UserSession.findByIdAndDelete(session._id);
        deletedCount++;
      }
    }
    
    console.log(`🧹 Cleaned up ${deletedCount} expired sessions`);
    return deletedCount;
  } catch (error) {
    console.error('❌ Error cleaning up sessions:', error.message);
    throw error;
  }
}
