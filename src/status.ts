import * as vscode from 'vscode';
import { Polarion } from "./polarion";

export class PolarionStatus {
  barItem: vscode.StatusBarItem;
  updating: boolean;
  workItems: Map<string, string> | undefined;
  intervalId: NodeJS.Timeout | undefined;
  polarion: Polarion | undefined;


  constructor(statusBarItem: vscode.StatusBarItem) {
    this.barItem = statusBarItem;
    this.updating = false;
    this.workItems = undefined;
  }

  update(polarion: Polarion | undefined) {
    this.polarion = polarion;
    this.updateStatusBarItem();
  }

  startUpdate(polarion: Polarion | undefined, workItems: Map<string, string>) {
    this.updating = true;
    this.workItems = workItems;
    this.polarion = polarion;

    this.updateStatusBarItem();
    this.intervalId = setInterval(() => { this.updateStatusBarItem(); }, 500);
  }

  endUpdate() {
    this.updating = false;
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
    }
    this.updateStatusBarItem();
  }

  private updateStatusBarItem(): void {
    this.barItem.show();
    if (this.polarion !== undefined) {
      if (this.polarion.initialized === false) {
        if (this.polarion.lastMessage !== undefined) {
          this.barItem.text = `$(alert) ${this.polarion.lastMessage}`;
        }
        else {
          this.barItem.text = `$(alert) Polarion not initialized`;
        }
      }
      else {
        if (this.updating === true) {
          this.barItem.text = `$(sync) Updating document (cache: ${this.workItems?.size})`;
        }
        else {
          this.barItem.text = `$(check) ${this.polarion.lastMessage}`;
        }
      }
    }
    else {
      this.barItem.text = `$(alert) Polarion not initialized`;
    }
  }
}
