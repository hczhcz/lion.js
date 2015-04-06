'use strict';

//////// utilities ////////

var lion = {

    //////// builtin libraries ////////

    core: {},

    std: {
        LIONJS: true,

        // see envq in lion.core
        envq: function (env, ast) {
            return 'LIONSTD';
        },

        // see xgetq in lion.core
        xgetq: function (env, ast) {
            var name = ast[1];

            if (Object.hasOwnProperty.call(lion.core, name)) {
                return lion.core[name];
            }
        },
    },

    //////// constants ////////

    W_DELAY: 1,
    W_ARG_HAS_ENV: 2,
    W_ARG_AS_ARR: 4,
    W_METHOD: 8,

    //////// helper functions ////////

    // convert f([env, ]arg...) to g(env, ast) with calls
    wrap: function (func, option) {
        return function (env, ast) {
            var args = [];

            // scan arguments
            var l = ast.length;
            for (var i = 1; i < l; ++i) {
                if (option & lion.W_DELAY) {
                    // make a function
                    args.push(function (target) {
                        return function () {
                            return lion.call(env, target);
                        };
                    } (ast[i]));
                } else {
                    // call directly
                    args.push(
                        lion.call(env, ast[i])
                    );
                }
            }

            if (option & lion.W_ARG_AS_ARR) {
                if (option & lion.W_ARG_HAS_ENV) {
                    return func(env, args);
                } else {
                    return func(args);
                }
            } else {
                if (option & lion.W_ARG_HAS_ENV) {
                    args.unshift(env);
                }
                return func.apply(this, args);
            }
        };
    },

    // convert a native object to an environment
    wrapobj: function (obj, option, envname) {
        return {
            LIONJS: true,

            // see envq in lion.core
            envq: function (env, ast) {
                return ['LIONSTD', ['getq', envname]];
            },

            // see xgetq in lion.core
            xgetq: function (env, ast) {
                var name = ast[1];

                if (Object.hasOwnProperty.call(obj, name)) {
                    if (option & lion.W_METHOD) {
                        return lion.wrap(function (args) {
                            var target = args.shift();

                            // if (target instanceof obj) {
                            if (Object.isPrototypeOf.call(obj, target)) {
                                return obj[name].apply(target, args);
                            } else {
                                throw '[LION] bad access to object method: ' + ast[0];
                            }
                        }, option | lion.W_ARG_AS_ARR);
                    } else {
                        return lion.wrap(obj[name], option);
                    }
                } else {
                    // find from lion.std
                    return lion.corefunc(lion.std, ['getq', name]);
                }
            },
        };
    },

    // add checker to a function (for lion.core)
    wrapcore: function (func, option) {
        return function (env, ast) {
            if (Object.hasOwnProperty.call(env, 'LIONJS')) {
                return func(env, ast);
            } else {
                throw '[LION] core function is not allowed: ' + ast[0];
            }
        };
    },

    // add library functions
    addfunc: function (env, pkg, hook, option) {
        for (var i in pkg) {
            if (i in env) {
                throw '[LION] naming conflict in the library: ' + i;
            } else {
                env[i] = hook ? hook(pkg[i], option, i) : pkg[i];
            }
        }
    },

    // execute an AST by getting a callee
    call: function (env, ast) {
        if (ast instanceof Array) {
            // is a function call

            var callee = lion.call(env, ast[0]);

            if (callee == 'LIONSTD') {
                // call with std
                return lion.call(lion.std, ast[1]);
            } else {
                // call via env.callq
                return lion.corefunc(
                    env,
                    ['callq', callee, ast]
                );
            }
        } else {
            // is an object
            return ast;
        }
    },

    // search core function in env and lion.core
    corefunc: function (env, ast) {
        var name = ast[0];

        if (Object.hasOwnProperty.call(env, name)) {
            return lion.core['callq'](
                env,
                ['callq', env[name], ast]
            );
        } else if (Object.hasOwnProperty.call(lion.core, name)) {
            return lion.core[name](env, ast);
        }
    },
};

//////// core functions ////////

// core-level names:
//     LIONJS
//     LIONSTD
//     callq
//     envq
//     getq
//     xgetq
//     setq
//     delq
//     parent
//     caller
//     callenv

