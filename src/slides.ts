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

import {slides_v1 as SlidesV1} from 'googleapis';

export type Color = SlidesV1.Schema$OptionalColor;
export interface ListMarker {
  start: number;
  end: number;
  type: string; // TODO - enum
}
export interface ListDefinition {
  depth: number;
  tag: string;
  start: number;
  end?: number;
}
export interface TextDefinition {
  rawText: string;
  textRuns: StyleDefinition[];
  listMarkers: ListMarker[];
  big: boolean;
}
export interface VideoDefinition {
  width: number;
  height: number;
  autoPlay: boolean;
  id: string;
}
export interface ImageDefinition {
  url?: string;
  source?: string;
  type?: string;
  width: number;
  height: number;
  style?: string;
  padding: number;
  offsetX: number;
  offsetY: number;
}
export interface TableDefinition {
  rows: number;
  columns: number;
  cells: TextDefinition[][];
}
export interface LinkDefinition {
  url: string;
}

export interface BodyDefinition {
  text: TextDefinition | undefined;
  images: ImageDefinition[];
  videos: VideoDefinition[];
}
export interface SlideDefinition {
  index?: number;
  objectId?: string;
  customLayout?: string;
  title?: TextDefinition;
  subtitle?: TextDefinition;
  backgroundImage?: ImageDefinition;
  bodies: BodyDefinition[];
  tables: TableDefinition[];
  notes?: TextDefinition;
}

export interface FontSize {
  magnitude: number;
  unit: string;
}

export interface StyleDefinition {
  bold?: boolean;
  italic?: boolean;
  fontFamily?: string;
  foregroundColor?: Color;
  link?: LinkDefinition;
  backgroundColor?: Color;
  underline?: boolean;
  strikethrough?: boolean;
  smallCaps?: boolean;
  baselineOffset?: string;
  start?: number;
  end?: number;
  fontSize?: FontSize;
}
