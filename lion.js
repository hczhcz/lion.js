'use strict';

// utilities
var lion = {
    //////// constants ////////

    W_DELAY: 1,
    W_ENVCALL: 2,

    //////// helper functions ////////

    // convert f(...) to g(env, ast)
    wrap: function (func, option) {
        return function (env, ast) {
            var argret = (option & lion.W_ENVCALL) ? [env] : [];

            for (var i = 1; i < ast.length; ++i) {
                argret.push(
                    (option & lion.W_DELAY) ?
                        // make a function
                        function () {lion.call(env, ast[i]);} :
                        // call directly
                        lion.call(env, ast[i])
                );
            }

            return func.apply(this, argret);
        };
    },

    // set a library function
    stdraw: function (name, func) {
        return lionstd[name] = func;
    },

    // set a library function with wrap
    stdwrap: function (name, func, option) {
        return lionstd[name] = lion.wrap(func, option);
    },

    // execute an AST
    call: function (env, ast) {
        if (ast instanceof Array) {
            // is callable
            return env.get(env, ['get', ast[0]])(env, ast);
        } else {
            // is atomic
            return ast;
        }
    },

    //////// built-in functions ////////

    // get value from the environment or its parent
    get: function (env, ast) {
        while (ast[1] instanceof Array) {
            ast[1] = lion.call(env, ast[1]);
        }

        return env[ast[1]] || (
            env.parent && env.parent.get(env.parent, ast)
        );
    },

    // set value in the environment
    set: function (env, ast) {
        while (ast[1] instanceof Array) {
            ast[1] = lion.call(ast[1]);
        }

        env[ast[1]] = lion.call(ast[2]);
    },

    // initialize an environment
    init: function (env, ast) {
        if (!env) {
            env = lionstd;
        }

        return {
            parent: env,
            get: env.get,
            set: env.set,
        };
    },

    // return an AST object
    quote: function (env, ast) {
        return ast[1];
    },
};

// the standard library
var lionstd = {
    parent: undefined,
    get: lion.get,
    set:lion.set,
    init: lion.init,
    quote: lion.quote,
};
