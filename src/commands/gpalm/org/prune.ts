import { flags, SfdxCommand } from '@salesforce/command';
import { AnyJson } from '@salesforce/ts-types';
import { fs } from '@salesforce/core';
import { homedir } from 'os';

export default class Prune extends SfdxCommand {

    public static description = 'This command allows for pruning out some of the scratch org files that can start to build up, these don\'t typically get deleted so this command is useful to run every now and then as a housekeeping excersise';

    public static examples = [
        `$ sfdx gpalm:org:prune --dryrun
        test-hi51rwfgi974@example.com
  `
    ];

    protected static flagsConfig = {
        dryrun: flags.boolean({char: 'd', description: 'Displays the scrath org files that will be pruned out as part of the process', default: false })
    };
    protected static requiresUsername = false;
    protected static supportsDevhubUsername = false;
    protected static requiresProject = false;

    public async run(): Promise<AnyJson> {
        const sfdxDir = `${homedir()}/.sfdx`;
        const sfdxFiles = await fs.readdir(sfdxDir);
        const nonOrgFiles = new Set([
           'alias.json',
           'key.json',
           'sfdx.log',
           'stash.json',
           'coverage'
        ]);
        const today = Date.now();
        const orgFiles = sfdxFiles.filter(fileName => !nonOrgFiles.has(fileName));
        const readFilePromises = orgFiles.map(fileName => fs.readJson(`${sfdxDir}/${fileName}`));
        const orgDescriptions = await Promise.all(readFilePromises);
        const isScratchOrg = org => org.hasOwnProperty('expirationDate');
        const isInactiveScratchOrg = org => isScratchOrg(org) && Date.parse(org.expirationDate) < today;
        const inactiveScratchOrgs = orgDescriptions.filter(isInactiveScratchOrg);
        if (this.flags.dryrun) {
            const orgsToDelete = inactiveScratchOrgs.map(org => org['username']);
            this.ux.logJson(orgsToDelete);
            return orgsToDelete;
        } else {
            const deleteFilePromises = inactiveScratchOrgs.map(org => fs.unlink(`${sfdxDir}/${org['username']}.json`));
            await Promise.all(deleteFilePromises);
            const aliasFileName = `${sfdxDir}/alias.json`
            const aliases = await fs.readJson(aliasFileName);
            const refreshsedSfdxFiles = new Set(await fs.readdir(sfdxDir));
            const orgAliases = aliases['orgs'];
            const aliasesToClear = Object.keys(orgAliases).filter(alias => !refreshsedSfdxFiles.has(`${orgAliases[alias]}.json`));
            aliasesToClear.forEach(alias => delete orgAliases[alias]);
            await fs.writeJson(aliasFileName, aliases);
        }
        return {success: true};
    }
}
