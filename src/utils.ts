import * as vscode from 'vscode';

export function findItemsInDocument(editor: vscode.TextEditor): Map<string, vscode.Range> {
  let result: Map<string, vscode.Range> = new Map<string, vscode.Range>();
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
          result.set(m[0], new vscode.Range(new vscode.Position(line, m.index), new vscode.Position(line, m.index + m[0].length)));
        }
      } while (m);
    }
  }
  return result;
}