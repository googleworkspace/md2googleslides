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

import {slides_v1 as SlidesV1} from 'googleapis';
import assert from 'assert';

export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Locates a page by ID
 *
 * @param presentation
 * @param {string} pageId Object ID of page to find
 * @returns {Object} Page or null if not found
 */
export function findPage(
  presentation: SlidesV1.Schema$Presentation,
  pageId: string
): SlidesV1.Schema$Page | undefined {
  if (!presentation.slides) {
    return undefined;
  }
  return presentation.slides.find((p): boolean => p.objectId === pageId);
}

export function pageSize(
  presentation: SlidesV1.Schema$Presentation
): Dimensions {
  assert(presentation.pageSize?.width?.magnitude);
  assert(presentation.pageSize?.height?.magnitude);
  return {
    width: presentation.pageSize.width.magnitude,
    height: presentation.pageSize.height.magnitude,
  };
}

/**
 * Locates a layout.
 *
 * @param presentation
 * @param {string} name
 * @returns {string} layout ID or null if not found
 */
export function findLayoutIdByName(
  presentation: SlidesV1.Schema$Presentation,
  name: string
): string | undefined {
  if (!presentation.layouts) {
    return undefined;
  }
  const layout = presentation.layouts.find(
    (l): boolean => l.layoutProperties?.name === name
  );
  if (!layout) {
    return undefined;
  }
  return layout.objectId ?? undefined;
}

/**
 * Find a named placeholder on the page.
 *
 * @param presentation
 * @param {string} pageId Object ID of page to find element on
 * @param name Placeholder name.
 * @returns {Array} Array of placeholders
 */
export function findPlaceholder(
  presentation: SlidesV1.Schema$Presentation,
  pageId: string,
  name: string
): SlidesV1.Schema$PageElement[] | undefined {
  const page = findPage(presentation, pageId);
  if (!page) {
    throw new Error(`Can't find page ${pageId}`);
  }

  const placeholders = [];
  if (!page.pageElements) {
    return undefined;
  }

  for (const element of page.pageElements) {
    if (
      element.shape &&
      element.shape.placeholder &&
      name === element.shape.placeholder.type
    ) {
      placeholders.push(element);
    }
  }

  if (placeholders.length) {
    return placeholders;
  }

  return undefined;
}

export function findSpeakerNotesObjectId(
  presentation: SlidesV1.Schema$Presentation,
  pageId: string
): string | undefined {
  const page = findPage(presentation, pageId);
  if (page) {
    return (
      page.slideProperties?.notesPage?.notesProperties?.speakerNotesObjectId ??
      undefined
    );
  }
  return undefined;
}
