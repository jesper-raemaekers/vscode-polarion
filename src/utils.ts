import * as vscode from 'vscode';

export function mapItemsInDocument(editor: vscode.TextEditor): Map<string, vscode.Range[]> {
  let result: Map<string, vscode.Range[]> = new Map<string, vscode.Range[]>();
  let prefix: string | undefined = vscode.workspace.getConfiguration('Polarion', null).get('Prefix');

  // Check if a prefix is defined
  if (prefix) {
    let sourceCode = editor.document.getText();
    let regex = RegExp("(" + prefix + "-\\d+)", 'g');

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
  }
  return result;
}


export function listItemsInDocument(editor: vscode.TextEditor): any[] {
  let result: any[] = [];
  let prefix: string | undefined = vscode.workspace.getConfiguration('Polarion', null).get('Prefix');

  // Check if a prefix is defined
  if (prefix) {
    let sourceCode = editor.document.getText();
    let regex = RegExp("(" + prefix + "-\\d+)", 'g');

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
  }
  return result;
}

export function checkSettings() {
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

