// Copyright 2019 Google Inc.
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

import {
  SlideDefinition,
  TextDefinition,
  StyleDefinition,
  TableDefinition,
  ListDefinition,
  ImageDefinition,
  VideoDefinition,
} from '../slides';
import {uuid} from '../utils';
import extend from 'extend';
import * as _ from 'lodash';
import {Stylesheet} from './css';
import assert from 'assert';
import {Element} from 'parse5';

export class Context {
  public slides: SlideDefinition[] = [];
  public currentSlide?: SlideDefinition;
  public text?: TextDefinition;
  public styles: StyleDefinition[] = [{}];
  public listDepth = 0;
  public css?: Stylesheet;
  public markerParagraph = false;
  public row: TextDefinition[] = [];
  public table?: TableDefinition;
  public list?: ListDefinition;
  public inlineHtmlContext?: Element;
  public images: ImageDefinition[] = [];
  public videos: VideoDefinition[] = [];

  public constructor(css?: Stylesheet) {
    this.css = css;
    this.startSlide();
  }

  public done(): void {
    this.endSlide();
  }

  public startTextBlock(): void {
    this.text = {
      rawText: '',
      textRuns: [],
      listMarkers: [],
      big: false,
    };
  }

  public appendText(content: string): void {
    assert(this.text);
    this.text.rawText += content;
  }

  public endSlide(): void {
    if (this.currentSlide) {
      if (
        this.images.length ||
        this.videos.length ||
        (this.text && this.text.rawText.trim().length)
      ) {
        this.currentSlide.bodies.push({
          text: this.text,
          images: this.images,
          videos: this.videos,
        });
        this.images = [];
        this.videos = [];
      }
      this.slides.push(this.currentSlide);
    }
    this.currentSlide = undefined;
    this.text = undefined;
  }

  public startSlide(): void {
    this.currentSlide = {
      objectId: uuid(),
      bodies: [],
      tables: [],
    };
  }

  public currentStyle(): StyleDefinition {
    return this.styles[this.styles.length - 1];
  }

  public startStyle(newStyle: StyleDefinition): void {
    const previousStyle = this.currentStyle();
    const style = extend({}, newStyle, previousStyle);
    style.start = this.text?.rawText.length ?? 0;
    this.styles.push(style);
  }

  public endStyle(): void {
    const style = this.styles.pop();
    assert(style);
    if (!this.text) {
      return; // Ignore empty text style
    }
    style.end = this.text.rawText.length;
    if (style.start === style.end) {
      return; // Ignore empty ranges
    }
    if (_.isEmpty(_.keys(_.omit(style, 'start', 'end')))) {
      return; // Ignore ranges with no style
    }
    if (_.find(this.text.textRuns, _.matches(style))) {
      return; // Ignore duplicate ranges
    }
    this.text.textRuns.push(style);
  }
}
