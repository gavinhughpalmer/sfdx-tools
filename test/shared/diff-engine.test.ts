import { DiffEngine, GitError } from "../../src/shared/diff-engine";
import * as testUtils from "./test-utility";
import fileSystem = require("fs");
import { expect } from "chai";

const changedFileName = "changed.txt";
const createdFileName = "created.txt";
const deletedFileName = "deleted.txt";

const fileContents = "This is file contents";

let initialCommit: string;

async function setupRepo() {
    await testUtils.setupRepo();
    fileSystem.writeFileSync(testUtils.workingDir + changedFileName, fileContents);
    fileSystem.writeFileSync(testUtils.workingDir + deletedFileName, fileContents);
    await testUtils.repo.add(changedFileName);
    await testUtils.repo.add(deletedFileName);
    await testUtils.repo.commit("Initial Commit");
    initialCommit = await testUtils.repo.getHead();
}

beforeEach(testUtils.createWorkingDir);
afterEach(testUtils.cleardownWorkingDir);

describe("DiffEngine constructor", () => {
    context("not in a git repository", () => {
        before(testUtils.clearRepo);
        it("should throw an error", () => {
            const constructor = () => new DiffEngine(testUtils.workingDir);
            expect(constructor).to.throw(GitError, testUtils.workingDir);
        });
    });
});

describe("diff()", () => {
    beforeEach(setupRepo);
    afterEach(testUtils.clearRepo);
    context("File is modified", () => {
        it("should list the changed file", async () => {
            fileSystem.writeFileSync(testUtils.workingDir + changedFileName, fileContents + "change");
            await testUtils.repo.add(changedFileName);
            await testUtils.repo.commit("second commit");
            const secondCommit = await testUtils.repo.getHead();
            const diffEngine = new DiffEngine(testUtils.workingDir);
            const filesDiff = await diffEngine.diff(initialCommit, secondCommit);
            expect(filesDiff.modifiedFiles)
                .to.be.an("array")
                .that.does.include(changedFileName)
                .and.does.not.include(deletedFileName)
                .and.does.not.include(createdFileName);
        });
    });
    context("File is created", () => {
        it("should list the new file", async () => {
            fileSystem.writeFileSync(testUtils.workingDir + createdFileName, fileContents);
            await testUtils.repo.add(createdFileName);
            await testUtils.repo.commit("second commit");
            const secondCommit = await testUtils.repo.getHead();
            const diffEngine = new DiffEngine(testUtils.workingDir);
            const filesDiff = await diffEngine.diff(initialCommit, secondCommit);
            expect(filesDiff.modifiedFiles)
                .to.be.an("array")
                .that.does.include(createdFileName)
                .and.does.not.include(deletedFileName)
                .and.does.not.include(changedFileName);
        });
    });
    context("File is deleted", () => {
        it("should list the deleted file", async () => {
            fileSystem.unlinkSync(testUtils.workingDir + deletedFileName);
            await testUtils.repo.add(deletedFileName);
            await testUtils.repo.commit("second commit");
            const secondCommit = await testUtils.repo.getHead();
            const diffEngine = new DiffEngine(testUtils.workingDir);
            const filesDiff = await diffEngine.diff(initialCommit, secondCommit);
            expect(filesDiff.deletedFiles)
                .to.be.an("array")
                .that.does.include(deletedFileName)
                .and.does.not.include(createdFileName)
                .and.does.not.include(changedFileName);
        });
    });
});

describe("moveChangedFiles()", () => {
    context("has files to move", () => {
        //TODO
    });
});
