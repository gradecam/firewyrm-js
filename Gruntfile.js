'use strict';

module.exports = function(grunt) {
    grunt.loadNpmTasks('jasmine');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.initConfig({
        watch: {
            tests: {
                files: [
                    'src/**/*.js',
                    'spec/**/*[sS]pec.js',
                    '!Gruntfile.js',
                ],
                tasks: ['specs'],
                options: {
                    atBegin: true,
                },
            }
        }
    });

    grunt.registerTask('default', ['watch:tests']);
    grunt.registerTask('test', ['specs']);
};
