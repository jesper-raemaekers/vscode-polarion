import * as vscode from 'vscode';
import * as pol from './polarion';
import { PolarionOutlinesProvider } from './polarionoutline';
import { PolarionStatus } from './status';
import * as editor from './editor';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as validator from 'jsonschema';
import { PolarionAuthManager } from './auth';

export function getWorkitemRegex(): RegExp {
  let prefix: string | undefined = vscode.workspace.getConfiguration('Polarion', null).get('Prefix');
  
  // Default prefix pattern if none is configured
  if (!prefix || prefix.trim() === '') {
    prefix = '[A-Z]{2,}';
  }
  
  // Create regex pattern without capturing groups for getWordRangeAtPosition
  return new RegExp(`${prefix}-\\d+`, 'g');
}

export function mapItemsInDocument(editor: vscode.TextEditor): Map<string, vscode.Range[]> {
  let result: Map<string, vscode.Range[]> = new Map<string, vscode.Range[]>();
  let regex = getWorkitemRegex();

  let sourceCode = editor.document.getText();
  const sourceCodeArr = sourceCode.split('\n');

  for (let line = 0; line < sourceCodeArr.length; line++) {
    var m = null;
    do {
      m = regex.exec(sourceCodeArr[line]);
      if (m) {
        if (result.has(m[0])) {
          let newRange: vscode.Range[] | undefined = result.get(m[0]);
          if (newRange) {
            newRange.push(new vscode.Range(new vscode.Position(line, m.index), new vscode.Position(line, m.index + m[0].length)));
            result.set(m[0], newRange);
          }
        }
        else {
          let newRange: vscode.Range[] = [];
          newRange.push(new vscode.Range(new vscode.Position(line, m.index), new vscode.Position(line, m.index + m[0].length)));
          result.set(m[0], newRange);
        }
      }
    } while (m);
  }
  return result;
}

export function listItemsInDocument(editor: vscode.TextEditor): any[] {
  let result: any[] = [];
  let regex = getWorkitemRegex();

  let sourceCode = editor.document.getText();
  const sourceCodeArr = sourceCode.split('\n');

  for (let line = 0; line < sourceCodeArr.length; line++) {
    var m = null;
    do {
      m = regex.exec(sourceCodeArr[line]);
      if (m) {
        result.push({ name: m[0], range: new vscode.Range(new vscode.Position(line, m.index), new vscode.Position(line, m.index + m[0].length)) });
      }
    } while (m);
  }
  return result;
}

export async function checkSettings(authManager?: PolarionAuthManager) {
  let missingConfiguration: Array<String> = new Array<String>();

  // Check URL configuration
  const polarionUrl = vscode.workspace.getConfiguration('Polarion', null).get('Url');
  if (!polarionUrl || polarionUrl === "") {
    // Prompt for URL if not configured
    if (authManager) {
      const url = await authManager.promptForUrl();
      if (!url) {
        missingConfiguration.push('Url');
      }
    } else {
      missingConfiguration.push('Url');
    }
  }

  // Check Project configuration
  if (vscode.workspace.getConfiguration('Polarion', null).get('Project') === "") {
    missingConfiguration.push('Project');
  }
  
  // Check Prefix configuration
  if (vscode.workspace.getConfiguration('Polarion', null).get('Prefix') === "") {
    missingConfiguration.push('Prefix');
  }

  let useTokenAuth: boolean | undefined = vscode.workspace.getConfiguration('Polarion', null).get('UseTokenAuth');
  if (useTokenAuth === undefined) {
    useTokenAuth = true; // Default to token auth
  }

  let fileConfig = getPolarionConfigFromFile();
  if (!fileConfig && useTokenAuth) {
    // Check for token in secure storage or prompt for setup
    if (authManager) {
      const isConfigured = await authManager.isAuthenticationConfigured();
      if (!isConfigured) {
        // Show setup prompt
        const setup = await vscode.window.showInformationMessage(
          'Polarion authentication is not configured. Would you like to set it up now?',
          'Setup Authentication',
          'Skip'
        );
        
        if (setup === 'Setup Authentication') {
          await authManager.setupAuthentication();
        } else {
          missingConfiguration.push('Authentication');
        }
      }
    } else {
      // Fallback: check for token in VS Code settings (deprecated)
      let token: string | undefined = vscode.workspace.getConfiguration('Polarion', null).get('Token');
      if (!token || token.trim() === '') {
        missingConfiguration.push('Token');
      }
    }
  } else if (!fileConfig && !useTokenAuth) {
    // Only check for user and password if not using token auth and no polarion config file is present
    if (vscode.workspace.getConfiguration('Polarion', null).get('Username') === "") {
      missingConfiguration.push('Username');
    }
    if (vscode.workspace.getConfiguration('Polarion', null).get('Password') === "") {
      missingConfiguration.push('Password');
    }
  }

  if (missingConfiguration.length > 0) {
    var message = 'The following Polarion settings are not set: ';
    message = message.concat(missingConfiguration.join(', '));
    vscode.window.showWarningMessage(message);
  }

  if (useTokenAuth) {
    if (authManager) {
      const hasSecureToken = await authManager.getStoredToken();
      if (hasSecureToken) {
        vscode.window.showInformationMessage('Polarion will use secure token authentication');
      } else {
        vscode.window.showInformationMessage('Polarion will use token authentication from VS Code settings (consider using secure storage)');
      }
    } else {
      vscode.window.showInformationMessage('Polarion will use token authentication from VS Code settings');
    }
  }
}

