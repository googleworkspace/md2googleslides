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

const GenericLayout = require('./generic_layout');

const layouts = [];

function matchLayout(presentation, slide) {
    // if we have manually set the slide layout get the master from the presentation
    if (slide.customLayout != undefined) {
        for(let layout of presentation.data.layouts) {
            if (layout.layoutProperties.displayName == slide.customLayout) {
                return new GenericLayout(layout.layoutProperties.name, presentation, slide);
            }
        }
    }else {
        for(let layout of layouts) {
            if (layout.match(slide)) {
                return new GenericLayout(layout.name, presentation, slide);
            }
        }
    }
}

function defineLayout(name, matchFn) {
    layouts.push({
        name: name,
        match: matchFn
    });
}

function hasBigTitle(slide) {
    return slide.title && slide.title.big;
}

function hasTextContent(slide) {
    return slide.bodies.length;
}

// Anything which takes up the main body space
function hasContent(slide) {
    return slide.bodies.length ||
           slide.tables.length ||
           slide.videos.length ||
           slide.images.length;
}


// Define rules for picking slide layouts based on the default
// layouts in Slides.
// NOTE: Order matters since first match wins.

defineLayout('TITLE', function(slide) {
    return slide.title && slide.subtitle && !hasContent(slide);
});

defineLayout('MAIN_POINT', function(slide) {
    return hasBigTitle(slide) && !hasContent(slide);
});

defineLayout('SECTION_HEADER', function(slide) {
    return slide.title && !slide.subtitle && !hasContent(slide);
});

defineLayout('SECTION_TITLE_AND_DESCRIPTION', function(slide) {
    return slide.title && slide.subtitle && hasTextContent(slide);
});

defineLayout('BIG_NUMBER', function(slide) {
    return hasBigTitle(slide) && hasTextContent(slide);
});

defineLayout('TITLE_AND_TWO_COLUMNS', function(slide) {
    return slide.title && slide.bodies.length == 2;
});

defineLayout('TITLE_AND_BODY', function(slide) {
    return slide.title || slide.bodies.length;
});

defineLayout('BLANK', function() {
    return true;
});

module.exports = matchLayout;
