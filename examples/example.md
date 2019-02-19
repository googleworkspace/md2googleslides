---

# This is a title slide

## Your name here

<!--
This only appears as a speaker note.
-->

---

# Section title slide

---

# Title & body slide

This is the slide body.

Text can be styled for:

* *emphasis*
* **strong emphasis**
* ~~strikethrough~~
* `fixed width code fonts`

Slides :heart: [links](https://developers.google.com/slides) too!

---

# Section title & body slide

## This is a subtitle

This is the body

---

# This is the main point {.big}

---

# 100% {.big}

This is the body

---

# Two column layout

This is the *left* column

{.column}

This is the *right* column

---

# Slides can have background images

![](https://picsum.photos/g/1600/900){.background}

---

# Slides can have an inline image

![](https://picsum.photos/1600/900)

---
# Slides can have inline images with custom parameters

![](https://picsum.photos/1600/900){pad=30 offset-y=30 offset-x=30}

---

# Slides can have many images

![](https://www.gstatic.com/images/branding/product/2x/drive_36dp.png){pad=10}
![](https://www.gstatic.com/images/branding/product/2x/docs_36dp.png){pad=10}
![](https://www.gstatic.com/images/branding/product/2x/sheets_36dp.png){pad=10}
![](https://www.gstatic.com/images/branding/product/2x/slides_36dp.png){pad=10}
![](https://www.gstatic.com/images/branding/product/2x/forms_36dp.png){pad=10}

---

# Slides can have videos

@[youtube](QBcHT0XJRP8)


---
# Slides can have code

```javascript
// Print hello
function hello() {
  console.log('Hello world');
}
```

---
# Code can be big...

```javascript {style="font-size: 36pt"}
// Print hello
function hello() {
  console.log('Hello big world');
}
```

---
# ... or small

```javascript {style="font-size: 8p"}
// Print hello
function hello() {
  console.log('Hello little world');
}
```

---
# Slides can have tables

Animal | Number
-------|--------
Fish   | 142 million
Cats   | 88 million
Dogs   | 75 million
Birds  | 16 million

---
# Some inline HTML and CSS is supported

Use <span style="color:red">span</span> to color text.

Use <sup>superscript</sup> and <sub>subscript</sub>, <span style="text-decoration: line-through">strikethrough</span>
or <span style="text-decoration: underline">underline</span>, even <span style="font-variant: small-caps">small caps.</span>

---
{layout="Title and body"}

# Slides can use custom master slides

Custom master slides can be selected by adding the attribute `{layout="Title and body"}`, rather than auto detect the layout 
the slide layout will be chosen from the available master slides by the name.

This can be used with the flag `--copy=[presentation id]` to copy and use an existing presentation as the source rather than a blank slide.
