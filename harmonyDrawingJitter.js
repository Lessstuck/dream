/*********************************************************************************************************
 * Porting Mr. DOOB'S Harmony drawing application to MAX MSP JITTER
 * http://github.com/mrdoob/monitor
 *
 *  Please take care of:
 *    This program is free software: you can redistribute it and/or modify
 *    it under the terms of the GNU General Public License as published by
 *    the Free Software Foundation, either version 3 of the License, or
 *    (at your option) any later version.
 *
 *    This program is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *    GNU General Public License for more details.
 *
 *    You should have received a copy of the GNU General Public License
 *    along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 *  Author of the ported code: Florian Weil - www.derhess.de
 *
 *
 *  Improvements:
 *    - Clean up the code (creating a lineStrokeHelper Method/add color,Brush_Size,Brush_Pressure properties to the classes)
 *    - Add a drawing and brush manager, so that more user can simultaneously draw on the canvas
 *    - Increased resolution, added matrix output, fixed typos
 *    - Duplicated render context and gl.sketch for 1) listening and 2) matrixout with a backgroundplane-free image
 ************************************************************************************************************/

inlets = 2;
outlets = 2;

// color
var red = 125;
var green = 125;
var blue = 125;
var colorArray = new Array(red, green, blue);

// Init Variables
var BRUSH_SIZE = 0.000002;
var BRUSH_PRESSURE = 1;
var BRUSH_TYPE = "simple";

var startDrawing = true;

var brush = new simple(this, colorArray, BRUSH_SIZE, BRUSH_PRESSURE);

//                       Listener Window 1
// Context includes background video
var window1 = new JitterObject("jit.window", "monitor1");
window1.fsaa = 1;
window1.size = [832, 468];
window1.grow = 0;
var render1 = new JitterObject("jit.gl.render", "monitor1");
var sketch1 = new JitterObject("jit.gl.sketch", "monitor1");
var listener = new JitterListener(window1.getregisteredname(), windowcallback);

//                       Matrix Out Window 2
// Context does not include background video, so that output texture has alpha channel
var window2 = new JitterObject("jit.window", "monitor2");
window2.fsaa = 1;
window2.size = [832, 468]; // was 640, 360
window2.visible = 0;
var render2 = new JitterObject("jit.gl.render", "monitor2");
var sketch2 = new JitterObject("jit.gl.sketch", "monitor2");

var globalButton = 0;

resetsketch();
// set up each jit.gl.sketch's defaults to 2d drawing
function resetsketch() {
  //           Listener 1
  render1.drawswap(); // ensure context is recreated and valid
  with (sketch1) {
    var aspect1 = window1.size[0] / window1.size[1];
    immediate = 1;
    blend_enable = 1;
    depth_enable = 1;
    glpolygonmode("front_and_back", "fill");
    glpointsize(1);
    gllinewidth(1);
    gldisable("depth_test");
    gldisable("fog");
    glcolor(0, 0, 0, 1);
    glshademodel("smooth");
    gldisable("lighting");
    gldisable("normalize");
    gldisable("texture");
    glmatrixmode("projection");
    glloadidentity();
    glortho(-aspect1, aspect1, -1, 1, -1, 100);
    glmatrixmode("modelview");
    glloadidentity();
    glulookat(0, 0, 2, 0, 0, 0, 0, 0, 1);
    glclearcolor(0, 0, 0, 0);
    glclear();
    glenable("blend");
  }
  render1.drawswap();
  //           Matrix 2
  render2.drawswap(); // ensure context is recreated and valid
  with (sketch2) {
    var aspect2 = window2.size[0] / window2.size[1];
    immediate = 1;
    blend_enable = 1;
    depth_enable = 1;
    glpolygonmode("front_and_back", "fill");
    glpointsize(1);
    gllinewidth(1);
    gldisable("depth_test");
    gldisable("fog");
    glcolor(0, 0, 0, 1);
    glshademodel("smooth");
    gldisable("lighting");
    gldisable("normalize");
    gldisable("texture");
    glmatrixmode("projection");
    glloadidentity();
    glortho(-aspect2, aspect2, -1, 1, -1, 100);
    glmatrixmode("modelview");
    glloadidentity();
    glulookat(0, 0, 2, 0, 0, 0, 0, 0, 1);
    glclearcolor(0, 0, 0, 0);
    glclear();
    glenable("blend");
  }
  render2.drawswap();
}
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

