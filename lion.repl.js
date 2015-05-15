var lion = require('./lion').lion;

process.stdout.write('Lion.js REPL\n\n');

process.stdin.on(
    'readable',
    function () {
        var input = process.stdin.read();

        if (input !== null) {
            var text = input.toString().trim();

            if (text !== '') {
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
);