lion.addfunc(lion.core, {
    // execute an AST with a given callee
    // proto: callq('callee, 'caller) -> result
    callq: function (env, ast) {
        // TODO: move something to lion.call
        //       and make this function overridable
        var callee = ast[1];
        var caller = ast[2];

        if (typeof callee == 'string') {
            // get the callee from the environment
            var newcallee = lion.corefunc(
                env,
                ['getq', callee]
            );

            if (newcallee) {
                // apply the callee
                return lion.corefunc(
                    env,
                    ['callq', newcallee, caller]
                );
            } else {
                // callee not found
                throw '[LION] callee not found: ' + callee;
            }
        } else if (callee instanceof Function) {
            // callee is a builtin function

            return callee(env, caller);
        } else if (callee instanceof Array) {
            // callee is an AST

            // call with a new environment
            var newenv = {
                LIONJS: true,
                caller: caller,
                callenv: lion.corefunc(env, ['envq']),
            };

            return lion.call(newenv, callee);
        } else if (callee instanceof Object) {
            // callee is an object

            // use callee as the new environment
            return lion.call(callee, caller[1]);
        } else {
            // callee is not callable

            // return callee;
            throw '[LION] callee is not callable: ' + callee;
        }
    },

    // get current environment
    // proto: envq() -> env
    envq: function (env, ast) {
        return env;
    },

    // get value from current environment or call xgetq
    // proto: getq('name) -> value
    getq: function (env, ast) {
        var name = ast[1];

        if ((name in env) && !Object.hasOwnProperty.call(env, name)) {
            // js internal property
            throw '[LION] name is not acceptable: ' + name;
        } else {
            if (Object.hasOwnProperty.call(env, name)) {
                // found
                return env[name];
            } else {
                // not found
                return lion.corefunc(env, ['xgetq', name]);
            }
        }
    },

    // get value from the parent of current environment
    // proto: xgetq('name) -> value
    xgetq: function (env, ast) {
        var name = ast[1];

        // if ((name in env) && !Object.hasOwnProperty.call(env, name)) {
        //     // js internal property
        //     throw '[LION] name is not acceptable: ' + name;
        // } else {
            if (Object.hasOwnProperty.call(env, 'parent')) {
                // find from env's parent
                return lion.corefunc(env.parent, ['getq', name]);
            } else if (env != lion.std) {
                // find from standard library
                return lion.corefunc(lion.std, ['getq', name]);
            } else {
                // not found
                // return undefined;
                throw '[LION] value not found: ' + name;
            }
        // }
    },

    // set value in current environment
    // proto: setq('name, 'value) -> value
    setq: function (env, ast) {
        var name = ast[1];
        var value = ast[2];

        if ((name in env) && !Object.hasOwnProperty.call(env, name)) {
            // js internal property
            throw '[LION] name is not acceptable: ' + name;
        } else {
            return env[name] = value;
        }
    },

    // remove value from current environment
    // proto: delq('name) -> success
    delq: function (env, ast) {
        var name = ast[1];

        if ((name in env) && !Object.hasOwnProperty.call(env, name)) {
            // js internal property
            throw '[LION] name is not acceptable: ' + name;
        } else {
            return delete env[name];
        }
    },
}, lion.wrapcore);

//////// the standard library ////////

//// access & call ////

lion.addfunc(lion.std, {
    // callq() with calling
    // proto: callq(callee, caller) -> result
    call: function (env, callee, caller) {
        return lion.corefunc(env, ['callq', callee, caller]);
    },

    // envq() with calling
    // proto: env() -> env
    env: function (env) {
        return lion.corefunc(env, ['envq']);
    },

    // getq() with calling
    // proto: get(name) -> value
    get: function (env, name) {
        return lion.corefunc(env, ['getq', name]);
    },

    // xgetq() with calling
    // proto: xget(name) -> value
    xget: function (env, name) {
        return lion.corefunc(env, ['xgetq', name]);
    },

    // setq() with calling
    // proto: set(name, value) -> value
    set: function (env, name, value) {
        return lion.corefunc(env, ['setq', name, value]);
    },

    // delq() with calling
    // proto: del(name) -> success
    del: function (env, name) {
        return lion.corefunc(env, ['delq', name]);
    },

    // set quoted value
    // proto: var(name, value) -> 'value
    var: function (env, name, value) {
        return lion.corefunc(env, ['setq', name, ['quote', value]]);
    },
}, lion.wrap, lion.W_ARG_HAS_ENV);

