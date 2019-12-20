import { MetadataFile } from './metadata-scanner';

export interface Rule {
    // severity: string; // TODO should be class? or some kind of enum
    errorMessage: string // TODO should this be static???
    scan(metadata: MetadataFile): boolean; // TODO Find a better name...
}

export class IncludesDescriptionRule implements Rule {
    public errorMessage = 'The metadata does not include a description';
    public scan(metadata: MetadataFile): boolean {
        return !metadata.isManagedMetadata() && !metadata.getContents().match(/<description>[^]*<\/description>/);
    }
}

export class IncludesEqualsBooleanRule implements Rule {
    public errorMessage = 'The formula contains a comparison of a checkbox (boolean) to the keyword true or false, this is unnessisary as the boolean itself can be used';
    public scan(metadata: MetadataFile): boolean {
        return !!metadata.getContents().match(this.getRegexPattern());
    }

    private getRegexPattern(): RegExp {
        return new RegExp(this.getSurroundingText().replace('{innerText}', this.getEqualsText()), 'i');
    }

    private getEqualsText(): string {
        return '[^]+=\s*(false|true)[^]*';
    }

    protected getSurroundingText(): string {
        return '<formula>{innerText}<\/formula>'
    }
}

export class SkipAutomationRule implements Rule {
    protected skipAutomation: string;
    public errorMessage = 'The file does not include the line ' + this.skipAutomation;
    public scan(metadata: MetadataFile): boolean {
        return !metadata.getContents().includes(this.skipAutomation);
    }
}