const coverageResults = require('./test-result-codecoverage.json');
const testClassResults = require('./test-result-7073H000000xfr4.json');

const classesToWorkOn = coverageResults.filter(classCoverage => {
    return classCoverage.coveredPercent < 80;
}).map(classCoverage => {
    return {
        className: classCoverage.name,
        methodName: 'N/A',
        testResult: 'N/A',
        message: 'N/A',
        stackTrace: 'N/A',
        totalLines: classCoverage.totalLines,
        uncoveredLines: classCoverage.totalLines - classCoverage.totalCovered
    };
}).concat(
    testClassResults.tests.filter(testRunResult => {
        return testRunResult.Outcome === 'Fail';
    }).map(testRunResult => {
        return {
            className: testRunResult.ApexClass.Name,
            methodName: testRunResult.MethodName,
            testResult: testRunResult.Outcome,
            message: testRunResult.Message,
            stackTrace: testRunResult.StackTrace,
            totalLines: null,
            uncoveredLines: null
        };
    })
);
console.log(classesToWorkOn);
