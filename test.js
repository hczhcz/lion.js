'use strict';

function test(ast, expected) {
    var env = {LIONJS: true};

    var ret;
    try {
        ret = lion.call(env, ast);
    } catch (e) {
        ret = 'ERROR: ' + e;
    }

    var input = JSON.stringify(ast);
    var expoutput = JSON.stringify(expected);
    var retoutput;
    try {
        retoutput = JSON.stringify(ret);
    } catch (e) {
        retoutput = 'ERROR: ret has loop';
    }

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
test(['', ['abcd', 'efg']], ['abcd', 'efg']);

// access
test(['has', 'test1'], false);
test(['list',
    ['hasq', 'test1'],
    ['setq', 'test1', ['+', 100, 23]],
    ['getq', 'test1'],
    ['hasq', 'test1'],
    ['test1']
], [false, ['+', 100, 23], ['+', 100, 23], true, 123]);
test(['list',
    ['set', 'test2', ['+', 100, 23]],
    ['get', ['+', 'test', '2']],
    ['hasq', 'test1'],
    ['getq', 'test2']
], [123, 123, false, 123]);

// call
test([['+', 'qu', 'ote'], ['hello', 'world']], ['hello', 'world']);
test(['eval',['quote', ['pass', ['+', 100, 23]]]], 123);
test([['quote',
    ['get', 'caller']
], ['+', 1, 2]], [['quote',
    ['get', 'caller']
], ['+', 1, 2]]);
test([['quote',
    ['eval', ['index', ['get', 'caller'], 1]]
], ['+', 1, 2]], 3);
test([{
    LIONJS: true,
    x: 1234
}, ['get', 'x']], 1234);
test([
    {
        LIONJS: true,
        x: {
            LIONJS: true,
            y: {
                LIONJS: true,
                z: 2345
            }
        }
    },
    ['list',
        ['x', ['has', 'x']],
        ['x', ['has', 'y']],
        ['x', ['has', 'z']],
        ['x', ['y', ['has', 'x']]],
        ['x', ['y', ['has', 'y']]],
        ['x', ['y', ['has', 'z']]],
        ['x', ['y', [':', 'z']]]
    ]
], [false, true, false, false, false, true, 2345]);
test([
    {
        LIONJS: true,
        parent: {
            LIONJS: true,
            a: 2
        },
        a: 1
    },
    ['list',
        ['get', 'a'],
        ['parent', ['get', 'a']],
        ['xget', 'a']
    ]
],[1, 2, 2]);

// function
test([['quote',
    ['index', ['list',
        ['setarg', 'argquote', 'test'],
        ['test']
    ], 1]
], ['+', 3, 4]], ['+', 3, 4]);
test([['quote',
    ['index', ['list',
        ['setarg', 'argpass', 'test', 'test2'],
        ['*', ['test'], ['test2']]
    ], 1]
], ['+', 3, 4], 5], 35);
test([['quote',
    ['index', ['list',
        ['setarg', 'argcall', 'test', 'test2'],
        ['*', ['test'], ['test2']]
    ], 1]
], ['+', 3, 4], 5], 35);
test([['lambda', 'argpass', 'a', 'b',
    ['+', ['a'], ['b']]
], 123, ['+', 230, ['*', 2, 2]]], 357);
test([{
    LIONJS: true,
    a: ['', 10],
    b: ['', 20]
}, [['lambda', 'argpass', 'a', 'b',
        ['*', ['a'], ['b']]
    ],
    ['+', ['b'], 2], 3
]], 66);
test([['\\', 'argpass',
    'a', 'b', ['xindex', ['getq', 'a'], ['b']]
], ['r', 's'], -1], ['pass', ['r', 's']]);
test([['\\', 'argcall',
    'a', 'b', ['index', ['getq', 'a'], ['b']]
], ['+', 3, 4], 1], 7);
test([['\\', 'argraw',
    'a', 'b', ['list', ['getq', 'a'], ['getq', 'b']]
], ['+', 3, 4], 1], [['+', 3, 4], 1]);
test([['\\', 'argquote', 'a', 'b', 'c',
    ['eval', ['list', ['a'], ['b'], ['c']]]
], ['\\', 'argcall', 'a', 'b',
    ['*', ['a'], ['b']]
], 3, ['+', 2, 5]], 21);
test([['\\', 'argquote', 'a', 'b',
    ['eval', ['list', ['a'], ['list', '+', ['b'], 2]]]
], ['\\', 'argquote', 'a',
    ['a']
], ['+', 2, 5]], ['+', ['+', 2, 5], 2]);
test([['\\', 'argcall', 'a', 'b',
    ['eval', ['list', ['getq', 'a'], ['list', '+', ['b'], 2]]]
], ['\\', 'argquote', 'a',
    ['a']
], ['+', 2, 5]], ['+', 7, 2]);
test(['do',
    ['set', 'f', ['\\', 'argcall', 'x',
        ['if', ['<=', ['x'], 0],
            1,
            ['*', ['x'], ['f', ['-', ['x'], 1]]]
        ]
    ]],
    ['f', 10]
], 3628800);

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
test(['do',
    ['var', 'a', 3],
    ['try',
        ['asdf'],
        ['var', 'a', ['*', ['a'], 7]],
        ['var', 'a', ['*', ['a'], 11]]
    ],
    ['a']
], 231);
test(['do',
    ['var', 'a', 3],
    ['try',
        ['var', 'a', ['*', ['a'], 5]],
        ['var', 'a', ['*', ['a'], 7]],
        ['var', 'a', ['*', ['a'], 11]]
    ],
    ['a']
], 165);
test([',',
    ['var', 'arr', ['', [2, 3, 4]]],
    ['each', 'x', ['arr'],
        ['*', ['x'], ['index', ['arr'], ['x']]]
    ]
], [0, 3, 8]);
test(['apply', 'x', ['', [2, 3, 4]],
    ['+', ['x'], 3]
], [5, 6, 7]);
test(['apply', 'x', ['list', 2, 3, 4],
    ['+', ['x'], 3]
], [5, 6, 7]);
test(['table', 'x', -5, 5, 1,
    ['xindex', ['list', 1, 2, 3], ['x']]
], [2, 3, 1, 2, 3, 1, 2, 3, 1, 2]);

// JSON
test(['quote',['/', 2333, 10]], ['/', 2333, 10]);
test(['repr', ['quote', ['/', 2333, 10]]], '["/",2333,10]');
test(['parse', ['repr', ['quote', ['/', 2333, 10]]]], ['/', 2333, 10]);
test(['eval', ['parse', ['repr', ['quote', ['/', 2333, 10]]]]], 233.3);

// js built-in
test(['Math', ['floor', ['sqrt', 123456]]], 351);
test([['Math', [':', 'floor']], [['Math', [':', 'sqrt']], 123456]], 351);
test([['eval', ['Math', ['envq']]], ['floor', 1.5]], 1);

document.writeln('<hr><b>Finished.</b>');
