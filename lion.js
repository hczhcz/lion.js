'use strict';

var lion = {
    //////// the standard library ////////

    // the standard library
    stdlib: {},

    // convert f(...) to g(env, ast)
    wrap: function (func, hasenv) {
        return function (env, ast) {
            var argret = hasenv ? [env] : [];

            for (var i = 1; i < ast.length; ++i) {
                argret.push(lion.call(env, ast[i]));
            }

            return func.apply(this, argret);
        };
    },

    // set a library function
    stdfunc: function (name, func) {
        return lion.stdlib[name] = func;
    },

    // set a library function with wrap
    stdfuncwrap: function (name, func, hasenv) {
        return lion.stdlib[name] = lion.wrap(func, hasenv);
    },

    //////// environment ////////

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

lion.stdfunc('quote', lion.quote);
lion.stdfunc('\'', lion.quote);
lion.stdfunc('call', lion.call);
