'use strict';

lion.addfunc(lionstd, {
    add: function (a, b) {return a + b;},
    sub: function (a, b) {return a - b;},
    mul: function (a, b) {return a * b;},
    div: function (a, b) {return a / b;},
    mod: function (a, b) {return a % b;},
}, lion.wrap);
