'use strict';

function test(ast, expected) {
    var env = {LIONJS: true};

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
test(['+', ['-', ['/', 30000, 30], 100], 10], 910);
test({a: 1, b: 2}, {a: 1, b: 2});
test(['list',
    ['*', 3, 7],
    ['%', -10, 7]
], [21, -3]);

// access
test(['get', 'test1'], undefined);
test(['list',
    ['setq', 'test1', ['+', 100, 23]],
    ['getq', 'test1'],
    ['test1']
], [['+', 100, 23], ['+', 100, 23], 123]);
test(['list',
    ['set', 'test2', ['+', 100, 23]],
    ['get', ['+', 'test', '2']],
    ['get', 'test1'],
    ['getq', 'test2']
], [123, 123, undefined , 123]);

// call
test([['+', 'qu', 'ote'], ['hello', 'world']], ['hello', 'world']);
test(['eval', ['quote', ['pass', ['+', 100, 23]]]], 123);
test([
    ['quote', ['get', 'caller']], ['+', 1, 2]
], [['quote', ['get', 'caller']], ['+', 1, 2]]);
test([
    ['quote',
        ['eval', ['index', ['get', 'caller'], 1]]
    ], ['+', 1, 2]
], 3);
test([{LIONJS: true, x: 1234}, 'get', 'x'], 1234);
test([{
    LIONJS: true,
    x: {
        LIONJS: true,
        y: {
            LIONJS: true,
            z: 2345
        }
    }
}, 'x', 'y', 'get', 'z'], 2345);

// function
test([
    ['quote', ['index', ['list',
        ['setarg', undefined, 'test'],
        ['test']
    ], 1]]
, ['+', 3, 4]], 7);
test([
    ['quote', ['index', ['list',
        ['setarg', 'quote', 'test'],
        ['test']
    ], 1]]
, ['+', 3, 4]], ['+', 3, 4]);
test([
    ['quote', ['index', ['list',
        ['setarg', undefined, 'test'],
        ['test']
    ], 1]]
, 7], 7);
test([['lambda',
    'a', 'b', ['+', ['a'], ['b']]
], 123, ['+', 230, ['*', 2, 2]]], 357);
// test([['\\',
//     'a', 'b', ['index', ['getq', 'a'], ['b']]
// ], ['r', 's'], 1], ['r', 's']);
// test([['lambdar',
//     'a', 'b', 'c', [['a'], ['eval', ['getq', 'b']], ['eval', ['getq', 'c']]]
// ], ['lambda',
//     'a', 'b', ['getq', 'a']
// ], 3, ['+', 1, 1]], ['r', 's']);

// test([
//     ['quote', ['list',
//         ['set', 'tmp', ['eval', ['index', ['get', 'caller'], 1]]],
//         ['cond', ['get', 'tmp'], ['']]
//     ]], 10
// ]);

// control flow
test(['do',
    ['var', 'x', 1],
    ['var', 'sum', 0],
    ['while', ['<', ['x'], 101], ['do',
        ['var', 'sum', ['+', ['sum'], ['x']]],
        ['var', 'x', ['+', ['x'], 1]],
    ]],
    ['sum']
], 5050);
test([',',
    ['var', 'arr', ['', [2, 3, 4]]],
    ['each', 'x', ['arr'], ['*', ['x'], ['index', ['arr'], ['x']]]]
], [0, 3, 8]);
test(['apply', 'x', ['', [2, 3, 4]], ['+', ['x'], 3]], [5, 6, 7]);
test(['apply', 'x', ['list', 2, 3, 4], ['+', ['x'], 3]], [5, 6, 7]);

// JSON
test(['quote', ['/', 2333, 10]], ['/', 2333, 10]);
test(['repr', ['quote', ['/', 2333, 10]]], '["/",2333,10]');
test(['parse', ['repr', ['quote', ['/', 2333, 10]]]], ['/', 2333, 10]);
test(['eval', ['parse', ['repr', ['quote', ['/', 2333, 10]]]]], 233.3);

// js built-in
test(['math', 'floor', ['sqrt', 123456]], 351);
test(['', ['abcd', 'efg']], ['abcd', 'efg']);
test([['math', 'get', 'floor'], [['math', 'get', 'sqrt'], 123456]], 351);

document.writeln('<hr><b>Finished.</b>');
