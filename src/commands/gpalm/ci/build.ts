import { core, flags, SfdxCommand } from '@salesforce/command';
import { AnyJson } from '@salesforce/ts-types';
const sfdx = require('sfdx-js').Client.createUsingPath('sfdx');

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

export default class Build extends SfdxCommand {

    public static description = '';

    public static examples = [
        `$ sfdx gpalm:ci:build
  Backup completed!
  `
    ];

    protected static flagsConfig = {
        definitionfile: flags.string({char: 'f', description: 'path to an org definition file', default: 'config/project-scratch-def.json' })
    };
    protected static requiresDevhubUsername = true;
    protected static requiresProject = true;

    public async run(): Promise<AnyJson> {
        const scratchOrgName = 'TestRunner';
        this.ux.log('Creating the Scratch Org...');
        const createResult = await sfdx.org.create({
            definitionfile: this.flags.definitionfile,
            targetdevhubusername: this.hubOrg.getUsername(),
            setalias: scratchOrgName,
            durationdays: 1
        });
        console.log(createResult);
        return;
        try {
            this.ux.log('Pushing source code...');
            await sfdx.source.push({
                targetusername: scratchOrgName,
                forceoverwrite: true
            });
            this.ux.log('Running unit tests...');
            await sfdx.apex.test.run({
                testlevel: 'RunLocalTests',
                outputdir: 'test-results',
                resultformat: 'tap',
                targetusername: scratchOrgName,
                codecoverage: true,
                wait: 10
            });
        } catch(error) {
            this.ux.log('Unknown Error pushing source');
        } finally {
            await sfdx.org.delete({
                noprompt: true,
                targetusername: scratchOrgName
            });
        }
        return {};
    }
}
