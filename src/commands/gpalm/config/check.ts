import { core, SfdxCommand } from '@salesforce/command';
import * as fs from 'fs';
import * as glob from 'fast-glob';

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// TODO Refactoring and test classes...

interface FileError {
    filePath: string,
    errorMessage: string
}

export default class Check extends SfdxCommand {

    public static description = 'This command will perform a full backup of a given orgs metadata, simply provide the org and a full backup of metadata will be pulled into provided project folder';

    public static examples = [
        `$ sfdx gpalm:source:backup --targetusername myOrg@example.com
  Backup completed!
  `
    ];

    protected static flagsConfig = {};
    protected static requiresUsername = false;
    protected static supportsDevhubUsername = false;
    protected static requiresProject = true;

    public async run(): Promise<Array<FileError>> {
        const fileErrors : Array<FileError> = [];
        const flowFilePaths = await glob(['force-app/**/*.flow-meta.xml']);

        const processBuilderObjects = new Set();
        for (let flowFilePath of flowFilePaths) {
            const flowContents = fs.readFileSync(flowFilePath, 'utf8');
            const isProcessBuilder = flowContents.includes('<processType>Workflow</processType>');
            if (isProcessBuilder && !flowFilePath.includes('_Handler')) {
                fileErrors.push({filePath: flowFilePath, errorMessage: 'The process builder does not follow the naming convention'});
            }
            const matches = flowContents.match(/<name>ObjectType<\/name>\s*<value>\s*<stringValue>(\w*)<\/stringValue>/);
            if (matches && matches[1]) {
                const objectName = matches[1].toLowerCase();
                if (processBuilderObjects.has(objectName)) {
                    fileErrors.push({filePath: flowFilePath, errorMessage: 'There are multiple process builders for the objet ' + objectName});
                }
                processBuilderObjects.add(objectName);
            }
            const skipProcess = '$Setup.Configuration__c.Are_Processes_Off__c';
            // TODO could check that the initial node is setup correctly
            if (isProcessBuilder && !flowContents.includes(skipProcess)) {
                fileErrors.push({filePath: flowFilePath, errorMessage: 'The process builder does not include the line ' + skipProcess});
            }
        }

        const metadataFilesWithDescriptions = await glob([
            'force-app/**/*__c.object-meta.xml',
            'force-app/**/*__c.field-meta.xml',
            'force-app/**/*.permissionset-meta.xml',
            'force-app/**/*.validationRule-meta.xml',
            'force-app/**/*.duplicateRule-meta.xml',
            'force-app/**/*.quickAction-meta.xml'
        ]);
        console.log(metadataFilesWithDescriptions);
        for (let metaFilePath of metadataFilesWithDescriptions) {
            if (metaFilePath.match(/.*__[a-zA-Z0-9]*__c.*/)) {
                console.log(metaFilePath);
            }
            const metaFileContents = fs.readFileSync(metaFilePath, 'utf8');
            if (!metaFileContents.match(/<description>.*<\/description>/)) {
                fileErrors.push({filePath: metaFilePath, errorMessage: 'The file does not include a description'});
            }
        }
        // TODO what should be returned...
        // console.log(fileErrors);
        return fileErrors;
    }
}
