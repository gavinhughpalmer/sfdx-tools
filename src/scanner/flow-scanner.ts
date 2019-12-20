import { Rule, IncludesDescriptionRule, IncludesEqualsBooleanRule, SkipAutomationRule } from './rules';
import { MetadataScanner, MetadataFile } from './metadata-scanner';

export class FlowScanner extends MetadataScanner {

    protected metadataFilePattern = '/**/*.flow-meta.xml';
    protected rules: Array<Rule> = [
        new ProcessBuilderNamingRule(),
        new SingleProcessBuilderPerObjectRule(),
        new IncludesDescriptionRule(),
        new FlowIncludesEqualsBooleanRule(),
        new SkipProcessBuilderRule()
    ];
}

function isProcessBuilder(flowContents: string): boolean {
    return flowContents.includes('<processType>Workflow</processType>');
}

// TODO how can we be sure this is recieving a flow? can we add some type checking in for this?
class ProcessBuilderNamingRule implements Rule {
    public errorMessage = 'The process builder does not follow the naming convention';
    public scan(metadata: MetadataFile): boolean {
        return isProcessBuilder(metadata.getContents()) && !metadata.getPath().includes('_Handler');
    }
}

// TODO Could use a PB class that gives the isprocessbuilder method
class SingleProcessBuilderPerObjectRule implements Rule {
    public errorMessage = 'There are multiple process builders for the objet '; //TODO how to add the object name here...
    private processBuilderObjects = new Set();
    public scan(metadata: MetadataFile): boolean {
        const matches = metadata.getContents().match(/<name>ObjectType<\/name>\s*<value>\s*<stringValue>(\w*)<\/stringValue>/);
        if (matches && matches[1]) {
            const objectName = matches[1].toLowerCase();
            const hasProcessForObject = this.processBuilderObjects.has(objectName) && isProcessBuilder(metadata.getContents());
            this.processBuilderObjects.add(objectName);
            return hasProcessForObject;
        }
        return true;
    }
}

class FlowIncludesEqualsBooleanRule extends IncludesEqualsBooleanRule {

    protected getSurroundingText(): string {
        return '<formulas>[^]+<expression>{innerText}<\/expression>[^]+<\/formulas>'
    }
}

class SkipProcessBuilderRule extends SkipAutomationRule {
    protected skipAutomation = '$Setup.Configuration__c.Are_Processes_Off__c';
    public scan(metadata: MetadataFile): boolean {
        return isProcessBuilder(metadata.getContents()) && super.scan(metadata);
    }
}