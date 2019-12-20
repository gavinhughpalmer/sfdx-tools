import { Rule, IncludesEqualsBooleanRule } from './rules';
import { MetadataScanner } from './metadata-scanner';

export class WorkflowScanner extends MetadataScanner {

    protected metadataFilePattern = '/**/*.workflow-meta.xml';
    protected rules: Array<Rule> = [
        new IncludesEqualsBooleanRule()
    ];
}