'use strict';

//////// utilities ////////

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

    // add library functions
    addfunc: function (env, pkg, hook, option) {
        for (var i in pkg) {
            env[i] = hook ? hook(pkg[i], option) : pkg[i];
        }
    },

    // initialize an environment
    init: function (env) {
        if (!env) {
            env = lionstd;
        }

        return {
            get: env.get,
            set: env.set,
        };
    },

    // execute an AST
    call: function (env, ast) {
        if (ast instanceof Array) {
            // is callable
            var name = lion.call(env, ast[0]);
            return env.get(env, ['get', name])(env, ast);
        } else {
            // is atomic
            return ast;
        }
    },
};

//////// the standard library ////////

var lionstd = {};

//////// built-in functions ////////

lion.addfunc(lionstd, {
    // get value from the environment or its parent
    // proto: get(name) -> ast
    get: function (env, ast) {
        if (!(ast[1] instanceof String)) {
            // not a name
            return ast[1];
        } else if ((ast[1] in env) && !env.hasOwnProperty(ast[1])) {
            // js internal property
            throw '[LION] name is not acceptable: ' + ast[1];
        } else {
            return env[ast[1]] || (
                env.parent && env.parent.get(env.parent, ast)
            );
        }
    },

    // set value in the environment
    // proto: set(name, ast)
    set: function (env, ast) {
        if (!(ast[1] instanceof String)) {
            // not a name
            throw '[LION] name is not string: ' + ast[1];
        } else if ((ast[1] in env) && !env.hasOwnProperty(ast[1])) {
            // js internal property
            throw '[LION] name is not acceptable: ' + ast[1];
        } else {
            env[ast[1]] = ast[2];
        }
    },
}, lion.wrap, W_ENVCALL);

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
