'use strict';

var lion = require('./lion');
var lion_test = require('./lion.test').test;

var env = lion.init();

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

                handlers['help'] = handlers['h'] = function () {
                    var keys = Object.getOwnPropertyNames(lion.std).sort();

                    process.stdout.write(JSON.stringify(keys) + '\n');
                };

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

                handlers['reset'] = handlers['r'] = function () {
                    env = lion.init();
                };

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
