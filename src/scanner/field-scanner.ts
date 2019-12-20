import { Rule, IncludesDescriptionRule, IncludesEqualsBooleanRule } from './rules';
import { MetadataScanner } from './metadata-scanner';

export class FieldScanner extends MetadataScanner {

    protected metadataFilePattern = '/**/*__c.field-meta.xml';
    protected rules: Array<Rule> = [
        new IncludesDescriptionRule(),
        new IncludesEqualsBooleanRule()
    ];
}