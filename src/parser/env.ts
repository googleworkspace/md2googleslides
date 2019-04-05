import {
    SlideDefinition,
    TextDefinition,
    StyleDefinition,
    TableDefinition,
    ListDefinition,
    ImageDefinition,
    VideoDefinition,
} from '../slides';
import { uuid } from '../utils';
import extend from 'extend';
import * as _ from 'lodash';
import { Stylesheet } from './css';

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
    public inlineHtmlContext?: object;
    public images: ImageDefinition[] = [];
    public videos: VideoDefinition[] = [];

    public constructor(css: Stylesheet) {
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
        this.text.rawText += content;
    }

    public endSlide(): void {
        if (this.currentSlide) {
            if (this.images.length || this.videos.length || (this.text && this.text.rawText.trim().length)) {
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
            customLayout: null,
            title: null,
            subtitle: null,
            backgroundImage: null,
            bodies: [],
            tables: [],
            notes: null,
        };
    }

    public currentStyle(): StyleDefinition {
        return this.styles[this.styles.length - 1];
    }

    public startStyle(newStyle: StyleDefinition): void {
        const previousStyle = this.currentStyle();
        const style = extend({}, newStyle, previousStyle);
        style.start = this.text.rawText.length;
        this.styles.push(style);
    }

    public endStyle(): void {
        const style = this.styles.pop();
        style.end = this.text.rawText.length;
        if (style.start == style.end) {
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
