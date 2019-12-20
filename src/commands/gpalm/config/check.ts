import { core, flags, SfdxCommand } from '@salesforce/command';
import { MetadataScanner } from '../../../scanner/metadata-scanner';
import { FlowScanner } from '../../../scanner/flow-scanner';
import { FieldScanner } from '../../../scanner/field-scanner';
import { ObjectScanner } from '../../../scanner/object-scanner';
import { DuplicateRuleScanner } from '../../../scanner/duplicate-rule-scanner';
import { PermissionSetScanner } from '../../../scanner/permission-set-scanner';
import { QuickActionScanner } from '../../../scanner/quick-action-scanner';
import { ValidationRuleScanner } from '../../../scanner/validation-rule-scanner';
import { ApprovalProcessScanner } from '../../../scanner/approval-process-scanner';
import { WorkflowScanner } from '../../../scanner/workflow-scanner';

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
        const scanners: MetadataScanner[] = [
            new FlowScanner(targetDir),
            new FieldScanner(targetDir),
            new ObjectScanner(targetDir),
            new DuplicateRuleScanner(targetDir),
            new PermissionSetScanner(targetDir),
            new QuickActionScanner(targetDir),
            new ValidationRuleScanner(targetDir),
            new ApprovalProcessScanner(targetDir),
            new WorkflowScanner(targetDir)
        ];
        for (let scanner of scanners) {
            const errors = await scanner.run();
            fileErrors.push(... errors);
        }

        // TODO what should be returned...
        console.log(fileErrors);
        return fileErrors;
    }
}
