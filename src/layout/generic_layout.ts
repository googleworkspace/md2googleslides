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

import Debug from 'debug';
import { uuid } from '../utils';
import extend from 'extend';
import Layout from 'layout';
import * as _ from 'lodash';
import { slides_v1 as SlidesV1 } from 'googleapis';
import { SlideDefinition, TextDefinition, VideoDefinition } from '../slides';
import { findLayoutIdByName, findPlaceholder, findSpeakerNotesObjectId } from './presentation_helpers';

const debug = Debug('md2gslides');

interface BoundingBox {
    height: number;
    width: number;
    x: number;
    y: number;
}

function asArrayOrNull<T>(value: T): T[] | null {
    if (!value) {
        return null;
    }
    return [value];
}

/**
 * Performs most of the work of converting a slide into API requests.
 *
 */
export default class GenericLayout {
    public name: string;
    public presentation: SlidesV1.Schema$Presentation;
    private slide: SlideDefinition;

    public constructor(name: string, presentation: SlidesV1.Schema$Presentation, slide: SlideDefinition) {
        this.name = name;
        this.presentation = presentation;
        this.slide = slide;
    }

    public appendCreateSlideRequest(requests: SlidesV1.Schema$Request[]): SlidesV1.Schema$Request[] {
        const layoutId = findLayoutIdByName(this.presentation, this.name);
        if (!layoutId) {
            throw new Error(`Unable to find layout ${this.name}`);
        }
        this.slide.objectId = uuid();

        debug(`Creating slide ${this.slide.objectId} with layout ${this.name}`);
        requests.push({
            createSlide: {
                slideLayoutReference: {
                    layoutId: layoutId,
                },
                objectId: this.slide.objectId,
            },
        });
        return requests;
    }

    public appendContentRequests(requests: SlidesV1.Schema$Request[]): SlidesV1.Schema$Request[] {
        this.appendFillPlaceholderTextRequest(asArrayOrNull(this.slide.title), 'TITLE', requests);
        this.appendFillPlaceholderTextRequest(asArrayOrNull(this.slide.title), 'CENTERED_TITLE', requests);
        this.appendFillPlaceholderTextRequest(asArrayOrNull(this.slide.subtitle), 'SUBTITLE', requests);
        this.appendFillPlaceholderTextRequest(this.slide.bodies, 'BODY', requests);

        if (this.slide.backgroundImage) {
            this.appendSetBackgroundImageRequest(this.slide.backgroundImage, requests);
        }

        if (this.slide.tables.length) {
            this.appendCreateTableRequests(this.slide.tables, requests);
        }

        if (this.slide.images.length) {
            this.appendCreateImageRequests(this.slide.images, requests);
        }

        if (this.slide.videos.length) {
            this.appendCreateVideoRequests(this.slide.videos, requests);
        }

        if (this.slide.notes) {
            const objectId = findSpeakerNotesObjectId(this.presentation, this.slide.objectId);
            this.appendInsertTextRequests(this.slide.notes, { objectId: objectId }, requests);
        }

        return requests;
    }

    protected appendFillPlaceholderTextRequest(
        values: TextDefinition[],
        placeholderName: string,
        requests: SlidesV1.Schema$Request[],
    ): SlidesV1.Schema$Request[] {
        if (!(values && values.length)) {
            debug(`No text for placeholder ${placeholderName}`);
            return;
        }

        const pageElements = findPlaceholder(this.presentation, this.slide.objectId, placeholderName);
        if (!pageElements) {
            debug(`Skipping undefined placeholder ${placeholderName}`);
            return;
        }

        for (let i in pageElements) {
            if (values[i] != undefined) {
                debug(`Slide #${this.slide.index}: setting ${placeholderName}[${i}] to ${values[i].rawText}`);
                let id = pageElements[i].objectId;
                this.appendInsertTextRequests(values[i], { objectId: id }, requests);
            }
        }
    }

