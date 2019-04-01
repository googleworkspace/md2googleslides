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


const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;
const matchLayout = require('../src/match_layout');

describe('matchLayout', function() {

    const tests = [
        ['TITLE', {
            title: { rawText: 'title' },
            subtitle: { rawText: 'subtitle' },
            bodies: [],
            tables: [],
            images: [],
            videos: []
        }],
        ['SECTION_HEADER', {
            title: { rawText: 'title' },
            subtitle: null,
            bodies: [],
            tables: [],
            images: [],
            videos: []
        }],
        ['MAIN_POINT', {
            title: { rawText: 'title', big: true },
            subtitle: null,
            bodies: [],
            tables: [],
            images: [],
            videos: []
        }],
        ['SECTION_TITLE_AND_DESCRIPTION', {
            title: { rawText: 'title'},
            subtitle: { rawText: 'subtitle' },
            bodies: [{ rawText: 'body' }],
            tables: [],
            images: [],
            videos: []
        }],
        ['BIG_NUMBER', {
            title: { rawText: 'title', big: true},
            subtitle: null,
            bodies: [{ rawText: 'body' }],
            tables: [],
            images: [],
            videos: []
        }],
        ['TITLE_AND_TWO_COLUMNS', {
            title: { rawText: 'title'},
            subtitle: null,
            bodies: [{ rawText: 'column1' }, { rawText: 'column2' }],
            tables: [],
            images: [],
            videos: []
        }],
        ['TITLE_AND_BODY', {
            title: { rawText: 'title'},
            subtitle: null,
            bodies: [{ rawText: 'body' }],
            tables: [],
            images: [],
            videos: []
        }],
        ['TITLE_AND_BODY', {
            title: { rawText: 'title'},
            subtitle: null,
            bodies: [],
            tables: [],
            images: [ { url :"https://source.unsplash.com/78A265wPiO4/1600x900", padding :0} ],
            videos: []
        }],
        ['BLANK', {
            title: null,
            subtitle: null,
            bodies: [],
            tables: [],
            images: [],
            videos: []
        }],
        ['BLANK', {
            title: null,
            subtitle: null,
            bodies: [],
            tables: [],
            images: [ { url :"https://source.unsplash.com/78A265wPiO4/1600x900", padding :0} ],
            videos: []
        }],
    ];

    for(let test of tests) {
        it(`should match ${test[0]}`, function() {
            const layout = matchLayout(null, test[1]);
            expect(layout.name).to.eql(test[0]);
        });

    }

});

describe('matchCustomLayout', function() {
    it(`should use a custom layout`, function() {
        const slide = {
            title: null,
            subtitle: null,
            bodies: [],
            tables: [],
            images: [],
            videos: [],
            customLayout: 'mylayout'
        }

        const presentation = {
            data: {
                layouts: [
                    { 
                        layoutProperties: {
                            displayName: 'mylayout', 
                            name: 'MYLAYOUT'
                        }
                    }
                ]
            }
        };
        const layout = matchLayout(presentation, slide);
        expect(layout.name).to.eql('MYLAYOUT');
    });
});
