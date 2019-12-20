import { Rule, IncludesDescriptionRule, IncludesEqualsBooleanRule } from './rules';
import { MetadataScanner } from './metadata-scanner';

export class ApprovalProcessScanner extends MetadataScanner {

    protected metadataFilePattern = '/**/*.approvalProcess-meta.xml';
    protected rules: Array<Rule> = [
        new IncludesDescriptionRule(),
        new IncludesEqualsBooleanRule()
    ];
}