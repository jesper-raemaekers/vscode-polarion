import { resolve } from 'dns';
import * as vscode from 'vscode';
import * as pol from './polarion';
import * as utils from './utils';
import * as path from 'path';
import * as fs from 'fs';

const decorationType = vscode.window.createTextEditorDecorationType({});
const open = require('open');

export class PolarionHoverProvider implements vscode.HoverProvider {
  async provideHover(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Hover | undefined> {
    const regex = utils.getWorkitemRegex();
    const wordRange = document.getWordRangeAtPosition(position, regex);
    if (!wordRange) {
      return undefined;
    }

    const workItem = document.getText(wordRange);
    if (!utils.isValidWorkItem(workItem)) {
      return undefined;
    }

    const hoverContent = await buildHoverMarkdown(workItem);
    return new vscode.Hover(hoverContent, wordRange);
  }
}

export class PolarionCodeLensProvider implements vscode.CodeLensProvider {
  async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const regex = utils.getWorkitemRegex();
    
    for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
      const line = document.lineAt(lineIndex);
      let match;
      
      // Reset regex lastIndex for each line
      regex.lastIndex = 0;
      
      while ((match = regex.exec(line.text)) !== null) {
        const workItem = match[0];
        if (utils.isValidWorkItem(workItem)) {
          const range = new vscode.Range(
            lineIndex, 
            match.index, 
            lineIndex, 
            match.index + workItem.length
          );
          
          // Add "Open in Polarion" CodeLens
          const openCodeLens = new vscode.CodeLens(range, {
            title: `Open ${workItem} in Polarion`,
            command: 'vscode-polarion.openWorkItemUrl',
            arguments: [workItem]
          });
          codeLenses.push(openCodeLens);
          
          // Add "Open to the Side" CodeLens
          const sideCodeLens = new vscode.CodeLens(range, {
            title: `Open ${workItem} to the Side`,
            command: 'vscode-polarion.openWorkItemToSide',
            arguments: [workItem]
          });
          codeLenses.push(sideCodeLens);
        }
      }
    }
    
    return codeLenses;
  }
}

export async function decorate(editor: vscode.TextEditor) {
  let decorationColor = utils.getDecorateColor();
  let decorationsArray: vscode.DecorationOptions[] = [];

  let items = utils.mapItemsInDocument(editor);

  for (const item of items) {
    var title = await utils.getWorkItemText(item[0]);
    let renderOptionsDark = { after: { contentText: title, color: decorationColor, margin: '50px' } };
    let renderOptions = { light: renderOptionsDark, dark: renderOptionsDark };

    for (const itemRange of item[1]) {
      let range = new vscode.Range(itemRange.start.line, 200, itemRange.end.line, 201);
      let afterLineDecoration = { range, renderOptions };
      decorationsArray.push(afterLineDecoration);
    }
  }
  editor.setDecorations(decorationType, decorationsArray);
}

export async function buildHoverMarkdown(workItem: string): Promise<vscode.MarkdownString[]> {
  let item = await pol.polarion.getWorkItem(workItem);
  let url = await pol.polarion.getUrlFromWorkItem(workItem);
  let hover: vscode.MarkdownString[] = [];
  if (item !== undefined) {
    // Build status text with icon if available
    let statusText = item.status?.name || item.status?.id || 'unknown';
    if (item.status?.iconPath) {
      statusText = `![status](${item.status.iconPath}) ${statusText}`;
    }
    
    // Build workitem type text with icon if available
    let typeText = item.type?.name || item.type?.id || 'unknown';
    if (item.type?.iconPath) {
      typeText = `![type](${item.type.iconPath}) ${typeText}`;
    }
    
    // Build author text using shared function
    const authorText = utils.buildAuthorDisplayText(item.author);
    
    hover.push(new vscode.MarkdownString(`${workItem} (${typeText}) ***${item.title}***  \nAuthor: ${authorText}  \nStatus: ${statusText}`));
    if (item.description) {
      // Process images in the description before creating the MarkdownString
      const processedContent = await utils.preprocessWorkitemDescription(item.description.content, item);
      let content = new vscode.MarkdownString(processedContent);
      content.supportHtml = true;
      hover.push(content);
    }
    hover.push(new vscode.MarkdownString(`[Open in Polarion](${url})`));
  }
  else {
    hover.push(new vscode.MarkdownString(`Not found`));
  }
  return hover;
}

