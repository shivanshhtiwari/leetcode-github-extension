// Background service worker for GitHub API integration

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'pushToGitHub') {
    pushToGitHub(request.solutionData, request.config)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'exchangeCodeForToken') {
    exchangeCodeForToken(request.code)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }

  if (request.action === 'fetchRepositories') {
    fetchRepositories(request.token, request.username)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }

  if (request.action === 'createRepository') {
    createRepository(request.token, request.repoName)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
});

async function pushToGitHub(solutionData, config) {
  try {
    const { githubToken, repoOwner, repoName } = config;
    const { title, difficulty, code, runtime, memory, language, problemSlug } = solutionData;

    // Generate file path based on organization structure
    const filePath = generateFilePath(difficulty, title, language);
    
    // Generate commit message with runtime/memory stats
    const commitMessage = generateCommitMessage(title, difficulty, runtime, memory);
    
    // Get file extension based on language
    const fileExtension = getFileExtension(language);
    
    // Check if file already exists
    const existingFile = await getFile(githubToken, repoOwner, repoName, filePath);
    
    let sha = null;
    if (existingFile) {
      sha = existingFile.sha;
    }

    // Create or update file
    const result = await createOrUpdateFile(
      githubToken,
      repoOwner,
      repoName,
      filePath,
      code,
      commitMessage,
      sha
    );

    return {
      success: true,
      message: `Pushed to ${filePath}`,
      url: result.content.html_url
    };

  } catch (error) {
    console.error('Error pushing to GitHub:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function generateFilePath(difficulty, title, language) {
  // Sanitize title for filename
  const sanitizedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  
  const fileExtension = getFileExtension(language);
  
  // Organize by difficulty
  const difficultyFolder = difficulty.toLowerCase();
  
  return `${difficultyFolder}/${sanitizedTitle}.${fileExtension}`;
}

function generateCommitMessage(title, difficulty, runtime, memory) {
  let message = `Solve: ${title} [${difficulty}]`;
  
  if (runtime || memory) {
    const stats = [];
    if (runtime) stats.push(`Runtime: ${runtime}`);
    if (memory) stats.push(`Memory: ${memory}`);
    message += `\n\nStats: ${stats.join(', ')}`;
  }
  
  return message;
}

function getFileExtension(language) {
  const extensions = {
    'python': 'py',
    'python3': 'py',
    'java': 'java',
    'javascript': 'js',
    'typescript': 'ts',
    'c++': 'cpp',
    'c': 'c',
    'c#': 'cs',
    'go': 'go',
    'rust': 'rs',
    'ruby': 'rb',
    'swift': 'swift',
    'kotlin': 'kt',
    'scala': 'scala',
    'php': 'php'
  };
  
  const normalizedLanguage = language.toLowerCase();
  return extensions[normalizedLanguage] || 'txt';
}

async function getFile(token, owner, repo, path) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function createOrUpdateFile(token, owner, repo, path, content, message, sha = null) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  
  // Encode content to base64
  const encodedContent = btoa(content);
  
  const body = {
    message,
    content: encodedContent
  };

  if (sha) {
    body.sha = sha;
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API error: ${error.message || response.statusText}`);
  }

  return await response.json();
}

async function exchangeCodeForToken(code) {
  try {
    const clientId = 'YOUR_GITHUB_CLIENT_ID'; // Replace with your actual GitHub OAuth client ID
    const clientSecret = 'YOUR_GITHUB_CLIENT_SECRET'; // Replace with your actual GitHub OAuth client secret
    
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GitHub OAuth error: ${error.error_description || response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error_description || data.error);
    }

    // Get user information using the access token
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${data.access_token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user information');
    }

    const userData = await userResponse.json();

    return {
      success: true,
      token: data.access_token,
      username: userData.login
    };

  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function fetchRepositories(token, username) {
  try {
    const response = await fetch(`https://api.github.com/user/repos?per_page=100&sort=updated`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const repositories = await response.json();

    return {
      success: true,
      repositories: repositories.map(repo => ({
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description
      }))
    };

  } catch (error) {
    console.error('Error fetching repositories:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function createRepository(token, repoName) {
  try {
    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: repoName,
        description: 'LeetCode solutions',
        private: false,
        auto_init: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GitHub API error: ${error.message || response.statusText}`);
    }

    const repository = await response.json();

    return {
      success: true,
      repository: {
        name: repository.name,
        full_name: repository.full_name
      }
    };

  } catch (error) {
    console.error('Error creating repository:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