function what() {
  post(startDrawing);
  post();
}

function gllinewidth(w) {
  sketch1.gllinewidth(w);
  sketch2.gllinewidth(w);
}

function glcolor(r, g, b, a) {
  sketch1.glcolor(r, g, b, a);
  sketch2.glcolor(r, g, b, a);
}

function moveto(x, y, z) {
  sketch1.moveto(x, y, z);
  sketch2.moveto(x, y, z);
}

function lineto(x, y, z) {
  sketch1.lineto(x, y, z);
  sketch2.lineto(x, y, z);
}

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
// Global and API Functions

function setCoordinate(xpos, ypos) {
  if (arguments.length == 2) {
    if (startDrawing) {
      brush.strokeStart(xpos, ypos);
      startDrawing = false;
    } else {
      brush.stroke(xpos, ypos);
    }
    // Rendering and Refresh
    draw();
  } else {
    post("setCoordinate: Too few arguments\n");
  }
}

function stopDrawing() {
  startDrawing = true;
}

function setBrush(type) {
  if (arguments.length == 1) {
    if (BRUSH_TYPE == "ribbon")
      //            brush.destroy();

      startDrawing = true;
    //       brush.clear();
    BRUSH_TYPE = type;

    switch (type) {
      case "simple":
        brush = new simple(this, colorArray, BRUSH_SIZE, BRUSH_PRESSURE);
        break;
      case "chrome":
        brush = new chrome(this, colorArray, BRUSH_SIZE, BRUSH_PRESSURE);
        break;
      case "fur":
        brush = new fur(this, colorArray, BRUSH_SIZE, BRUSH_PRESSURE);
        break;
      case "longFur":
        brush = new longFur(this, colorArray, BRUSH_SIZE, BRUSH_PRESSURE);
        break;
      case "ribbon":
        // brush = new ribbon(this,colorArray,BRUSH_SIZE,BRUSH_PRESSURE);
        post("Sorry, ribbon not supported.");
        break;
      case "shaded":
        brush = new shaded(this, colorArray, BRUSH_SIZE, BRUSH_PRESSURE);
        break;
      case "sketchy":
        brush = new sketchy(this, colorArray, BRUSH_SIZE, BRUSH_PRESSURE);
        break;
      case "web":
        brush = new web(this, colorArray, BRUSH_SIZE, BRUSH_PRESSURE);
        break;
      case "squares":
        brush = new squares(this, colorArray, BRUSH_SIZE, BRUSH_PRESSURE);
        break;
      case "roundSquares":
        brush = new roundSquares(this, colorArray, BRUSH_SIZE, BRUSH_PRESSURE);
        break;
      default:
        post(
          "Wrong BrushType!!! Only simple,chrome,fur,longfur,ribbon,shaded,sketchy,web,squares,roundSquares\n"
        );
    }
  } else {
    post("setBrush:  Too few arguments\n");
  }
}

function setBrushSize(val) {
  if (arguments.length == 1) {
    BRUSH_SIZE = val;
    brush.brushSize = val;
  } else {
    post("setBrushSize:  Too few arguments\n");
  }
}

function setBrushPressure(val) {
  if (arguments.length == 1) {
    BRUSH_PRESSURE = val;
    brush.pressure = val;
  } else {
    post("setBrushPressure:  Too few arguments\n");
  }
}

function setBrushColor(r, g, b) {
  if (arguments.length == 3) {
    // color
    red = r;
    green = g;
    blue = b;
    colorArray = new Array(red, green, blue);
    brush.color = colorArray;
  } else {
    post("setBrushColor:  Too few arguments\n");
  }
}

function clearCanvas() {
  if (BRUSH_TYPE == "ribbon") brush.destroy();

  startDrawing = true;
  //    brush.clear();

  deleteCanvas();
}

// bang -- draw and refresh display
function bang() {
  resetsketch();
  clearCanvas();
}

// THE MAIN RENDER EVENT
function refresh() {
  // render2.erase(); // erase the drawing context
  // render2.drawswap();
  render2.to_texture("drawer2");
  render2.swap();
  render1.swap();
  outlet(0, "bang");
}
// debug utility
function swapThing() {
  render1.drawswap();
  render2.drawswap();
}

function swap1() {
  render1.drawswap();
}

function swap2() {
  render2.drawswap();
}

