import * as vscode from "vscode";
import { RepoInfo } from "./interfaces/repo_info";

export default class StatusBarItem {
  private item: vscode.StatusBarItem;
  private foreground: vscode.ThemeColor;
  private alert: vscode.ThemeColor;

  constructor() {
    this.foreground = new vscode.ThemeColor("statusBar.foreground");
    this.alert = new vscode.ThemeColor("errorForeground");

    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      0
    );

    this.item.text = "Presence";
    this.item.tooltip = "Discord Presence";
    this.item.show();
  }

  public updateStatus(repo: RepoInfo): void {
    // Status bar message, something like "Presence: Pushed 3 of 5"
    const a: string = "Presence: ";
    let statusBarString: string;

    this.item.command = "";
    this.item.color = this.foreground;
    this.item.tooltip = "";

    if (repo.valid) {
      statusBarString = "Working on " + repo.prettyName;

      if (repo.hasOrigin) {
        if (repo.cache.pushedToRemote > 0) {
          statusBarString =
            "Pushed " +
            repo.cache.pushedToRemote +
            " of " +
            repo.cache.aheadOfRemote;
        } else if (repo.cache.aheadOfRemote > 0) {
          statusBarString = `Ahead by ${repo.cache.aheadOfRemote}`;
        } else if (repo.cache.aheadOfRemote < 0) {
          statusBarString = `Behind by ${repo.cache.aheadOfRemote}`;
        }
      } else {
        if (repo.cache.aheadOfLocal > 0) {
          statusBarString = `Ahead by ${repo.cache.aheadOfLocal}`;
        } else if (repo.cache.aheadOfLocal < 0) {
          statusBarString = `Behind by ${repo.cache.aheadOfLocal}`;
        }
      }
    } else {
      statusBarString = "Not in a git repository";
      this.item.tooltip = 'Assuming "Working on something private"';
    }

    this.item.text = a + statusBarString;
  }

  public showError(): void {
    this.item.color = this.alert;
    this.item.text = "Presence offline";
    this.item.tooltip = "Server offline, click to start it…";
    this.item.command = "start";
  }

  public dispose(): void {
    this.item.dispose();
  }
}
