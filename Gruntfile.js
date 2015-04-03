'use strict';

module.exports = function(grunt) {
    grunt.loadNpmTasks('jasmine');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-minifyify');

    grunt.initConfig({
        watch: {
            tests: {
                files: [
                    'src/**/*.js',
                    'spec/**/*[sS]pec.js',
                    'spec/**/*.js',
                    '!Gruntfile.js',
                ],
                tasks: ['specs'],
                options: {
                    atBegin: true,
                },
            }
        },
        minifyify: {
            firewyrm: {
                inputFolder: 'src',
                entryFile: 'firewyrm',
                name: 'firewyrm',
            },
            options: {
                minifiedExt: '.min.js',
                mapExt: '.min.json',
                outputFolder: 'dist'
            }
        }

    });

    grunt.registerTask('default', ['watch:tests']);
    grunt.registerTask('test', ['specs']);
    grunt.registerTask('build', ['minifyify']);
};
