var lion = require('./lion');
var lion_test = require('./lion_test').test;

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

                if (handlers[text]) {
                    handlers[text]();
                } else {
                    try {
                        var result = JSON.stringify(
                            lion.boot(
                                JSON.parse(text)
                            )
                        );

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
