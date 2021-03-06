module.exports = function(grunt) {

    require("matchdep").filterDev("grunt-*").forEach(grunt.loadNpmTasks);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        htmlhint: {
            build: {
                options: {
                    'tag-pair': true,
                    'tagname-lowercase': true,
                    'attr-lowercase': true,
                    'attr-value-double-quotes': true,
                    'doctype-first': true,
                    'spec-char-escape': true,
                    'id-unique': true
                },
                src: ['views/root.html']
            }
        },

        uglify: {
            root: {
                files: {
                    'public/js/root.min.js': ['public/js/lib/fastclick.js', 'public/js/root.js']
                }
            },
            arrivals: {
                files: {
                    'public/js/arrivals.min.js': ['public/js/lib/zepto.min.js', 'public/js/lib/fastclick.js', 'public/js/lib/snap.js', 'public/js/arrivals.js']
                }
            }
        },

        cssmin: {
          combine: {
            files: {
              'public/css/root.min.css': ['public/css/ionicons.min.css', 'public/css/root.css']
            }
          },
          combine: {
            files: {
                'public/css/arrivals.min.css': ['public/css/snap.css', 'public/css/ionicons.min.css', 'public/css/arrivals.css', 'public/css/root.css']
            }
          }
        },

        watch: {
            html: {
                files: ['views/root.html'],
                tasks: ['htmlhint']
            },
            js: {
                files: ['public/js/lib/fastclick.js', 'public/js/lib/snap.js', 'public/js/arrivals.js', 'public/js/root.js'],
                tasks: ['uglify']
            },
            css: {
                files: ['public/css/snap.css', 'public/css/ionicons.min.css', 'public/css/arrivals.css', 'public/css/root.css'],
                tasks: ['cssmin']
            }
        }
    });

    grunt.registerTask('default', ['htmlhint', 'uglify', 'cssmin']);

};