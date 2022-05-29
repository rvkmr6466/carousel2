  function dragger(element) {
  const callbacks = {
    _onDragEnd: undefined,
    _onDragStart: undefined,
    _onDrag: undefined
  };
  const functions = {
    onDragStart(cb) {
      callbacks._onDragStart = cb;
    },
    onDrag(cb) {
      callbacks._onDrag = cb;
    },
    onDragEnd(cb) {
      callbacks._onDragEnd = cb;
    }
  };

  let mouseIsDown = false,
    startX,
    startY,
    distanceX,
    distanceY,
    distance = 0;

  element.onmousedown = (e) => {
    mouseIsDown = true;

    startX = e.clientX;
    startY = e.clientY;

    if (typeof callbacks._onDragStart == "function") {
      callbacks._onDragStart({ startX, startY });
    }
  };
  
  window.oncontextmenu = () => {
    mouseIsDown = false
    
    startX = 0;
    startY = 0;
    distance = 0;
    distanceX = 0;
    distanceY = 0;
  }

  window.onmouseup = (e) => {
    mouseIsDown = false;

    if (typeof callbacks._onDragEnd == "function" && distance > 0) {
      callbacks._onDragEnd({ distanceX, distanceY, distance });
    }

    startX = 0;
    startY = 0;
    distance = 0;
    distanceX = 0;
    distanceY = 0;
  };

  window.onmousemove = (e) => {
    if (!mouseIsDown) return;
    distanceX = e.clientX - startX;
    distanceY = e.clientY - startY;
    distance = Math.sqrt(Math.pow(distanceX, 2) + Math.pow(distanceY, 2));

    if (typeof callbacks._onDrag == "function")
      callbacks._onDrag({ distanceX, distanceY, distance });
  };

  return functions;
}

class Transitioner {
  static EasingFunctions = {
    linear: (t) => t,
    easeInQuad: (t) => t * t,
    easeOutQuad: (t) => t * (2 - t),
    easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    easeInCubic: (t) => t * t * t,
    easeOutCubic: (t) => --t * t * t + 1,
    easeInOutCubic: (t) =>
      t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    easeInQuart: (t) => t * t * t * t,
    easeOutQuart: (t) => 1 - --t * t * t * t,
    easeInOutQuart: (t) =>
      t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t,
    easeInQuint: (t) => t * t * t * t * t,
    easeOutQuint: (t) => 1 + --t * t * t * t * t,
    easeInOutQuint: (t) =>
      t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t
  };

  constructor() {
    this.requestId = undefined;
  }

  fromTo({ from, to, duration = 1, easing = "linear" }, cb) {
    const _duration = duration * 1000;
    const diff = to - from;

    let start = undefined;

    if (this.requestId != undefined) {
      window.cancelAnimationFrame(this.requestId);
      this.requestId = undefined;
    }

    function loop(timestamp) {
      if (!start) start = timestamp;

      let timepassed = timestamp - start;

      if (timepassed >= _duration) return cb(to, true);

      const n = Transitioner.EasingFunctions[easing](timepassed / _duration);

      cb(n * diff + from, false);

      this.requestId = window.requestAnimationFrame(loop.bind(this));
    }

    this.requestId = window.requestAnimationFrame(loop.bind(this));
  }
}

class CircleCarousel {
  constructor(container, radius = () => window.innerWidth / 2) {
    this.transition = new Transitioner();
    this.container = container;

    this.radius = radius; // Can be a function
    this.radiusFunction = undefined;
    this.items = [];
    
    this.mainItem = undefined

    this.rotation = 0;
    this.rotated = 0;

    this.init();
  }

  initResize() {
    if (typeof this.radius != "function") return;

    this.radiusFunction = this.radius;
    this.radius = this.radiusFunction();

    function debounce(time) {
      let timer = null;

      return function (cb) {
        if (timer != null) {
          clearTimeout(timer);
        }

        timer = setTimeout(() => {
          cb();
        }, time);
      };
    }

    const debouncer = debounce(100);

    window.addEventListener("resize", () => {
      this.radius = this.radiusFunction();
      debouncer(() => {
        this.drawElements();
      });
    });
  }
  