export function getDecorateColor() {
  let settingsColor: string | undefined = vscode.workspace.getConfiguration('Polarion', null).get('Color');
  let selectedColor: string = '#777777';

  if (settingsColor) {
    var match = settingsColor.match(/^#[0-9A-F]{6}$/);
    if (match !== null) {
      selectedColor = settingsColor;
    }
  }
  return selectedColor;
}

export async function getWorkItemText(workItem: string): Promise<string> {
  var workItemText = '';
  await pol.polarion.getTitleFromWorkItem(workItem).then((title: string | undefined) => {
    if (title !== undefined) {
      workItemText = workItem + ': ' + title;
    }
  });

  return workItemText;
}

export async function documentChanged(textEditor: vscode.TextEditor | undefined, outlineProvider: PolarionOutlinesProvider, statusBar: PolarionStatus) {
  if (textEditor) {
    outlineProvider.refresh();
    statusBar.startUpdate(pol.polarion);
    await editor.decorate(textEditor);
    statusBar.endUpdate();
  }
}

export function getPolarionConfigFromFile(): { username?: string, password?: string, token?: string, useTokenAuth?: boolean } | undefined {
  let workspace = vscode.workspace.workspaceFolders;
  if (workspace) {
    try {
      let file = path.join(workspace[0].uri.fsPath, '.vscode', 'polarion.json');
      // let config = fs.readFileSync(file);
      let config = fs.readJSONSync(file);
      let s = require('../schemas/polarionConfig.schema.json');
      let polarionConfig = validator.validate(config, s);
      if (polarionConfig.valid) {
        return config;
      }
      return undefined;
    } catch (e) {
      console.log(`polarion.json could not be read`);
      return undefined;
    }
  }
}

export function isValidWorkItem(workItem: string): boolean {
  // Create a non-global version of the regex for testing
  let prefix: string | undefined = vscode.workspace.getConfiguration('Polarion', null).get('Prefix');
  
  // Default prefix pattern if none is configured
  if (!prefix || prefix.trim() === '') {
    prefix = '[A-Z]{2,}';
  }
  
  const workItemRegex = new RegExp(`^${prefix}-\\d+$`);
  return workItemRegex.test(workItem);
}

export async function preprocessWorkitemDescription(htmlContent: string, workItem: pol.PolarionWorkItem): Promise<string> {
  // Regular expression to find img tags with workitemimg: src
  const imgRegex = /<img[^>]+src="workitemimg:([^"]+)"[^>]*>/gi;
  let processedContent = htmlContent;
  let match;

  while ((match = imgRegex.exec(htmlContent)) !== null) {
    const attachmentId = match[1];
    const fullImgTag = match[0];
    
    try {
      // Download the image using the workitem's downloadAttachment method
      const imageData = await workItem.downloadAttachment(attachmentId);
      
      if (imageData) {
        // Create a data URI for the image
        const mimeType = getImageMimeType(attachmentId);
        const dataUri = `data:${mimeType};base64,${imageData}`;
        
        // Replace the workitemimg: src with the data URI
        const updatedImgTag = fullImgTag.replace(/src="workitemimg:[^"]+"/i, `src="${dataUri}"`);
        processedContent = processedContent.replace(fullImgTag, updatedImgTag);
      }
    } catch (error) {
      console.error(`Failed to download image ${attachmentId} for workitem ${workItem.id}:`, error);
      // Keep the original img tag if download fails
    }
  }
  
  return processedContent;
}

export function buildAuthorDisplayText(author: { id: string, name?: string, email?: string, initials?: string }): string {
  let authorText = author?.name || author?.id || 'unknown';
  if (author?.email) {
    authorText += ` (${author.email})`;
  }
  return authorText;
}

function getImageMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.webp':
      return 'image/webp';
    default:
      return 'image/png'; // Default fallback
  }
}