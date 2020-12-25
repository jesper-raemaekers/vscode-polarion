import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class PolarionOutlinesProvider implements vscode.TreeDataProvider<WorkItemOutline> {

  private _onDidChangeTreeData: vscode.EventEmitter<WorkItemOutline | undefined | null | void> = new vscode.EventEmitter<WorkItemOutline | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<WorkItemOutline | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private workspaceRoot: readonly vscode.WorkspaceFolder[] | undefined) { }

  getTreeItem(element: WorkItemOutline): vscode.TreeItem {
    return element;
  }

  getChildren(element?: WorkItemOutline): Thenable<WorkItemOutline[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage('No dependency in empty workspace');
      return Promise.resolve([]);
    }

    let list: WorkItemOutline[] = [];
    if (!element) {
      list.push(new WorkItemOutline('test', vscode.TreeItemCollapsibleState.None));
    }
    return Promise.resolve(list);
  }

  refresh() {
    //do something
    this._onDidChangeTreeData.fire();
  }

  private findWorkItemsInEditor(editor: vscode.TextEditor): WorkItemOutline[] {
    let list: WorkItemOutline[] = [];

    // let prefix: string | undefined = vscode.workspace.getConfiguration('Polarion', null).get('Prefix');
    // // Check if a prefix is defined
    // if (prefix) {
    //   let sourceCode = editor.document.getText();
    //   let re = RegExp("(" + prefix + "-\\d+)", 'g');
    //   var m;
    //   let matches = new Map<string, vscode.Range>();
    //   do {
    //     m = re.exec(sourceCode);
    //     if (m) {
    //       matches.set(m[0], new vscode.Range(new vscode.Position(position.line, m.index), new vscode.Position(position.line, m.index + m[0].length)));
    //     }
    //   } while (m);

    //   matches.forEach(async (value: vscode.Range, key: string, map: Map<string, vscode.Range>) => {
    //     if (matches.size === 1) {
    //       open(await polarion.getUrlFromWorkItem(key));
    //     }
    //     else if (matches.size > 1) {
    //       //check if cursor is in range
    //       if (value.contains(new vscode.Position(position.line, position.character))) {
    //         open(await polarion.getUrlFromWorkItem(key));
    //       }
    //     }
    //   });
    // }

    return list;
  }

}

class WorkItemOutline extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    // private version: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    // this.tooltip = `${this.label}-${this.version}`;
    // this.description = this.version;
  }

  // iconPath = {
  //   light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
  //   dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
  // };
}