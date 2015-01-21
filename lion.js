'use strict';

var lion = {
    //////// constants ////////

    W_DELAY: 1,
    W_ENVCALL: 2,

    //////// libraries ////////

    // the standard library
    stdlib: {},

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
        return lion.stdlib[name] = func;
    },

    // set a library function with wrap
    stdwrap: function (name, func, option) {
        return lion.stdlib[name] = lion.wrap(func, option);
    },

    //////// environments ////////

    // initialize an environment
    envinit: function () {
        return {'parent': lion.stdlib};
    },

    // get value from the environment or its parent
    envget: function (env, name) {
        return env[name] || (
            env['parent'] && lion.envget(env['parent'], name)
        );
    },

    // set value in the environment
    envset: function (env, name, value) {
        env[name] = value;
    },

    //////// built-in functions ////////

    // execute an AST
    call: function (env, ast) {
        if (ast instanceof Array) {
            // is callable
            return lion.envget(env, ast[0])(env, ast);
        } else {
            // is atomic
            return ast;
        }
    },

    // return an AST object
    quote: function (env, ast) {
        return ast[1];
    },
};

lion.stdraw('quote', lion.quote);
lion.stdraw('\'', lion.quote);
lion.stdraw('call', lion.call);
