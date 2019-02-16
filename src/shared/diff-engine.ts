import * as fileSystem from "fs";
import * as path from "path";
import GitWrapper from "./git";

interface ChangedFileOptions {
    modifiedFilesDir: string;
    deletedFilesDir: string;
    initialCommit: string;
    finalCommit?: string;
    includeDelete: boolean;
}
export interface FilesDiff {
    modifiedFiles: string[];
    deletedFiles: string[];
}

export class GitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "GitError";
    }
}

export class DiffEngine {
    private repo: GitWrapper;
    private repositoryPath: string;

    // TODO Change to dependancy injection so that I can test this without creating all the git repos and stuff
    constructor(repositoryPath: string) {
        this.repositoryPath = repositoryPath;
        this.repo = new GitWrapper(repositoryPath);
        this.validateRepo();
    }

    private validateRepo(): void {
        if (!this.repo.isValidRepo()) {
            throw new GitError('The path "' + this.repositoryPath + '" is not a git repository');
        }
    }

    public async diff(initialCommit: string, finalCommit: string): Promise<FilesDiff> {
        finalCommit = finalCommit || (await this.repo.getHead());
        let modifiedFiles = [];
        let deletedFiles = [];
        const diffString = await this.repo.diff(["--no-renames", "--name-status", initialCommit, finalCommit]);
        const fileLines = diffString.split("\n");
        modifiedFiles = fileLines.filter(this.isNotDeletedFile).map(this.stripFileStatus);
        deletedFiles = fileLines.filter(this.isDeletedFile).map(this.stripFileStatus);
        return { modifiedFiles: modifiedFiles, deletedFiles: deletedFiles };
    }

    private isDeletedFile = (fileName: string) => fileName.startsWith("D");
    private isNotDeletedFile = (fileName: string) => fileName && !this.isDeletedFile(fileName);
    private stripFileStatus = (fileName: string) => fileName.replace(/^\w\d*\s+/, "");

    public async moveChangedFiles(options: ChangedFileOptions): Promise<void> {
        const head = await this.repo.getHead();
        const finalCommit = options.finalCommit || head;
        const finalCommitIsNotHead = finalCommit !== head;
        try {
            if (finalCommitIsNotHead) {
                await this.repo.checkout(finalCommit);
            }
            const filesDiff = await this.diff(options.initialCommit, finalCommit);
            this.moveFiles(options.modifiedFilesDir, filesDiff.modifiedFiles);
            if (options.includeDelete) {
                await this.repo.checkout(options.initialCommit);
                this.moveFiles(options.deletedFilesDir, filesDiff.deletedFiles);
            }
        } catch (error) {
            throw error;
        } finally {
            if (finalCommitIsNotHead || options.includeDelete) {
                await this.repo.checkout("-");
            }
        }
    }

    private moveFiles(toDir: string, fileNames: string[]): void {
        const filesMover = new FilesMover(toDir, this.repositoryPath);
        fileNames.forEach(fileName => {
            filesMover.moveFile(fileName);
        });
    }
}

class FilesMover {
    private static META_SUFFIX = "-meta.xml";

    private toDir: string;
    private fromDir: string;
    private movedFiles = new Set<string>();

    constructor(toDir: string, fromDir: string) {
        this.toDir = this.makePath(toDir);
        this.fromDir = this.makePath(fromDir);
    }

    public moveFile(fileToMove: string): void {
        if (!this.movedFiles.has(fileToMove)) {
            const oldPath = this.fromDir + fileToMove;
            const newPath = this.toDir + fileToMove;
            this.mkFullDir(newPath);
            fileSystem.copyFileSync(oldPath, newPath);
            this.movedFiles.add(fileToMove);
            const isMetaFile = fileToMove.endsWith(FilesMover.META_SUFFIX);
            const fileName = fileToMove.substring(0, fileToMove.indexOf(FilesMover.META_SUFFIX));
            const hasMetaFile = fileSystem.existsSync(oldPath + FilesMover.META_SUFFIX);
            if (isMetaFile && fileSystem.existsSync(this.toDir + fileName)) {
                this.moveFile(fileName);
            } else if (hasMetaFile) {
                this.moveFile(fileToMove + FilesMover.META_SUFFIX);
            }
        }
    }

    private makePath = (dirName: string): string => (dirName.endsWith("/") ? dirName : dirName + "/");

    private mkFullDir(filePath: string): void {
        const fullDir = path.dirname(filePath);
        if (!fileSystem.existsSync(fullDir)) {
            this.mkdirRecursive(fullDir);
        }
    }

    private mkdirRecursive(dirPath: string): void {
        dirPath = dirPath.replace(/^\/+|\/+$/g, ""); // trim "/"
        const dirs = dirPath.split("/");
        dirs.reduce((fullPath, currentDir) => {
            fullPath += "/" + currentDir;
            if (!fileSystem.existsSync(fullPath)) {
                fileSystem.mkdirSync(fullPath);
            }
            return fullPath;
        }, ".");
    }
}
