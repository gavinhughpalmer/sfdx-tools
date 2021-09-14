import { core, flags, SfdxCommand } from '@salesforce/command';
import { AnyJson } from '@salesforce/ts-types';
import decompress = require('decompress');
import * as fs from 'fs';
import { tmpdir } from 'os';
import * as client from 'sfdx-js';
import * as types from './types.json';

const sfdx = client.Client.createUsingPath('sfdx');

// TODO Refactoring and test classes...

interface MetadataType {
    name: string;
    members: string[];
}
interface Package {
    version: string;
    types: MetadataType[];
}

interface JobDetails {
    totalJobs: number;
    jobNumber: number;
}

export default class Backup extends SfdxCommand {

    public static description = 'This command will perform a full backup of a given orgs metadata, simply provide the org and a full backup of metadata will be pulled into provided project folder';

    public static examples = [
        `$ sfdx gpalm:source:backup --targetusername myOrg@example.com
  Backup completed!
  `
    ];

    protected static flagsConfig = {
        packageversion: flags.number({char: 'v', description: 'Version number that the package.xml should use in the retrieve call', default: 52.0 }),
        outputdir: flags.string({ char: 'd', description: 'The directory where the source format should be output to', default: 'force-app' }),
        waittimemillis: flags.integer({ char: 'w', description: 'The wait time between retrieve checks', default: 1000 }),
        ignoretypes: flags.array({ char: 'i', description: 'Comma seperated list of any additional types that you wish to ignore from the retrieve process, this can be used if the error "The retrieved zip file exceeded the limit of 629145600 bytes. Total bytes retrieved: 629534861" is recieved'}),
        secondaryretrieve: flags.array({ char: 's', default: [], description: 'Comma seperated list of values that should be included fro a secondary retrieve, useful if the retrieve is too large for a single retrieve job'})
    };
    protected static requiresUsername = true;
    protected static supportsDevhubUsername = false;
    protected static requiresProject = true;
    private connection: core.Connection;
    private packageVersion: string;
    private retrieveFolder = tmpdir() + '/retrieve' + Date.now();

    public async run(): Promise<AnyJson> {
        this.connection = this.org.getConnection();
        this.packageVersion = this.flags.packageversion.toFixed(1);
        if (this.flags.ignoretypes) {
            types.ignore.push(...this.flags.ignoretypes);
        }
        this.ux.log('Ignoring: ' + types.ignore + ' from the backup job');
        this.ux.log('Generating package...');
        const fullPackage = await this.buildPackage();
        const secondaryRetrieveTypes = new Set(this.flags.secondaryretrieve.map((type: string) => type.toLowerCase()));
        let splitTypes: any;
        let secondaryJobDetails: JobDetails;
        if (secondaryRetrieveTypes.size !== 0) {
            splitTypes = fullPackage.types.reduce((result: any, type: MetadataType) => {
                if (secondaryRetrieveTypes.has(type.name.toLowerCase())) {
                    result.secondaryTypes.push(type);
                } else {
                    result.initialTypes.push(type);
                }
                return result;
            }, { initialTypes: [], secondaryTypes: [] });
            const firstPackage = {...fullPackage};
            firstPackage.types = splitTypes.initialTypes;
            await this.retrievePackage(firstPackage, {totalJobs: 2, jobNumber: 1});
            secondaryJobDetails = {totalJobs: 2, jobNumber: 2};
        }
        const secondPackage = {...fullPackage};
        secondPackage.types = splitTypes ? splitTypes.secondaryTypes : fullPackage.types;
        secondaryJobDetails = secondaryJobDetails || {totalJobs: 1, jobNumber: 1};
        await this.retrievePackage(secondPackage, secondaryJobDetails);
        return {};
    }