lion.addfunc(lion.std, {
    // return the AST
    // proto: quote('ast) -> 'ast
    quote: function (env, ast) {return ast[1];},

    // just calling
    // proto: pass(ast) -> (call)^1 -> result
    pass: function (env, ast) {return lion.call(env, ast[1]);},

    // lion.call() with wrap
    // proto: eval($ast) -> (call)^2 -> result
    eval: function (env, ast) {return lion.call(env, lion.call(env, ast[1]));},
});

lion.addfunc(lion.std, {
    // string to AST (JSON only)
    // proto: parse(str) -> ast
    parse: function (json) {return JSON.parse(json);},

    // AST to string (JSON only)
    // proto: stringify(ast) -> str
    stringify: function (ast) {return JSON.stringify(ast);},
}, lion.wrap);

//// function ////

lion.addfunc(lion.std, {
    // execute and make quote
    // proto: argcall('env, 'ast) -> 'called
    argcall: function (env, ast) {
        return ['quote', lion.call(ast[1], ast[2])];
    },

    // execute later
    // proto: argpass('env, 'ast) -> 'pass(ast)
    argpass: function (env, ast) {
        return [ast[1], ['pass', ast[2]]];
    },

    // make quote
    // proto: argquote('env, 'ast) -> 'ast
    argquote: function (env, ast) {
        return ['quote', ast[2]];
    },

    // do nothing
    // proto: argraw('env, 'ast) -> ast
    argraw: function (env, ast) {
        return ast[2];
    },
});

lion.addfunc(lion.std, {
    // give name to arguments with wrap
    // proto: setarg(wrapper, ...) -> caller
    setarg: function (env, arr) {
        // get arguments
        var caller = lion.corefunc(
            env,
            ['getq', 'caller']
        );
        var callenv = lion.corefunc(
            env,
            ['getq', 'callenv']
        );

        var wrapper = arr[0];

        for (var i = 1; i < arr.length; ++i) {
            var arg = lion.call(
                env, [wrapper, callenv, caller[i]]
            );

            lion.corefunc(
                env, ['setq', arr[i], arg]
            );
        }

        return caller;
    },
}, lion.wrap, lion.W_ARG_HAS_ENV | lion.W_ARG_AS_ARR);

lion.addfunc(lion.std, {
    // make a lambda function
    // proto: lambda(wrapper, ..., body) -> function
    lambda: function (env, ast) {
        var setparent = ['setq', 'parent', lion.corefunc(env, ['envq'])];
        var setarg = ['setarg'];

        for (var i = 1; i < ast.length - 1; ++i) {
            setarg.push(ast[i]);
        }

        return [
            'do',
            setparent,
            setarg,
            ast[ast.length - 1]
        ];
    },
});

//// control flow ////

lion.addfunc(lion.std, {
    // conditional branch
    // proto: cond(cond, action, ...) -> result
    cond: function () {
        var l = arguments.length;
        for (var i = 0; i + 1 < l; i += 2) {
            if (arguments[i]()) {
                return arguments[i + 1]();
            }
        }
    },

    // simple branch (if branch)
    // proto: if(cond, then, else) -> result
    if: function (cond, then_br, else_br) {
        if (cond()) {
            return then_br();
        } else if (else_br) {
            return else_br();
        }
    },

    // simple loop
    // proto: loop(count, body) -> all result
    loop: function (count, body) {
        var all = [];
        for (var i = count(); i != 0; --i) {
            all.push(body());
        }
        return all;
    },

    // for loop
    // proto: for(init, cond, step, body) -> all result
    for: function (init, cond, step, body) {
        var all = [];
        for (init(); cond(); step()) {
            all.push(body());
        }
        return all;
    },

    // while loop
    // proto: while(cond, body) -> all result
    while: function (cond, body) {
        var all = [];
        while (cond()) {
            all.push(body());
        }
        return all;
    },

    // until (do-while) loop
    // proto: until(cond, body) -> all result
    until: function (cond, body) {
        var all = [];
        do {
            all.push(body());
        } while (cond());
        return all;
    },
}, lion.wrap, lion.W_DELAY);