function notifydeleted() {
  //just to force free in case not garbage collected automatically
  sketch1.freepeer();
  sketch2.freepeer();
  render1.freepeer();
  render2.freepeer();
  window1.freepeer();
  window2.freepeer();
}

function msg_float(value) {
  brush.brushSize = value;
}

/////////////////////////////////////////////////////////////
//  Helper Functions

// Draw Line
function drawLine(
  target,
  xPoint1,
  yPoint1,
  xPoint2,
  yPoint2,
  r,
  g,
  b,
  a,
  bSize
) {
  sketch1.glenable("blend");
  sketch1.beginstroke("basic2d");
  sketch1.strokeparam("scale", bSize);
  sketch2.glenable("blend");
  sketch2.beginstroke("basic2d");
  sketch2.strokeparam("scale", bSize);

  var tColor = mapColor2RGBA(r, g, b, a);
  sketch1.strokeparam("color", tColor[0], tColor[1], tColor[2], tColor[3]);
  sketch2.strokeparam("color", tColor[0], tColor[1], tColor[2], tColor[3]);

  var old_x1 = sketch1.screentoworld(xPoint1, yPoint1)[0];
  var old_y1 = sketch1.screentoworld(xPoint1, yPoint1)[1];
  var new_x1 = sketch1.screentoworld(xPoint2, yPoint2)[0];
  var new_y1 = sketch1.screentoworld(xPoint2, yPoint2)[1];

  sketch1.strokepoint(old_x1, old_y1);
  sketch1.strokepoint(new_x1, new_y1);
  sketch1.endstroke();
  //////////////////////////////////////////////////////////////////////  hack to fix scaling issue in 2022
  xPoint1 = 0.5 * xPoint1;
  xPoint2 = 0.5 * xPoint2;
  yPoint1 = 0.5 * yPoint1 + 0.5 * window1.size[1];
  yPoint2 = 0.5 * yPoint2 + 0.5 * window1.size[1];

  var old_x2 = sketch2.screentoworld(xPoint1, yPoint1)[0];
  var old_y2 = sketch2.screentoworld(xPoint1, yPoint1)[1];
  var new_x2 = sketch2.screentoworld(xPoint2, yPoint2)[0];
  var new_y2 = sketch2.screentoworld(xPoint2, yPoint2)[1];

  sketch2.strokepoint(old_x2, old_y2);
  sketch2.strokepoint(new_x2, new_y2);
  sketch2.endstroke();
}
// map the color to OpenGL Color
function mapColor2RGBA(r, g, b, a) {
  var rgbaArray = new Array();
  rgbaArray[0] = r / 255;
  rgbaArray[1] = g / 255;
  rgbaArray[2] = b / 255;
  rgbaArray[3] = a / 255;
  return rgbaArray;
}

////////////////////////////////////////////////////////////
// Rendering

function draw() {
  refresh();
}

function deleteCanvas() {
  resetsketch();
  refresh();
}

////////////////////////////////////////////////////////////
// Interaction

function windowcallback(event) {
  // callback function to handle events triggered by mousing
  // in our [jit.window]
  var x, y, button; // some local variables

  if (event.eventname == "mouse") {
    // we're entering, dragging within, or leaving a "mouse click" event

    // arguments are (x,y,button,cmd,shift,capslock,option,ctrl)...
    // we only care about the first three
    x = event.args[0];
    y = event.args[1];
    button = event.args[2];
    if (button) {
      // we're clicked down
      if (globalButton == 0) {
        onclick(x, y);
        globalButton = 1;
      } else {
        ondrag(x, y);
      }
    } // we've just unclicked
    else {
      globalButton = 0;
    }
  } else if (event.eventname == "modified") {
    resetsketch();
  }
}
windowcallback.local = 1;

function onclick(x, y) {
  brush.strokeStart(x, y);
  startDrawing = false;
}
onclick.local = 1; // make function private to prevent triggering from Max

function ondrag(x, y) {
  brush.stroke(x, y);
  draw();
}
ondrag.local = 1;

///////////////////////////////////////////////////////////////////////////
//////////////////// Brushes ////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

///////// SIMPLE BRUSH ////////////////
function simple(context, color, lineSize, press) {
  this.context = context;
  this.pressure = press;
  this.prevMouseX = null;
  this.prevMouseY = null;
  this.color = color;
  this.brushSize = lineSize;
  this.type = "simple";
  //this.init( context );
}

