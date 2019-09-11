import { core, flags, SfdxCommand } from '@salesforce/command';
import { AnyJson } from '@salesforce/ts-types';
import { XMLWriter } from 'xml-writer';
import * as fileSystem from 'fs';
import * as types from './types.json';

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
// const messages = core.Messages.loadMessages('sfdx-git', 'org');

export default class Backup extends SfdxCommand {

    public static description = 'This command will perform a full backup of a given orgs metadata, simply provide the org and a full backup of metadata will be pulled into provided project folder';

    public static examples = [
        `$ sfdx gpalm:source:backup --targetusername myOrg@example.com
  Backup completed!
  `
    ];

    protected static flagsConfig = {
        packageversion: flags.string({ char: 'v', description: 'Version number that the package.xml should use in the retrieve call', default: '42.0' })
    };
    protected static requiresUsername = true;
    protected static supportsDevhubUsername = false;
    protected static requiresProject = true;
    private connection: core.Connection;
    private packageVersion: string;

    public async run(): Promise<AnyJson> {
        this.connection = this.org.getConnection();
        this.packageVersion = this.flags.packageversion;
        if (isNaN(Number(this.packageVersion))) {
            throw new core.SfdxError('Package version must be numeric');
        }
        this.buildPackage();
        // this.ux.log(outputString);
        
        // TODO what should be returned...
        return {};
    }

    private async buildPackage(): Promise<void> {
        // TODO Get below dirs from somewhere appropriate
        const packageDirectory = './temp';
        const wildcardTypes = new Set(types.wildcard);
        const ignoreTypes = new Set(types.ignore);

        const metadataDescribe = await this.connection.metadata.describe(this.packageVersion);
        const packageXml = new XMLWriter();
        packageXml.startDocument();
        packageXml.startElement('Package');
        packageXml.writeAttribute('xmlns', 'http://soap.sforce.com/2006/04/metadata');
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
                this.addWildcardMember(packageMap, metadataComponent.xmlName);
            } else if (metadataTypeName === 'standardvalueset') {
                packageMap['StandardValueSet'] = types.standardValueSet;
            } else {
                promises.push(this.addComponent(packageMap, metadataComponent));
            }
        }
        await Promise.all(promises);
        this.buildPackageFromMap(packageXml, packageMap);
        packageXml.writeElement('version', this.packageVersion);
        packageXml.endDocument();
        this.createDir(packageDirectory);
        fileSystem.writeFile(packageDirectory + '/package.xml', packageXml.toString(), function (
            error
        ) {
            if (error) {
                return console.log(error);
            }
            console.log('The package has been generated!');
        });
    }

    private createDir(path: string): void {
        if (!fileSystem.existsSync(path)) {
            fileSystem.mkdirSync(path);
        }
    }

    private buildPackageFromMap(packageXml: XMLWriter, packageMap: object): void {
        for (let typeName in packageMap) {
            packageXml.startElement('types');
            const members = packageMap[typeName];
            for (let index in members) {
                packageXml.writeElement('members', members[index]);
            }
            packageXml.writeElement('name', typeName);
            packageXml.endElement();
        }
    }

    private addWildcardMember(packageMap: object, typeName: string): void {
        packageMap[typeName] = ['*'];
        console.log('Adding ' + typeName + ' to package');
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
            console.log('Adding ' + metadataComponent.xmlName + ' to package');
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
}
