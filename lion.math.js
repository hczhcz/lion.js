'use strict';

lion.stdwrap('add', function (a, b) {return a + b;});
lion.stdwrap('sub', function (a, b) {return a - b;});
lion.stdwrap('mul', function (a, b) {return a * b;});
lion.stdwrap('div', function (a, b) {return a / b;});
lion.stdwrap('mod', function (a, b) {return a % b;});
