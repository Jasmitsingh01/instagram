import speakeasy from 'speakeasy';
import waitFor from './waitFor.js';
import { saveSession } from './SessionManager.js';
    
export default async function login(page, instagram2faSecret, username, password){
    try {
        
          console.log('Navigating to Instagram...');
          await page.goto('https://www.instagram.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
          });
      
          console.log('Waiting for Instagram to load...');
          await Promise.race([
            page.waitForSelector('input[name="username"]', { timeout: 30000 }),
            page.waitForSelector('svg[aria-label="Instagram"]', { timeout: 30000 }),
            page.waitForSelector('a[href="/"]', { timeout: 30000 })
          ]);
      
          console.log('Instagram loaded successfully!');
      
          const usernameInput = await page.$('input[name="username"]');
          if (usernameInput) {
            console.log('Login form detected. Logging in...');
            
            await page.type('input[name="username"]', username, {
              delay: Math.random() * 100 + 50
            });
            await waitFor(1500);
      
            await page.type('input[name="password"]', password, {
              delay: Math.random() * 100 + 50
            });
            await waitFor(1500);
      
            await page.click('button[type="submit"]');
            console.log('Login submitted...');
            await waitFor(12000);
      
            const has2FA = await page.$('input[name="verificationCode"]');
            if (has2FA) {
              console.log('2FA detected! Generating code from secret...');
              const token = speakeasy.totp({
                secret: instagram2faSecret,
                encoding: 'base32',
                step: 30,
                window: 2
              });
      
              console.log('Generated 2FA code:', token);
              await page.type('input[name="verificationCode"]', token, {
                delay: 100
              });
              console.log('2FA code entered, submitting...');
              await waitFor(2000);
      
              const submitButton = await page.$('button[type="submit"]');
              if (submitButton) {
                await submitButton.click();
                console.log('2FA submitted');
              } else {
                await page.evaluate(() => {
                  const buttons = Array.from(document.querySelectorAll('button'));
                  const confirmBtn = buttons.find(btn =>
                    btn.textContent.includes('Confirm') ||
                    btn.textContent.includes('Next') ||
                    btn.textContent.includes('Submit')
                  );
                  if (confirmBtn) confirmBtn.click();
                });
                console.log('2FA submitted (alternative method)');
              }
      
           await waitFor(30000);
              console.log('2FA verification successful!');
            } else {
              await waitFor(30000);
              console.log('Login successful (no 2FA required)');
            }
      
            await waitFor(5000);
      
            // Handle "Not now" buttons for save info and notifications
            const clickedNotNow = await page.evaluate(() => {
              const allButtons = [
                ...Array.from(document.querySelectorAll('button')),
                ...Array.from(document.querySelectorAll('div[role="button"]'))
              ];
              const notNowBtn = allButtons.find(btn =>
                btn.textContent.trim() === 'Not now' ||
                btn.textContent.trim() === 'Not Now'
              );
              if (notNowBtn) {
                notNowBtn.click();
                return true;
              }
              return false;
            });
      
            if (clickedNotNow) {
              console.log('Skipped save login info');
              await waitFor(3000);
            }
      
            // Try again for notifications popup
            try {
              await waitFor(3000);
              const clickedNotifications = await page.evaluate(() => {
                const allButtons = [
                  ...Array.from(document.querySelectorAll('button')),
                  ...Array.from(document.querySelectorAll('div[role="button"]'))
                ];
                const notNowBtn = allButtons.find(btn =>
                  btn.textContent.trim() === 'Not now' ||
                  btn.textContent.trim() === 'Not Now'
                );
                if (notNowBtn) {
                  notNowBtn.click();
                  return true;
                }
                return false;
              });
      
              if (clickedNotifications) {
                console.log('Skipped notifications');
              }
            } catch (e) {
              console.log('No additional prompts');
            }
      
            console.log('Successfully logged in to Instagram!');
            
            // Save session data after successful login
            await waitFor(3000); // Wait a bit to ensure all data is loaded
            console.log('💾 Saving session data...');
            
            try {
                const savedSession = await saveSession(page, username, 'Instagram');
                console.log('✅ Session data saved to database');
                
                return {
                    success: true,
                    message: 'Login successful',
                    sessionSaved: true,
                    sessionId: savedSession._id
                }
            } catch (saveError) {
                console.log('⚠️ Warning: Could not save session data:', saveError.message);
                return {
                    success: true,
                    message: 'Login successful but session save failed',
                    sessionSaved: false
                }
            }
    } 
}
     catch (error) {
        console.log('Login error:', error.message);
        return {
            success: false,
            message: error.message
        }
    }
}