'use strict';

//////// utilities ////////

var lion = {

    //////// constants ////////

    W_DELAY: 1,
    W_ENVCALL: 2,

    //////// helper functions ////////

    // convert f([env, ]arg...) to g(env, ast) with calls
    wrap: function (func, option) {
        return function (env, ast) {
            var arg = (option & lion.W_ENVCALL) ? [env] : [];

            // scan arguments
            for (var i = 1; i < ast.length; ++i) {
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

            return func.apply(this, arg);
        };
    },

    // convert f([env, ]arg...) to g(env, ast) without calls
    wrapraw: function (func, option) {
        return function (env, ast) {
            var arg = (option & lion.W_ENVCALL) ? [env] : [];

            arg = arg.concat(ast.slice(1)); // TODO: performance?

            return func.apply(this, arg);
        };
    },

    // add library functions
    addfunc: function (env, pkg, hook, option) {
        for (var i in pkg) {
            env[i] = hook ? hook(pkg[i], option) : pkg[i];
        }
    },

    // execute an AST
    call: function (env, ast) {
        if (ast instanceof Array) {
            // is a function call

            // get the callee from the environment
            var callee = env.getq(env, [
                'getq', lion.call(env, ast[0])
            ]);

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

//////// built-in functions ////////

lion.addfunc(lionstd, {
    // initialize an environment
    // proto: init(value)
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

    // get value from the environment or its parent
    // proto: getq(name) -> ast
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
    // proto: setq(name, value)
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
}, lion.wrapraw, lion.W_ENVCALL);

lion.addfunc(lionstd, {
    // execute an AST with arguments
    // proto: call(callee, caller) -> result
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

    // return the AST
    // proto: quote(ast) -> ast
    quote: function (env, ast) {
        return ast[1];
    },
});

lion.addfunc(lionstd, {
    add: function (a, b) {return a + b;},
    sub: function (a, b) {return a - b;},
    mul: function (a, b) {return a * b;},
    div: function (a, b) {return a / b;},
    mod: function (a, b) {return a % b;},
}, lion.wrap);
