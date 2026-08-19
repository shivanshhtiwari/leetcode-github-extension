// Content script to scrape LeetCode solution data
function scrapeLeetCodeData() {
  try {
    // Get problem title
    const titleElement = document.querySelector('a.text-label-1');
    const title = titleElement ? titleElement.textContent.trim() : document.title.split('-')[0].trim();
    
    // Get problem difficulty
    const difficultyElement = document.querySelector('[diff]');
    const difficulty = difficultyElement ? difficultyElement.getAttribute('diff') : 'Medium';
    
    // Get problem URL
    const problemUrl = window.location.href;
    
    // Get problem ID from URL
    const problemIdMatch = problemUrl.match(/problems\/([^\/]+)/);
    const problemSlug = problemIdMatch ? problemIdMatch[1] : title.toLowerCase().replace(/\s+/g, '-');
    
    // Get code from editor
    const codeEditor = document.querySelector('.view-lines');
    let code = '';
    
    if (codeEditor) {
      // Try to get code from Monaco editor
      const lines = codeEditor.querySelectorAll('.view-line');
      code = Array.from(lines).map(line => line.textContent).join('\n');
    }
    
    // Fallback: try to get code from textarea
    if (!code) {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        code = textarea.value;
      }
    }
    
    // Get runtime and memory stats if submission exists
    const runtimeElement = document.querySelector('[data-e2e-locator="submission-runtime"]');
    const memoryElement = document.querySelector('[data-e2e-locator="submission-memory"]');
    
    let runtime = null;
    let memory = null;
    
    if (runtimeElement) {
      runtime = runtimeElement.textContent.trim();
    }
    
    if (memoryElement) {
      memory = memoryElement.textContent.trim();
    }
    
    // Get language
    const languageElement = document.querySelector('.select__language');
    const language = languageElement ? languageElement.textContent.trim() : 'python';
    
    return {
      title,
      difficulty,
      problemUrl,
      problemSlug,
      code,
      runtime,
      memory,
      language,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error scraping LeetCode data:', error);
    return null;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeSolution') {
    const data = scrapeLeetCodeData();
    sendResponse(data);
  }
});
