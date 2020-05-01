import { core, SfdxCommand } from '@salesforce/command';
import { AnyJson } from '@salesforce/ts-types';
import * as glob from 'glob-promise';
import { readFileSync, renameSync, unlinkSync } from 'fs';


// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

export default class Fix extends SfdxCommand {
    public static description = 'This command is intended to convert the flow files from metadata format to the source format, that is without the version numebr in the file name and without the flow definition file. The command will delete all flow definition files and any flow files with the number in them, maintaining the active flow file';

    public static examples = [
        `$ sfdx gpalm:source:backup --targetusername myOrg@example.com
  Backup completed!
  `
    ];

    protected static requiresProject = true;
    private static flowDefinitionExtention = '.flowDefinition-meta.xml';

    public async run(): Promise<AnyJson> {
        const results = {
            deletedFiles: [],
            newFiles: []
        };

        const flowDefinitions = await glob('**/*' + Fix.flowDefinitionExtention);
        for (let flowDefinitionPath of flowDefinitions) {

            const flowDefContents = readFileSync(flowDefinitionPath, 'utf8');
            const versionNumberMatches = flowDefContents.match(/<activeVersionNumber>(\d+)<\/activeVersionNumber>/);
            const flowName = flowDefinitionPath.replace(Fix.flowDefinitionExtention, '').substring(flowDefinitionPath.lastIndexOf('/') + 1);
            const flowPathPattern = flowDefinitionPath.replace(flowName, `${flowName}-*`).replace(/flowDefinition/g, 'flow');
            if (versionNumberMatches) {
                // has an active version
                const activeFlowVersionNumber = versionNumberMatches[1];
                const activeFlowPath = flowPathPattern.replace('*', activeFlowVersionNumber);
                const newFlowPath = flowPathPattern.replace('-*', '');
                renameSync(activeFlowPath, newFlowPath);
                this.ux.log(`Active flow for ${newFlowPath}`);
                results.newFiles.push(newFlowPath);
            }
            const flowVersionsToDelete = await glob(flowPathPattern);
            for (let flowVersion of flowVersionsToDelete) {
                unlinkSync(flowVersion);
                results.deletedFiles.push(flowVersion);
            }
            unlinkSync(flowDefinitionPath);
            results.deletedFiles.push(flowDefinitionPath);
        }
        return results;
    }
}
