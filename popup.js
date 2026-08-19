// Popup script for handling UI and GitHub integration
document.addEventListener('DOMContentLoaded', () => {
  const authSection = document.getElementById('authSection');
  const repoSection = document.getElementById('repoSection');
  const connectGithubBtn = document.getElementById('connectGithub');
  const githubStatus = document.getElementById('githubStatus');
  const repoSelect = document.getElementById('repoSelect');
  const newRepoName = document.getElementById('newRepoName');
  const selectRepoBtn = document.getElementById('selectRepo');
  const pushSolutionBtn = document.getElementById('pushSolution');
  const solutionStatus = document.getElementById('solutionStatus');

  // Load saved configuration
  chrome.storage.local.get(['githubToken', 'githubUsername', 'repoName', 'repoOwner', 'isOAuthConnected'], (result) => {
    if (result.isOAuthConnected && result.githubUsername && result.repoName) {
      // Already connected and repo selected
      authSection.style.display = 'none';
      repoSection.style.display = 'none';
      showGithubStatus(`Connected as @${result.githubUsername} to ${result.repoName}`, 'connected');
      pushSolutionBtn.disabled = false;
    } else if (result.isOAuthConnected && result.githubUsername) {
      // Connected but no repo selected
      authSection.style.display = 'none';
      repoSection.style.display = 'block';
      showGithubStatus(`Connected as @${result.githubUsername}`, 'connected');
      loadRepositories(result.githubToken, result.githubUsername);
    }
  });

  // Connect GitHub via OAuth
  connectGithubBtn.addEventListener('click', async () => {
    showGithubStatus('Connecting to GitHub...', 'loading');
    connectGithubBtn.disabled = true;

    try {
      const authUrl = 'https://github.com/login/oauth/authorize';
      const clientId = 'YOUR_GITHUB_CLIENT_ID';
      const redirectUri = chrome.identity.getRedirectURL();
      const scopes = ['repo', 'user'];
      
      const authUrlWithParams = `${authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes.join(' ')}`;
      
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
            const codeMatch = responseUrl.match(/[?&]code=([^&]+)/);
            if (codeMatch) {
              const code = codeMatch[1];
              
              chrome.runtime.sendMessage({
                action: 'exchangeCodeForToken',
                code: code
              }, async (response) => {
                if (response.success) {
                  const { token, username } = response;
                  
                  chrome.storage.local.set({
                    githubToken: token,
                    githubUsername: username,
                    repoOwner: username,
                    isOAuthConnected: true
                  }, () => {
                    authSection.style.display = 'none';
                    repoSection.style.display = 'block';
                    showGithubStatus(`Connected as @${username}`, 'connected');
                    loadRepositories(token, username);
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

  // Load repositories
  async function loadRepositories(token, username) {
    repoSelect.innerHTML = '<option value="">Loading repositories...</option>';
    
    chrome.runtime.sendMessage({
      action: 'fetchRepositories',
      token: token,
      username: username
    }, (response) => {
      if (response.success) {
        repoSelect.innerHTML = '<option value="">Select a repository...</option>';
        response.repositories.forEach(repo => {
          const option = document.createElement('option');
          option.value = repo.name;
          option.textContent = repo.name;
          repoSelect.appendChild(option);
        });
      } else {
        repoSelect.innerHTML = '<option value="">Failed to load repositories</option>';
        showGithubStatus(`Error: ${response.error}`, 'error');
      }
    });
  }

  // Select repository
  selectRepoBtn.addEventListener('click', async () => {
    const selectedRepo = repoSelect.value;
    const newRepo = newRepoName.value.trim();
    
    if (!selectedRepo && !newRepo) {
      showStatus('Please select a repository or enter a new repository name', 'error');
      return;
    }

    const repoName = newRepo || selectedRepo;
    const config = await chrome.storage.local.get(['githubToken', 'githubUsername', 'repoOwner']);

    if (newRepo) {
      // Create new repository
      chrome.runtime.sendMessage({
        action: 'createRepository',
        token: config.githubToken,
        repoName: newRepo
      }, (response) => {
        if (response.success) {
          saveRepository(config.githubUsername, newRepo);
        } else {
          showStatus(`Error creating repository: ${response.error}`, 'error');
        }
      });
    } else {
      // Use existing repository
      saveRepository(config.githubUsername, selectedRepo);
    }
  });

  // Save repository selection
  function saveRepository(owner, name) {
    chrome.storage.local.set({
      repoName: name,
      repoOwner: owner
    }, () => {
      repoSection.style.display = 'none';
      showGithubStatus(`Connected to ${owner}/${name}`, 'connected');
      showStatus('Repository selected successfully!', 'success');
      pushSolutionBtn.disabled = false;
    });
  }

  // Push solution to GitHub
  pushSolutionBtn.addEventListener('click', async () => {
    showStatus('Scraping solution data...', 'info');
    pushSolutionBtn.disabled = true;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('leetcode.com/problems/')) {
        showStatus('Please navigate to a LeetCode problem page', 'error');
        pushSolutionBtn.disabled = false;
        return;
      }

      const solutionData = await chrome.tabs.sendMessage(tab.id, { action: 'scrapeSolution' });
      
      if (!solutionData || !solutionData.code) {
        showStatus('Could not extract solution code. Make sure you have code in the editor.', 'error');
        pushSolutionBtn.disabled = false;
        return;
      }

      showStatus('Pushing to GitHub...', 'info');

      const config = await chrome.storage.local.get(['githubToken', 'githubUsername', 'repoName', 'repoOwner']);
      
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

  // Show GitHub status message
  function showGithubStatus(message, type) {
    githubStatus.textContent = message;
    githubStatus.className = `github-status ${type}`;
  }
});