function simpleStrokeStart(mouseX, mouseY) {
  this.prevMouseX = mouseX;
  this.prevMouseY = mouseY;
}
simple.prototype.strokeStart = simpleStrokeStart;

function simpleStroke(mouseX, mouseY) {
  drawLine(
    this.context,
    this.prevMouseX,
    this.prevMouseY,
    mouseX,
    mouseY,
    this.color[0],
    this.color[1],
    this.color[2],
    255,
    this.brushSize
  );

  this.prevMouseX = mouseX;
  this.prevMouseY = mouseY;
}
simple.prototype.stroke = simpleStroke;

function simpleClear() {
  this.prevMouseX = null;
  this.prevMouseY = null;
  this.brushSize = BRUSH_SIZE;
  //this.init( context );
}
simple.prototype.clear = simpleClear;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// CHROME ////////////////
function chrome(context, color, lineSize, press) {
  this.context = context;
  this.type = "chrome";
  this.pressure = press;
  this.prevMouseX = null;
  this.prevMouseY = null;
  this.color = color;
  this.brushSize = lineSize;

  this.points = new Array();
  this.count = 0;
}

function chromeStrokeStart(mouseX, mouseY) {
  this.prevMouseX = mouseX;
  this.prevMouseY = mouseY;
}
chrome.prototype.strokeStart = chromeStrokeStart;

function chromeStroke(mouseX, mouseY) {
  var i, dx, dy, d;

  this.points.push([mouseX, mouseY]);

  drawLine(
    this.context,
    this.prevMouseX,
    this.prevMouseY,
    mouseX,
    mouseY,
    this.color[0],
    this.color[1],
    this.color[2],
    255 * this.pressure,
    this.brushSize
  );

  for (i = 0; i < this.points.length; i++) {
    dx = this.points[i][0] - this.points[this.count][0];
    dy = this.points[i][1] - this.points[this.count][1];
    d = dx * dx + dy * dy;

    if (d < 1000) {
      drawLine(
        this.context,
        this.points[this.count][0] + dx * 0.2,
        this.points[this.count][1] + dy * 0.2,
        this.points[i][0] - dx * 0.2,
        this.points[i][1] - dy * 0.2,
        Math.floor(Math.random() * this.color[0]),
        Math.floor(Math.random() * this.color[1]),
        Math.floor(Math.random() * this.color[2]),
        255 * 0.1 * this.pressure,
        //this.color[0],this.color[1],this.color[2],255,
        this.brushSize
      );
    }
  }

  this.prevMouseX = mouseX;
  this.prevMouseY = mouseY;

  this.count++;
}
chrome.prototype.stroke = chromeStroke;

function chromeClear() {
  this.prevMouseX = null;
  this.prevMouseY = null;
  //this.brushSize = lineSize;
  this.brushSize = 0.0000002;

  this.points = new Array();
  this.count = 0;
}
chrome.prototype.clear = chromeClear;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// FUR ////////////////
function fur(context, color, lineSize, press) {
  this.context = context;
  this.type = "fur";
  this.pressure = press;
  this.prevMouseX = null;
  this.prevMouseY = null;
  this.color = color;
  this.brushSize = lineSize;
  //this.brushSize = 0.000002; // thin
  //this.brushSize = 0.002;  // bigger
  //this.brushSize = 0.02; // quite big

  this.points = new Array();
  this.count = 0;
}

function furStrokeStart(mouseX, mouseY) {
  this.prevMouseX = mouseX;
  this.prevMouseY = mouseY;
}
fur.prototype.strokeStart = furStrokeStart;

function furStroke(mouseX, mouseY) {
  var i, dx, dy, d;

  this.points.push([mouseX, mouseY]);

  drawLine(
    this.context,
    this.prevMouseX,
    this.prevMouseY,
    mouseX,
    mouseY,
    this.color[0],
    this.color[1],
    this.color[2],
    255 * this.pressure,
    this.brushSize
  );

  for (i = 0; i < this.points.length; i++) {
    dx = this.points[i][0] - this.points[this.count][0];
    dy = this.points[i][1] - this.points[this.count][1];
    d = dx * dx + dy * dy;

    if (d < 2000 && Math.random() > d / 2000) {
      drawLine(
        this.context,
        mouseX + dx * 0.5,
        mouseY + dy * 0.5,
        mouseX - dx * 0.5,
        mouseY - dy * 0.5,
        this.color[0],
        this.color[1],
        this.color[2],
        255 * this.pressure,
        //this.color[0],this.color[1],this.color[2],255,
        this.brushSize
      );
    }
  }

  this.prevMouseX = mouseX;
  this.prevMouseY = mouseY;

  this.count++;
}
fur.prototype.stroke = furStroke;

