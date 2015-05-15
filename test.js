'use strict';

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

    if (
        result !== expected
        || ast_in == undefined
        || ast_out == undefined
    ) {
        document.writeln('<hr>');
        document.writeln('<b>Input:</b>' + '<pre>' + input + '</pre>');
        document.writeln('<b>Output:</b>' + '<pre>' + result + '</pre>');

        if (ast_out != undefined) {
            document.writeln('<b>Expected:</b>' + '<pre>' + expected + '</pre>');
        }
    }
});

document.writeln('<hr><b>Finished.</b>');
