module.exports = function (grunt) {

    grunt.initConfig({

        jasmine_node: {
            options: {
                forceExit: true,
                match: '.',
                matchall: false,
                extensions: 'js',
                specNameMatcher: 'spec'
            },
            all: ['spec/']
        },

        jscs: {
            src: [
                "lib/**/*.js"
            ],
            options: {
                config: ".jscsrc"
            }
        }
    });

    grunt.loadNpmTasks('grunt-jasmine-node');
    grunt.loadNpmTasks("grunt-jscs");

    // grunt.registerTask('default', ['jscs', 'jasmine_node']);
    grunt.registerTask('test', ['jscs']);

};