function furClear() {
  this.prevMouseX = null;
  this.prevMouseY = null;
  //this.brushSize = lineSize;
  this.brushSize = 0.0000002;

  this.points = new Array();
  this.count = 0;
}
fur.prototype.clear = furClear;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// LONG FUR ////////////////
function longFur(context, color, lineSize, press) {
  this.context = context;
  this.type = "longFur";
  this.pressure = press;
  this.color = color;
  this.brushSize = lineSize;
  //this.brushSize = 0.000002; // thin
  //this.brushSize = 0.002;  // bigger
  //this.brushSize = 0.02; // quite big

  this.points = new Array();
  this.count = 0;
}

function longFurStrokeStart(mouseX, mouseY) {}
longFur.prototype.strokeStart = longFurStrokeStart;

function longFurStroke(mouseX, mouseY) {
  var i, size, dx, dy, d;

  this.points.push([mouseX, mouseY]);

  for (i = 0; i < this.points.length; i++) {
    size = -Math.random();
    dx = this.points[i][0] - this.points[this.count][0];
    dy = this.points[i][1] - this.points[this.count][1];
    d = dx * dx + dy * dy;

    if (d < 4000 && Math.random() > d / 4000) {
      drawLine(
        this.context,
        this.points[this.count][0] + dx * size,
        this.points[this.count][1] + dy * size,
        this.points[i][0] - dx * size + Math.random() * 2,
        this.points[i][1] - dy * size + Math.random() * 2,
        this.color[0],
        this.color[1],
        this.color[2],
        255 * this.pressure,
        //this.color[0],this.color[1],this.color[2],255,
        this.brushSize
      );
    }
  }

  this.count++;
}
longFur.prototype.stroke = longFurStroke;

function longFurClear() {
  this.brushSize = 0.0000002;

  this.points = new Array();
  this.count = 0;
}
longFur.prototype.clear = longFurClear;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// SHADED ////////////////
function shaded(context, color, lineSize, press) {
  this.context = context;
  this.type = "shaded";
  this.pressure = press;
  this.prevMouseX = null;
  this.prevMouseY = null;
  this.color = color;
  this.brushSize = lineSize;
  //this.brushSize = 0.000002; // thin
  //this.brushSize = 0.002;  // bigger
  //this.brushSize = 0.02; // quite big

  this.points = new Array();
  this.count = 0;
}

function shadedStrokeStart(mouseX, mouseY) {
  this.prevMouseX = mouseX;
  this.prevMouseY = mouseY;
}
shaded.prototype.strokeStart = shadedStrokeStart;

function shadedStroke(mouseX, mouseY) {
  var i, dx, dy, d;

  this.points.push([mouseX, mouseY]);

  for (i = 0; i < this.points.length; i++) {
    dx = this.points[i][0] - this.points[this.count][0];
    dy = this.points[i][1] - this.points[this.count][1];
    d = dx * dx + dy * dy;

    if (d < 1000) {
      drawLine(
        this.context,
        this.points[this.count][0],
        this.points[this.count][1],
        this.points[i][0],
        this.points[i][1],
        this.color[0],
        this.color[1],
        this.color[2],
        255 * (1 - d / 1000) * this.pressure,
        //this.color[0],this.color[1],this.color[2],255,
        this.brushSize
      );
    }
  }

  this.prevMouseX = mouseX;
  this.prevMouseY = mouseY;

  this.count++;
}
shaded.prototype.stroke = shadedStroke;

function shadedClear() {
  this.prevMouseX = null;
  this.prevMouseY = null;
  //this.brushSize = lineSize;
  this.brushSize = 0.0000002;

  this.points = new Array();
  this.count = 0;
}
shaded.prototype.clear = shadedClear;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// SKETCHY ////////////////
function sketchy(context, color, lineSize, press) {
  this.context = context;
  this.type = "sketchy";
  this.pressure = press;
  this.prevMouseX = null;
  this.prevMouseY = null;
  this.color = color;
  this.brushSize = lineSize;
  //this.brushSize = 0.000002; // thin
  //this.brushSize = 0.002;  // bigger
  //this.brushSize = 0.02; // quite big

  this.points = new Array();
  this.count = 0;
}