export async function handleOpenPolarion() {
  const editor = vscode.window.activeTextEditor;
  if (editor !== undefined) {
    if (editor.selection.isEmpty) {
      // the Position object gives you the line and character where the cursor is
      const position = editor.selection.active;

      let items = utils.listItemsInDocument(editor);

      let selectedItem = items.find((value) => {
        if (value.range.contains(position)) {
          return 1;
        }
      });

      if (selectedItem) {
        open(await pol.polarion.getUrlFromWorkItem(selectedItem.name));
      }
    }
  }
}

export async function handleOpenWorkItemToSide(workItemId: string) {
  try {
    const workItem = await pol.polarion.getWorkItem(workItemId);
    if (!workItem) {
      vscode.window.showErrorMessage(`Could not find workitem ${workItemId}`);
      return;
    }

    // Create a webview panel
    const panel = vscode.window.createWebviewPanel(
      'polarionWorkitem',
      `${workItemId}: ${workItem.title}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'openUrl':
            const open = require('open');
            open(message.url);
            break;
        }
      }
    );

    // Generate HTML content for the webview
    const htmlContent = await buildWorkItemHtml(workItem, workItemId);
    panel.webview.html = htmlContent;
    
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open workitem ${workItemId}: ${error}`);
  }
}

async function buildWorkItemHtml(workItem: pol.PolarionWorkItem, workItemId: string): Promise<string> {
  const url = await pol.polarion.getUrlFromWorkItem(workItemId);
  
  // Build type text with icon
  let typeText = workItem.type?.name || workItem.type?.id || 'Unknown';
  let typeIcon = '';
  if (workItem.type?.iconPath) {
    typeIcon = `<img src="${workItem.type.iconPath}" alt="type" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;">`;
  }
  
  // Build status text with icon
  let statusText = workItem.status?.name || workItem.status?.id || 'Unknown';
  let statusIcon = '';
  if (workItem.status?.iconPath) {
    statusIcon = `<img src="${workItem.status.iconPath}" alt="status" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;">`;
  }
  
  // Build author text
  const authorText = utils.buildAuthorDisplayText(workItem.author);
  
  // Process description if available
  let descriptionHtml = '';
  if (workItem.description?.content) {
    descriptionHtml = await utils.preprocessWorkitemDescription(workItem.description.content, workItem);
  }
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${workItemId}: ${workItem.title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
        }
        h1 {
            color: var(--vscode-textLink-foreground);
            border-bottom: 2px solid var(--vscode-textSeparator-foreground);
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        h2 {
            color: var(--vscode-textLink-foreground);
            margin-top: 30px;
            margin-bottom: 15px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            background-color: var(--vscode-editor-background);
        }
        th, td {
            text-align: left;
            padding: 8px 12px;
            border-bottom: 1px solid var(--vscode-textSeparator-foreground);
        }
        th {
            background-color: var(--vscode-textBlockQuote-background);
            font-weight: bold;
        }
        tr:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        .description {
            margin-top: 20px;
            padding: 15px;
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textLink-foreground);
            border-radius: 4px;
        }
        .description img {
            max-width: 100%;
            height: auto;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid var(--vscode-textSeparator-foreground);
            text-align: center;
        }
        .polarion-link {
            display: inline-block;
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            text-decoration: none;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        .polarion-link:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .icon-text {
            display: flex;
            align-items: center;
        }
    </style>
</head>
<body>
    <h1>${workItemId}: ${workItem.title}</h1>
    
    <h2>Details</h2>
    <table>
        <tr>
            <th>Field</th>
            <th>Value</th>
        </tr>
        <tr>
            <td><strong>ID</strong></td>
            <td>${workItem.id}</td>
        </tr>
        <tr>
            <td><strong>Title</strong></td>
            <td>${workItem.title}</td>
        </tr>
        <tr>
            <td><strong>Type</strong></td>
            <td><span class="icon-text">${typeIcon}${typeText}</span></td>
        </tr>
        <tr>
            <td><strong>Status</strong></td>
            <td><span class="icon-text">${statusIcon}${statusText}</span></td>
        </tr>
        <tr>
            <td><strong>Author</strong></td>
            <td>${authorText}</td>
        </tr>
        <tr>
            <td><strong>Project</strong></td>
            <td>${workItem.project?.id || 'Unknown'}</td>
        </tr>
    </table>
    
    ${descriptionHtml ? `
    <h2>Description</h2>
    <div class="description">
        ${descriptionHtml}
    </div>
    ` : ''}
    
    <div class="footer">
        <a href="${url}" class="polarion-link" onclick="openInPolarion('${url}')">Open in Polarion</a>
    </div>
    
    <script>
        function openInPolarion(url) {
            // Send message to extension to open URL
            const vscode = acquireVsCodeApi();
            vscode.postMessage({
                command: 'openUrl',
                url: url
            });
        }
    </script>
</body>
</html>`;
}
