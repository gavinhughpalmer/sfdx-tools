import { Rule, IncludesDescriptionRule } from './rules';
import { MetadataScanner } from './metadata-scanner';

export class ObjectScanner extends MetadataScanner {

    protected metadataFilePattern = '/**/*__c.object-meta.xml';
    protected rules: Array<Rule> = [
        new IncludesDescriptionRule()
    ];
}