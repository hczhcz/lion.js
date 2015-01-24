'use strict';

var env = lionstd.init(lionstd, ['init']);

function test(ast, expected) {
    var input = JSON.stringify(ast);
    var output = JSON.stringify(lion.call(env, ast));
    var eoutput = JSON.stringify(expected);

    if (output != expected) {
        document.writeln(
            '<hr>' +
            '<b>Input:</b>' + '<pre>' + input + '</pre>' +
            '<b>Output:</b>' + '<pre>' + output + '</pre>' + (
                expected ?
                '<b>Expected:</b>' + '<pre>' + eoutput + '</pre>' : ''
            )
        );
    }
}

test('hello, world');
test(['add', ['sub', 1000, 100], 10], 910);
test([['add', 's', 'ub'], 123, 12], 111);

document.writeln('<hr><b>Finished.</b>')
