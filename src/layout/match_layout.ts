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

import GenericLayout from './generic_layout';
import {slides_v1 as SlidesV1} from 'googleapis';
import {SlideDefinition, TextDefinition} from '../slides';

type MatchFn = (slide: SlideDefinition) => boolean;

interface Layout {
  name: string;
  match: MatchFn;
}

const layouts: Layout[] = [];

export default function matchLayout(
  presentation: SlidesV1.Schema$Presentation,
  slide: SlideDefinition
): GenericLayout {
  // if we have manually set the slide layout get the master from the presentation
  let layoutName: string | undefined = undefined;
  if (slide.customLayout !== undefined) {
    const layout = presentation.layouts?.find(
      layout => layout.layoutProperties?.displayName === slide.customLayout
    );
    if (layout?.layoutProperties?.name) {
      layoutName = layout.layoutProperties.name;
    }
  }
  if (layoutName === undefined) {
    const layout = layouts.find(layout => layout.match(slide));
    if (!layout) {
      throw new Error('Failed to match layout for slide');
    }
    layoutName = layout.name;
  }
  return new GenericLayout(layoutName, presentation, slide);
}

function defineLayout(name: string, matchFn: MatchFn): void {
  layouts.push({
    name: name,
    match: matchFn,
  });
}

function hasText(text?: TextDefinition): boolean {
  return text?.rawText !== undefined && text.rawText.length > 0;
}

function hasBigTitle(slide?: SlideDefinition): boolean {
  return hasText(slide?.title) && slide?.title?.big === true;
}

function hasTextContent(slide: SlideDefinition): boolean {
  return slide.bodies.length !== 0;
}

// Anything which takes up the main body space
function hasContent(slide?: SlideDefinition): boolean {
  return slide?.bodies.length !== 0 || slide?.tables.length !== 0;
}

// Define rules for picking slide layouts based on the default
// layouts in Slides.
// NOTE: Order matters since first match wins.

defineLayout(
  'TITLE',
  slide => hasText(slide.title) && hasText(slide.subtitle) && !hasContent(slide)
);
defineLayout('MAIN_POINT', slide => hasBigTitle(slide) && !hasContent(slide));
defineLayout(
  'SECTION_HEADER',
  slide =>
    hasText(slide.title) && !hasText(slide.subtitle) && !hasContent(slide)
);
defineLayout(
  'SECTION_TITLE_AND_DESCRIPTION',
  slide =>
    hasText(slide.title) && hasText(slide.subtitle) && hasTextContent(slide)
);
defineLayout(
  'BIG_NUMBER',
  slide => hasBigTitle(slide) && hasTextContent(slide)
);
defineLayout(
  'TITLE_AND_TWO_COLUMNS',
  slide => hasText(slide.title) && slide.bodies.length === 2
);
defineLayout(
  'TITLE_AND_BODY',
  slide => hasText(slide.title) || slide.bodies.length !== 0
);
defineLayout('BLANK', () => true);