    protected appendInsertTextRequests(text: TextDefinition, locationProps, requests: SlidesV1.Schema$Request[]): void {
        // Insert the raw text first
        let request = {
            insertText: extend(
                {
                    text: text.rawText,
                },
                locationProps,
            ),
        };
        requests.push(request);

        // Apply any text styles present.
        // Most of the work for generating the text runs
        // is performed when parsing markdown.
        for (let textRun of text.textRuns) {
            let request: SlidesV1.Schema$Request = {
                updateTextStyle: extend(
                    {
                        textRange: {
                            type: 'FIXED_RANGE',
                            startIndex: textRun.start,
                            endIndex: textRun.end,
                        },
                        style: {
                            bold: textRun.bold,
                            italic: textRun.italic,
                            foregroundColor: textRun.foregroundColor,
                            backgroundColor: textRun.backgroundColor,
                            strikethrough: textRun.strikethrough,
                            underline: textRun.underline,
                            smallCaps: textRun.smallCaps,
                            fontFamily: textRun.fontFamily,
                            fontSize: textRun.fontSize,
                            link: textRun.link,
                            baselineOffset: textRun.baselineOffset,
                        },
                    },
                    locationProps,
                ),
            };
            request.updateTextStyle.fields = this.computeShallowFieldMask(request.updateTextStyle.style);
            if (request.updateTextStyle.fields.length) {
                requests.push(request); // Only push if at least one style set
            }
        }

        // Convert paragraphs to lists.
        // Note that leading tabs for nested lists in the raw text are removed.
        // In this case, we're assuming that lists are supplied in order of
        // appearance and they're non-overlapping.
        // Processing in the reverse order avoids having to readjust indices.
        for (let listMarker of _.reverse(text.listMarkers)) {
            let request = {
                createParagraphBullets: extend(
                    {
                        textRange: {
                            type: 'FIXED_RANGE',
                            startIndex: listMarker.start,
                            endIndex: listMarker.end,
                        },
                        bulletPreset:
                            listMarker.type == 'ordered' ? 'NUMBERED_DIGIT_ALPHA_ROMAN' : 'BULLET_DISC_CIRCLE_SQUARE',
                    },
                    locationProps,
                ),
            };
            requests.push(request);
        }
    }

    protected appendSetBackgroundImageRequest(image, requests: SlidesV1.Schema$Request[]): void {
        debug(`Slide #${this.slide.index}: setting background image to ${image.url}`);

        requests.push({
            updatePageProperties: {
                objectId: this.slide.objectId,
                fields: 'pageBackgroundFill.stretchedPictureFill.contentUrl',
                pageProperties: {
                    pageBackgroundFill: {
                        stretchedPictureFill: {
                            contentUrl: image.url,
                        },
                    },
                },
            },
        });
    }

    protected appendCreateImageRequests(images, requests: SlidesV1.Schema$Request[]): void {
        // TODO - Fix weird cast
        const layer = (Layout as (s: string) => Layout.PackingSmith)('left-right'); // TODO - Configurable?
        for (let image of images) {
            debug(`Slide #${this.slide.index}: adding inline image ${image.url}`);
            layer.addItem({
                width: image.width + image.padding * 2,
                height: image.height + image.padding * 2,
                meta: image,
            });
        }

        const box = this.getBodyBoundingBox(false);
        const computedLayout = layer.export();

        let scaleRatio = Math.min(box.width / computedLayout.width, box.height / computedLayout.height);

        let scaledWidth = computedLayout.width * scaleRatio;
        let scaledHeight = computedLayout.height * scaleRatio;

        let baseTranslateX = box.x + (box.width - scaledWidth) / 2;
        let baseTranslateY = box.y + (box.height - scaledHeight) / 2;

        for (let item of computedLayout.items) {
            let itemOffsetX = item.meta.offsetX ? item.meta.offsetX : 0;
            let itemOffsetY = item.meta.offsetY ? item.meta.offsetY : 0;
            let itemPadding = item.meta.padding ? item.meta.padding : 0;
            let width = item.meta.width * scaleRatio;
            let height = item.meta.height * scaleRatio;
            let translateX = baseTranslateX + (item.x + itemPadding + itemOffsetX) * scaleRatio;
            let translateY = baseTranslateY + (item.y + itemPadding + itemOffsetY) * scaleRatio;

            requests.push({
                createImage: {
                    elementProperties: {
                        pageObjectId: this.slide.objectId,
                        size: {
                            height: {
                                magnitude: height,
                                unit: 'EMU',
                            },
                            width: {
                                magnitude: width,
                                unit: 'EMU',
                            },
                        },
                        transform: {
                            scaleX: 1,
                            scaleY: 1,
                            translateX: translateX,
                            translateY: translateY,
                            shearX: 0,
                            shearY: 0,
                            unit: 'EMU',
                        },
                    },
                    url: item.meta.url,
                },
            });
        }
    }

