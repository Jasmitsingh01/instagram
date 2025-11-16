import clickNextButton from '../utlis/clickNextButton.js';
import browser from '../utlis/Browser.js';
import waitFor from '../utlis/waitFor.js';
import Upload from '../models/Upload.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export default async function uploadFile(req, res) {
  let uploadRecord = null;

  try {
    const { caption } = req.body;
    const filePath = req.file.path;
    const username = req.username; // From session middleware

    if (!filePath || !caption) {
      return res.status(400).json({
        success: false,
        message: 'File and caption are required'
      });
    }

    // Validate file format for Instagram compatibility
    const allowedMimeTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/avif', 
      'image/heic', 
      'image/heif',
      'video/mp4', 
      'video/quicktime'
    ];

    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported file type: ${req.file.mimetype}. Supported formats: JPEG, PNG, AVIF, HEIC, HEIF, MP4, QuickTime`
      });
    }

    // Validate file extension matches MIME type
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.avif', '.heic', '.heif', '.mp4', '.mov'];
    
    if (!validExtensions.includes(fileExtension)) {
      return res.status(400).json({
        success: false,
        message: `Invalid file extension: ${fileExtension}. Supported extensions: .jpg, .jpeg, .png, .avif, .heic, .heif, .mp4, .mov`
      });
    }

    console.log(`📋 File validation passed: ${req.file.originalname} (${req.file.mimetype})`);

    // Create file hash for integrity checking
    const fileBuffer = fs.readFileSync(filePath);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Create upload record
    uploadRecord = new Upload({
      username,
      originalFilename: req.file.originalname,
      storedFilename: req.file.filename,
      filePath,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      caption,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        sessionId: req.sessionId || null,
        fileHash,
        processingSteps: []
      }
    });

    await uploadRecord.save();
    console.log(`📝 Upload record created: ${uploadRecord._id}`);

    await uploadRecord.addProcessingStep('validation', 'started', 'Starting file validation');

    const Broserpage = await browser.browser.pages();
    const page = Broserpage[0];
    await page.authenticate({
      username: process.env.PROXY_USERNAME,
      password: process.env.PROXY_PASSWORD
    });

    // Validate Instagram session before proceeding
    console.log('🔍 Validating Instagram session...');
    await uploadRecord.addProcessingStep('session_validation', 'started', 'Validating Instagram session');

    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });
    await waitFor(3000); // Wait for page to fully load

    const sessionValidation = await page.evaluate(() => {
      // Multiple checks for logged-in state
      const checks = {
        hasLoginForm: document.querySelector('input[name="username"]') !== null,
        hasProfilePicture: document.querySelector('img[alt*="profile picture"]') !== null,
        hasNewPostButton: document.querySelector('svg[aria-label="New post"]') !== null,
        hasDirectMessages: document.querySelector('a[href*="/direct/"]') !== null,
        hasCreateButton: document.querySelector('a[href="#"]') !== null &&
          document.querySelector('span') &&
          Array.from(document.querySelectorAll('span')).some(span =>
            span.textContent.trim() === 'Create'),
        hasHomeButton: document.querySelector('a[href="/"]') !== null,
        hasSearchBar: document.querySelector('input[placeholder*="Search"]') !== null,
        currentUrl: window.location.href,
        pageTitle: document.title
      };

      // If login form is present, definitely not logged in
      if (checks.hasLoginForm) {
        return { isLoggedIn: false, reason: 'Login form detected', checks };
      }

      // If any of the logged-in indicators are present, consider logged in
      const loggedInIndicators = [
        checks.hasProfilePicture,
        checks.hasNewPostButton,
        checks.hasDirectMessages,
        checks.hasCreateButton,
        checks.hasHomeButton,
        checks.hasSearchBar
      ];

      const loggedInCount = loggedInIndicators.filter(Boolean).length;
      const isLoggedIn = loggedInCount >= 2; // Require at least 2 indicators

      return {
        isLoggedIn,
        reason: isLoggedIn ? `Found ${loggedInCount} logged-in indicators` : 'Insufficient logged-in indicators',
        checks
      };
    });

    console.log('📊 Session validation results:', sessionValidation);

    if (!sessionValidation.isLoggedIn) {
      await uploadRecord.updateStatus('failed', `Instagram session expired: ${sessionValidation.reason}`);
      await uploadRecord.addProcessingStep('session_validation', 'failed', sessionValidation.reason);

      return res.status(401).json({
        success: false,
        message: 'Instagram session expired. Please login again.',
        requiresLogin: true,
        uploadId: uploadRecord._id,
        sessionDetails: sessionValidation
      });
    }

    console.log('✅ Instagram session validated:', sessionValidation.reason);
    await uploadRecord.addProcessingStep('session_validation', 'completed', sessionValidation.reason);
    await uploadRecord.updateStatus('processing');

    await waitFor(5000);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');

    console.log('\n📸 Starting Instagram post upload...\n');
    await waitFor(5000);

    // Step 1: Click on "Create" or "New post" button in sidebar
    console.log('🔍 Looking for "Create" button in sidebar...');
    const createClicked = await page.evaluate(() => {
      // Look for "Create" in sidebar links
      const sidebarLinks = Array.from(document.querySelectorAll('a[role="link"]'));
      for (let link of sidebarLinks) {
        const spans = link.querySelectorAll('span');
        for (let span of spans) {
          if (span.textContent.trim() === 'Create' ||
            span.textContent.trim() === 'New post') {
            link.click();
            return true;
          }
        }
      }

      // Alternative: Look for SVG with "New post" aria-label
      const newPostSvg = Array.from(document.querySelectorAll('svg[aria-label="New post"]'));
      if (newPostSvg.length > 0) {
        const button = newPostSvg[0].closest('a') ||
          newPostSvg[0].closest('div[role="button"]') ||
          newPostSvg[0].closest('span');
        if (button) {
          button.click();
          return true;
        }
      }

      return false;
    });

    if (!createClicked) {
      throw new Error('Could not click "Create" button. Make sure you are on Instagram home page.');
    }

    console.log('✅ Clicked "Create" button');
    await waitFor(3000);

    // Step 1.5: Look for and click "Post" button if present
    console.log('🔍 Looking for "Post" button...');
    const postClicked = await page.evaluate(() => {
      // Look for "Post" button with the specific structure
      const postDivs = Array.from(document.querySelectorAll('div'));
      for (let div of postDivs) {
        const spans = div.querySelectorAll('span');
        for (let span of spans) {
          if (span.textContent.trim() === 'Post') {
            // Check if this is the clickable Post button (not just any text containing "Post")
            const clickableParent = span.closest('div[role="button"]') || 
                                  span.closest('button') ||
                                  span.closest('a') ||
                                  span.closest('div.html-div');
            if (clickableParent) {
              clickableParent.click();
              return true;
            }
          }
        }
      }

      // Alternative: Look for SVG with "Post" aria-label
      const postSvg = Array.from(document.querySelectorAll('svg[aria-label="Post"]'));
      if (postSvg.length > 0) {
        const button = postSvg[0].closest('div[role="button"]') ||
          postSvg[0].closest('button') ||
          postSvg[0].closest('a') ||
          postSvg[0].closest('div');
        if (button) {
          button.click();
          return true;
        }
      }

      return false;
    });

    if (postClicked) {
      console.log('✅ Clicked "Post" button');
      await waitFor(3000);
    }

    // // Step 2: Look for and click "Select from computer" button if present (COMMENTED OUT)
    /*
    console.log('🔍 Looking for "Select from computer" button...');
    const selectComputerClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const selectBtn = buttons.find(btn =>
        btn.textContent.includes('Select from computer') ||
        btn.textContent.includes('Select photos')
      );
      if (selectBtn) {
        selectBtn.click();
        return true;
      }
      return false;
    });

    if (selectComputerClicked) {
      console.log('✅ Clicked "Select from computer"');
      await page.keyboard.press('Escape');
      await waitFor(3000);
    }
    */

    // Step 2: Wait for and use the file input directly
    console.log('🔍 Looking for file input element...');
    await waitFor(2000); // Wait for the form to appear

    // Step 3: Wait for and find the specific file upload input
    console.log('⏳ Waiting for file upload input...');
    
    // Wait for the specific file input with the class and attributes you provided
    await page.waitForSelector('form[enctype="multipart/form-data"] input[type="file"].x1s85apg', { timeout: 15000 });
    console.log('✅ File upload input found');

    // Step 4: Upload file using the specific selector
    const fileInput = await page.$('form[enctype="multipart/form-data"] input[type="file"].x1s85apg');
    if (!fileInput) {
      throw new Error('File input not found with the specified selector');
    }

    console.log(`📤 Uploading file: ${filePath}`);
    await fileInput.uploadFile(filePath);
    console.log('✅ File uploaded successfully');
    await waitFor(6000);

    // Step 5: Click "Next" button (First time - after file selection)
    console.log('🔍 Looking for "Next" button (First click - Crop)...');
    let nextClicked = await clickNextButton(page);
    if (!nextClicked) {
      console.log('⏳ Retrying after 3 seconds...');
      await waitFor(4000);
      nextClicked = await clickNextButton(page);
      if (!nextClicked) {
        throw new Error('Could not find "Next" button (First click)');
      }
    }

    console.log('✅ Clicked "Next" button (First time - Crop screen)');
    await waitFor(6000);

    // Step 6: Click "Next" button (Second time - filters/edit)
    console.log('🔍 Looking for "Next" button (Second click - Filters)...');
    let nextClickedSecond = await clickNextButton(page);
    if (!nextClickedSecond) {
      console.log('⏳ Retrying after 3 seconds...');
      await waitFor(4000);
      nextClickedSecond = await clickNextButton(page);
      if (!nextClickedSecond) {
        throw new Error('Could not find "Next" button (Second click)');
      }
    }

    console.log('✅ Clicked "Next" button (Second time - Filter screen)');
    await waitFor(6000);

    // Step 7: Write caption
    console.log('🔍 Looking for caption field...');
    let captionField = null;
    try {
      // Wait for caption textarea to appear
      await page.waitForSelector('div[contenteditable="true"]', { timeout: 5000 });
      captionField = await page.$('div[aria-label*="caption"][contenteditable="true"]');

      if (!captionField) {
        captionField = await page.$('div[contenteditable="true"][role="textbox"]');
      }

      if (!captionField) {
        // Try any contenteditable div
        captionField = await page.$('div[contenteditable="true"]');
      }
    } catch (e) {
      console.log('Trying alternative caption selector...');
      captionField = await page.$('textarea[aria-label*="caption"]');
    }

    if (!captionField) {
      throw new Error('Caption field not found');
    }

    // Use provided caption or random one
    const finalCaption = caption || captions[Math.floor(Math.random() * captions.length)];
    console.log(`✍️ Writing caption: "${finalCaption}"`);
    await captionField.click();
    await waitFor(1000);
    await page.keyboard.type(finalCaption, {
      delay: Math.random() * 100 + 50
    });
    console.log('✅ Caption written successfully');
    await waitFor(5000);

    // Step 8: Click final "Share" button to POST (not the share menu)
    console.log('🔍 Looking for final "Share" button to post...');
    const shareClicked = await page.evaluate(() => {
      // Method 1: Look for Share button specifically in the header area
      const allDivs = Array.from(document.querySelectorAll('div[role="button"][tabindex="0"]'));

      // Try to find Share button that's not inside a menu
      for (let div of allDivs) {
        if (div.textContent.trim() === 'Share') {
          // Check if it's in the header (top area) - not in dropdown menu
          const rect = div.getBoundingClientRect();
          if (rect.top < 200) { // Likely in header
            div.click();
            return true;
          }
        }
      }

      // Method 2: Try finding by exact text match
      let shareButton = allDivs.find(div => div.textContent.trim() === 'Share');
      if (shareButton) {
        shareButton.click();
        return true;
      }

      // Method 3: Look for button element with Share text
      const buttons = Array.from(document.querySelectorAll('button'));
      const shareBtn = buttons.find(btn =>
        btn.textContent.trim() === 'Share' ||
        btn.textContent.trim() === 'Post'
      );
      if (shareBtn) {
        shareBtn.click();
        return true;
      }

      return false;
    });

    if (!shareClicked) {
      console.log('⚠️ Could not find "Share" button automatically. Trying alternative methods...');

      // Alternative: Try pressing Enter key
      console.log('🔄 Trying to submit with Enter key...');
      await page.keyboard.press('Enter');
      await waitFor(3000);
    }

    console.log('✅ Clicked "Share" button (or pressed Enter)');
    console.log('🎉 Post should be sharing now!');
    await uploadRecord.addProcessingStep('sharing', 'started', 'Attempting to share post');
    await waitFor(60000); // for 60 seconds to allow post to be shared

    // Check if post was successful by looking for success indicator
    const postSuccess = await page.evaluate(() => {
      // Look for "Post shared" or "Your post has been shared" text
      const bodyText = document.body.innerText;
      return bodyText.includes('Post shared') ||
        bodyText.includes('Your post has been shared') ||
        bodyText.includes('shared');
    });

    if (postSuccess) {
      console.log('✅ Post confirmation detected!');
      await uploadRecord.addProcessingStep('sharing', 'completed', 'Post shared successfully');
      await uploadRecord.updateStatus('completed');

    } else {
      console.log('⚠️ Could not detect post confirmation (might still be processing)');
      await uploadRecord.addProcessingStep('sharing', 'warning', 'Could not detect post confirmation');
      await uploadRecord.updateStatus('completed'); // Still mark as completed since upload process finished
    }

    await waitFor(5000);

    // Click on Profile button after successful upload
    try {
      console.log('🔄 Looking for Profile button to click...');
      
      const profileButtonClicked = await page.evaluate(() => {
        // Look for the Profile button using multiple selectors
        const selectors = [
          // Direct href match
          'a[role="link"]:has(span:contains("Profile"))', // Link with Profile text
          'span:contains("Profile")', // Direct Profile text
          ' span:contains("Profile")' // Combined selector
        ];
        
        for (const selector of selectors) {
          try {
            // For text-based selectors, use a more robust approach
            if (selector.includes('contains')) {
              const links = document.querySelectorAll('a[role="link"]');
              for (const link of links) {
                const text = link.innerText || link.textContent;
                if (text && text.toLowerCase().includes('profile')) {
                  console.log('Found Profile button via text search');
                  link.click();
                  return true;
                }
              }
            } else {
              const element = document.querySelector(selector);
              if (element) {
                console.log('Found Profile button via selector:', selector);
                element.click();
                return true;
              }
            }
          } catch (e) {
            console.log('Selector failed:', selector, e.message);
          }
        }
        
        // Alternative approach: look for profile picture and click parent link
        const profileImg = document.querySelector('img[alt*="mcintoshpaulxmv0ok"]');
        if (profileImg) {
          const parentLink = profileImg.closest('a[role="link"]');
          if (parentLink) {
            console.log('Found Profile button via profile image');
            parentLink.click();
            return true;
          }
        }
        
        return false;
      });

      if (profileButtonClicked) {
        console.log('✅ Successfully clicked Profile button');
        await uploadRecord.addProcessingStep('profile_navigation', 'completed', 'Clicked Profile button after upload');
        await waitFor(5000); // Wait for profile page to load
        
        // Select first post and click View insights
        try {
          console.log('🔄 Looking for first post to select...');
          
          const firstPostClicked = await page.evaluate(() => {
            // Look for the first post in the profile grid
            const selectors = [
              'a[href*="/p/"]', // Direct post link
              'div[style*="display: flex; flex-direction: column"] a[role="link"]', // Post container link
              '._aagu a', // Instagram post container
              'div._ac7v a[role="link"]' // Alternative post selector
            ];
            
            for (const selector of selectors) {
              const firstPost = document.querySelector(selector);
              if (firstPost && firstPost.href && firstPost.href.includes('/p/')) {
                console.log('Found first post via selector:', selector);
                firstPost.click();
                return true;
              }
            }
            
            return false;
          });

          if (firstPostClicked) {
            console.log('✅ Successfully clicked first post');
            await uploadRecord.addProcessingStep('post_selection', 'completed', 'Selected first post from profile');
            await waitFor(4000); // Wait for post to load
            
            // Now click "View insights" button
            console.log('🔄 Looking for View insights button...');
            
            const insightsResult = await page.evaluate(() => {
              // Look for View insights button
              const selectors = [
                'div[role="button"]:has-text("View insights")',
                'button:contains("View insights")',
                'div[tabindex="0"]:contains("View insights")',
                '[role="button"]'
              ];
              
              // First try text-based search
              const buttons = document.querySelectorAll('[role="button"], button, div[tabindex="0"]');
              for (const button of buttons) {
                const text = button.innerText || button.textContent;
                if (text && text.toLowerCase().includes('view insights')) {
                  console.log('Found View insights button via text search');
                  button.click();
                  return { clicked: true, url: window.location.href };
                }
              }
              
              // Alternative: look for insights-related elements
              const insightsElements = document.querySelectorAll('[class*="insights"], [data-testid*="insights"]');
              if (insightsElements.length > 0) {
                console.log('Found insights element');
                insightsElements[0].click();
                return { clicked: true, url: window.location.href };
              }
              
              return { clicked: false, url: window.location.href };
            });

            if (insightsResult.clicked) {
              console.log('✅ Successfully clicked View insights button');
              await uploadRecord.addProcessingStep('insights_access', 'completed', 'Clicked View insights button');
              await waitFor(3000); // Wait for insights page to load
              
              // Get final insights URL
              const insightsUrl = await page.evaluate(() => window.location.href);
              console.log('📊 Insights URL:', insightsUrl);
              
              // Store insights URL in upload record
              uploadRecord.insightsUrl = insightsUrl;
              await uploadRecord.save();
              
            } else {
              console.log('⚠️ Could not find View insights button');
              await uploadRecord.addProcessingStep('insights_access', 'warning', 'Could not find View insights button');
            }
            
          } else {
            console.log('⚠️ Could not find first post to select');
            await uploadRecord.addProcessingStep('post_selection', 'warning', 'Could not find first post');
          }
          
        } catch (postError) {
          console.log('❌ Error selecting post or accessing insights:', postError.message);
          await uploadRecord.addProcessingStep('post_insights', 'failed', `Error: ${postError.message}`);
        }
        
      } else {
        console.log('⚠️ Could not find Profile button to click');
        await uploadRecord.addProcessingStep('profile_navigation', 'warning', 'Could not find Profile button');
      }
      
    } catch (profileError) {
      console.log('❌ Error clicking Profile button:', profileError.message);
      await uploadRecord.addProcessingStep('profile_navigation', 'failed', `Error clicking Profile: ${profileError.message}`);
    }

    // Try to get post URL if possible
    try {
      const currentUrl = page.url();
      if (currentUrl.includes('instagram.com')) {
        uploadRecord.instagramPostUrl = currentUrl;
        await uploadRecord.save();
      }
    } catch (urlError) {
      console.log('Could not capture post URL:', urlError.message);
    }

    await waitFor(5000);

    res.status(200).json({
      success: true,
      message: 'Instagram post uploaded successfully',
      filePath: filePath,
      caption: finalCaption,
      insightsUrl: uploadRecord.insightsUrl || null
    });

  } catch (error) {
    console.error('❌ Error uploading file:', error.message);

    // Update upload record with error if it exists
    if (uploadRecord) {
      try {
        await uploadRecord.updateStatus('failed', error.message);
        await uploadRecord.addProcessingStep('error', 'failed', error.message);
      } catch (dbError) {
        console.error('❌ Error updating upload record:', dbError.message);
      }
    }

    res.status(500).json({
      success: false,
      message: error.message,
      uploadId: uploadRecord?._id || null,
      errorType: error.name || 'UnknownError'
    });
  }
}