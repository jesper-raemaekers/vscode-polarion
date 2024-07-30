import * as vscode from 'vscode';
import * as pol from './polarion';
import { PolarionOutlinesProvider } from './polarionoutline';
import { PolarionStatus } from './status';
import * as editor from './editor';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as validator from 'jsonschema';

export function mapItemsInDocument(editor: vscode.TextEditor): Map<string, vscode.Range[]> {
  let result: Map<string, vscode.Range[]> = new Map<string, vscode.Range[]>();
  let prefix: string | undefined = vscode.workspace.getConfiguration('Polarion', null).get('Prefix');

  // Check if a prefix is defined
  let sourceCode = editor.document.getText();
  let regex = RegExp("([A-Z]{3,5}-\\d+)", 'g');
  if (prefix) {
    regex = RegExp("(" + prefix + "-\\d+)", 'g');
  }
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
  let missingConfiguration: Array<String> = new Array<String>();

  if (vscode.workspace.getConfiguration('Polarion', null).get('Url') === "") {
    missingConfiguration.push('Url');
  }

  if (vscode.workspace.getConfiguration('Polarion', null).get('Project') === "") {
    missingConfiguration.push('Project');
  }
  if (vscode.workspace.getConfiguration('Polarion', null).get('Prefix') === "") {
    missingConfiguration.push('Prefix');
  }

  let fileConfig = getPolarionConfigFromFile();
  if (!fileConfig) {
    //Do not check for user and password if a polarion config file is present
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

export function getPolarionConfigFromFile(): { username: string, password: string } | undefined {
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