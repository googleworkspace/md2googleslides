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


const path = require('path');
const jsonfile = require('jsonfile');
const nock = require('nock');
const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;
const google = require('googleapis');
const {OAuth2Client} = require('google-auth-library');
const SlideGenerator = require('../src/slide_generator');

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

describe('SlideGenerator', function() {
    const markdown = '# Title\n' +
        '## subtitle';
    const fixturePath = path.join(path.dirname(__dirname), 'test', 'fixtures');

    describe('with new presentation', function() {
        before(function() {
            const presentation = jsonfile.readFileSync(
                path.join(fixturePath, 'blank_presentation.json'));
            nock('https://slides.googleapis.com', {
                reqheaders: {
                    'Authorization': 'Bearer abc'
                }})
                .post('/v1/presentations')
                .reply(200, presentation);
            nock('https://slides.googleapis.com', {
                reqheaders: {
                    'Authorization': 'Bearer abc'
                }})
                .post('/v1/presentations/1tuAQc1AVbJcAZWWikCW4najLJo7KtvE0AGohHZ24_M4')
                .reply(200, {});
        });

        it('should create a presentation', function() {
            const generator = SlideGenerator.newPresentation(buildCredentials(), 'title');
            return expect(generator).to.eventually.be.instanceof(SlideGenerator);
        });

        it('should generate slides', function() {
            const result = SlideGenerator.forPresentation(buildCredentials(),
                '1tuAQc1AVbJcAZWWikCW4najLJo7KtvE0AGohHZ24_M4')
                .then(generator => generator.generateFromMarkdown(markdown));
            return expect(result).to.eventually.be.resolved;
        });

    });

    describe('with existing presentation', function() {
        before(function() {
            nock('https://slides.googleapis.com', {
                reqheaders: {
                    'Authorization': 'Bearer abc'
                }})
                .get('/v1/presentations/12345')
                .reply(200, { "presentationId": "12345" });
        });

        it('should load presentation', function() {
            const generator = SlideGenerator.forPresentation(buildCredentials(), '12345');
            return expect(generator).to.eventually.be.instanceof(SlideGenerator);
        });
    });
});
