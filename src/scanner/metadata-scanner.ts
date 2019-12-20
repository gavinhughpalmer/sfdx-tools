import * as fs from 'fs';
import * as glob from 'fast-glob';
import { Rule } from './rules';


//TODO look into visitor pattern to use here
export class MetadataScanner {

    private baseDir: string;
    protected metadataFilePattern: string;
    protected rules: Array<Rule>;

    constructor(baseDir: string) {
        this.baseDir = baseDir;
    }

    public getMetadataFilePattern(): string {
        return this.baseDir + this.metadataFilePattern;
    }

    public async run(): Promise<Array<FileError>> {
        // TODO should we return the errors from this? Seems odd for some reason...
        const errors : Array<FileError> = [];
        for (let metadataPath of await glob([this.getMetadataFilePattern()])) {
            const metadataFile = new MetadataFile(metadataPath);
            for (let rule of this.rules) {
                if (rule.scan(metadataFile)) {
                    errors.push({filePath: metadataPath, errorMessage: rule.errorMessage});
                }
            }
        }
        return errors;
    }
}

export interface FileError {
    filePath: string,
    errorMessage: string
}

export class MetadataFile {

    private metadataPath: string;
    private metadataContents: string;

    constructor(metadataPath: string) {
        this.metadataPath = metadataPath
    }

    public getPath(): string {
        return this.metadataPath;
    }

    public getContents() {
        if (!this.metadataContents) {
            this.metadataContents = fs.readFileSync(this.metadataPath, 'utf8');
        }
        return this.metadataContents;
    }

    public isManagedMetadata() {
        return this.metadataPath.match(/[\w\d]+__[\w\d]+__c.\w+-meta\.xml/);
    }
}