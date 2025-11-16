import browser from '../utlis/Browser.js';
import waitFor from '../utlis/waitFor.js';

export default async function wrampUp(req, res) {
    try {
        const { durationMinutes = 8 } = req.body;
        const Broserpage = await browser.browser.pages();
        const page = Broserpage[0];
        await page.authenticate({
            username: process.env.PROXY_USERNAME,
            password: process.env.PROXY_PASSWORD
        });
        await page.goto('https://www.instagram.com/');
        await waitFor(10000);
        await page.keyboard.press('Escape'); 
        await page.keyboard.press('Escape');
            await waitFor(10000);
        const startTime = Date.now();
        const durationMs = durationMinutes * 60 * 1000;
        const endTime = startTime + durationMs;
        let postsInteracted = 0;
        let attempts = 0;
        const comments = [
            'Great post!',
            'I love this!',
            'Awesome content!',
            'Thanks for sharing!',
            'Keep it up!',
            'Nice post!',
            'Awesome work!',
            'Amazing!',
            'Incredible!',
            'Superb!',
            'Brilliant!',
            'Wonderful!',
            'Fabulous!',
            'Spectacular!',
            'Marvelous!',
        ];
        console.log(`🕐 Starting wramp up for ${durationMinutes} minutes`);
        console.log(`⏰ Will run until: ${new Date(endTime).toLocaleTimeString()}`);

        // Run loop until time expires
        while (Date.now() < endTime) {
            attempts++;
            const remainingTime = Math.floor((endTime - Date.now()) / 1000);
            console.log(`\n--- Attempt ${attempts} | Posts: ${postsInteracted} | Time left: ${remainingTime}s ---`);

            // Scroll down
            console.log('📜 Scrolling down...');
            await page.evaluate(() => {
                window.scrollBy(0, window.innerHeight * (Math.random() * 0.5 + 0.5));
            });
            await waitFor(5000);

            // Check available posts
            const postsAvailable = await page.evaluate(() => {
                const likeButtons = document.querySelectorAll('svg[aria-label="Like"]');
                return likeButtons.length;
            });

            console.log(`📊 Found ${postsAvailable} posts with like buttons`);

            if (postsAvailable === 0) {
                console.log('⚠️ No posts found, scrolling more...');
                continue;
            }

            // Randomly choose action type
            const actionRandom = Math.random();
            let actionType;
            if (actionRandom < 0.4) {
                actionType = 'like';
            } else if (actionRandom < 0.7) {
                actionType = 'comment';
            } else {
                actionType = 'both';
            }

            console.log(`🎲 Action chosen: ${actionType}`);
            let postInteracted = false;

            // LIKE ACTION
            if (actionType === 'like') {
                const liked = await page.evaluate(() => {
                    // Find the SVG with aria-label="Like"
                    const likeSvg = document.querySelector('svg[aria-label="Like"]');
                    if (!likeSvg) return false;

                    // Find the parent button element by traversing up the DOM
                    let likeButton = likeSvg.closest('div[role="button"]');
                    if (!likeButton) return false;

                    // Click the like button
                    likeButton.click();
                    return true;
                });

                if (liked) {
                    console.log('✅ Liked the post');
                    postInteracted = true;
                    await waitFor(4000);
                } else {
                    console.log('❌ Could not like post (already liked or button not found)');
                }
            }

            // COMMENT ACTION
            if (actionType === 'comment' || actionType === 'both') {
                try {
                    // Find the comment button by locating the SVG and its parent button
                    const commentButtonFound = await page.evaluate(() => {
                        const commentSvg = document.querySelector('svg[aria-label="Comment"]');
                        if (!commentSvg) return false;

                        const commentButton = commentSvg.closest('div[role="button"]');
                        if (!commentButton) return false;

                        commentButton.click();
                        return true;
                    });

                    if (commentButtonFound) {
                        // First click - opens popup
                        console.log('📝 Opening comment popup...');
                        await waitFor(3000);

                        // Second click - activates textarea
                        console.log('📝 Activating textarea...');
                        const secondClickSuccess = await page.evaluate(() => {
                            const commentSvg = document.querySelector('svg[aria-label="Comment"]');
                            if (!commentSvg) return false;

                            const commentButton = commentSvg.closest('div[role="button"]');
                            if (!commentButton) return false;

                            commentButton.click();
                            return true;
                        });

                        if (secondClickSuccess) {
                            await waitFor(2500);

                            // Find and type in textarea
                            const commentInput = await page.$('textarea');
                            if (commentInput) {
                                const randomComment = comments[Math.floor(Math.random() * comments.length)];
                                await commentInput.click();
                                await waitFor(800);
                                await commentInput.type(randomComment, {
                                    delay: Math.random() * 100 + 50
                                });
                                console.log(`💬 Typed: "${randomComment}"`);
                                await waitFor(2000);

                                // Press Enter to post
                                console.log('📤 Pressing Enter to post...');
                                await page.keyboard.press('Enter');
                                await waitFor(3000);
                                console.log('✅ Comment posted successfully');
                                postInteracted = true;

                                // Click the close button to close popup
                                console.log('🚪 Clicking close button to close popup...');
                                const closeButtonClicked = await page.evaluate(() => {
                                    // Look for the close button using multiple selectors
                                    const selectors = [
                                        'svg[aria-label="Close"]', // Direct SVG with Close aria-label
                                        'div[role="button"]:has(svg[aria-label="Close"])', // Button containing Close SVG
                                        'button:has(svg[aria-label="Close"])', // Button element with Close SVG
                                        'svg[aria-label="Close"] + *', // Element next to Close SVG
                                        '[role="button"] svg[aria-label="Close"]' // SVG inside button role
                                    ];
                                    
                                    for (const selector of selectors) {
                                        try {
                                            if (selector.includes('svg[aria-label="Close"]') && !selector.includes(':has')) {
                                                // For direct SVG selectors, find the parent button
                                                const closeSvg = document.querySelector('svg[aria-label="Close"]');
                                                if (closeSvg) {
                                                    const closeButton = closeSvg.closest('div[role="button"]') || closeSvg.closest('button');
                                                    if (closeButton) {
                                                        console.log('Found close button via SVG parent search');
                                                        closeButton.click();
                                                        return true;
                                                    }
                                                }
                                            } else {
                                                const element = document.querySelector(selector);
                                                if (element) {
                                                    console.log('Found close button via selector:', selector);
                                                    element.click();
                                                    return true;
                                                }
                                            }
                                        } catch (e) {
                                            console.log('Selector failed:', selector, e.message);
                                        }
                                    }
                                    
                                    // Alternative approach: look for any button with close-related content
                                    const buttons = document.querySelectorAll('[role="button"], button');
                                    for (const button of buttons) {
                                        const svg = button.querySelector('svg[aria-label="Close"]');
                                        if (svg) {
                                            console.log('Found close button via button iteration');
                                            button.click();
                                            return true;
                                        }
                                    }
                                    
                                    return false;
                                });

                                if (closeButtonClicked) {
                                    console.log('✅ Successfully clicked close button');
                                    await waitFor(1500);
                                } else {
                                    console.log('⚠️ Close button not found, using Escape key as fallback');
                                    await page.keyboard.press('Escape');
                                    await waitFor(1500);
                                }
                            } else {
                                console.log('❌ Textarea not found after second click');
                                // Try to close with close button, fallback to Escape
                                const closeClicked = await page.evaluate(() => {
                                    const closeSvg = document.querySelector('svg[aria-label="Close"]');
                                    if (closeSvg) {
                                        const closeButton = closeSvg.closest('div[role="button"]') || closeSvg.closest('button');
                                        if (closeButton) {
                                            closeButton.click();
                                            return true;
                                        }
                                    }
                                    return false;
                                });
                                if (!closeClicked) {
                                    await page.keyboard.press('Escape');
                                }
                            }
                        } else {
                            console.log('❌ Comment button not found for second click');
                            // Try to close with close button, fallback to Escape
                            const closeClicked = await page.evaluate(() => {
                                const closeSvg = document.querySelector('svg[aria-label="Close"]');
                                if (closeSvg) {
                                    const closeButton = closeSvg.closest('div[role="button"]') || closeSvg.closest('button');
                                    if (closeButton) {
                                        closeButton.click();
                                        return true;
                                    }
                                }
                                return false;
                            });
                            if (!closeClicked) {
                                await page.keyboard.press('Escape');
                            }
                        }
                    } else {
                        console.log('❌ Comment button not found');
                    }
                } catch (error) {
                    console.log('❌ Comment error:', error.message);
                    try {
                        // Try to close with close button, fallback to Escape
                        const closeClicked = await page.evaluate(() => {
                            const closeSvg = document.querySelector('svg[aria-label="Close"]');
                            if (closeSvg) {
                                const closeButton = closeSvg.closest('div[role="button"]') || closeSvg.closest('button');
                                if (closeButton) {
                                    closeButton.click();
                                    return true;
                                }
                            }
                            return false;
                        });
                        if (!closeClicked) {
                            await page.keyboard.press('Escape');
                        }
                    } catch (e) { }
                }
            }

            if (postInteracted) {
                postsInteracted++;
                console.log(`✅ Post interaction complete (Total: ${postsInteracted})`);
            }

            // Take breaks periodically
            if (postsInteracted % 3 === 0 && postsInteracted > 0) {
                console.log('💤 Taking a short break...');
                await waitFor(10000);
            } else {
                await waitFor(5000);
            }

            // Check if time is up
            if (Date.now() >= endTime) {
                console.log(`\n⏰ Time's up! ${durationMinutes} minutes completed.`);
                break;
            }
        }

        const totalTimeSeconds = Math.floor((Date.now() - startTime) / 1000);
        console.log(`\n✅ Wramp up completed!`);
        console.log(`📊 Total posts interacted: ${postsInteracted}`);
        console.log(`⏱️ Total time: ${Math.floor(totalTimeSeconds / 60)}m ${totalTimeSeconds % 60}s`);
        console.log(`🔄 Total attempts: ${attempts}`);

        res.status(200).json({
            postsInteracted,
            attempts,
            durationSeconds: totalTimeSeconds
        });
    } catch (error) {
        console.error('❌ Error wramp up:', error.message);
        res.status(500).json({
            postsInteracted: 0,
            attempts: 0,
            durationSeconds: 0
        });
    }
}
