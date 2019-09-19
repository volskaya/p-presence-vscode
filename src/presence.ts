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

import axios, { AxiosInstance } from "axios";
import { RepoInfo, REPO_INFO_TEMPLATE } from "./interfaces/repo_info";

import StatusBarItem from "./status_bar_item";

interface ParamsMethod {
  method: string;
  params: {};
}

interface OneshotMethod {
  method: string;
}

export default class Presence {
  private StatusBarItem: StatusBarItem;
  private address: string = "http://127.0.0.1:8080";
  private pid: number;
  private instance: AxiosInstance;
  private firstRun: boolean;
  private needsRefresh: boolean;
  private previousPath: string;
  private previousLanguage: string;
  private leaving: boolean = false;

  constructor(pid: number, StatusBarItem: StatusBarItem) {
    this.StatusBarItem = StatusBarItem;
    this.pid = pid;
    this.firstRun = true;
    this.needsRefresh = false;
    this.previousPath = "";
    this.previousLanguage = "";
    this.instance = axios.create({
      baseURL: this.address,
      timeout: 0,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Presence needs to be pinged inbetween every discord update
  // so let it know this client is still alive
  private startPingLoop(): void {
    setTimeout(async () => {
      try {
        console.log("Pinging emesense");
        const res: RepoInfo = await this.ping();

        this.StatusBarItem.updateStatus(res);
      } catch (error) {
        console.error(error);
      }

      console.log("Ping done, repeating");
      this.startPingLoop();
    }, 15000);
  }

  private onDisconnect(error?: string): void {
    this.StatusBarItem.showError();

    if (error) {
      console.error(error);
    }
  }

  public async isRunning(): Promise<boolean> {
    try {
      return (await this.post({ method: "is_running" })).data;
    } catch (error) {
      this.onDisconnect();
      return false;
    }
  }

  // Called only when vscode exits
  public async leave(): Promise<void> {
    this.leaving = true;

    try {
      await this.post({ method: "im_leaving" });
    } catch (error) {
      console.error(error);
    }
  }

  private async ping(): Promise<RepoInfo> {
    if (this.leaving) {
      return REPO_INFO_TEMPLATE;
    }

    try {
      if (this.needsRefresh)
        await this.setPath(this.previousPath, this.previousLanguage);

      return (await this.post({ method: "ping" })).data;
    } catch (error) {
      // If the server goes down inbetween pings, try
      // resending previous path and language, if it ever
      // comes back
      this.needsRefresh = true;
      this.onDisconnect(error);

      return REPO_INFO_TEMPLATE;
    }
  }

  // Returns RepoInfo, if path changed successfully
  public async setPath(path: string, language: string): Promise<RepoInfo> {
    if (this.leaving) {
      return REPO_INFO_TEMPLATE;
    }

    try {
      const res = await this.post({
        method: "set_path",
        params: {
          path,
          language
        }
      });

      this.previousPath = path;
      this.previousLanguage = language;
      this.needsRefresh = false;
      this.StatusBarItem.updateStatus(res.data);

      if (this.firstRun) {
        console.log("First setPath(), starting ping loop…");

        this.firstRun = false;
        this.startPingLoop();
      }

      return res.data;
    } catch (error) {
      this.onDisconnect(error);
      return REPO_INFO_TEMPLATE;
    }
  }

  // Returns the git absolute path of currently active repo
  public async getPath(): Promise<string> {
    try {
      return (await this.post({ method: "get_path" })).data;
    } catch (error) {
      this.onDisconnect(error);
      return "";
    }
  }

  public async getInfo(): Promise<RepoInfo> {
    try {
      return (await this.post({ method: "get_info" })).data;
    } catch (error) {
      this.onDisconnect(error);
      return REPO_INFO_TEMPLATE;
    }
  }

  private async post(data: OneshotMethod | ParamsMethod): Promise<any> {
    return this.instance.post("", {
      editor: "Visual Studio Code",
      id: this.pid,
      ...data
    });
  }
}
