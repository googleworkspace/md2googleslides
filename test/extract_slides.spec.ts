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
import extractSlides from '../src/parser/extract_slides';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('extractSlides', function() {
    describe('with a title slide', function() {
        const markdown = '# Title\n' + '## Subtitle\n';
        const slides = extractSlides(markdown);

        it('should return a slide', function() {
            return expect(slides).to.have.length(1);
        });

        it('should have a title', function() {
            console.log(slides);
            return expect(slides).to.have.nested.property('[0].title.rawText', 'Title');
        });

        it('should have a subtitle', function() {
            return expect(slides).to.have.nested.property('[0].subtitle.rawText', 'Subtitle');
        });

        it('should have empty bodies', function() {
            return expect(slides).to.have.nested.property('[0].bodies').empty;
        });
    });

    describe('with an empty slide', function() {
        const markdown = '---\n' + '\n';
        '---\n';
        const slides = extractSlides(markdown);

        it('should return a slide', function() {
            return expect(slides).to.have.length(1);
        });

        it('should have no title', function() {
            return expect(slides).to.have.nested.property('[0].title', null);
        });

        it('should have empty bodies', function() {
            return expect(slides).to.have.nested.property('[0].bodies').empty;
        });
    });
    describe('with a title & body slide', function() {
        const markdown = '# Title\n' + 'hello world\n';
        const slides = extractSlides(markdown);
        it('should have a title', function() {
            return expect(slides).to.have.nested.property('[0].title.rawText', 'Title');
        });

        it('should have 1 body', function() {
            return expect(slides)
                .to.have.nested.property('[0].bodies')
                .length(1);
        });

        it('should have body text', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.rawText', 'hello world\n');
        });
    });

    describe('with a two column slide', function() {
        const markdown = '# Title\n' + 'hello\n' + '\n' + '{.column}\n' + '\n' + 'world\n';
        const slides = extractSlides(markdown);

        it('should have a title', function() {
            return expect(slides).to.have.nested.property('[0].title.rawText', 'Title');
        });

        it('should have 2 bodies', function() {
            return expect(slides)
                .to.have.nested.property('[0].bodies')
                .length(2);
        });

        it('should have 1st column text', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.rawText', 'hello\n');
        });

        it('should have 2nd column text', function() {
            return expect(slides).to.have.nested.property('[0].bodies[1].text.rawText', 'world\n');
        });
    });

    describe('with background image', function() {
        const markdown = '# Title\n' + '![](https://example.com/image.jpg){.background}\n' + 'hello world\n';
        const slides = extractSlides(markdown);

        it('should have a background image', function() {
            return expect(slides).to.have.nested.property('[0].backgroundImage.url', 'https://example.com/image.jpg');
        });
    });

    describe('with inline images', function() {
        const markdown =
            '# Title\n' + '\n' + '![](https://example.com/image.jpg){offset-x=100 offset-y=200}\n' + 'hello world\n';
        const slides = extractSlides(markdown);

        it('should have a background image', function() {
            return expect(slides).to.have.nested.property(
                '[0].bodies[0].images[0].url',
                'https://example.com/image.jpg',
            );
        });

        it('should have an image x offset', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].images[0].offsetX', 100);
        });

        it('should have an image y offset', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].images[0].offsetY', 200);
        });
    });

    describe('with video', function() {
        const markdown = '# Title\n' + '\n' + '@[youtube](12345)\n' + 'hello world\n';
        const slides = extractSlides(markdown);

        it('should have a video', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].videos[0].id', '12345');
        });
    });

    describe('with tables', function() {
        const markdown = '# Title\n' + '\n' + 'H1 | H2\n' + '---|---\n' + ' a | b\n' + ' c | d\n' + ' e | f\n' + '\n';

        const slides = extractSlides(markdown);

        it('should have a table', function() {
            return expect(slides)
                .to.have.nested.property('[0].tables')
                .length(1);
        });

        it('should have four rows', function() {
            return expect(slides)
                .to.have.nested.property('[0].tables[0].rows')
                .eql(4);
        });

        it('should have two columns', function() {
            return expect(slides)
                .to.have.nested.property('[0].tables[0].columns')
                .eql(2);
        });
    });

    describe('with unordered lists', function() {
        const markdown = '# Title\n' + '* item 1\n' + '* item 2\n';

        const slides = extractSlides(markdown);

        it('should have list markers', function() {
            return expect(slides)
                .to.have.nested.property('[0].bodies[0].text.listMarkers')
                .length(1);
        });

        it('should have the correct start', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.listMarkers[0].start', 0);
        });

        it('should have the correct end', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.listMarkers[0].end', 14);
        });

        it('should have the correct tyoe', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.listMarkers[0].type', 'unordered');
        });
    });

    describe('with ordered lists', function() {
        const markdown = '# Title\n' + '1. item 1\n' + '1. item 2\n';

        const slides = extractSlides(markdown);

        it('should have list markers', function() {
            return expect(slides)
                .to.have.nested.property('[0].bodies[0].text.listMarkers')
                .length(1);
        });

        it('should have the correct start', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.listMarkers[0].start', 0);
        });

        it('should have the correct end', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.listMarkers[0].end', 14);
        });

        it('should have the correct type', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.listMarkers[0].type', 'ordered');
        });
    });

    describe('with text formats', function() {
        const markdown = '*italic*, **bold**, ~~strikethrough~~\n';

        const slides = extractSlides(markdown);

        it('should have text runs', function() {
            return expect(slides)
                .to.have.nested.property('[0].bodies[0].text.textRuns')
                .length(3);
        });

        it('should have the correct italic start', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.textRuns[0].start', 0);
        });

        it('should have the correct italic end', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.textRuns[0].end', 6);
        });

        it('should have the correct italic style', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.textRuns[0].italic', true);
        });

        it('should have the correct bold start', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.textRuns[1].start', 8);
        });

        it('should have the correct bold end', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.textRuns[1].end', 12);
        });

        it('should have the correct bold style', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.textRuns[1].bold', true);
        });

        it('should have the correct strikethrough start', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.textRuns[2].start', 14);
        });

        it('should have the correct strikethrough end', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.textRuns[2].end', 27);
        });

        it('should have the correct strikethrough style', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.textRuns[2].strikethrough', true);
        });
    });

    describe('with emoji', function() {
        const markdown = ':heart:\n';

        const slides = extractSlides(markdown);

        it('should have emoji', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.rawText', '❤️\n');
        });
    });

    describe('with markdown attributes', function() {
        const markdown = '*hello*{style="color: #EFEFEF; font-size: 5pt"}\n';

        const slides = extractSlides(markdown);

        it('should have text runs', function() {
            return expect(slides)
                .to.have.nested.property('[0].bodies[0].text.textRuns')
                .length(1);
        });

        it('should have the correct start', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.textRuns[0].start', 0);
        });

        it('should have the correct end', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.textRuns[0].end', 5);
        });

        it('should have the color style', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.textRuns[0].foregroundColor');
        });

        it('should have the font size style', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.textRuns[0].fontSize');
        });
    });

    describe('with inline HTML span', function() {
        const markdown = '<span style="color: #EFEFEF; font-size: 5pt">hello</span>\n';

        const slides = extractSlides(markdown);

        it('should have text runs', function() {
            return expect(slides)
                .to.have.nested.property('[0].bodies[0].text.textRuns')
                .length(1);
        });

        it('should have the correct start', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.textRuns[0].start', 0);
        });

        it('should have the correct end', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.textRuns[0].end', 5);
        });

        it('should have the color style', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.textRuns[0].foregroundColor');
        });

        it('should have the font size style', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.textRuns[0].fontSize');
        });
    });

    describe('with inline HTML subscript', function() {
        const markdown = 'H<sub>2</sub>O\n';

        const slides = extractSlides(markdown);

        it('should have text runs', function() {
            return expect(slides)
                .to.have.nested.property('[0].bodies[0].text.textRuns')
                .length(1);
        });

        it('should have the correct start', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.textRuns[0].start', 1);
        });

        it('should have the correct end', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.textRuns[0].end', 2);
        });

        it('should have the correct style', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.textRuns[0].baselineOffset', 'SUBSCRIPT');
        });
    });

    describe('with inline HTML superscript', function() {
        const markdown = 'Hello<sup>1</sup>\n';

        const slides = extractSlides(markdown);

        it('should have text runs', function() {
            return expect(slides)
                .to.have.nested.property('[0].bodies[0].text.textRuns')
                .length(1);
        });

        it('should have the correct start', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.textRuns[0].start', 5);
        });

        it('should have the correct end', function() {
            return expect(slides).to.have.nested.property('[0].bodies[0].text.textRuns[0].end', 6);
        });

        it('should have the correct style', function() {
            return expect(slides).to.have.nested.property(
                '[0].bodies[0].text.textRuns[0].baselineOffset',
                'SUPERSCRIPT',
            );
        });
    });

    describe('with speaker notes', function() {
        const markdown = '# Title\n' + '<!-- \n' + 'Hello **world**\n' + '\n' + '* one\n' + '* two\n' + '-->\n';
        const slides = extractSlides(markdown);

        it('should have speaker notes', function() {
            return expect(slides).to.have.nested.property('[0].notes.rawText', 'Hello world\none\ntwo\n');
        });

        it('should have text runs', function() {
            return expect(slides)
                .to.have.nested.property('[0].notes.textRuns')
                .length(1);
        });

        it('should have list markers', function() {
            return expect(slides)
                .to.have.nested.property('[0].notes.listMarkers')
                .length(1);
        });
    });

    describe('with a custom layout', function() {
        const markdown = '{layout="my custom layout"}\n' + '# Title\n';
        const slides = extractSlides(markdown);

        it('should have a customLayout', function() {
            return expect(slides).to.have.nested.property('[0].customLayout', 'my custom layout');
        });
    });
});
