sfdx-tools
========

A collection of tools for

<!-- [![Version](https://img.shields.io/npm/v/sfdx-tools.svg)](https://npmjs.org/package/sfdx-tools) -->
[![CircleCI](https://circleci.com/gh/gavinhughpalmer/sfdx-tools/tree/master.svg?style=shield)](https://circleci.com/gh/gavinhughpalmer/sfdx-tools/tree/master)
<!-- [![Codecov](https://codecov.io/gh/gavinhughpalmer/sfdx-tools/branch/master/graph/badge.svg)](https://codecov.io/gh/gavinhughpalmer/sfdx-tools) -->
[![Known Vulnerabilities](https://snyk.io/test/github/gavinhughpalmer/sfdx-tools/badge.svg)](https://snyk.io/test/github/gavinhughpalmer/sfdx-tools)
<!-- [![Downloads/week](https://img.shields.io/npm/dw/sfdx-tools.svg)](https://npmjs.org/package/sfdx-tools) -->
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<!-- toc -->
* [Debugging your plugin](#debugging-your-plugin)
<!-- tocstop -->
<!-- install -->
<!-- usage -->
```sh-session
$ npm install -g sfdx-tools
$ sfdx-tools COMMAND
running command...
$ sfdx-tools (-v|--version|version)
sfdx-tools/0.0.0 darwin-x64 node-v14.4.0
$ sfdx-tools --help [COMMAND]
USAGE
  $ sfdx-tools COMMAND
...
```
<!-- usagestop -->
<!-- commands -->
* [`sfdx-tools gpalm:source:backup [-v <number>] [-d <string>] [-w <integer>] [-i <array>] [-s <array>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-tools-gpalmsourcebackup--v-number--d-string--w-integer--i-array--s-array--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx-tools gpalm:source:fix [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-tools-gpalmsourcefix---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

## `sfdx-tools gpalm:source:backup [-v <number>] [-d <string>] [-w <integer>] [-i <array>] [-s <array>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

This command will perform a full backup of a given orgs metadata, simply provide the org and a full backup of metadata will be pulled into provided project folder

```
USAGE
  $ sfdx-tools gpalm:source:backup [-v <number>] [-d <string>] [-w <integer>] [-i <array>] [-s <array>] [-u <string>]
  [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -d, --outputdir=outputdir
      [default: force-app] The directory where the source format should be output to

  -i, --ignoretypes=ignoretypes
      Comma seperated list of any additional types that you wish to ignore from the retrieve process, this can be used if
      the error "The retrieved zip file exceeded the limit of 629145600 bytes. Total bytes retrieved: 629534861" is
      recieved

  -s, --secondaryretrieve=secondaryretrieve
      [default: ] Comma seperated list of values that should be included fro a secondary retrieve, useful if the retrieve
      is too large for a single retrieve job

  -u, --targetusername=targetusername
      username or alias for the target org; overrides default target org

  -v, --packageversion=packageversion
      [default: 42] Version number that the package.xml should use in the retrieve call

  -w, --waittimemillis=waittimemillis
      [default: 1000] The wait time between retrieve checks

  --apiversion=apiversion
      override the api version used for api requests made by this command

  --json
      format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)
      [default: warn] logging level for this command invocation

EXAMPLE
  $ sfdx gpalm:source:backup --targetusername myOrg@example.com
     Backup completed!
```

_See code: [src/commands/gpalm/source/backup.ts](https://github.com/gavinhughpalmer/sfdx-tools/blob/v0.0.0/src/commands/gpalm/source/backup.ts)_

## `sfdx-tools gpalm:source:fix [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

This command is intended to convert the flow files from metadata format to the source format, that is without the version numebr in the file name and without the flow definition file. The command will delete all flow definition files and any flow files with the number in them, maintaining the active flow file

```
USAGE
  $ sfdx-tools gpalm:source:fix [--json] [--loglevel
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLE
  $ sfdx gpalm:source:backup --targetusername myOrg@example.com
     Backup completed!
```

_See code: [src/commands/gpalm/source/fix.ts](https://github.com/gavinhughpalmer/sfdx-tools/blob/v0.0.0/src/commands/gpalm/source/fix.ts)_
<!-- commandsstop -->
<!-- debugging-your-plugin -->
# Debugging your plugin
We recommend using the Visual Studio Code (VS Code) IDE for your plugin development. Included in the `.vscode` directory of this plugin is a `launch.json` config file, which allows you to attach a debugger to the node process when running your commands.

To debug the `hello:org` command:
1. Start the inspector

If you linked your plugin to the sfdx cli, call your command with the `dev-suspend` switch:
```sh-session
$ sfdx hello:org -u myOrg@example.com --dev-suspend
```

Alternatively, to call your command using the `bin/run` script, set the `NODE_OPTIONS` environment variable to `--inspect-brk` when starting the debugger:
```sh-session
$ NODE_OPTIONS=--inspect-brk bin/run hello:org -u myOrg@example.com
```

2. Set some breakpoints in your command code
3. Click on the Debug icon in the Activity Bar on the side of VS Code to open up the Debug view.
4. In the upper left hand corner of VS Code, verify that the "Attach to Remote" launch configuration has been chosen.
5. Hit the green play button to the left of the "Attach to Remote" launch configuration window. The debugger should now be suspended on the first line of the program.
6. Hit the green play button at the top middle of VS Code (this play button will be to the right of the play button that you clicked in step #5).
<br><img src=".images/vscodeScreenshot.png" width="480" height="278"><br>
Congrats, you are debugging!
