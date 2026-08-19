// Popup script for handling UI and GitHub integration
document.addEventListener('DOMContentLoaded', () => {
  const githubTokenInput = document.getElementById('githubToken');
  const githubUsernameInput = document.getElementById('githubUsername');
  const repoNameInput = document.getElementById('repoName');
  const repoOwnerInput = document.getElementById('repoOwner');
  const saveConfigBtn = document.getElementById('saveConfig');
  const pushSolutionBtn = document.getElementById('pushSolution');
  const solutionStatus = document.getElementById('solutionStatus');

  // Load saved configuration
  chrome.storage.local.get(['githubToken', 'githubUsername', 'repoName', 'repoOwner'], (result) => {
    if (result.githubToken) githubTokenInput.value = result.githubToken;
    if (result.githubUsername) githubUsernameInput.value = result.githubUsername;
    if (result.repoName) repoNameInput.value = result.repoName;
    if (result.repoOwner) repoOwnerInput.value = result.repoOwner;
    
    // Enable push button if config is complete
    checkConfigComplete();
  });

  // Save configuration
  saveConfigBtn.addEventListener('click', () => {
    const config = {
      githubToken: githubTokenInput.value.trim(),
      githubUsername: githubUsernameInput.value.trim(),
      repoName: repoNameInput.value.trim(),
      repoOwner: repoOwnerInput.value.trim()
    };

    chrome.storage.local.set(config, () => {
      showStatus('Configuration saved successfully!', 'success');
      checkConfigComplete();
    });
  });

  // Check if configuration is complete
  function checkConfigComplete() {
    const isComplete = githubTokenInput.value && 
                      githubUsernameInput.value && 
                      repoNameInput.value && 
                      repoOwnerInput.value;
    pushSolutionBtn.disabled = !isComplete;
  }

  // Push solution to GitHub
  pushSolutionBtn.addEventListener('click', async () => {
    showStatus('Scraping solution data...', 'info');
    pushSolutionBtn.disabled = true;

    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('leetcode.com/problems/')) {
        showStatus('Please navigate to a LeetCode problem page', 'error');
        pushSolutionBtn.disabled = false;
        return;
      }

      // Scrape solution data from content script
      const solutionData = await chrome.tabs.sendMessage(tab.id, { action: 'scrapeSolution' });
      
      if (!solutionData || !solutionData.code) {
        showStatus('Could not extract solution code. Make sure you have code in the editor.', 'error');
        pushSolutionBtn.disabled = false;
        return;
      }

      showStatus('Pushing to GitHub...', 'info');

      // Get configuration
      const config = await chrome.storage.local.get(['githubToken', 'githubUsername', 'repoName', 'repoOwner']);
      
      // Push to GitHub via background script
      chrome.runtime.sendMessage({
        action: 'pushToGitHub',
        solutionData,
        config
      }, (response) => {
        if (response.success) {
          showStatus(`Solution pushed successfully! ${response.message}`, 'success');
        } else {
          showStatus(`Error: ${response.error}`, 'error');
        }
        pushSolutionBtn.disabled = false;
      });

    } catch (error) {
      showStatus(`Error: ${error.message}`, 'error');
      pushSolutionBtn.disabled = false;
    }
  });

  // Show status message
  function showStatus(message, type) {
    solutionStatus.textContent = message;
    solutionStatus.className = `status-message ${type}`;
  }

  // Listen for input changes to enable/disable push button
  [githubTokenInput, githubUsernameInput, repoNameInput, repoOwnerInput].forEach(input => {
    input.addEventListener('input', checkConfigComplete);
  });
});
