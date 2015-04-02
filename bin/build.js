#!/usr/bin/env node

var path = require("path");

var rootPath = path.normalize(path.join(__dirname, ".."));
console.log("Root path: ", rootPath);

if (process.argv.length < 3) {
    console.log("Please indicate filename to optimize");
    process.exit();
}
var target = process.argv[2];
var optimize = process.argv[3] ? process.argv[3].trim() : "uglify";

var targetDir="newbuild";

//Load the requirejs optimizer
var requirejs = require('../node_modules/requirejs/bin/r.js');

//Set up basic config, include config that is
//common to all the requirejs.optimize() calls.
var baseConfig = {
    baseUrl: rootPath,
    //  optimize: "uglify",
    optimize: optimize, // For debugging built versions

    wrap: {
        start: "(function(wrapdefine) { wrapdefine(['module'], function(req_module) {",
        end: "    return require('src/firewyrm.js'); \n" +
            "});})(typeof define !== 'undefined' ? define \n" +
            "    // try to define as a CommonJS module instead\n" +
            "    : typeof module !== 'undefined' ? function(deps, factory) {\n" +
            "        module.exports = factory();\n" +
            "       }\n" +
            "    // nothing good exists, just define on current context (ie window)\n" +
            "       : function(deps, factory) { this.FireWyrmJS = factory(null); }\n" +
            ");"
    },
    paths: {
        "request": "lib/request",
        "xmlhttprequest": "lib/xmlhttprequest",
        "libGCPlugin": "../gcplugin/emscripten_build/libGCPlugin"
    },

    //All the built layers will use almond.
    name: 'node_modules/almond/almond'
};

//Create an array of build configs, the baseConfig will
//be mixed in to each one of these below. Since each one needs to
//stand on their own, they all include jquery and the noConflict.js file

var configs = [
    {
        include: [target],
        out: path.join(rootPath, targetDir, target)
    }
];


// Function used to mix in baseConfig to a new config target
function mix(target) {
    for (var prop in baseConfig) {
        if (baseConfig.hasOwnProperty(prop)) {
            target[prop] = baseConfig[prop];
        }
    }
    return target;
}

//Create a runner that will run a separate build for each item
//in the configs array. Thanks to @jwhitley for this cleverness
var runner = configs.reduceRight(function(prev, currentConfig) {
    return function (buildReportText) {
        if (buildReportText)
            console.log("Build report: ", buildReportText);
        requirejs.optimize(mix(currentConfig), prev);
    };
}, function(buildReportText) {
    console.log("Build report: ", buildReportText);
});

//Run the builds
runner();

