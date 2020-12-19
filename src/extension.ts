// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { config } from 'process';
import * as vscode from 'vscode';
import { Polarion } from "./polarion";

let workItems = new Map<string, string>();
let polarion: Polarion;
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

  checkSettings();

  initializePolarion();


  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "vscode-polarion" is now active!');

  let disposable = vscode.commands.registerCommand('polarion-decorator.clearCache', () => {
    // The code you place here will be executed every time your command is executed

    // Display a message box to the user
    workItems.clear();
    vscode.window.showInformationMessage('Cleared polarion workitem cache');
  });

  context.subscriptions.push(disposable);

  vscode.workspace.onWillSaveTextDocument(event => {
    const openEditor = vscode.window.visibleTextEditors.filter(
      editor => editor.document.uri === event.document.uri
    )[0];
    decorate(openEditor);
  });

  vscode.workspace.onDidChangeConfiguration(event => {
    let configChange = event.affectsConfiguration('Polarion');

    if (configChange) {
      checkSettings();

      initializePolarion();
    }
  });
  vscode.workspace.onDidOpenTextDocument(e => { console.log('open file: ' + e); });
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

const decorationType = vscode.window.createTextEditorDecorationType({

});

async function decorate(editor: vscode.TextEditor) {
  let decorationColor = getDecorateColor();
  let sourceCode = editor.document.getText();
  let prefix: string | undefined = vscode.workspace.getConfiguration('Polarion', null).get('Prefix');
  // let regex = /(SCB-\d+)/
  // if (!prefix) {
  //   // regex = /(SCB-\d+)/ + prefix
  //   return
  // }

  let regex = "(" + prefix + "-\\d+)";
  if (!prefix) {
    return;
  }

  let decorationsArray: vscode.DecorationOptions[] = [];

  const sourceCodeArr = sourceCode.split('\n');

  for (let line = 0; line < sourceCodeArr.length; line++) {
    let match = sourceCodeArr[line].match(regex);

    if (match !== null && match.index !== undefined) {
      let range = new vscode.Range(
        new vscode.Position(line, 200),
        new vscode.Position(line, 201)
      );


      if (!workItems.has(match[0])) {
        if (polarion.initialized) {
          await polarion.getTitleFromWorkItem(match[0]).then((title: string | undefined) => {
            if (match !== null && title !== undefined) {
              workItems.set(match[0], title);
            }
          });
        }
      }
      var title = 'Not found in polarion';
      if (workItems.has(match[0])) {
        var title = match[0] + ': ' + workItems.get(match[0]);
      }

      let renderOptionsAfter = { contentText: title, color: decorationColor, margin: '50px' }; //, textDecoration: 'margin-left: 100px',
      let renderOptionsDark = { after: renderOptionsAfter };
      let renderOptions = { light: renderOptionsDark, dark: renderOptionsDark };

      let decoration = { range, renderOptions };



      decorationsArray.push(decoration);
    }
  }


  editor.setDecorations(decorationType, decorationsArray);
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
    vscode.window.showErrorMessage(message);
  }
}