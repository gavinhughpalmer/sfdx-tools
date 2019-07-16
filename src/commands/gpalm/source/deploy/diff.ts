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
            default: "false",
            description: messages.getMessage("includeDeleteDescription")
        }),
        checkonly: flags.string({
            char: "c",
            default: "false",
            description: "Check only deployment"
        })
    };

    protected static requiresProject = true;
    protected static requiresUsername = true;

    // TODO refactor to simplify this method
    // TODO Move the logic to happen in a temp directory rather than the users working directory
    public async run(): Promise<AnyJson> {
        let options = {
            initialCommit: this.flags.initialcommit,
            finalCommit: this.flags.finalcommit,
            modifiedFilesDir: Diff.MODIFIED_FILES_DIR,
            deletedFilesDir: Diff.DELETED_FILES_DIR,
            includeDelete: this.flags.includedelete === "true"
        };
        const results = {};
        const sfdxConfig = new SfdxConfig(".");
        try {
            const diffEngine = new DiffEngine(".");
            this.ux.log("Finding file diffs...");
            await diffEngine.moveChangedFiles(options);
            this.ux.startSpinner("Converting modified files into metadata format");
            const modifiedMdtDir = options.modifiedFilesDir + "--mdt";
            const modifiedFilesDir = options.modifiedFilesDir + "/force-app";
            const deletedFilesDir = options.deletedFilesDir + "/force-app";
            sfdxConfig.addPackageDir(modifiedFilesDir);
            if (options.includeDelete) {
                sfdxConfig.addPackageDir(deletedFilesDir);
            }
            sfdxConfig.write();
            await execute(
                // TODO -r needs to be the force-app folder will need to append this, may need to find a way to work out what folder the source is stored in, could interegate the sfdx-project.json, need to work out how to deal with multiple directories... (maybe ignore this for a phase one implementation)
                `sfdx force:source:convert -r ${modifiedFilesDir} -d ${modifiedMdtDir} --json`
            );
            this.ux.log("Modified source converted!");
            // TODO investigate: including delete throws an error at the moment
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
            
            this.ux.startSpinner("Deploying to target org...");
            // TODO should pass through parameters from parent, and allow for the output to be pushed to the console so that standard output still comes out
            let deployCommand = `sfdx force:mdapi:deploy -u ${this.org.getUsername()} -d ${modifiedMdtDir}`
            deployCommand += this.flags.checkonly === "true" ? ' -c' : '';
            const deployResult = await execute(deployCommand);
            console.log(deployResult);
            rmdir.sync(modifiedMdtDir);
            this.ux.stopSpinner("Deployed changes");
            results["message"] = "Files moved successfully";
        } catch (error) {
            this.ux.error(error);
            results["message"] = "Files have not been able to move";
        } finally {
            sfdxConfig.reset();
        }
        return results;
    }
}
