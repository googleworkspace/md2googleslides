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

const {OAuth2Client} = require('google-auth-library');
const nock = require('nock');
const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;
const google = require('googleapis');
const ApiClient = require('../src/api_client');

const axios = require('axios');
const httpAdapter = require('axios/lib/adapters/http');

axios.defaults.adapter = httpAdapter;

function buildCredentials() {
    const oauth2Client = new OAuth2Client('test', 'test', null);
    oauth2Client.setCredentials({
        'access_token':'abc',
        'expires_in':3920,
        'token_type':'Bearer'
    });
    return oauth2Client;
}

describe('ApiClient', function() {

    it('should make requests using supplied credentials', function() {
        nock('https://slides.googleapis.com', {
            reqheaders: {
                'Authorization': 'Bearer abc'
            }})
            .get('/v1/presentations/123')
            .reply(200, {});
        const oauth2Client = buildCredentials();
        const apiClient = new ApiClient(oauth2Client);
        const request = apiClient.getPresentation({presentationId: '123'});
        return expect(request).to.eventually.be.fulfilled;
    });

    it('should reject promises for failed requests', function() {
        nock('https://slides.googleapis.com')
            .get('/v1/presentations/123')
            .reply(400, { error: 'invalid request.' });
        const oauth2Client = buildCredentials();
        const apiClient = new ApiClient(oauth2Client);
        const request = apiClient.getPresentation({presentationId: '123'});
        return expect(request).to.eventually.be.rejected;
    });
});
