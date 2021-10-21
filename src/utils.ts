import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as toolCache from "@actions/tool-cache";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import { util } from "prettier";
import * as semver from "semver";

export class Utils {
  public static readonly USER_AGENT: string =
    "setup-jfrog-cli-github-action/" + require("../package.json").version;
  public static readonly BUILD_NAME: string = "build-name";
  public static readonly BUILD_NUMBER: string = "build-number";
  public static readonly BUILD_TYPE: string = "build-type";
  public static readonly RESOLVE_SERVER_ID: string = "resolve-server-id";
  public static readonly DEPLOY_SERVER_ID: string = "deploy-server-id";
  public static readonly RESOLVE_SNAPSHOT_REPO: string =
    "resolve-snapshot-repository";
  public static readonly DEPLOY_SNAPSHOT_REPO: string =
    "deploy-snapshot-Repository";
  public static readonly RESOLVE_RELEASE_REPO: string =
    "resolve-releases-repository";
  public static readonly DEPLOY_RELEASE_REPO: string =
    "deploy-releases-repository";
  public static readonly JFROG_PROJECT: string = "jfrog-project";
  public static readonly DOCKER_IMAGE: string = "docker-image";
  public static readonly DOCKER_IMAGE_TAG: string = "docker-image-tag";
  public static readonly DOCKER_REPO: string = "docker-repo";
  public static readonly HELM_REPO: string = "helm-repo";
  public static readonly BUILD_FAIL_ONSCAN: string = "build-fail-onscan";
  public static readonly PROMOTE_TO_REPO: string = "promote-to-repo";
  public static readonly PROMOTE_BUILD_NAME: string = "promote-build-name";
  public static readonly PROMOTE_BUILD_NUMBER: string = "promote-build-number";
  public static readonly PROMOTE_SOURCE_REPO: string = "promote-source-repo";

  public static setCliEnv() {
    core.exportVariable(
      "JFROG_CLI_ENV_EXCLUDE",
      "*password*;*secret*;*key*;*token*;JF_ARTIFACTORY_*"
    );
    core.exportVariable("JFROG_CLI_OFFER_CONFIG", "false");
    let buildNameEnv: string = core.getInput(Utils.BUILD_NAME);
    if (buildNameEnv) {
      core.exportVariable("JFROG_CLI_BUILD_NAME", buildNameEnv);
    }
    let buildNumberEnv: string = core.getInput(Utils.BUILD_NUMBER);
    if (buildNumberEnv) {
      core.exportVariable("JFROG_CLI_BUILD_NUMBER", buildNumberEnv);
    }
    let buildProjectEnv: string = core.getInput(Utils.JFROG_PROJECT);
    if (buildProjectEnv) {
      core.exportVariable("JFROG_CLI_BUILD_PROJECT", buildProjectEnv);
    }
    core.exportVariable(
      "JFROG_CLI_BUILD_URL",
      process.env.GITHUB_SERVER_URL +
        "/" +
        process.env.GITHUB_REPOSITORY +
        "/actions/runs/" +
        process.env.GITHUB_RUN_ID
    );
    core.exportVariable("JFROG_CLI_USER_AGENT", Utils.USER_AGENT);
  }

