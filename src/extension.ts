// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
// import { Polarion } from "./polarion";
import * as pol from './polarion';
import { PolarionStatus } from "./status";
import { PolarionOutlinesProvider } from './polarionoutline';
import * as utils from './utils';
import * as editor from './editor';





let polarionStatus: PolarionStatus;
let outputChannel: vscode.OutputChannel;

let outlineProvider: any;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

  outlineProvider = new PolarionOutlinesProvider(vscode.workspace.workspaceFolders);

  outputChannel = vscode.window.createOutputChannel("Polarion");

  let polarionStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  polarionStatusBar.tooltip = "Clear to clear cached work items";
  polarionStatusBar.command = "vscode-polarion.clearCache";
  context.subscriptions.push(polarionStatusBar);

  polarionStatus = new PolarionStatus(polarionStatusBar);

  polarionStatus.update(pol.polarion);

  utils.checkSettings();

  pol.createPolarion(outputChannel).finally(() => { polarionStatus.update(pol.polarion); });

  let disposable = vscode.commands.registerCommand('vscode-polarion.clearCache', () => {
    if (pol.polarion) {
      pol.polarion.clearCache();
    }
    vscode.window.showInformationMessage('Cleared polarion work item cache');
  });

  context.subscriptions.push(disposable);

  disposable = vscode.commands.registerCommand('vscode-polarion.openPolarion', () => {
    editor.handleOpenPolarion();
  });

  context.subscriptions.push(disposable);

  vscode.workspace.onWillSaveTextDocument(async event => {
    const openEditor = vscode.window.visibleTextEditors.filter(
      editor => editor.document.uri === event.document.uri
    )[0];
    if (openEditor) {
      outlineProvider.refresh();
      polarionStatus.startUpdate(pol.polarion);
      await editor.decorate(openEditor);
      polarionStatus.endUpdate();
    }
  });

  vscode.window.onDidChangeActiveTextEditor(async event => {
    if (event) {
      outlineProvider.refresh();
      polarionStatus.startUpdate(pol.polarion);
      await editor.decorate(event);
      polarionStatus.endUpdate();
    }
  });

  vscode.workspace.onDidChangeConfiguration(event => {
    let configChange = event.affectsConfiguration('Polarion');

    if (configChange) {
      utils.checkSettings();

      pol.createPolarion(outputChannel).finally(() => { polarionStatus.update(pol.polarion); });
    }
  });

  vscode.window.registerTreeDataProvider('polarionOutline', outlineProvider);


}

// this method is called when your extension is deactivated
export function deactivate() { }









