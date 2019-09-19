export interface RepoInfo {
  valid: boolean;
  name: string;
  prettyName: string;
  branch: string;
  path: string;
  hasOrigin: boolean;
  cache: {
    localCommistOnStart: number;
    aheadOfLocal: number;
    remoteCommitsOnStart: number;
    aheadOfRemote: number;
    pushedToRemote: number;
  };
}

export const REPO_INFO_TEMPLATE: RepoInfo = {
  valid: false,
  name: "",
  prettyName: "",
  branch: "",
  path: "",
  hasOrigin: false,
  cache: {
    localCommistOnStart: 0,
    aheadOfLocal: 0,
    remoteCommitsOnStart: 0,
    aheadOfRemote: 0,
    pushedToRemote: 0
  }
};
