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


/**
 * Small wrapper around the presenatation API data to provide
 * lookups for elements.
 *
 */
class Presentation {
    /**
     * Wrap the API data.
     *
     * @param data
     */
    constructor(data) {
        this.data = data;
    }

    get pageSize() {
        return {
            width: this.data.pageSize.width.magnitude,
            height: this.data.pageSize.height.magnitude
        };
    }

    /**
     * Locates a layout.
     *
     * @param {string} name
     * @returns {Object} GenericLayout or null if not found
     */
    findLayoutByName(name) {
        for(let layout of this.data.layouts) {
            if (layout.layoutProperties.name == name) {
                return layout.objectId;
            }
        }
        return null;
    }

    /**
     * Find a named placeholder on the page.
     *
     * @param {string} pageId Object ID of page to find element on
     * @param name Placeholder name.
     * @returns {Array} Array of placeholders
     */
    findPlaceholder(pageId, name) {
        const page = this.findPage(pageId);
        if (!page) {
            throw new Error(`Can't find page ${pageId}`);
        }

        let placeholders = [];
        if (!page.pageElements) {
            return null;
        }

        for(let element of page.pageElements) {
            if (element.shape
                && element.shape.placeholder
                && name == element.shape.placeholder.type ) {
                placeholders.push(element);
            }
        }

        if (placeholders.length) {
            return placeholders;
        }

        return null;
    }

    /**
     * Locates a element on a page by ID.
     *
     * @param {string} pageId Object ID of page to find element on
     * @returns {Object} Object or null if not found
     */
    findPageElement(pageId, id) {
        const page = this.findPage(pageId);
        if (!page) {
            throw new Error(`Can't find page ${pageId}`);
        }

        for(let element of page.pageElements) {
            if (element.objectId == id) {
                return element;
            }
        }
        return null;
    }

    /**
     * Locates a page by ID
     *
     * @param {string} pageId Object ID of page to find
     * @returns {Object} Page or null if not found
     */
    findPage(pageId) {
        if (!this.data.slides) {
            return null;
        }
        for(let page of this.data.slides) {
            if (page.objectId == pageId) {
                return page;
            }
        }
        return null;
    }

    findSpeakerNotesObjectId(pageId) {
        let page = this.findPage(pageId);
        if (page) {
            return page.slideProperties.notesPage.notesProperties.speakerNotesObjectId;
        }
        return null;
    }
}

module.exports = Presentation;
