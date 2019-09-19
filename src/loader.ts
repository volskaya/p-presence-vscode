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
import * as Fs from "fs";
import * as Path from "path";
import * as ChildProcess from "child_process";

import Axios from "axios";

function fileExists(path: string): Promise<boolean> {
  return new Promise((resolve, reject) =>
    Fs.stat(path, (error, res) => {
      if (error) reject(error);
      else resolve(res);
    })
  )
    .then(() => true)
    .catch(() => false);
}

function writeFile(path: string, data: any): Promise<boolean> {
  return new Promise((resolve, reject) =>
    Fs.writeFile(path, data, error => {
      if (error) reject(error);
      else resolve();
    })
  )
    .then(() => true)
    .catch(() => false);
}

function spawn(path: string, args: string[]): Promise<number | undefined> {
  return new Promise((resolve, reject) => {
    const process = ChildProcess.spawn(path, args, {
      detached: true,
      shell: false,
      stdio: "ignore"
    });

    process.unref();

    if (process.pid) resolve(process.pid);
    else reject();
  });
}

export default class Loader {
  private onUnix: boolean = false;
  private executableExists: boolean = false;
  private executableName: string;
  private extensionPath: string = Path.dirname(__dirname);
  private binPath: string = Path.join(this.extensionPath, "bin");
  private serverPath: string;
  public running: boolean = false;
  public pid?: number;

  constructor() {
    this.onUnix = this.isRunningOnUnix();
    this.executableName = this.onUnix ? "presence" : "presence.exe";
    this.serverPath = Path.join(this.binPath, this.executableName);

    console.log(this.serverPath);

    this.downloadServer = this.downloadServer.bind(this);
  }

  private isRunningOnUnix(): boolean {
    switch (process.platform) {
      case "darwin":
      case "linux":
        return true;
      default:
        return false;
    }
  }

  public async launchServer(): Promise<void> {
    this.executableExists = await fileExists(this.serverPath);

    if (this.executableExists) {
      console.log("Launching Presence server from " + this.serverPath);

      await this.runServerProcess();
    } else {
      console.log("Presence executable not found");

      const agreeWithDownload =
        (await vscode.window.showWarningMessage(
          "Presence server was not found.\n" + "Download it from github?",
          "Download"
        )) === "Download";

      if (!agreeWithDownload) return; // Don't proceed with the download

      this.askToDownload();
    }
  }

  private async runServerProcess(): Promise<void> {
    try {
      this.pid = await spawn(this.serverPath, []);
      this.running = true;

      console.log("Presence spawned");
    } catch (error) {
      console.error(error);
    }
  }

  async askToDownload(): Promise<void> {
    try {
      await this.downloadServer();
      this.launchServer();
    } catch (error) {
      console.error(error);

      // Ask to retry download
      const retry =
        (await vscode.window.showErrorMessage(
          "Presence download failed!",
          "Retry"
        )) === "Retry";

      if (retry) this.askToDownload();
    }
  }

  // Fetch executable from upstream repository
  private async downloadServer(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      await vscode.window.withProgress(
        {
          cancellable: false,
          title:
            "Downloading presence from https://github.com/volskaya/presence",
          location: vscode.ProgressLocation.Notification
        },
        async () => {
          try {
            const res = await Axios.get(
              "https://github.com/volskaya/presence/raw/master/bin/" +
                this.executableName,
              { responseType: "arraybuffer" }
            );

            if (res.status === 200) {
              await writeFile(this.serverPath, res.data);
              console.log("Presence server downloaded");
              resolve();
            } else {
              reject();
            }
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }
}
