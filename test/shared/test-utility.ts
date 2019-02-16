import fileSystem = require("fs");
import * as rmdir from "rimraf";
import GitWrapper from "../../src/shared/git";

export const workingDir = "./tmp/";
export let repo: GitWrapper;

export const createWorkingDir = () => {
    if (!fileSystem.existsSync(workingDir)) {
        fileSystem.mkdirSync(workingDir);
    }
};

export async function setupRepo() {
    createWorkingDir();
    repo = new GitWrapper(workingDir);
    repo.init();
}

export const clearRepo = () => {
    cleardownWorkingDir();
    createWorkingDir();
};

export const cleardownWorkingDir = () => rmdir.sync(workingDir);
