#!/usr/bin/env node

const fs = require('fs');
const shell = require('shelljs');
const clc = require('cli-color');

var valord = function() {
    var t = this;

    t.init = function() {
        t.config = JSON.parse(fs.readFileSync('/red/Projects/side/valord/valord_config.json', 'utf8'));
        t.boxes = config.boxes;
        t.allowedCommands = ['up', 'reload', 'provision', 'halt', 'suspend'];
        t.options = t.parseParams(process.argv);

        if (t.options !== false) {
            if (t.options.box !== 'all') {
                t.runCommand(t.options);
            } else {
                t.runOnAll(t.options);
            }
        }
    };

    t.echo = function(string) {
        process.stdout.write(string);
    };

    t.run_cmd = function(cmd, args, cb, end) {
        var spawn = require('child_process').spawn,
            child = spawn(cmd, args),
            me = this;
        child.stdout.on('data', function(buffer) {
            cb(me, buffer);
        });
        child.stdout.on('end', end);
    };

    t.parseParams = function(params) {
        params = params.slice(2);
        var rt = {};

        if (params.length === 2) {
            rt.box = params[0];
            rt.command = params[1];
        } else {
            t.showHelp();
            return false;
        }

        if (t.boxes[rt.box] || rt.box === 'all') {
            rt.config = t.boxes[rt.box];
        } else {
            t.showError('box: ' + rt.box + ' not found.');
            return false;
        }

        if ((t.allowedCommands.join('\'')).indexOf(rt.command) === -1) {
            t.showError('command: ' + rt.command + ' not found.');
            return false;
        }

        return rt;
    };

    t.showHelp = function() {
        console.log('Usage: valord <box> <command>');
    };
    t.showError = function(string) {
        console.log(clc.red(string));
    };

    t.runOnAll = function(options) {
        var waitList = [];
        for (var box in t.boxes) {
            waitList.push({
                box: box,
                config: t.boxes[box],
                command: options.command
            });
        }

        if (!waitList.length) {
            return false;
        }

        var index = 0;
        var runLoop = function() {
            t.runCommand(waitList[index], function() {
                if (index < waitList.length - 1) {
                    index++;
                    console.log('');
                    runLoop(index);
                }
            });
        };

        runLoop(index);
    };

    t.runCommand = function(options, callback) {
        if (options.box && options.command) {
            console.log('running ' + clc.cyan('vagrant ' + options.command) + ' in ' + clc.cyan.underline(options.config.location));
            shell.cd(options.config.location);

            t.run_cmd('vagrant', [options.command], function(me, buffer) {
                var string = buffer.toString().replace(/(\r\n|\n|\r)/gm, '').replace(/ {2}/g, '').replace(/==>/g, clc.cyan('\r>') + clc.white('   ==>'));
                console.log(clc.cyan('>   ') + clc.green(string));
            }, function() {
                if (callback) {
                    callback();
                }
            });
        }
    };

    return t;
};
var vl = valord();
vl.init();
