'use strict';

var lion = require('./lion');
var lion_test = require('./lion.test').test;

// initialize the environment

var env = lion.init();

// start REPL

process.stdout.write('Lion.js REPL\n\n');

process.stdout.write('> ');

process.stdin.on(
    'readable',
    function () {
        var input = process.stdin.read();

        if (input !== null) {
            var text = input.toString().trim();

            if (text !== '') {
                var handlers = {};

                // show help (list all names)
                handlers['help'] = handlers['h'] = function () {
                    var keys = Object.getOwnPropertyNames(lion.std).sort();

                    process.stdout.write(JSON.stringify(keys) + '\n');
                };

                // run test cases
                handlers['test'] = handlers['t'] = function () {
                    lion_test(
                        lion,
                        function (input, expected, result, ast_in, ast_out) {
                            process.stdout.write('================\n');
                            process.stdout.write('input: ' + '\n');
                            process.stdout.write('    ' + input + '\n');
                            process.stdout.write('result: ' + '\n');
                            process.stdout.write('    ' + result + '\n');

                            if (ast_out != undefined) {
                                process.stdout.write('expected: ' + '\n');
                                process.stdout.write('    ' + expected + '\n');
                            }
                        }
                    );

                    process.stdout.write('================\n');
                    process.stdout.write('test finished\n');
                };

                // reset the environment
                handlers['reset'] = handlers['r'] = function () {
                    env = lion.init();
                };

                // exit REPL
                handlers['exit'] = handlers['q'] = function () {
                    process.exit();
                };

                if (handlers[text]) {
                    handlers[text]();
                } else {
                    try {
                        var result = lion.exec(env, text);

                        process.stdout.write(result + '\n');
                    } catch (e) {
                        process.stdout.write(e.toString() + '\n');
                    }
                }
            }

            process.stdout.write('> ');
        }
    }
);

process.stdin.on(
    'end',
    function () {
        process.stdout.write('\n');
    }
);
