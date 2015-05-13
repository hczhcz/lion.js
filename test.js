'use strict';

function test(ast, expected) {
    var ret;
    try {
        ret = lion.boot(ast);
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

    if (retoutput != expoutput || ret == undefined) {
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
test(['<<', -1, 5], -32);
test(['is', ['-', 3, '5'], 'number'], true);
test(['is', ['+', 3, '5'], 'number'], false);
test(['typeof', ['env']], 'object');

// access
test(['in', 'test1', ['env']], false);
test(['list',
    ['in', 'test1', ['env']],
    ['setq', 'test1', ['+', 100, 23]],
    ['getq', 'test1'],
    ['in', 'test1', ['env']],
    ['test1']
], [false, ['+', 100, 23], ['+', 100, 23], true, 123]);
test(['list',
    ['set', 'test2', ['+', 100, 23]],
    ['get', ['+', 'test', '2']],
    ['in', 'test1', ['env']],
    ['getq', 'test2']
], [123, 123, false, 123]);
test(['do',
    ['var', 'a', ['+', 1, 1]],
    ['var', 'a', ['+', ['a'], ['a']]],
    ['var', 'a', ['+', ['a'], 1]]
], ['quote', 5]);
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
        ['x', ['in', 'x', ['env']]],
        ['x', ['in', 'y', ['env']]],
        ['x', ['in', 'z', ['env']]],
        ['x', ['y', ['in', 'x', ['env']]]],
        ['x', ['y', ['in', 'y', ['env']]]],
        ['x', ['y', ['in', 'z', ['env']]]],
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
test(['eval', ['list',
    'callq',
    ['getq', '+'],
    ['list', '', 1, 2]
]], 3);
test(['quote',['/', 2333, 10]], ['/', 2333, 10]);
test(['repr', ['quote', ['/', 2333, 10]]], '["/",2333,10]');
test(['parse', ['repr', ['quote', ['/', 2333, 10]]]], ['/', 2333, 10]);
test(['eval', ['parse', ['repr', ['quote', ['/', 2333, 10]]]]], 233.3);

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
test([['\\', 'argpass', 'a', 'b',
    ['xindex', ['getq', 'a'], ['b']]
], ['r', 's'], -1], ['pass', ['r', 's']]);
test([['\\', 'argcall', 'a', 'b',
    ['index', ['getq', 'a'], ['b']]
], ['+', 3, 4], 1], 7);
test([['\\', 'argraw', 'a', 'b',
    ['list', ['getq', 'a'], ['getq', 'b']]
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
test([{
    LIONJS: true,
    xgetq: ['\\', 'argquote', 'name', ['name']]
},
    ['getq', 'asdf']
], 'asdf');
test(['do',
    ['set', 'xgetq', ['macro', 'argquote', 'name', ['name']]],
    ['xgetq', 'asdf']
], 'asdf');

// control flows
test(['~~', ['cond',
    0, 100,
    '', 200,
    1, 300,
    true, 400
]], -300);
test(['typeof', ['cond',
    0, 100,
    '', 200,
    false, 300,
    ['-', '2', '2'], 400
]], 'undefined');
test(['case', 'aaa', 100,
    'aab', 200
], 100);
test(['case', 'aaa', 100,
    'aab', 200,
    'aaa', 300,
    'aaa', 400
], 300);
test(['each', 'i', ['list', 1, 2, 3, 4, 5],
    ['case', ['i'], 100,
        ['list', 2, 3], 200,
        4, 300,
        ['list', 5], 400
    ]
], [100, 200, 200, 300, 400]);
test(['do',
    ['var', 'x', 1],
    ['var', 'sum', 0],
    ['while', ['<', ['x'], 101], ['do',
        ['var', 'sum', ['+', ['sum'], ['x']]],
        ['var', 'x', ['+', ['x'], 1]],
    ]],
    ['sum']
], 5050);

// iteration
test([',',
    ['var', 'arr', ['', [2, 3, 4]]],
    ['forin', 'x', ['arr'],
        ['*', ['x'], ['index', ['arr'], ['x']]]
    ]
], [0, 3, 8]);
test(['each', 'x', ['', [2, 3, 4]],
    ['+', ['x'], 3]
], [5, 6, 7]);
test(['each', 'x', ['list', 2, 3, 4],
    ['+', ['x'], 3]
], [5, 6, 7]);
test(['table', 'x', -5, 5, 1,
    ['xindex', ['list', 1, 2, 3], ['x']]
], [2, 3, 1, 2, 3, 1, 2, 3, 1, 2]);
test(['range', 3, 9, 2], [3, 5, 7]);
test(['filter', 'i', ['range', 5, 0, -1],
    ['&', ['i'], 1]
], [5, 3, 1]);
test(['foldl', '-', 1000, 100, 10, 1], 889);
test(['foldr', '-', 1000, 100, 10, 1], 909);
test(['foldl', ['\\', 'argpass', 'a', 'b',
    ['+', ['a'], ['b']]
], 1000, 100, 10, 1], 1111);
test(['foldr', ['\\', 'argpass', 'a', 'b',
    ['+', ['string', ['a']], ['string', ['b']]]
], 1000, 100, 10, 1], '1000100101');

// exception
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
test(['do',
    ['var', 'a', 3],
    ['try',
        ['do',
            ['throw', 5],
            ['var', 'a', 0]
        ],
        ['var', 'a', ['*', ['a'], ['exception']]],
        ['var', 'a', ['*', ['a'], ['a']]]
    ],
    ['a']
], 225);
test(['try',
    ['throw', ['error', 'test']],
    ['string', ['exception']]
], 'Error: test');
test(['do',
    ['setq', '╯°□°╯', 'throw'],
    ['setq', 'v°□°v', 'try'],
    ['setq', '┻━┻', ['', 'lalala~']],
    ['setq', '┬─┬', 'exception'],
    ['v°□°v', ['╯°□°╯', ['┻━┻']], ['┬─┬']]
], 'lalala~');

// js built-ins
test(['Math', ['floor', ['sqrt', 123456]]], 351);
test([['Math', [':', 'floor']], [['Math', [':', 'sqrt']], 123456]], 351);
test([['eval', ['Math', ['envq']]], ['floor', 1.5]], 1);
test(['Array', ['slice', ['list', 1, 2, 3], 1]], [2, 3]);
test([['Array', [':', 'slice']], ['list', 1, 2, 3], 1], [2, 3]);
test([['String', [':', 'substr']], 'hello!', 0, 5], 'hello');
test(['do',
    ['=', 'a', ['date']],
    ['=', 'b', [['Date', [':', 'getFullYear']], ['a']]],
    ['=', 'c', [['Date', [':', 'getYear']], ['a']]],
    ['-', ['b'], ['c']]
], 1900);
test(['do',
    ['=', 'obj', ['re', 'h\\w(.)\\1o']],
    [['String', [':', 'match']], 'hello', ['obj']]
], ['hello', 'l']);
test(['do',
    ['=', 'obj', ['re', '.{3}']],
    ['=', 'str', ['restr', ['obj']]],
    [['String', [':', 'match']], ['str'], ['obj']]
], ['.{3']);

document.writeln('<hr><b>Finished.</b>');
