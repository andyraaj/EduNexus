const test = require('node:test');
const assert = require('node:assert/strict');

const { _test } = require('../server/controllers/resultController');

test('computeSummary totals marks and pass/fail result', () => {
    const summary = _test.computeSummary([
        { score: 35, maxScore: 50 },
        { score: 40, maxScore: 50 },
    ]);
    assert.equal(summary.totalScore, 75);
    assert.equal(summary.totalMax, 100);
    assert.equal(summary.percentage, 75);
    assert.equal(summary.result, 'PASS');
});

test('gradePointFor follows configured GPA bands', () => {
    assert.equal(_test.gradePointFor(95), 10);
    assert.equal(_test.gradePointFor(85), 9);
    assert.equal(_test.gradePointFor(72), 8);
    assert.equal(_test.gradePointFor(39), 0);
});

test('computeAcademicSummary calculates credit-weighted GPA', () => {
    const summary = _test.computeAcademicSummary([
        { score: 45, maxScore: 50, semester: 1, course: { _id: 'c1', code: 'A', credits: 4 } },
        { score: 40, maxScore: 50, semester: 1, course: { _id: 'c2', code: 'B', credits: 2 } },
    ]);
    assert.equal(summary.totalCredits, 6);
    assert.equal(summary.gpa, 9.67);
});