    protected appendCreateVideoRequests(videos: VideoDefinition[], requests: SlidesV1.Schema$Request[]): void {
        if (videos.length > 1) {
            throw new Error('Multiple videos per slide are not supported.');
        }
        const video = videos[0];

        debug(`Slide #${this.slide.index}: adding video ${video.id}`);

        const box = this.getBodyBoundingBox(false);

        const scaleRatio = Math.min(box.width / video.width, box.height / video.height);

        const scaledWidth = video.width * scaleRatio;
        const scaledHeight = video.height * scaleRatio;

        let translateX = box.x + (box.width - scaledWidth) / 2;
        let translateY = box.y + (box.height - scaledHeight) / 2;

        const objectId = uuid();
        requests.push({
            createVideo: {
                source: 'YOUTUBE',
                objectId: objectId,
                id: video.id,
                elementProperties: {
                    pageObjectId: this.slide.objectId,
                    size: {
                        height: {
                            magnitude: scaledHeight,
                            unit: 'EMU',
                        },
                        width: {
                            magnitude: scaledWidth,
                            unit: 'EMU',
                        },
                    },
                    transform: {
                        scaleX: 1,
                        scaleY: 1,
                        translateX: translateX,
                        translateY: translateY,
                        shearX: 0,
                        shearY: 0,
                        unit: 'EMU',
                    },
                },
            },
        });
        requests.push({
            updateVideoProperties: {
                objectId: objectId,
                fields: 'autoPlay',
                videoProperties: {
                    autoPlay: video.autoPlay,
                },
            },
        });
    }

    protected appendCreateTableRequests(tables, requests: SlidesV1.Schema$Request[]): void {
        if (tables.length > 1) {
            throw new Error('Multiple tables per slide are not supported.');
        }
        const table = tables[0];
        const tableId = uuid();

        requests.push({
            createTable: {
                objectId: tableId,
                elementProperties: {
                    pageObjectId: this.slide.objectId,
                    // Use default size/transform for tables
                },
                rows: table.rows,
                columns: table.columns,
            },
        });

        for (let r in table.cells) {
            let row = table.cells[r];
            for (let c in row) {
                this.appendInsertTextRequests(
                    row[c],
                    {
                        objectId: tableId,
                        cellLocation: {
                            rowIndex: r,
                            columnIndex: c,
                        },
                    },
                    requests,
                );
            }
        }
    }

    protected calculateBoundingBox(element: SlidesV1.Schema$PageElement): BoundingBox {
        const height = element.size.height.magnitude;
        const width = element.size.width.magnitude;
        const scaleX = element.transform.scaleX || 1;
        const scaleY = element.transform.scaleY || 1;
        const shearX = element.transform.shearX || 0;
        const shearY = element.transform.shearY || 0;

        return {
            width: scaleX * width + shearX * height,
            height: scaleY * height + shearY * width,
            x: element.transform.translateX,
            y: element.transform.translateY,
        };
    }

    protected getBodyBoundingBox(fullScreen: boolean): BoundingBox {
        const body = findPlaceholder(this.presentation, this.slide.objectId, 'BODY');
        if (body && !fullScreen) {
            return this.calculateBoundingBox(body[0]);
        }
        return {
            width: this.presentation.pageSize.width.magnitude,
            height: this.presentation.pageSize.height.magnitude,
            x: 0,
            y: 0,
        };
    }

    protected computeShallowFieldMask(object: object): string {
        const fields = [];
        for (var field of Object.keys(object)) {
            if (object[field] !== undefined) {
                fields.push(field);
            }
        }
        return fields.join(',');
    }
}
