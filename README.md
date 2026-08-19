# LeetCode to GitHub Chrome Extension

Push your LeetCode solutions to GitHub in one click. This extension automatically captures your code, builds commit messages with runtime/memory beats, and organizes your coding portfolio.

## Features

- **One-click push**: Upload your LeetCode solutions directly to GitHub
- **Auto-scraping**: Automatically extracts code, problem title, and difficulty
- **Smart commit messages**: Generates commit messages with runtime and memory statistics
- **Portfolio organization**: Organizes solutions by difficulty (Easy, Medium, Hard)
- **Multi-language support**: Supports Python, Java, JavaScript, C++, and more
- **GitHub API integration**: Uses GitHub REST API for seamless file management

## Installation

### Prerequisites

1. A GitHub account
2. A GitHub Personal Access Token with `repo` scope permissions
3. Google Chrome browser

### Create GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select the `repo` scope (this gives full control of private repositories)
4. Generate the token and copy it (you won't be able to see it again)

### Install the Extension

1. Clone or download this repository
2. Convert the `icons/icon.svg` to PNG files (icon16.png, icon48.png, icon128.png) using an online converter or tool like ImageMagick:
   ```bash
   # Using ImageMagick
   convert icons/icon.svg -resize 16x16 icons/icon16.png
   convert icons/icon.svg -resize 48x48 icons/icon48.png
   convert icons/icon.svg -resize 128x128 icons/icon128.png
   ```
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right corner
5. Click "Load unpacked"
6. Select the `leetcode-github-extension` folder

## Usage

### Initial Setup

1. Navigate to any LeetCode problem page (e.g., https://leetcode.com/problems/two-sum/)
2. Click the extension icon in your browser toolbar
3. Fill in the GitHub configuration:
   - **GitHub Personal Access Token**: Your token from the prerequisites
   - **GitHub Username**: Your GitHub username
   - **Repository Name**: The name of your repo (e.g., `leetcode-solutions`)
   - **Repository Owner**: Your GitHub username (or organization name)
4. Click "Save Configuration"

### Push a Solution

1. Solve a problem on LeetCode
2. Make sure your code is in the editor
3. Click the extension icon
4. Click "Push to GitHub"
5. Your solution will be uploaded to your GitHub repository

## File Organization

The extension organizes your solutions by difficulty:

```
leetcode-solutions/
├── easy/
│   ├── two-sum.py
│   ├── palindrome-number.py
│   └── ...
├── medium/
│   ├── add-two-numbers.py
│   ├── longest-substring.py
│   └── ...
└── hard/
    ├── median-of-two-sorted-arrays.py
    └── ...
```

## Commit Message Format

Each commit includes:
- Problem title and difficulty
- Runtime and memory statistics (if available)

Example:
```
Solve: Two Sum [Easy]

Stats: Runtime: 52 ms, Memory: 13.8 MB
```

## Supported Languages

- Python (.py)
- Java (.java)
- JavaScript (.js)
- TypeScript (.ts)
- C++ (.cpp)
- C (.c)
- C# (.cs)
- Go (.go)
- Rust (.rs)
- Ruby (.rb)
- Swift (.swift)
- Kotlin (.kt)
- Scala (.scala)
- PHP (.php)

## Troubleshooting

### "Could not extract solution code"
- Make sure you have code in the LeetCode editor
- Try refreshing the page and clicking the extension again

### "GitHub API error"
- Verify your Personal Access Token has the correct permissions
- Check that your repository name and owner are correct
- Ensure the repository exists on GitHub

### Extension not loading
- Make sure you've converted the SVG icons to PNG format
- Check that all files are in the correct directory结构
- Try reloading the extension in chrome://extensions/

## Security

- Your GitHub token is stored locally in Chrome's storage
- The token is never sent anywhere except to GitHub's API
- Only requires `repo` scope for repository operations

## Development

### Project Structure

```
leetcode-github-extension/
├── manifest.json       # Extension configuration
├── content.js          # Scrapes LeetCode data
├── popup.html          # Extension popup UI
├── popup.css           # Popup styling
├── popup.js            # Popup logic
├── background.js       # GitHub API integration
├── icons/              # Extension icons
└── README.md           # This file
```

### Modifying the Extension

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the reload button on your extension
4. Test your changes

## License

MIT License - feel free to use and modify as needed.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.