    private async retrievePackage(retrievePackage: Package, jobDetails: JobDetails): Promise<void> {
        const retrieveRequest = {
            unpackaged: retrievePackage
        };
        const jobNumberString = `(${jobDetails.jobNumber} of ${jobDetails.totalJobs})`;
        this.ux.log(`Retrieving package ${jobNumberString} contining: ` + JSON.stringify(retrieveRequest.unpackaged, null, 2));
        this.connection.metadata.retrieve(retrieveRequest, async (retrieveError, asyncResult) => {
            if (retrieveError) this.ux.error(`An error has occured for ${jobNumberString}: ` + retrieveError.message);
            const checkStatus = async (checkStatusError: Error, retrieveResult: any) => {
                if (checkStatusError) this.ux.error(`An error has occured for ${jobNumberString}: ` + checkStatusError.message);
                this.ux.log(`Job ${jobNumberString} ${retrieveResult.status}`);
                if (retrieveResult.done === 'true' && retrieveResult.status !== 'Failed') {
                    await decompress(Buffer.from(retrieveResult.zipFile, 'base64'), this.retrieveFolder + jobDetails.jobNumber, {
                        map: file => {
                          const filePaths = file.path.split('/');
                          file.path = filePaths.join('/');
                          return file;
                        }
                    });
                    this.mkdir(this.flags.outputdir);
                    this.ux.startSpinner(`Converting job ${jobNumberString} to source format...`);
                    try {
                        await sfdx.mdapi.convert({
                            outputdir: this.flags.outputdir,
                            rootdir: this.retrieveFolder + jobDetails.jobNumber + '/unpackaged/',
                            json: true
                        });
                        this.ux.stopSpinner(`Job ${jobNumberString} Completed!`);
                    } catch (error) {
                        this.ux.stopSpinner('Error!');
                        this.ux.error('An error has occured: ' + error.message);
                    }
                } else if (retrieveResult.done === 'true' && retrieveResult.status === 'Failed') {
                    this.ux.error('An error has occured: ' + retrieveResult.errorMessage);
                } else {
                    setTimeout(async () => {
                        await this.connection.metadata.checkRetrieveStatus(retrieveResult.id, checkStatus);
                    }, this.flags.waittimemillis);
                }
            };
            this.ux.log(`Job Id: ${asyncResult.id}`);
            await this.connection.metadata.checkRetrieveStatus(asyncResult.id, checkStatus);
        });
    }

    private async buildPackage(): Promise<Package> {
        const makeLowerCase = (value: string) => value.toLowerCase();
        const wildcardTypes = new Set(types.wildcard.map(makeLowerCase));
        const ignoreTypes = new Set(types.ignore.map(makeLowerCase));
        const metadataDescribe = await this.connection.metadata.describe(this.packageVersion);
        const metadataPackage = {
            version: this.packageVersion,
            types: []
        };
        const packageMap = {};
        const metadataList = metadataDescribe.metadataObjects;
        const componentRetrivalPromises = [];
        for (const metadataComponent of metadataList) {
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
                componentRetrivalPromises.push(this.addComponent(packageMap, metadataComponent));
            }
        }
        await Promise.all(componentRetrivalPromises);
        this.buildPackageFromMap(metadataPackage, packageMap);
        return metadataPackage;
    }

    private buildPackageFromMap(metadataPackage, packageMap: object): void {
        for (const typeName in packageMap) {
            if (packageMap.hasOwnProperty(typeName)) {
                metadataPackage.types.push({
                    name: typeName,
                    members: packageMap[typeName]
                });
            }
        }
    }

    private async addComponent(packageMap: object, metadataComponent): Promise<void> {
        let typeName = metadataComponent.xmlName;

        if (metadataComponent.inFolder) {
            typeName =
                typeName === 'EmailTemplate' ? 'EmailFolder' : typeName + 'Folder';
        }
        const metadataTypes = [{ type: typeName, folder: null }];

        const metadataMembers = await this.connection.metadata.list(metadataTypes, this.packageVersion);

        if (metadataMembers && metadataMembers instanceof Array) {
            const members = packageMap[metadataComponent.xmlName] || [];
            const listFolderPromises = [];
            const isInFolder = metadataComponent.inFolder;
            const metadataList = metadataMembers.filter(member => member.fullName).map(member => member.fullName);
            metadataList.filter(() => isInFolder).map(metadataName => {
                listFolderPromises.push(
                    this.listFolder(packageMap, metadataComponent.xmlName, metadataName)
                );
            });
            packageMap[metadataComponent.xmlName] = members.concat(metadataList.filter(() => !isInFolder));
            if (listFolderPromises.length !== 0) {
                await Promise.all(listFolderPromises);
            }
        }
    }

    private async listFolder(packageMap: object, typeName: string, folderName: string): Promise<void> {
        const metadataTypes = [{ type: typeName, folder: folderName }];
        const metadataMembers = await this.connection.metadata.list(metadataTypes, this.packageVersion);
        if (metadataMembers && metadataMembers instanceof Array) {
            const members = packageMap[typeName] || [];
            members.push(folderName);
            const metadataNames = metadataMembers.filter(metadataMember => metadataMember.fullName).map(metadataMember => metadataMember.fullName);
            packageMap[typeName] = members.concat(metadataNames);
        }
    }

    private mkdir(path: string) {
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
        }
    }
}
