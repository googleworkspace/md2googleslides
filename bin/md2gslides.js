#! /usr/bin/env node

// Copyright 2016 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/*eslint no-console: ["error", { allow: ["log", "warn", "error"] }] */

require('babel-polyfill');

const Promise = require('promise');
const fs = require('fs');
const path = require('path');
const ArgumentParser = require('argparse').ArgumentParser;
const UserAuthorizer = require('../lib/auth');
const SlideGenerator = require('../lib/slide_generator');
const opener = require('opener');
const readline = require('readline');

const SCOPES = [
    'https://www.googleapis.com/auth/presentations',
    'https://www.googleapis.com/auth/drive.file'
];

const USER_HOME = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
const STORED_CREDENTIALS_PATH = path.join(USER_HOME, '.md2googleslides', 'credentials.json');

function parseArguments() {
    var parser = new ArgumentParser({
        version: '1.0.0',
        addHelp: true,
        description: 'Markdown to Slides converter'
    });

    parser.addArgument(
        'file',
        {
            help: 'Path to markdown file to convert',
            required: false
        }
    );
    parser.addArgument(
        [ '-u', '--user' ],
        {
            help: 'Email address of user',
            required: false,
            defaultValue: 'default'
        }
    );
    parser.addArgument(
        [ '-a', '--append'],
        {
            dest: 'id',
            help: 'Appends slides to an existing presentation',
            required: false
        }
    );
    parser.addArgument(
        [ '-e', '--erase'],
        {
            dest: 'erase',
            action: 'storeTrue',
            help: 'Erase existing slides prior to appending.',
            required: false
        }
    );
    parser.addArgument(
        [ '-n', '--no-browser'],
        {
            action: 'storeTrue',
            dest: 'headless',
            help: 'Headless mode - do not launch browsers, just shows URLs',
            required: false
        }
    );
    parser.addArgument(
        ['-s', '--style'],
        {
            help: 'Name of highlight.js theme for code formatting',
            dest: 'style',
            required: false,
            defaultValue: 'default'
        }
    );
    parser.addArgument(
        ['-t', '--title'],
        {
            help: 'Title of the presentation',
            dest: 'title',
            required: false
        }
    );
    return parser.parseArgs();
}

function handleError(err) {
    console.log('Unable to generate slides:', err);
    console.log(err.stack);
    console.log(JSON.stringify(err, null, 2));
}

function prompt(url) {
    if (args.headless) {
        console.log('Authorize this app by visiting this url: ');
        console.log(url);
    } else {
        console.log('Authorize this app in your browser.');
        opener(url);
    }
    return new Promise(function(resolve, reject) {
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question('Enter the code here: ', function(code) {
            rl.close();
            code = code.trim();
            if (code.length > 0) {
                resolve(code);
            } else {
                reject(new Error('No code provided'));
            }
        });
    });
}

function authorizeUser() {
    // Google OAuth2 clients always have a secret, even if the client is an installed
    // application/utility such as this.  Of course, in such cases the "secret" is
    // actually publicly known; security depends entirely on the secrecy of refresh
    // tokens, which effectively become bearer tokens.
    const options = {
        clientId: '52512509792-pc54t7beete33ifbhk00q3cpcpkmfi7c.apps.googleusercontent.com',
        clientSecret: '8g6up8tcVXgF7IO71mCN8Afk',
        filePath: STORED_CREDENTIALS_PATH,
        prompt: prompt
    };
    const auth = new UserAuthorizer(options);
    return auth.getUserCredentials(args.user, SCOPES);
}

function buildSlideGenerator(oauth2Client) {
    const presentationId = args.id;
    if (presentationId) {
        return SlideGenerator.forPresentation(oauth2Client, presentationId);
    } else {
        const title = args.title || args.file;
        return SlideGenerator.newPresentation(oauth2Client, title);
    }
    
}

function eraseIfNeeded(slideGenerator) {
    if (args.erase || !args.id) {
        return slideGenerator.erase().then(function() { return slideGenerator; });
    } else {
        return Promise.resolve(slideGenerator);
    }
}

function loadCss(theme) {
    const cssPath = path.join(require.resolve('highlight.js'), '..', '..', 'styles', theme + '.css');
    const css = fs.readFileSync(cssPath, { encoding: 'UTF-8' });
    return css;
}

function generateSlides(slideGenerator) {
    const file = args.file == 'STDIN' ? 0 : path.resolve(args.file);
    if (file != 0) {
        // Set working directory relative to markdown file
        process.chdir(path.dirname(file));
    }
    const input = fs.readFileSync(file, { encoding: 'UTF-8'});
    const css = loadCss(args.style);

    return slideGenerator.generateFromMarkdown(input, css);
}

function displayResults(id) {
    const url = 'https://docs.google.com/presentation/d/' + id;
    if (args.headless) {
        console.log('View your presentation at: %s', url);
    } else {
        console.log('Opening your presentation (%s)', url);
        opener(url);
    }
}

const args = parseArguments();

authorizeUser()
    .then(buildSlideGenerator)
    .then(eraseIfNeeded)
    .then(generateSlides)
    .then(displayResults)
    .catch(handleError);