  init() {
    this.initResize();

    const carouselElements = [
      ...this.container.querySelectorAll(":scope > .carousel__item")
    ];

    this.setSA(carouselElements.length)
    
    carouselElements.forEach(this.createItem.bind(this))

    this.drawElements();
  }
  
  setSA(itemsAmount = undefined) {
    this.sA = (Math.PI * 2) / (itemsAmount || this.items.length);
  }
  
  createItem(element, _order = 0) {
    const order = this.items.length
    
    const item = {element, order: this.items.length, angle: -(this.sA * order - Math.PI / 2)}
    
    if (order == 0) {
      this.mainItem = item
    }
    
    this.items.push(item)
    
    element.addEventListener("click", () => {
      console.log(item.angle)
    })
  }

  drawElement(item, angle) {
    const x = Math.cos(angle || item.angle) * this.radius;
    const y = Math.sin(angle || item.angle) * this.radius;

    item.x = x;
    item.y = y;
    item.z =
      (item.y + this.radius) / (this.radius * 2) < 0
        ? 0
        : (item.y + this.radius) / (this.radius * 2);

   
    const opacity = Transitioner.EasingFunctions.easeInOutQuad(item.z) + .2
    const _x = item.x
    const scale = item.z
    
    item.element.style.transform = `translateX(${_x}px) scale(${scale})`;
    item.element.style.opacity = opacity > 1 ? 1 : opacity
    item.element.style.zIndex = Math.round(item.z * 10);
    
  }

  drawElements() {
    this.items.forEach((item) => {
      this.drawElement(item);
    });
  }

  updateItems(angle, setAngle) {
    this.items.forEach((item) => {
      

      // Force CSS Redraw (src: https://stackoverflow.com/questions/3485365/how-can-i-force-webkit-to-redraw-repaint-to-propagate-style-changes)
      // item.element.style.display = "none";
      // item.element.offsetHeight;
      // item.element.style.display = "";
      // // item.element.style.transform = "translateZ(0)"
      
      /**
      Note:
        Need to force css redraws when elements are visible                     
      */
      
      item.element.style.zIndex = Math.round(item.z * 10);

      if (item.angle > Math.PI * 2) {
        item.angle -= Math.PI * 2;
      }

      if (item.angle < Math.PI * -2) {
        item.angle += Math.PI * 2;
      }

      if (setAngle) {
        item.angle += angle;
        this.rotated = 0;
        this.rotation = 0;

        this.drawElement(item);
      } else {
        this.drawElement(item, item.angle + angle);
      }

      const z = Math.round(item.z * 10);

      if (parseInt(item.element.style.zIndex) != z) {
        item.element.style.zIndex = z;
      }
    });
  }
  

  rotate() {
    this.transition.fromTo(
      {
        from: this.rotated,
        to: this.rotation,
        duration: 0.3,
        easing: "easeInOutQuad"
      },
      (angle, end) => {
        this.rotated = angle;
        this.updateItems(angle, end);
      }
    );
  }

  rotateLeft() {
    this.rotation -= this.sA;
    this.rotate();
  }

  rotateRight() {
    this.rotation += this.sA;
    this.rotate();
  }
}

  window.addEventListener('load', (event) => {
    const { onDrag, onDragEnd } = dragger(window);
    const transition = new Transitioner();
    const leftBtn = document.querySelector(".carousel__controls--left");
    const rightBtn = document.querySelector(".carousel__controls--right");

    window.carousel = new CircleCarousel(
      document.querySelector(".carousel"),
      () => (window.innerWidth) / 4
    );

    leftBtn.onclick = () => {
      carousel.rotateLeft();
      carousel.drawElements();
    };

    rightBtn.onclick = () => {
      carousel.rotateRight();
      carousel.drawElements();
    };

    onDrag(({ distanceX }) => {
      const r = -distanceX / (carousel.radius * (Math.PI / 2));

      carousel.rotation = Math.round(r / carousel.sA) * carousel.sA;
      carousel.rotated = r;

      carousel.updateItems(r);
    });

    onDragEnd(() => {
      carousel.rotate();
    });
  });