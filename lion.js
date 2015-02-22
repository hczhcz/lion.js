'use strict';

//////// utilities ////////

var lion = {

    //////// constants ////////

    W_DELAY: 1,
    W_ARG_HAS_ENV: 2,
    W_ARG_AS_ARR: 4,

    //////// helper functions ////////

    // convert f([env, ]arg...) to g(env, ast) with calls
    wrap: function (func, option) {
        return function (env, ast) {
            var arg = [];

            // scan arguments
            var l = ast.length;
            for (var i = 1; i < l; ++i) {
                if (option & lion.W_DELAY) {
                    // make a function
                    arg.push(function (target) {
                        return function () {
                            return lion.call(env, target);
                        }
                    } (ast[i]));
                } else {
                    // call directly
                    arg.push(
                        lion.call(env, ast[i])
                    );
                }
            }

            if (option & lion.W_ARG_AS_ARR) {
                if (option & lion.W_ARG_HAS_ENV) {
                    return func(env, arg);
                } else {
                    return func(arg);
                }
            } else {
                if (option & lion.W_ARG_HAS_ENV) {
                    arg.unshift(env);
                }
                return func.apply(this, arg);
            }
        };
    },

    // convert a native object to an environment
    wrapobj: function (obj, option) {
        return {
            LIONJS: true,

            // see lioncore.getq
            getq: function (env, ast) {
                var name = ast[1];

                if (Object.hasOwnProperty.call(obj, name)) {
                    return lion.wrap(obj[name], option);
                } else {
                    return lioncore.getq(env, ast); // TODO: ?
                }
            },

            // see lioncore.setq
            setq: function (env, ast) {
                var name = ast[1];
                var value = ast[2];

                return lioncore.setq(env, ast); // TODO: ?
                // throw '[LION] the environment is readonly: ' + name;
            },

            // see lioncore.delq
            delq: function (env, ast) {
                var name = ast[1];

                return lioncore.delq(env, ast); // TODO: ?
                // throw '[LION] the environment is readonly: ' + name;
            },
        };
    },

    // add library functions
    addfunc: function (env, pkg, hook, option) {
        for (var i in pkg) {
            env[i] = hook ? hook(pkg[i], option) : pkg[i];
        }
    },

    // add library functions (general situation)
    addfuncauto: function (env, pkg) {
        lion.addfunc(env, pkg, lion.wrap);
    },

    // execute an AST by getting a callee
    call: function (env, ast) {
        if (ast instanceof Array) {
            // is a function call

            var callee = lion.call(env, ast[0]);

            // call it
            return lion.corefunc(
                env,
                ['callq', callee, ast]
            );
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
//     callq
//     getq
//     setq
//     delq
//     parent
//     caller
//     callenv

lion.addfunc(lioncore, {
    // execute an AST with a given callee
    // proto: callq('callee, 'caller) -> result
    callq: function (env, ast) {
        // TODO: check LIONJS tag

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
                callenv: env,
            };

            return lion.call(newenv, callee);
        } else if (callee instanceof Object) {
            // callee is an object

            // use callee as the new environment
            var result = lion.call(callee, caller.slice(1));

            return result;
        } else {
            // callee is not callable
            return callee;
            // throw '[LION] callee is not callable: ' + callee;
        }
    },

    // get value from the environment or its parent
    // proto: getq('name) -> value
    getq: function (env, ast) {
        var name = ast[1];

        // if (!(name instanceof String)) {
        if (typeof name != 'string') {
            // not a name
            throw '[LION] name is not string: ' + name;
        } else if ((name in env) && !Object.hasOwnProperty.call(env, name)) {
            // js internal property
            throw '[LION] name is not acceptable: ' + name;
        } else {
            if (Object.hasOwnProperty.call(env, name)) {
                // found
                return env[name];
            } else {
                // not found
                if (Object.hasOwnProperty.call(env, 'parent')) {
                    // find from env's parent
                    return lion.corefunc(env.parent, ['getq', name]);
                } else if (env != lionstd) {
                    // find from standard library
                    return lion.corefunc(lionstd, ['getq', name]);
                } else {
                    // not found
                    return undefined;
                    // throw '[LION] value not found: ' + name;
                }
            }
        }
    },

    // set value in the environment
    // proto: setq('name, 'value) -> value
    setq: function (env, ast) {
        var name = ast[1];
        var value = ast[2];

        // if (!(name instanceof String)) {
        if (typeof name != 'string') {
            // not a name
            throw '[LION] name is not string: ' + name;
        } else if ((name in env) && !Object.hasOwnProperty.call(env, name)) {
            // js internal property
            throw '[LION] name is not acceptable: ' + name;
        } else {
            return env[name] = value;
        }
    },

    // delete value in the environment
    // proto: delq('name) -> success
    delq: function (env, ast) {
        var name = ast[1];

        // if (!(name instanceof String)) {
        if (typeof name != 'string') {
            // not a name
            throw '[LION] name is not string: ' + name;
        } else if ((name in env) && !Object.hasOwnProperty.call(env, name)) {
            // js internal property
            throw '[LION] name is not acceptable: ' + name;
        } else {
            return delete env[name];
        }
    },
});

//////// the standard library ////////

var lionstd = {LIONJS: true};

//// access ////

lion.addfunc(lionstd, {
    // core functions
    callq: function (env, ast) {return lioncore.callq(env, ast);},
    getq: function (env, ast) {return lioncore.getq(env, ast);},
    setq: function (env, ast) {return lioncore.setq(env, ast);},
    delq: function (env, ast) {return lioncore.delq(env, ast);},
});

lion.addfunc(lionstd, {
    // getq() with calling
    // proto: get(name) -> value
    get: function (env, name) {
        return lion.corefunc(env, ['getq', name]);
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

//// call ////

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
    // give name to arguments with wrap
    // proto: setarg(func, ...) -> caller
    setarg: function (env, arr) {
        // get arguments
        var caller = lion.corefunc(
            env,
            ['getq', 'caller']
        );

        var func = arr[0];

        for (var i = 1; i < arr.length; ++i) {
            lion.corefunc(
                env,
                ['setq', arr[i], (
                    func ?
                    ['callenv', func, caller[i]] :
                    caller[i]
                )]
            );
        }

        return caller;
    },
}, lion.wrap, lion.W_ARG_HAS_ENV | lion.W_ARG_AS_ARR);

lion.addfunc(lionstd, {
    // make a lambda function
    // proto: lambda(..., body)
    lambda: function (env, ast) {
        var setparent = ['setq', 'parent', env];
        var setarg = ['setarg', 'pass'];

        for (var i = 1; i < ast.length - 1; ++i) {
            setarg.push(ast[i]);
        }

        return [
            'do',
            setparent,
            setarg,
            ast[ast.length - 1]
        ]
    },

    // make a lambda function (do not wrap arguments)
    // proto: lambdar(..., body)
    lambdar: function (env, ast) {
        var setparent = ['setq', 'parent', env];
        var setarg = ['setarg', ''];

        for (var i = 1; i < ast.length - 1; ++i) {
            setarg.push(ast[i]);
        }

        return [
            'do',
            setparent,
            setarg,
            ast[ast.length - 1]
        ]
    },
});

//// control flow ////

lion.addfunc(lionstd, {
    // return arguments as a list
    // proto: listq(...) -> [...]
    listq: function (env, ast) {
        return ast.slice(1);
    },
});

lion.addfunc(lionstd, {
    // call and return arguments as a list
    // proto: list(...) -> [...]
    list: function (arr) {return arr;},

    // call and return the last argument
    // proto: do(...) -> [...]
    do: function (arr) {return arr[arr.length - 1];},
}, lion.wrap, lion.W_ARG_AS_ARR);

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

    // simple loop
    // proto: loop (count, body) -> all result
    loop: function (count, body) {
        var all = [];
        for (var i = count(); i != 0; --i) {
            all.push(body());
        }
        return all;
    },

    // for loop
    // proto: for (init, cond, step, body) -> all result
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
    // proto: each (iter, data, body) -> all result
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
    // proto: apply (iter, data, body) -> all result
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
}, lion.wrap, lion.W_DELAY | lion.W_ARG_HAS_ENV);

