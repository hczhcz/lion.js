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
            var arg = (option & lion.W_ARG_HAS_ENV) ? [env] : [];

            // scan arguments
            var l = ast.length;
            for (var i = 1; i < l; ++i) {
                if (option & lion.W_DELAY) {
                    // make a function
                    arg.push(function () {
                        lion.call(env, ast[i]);
                    });
                } else {
                    // call directly
                    arg.push(
                        lion.call(env, ast[i])
                    );
                }
            }

            if (option & lion.W_ARG_AS_ARR) {
                return func(arg);
            } else {
                return func.apply(this, arg);
            }
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

            // get the callee from the environment
            var callee = lion.corefunc(
                env,
                ['getq', lion.call(env, ast[0])]
            );

            // call it
            return lion.corefunc(
                env,
                ['call', callee, ast]
            );
        } else {
            // is an object
            return ast;
        }
    },

    // search core function in env and lionstd
    corefunc: function (env, ast) {
        var name = ast[0];
        var func = env.hasOwnProperty(name) ? env[name] : lionstd[name];

        return func(env, ast);
    }
};

//////// the standard library ////////

var lionstd = {};

//////// core functions ////////

// core names:
//     call
//     getq
//     setq
//     parent
//     caller
//     callenv

lion.addfunc(lionstd, {
    // execute an AST with a given callee
    // proto: call('callee, 'caller) -> result
    call: function (env, ast) {
        var callee = ast[1];
        var caller = ast[2];

        if (callee instanceof Function) {
            // callee is a builtin function
            return callee(env, caller);
        } else if (callee instanceof Array) {
            // callee is an AST
            // call with a new environment
            var newenv = {
                parent: env,
                caller: caller,
            };
            return lion.call(newenv, callee);
        } else {
            // callee is an object
            callee.callenv = function () {return env;};
            return lion.call(callee, caller.slice(1));
        // } else {
        //     // callee is not callable
        //     throw '[LION] callee is not callable: ' + callee;
        }
    },

    // get value from the environment or its parent
    // proto: getq('name) -> value
    getq: function (env, ast) {
        var name = ast[1];

        // if (!(name instanceof String)) {
        if (typeof name != 'string') {
            // not a name
            return name;
        } else if ((name in env) && !env.hasOwnProperty(name)) {
            // js internal property
            throw '[LION] name is not acceptable: ' + name;
        } else {
            var result = env[name];

            if (!result) {
                // find from env's parent
                var parent = env.parent;

                if (!parent && (env != lionstd)) {
                    // find from standard library
                    parent = lionstd;
                }

                // call
                if (parent) {
                    result = lion.corefunc(parent, ['getq', name]);
                }
            }

            return result;
        }
    },

    // set value in the environment
    // proto: setq('name, 'value)
    setq: function (env, ast) {
        var name = ast[1];
        var value = ast[2];

        // if (!(name instanceof String)) {
        if (typeof name != 'string') {
            // not a name
            throw '[LION] name is not string: ' + name;
        } else if ((name in env) && !env.hasOwnProperty(name)) {
            // js internal property
            throw '[LION] name is not acceptable: ' + name;
        } else {
            env[name] = value;
        }
    },
});

//////// built-in functions ////////

//// call & access ////

lion.addfunc(lionstd, {
    // getq() with calling
    // proto: get(name) -> value
    get: function (env, name) {return lion.corefunc(env, ['getq', name])},
    // setq() with calling
    // proto: set(name, value)
    set: function (env, name, value) {lion.corefunc(env, ['setq', name, value])},
}, lion.wrap, lion.W_ARG_HAS_ENV);

lion.addfunc(lionstd, {
    // return the AST
    // proto: quote('ast) -> ast
    quote: function (env, ast) {return ast[1];},
    // just calling
    // proto: pass(ast) -> (call)^1 -> result
    pass: function (env, ast) {return lion.call(env, ast[1]);},
    // lion.call() with wrap
    // proto: eval($ast) -> (call)^2 -> result
    eval: function (env, ast) {return lion.call(env, lion.call(env, ast[1]));},
});

//// control flow ////

lion.addfunc(lionstd, {
    // call and return arguments as a list
    // proto: list(...) -> ...
    list: function (arr) {return arr;},
}, lion.wrap, lion.W_ARG_AS_ARR);

lion.addfunc(lionstd, {
    // conditional branch
    // proto: cond(condition, action, ...) -> result
    cond: function () {
        var l = arguments.length;
        for (var i = 0; i + 1 < l; i += 2) {
            if (arguments[i]()) {
                return arguments[i + 1]();
            }
        }
    },

    // simple if branch
    // proto: if(condition, then, else) -> result
    'if': function (condition, then_br, else_br) {
        if (condition()) {
            return then_br();
        } else if (else_br) {
            return else_br();
        }
    },
}, lion.wrap, lion.W_DELAY);

//// JSON ////

lion.addfuncauto(lionstd, {
    // string to AST (JSON only)
    // proto: parse(str) -> ast
    parse: function (json) {return JSON.parse(json)},
    // AST to string (JSON only)
    // proto: repr(ast) -> str
    repr: function (ast) {return JSON.stringify(ast)},
});

//// math ////

lion.addfuncauto(lionstd, {
    add: function (a, b) {return a + b;},
    sub: function (a, b) {return a - b;},
    mul: function (a, b) {return a * b;},
    div: function (a, b) {return a / b;},
    mod: function (a, b) {return a % b;},
});

//// array ////

lion.addfuncauto(lionstd, {
    index: function (arr, i) {return arr[i];},
    // indexset: function (arr, i, value) {arr[i] = value; return arr;}
});
