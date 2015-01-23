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
            // is callable
            var name = lion.call(env, ast[0]);
            return env.get(env, ['get', name])(env, ast);
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
        if (!env) {
            env = lionstd;
        }

        if (!value) {
            value = {};
        }

        value.parent = env;
        value.get = env.get;
        value.set = env.set;

        return value;
    },

    // get value from the environment or its parent
    // proto: get(name) -> ast
    get: function (env, name) {
        // if (!(name instanceof String)) {
        if (typeof name != 'string') {
            // not a name
            return name;
        } else if ((name in env) && !env.hasOwnProperty(name)) {
            // js internal property
            throw '[LION] name is not acceptable: ' + name;
        } else {
            return env[name] || (
                env.parent && env.parent.get(env.parent, name)
            );
        }
    },

    // set value in the environment
    // proto: set(name, value)
    set: function (env, name, value) {
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
}, lion.wrap, lion.W_ENVCALL);

lion.addfunc(lionstd, {

    // return the AST
    // proto: quote(ast)
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