function sketchyStrokeStart(mouseX, mouseY) {
  this.prevMouseX = mouseX;
  this.prevMouseY = mouseY;
}
sketchy.prototype.strokeStart = sketchyStrokeStart;

function sketchyStroke(mouseX, mouseY) {
  var i, dx, dy, d;

  this.points.push([mouseX, mouseY]);

  drawLine(
    this.context,
    this.prevMouseX,
    this.prevMouseY,
    mouseX,
    mouseY,
    this.color[0],
    this.color[1],
    this.color[2],
    255 * this.pressure,
    //this.color[0],this.color[1],this.color[2],255,
    this.brushSize
  );

  for (i = 0; i < this.points.length; i++) {
    dx = this.points[i][0] - this.points[this.count][0];
    dy = this.points[i][1] - this.points[this.count][1];
    d = dx * dx + dy * dy;

    if (d < 4000 && Math.random() > d / 2000) {
      drawLine(
        this.context,
        this.points[this.count][0] + dx * 0.3,
        this.points[this.count][1] + dy * 0.3,
        this.points[i][0] - dx * 0.3,
        this.points[i][1] - dy * 0.3,
        this.color[0],
        this.color[1],
        this.color[2],
        255 * this.pressure,
        //this.color[0],this.color[1],this.color[2],255,
        this.brushSize
      );
    }
  }

  this.prevMouseX = mouseX;
  this.prevMouseY = mouseY;

  this.count++;
}
sketchy.prototype.stroke = sketchyStroke;

function sketchyClear() {
  this.prevMouseX = null;
  this.prevMouseY = null;
  //this.brushSize = lineSize;
  this.brushSize = 0.0000002;

  this.points = new Array();
  this.count = 0;
}
sketchy.prototype.clear = sketchyClear;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// WEB ////////////////
function web(context, color, lineSize, press) {
  this.context = context;
  this.type = "web";
  this.pressure = press;
  this.prevMouseX = null;
  this.prevMouseY = null;
  this.color = color;
  this.brushSize = lineSize;
  //this.brushSize = 0.000002; // thin
  //this.brushSize = 0.002;  // bigger
  //this.brushSize = 0.02; // quite big

  this.points = new Array();
  this.count = 0;
}

function webStrokeStart(mouseX, mouseY) {
  this.prevMouseX = mouseX;
  this.prevMouseY = mouseY;
}
web.prototype.strokeStart = webStrokeStart;

function webStroke(mouseX, mouseY) {
  var i, dx, dy, d;

  this.points.push([mouseX, mouseY]);

  // Tip: maybe comment this first drawing code for a more realistic sketch based style!!
  drawLine(
    this.context,
    this.prevMouseX,
    this.prevMouseY,
    mouseX,
    mouseY,
    this.color[0],
    this.color[1],
    this.color[2],
    255 * this.pressure,
    //this.color[0],this.color[1],this.color[2],255,
    this.brushSize
  );

  for (i = 0; i < this.points.length; i++) {
    dx = this.points[i][0] - this.points[this.count][0];
    dy = this.points[i][1] - this.points[this.count][1];
    d = dx * dx + dy * dy;

    if (d < 2500 && Math.random() > 0.9) {
      drawLine(
        this.context,
        this.points[this.count][0],
        this.points[this.count][1],
        this.points[i][0],
        this.points[i][1],
        this.color[0],
        this.color[1],
        this.color[2],
        255 * this.pressure,
        //this.color[0],this.color[1],this.color[2],255,
        this.brushSize
      );
    }
  }

  this.prevMouseX = mouseX;
  this.prevMouseY = mouseY;

  this.count++;
}
web.prototype.stroke = webStroke;

function webClear() {
  this.prevMouseX = null;
  this.prevMouseY = null;
  //this.brushSize = lineSize;
  this.brushSize = 0.0000002;

  this.points = new Array();
  this.count = 0;
}
web.prototype.clear = webClear;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// SQUARES ////////////////
function squares(context, color, lineSize, press) {
  this.context = context;
  this.type = "squares";
  this.pressure = press;
  this.prevMouseX = null;
  this.prevMouseY = null;
  this.color = color;
  this.brushSize = lineSize;
  //this.brushSize = 0.000002; // thin
  //this.brushSize = 0.002;  // bigger
  //this.brushSize = 0.02; // quite big

  //	post("context, color, lineSize, and press are " + context + color + lineSize + press);
}