  public static async run() {
    let res: number = 0;
    let args: string[] = [];
    if (core.getInput(Utils.BUILD_TYPE) == "maven-build") {
      args = [
        "rt",
        "mvnc",
        "--server-id-resolve=" + core.getInput(Utils.RESOLVE_SERVER_ID),
        "--repo-resolve-releases=" + core.getInput(Utils.RESOLVE_RELEASE_REPO),
        "--repo-resolve-snapshots=" +
          core.getInput(Utils.RESOLVE_SNAPSHOT_REPO),
      ];
      res = await exec("jfrog", args);
      args = ["rt", "mvn", "clean", "install"];
      res = await exec("jfrog", args);
    }
    if (core.getInput(Utils.BUILD_TYPE) == "maven-deploy") {
      args = [
        "rt",
        "mvnc",
        "--server-id-resolve=" + core.getInput(Utils.RESOLVE_SERVER_ID),
        "--server-id-deploy=" + core.getInput(Utils.DEPLOY_SERVER_ID),
        "--repo-resolve-releases=" + core.getInput(Utils.RESOLVE_RELEASE_REPO),
        "--repo-resolve-snapshots=" +
          core.getInput(Utils.RESOLVE_SNAPSHOT_REPO),
        "--repo-deploy-releases=" + core.getInput(Utils.DEPLOY_RELEASE_REPO),
        "--repo-deploy-snapshots=" + core.getInput(Utils.DEPLOY_SNAPSHOT_REPO),
      ];
      res = await exec("jfrog", args);
      args = ["rt", "mvn", "clean", "install"];
      res = await exec("jfrog", args);

      args = ["rt", "bce"];
      res = await exec("jfrog", args);

      args = ["rt", "bag"];
      res = await exec("jfrog", args);

      args = ["rt", "bp"];
      res = await exec("jfrog", args);

      args = ["rt", "bs", "--fail=" + core.getInput(Utils.BUILD_FAIL_ONSCAN)];
      res = await exec("jfrog", args);
    }
    if (core.getInput(Utils.BUILD_TYPE) == "docker-deploy") {
      args = ["rt", "bce"];
      res = await exec("jfrog", args);

      args = ["rt", "bag"];
      res = await exec("jfrog", args);

      args = [
        "rt",
        "dp",
        core.getInput(Utils.DOCKER_IMAGE) +
          ":" +
          core.getInput(Utils.DOCKER_IMAGE_TAG),
        core.getInput(Utils.DOCKER_REPO),
      ];
      res = await exec("jfrog", args);

      args = ["rt", "bp"];
      res = await exec("jfrog", args);

      args = ["rt", "bs", "--fail=" + core.getInput(Utils.BUILD_FAIL_ONSCAN)];
      res = await exec("jfrog", args);
    }
    if (core.getInput(Utils.BUILD_TYPE) == "helm-deploy") {
      args = ["rt", "bce"];
      res = await exec("jfrog", args);

      args = ["rt", "bag"];
      res = await exec("jfrog", args);

      args = ["rt", "u", "(*).tgz", core.getInput(Utils.HELM_REPO)];
      res = await exec("jfrog", args);

      args = ["rt", "bp"];
      res = await exec("jfrog", args);

      args = ["rt", "bs", "--fail=" + core.getInput(Utils.BUILD_FAIL_ONSCAN)];
      res = await exec("jfrog", args);
    }
    if (core.getInput(Utils.BUILD_TYPE) == "promote-build") {
      args = [
        "rt",
        "bpr",
        core.getInput(Utils.PROMOTE_BUILD_NAME),
        core.getInput(Utils.PROMOTE_BUILD_NUMBER),
        core.getInput(Utils.PROMOTE_TO_REPO),
        "--project=" + core.getInput(Utils.JFROG_PROJECT),
        "--source-repo=" + core.getInput(Utils.PROMOTE_SOURCE_REPO),
        "--copy=true",
      ];
      res = await exec("jfrog", args);
    }
    if (core.getInput(Utils.BUILD_TYPE) == "promote-docker") {
      args = [
        "rt",
        "dpr",
        "--copy",
        "--source-tag=" + core.getInput(Utils.DOCKER_IMAGE_TAG),
        core.getInput(Utils.DOCKER_IMAGE),
        core.getInput(Utils.PROMOTE_SOURCE_REPO),
        core.getInput(Utils.PROMOTE_TO_REPO),
      ];
      res = await exec("jfrog", args);
    }
    if (res !== core.ExitCode.Success) {
      throw new Error("JFrog CLI exited with exit code " + res);
    }
  }
}
