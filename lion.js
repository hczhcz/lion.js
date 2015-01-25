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

    // convert f([env, ]arg...) to g(env, ast) without calls
    wrapraw: function (func, option) {
        return function (env, ast) {
            var arg = (option & lion.W_ARG_HAS_ENV) ? [env] : [];

            // scan arguments
            var l = ast.length;
            for (var i = 1; i < l; ++i) {
                arg.push(ast[i]);
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
    addfuncauto: function (pkg) {
        lion.addfunc(lionstd, pkg, lion.wrap);
    },

    // execute an AST
    call: function (env, ast) {
        if (ast instanceof Array) {
            // is a function call

            // get the callee from the environment
            var callee = env.getq(env, [
                'getq', lion.call(env, ast[0])
            ]);

            // call it
            return env.call(env, [
                'call', callee, ast
            ]);
        } else {
            // is an object
            return ast;
        }
    },
};

//////// the standard library ////////

var lionstd = {};

//////// core functions ////////

lion.addfunc(lionstd, {
    // initialize an environment
    // proto: init(value) -> env
    init: function (env, value) {
        if (!value) {
            value = {};
        }

        value.parent = env;
        value.getq = env.getq;
        value.setq = env.setq;
        value.call = env.call;

        return value;
    },
}, lion.wrap, lion.W_ARG_HAS_ENV);

lion.addfunc(lionstd, {
    // get value from the environment or its parent
    // proto: getq('name) -> value
    getq: function (env, name) {
        // if (!(name instanceof String)) {
        if (typeof name != 'string') {
            // not a name
            return name;
        } else if ((name in env) && !env.hasOwnProperty(name)) {
            // js internal property
            throw '[LION] name is not acceptable: ' + name;
        } else {
            return env[name] || (
                env.parent && env.parent.getq(env.parent, [
                    'getq', name
                ])
            );
        }
    },

    // set value in the environment
    // proto: setq('name, 'value)
    setq: function (env, name, value) {
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
}, lion.wrapraw, lion.W_ARG_HAS_ENV);

lion.addfunc(lionstd, {
    // execute an AST with arguments
    // proto: call('callee, 'caller) -> result
    call: function (env, ast) {
        var callee = ast[1];
        var caller = ast[2];

        if (callee instanceof Function) {
            // callee is a builtin function
            return callee(env, caller);
        } else if (callee instanceof Array) {
            // callee is an AST
            env.caller = caller;
            return lion.call(env, callee);
        } else if (callee.hasOwnProperty('exec')) {
            // callee is a callable object
            callee.caller = caller;
            callee.callenv = env;
            return lion.call(callee, 'exec');
        } else {
            // callee is not callable
            throw '[LION] callee is not callable: ' + ast[1];
        }
    },
});

//////// built-in functions ////////

//// call & access ////

lion.addfunc(lionstd, {
    // getq() with wrap
    // proto: get(name) -> value
    get: function (env, name) {return env.getq(env, ['getq', name])},
    // setq() with wrap
    // proto: set(name, value)
    set: function (env, name, value) {env.setq(env, ['setq', name, value])},

    // just calling
    // proto: pass(ast) -> (call)^1 -> result
    pass: function (env, ast) {return ast;},
    // lion.call() with wrap
    // proto: eval($ast) -> (call)^2 -> result
    eval: function (env, ast) {return lion.call(env, ast);},
}, lion.wrap, lion.W_ARG_HAS_ENV);

lion.addfunc(lionstd, {
    // return the AST
    // proto: quote('ast) -> ast
    quote: function (env, ast) {return ast[1];},
});

//// control flow ////

lion.addfuncauto({
    // call and return arguments as a list
    // proto: list(...) -> ...
    list: function () {return arguments;},

    // call and return the first argument
    // proto: retfirst(...) -> first
    // retfirst: function () {return arguments[0];},
    // call and return the last argument
    // proto: retlast(...) -> last
    // retlast: function () {return arguments[arguments.length - 1];},
});

lion.addfunc(lionstd, {
}, lion.wrap, lion.W_DELAY);

//// JSON ////

lion.addfuncauto({
    // string to AST (JSON only)
    // proto: parse(str) -> ast
    parse: function (json) {return JSON.parse(json)},
    // AST to string (JSON only)
    // proto: repr(ast) -> str
    repr: function (ast) {return JSON.stringify(ast)},
});

//// math ////

lion.addfuncauto({
    add: function (a, b) {return a + b;},
    sub: function (a, b) {return a - b;},
    mul: function (a, b) {return a * b;},
    div: function (a, b) {return a / b;},
    mod: function (a, b) {return a % b;},
});

//// array ////

lion.addfuncauto({
    index: function (list, i) {return list[i];},
    // indexset: function (list, i, value) {list[i] = value; return list;}
});