function squaresStrokeStart(mouseX, mouseY) {
  this.prevMouseX = mouseX;
  this.prevMouseY = mouseY;
}
squares.prototype.strokeStart = squaresStrokeStart;

function squaresStroke(mouseX, mouseY) {
  var dx, dy, angle, px, py;

  dx = mouseX - this.prevMouseX;
  dy = mouseY - this.prevMouseY;
  angle = 1.57079633;
  px = Math.cos(angle) * dx - Math.sin(angle) * dy;
  py = Math.sin(angle) * dx + Math.cos(angle) * dy;

  sketch1.glenable("blend");
  sketch1.beginstroke("basic2d");
  sketch2.glenable("blend");
  sketch2.beginstroke("basic2d");

  sketch1.gllinewidth(60 * this.brushSize);
  sketch2.gllinewidth(60 * this.brushSize);
  //    sketch.strokeparam ("scale", this.brushSize);

  var tColor = mapColor2RGBA(
    this.color[0],
    this.color[1],
    this.color[2],
    255 * this.pressure
  );
  //	sketch1.strokeparam ("color",tColor[0],tColor[1],tColor[2],tColor[3]);
  //	sketch2.strokeparam ("color",tColor[0],tColor[1],tColor[2],tColor[3]);
  sketch1.glcolor(tColor[0], tColor[1], tColor[2], tColor[3]);
  sketch2.glcolor(tColor[0], tColor[1], tColor[2], tColor[3]);

  var point1_x1 = sketch1.screentoworld(
    this.prevMouseX - px,
    this.prevMouseY - py
  )[0];
  var point1_y1 = sketch1.screentoworld(
    this.prevMouseX - px,
    this.prevMouseY - py
  )[1];
  var point2_x1 = sketch1.screentoworld(
    this.prevMouseX + px,
    this.prevMouseY + py
  )[0];
  var point2_y1 = sketch1.screentoworld(
    this.prevMouseX + px,
    this.prevMouseY + py
  )[1];
  var point3_x1 = sketch1.screentoworld(mouseX + px, mouseY + py)[0];
  var point3_y1 = sketch1.screentoworld(mouseX + px, mouseY + py)[1];
  var point4_x1 = sketch1.screentoworld(mouseX - px, mouseY - py)[0];
  var point4_y1 = sketch1.screentoworld(mouseX - px, mouseY - py)[1];

  var point1_x2 = sketch2.screentoworld(
    this.prevMouseX - px,
    this.prevMouseY - py
  )[0];
  var point1_y2 = sketch2.screentoworld(
    this.prevMouseX - px,
    this.prevMouseY - py
  )[1];
  var point2_x2 = sketch2.screentoworld(
    this.prevMouseX + px,
    this.prevMouseY + py
  )[0];
  var point2_y2 = sketch2.screentoworld(
    this.prevMouseX + px,
    this.prevMouseY + py
  )[1];
  var point3_x2 = sketch2.screentoworld(mouseX + px, mouseY + py)[0];
  var point3_y2 = sketch2.screentoworld(mouseX + px, mouseY + py)[1];
  var point4_x2 = sketch2.screentoworld(mouseX - px, mouseY - py)[0];
  var point4_y2 = sketch2.screentoworld(mouseX - px, mouseY - py)[1];

  sketch1.framequad(
    point1_x1,
    point1_y1,
    0,
    point2_x1,
    point2_y1,
    0,
    point3_x1,
    point3_y1,
    0,
    point4_x1,
    point4_y1,
    0
  );
  sketch2.framequad(
    point1_x2,
    point1_y2,
    0,
    point2_x2,
    point2_y2,
    0,
    point3_x2,
    point3_y2,
    0,
    point4_x2,
    point4_y2,
    0
  );
  //sketch.endstroke();

  this.prevMouseX = mouseX;
  this.prevMouseY = mouseY;
}
squares.prototype.stroke = squaresStroke;

function squaresClear() {
  this.prevMouseX = null;
  this.prevMouseY = null;
  //this.brushSize = lineSize;
  this.brushSize = 0.0000002;
}
squares.prototype.clear = squaresClear;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// Round SQUARES ////////////////
function roundSquares(context, color, lineSize, press) {
  this.context = context;
  this.type = "roundSquares";
  this.pressure = press;
  this.prevMouseX = null;
  this.prevMouseY = null;
  this.color = color;
  this.brushSize = lineSize;
  //this.brushSize = 0.000002; // thin
  //this.brushSize = 0.002;  // bigger
  //this.brushSize = 0.02; // quite big
}

