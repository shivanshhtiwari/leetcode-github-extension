// Popup script for handling UI and GitHub integration
document.addEventListener('DOMContentLoaded', () => {
  const githubTokenInput = document.getElementById('githubToken');
  const githubUsernameInput = document.getElementById('githubUsername');
  const repoNameInput = document.getElementById('repoName');
  const repoOwnerInput = document.getElementById('repoOwner');
  const saveConfigBtn = document.getElementById('saveConfig');
  const pushSolutionBtn = document.getElementById('pushSolution');
  const solutionStatus = document.getElementById('solutionStatus');
  const connectGithubBtn = document.getElementById('connectGithub');
  const githubStatus = document.getElementById('githubStatus');

  // Load saved configuration
  chrome.storage.local.get(['githubToken', 'githubUsername', 'repoName', 'repoOwner', 'isOAuthConnected'], (result) => {
    if (result.githubToken) githubTokenInput.value = result.githubToken;
    if (result.githubUsername) githubUsernameInput.value = result.githubUsername;
    if (result.repoName) repoNameInput.value = result.repoName;
    if (result.repoOwner) repoOwnerInput.value = result.repoOwner;
    
    // Show OAuth connection status
    if (result.isOAuthConnected && result.githubUsername) {
      showGithubStatus(`Connected as @${result.githubUsername}`, 'connected');
      connectGithubBtn.textContent = '✓ Connected';
      connectGithubBtn.disabled = true;
    }
    
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

  // Connect GitHub via OAuth
  connectGithubBtn.addEventListener('click', async () => {
    showGithubStatus('Connecting to GitHub...', 'loading');
    connectGithubBtn.disabled = true;

    try {
      // Use Chrome Identity API for OAuth
      const authUrl = 'https://github.com/login/oauth/authorize';
      const clientId = 'YOUR_GITHUB_CLIENT_ID'; // Replace with your actual GitHub OAuth client ID
      const redirectUri = chrome.identity.getRedirectURL();
      const scopes = ['repo', 'user'];
      
      const authUrlWithParams = `${authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes.join(' ')}`;
      
      // Launch OAuth flow
      chrome.identity.launchWebAuthFlow(
        {
          url: authUrlWithParams,
          interactive: true
        },
        async (responseUrl) => {
          if (chrome.runtime.lastError) {
            showGithubStatus(`Authentication failed: ${chrome.runtime.lastError.message}`, 'error');
            connectGithubBtn.disabled = false;
            return;
          }

          if (responseUrl) {
            // Extract the authorization code from the response URL
            const codeMatch = responseUrl.match(/[?&]code=([^&]+)/);
            if (codeMatch) {
              const code = codeMatch[1];
              
              // Exchange code for access token via background script
              chrome.runtime.sendMessage({
                action: 'exchangeCodeForToken',
                code: code
              }, async (response) => {
                if (response.success) {
                  const { token, username } = response;
                  
                  // Save the token and username
                  chrome.storage.local.set({
                    githubToken: token,
                    githubUsername: username,
                    repoOwner: username,
                    isOAuthConnected: true
                  }, () => {
                    // Update UI
                    githubTokenInput.value = token;
                    githubUsernameInput.value = username;
                    repoOwnerInput.value = username;
                    
                    showGithubStatus(`Connected as @${username}`, 'connected');
                    connectGithubBtn.textContent = '✓ Connected';
                    showStatus('GitHub connected successfully!', 'success');
                    checkConfigComplete();
                  });
                } else {
                  showGithubStatus(`Error: ${response.error}`, 'error');
                  connectGithubBtn.disabled = false;
                }
              });
            } else {
              showGithubStatus('Could not extract authorization code', 'error');
              connectGithubBtn.disabled = false;
            }
          } else {
            showGithubStatus('Authentication cancelled', 'error');
            connectGithubBtn.disabled = false;
          }
        }
      );
    } catch (error) {
      showGithubStatus(`Error: ${error.message}`, 'error');
      connectGithubBtn.disabled = false;
    }
  });

  // Show GitHub status message
  function showGithubStatus(message, type) {
    githubStatus.textContent = message;
    githubStatus.className = `github-status ${type}`;
  }
});
