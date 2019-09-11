sfdx-git
========

A plugin to compare changes in a sfdx repo to deploy only what has changed for a deployment

[![Version](https://img.shields.io/npm/v/sfdx-git.svg)](https://npmjs.org/package/sfdx-git)
[![CircleCI](https://circleci.com/gh/gavinhughpalmer/sfdx-git/tree/master.svg?style=shield)](https://circleci.com/gh/gavinhughpalmer/sfdx-git/tree/master)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/gavinhughpalmer/sfdx-git?branch=master&svg=true)](https://ci.appveyor.com/project/heroku/sfdx-git/branch/master)
[![Codecov](https://codecov.io/gh/gavinhughpalmer/sfdx-git/branch/master/graph/badge.svg)](https://codecov.io/gh/gavinhughpalmer/sfdx-git)
[![Greenkeeper](https://badges.greenkeeper.io/gavinhughpalmer/sfdx-git.svg)](https://greenkeeper.io/)
[![Known Vulnerabilities](https://snyk.io/test/github/gavinhughpalmer/sfdx-git/badge.svg)](https://snyk.io/test/github/gavinhughpalmer/sfdx-git)
[![Downloads/week](https://img.shields.io/npm/dw/sfdx-git.svg)](https://npmjs.org/package/sfdx-git)
[![License](https://img.shields.io/npm/l/sfdx-git.svg)](https://github.com/gavinhughpalmer/sfdx-git/blob/master/package.json)

<!-- toc -->
* [Debugging your plugin](#debugging-your-plugin)
<!-- tocstop -->
<!-- install -->
<!-- usage -->
```sh-session
$ npm install -g sfdx-git
$ sfdx-git COMMAND
running command...
$ sfdx-git (-v|--version|version)
sfdx-git/0.0.0 darwin-x64 node-v8.11.3
$ sfdx-git --help [COMMAND]
USAGE
  $ sfdx-git COMMAND
...
```
<!-- usagestop -->
<!-- commands -->
* [`sfdx-git gpalm:backup [FILE]`](#sfdx-git-gpalmbackup-file)

## `sfdx-git gpalm:backup [FILE]`

print a greeting and your org IDs

```
USAGE
  $ sfdx-git gpalm:backup [FILE]

OPTIONS
  -f, --force                                      example boolean flag
  -n, --name=name                                  name to print
  -u, --targetusername=targetusername              username or alias for the target org; overrides default target org
  -v, --targetdevhubusername=targetdevhubusername  username or alias for the dev hub org; overrides default dev hub org
  --apiversion=apiversion                          override the api version used for api requests made by this command
  --json                                           format output as json
  --loglevel=(trace|debug|info|warn|error|fatal)   logging level for this command invocation

EXAMPLES
  $ sfdx hello:org --targetusername myOrg@example.com --targetdevhubusername devhub@org.com
     Hello world! This is org: MyOrg and I will be around until Tue Mar 20 2018!
     My hub org id is: 00Dxx000000001234
  
  $ sfdx hello:org --name myname --targetusername myOrg@example.com
     Hello myname! This is org: MyOrg and I will be around until Tue Mar 20 2018!
```

_See code: [src/commands/gpalm/backup.ts](https://github.com/gavinhughpalmer/sfdx-git/blob/v0.0.0/src/commands/gpalm/backup.ts)_
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
