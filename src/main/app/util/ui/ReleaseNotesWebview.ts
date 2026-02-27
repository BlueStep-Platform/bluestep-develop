import * as vscode from 'vscode';
import { UpdateInfo } from '../../../../../types';

/**
 * Escapes special HTML characters to prevent raw tags from being interpreted by the browser.
 * @lastreviewed null
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Renders a minimal subset of Markdown (bold, italic, newlines) to HTML.
 * HTML in the input is escaped first so that raw tags in release notes are
 * never interpreted by the browser.
 * @lastreviewed null
 */
function renderMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

/**
 * Returns the download URL only when it uses the https: scheme.
 * Falls back to '#' for any other scheme to prevent javascript: or
 * other potentially dangerous URLs from appearing in the webview.
 * @lastreviewed null
 */
function sanitizeDownloadUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? url : '#';
  } catch {
    return '#';
  }
}

/**
 * Generates the HTML string for the release notes webview.
 * @lastreviewed null
 */
export function getReleaseNotesHtml(updateInfo: UpdateInfo): string {
  const releaseNotes = renderMarkdown(updateInfo.releaseNotes);
  const releasedDate = new Date(updateInfo.publishedAt).toLocaleDateString();
  const safeDownloadUrl = sanitizeDownloadUrl(updateInfo.downloadUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Release Notes</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: var(--vscode-editor-foreground);
      background-color: var(--vscode-editor-background);
      padding: 20px;
    }
    h1 {
      color: var(--vscode-textPreformat-foreground);
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 10px;
    }
    .meta {
      color: var(--vscode-descriptionForeground);
      font-size: 0.9em;
      margin-bottom: 20px;
    }
    .download-link {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      padding: 10px 20px;
      text-decoration: none;
      border-radius: 3px;
      display: inline-block;
      margin-top: 20px;
    }
    .download-link:hover {
      background-color: var(--vscode-button-hoverBackground);
    }
  </style>
</head>
<body>
  <h1>B6P Extension v${updateInfo.version}</h1>
  <div class="meta">Released: ${releasedDate}</div>
  <div class="content">${releaseNotes || 'No release notes available.'}</div>
  <a href="${safeDownloadUrl}" class="download-link">Download Update</a>
</body>
</html>`;
}

/**
 * Opens a VS Code webview panel displaying the release notes for the given update.
 * @lastreviewed null
 */
export function showReleaseNotesPanel(updateInfo: UpdateInfo): void {
  const panel = vscode.window.createWebviewPanel(
    'b6pReleaseNotes',
    `B6P Release Notes v${updateInfo.version}`,
    vscode.ViewColumn.One,
    {}
  );
  panel.webview.html = getReleaseNotesHtml(updateInfo);
}
