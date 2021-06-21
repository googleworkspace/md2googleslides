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

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';
import path from 'path';
import GenericLayout from '../src/layout/generic_layout';
import jsonfile from 'jsonfile';

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(chaiSubset);

describe('GenericLayout', () => {
  const fixturePath = path.join(path.dirname(__dirname), 'test', 'fixtures');
  const presentation = jsonfile.readFileSync(
    path.join(fixturePath, 'mock_presentation.json')
  );

  describe('with title slide', () => {
    const requests = [];

    before(() => {
      const input = {
        objectId: 'title-slide',
        title: {
          rawText: 'This is a title slide',
          textRuns: [],
          listMarkers: [],
          big: false,
        },
        subtitle: {
          rawText: 'Your name here',
          textRuns: [],
          listMarkers: [],
          big: false,
        },
        backgroundImage: null,
        bodies: [],
        tables: [],
        videos: [],
        images: [],
        notes: {
          rawText: 'Speaker notes here.',
          textRuns: [],
          listMarkers: [],
          big: false,
        },
      };
      const layout = new GenericLayout('', presentation, input);
      layout.appendContentRequests(requests);
    });

    it('should insert title text', () => {
      expect(requests).to.deep.include({
        insertText: {
          text: 'This is a title slide',
          objectId: 'centered-title-element',
        },
      });
    });

    it('should insert subtitle text', () => {
      expect(requests).to.deep.include({
        insertText: {
          text: 'Your name here',
          objectId: 'subtitle-element',
        },
      });
    });

    it('should insert speaker notes', () => {
      expect(requests).to.deep.include({
        insertText: {
          text: 'Speaker notes here.',
          objectId: 'speaker-notes-element',
        },
      });
    });
  });

  describe('with title & body slide', () => {
    const requests = [];

    before(() => {
      const input = {
        objectId: 'body-slide',
        title: {
          rawText: 'Title & body slide',
          textRuns: [],
          listMarkers: [],
          big: false,
        },
        subtitle: null,
        backgroundImage: null,
        bodies: [
          {
            text: {
              rawText: 'This is the slide body.\n',
              textRuns: [],
              listMarkers: [],
              big: false,
            },
          },
        ],
        tables: [],
        videos: [],
        images: [],
      };
      const layout = new GenericLayout('', presentation, input);
      layout.appendContentRequests(requests);
    });

    it('should insert title text', () => {
      expect(requests).to.deep.include({
        insertText: {
          text: 'Title & body slide',
          objectId: 'title-element',
        },
      });
    });

    it('should insert body text', () => {
      expect(requests).to.deep.include({
        insertText: {
          text: 'This is the slide body.\n',
          objectId: 'body-element',
        },
      });
    });
  });

  describe('with two column slide', () => {
    const requests = [];

    before(() => {
      const input = {
        objectId: 'two-column-slide',
        title: null,
        subtitle: null,
        backgroundImage: null,
        bodies: [
          {
            text: {
              big: false,
              rawText: 'This is the left column\n',
              textRuns: [],
              listMarkers: [],
            },
          },
          {
            text: {
              big: false,
              rawText: 'This is the right column\n',
              textRuns: [],
              listMarkers: [],
            },
          },
        ],
        tables: [],
        videos: [],
        images: [],
      };
      const layout = new GenericLayout('', presentation, input);
      layout.appendContentRequests(requests);
    });

    it('should insert left column text', () => {
      expect(requests).to.deep.include({
        insertText: {
          text: 'This is the left column\n',
          objectId: 'body-element',
        },
      });
    });

    it('should insert right column text', () => {
      expect(requests).to.deep.include({
        insertText: {
          text: 'This is the right column\n',
          objectId: 'body-element-2',
        },
      });
    });
  });

  describe('with background images', () => {
    const requests = [];

    before(() => {
      const input = {
        objectId: 'body-slide',
        title: null,
        subtitle: null,
        backgroundImage: {
          url: 'https://placekitten.com/1600/900',
          width: 1600,
          height: 900,
        },
        bodies: [
          {
            text: {
              big: false,
              rawText: '\n',
              textRuns: [],
              listMarkers: [],
            },
          },
        ],
        tables: [],
      };
      const layout = new GenericLayout('', presentation, input);
      layout.appendContentRequests(requests);
    });

    it('should set background image', () => {
      expect(requests).to.deep.include({
        updatePageProperties: {
          objectId: 'body-slide',
          fields: 'pageBackgroundFill.stretchedPictureFill.contentUrl',
          pageProperties: {
            pageBackgroundFill: {
              stretchedPictureFill: {
                contentUrl: 'https://placekitten.com/1600/900',
              },
            },
          },
        },
      });
    });
  });

  describe('with inline images', () => {
    const requests = [];

    before(() => {
      const input = {
        objectId: 'body-slide',
        title: null,
        subtitle: null,
        backgroundImage: null,
        tables: [],
        bodies: [
          {
            videos: [],
            images: [
              {
                url: 'https://placekitten.com/350/315',
                width: 350,
                height: 315,
              },
            ],
          },
        ],
      };
      const layout = new GenericLayout('', presentation, input);
      layout.appendContentRequests(requests);
    });

    it('should create image', () => {
      expect(requests).to.containSubset([
        {
          createImage: {
            elementProperties: {
              pageObjectId: 'body-slide',
            },
            url: 'https://placekitten.com/350/315',
          },
        },
      ]);
    });
  });

  describe('with video', () => {
    const requests = [];

    before(() => {
      const input = {
        objectId: 'body-slide',
        title: null,
        subtitle: null,
        backgroundImage: null,
        bodies: [
          {
            videos: [
              {
                width: 1600,
                height: 900,
                autoPlay: true,
                id: 'MG8KADiRbOU',
              },
            ],
            images: [],
          },
        ],
        tables: [],
      };
      const layout = new GenericLayout('', presentation, input);
      layout.appendContentRequests(requests);
    });

    it('should create video', () => {
      expect(requests).to.containSubset([
        {
          createVideo: {
            source: 'YOUTUBE',
            id: 'MG8KADiRbOU',
          },
        },
      ]);
    });
  });

  describe('with table', () => {
    const requests = [];

    before(() => {
      const input = {
        objectId: 'body-slide',
        title: null,
        subtitle: null,
        backgroundImage: null,
        bodies: [],
        tables: [
          {
            rows: 5,
            columns: 2,
            cells: [
              [
                {
                  big: false,
                  rawText: 'Animal',
                  textRuns: [],
                  listMarkers: [],
                },
                {
                  big: false,
                  rawText: 'Number',
                  textRuns: [],
                  listMarkers: [],
                },
              ],
              [
                {
                  big: false,
                  rawText: 'Fish',
                  textRuns: [],
                  listMarkers: [],
                },
                {
                  big: false,
                  rawText: '142 million',
                  textRuns: [],
                  listMarkers: [],
                },
              ],
              [
                {
                  big: false,
                  rawText: 'Cats',
                  textRuns: [],
                  listMarkers: [],
                },
                {
                  big: false,
                  rawText: '88 million',
                  textRuns: [],
                  listMarkers: [],
                },
              ],
              [
                {
                  big: false,
                  rawText: 'Dogs',
                  textRuns: [],
                  listMarkers: [],
                },
                {
                  big: false,
                  rawText: '75 million',
                  textRuns: [],
                  listMarkers: [],
                },
              ],
              [
                {
                  big: false,
                  rawText: 'Birds',
                  textRuns: [],
                  listMarkers: [],
                },
                {
                  big: false,
                  rawText: '16 million',
                  textRuns: [],
                  listMarkers: [],
                },
              ],
            ],
          },
        ],
      };
      const layout = new GenericLayout('', presentation, input);
      layout.appendContentRequests(requests);
    });

    it('should create table', () => {
      expect(requests).to.containSubset([
        {
          createTable: {
            elementProperties: {
              pageObjectId: 'body-slide',
            },
            rows: 5,
            columns: 2,
          },
        },
      ]);
    });

    it('should create table', () => {
      expect(requests).to.containSubset([
        {
          createTable: {
            elementProperties: {
              pageObjectId: 'body-slide',
            },
            rows: 5,
            columns: 2,
          },
        },
      ]);
    });

    it('should insert cell text', () => {
      expect(requests).to.containSubset([
        {
          insertText: {
            text: 'Animal',
            cellLocation: {
              rowIndex: '0',
              columnIndex: '0',
            },
          },
        },
      ]);
    });
  });

  describe('with formatted text', () => {
    const requests = [];

    before(() => {
      const input = {
        objectId: 'body-slide',
        title: null,
        subtitle: null,
        backgroundImage: null,
        bodies: [
          {
            text: {
              big: false,
              rawText: 'Item 1\nItem 2\n\tfoo\n\tbar\n\tbaz\nItem 3\n',
              textRuns: [
                {
                  bold: true,
                  start: 0,
                  end: 4,
                },
                {
                  italic: true,
                  start: 7,
                  end: 11,
                },
                {
                  fontFamily: 'Courier New',
                  start: 29,
                  end: 33,
                },
              ],
              listMarkers: [
                {
                  start: 0,
                  end: 36,
                  type: 'unordered',
                },
              ],
            },
          },
        ],
        tables: [],
      };
      const layout = new GenericLayout('', presentation, input);
      layout.appendContentRequests(requests);
    });

    it('should apply bold style', () => {
      expect(requests).to.containSubset([
        {
          updateTextStyle: {
            textRange: {
              type: 'FIXED_RANGE',
              startIndex: 0,
              endIndex: 4,
            },
            style: {
              bold: true,
            },
            objectId: 'body-element',
            fields: 'bold',
          },
        },
      ]);
    });

    it('should apply italic style', () => {
      expect(requests).to.containSubset([
        {
          updateTextStyle: {
            textRange: {
              type: 'FIXED_RANGE',
              startIndex: 7,
              endIndex: 11,
            },
            style: {
              italic: true,
            },
            objectId: 'body-element',
            fields: 'italic',
          },
        },
      ]);
    });

    it('should apply font family style', () => {
      expect(requests).to.containSubset([
        {
          updateTextStyle: {
            textRange: {
              type: 'FIXED_RANGE',
              startIndex: 29,
              endIndex: 33,
            },
            style: {
              fontFamily: 'Courier New',
            },
            objectId: 'body-element',
            fields: 'fontFamily',
          },
        },
      ]);
    });

    it('should create bulleted list', () => {
      expect(requests).to.containSubset([
        {
          createParagraphBullets: {
            textRange: {
              type: 'FIXED_RANGE',
              startIndex: 0,
              endIndex: 36,
            },
            bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE',
            objectId: 'body-element',
          },
        },
      ]);
    });
  });
});