lion.addfunc(lion.std, {
    // iteration loop (for-in loop) by index
    // proto: each(iter, data, body) -> all result
    each: function (env, iter, data, body) {
        var all = [];

        var name = iter();
        var list = data();

        if (!list instanceof Array) {
            throw '[LION] bad type of list: ' + list;
        }

        for (var i in list) {
            lion.corefunc(env, ['setq', name, ['quote', i]]);
            all.push(body());
        }

        return all;
    },

    // iteration loop (for-in loop) by value
    // proto: apply(iter, data, body) -> all result
    apply: function (env, iter, data, body) {
        var all = [];

        var name = iter();
        var list = data();

        if (!list instanceof Array) {
            throw '[LION] bad type of list: ' + list;
        }

        for (var i in list) {
            lion.corefunc(env, ['setq', name, ['quote', list[Math.floor(i)]]]);
            all.push(body());
        }

        return all;
    },

    // linear for loop
    // proto: table(iter, begin, end, step, body) -> all result
    table: function (env, iter, begin, end, step, body) {
        var all = [];

        var name = iter();

        for (var i = begin(); i < end(); i += step()) {
            lion.corefunc(env, ['setq', name, ['quote', i]]);
            all.push(body());
        }

        return all;
    },

    // try structure
    // proto: try(body, except, finally) -> result
    try: function (env, body, except, finally_do) {
        try {
            return body();
        } catch (e) {
            lion.corefunc(env, ['setq', 'exception', ['quote', e]]);
            return except();
        } finally {
            if (finally_do) {
                finally_do();
            }
        }
    },
}, lion.wrap, lion.W_DELAY | lion.W_ARG_HAS_ENV);

lion.addfunc(lion.std, {
    // throw statement
    // proto: throw(err) -> never return
    throw: function (err) {
        throw err;
    },

    // error constructor
    // proto: error(message, type) -> error object
    error: function (message, type) {
        var map = {
            error: Error,
            eval: EvalError,
            range: RangeError,
            reference: ReferenceError,
            syntax: SyntaxError,
            type: TypeError,
            URI: URIError,
        };

        if (Object.hasOwnProperty.call(map, type)) {
            return map[type](message);
        } else {
            return Error(message);
        }
    },
}, lion.wrap);

//// operators ////

lion.addfunc(lion.std, {
    // unary operators
    // proto: op(a) -> op a (a op)
    positive: function (a) {return +a;},
    negative: function (a) {return -a;},
    // '++': function (a) {return ++a;},
    // '--': function (a) {return --a;},
    // '+++': function (a) {return a++;},
    // '---': function (a) {return a--;},
    '~': function (a) {return ~a;},
    typeof: function (a) {return typeof a;},

    // binary operators
    // proto: op(a, b) -> a op b
    '+': function (a, b) {return a + b;},
    '-': function (a, b) {return a - b;},
    '*': function (a, b) {return a * b;},
    '/': function (a, b) {return a / b;},
    '%': function (a, b) {return a % b;},
    '<': function (a, b) {return a < b;},
    '>': function (a, b) {return a > b;},
    '<=': function (a, b) {return a <= b;},
    '>=': function (a, b) {return a >= b;},
    '==': function (a, b) {return a == b;},
    '!=': function (a, b) {return a != b;},
    '===': function (a, b) {return a === b;},
    '!==': function (a, b) {return a !== b;},
    '<<': function (a, b) {return a << b;},
    '>>': function (a, b) {return a >> b;},
    '>>>': function (a, b) {return a >>> b;},
    '&': function (a, b) {return a & b;},
    '^': function (a, b) {return a ^ b;},
    '|': function (a, b) {return a | b;},
    in: function (a, b) {return a in b;},
    is: function (a, b) {return (typeof a) == b;}, // custom
    instanceof: function (a, b) {
        var map = {
            Object: Object,
            Function: Function,
            Array: Array,
            String: String,
            Boolean: Boolean,
            Number: Number,
            Date: Date,
            RegExp: RegExp,
            Error: Error,
            EvalError: EvalError,
            RangeError: RangeError,
            ReferenceError: ReferenceError,
            SyntaxError: SyntaxError,
            TypeError: TypeError,
            URIError: URIError,
        };

        if (Object.hasOwnProperty.call(map, b)) {
            return a instanceof map[b];
        }
    },
}, lion.wrap);

lion.addfunc(lion.std, {
    // unary operators
    // proto: op(a) -> op a (a op)
    '!': function (a) {return !a();},
    void: function (a) {return void a();},

    // binary operators
    // proto: op(a, b) -> a op b
    '&&': function (a, b) {return a() && b();},
    '||': function (a, b) {return a() || b();},
    ',': function (a, b) {return a() , b();},
    // '=': function (a, b) {return a() = b();}, // +=, -=, ...
    // new
    // delete
    // '[]'

    // inline if
    // proto: ?:(a, b, c) -> a ? b : c
    '?:': function (a, b, c) {return a() ? b() : c();},
}, lion.wrap, lion.W_DELAY);

