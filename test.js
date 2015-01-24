'use strict';

function test(ast, expected) {
    var env = lionstd.init(lionstd, ['init']);

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
], {0: 21, 1: -3});

// blocks
test(['get', 'test1'], undefined);
test(['list',
    ['setq', 'test1', ['add', 100, 23]],
    ['getq', 'test1'],
    ['test1'],
], {1: ['add', 100, 23], 2: 123});
test(['list',
    ['set', 'test2', ['add', 100, 23]],
    ['get', ['add', 'test', '2']],
    ['get', 'test1'],
    ['getq', 'test2'],
], {1: 123, 3: 123});

// calls
test([
    ['quote', ['get', 'caller']], ['add', 1, 2]
], [['quote', ['get', 'caller']], ['add', 1, 2]]);
test([
    ['quote', ['eval', ['index', ['get', 'caller'], 1]]], ['add', 1, 2]
], 3);

// JSON
test(['quote', ['div', 2333, 10]], ['div', 2333, 10]);
test(['repr', ['quote', ['div', 2333, 10]]], '["div",2333,10]');
test(['parse', ['repr', ['quote', ['div', 2333, 10]]]], ['div', 2333, 10]);
test(['eval', ['parse', ['repr', ['quote', ['div', 2333, 10]]]]], 233.3);

document.writeln('<hr><b>Finished.</b>');
