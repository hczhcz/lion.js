var lion = require('./lion');
var lion_test = require('./lion.test').test;

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

                handlers['exit'] = handlers['q'] = function () {
                    process.exit()
                };

                handlers['help'] = handlers['h'] = function () {
                    var keys = Object.getOwnPropertyNames(lion.std).sort();

                    process.stdout.write(JSON.stringify(keys) + '\n');
                };

                handlers['test'] = handlers['t'] = function () {
                    lion_test(function (ast_in, ast_out) {
                        var input;
                        var expected;
                        var result;

                        try {
                            input = JSON.stringify(ast_in);
                            expected = JSON.stringify(ast_out);
                        } catch (e) {
                            input = 'null';
                            expected = e;
                        }

                        try {
                            result = lion.bootstr(input);
                        } catch (e) {
                            result = e;
                        }

                        if (result !== expected || result === 'null') {
                            process.stdout.write('================\n');
                            process.stdout.write('input: ' + '\n');
                            process.stdout.write('    ' + input + '\n');
                            process.stdout.write('result: ' + '\n');
                            process.stdout.write('    ' + result + '\n');
                        }
                    });

                    process.stdout.write('================\n');
                    process.stdout.write('test finished\n');
                };

                if (handlers[text]) {
                    handlers[text]();
                } else {
                    try {
                        var result = lion.bootstr(text);

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
