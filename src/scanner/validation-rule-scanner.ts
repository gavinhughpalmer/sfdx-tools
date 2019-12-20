import { Rule, IncludesDescriptionRule, IncludesEqualsBooleanRule, SkipAutomationRule } from './rules';
import { MetadataScanner } from './metadata-scanner';

export class ValidationRuleScanner extends MetadataScanner {

    protected metadataFilePattern = '/**/*.validationRule-meta.xml';
    protected rules: Array<Rule> = [
        new IncludesDescriptionRule(),
        new ValidationRuleIncludesEqualsBooleanRule(),
        new SkipValidationsRule()
    ];
}

class ValidationRuleIncludesEqualsBooleanRule extends IncludesEqualsBooleanRule {

    protected getSurroundingText(): string {
        return '<errorConditionFormula>{innerText}<\/errorConditionFormula>'
    }
}

class SkipValidationsRule extends SkipAutomationRule {
    protected skipAutomation = 'NOT($Setup.Configuration__c.Are_Validations_Off__c)';
}