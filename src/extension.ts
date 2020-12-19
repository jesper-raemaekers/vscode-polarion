// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Polarion } from "./polarion";

const open = require('open');

let workItems = new Map<string, string>();
let polarion: Polarion;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

  checkSettings();

  initializePolarion();


  let disposable = vscode.commands.registerCommand('vscode-polarion.clearCache', () => {
    workItems.clear();
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
    polarion = new Polarion(polarionUrl, polarionProject, polarionUsername, polarionPassword);
    await polarion.initialize();
  }
}

const decorationType = vscode.window.createTextEditorDecorationType({});

async function decorate(editor: vscode.TextEditor) {
  let prefix: string | undefined = vscode.workspace.getConfiguration('Polarion', null).get('Prefix');
  // Check if a prefix is defined
  if (prefix) {
    let decorationColor = getDecorateColor();
    let sourceCode = editor.document.getText();
    let regex = "(" + prefix + "-\\d+)";

    let decorationsArray: vscode.DecorationOptions[] = [];

    const sourceCodeArr = sourceCode.split('\n');

    //itterate over each line
    for (let line = 0; line < sourceCodeArr.length; line++) {

      let match = sourceCodeArr[line].match(regex);
      if (match !== null && match.index !== undefined) {
        let range = new vscode.Range(
          new vscode.Position(line, 200),
          new vscode.Position(line, 201)
        );
        var title = await getWorkItemText(match[0]);
        let renderOptionsDark = { after: { contentText: title, color: decorationColor, margin: '50px' } };
        let renderOptions = { light: renderOptionsDark, dark: renderOptionsDark };
        let decoration = { range, renderOptions };

        decorationsArray.push(decoration);
      }
    }
    editor.setDecorations(decorationType, decorationsArray);
  }
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
  if (!workItems.has(workItem)) {
    if (polarion.initialized) {
      await polarion.getTitleFromWorkItem(workItem).then((title: string | undefined) => {
        if (title !== undefined) {
          workItems.set(workItem, title);
        }
      });
    }
  }

  //lookup in dictrionairy
  var title = 'Not found in polarion';
  if (workItems.has(workItem)) {
    var title = workItem + ': ' + workItems.get(workItem);
  }
  return title;
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