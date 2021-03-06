import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as utils from './utils';

export class PolarionOutlinesProvider implements vscode.TreeDataProvider<WorkItemOutline> {

  private _onDidChangeTreeData: vscode.EventEmitter<WorkItemOutline | undefined | null | void> = new vscode.EventEmitter<WorkItemOutline | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<WorkItemOutline | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private workspaceRoot: readonly vscode.WorkspaceFolder[] | undefined) {
    vscode.commands.registerCommand('polarion.clickOutline', (node: WorkItemOutline) => vscode.window.showInformationMessage(`Successfully called edit entry on ${node.label}.`));
  }

  getTreeItem(element: WorkItemOutline): vscode.TreeItem {
    return element;

  }

  getChildren(element?: WorkItemOutline): Thenable<WorkItemOutline[]> {
    if (!this.workspaceRoot) {
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
    let items = utils.listItemsInDocument(editor);

    items.forEach((obj, index) => {
      list.push(new WorkItemOutline(obj.name, obj.range, vscode.TreeItemCollapsibleState.None));
    });

    return list;
  }

}

class WorkItemOutline extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly range: vscode.Range,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super(label, collapsibleState);
    this.command = { title: '', command: 'revealLine', arguments: [{ lineNumber: range.start.line, at: 'top' }] };
    this.range = range;
  }
}