//// list & dict & string ////

lion.addfunc(lion.std, {
    // call and return arguments as a list
    // proto: list(...) -> [...]
    list: function (arr) {
        return arr;
    },

    // call and return the last argument
    // proto: do(...) -> [...]
    do: function (arr) {
        return arr[arr.length - 1];
    },

    // make a dict (object)
    // proto: dict(key, value, ...) -> {key: value, ...}
    dict: function (arr) {
        var newenv = {
            LIONJS: true,
        };

        for (var i = 0; i < arr.length; i += 2) {
            lion.corefunc(newenv, ['setq', arr[i], arr[i + 1]]);
        }

        return newenv;
    },
}, lion.wrap, lion.W_ARG_AS_ARR);

lion.addfunc(lion.std, {
    // get the length of array
    // proto: length(arr) -> arr.length
    length: function (arr) {
        if (arr instanceof Array || typeof arr == 'string') {
            return arr.length;
        }
    },

    // get member from array
    // proto: index(arr, i) -> arr[i]
    index: function (arr, i) {
        // notice: the index should be an integer
        if (arr instanceof Array || typeof arr == 'string') {
            return arr[Math.floor(i)];
        } else {
            throw '[LION] bad type of index: ' + i;
        }
    },

    // get member from array (loop if out of range)
    // proto: xindex(arr, i) -> arr[i]
    xindex: function (arr, i) {
        // notice: the index should be an integer
        if (arr instanceof Array || typeof arr == 'string') {
            return arr[Math.floor(i - Math.floor(i / arr.length) * arr.length)];
        } else {
            throw '[LION] bad type of index: ' + i;
        }
    },

    // set member in array
    // proto: indexset(arr, i, value) -> arr
    indexset: function (arr, i, value) {
        if (arr instanceof Array) {
            arr[Math.floor(i)] = value;
            return arr;
        } else {
            throw '[LION] bad type of index: ' + i;
        }
    },
}, lion.wrap);

//// js built-in ////

lion.addfunc(lion.std, {
    NaN: ['quote', NaN],
    Infinity: ['quote', Infinity],
    undefined: ['quote', undefined],

    E: ['quote', Math.E],
    LN10: ['quote', Math.LN10],
    LN2: ['quote', Math.LN2],
    LOG2E: ['quote', Math.LOG2E],
    LOG10E: ['quote', Math.LOG10E],
    PI: ['quote', Math.PI],
    SQRT1_2: ['quote', Math.SQRT1_2],
    SQRT2: ['quote', Math.SQRT2],

    NUMMAX: ['quote', Number.MAX_VALUE],
    NUMMIN: ['quote', Number.MIN_VALUE],
});

lion.addfunc(lion.std, {
    isNaN: isNaN,
    isFinite: isFinite,
    isArray: Array.isArray,

    int: parseInt,
    float: parseFloat,
    dateParse: Date.parse, // TODO: ?
    chr: String.fromCharCode,

    decodeURI: decodeURI,
    decodeURIComponent: decodeURIComponent,
    encodeURI: encodeURI,
    encodeURIComponent: encodeURIComponent,
    // escape: escape,
    // unescape: unescape,

    utc: Date.UTC,
    now: Date.now,

    // TODO: more
    // TODO: add instanceof

    // object: Object,
    // function: Function,
    array: Array,
    string: String,
    boolean: Boolean,
    number: Number,
    date: Date,
    regExp: RegExp,
}, lion.wrap);

lion.addfunc(lion.std, {
    Math: Math,
}, lion.wrapobj);

lion.addfunc(lion.std, {
    // Object
    // Function
    Array: Array.prototype,
    String: String.prototype,
    Boolean: Boolean.prototype,
    Number: Number.prototype,
    Date: Date.prototype,
    RegExp: RegExp.prototype,
    Error: Error.prototype,
}, lion.wrapobj, lion.W_METHOD);

//// alias ////

lion.addfunc(lion.std, {
    ':': 'get',
    ':=': 'set',
    '=': 'var',
    '': 'quote',
    '~~': 'negative',
    '\\': 'lambda',
    repr: 'stringify',
    unescape: 'decodeURIComponent',
    escape: 'encodeURIComponent',
});
