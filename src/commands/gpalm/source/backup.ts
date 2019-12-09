import { core, flags, SfdxCommand } from '@salesforce/command';
import { AnyJson } from '@salesforce/ts-types';
import * as types from './types.json';
import {tmpdir} from 'os';
const decompress = require('decompress');
import * as child from 'child_process';
import * as util from 'util';
import * as fs from 'fs';
const exec = util.promisify(child.exec);

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// TODO Refactoring and test classes...

export default class Backup extends SfdxCommand {

    public static description = 'This command will perform a full backup of a given orgs metadata, simply provide the org and a full backup of metadata will be pulled into provided project folder';

    public static examples = [
        `$ sfdx gpalm:source:backup --targetusername myOrg@example.com
  Backup completed!
  `
    ];

    protected static flagsConfig = {
        // TODO add flag for adding additional types to ignore
        packageversion: flags.string({ char: 'v', description: 'Version number that the package.xml should use in the retrieve call', default: '42.0' }),
        outputdir: flags.string({ char: 'd', description: 'The directory where the source format should be output to', default: 'force-app' }),
        waittimemillis: flags.integer({ char: 'w', description: 'The wait time between retrieve checks', default: 1000 }),
        ignoretypes: flags.string({ char: 'i', description: 'Comma seperated list of any additional types that you wish to ignore from the retrieve process, this can be used if the error "The retrieved zip file exceeded the limit of 629145600 bytes. Total bytes retrieved: 629534861" is recieved'})
    };
    protected static requiresUsername = true;
    protected static supportsDevhubUsername = false;
    protected static requiresProject = true;
    private connection: core.Connection;
    private packageVersion: string;
    private retrieveFolder = tmpdir() + '/retrieve' + Date.now();

    public async run(): Promise<AnyJson> {
        this.connection = this.org.getConnection();
        this.packageVersion = this.flags.packageversion;
        if (isNaN(Number(this.packageVersion))) {
            throw new core.SfdxError('Package version must be numeric');
        }
        types.ignore.push(...this.flags.ignoretypes.split(','));
        // TODO Occational error with: ERROR running Backup:  getaddrinfo ENOTFOUND nccgroup.my.salesforce.com nccgroup.my.salesforce.com:443
        // this.ux.log(outputString);
        this.ux.log('Generating package...');
        const retrieveRequest = {
            unpackaged: await this.buildPackage()
        };
        console.log('Package to retrieve: ' + JSON.stringify(retrieveRequest.unpackaged, null, 2));
        // TODO Error handling and check it is done earlier on...
        this.connection.metadata.retrieve(retrieveRequest, (error, asyncResult) => {
            if (error) throw new core.SfdxError(error.message);
            const checkStatus = async (error: Error, retrieveResult: any) => {
                if (error) throw new core.SfdxError(error.message);
                this.ux.log(retrieveResult.status);
                if (retrieveResult.done === 'true' && retrieveResult.status !== 'Failed') {
                    decompress(Buffer.from(retrieveResult.zipFile, 'base64'), this.retrieveFolder, {
                        map: function (file) {
                          const filePaths = file.path.split('/');
                          file.path = filePaths.join('/');
                          return file;
                        }
                    });
                    this.mkdir(this.flags.outputdir);
                    this.ux.startSpinner('Converting to source format...');
                    await exec(
                        `sfdx force:mdapi:convert -d ${this.flags.outputdir} -r ${this.retrieveFolder + '/unpackaged/'} --json`,
                        {maxBuffer: Infinity}
                    );
                    this.ux.stopSpinner('Completed!');
                } else if (retrieveResult.done === 'true' && retrieveResult.status === 'Failed') {
                    this.ux.log(retrieveResult);
                } else {
                    setTimeout(() => {
                        this.connection.metadata.checkRetrieveStatus(retrieveResult.id, checkStatus)
                    }, this.flags.waittimemillis)
                }
            }
            this.ux.log(`Job Id: ${asyncResult.id}`);
            this.connection.metadata.checkRetrieveStatus(asyncResult.id, checkStatus);
        });

        // TODO what should be returned...
        return {};
    }

    private async buildPackage(): Promise<object> {
        const wildcardTypes = new Set(types.wildcard);
        const ignoreTypes = new Set(types.ignore);

        const metadataDescribe = await this.connection.metadata.describe(this.packageVersion);
        const metadataPackage = {
            version: this.packageVersion,
            types: []
        };
        const packageMap = {};
        const metadataList = metadataDescribe.metadataObjects;
        const promises = [];
        for (let index in metadataList) {
            const metadataComponent = metadataList[index];
            const metadataTypeName = metadataComponent.xmlName.toLowerCase();
            if (ignoreTypes.has(metadataTypeName)) {
                continue;
            }
            if (wildcardTypes.has(metadataTypeName)) {
                metadataPackage.types.push({
                    name: metadataComponent.xmlName,
                    members: '*'
                });
            } else if (metadataTypeName === 'standardvalueset') {
                metadataPackage.types.push({
                    name: 'StandardValueSet',
                    members: types.standardValueSet
                });
            } else {
                promises.push(this.addComponent(packageMap, metadataComponent));
            }
        }
        await Promise.all(promises);
        this.buildPackageFromMap(metadataPackage, packageMap);
        return metadataPackage;
    }

    private buildPackageFromMap(metadataPackage, packageMap: object): void {
        for (let typeName in packageMap) {
            metadataPackage.types.push({
                name: typeName,
                members: packageMap[typeName]
            });
        }
    }

    private async addComponent(packageMap: object, metadataComponent): Promise<void> {
        let typeName = metadataComponent.xmlName;

        if (metadataComponent.inFolder) {
            typeName =
                typeName === 'EmailTemplate' ? 'EmailFolder' : typeName + 'Folder';
        }
        // TODO type accepts a list so could group these up and send as one
        const types = [{ type: typeName, folder: null }];

        const metadataMembers = await this.connection.metadata.list(types, this.packageVersion);

        if (metadataMembers) {
            const members = packageMap[metadataComponent.xmlName] || [];
            const promises = [];
            for (let index in metadataMembers) {
                const member = metadataMembers[index];
                if (member.fullName && !metadataComponent.inFolder) {
                    members.push(member.fullName);
                } else if (member.fullName && metadataComponent.inFolder) {
                    promises.push(
                        this.listFolder(packageMap, metadataComponent.xmlName, member.fullName)
                    );
                }
            }
            packageMap[metadataComponent.xmlName] = members;
            if (promises.length !== 0) {
                await Promise.all(promises);
            }
        }
    }

    private async listFolder(packageMap: object, typeName: string, folderName: string): Promise<void> {
        const types = [{ type: typeName, folder: folderName }];
        const metadataMembers = await this.connection.metadata.list(types, this.packageVersion);
        if (!metadataMembers) return;
        const members = packageMap[typeName] || [];
        members.push(folderName);
        for (let index in metadataMembers) {
            if (metadataMembers[index].fullName) {
                members.push(metadataMembers[index].fullName);
            }
        }
        packageMap[typeName] = members;
    }

    private mkdir(path: string) {
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
        }
    }
}
