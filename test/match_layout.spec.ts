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
import matchLayout from '../src/layout/match_layout';
import {SlideDefinition} from '../src/slides';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('matchLayout', () => {
  const tests: [string, SlideDefinition][] = [
    [
      'TITLE',
      {
        title: {rawText: 'title', listMarkers: [], textRuns: [], big: false},
        subtitle: {
          rawText: 'subtitle',
          listMarkers: [],
          textRuns: [],
          big: false,
        },
        bodies: [],
        tables: [],
      },
    ],
    [
      'SECTION_HEADER',
      {
        title: {rawText: 'title', listMarkers: [], textRuns: [], big: false},
        bodies: [],
        tables: [],
      },
    ],
    [
      'MAIN_POINT',
      {
        title: {rawText: 'title', big: true, listMarkers: [], textRuns: []},
        bodies: [],
        tables: [],
      },
    ],
    [
      'SECTION_TITLE_AND_DESCRIPTION',
      {
        title: {rawText: 'title', listMarkers: [], textRuns: [], big: false},
        subtitle: {
          rawText: 'subtitle',
          listMarkers: [],
          textRuns: [],
          big: false,
        },
        bodies: [
          {
            text: {rawText: 'body', listMarkers: [], textRuns: [], big: false},
            images: [],
            videos: [],
          },
        ],
        tables: [],
      },
    ],
    [
      'BIG_NUMBER',
      {
        title: {rawText: 'title', big: true, listMarkers: [], textRuns: []},
        bodies: [
          {
            text: {rawText: 'body', listMarkers: [], textRuns: [], big: false},
            images: [],
            videos: [],
          },
        ],
        tables: [],
      },
    ],
    [
      'TITLE_AND_TWO_COLUMNS',
      {
        title: {rawText: 'title', listMarkers: [], textRuns: [], big: false},
        bodies: [
          {
            text: {
              rawText: 'column1',
              listMarkers: [],
              textRuns: [],
              big: false,
            },
            images: [],
            videos: [],
          },
          {
            text: {
              rawText: 'column2',
              listMarkers: [],
              textRuns: [],
              big: false,
            },
            images: [],
            videos: [],
          },
        ],
        tables: [],
      },
    ],
    [
      'TITLE_AND_BODY',
      {
        title: {rawText: 'title', listMarkers: [], textRuns: [], big: false},
        bodies: [
          {
            text: {rawText: 'body', listMarkers: [], textRuns: [], big: false},
            images: [],
            videos: [],
          },
        ],
        tables: [],
      },
    ],
    [
      'TITLE_AND_BODY',
      {
        title: {rawText: 'title', listMarkers: [], textRuns: [], big: false},
        bodies: [
          {
            images: [
              {
                url: 'https://source.unsplash.com/78A265wPiO4/1600x900',
                padding: 0,
                offsetX: 0,
                offsetY: 0,
                height: 900,
                width: 1600,
              },
            ],
            videos: [],
            text: {
              big: false,
              textRuns: [],
              listMarkers: [],
              rawText: '',
            },
          },
        ],
        tables: [],
      },
    ],
    [
      'BLANK',
      {
        bodies: [],
        tables: [],
      },
    ],
    [
      'TITLE_AND_BODY',
      {
        bodies: [
          {
            images: [
              {
                url: 'https://source.unsplash.com/78A265wPiO4/1600x900',
                padding: 0,
                offsetX: 0,
                offsetY: 0,
                height: 900,
                width: 1600,
              },
            ],
            videos: [],
            text: {
              rawText: '',
              listMarkers: [],
              textRuns: [],
              big: false,
            },
          },
        ],
        tables: [],
      },
    ],
  ];

  for (const test of tests) {
    it(`should match ${test[0]}`, () => {
      const layout = matchLayout({}, test[1]);
      expect(layout.name).to.eql(test[0]);
    });
  }
});

describe('matchCustomLayout', () => {
  it('should use a custom layout', () => {
    const slide: SlideDefinition = {
      bodies: [],
      tables: [],
      customLayout: 'mylayout',
    };

    const presentation = {
      layouts: [
        {
          layoutProperties: {
            displayName: 'mylayout',
            name: 'MYLAYOUT',
          },
        },
      ],
    };
    const layout = matchLayout(presentation, slide);
    expect(layout.name).to.eql('MYLAYOUT');
  });
});
