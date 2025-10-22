import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as utils from './utils';
import * as pol from './polarion';

export class PolarionOutlinesProvider implements vscode.TreeDataProvider<OutlineItem> {

  private _onDidChangeTreeData: vscode.EventEmitter<OutlineItem | undefined | null | void> = new vscode.EventEmitter<OutlineItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<OutlineItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private workspaceRoot: readonly vscode.WorkspaceFolder[] | undefined) {
    vscode.commands.registerCommand('polarion.clickOutline', (node: OutlineItem) => vscode.window.showInformationMessage(`Successfully called edit entry on ${node.label}.`));
  }

  getTreeItem(element: OutlineItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label, element.collapsibleState);
    
    if (element.type === 'workitem') {
      item.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
      item.contextValue = 'workitem';
      
      // Remove external link icon from top level workitems
      item.iconPath = new vscode.ThemeIcon('symbol-class');
      
      // Add command to reveal line when clicked
      item.command = { 
        title: '', 
        command: 'revealLine', 
        arguments: [{ lineNumber: element.range?.start.line, at: 'top' }] 
      };
    } else if (element.type === 'description') {
      item.iconPath = new vscode.ThemeIcon('note');
      // Show HTML content in tooltip - data is already sanitized from polarion.ts
      if (element.htmlContent) {
        item.tooltip = new vscode.MarkdownString(element.htmlContent, true);
        item.tooltip.supportHtml = true;
      }
    } else if (element.type === 'detail') {
      item.iconPath = new vscode.ThemeIcon('info');
    } else if (element.type === 'external-link') {
      item.iconPath = new vscode.ThemeIcon('link-external');
      item.command = {
        command: 'vscode-polarion.openWorkItemFromOutline',
        title: 'Open in Polarion',
        arguments: [element.workItemId]
      };
    }

    return item;
  }

  async getChildren(element?: OutlineItem): Promise<OutlineItem[]> {
    if (!this.workspaceRoot) {
      return Promise.resolve([]);
    }

    if (!element) {
      // Return root level items (workitems found in current document)
      const editor = vscode.window.activeTextEditor;
      if (editor !== undefined) {
        return this.findWorkItemsInEditor(editor);
      }
      return [];
    } else if (element.type === 'workitem' && element.workItemId) {
      // Return detailed children for workitem
      return this.getWorkItemDetails(element.workItemId);
    }
    return [];
  }

  private async getWorkItemDetails(workItemId: string): Promise<OutlineItem[]> {
    try {
      const workItem = await pol.polarion.getWorkItem(workItemId);
      if (!workItem) return [];

      const details: OutlineItem[] = [];

      // Add external link as first item
      details.push(new OutlineItem(
        'Open in Polarion',
        vscode.TreeItemCollapsibleState.None,
        'external-link',
        undefined,
        workItemId
      ));

      // Add description as inline text (strip HTML for display)
      if (workItem.description?.content) {
        const cleanDescription = this.stripHtmlTags(workItem.description.content);
        // Truncate long descriptions and show first few lines
        const truncatedDescription = this.truncateDescription(cleanDescription);
        
        // Process images in the HTML content for the tooltip
        const processedHtmlContent = await utils.preprocessWorkitemDescription(workItem.description.content, workItem);
        
        details.push(new OutlineItem(
          truncatedDescription,
          vscode.TreeItemCollapsibleState.None,
          'description',
          undefined,
          undefined,
          processedHtmlContent
        ));
      }

      // Add other details - data is already sanitized from polarion.ts
      if (workItem.status?.id) {
        // Build status text with icon if available
        let statusText = workItem.status?.name || workItem.status.id;
        let statusItem = new OutlineItem(
          `Status: ${statusText}`,
          vscode.TreeItemCollapsibleState.None,
          'detail'
        );
        
        // Set icon if available
        if (workItem.status?.iconPath) {
          statusItem.iconPath = vscode.Uri.parse(workItem.status.iconPath);
        }
        
        details.push(statusItem);
      }

      if (workItem.author?.id) {
        // Build author text using shared function
        const authorText = utils.buildAuthorDisplayText(workItem.author);
        
        details.push(new OutlineItem(
          `Author: ${authorText}`,
          vscode.TreeItemCollapsibleState.None,
          'detail'
        ));
      }

      if (workItem.type?.id) {
        // Build workitem type text with icon if available
        let typeText = workItem.type?.name || workItem.type.id;
        let typeItem = new OutlineItem(
          `Type: ${typeText}`,
          vscode.TreeItemCollapsibleState.None,
          'detail'
        );
        
        // Set icon if available
        if (workItem.type?.iconPath) {
          typeItem.iconPath = vscode.Uri.parse(workItem.type.iconPath);
        }
        
        details.push(typeItem);
      }

      if (workItem.project?.id) {
        details.push(new OutlineItem(
          `Project: ${workItem.project.id}`,
          vscode.TreeItemCollapsibleState.None,
          'detail'
        ));
      }

      return details;
    } catch (error) {
      return [];
    }
  }

  private stripHtmlTags(html: string): string {
    // Simple HTML tag removal - replace with text content
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&lt;/g, '<') // Replace HTML entities
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();
  }

  private truncateDescription(text: string): string {
    const maxLength = 100;
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const firstLine = lines[0] || '';
    
    if (firstLine.length <= maxLength) {
      return firstLine;
    } else {
      return firstLine.substring(0, maxLength) + '...';
    }
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  private async findWorkItemsInEditor(editor: vscode.TextEditor): Promise<OutlineItem[]> {
    let items = utils.listItemsInDocument(editor);
    const resultList: OutlineItem[] = [];

    // Process each workitem
    for (const obj of items) {
      try {
        // Only fetch if polarion is initialized
        if (pol.polarion && pol.polarion.initialized) {
          const workItem = await pol.polarion.getWorkItem(obj.name);
          const displayLabel = workItem && workItem.title 
            ? `${obj.name}: ${workItem.title}`
            : obj.name;
          
          resultList.push(new OutlineItem(
            displayLabel, 
            vscode.TreeItemCollapsibleState.Collapsed,
            'workitem',
            obj.range,
            obj.name
          ));
        } else {
          // If polarion is not initialized, just show the workitem ID
          resultList.push(new OutlineItem(
            `${obj.name} (Polarion not connected)`, 
            vscode.TreeItemCollapsibleState.Collapsed,
            'workitem',
            obj.range,
            obj.name
          ));
        }
      } catch (error) {
        // Fallback to just workitem ID if title fetch fails
        console.log(`Failed to fetch title for ${obj.name}:`, error);
        resultList.push(new OutlineItem(
          `${obj.name} (Title unavailable)`, 
          vscode.TreeItemCollapsibleState.Collapsed,
          'workitem',
          obj.range,
          obj.name
        ));
      }
    }

    return resultList;
  }
}

class OutlineItem {
  public iconPath?: vscode.Uri | vscode.ThemeIcon;
  
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type: string = '',
    public readonly range?: vscode.Range,
    public readonly workItemId?: string,
    public readonly htmlContent?: string
  ) {}
}