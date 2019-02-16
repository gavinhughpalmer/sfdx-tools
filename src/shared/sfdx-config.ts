import * as fileSystem from "fs";
// import path = require("path");

export interface PackageDir {
    path: string;
    default: boolean;
}

export interface Plugins {
    gpalmer: PermissionSets;
}

export interface PermissionSets {
    permissionSets: Set<string>;
}

export interface SfdxProject {
    packageDirectories: PackageDir[];
    namespace: string;
    sfdcLoginUrl: string;
    sourceApiVersion: string;
    plugins?: Plugins;
}

export class SfdxConfig {
    private static CONFIG_FILE_NAME = "sfdx-project.json";

    private config: SfdxProject;
    readonly initialConfigContents: string;
    private configPath: string;

    public constructor(dir: string) {
        this.configPath = `${dir}/${SfdxConfig.CONFIG_FILE_NAME}`;
        this.initialConfigContents = fileSystem.readFileSync(this.configPath, "ascii");
        this.config = JSON.parse(this.initialConfigContents);
    }

    public addPackageDir(newDir: string): void {
        this.config.packageDirectories.push({ path: newDir, default: false });
    }

    public rmPackageDir(oldDir: string): void {
        for (let index = 0; index < this.config.packageDirectories.length; index++) {
            if (this.config.packageDirectories[index].path === oldDir) {
                this.config.packageDirectories.splice(index, 1);
                return;
            }
        }
    }

    public write(): void {
        fileSystem.writeFileSync(this.configPath, this.toString());
    }

    public reset(): void {
        fileSystem.writeFileSync(this.configPath, this.initialConfigContents);
    }

    public toString(): string {
        return JSON.stringify(this.config);
    }
}
