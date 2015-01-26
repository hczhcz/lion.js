'use strict';

function test(ast, expected) {
    var env = {}

    var ret = lion.call(env, ast);

    var input = JSON.stringify(ast);
    var retoutput = JSON.stringify(ret);
    var expoutput = JSON.stringify(expected);

    if (retoutput != expoutput) {
        document.writeln(
            '<hr>' +
            '<b>Input:</b>' + '<pre>' + input + '</pre>' +
            '<b>Output:</b>' + '<pre>' + retoutput + '</pre>' + (
                expoutput ?
                '<b>Expected:</b>' + '<pre>' + expoutput + '</pre>' : ''
            )
        );
    }
}

// basic
test('hello, world');
test(123, 123);
test(['add', ['sub', ['div', 30000, 30], 100], 10], 910);
test([['add', 'm', 'od'], 12345, 100], 45);
test({a: 1, b: 2}, {a: 1, b: 2})
test(['list',
    ['mul', 3, 7],
    ['mod', -10, 7],
], [21, -3]);

// blocks
test(['get', 'test1'], undefined);
test(['list',
    ['setq', 'test1', ['add', 100, 23]],
    ['getq', 'test1'],
    ['test1'],
], [['add', 100, 23], ['add', 100, 23], 123]);
test(['list',
    ['set', 'test2', ['add', 100, 23]],
    ['get', ['add', 'test', '2']],
    ['get', 'test1'],
    ['getq', 'test2'],
], [123, 123, undefined , 123]);

// calls
test(['eval', ['quote', ['pass', ['add', 100, 23]]]], 123);
test([
    ['quote', ['get', 'caller']], ['add', 1, 2]
], [['quote', ['get', 'caller']], ['add', 1, 2]]);
test([
    ['quote',
        ['eval', ['index', ['get', 'caller'], 1]]
    ], ['add', 1, 2]
], 3);
test([{x: 1234}, 'get', 'x'], 1234);
test([{x: {y: {z: 2345}}}, 'x', 'y', 'get', 'z'], 2345);

// JSON
test(['quote', ['div', 2333, 10]], ['div', 2333, 10]);
test(['repr', ['quote', ['div', 2333, 10]]], '["div",2333,10]');
test(['parse', ['repr', ['quote', ['div', 2333, 10]]]], ['div', 2333, 10]);
test(['eval', ['parse', ['repr', ['quote', ['div', 2333, 10]]]]], 233.3);

// js built-in
test(['math', 'floor', ['sqrt', 123456]], 351);
test(['', ['abcd', 'efg']], ['abcd', 'efg'])
// test([['math', 'getq', 'floor'], [['math', 'get', 'sqrt'], 123456]]);

document.writeln('<hr><b>Finished.</b>');
