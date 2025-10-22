import * as vscode from 'vscode';
import * as pol from './polarion';
import { PolarionStatus } from "./status";
import { PolarionOutlinesProvider } from './polarionoutline';
import * as utils from './utils';
import * as editor from './editor';
import { PolarionAuthManager } from './auth';

export async function activate(context: vscode.ExtensionContext) {
  // Create the authentication manager
  const authManager = new PolarionAuthManager(context);

  // check the current settings
  await utils.checkSettings(authManager);

  // status bar
  let polarionStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  polarionStatusBar.tooltip = "Restart polarion";
  polarionStatusBar.command = "vscode-polarion.restart";

  let polarionStatus = new PolarionStatus(polarionStatusBar);
  polarionStatus.update(pol.polarion);

  // output channel for logging
  let outputChannel = vscode.window.createOutputChannel("Polarion");
  pol.createPolarion(outputChannel, authManager).finally(() => { polarionStatus.update(pol.polarion); });

  //outline provider 
  let outlineProvider = new PolarionOutlinesProvider(vscode.workspace.workspaceFolders);
  vscode.window.registerTreeDataProvider('polarionOutline', outlineProvider);

  // Listen for Polarion connection changes and refresh outline
  pol.onPolarionConnectionChanged.event((connected: boolean) => {
    if (connected) {
      // When Polarion becomes connected, refresh the outline view
      outlineProvider.refresh();
      // Also refresh the current editor decorations
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        editor.decorate(activeEditor);
      }
    }
  });

  // commands
  vscode.commands.registerCommand('vscode-polarion.clearCache', () => pol?.polarion.clearCache());
  vscode.commands.registerCommand('vscode-polarion.openPolarion', () => editor.handleOpenPolarion());
  vscode.commands.registerCommand('vscode-polarion.restart', () => { pol.createPolarion(outputChannel, authManager).finally(() => { polarionStatus.update(pol.polarion); }); });
  vscode.commands.registerCommand('vscode-polarion.getWorkItemTitle', (workItem: string) => {
    if (pol?.polarion.initialized === true) {
      return pol.polarion.getTitleFromWorkItem(workItem);
    }
    return undefined;
  });
  vscode.commands.registerCommand('vscode-polarion.openWorkItemUrl', async (workItem: string) => {
    const polarionUrl = await pol.polarion.getUrlFromWorkItem(workItem);
    if (polarionUrl) {
      const open = require('open');
      open(polarionUrl);
    }
  });

  // New command for opening workitem from outline
  vscode.commands.registerCommand('vscode-polarion.openWorkItemFromOutline', async (workItemId: string) => {
    if (workItemId) {
      const polarionUrl = await pol.polarion.getUrlFromWorkItem(workItemId);
      if (polarionUrl) {
        const open = require('open');
        open(polarionUrl);
      }
    }
  });

  // New command for opening workitem to the side
  vscode.commands.registerCommand('vscode-polarion.openWorkItemToSide', async (workItem: string) => {
    await editor.handleOpenWorkItemToSide(workItem);
  });

  // New command for setting up authentication
  vscode.commands.registerCommand('vscode-polarion.setupAuth', async () => {
    const result = await authManager.setupAuthentication();
    if (result) {
      // Restart Polarion with new authentication
      await pol.createPolarion(outputChannel, authManager);
      polarionStatus.update(pol.polarion);
      vscode.window.showInformationMessage('Authentication setup complete! Polarion connection restarted.');
    }
  });

  // Register the hover provider
  const hoverProvider = vscode.languages.registerHoverProvider(
    { scheme: 'file' }, // Apply to all file types
    new editor.PolarionHoverProvider()
  );
  context.subscriptions.push(hoverProvider);

  // CodeLens provider - managed dynamically
  let codeLensProvider: vscode.Disposable | undefined;
  
  function updateCodeLensProvider() {
    const codeLensEnabled = vscode.workspace.getConfiguration('Polarion', null).get('CodeLens', true);
    
    // Dispose existing provider if it exists
    if (codeLensProvider) {
      codeLensProvider.dispose();
      codeLensProvider = undefined;
    }
    
    // Register new provider if enabled
    if (codeLensEnabled) {
      codeLensProvider = vscode.languages.registerCodeLensProvider(
        { scheme: 'file' },
        new editor.PolarionCodeLensProvider()
      );
      context.subscriptions.push(codeLensProvider);
    }
  }
  
  // Initial setup
  updateCodeLensProvider();

  // document save and change
  vscode.workspace.onWillSaveTextDocument(async event => {
    const openEditor = vscode.window.visibleTextEditors.filter(
      editor => editor.document.uri === event.document.uri
    )[0];
    utils.documentChanged(openEditor, outlineProvider, polarionStatus);
  });
  vscode.window.onDidChangeActiveTextEditor(async event => { utils.documentChanged(event, outlineProvider, polarionStatus); });

  // configuration change
  vscode.workspace.onDidChangeConfiguration(event => {
    let configChange = event.affectsConfiguration('Polarion');

    if (configChange) {
      utils.checkSettings(authManager);

      // Update CodeLens provider if the setting changed
      if (event.affectsConfiguration('Polarion.CodeLens')) {
        updateCodeLensProvider();
      }

      pol.createPolarion(outputChannel, authManager).finally(() => { polarionStatus.update(pol.polarion); });
    }
  });
}

// this method is called when your extension is deactivated
export function deactivate() { }











