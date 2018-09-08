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

const debug = require('debug')('md2gslides');
const Promise = require('promise');
const {google} = require('googleapis');

/**
 * Small helper class to wrap some of the Drive & Slides API methods
 * to include authorization and return promises by default.
 */
class ApiClient {
    /**
     * Create the API client with the supplied credentials.
     *
     * @param {google.auth.OAuth2} oauth2Client Authorized oauth2 client
     */
    constructor(oauth2Client) {
        debug('Creating API client');
        let slides = google.slides({ version: 'v1', auth: oauth2Client});

        // Map some of the underlying API client methods to this object, converting
        this.denodifyAndBindMethods(slides.presentations, {
            getPresentation: 'get',
            createPresentation: 'create',
            batchUpdate: 'batchUpdate'
        });
    }

    /**
     * Converts an async method to use promises and exposes it as
     * a method on the current object.
     *
     * @param {Object} instance
     * @param {Object} mapping Map of method names where key is the name to expose as,
     *     value is the original method name
     * @private
     */
    denodifyAndBindMethods(instance, mapping) {
        for (let exposedMethodName in mapping) {
            let originalMethodName = mapping[exposedMethodName];
            this[exposedMethodName] = Promise.denodeify(instance[originalMethodName].bind(instance));
        }
    }
}

module.exports = ApiClient;
