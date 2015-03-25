if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([], function() {
    return {
        isPrimitive: isPrimitive
    };

    function isPrimitive(val) {
        if (val === null) { return true; } // to avoid false positive on typeof 'object' test below
        switch (typeof val) {
            case 'object':
            case 'function':
            case 'symbol':
                return false;
            default:
                return true;
        }
    }
});