function roundSquaresStrokeStart(mouseX, mouseY) {
  this.prevMouseX = mouseX;
  this.prevMouseY = mouseY;
}
roundSquares.prototype.strokeStart = roundSquaresStrokeStart;

function roundSquaresStroke(mouseX, mouseY) {
  var dx, dy, angle, px, py;

  dx = mouseX - this.prevMouseX;
  dy = mouseY - this.prevMouseY;
  angle = 1.57079633;
  px = Math.cos(angle) * dx - Math.sin(angle) * dy;
  py = Math.sin(angle) * dx + Math.cos(angle) * dy;

  sketch1.glenable("blend");
  sketch1.beginstroke("basic2d");
  sketch1.strokeparam("scale", this.brushSize);
  sketch2.glenable("blend");
  sketch2.beginstroke("basic2d");
  sketch2.strokeparam("scale", this.brushSize);

  var tColor = mapColor2RGBA(
    this.color[0],
    this.color[1],
    this.color[2],
    255 * this.pressure
  );
  sketch1.strokeparam("color", tColor[0], tColor[1], tColor[2], tColor[3]);
  sketch2.strokeparam("color", tColor[0], tColor[1], tColor[2], tColor[3]);

  var point1_x1 = sketch1.screentoworld(
    this.prevMouseX - px,
    this.prevMouseY - py
  )[0];
  var point1_y1 = sketch1.screentoworld(
    this.prevMouseX - px,
    this.prevMouseY - py
  )[1];
  var point2_x1 = sketch1.screentoworld(
    this.prevMouseX + px,
    this.prevMouseY + py
  )[0];
  var point2_y1 = sketch1.screentoworld(
    this.prevMouseX + px,
    this.prevMouseY + py
  )[1];
  var point3_x1 = sketch1.screentoworld(mouseX + px, mouseY + py)[0];
  var point3_y1 = sketch1.screentoworld(mouseX + px, mouseY + py)[1];
  var point4_x1 = sketch1.screentoworld(mouseX - px, mouseY - py)[0];
  var point4_y1 = sketch1.screentoworld(mouseX - px, mouseY - py)[1];

  var point1_x2 = sketch2.screentoworld(
    this.prevMouseX - px,
    this.prevMouseY - py
  )[0];
  var point1_y2 = sketch2.screentoworld(
    this.prevMouseX - px,
    this.prevMouseY - py
  )[1];
  var point2_x2 = sketch2.screentoworld(
    this.prevMouseX + px,
    this.prevMouseY + py
  )[0];
  var point2_y2 = sketch2.screentoworld(
    this.prevMouseX + px,
    this.prevMouseY + py
  )[1];
  var point3_x2 = sketch2.screentoworld(mouseX + px, mouseY + py)[0];
  var point3_y2 = sketch2.screentoworld(mouseX + px, mouseY + py)[1];
  var point4_x2 = sketch2.screentoworld(mouseX - px, mouseY - py)[0];
  var point4_y2 = sketch2.screentoworld(mouseX - px, mouseY - py)[1];

  sketch1.strokepoint(point1_x1, point1_y1);
  sketch1.strokepoint(point2_x1, point2_y1);
  sketch1.strokepoint(point3_x1, point3_y1);
  sketch1.strokepoint(point4_x1, point4_y1);
  sketch1.strokepoint(point1_x1, point1_y1);

  sketch2.strokepoint(point1_x2, point1_y2);
  sketch2.strokepoint(point2_x2, point2_y2);
  sketch2.strokepoint(point3_x2, point3_y2);
  sketch2.strokepoint(point4_x2, point4_y2);
  sketch2.strokepoint(point1_x2, point1_y2);

  sketch1.endstroke();
  sketch2.endstroke();

  this.prevMouseX = mouseX;
  this.prevMouseY = mouseY;
}
roundSquares.prototype.stroke = roundSquaresStroke;

function roundSquaresClear() {
  this.prevMouseX = null;
  this.prevMouseY = null;
  //this.brushSize = lineSize;
  this.brushSize = 0.0000002;
}
roundSquares.prototype.clear = roundSquaresClear;
