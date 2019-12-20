import { Rule, IncludesDescriptionRule } from './rules';
import { MetadataScanner } from './metadata-scanner';

export class QuickActionScanner extends MetadataScanner {

    protected metadataFilePattern = '/**/*.quickAction-meta.xml';
    protected rules: Array<Rule> = [
        new IncludesDescriptionRule()
    ];
}