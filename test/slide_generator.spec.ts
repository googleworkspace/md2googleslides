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

import path from 'path';
import jsonfile from 'jsonfile';
import nock from 'nock';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {OAuth2Client} from 'google-auth-library';
import SlideGenerator from '../src/slide_generator';

const expect = chai.expect;
chai.use(chaiAsPromised);

function buildCredentials(): OAuth2Client {
  const oauth2Client = new OAuth2Client('test', 'test', null);
  oauth2Client.setCredentials({
    access_token: 'abc',
    token_type: ' Bearer',
  });
  return oauth2Client;
}

describe('SlideGenerator', () => {
  const fixturePath = path.join(path.dirname(__dirname), 'test', 'fixtures');

  describe('with new presentation', () => {
    beforeEach(() => {
      const presentation = jsonfile.readFileSync(
        path.join(fixturePath, 'blank_presentation.json')
      );
      nock('https://slides.googleapis.com')
        .post('/v1/presentations')
        .reply(200, presentation);
    });

    it('should create a presentation', () => {
      const generator = SlideGenerator.newPresentation(
        buildCredentials(),
        'title'
      );
      return expect(generator).to.eventually.be.instanceof(SlideGenerator);
    });
  });

  describe('with existing presentation', () => {
    beforeEach(() => {
      nock('https://slides.googleapis.com')
        .get('/v1/presentations/12345')
        .reply(200, {presentationId: '12345'});
    });

    it('should load presentation', () => {
      const generator = SlideGenerator.forPresentation(
        buildCredentials(),
        '12345'
      );
      return expect(generator).to.eventually.be.instanceof(SlideGenerator);
    });
  });
});
