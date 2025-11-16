import UserSession  from '../models/UserSession.js';
const User=UserSession;

/**
 * Save browser data (cookies, localStorage, sessionStorage) to database
 * @param {Object} page - Puppeteer page object
 * @param {String} username - Instagram username
 * @returns {Object} - Success status and message
 */
export async function saveBrowserData(page, username) {
  try {
    console.log(`💾 Saving browser data for user: ${username}`);

    // Get cookies
    const cookies = await page.cookies();
    console.log(`📦 Cookies collected: ${cookies.length}`);

    // Get localStorage
    const localStorage = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        items[key] = window.localStorage.getItem(key);
      }
      return items;
    });
    console.log(`📦 localStorage items collected: ${Object.keys(localStorage).length}`);

    // Get sessionStorage
    const sessionStorage = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        items[key] = window.sessionStorage.getItem(key);
      }
      return items;
    });
    console.log(`📦 sessionStorage items collected: ${Object.keys(sessionStorage).length}`);

    // Get user agent
    const userAgent = await page.evaluate(() => navigator.userAgent);

    // Update user in database
    const user = await User.findOneAndUpdate(
      { username },
      {
        $set: {
          'browserData.cookies': cookies,
          'browserData.localStorage': localStorage,
          'browserData.sessionStorage': sessionStorage,
          'browserData.userAgent': userAgent,
          'browserData.lastUsed': new Date(),
          'lastLogin': new Date()
        }
      },
      { new: true, upsert: false }
    );

    if (!user) {
      throw new Error(`User ${username} not found in database`);
    }

    console.log(`✅ Browser data saved successfully for user: ${username}`);
    
    return {
      success: true,
      message: 'Browser data saved successfully',
      username,
      dataSize: {
        cookies: cookies.length,
        localStorage: Object.keys(localStorage).length,
        sessionStorage: Object.keys(sessionStorage).length
      }
    };

  } catch (error) {
    console.error(`❌ Error saving browser data for ${username}:`, error.message);
    return {
      success: false,
      message: error.message,
      username
    };
  }
}

/**
 * Load browser data from database and restore to browser
 * @param {Object} page - Puppeteer page object
 * @param {String} username - Instagram username
 * @returns {Object} - Success status and message
 */
export async function loadBrowserData(page, username) {
  try {
    console.log(`📂 Loading browser data for user: ${username}`);

    // Find user in database
    const user = await User.findOne({ username });

    if (!user || !user.browserData) {
      console.log(`⚠️ No saved browser data found for user: ${username}`);
      return {
        success: false,
        message: 'No saved browser data found',
        username,
        hasData: false
      };
    }

    const { browserData } = user;

    // Restore cookies
    if (browserData.cookies && browserData.cookies.length > 0) {
      await page.setCookie(...browserData.cookies);
      console.log(`✅ Restored ${browserData.cookies.length} cookies`);
    }

    // Restore localStorage
    if (browserData.localStorage && Object.keys(browserData.localStorage).size > 0) {
      await page.evaluate((localStorageData) => {
        for (const [key, value] of Object.entries(localStorageData)) {
          window.localStorage.setItem(key, value);
        }
      }, Object.fromEntries(browserData.localStorage));
      console.log(`✅ Restored ${Object.keys(browserData.localStorage).size} localStorage items`);
    }

    // Restore sessionStorage
    if (browserData.sessionStorage && Object.keys(browserData.sessionStorage).size > 0) {
      await page.evaluate((sessionStorageData) => {
        for (const [key, value] of Object.entries(sessionStorageData)) {
          window.sessionStorage.setItem(key, value);
        }
      }, Object.fromEntries(browserData.sessionStorage));
      console.log(`✅ Restored ${Object.keys(browserData.sessionStorage).size} sessionStorage items`);
    }

    // Update last used timestamp
    await User.findOneAndUpdate(
      { username },
      { $set: { 'browserData.lastUsed': new Date() } }
    );

    console.log(`✅ Browser data loaded successfully for user: ${username}`);

    return {
      success: true,
      message: 'Browser data loaded successfully',
      username,
      hasData: true,
      dataSize: {
        cookies: browserData.cookies ? browserData.cookies.length : 0,
        localStorage: browserData.localStorage ? Object.keys(browserData.localStorage).size : 0,
        sessionStorage: browserData.sessionStorage ? Object.keys(browserData.sessionStorage).size : 0
      }
    };

  } catch (error) {
    console.error(`❌ Error loading browser data for ${username}:`, error.message);
    return {
      success: false,
      message: error.message,
      username,
      hasData: false
    };
  }
}

/**
 * Check if user has saved browser data
 * @param {String} username - Instagram username
 * @returns {Object} - Has data status and info
 */
export async function hasBrowserData(username) {
  try {
    const user = await User.findOne({ username });
    
    if (!user || !user.browserData || !user.browserData.cookies || user.browserData.cookies.length === 0) {
      return {
        hasData: false,
        username,
        message: 'No browser data found'
      };
    }

    return {
      hasData: true,
      username,
      lastUsed: user.browserData.lastUsed,
      dataSize: {
        cookies: user.browserData.cookies ? user.browserData.cookies.length : 0,
        localStorage: user.browserData.localStorage ? Object.keys(user.browserData.localStorage).size : 0,
        sessionStorage: user.browserData.sessionStorage ? Object.keys(user.browserData.sessionStorage).size : 0
      }
    };

  } catch (error) {
    console.error(`❌ Error checking browser data for ${username}:`, error.message);
    return {
      hasData: false,
      username,
      error: error.message
    };
  }
}

/**
 * Clear browser data for a user
 * @param {String} username - Instagram username
 * @returns {Object} - Success status and message
 */
export async function clearBrowserData(username) {
  try {
    console.log(`🗑️ Clearing browser data for user: ${username}`);

    const user = await User.findOneAndUpdate(
      { username },
      {
        $set: {
          'browserData.cookies': [],
          'browserData.localStorage': {},
          'browserData.sessionStorage': {},
          'browserData.userAgent': '',
          'browserData.lastUsed': null
        }
      },
      { new: true }
    );

    if (!user) {
      throw new Error(`User ${username} not found`);
    }

    console.log(`✅ Browser data cleared for user: ${username}`);

    return {
      success: true,
      message: 'Browser data cleared successfully',
      username
    };

  } catch (error) {
    console.error(`❌ Error clearing browser data for ${username}:`, error.message);
    return {
      success: false,
      message: error.message,
      username
    };
  }
}

export default {
  saveBrowserData,
  loadBrowserData,
  hasBrowserData,
  clearBrowserData
};

