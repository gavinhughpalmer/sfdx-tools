import { Rule, IncludesDescriptionRule } from './rules';
import { MetadataScanner } from './metadata-scanner';

export class DuplicateRuleScanner extends MetadataScanner {

    protected metadataFilePattern = '/**/*.duplicateRule-meta.xml';
    protected rules: Array<Rule> = [
        new IncludesDescriptionRule()
    ];
}