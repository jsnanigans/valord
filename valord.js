#!/usr/bin/env node

const fs = require('fs');
const shell = require('shelljs');
const clc = require('cli-color');
const Progress = require('progrescii');

const config = JSON.parse(fs.readFileSync('/red/Projects/side/valord/valord_config.json', 'utf8'));
const boxes = config.boxes;
const allowedCommands = ['up', 'reload', 'provision', 'halt', 'suspend'];
const loadingTotals = {
    'up': 25,
    'reload': 25,
    'provision': 41,
    'halt': 1,
    'suspend': 1
};

function run_cmd(cmd, args, cb, end) {
    var spawn = require('child_process').spawn,
        child = spawn(cmd, args),
        me = this;
    child.stdout.on('data', function(buffer) {
        cb(me, buffer);
    });
    child.stdout.on('end', end);
}

var cmd = {
    box: process.argv.slice(2)[0],
    command: process.argv.slice(2)[1]
};

var outputColors = [6, 5, 4, 3, 2];

function runCommand(command, box, color, boxname, all) {
    all = !!all;
    var spaces = [];
    color = color % outputColors.length;
    var useC = clc.xterm(outputColors[color]).bgXterm(0);
    var ldSymC = clc.xterm(0).bgXterm(outputColors[color]);

    if (!boxname) {
        spaces.length = 5;
        spaces = spaces.join(' ');
    } else {
        spaces.length = 15 - boxname.length;
        spaces = boxname + spaces.join(' ');
    }

    // console.log(useC('running "vagrant ' + command + '" in ' + box.location));
    shell.cd(box.location);

    var total = loadingTotals[command];

    var ldSym = 0;

    if (!all) {
        var p = Progress.create({
            size: 40,
            total: total,
            pending: clc.black('█'),
            complete: useC('█'),
            template: useC('vagrant ' + command + ': ' + boxname) + ' :b :p% in :ts'
                // Template Text tokens:
                //:b progress bar text
                //:p percentage Number
                //:t execution time
        });
        var count = 0;
        var currStep = 0;

        // var updateI = setInterval(function() {
        //     if (keepUpdating) {
        //         console.log(count + ' ' + total);
        //         p.step(0);
        //     }
        // }, 120);
    }

    // Update the total percentage

    run_cmd(
        'vagrant', [command],
        function(me, buffer) {

            if (!all) {
                count++;

                if (count <= total) {
                    p.step(1);
                    currStep++;
                }
            } else {
                var str = buffer.toString().replace(/(\r\n|\n|\r)/gm, '');

                console.log(useC('> ') + useC(spaces) + useC(str));

            }
        },
        function() {
            // console.log(clc.magenta('valord done'));
            if (all) {
                console.log(clc.green('> done: ') + useC(boxname + ' ') + clc.white(command));
            } else {
                while (currStep < total) {
                    p.step(1);
                    currStep++;
                }
                // clearInterval(updateI);
            }
        }
    );
}

if (cmd.box && cmd.box.length) {
    var check;

    if (boxes[cmd.box] || cmd.box === 'all') {
        if (cmd.command) {
            var ok = false;
            for (check in allowedCommands) {
                if (allowedCommands[check] === cmd.command) {
                    ok = true;
                }

            }
            if (ok) {
                var useColor = 0;
                if (cmd.box === 'all') {
                    for (var box in boxes) {
                        // console.log(clc.magenta('> \t') + clc.cyan(box) + ' ' + clc.xterm(239).underline('' + boxes[box].location + ''));
                        runCommand(cmd.command, boxes[box], useColor, box, true);
                        useColor++;
                    }
                } else {
                    runCommand(cmd.command, boxes[cmd.box], useColor, cmd.box);
                }
            } else {
                console.log(clc.red('command "' + cmd.command + '" not allowed by valord'));
                console.log(clc.magenta('Available commands:'));
                for (check in allowedCommands) {
                    console.log(clc.magenta('> \t' + clc.cyan(allowedCommands[check])));
                }
            }
        } else {
            console.log(clc.magenta('Available commands:'));
            for (check in allowedCommands) {
                console.log(clc.magenta('> \t' + clc.cyan(allowedCommands[check])));
            }
        }

    } else {
        console.log(clc.red('there is nox box called "' + cmd.box + '" in your config'));
    }

} else {
    console.log(clc.magenta('No box selected. Avalible boxes:'));
    for (var box in boxes) {
        console.log(clc.magenta('> \t') + clc.cyan(box) + ' ' + clc.xterm(239).underline('' + boxes[box].location + ''));
    }
}
