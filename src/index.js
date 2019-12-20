import * as PIXI from "pixi.js";
import layers from "./layers.js";
const EE = new PIXI.utils.EventEmitter();

class InteractionControl {
  constructor({ position, color, width, height }) {
    this.isEnable = true;
    this.position = position;
    this.color = color;
    this.width = width;
    this.height = height;
    this.makeSprite();
    this.bindEvents();
  }
  bindEvents() {
    this.sprite
      .on("mousedown", () => {
        EE.emit("selected", this);
      })
      .on("tap", () => {
        EE.emit("selectedMobile", this);
      })
      // events for drag start
      .on("mousedown", this.onDragStart.bind(this))
      .on("touchstart", this.onDragStartMobile.bind(this))
      // events for drag end
      .on("mouseup", this.onDragEnd.bind(this))
      .on("mouseupoutside", this.onDragEnd.bind(this))
      .on("touchend", this.onDragEnd.bind(this))
      .on("touchendoutside", this.onDragEnd.bind(this))
      // events for drag move
      .on("mousemove", this.onDragMoveMobile.bind(this))
      .on("touchmove", this.onDragMoveMobile.bind(this));
  }
  makeSprite() {
    const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    sprite.interactive = true;
    sprite.tint = this.color;
    sprite.alpha = 0.3;
    sprite.width = this.width;
    sprite.height = this.height;
    sprite.anchor.set(0);
    sprite.position = this.position;
    this.sprite = sprite;
  }
  select() {
    if (this.sprite.dragging) return;
    this.isSelected = true;
    this.sprite.alpha = 1;
  }
  deselect() {
    if (this.sprite.dragging) return;
    this.isSelected = false;
    this.sprite.alpha = 0.3;
  }
  enable() {
    this.isEnable = true;
  }
  disable() {
    this.isEnable = false;
  }
  onDragStartMobile(event) {
    if (!this.isSelected) return;
    if (this.isNotFirstTouch(event)) return;
    this.onDragStart(event);
  }
  isNotFirstTouch(event) {
    if (!event.data.originalEvent.touches) return false;
    return event.data.originalEvent.touches.length > 1;
  }
  onDragStart(event) {
    // store a reference to the data
    // the reason for this is because of multitouch
    // we want to track the movement of this particular touch
    var that = this.sprite;
    that.data = event.data;
    that.dragging = true;
    var newPosition = that.data.getLocalPosition(that.parent);
    this.clickOffset = {
      x: that.x - newPosition.x,
      y: that.y - newPosition.y
    };
  }
  onDragEnd() {
    var that = this.sprite;
    that.dragging = false;
    // set the interaction data to null
    that.data = null;
  }
  onDragMove() {
    var that = this.sprite;
    if (!that.dragging) return;
    var newPosition = that.data.getLocalPosition(that.parent);
    that.position.x = newPosition.x + this.clickOffset.x;
    that.position.y = newPosition.y + this.clickOffset.y;
  }
  onDragMoveMobile() {
    if (!this.isEnable) return;
    this.onDragMove();
  }
}

class InteractiveSupport {
  constructor() {
    [this.width, this.height] = [window.innerWidth, window.innerHeight];
    this.currentTouches = 0;
    this.previousTouches = 0;
    this.buildRenderer();
    this.buildStage();
    this.createSprites();
    this.bindEvents();
    this.startRenderer();
  }
  createSprites() {
    this.sprites = layers.map(layer => {
      return new InteractionControl(layer);
    });
    this.sprites.forEach(el => {
      this.stage.addChild(el.sprite);
    });
  }
  bindEvents() {
    this.stage
      .on("mousedown", this.clickOut.bind(this))
      .on("touchstart", this.touchStart.bind(this))
      .on("tap", this.tapOnCanvas.bind(this));
    EE.on("selected", layerSelected => {
      this.deselectAll();
      this.setSelectedLayer(layerSelected);
    }).on("selectedMobile", layerSelected => {
      var lastActive = this.lastActiveLayer;
      if (lastActive === layerSelected) return;
      this.deselectAll();
      !lastActive && this.setSelectedLayer(layerSelected);
    });
  }
  clickOut({ target }) {
    if (target !== this.stage) return;
    this.deselectAll();
  }
  touchStart({ data }) {
    this.currentTouches++;
    if (this.isFirstTouch()) return;
    this.disableInteractions();
  }
  tapOnCanvas({ target, data }) {
    if (this.isFirstTouch()) this.enableInteractions();
    if (!this.isMultitouchGesture()) this.clickOut({ target });
    this.previousTouches = this.currentTouches--;
  }
  isMultitouchGesture() {
    return this.previousTouches > 1 || this.currentTouches > 1;
  }
  isFirstTouch(data) {
    return this.currentTouches === 1;
  }
  setSelectedLayer(layerSelected) {
    layerSelected.select();
    this.lastActiveLayer = layerSelected;
  }
  buildRenderer() {
    this.renderer = new PIXI.Renderer({
      powerPreference: "high-performance",
      autostart: false,
      sharedTicker: true,
      resolution: devicePixelRatio >= 2 ? 2 : 1
    });
  }
  buildStage() {
    this.stage = new PIXI.Container();
    this.stage.interactive = true;
    this.ticker = PIXI.Ticker.shared;
    this.ticker.autoStart = false;
    this.ticker.stop();
    document.body.appendChild(this.renderer.view);
    this.renderer.resize(this.width, this.height);
    this.addBackground();
  }
  startRenderer() {
    const updateRenderer = () => this.renderer.render(this.stage);
    this.ticker.add(updateRenderer);
    this.ticker.start();
  }
  addBackground() {
    const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    sprite.tint = 0x000000;
    sprite.width = this.width;
    sprite.height = this.height;
    sprite.anchor.set(0);
    this.stage.addChild(sprite);
  }
  deselectAll() {
    this.sprites.forEach(el => {
      el.deselect();
    });
    this.lastActiveLayer = null;
  }
  enableInteractions() {
    this.sprites.forEach(el => {
      el.enable();
    });
  }
  disableInteractions() {
    this.sprites.forEach(el => {
      el.disable();
    });
  }
}

const interactiveSupport = new InteractiveSupport();
