import { core, flags, SfdxCommand } from "@salesforce/command";
import { AnyJson } from "@salesforce/ts-types";
import { DiffEngine } from "../../../../shared/diff-engine";
import { SfdxConfig } from "../../../../shared/sfdx-config";
import { execute } from "../../../../shared/utils";
import * as rmdir from "rimraf";
import * as fileSystem from "fs";

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages("sfdx-git", "org");

export default class Diff extends SfdxCommand {
    public static description = messages.getMessage("deployDiffCommand");
    private static MODIFIED_FILES_DIR = "modified";
    private static DELETED_FILES_DIR = "deleted";

    public static examples = [
        `$ sfdx gplam:source:deploy:diff --initialcommit arqergs --finalcommit asdfw4t --targetusername myOrg@example.com
  Files moved successfully
  `
    ];

    public static args = [{ name: "file" }];

    protected static flagsConfig = {
        initialcommit: flags.string({
            char: "i",
            required: true,
            description: messages.getMessage("initialCommitDescription")
        }),
        finalcommit: flags.string({
            char: "f",
            description: messages.getMessage("finalCommitDescription")
        }),
        includedelete: flags.string({
            char: "n",
            default: "true",
            description: messages.getMessage("includeDeleteDescription")
        })
    };

    protected static requiresProject = true;
    protected static requiresUsername = true;

    // TODO refactor to simplify this method
    public async run(): Promise<AnyJson> {
        let options = {
            initialCommit: this.flags.initialcommit,
            finalCommit: this.flags.finalcommit,
            modifiedFilesDir: Diff.MODIFIED_FILES_DIR,
            deletedFilesDir: Diff.DELETED_FILES_DIR,
            includeDelete: this.flags.includedelete === "true"
        };
        const results = {};
        try {
            const diffEngine = new DiffEngine(".");
            this.ux.log("Finding file diffs...");
            await diffEngine.moveChangedFiles(options);
            this.ux.startSpinner("Converting modified files into metadata format");
            const modifiedMdtDir = options.modifiedFilesDir + "--mdt";
            const modifiedFilesDir = options.modifiedFilesDir + "/force-app";
            const deletedFilesDir = options.deletedFilesDir + "/force-app";
            const sfdxConfig = new SfdxConfig(".");
            sfdxConfig.addPackageDir(modifiedFilesDir);
            sfdxConfig.addPackageDir(deletedFilesDir);
            sfdxConfig.write();
            await execute(
                // TODO -r needs to be the force-app folder will need to append this, may need to find a way to work out what folder the source is stored in, could interegate the sfdx-project.json, need to work out how to deal with multiple directories... (maybe ignore this for a phase one implementation)
                `sfdx force:source:convert -r ${modifiedFilesDir} -d ${modifiedMdtDir} --json`
            );
            this.ux.log("Modified source converted!");
            if (options.includeDelete) {
                this.ux.log("Converting deleted files into metadata format");
                const deletedMdtDir = options.deletedFilesDir + "--mdt";
                await execute(
                    // TODO -r needs to be the force-app folder will need to append this, may need to find a way to work out what folder the source is stored in, could interegate the sfdx-project.json, need to work out how to deal with multiple directories... (maybe ignore this for a phase one implementation)
                    `sfdx force:source:convert -r ${deletedFilesDir} -d ${deletedMdtDir} --json`
                );
                rmdir.sync(options.deletedFilesDir);
                fileSystem.copyFileSync(`${deletedMdtDir}/package.xml`, `${modifiedMdtDir}/destructiveChangesPost.xml`);
                fileSystem.unlinkSync(`${deletedMdtDir}/package.xml`);

                // TODO delete old package then copy all the files into the modified dir
                rmdir.sync(deletedMdtDir);
                this.ux.log("Deleted source converted!");
            }
            this.ux.stopSpinner();
            rmdir.sync(options.modifiedFilesDir);
            sfdxConfig.reset();
            this.ux.startSpinner("Deploying to target org...");
            // TODO should pass through parameters from parent
            const retrieveResult = await execute(
                `SFDX force:mdapi:retrieve -u ${this.org.getUsername()} -d ${modifiedMdtDir}`
            );
            console.log(retrieveResult);
            this.ux.stopSpinner("Deployed changes");
            // const retrieveResult = await exec(`sfdx force:mdapi:retrieve -s -k ${pkgDir}/package.xml -r ./${tmpDir} -w 30 -u ${this.org.getUsername()}`, { maxBuffer: 1000000 * 1024 });
            results["message"] = "Files moved successfully";
        } catch (error) {
            this.ux.error(error.getMessage());
            results["message"] = "Files have not been able to move";
        }
        return results;
    }
}
