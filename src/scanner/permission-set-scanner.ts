import { Rule, IncludesDescriptionRule } from './rules';
import { MetadataScanner } from './metadata-scanner';

export class PermissionSetScanner extends MetadataScanner {

    protected metadataFilePattern = '/**/*.permissionset-meta.xml';
    protected rules: Array<Rule> = [
        new IncludesDescriptionRule()
    ];
}