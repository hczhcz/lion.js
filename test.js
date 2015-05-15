'use strict';

lion_test(
    lion,
    function (input, expected, result, ast_in, ast_out) {
        document.writeln('<hr>');
        document.writeln('<b>Input:</b>' + '<pre>' + input + '</pre>');
        document.writeln('<b>Output:</b>' + '<pre>' + result + '</pre>');

        if (ast_out != undefined) {
            document.writeln('<b>Expected:</b>' + '<pre>' + expected + '</pre>');
        }
    }
);

document.writeln('<hr><b>Finished.</b>');
