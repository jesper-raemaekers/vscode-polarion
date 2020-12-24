// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Polarion } from "./polarion";
import { PolarionStatus } from "./status";

const open = require('open');

let polarion: Polarion;

let polarionStatus: PolarionStatus;
let outputChannel: vscode.OutputChannel;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

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
      decorate(openEditor);
    }
  });

  vscode.window.onDidChangeActiveTextEditor(event => {
    if (event) {
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
  let prefix: string | undefined = vscode.workspace.getConfiguration('Polarion', null).get('Prefix');
  let enableHover: boolean | undefined = vscode.workspace.getConfiguration('Polarion', null).get('Hover');
  // Check if a prefix is defined
  if (prefix) {
    let decorationColor = getDecorateColor();
    let sourceCode = editor.document.getText();
    let regex = "(" + prefix + "-\\d+)";

    let decorationsArray: vscode.DecorationOptions[] = [];

    const sourceCodeArr = sourceCode.split('\n');

    //itterate over each line
    for (let line = 0; line < sourceCodeArr.length; line++) {
      //TODO: make two markdowns. one on the number and one behind.
      let match = sourceCodeArr[line].match(regex);
      if (match !== null && match.index !== undefined) {
        let range = new vscode.Range(
          new vscode.Position(line, 200),
          new vscode.Position(line, 201)
        );
        var title = await getWorkItemText(match[0]);
        let renderOptionsDark = { after: { contentText: title, color: decorationColor, margin: '50px' } };
        let renderOptions = { light: renderOptionsDark, dark: renderOptionsDark };

        if (enableHover === true) {
          let hoverMessage = await buildHoverMarkdown(match[0]);
          let decoration = { range, renderOptions, hoverMessage };
          decorationsArray.push(decoration);
        }
        else {
          let decoration = { range, renderOptions };
          decorationsArray.push(decoration);
        }
      }
    }
    editor.setDecorations(decorationType, decorationsArray);
  }
  polarionStatus.endUpdate();
}

async function buildHoverMarkdown(workItem: string): Promise<string[]> {
  let item = await polarion.getWorkItem(workItem);
  let hover: string[] = [];
  if (item !== undefined) {
    hover.push(`${workItem} (${item.type.id}) ***${item.title}***  \nAuthor: ${item.author.id}  \n Status: ${item.status.id}`);
    if (item.description) {
      hover.push(`${item.description?.content}`);
    }
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

      let prefix: string | undefined = vscode.workspace.getConfiguration('Polarion', null).get('Prefix');
      // Check if a prefix is defined
      if (prefix) {
        let sourceCode = editor.document.getText(new vscode.Range(new vscode.Position(position.line, 0), new vscode.Position(position.line, 200)));
        let re = RegExp("(" + prefix + "-\\d+)", 'g');
        var m;
        let matches = new Map<string, vscode.Range>();
        do {
          m = re.exec(sourceCode);
          if (m) {
            matches.set(m[0], new vscode.Range(new vscode.Position(position.line, m.index), new vscode.Position(position.line, m.index + m[0].length)));
          }
        } while (m);

        matches.forEach(async (value: vscode.Range, key: string, map: Map<string, vscode.Range>) => {
          if (matches.size === 1) {
            open(await polarion.getUrlFromWorkItem(key));
          }
          else if (matches.size > 1) {
            //check if cursor is in range
            if (value.contains(new vscode.Position(position.line, position.character))) {
              open(await polarion.getUrlFromWorkItem(key));
            }
          }
        });
      }
    }
  }
}

async function getWorkItemText(workItem: string): Promise<string> {
  //Add to the dictionairy if not available
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

