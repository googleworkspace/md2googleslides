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

import Debug from 'debug';
import { OAuth2Client, Credentials } from 'google-auth-library';
import path from 'path';
import mkdirp from 'mkdirp';
import lowdb from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import Memory from 'lowdb/adapters/Memory';

const debug = Debug('md2gslides');

export type UserPrompt = (message: string) => Promise<string>;

export interface AuthOptions {
    clientId: string;
    clientSecret: string;
    prompt: UserPrompt;
    filePath?: string;
}

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
export default class UserAuthorizer {
    private redirectUrl = 'urn:ietf:wg:oauth:2.0:oob';
    private db: lowdb.LowdbSync<Credentials>;
    private clientId: string;
    private clientSecret: string;
    private prompt: UserPrompt;

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
    public constructor(options: AuthOptions) {
        this.db = this.initDbSync(options.filePath);
        this.clientId = options.clientId;
        this.clientSecret = options.clientSecret;
        this.prompt = options.prompt;
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
    public async getUserCredentials(user: string, scopes: string): Promise<OAuth2Client> {
        const oauth2Client = new OAuth2Client(this.clientId, this.clientSecret, this.redirectUrl);
        oauth2Client.on('tokens', (tokens: Credentials) => {
            if (tokens.refresh_token) {
                debug('Saving refresh token');
                this.db.set(user, tokens).write();
            }
        });

        let tokens = this.db.get(user).value();
        if (tokens) {
            debug('User previously authorized, refreshing');
            oauth2Client.setCredentials(tokens);
            await oauth2Client.getAccessToken();
            return oauth2Client;
        }

        debug('Challenging for authorization');
        /* eslint-disable @typescript-eslint/camelcase */
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            login_hint: user,
        });
        let code = await this.prompt(authUrl);
        let tokenResponse = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokenResponse.tokens);
        return oauth2Client;
    }

    /**
     * Initialzes the token database.
     *
     * @param {String} filePath Path to database, null if use in-memory DB only.
     * @returns {lowdb} database instance
     * @private
     */
    private initDbSync<T>(filePath: string): lowdb.LowdbSync<T> {
        let adapter: lowdb.AdapterSync;
        if (filePath) {
            const parentDir = path.dirname(filePath);
            mkdirp.sync(parentDir);
            adapter = new FileSync<T>(filePath);
        } else {
            adapter = new Memory<T>('');
        }
        return lowdb(adapter);
    }
}
