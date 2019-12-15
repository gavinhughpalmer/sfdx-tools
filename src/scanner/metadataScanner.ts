import * as fs from 'fs';
import * as glob from 'fast-glob';


//TODO look into visitor pattern to use here
class MetadataScanner {

    private baseDir: string;
    private metadataFilePattern: string;
    private rules: Array<Rule>;

    constructor(baseDir: string, metadataFilePattern: string) {
        this.baseDir = baseDir;
        this.metadataFilePattern = metadataFilePattern;
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

class FlowScanner extends MetadataScanner {

    private rules: Array<Rule> = [
        new ProcessBuilderNamingRule(),
        new SingleProcessBuilderPerObjectRule()
    ];

    constructor(baseDir: string) {
        super(baseDir, '/**/*.flow-meta.xml');
    }
}

interface Rule {
    // severity: string; // TODO should be class? or some kind of enum
    errorMessage: string // TODO should this be static???
    scan(metadata: MetadataFile): boolean; // TODO Find a better name...
}

// TODO how can we be sure this is recieving a flow? can we add some type checking in for this?
class ProcessBuilderNamingRule implements Rule {
    public errorMessage = 'The process builder does not follow the naming convention';
    public scan(metadata: MetadataFile): boolean {
        const isProcessBuilder = metadata.getContents().includes('<processType>Workflow</processType>');
        return isProcessBuilder && !metadata.getPath().includes('_Handler');
    }
}

// TODO Could use a PB class that gives the isprocessbuilder method
class SingleProcessBuilderPerObjectRule implements Rule {
    public errorMessage = 'There are multiple process builders for the objet '; //TODO how to add the object name here...
    private processBuilderObjects: Set<string>;
    public scan(metadata: MetadataFile): boolean {
        const isProcessBuilder = metadata.getContents().includes('<processType>Workflow</processType>');
        const matches = metadata.getContents().match(/<name>ObjectType<\/name>\s*<value>\s*<stringValue>(\w*)<\/stringValue>/);
        if (matches && matches[1]) {
            const objectName = matches[1].toLowerCase();
            const hasProcessForObject = this.processBuilderObjects.has(objectName) && isProcessBuilder;
            this.processBuilderObjects.add(objectName);
            return hasProcessForObject;
        }
        return true;
    }
}

interface FileError {
    filePath: string,
    errorMessage: string
}

class MetadataFile {

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