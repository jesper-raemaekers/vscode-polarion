// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Polarion } from "./polarion";
import { PolarionStatus } from "./status";
import { PolarionOutlinesProvider } from './polarionoutline';
import { listItemsInDocument, mapItemsInDocument } from './utils';

const open = require('open');

let polarion: Polarion;

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

  polarionStatus.update(polarion);

  checkSettings();

  initializePolarion();

  let disposable = vscode.commands.registerCommand('vscode-polarion.clearCache', () => {
    if (polarion) {
      polarion.clearCache();
    }
    vscode.window.showInformationMessage('Cleared polarion work item cache');
  });

  context.subscriptions.push(disposable);

  disposable = vscode.commands.registerCommand('vscode-polarion.openPolarion', async () => {
    await handleOpenPolarion();
  });

  context.subscriptions.push(disposable);

  vscode.workspace.onWillSaveTextDocument(event => {
    const openEditor = vscode.window.visibleTextEditors.filter(
      editor => editor.document.uri === event.document.uri
    )[0];
    if (openEditor) {
      outlineProvider.refresh();
      decorate(openEditor);
    }
  });

  vscode.window.onDidChangeActiveTextEditor(event => {
    if (event) {
      outlineProvider.refresh();
      decorate(event);
    }
  });

  vscode.workspace.onDidChangeConfiguration(event => {
    let configChange = event.affectsConfiguration('Polarion');

    if (configChange) {
      checkSettings();

      initializePolarion();
    }
  });

  vscode.window.registerTreeDataProvider('polarionOutline', outlineProvider);


}

// this method is called when your extension is deactivated
export function deactivate() { }

async function initializePolarion() {
  let polarionUrl: string | undefined = vscode.workspace.getConfiguration('Polarion', null).get('Url');
  let polarionProject: string | undefined = vscode.workspace.getConfiguration('Polarion', null).get('Project');
  let polarionUsername: string | undefined = vscode.workspace.getConfiguration('Polarion', null).get('Username');
  let polarionPassword: string | undefined = vscode.workspace.getConfiguration('Polarion', null).get('Password');

  if (polarionUrl && polarionProject && polarionUsername && polarionPassword) {
    polarion = new Polarion(polarionUrl, polarionProject, polarionUsername, polarionPassword, outputChannel);
    await polarion.initialize().finally(() => { polarionStatus.update(polarion); });

  }
}

const decorationType = vscode.window.createTextEditorDecorationType({});

async function decorate(editor: vscode.TextEditor) {
  polarionStatus.startUpdate(polarion);
  let decorationColor = getDecorateColor();
  let enableHover: boolean | undefined = vscode.workspace.getConfiguration('Polarion', null).get('Hover');
  let decorationsArray: vscode.DecorationOptions[] = [];

  let items = mapItemsInDocument(editor);

  for (const item of items) {
    var title = await getWorkItemText(item[0]);
    let renderOptionsDark = { after: { contentText: title, color: decorationColor, margin: '50px' } };
    let renderOptions = { light: renderOptionsDark, dark: renderOptionsDark };

    for (const itemRange of item[1]) {
      let hoverMessage = await buildHoverMarkdown(item[0]);
      if (enableHover === true) {
        let range = new vscode.Range(itemRange.start.line, itemRange.start.character, itemRange.end.line, itemRange.end.character - 1); // rebuild range to remove last character
        let onItemDecoration = { range, hoverMessage };
        decorationsArray.push(onItemDecoration);
        range = new vscode.Range(itemRange.start.line, 200, itemRange.end.line, 201);
        let afterLineDecoration = { range, renderOptions, hoverMessage };
        decorationsArray.push(afterLineDecoration);
      }
      else {
        let range = new vscode.Range(itemRange.start.line, 200, itemRange.end.line, 201);
        let afterLineDecoration = { range, renderOptions };
        decorationsArray.push(afterLineDecoration);
      }
    }
  }
  editor.setDecorations(decorationType, decorationsArray);
  polarionStatus.endUpdate();
}

async function buildHoverMarkdown(workItem: string): Promise<string[]> {
  let item = await polarion.getWorkItem(workItem);
  let url = await polarion.getUrlFromWorkItem(workItem);
  let hover: string[] = [];
  if (item !== undefined) {
    hover.push(`${workItem} (${item.type.id}) ***${item.title}***  \nAuthor: ${item.author.id}  \n Status: ${item.status.id}`);
    if (item.description) {
      hover.push(`${item.description?.content}`);
    }
    hover.push(`[Open in Polarion](${url})`);
  }
  else {
    hover.push(`Not found`);
  }
  return hover;
}

async function handleOpenPolarion() {
  const editor = vscode.window.activeTextEditor;
  if (editor !== undefined) {
    if (editor.selection.isEmpty) {
      // the Position object gives you the line and character where the cursor is
      const position = editor.selection.active;

      let items = listItemsInDocument(editor);

      let selectedItem = items.find((value) => {
        if (value.range.contains(position)) {
          return 1;
        }
      });

      if (selectedItem) {
        open(await polarion.getUrlFromWorkItem(selectedItem.name));
      }
    }
  }
}

async function getWorkItemText(workItem: string): Promise<string> {
  var workItemText = 'Not found in polarion';
  await polarion.getTitleFromWorkItem(workItem).then((title: string | undefined) => {
    if (title !== undefined) {
      workItemText = workItem + ': ' + title;
    }
  });

  return workItemText;
}

function getDecorateColor() {
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



function checkSettings() {
  // let missingConfiguration: string = ''
  let missingConfiguration: Array<String> = new Array<String>();

  if (vscode.workspace.getConfiguration('Polarion', null).get('Url') === "") {
    missingConfiguration.push('Url');
  }
  if (vscode.workspace.getConfiguration('Polarion', null).get('Username') === "") {
    missingConfiguration.push('Username');
  }
  if (vscode.workspace.getConfiguration('Polarion', null).get('Password') === "") {
    missingConfiguration.push('Password');
  }
  if (vscode.workspace.getConfiguration('Polarion', null).get('Project') === "") {
    missingConfiguration.push('Project');
  }
  if (vscode.workspace.getConfiguration('Polarion', null).get('Prefix') === "") {
    missingConfiguration.push('Prefix');
  }

  if (missingConfiguration.length > 0) {
    var message = 'The following Polarion settings are not set: ';
    message = message.concat(missingConfiguration.join(', '));
    vscode.window.showWarningMessage(message);
  }
}

