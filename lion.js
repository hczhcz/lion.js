'use strict';

//////// utilities ////////

var lion = {

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

            // see lioncore.envq
            envq: function (env, ast) {
                return ['LIONSTD', ['getq', envname]];
            },

            // see lioncore.xgetq
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
                    return lioncore.xgetq(env, ast); // TODO: ?
                }
            },
        };
    },

    // add checker to a function (for lioncore)
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
            env[i] = hook ? hook(pkg[i], option, i) : pkg[i];
        }
    },

    // execute an AST by getting a callee
    call: function (env, ast) {
        if (ast instanceof Array) {
            // is a function call

            var callee = lion.call(env, ast[0]);

            if (callee == 'LIONSTD') {
                // call with std
                return lion.call(lionstd, ast[1]);
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

    // search core function in env and lioncore
    corefunc: function (env, ast) {
        var name = ast[0];
        var func;

        if (Object.hasOwnProperty.call(env, name)) {
            func = env[name];
        } else if (Object.hasOwnProperty.call(lioncore, name)) {
            func = lioncore[name];
        }

        return func(env, ast);
    },
};

//////// core functions ////////

var lioncore = {};

// core-level names:
//     LIONJS
//     LIONSTD
//     callq
//     envq
//     hasq
//     getq
//     xgetq
//     setq
//     delq
//     parent
//     caller
//     callenv

lion.addfunc(lioncore, {
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

    // check if value is in current environment
    // proto: hasq('name) -> result
    hasq: function (env, ast) {
        var name = ast[1];

        if ((name in env) && !Object.hasOwnProperty.call(env, name)) {
            // js internal property
            throw '[LION] name is not acceptable: ' + name;
        } else {
            return Object.hasOwnProperty.call(env, name);
        }
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
            } else if (env != lionstd) {
                // find from standard library
                return lion.corefunc(lionstd, ['getq', name]);
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

var lionstd = {
    LIONJS: true,
};

//// access & call ////

lion.addfunc(lionstd, {
    // core functions
    callq: function (env, ast) {return lioncore.callq(env, ast);},
    envq: function (env, ast) {return 'LIONSTD';},
    hasq: function (env, ast) {return lioncore.hasq(env, ast);},
    getq: function (env, ast) {return lioncore.getq(env, ast);},
    xgetq: function (env, ast) {return lioncore.xgetq(env, ast);},
    setq: function (env, ast) {return lioncore.setq(env, ast);},
    delq: function (env, ast) {return lioncore.delq(env, ast);},
});

lion.addfunc(lionstd, {
    // hasq() with calling
    // proto: has(name) -> value
    has: function (env, name) {
        return lion.corefunc(env, ['hasq', name]);
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

lion.addfunc(lionstd, {
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

//// function ////

lion.addfunc(lionstd, {
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

lion.addfunc(lionstd, {
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

lion.addfunc(lionstd, {
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

lion.addfunc(lionstd, {
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
    'if': function (cond, then_br, else_br) {
        if (cond()) {
            return then_br();
        } else if (else_br) {
            return else_br();
        }
    },

    // try structure
    // proto: try(body, except, finally) -> result
    'try': function (body, except, finally_do) {
        try {
            return body();
        } catch (e) {
            return except();
        } finally {
            finally_do();
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
    'for': function (init, cond, step, body) {
        var all = [];
        for (init(); cond(); step()) {
            all.push(body());
        }
        return all;
    },

    // while loop
    // proto: while(cond, body) -> all result
    'while': function (cond, body) {
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

lion.addfunc(lionstd, {
    // iteration loop (for-in loop) by index
    // proto: each(iter, data, body) -> all result
    each: function (env, iter, data, body) {
        var all = [];

        var name = iter();
        var list = data();
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
        for (var i in list) {
            lion.corefunc(env, ['setq', name, ['quote', list[i]]]);
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
}, lion.wrap, lion.W_DELAY | lion.W_ARG_HAS_ENV);

//// operators ////

lion.addfunc(lionstd, {
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
    instanceof: function (a, b) {return a instanceof b;},
}, lion.wrap);

lion.addfunc(lionstd, {
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

//// list & dict ////

lion.addfunc(lionstd, {
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

lion.addfunc(lionstd, {
    // get the length of array
    // proto: length(arr) -> arr.length
    length: function (arr) {
        return arr.length;
    },

    // get member from array
    // proto: index(arr, i) -> arr[i]
    index: function (arr, i) {
        // notice: the index should be an integer
        if (arr instanceof Array) {
            return arr[Math.floor(i)];
        } else {
            throw '[LION] bad type of index: ' + i;
        }
    },

    // get member from array (loop if out of range)
    // proto: xindex(arr, i) -> arr[i]
    xindex: function (arr, i) {
        // notice: the index should be an integer
        if (arr instanceof Array) {
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

//// JSON ////

lion.addfunc(lionstd, {
    // string to AST (JSON only)
    // proto: parse(str) -> ast
    parse: function (json) {return JSON.parse(json);},
    // AST to string (JSON only)
    // proto: repr(ast) -> str
    repr: function (ast) {return JSON.stringify(ast);},
}, lion.wrap);

//// js built-in ////

lion.addfunc(lionstd, {
    // TODO: ??
    isFinite: isFinite,
    isNaN: isNaN,

    array: Array,
    boolean: Boolean,
    number: Number,
    string: String,
    date: Date,
    regExp: RegExp,
    // object: Object,
    // function: Function,
    // error: Error
    integer: parseInt,
    float: parseFloat,
}, lion.wrap);

lion.addfunc(lionstd, {
    Math: Math,
    JSON: JSON,
}, lion.wrapobj);

lion.addfunc(lionstd, {
    Array: Array.prototype,
    Boolean: Boolean.prototype,
    Number: Number.prototype,
    String: String.prototype,
    Date: Date.prototype,
    RegExp: RegExp.prototype,
    // lion.call(lionstd, ['Array', ['slice', ['list', 1, 2, 3], 1]]) // ???
}, lion.wrapobj, lion.W_METHOD);

//// alias ////

lion.addfunc(lionstd, {
    ':': 'get',
    ':=': 'set',
    // '=': 'var',
    '': 'quote',
    neg: 'negative',
    '\\': 'lambda',
});
