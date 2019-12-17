import { core, flags, SfdxCommand } from '@salesforce/command';
import * as fs from 'fs';
import * as glob from 'fast-glob';
import { FlowScanner } from '../../../scanner/metadataScanner';

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

    protected static flagsConfig = {
        // TODO add flag for adding additional types to ignore
        targetdir: flags.string({ char: 'd', description: 'The directory that should be targeted for the check of configuration', default: 'force-app' })
    };
    protected static requiresUsername = false;
    protected static supportsDevhubUsername = false;
    protected static requiresProject = true;

    public async run(): Promise<Array<FileError>> {
        const fileErrors : Array<FileError> = [];
        const targetDir = this.flags.targetdir;
        const flowScanner = new FlowScanner(targetDir);
        const flowErrors = await flowScanner.run();
        fileErrors.push(... flowErrors);

        const metadataFilesWithDescriptions = await glob([
            targetDir + '/**/*__c.object-meta.xml',
            targetDir + '/**/*__c.field-meta.xml',
            targetDir + '/**/*.permissionset-meta.xml',
            targetDir + '/**/*.validationRule-meta.xml',
            targetDir + '/**/*.duplicateRule-meta.xml',
            targetDir + '/**/*.quickAction-meta.xml'
        ]);
        for (let metaFilePath of metadataFilesWithDescriptions) {
            const isNotManagedMetadata = !metaFilePath.match(/[\w\d]+__[\w\d]+__c.\w+-meta\.xml/);
            const metaFileContents = fs.readFileSync(metaFilePath, 'utf8');
            if (isNotManagedMetadata && !metaFileContents.match(/<description>[^]*<\/description>/)) {
                fileErrors.push({filePath: metaFilePath, errorMessage: 'The file does not include a description'});
            }
        }

        const metaFilesWithFormulas = await glob([
            targetDir + '/**/*__c.field-meta.xml',
            targetDir + '/**/*.flow-meta.xml',
            targetDir + '/**/*.workflow-meta.xml',
            targetDir + '/**/*.approvalProcess-meta.xml'
        ]);
        // <formulas><expression>
        for (let metaFilePath of metaFilesWithFormulas) {
            const isNotManagedMetadata = !metaFilePath.match(/[\w\d]+__[\w\d]+__c.\w+-meta\.xml/);
            const metaFileContents = fs.readFileSync(metaFilePath, 'utf8');
            if (isNotManagedMetadata && metaFileContents.match(/<formula>[^]+=\s*(false|true)[^]*<\/formula>/i)) {
                fileErrors.push({filePath: metaFilePath, errorMessage: 'The formula contains a comparison of a checkbox (boolean) to the keyword true or false, this is unnessisary as the boolean itself can be used'});
            }
        }

        const validationMetaFiles = await glob([targetDir + '/**/*.validationRule-meta.xml']);
        for (let metaFilePath of validationMetaFiles) {
            const isNotManagedMetadata = !metaFilePath.match(/[\w\d]+__[\w\d]+__c.\w+-meta\.xml/);
            const metaFileContents = fs.readFileSync(metaFilePath, 'utf8');
            if (isNotManagedMetadata && metaFileContents.match(/<errorConditionFormula>[^]+=\s*(false|true)[^]*<\/errorConditionFormula>/i)) {
                fileErrors.push({filePath: metaFilePath, errorMessage: 'The validation formula contains a comparison of a checkbox (boolean) to the keyword true or false, this is unnessisary as the boolean itself can be used'});
            }

            const skipValidations = 'NOT($Setup.Configuration__c.Are_Validations_Off__c)';
            if (!metaFileContents.includes(skipValidations)) {
                fileErrors.push({filePath: metaFilePath, errorMessage: 'The validation rule does not include the line ' + skipValidations});
            }
        }
        // TODO what should be returned...
        console.log(fileErrors);
        return fileErrors;
    }
}
