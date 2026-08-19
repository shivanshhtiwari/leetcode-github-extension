// Background service worker for GitHub API integration

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'pushToGitHub') {
    pushToGitHub(request.solutionData, request.config)
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
