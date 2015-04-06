'use strict';

module.exports = function(grunt) {
    grunt.loadNpmTasks('jasmine');
    grunt.loadNpmTasks('grunt-browserify');
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
        browserify: {
            firewyrm: {
                files: {
                    'dist/firewyrm.js': ['src/firewyrm.js']
                },
                options: {
                    browserifyOptions: {
                        standalone: 'FireWyrmJS'
                    }
                }
            }
        },
        minifyify: {
            firewyrm: {
                inputFolder: 'src',
                entryFile: 'firewyrm',
                name: 'firewyrm',
                options: {
                    ignore: ['grunt', 'grunt-cli'],
                    exclude: ['browserify', 'minifyify'],
                    minifiedExt: '.min.js',
                    mapExt: '.min.json',
                    outputFolder: 'dist',
                    browserifyOptions: {
                        standalone: 'FireWyrmJS'
                    }
                }
            }
        }

    });

    grunt.registerTask('default', ['watch:tests']);
    grunt.registerTask('test', ['specs']);
    grunt.registerTask('build', ['browserify', 'minifyify']);
};