//// JSON ////

lion.addfuncauto(lionstd, {
    // string to AST (JSON only)
    // proto: parse(str) -> ast
    parse: function (json) {return JSON.parse(json);},
    // AST to string (JSON only)
    // proto: repr(ast) -> str
    repr: function (ast) {return JSON.stringify(ast);},
});

//// operators ////

lion.addfuncauto(lionstd, {
    // unary operators
    // proto: op(a) -> op a (a op)
    positive: function (a) {return +a;},
    negative: function (a) {return -a;},
    '++': function (a) {return ++a;},
    '--': function (a) {return --a;},
    '+++': function (a) {return a++;},
    '---': function (a) {return a--;},
    '!': function (a) {return !a;},
    '~': function (a) {return ~a;},
    typeof: function (a) {return typeof a;},
    void: function (a) {return void a;},

    // binary operators
    // proto: op(a, b) -> a op b
    // TODO: logic?
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
    '&&': function (a, b) {return a && b;},
    '||': function (a, b) {return a || b;},
    '<<': function (a, b) {return a << b;},
    '>>': function (a, b) {return a >> b;},
    '>>>': function (a, b) {return a >>> b;},
    '&': function (a, b) {return a & b;},
    '^': function (a, b) {return a ^ b;},
    '|': function (a, b) {return a | b;},
    ',': function (a, b) {return a , b;},
    // '=': function (a, b) {return a = b;}, // +=, -=, ...
    in: function (a, b) {return a in b;},
    is: function (a, b) {return (typeof a) == b;}, // custom
    instanceof: function (a, b) {return a instanceof b;},
    // new, delete
    // a ? b : c
});

//// array ////

lion.addfuncauto(lionstd, {
    // get the length of array
    // proto: length(arr) -> arr.length
    length: function (arr) {
        return arr.length;
    },

    // get member from array
    // proto: index(arr, i) -> arr[i]
    index: function (arr, i) {
        // notice: the index should be an integer
        return arr[Math.floor(i)];
    },

    // indexset: function (arr, i, value) {arr[i] = value; return arr;}
});

//// js built-in ////

lion.addfunc(lionstd, {
    'math': Math,
    'json': JSON,
}, lion.wrapobj);

//// alias ////

lion.addfunc(lionstd, {
    ':': 'get',
    ':=': 'set',
    // '=': 'var',
    '': 'quote',
    'neg': 'negative',
    '\\': 'lambda',
});
