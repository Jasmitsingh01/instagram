export default async function clickNextButton (page) {
  return await page.evaluate(() => {
    let allDivs = Array.from(document.querySelectorAll('div[role="button"]'));
    let nextButton = allDivs.find(div => div.textContent.trim() === 'Next');
    
    if (nextButton) {
      nextButton.click();
      return true;
    }
    
    nextButton = allDivs.find(div => div.textContent.trim().toLowerCase() === 'next');
    if (nextButton) {
      nextButton.click();
      return true;
    }
    
    nextButton = allDivs.find(div => div.textContent.includes('Next'));
    if (nextButton) {
      nextButton.click();
      return true;
    }
    
    return false;
  });
};