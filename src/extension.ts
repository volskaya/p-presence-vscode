// Copyright (C) 2018 github.com/volskaya

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import * as vscode from "vscode";

import Presence from "./presence";
import Loader from "./loader";
import StatusBarItem from "./status_bar_item";

import { print } from "./utils";
import { setTimeout } from "timers";
import { RepoInfo } from "./interfaces/repo_info";

class Extension {
  private Presence: Presence;
  private Loader: Loader;
  private StatusBarItem: StatusBarItem;
  private pid: number;
  private disposable: vscode.Disposable;
  private shouldUpdatePath: boolean;
  private previousPath: string;

  constructor() {
    this.pid = process.pid;
    this.previousPath = "";

    // set_path automatically dispatched, upon activation
    this.shouldUpdatePath = false;

    this.StatusBarItem = new StatusBarItem();
    this.Presence = new Presence(this.pid, this.StatusBarItem);
    this.Loader = new Loader();
    this.disposable = vscode.Disposable.from(); // Empty

    this.startServer = this.startServer.bind(this);
    this.bindCommands();
  }

  public async activate(context: vscode.ExtensionContext): Promise<void> {
    console.log("Presence vscode loading… PID: " + this.pid);

    if (await this.Presence.isRunning()) {
      // If already running, proceed with subscribing callbacks
      this.subscribeCallbacks();
    } else {
      await this.Loader.launchServer();

      if (this.Loader.running && (await this.Presence.isRunning()))
        this.subscribeCallbacks();
    }
  }

  public deactivate(): void {
    this.StatusBarItem.dispose();
    this.disposable.dispose();
    this.Presence.leave();
  }

  private subscribeCallbacks(): void {
    // When vscode launches, call bufferChangeEvent to dispatch
    // "set_path", without waiting for the buffer to switch
    const buffer: vscode.TextEditor | undefined =
      vscode.window.activeTextEditor;

    if (buffer !== undefined) this.sendPathMethod(buffer);

    let subscriptions: vscode.Disposable[] = [];

    // Buffer change event
    vscode.window.onDidChangeActiveTextEditor(
      this.bufferChangeEvent,
      this,
      subscriptions
    );

    // Focus in event
    vscode.window.onDidChangeWindowState(
      this.focusChangeEvent,
      this,
      subscriptions
    );

    // Input event
    vscode.window.onDidChangeTextEditorSelection(
      this.inputEvent,
      this,
      subscriptions
    );

    // Im not sure what this is for, but it was used in vscode docs
    this.disposable = vscode.Disposable.from(...subscriptions);
  }

  // Query Presences RPC each second and wait till isRunning
  // is true, before subscribing callbacks
  private awaitServer(): void {
    setTimeout(async () => {
      if (await this.Presence.isRunning()) {
        // Once its running, subscribe callbacks
        this.subscribeCallbacks();
      } else {
        // Not running, repeat this timer and continue waiting
        this.awaitServer();
      }
    }, 1000);
  }

  private async sendPathMethod(
    editor: vscode.TextEditor
  ): Promise<RepoInfo | undefined> {
    if (this.previousPath !== editor.document.fileName) {
      this.previousPath = editor.document.fileName;

      return this.Presence.setPath(
        editor.document.fileName,
        editor.document.languageId
      );
    }
  }

  // EVENTS ----
  private async bufferChangeEvent(
    event: vscode.TextEditor | undefined
  ): Promise<void> {
    this.shouldUpdatePath = true;
  }

  private async focusChangeEvent(event: vscode.WindowState): Promise<void> {
    if (event.focused) {
      this.shouldUpdatePath = true;
    }
  }

  private async inputEvent(
    event: vscode.TextEditorSelectionChangeEvent
  ): Promise<void> {
    if (
      event.kind === vscode.TextEditorSelectionChangeKind.Keyboard &&
      this.shouldUpdatePath
    ) {
      this.shouldUpdatePath = false;

      const buffer: vscode.TextEditor | undefined =
        vscode.window.activeTextEditor;

      if (buffer !== undefined) {
        print(
          `Working on ${buffer.document.fileName}, ` +
            `language: ${buffer.document.languageId}`
        );

        await this.sendPathMethod(buffer);
      }
    }
  }

  public async startServer() {
    await vscode.window.withProgress(
      {
        cancellable: false,
        title: "Starting Presence server",
        location: vscode.ProgressLocation.Notification
      },
      async () => {
        await this.Loader.launchServer();
      }
    );
  }

  private bindCommands() {
    vscode.commands.registerCommand("start", this.startServer);
  }
}

const extension = new Extension();

export = {
  activate: (context: vscode.ExtensionContext) => extension.activate(context),
  deactivate: () => extension.deactivate()
};
