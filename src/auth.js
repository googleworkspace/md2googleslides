'use strict';

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

const assert = require('assert');
const debug = require('debug')('md2gslides');
const Promise = require('promise');
const {OAuth2Client} = require('google-auth-library');
const path = require('path');
const mkdirp = require('mkdirp');
const lowdb = require('lowdb');

/**
 * Handles the authorization flow, intended for command line usage.
 *
 * @example
 *   var auth = new UserAuthorizer({
 *     clientId: 'my-client-id',
 *     clientSecret: 'my-client-secret',
 *     filePath: '/path/to/persistent/token/storage'
 *     prompt: function(url) { ... }
 *   });
 *
 *   var credentials = auth.getUserCredentials('user@example.com', 'https://www.googleapis.com/auth/slides');
 *   credentials.then(function(oauth2Client) {
 *     // Valid oauth2Client for use with google APIs.
 *   });
 *
 *   @callback UserAuthorizer-promptCallback
 *   @param {String} url Authorization URL to display to user or open in browser
 *   @returns {Promise.<String>} Promise yielding the authorization code
 */
class UserAuthorizer {
    /**
     * Initialize the authorizer.
     *
     * This may block briefly to ensure the token file exists.
     *
     * @param {String} clientId Client ID
     * @param {String} clientSecret Client secret
     * @param {String} filePath Path to file where tokens are saved
     * @param {UserAuthorizer~promptCallback} prompt Function to acquire the authorization code
     */
    constructor({clientId, clientSecret, prompt, filePath = null}) {
        debug('Creating UserAuthorizer, storage path: %s', filePath);

        assert(clientId, 'Missing clientId');
        assert(clientSecret, 'Missing clientSecret');

        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUrl = 'urn:ietf:wg:oauth:2.0:oob';
        this.db = UserAuthorizer.initDbSync(filePath);
        this.prompt = prompt;
    }

    /**
     * Fetch credentials for the specified user.
     *
     * If no credentials are available, requests authorization.
     *
     * @param {String} user ID (email address) of user to get credentials for.
     * @param {String} scopes Authorization scopes to request
     * @returns {Promise.<google.auth.OAuth2>}
     */
    getUserCredentials(user, scopes) {
        const oauth2Client = new OAuth2Client(this.clientId, this.clientSecret, this.redirectUrl);
        let previousToken = this.db.get(user).value();
        let saveToken = () => this.db.set(user, oauth2Client.credentials).value();
        let emitCredentials = () => oauth2Client;

        if (previousToken) {
            oauth2Client.setCredentials(previousToken);
            let getAccessToken = Promise.denodeify(oauth2Client.getAccessToken.bind(oauth2Client));
            return getAccessToken()
                .then(saveToken)
                .then(emitCredentials);
        } else {
            const authUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: scopes,
                login_hint: user
            });
            let exchangeCode = Promise.denodeify(oauth2Client.getToken.bind(oauth2Client));
            let validateCode = code => code.null ? Promise.reject('Code is null') : code;
            let updateClient = token => oauth2Client.setCredentials(token);
            return this.prompt(authUrl)
                .then(validateCode)
                .then(exchangeCode)
                .then(updateClient)
                .then(saveToken)
                .then(emitCredentials);
        }
    }

    /**
     * Initialzes the token database.
     *
     * @param {String} filePath Path to database, null if use in-memory DB only.
     * @returns {lowdb} database instance
     * @private
     */
    static initDbSync(filePath) {
        if(filePath) {
            const parentDir = path.dirname(filePath);
            mkdirp.sync(parentDir);
            return lowdb(filePath);
        } else {
            return lowdb(); // In-memory only
        }
    }
}

module.exports = UserAuthorizer;
