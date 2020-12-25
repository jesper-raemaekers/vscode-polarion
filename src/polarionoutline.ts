import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { findItemsInDocument } from './utils';

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
      const editor = vscode.window.activeTextEditor;
      if (editor !== undefined) {
        list = this.findWorkItemsInEditor(editor);
      }
    }
    return Promise.resolve(list);
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  private findWorkItemsInEditor(editor: vscode.TextEditor): WorkItemOutline[] {
    let list: WorkItemOutline[] = [];

    let items = findItemsInDocument(editor);

    items.forEach((range, name) => { list.push(new WorkItemOutline(name, range, vscode.TreeItemCollapsibleState.None)); });

    return list;
  }

}

class WorkItemOutline extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    // private version: string,
    public readonly range: vscode.Range,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    // this.tooltip = `${this.label}-${this.version}`;
    // this.description = this.version;
    this.range = range;
  }

  // iconPath = {
  //   light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
  //   dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
  // };
}