'use strict';

!function ($) {

  "use strict";

  var FOUNDATION_VERSION = '6.3.1';

  // Global Foundation object
  // This is attached to the window, or used as a module for AMD/Browserify
  var Foundation = {
    version: FOUNDATION_VERSION,

    /**
     * Stores initialized plugins.
     */
    _plugins: {},

    /**
     * Stores generated unique ids for plugin instances
     */
    _uuids: [],

    /**
     * Returns a boolean for RTL support
     */
    rtl: function () {
      return $('html').attr('dir') === 'rtl';
    },
    /**
     * Defines a Foundation plugin, adding it to the `Foundation` namespace and the list of plugins to initialize when reflowing.
     * @param {Object} plugin - The constructor of the plugin.
     */
    plugin: function (plugin, name) {
      // Object key to use when adding to global Foundation object
      // Examples: Foundation.Reveal, Foundation.OffCanvas
      var className = name || functionName(plugin);
      // Object key to use when storing the plugin, also used to create the identifying data attribute for the plugin
      // Examples: data-reveal, data-off-canvas
      var attrName = hyphenate(className);

      // Add to the Foundation object and the plugins list (for reflowing)
      this._plugins[attrName] = this[className] = plugin;
    },
    /**
     * @function
     * Populates the _uuids array with pointers to each individual plugin instance.
     * Adds the `zfPlugin` data-attribute to programmatically created plugins to allow use of $(selector).foundation(method) calls.
     * Also fires the initialization event for each plugin, consolidating repetitive code.
     * @param {Object} plugin - an instance of a plugin, usually `this` in context.
     * @param {String} name - the name of the plugin, passed as a camelCased string.
     * @fires Plugin#init
     */
    registerPlugin: function (plugin, name) {
      var pluginName = name ? hyphenate(name) : functionName(plugin.constructor).toLowerCase();
      plugin.uuid = this.GetYoDigits(6, pluginName);

      if (!plugin.$element.attr('data-' + pluginName)) {
        plugin.$element.attr('data-' + pluginName, plugin.uuid);
      }
      if (!plugin.$element.data('zfPlugin')) {
        plugin.$element.data('zfPlugin', plugin);
      }
      /**
       * Fires when the plugin has initialized.
       * @event Plugin#init
       */
      plugin.$element.trigger('init.zf.' + pluginName);

      this._uuids.push(plugin.uuid);

      return;
    },
    /**
     * @function
     * Removes the plugins uuid from the _uuids array.
     * Removes the zfPlugin data attribute, as well as the data-plugin-name attribute.
     * Also fires the destroyed event for the plugin, consolidating repetitive code.
     * @param {Object} plugin - an instance of a plugin, usually `this` in context.
     * @fires Plugin#destroyed
     */
    unregisterPlugin: function (plugin) {
      var pluginName = hyphenate(functionName(plugin.$element.data('zfPlugin').constructor));

      this._uuids.splice(this._uuids.indexOf(plugin.uuid), 1);
      plugin.$element.removeAttr('data-' + pluginName).removeData('zfPlugin')
      /**
       * Fires when the plugin has been destroyed.
       * @event Plugin#destroyed
       */
      .trigger('destroyed.zf.' + pluginName);
      for (var prop in plugin) {
        plugin[prop] = null; //clean up script to prep for garbage collection.
      }
      return;
    },

    /**
     * @function
     * Causes one or more active plugins to re-initialize, resetting event listeners, recalculating positions, etc.
     * @param {String} plugins - optional string of an individual plugin key, attained by calling `$(element).data('pluginName')`, or string of a plugin class i.e. `'dropdown'`
     * @default If no argument is passed, reflow all currently active plugins.
     */
    reInit: function (plugins) {
      var isJQ = plugins instanceof $;
      try {
        if (isJQ) {
          plugins.each(function () {
            $(this).data('zfPlugin')._init();
          });
        } else {
          var type = typeof plugins,
              _this = this,
              fns = {
            'object': function (plgs) {
              plgs.forEach(function (p) {
                p = hyphenate(p);
                $('[data-' + p + ']').foundation('_init');
              });
            },
            'string': function () {
              plugins = hyphenate(plugins);
              $('[data-' + plugins + ']').foundation('_init');
            },
            'undefined': function () {
              this['object'](Object.keys(_this._plugins));
            }
          };
          fns[type](plugins);
        }
      } catch (err) {
        console.error(err);
      } finally {
        return plugins;
      }
    },

    /**
     * returns a random base-36 uid with namespacing
     * @function
     * @param {Number} length - number of random base-36 digits desired. Increase for more random strings.
     * @param {String} namespace - name of plugin to be incorporated in uid, optional.
     * @default {String} '' - if no plugin name is provided, nothing is appended to the uid.
     * @returns {String} - unique id
     */
    GetYoDigits: function (length, namespace) {
      length = length || 6;
      return Math.round(Math.pow(36, length + 1) - Math.random() * Math.pow(36, length)).toString(36).slice(1) + (namespace ? '-' + namespace : '');
    },
    /**
     * Initialize plugins on any elements within `elem` (and `elem` itself) that aren't already initialized.
     * @param {Object} elem - jQuery object containing the element to check inside. Also checks the element itself, unless it's the `document` object.
     * @param {String|Array} plugins - A list of plugins to initialize. Leave this out to initialize everything.
     */
    reflow: function (elem, plugins) {

      // If plugins is undefined, just grab everything
      if (typeof plugins === 'undefined') {
        plugins = Object.keys(this._plugins);
      }
      // If plugins is a string, convert it to an array with one item
      else if (typeof plugins === 'string') {
          plugins = [plugins];
        }

      var _this = this;

      // Iterate through each plugin
      $.each(plugins, function (i, name) {
        // Get the current plugin
        var plugin = _this._plugins[name];

        // Localize the search to all elements inside elem, as well as elem itself, unless elem === document
        var $elem = $(elem).find('[data-' + name + ']').addBack('[data-' + name + ']');

        // For each plugin found, initialize it
        $elem.each(function () {
          var $el = $(this),
              opts = {};
          // Don't double-dip on plugins
          if ($el.data('zfPlugin')) {
            console.warn("Tried to initialize " + name + " on an element that already has a Foundation plugin.");
            return;
          }

          if ($el.attr('data-options')) {
            var thing = $el.attr('data-options').split(';').forEach(function (e, i) {
              var opt = e.split(':').map(function (el) {
                return el.trim();
              });
              if (opt[0]) opts[opt[0]] = parseValue(opt[1]);
            });
          }
          try {
            $el.data('zfPlugin', new plugin($(this), opts));
          } catch (er) {
            console.error(er);
          } finally {
            return;
          }
        });
      });
    },
    getFnName: functionName,
    transitionend: function ($elem) {
      var transitions = {
        'transition': 'transitionend',
        'WebkitTransition': 'webkitTransitionEnd',
        'MozTransition': 'transitionend',
        'OTransition': 'otransitionend'
      };
      var elem = document.createElement('div'),
          end;

      for (var t in transitions) {
        if (typeof elem.style[t] !== 'undefined') {
          end = transitions[t];
        }
      }
      if (end) {
        return end;
      } else {
        end = setTimeout(function () {
          $elem.triggerHandler('transitionend', [$elem]);
        }, 1);
        return 'transitionend';
      }
    }
  };

  Foundation.util = {
    /**
     * Function for applying a debounce effect to a function call.
     * @function
     * @param {Function} func - Function to be called at end of timeout.
     * @param {Number} delay - Time in ms to delay the call of `func`.
     * @returns function
     */
    throttle: function (func, delay) {
      var timer = null;

      return function () {
        var context = this,
            args = arguments;

        if (timer === null) {
          timer = setTimeout(function () {
            func.apply(context, args);
            timer = null;
          }, delay);
        }
      };
    }
  };

  // TODO: consider not making this a jQuery function
  // TODO: need way to reflow vs. re-initialize
  /**
   * The Foundation jQuery method.
   * @param {String|Array} method - An action to perform on the current jQuery object.
   */
  var foundation = function (method) {
    var type = typeof method,
        $meta = $('meta.foundation-mq'),
        $noJS = $('.no-js');

    if (!$meta.length) {
      $('<meta class="foundation-mq">').appendTo(document.head);
    }
    if ($noJS.length) {
      $noJS.removeClass('no-js');
    }

    if (type === 'undefined') {
      //needs to initialize the Foundation object, or an individual plugin.
      Foundation.MediaQuery._init();
      Foundation.reflow(this);
    } else if (type === 'string') {
      //an individual method to invoke on a plugin or group of plugins
      var args = Array.prototype.slice.call(arguments, 1); //collect all the arguments, if necessary
      var plugClass = this.data('zfPlugin'); //determine the class of plugin

      if (plugClass !== undefined && plugClass[method] !== undefined) {
        //make sure both the class and method exist
        if (this.length === 1) {
          //if there's only one, call it directly.
          plugClass[method].apply(plugClass, args);
        } else {
          this.each(function (i, el) {
            //otherwise loop through the jQuery collection and invoke the method on each
            plugClass[method].apply($(el).data('zfPlugin'), args);
          });
        }
      } else {
        //error for no class or no method
        throw new ReferenceError("We're sorry, '" + method + "' is not an available method for " + (plugClass ? functionName(plugClass) : 'this element') + '.');
      }
    } else {
      //error for invalid argument type
      throw new TypeError('We\'re sorry, ' + type + ' is not a valid parameter. You must use a string representing the method you wish to invoke.');
    }
    return this;
  };

  window.Foundation = Foundation;
  $.fn.foundation = foundation;

  // Polyfill for requestAnimationFrame
  (function () {
    if (!Date.now || !window.Date.now) window.Date.now = Date.now = function () {
      return new Date().getTime();
    };

    var vendors = ['webkit', 'moz'];
    for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
      var vp = vendors[i];
      window.requestAnimationFrame = window[vp + 'RequestAnimationFrame'];
      window.cancelAnimationFrame = window[vp + 'CancelAnimationFrame'] || window[vp + 'CancelRequestAnimationFrame'];
    }
    if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
      var lastTime = 0;
      window.requestAnimationFrame = function (callback) {
        var now = Date.now();
        var nextTime = Math.max(lastTime + 16, now);
        return setTimeout(function () {
          callback(lastTime = nextTime);
        }, nextTime - now);
      };
      window.cancelAnimationFrame = clearTimeout;
    }
    /**
     * Polyfill for performance.now, required by rAF
     */
    if (!window.performance || !window.performance.now) {
      window.performance = {
        start: Date.now(),
        now: function () {
          return Date.now() - this.start;
        }
      };
    }
  })();
  if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
      if (typeof this !== 'function') {
        // closest thing possible to the ECMAScript 5
        // internal IsCallable function
        throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
      }

      var aArgs = Array.prototype.slice.call(arguments, 1),
          fToBind = this,
          fNOP = function () {},
          fBound = function () {
        return fToBind.apply(this instanceof fNOP ? this : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
      };

      if (this.prototype) {
        // native functions don't have a prototype
        fNOP.prototype = this.prototype;
      }
      fBound.prototype = new fNOP();

      return fBound;
    };
  }
  // Polyfill to get the name of a function in IE9
  function functionName(fn) {
    if (Function.prototype.name === undefined) {
      var funcNameRegex = /function\s([^(]{1,})\(/;
      var results = funcNameRegex.exec(fn.toString());
      return results && results.length > 1 ? results[1].trim() : "";
    } else if (fn.prototype === undefined) {
      return fn.constructor.name;
    } else {
      return fn.prototype.constructor.name;
    }
  }
  function parseValue(str) {
    if ('true' === str) return true;else if ('false' === str) return false;else if (!isNaN(str * 1)) return parseFloat(str);
    return str;
  }
  // Convert PascalCase to kebab-case
  // Thank you: http://stackoverflow.com/a/8955580
  function hyphenate(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}(jQuery);
;'use strict';

!function ($) {

  Foundation.Box = {
    ImNotTouchingYou: ImNotTouchingYou,
    GetDimensions: GetDimensions,
    GetOffsets: GetOffsets

    /**
     * Compares the dimensions of an element to a container and determines collision events with container.
     * @function
     * @param {jQuery} element - jQuery object to test for collisions.
     * @param {jQuery} parent - jQuery object to use as bounding container.
     * @param {Boolean} lrOnly - set to true to check left and right values only.
     * @param {Boolean} tbOnly - set to true to check top and bottom values only.
     * @default if no parent object passed, detects collisions with `window`.
     * @returns {Boolean} - true if collision free, false if a collision in any direction.
     */
  };function ImNotTouchingYou(element, parent, lrOnly, tbOnly) {
    var eleDims = GetDimensions(element),
        top,
        bottom,
        left,
        right;

    if (parent) {
      var parDims = GetDimensions(parent);

      bottom = eleDims.offset.top + eleDims.height <= parDims.height + parDims.offset.top;
      top = eleDims.offset.top >= parDims.offset.top;
      left = eleDims.offset.left >= parDims.offset.left;
      right = eleDims.offset.left + eleDims.width <= parDims.width + parDims.offset.left;
    } else {
      bottom = eleDims.offset.top + eleDims.height <= eleDims.windowDims.height + eleDims.windowDims.offset.top;
      top = eleDims.offset.top >= eleDims.windowDims.offset.top;
      left = eleDims.offset.left >= eleDims.windowDims.offset.left;
      right = eleDims.offset.left + eleDims.width <= eleDims.windowDims.width;
    }

    var allDirs = [bottom, top, left, right];

    if (lrOnly) {
      return left === right === true;
    }

    if (tbOnly) {
      return top === bottom === true;
    }

    return allDirs.indexOf(false) === -1;
  };

  /**
   * Uses native methods to return an object of dimension values.
   * @function
   * @param {jQuery || HTML} element - jQuery object or DOM element for which to get the dimensions. Can be any element other that document or window.
   * @returns {Object} - nested object of integer pixel values
   * TODO - if element is window, return only those values.
   */
  function GetDimensions(elem, test) {
    elem = elem.length ? elem[0] : elem;

    if (elem === window || elem === document) {
      throw new Error("I'm sorry, Dave. I'm afraid I can't do that.");
    }

    var rect = elem.getBoundingClientRect(),
        parRect = elem.parentNode.getBoundingClientRect(),
        winRect = document.body.getBoundingClientRect(),
        winY = window.pageYOffset,
        winX = window.pageXOffset;

    return {
      width: rect.width,
      height: rect.height,
      offset: {
        top: rect.top + winY,
        left: rect.left + winX
      },
      parentDims: {
        width: parRect.width,
        height: parRect.height,
        offset: {
          top: parRect.top + winY,
          left: parRect.left + winX
        }
      },
      windowDims: {
        width: winRect.width,
        height: winRect.height,
        offset: {
          top: winY,
          left: winX
        }
      }
    };
  }

  /**
   * Returns an object of top and left integer pixel values for dynamically rendered elements,
   * such as: Tooltip, Reveal, and Dropdown
   * @function
   * @param {jQuery} element - jQuery object for the element being positioned.
   * @param {jQuery} anchor - jQuery object for the element's anchor point.
   * @param {String} position - a string relating to the desired position of the element, relative to it's anchor
   * @param {Number} vOffset - integer pixel value of desired vertical separation between anchor and element.
   * @param {Number} hOffset - integer pixel value of desired horizontal separation between anchor and element.
   * @param {Boolean} isOverflow - if a collision event is detected, sets to true to default the element to full width - any desired offset.
   * TODO alter/rewrite to work with `em` values as well/instead of pixels
   */
  function GetOffsets(element, anchor, position, vOffset, hOffset, isOverflow) {
    var $eleDims = GetDimensions(element),
        $anchorDims = anchor ? GetDimensions(anchor) : null;

    switch (position) {
      case 'top':
        return {
          left: Foundation.rtl() ? $anchorDims.offset.left - $eleDims.width + $anchorDims.width : $anchorDims.offset.left,
          top: $anchorDims.offset.top - ($eleDims.height + vOffset)
        };
        break;
      case 'left':
        return {
          left: $anchorDims.offset.left - ($eleDims.width + hOffset),
          top: $anchorDims.offset.top
        };
        break;
      case 'right':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset,
          top: $anchorDims.offset.top
        };
        break;
      case 'center top':
        return {
          left: $anchorDims.offset.left + $anchorDims.width / 2 - $eleDims.width / 2,
          top: $anchorDims.offset.top - ($eleDims.height + vOffset)
        };
        break;
      case 'center bottom':
        return {
          left: isOverflow ? hOffset : $anchorDims.offset.left + $anchorDims.width / 2 - $eleDims.width / 2,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
        break;
      case 'center left':
        return {
          left: $anchorDims.offset.left - ($eleDims.width + hOffset),
          top: $anchorDims.offset.top + $anchorDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'center right':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset + 1,
          top: $anchorDims.offset.top + $anchorDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'center':
        return {
          left: $eleDims.windowDims.offset.left + $eleDims.windowDims.width / 2 - $eleDims.width / 2,
          top: $eleDims.windowDims.offset.top + $eleDims.windowDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'reveal':
        return {
          left: ($eleDims.windowDims.width - $eleDims.width) / 2,
          top: $eleDims.windowDims.offset.top + vOffset
        };
      case 'reveal full':
        return {
          left: $eleDims.windowDims.offset.left,
          top: $eleDims.windowDims.offset.top
        };
        break;
      case 'left bottom':
        return {
          left: $anchorDims.offset.left,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
        break;
      case 'right bottom':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset - $eleDims.width,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
        break;
      default:
        return {
          left: Foundation.rtl() ? $anchorDims.offset.left - $eleDims.width + $anchorDims.width : $anchorDims.offset.left + hOffset,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
    }
  }
}(jQuery);
;/*******************************************
 *                                         *
 * This util was created by Marius Olbertz *
 * Please thank Marius on GitHub /owlbertz *
 * or the web http://www.mariusolbertz.de/ *
 *                                         *
 ******************************************/

'use strict';

!function ($) {

  var keyCodes = {
    9: 'TAB',
    13: 'ENTER',
    27: 'ESCAPE',
    32: 'SPACE',
    37: 'ARROW_LEFT',
    38: 'ARROW_UP',
    39: 'ARROW_RIGHT',
    40: 'ARROW_DOWN'
  };

  var commands = {};

  var Keyboard = {
    keys: getKeyCodes(keyCodes),

    /**
     * Parses the (keyboard) event and returns a String that represents its key
     * Can be used like Foundation.parseKey(event) === Foundation.keys.SPACE
     * @param {Event} event - the event generated by the event handler
     * @return String key - String that represents the key pressed
     */
    parseKey: function (event) {
      var key = keyCodes[event.which || event.keyCode] || String.fromCharCode(event.which).toUpperCase();

      // Remove un-printable characters, e.g. for `fromCharCode` calls for CTRL only events
      key = key.replace(/\W+/, '');

      if (event.shiftKey) key = 'SHIFT_' + key;
      if (event.ctrlKey) key = 'CTRL_' + key;
      if (event.altKey) key = 'ALT_' + key;

      // Remove trailing underscore, in case only modifiers were used (e.g. only `CTRL_ALT`)
      key = key.replace(/_$/, '');

      return key;
    },


    /**
     * Handles the given (keyboard) event
     * @param {Event} event - the event generated by the event handler
     * @param {String} component - Foundation component's name, e.g. Slider or Reveal
     * @param {Objects} functions - collection of functions that are to be executed
     */
    handleKey: function (event, component, functions) {
      var commandList = commands[component],
          keyCode = this.parseKey(event),
          cmds,
          command,
          fn;

      if (!commandList) return console.warn('Component not defined!');

      if (typeof commandList.ltr === 'undefined') {
        // this component does not differentiate between ltr and rtl
        cmds = commandList; // use plain list
      } else {
        // merge ltr and rtl: if document is rtl, rtl overwrites ltr and vice versa
        if (Foundation.rtl()) cmds = $.extend({}, commandList.ltr, commandList.rtl);else cmds = $.extend({}, commandList.rtl, commandList.ltr);
      }
      command = cmds[keyCode];

      fn = functions[command];
      if (fn && typeof fn === 'function') {
        // execute function  if exists
        var returnValue = fn.apply();
        if (functions.handled || typeof functions.handled === 'function') {
          // execute function when event was handled
          functions.handled(returnValue);
        }
      } else {
        if (functions.unhandled || typeof functions.unhandled === 'function') {
          // execute function when event was not handled
          functions.unhandled();
        }
      }
    },


    /**
     * Finds all focusable elements within the given `$element`
     * @param {jQuery} $element - jQuery object to search within
     * @return {jQuery} $focusable - all focusable elements within `$element`
     */
    findFocusable: function ($element) {
      if (!$element) {
        return false;
      }
      return $element.find('a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]').filter(function () {
        if (!$(this).is(':visible') || $(this).attr('tabindex') < 0) {
          return false;
        } //only have visible elements and those that have a tabindex greater or equal 0
        return true;
      });
    },


    /**
     * Returns the component name name
     * @param {Object} component - Foundation component, e.g. Slider or Reveal
     * @return String componentName
     */

    register: function (componentName, cmds) {
      commands[componentName] = cmds;
    },


    /**
     * Traps the focus in the given element.
     * @param  {jQuery} $element  jQuery object to trap the foucs into.
     */
    trapFocus: function ($element) {
      var $focusable = Foundation.Keyboard.findFocusable($element),
          $firstFocusable = $focusable.eq(0),
          $lastFocusable = $focusable.eq(-1);

      $element.on('keydown.zf.trapfocus', function (event) {
        if (event.target === $lastFocusable[0] && Foundation.Keyboard.parseKey(event) === 'TAB') {
          event.preventDefault();
          $firstFocusable.focus();
        } else if (event.target === $firstFocusable[0] && Foundation.Keyboard.parseKey(event) === 'SHIFT_TAB') {
          event.preventDefault();
          $lastFocusable.focus();
        }
      });
    },

    /**
     * Releases the trapped focus from the given element.
     * @param  {jQuery} $element  jQuery object to release the focus for.
     */
    releaseFocus: function ($element) {
      $element.off('keydown.zf.trapfocus');
    }
  };

  /*
   * Constants for easier comparing.
   * Can be used like Foundation.parseKey(event) === Foundation.keys.SPACE
   */
  function getKeyCodes(kcs) {
    var k = {};
    for (var kc in kcs) {
      k[kcs[kc]] = kcs[kc];
    }return k;
  }

  Foundation.Keyboard = Keyboard;
}(jQuery);
;'use strict';

!function ($) {

  // Default set of media queries
  var defaultQueries = {
    'default': 'only screen',
    landscape: 'only screen and (orientation: landscape)',
    portrait: 'only screen and (orientation: portrait)',
    retina: 'only screen and (-webkit-min-device-pixel-ratio: 2),' + 'only screen and (min--moz-device-pixel-ratio: 2),' + 'only screen and (-o-min-device-pixel-ratio: 2/1),' + 'only screen and (min-device-pixel-ratio: 2),' + 'only screen and (min-resolution: 192dpi),' + 'only screen and (min-resolution: 2dppx)'
  };

  var MediaQuery = {
    queries: [],

    current: '',

    /**
     * Initializes the media query helper, by extracting the breakpoint list from the CSS and activating the breakpoint watcher.
     * @function
     * @private
     */
    _init: function () {
      var self = this;
      var extractedStyles = $('.foundation-mq').css('font-family');
      var namedQueries;

      namedQueries = parseStyleToObject(extractedStyles);

      for (var key in namedQueries) {
        if (namedQueries.hasOwnProperty(key)) {
          self.queries.push({
            name: key,
            value: 'only screen and (min-width: ' + namedQueries[key] + ')'
          });
        }
      }

      this.current = this._getCurrentSize();

      this._watcher();
    },


    /**
     * Checks if the screen is at least as wide as a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to check.
     * @returns {Boolean} `true` if the breakpoint matches, `false` if it's smaller.
     */
    atLeast: function (size) {
      var query = this.get(size);

      if (query) {
        return window.matchMedia(query).matches;
      }

      return false;
    },


    /**
     * Checks if the screen matches to a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to check, either 'small only' or 'small'. Omitting 'only' falls back to using atLeast() method.
     * @returns {Boolean} `true` if the breakpoint matches, `false` if it does not.
     */
    is: function (size) {
      size = size.trim().split(' ');
      if (size.length > 1 && size[1] === 'only') {
        if (size[0] === this._getCurrentSize()) return true;
      } else {
        return this.atLeast(size[0]);
      }
      return false;
    },


    /**
     * Gets the media query of a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to get.
     * @returns {String|null} - The media query of the breakpoint, or `null` if the breakpoint doesn't exist.
     */
    get: function (size) {
      for (var i in this.queries) {
        if (this.queries.hasOwnProperty(i)) {
          var query = this.queries[i];
          if (size === query.name) return query.value;
        }
      }

      return null;
    },


    /**
     * Gets the current breakpoint name by testing every breakpoint and returning the last one to match (the biggest one).
     * @function
     * @private
     * @returns {String} Name of the current breakpoint.
     */
    _getCurrentSize: function () {
      var matched;

      for (var i = 0; i < this.queries.length; i++) {
        var query = this.queries[i];

        if (window.matchMedia(query.value).matches) {
          matched = query;
        }
      }

      if (typeof matched === 'object') {
        return matched.name;
      } else {
        return matched;
      }
    },


    /**
     * Activates the breakpoint watcher, which fires an event on the window whenever the breakpoint changes.
     * @function
     * @private
     */
    _watcher: function () {
      var _this = this;

      $(window).on('resize.zf.mediaquery', function () {
        var newSize = _this._getCurrentSize(),
            currentSize = _this.current;

        if (newSize !== currentSize) {
          // Change the current media query
          _this.current = newSize;

          // Broadcast the media query change on the window
          $(window).trigger('changed.zf.mediaquery', [newSize, currentSize]);
        }
      });
    }
  };

  Foundation.MediaQuery = MediaQuery;

  // matchMedia() polyfill - Test a CSS media type/query in JS.
  // Authors & copyright (c) 2012: Scott Jehl, Paul Irish, Nicholas Zakas, David Knight. Dual MIT/BSD license
  window.matchMedia || (window.matchMedia = function () {
    'use strict';

    // For browsers that support matchMedium api such as IE 9 and webkit

    var styleMedia = window.styleMedia || window.media;

    // For those that don't support matchMedium
    if (!styleMedia) {
      var style = document.createElement('style'),
          script = document.getElementsByTagName('script')[0],
          info = null;

      style.type = 'text/css';
      style.id = 'matchmediajs-test';

      script && script.parentNode && script.parentNode.insertBefore(style, script);

      // 'style.currentStyle' is used by IE <= 8 and 'window.getComputedStyle' for all other browsers
      info = 'getComputedStyle' in window && window.getComputedStyle(style, null) || style.currentStyle;

      styleMedia = {
        matchMedium: function (media) {
          var text = '@media ' + media + '{ #matchmediajs-test { width: 1px; } }';

          // 'style.styleSheet' is used by IE <= 8 and 'style.textContent' for all other browsers
          if (style.styleSheet) {
            style.styleSheet.cssText = text;
          } else {
            style.textContent = text;
          }

          // Test if media query is true or false
          return info.width === '1px';
        }
      };
    }

    return function (media) {
      return {
        matches: styleMedia.matchMedium(media || 'all'),
        media: media || 'all'
      };
    };
  }());

  // Thank you: https://github.com/sindresorhus/query-string
  function parseStyleToObject(str) {
    var styleObject = {};

    if (typeof str !== 'string') {
      return styleObject;
    }

    str = str.trim().slice(1, -1); // browsers re-quote string style values

    if (!str) {
      return styleObject;
    }

    styleObject = str.split('&').reduce(function (ret, param) {
      var parts = param.replace(/\+/g, ' ').split('=');
      var key = parts[0];
      var val = parts[1];
      key = decodeURIComponent(key);

      // missing `=` should be `null`:
      // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
      val = val === undefined ? null : decodeURIComponent(val);

      if (!ret.hasOwnProperty(key)) {
        ret[key] = val;
      } else if (Array.isArray(ret[key])) {
        ret[key].push(val);
      } else {
        ret[key] = [ret[key], val];
      }
      return ret;
    }, {});

    return styleObject;
  }

  Foundation.MediaQuery = MediaQuery;
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Motion module.
   * @module foundation.motion
   */

  var initClasses = ['mui-enter', 'mui-leave'];
  var activeClasses = ['mui-enter-active', 'mui-leave-active'];

  var Motion = {
    animateIn: function (element, animation, cb) {
      animate(true, element, animation, cb);
    },

    animateOut: function (element, animation, cb) {
      animate(false, element, animation, cb);
    }
  };

  function Move(duration, elem, fn) {
    var anim,
        prog,
        start = null;
    // console.log('called');

    if (duration === 0) {
      fn.apply(elem);
      elem.trigger('finished.zf.animate', [elem]).triggerHandler('finished.zf.animate', [elem]);
      return;
    }

    function move(ts) {
      if (!start) start = ts;
      // console.log(start, ts);
      prog = ts - start;
      fn.apply(elem);

      if (prog < duration) {
        anim = window.requestAnimationFrame(move, elem);
      } else {
        window.cancelAnimationFrame(anim);
        elem.trigger('finished.zf.animate', [elem]).triggerHandler('finished.zf.animate', [elem]);
      }
    }
    anim = window.requestAnimationFrame(move);
  }

  /**
   * Animates an element in or out using a CSS transition class.
   * @function
   * @private
   * @param {Boolean} isIn - Defines if the animation is in or out.
   * @param {Object} element - jQuery or HTML object to animate.
   * @param {String} animation - CSS class to use.
   * @param {Function} cb - Callback to run when animation is finished.
   */
  function animate(isIn, element, animation, cb) {
    element = $(element).eq(0);

    if (!element.length) return;

    var initClass = isIn ? initClasses[0] : initClasses[1];
    var activeClass = isIn ? activeClasses[0] : activeClasses[1];

    // Set up the animation
    reset();

    element.addClass(animation).css('transition', 'none');

    requestAnimationFrame(function () {
      element.addClass(initClass);
      if (isIn) element.show();
    });

    // Start the animation
    requestAnimationFrame(function () {
      element[0].offsetWidth;
      element.css('transition', '').addClass(activeClass);
    });

    // Clean up the animation when it finishes
    element.one(Foundation.transitionend(element), finish);

    // Hides the element (for out animations), resets the element, and runs a callback
    function finish() {
      if (!isIn) element.hide();
      reset();
      if (cb) cb.apply(element);
    }

    // Resets transitions and removes motion-specific classes
    function reset() {
      element[0].style.transitionDuration = 0;
      element.removeClass(initClass + ' ' + activeClass + ' ' + animation);
    }
  }

  Foundation.Move = Move;
  Foundation.Motion = Motion;
}(jQuery);
;'use strict';

!function ($) {

  var Nest = {
    Feather: function (menu) {
      var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'zf';

      menu.attr('role', 'menubar');

      var items = menu.find('li').attr({ 'role': 'menuitem' }),
          subMenuClass = 'is-' + type + '-submenu',
          subItemClass = subMenuClass + '-item',
          hasSubClass = 'is-' + type + '-submenu-parent';

      items.each(function () {
        var $item = $(this),
            $sub = $item.children('ul');

        if ($sub.length) {
          $item.addClass(hasSubClass).attr({
            'aria-haspopup': true,
            'aria-label': $item.children('a:first').text()
          });
          // Note:  Drilldowns behave differently in how they hide, and so need
          // additional attributes.  We should look if this possibly over-generalized
          // utility (Nest) is appropriate when we rework menus in 6.4
          if (type === 'drilldown') {
            $item.attr({ 'aria-expanded': false });
          }

          $sub.addClass('submenu ' + subMenuClass).attr({
            'data-submenu': '',
            'role': 'menu'
          });
          if (type === 'drilldown') {
            $sub.attr({ 'aria-hidden': true });
          }
        }

        if ($item.parent('[data-submenu]').length) {
          $item.addClass('is-submenu-item ' + subItemClass);
        }
      });

      return;
    },
    Burn: function (menu, type) {
      var //items = menu.find('li'),
      subMenuClass = 'is-' + type + '-submenu',
          subItemClass = subMenuClass + '-item',
          hasSubClass = 'is-' + type + '-submenu-parent';

      menu.find('>li, .menu, .menu > li').removeClass(subMenuClass + ' ' + subItemClass + ' ' + hasSubClass + ' is-submenu-item submenu is-active').removeAttr('data-submenu').css('display', '');

      // console.log(      menu.find('.' + subMenuClass + ', .' + subItemClass + ', .has-submenu, .is-submenu-item, .submenu, [data-submenu]')
      //           .removeClass(subMenuClass + ' ' + subItemClass + ' has-submenu is-submenu-item submenu')
      //           .removeAttr('data-submenu'));
      // items.each(function(){
      //   var $item = $(this),
      //       $sub = $item.children('ul');
      //   if($item.parent('[data-submenu]').length){
      //     $item.removeClass('is-submenu-item ' + subItemClass);
      //   }
      //   if($sub.length){
      //     $item.removeClass('has-submenu');
      //     $sub.removeClass('submenu ' + subMenuClass).removeAttr('data-submenu');
      //   }
      // });
    }
  };

  Foundation.Nest = Nest;
}(jQuery);
;'use strict';

!function ($) {

  function Timer(elem, options, cb) {
    var _this = this,
        duration = options.duration,
        //options is an object for easily adding features later.
    nameSpace = Object.keys(elem.data())[0] || 'timer',
        remain = -1,
        start,
        timer;

    this.isPaused = false;

    this.restart = function () {
      remain = -1;
      clearTimeout(timer);
      this.start();
    };

    this.start = function () {
      this.isPaused = false;
      // if(!elem.data('paused')){ return false; }//maybe implement this sanity check if used for other things.
      clearTimeout(timer);
      remain = remain <= 0 ? duration : remain;
      elem.data('paused', false);
      start = Date.now();
      timer = setTimeout(function () {
        if (options.infinite) {
          _this.restart(); //rerun the timer.
        }
        if (cb && typeof cb === 'function') {
          cb();
        }
      }, remain);
      elem.trigger('timerstart.zf.' + nameSpace);
    };

    this.pause = function () {
      this.isPaused = true;
      //if(elem.data('paused')){ return false; }//maybe implement this sanity check if used for other things.
      clearTimeout(timer);
      elem.data('paused', true);
      var end = Date.now();
      remain = remain - (end - start);
      elem.trigger('timerpaused.zf.' + nameSpace);
    };
  }

  /**
   * Runs a callback function when images are fully loaded.
   * @param {Object} images - Image(s) to check if loaded.
   * @param {Func} callback - Function to execute when image is fully loaded.
   */
  function onImagesLoaded(images, callback) {
    var self = this,
        unloaded = images.length;

    if (unloaded === 0) {
      callback();
    }

    images.each(function () {
      // Check if image is loaded
      if (this.complete || this.readyState === 4 || this.readyState === 'complete') {
        singleImageLoaded();
      }
      // Force load the image
      else {
          // fix for IE. See https://css-tricks.com/snippets/jquery/fixing-load-in-ie-for-cached-images/
          var src = $(this).attr('src');
          $(this).attr('src', src + (src.indexOf('?') >= 0 ? '&' : '?') + new Date().getTime());
          $(this).one('load', function () {
            singleImageLoaded();
          });
        }
    });

    function singleImageLoaded() {
      unloaded--;
      if (unloaded === 0) {
        callback();
      }
    }
  }

  Foundation.Timer = Timer;
  Foundation.onImagesLoaded = onImagesLoaded;
}(jQuery);
;'use strict';

//**************************************************
//**Work inspired by multiple jquery swipe plugins**
//**Done by Yohai Ararat ***************************
//**************************************************
(function ($) {

	$.spotSwipe = {
		version: '1.0.0',
		enabled: 'ontouchstart' in document.documentElement,
		preventDefault: false,
		moveThreshold: 75,
		timeThreshold: 200
	};

	var startPosX,
	    startPosY,
	    startTime,
	    elapsedTime,
	    isMoving = false;

	function onTouchEnd() {
		//  alert(this);
		this.removeEventListener('touchmove', onTouchMove);
		this.removeEventListener('touchend', onTouchEnd);
		isMoving = false;
	}

	function onTouchMove(e) {
		if ($.spotSwipe.preventDefault) {
			e.preventDefault();
		}
		if (isMoving) {
			var x = e.touches[0].pageX;
			var y = e.touches[0].pageY;
			var dx = startPosX - x;
			var dy = startPosY - y;
			var dir;
			elapsedTime = new Date().getTime() - startTime;
			if (Math.abs(dx) >= $.spotSwipe.moveThreshold && elapsedTime <= $.spotSwipe.timeThreshold) {
				dir = dx > 0 ? 'left' : 'right';
			}
			// else if(Math.abs(dy) >= $.spotSwipe.moveThreshold && elapsedTime <= $.spotSwipe.timeThreshold) {
			//   dir = dy > 0 ? 'down' : 'up';
			// }
			if (dir) {
				e.preventDefault();
				onTouchEnd.call(this);
				$(this).trigger('swipe', dir).trigger('swipe' + dir);
			}
		}
	}

	function onTouchStart(e) {
		if (e.touches.length == 1) {
			startPosX = e.touches[0].pageX;
			startPosY = e.touches[0].pageY;
			isMoving = true;
			startTime = new Date().getTime();
			this.addEventListener('touchmove', onTouchMove, false);
			this.addEventListener('touchend', onTouchEnd, false);
		}
	}

	function init() {
		this.addEventListener && this.addEventListener('touchstart', onTouchStart, false);
	}

	function teardown() {
		this.removeEventListener('touchstart', onTouchStart);
	}

	$.event.special.swipe = { setup: init };

	$.each(['left', 'up', 'down', 'right'], function () {
		$.event.special['swipe' + this] = { setup: function () {
				$(this).on('swipe', $.noop);
			} };
	});
})(jQuery);
/****************************************************
 * Method for adding psuedo drag events to elements *
 ***************************************************/
!function ($) {
	$.fn.addTouch = function () {
		this.each(function (i, el) {
			$(el).bind('touchstart touchmove touchend touchcancel', function () {
				//we pass the original event object because the jQuery event
				//object is normalized to w3c specs and does not provide the TouchList
				handleTouch(event);
			});
		});

		var handleTouch = function (event) {
			var touches = event.changedTouches,
			    first = touches[0],
			    eventTypes = {
				touchstart: 'mousedown',
				touchmove: 'mousemove',
				touchend: 'mouseup'
			},
			    type = eventTypes[event.type],
			    simulatedEvent;

			if ('MouseEvent' in window && typeof window.MouseEvent === 'function') {
				simulatedEvent = new window.MouseEvent(type, {
					'bubbles': true,
					'cancelable': true,
					'screenX': first.screenX,
					'screenY': first.screenY,
					'clientX': first.clientX,
					'clientY': first.clientY
				});
			} else {
				simulatedEvent = document.createEvent('MouseEvent');
				simulatedEvent.initMouseEvent(type, true, true, window, 1, first.screenX, first.screenY, first.clientX, first.clientY, false, false, false, false, 0 /*left*/, null);
			}
			first.target.dispatchEvent(simulatedEvent);
		};
	};
}(jQuery);

//**********************************
//**From the jQuery Mobile Library**
//**need to recreate functionality**
//**and try to improve if possible**
//**********************************

/* Removing the jQuery function ****
************************************

(function( $, window, undefined ) {

	var $document = $( document ),
		// supportTouch = $.mobile.support.touch,
		touchStartEvent = 'touchstart'//supportTouch ? "touchstart" : "mousedown",
		touchStopEvent = 'touchend'//supportTouch ? "touchend" : "mouseup",
		touchMoveEvent = 'touchmove'//supportTouch ? "touchmove" : "mousemove";

	// setup new event shortcuts
	$.each( ( "touchstart touchmove touchend " +
		"swipe swipeleft swiperight" ).split( " " ), function( i, name ) {

		$.fn[ name ] = function( fn ) {
			return fn ? this.bind( name, fn ) : this.trigger( name );
		};

		// jQuery < 1.8
		if ( $.attrFn ) {
			$.attrFn[ name ] = true;
		}
	});

	function triggerCustomEvent( obj, eventType, event, bubble ) {
		var originalType = event.type;
		event.type = eventType;
		if ( bubble ) {
			$.event.trigger( event, undefined, obj );
		} else {
			$.event.dispatch.call( obj, event );
		}
		event.type = originalType;
	}

	// also handles taphold

	// Also handles swipeleft, swiperight
	$.event.special.swipe = {

		// More than this horizontal displacement, and we will suppress scrolling.
		scrollSupressionThreshold: 30,

		// More time than this, and it isn't a swipe.
		durationThreshold: 1000,

		// Swipe horizontal displacement must be more than this.
		horizontalDistanceThreshold: window.devicePixelRatio >= 2 ? 15 : 30,

		// Swipe vertical displacement must be less than this.
		verticalDistanceThreshold: window.devicePixelRatio >= 2 ? 15 : 30,

		getLocation: function ( event ) {
			var winPageX = window.pageXOffset,
				winPageY = window.pageYOffset,
				x = event.clientX,
				y = event.clientY;

			if ( event.pageY === 0 && Math.floor( y ) > Math.floor( event.pageY ) ||
				event.pageX === 0 && Math.floor( x ) > Math.floor( event.pageX ) ) {

				// iOS4 clientX/clientY have the value that should have been
				// in pageX/pageY. While pageX/page/ have the value 0
				x = x - winPageX;
				y = y - winPageY;
			} else if ( y < ( event.pageY - winPageY) || x < ( event.pageX - winPageX ) ) {

				// Some Android browsers have totally bogus values for clientX/Y
				// when scrolling/zooming a page. Detectable since clientX/clientY
				// should never be smaller than pageX/pageY minus page scroll
				x = event.pageX - winPageX;
				y = event.pageY - winPageY;
			}

			return {
				x: x,
				y: y
			};
		},

		start: function( event ) {
			var data = event.originalEvent.touches ?
					event.originalEvent.touches[ 0 ] : event,
				location = $.event.special.swipe.getLocation( data );
			return {
						time: ( new Date() ).getTime(),
						coords: [ location.x, location.y ],
						origin: $( event.target )
					};
		},

		stop: function( event ) {
			var data = event.originalEvent.touches ?
					event.originalEvent.touches[ 0 ] : event,
				location = $.event.special.swipe.getLocation( data );
			return {
						time: ( new Date() ).getTime(),
						coords: [ location.x, location.y ]
					};
		},

		handleSwipe: function( start, stop, thisObject, origTarget ) {
			if ( stop.time - start.time < $.event.special.swipe.durationThreshold &&
				Math.abs( start.coords[ 0 ] - stop.coords[ 0 ] ) > $.event.special.swipe.horizontalDistanceThreshold &&
				Math.abs( start.coords[ 1 ] - stop.coords[ 1 ] ) < $.event.special.swipe.verticalDistanceThreshold ) {
				var direction = start.coords[0] > stop.coords[ 0 ] ? "swipeleft" : "swiperight";

				triggerCustomEvent( thisObject, "swipe", $.Event( "swipe", { target: origTarget, swipestart: start, swipestop: stop }), true );
				triggerCustomEvent( thisObject, direction,$.Event( direction, { target: origTarget, swipestart: start, swipestop: stop } ), true );
				return true;
			}
			return false;

		},

		// This serves as a flag to ensure that at most one swipe event event is
		// in work at any given time
		eventInProgress: false,

		setup: function() {
			var events,
				thisObject = this,
				$this = $( thisObject ),
				context = {};

			// Retrieve the events data for this element and add the swipe context
			events = $.data( this, "mobile-events" );
			if ( !events ) {
				events = { length: 0 };
				$.data( this, "mobile-events", events );
			}
			events.length++;
			events.swipe = context;

			context.start = function( event ) {

				// Bail if we're already working on a swipe event
				if ( $.event.special.swipe.eventInProgress ) {
					return;
				}
				$.event.special.swipe.eventInProgress = true;

				var stop,
					start = $.event.special.swipe.start( event ),
					origTarget = event.target,
					emitted = false;

				context.move = function( event ) {
					if ( !start || event.isDefaultPrevented() ) {
						return;
					}

					stop = $.event.special.swipe.stop( event );
					if ( !emitted ) {
						emitted = $.event.special.swipe.handleSwipe( start, stop, thisObject, origTarget );
						if ( emitted ) {

							// Reset the context to make way for the next swipe event
							$.event.special.swipe.eventInProgress = false;
						}
					}
					// prevent scrolling
					if ( Math.abs( start.coords[ 0 ] - stop.coords[ 0 ] ) > $.event.special.swipe.scrollSupressionThreshold ) {
						event.preventDefault();
					}
				};

				context.stop = function() {
						emitted = true;

						// Reset the context to make way for the next swipe event
						$.event.special.swipe.eventInProgress = false;
						$document.off( touchMoveEvent, context.move );
						context.move = null;
				};

				$document.on( touchMoveEvent, context.move )
					.one( touchStopEvent, context.stop );
			};
			$this.on( touchStartEvent, context.start );
		},

		teardown: function() {
			var events, context;

			events = $.data( this, "mobile-events" );
			if ( events ) {
				context = events.swipe;
				delete events.swipe;
				events.length--;
				if ( events.length === 0 ) {
					$.removeData( this, "mobile-events" );
				}
			}

			if ( context ) {
				if ( context.start ) {
					$( this ).off( touchStartEvent, context.start );
				}
				if ( context.move ) {
					$document.off( touchMoveEvent, context.move );
				}
				if ( context.stop ) {
					$document.off( touchStopEvent, context.stop );
				}
			}
		}
	};
	$.each({
		swipeleft: "swipe.left",
		swiperight: "swipe.right"
	}, function( event, sourceEvent ) {

		$.event.special[ event ] = {
			setup: function() {
				$( this ).bind( sourceEvent, $.noop );
			},
			teardown: function() {
				$( this ).unbind( sourceEvent );
			}
		};
	});
})( jQuery, this );
*/
;'use strict';

!function ($) {

  var MutationObserver = function () {
    var prefixes = ['WebKit', 'Moz', 'O', 'Ms', ''];
    for (var i = 0; i < prefixes.length; i++) {
      if (prefixes[i] + 'MutationObserver' in window) {
        return window[prefixes[i] + 'MutationObserver'];
      }
    }
    return false;
  }();

  var triggers = function (el, type) {
    el.data(type).split(' ').forEach(function (id) {
      $('#' + id)[type === 'close' ? 'trigger' : 'triggerHandler'](type + '.zf.trigger', [el]);
    });
  };
  // Elements with [data-open] will reveal a plugin that supports it when clicked.
  $(document).on('click.zf.trigger', '[data-open]', function () {
    triggers($(this), 'open');
  });

  // Elements with [data-close] will close a plugin that supports it when clicked.
  // If used without a value on [data-close], the event will bubble, allowing it to close a parent component.
  $(document).on('click.zf.trigger', '[data-close]', function () {
    var id = $(this).data('close');
    if (id) {
      triggers($(this), 'close');
    } else {
      $(this).trigger('close.zf.trigger');
    }
  });

  // Elements with [data-toggle] will toggle a plugin that supports it when clicked.
  $(document).on('click.zf.trigger', '[data-toggle]', function () {
    var id = $(this).data('toggle');
    if (id) {
      triggers($(this), 'toggle');
    } else {
      $(this).trigger('toggle.zf.trigger');
    }
  });

  // Elements with [data-closable] will respond to close.zf.trigger events.
  $(document).on('close.zf.trigger', '[data-closable]', function (e) {
    e.stopPropagation();
    var animation = $(this).data('closable');

    if (animation !== '') {
      Foundation.Motion.animateOut($(this), animation, function () {
        $(this).trigger('closed.zf');
      });
    } else {
      $(this).fadeOut().trigger('closed.zf');
    }
  });

  $(document).on('focus.zf.trigger blur.zf.trigger', '[data-toggle-focus]', function () {
    var id = $(this).data('toggle-focus');
    $('#' + id).triggerHandler('toggle.zf.trigger', [$(this)]);
  });

  /**
  * Fires once after all other scripts have loaded
  * @function
  * @private
  */
  $(window).on('load', function () {
    checkListeners();
  });

  function checkListeners() {
    eventsListener();
    resizeListener();
    scrollListener();
    closemeListener();
  }

  //******** only fires this function once on load, if there's something to watch ********
  function closemeListener(pluginName) {
    var yetiBoxes = $('[data-yeti-box]'),
        plugNames = ['dropdown', 'tooltip', 'reveal'];

    if (pluginName) {
      if (typeof pluginName === 'string') {
        plugNames.push(pluginName);
      } else if (typeof pluginName === 'object' && typeof pluginName[0] === 'string') {
        plugNames.concat(pluginName);
      } else {
        console.error('Plugin names must be strings');
      }
    }
    if (yetiBoxes.length) {
      var listeners = plugNames.map(function (name) {
        return 'closeme.zf.' + name;
      }).join(' ');

      $(window).off(listeners).on(listeners, function (e, pluginId) {
        var plugin = e.namespace.split('.')[0];
        var plugins = $('[data-' + plugin + ']').not('[data-yeti-box="' + pluginId + '"]');

        plugins.each(function () {
          var _this = $(this);

          _this.triggerHandler('close.zf.trigger', [_this]);
        });
      });
    }
  }

  function resizeListener(debounce) {
    var timer = void 0,
        $nodes = $('[data-resize]');
    if ($nodes.length) {
      $(window).off('resize.zf.trigger').on('resize.zf.trigger', function (e) {
        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(function () {

          if (!MutationObserver) {
            //fallback for IE 9
            $nodes.each(function () {
              $(this).triggerHandler('resizeme.zf.trigger');
            });
          }
          //trigger all listening elements and signal a resize event
          $nodes.attr('data-events', "resize");
        }, debounce || 10); //default time to emit resize event
      });
    }
  }

  function scrollListener(debounce) {
    var timer = void 0,
        $nodes = $('[data-scroll]');
    if ($nodes.length) {
      $(window).off('scroll.zf.trigger').on('scroll.zf.trigger', function (e) {
        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(function () {

          if (!MutationObserver) {
            //fallback for IE 9
            $nodes.each(function () {
              $(this).triggerHandler('scrollme.zf.trigger');
            });
          }
          //trigger all listening elements and signal a scroll event
          $nodes.attr('data-events', "scroll");
        }, debounce || 10); //default time to emit scroll event
      });
    }
  }

  function eventsListener() {
    if (!MutationObserver) {
      return false;
    }
    var nodes = document.querySelectorAll('[data-resize], [data-scroll], [data-mutate]');

    //element callback
    var listeningElementsMutation = function (mutationRecordsList) {
      var $target = $(mutationRecordsList[0].target);

      //trigger the event handler for the element depending on type
      switch (mutationRecordsList[0].type) {

        case "attributes":
          if ($target.attr("data-events") === "scroll" && mutationRecordsList[0].attributeName === "data-events") {
            $target.triggerHandler('scrollme.zf.trigger', [$target, window.pageYOffset]);
          }
          if ($target.attr("data-events") === "resize" && mutationRecordsList[0].attributeName === "data-events") {
            $target.triggerHandler('resizeme.zf.trigger', [$target]);
          }
          if (mutationRecordsList[0].attributeName === "style") {
            $target.closest("[data-mutate]").attr("data-events", "mutate");
            $target.closest("[data-mutate]").triggerHandler('mutateme.zf.trigger', [$target.closest("[data-mutate]")]);
          }
          break;

        case "childList":
          $target.closest("[data-mutate]").attr("data-events", "mutate");
          $target.closest("[data-mutate]").triggerHandler('mutateme.zf.trigger', [$target.closest("[data-mutate]")]);
          break;

        default:
          return false;
        //nothing
      }
    };

    if (nodes.length) {
      //for each element that needs to listen for resizing, scrolling, or mutation add a single observer
      for (var i = 0; i <= nodes.length - 1; i++) {
        var elementObserver = new MutationObserver(listeningElementsMutation);
        elementObserver.observe(nodes[i], { attributes: true, childList: true, characterData: false, subtree: true, attributeFilter: ["data-events", "style"] });
      }
    }
  }

  // ------------------------------------

  // [PH]
  // Foundation.CheckWatchers = checkWatchers;
  Foundation.IHearYou = checkListeners;
  // Foundation.ISeeYou = scrollListener;
  // Foundation.IFeelYou = closemeListener;
}(jQuery);
;'use strict';

/*
     _ _      _       _
 ___| (_) ___| | __  (_)___
/ __| | |/ __| |/ /  | / __|
\__ \ | | (__|   < _ | \__ \
|___/_|_|\___|_|\_(_)/ |___/
                   |__/

 Version: 1.8.1
  Author: Ken Wheeler
 Website: http://kenwheeler.github.io
    Docs: http://kenwheeler.github.io/slick
    Repo: http://github.com/kenwheeler/slick
  Issues: http://github.com/kenwheeler/slick/issues

 */
/* global window, document, define, jQuery, setInterval, clearInterval */
;(function (factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else if (typeof exports !== 'undefined') {
        module.exports = factory(require('jquery'));
    } else {
        factory(jQuery);
    }
})(function ($) {
    'use strict';

    var Slick = window.Slick || {};

    Slick = function () {

        var instanceUid = 0;

        function Slick(element, settings) {

            var _ = this,
                dataSettings;

            _.defaults = {
                accessibility: true,
                adaptiveHeight: false,
                appendArrows: $(element),
                appendDots: $(element),
                arrows: true,
                asNavFor: null,
                prevArrow: '<button class="slick-prev" aria-label="Previous" type="button">Previous</button>',
                nextArrow: '<button class="slick-next" aria-label="Next" type="button">Next</button>',
                autoplay: false,
                autoplaySpeed: 3000,
                centerMode: false,
                centerPadding: '50px',
                cssEase: 'ease',
                customPaging: function (slider, i) {
                    return $('<button type="button" />').text(i + 1);
                },
                dots: false,
                dotsClass: 'slick-dots',
                draggable: true,
                easing: 'linear',
                edgeFriction: 0.35,
                fade: false,
                focusOnSelect: false,
                focusOnChange: false,
                infinite: true,
                initialSlide: 0,
                lazyLoad: 'ondemand',
                mobileFirst: false,
                pauseOnHover: true,
                pauseOnFocus: true,
                pauseOnDotsHover: false,
                respondTo: 'window',
                responsive: null,
                rows: 1,
                rtl: false,
                slide: '',
                slidesPerRow: 1,
                slidesToShow: 1,
                slidesToScroll: 1,
                speed: 500,
                swipe: true,
                swipeToSlide: false,
                touchMove: true,
                touchThreshold: 5,
                useCSS: true,
                useTransform: true,
                variableWidth: false,
                vertical: false,
                verticalSwiping: false,
                waitForAnimate: true,
                zIndex: 1000
            };

            _.initials = {
                animating: false,
                dragging: false,
                autoPlayTimer: null,
                currentDirection: 0,
                currentLeft: null,
                currentSlide: 0,
                direction: 1,
                $dots: null,
                listWidth: null,
                listHeight: null,
                loadIndex: 0,
                $nextArrow: null,
                $prevArrow: null,
                scrolling: false,
                slideCount: null,
                slideWidth: null,
                $slideTrack: null,
                $slides: null,
                sliding: false,
                slideOffset: 0,
                swipeLeft: null,
                swiping: false,
                $list: null,
                touchObject: {},
                transformsEnabled: false,
                unslicked: false
            };

            $.extend(_, _.initials);

            _.activeBreakpoint = null;
            _.animType = null;
            _.animProp = null;
            _.breakpoints = [];
            _.breakpointSettings = [];
            _.cssTransitions = false;
            _.focussed = false;
            _.interrupted = false;
            _.hidden = 'hidden';
            _.paused = true;
            _.positionProp = null;
            _.respondTo = null;
            _.rowCount = 1;
            _.shouldClick = true;
            _.$slider = $(element);
            _.$slidesCache = null;
            _.transformType = null;
            _.transitionType = null;
            _.visibilityChange = 'visibilitychange';
            _.windowWidth = 0;
            _.windowTimer = null;

            dataSettings = $(element).data('slick') || {};

            _.options = $.extend({}, _.defaults, settings, dataSettings);

            _.currentSlide = _.options.initialSlide;

            _.originalSettings = _.options;

            if (typeof document.mozHidden !== 'undefined') {
                _.hidden = 'mozHidden';
                _.visibilityChange = 'mozvisibilitychange';
            } else if (typeof document.webkitHidden !== 'undefined') {
                _.hidden = 'webkitHidden';
                _.visibilityChange = 'webkitvisibilitychange';
            }

            _.autoPlay = $.proxy(_.autoPlay, _);
            _.autoPlayClear = $.proxy(_.autoPlayClear, _);
            _.autoPlayIterator = $.proxy(_.autoPlayIterator, _);
            _.changeSlide = $.proxy(_.changeSlide, _);
            _.clickHandler = $.proxy(_.clickHandler, _);
            _.selectHandler = $.proxy(_.selectHandler, _);
            _.setPosition = $.proxy(_.setPosition, _);
            _.swipeHandler = $.proxy(_.swipeHandler, _);
            _.dragHandler = $.proxy(_.dragHandler, _);
            _.keyHandler = $.proxy(_.keyHandler, _);

            _.instanceUid = instanceUid++;

            // A simple way to check for HTML strings
            // Strict HTML recognition (must start with <)
            // Extracted from jQuery v1.11 source
            _.htmlExpr = /^(?:\s*(<[\w\W]+>)[^>]*)$/;

            _.registerBreakpoints();
            _.init(true);
        }

        return Slick;
    }();

    Slick.prototype.activateADA = function () {
        var _ = this;

        _.$slideTrack.find('.slick-active').attr({
            'aria-hidden': 'false'
        }).find('a, input, button, select').attr({
            'tabindex': '0'
        });
    };

    Slick.prototype.addSlide = Slick.prototype.slickAdd = function (markup, index, addBefore) {

        var _ = this;

        if (typeof index === 'boolean') {
            addBefore = index;
            index = null;
        } else if (index < 0 || index >= _.slideCount) {
            return false;
        }

        _.unload();

        if (typeof index === 'number') {
            if (index === 0 && _.$slides.length === 0) {
                $(markup).appendTo(_.$slideTrack);
            } else if (addBefore) {
                $(markup).insertBefore(_.$slides.eq(index));
            } else {
                $(markup).insertAfter(_.$slides.eq(index));
            }
        } else {
            if (addBefore === true) {
                $(markup).prependTo(_.$slideTrack);
            } else {
                $(markup).appendTo(_.$slideTrack);
            }
        }

        _.$slides = _.$slideTrack.children(this.options.slide);

        _.$slideTrack.children(this.options.slide).detach();

        _.$slideTrack.append(_.$slides);

        _.$slides.each(function (index, element) {
            $(element).attr('data-slick-index', index);
        });

        _.$slidesCache = _.$slides;

        _.reinit();
    };

    Slick.prototype.animateHeight = function () {
        var _ = this;
        if (_.options.slidesToShow === 1 && _.options.adaptiveHeight === true && _.options.vertical === false) {
            var targetHeight = _.$slides.eq(_.currentSlide).outerHeight(true);
            _.$list.animate({
                height: targetHeight
            }, _.options.speed);
        }
    };

    Slick.prototype.animateSlide = function (targetLeft, callback) {

        var animProps = {},
            _ = this;

        _.animateHeight();

        if (_.options.rtl === true && _.options.vertical === false) {
            targetLeft = -targetLeft;
        }
        if (_.transformsEnabled === false) {
            if (_.options.vertical === false) {
                _.$slideTrack.animate({
                    left: targetLeft
                }, _.options.speed, _.options.easing, callback);
            } else {
                _.$slideTrack.animate({
                    top: targetLeft
                }, _.options.speed, _.options.easing, callback);
            }
        } else {

            if (_.cssTransitions === false) {
                if (_.options.rtl === true) {
                    _.currentLeft = -_.currentLeft;
                }
                $({
                    animStart: _.currentLeft
                }).animate({
                    animStart: targetLeft
                }, {
                    duration: _.options.speed,
                    easing: _.options.easing,
                    step: function (now) {
                        now = Math.ceil(now);
                        if (_.options.vertical === false) {
                            animProps[_.animType] = 'translate(' + now + 'px, 0px)';
                            _.$slideTrack.css(animProps);
                        } else {
                            animProps[_.animType] = 'translate(0px,' + now + 'px)';
                            _.$slideTrack.css(animProps);
                        }
                    },
                    complete: function () {
                        if (callback) {
                            callback.call();
                        }
                    }
                });
            } else {

                _.applyTransition();
                targetLeft = Math.ceil(targetLeft);

                if (_.options.vertical === false) {
                    animProps[_.animType] = 'translate3d(' + targetLeft + 'px, 0px, 0px)';
                } else {
                    animProps[_.animType] = 'translate3d(0px,' + targetLeft + 'px, 0px)';
                }
                _.$slideTrack.css(animProps);

                if (callback) {
                    setTimeout(function () {

                        _.disableTransition();

                        callback.call();
                    }, _.options.speed);
                }
            }
        }
    };

    Slick.prototype.getNavTarget = function () {

        var _ = this,
            asNavFor = _.options.asNavFor;

        if (asNavFor && asNavFor !== null) {
            asNavFor = $(asNavFor).not(_.$slider);
        }

        return asNavFor;
    };

    Slick.prototype.asNavFor = function (index) {

        var _ = this,
            asNavFor = _.getNavTarget();

        if (asNavFor !== null && typeof asNavFor === 'object') {
            asNavFor.each(function () {
                var target = $(this).slick('getSlick');
                if (!target.unslicked) {
                    target.slideHandler(index, true);
                }
            });
        }
    };

    Slick.prototype.applyTransition = function (slide) {

        var _ = this,
            transition = {};

        if (_.options.fade === false) {
            transition[_.transitionType] = _.transformType + ' ' + _.options.speed + 'ms ' + _.options.cssEase;
        } else {
            transition[_.transitionType] = 'opacity ' + _.options.speed + 'ms ' + _.options.cssEase;
        }

        if (_.options.fade === false) {
            _.$slideTrack.css(transition);
        } else {
            _.$slides.eq(slide).css(transition);
        }
    };

    Slick.prototype.autoPlay = function () {

        var _ = this;

        _.autoPlayClear();

        if (_.slideCount > _.options.slidesToShow) {
            _.autoPlayTimer = setInterval(_.autoPlayIterator, _.options.autoplaySpeed);
        }
    };

    Slick.prototype.autoPlayClear = function () {

        var _ = this;

        if (_.autoPlayTimer) {
            clearInterval(_.autoPlayTimer);
        }
    };

    Slick.prototype.autoPlayIterator = function () {

        var _ = this,
            slideTo = _.currentSlide + _.options.slidesToScroll;

        if (!_.paused && !_.interrupted && !_.focussed) {

            if (_.options.infinite === false) {

                if (_.direction === 1 && _.currentSlide + 1 === _.slideCount - 1) {
                    _.direction = 0;
                } else if (_.direction === 0) {

                    slideTo = _.currentSlide - _.options.slidesToScroll;

                    if (_.currentSlide - 1 === 0) {
                        _.direction = 1;
                    }
                }
            }

            _.slideHandler(slideTo);
        }
    };

    Slick.prototype.buildArrows = function () {

        var _ = this;

        if (_.options.arrows === true) {

            _.$prevArrow = $(_.options.prevArrow).addClass('slick-arrow');
            _.$nextArrow = $(_.options.nextArrow).addClass('slick-arrow');

            if (_.slideCount > _.options.slidesToShow) {

                _.$prevArrow.removeClass('slick-hidden').removeAttr('aria-hidden tabindex');
                _.$nextArrow.removeClass('slick-hidden').removeAttr('aria-hidden tabindex');

                if (_.htmlExpr.test(_.options.prevArrow)) {
                    _.$prevArrow.prependTo(_.options.appendArrows);
                }

                if (_.htmlExpr.test(_.options.nextArrow)) {
                    _.$nextArrow.appendTo(_.options.appendArrows);
                }

                if (_.options.infinite !== true) {
                    _.$prevArrow.addClass('slick-disabled').attr('aria-disabled', 'true');
                }
            } else {

                _.$prevArrow.add(_.$nextArrow).addClass('slick-hidden').attr({
                    'aria-disabled': 'true',
                    'tabindex': '-1'
                });
            }
        }
    };

    Slick.prototype.buildDots = function () {

        var _ = this,
            i,
            dot;

        if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {

            _.$slider.addClass('slick-dotted');

            dot = $('<ul />').addClass(_.options.dotsClass);

            for (i = 0; i <= _.getDotCount(); i += 1) {
                dot.append($('<li />').append(_.options.customPaging.call(this, _, i)));
            }

            _.$dots = dot.appendTo(_.options.appendDots);

            _.$dots.find('li').first().addClass('slick-active');
        }
    };

    Slick.prototype.buildOut = function () {

        var _ = this;

        _.$slides = _.$slider.children(_.options.slide + ':not(.slick-cloned)').addClass('slick-slide');

        _.slideCount = _.$slides.length;

        _.$slides.each(function (index, element) {
            $(element).attr('data-slick-index', index).data('originalStyling', $(element).attr('style') || '');
        });

        _.$slider.addClass('slick-slider');

        _.$slideTrack = _.slideCount === 0 ? $('<div class="slick-track"/>').appendTo(_.$slider) : _.$slides.wrapAll('<div class="slick-track"/>').parent();

        _.$list = _.$slideTrack.wrap('<div class="slick-list"/>').parent();
        _.$slideTrack.css('opacity', 0);

        if (_.options.centerMode === true || _.options.swipeToSlide === true) {
            _.options.slidesToScroll = 1;
        }

        $('img[data-lazy]', _.$slider).not('[src]').addClass('slick-loading');

        _.setupInfinite();

        _.buildArrows();

        _.buildDots();

        _.updateDots();

        _.setSlideClasses(typeof _.currentSlide === 'number' ? _.currentSlide : 0);

        if (_.options.draggable === true) {
            _.$list.addClass('draggable');
        }
    };

    Slick.prototype.buildRows = function () {

        var _ = this,
            a,
            b,
            c,
            newSlides,
            numOfSlides,
            originalSlides,
            slidesPerSection;

        newSlides = document.createDocumentFragment();
        originalSlides = _.$slider.children();

        if (_.options.rows > 0) {

            slidesPerSection = _.options.slidesPerRow * _.options.rows;
            numOfSlides = Math.ceil(originalSlides.length / slidesPerSection);

            for (a = 0; a < numOfSlides; a++) {
                var slide = document.createElement('div');
                for (b = 0; b < _.options.rows; b++) {
                    var row = document.createElement('div');
                    for (c = 0; c < _.options.slidesPerRow; c++) {
                        var target = a * slidesPerSection + (b * _.options.slidesPerRow + c);
                        if (originalSlides.get(target)) {
                            row.appendChild(originalSlides.get(target));
                        }
                    }
                    slide.appendChild(row);
                }
                newSlides.appendChild(slide);
            }

            _.$slider.empty().append(newSlides);
            _.$slider.children().children().children().css({
                'width': 100 / _.options.slidesPerRow + '%',
                'display': 'inline-block'
            });
        }
    };

    Slick.prototype.checkResponsive = function (initial, forceUpdate) {

        var _ = this,
            breakpoint,
            targetBreakpoint,
            respondToWidth,
            triggerBreakpoint = false;
        var sliderWidth = _.$slider.width();
        var windowWidth = window.innerWidth || $(window).width();

        if (_.respondTo === 'window') {
            respondToWidth = windowWidth;
        } else if (_.respondTo === 'slider') {
            respondToWidth = sliderWidth;
        } else if (_.respondTo === 'min') {
            respondToWidth = Math.min(windowWidth, sliderWidth);
        }

        if (_.options.responsive && _.options.responsive.length && _.options.responsive !== null) {

            targetBreakpoint = null;

            for (breakpoint in _.breakpoints) {
                if (_.breakpoints.hasOwnProperty(breakpoint)) {
                    if (_.originalSettings.mobileFirst === false) {
                        if (respondToWidth < _.breakpoints[breakpoint]) {
                            targetBreakpoint = _.breakpoints[breakpoint];
                        }
                    } else {
                        if (respondToWidth > _.breakpoints[breakpoint]) {
                            targetBreakpoint = _.breakpoints[breakpoint];
                        }
                    }
                }
            }

            if (targetBreakpoint !== null) {
                if (_.activeBreakpoint !== null) {
                    if (targetBreakpoint !== _.activeBreakpoint || forceUpdate) {
                        _.activeBreakpoint = targetBreakpoint;
                        if (_.breakpointSettings[targetBreakpoint] === 'unslick') {
                            _.unslick(targetBreakpoint);
                        } else {
                            _.options = $.extend({}, _.originalSettings, _.breakpointSettings[targetBreakpoint]);
                            if (initial === true) {
                                _.currentSlide = _.options.initialSlide;
                            }
                            _.refresh(initial);
                        }
                        triggerBreakpoint = targetBreakpoint;
                    }
                } else {
                    _.activeBreakpoint = targetBreakpoint;
                    if (_.breakpointSettings[targetBreakpoint] === 'unslick') {
                        _.unslick(targetBreakpoint);
                    } else {
                        _.options = $.extend({}, _.originalSettings, _.breakpointSettings[targetBreakpoint]);
                        if (initial === true) {
                            _.currentSlide = _.options.initialSlide;
                        }
                        _.refresh(initial);
                    }
                    triggerBreakpoint = targetBreakpoint;
                }
            } else {
                if (_.activeBreakpoint !== null) {
                    _.activeBreakpoint = null;
                    _.options = _.originalSettings;
                    if (initial === true) {
                        _.currentSlide = _.options.initialSlide;
                    }
                    _.refresh(initial);
                    triggerBreakpoint = targetBreakpoint;
                }
            }

            // only trigger breakpoints during an actual break. not on initialize.
            if (!initial && triggerBreakpoint !== false) {
                _.$slider.trigger('breakpoint', [_, triggerBreakpoint]);
            }
        }
    };

    Slick.prototype.changeSlide = function (event, dontAnimate) {

        var _ = this,
            $target = $(event.currentTarget),
            indexOffset,
            slideOffset,
            unevenOffset;

        // If target is a link, prevent default action.
        if ($target.is('a')) {
            event.preventDefault();
        }

        // If target is not the <li> element (ie: a child), find the <li>.
        if (!$target.is('li')) {
            $target = $target.closest('li');
        }

        unevenOffset = _.slideCount % _.options.slidesToScroll !== 0;
        indexOffset = unevenOffset ? 0 : (_.slideCount - _.currentSlide) % _.options.slidesToScroll;

        switch (event.data.message) {

            case 'previous':
                slideOffset = indexOffset === 0 ? _.options.slidesToScroll : _.options.slidesToShow - indexOffset;
                if (_.slideCount > _.options.slidesToShow) {
                    _.slideHandler(_.currentSlide - slideOffset, false, dontAnimate);
                }
                break;

            case 'next':
                slideOffset = indexOffset === 0 ? _.options.slidesToScroll : indexOffset;
                if (_.slideCount > _.options.slidesToShow) {
                    _.slideHandler(_.currentSlide + slideOffset, false, dontAnimate);
                }
                break;

            case 'index':
                var index = event.data.index === 0 ? 0 : event.data.index || $target.index() * _.options.slidesToScroll;

                _.slideHandler(_.checkNavigable(index), false, dontAnimate);
                $target.children().trigger('focus');
                break;

            default:
                return;
        }
    };

    Slick.prototype.checkNavigable = function (index) {

        var _ = this,
            navigables,
            prevNavigable;

        navigables = _.getNavigableIndexes();
        prevNavigable = 0;
        if (index > navigables[navigables.length - 1]) {
            index = navigables[navigables.length - 1];
        } else {
            for (var n in navigables) {
                if (index < navigables[n]) {
                    index = prevNavigable;
                    break;
                }
                prevNavigable = navigables[n];
            }
        }

        return index;
    };

    Slick.prototype.cleanUpEvents = function () {

        var _ = this;

        if (_.options.dots && _.$dots !== null) {

            $('li', _.$dots).off('click.slick', _.changeSlide).off('mouseenter.slick', $.proxy(_.interrupt, _, true)).off('mouseleave.slick', $.proxy(_.interrupt, _, false));

            if (_.options.accessibility === true) {
                _.$dots.off('keydown.slick', _.keyHandler);
            }
        }

        _.$slider.off('focus.slick blur.slick');

        if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {
            _.$prevArrow && _.$prevArrow.off('click.slick', _.changeSlide);
            _.$nextArrow && _.$nextArrow.off('click.slick', _.changeSlide);

            if (_.options.accessibility === true) {
                _.$prevArrow && _.$prevArrow.off('keydown.slick', _.keyHandler);
                _.$nextArrow && _.$nextArrow.off('keydown.slick', _.keyHandler);
            }
        }

        _.$list.off('touchstart.slick mousedown.slick', _.swipeHandler);
        _.$list.off('touchmove.slick mousemove.slick', _.swipeHandler);
        _.$list.off('touchend.slick mouseup.slick', _.swipeHandler);
        _.$list.off('touchcancel.slick mouseleave.slick', _.swipeHandler);

        _.$list.off('click.slick', _.clickHandler);

        $(document).off(_.visibilityChange, _.visibility);

        _.cleanUpSlideEvents();

        if (_.options.accessibility === true) {
            _.$list.off('keydown.slick', _.keyHandler);
        }

        if (_.options.focusOnSelect === true) {
            $(_.$slideTrack).children().off('click.slick', _.selectHandler);
        }

        $(window).off('orientationchange.slick.slick-' + _.instanceUid, _.orientationChange);

        $(window).off('resize.slick.slick-' + _.instanceUid, _.resize);

        $('[draggable!=true]', _.$slideTrack).off('dragstart', _.preventDefault);

        $(window).off('load.slick.slick-' + _.instanceUid, _.setPosition);
    };

    Slick.prototype.cleanUpSlideEvents = function () {

        var _ = this;

        _.$list.off('mouseenter.slick', $.proxy(_.interrupt, _, true));
        _.$list.off('mouseleave.slick', $.proxy(_.interrupt, _, false));
    };

    Slick.prototype.cleanUpRows = function () {

        var _ = this,
            originalSlides;

        if (_.options.rows > 0) {
            originalSlides = _.$slides.children().children();
            originalSlides.removeAttr('style');
            _.$slider.empty().append(originalSlides);
        }
    };

    Slick.prototype.clickHandler = function (event) {

        var _ = this;

        if (_.shouldClick === false) {
            event.stopImmediatePropagation();
            event.stopPropagation();
            event.preventDefault();
        }
    };

    Slick.prototype.destroy = function (refresh) {

        var _ = this;

        _.autoPlayClear();

        _.touchObject = {};

        _.cleanUpEvents();

        $('.slick-cloned', _.$slider).detach();

        if (_.$dots) {
            _.$dots.remove();
        }

        if (_.$prevArrow && _.$prevArrow.length) {

            _.$prevArrow.removeClass('slick-disabled slick-arrow slick-hidden').removeAttr('aria-hidden aria-disabled tabindex').css('display', '');

            if (_.htmlExpr.test(_.options.prevArrow)) {
                _.$prevArrow.remove();
            }
        }

        if (_.$nextArrow && _.$nextArrow.length) {

            _.$nextArrow.removeClass('slick-disabled slick-arrow slick-hidden').removeAttr('aria-hidden aria-disabled tabindex').css('display', '');

            if (_.htmlExpr.test(_.options.nextArrow)) {
                _.$nextArrow.remove();
            }
        }

        if (_.$slides) {

            _.$slides.removeClass('slick-slide slick-active slick-center slick-visible slick-current').removeAttr('aria-hidden').removeAttr('data-slick-index').each(function () {
                $(this).attr('style', $(this).data('originalStyling'));
            });

            _.$slideTrack.children(this.options.slide).detach();

            _.$slideTrack.detach();

            _.$list.detach();

            _.$slider.append(_.$slides);
        }

        _.cleanUpRows();

        _.$slider.removeClass('slick-slider');
        _.$slider.removeClass('slick-initialized');
        _.$slider.removeClass('slick-dotted');

        _.unslicked = true;

        if (!refresh) {
            _.$slider.trigger('destroy', [_]);
        }
    };

    Slick.prototype.disableTransition = function (slide) {

        var _ = this,
            transition = {};

        transition[_.transitionType] = '';

        if (_.options.fade === false) {
            _.$slideTrack.css(transition);
        } else {
            _.$slides.eq(slide).css(transition);
        }
    };

    Slick.prototype.fadeSlide = function (slideIndex, callback) {

        var _ = this;

        if (_.cssTransitions === false) {

            _.$slides.eq(slideIndex).css({
                zIndex: _.options.zIndex
            });

            _.$slides.eq(slideIndex).animate({
                opacity: 1
            }, _.options.speed, _.options.easing, callback);
        } else {

            _.applyTransition(slideIndex);

            _.$slides.eq(slideIndex).css({
                opacity: 1,
                zIndex: _.options.zIndex
            });

            if (callback) {
                setTimeout(function () {

                    _.disableTransition(slideIndex);

                    callback.call();
                }, _.options.speed);
            }
        }
    };

    Slick.prototype.fadeSlideOut = function (slideIndex) {

        var _ = this;

        if (_.cssTransitions === false) {

            _.$slides.eq(slideIndex).animate({
                opacity: 0,
                zIndex: _.options.zIndex - 2
            }, _.options.speed, _.options.easing);
        } else {

            _.applyTransition(slideIndex);

            _.$slides.eq(slideIndex).css({
                opacity: 0,
                zIndex: _.options.zIndex - 2
            });
        }
    };

    Slick.prototype.filterSlides = Slick.prototype.slickFilter = function (filter) {

        var _ = this;

        if (filter !== null) {

            _.$slidesCache = _.$slides;

            _.unload();

            _.$slideTrack.children(this.options.slide).detach();

            _.$slidesCache.filter(filter).appendTo(_.$slideTrack);

            _.reinit();
        }
    };

    Slick.prototype.focusHandler = function () {

        var _ = this;

        _.$slider.off('focus.slick blur.slick').on('focus.slick blur.slick', '*', function (event) {

            event.stopImmediatePropagation();
            var $sf = $(this);

            setTimeout(function () {

                if (_.options.pauseOnFocus) {
                    _.focussed = $sf.is(':focus');
                    _.autoPlay();
                }
            }, 0);
        });
    };

    Slick.prototype.getCurrent = Slick.prototype.slickCurrentSlide = function () {

        var _ = this;
        return _.currentSlide;
    };

    Slick.prototype.getDotCount = function () {

        var _ = this;

        var breakPoint = 0;
        var counter = 0;
        var pagerQty = 0;

        if (_.options.infinite === true) {
            if (_.slideCount <= _.options.slidesToShow) {
                ++pagerQty;
            } else {
                while (breakPoint < _.slideCount) {
                    ++pagerQty;
                    breakPoint = counter + _.options.slidesToScroll;
                    counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow;
                }
            }
        } else if (_.options.centerMode === true) {
            pagerQty = _.slideCount;
        } else if (!_.options.asNavFor) {
            pagerQty = 1 + Math.ceil((_.slideCount - _.options.slidesToShow) / _.options.slidesToScroll);
        } else {
            while (breakPoint < _.slideCount) {
                ++pagerQty;
                breakPoint = counter + _.options.slidesToScroll;
                counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow;
            }
        }

        return pagerQty - 1;
    };

    Slick.prototype.getLeft = function (slideIndex) {

        var _ = this,
            targetLeft,
            verticalHeight,
            verticalOffset = 0,
            targetSlide,
            coef;

        _.slideOffset = 0;
        verticalHeight = _.$slides.first().outerHeight(true);

        if (_.options.infinite === true) {
            if (_.slideCount > _.options.slidesToShow) {
                _.slideOffset = _.slideWidth * _.options.slidesToShow * -1;
                coef = -1;

                if (_.options.vertical === true && _.options.centerMode === true) {
                    if (_.options.slidesToShow === 2) {
                        coef = -1.5;
                    } else if (_.options.slidesToShow === 1) {
                        coef = -2;
                    }
                }
                verticalOffset = verticalHeight * _.options.slidesToShow * coef;
            }
            if (_.slideCount % _.options.slidesToScroll !== 0) {
                if (slideIndex + _.options.slidesToScroll > _.slideCount && _.slideCount > _.options.slidesToShow) {
                    if (slideIndex > _.slideCount) {
                        _.slideOffset = (_.options.slidesToShow - (slideIndex - _.slideCount)) * _.slideWidth * -1;
                        verticalOffset = (_.options.slidesToShow - (slideIndex - _.slideCount)) * verticalHeight * -1;
                    } else {
                        _.slideOffset = _.slideCount % _.options.slidesToScroll * _.slideWidth * -1;
                        verticalOffset = _.slideCount % _.options.slidesToScroll * verticalHeight * -1;
                    }
                }
            }
        } else {
            if (slideIndex + _.options.slidesToShow > _.slideCount) {
                _.slideOffset = (slideIndex + _.options.slidesToShow - _.slideCount) * _.slideWidth;
                verticalOffset = (slideIndex + _.options.slidesToShow - _.slideCount) * verticalHeight;
            }
        }

        if (_.slideCount <= _.options.slidesToShow) {
            _.slideOffset = 0;
            verticalOffset = 0;
        }

        if (_.options.centerMode === true && _.slideCount <= _.options.slidesToShow) {
            _.slideOffset = _.slideWidth * Math.floor(_.options.slidesToShow) / 2 - _.slideWidth * _.slideCount / 2;
        } else if (_.options.centerMode === true && _.options.infinite === true) {
            _.slideOffset += _.slideWidth * Math.floor(_.options.slidesToShow / 2) - _.slideWidth;
        } else if (_.options.centerMode === true) {
            _.slideOffset = 0;
            _.slideOffset += _.slideWidth * Math.floor(_.options.slidesToShow / 2);
        }

        if (_.options.vertical === false) {
            targetLeft = slideIndex * _.slideWidth * -1 + _.slideOffset;
        } else {
            targetLeft = slideIndex * verticalHeight * -1 + verticalOffset;
        }

        if (_.options.variableWidth === true) {

            if (_.slideCount <= _.options.slidesToShow || _.options.infinite === false) {
                targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex);
            } else {
                targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex + _.options.slidesToShow);
            }

            if (_.options.rtl === true) {
                if (targetSlide[0]) {
                    targetLeft = (_.$slideTrack.width() - targetSlide[0].offsetLeft - targetSlide.width()) * -1;
                } else {
                    targetLeft = 0;
                }
            } else {
                targetLeft = targetSlide[0] ? targetSlide[0].offsetLeft * -1 : 0;
            }

            if (_.options.centerMode === true) {
                if (_.slideCount <= _.options.slidesToShow || _.options.infinite === false) {
                    targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex);
                } else {
                    targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex + _.options.slidesToShow + 1);
                }

                if (_.options.rtl === true) {
                    if (targetSlide[0]) {
                        targetLeft = (_.$slideTrack.width() - targetSlide[0].offsetLeft - targetSlide.width()) * -1;
                    } else {
                        targetLeft = 0;
                    }
                } else {
                    targetLeft = targetSlide[0] ? targetSlide[0].offsetLeft * -1 : 0;
                }

                targetLeft += (_.$list.width() - targetSlide.outerWidth()) / 2;
            }
        }

        return targetLeft;
    };

    Slick.prototype.getOption = Slick.prototype.slickGetOption = function (option) {

        var _ = this;

        return _.options[option];
    };

    Slick.prototype.getNavigableIndexes = function () {

        var _ = this,
            breakPoint = 0,
            counter = 0,
            indexes = [],
            max;

        if (_.options.infinite === false) {
            max = _.slideCount;
        } else {
            breakPoint = _.options.slidesToScroll * -1;
            counter = _.options.slidesToScroll * -1;
            max = _.slideCount * 2;
        }

        while (breakPoint < max) {
            indexes.push(breakPoint);
            breakPoint = counter + _.options.slidesToScroll;
            counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow;
        }

        return indexes;
    };

    Slick.prototype.getSlick = function () {

        return this;
    };

    Slick.prototype.getSlideCount = function () {

        var _ = this,
            slidesTraversed,
            swipedSlide,
            centerOffset;

        centerOffset = _.options.centerMode === true ? _.slideWidth * Math.floor(_.options.slidesToShow / 2) : 0;

        if (_.options.swipeToSlide === true) {
            _.$slideTrack.find('.slick-slide').each(function (index, slide) {
                if (slide.offsetLeft - centerOffset + $(slide).outerWidth() / 2 > _.swipeLeft * -1) {
                    swipedSlide = slide;
                    return false;
                }
            });

            slidesTraversed = Math.abs($(swipedSlide).attr('data-slick-index') - _.currentSlide) || 1;

            return slidesTraversed;
        } else {
            return _.options.slidesToScroll;
        }
    };

    Slick.prototype.goTo = Slick.prototype.slickGoTo = function (slide, dontAnimate) {

        var _ = this;

        _.changeSlide({
            data: {
                message: 'index',
                index: parseInt(slide)
            }
        }, dontAnimate);
    };

    Slick.prototype.init = function (creation) {

        var _ = this;

        if (!$(_.$slider).hasClass('slick-initialized')) {

            $(_.$slider).addClass('slick-initialized');

            _.buildRows();
            _.buildOut();
            _.setProps();
            _.startLoad();
            _.loadSlider();
            _.initializeEvents();
            _.updateArrows();
            _.updateDots();
            _.checkResponsive(true);
            _.focusHandler();
        }

        if (creation) {
            _.$slider.trigger('init', [_]);
        }

        if (_.options.accessibility === true) {
            _.initADA();
        }

        if (_.options.autoplay) {

            _.paused = false;
            _.autoPlay();
        }
    };

    Slick.prototype.initADA = function () {
        var _ = this,
            numDotGroups = Math.ceil(_.slideCount / _.options.slidesToShow),
            tabControlIndexes = _.getNavigableIndexes().filter(function (val) {
            return val >= 0 && val < _.slideCount;
        });

        _.$slides.add(_.$slideTrack.find('.slick-cloned')).attr({
            'aria-hidden': 'true',
            'tabindex': '-1'
        }).find('a, input, button, select').attr({
            'tabindex': '-1'
        });

        if (_.$dots !== null) {
            _.$slides.not(_.$slideTrack.find('.slick-cloned')).each(function (i) {
                var slideControlIndex = tabControlIndexes.indexOf(i);

                $(this).attr({
                    'role': 'tabpanel',
                    'id': 'slick-slide' + _.instanceUid + i,
                    'tabindex': -1
                });

                if (slideControlIndex !== -1) {
                    var ariaButtonControl = 'slick-slide-control' + _.instanceUid + slideControlIndex;
                    if ($('#' + ariaButtonControl).length) {
                        $(this).attr({
                            'aria-describedby': ariaButtonControl
                        });
                    }
                }
            });

            _.$dots.attr('role', 'tablist').find('li').each(function (i) {
                var mappedSlideIndex = tabControlIndexes[i];

                $(this).attr({
                    'role': 'presentation'
                });

                $(this).find('button').first().attr({
                    'role': 'tab',
                    'id': 'slick-slide-control' + _.instanceUid + i,
                    'aria-controls': 'slick-slide' + _.instanceUid + mappedSlideIndex,
                    'aria-label': i + 1 + ' of ' + numDotGroups,
                    'aria-selected': null,
                    'tabindex': '-1'
                });
            }).eq(_.currentSlide).find('button').attr({
                'aria-selected': 'true',
                'tabindex': '0'
            }).end();
        }

        for (var i = _.currentSlide, max = i + _.options.slidesToShow; i < max; i++) {
            if (_.options.focusOnChange) {
                _.$slides.eq(i).attr({ 'tabindex': '0' });
            } else {
                _.$slides.eq(i).removeAttr('tabindex');
            }
        }

        _.activateADA();
    };

    Slick.prototype.initArrowEvents = function () {

        var _ = this;

        if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {
            _.$prevArrow.off('click.slick').on('click.slick', {
                message: 'previous'
            }, _.changeSlide);
            _.$nextArrow.off('click.slick').on('click.slick', {
                message: 'next'
            }, _.changeSlide);

            if (_.options.accessibility === true) {
                _.$prevArrow.on('keydown.slick', _.keyHandler);
                _.$nextArrow.on('keydown.slick', _.keyHandler);
            }
        }
    };

    Slick.prototype.initDotEvents = function () {

        var _ = this;

        if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {
            $('li', _.$dots).on('click.slick', {
                message: 'index'
            }, _.changeSlide);

            if (_.options.accessibility === true) {
                _.$dots.on('keydown.slick', _.keyHandler);
            }
        }

        if (_.options.dots === true && _.options.pauseOnDotsHover === true && _.slideCount > _.options.slidesToShow) {

            $('li', _.$dots).on('mouseenter.slick', $.proxy(_.interrupt, _, true)).on('mouseleave.slick', $.proxy(_.interrupt, _, false));
        }
    };

    Slick.prototype.initSlideEvents = function () {

        var _ = this;

        if (_.options.pauseOnHover) {

            _.$list.on('mouseenter.slick', $.proxy(_.interrupt, _, true));
            _.$list.on('mouseleave.slick', $.proxy(_.interrupt, _, false));
        }
    };

    Slick.prototype.initializeEvents = function () {

        var _ = this;

        _.initArrowEvents();

        _.initDotEvents();
        _.initSlideEvents();

        _.$list.on('touchstart.slick mousedown.slick', {
            action: 'start'
        }, _.swipeHandler);
        _.$list.on('touchmove.slick mousemove.slick', {
            action: 'move'
        }, _.swipeHandler);
        _.$list.on('touchend.slick mouseup.slick', {
            action: 'end'
        }, _.swipeHandler);
        _.$list.on('touchcancel.slick mouseleave.slick', {
            action: 'end'
        }, _.swipeHandler);

        _.$list.on('click.slick', _.clickHandler);

        $(document).on(_.visibilityChange, $.proxy(_.visibility, _));

        if (_.options.accessibility === true) {
            _.$list.on('keydown.slick', _.keyHandler);
        }

        if (_.options.focusOnSelect === true) {
            $(_.$slideTrack).children().on('click.slick', _.selectHandler);
        }

        $(window).on('orientationchange.slick.slick-' + _.instanceUid, $.proxy(_.orientationChange, _));

        $(window).on('resize.slick.slick-' + _.instanceUid, $.proxy(_.resize, _));

        $('[draggable!=true]', _.$slideTrack).on('dragstart', _.preventDefault);

        $(window).on('load.slick.slick-' + _.instanceUid, _.setPosition);
        $(_.setPosition);
    };

    Slick.prototype.initUI = function () {

        var _ = this;

        if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {

            _.$prevArrow.show();
            _.$nextArrow.show();
        }

        if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {

            _.$dots.show();
        }
    };

    Slick.prototype.keyHandler = function (event) {

        var _ = this;
        //Dont slide if the cursor is inside the form fields and arrow keys are pressed
        if (!event.target.tagName.match('TEXTAREA|INPUT|SELECT')) {
            if (event.keyCode === 37 && _.options.accessibility === true) {
                _.changeSlide({
                    data: {
                        message: _.options.rtl === true ? 'next' : 'previous'
                    }
                });
            } else if (event.keyCode === 39 && _.options.accessibility === true) {
                _.changeSlide({
                    data: {
                        message: _.options.rtl === true ? 'previous' : 'next'
                    }
                });
            }
        }
    };

    Slick.prototype.lazyLoad = function () {

        var _ = this,
            loadRange,
            cloneRange,
            rangeStart,
            rangeEnd;

        function loadImages(imagesScope) {

            $('img[data-lazy]', imagesScope).each(function () {

                var image = $(this),
                    imageSource = $(this).attr('data-lazy'),
                    imageSrcSet = $(this).attr('data-srcset'),
                    imageSizes = $(this).attr('data-sizes') || _.$slider.attr('data-sizes'),
                    imageToLoad = document.createElement('img');

                imageToLoad.onload = function () {

                    image.animate({ opacity: 0 }, 100, function () {

                        if (imageSrcSet) {
                            image.attr('srcset', imageSrcSet);

                            if (imageSizes) {
                                image.attr('sizes', imageSizes);
                            }
                        }

                        image.attr('src', imageSource).animate({ opacity: 1 }, 200, function () {
                            image.removeAttr('data-lazy data-srcset data-sizes').removeClass('slick-loading');
                        });
                        _.$slider.trigger('lazyLoaded', [_, image, imageSource]);
                    });
                };

                imageToLoad.onerror = function () {

                    image.removeAttr('data-lazy').removeClass('slick-loading').addClass('slick-lazyload-error');

                    _.$slider.trigger('lazyLoadError', [_, image, imageSource]);
                };

                imageToLoad.src = imageSource;
            });
        }

        if (_.options.centerMode === true) {
            if (_.options.infinite === true) {
                rangeStart = _.currentSlide + (_.options.slidesToShow / 2 + 1);
                rangeEnd = rangeStart + _.options.slidesToShow + 2;
            } else {
                rangeStart = Math.max(0, _.currentSlide - (_.options.slidesToShow / 2 + 1));
                rangeEnd = 2 + (_.options.slidesToShow / 2 + 1) + _.currentSlide;
            }
        } else {
            rangeStart = _.options.infinite ? _.options.slidesToShow + _.currentSlide : _.currentSlide;
            rangeEnd = Math.ceil(rangeStart + _.options.slidesToShow);
            if (_.options.fade === true) {
                if (rangeStart > 0) rangeStart--;
                if (rangeEnd <= _.slideCount) rangeEnd++;
            }
        }

        loadRange = _.$slider.find('.slick-slide').slice(rangeStart, rangeEnd);

        if (_.options.lazyLoad === 'anticipated') {
            var prevSlide = rangeStart - 1,
                nextSlide = rangeEnd,
                $slides = _.$slider.find('.slick-slide');

            for (var i = 0; i < _.options.slidesToScroll; i++) {
                if (prevSlide < 0) prevSlide = _.slideCount - 1;
                loadRange = loadRange.add($slides.eq(prevSlide));
                loadRange = loadRange.add($slides.eq(nextSlide));
                prevSlide--;
                nextSlide++;
            }
        }

        loadImages(loadRange);

        if (_.slideCount <= _.options.slidesToShow) {
            cloneRange = _.$slider.find('.slick-slide');
            loadImages(cloneRange);
        } else if (_.currentSlide >= _.slideCount - _.options.slidesToShow) {
            cloneRange = _.$slider.find('.slick-cloned').slice(0, _.options.slidesToShow);
            loadImages(cloneRange);
        } else if (_.currentSlide === 0) {
            cloneRange = _.$slider.find('.slick-cloned').slice(_.options.slidesToShow * -1);
            loadImages(cloneRange);
        }
    };

    Slick.prototype.loadSlider = function () {

        var _ = this;

        _.setPosition();

        _.$slideTrack.css({
            opacity: 1
        });

        _.$slider.removeClass('slick-loading');

        _.initUI();

        if (_.options.lazyLoad === 'progressive') {
            _.progressiveLazyLoad();
        }
    };

    Slick.prototype.next = Slick.prototype.slickNext = function () {

        var _ = this;

        _.changeSlide({
            data: {
                message: 'next'
            }
        });
    };

    Slick.prototype.orientationChange = function () {

        var _ = this;

        _.checkResponsive();
        _.setPosition();
    };

    Slick.prototype.pause = Slick.prototype.slickPause = function () {

        var _ = this;

        _.autoPlayClear();
        _.paused = true;
    };

    Slick.prototype.play = Slick.prototype.slickPlay = function () {

        var _ = this;

        _.autoPlay();
        _.options.autoplay = true;
        _.paused = false;
        _.focussed = false;
        _.interrupted = false;
    };

    Slick.prototype.postSlide = function (index) {

        var _ = this;

        if (!_.unslicked) {

            _.$slider.trigger('afterChange', [_, index]);

            _.animating = false;

            if (_.slideCount > _.options.slidesToShow) {
                _.setPosition();
            }

            _.swipeLeft = null;

            if (_.options.autoplay) {
                _.autoPlay();
            }

            if (_.options.accessibility === true) {
                _.initADA();

                if (_.options.focusOnChange) {
                    var $currentSlide = $(_.$slides.get(_.currentSlide));
                    $currentSlide.attr('tabindex', 0).focus();
                }
            }
        }
    };

    Slick.prototype.prev = Slick.prototype.slickPrev = function () {

        var _ = this;

        _.changeSlide({
            data: {
                message: 'previous'
            }
        });
    };

    Slick.prototype.preventDefault = function (event) {

        event.preventDefault();
    };

    Slick.prototype.progressiveLazyLoad = function (tryCount) {

        tryCount = tryCount || 1;

        var _ = this,
            $imgsToLoad = $('img[data-lazy]', _.$slider),
            image,
            imageSource,
            imageSrcSet,
            imageSizes,
            imageToLoad;

        if ($imgsToLoad.length) {

            image = $imgsToLoad.first();
            imageSource = image.attr('data-lazy');
            imageSrcSet = image.attr('data-srcset');
            imageSizes = image.attr('data-sizes') || _.$slider.attr('data-sizes');
            imageToLoad = document.createElement('img');

            imageToLoad.onload = function () {

                if (imageSrcSet) {
                    image.attr('srcset', imageSrcSet);

                    if (imageSizes) {
                        image.attr('sizes', imageSizes);
                    }
                }

                image.attr('src', imageSource).removeAttr('data-lazy data-srcset data-sizes').removeClass('slick-loading');

                if (_.options.adaptiveHeight === true) {
                    _.setPosition();
                }

                _.$slider.trigger('lazyLoaded', [_, image, imageSource]);
                _.progressiveLazyLoad();
            };

            imageToLoad.onerror = function () {

                if (tryCount < 3) {

                    /**
                     * try to load the image 3 times,
                     * leave a slight delay so we don't get
                     * servers blocking the request.
                     */
                    setTimeout(function () {
                        _.progressiveLazyLoad(tryCount + 1);
                    }, 500);
                } else {

                    image.removeAttr('data-lazy').removeClass('slick-loading').addClass('slick-lazyload-error');

                    _.$slider.trigger('lazyLoadError', [_, image, imageSource]);

                    _.progressiveLazyLoad();
                }
            };

            imageToLoad.src = imageSource;
        } else {

            _.$slider.trigger('allImagesLoaded', [_]);
        }
    };

    Slick.prototype.refresh = function (initializing) {

        var _ = this,
            currentSlide,
            lastVisibleIndex;

        lastVisibleIndex = _.slideCount - _.options.slidesToShow;

        // in non-infinite sliders, we don't want to go past the
        // last visible index.
        if (!_.options.infinite && _.currentSlide > lastVisibleIndex) {
            _.currentSlide = lastVisibleIndex;
        }

        // if less slides than to show, go to start.
        if (_.slideCount <= _.options.slidesToShow) {
            _.currentSlide = 0;
        }

        currentSlide = _.currentSlide;

        _.destroy(true);

        $.extend(_, _.initials, { currentSlide: currentSlide });

        _.init();

        if (!initializing) {

            _.changeSlide({
                data: {
                    message: 'index',
                    index: currentSlide
                }
            }, false);
        }
    };

    Slick.prototype.registerBreakpoints = function () {

        var _ = this,
            breakpoint,
            currentBreakpoint,
            l,
            responsiveSettings = _.options.responsive || null;

        if ($.type(responsiveSettings) === 'array' && responsiveSettings.length) {

            _.respondTo = _.options.respondTo || 'window';

            for (breakpoint in responsiveSettings) {

                l = _.breakpoints.length - 1;

                if (responsiveSettings.hasOwnProperty(breakpoint)) {
                    currentBreakpoint = responsiveSettings[breakpoint].breakpoint;

                    // loop through the breakpoints and cut out any existing
                    // ones with the same breakpoint number, we don't want dupes.
                    while (l >= 0) {
                        if (_.breakpoints[l] && _.breakpoints[l] === currentBreakpoint) {
                            _.breakpoints.splice(l, 1);
                        }
                        l--;
                    }

                    _.breakpoints.push(currentBreakpoint);
                    _.breakpointSettings[currentBreakpoint] = responsiveSettings[breakpoint].settings;
                }
            }

            _.breakpoints.sort(function (a, b) {
                return _.options.mobileFirst ? a - b : b - a;
            });
        }
    };

    Slick.prototype.reinit = function () {

        var _ = this;

        _.$slides = _.$slideTrack.children(_.options.slide).addClass('slick-slide');

        _.slideCount = _.$slides.length;

        if (_.currentSlide >= _.slideCount && _.currentSlide !== 0) {
            _.currentSlide = _.currentSlide - _.options.slidesToScroll;
        }

        if (_.slideCount <= _.options.slidesToShow) {
            _.currentSlide = 0;
        }

        _.registerBreakpoints();

        _.setProps();
        _.setupInfinite();
        _.buildArrows();
        _.updateArrows();
        _.initArrowEvents();
        _.buildDots();
        _.updateDots();
        _.initDotEvents();
        _.cleanUpSlideEvents();
        _.initSlideEvents();

        _.checkResponsive(false, true);

        if (_.options.focusOnSelect === true) {
            $(_.$slideTrack).children().on('click.slick', _.selectHandler);
        }

        _.setSlideClasses(typeof _.currentSlide === 'number' ? _.currentSlide : 0);

        _.setPosition();
        _.focusHandler();

        _.paused = !_.options.autoplay;
        _.autoPlay();

        _.$slider.trigger('reInit', [_]);
    };

    Slick.prototype.resize = function () {

        var _ = this;

        if ($(window).width() !== _.windowWidth) {
            clearTimeout(_.windowDelay);
            _.windowDelay = window.setTimeout(function () {
                _.windowWidth = $(window).width();
                _.checkResponsive();
                if (!_.unslicked) {
                    _.setPosition();
                }
            }, 50);
        }
    };

    Slick.prototype.removeSlide = Slick.prototype.slickRemove = function (index, removeBefore, removeAll) {

        var _ = this;

        if (typeof index === 'boolean') {
            removeBefore = index;
            index = removeBefore === true ? 0 : _.slideCount - 1;
        } else {
            index = removeBefore === true ? --index : index;
        }

        if (_.slideCount < 1 || index < 0 || index > _.slideCount - 1) {
            return false;
        }

        _.unload();

        if (removeAll === true) {
            _.$slideTrack.children().remove();
        } else {
            _.$slideTrack.children(this.options.slide).eq(index).remove();
        }

        _.$slides = _.$slideTrack.children(this.options.slide);

        _.$slideTrack.children(this.options.slide).detach();

        _.$slideTrack.append(_.$slides);

        _.$slidesCache = _.$slides;

        _.reinit();
    };

    Slick.prototype.setCSS = function (position) {

        var _ = this,
            positionProps = {},
            x,
            y;

        if (_.options.rtl === true) {
            position = -position;
        }
        x = _.positionProp == 'left' ? Math.ceil(position) + 'px' : '0px';
        y = _.positionProp == 'top' ? Math.ceil(position) + 'px' : '0px';

        positionProps[_.positionProp] = position;

        if (_.transformsEnabled === false) {
            _.$slideTrack.css(positionProps);
        } else {
            positionProps = {};
            if (_.cssTransitions === false) {
                positionProps[_.animType] = 'translate(' + x + ', ' + y + ')';
                _.$slideTrack.css(positionProps);
            } else {
                positionProps[_.animType] = 'translate3d(' + x + ', ' + y + ', 0px)';
                _.$slideTrack.css(positionProps);
            }
        }
    };

    Slick.prototype.setDimensions = function () {

        var _ = this;

        if (_.options.vertical === false) {
            if (_.options.centerMode === true) {
                _.$list.css({
                    padding: '0px ' + _.options.centerPadding
                });
            }
        } else {
            _.$list.height(_.$slides.first().outerHeight(true) * _.options.slidesToShow);
            if (_.options.centerMode === true) {
                _.$list.css({
                    padding: _.options.centerPadding + ' 0px'
                });
            }
        }

        _.listWidth = _.$list.width();
        _.listHeight = _.$list.height();

        if (_.options.vertical === false && _.options.variableWidth === false) {
            _.slideWidth = Math.ceil(_.listWidth / _.options.slidesToShow);
            _.$slideTrack.width(Math.ceil(_.slideWidth * _.$slideTrack.children('.slick-slide').length));
        } else if (_.options.variableWidth === true) {
            _.$slideTrack.width(5000 * _.slideCount);
        } else {
            _.slideWidth = Math.ceil(_.listWidth);
            _.$slideTrack.height(Math.ceil(_.$slides.first().outerHeight(true) * _.$slideTrack.children('.slick-slide').length));
        }

        var offset = _.$slides.first().outerWidth(true) - _.$slides.first().width();
        if (_.options.variableWidth === false) _.$slideTrack.children('.slick-slide').width(_.slideWidth - offset);
    };

    Slick.prototype.setFade = function () {

        var _ = this,
            targetLeft;

        _.$slides.each(function (index, element) {
            targetLeft = _.slideWidth * index * -1;
            if (_.options.rtl === true) {
                $(element).css({
                    position: 'relative',
                    right: targetLeft,
                    top: 0,
                    zIndex: _.options.zIndex - 2,
                    opacity: 0
                });
            } else {
                $(element).css({
                    position: 'relative',
                    left: targetLeft,
                    top: 0,
                    zIndex: _.options.zIndex - 2,
                    opacity: 0
                });
            }
        });

        _.$slides.eq(_.currentSlide).css({
            zIndex: _.options.zIndex - 1,
            opacity: 1
        });
    };

    Slick.prototype.setHeight = function () {

        var _ = this;

        if (_.options.slidesToShow === 1 && _.options.adaptiveHeight === true && _.options.vertical === false) {
            var targetHeight = _.$slides.eq(_.currentSlide).outerHeight(true);
            _.$list.css('height', targetHeight);
        }
    };

    Slick.prototype.setOption = Slick.prototype.slickSetOption = function () {

        /**
         * accepts arguments in format of:
         *
         *  - for changing a single option's value:
         *     .slick("setOption", option, value, refresh )
         *
         *  - for changing a set of responsive options:
         *     .slick("setOption", 'responsive', [{}, ...], refresh )
         *
         *  - for updating multiple values at once (not responsive)
         *     .slick("setOption", { 'option': value, ... }, refresh )
         */

        var _ = this,
            l,
            item,
            option,
            value,
            refresh = false,
            type;

        if ($.type(arguments[0]) === 'object') {

            option = arguments[0];
            refresh = arguments[1];
            type = 'multiple';
        } else if ($.type(arguments[0]) === 'string') {

            option = arguments[0];
            value = arguments[1];
            refresh = arguments[2];

            if (arguments[0] === 'responsive' && $.type(arguments[1]) === 'array') {

                type = 'responsive';
            } else if (typeof arguments[1] !== 'undefined') {

                type = 'single';
            }
        }

        if (type === 'single') {

            _.options[option] = value;
        } else if (type === 'multiple') {

            $.each(option, function (opt, val) {

                _.options[opt] = val;
            });
        } else if (type === 'responsive') {

            for (item in value) {

                if ($.type(_.options.responsive) !== 'array') {

                    _.options.responsive = [value[item]];
                } else {

                    l = _.options.responsive.length - 1;

                    // loop through the responsive object and splice out duplicates.
                    while (l >= 0) {

                        if (_.options.responsive[l].breakpoint === value[item].breakpoint) {

                            _.options.responsive.splice(l, 1);
                        }

                        l--;
                    }

                    _.options.responsive.push(value[item]);
                }
            }
        }

        if (refresh) {

            _.unload();
            _.reinit();
        }
    };

    Slick.prototype.setPosition = function () {

        var _ = this;

        _.setDimensions();

        _.setHeight();

        if (_.options.fade === false) {
            _.setCSS(_.getLeft(_.currentSlide));
        } else {
            _.setFade();
        }

        _.$slider.trigger('setPosition', [_]);
    };

    Slick.prototype.setProps = function () {

        var _ = this,
            bodyStyle = document.body.style;

        _.positionProp = _.options.vertical === true ? 'top' : 'left';

        if (_.positionProp === 'top') {
            _.$slider.addClass('slick-vertical');
        } else {
            _.$slider.removeClass('slick-vertical');
        }

        if (bodyStyle.WebkitTransition !== undefined || bodyStyle.MozTransition !== undefined || bodyStyle.msTransition !== undefined) {
            if (_.options.useCSS === true) {
                _.cssTransitions = true;
            }
        }

        if (_.options.fade) {
            if (typeof _.options.zIndex === 'number') {
                if (_.options.zIndex < 3) {
                    _.options.zIndex = 3;
                }
            } else {
                _.options.zIndex = _.defaults.zIndex;
            }
        }

        if (bodyStyle.OTransform !== undefined) {
            _.animType = 'OTransform';
            _.transformType = '-o-transform';
            _.transitionType = 'OTransition';
            if (bodyStyle.perspectiveProperty === undefined && bodyStyle.webkitPerspective === undefined) _.animType = false;
        }
        if (bodyStyle.MozTransform !== undefined) {
            _.animType = 'MozTransform';
            _.transformType = '-moz-transform';
            _.transitionType = 'MozTransition';
            if (bodyStyle.perspectiveProperty === undefined && bodyStyle.MozPerspective === undefined) _.animType = false;
        }
        if (bodyStyle.webkitTransform !== undefined) {
            _.animType = 'webkitTransform';
            _.transformType = '-webkit-transform';
            _.transitionType = 'webkitTransition';
            if (bodyStyle.perspectiveProperty === undefined && bodyStyle.webkitPerspective === undefined) _.animType = false;
        }
        if (bodyStyle.msTransform !== undefined) {
            _.animType = 'msTransform';
            _.transformType = '-ms-transform';
            _.transitionType = 'msTransition';
            if (bodyStyle.msTransform === undefined) _.animType = false;
        }
        if (bodyStyle.transform !== undefined && _.animType !== false) {
            _.animType = 'transform';
            _.transformType = 'transform';
            _.transitionType = 'transition';
        }
        _.transformsEnabled = _.options.useTransform && _.animType !== null && _.animType !== false;
    };

    Slick.prototype.setSlideClasses = function (index) {

        var _ = this,
            centerOffset,
            allSlides,
            indexOffset,
            remainder;

        allSlides = _.$slider.find('.slick-slide').removeClass('slick-active slick-center slick-current').attr('aria-hidden', 'true');

        _.$slides.eq(index).addClass('slick-current');

        if (_.options.centerMode === true) {

            var evenCoef = _.options.slidesToShow % 2 === 0 ? 1 : 0;

            centerOffset = Math.floor(_.options.slidesToShow / 2);

            if (_.options.infinite === true) {

                if (index >= centerOffset && index <= _.slideCount - 1 - centerOffset) {
                    _.$slides.slice(index - centerOffset + evenCoef, index + centerOffset + 1).addClass('slick-active').attr('aria-hidden', 'false');
                } else {

                    indexOffset = _.options.slidesToShow + index;
                    allSlides.slice(indexOffset - centerOffset + 1 + evenCoef, indexOffset + centerOffset + 2).addClass('slick-active').attr('aria-hidden', 'false');
                }

                if (index === 0) {

                    allSlides.eq(allSlides.length - 1 - _.options.slidesToShow).addClass('slick-center');
                } else if (index === _.slideCount - 1) {

                    allSlides.eq(_.options.slidesToShow).addClass('slick-center');
                }
            }

            _.$slides.eq(index).addClass('slick-center');
        } else {

            if (index >= 0 && index <= _.slideCount - _.options.slidesToShow) {

                _.$slides.slice(index, index + _.options.slidesToShow).addClass('slick-active').attr('aria-hidden', 'false');
            } else if (allSlides.length <= _.options.slidesToShow) {

                allSlides.addClass('slick-active').attr('aria-hidden', 'false');
            } else {

                remainder = _.slideCount % _.options.slidesToShow;
                indexOffset = _.options.infinite === true ? _.options.slidesToShow + index : index;

                if (_.options.slidesToShow == _.options.slidesToScroll && _.slideCount - index < _.options.slidesToShow) {

                    allSlides.slice(indexOffset - (_.options.slidesToShow - remainder), indexOffset + remainder).addClass('slick-active').attr('aria-hidden', 'false');
                } else {

                    allSlides.slice(indexOffset, indexOffset + _.options.slidesToShow).addClass('slick-active').attr('aria-hidden', 'false');
                }
            }
        }

        if (_.options.lazyLoad === 'ondemand' || _.options.lazyLoad === 'anticipated') {
            _.lazyLoad();
        }
    };

    Slick.prototype.setupInfinite = function () {

        var _ = this,
            i,
            slideIndex,
            infiniteCount;

        if (_.options.fade === true) {
            _.options.centerMode = false;
        }

        if (_.options.infinite === true && _.options.fade === false) {

            slideIndex = null;

            if (_.slideCount > _.options.slidesToShow) {

                if (_.options.centerMode === true) {
                    infiniteCount = _.options.slidesToShow + 1;
                } else {
                    infiniteCount = _.options.slidesToShow;
                }

                for (i = _.slideCount; i > _.slideCount - infiniteCount; i -= 1) {
                    slideIndex = i - 1;
                    $(_.$slides[slideIndex]).clone(true).attr('id', '').attr('data-slick-index', slideIndex - _.slideCount).prependTo(_.$slideTrack).addClass('slick-cloned');
                }
                for (i = 0; i < infiniteCount + _.slideCount; i += 1) {
                    slideIndex = i;
                    $(_.$slides[slideIndex]).clone(true).attr('id', '').attr('data-slick-index', slideIndex + _.slideCount).appendTo(_.$slideTrack).addClass('slick-cloned');
                }
                _.$slideTrack.find('.slick-cloned').find('[id]').each(function () {
                    $(this).attr('id', '');
                });
            }
        }
    };

    Slick.prototype.interrupt = function (toggle) {

        var _ = this;

        if (!toggle) {
            _.autoPlay();
        }
        _.interrupted = toggle;
    };

    Slick.prototype.selectHandler = function (event) {

        var _ = this;

        var targetElement = $(event.target).is('.slick-slide') ? $(event.target) : $(event.target).parents('.slick-slide');

        var index = parseInt(targetElement.attr('data-slick-index'));

        if (!index) index = 0;

        if (_.slideCount <= _.options.slidesToShow) {

            _.slideHandler(index, false, true);
            return;
        }

        _.slideHandler(index);
    };

    Slick.prototype.slideHandler = function (index, sync, dontAnimate) {

        var targetSlide,
            animSlide,
            oldSlide,
            slideLeft,
            targetLeft = null,
            _ = this,
            navTarget;

        sync = sync || false;

        if (_.animating === true && _.options.waitForAnimate === true) {
            return;
        }

        if (_.options.fade === true && _.currentSlide === index) {
            return;
        }

        if (sync === false) {
            _.asNavFor(index);
        }

        targetSlide = index;
        targetLeft = _.getLeft(targetSlide);
        slideLeft = _.getLeft(_.currentSlide);

        _.currentLeft = _.swipeLeft === null ? slideLeft : _.swipeLeft;

        if (_.options.infinite === false && _.options.centerMode === false && (index < 0 || index > _.getDotCount() * _.options.slidesToScroll)) {
            if (_.options.fade === false) {
                targetSlide = _.currentSlide;
                if (dontAnimate !== true && _.slideCount > _.options.slidesToShow) {
                    _.animateSlide(slideLeft, function () {
                        _.postSlide(targetSlide);
                    });
                } else {
                    _.postSlide(targetSlide);
                }
            }
            return;
        } else if (_.options.infinite === false && _.options.centerMode === true && (index < 0 || index > _.slideCount - _.options.slidesToScroll)) {
            if (_.options.fade === false) {
                targetSlide = _.currentSlide;
                if (dontAnimate !== true && _.slideCount > _.options.slidesToShow) {
                    _.animateSlide(slideLeft, function () {
                        _.postSlide(targetSlide);
                    });
                } else {
                    _.postSlide(targetSlide);
                }
            }
            return;
        }

        if (_.options.autoplay) {
            clearInterval(_.autoPlayTimer);
        }

        if (targetSlide < 0) {
            if (_.slideCount % _.options.slidesToScroll !== 0) {
                animSlide = _.slideCount - _.slideCount % _.options.slidesToScroll;
            } else {
                animSlide = _.slideCount + targetSlide;
            }
        } else if (targetSlide >= _.slideCount) {
            if (_.slideCount % _.options.slidesToScroll !== 0) {
                animSlide = 0;
            } else {
                animSlide = targetSlide - _.slideCount;
            }
        } else {
            animSlide = targetSlide;
        }

        _.animating = true;

        _.$slider.trigger('beforeChange', [_, _.currentSlide, animSlide]);

        oldSlide = _.currentSlide;
        _.currentSlide = animSlide;

        _.setSlideClasses(_.currentSlide);

        if (_.options.asNavFor) {

            navTarget = _.getNavTarget();
            navTarget = navTarget.slick('getSlick');

            if (navTarget.slideCount <= navTarget.options.slidesToShow) {
                navTarget.setSlideClasses(_.currentSlide);
            }
        }

        _.updateDots();
        _.updateArrows();

        if (_.options.fade === true) {
            if (dontAnimate !== true) {

                _.fadeSlideOut(oldSlide);

                _.fadeSlide(animSlide, function () {
                    _.postSlide(animSlide);
                });
            } else {
                _.postSlide(animSlide);
            }
            _.animateHeight();
            return;
        }

        if (dontAnimate !== true && _.slideCount > _.options.slidesToShow) {
            _.animateSlide(targetLeft, function () {
                _.postSlide(animSlide);
            });
        } else {
            _.postSlide(animSlide);
        }
    };

    Slick.prototype.startLoad = function () {

        var _ = this;

        if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {

            _.$prevArrow.hide();
            _.$nextArrow.hide();
        }

        if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {

            _.$dots.hide();
        }

        _.$slider.addClass('slick-loading');
    };

    Slick.prototype.swipeDirection = function () {

        var xDist,
            yDist,
            r,
            swipeAngle,
            _ = this;

        xDist = _.touchObject.startX - _.touchObject.curX;
        yDist = _.touchObject.startY - _.touchObject.curY;
        r = Math.atan2(yDist, xDist);

        swipeAngle = Math.round(r * 180 / Math.PI);
        if (swipeAngle < 0) {
            swipeAngle = 360 - Math.abs(swipeAngle);
        }

        if (swipeAngle <= 45 && swipeAngle >= 0) {
            return _.options.rtl === false ? 'left' : 'right';
        }
        if (swipeAngle <= 360 && swipeAngle >= 315) {
            return _.options.rtl === false ? 'left' : 'right';
        }
        if (swipeAngle >= 135 && swipeAngle <= 225) {
            return _.options.rtl === false ? 'right' : 'left';
        }
        if (_.options.verticalSwiping === true) {
            if (swipeAngle >= 35 && swipeAngle <= 135) {
                return 'down';
            } else {
                return 'up';
            }
        }

        return 'vertical';
    };

    Slick.prototype.swipeEnd = function (event) {

        var _ = this,
            slideCount,
            direction;

        _.dragging = false;
        _.swiping = false;

        if (_.scrolling) {
            _.scrolling = false;
            return false;
        }

        _.interrupted = false;
        _.shouldClick = _.touchObject.swipeLength > 10 ? false : true;

        if (_.touchObject.curX === undefined) {
            return false;
        }

        if (_.touchObject.edgeHit === true) {
            _.$slider.trigger('edge', [_, _.swipeDirection()]);
        }

        if (_.touchObject.swipeLength >= _.touchObject.minSwipe) {

            direction = _.swipeDirection();

            switch (direction) {

                case 'left':
                case 'down':

                    slideCount = _.options.swipeToSlide ? _.checkNavigable(_.currentSlide + _.getSlideCount()) : _.currentSlide + _.getSlideCount();

                    _.currentDirection = 0;

                    break;

                case 'right':
                case 'up':

                    slideCount = _.options.swipeToSlide ? _.checkNavigable(_.currentSlide - _.getSlideCount()) : _.currentSlide - _.getSlideCount();

                    _.currentDirection = 1;

                    break;

                default:

            }

            if (direction != 'vertical') {

                _.slideHandler(slideCount);
                _.touchObject = {};
                _.$slider.trigger('swipe', [_, direction]);
            }
        } else {

            if (_.touchObject.startX !== _.touchObject.curX) {

                _.slideHandler(_.currentSlide);
                _.touchObject = {};
            }
        }
    };

    Slick.prototype.swipeHandler = function (event) {

        var _ = this;

        if (_.options.swipe === false || 'ontouchend' in document && _.options.swipe === false) {
            return;
        } else if (_.options.draggable === false && event.type.indexOf('mouse') !== -1) {
            return;
        }

        _.touchObject.fingerCount = event.originalEvent && event.originalEvent.touches !== undefined ? event.originalEvent.touches.length : 1;

        _.touchObject.minSwipe = _.listWidth / _.options.touchThreshold;

        if (_.options.verticalSwiping === true) {
            _.touchObject.minSwipe = _.listHeight / _.options.touchThreshold;
        }

        switch (event.data.action) {

            case 'start':
                _.swipeStart(event);
                break;

            case 'move':
                _.swipeMove(event);
                break;

            case 'end':
                _.swipeEnd(event);
                break;

        }
    };

    Slick.prototype.swipeMove = function (event) {

        var _ = this,
            edgeWasHit = false,
            curLeft,
            swipeDirection,
            swipeLength,
            positionOffset,
            touches,
            verticalSwipeLength;

        touches = event.originalEvent !== undefined ? event.originalEvent.touches : null;

        if (!_.dragging || _.scrolling || touches && touches.length !== 1) {
            return false;
        }

        curLeft = _.getLeft(_.currentSlide);

        _.touchObject.curX = touches !== undefined ? touches[0].pageX : event.clientX;
        _.touchObject.curY = touches !== undefined ? touches[0].pageY : event.clientY;

        _.touchObject.swipeLength = Math.round(Math.sqrt(Math.pow(_.touchObject.curX - _.touchObject.startX, 2)));

        verticalSwipeLength = Math.round(Math.sqrt(Math.pow(_.touchObject.curY - _.touchObject.startY, 2)));

        if (!_.options.verticalSwiping && !_.swiping && verticalSwipeLength > 4) {
            _.scrolling = true;
            return false;
        }

        if (_.options.verticalSwiping === true) {
            _.touchObject.swipeLength = verticalSwipeLength;
        }

        swipeDirection = _.swipeDirection();

        if (event.originalEvent !== undefined && _.touchObject.swipeLength > 4) {
            _.swiping = true;
            event.preventDefault();
        }

        positionOffset = (_.options.rtl === false ? 1 : -1) * (_.touchObject.curX > _.touchObject.startX ? 1 : -1);
        if (_.options.verticalSwiping === true) {
            positionOffset = _.touchObject.curY > _.touchObject.startY ? 1 : -1;
        }

        swipeLength = _.touchObject.swipeLength;

        _.touchObject.edgeHit = false;

        if (_.options.infinite === false) {
            if (_.currentSlide === 0 && swipeDirection === 'right' || _.currentSlide >= _.getDotCount() && swipeDirection === 'left') {
                swipeLength = _.touchObject.swipeLength * _.options.edgeFriction;
                _.touchObject.edgeHit = true;
            }
        }

        if (_.options.vertical === false) {
            _.swipeLeft = curLeft + swipeLength * positionOffset;
        } else {
            _.swipeLeft = curLeft + swipeLength * (_.$list.height() / _.listWidth) * positionOffset;
        }
        if (_.options.verticalSwiping === true) {
            _.swipeLeft = curLeft + swipeLength * positionOffset;
        }

        if (_.options.fade === true || _.options.touchMove === false) {
            return false;
        }

        if (_.animating === true) {
            _.swipeLeft = null;
            return false;
        }

        _.setCSS(_.swipeLeft);
    };

    Slick.prototype.swipeStart = function (event) {

        var _ = this,
            touches;

        _.interrupted = true;

        if (_.touchObject.fingerCount !== 1 || _.slideCount <= _.options.slidesToShow) {
            _.touchObject = {};
            return false;
        }

        if (event.originalEvent !== undefined && event.originalEvent.touches !== undefined) {
            touches = event.originalEvent.touches[0];
        }

        _.touchObject.startX = _.touchObject.curX = touches !== undefined ? touches.pageX : event.clientX;
        _.touchObject.startY = _.touchObject.curY = touches !== undefined ? touches.pageY : event.clientY;

        _.dragging = true;
    };

    Slick.prototype.unfilterSlides = Slick.prototype.slickUnfilter = function () {

        var _ = this;

        if (_.$slidesCache !== null) {

            _.unload();

            _.$slideTrack.children(this.options.slide).detach();

            _.$slidesCache.appendTo(_.$slideTrack);

            _.reinit();
        }
    };

    Slick.prototype.unload = function () {

        var _ = this;

        $('.slick-cloned', _.$slider).remove();

        if (_.$dots) {
            _.$dots.remove();
        }

        if (_.$prevArrow && _.htmlExpr.test(_.options.prevArrow)) {
            _.$prevArrow.remove();
        }

        if (_.$nextArrow && _.htmlExpr.test(_.options.nextArrow)) {
            _.$nextArrow.remove();
        }

        _.$slides.removeClass('slick-slide slick-active slick-visible slick-current').attr('aria-hidden', 'true').css('width', '');
    };

    Slick.prototype.unslick = function (fromBreakpoint) {

        var _ = this;
        _.$slider.trigger('unslick', [_, fromBreakpoint]);
        _.destroy();
    };

    Slick.prototype.updateArrows = function () {

        var _ = this,
            centerOffset;

        centerOffset = Math.floor(_.options.slidesToShow / 2);

        if (_.options.arrows === true && _.slideCount > _.options.slidesToShow && !_.options.infinite) {

            _.$prevArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');
            _.$nextArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');

            if (_.currentSlide === 0) {

                _.$prevArrow.addClass('slick-disabled').attr('aria-disabled', 'true');
                _.$nextArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');
            } else if (_.currentSlide >= _.slideCount - _.options.slidesToShow && _.options.centerMode === false) {

                _.$nextArrow.addClass('slick-disabled').attr('aria-disabled', 'true');
                _.$prevArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');
            } else if (_.currentSlide >= _.slideCount - 1 && _.options.centerMode === true) {

                _.$nextArrow.addClass('slick-disabled').attr('aria-disabled', 'true');
                _.$prevArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');
            }
        }
    };

    Slick.prototype.updateDots = function () {

        var _ = this;

        if (_.$dots !== null) {

            _.$dots.find('li').removeClass('slick-active').end();

            _.$dots.find('li').eq(Math.floor(_.currentSlide / _.options.slidesToScroll)).addClass('slick-active');
        }
    };

    Slick.prototype.visibility = function () {

        var _ = this;

        if (_.options.autoplay) {

            if (document[_.hidden]) {

                _.interrupted = true;
            } else {

                _.interrupted = false;
            }
        }
    };

    $.fn.slick = function () {
        var _ = this,
            opt = arguments[0],
            args = Array.prototype.slice.call(arguments, 1),
            l = _.length,
            i,
            ret;
        for (i = 0; i < l; i++) {
            if (typeof opt == 'object' || typeof opt == 'undefined') _[i].slick = new Slick(_[i], opt);else ret = _[i].slick[opt].apply(_[i].slick, args);
            if (typeof ret != 'undefined') return ret;
        }
        return _;
    };
});
;'use strict';

(function ($) {
  var sliders = {

    hero: function (slider) {
      slider.slick({
        infinite: true,
        autoplay: true,
        autoplaySpeed: 8000,
        arrows: true,
        dots: true,
        fade: false
      });
    },

    images: function (slider) {
      slider.slick({
        infinite: true,
        slidesToShow: 3,
        slidesToScroll: 3,
        arrows: false,
        dots: true,
        responsive: [{
          breakpoint: 1024,
          settings: {
            slidesToShow: 3,
            slidesToScroll: 3
          }
        }, {
          breakpoint: 640,
          settings: {
            slidesToShow: 1,
            slidesToScroll: 1
          }
        }]
      });
    },

    products: function (slider) {
      slider.slick({
        infinite: true,
        slidesToShow: 4,
        slidesToScroll: 4,
        arrows: false,
        dots: true,
        responsive: [{
          breakpoint: 1024,
          settings: {
            slidesToShow: 3,
            slidesToScroll: 3
          }
        }, {
          breakpoint: 640,
          settings: {
            slidesToShow: 1,
            slidesToScroll: 1
          }
        }]
      });
    },

    init: function () {
      sliders.hero($('.hero.carousel'));
      sliders.images($('.images.carousel'));
      sliders.products($('.products.carousel'));
    }
  };

  $(document).ready(function () {
    sliders.init();
  });
})(jQuery);
;// Use the below structure to start out your custom jQuery functions

// (function($){
//     var __placeholder__ = {
//         init : function(){
//             console.log('hello world');
//         }
//     };
//
//     $(document).ready(function() {
//         __placeholder__.init();
//     });
// })(jQuery);
"use strict";
;'use strict';

(function ($) {
<<<<<<< HEAD
=======
    var __placeholder__ = {
        init: function () {
            console.log('hello world');
        }
    };

    $(document).ready(function () {
        __placeholder__.init();
    });
})(jQuery);
;'use strict';

(function ($) {
>>>>>>> develop
  var fixed = {
    header: function () {
      var container = $('.max-container'),
          header = $('header.header-bottom'),
          offset = header.offset().top,
          fixed = 'header-fixed';

      $(window).scroll(function () {
        var scroll = $(window).scrollTop();

        if (scroll >= offset) {
          header.addClass(fixed);
          container.addClass(fixed);
        } else {
          header.removeClass(fixed);
          container.removeClass(fixed);
        }
      });
    },

<<<<<<< HEAD
    init: function () {
      fixed.header();
=======
    sidebar: function () {
      var sidebar = $('.sidebar'),
          offset = sidebar.offset().top,
          fixed = 'sidebar-fixed';

      $(window).scroll(function () {
        var scroll = $(window).scrollTop();

        if (scroll >= offset) {
          sidebar.addClass(fixed);
        } else {
          sidebar.removeClass(fixed);
        }
      });
    },

    init: function () {
      fixed.header();
      // fixed.sidebar();
>>>>>>> develop
    }
  };

  $(document).ready(function () {
    fixed.init();
  });
})(jQuery);
;"use strict";

jQuery(document).foundation();
;'use strict';

(function ($) {
  var menu = {
    mobile: function () {
      var headerMenu = $('.header-menu'),
          toggle = $('#mobile-menu-toggle'),
          icons = $('#mobile-menu-toggle svg'),
          open = 'is-open';

      toggle.click(function () {
        icons.toggle();
        headerMenu.toggleClass(open);
        menu.modal();
      });
    },

    modal: function () {
      var body = $('body'),
          modal = $('.modal-bg'),
          open = 'modal-open';

      modal.fadeToggle(250);
      body.toggleClass(open);
    },

    init: function () {
      menu.mobile();
    }
  };

  $(document).ready(function () {
    menu.init();
  });
})(jQuery);
;'use strict';

$('a[href*="#"]').not('[href="#"]').not('[href="#0"]').click(function (event) {
  if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
    var target = $(this.hash);
    target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
    if (target.length) {
      event.preventDefault();
      $('html, body').animate({
        scrollTop: target.offset().top
      }, 500, function () {
        var $target = $(target);
        $target.focus();
        if ($target.is(":focus")) {
          return false;
        } else {
          $target.attr('tabindex', '-1');
          $target.focus();
        }
      });
    }
  }
});
<<<<<<< HEAD
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZvdW5kYXRpb24uY29yZS5qcyIsImZvdW5kYXRpb24udXRpbC5ib3guanMiLCJmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmQuanMiLCJmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeS5qcyIsImZvdW5kYXRpb24udXRpbC5tb3Rpb24uanMiLCJmb3VuZGF0aW9uLnV0aWwubmVzdC5qcyIsImZvdW5kYXRpb24udXRpbC50aW1lckFuZEltYWdlTG9hZGVyLmpzIiwiZm91bmRhdGlvbi51dGlsLnRvdWNoLmpzIiwiZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzLmpzIiwic2xpY2suanMiLCJjYXJvdXNlbC5qcyIsImV4YW1wbGUtZmlsZS5qcyIsImZpeGVkLmpzIiwiaW5pdC1mb3VuZGF0aW9uLmpzIiwibWVudS5qcyIsInNtb290aC1zY3JvbGwuanMiXSwibmFtZXMiOlsiJCIsIkZPVU5EQVRJT05fVkVSU0lPTiIsIkZvdW5kYXRpb24iLCJ2ZXJzaW9uIiwiX3BsdWdpbnMiLCJfdXVpZHMiLCJydGwiLCJhdHRyIiwicGx1Z2luIiwibmFtZSIsImNsYXNzTmFtZSIsImZ1bmN0aW9uTmFtZSIsImF0dHJOYW1lIiwiaHlwaGVuYXRlIiwicmVnaXN0ZXJQbHVnaW4iLCJwbHVnaW5OYW1lIiwiY29uc3RydWN0b3IiLCJ0b0xvd2VyQ2FzZSIsInV1aWQiLCJHZXRZb0RpZ2l0cyIsIiRlbGVtZW50IiwiZGF0YSIsInRyaWdnZXIiLCJwdXNoIiwidW5yZWdpc3RlclBsdWdpbiIsInNwbGljZSIsImluZGV4T2YiLCJyZW1vdmVBdHRyIiwicmVtb3ZlRGF0YSIsInByb3AiLCJyZUluaXQiLCJwbHVnaW5zIiwiaXNKUSIsImVhY2giLCJfaW5pdCIsInR5cGUiLCJfdGhpcyIsImZucyIsInBsZ3MiLCJmb3JFYWNoIiwicCIsImZvdW5kYXRpb24iLCJPYmplY3QiLCJrZXlzIiwiZXJyIiwiY29uc29sZSIsImVycm9yIiwibGVuZ3RoIiwibmFtZXNwYWNlIiwiTWF0aCIsInJvdW5kIiwicG93IiwicmFuZG9tIiwidG9TdHJpbmciLCJzbGljZSIsInJlZmxvdyIsImVsZW0iLCJpIiwiJGVsZW0iLCJmaW5kIiwiYWRkQmFjayIsIiRlbCIsIm9wdHMiLCJ3YXJuIiwidGhpbmciLCJzcGxpdCIsImUiLCJvcHQiLCJtYXAiLCJlbCIsInRyaW0iLCJwYXJzZVZhbHVlIiwiZXIiLCJnZXRGbk5hbWUiLCJ0cmFuc2l0aW9uZW5kIiwidHJhbnNpdGlvbnMiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJlbmQiLCJ0Iiwic3R5bGUiLCJzZXRUaW1lb3V0IiwidHJpZ2dlckhhbmRsZXIiLCJ1dGlsIiwidGhyb3R0bGUiLCJmdW5jIiwiZGVsYXkiLCJ0aW1lciIsImNvbnRleHQiLCJhcmdzIiwiYXJndW1lbnRzIiwiYXBwbHkiLCJtZXRob2QiLCIkbWV0YSIsIiRub0pTIiwiYXBwZW5kVG8iLCJoZWFkIiwicmVtb3ZlQ2xhc3MiLCJNZWRpYVF1ZXJ5IiwiQXJyYXkiLCJwcm90b3R5cGUiLCJjYWxsIiwicGx1Z0NsYXNzIiwidW5kZWZpbmVkIiwiUmVmZXJlbmNlRXJyb3IiLCJUeXBlRXJyb3IiLCJ3aW5kb3ciLCJmbiIsIkRhdGUiLCJub3ciLCJnZXRUaW1lIiwidmVuZG9ycyIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsInZwIiwiY2FuY2VsQW5pbWF0aW9uRnJhbWUiLCJ0ZXN0IiwibmF2aWdhdG9yIiwidXNlckFnZW50IiwibGFzdFRpbWUiLCJjYWxsYmFjayIsIm5leHRUaW1lIiwibWF4IiwiY2xlYXJUaW1lb3V0IiwicGVyZm9ybWFuY2UiLCJzdGFydCIsIkZ1bmN0aW9uIiwiYmluZCIsIm9UaGlzIiwiYUFyZ3MiLCJmVG9CaW5kIiwiZk5PUCIsImZCb3VuZCIsImNvbmNhdCIsImZ1bmNOYW1lUmVnZXgiLCJyZXN1bHRzIiwiZXhlYyIsInN0ciIsImlzTmFOIiwicGFyc2VGbG9hdCIsInJlcGxhY2UiLCJqUXVlcnkiLCJCb3giLCJJbU5vdFRvdWNoaW5nWW91IiwiR2V0RGltZW5zaW9ucyIsIkdldE9mZnNldHMiLCJlbGVtZW50IiwicGFyZW50IiwibHJPbmx5IiwidGJPbmx5IiwiZWxlRGltcyIsInRvcCIsImJvdHRvbSIsImxlZnQiLCJyaWdodCIsInBhckRpbXMiLCJvZmZzZXQiLCJoZWlnaHQiLCJ3aWR0aCIsIndpbmRvd0RpbXMiLCJhbGxEaXJzIiwiRXJyb3IiLCJyZWN0IiwiZ2V0Qm91bmRpbmdDbGllbnRSZWN0IiwicGFyUmVjdCIsInBhcmVudE5vZGUiLCJ3aW5SZWN0IiwiYm9keSIsIndpblkiLCJwYWdlWU9mZnNldCIsIndpblgiLCJwYWdlWE9mZnNldCIsInBhcmVudERpbXMiLCJhbmNob3IiLCJwb3NpdGlvbiIsInZPZmZzZXQiLCJoT2Zmc2V0IiwiaXNPdmVyZmxvdyIsIiRlbGVEaW1zIiwiJGFuY2hvckRpbXMiLCJrZXlDb2RlcyIsImNvbW1hbmRzIiwiS2V5Ym9hcmQiLCJnZXRLZXlDb2RlcyIsInBhcnNlS2V5IiwiZXZlbnQiLCJrZXkiLCJ3aGljaCIsImtleUNvZGUiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJ0b1VwcGVyQ2FzZSIsInNoaWZ0S2V5IiwiY3RybEtleSIsImFsdEtleSIsImhhbmRsZUtleSIsImNvbXBvbmVudCIsImZ1bmN0aW9ucyIsImNvbW1hbmRMaXN0IiwiY21kcyIsImNvbW1hbmQiLCJsdHIiLCJleHRlbmQiLCJyZXR1cm5WYWx1ZSIsImhhbmRsZWQiLCJ1bmhhbmRsZWQiLCJmaW5kRm9jdXNhYmxlIiwiZmlsdGVyIiwiaXMiLCJyZWdpc3RlciIsImNvbXBvbmVudE5hbWUiLCJ0cmFwRm9jdXMiLCIkZm9jdXNhYmxlIiwiJGZpcnN0Rm9jdXNhYmxlIiwiZXEiLCIkbGFzdEZvY3VzYWJsZSIsIm9uIiwidGFyZ2V0IiwicHJldmVudERlZmF1bHQiLCJmb2N1cyIsInJlbGVhc2VGb2N1cyIsIm9mZiIsImtjcyIsImsiLCJrYyIsImRlZmF1bHRRdWVyaWVzIiwibGFuZHNjYXBlIiwicG9ydHJhaXQiLCJyZXRpbmEiLCJxdWVyaWVzIiwiY3VycmVudCIsInNlbGYiLCJleHRyYWN0ZWRTdHlsZXMiLCJjc3MiLCJuYW1lZFF1ZXJpZXMiLCJwYXJzZVN0eWxlVG9PYmplY3QiLCJoYXNPd25Qcm9wZXJ0eSIsInZhbHVlIiwiX2dldEN1cnJlbnRTaXplIiwiX3dhdGNoZXIiLCJhdExlYXN0Iiwic2l6ZSIsInF1ZXJ5IiwiZ2V0IiwibWF0Y2hNZWRpYSIsIm1hdGNoZXMiLCJtYXRjaGVkIiwibmV3U2l6ZSIsImN1cnJlbnRTaXplIiwic3R5bGVNZWRpYSIsIm1lZGlhIiwic2NyaXB0IiwiZ2V0RWxlbWVudHNCeVRhZ05hbWUiLCJpbmZvIiwiaWQiLCJpbnNlcnRCZWZvcmUiLCJnZXRDb21wdXRlZFN0eWxlIiwiY3VycmVudFN0eWxlIiwibWF0Y2hNZWRpdW0iLCJ0ZXh0Iiwic3R5bGVTaGVldCIsImNzc1RleHQiLCJ0ZXh0Q29udGVudCIsInN0eWxlT2JqZWN0IiwicmVkdWNlIiwicmV0IiwicGFyYW0iLCJwYXJ0cyIsInZhbCIsImRlY29kZVVSSUNvbXBvbmVudCIsImlzQXJyYXkiLCJpbml0Q2xhc3NlcyIsImFjdGl2ZUNsYXNzZXMiLCJNb3Rpb24iLCJhbmltYXRlSW4iLCJhbmltYXRpb24iLCJjYiIsImFuaW1hdGUiLCJhbmltYXRlT3V0IiwiTW92ZSIsImR1cmF0aW9uIiwiYW5pbSIsInByb2ciLCJtb3ZlIiwidHMiLCJpc0luIiwiaW5pdENsYXNzIiwiYWN0aXZlQ2xhc3MiLCJyZXNldCIsImFkZENsYXNzIiwic2hvdyIsIm9mZnNldFdpZHRoIiwib25lIiwiZmluaXNoIiwiaGlkZSIsInRyYW5zaXRpb25EdXJhdGlvbiIsIk5lc3QiLCJGZWF0aGVyIiwibWVudSIsIml0ZW1zIiwic3ViTWVudUNsYXNzIiwic3ViSXRlbUNsYXNzIiwiaGFzU3ViQ2xhc3MiLCIkaXRlbSIsIiRzdWIiLCJjaGlsZHJlbiIsIkJ1cm4iLCJUaW1lciIsIm9wdGlvbnMiLCJuYW1lU3BhY2UiLCJyZW1haW4iLCJpc1BhdXNlZCIsInJlc3RhcnQiLCJpbmZpbml0ZSIsInBhdXNlIiwib25JbWFnZXNMb2FkZWQiLCJpbWFnZXMiLCJ1bmxvYWRlZCIsImNvbXBsZXRlIiwicmVhZHlTdGF0ZSIsInNpbmdsZUltYWdlTG9hZGVkIiwic3JjIiwic3BvdFN3aXBlIiwiZW5hYmxlZCIsImRvY3VtZW50RWxlbWVudCIsIm1vdmVUaHJlc2hvbGQiLCJ0aW1lVGhyZXNob2xkIiwic3RhcnRQb3NYIiwic3RhcnRQb3NZIiwic3RhcnRUaW1lIiwiZWxhcHNlZFRpbWUiLCJpc01vdmluZyIsIm9uVG91Y2hFbmQiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwib25Ub3VjaE1vdmUiLCJ4IiwidG91Y2hlcyIsInBhZ2VYIiwieSIsInBhZ2VZIiwiZHgiLCJkeSIsImRpciIsImFicyIsIm9uVG91Y2hTdGFydCIsImFkZEV2ZW50TGlzdGVuZXIiLCJpbml0IiwidGVhcmRvd24iLCJzcGVjaWFsIiwic3dpcGUiLCJzZXR1cCIsIm5vb3AiLCJhZGRUb3VjaCIsImhhbmRsZVRvdWNoIiwiY2hhbmdlZFRvdWNoZXMiLCJmaXJzdCIsImV2ZW50VHlwZXMiLCJ0b3VjaHN0YXJ0IiwidG91Y2htb3ZlIiwidG91Y2hlbmQiLCJzaW11bGF0ZWRFdmVudCIsIk1vdXNlRXZlbnQiLCJzY3JlZW5YIiwic2NyZWVuWSIsImNsaWVudFgiLCJjbGllbnRZIiwiY3JlYXRlRXZlbnQiLCJpbml0TW91c2VFdmVudCIsImRpc3BhdGNoRXZlbnQiLCJNdXRhdGlvbk9ic2VydmVyIiwicHJlZml4ZXMiLCJ0cmlnZ2VycyIsInN0b3BQcm9wYWdhdGlvbiIsImZhZGVPdXQiLCJjaGVja0xpc3RlbmVycyIsImV2ZW50c0xpc3RlbmVyIiwicmVzaXplTGlzdGVuZXIiLCJzY3JvbGxMaXN0ZW5lciIsImNsb3NlbWVMaXN0ZW5lciIsInlldGlCb3hlcyIsInBsdWdOYW1lcyIsImxpc3RlbmVycyIsImpvaW4iLCJwbHVnaW5JZCIsIm5vdCIsImRlYm91bmNlIiwiJG5vZGVzIiwibm9kZXMiLCJxdWVyeVNlbGVjdG9yQWxsIiwibGlzdGVuaW5nRWxlbWVudHNNdXRhdGlvbiIsIm11dGF0aW9uUmVjb3Jkc0xpc3QiLCIkdGFyZ2V0IiwiYXR0cmlidXRlTmFtZSIsImNsb3Nlc3QiLCJlbGVtZW50T2JzZXJ2ZXIiLCJvYnNlcnZlIiwiYXR0cmlidXRlcyIsImNoaWxkTGlzdCIsImNoYXJhY3RlckRhdGEiLCJzdWJ0cmVlIiwiYXR0cmlidXRlRmlsdGVyIiwiSUhlYXJZb3UiLCJmYWN0b3J5IiwiZGVmaW5lIiwiYW1kIiwiZXhwb3J0cyIsIm1vZHVsZSIsInJlcXVpcmUiLCJTbGljayIsImluc3RhbmNlVWlkIiwic2V0dGluZ3MiLCJfIiwiZGF0YVNldHRpbmdzIiwiZGVmYXVsdHMiLCJhY2Nlc3NpYmlsaXR5IiwiYWRhcHRpdmVIZWlnaHQiLCJhcHBlbmRBcnJvd3MiLCJhcHBlbmREb3RzIiwiYXJyb3dzIiwiYXNOYXZGb3IiLCJwcmV2QXJyb3ciLCJuZXh0QXJyb3ciLCJhdXRvcGxheSIsImF1dG9wbGF5U3BlZWQiLCJjZW50ZXJNb2RlIiwiY2VudGVyUGFkZGluZyIsImNzc0Vhc2UiLCJjdXN0b21QYWdpbmciLCJzbGlkZXIiLCJkb3RzIiwiZG90c0NsYXNzIiwiZHJhZ2dhYmxlIiwiZWFzaW5nIiwiZWRnZUZyaWN0aW9uIiwiZmFkZSIsImZvY3VzT25TZWxlY3QiLCJmb2N1c09uQ2hhbmdlIiwiaW5pdGlhbFNsaWRlIiwibGF6eUxvYWQiLCJtb2JpbGVGaXJzdCIsInBhdXNlT25Ib3ZlciIsInBhdXNlT25Gb2N1cyIsInBhdXNlT25Eb3RzSG92ZXIiLCJyZXNwb25kVG8iLCJyZXNwb25zaXZlIiwicm93cyIsInNsaWRlIiwic2xpZGVzUGVyUm93Iiwic2xpZGVzVG9TaG93Iiwic2xpZGVzVG9TY3JvbGwiLCJzcGVlZCIsInN3aXBlVG9TbGlkZSIsInRvdWNoTW92ZSIsInRvdWNoVGhyZXNob2xkIiwidXNlQ1NTIiwidXNlVHJhbnNmb3JtIiwidmFyaWFibGVXaWR0aCIsInZlcnRpY2FsIiwidmVydGljYWxTd2lwaW5nIiwid2FpdEZvckFuaW1hdGUiLCJ6SW5kZXgiLCJpbml0aWFscyIsImFuaW1hdGluZyIsImRyYWdnaW5nIiwiYXV0b1BsYXlUaW1lciIsImN1cnJlbnREaXJlY3Rpb24iLCJjdXJyZW50TGVmdCIsImN1cnJlbnRTbGlkZSIsImRpcmVjdGlvbiIsIiRkb3RzIiwibGlzdFdpZHRoIiwibGlzdEhlaWdodCIsImxvYWRJbmRleCIsIiRuZXh0QXJyb3ciLCIkcHJldkFycm93Iiwic2Nyb2xsaW5nIiwic2xpZGVDb3VudCIsInNsaWRlV2lkdGgiLCIkc2xpZGVUcmFjayIsIiRzbGlkZXMiLCJzbGlkaW5nIiwic2xpZGVPZmZzZXQiLCJzd2lwZUxlZnQiLCJzd2lwaW5nIiwiJGxpc3QiLCJ0b3VjaE9iamVjdCIsInRyYW5zZm9ybXNFbmFibGVkIiwidW5zbGlja2VkIiwiYWN0aXZlQnJlYWtwb2ludCIsImFuaW1UeXBlIiwiYW5pbVByb3AiLCJicmVha3BvaW50cyIsImJyZWFrcG9pbnRTZXR0aW5ncyIsImNzc1RyYW5zaXRpb25zIiwiZm9jdXNzZWQiLCJpbnRlcnJ1cHRlZCIsImhpZGRlbiIsInBhdXNlZCIsInBvc2l0aW9uUHJvcCIsInJvd0NvdW50Iiwic2hvdWxkQ2xpY2siLCIkc2xpZGVyIiwiJHNsaWRlc0NhY2hlIiwidHJhbnNmb3JtVHlwZSIsInRyYW5zaXRpb25UeXBlIiwidmlzaWJpbGl0eUNoYW5nZSIsIndpbmRvd1dpZHRoIiwid2luZG93VGltZXIiLCJvcmlnaW5hbFNldHRpbmdzIiwibW96SGlkZGVuIiwid2Via2l0SGlkZGVuIiwiYXV0b1BsYXkiLCJwcm94eSIsImF1dG9QbGF5Q2xlYXIiLCJhdXRvUGxheUl0ZXJhdG9yIiwiY2hhbmdlU2xpZGUiLCJjbGlja0hhbmRsZXIiLCJzZWxlY3RIYW5kbGVyIiwic2V0UG9zaXRpb24iLCJzd2lwZUhhbmRsZXIiLCJkcmFnSGFuZGxlciIsImtleUhhbmRsZXIiLCJodG1sRXhwciIsInJlZ2lzdGVyQnJlYWtwb2ludHMiLCJhY3RpdmF0ZUFEQSIsImFkZFNsaWRlIiwic2xpY2tBZGQiLCJtYXJrdXAiLCJpbmRleCIsImFkZEJlZm9yZSIsInVubG9hZCIsImluc2VydEFmdGVyIiwicHJlcGVuZFRvIiwiZGV0YWNoIiwiYXBwZW5kIiwicmVpbml0IiwiYW5pbWF0ZUhlaWdodCIsInRhcmdldEhlaWdodCIsIm91dGVySGVpZ2h0IiwiYW5pbWF0ZVNsaWRlIiwidGFyZ2V0TGVmdCIsImFuaW1Qcm9wcyIsImFuaW1TdGFydCIsInN0ZXAiLCJjZWlsIiwiYXBwbHlUcmFuc2l0aW9uIiwiZGlzYWJsZVRyYW5zaXRpb24iLCJnZXROYXZUYXJnZXQiLCJzbGljayIsInNsaWRlSGFuZGxlciIsInRyYW5zaXRpb24iLCJzZXRJbnRlcnZhbCIsImNsZWFySW50ZXJ2YWwiLCJzbGlkZVRvIiwiYnVpbGRBcnJvd3MiLCJhZGQiLCJidWlsZERvdHMiLCJkb3QiLCJnZXREb3RDb3VudCIsImJ1aWxkT3V0Iiwid3JhcEFsbCIsIndyYXAiLCJzZXR1cEluZmluaXRlIiwidXBkYXRlRG90cyIsInNldFNsaWRlQ2xhc3NlcyIsImJ1aWxkUm93cyIsImEiLCJiIiwiYyIsIm5ld1NsaWRlcyIsIm51bU9mU2xpZGVzIiwib3JpZ2luYWxTbGlkZXMiLCJzbGlkZXNQZXJTZWN0aW9uIiwiY3JlYXRlRG9jdW1lbnRGcmFnbWVudCIsInJvdyIsImFwcGVuZENoaWxkIiwiZW1wdHkiLCJjaGVja1Jlc3BvbnNpdmUiLCJpbml0aWFsIiwiZm9yY2VVcGRhdGUiLCJicmVha3BvaW50IiwidGFyZ2V0QnJlYWtwb2ludCIsInJlc3BvbmRUb1dpZHRoIiwidHJpZ2dlckJyZWFrcG9pbnQiLCJzbGlkZXJXaWR0aCIsImlubmVyV2lkdGgiLCJtaW4iLCJ1bnNsaWNrIiwicmVmcmVzaCIsImRvbnRBbmltYXRlIiwiY3VycmVudFRhcmdldCIsImluZGV4T2Zmc2V0IiwidW5ldmVuT2Zmc2V0IiwibWVzc2FnZSIsImNoZWNrTmF2aWdhYmxlIiwibmF2aWdhYmxlcyIsInByZXZOYXZpZ2FibGUiLCJnZXROYXZpZ2FibGVJbmRleGVzIiwibiIsImNsZWFuVXBFdmVudHMiLCJpbnRlcnJ1cHQiLCJ2aXNpYmlsaXR5IiwiY2xlYW5VcFNsaWRlRXZlbnRzIiwib3JpZW50YXRpb25DaGFuZ2UiLCJyZXNpemUiLCJjbGVhblVwUm93cyIsInN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbiIsImRlc3Ryb3kiLCJyZW1vdmUiLCJmYWRlU2xpZGUiLCJzbGlkZUluZGV4Iiwib3BhY2l0eSIsImZhZGVTbGlkZU91dCIsImZpbHRlclNsaWRlcyIsInNsaWNrRmlsdGVyIiwiZm9jdXNIYW5kbGVyIiwiJHNmIiwiZ2V0Q3VycmVudCIsInNsaWNrQ3VycmVudFNsaWRlIiwiYnJlYWtQb2ludCIsImNvdW50ZXIiLCJwYWdlclF0eSIsImdldExlZnQiLCJ2ZXJ0aWNhbEhlaWdodCIsInZlcnRpY2FsT2Zmc2V0IiwidGFyZ2V0U2xpZGUiLCJjb2VmIiwiZmxvb3IiLCJvZmZzZXRMZWZ0Iiwib3V0ZXJXaWR0aCIsImdldE9wdGlvbiIsInNsaWNrR2V0T3B0aW9uIiwib3B0aW9uIiwiaW5kZXhlcyIsImdldFNsaWNrIiwiZ2V0U2xpZGVDb3VudCIsInNsaWRlc1RyYXZlcnNlZCIsInN3aXBlZFNsaWRlIiwiY2VudGVyT2Zmc2V0IiwiZ29UbyIsInNsaWNrR29UbyIsInBhcnNlSW50IiwiY3JlYXRpb24iLCJoYXNDbGFzcyIsInNldFByb3BzIiwic3RhcnRMb2FkIiwibG9hZFNsaWRlciIsImluaXRpYWxpemVFdmVudHMiLCJ1cGRhdGVBcnJvd3MiLCJpbml0QURBIiwibnVtRG90R3JvdXBzIiwidGFiQ29udHJvbEluZGV4ZXMiLCJzbGlkZUNvbnRyb2xJbmRleCIsImFyaWFCdXR0b25Db250cm9sIiwibWFwcGVkU2xpZGVJbmRleCIsImluaXRBcnJvd0V2ZW50cyIsImluaXREb3RFdmVudHMiLCJpbml0U2xpZGVFdmVudHMiLCJhY3Rpb24iLCJpbml0VUkiLCJ0YWdOYW1lIiwibWF0Y2giLCJsb2FkUmFuZ2UiLCJjbG9uZVJhbmdlIiwicmFuZ2VTdGFydCIsInJhbmdlRW5kIiwibG9hZEltYWdlcyIsImltYWdlc1Njb3BlIiwiaW1hZ2UiLCJpbWFnZVNvdXJjZSIsImltYWdlU3JjU2V0IiwiaW1hZ2VTaXplcyIsImltYWdlVG9Mb2FkIiwib25sb2FkIiwib25lcnJvciIsInByZXZTbGlkZSIsIm5leHRTbGlkZSIsInByb2dyZXNzaXZlTGF6eUxvYWQiLCJuZXh0Iiwic2xpY2tOZXh0Iiwic2xpY2tQYXVzZSIsInBsYXkiLCJzbGlja1BsYXkiLCJwb3N0U2xpZGUiLCIkY3VycmVudFNsaWRlIiwicHJldiIsInNsaWNrUHJldiIsInRyeUNvdW50IiwiJGltZ3NUb0xvYWQiLCJpbml0aWFsaXppbmciLCJsYXN0VmlzaWJsZUluZGV4IiwiY3VycmVudEJyZWFrcG9pbnQiLCJsIiwicmVzcG9uc2l2ZVNldHRpbmdzIiwic29ydCIsIndpbmRvd0RlbGF5IiwicmVtb3ZlU2xpZGUiLCJzbGlja1JlbW92ZSIsInJlbW92ZUJlZm9yZSIsInJlbW92ZUFsbCIsInNldENTUyIsInBvc2l0aW9uUHJvcHMiLCJzZXREaW1lbnNpb25zIiwicGFkZGluZyIsInNldEZhZGUiLCJzZXRIZWlnaHQiLCJzZXRPcHRpb24iLCJzbGlja1NldE9wdGlvbiIsIml0ZW0iLCJib2R5U3R5bGUiLCJXZWJraXRUcmFuc2l0aW9uIiwiTW96VHJhbnNpdGlvbiIsIm1zVHJhbnNpdGlvbiIsIk9UcmFuc2Zvcm0iLCJwZXJzcGVjdGl2ZVByb3BlcnR5Iiwid2Via2l0UGVyc3BlY3RpdmUiLCJNb3pUcmFuc2Zvcm0iLCJNb3pQZXJzcGVjdGl2ZSIsIndlYmtpdFRyYW5zZm9ybSIsIm1zVHJhbnNmb3JtIiwidHJhbnNmb3JtIiwiYWxsU2xpZGVzIiwicmVtYWluZGVyIiwiZXZlbkNvZWYiLCJpbmZpbml0ZUNvdW50IiwiY2xvbmUiLCJ0b2dnbGUiLCJ0YXJnZXRFbGVtZW50IiwicGFyZW50cyIsInN5bmMiLCJhbmltU2xpZGUiLCJvbGRTbGlkZSIsInNsaWRlTGVmdCIsIm5hdlRhcmdldCIsInN3aXBlRGlyZWN0aW9uIiwieERpc3QiLCJ5RGlzdCIsInIiLCJzd2lwZUFuZ2xlIiwic3RhcnRYIiwiY3VyWCIsInN0YXJ0WSIsImN1clkiLCJhdGFuMiIsIlBJIiwic3dpcGVFbmQiLCJzd2lwZUxlbmd0aCIsImVkZ2VIaXQiLCJtaW5Td2lwZSIsImZpbmdlckNvdW50Iiwib3JpZ2luYWxFdmVudCIsInN3aXBlU3RhcnQiLCJzd2lwZU1vdmUiLCJlZGdlV2FzSGl0IiwiY3VyTGVmdCIsInBvc2l0aW9uT2Zmc2V0IiwidmVydGljYWxTd2lwZUxlbmd0aCIsInNxcnQiLCJ1bmZpbHRlclNsaWRlcyIsInNsaWNrVW5maWx0ZXIiLCJmcm9tQnJlYWtwb2ludCIsInNsaWRlcnMiLCJoZXJvIiwicHJvZHVjdHMiLCJyZWFkeSIsImZpeGVkIiwiaGVhZGVyIiwiY29udGFpbmVyIiwic2Nyb2xsIiwic2Nyb2xsVG9wIiwibW9iaWxlIiwiaGVhZGVyTWVudSIsImljb25zIiwib3BlbiIsImNsaWNrIiwidG9nZ2xlQ2xhc3MiLCJtb2RhbCIsImZhZGVUb2dnbGUiLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwiaG9zdG5hbWUiLCJoYXNoIl0sIm1hcHBpbmdzIjoiOztBQUFBLENBQUMsVUFBU0EsQ0FBVCxFQUFZOztBQUViOztBQUVBLE1BQUlDLHFCQUFxQixPQUF6Qjs7QUFFQTtBQUNBO0FBQ0EsTUFBSUMsYUFBYTtBQUNmQyxhQUFTRixrQkFETTs7QUFHZjs7O0FBR0FHLGNBQVUsRUFOSzs7QUFRZjs7O0FBR0FDLFlBQVEsRUFYTzs7QUFhZjs7O0FBR0FDLFNBQUssWUFBVTtBQUNiLGFBQU9OLEVBQUUsTUFBRixFQUFVTyxJQUFWLENBQWUsS0FBZixNQUEwQixLQUFqQztBQUNELEtBbEJjO0FBbUJmOzs7O0FBSUFDLFlBQVEsVUFBU0EsTUFBVCxFQUFpQkMsSUFBakIsRUFBdUI7QUFDN0I7QUFDQTtBQUNBLFVBQUlDLFlBQWFELFFBQVFFLGFBQWFILE1BQWIsQ0FBekI7QUFDQTtBQUNBO0FBQ0EsVUFBSUksV0FB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UTVLLEtBQVI7QUFDRDtBQUNGLE9BWEQ7QUFZRDtBQUNGO0FBQ0YsQ0F2QkQiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIiFmdW5jdGlvbigkKSB7XG5cblwidXNlIHN0cmljdFwiO1xuXG52YXIgRk9VTkRBVElPTl9WRVJTSU9OID0gJzYuMy4xJztcblxuLy8gR2xvYmFsIEZvdW5kYXRpb24gb2JqZWN0XG4vLyBUaGlzIGlzIGF0dGFjaGVkIHRvIHRoZSB3aW5kb3csIG9yIHVzZWQgYXMgYSBtb2R1bGUgZm9yIEFNRC9Ccm93c2VyaWZ5XG52YXIgRm91bmRhdGlvbiA9IHtcbiAgdmVyc2lvbjogRk9VTkRBVElPTl9WRVJTSU9OLFxuXG4gIC8qKlxuICAgKiBTdG9yZXMgaW5pdGlhbGl6ZWQgcGx1Z2lucy5cbiAgICovXG4gIF9wbHVnaW5zOiB7fSxcblxuICAvKipcbiAgICogU3RvcmVzIGdlbmVyYXRlZCB1bmlxdWUgaWRzIGZvciBwbHVnaW4gaW5zdGFuY2VzXG4gICAqL1xuICBfdXVpZHM6IFtdLFxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgYm9vbGVhbiBmb3IgUlRMIHN1cHBvcnRcbiAgICovXG4gIHJ0bDogZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gJCgnaHRtbCcpLmF0dHIoJ2RpcicpID09PSAncnRsJztcbiAgfSxcbiAgLyoqXG4gICAqIERlZmluZXMgYSBGb3VuZGF0aW9uIHBsdWdpbiwgYWRkaW5nIGl0IHRvIHRoZSBgRm91bmRhdGlvbmAgbmFtZXNwYWNlIGFuZCB0aGUgbGlzdCBvZiBwbHVnaW5zIHRvIGluaXRpYWxpemUgd2hlbiByZWZsb3dpbmcuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBwbHVnaW4gLSBUaGUgY29uc3RydWN0b3Igb2YgdGhlIHBsdWdpbi5cbiAgICovXG4gIHBsdWdpbjogZnVuY3Rpb24ocGx1Z2luLCBuYW1lKSB7XG4gICAgLy8gT2JqZWN0IGtleSB0byB1c2Ugd2hlbiBhZGRpbmcgdG8gZ2xvYmFsIEZvdW5kYXRpb24gb2JqZWN0XG4gICAgLy8gRXhhbXBsZXM6IEZvdW5kYXRpb24uUmV2ZWFsLCBGb3VuZGF0aW9uLk9mZkNhbnZhc1xuICAgIHZhciBjbGFzc05hbWUgPSAobmFtZSB8fCBmdW5jdGlvbk5hbWUocGx1Z2luKSk7XG4gICAgLy8gT2JqZWN0IGtleSB0byB1c2Ugd2hlbiBzdG9yaW5nIHRoZSBwbHVnaW4sIGFsc28gdXNlZCB0byBjcmVhdGUgdGhlIGlkZW50aWZ5aW5nIGRhdGEgYXR0cmlidXRlIGZvciB0aGUgcGx1Z2luXG4gICAgLy8gRXhhbXBsZXM6IGRhdGEtcmV2ZWFsLCBkYXRhLW9mZi1jYW52YXNcbiAgICB2YXIgYXR0ck5hbWUgID0gaHlwaGVuYXRlKGNsYXNzTmFtZSk7XG5cbiAgICAvLyBBZGQgdG8gdGhlIEZvdW5kYXRpb24gb2JqZWN0IGFuZCB0aGUgcGx1Z2lucyBsaXN0IChmb3IgcmVmbG93aW5nKVxuICAgIHRoaXMuX3BsdWdpbnNbYXR0ck5hbWVdID0gdGhpc1tjbGFzc05hbWVdID0gcGx1Z2luO1xuICB9LFxuICAvKipcbiAgICogQGZ1bmN0aW9uXG4gICAqIFBvcHVsYXRlcyB0aGUgX3V1aWRzIGFycmF5IHdpdGggcG9pbnRlcnMgdG8gZWFjaCBpbmRpdmlkdWFsIHBsdWdpbiBpbnN0YW5jZS5cbiAgICogQWRkcyB0aGUgYHpmUGx1Z2luYCBkYXRhLWF0dHJpYnV0ZSB0byBwcm9ncmFtbWF0aWNhbGx5IGNyZWF0ZWQgcGx1Z2lucyB0byBhbGxvdyB1c2Ugb2YgJChzZWxlY3RvcikuZm91bmRhdGlvbihtZXRob2QpIGNhbGxzLlxuICAgKiBBbHNvIGZpcmVzIHRoZSBpbml0aWFsaXphdGlvbiBldmVudCBmb3IgZWFjaCBwbHVnaW4sIGNvbnNvbGlkYXRpbmcgcmVwZXRpdGl2ZSBjb2RlLlxuICAgKiBAcGFyYW0ge09iamVjdH0gcGx1Z2luIC0gYW4gaW5zdGFuY2Ugb2YgYSBwbHVnaW4sIHVzdWFsbHkgYHRoaXNgIGluIGNvbnRleHQuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIC0gdGhlIG5hbWUgb2YgdGhlIHBsdWdpbiwgcGFzc2VkIGFzIGEgY2FtZWxDYXNlZCBzdHJpbmcuXG4gICAqIEBmaXJlcyBQbHVnaW4jaW5pdFxuICAgKi9cbiAgcmVnaXN0ZXJQbHVnaW46IGZ1bmN0aW9uKHBsdWdpbiwgbmFtZSl7XG4gICAgdmFyIHBsdWdpbk5hbWUgPSBuYW1lID8gaHlwaGVuYXRlKG5hbWUpIDogZnVuY3Rpb25OYW1lKHBsdWdpbi5jb25zdHJ1Y3RvcikudG9Mb3dlckNhc2UoKTtcbiAgICBwbHVnaW4udXVpZCA9IHRoaXMuR2V0WW9EaWdpdHMoNiwgcGx1Z2luTmFtZSk7XG5cbiAgICBpZighcGx1Z2luLiRlbGVtZW50LmF0dHIoYGRhdGEtJHtwbHVnaW5OYW1lfWApKXsgcGx1Z2luLiRlbGVtZW50LmF0dHIoYGRhdGEtJHtwbHVnaW5OYW1lfWAsIHBsdWdpbi51dWlkKTsgfVxuICAgIGlmKCFwbHVnaW4uJGVsZW1lbnQuZGF0YSgnemZQbHVnaW4nKSl7IHBsdWdpbi4kZWxlbWVudC5kYXRhKCd6ZlBsdWdpbicsIHBsdWdpbik7IH1cbiAgICAgICAgICAvKipcbiAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSBwbHVnaW4gaGFzIGluaXRpYWxpemVkLlxuICAgICAgICAgICAqIEBldmVudCBQbHVnaW4jaW5pdFxuICAgICAgICAgICAqL1xuICAgIHBsdWdpbi4kZWxlbWVudC50cmlnZ2VyKGBpbml0LnpmLiR7cGx1Z2luTmFtZX1gKTtcblxuICAgIHRoaXMuX3V1aWRzLnB1c2gocGx1Z2luLnV1aWQpO1xuXG4gICAgcmV0dXJuO1xuICB9LFxuICAvKipcbiAgICogQGZ1bmN0aW9uXG4gICAqIFJlbW92ZXMgdGhlIHBsdWdpbnMgdXVpZCBmcm9tIHRoZSBfdXVpZHMgYXJyYXkuXG4gICAqIFJlbW92ZXMgdGhlIHpmUGx1Z2luIGRhdGEgYXR0cmlidXRlLCBhcyB3ZWxsIGFzIHRoZSBkYXRhLXBsdWdpbi1uYW1lIGF0dHJpYnV0ZS5cbiAgICogQWxzbyBmaXJlcyB0aGUgZGVzdHJveWVkIGV2ZW50IGZvciB0aGUgcGx1Z2luLCBjb25zb2xpZGF0aW5nIHJlcGV0aXRpdmUgY29kZS5cbiAgICogQHBhcmFtIHtPYmplY3R9IHBsdWdpbiAtIGFuIGluc3RhbmNlIG9mIGEgcGx1Z2luLCB1c3VhbGx5IGB0aGlzYCBpbiBjb250ZXh0LlxuICAgKiBAZmlyZXMgUGx1Z2luI2Rlc3Ryb3llZFxuICAgKi9cbiAgdW5yZWdpc3RlclBsdWdpbjogZnVuY3Rpb24ocGx1Z2luKXtcbiAgICB2YXIgcGx1Z2luTmFtZSA9IGh5cGhlbmF0ZShmdW5jdGlvbk5hbWUocGx1Z2luLiRlbGVtZW50LmRhdGEoJ3pmUGx1Z2luJykuY29uc3RydWN0b3IpKTtcblxuICAgIHRoaXMuX3V1aWRzLnNwbGljZSh0aGlzLl91dWlkcy5pbmRleE9mKHBsdWdpbi51dWlkKSwgMSk7XG4gICAgcGx1Z2luLiRlbGVtZW50LnJlbW92ZUF0dHIoYGRhdGEtJHtwbHVnaW5OYW1lfWApLnJlbW92ZURhdGEoJ3pmUGx1Z2luJylcbiAgICAgICAgICAvKipcbiAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSBwbHVnaW4gaGFzIGJlZW4gZGVzdHJveWVkLlxuICAgICAgICAgICAqIEBldmVudCBQbHVnaW4jZGVzdHJveWVkXG4gICAgICAgICAgICovXG4gICAgICAgICAgLnRyaWdnZXIoYGRlc3Ryb3llZC56Zi4ke3BsdWdpbk5hbWV9YCk7XG4gICAgZm9yKHZhciBwcm9wIGluIHBsdWdpbil7XG4gICAgICBwbHVnaW5bcHJvcF0gPSBudWxsOy8vY2xlYW4gdXAgc2NyaXB0IHRvIHByZXAgZm9yIGdhcmJhZ2UgY29sbGVjdGlvbi5cbiAgICB9XG4gICAgcmV0dXJuO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAZnVuY3Rpb25cbiAgICogQ2F1c2VzIG9uZSBvciBtb3JlIGFjdGl2ZSBwbHVnaW5zIHRvIHJlLWluaXRpYWxpemUsIHJlc2V0dGluZyBldmVudCBsaXN0ZW5lcnMsIHJlY2FsY3VsYXRpbmcgcG9zaXRpb25zLCBldGMuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwbHVnaW5zIC0gb3B0aW9uYWwgc3RyaW5nIG9mIGFuIGluZGl2aWR1YWwgcGx1Z2luIGtleSwgYXR0YWluZWQgYnkgY2FsbGluZyBgJChlbGVtZW50KS5kYXRhKCdwbHVnaW5OYW1lJylgLCBvciBzdHJpbmcgb2YgYSBwbHVnaW4gY2xhc3MgaS5lLiBgJ2Ryb3Bkb3duJ2BcbiAgICogQGRlZmF1bHQgSWYgbm8gYXJndW1lbnQgaXMgcGFzc2VkLCByZWZsb3cgYWxsIGN1cnJlbnRseSBhY3RpdmUgcGx1Z2lucy5cbiAgICovXG4gICByZUluaXQ6IGZ1bmN0aW9uKHBsdWdpbnMpe1xuICAgICB2YXIgaXNKUSA9IHBsdWdpbnMgaW5zdGFuY2VvZiAkO1xuICAgICB0cnl7XG4gICAgICAgaWYoaXNKUSl7XG4gICAgICAgICBwbHVnaW5zLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgJCh0aGlzKS5kYXRhKCd6ZlBsdWdpbicpLl9pbml0KCk7XG4gICAgICAgICB9KTtcbiAgICAgICB9ZWxzZXtcbiAgICAgICAgIHZhciB0eXBlID0gdHlwZW9mIHBsdWdpbnMsXG4gICAgICAgICBfdGhpcyA9IHRoaXMsXG4gICAgICAgICBmbnMgPSB7XG4gICAgICAgICAgICdvYmplY3QnOiBmdW5jdGlvbihwbGdzKXtcbiAgICAgICAgICAgICBwbGdzLmZvckVhY2goZnVuY3Rpb24ocCl7XG4gICAgICAgICAgICAgICBwID0gaHlwaGVuYXRlKHApO1xuICAgICAgICAgICAgICAgJCgnW2RhdGEtJysgcCArJ10nKS5mb3VuZGF0aW9uKCdfaW5pdCcpO1xuICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICB9LFxuICAgICAgICAgICAnc3RyaW5nJzogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICBwbHVnaW5zID0gaHlwaGVuYXRlKHBsdWdpbnMpO1xuICAgICAgICAgICAgICQoJ1tkYXRhLScrIHBsdWdpbnMgKyddJykuZm91bmRhdGlvbignX2luaXQnKTtcbiAgICAgICAgICAgfSxcbiAgICAgICAgICAgJ3VuZGVmaW5lZCc6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgdGhpc1snb2JqZWN0J10oT2JqZWN0LmtleXMoX3RoaXMuX3BsdWdpbnMpKTtcbiAgICAgICAgICAgfVxuICAgICAgICAgfTtcbiAgICAgICAgIGZuc1t0eXBlXShwbHVnaW5zKTtcbiAgICAgICB9XG4gICAgIH1jYXRjaChlcnIpe1xuICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgfWZpbmFsbHl7XG4gICAgICAgcmV0dXJuIHBsdWdpbnM7XG4gICAgIH1cbiAgIH0sXG5cbiAgLyoqXG4gICAqIHJldHVybnMgYSByYW5kb20gYmFzZS0zNiB1aWQgd2l0aCBuYW1lc3BhY2luZ1xuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtOdW1iZXJ9IGxlbmd0aCAtIG51bWJlciBvZiByYW5kb20gYmFzZS0zNiBkaWdpdHMgZGVzaXJlZC4gSW5jcmVhc2UgZm9yIG1vcmUgcmFuZG9tIHN0cmluZ3MuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lc3BhY2UgLSBuYW1lIG9mIHBsdWdpbiB0byBiZSBpbmNvcnBvcmF0ZWQgaW4gdWlkLCBvcHRpb25hbC5cbiAgICogQGRlZmF1bHQge1N0cmluZ30gJycgLSBpZiBubyBwbHVnaW4gbmFtZSBpcyBwcm92aWRlZCwgbm90aGluZyBpcyBhcHBlbmRlZCB0byB0aGUgdWlkLlxuICAgKiBAcmV0dXJucyB7U3RyaW5nfSAtIHVuaXF1ZSBpZFxuICAgKi9cbiAgR2V0WW9EaWdpdHM6IGZ1bmN0aW9uKGxlbmd0aCwgbmFtZXNwYWNlKXtcbiAgICBsZW5ndGggPSBsZW5ndGggfHwgNjtcbiAgICByZXR1cm4gTWF0aC5yb3VuZCgoTWF0aC5wb3coMzYsIGxlbmd0aCArIDEpIC0gTWF0aC5yYW5kb20oKSAqIE1hdGgucG93KDM2LCBsZW5ndGgpKSkudG9TdHJpbmcoMzYpLnNsaWNlKDEpICsgKG5hbWVzcGFjZSA/IGAtJHtuYW1lc3BhY2V9YCA6ICcnKTtcbiAgfSxcbiAgLyoqXG4gICAqIEluaXRpYWxpemUgcGx1Z2lucyBvbiBhbnkgZWxlbWVudHMgd2l0aGluIGBlbGVtYCAoYW5kIGBlbGVtYCBpdHNlbGYpIHRoYXQgYXJlbid0IGFscmVhZHkgaW5pdGlhbGl6ZWQuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtIC0galF1ZXJ5IG9iamVjdCBjb250YWluaW5nIHRoZSBlbGVtZW50IHRvIGNoZWNrIGluc2lkZS4gQWxzbyBjaGVja3MgdGhlIGVsZW1lbnQgaXRzZWxmLCB1bmxlc3MgaXQncyB0aGUgYGRvY3VtZW50YCBvYmplY3QuXG4gICAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fSBwbHVnaW5zIC0gQSBsaXN0IG9mIHBsdWdpbnMgdG8gaW5pdGlhbGl6ZS4gTGVhdmUgdGhpcyBvdXQgdG8gaW5pdGlhbGl6ZSBldmVyeXRoaW5nLlxuICAgKi9cbiAgcmVmbG93OiBmdW5jdGlvbihlbGVtLCBwbHVnaW5zKSB7XG5cbiAgICAvLyBJZiBwbHVnaW5zIGlzIHVuZGVmaW5lZCwganVzdCBncmFiIGV2ZXJ5dGhpbmdcbiAgICBpZiAodHlwZW9mIHBsdWdpbnMgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBwbHVnaW5zID0gT2JqZWN0LmtleXModGhpcy5fcGx1Z2lucyk7XG4gICAgfVxuICAgIC8vIElmIHBsdWdpbnMgaXMgYSBzdHJpbmcsIGNvbnZlcnQgaXQgdG8gYW4gYXJyYXkgd2l0aCBvbmUgaXRlbVxuICAgIGVsc2UgaWYgKHR5cGVvZiBwbHVnaW5zID09PSAnc3RyaW5nJykge1xuICAgICAgcGx1Z2lucyA9IFtwbHVnaW5zXTtcbiAgICB9XG5cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGVhY2ggcGx1Z2luXG4gICAgJC5lYWNoKHBsdWdpbnMsIGZ1bmN0aW9uKGksIG5hbWUpIHtcbiAgICAgIC8vIEdldCB0aGUgY3VycmVudCBwbHVnaW5cbiAgICAgIHZhciBwbHVnaW4gPSBfdGhpcy5fcGx1Z2luc1tuYW1lXTtcblxuICAgICAgLy8gTG9jYWxpemUgdGhlIHNlYXJjaCB0byBhbGwgZWxlbWVudHMgaW5zaWRlIGVsZW0sIGFzIHdlbGwgYXMgZWxlbSBpdHNlbGYsIHVubGVzcyBlbGVtID09PSBkb2N1bWVudFxuICAgICAgdmFyICRlbGVtID0gJChlbGVtKS5maW5kKCdbZGF0YS0nK25hbWUrJ10nKS5hZGRCYWNrKCdbZGF0YS0nK25hbWUrJ10nKTtcblxuICAgICAgLy8gRm9yIGVhY2ggcGx1Z2luIGZvdW5kLCBpbml0aWFsaXplIGl0XG4gICAgICAkZWxlbS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgJGVsID0gJCh0aGlzKSxcbiAgICAgICAgICAgIG9wdHMgPSB7fTtcbiAgICAgICAgLy8gRG9uJ3QgZG91YmxlLWRpcCBvbiBwbHVnaW5zXG4gICAgICAgIGlmICgkZWwuZGF0YSgnemZQbHVnaW4nKSkge1xuICAgICAgICAgIGNvbnNvbGUud2FybihcIlRyaWVkIHRvIGluaXRpYWxpemUgXCIrbmFtZStcIiBvbiBhbiBlbGVtZW50IHRoYXQgYWxyZWFkeSBoYXMgYSBGb3VuZGF0aW9uIHBsdWdpbi5cIik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoJGVsLmF0dHIoJ2RhdGEtb3B0aW9ucycpKXtcbiAgICAgICAgICB2YXIgdGhpbmcgPSAkZWwuYXR0cignZGF0YS1vcHRpb25zJykuc3BsaXQoJzsnKS5mb3JFYWNoKGZ1bmN0aW9uKGUsIGkpe1xuICAgICAgICAgICAgdmFyIG9wdCA9IGUuc3BsaXQoJzonKS5tYXAoZnVuY3Rpb24oZWwpeyByZXR1cm4gZWwudHJpbSgpOyB9KTtcbiAgICAgICAgICAgIGlmKG9wdFswXSkgb3B0c1tvcHRbMF1dID0gcGFyc2VWYWx1ZShvcHRbMV0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAkZWwuZGF0YSgnemZQbHVnaW4nLCBuZXcgcGx1Z2luKCQodGhpcyksIG9wdHMpKTtcbiAgICAgICAgfWNhdGNoKGVyKXtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGVyKTtcbiAgICAgICAgfWZpbmFsbHl7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSxcbiAgZ2V0Rm5OYW1lOiBmdW5jdGlvbk5hbWUsXG4gIHRyYW5zaXRpb25lbmQ6IGZ1bmN0aW9uKCRlbGVtKXtcbiAgICB2YXIgdHJhbnNpdGlvbnMgPSB7XG4gICAgICAndHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJyxcbiAgICAgICdXZWJraXRUcmFuc2l0aW9uJzogJ3dlYmtpdFRyYW5zaXRpb25FbmQnLFxuICAgICAgJ01velRyYW5zaXRpb24nOiAndHJhbnNpdGlvbmVuZCcsXG4gICAgICAnT1RyYW5zaXRpb24nOiAnb3RyYW5zaXRpb25lbmQnXG4gICAgfTtcbiAgICB2YXIgZWxlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLFxuICAgICAgICBlbmQ7XG5cbiAgICBmb3IgKHZhciB0IGluIHRyYW5zaXRpb25zKXtcbiAgICAgIGlmICh0eXBlb2YgZWxlbS5zdHlsZVt0XSAhPT0gJ3VuZGVmaW5lZCcpe1xuICAgICAgICBlbmQgPSB0cmFuc2l0aW9uc1t0XTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYoZW5kKXtcbiAgICAgIHJldHVybiBlbmQ7XG4gICAgfWVsc2V7XG4gICAgICBlbmQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICRlbGVtLnRyaWdnZXJIYW5kbGVyKCd0cmFuc2l0aW9uZW5kJywgWyRlbGVtXSk7XG4gICAgICB9LCAxKTtcbiAgICAgIHJldHVybiAndHJhbnNpdGlvbmVuZCc7XG4gICAgfVxuICB9XG59O1xuXG5Gb3VuZGF0aW9uLnV0aWwgPSB7XG4gIC8qKlxuICAgKiBGdW5jdGlvbiBmb3IgYXBwbHlpbmcgYSBkZWJvdW5jZSBlZmZlY3QgdG8gYSBmdW5jdGlvbiBjYWxsLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyAtIEZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCBlbmQgb2YgdGltZW91dC5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IGRlbGF5IC0gVGltZSBpbiBtcyB0byBkZWxheSB0aGUgY2FsbCBvZiBgZnVuY2AuXG4gICAqIEByZXR1cm5zIGZ1bmN0aW9uXG4gICAqL1xuICB0aHJvdHRsZTogZnVuY3Rpb24gKGZ1bmMsIGRlbGF5KSB7XG4gICAgdmFyIHRpbWVyID0gbnVsbDtcblxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgY29udGV4dCA9IHRoaXMsIGFyZ3MgPSBhcmd1bWVudHM7XG5cbiAgICAgIGlmICh0aW1lciA9PT0gbnVsbCkge1xuICAgICAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgICAgdGltZXIgPSBudWxsO1xuICAgICAgICB9LCBkZWxheSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxufTtcblxuLy8gVE9ETzogY29uc2lkZXIgbm90IG1ha2luZyB0aGlzIGEgalF1ZXJ5IGZ1bmN0aW9uXG4vLyBUT0RPOiBuZWVkIHdheSB0byByZWZsb3cgdnMuIHJlLWluaXRpYWxpemVcbi8qKlxuICogVGhlIEZvdW5kYXRpb24galF1ZXJ5IG1ldGhvZC5cbiAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fSBtZXRob2QgLSBBbiBhY3Rpb24gdG8gcGVyZm9ybSBvbiB0aGUgY3VycmVudCBqUXVlcnkgb2JqZWN0LlxuICovXG52YXIgZm91bmRhdGlvbiA9IGZ1bmN0aW9uKG1ldGhvZCkge1xuICB2YXIgdHlwZSA9IHR5cGVvZiBtZXRob2QsXG4gICAgICAkbWV0YSA9ICQoJ21ldGEuZm91bmRhdGlvbi1tcScpLFxuICAgICAgJG5vSlMgPSAkKCcubm8tanMnKTtcblxuICBpZighJG1ldGEubGVuZ3RoKXtcbiAgICAkKCc8bWV0YSBjbGFzcz1cImZvdW5kYXRpb24tbXFcIj4nKS5hcHBlbmRUbyhkb2N1bWVudC5oZWFkKTtcbiAgfVxuICBpZigkbm9KUy5sZW5ndGgpe1xuICAgICRub0pTLnJlbW92ZUNsYXNzKCduby1qcycpO1xuICB9XG5cbiAgaWYodHlwZSA9PT0gJ3VuZGVmaW5lZCcpey8vbmVlZHMgdG8gaW5pdGlhbGl6ZSB0aGUgRm91bmRhdGlvbiBvYmplY3QsIG9yIGFuIGluZGl2aWR1YWwgcGx1Z2luLlxuICAgIEZvdW5kYXRpb24uTWVkaWFRdWVyeS5faW5pdCgpO1xuICAgIEZvdW5kYXRpb24ucmVmbG93KHRoaXMpO1xuICB9ZWxzZSBpZih0eXBlID09PSAnc3RyaW5nJyl7Ly9hbiBpbmRpdmlkdWFsIG1ldGhvZCB0byBpbnZva2Ugb24gYSBwbHVnaW4gb3IgZ3JvdXAgb2YgcGx1Z2luc1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTsvL2NvbGxlY3QgYWxsIHRoZSBhcmd1bWVudHMsIGlmIG5lY2Vzc2FyeVxuICAgIHZhciBwbHVnQ2xhc3MgPSB0aGlzLmRhdGEoJ3pmUGx1Z2luJyk7Ly9kZXRlcm1pbmUgdGhlIGNsYXNzIG9mIHBsdWdpblxuXG4gICAgaWYocGx1Z0NsYXNzICE9PSB1bmRlZmluZWQgJiYgcGx1Z0NsYXNzW21ldGhvZF0gIT09IHVuZGVmaW5lZCl7Ly9tYWtlIHN1cmUgYm90aCB0aGUgY2xhc3MgYW5kIG1ldGhvZCBleGlzdFxuICAgICAgaWYodGhpcy5sZW5ndGggPT09IDEpey8vaWYgdGhlcmUncyBvbmx5IG9uZSwgY2FsbCBpdCBkaXJlY3RseS5cbiAgICAgICAgICBwbHVnQ2xhc3NbbWV0aG9kXS5hcHBseShwbHVnQ2xhc3MsIGFyZ3MpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHRoaXMuZWFjaChmdW5jdGlvbihpLCBlbCl7Ly9vdGhlcndpc2UgbG9vcCB0aHJvdWdoIHRoZSBqUXVlcnkgY29sbGVjdGlvbiBhbmQgaW52b2tlIHRoZSBtZXRob2Qgb24gZWFjaFxuICAgICAgICAgIHBsdWdDbGFzc1ttZXRob2RdLmFwcGx5KCQoZWwpLmRhdGEoJ3pmUGx1Z2luJyksIGFyZ3MpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9ZWxzZXsvL2Vycm9yIGZvciBubyBjbGFzcyBvciBubyBtZXRob2RcbiAgICAgIHRocm93IG5ldyBSZWZlcmVuY2VFcnJvcihcIldlJ3JlIHNvcnJ5LCAnXCIgKyBtZXRob2QgKyBcIicgaXMgbm90IGFuIGF2YWlsYWJsZSBtZXRob2QgZm9yIFwiICsgKHBsdWdDbGFzcyA/IGZ1bmN0aW9uTmFtZShwbHVnQ2xhc3MpIDogJ3RoaXMgZWxlbWVudCcpICsgJy4nKTtcbiAgICB9XG4gIH1lbHNley8vZXJyb3IgZm9yIGludmFsaWQgYXJndW1lbnQgdHlwZVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFdlJ3JlIHNvcnJ5LCAke3R5cGV9IGlzIG5vdCBhIHZhbGlkIHBhcmFtZXRlci4gWW91IG11c3QgdXNlIGEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgbWV0aG9kIHlvdSB3aXNoIHRvIGludm9rZS5gKTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbndpbmRvdy5Gb3VuZGF0aW9uID0gRm91bmRhdGlvbjtcbiQuZm4uZm91bmRhdGlvbiA9IGZvdW5kYXRpb247XG5cbi8vIFBvbHlmaWxsIGZvciByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbihmdW5jdGlvbigpIHtcbiAgaWYgKCFEYXRlLm5vdyB8fCAhd2luZG93LkRhdGUubm93KVxuICAgIHdpbmRvdy5EYXRlLm5vdyA9IERhdGUubm93ID0gZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgfTtcblxuICB2YXIgdmVuZG9ycyA9IFsnd2Via2l0JywgJ21veiddO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHZlbmRvcnMubGVuZ3RoICYmICF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lOyArK2kpIHtcbiAgICAgIHZhciB2cCA9IHZlbmRvcnNbaV07XG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZwKydSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcbiAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9ICh3aW5kb3dbdnArJ0NhbmNlbEFuaW1hdGlvbkZyYW1lJ11cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IHdpbmRvd1t2cCsnQ2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ10pO1xuICB9XG4gIGlmICgvaVAoYWR8aG9uZXxvZCkuKk9TIDYvLnRlc3Qod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQpXG4gICAgfHwgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgIXdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSkge1xuICAgIHZhciBsYXN0VGltZSA9IDA7XG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICAgICAgICB2YXIgbmV4dFRpbWUgPSBNYXRoLm1heChsYXN0VGltZSArIDE2LCBub3cpO1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2sobGFzdFRpbWUgPSBuZXh0VGltZSk7IH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG5leHRUaW1lIC0gbm93KTtcbiAgICB9O1xuICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9IGNsZWFyVGltZW91dDtcbiAgfVxuICAvKipcbiAgICogUG9seWZpbGwgZm9yIHBlcmZvcm1hbmNlLm5vdywgcmVxdWlyZWQgYnkgckFGXG4gICAqL1xuICBpZighd2luZG93LnBlcmZvcm1hbmNlIHx8ICF3aW5kb3cucGVyZm9ybWFuY2Uubm93KXtcbiAgICB3aW5kb3cucGVyZm9ybWFuY2UgPSB7XG4gICAgICBzdGFydDogRGF0ZS5ub3coKSxcbiAgICAgIG5vdzogZnVuY3Rpb24oKXsgcmV0dXJuIERhdGUubm93KCkgLSB0aGlzLnN0YXJ0OyB9XG4gICAgfTtcbiAgfVxufSkoKTtcbmlmICghRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQpIHtcbiAgRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgPSBmdW5jdGlvbihvVGhpcykge1xuICAgIGlmICh0eXBlb2YgdGhpcyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgLy8gY2xvc2VzdCB0aGluZyBwb3NzaWJsZSB0byB0aGUgRUNNQVNjcmlwdCA1XG4gICAgICAvLyBpbnRlcm5hbCBJc0NhbGxhYmxlIGZ1bmN0aW9uXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdGdW5jdGlvbi5wcm90b3R5cGUuYmluZCAtIHdoYXQgaXMgdHJ5aW5nIHRvIGJlIGJvdW5kIGlzIG5vdCBjYWxsYWJsZScpO1xuICAgIH1cblxuICAgIHZhciBhQXJncyAgID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSxcbiAgICAgICAgZlRvQmluZCA9IHRoaXMsXG4gICAgICAgIGZOT1AgICAgPSBmdW5jdGlvbigpIHt9LFxuICAgICAgICBmQm91bmQgID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIGZUb0JpbmQuYXBwbHkodGhpcyBpbnN0YW5jZW9mIGZOT1BcbiAgICAgICAgICAgICAgICAgPyB0aGlzXG4gICAgICAgICAgICAgICAgIDogb1RoaXMsXG4gICAgICAgICAgICAgICAgIGFBcmdzLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgICAgIH07XG5cbiAgICBpZiAodGhpcy5wcm90b3R5cGUpIHtcbiAgICAgIC8vIG5hdGl2ZSBmdW5jdGlvbnMgZG9uJ3QgaGF2ZSBhIHByb3RvdHlwZVxuICAgICAgZk5PUC5wcm90b3R5cGUgPSB0aGlzLnByb3RvdHlwZTtcbiAgICB9XG4gICAgZkJvdW5kLnByb3RvdHlwZSA9IG5ldyBmTk9QKCk7XG5cbiAgICByZXR1cm4gZkJvdW5kO1xuICB9O1xufVxuLy8gUG9seWZpbGwgdG8gZ2V0IHRoZSBuYW1lIG9mIGEgZnVuY3Rpb24gaW4gSUU5XG5mdW5jdGlvbiBmdW5jdGlvbk5hbWUoZm4pIHtcbiAgaWYgKEZ1bmN0aW9uLnByb3RvdHlwZS5uYW1lID09PSB1bmRlZmluZWQpIHtcbiAgICB2YXIgZnVuY05hbWVSZWdleCA9IC9mdW5jdGlvblxccyhbXihdezEsfSlcXCgvO1xuICAgIHZhciByZXN1bHRzID0gKGZ1bmNOYW1lUmVnZXgpLmV4ZWMoKGZuKS50b1N0cmluZygpKTtcbiAgICByZXR1cm4gKHJlc3VsdHMgJiYgcmVzdWx0cy5sZW5ndGggPiAxKSA/IHJlc3VsdHNbMV0udHJpbSgpIDogXCJcIjtcbiAgfVxuICBlbHNlIGlmIChmbi5wcm90b3R5cGUgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBmbi5jb25zdHJ1Y3Rvci5uYW1lO1xuICB9XG4gIGVsc2Uge1xuICAgIHJldHVybiBmbi5wcm90b3R5cGUuY29uc3RydWN0b3IubmFtZTtcbiAgfVxufVxuZnVuY3Rpb24gcGFyc2VWYWx1ZShzdHIpe1xuICBpZiAoJ3RydWUnID09PSBzdHIpIHJldHVybiB0cnVlO1xuICBlbHNlIGlmICgnZmFsc2UnID09PSBzdHIpIHJldHVybiBmYWxzZTtcbiAgZWxzZSBpZiAoIWlzTmFOKHN0ciAqIDEpKSByZXR1cm4gcGFyc2VGbG9hdChzdHIpO1xuICByZXR1cm4gc3RyO1xufVxuLy8gQ29udmVydCBQYXNjYWxDYXNlIHRvIGtlYmFiLWNhc2Vcbi8vIFRoYW5rIHlvdTogaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvODk1NTU4MFxuZnVuY3Rpb24gaHlwaGVuYXRlKHN0cikge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoLyhbYS16XSkoW0EtWl0pL2csICckMS0kMicpLnRvTG93ZXJDYXNlKCk7XG59XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuRm91bmRhdGlvbi5Cb3ggPSB7XG4gIEltTm90VG91Y2hpbmdZb3U6IEltTm90VG91Y2hpbmdZb3UsXG4gIEdldERpbWVuc2lvbnM6IEdldERpbWVuc2lvbnMsXG4gIEdldE9mZnNldHM6IEdldE9mZnNldHNcbn1cblxuLyoqXG4gKiBDb21wYXJlcyB0aGUgZGltZW5zaW9ucyBvZiBhbiBlbGVtZW50IHRvIGEgY29udGFpbmVyIGFuZCBkZXRlcm1pbmVzIGNvbGxpc2lvbiBldmVudHMgd2l0aCBjb250YWluZXIuXG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byB0ZXN0IGZvciBjb2xsaXNpb25zLlxuICogQHBhcmFtIHtqUXVlcnl9IHBhcmVudCAtIGpRdWVyeSBvYmplY3QgdG8gdXNlIGFzIGJvdW5kaW5nIGNvbnRhaW5lci5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gbHJPbmx5IC0gc2V0IHRvIHRydWUgdG8gY2hlY2sgbGVmdCBhbmQgcmlnaHQgdmFsdWVzIG9ubHkuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHRiT25seSAtIHNldCB0byB0cnVlIHRvIGNoZWNrIHRvcCBhbmQgYm90dG9tIHZhbHVlcyBvbmx5LlxuICogQGRlZmF1bHQgaWYgbm8gcGFyZW50IG9iamVjdCBwYXNzZWQsIGRldGVjdHMgY29sbGlzaW9ucyB3aXRoIGB3aW5kb3dgLlxuICogQHJldHVybnMge0Jvb2xlYW59IC0gdHJ1ZSBpZiBjb2xsaXNpb24gZnJlZSwgZmFsc2UgaWYgYSBjb2xsaXNpb24gaW4gYW55IGRpcmVjdGlvbi5cbiAqL1xuZnVuY3Rpb24gSW1Ob3RUb3VjaGluZ1lvdShlbGVtZW50LCBwYXJlbnQsIGxyT25seSwgdGJPbmx5KSB7XG4gIHZhciBlbGVEaW1zID0gR2V0RGltZW5zaW9ucyhlbGVtZW50KSxcbiAgICAgIHRvcCwgYm90dG9tLCBsZWZ0LCByaWdodDtcblxuICBpZiAocGFyZW50KSB7XG4gICAgdmFyIHBhckRpbXMgPSBHZXREaW1lbnNpb25zKHBhcmVudCk7XG5cbiAgICBib3R0b20gPSAoZWxlRGltcy5vZmZzZXQudG9wICsgZWxlRGltcy5oZWlnaHQgPD0gcGFyRGltcy5oZWlnaHQgKyBwYXJEaW1zLm9mZnNldC50b3ApO1xuICAgIHRvcCAgICA9IChlbGVEaW1zLm9mZnNldC50b3AgPj0gcGFyRGltcy5vZmZzZXQudG9wKTtcbiAgICBsZWZ0ICAgPSAoZWxlRGltcy5vZmZzZXQubGVmdCA+PSBwYXJEaW1zLm9mZnNldC5sZWZ0KTtcbiAgICByaWdodCAgPSAoZWxlRGltcy5vZmZzZXQubGVmdCArIGVsZURpbXMud2lkdGggPD0gcGFyRGltcy53aWR0aCArIHBhckRpbXMub2Zmc2V0LmxlZnQpO1xuICB9XG4gIGVsc2Uge1xuICAgIGJvdHRvbSA9IChlbGVEaW1zLm9mZnNldC50b3AgKyBlbGVEaW1zLmhlaWdodCA8PSBlbGVEaW1zLndpbmRvd0RpbXMuaGVpZ2h0ICsgZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3ApO1xuICAgIHRvcCAgICA9IChlbGVEaW1zLm9mZnNldC50b3AgPj0gZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3ApO1xuICAgIGxlZnQgICA9IChlbGVEaW1zLm9mZnNldC5sZWZ0ID49IGVsZURpbXMud2luZG93RGltcy5vZmZzZXQubGVmdCk7XG4gICAgcmlnaHQgID0gKGVsZURpbXMub2Zmc2V0LmxlZnQgKyBlbGVEaW1zLndpZHRoIDw9IGVsZURpbXMud2luZG93RGltcy53aWR0aCk7XG4gIH1cblxuICB2YXIgYWxsRGlycyA9IFtib3R0b20sIHRvcCwgbGVmdCwgcmlnaHRdO1xuXG4gIGlmIChsck9ubHkpIHtcbiAgICByZXR1cm4gbGVmdCA9PT0gcmlnaHQgPT09IHRydWU7XG4gIH1cblxuICBpZiAodGJPbmx5KSB7XG4gICAgcmV0dXJuIHRvcCA9PT0gYm90dG9tID09PSB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGFsbERpcnMuaW5kZXhPZihmYWxzZSkgPT09IC0xO1xufTtcblxuLyoqXG4gKiBVc2VzIG5hdGl2ZSBtZXRob2RzIHRvIHJldHVybiBhbiBvYmplY3Qgb2YgZGltZW5zaW9uIHZhbHVlcy5cbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtqUXVlcnkgfHwgSFRNTH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3Qgb3IgRE9NIGVsZW1lbnQgZm9yIHdoaWNoIHRvIGdldCB0aGUgZGltZW5zaW9ucy4gQ2FuIGJlIGFueSBlbGVtZW50IG90aGVyIHRoYXQgZG9jdW1lbnQgb3Igd2luZG93LlxuICogQHJldHVybnMge09iamVjdH0gLSBuZXN0ZWQgb2JqZWN0IG9mIGludGVnZXIgcGl4ZWwgdmFsdWVzXG4gKiBUT0RPIC0gaWYgZWxlbWVudCBpcyB3aW5kb3csIHJldHVybiBvbmx5IHRob3NlIHZhbHVlcy5cbiAqL1xuZnVuY3Rpb24gR2V0RGltZW5zaW9ucyhlbGVtLCB0ZXN0KXtcbiAgZWxlbSA9IGVsZW0ubGVuZ3RoID8gZWxlbVswXSA6IGVsZW07XG5cbiAgaWYgKGVsZW0gPT09IHdpbmRvdyB8fCBlbGVtID09PSBkb2N1bWVudCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkknbSBzb3JyeSwgRGF2ZS4gSSdtIGFmcmFpZCBJIGNhbid0IGRvIHRoYXQuXCIpO1xuICB9XG5cbiAgdmFyIHJlY3QgPSBlbGVtLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgcGFyUmVjdCA9IGVsZW0ucGFyZW50Tm9kZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgIHdpblJlY3QgPSBkb2N1bWVudC5ib2R5LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgd2luWSA9IHdpbmRvdy5wYWdlWU9mZnNldCxcbiAgICAgIHdpblggPSB3aW5kb3cucGFnZVhPZmZzZXQ7XG5cbiAgcmV0dXJuIHtcbiAgICB3aWR0aDogcmVjdC53aWR0aCxcbiAgICBoZWlnaHQ6IHJlY3QuaGVpZ2h0LFxuICAgIG9mZnNldDoge1xuICAgICAgdG9wOiByZWN0LnRvcCArIHdpblksXG4gICAgICBsZWZ0OiByZWN0LmxlZnQgKyB3aW5YXG4gICAgfSxcbiAgICBwYXJlbnREaW1zOiB7XG4gICAgICB3aWR0aDogcGFyUmVjdC53aWR0aCxcbiAgICAgIGhlaWdodDogcGFyUmVjdC5oZWlnaHQsXG4gICAgICBvZmZzZXQ6IHtcbiAgICAgICAgdG9wOiBwYXJSZWN0LnRvcCArIHdpblksXG4gICAgICAgIGxlZnQ6IHBhclJlY3QubGVmdCArIHdpblhcbiAgICAgIH1cbiAgICB9LFxuICAgIHdpbmRvd0RpbXM6IHtcbiAgICAgIHdpZHRoOiB3aW5SZWN0LndpZHRoLFxuICAgICAgaGVpZ2h0OiB3aW5SZWN0LmhlaWdodCxcbiAgICAgIG9mZnNldDoge1xuICAgICAgICB0b3A6IHdpblksXG4gICAgICAgIGxlZnQ6IHdpblhcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIG9iamVjdCBvZiB0b3AgYW5kIGxlZnQgaW50ZWdlciBwaXhlbCB2YWx1ZXMgZm9yIGR5bmFtaWNhbGx5IHJlbmRlcmVkIGVsZW1lbnRzLFxuICogc3VjaCBhczogVG9vbHRpcCwgUmV2ZWFsLCBhbmQgRHJvcGRvd25cbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZWxlbWVudCBiZWluZyBwb3NpdGlvbmVkLlxuICogQHBhcmFtIHtqUXVlcnl9IGFuY2hvciAtIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBlbGVtZW50J3MgYW5jaG9yIHBvaW50LlxuICogQHBhcmFtIHtTdHJpbmd9IHBvc2l0aW9uIC0gYSBzdHJpbmcgcmVsYXRpbmcgdG8gdGhlIGRlc2lyZWQgcG9zaXRpb24gb2YgdGhlIGVsZW1lbnQsIHJlbGF0aXZlIHRvIGl0J3MgYW5jaG9yXG4gKiBAcGFyYW0ge051bWJlcn0gdk9mZnNldCAtIGludGVnZXIgcGl4ZWwgdmFsdWUgb2YgZGVzaXJlZCB2ZXJ0aWNhbCBzZXBhcmF0aW9uIGJldHdlZW4gYW5jaG9yIGFuZCBlbGVtZW50LlxuICogQHBhcmFtIHtOdW1iZXJ9IGhPZmZzZXQgLSBpbnRlZ2VyIHBpeGVsIHZhbHVlIG9mIGRlc2lyZWQgaG9yaXpvbnRhbCBzZXBhcmF0aW9uIGJldHdlZW4gYW5jaG9yIGFuZCBlbGVtZW50LlxuICogQHBhcmFtIHtCb29sZWFufSBpc092ZXJmbG93IC0gaWYgYSBjb2xsaXNpb24gZXZlbnQgaXMgZGV0ZWN0ZWQsIHNldHMgdG8gdHJ1ZSB0byBkZWZhdWx0IHRoZSBlbGVtZW50IHRvIGZ1bGwgd2lkdGggLSBhbnkgZGVzaXJlZCBvZmZzZXQuXG4gKiBUT0RPIGFsdGVyL3Jld3JpdGUgdG8gd29yayB3aXRoIGBlbWAgdmFsdWVzIGFzIHdlbGwvaW5zdGVhZCBvZiBwaXhlbHNcbiAqL1xuZnVuY3Rpb24gR2V0T2Zmc2V0cyhlbGVtZW50LCBhbmNob3IsIHBvc2l0aW9uLCB2T2Zmc2V0LCBoT2Zmc2V0LCBpc092ZXJmbG93KSB7XG4gIHZhciAkZWxlRGltcyA9IEdldERpbWVuc2lvbnMoZWxlbWVudCksXG4gICAgICAkYW5jaG9yRGltcyA9IGFuY2hvciA/IEdldERpbWVuc2lvbnMoYW5jaG9yKSA6IG51bGw7XG5cbiAgc3dpdGNoIChwb3NpdGlvbikge1xuICAgIGNhc2UgJ3RvcCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoRm91bmRhdGlvbi5ydGwoKSA/ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0IC0gJGVsZURpbXMud2lkdGggKyAkYW5jaG9yRGltcy53aWR0aCA6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0KSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wIC0gKCRlbGVEaW1zLmhlaWdodCArIHZPZmZzZXQpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdsZWZ0JzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0IC0gKCRlbGVEaW1zLndpZHRoICsgaE9mZnNldCksXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcFxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncmlnaHQnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAkYW5jaG9yRGltcy53aWR0aCArIGhPZmZzZXQsXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcFxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2VudGVyIHRvcCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAoJGFuY2hvckRpbXMud2lkdGggLyAyKSkgLSAoJGVsZURpbXMud2lkdGggLyAyKSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wIC0gKCRlbGVEaW1zLmhlaWdodCArIHZPZmZzZXQpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjZW50ZXIgYm90dG9tJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6IGlzT3ZlcmZsb3cgPyBoT2Zmc2V0IDogKCgkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICgkYW5jaG9yRGltcy53aWR0aCAvIDIpKSAtICgkZWxlRGltcy53aWR0aCAvIDIpKSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0ICsgdk9mZnNldFxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2VudGVyIGxlZnQnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgLSAoJGVsZURpbXMud2lkdGggKyBoT2Zmc2V0KSxcbiAgICAgICAgdG9wOiAoJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICgkYW5jaG9yRGltcy5oZWlnaHQgLyAyKSkgLSAoJGVsZURpbXMuaGVpZ2h0IC8gMilcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2NlbnRlciByaWdodCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICRhbmNob3JEaW1zLndpZHRoICsgaE9mZnNldCArIDEsXG4gICAgICAgIHRvcDogKCRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAoJGFuY2hvckRpbXMuaGVpZ2h0IC8gMikpIC0gKCRlbGVEaW1zLmhlaWdodCAvIDIpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjZW50ZXInOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogKCRlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LmxlZnQgKyAoJGVsZURpbXMud2luZG93RGltcy53aWR0aCAvIDIpKSAtICgkZWxlRGltcy53aWR0aCAvIDIpLFxuICAgICAgICB0b3A6ICgkZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3AgKyAoJGVsZURpbXMud2luZG93RGltcy5oZWlnaHQgLyAyKSkgLSAoJGVsZURpbXMuaGVpZ2h0IC8gMilcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3JldmVhbCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoJGVsZURpbXMud2luZG93RGltcy53aWR0aCAtICRlbGVEaW1zLndpZHRoKSAvIDIsXG4gICAgICAgIHRvcDogJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQudG9wICsgdk9mZnNldFxuICAgICAgfVxuICAgIGNhc2UgJ3JldmVhbCBmdWxsJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LmxlZnQsXG4gICAgICAgIHRvcDogJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQudG9wXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdsZWZ0IGJvdHRvbSc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0ICsgdk9mZnNldFxuICAgICAgfTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3JpZ2h0IGJvdHRvbSc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICRhbmNob3JEaW1zLndpZHRoICsgaE9mZnNldCAtICRlbGVEaW1zLndpZHRoLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAkYW5jaG9yRGltcy5oZWlnaHQgKyB2T2Zmc2V0XG4gICAgICB9O1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6IChGb3VuZGF0aW9uLnJ0bCgpID8gJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgLSAkZWxlRGltcy53aWR0aCArICRhbmNob3JEaW1zLndpZHRoIDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyBoT2Zmc2V0KSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0ICsgdk9mZnNldFxuICAgICAgfVxuICB9XG59XG5cbn0oalF1ZXJ5KTtcbiIsIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogVGhpcyB1dGlsIHdhcyBjcmVhdGVkIGJ5IE1hcml1cyBPbGJlcnR6ICpcbiAqIFBsZWFzZSB0aGFuayBNYXJpdXMgb24gR2l0SHViIC9vd2xiZXJ0eiAqXG4gKiBvciB0aGUgd2ViIGh0dHA6Ly93d3cubWFyaXVzb2xiZXJ0ei5kZS8gKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuY29uc3Qga2V5Q29kZXMgPSB7XG4gIDk6ICdUQUInLFxuICAxMzogJ0VOVEVSJyxcbiAgMjc6ICdFU0NBUEUnLFxuICAzMjogJ1NQQUNFJyxcbiAgMzc6ICdBUlJPV19MRUZUJyxcbiAgMzg6ICdBUlJPV19VUCcsXG4gIDM5OiAnQVJST1dfUklHSFQnLFxuICA0MDogJ0FSUk9XX0RPV04nXG59XG5cbnZhciBjb21tYW5kcyA9IHt9XG5cbnZhciBLZXlib2FyZCA9IHtcbiAga2V5czogZ2V0S2V5Q29kZXMoa2V5Q29kZXMpLFxuXG4gIC8qKlxuICAgKiBQYXJzZXMgdGhlIChrZXlib2FyZCkgZXZlbnQgYW5kIHJldHVybnMgYSBTdHJpbmcgdGhhdCByZXByZXNlbnRzIGl0cyBrZXlcbiAgICogQ2FuIGJlIHVzZWQgbGlrZSBGb3VuZGF0aW9uLnBhcnNlS2V5KGV2ZW50KSA9PT0gRm91bmRhdGlvbi5rZXlzLlNQQUNFXG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IC0gdGhlIGV2ZW50IGdlbmVyYXRlZCBieSB0aGUgZXZlbnQgaGFuZGxlclxuICAgKiBAcmV0dXJuIFN0cmluZyBrZXkgLSBTdHJpbmcgdGhhdCByZXByZXNlbnRzIHRoZSBrZXkgcHJlc3NlZFxuICAgKi9cbiAgcGFyc2VLZXkoZXZlbnQpIHtcbiAgICB2YXIga2V5ID0ga2V5Q29kZXNbZXZlbnQud2hpY2ggfHwgZXZlbnQua2V5Q29kZV0gfHwgU3RyaW5nLmZyb21DaGFyQ29kZShldmVudC53aGljaCkudG9VcHBlckNhc2UoKTtcblxuICAgIC8vIFJlbW92ZSB1bi1wcmludGFibGUgY2hhcmFjdGVycywgZS5nLiBmb3IgYGZyb21DaGFyQ29kZWAgY2FsbHMgZm9yIENUUkwgb25seSBldmVudHNcbiAgICBrZXkgPSBrZXkucmVwbGFjZSgvXFxXKy8sICcnKTtcblxuICAgIGlmIChldmVudC5zaGlmdEtleSkga2V5ID0gYFNISUZUXyR7a2V5fWA7XG4gICAgaWYgKGV2ZW50LmN0cmxLZXkpIGtleSA9IGBDVFJMXyR7a2V5fWA7XG4gICAgaWYgKGV2ZW50LmFsdEtleSkga2V5ID0gYEFMVF8ke2tleX1gO1xuXG4gICAgLy8gUmVtb3ZlIHRyYWlsaW5nIHVuZGVyc2NvcmUsIGluIGNhc2Ugb25seSBtb2RpZmllcnMgd2VyZSB1c2VkIChlLmcuIG9ubHkgYENUUkxfQUxUYClcbiAgICBrZXkgPSBrZXkucmVwbGFjZSgvXyQvLCAnJyk7XG5cbiAgICByZXR1cm4ga2V5O1xuICB9LFxuXG4gIC8qKlxuICAgKiBIYW5kbGVzIHRoZSBnaXZlbiAoa2V5Ym9hcmQpIGV2ZW50XG4gICAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50IC0gdGhlIGV2ZW50IGdlbmVyYXRlZCBieSB0aGUgZXZlbnQgaGFuZGxlclxuICAgKiBAcGFyYW0ge1N0cmluZ30gY29tcG9uZW50IC0gRm91bmRhdGlvbiBjb21wb25lbnQncyBuYW1lLCBlLmcuIFNsaWRlciBvciBSZXZlYWxcbiAgICogQHBhcmFtIHtPYmplY3RzfSBmdW5jdGlvbnMgLSBjb2xsZWN0aW9uIG9mIGZ1bmN0aW9ucyB0aGF0IGFyZSB0byBiZSBleGVjdXRlZFxuICAgKi9cbiAgaGFuZGxlS2V5KGV2ZW50LCBjb21wb25lbnQsIGZ1bmN0aW9ucykge1xuICAgIHZhciBjb21tYW5kTGlzdCA9IGNvbW1hbmRzW2NvbXBvbmVudF0sXG4gICAgICBrZXlDb2RlID0gdGhpcy5wYXJzZUtleShldmVudCksXG4gICAgICBjbWRzLFxuICAgICAgY29tbWFuZCxcbiAgICAgIGZuO1xuXG4gICAgaWYgKCFjb21tYW5kTGlzdCkgcmV0dXJuIGNvbnNvbGUud2FybignQ29tcG9uZW50IG5vdCBkZWZpbmVkIScpO1xuXG4gICAgaWYgKHR5cGVvZiBjb21tYW5kTGlzdC5sdHIgPT09ICd1bmRlZmluZWQnKSB7IC8vIHRoaXMgY29tcG9uZW50IGRvZXMgbm90IGRpZmZlcmVudGlhdGUgYmV0d2VlbiBsdHIgYW5kIHJ0bFxuICAgICAgICBjbWRzID0gY29tbWFuZExpc3Q7IC8vIHVzZSBwbGFpbiBsaXN0XG4gICAgfSBlbHNlIHsgLy8gbWVyZ2UgbHRyIGFuZCBydGw6IGlmIGRvY3VtZW50IGlzIHJ0bCwgcnRsIG92ZXJ3cml0ZXMgbHRyIGFuZCB2aWNlIHZlcnNhXG4gICAgICAgIGlmIChGb3VuZGF0aW9uLnJ0bCgpKSBjbWRzID0gJC5leHRlbmQoe30sIGNvbW1hbmRMaXN0Lmx0ciwgY29tbWFuZExpc3QucnRsKTtcblxuICAgICAgICBlbHNlIGNtZHMgPSAkLmV4dGVuZCh7fSwgY29tbWFuZExpc3QucnRsLCBjb21tYW5kTGlzdC5sdHIpO1xuICAgIH1cbiAgICBjb21tYW5kID0gY21kc1trZXlDb2RlXTtcblxuICAgIGZuID0gZnVuY3Rpb25zW2NvbW1hbmRdO1xuICAgIGlmIChmbiAmJiB0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicpIHsgLy8gZXhlY3V0ZSBmdW5jdGlvbiAgaWYgZXhpc3RzXG4gICAgICB2YXIgcmV0dXJuVmFsdWUgPSBmbi5hcHBseSgpO1xuICAgICAgaWYgKGZ1bmN0aW9ucy5oYW5kbGVkIHx8IHR5cGVvZiBmdW5jdGlvbnMuaGFuZGxlZCA9PT0gJ2Z1bmN0aW9uJykgeyAvLyBleGVjdXRlIGZ1bmN0aW9uIHdoZW4gZXZlbnQgd2FzIGhhbmRsZWRcbiAgICAgICAgICBmdW5jdGlvbnMuaGFuZGxlZChyZXR1cm5WYWx1ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChmdW5jdGlvbnMudW5oYW5kbGVkIHx8IHR5cGVvZiBmdW5jdGlvbnMudW5oYW5kbGVkID09PSAnZnVuY3Rpb24nKSB7IC8vIGV4ZWN1dGUgZnVuY3Rpb24gd2hlbiBldmVudCB3YXMgbm90IGhhbmRsZWRcbiAgICAgICAgICBmdW5jdGlvbnMudW5oYW5kbGVkKCk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBGaW5kcyBhbGwgZm9jdXNhYmxlIGVsZW1lbnRzIHdpdGhpbiB0aGUgZ2l2ZW4gYCRlbGVtZW50YFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIHNlYXJjaCB3aXRoaW5cbiAgICogQHJldHVybiB7alF1ZXJ5fSAkZm9jdXNhYmxlIC0gYWxsIGZvY3VzYWJsZSBlbGVtZW50cyB3aXRoaW4gYCRlbGVtZW50YFxuICAgKi9cbiAgZmluZEZvY3VzYWJsZSgkZWxlbWVudCkge1xuICAgIGlmKCEkZWxlbWVudCkge3JldHVybiBmYWxzZTsgfVxuICAgIHJldHVybiAkZWxlbWVudC5maW5kKCdhW2hyZWZdLCBhcmVhW2hyZWZdLCBpbnB1dDpub3QoW2Rpc2FibGVkXSksIHNlbGVjdDpub3QoW2Rpc2FibGVkXSksIHRleHRhcmVhOm5vdChbZGlzYWJsZWRdKSwgYnV0dG9uOm5vdChbZGlzYWJsZWRdKSwgaWZyYW1lLCBvYmplY3QsIGVtYmVkLCAqW3RhYmluZGV4XSwgKltjb250ZW50ZWRpdGFibGVdJykuZmlsdGVyKGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCEkKHRoaXMpLmlzKCc6dmlzaWJsZScpIHx8ICQodGhpcykuYXR0cigndGFiaW5kZXgnKSA8IDApIHsgcmV0dXJuIGZhbHNlOyB9IC8vb25seSBoYXZlIHZpc2libGUgZWxlbWVudHMgYW5kIHRob3NlIHRoYXQgaGF2ZSBhIHRhYmluZGV4IGdyZWF0ZXIgb3IgZXF1YWwgMFxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGNvbXBvbmVudCBuYW1lIG5hbWVcbiAgICogQHBhcmFtIHtPYmplY3R9IGNvbXBvbmVudCAtIEZvdW5kYXRpb24gY29tcG9uZW50LCBlLmcuIFNsaWRlciBvciBSZXZlYWxcbiAgICogQHJldHVybiBTdHJpbmcgY29tcG9uZW50TmFtZVxuICAgKi9cblxuICByZWdpc3Rlcihjb21wb25lbnROYW1lLCBjbWRzKSB7XG4gICAgY29tbWFuZHNbY29tcG9uZW50TmFtZV0gPSBjbWRzO1xuICB9LCAgXG5cbiAgLyoqXG4gICAqIFRyYXBzIHRoZSBmb2N1cyBpbiB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICogQHBhcmFtICB7alF1ZXJ5fSAkZWxlbWVudCAgalF1ZXJ5IG9iamVjdCB0byB0cmFwIHRoZSBmb3VjcyBpbnRvLlxuICAgKi9cbiAgdHJhcEZvY3VzKCRlbGVtZW50KSB7XG4gICAgdmFyICRmb2N1c2FibGUgPSBGb3VuZGF0aW9uLktleWJvYXJkLmZpbmRGb2N1c2FibGUoJGVsZW1lbnQpLFxuICAgICAgICAkZmlyc3RGb2N1c2FibGUgPSAkZm9jdXNhYmxlLmVxKDApLFxuICAgICAgICAkbGFzdEZvY3VzYWJsZSA9ICRmb2N1c2FibGUuZXEoLTEpO1xuXG4gICAgJGVsZW1lbnQub24oJ2tleWRvd24uemYudHJhcGZvY3VzJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIGlmIChldmVudC50YXJnZXQgPT09ICRsYXN0Rm9jdXNhYmxlWzBdICYmIEZvdW5kYXRpb24uS2V5Ym9hcmQucGFyc2VLZXkoZXZlbnQpID09PSAnVEFCJykge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAkZmlyc3RGb2N1c2FibGUuZm9jdXMoKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGV2ZW50LnRhcmdldCA9PT0gJGZpcnN0Rm9jdXNhYmxlWzBdICYmIEZvdW5kYXRpb24uS2V5Ym9hcmQucGFyc2VLZXkoZXZlbnQpID09PSAnU0hJRlRfVEFCJykge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAkbGFzdEZvY3VzYWJsZS5mb2N1cygpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICAvKipcbiAgICogUmVsZWFzZXMgdGhlIHRyYXBwZWQgZm9jdXMgZnJvbSB0aGUgZ2l2ZW4gZWxlbWVudC5cbiAgICogQHBhcmFtICB7alF1ZXJ5fSAkZWxlbWVudCAgalF1ZXJ5IG9iamVjdCB0byByZWxlYXNlIHRoZSBmb2N1cyBmb3IuXG4gICAqL1xuICByZWxlYXNlRm9jdXMoJGVsZW1lbnQpIHtcbiAgICAkZWxlbWVudC5vZmYoJ2tleWRvd24uemYudHJhcGZvY3VzJyk7XG4gIH1cbn1cblxuLypcbiAqIENvbnN0YW50cyBmb3IgZWFzaWVyIGNvbXBhcmluZy5cbiAqIENhbiBiZSB1c2VkIGxpa2UgRm91bmRhdGlvbi5wYXJzZUtleShldmVudCkgPT09IEZvdW5kYXRpb24ua2V5cy5TUEFDRVxuICovXG5mdW5jdGlvbiBnZXRLZXlDb2RlcyhrY3MpIHtcbiAgdmFyIGsgPSB7fTtcbiAgZm9yICh2YXIga2MgaW4ga2NzKSBrW2tjc1trY11dID0ga2NzW2tjXTtcbiAgcmV0dXJuIGs7XG59XG5cbkZvdW5kYXRpb24uS2V5Ym9hcmQgPSBLZXlib2FyZDtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vLyBEZWZhdWx0IHNldCBvZiBtZWRpYSBxdWVyaWVzXG5jb25zdCBkZWZhdWx0UXVlcmllcyA9IHtcbiAgJ2RlZmF1bHQnIDogJ29ubHkgc2NyZWVuJyxcbiAgbGFuZHNjYXBlIDogJ29ubHkgc2NyZWVuIGFuZCAob3JpZW50YXRpb246IGxhbmRzY2FwZSknLFxuICBwb3J0cmFpdCA6ICdvbmx5IHNjcmVlbiBhbmQgKG9yaWVudGF0aW9uOiBwb3J0cmFpdCknLFxuICByZXRpbmEgOiAnb25seSBzY3JlZW4gYW5kICgtd2Via2l0LW1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCcgK1xuICAgICdvbmx5IHNjcmVlbiBhbmQgKG1pbi0tbW96LWRldmljZS1waXhlbC1yYXRpbzogMiksJyArXG4gICAgJ29ubHkgc2NyZWVuIGFuZCAoLW8tbWluLWRldmljZS1waXhlbC1yYXRpbzogMi8xKSwnICtcbiAgICAnb25seSBzY3JlZW4gYW5kIChtaW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwnICtcbiAgICAnb25seSBzY3JlZW4gYW5kIChtaW4tcmVzb2x1dGlvbjogMTkyZHBpKSwnICtcbiAgICAnb25seSBzY3JlZW4gYW5kIChtaW4tcmVzb2x1dGlvbjogMmRwcHgpJ1xufTtcblxudmFyIE1lZGlhUXVlcnkgPSB7XG4gIHF1ZXJpZXM6IFtdLFxuXG4gIGN1cnJlbnQ6ICcnLFxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgbWVkaWEgcXVlcnkgaGVscGVyLCBieSBleHRyYWN0aW5nIHRoZSBicmVha3BvaW50IGxpc3QgZnJvbSB0aGUgQ1NTIGFuZCBhY3RpdmF0aW5nIHRoZSBicmVha3BvaW50IHdhdGNoZXIuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBleHRyYWN0ZWRTdHlsZXMgPSAkKCcuZm91bmRhdGlvbi1tcScpLmNzcygnZm9udC1mYW1pbHknKTtcbiAgICB2YXIgbmFtZWRRdWVyaWVzO1xuXG4gICAgbmFtZWRRdWVyaWVzID0gcGFyc2VTdHlsZVRvT2JqZWN0KGV4dHJhY3RlZFN0eWxlcyk7XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gbmFtZWRRdWVyaWVzKSB7XG4gICAgICBpZihuYW1lZFF1ZXJpZXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBzZWxmLnF1ZXJpZXMucHVzaCh7XG4gICAgICAgICAgbmFtZToga2V5LFxuICAgICAgICAgIHZhbHVlOiBgb25seSBzY3JlZW4gYW5kIChtaW4td2lkdGg6ICR7bmFtZWRRdWVyaWVzW2tleV19KWBcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5jdXJyZW50ID0gdGhpcy5fZ2V0Q3VycmVudFNpemUoKTtcblxuICAgIHRoaXMuX3dhdGNoZXIoKTtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2tzIGlmIHRoZSBzY3JlZW4gaXMgYXQgbGVhc3QgYXMgd2lkZSBhcyBhIGJyZWFrcG9pbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2l6ZSAtIE5hbWUgb2YgdGhlIGJyZWFrcG9pbnQgdG8gY2hlY2suXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBgdHJ1ZWAgaWYgdGhlIGJyZWFrcG9pbnQgbWF0Y2hlcywgYGZhbHNlYCBpZiBpdCdzIHNtYWxsZXIuXG4gICAqL1xuICBhdExlYXN0KHNpemUpIHtcbiAgICB2YXIgcXVlcnkgPSB0aGlzLmdldChzaXplKTtcblxuICAgIGlmIChxdWVyeSkge1xuICAgICAgcmV0dXJuIHdpbmRvdy5tYXRjaE1lZGlhKHF1ZXJ5KS5tYXRjaGVzO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2tzIGlmIHRoZSBzY3JlZW4gbWF0Y2hlcyB0byBhIGJyZWFrcG9pbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2l6ZSAtIE5hbWUgb2YgdGhlIGJyZWFrcG9pbnQgdG8gY2hlY2ssIGVpdGhlciAnc21hbGwgb25seScgb3IgJ3NtYWxsJy4gT21pdHRpbmcgJ29ubHknIGZhbGxzIGJhY2sgdG8gdXNpbmcgYXRMZWFzdCgpIG1ldGhvZC5cbiAgICogQHJldHVybnMge0Jvb2xlYW59IGB0cnVlYCBpZiB0aGUgYnJlYWtwb2ludCBtYXRjaGVzLCBgZmFsc2VgIGlmIGl0IGRvZXMgbm90LlxuICAgKi9cbiAgaXMoc2l6ZSkge1xuICAgIHNpemUgPSBzaXplLnRyaW0oKS5zcGxpdCgnICcpO1xuICAgIGlmKHNpemUubGVuZ3RoID4gMSAmJiBzaXplWzFdID09PSAnb25seScpIHtcbiAgICAgIGlmKHNpemVbMF0gPT09IHRoaXMuX2dldEN1cnJlbnRTaXplKCkpIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5hdExlYXN0KHNpemVbMF0pO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIG1lZGlhIHF1ZXJ5IG9mIGEgYnJlYWtwb2ludC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzaXplIC0gTmFtZSBvZiB0aGUgYnJlYWtwb2ludCB0byBnZXQuXG4gICAqIEByZXR1cm5zIHtTdHJpbmd8bnVsbH0gLSBUaGUgbWVkaWEgcXVlcnkgb2YgdGhlIGJyZWFrcG9pbnQsIG9yIGBudWxsYCBpZiB0aGUgYnJlYWtwb2ludCBkb2Vzbid0IGV4aXN0LlxuICAgKi9cbiAgZ2V0KHNpemUpIHtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMucXVlcmllcykge1xuICAgICAgaWYodGhpcy5xdWVyaWVzLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgIHZhciBxdWVyeSA9IHRoaXMucXVlcmllc1tpXTtcbiAgICAgICAgaWYgKHNpemUgPT09IHF1ZXJ5Lm5hbWUpIHJldHVybiBxdWVyeS52YWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfSxcblxuICAvKipcbiAgICogR2V0cyB0aGUgY3VycmVudCBicmVha3BvaW50IG5hbWUgYnkgdGVzdGluZyBldmVyeSBicmVha3BvaW50IGFuZCByZXR1cm5pbmcgdGhlIGxhc3Qgb25lIHRvIG1hdGNoICh0aGUgYmlnZ2VzdCBvbmUpLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQHJldHVybnMge1N0cmluZ30gTmFtZSBvZiB0aGUgY3VycmVudCBicmVha3BvaW50LlxuICAgKi9cbiAgX2dldEN1cnJlbnRTaXplKCkge1xuICAgIHZhciBtYXRjaGVkO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnF1ZXJpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBxdWVyeSA9IHRoaXMucXVlcmllc1tpXTtcblxuICAgICAgaWYgKHdpbmRvdy5tYXRjaE1lZGlhKHF1ZXJ5LnZhbHVlKS5tYXRjaGVzKSB7XG4gICAgICAgIG1hdGNoZWQgPSBxdWVyeTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG1hdGNoZWQgPT09ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gbWF0Y2hlZC5uYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbWF0Y2hlZDtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFjdGl2YXRlcyB0aGUgYnJlYWtwb2ludCB3YXRjaGVyLCB3aGljaCBmaXJlcyBhbiBldmVudCBvbiB0aGUgd2luZG93IHdoZW5ldmVyIHRoZSBicmVha3BvaW50IGNoYW5nZXMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3dhdGNoZXIoKSB7XG4gICAgJCh3aW5kb3cpLm9uKCdyZXNpemUuemYubWVkaWFxdWVyeScsICgpID0+IHtcbiAgICAgIHZhciBuZXdTaXplID0gdGhpcy5fZ2V0Q3VycmVudFNpemUoKSwgY3VycmVudFNpemUgPSB0aGlzLmN1cnJlbnQ7XG5cbiAgICAgIGlmIChuZXdTaXplICE9PSBjdXJyZW50U2l6ZSkge1xuICAgICAgICAvLyBDaGFuZ2UgdGhlIGN1cnJlbnQgbWVkaWEgcXVlcnlcbiAgICAgICAgdGhpcy5jdXJyZW50ID0gbmV3U2l6ZTtcblxuICAgICAgICAvLyBCcm9hZGNhc3QgdGhlIG1lZGlhIHF1ZXJ5IGNoYW5nZSBvbiB0aGUgd2luZG93XG4gICAgICAgICQod2luZG93KS50cmlnZ2VyKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCBbbmV3U2l6ZSwgY3VycmVudFNpemVdKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufTtcblxuRm91bmRhdGlvbi5NZWRpYVF1ZXJ5ID0gTWVkaWFRdWVyeTtcblxuLy8gbWF0Y2hNZWRpYSgpIHBvbHlmaWxsIC0gVGVzdCBhIENTUyBtZWRpYSB0eXBlL3F1ZXJ5IGluIEpTLlxuLy8gQXV0aG9ycyAmIGNvcHlyaWdodCAoYykgMjAxMjogU2NvdHQgSmVobCwgUGF1bCBJcmlzaCwgTmljaG9sYXMgWmFrYXMsIERhdmlkIEtuaWdodC4gRHVhbCBNSVQvQlNEIGxpY2Vuc2VcbndpbmRvdy5tYXRjaE1lZGlhIHx8ICh3aW5kb3cubWF0Y2hNZWRpYSA9IGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gRm9yIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCBtYXRjaE1lZGl1bSBhcGkgc3VjaCBhcyBJRSA5IGFuZCB3ZWJraXRcbiAgdmFyIHN0eWxlTWVkaWEgPSAod2luZG93LnN0eWxlTWVkaWEgfHwgd2luZG93Lm1lZGlhKTtcblxuICAvLyBGb3IgdGhvc2UgdGhhdCBkb24ndCBzdXBwb3J0IG1hdGNoTWVkaXVtXG4gIGlmICghc3R5bGVNZWRpYSkge1xuICAgIHZhciBzdHlsZSAgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKSxcbiAgICBzY3JpcHQgICAgICA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKVswXSxcbiAgICBpbmZvICAgICAgICA9IG51bGw7XG5cbiAgICBzdHlsZS50eXBlICA9ICd0ZXh0L2Nzcyc7XG4gICAgc3R5bGUuaWQgICAgPSAnbWF0Y2htZWRpYWpzLXRlc3QnO1xuXG4gICAgc2NyaXB0ICYmIHNjcmlwdC5wYXJlbnROb2RlICYmIHNjcmlwdC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShzdHlsZSwgc2NyaXB0KTtcblxuICAgIC8vICdzdHlsZS5jdXJyZW50U3R5bGUnIGlzIHVzZWQgYnkgSUUgPD0gOCBhbmQgJ3dpbmRvdy5nZXRDb21wdXRlZFN0eWxlJyBmb3IgYWxsIG90aGVyIGJyb3dzZXJzXG4gICAgaW5mbyA9ICgnZ2V0Q29tcHV0ZWRTdHlsZScgaW4gd2luZG93KSAmJiB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShzdHlsZSwgbnVsbCkgfHwgc3R5bGUuY3VycmVudFN0eWxlO1xuXG4gICAgc3R5bGVNZWRpYSA9IHtcbiAgICAgIG1hdGNoTWVkaXVtKG1lZGlhKSB7XG4gICAgICAgIHZhciB0ZXh0ID0gYEBtZWRpYSAke21lZGlhfXsgI21hdGNobWVkaWFqcy10ZXN0IHsgd2lkdGg6IDFweDsgfSB9YDtcblxuICAgICAgICAvLyAnc3R5bGUuc3R5bGVTaGVldCcgaXMgdXNlZCBieSBJRSA8PSA4IGFuZCAnc3R5bGUudGV4dENvbnRlbnQnIGZvciBhbGwgb3RoZXIgYnJvd3NlcnNcbiAgICAgICAgaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgICAgICAgICBzdHlsZS5zdHlsZVNoZWV0LmNzc1RleHQgPSB0ZXh0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0eWxlLnRleHRDb250ZW50ID0gdGV4dDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRlc3QgaWYgbWVkaWEgcXVlcnkgaXMgdHJ1ZSBvciBmYWxzZVxuICAgICAgICByZXR1cm4gaW5mby53aWR0aCA9PT0gJzFweCc7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKG1lZGlhKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG1hdGNoZXM6IHN0eWxlTWVkaWEubWF0Y2hNZWRpdW0obWVkaWEgfHwgJ2FsbCcpLFxuICAgICAgbWVkaWE6IG1lZGlhIHx8ICdhbGwnXG4gICAgfTtcbiAgfVxufSgpKTtcblxuLy8gVGhhbmsgeW91OiBodHRwczovL2dpdGh1Yi5jb20vc2luZHJlc29yaHVzL3F1ZXJ5LXN0cmluZ1xuZnVuY3Rpb24gcGFyc2VTdHlsZVRvT2JqZWN0KHN0cikge1xuICB2YXIgc3R5bGVPYmplY3QgPSB7fTtcblxuICBpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gc3R5bGVPYmplY3Q7XG4gIH1cblxuICBzdHIgPSBzdHIudHJpbSgpLnNsaWNlKDEsIC0xKTsgLy8gYnJvd3NlcnMgcmUtcXVvdGUgc3RyaW5nIHN0eWxlIHZhbHVlc1xuXG4gIGlmICghc3RyKSB7XG4gICAgcmV0dXJuIHN0eWxlT2JqZWN0O1xuICB9XG5cbiAgc3R5bGVPYmplY3QgPSBzdHIuc3BsaXQoJyYnKS5yZWR1Y2UoZnVuY3Rpb24ocmV0LCBwYXJhbSkge1xuICAgIHZhciBwYXJ0cyA9IHBhcmFtLnJlcGxhY2UoL1xcKy9nLCAnICcpLnNwbGl0KCc9Jyk7XG4gICAgdmFyIGtleSA9IHBhcnRzWzBdO1xuICAgIHZhciB2YWwgPSBwYXJ0c1sxXTtcbiAgICBrZXkgPSBkZWNvZGVVUklDb21wb25lbnQoa2V5KTtcblxuICAgIC8vIG1pc3NpbmcgYD1gIHNob3VsZCBiZSBgbnVsbGA6XG4gICAgLy8gaHR0cDovL3czLm9yZy9UUi8yMDEyL1dELXVybC0yMDEyMDUyNC8jY29sbGVjdC11cmwtcGFyYW1ldGVyc1xuICAgIHZhbCA9IHZhbCA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IGRlY29kZVVSSUNvbXBvbmVudCh2YWwpO1xuXG4gICAgaWYgKCFyZXQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgcmV0W2tleV0gPSB2YWw7XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHJldFtrZXldKSkge1xuICAgICAgcmV0W2tleV0ucHVzaCh2YWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXRba2V5XSA9IFtyZXRba2V5XSwgdmFsXTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfSwge30pO1xuXG4gIHJldHVybiBzdHlsZU9iamVjdDtcbn1cblxuRm91bmRhdGlvbi5NZWRpYVF1ZXJ5ID0gTWVkaWFRdWVyeTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIE1vdGlvbiBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ubW90aW9uXG4gKi9cblxuY29uc3QgaW5pdENsYXNzZXMgICA9IFsnbXVpLWVudGVyJywgJ211aS1sZWF2ZSddO1xuY29uc3QgYWN0aXZlQ2xhc3NlcyA9IFsnbXVpLWVudGVyLWFjdGl2ZScsICdtdWktbGVhdmUtYWN0aXZlJ107XG5cbmNvbnN0IE1vdGlvbiA9IHtcbiAgYW5pbWF0ZUluOiBmdW5jdGlvbihlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gICAgYW5pbWF0ZSh0cnVlLCBlbGVtZW50LCBhbmltYXRpb24sIGNiKTtcbiAgfSxcblxuICBhbmltYXRlT3V0OiBmdW5jdGlvbihlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gICAgYW5pbWF0ZShmYWxzZSwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYik7XG4gIH1cbn1cblxuZnVuY3Rpb24gTW92ZShkdXJhdGlvbiwgZWxlbSwgZm4pe1xuICB2YXIgYW5pbSwgcHJvZywgc3RhcnQgPSBudWxsO1xuICAvLyBjb25zb2xlLmxvZygnY2FsbGVkJyk7XG5cbiAgaWYgKGR1cmF0aW9uID09PSAwKSB7XG4gICAgZm4uYXBwbHkoZWxlbSk7XG4gICAgZWxlbS50cmlnZ2VyKCdmaW5pc2hlZC56Zi5hbmltYXRlJywgW2VsZW1dKS50cmlnZ2VySGFuZGxlcignZmluaXNoZWQuemYuYW5pbWF0ZScsIFtlbGVtXSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZnVuY3Rpb24gbW92ZSh0cyl7XG4gICAgaWYoIXN0YXJ0KSBzdGFydCA9IHRzO1xuICAgIC8vIGNvbnNvbGUubG9nKHN0YXJ0LCB0cyk7XG4gICAgcHJvZyA9IHRzIC0gc3RhcnQ7XG4gICAgZm4uYXBwbHkoZWxlbSk7XG5cbiAgICBpZihwcm9nIDwgZHVyYXRpb24peyBhbmltID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShtb3ZlLCBlbGVtKTsgfVxuICAgIGVsc2V7XG4gICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoYW5pbSk7XG4gICAgICBlbGVtLnRyaWdnZXIoJ2ZpbmlzaGVkLnpmLmFuaW1hdGUnLCBbZWxlbV0pLnRyaWdnZXJIYW5kbGVyKCdmaW5pc2hlZC56Zi5hbmltYXRlJywgW2VsZW1dKTtcbiAgICB9XG4gIH1cbiAgYW5pbSA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUobW92ZSk7XG59XG5cbi8qKlxuICogQW5pbWF0ZXMgYW4gZWxlbWVudCBpbiBvciBvdXQgdXNpbmcgYSBDU1MgdHJhbnNpdGlvbiBjbGFzcy5cbiAqIEBmdW5jdGlvblxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNJbiAtIERlZmluZXMgaWYgdGhlIGFuaW1hdGlvbiBpcyBpbiBvciBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvciBIVE1MIG9iamVjdCB0byBhbmltYXRlLlxuICogQHBhcmFtIHtTdHJpbmd9IGFuaW1hdGlvbiAtIENTUyBjbGFzcyB0byB1c2UuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIENhbGxiYWNrIHRvIHJ1biB3aGVuIGFuaW1hdGlvbiBpcyBmaW5pc2hlZC5cbiAqL1xuZnVuY3Rpb24gYW5pbWF0ZShpc0luLCBlbGVtZW50LCBhbmltYXRpb24sIGNiKSB7XG4gIGVsZW1lbnQgPSAkKGVsZW1lbnQpLmVxKDApO1xuXG4gIGlmICghZWxlbWVudC5sZW5ndGgpIHJldHVybjtcblxuICB2YXIgaW5pdENsYXNzID0gaXNJbiA/IGluaXRDbGFzc2VzWzBdIDogaW5pdENsYXNzZXNbMV07XG4gIHZhciBhY3RpdmVDbGFzcyA9IGlzSW4gPyBhY3RpdmVDbGFzc2VzWzBdIDogYWN0aXZlQ2xhc3Nlc1sxXTtcblxuICAvLyBTZXQgdXAgdGhlIGFuaW1hdGlvblxuICByZXNldCgpO1xuXG4gIGVsZW1lbnRcbiAgICAuYWRkQ2xhc3MoYW5pbWF0aW9uKVxuICAgIC5jc3MoJ3RyYW5zaXRpb24nLCAnbm9uZScpO1xuXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgZWxlbWVudC5hZGRDbGFzcyhpbml0Q2xhc3MpO1xuICAgIGlmIChpc0luKSBlbGVtZW50LnNob3coKTtcbiAgfSk7XG5cbiAgLy8gU3RhcnQgdGhlIGFuaW1hdGlvblxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgIGVsZW1lbnRbMF0ub2Zmc2V0V2lkdGg7XG4gICAgZWxlbWVudFxuICAgICAgLmNzcygndHJhbnNpdGlvbicsICcnKVxuICAgICAgLmFkZENsYXNzKGFjdGl2ZUNsYXNzKTtcbiAgfSk7XG5cbiAgLy8gQ2xlYW4gdXAgdGhlIGFuaW1hdGlvbiB3aGVuIGl0IGZpbmlzaGVzXG4gIGVsZW1lbnQub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZChlbGVtZW50KSwgZmluaXNoKTtcblxuICAvLyBIaWRlcyB0aGUgZWxlbWVudCAoZm9yIG91dCBhbmltYXRpb25zKSwgcmVzZXRzIHRoZSBlbGVtZW50LCBhbmQgcnVucyBhIGNhbGxiYWNrXG4gIGZ1bmN0aW9uIGZpbmlzaCgpIHtcbiAgICBpZiAoIWlzSW4pIGVsZW1lbnQuaGlkZSgpO1xuICAgIHJlc2V0KCk7XG4gICAgaWYgKGNiKSBjYi5hcHBseShlbGVtZW50KTtcbiAgfVxuXG4gIC8vIFJlc2V0cyB0cmFuc2l0aW9ucyBhbmQgcmVtb3ZlcyBtb3Rpb24tc3BlY2lmaWMgY2xhc3Nlc1xuICBmdW5jdGlvbiByZXNldCgpIHtcbiAgICBlbGVtZW50WzBdLnN0eWxlLnRyYW5zaXRpb25EdXJhdGlvbiA9IDA7XG4gICAgZWxlbWVudC5yZW1vdmVDbGFzcyhgJHtpbml0Q2xhc3N9ICR7YWN0aXZlQ2xhc3N9ICR7YW5pbWF0aW9ufWApO1xuICB9XG59XG5cbkZvdW5kYXRpb24uTW92ZSA9IE1vdmU7XG5Gb3VuZGF0aW9uLk1vdGlvbiA9IE1vdGlvbjtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG5jb25zdCBOZXN0ID0ge1xuICBGZWF0aGVyKG1lbnUsIHR5cGUgPSAnemYnKSB7XG4gICAgbWVudS5hdHRyKCdyb2xlJywgJ21lbnViYXInKTtcblxuICAgIHZhciBpdGVtcyA9IG1lbnUuZmluZCgnbGknKS5hdHRyKHsncm9sZSc6ICdtZW51aXRlbSd9KSxcbiAgICAgICAgc3ViTWVudUNsYXNzID0gYGlzLSR7dHlwZX0tc3VibWVudWAsXG4gICAgICAgIHN1Ykl0ZW1DbGFzcyA9IGAke3N1Yk1lbnVDbGFzc30taXRlbWAsXG4gICAgICAgIGhhc1N1YkNsYXNzID0gYGlzLSR7dHlwZX0tc3VibWVudS1wYXJlbnRgO1xuXG4gICAgaXRlbXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIHZhciAkaXRlbSA9ICQodGhpcyksXG4gICAgICAgICAgJHN1YiA9ICRpdGVtLmNoaWxkcmVuKCd1bCcpO1xuXG4gICAgICBpZiAoJHN1Yi5sZW5ndGgpIHtcbiAgICAgICAgJGl0ZW1cbiAgICAgICAgICAuYWRkQ2xhc3MoaGFzU3ViQ2xhc3MpXG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ2FyaWEtaGFzcG9wdXAnOiB0cnVlLFxuICAgICAgICAgICAgJ2FyaWEtbGFiZWwnOiAkaXRlbS5jaGlsZHJlbignYTpmaXJzdCcpLnRleHQoKVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIC8vIE5vdGU6ICBEcmlsbGRvd25zIGJlaGF2ZSBkaWZmZXJlbnRseSBpbiBob3cgdGhleSBoaWRlLCBhbmQgc28gbmVlZFxuICAgICAgICAgIC8vIGFkZGl0aW9uYWwgYXR0cmlidXRlcy4gIFdlIHNob3VsZCBsb29rIGlmIHRoaXMgcG9zc2libHkgb3Zlci1nZW5lcmFsaXplZFxuICAgICAgICAgIC8vIHV0aWxpdHkgKE5lc3QpIGlzIGFwcHJvcHJpYXRlIHdoZW4gd2UgcmV3b3JrIG1lbnVzIGluIDYuNFxuICAgICAgICAgIGlmKHR5cGUgPT09ICdkcmlsbGRvd24nKSB7XG4gICAgICAgICAgICAkaXRlbS5hdHRyKHsnYXJpYS1leHBhbmRlZCc6IGZhbHNlfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICRzdWJcbiAgICAgICAgICAuYWRkQ2xhc3MoYHN1Ym1lbnUgJHtzdWJNZW51Q2xhc3N9YClcbiAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAnZGF0YS1zdWJtZW51JzogJycsXG4gICAgICAgICAgICAncm9sZSc6ICdtZW51J1xuICAgICAgICAgIH0pO1xuICAgICAgICBpZih0eXBlID09PSAnZHJpbGxkb3duJykge1xuICAgICAgICAgICRzdWIuYXR0cih7J2FyaWEtaGlkZGVuJzogdHJ1ZX0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICgkaXRlbS5wYXJlbnQoJ1tkYXRhLXN1Ym1lbnVdJykubGVuZ3RoKSB7XG4gICAgICAgICRpdGVtLmFkZENsYXNzKGBpcy1zdWJtZW51LWl0ZW0gJHtzdWJJdGVtQ2xhc3N9YCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm47XG4gIH0sXG5cbiAgQnVybihtZW51LCB0eXBlKSB7XG4gICAgdmFyIC8vaXRlbXMgPSBtZW51LmZpbmQoJ2xpJyksXG4gICAgICAgIHN1Yk1lbnVDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnVgLFxuICAgICAgICBzdWJJdGVtQ2xhc3MgPSBgJHtzdWJNZW51Q2xhc3N9LWl0ZW1gLFxuICAgICAgICBoYXNTdWJDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnUtcGFyZW50YDtcblxuICAgIG1lbnVcbiAgICAgIC5maW5kKCc+bGksIC5tZW51LCAubWVudSA+IGxpJylcbiAgICAgIC5yZW1vdmVDbGFzcyhgJHtzdWJNZW51Q2xhc3N9ICR7c3ViSXRlbUNsYXNzfSAke2hhc1N1YkNsYXNzfSBpcy1zdWJtZW51LWl0ZW0gc3VibWVudSBpcy1hY3RpdmVgKVxuICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtc3VibWVudScpLmNzcygnZGlzcGxheScsICcnKTtcblxuICAgIC8vIGNvbnNvbGUubG9nKCAgICAgIG1lbnUuZmluZCgnLicgKyBzdWJNZW51Q2xhc3MgKyAnLCAuJyArIHN1Ykl0ZW1DbGFzcyArICcsIC5oYXMtc3VibWVudSwgLmlzLXN1Ym1lbnUtaXRlbSwgLnN1Ym1lbnUsIFtkYXRhLXN1Ym1lbnVdJylcbiAgICAvLyAgICAgICAgICAgLnJlbW92ZUNsYXNzKHN1Yk1lbnVDbGFzcyArICcgJyArIHN1Ykl0ZW1DbGFzcyArICcgaGFzLXN1Ym1lbnUgaXMtc3VibWVudS1pdGVtIHN1Ym1lbnUnKVxuICAgIC8vICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS1zdWJtZW51JykpO1xuICAgIC8vIGl0ZW1zLmVhY2goZnVuY3Rpb24oKXtcbiAgICAvLyAgIHZhciAkaXRlbSA9ICQodGhpcyksXG4gICAgLy8gICAgICAgJHN1YiA9ICRpdGVtLmNoaWxkcmVuKCd1bCcpO1xuICAgIC8vICAgaWYoJGl0ZW0ucGFyZW50KCdbZGF0YS1zdWJtZW51XScpLmxlbmd0aCl7XG4gICAgLy8gICAgICRpdGVtLnJlbW92ZUNsYXNzKCdpcy1zdWJtZW51LWl0ZW0gJyArIHN1Ykl0ZW1DbGFzcyk7XG4gICAgLy8gICB9XG4gICAgLy8gICBpZigkc3ViLmxlbmd0aCl7XG4gICAgLy8gICAgICRpdGVtLnJlbW92ZUNsYXNzKCdoYXMtc3VibWVudScpO1xuICAgIC8vICAgICAkc3ViLnJlbW92ZUNsYXNzKCdzdWJtZW51ICcgKyBzdWJNZW51Q2xhc3MpLnJlbW92ZUF0dHIoJ2RhdGEtc3VibWVudScpO1xuICAgIC8vICAgfVxuICAgIC8vIH0pO1xuICB9XG59XG5cbkZvdW5kYXRpb24uTmVzdCA9IE5lc3Q7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuZnVuY3Rpb24gVGltZXIoZWxlbSwgb3B0aW9ucywgY2IpIHtcbiAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgIGR1cmF0aW9uID0gb3B0aW9ucy5kdXJhdGlvbiwvL29wdGlvbnMgaXMgYW4gb2JqZWN0IGZvciBlYXNpbHkgYWRkaW5nIGZlYXR1cmVzIGxhdGVyLlxuICAgICAgbmFtZVNwYWNlID0gT2JqZWN0LmtleXMoZWxlbS5kYXRhKCkpWzBdIHx8ICd0aW1lcicsXG4gICAgICByZW1haW4gPSAtMSxcbiAgICAgIHN0YXJ0LFxuICAgICAgdGltZXI7XG5cbiAgdGhpcy5pc1BhdXNlZCA9IGZhbHNlO1xuXG4gIHRoaXMucmVzdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgIHJlbWFpbiA9IC0xO1xuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgdGhpcy5zdGFydCgpO1xuICB9XG5cbiAgdGhpcy5zdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaXNQYXVzZWQgPSBmYWxzZTtcbiAgICAvLyBpZighZWxlbS5kYXRhKCdwYXVzZWQnKSl7IHJldHVybiBmYWxzZTsgfS8vbWF5YmUgaW1wbGVtZW50IHRoaXMgc2FuaXR5IGNoZWNrIGlmIHVzZWQgZm9yIG90aGVyIHRoaW5ncy5cbiAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgIHJlbWFpbiA9IHJlbWFpbiA8PSAwID8gZHVyYXRpb24gOiByZW1haW47XG4gICAgZWxlbS5kYXRhKCdwYXVzZWQnLCBmYWxzZSk7XG4gICAgc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgaWYob3B0aW9ucy5pbmZpbml0ZSl7XG4gICAgICAgIF90aGlzLnJlc3RhcnQoKTsvL3JlcnVuIHRoZSB0aW1lci5cbiAgICAgIH1cbiAgICAgIGlmIChjYiAmJiB0eXBlb2YgY2IgPT09ICdmdW5jdGlvbicpIHsgY2IoKTsgfVxuICAgIH0sIHJlbWFpbik7XG4gICAgZWxlbS50cmlnZ2VyKGB0aW1lcnN0YXJ0LnpmLiR7bmFtZVNwYWNlfWApO1xuICB9XG5cbiAgdGhpcy5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaXNQYXVzZWQgPSB0cnVlO1xuICAgIC8vaWYoZWxlbS5kYXRhKCdwYXVzZWQnKSl7IHJldHVybiBmYWxzZTsgfS8vbWF5YmUgaW1wbGVtZW50IHRoaXMgc2FuaXR5IGNoZWNrIGlmIHVzZWQgZm9yIG90aGVyIHRoaW5ncy5cbiAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgIGVsZW0uZGF0YSgncGF1c2VkJywgdHJ1ZSk7XG4gICAgdmFyIGVuZCA9IERhdGUubm93KCk7XG4gICAgcmVtYWluID0gcmVtYWluIC0gKGVuZCAtIHN0YXJ0KTtcbiAgICBlbGVtLnRyaWdnZXIoYHRpbWVycGF1c2VkLnpmLiR7bmFtZVNwYWNlfWApO1xuICB9XG59XG5cbi8qKlxuICogUnVucyBhIGNhbGxiYWNrIGZ1bmN0aW9uIHdoZW4gaW1hZ2VzIGFyZSBmdWxseSBsb2FkZWQuXG4gKiBAcGFyYW0ge09iamVjdH0gaW1hZ2VzIC0gSW1hZ2UocykgdG8gY2hlY2sgaWYgbG9hZGVkLlxuICogQHBhcmFtIHtGdW5jfSBjYWxsYmFjayAtIEZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiBpbWFnZSBpcyBmdWxseSBsb2FkZWQuXG4gKi9cbmZ1bmN0aW9uIG9uSW1hZ2VzTG9hZGVkKGltYWdlcywgY2FsbGJhY2spe1xuICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICB1bmxvYWRlZCA9IGltYWdlcy5sZW5ndGg7XG5cbiAgaWYgKHVubG9hZGVkID09PSAwKSB7XG4gICAgY2FsbGJhY2soKTtcbiAgfVxuXG4gIGltYWdlcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgIC8vIENoZWNrIGlmIGltYWdlIGlzIGxvYWRlZFxuICAgIGlmICh0aGlzLmNvbXBsZXRlIHx8ICh0aGlzLnJlYWR5U3RhdGUgPT09IDQpIHx8ICh0aGlzLnJlYWR5U3RhdGUgPT09ICdjb21wbGV0ZScpKSB7XG4gICAgICBzaW5nbGVJbWFnZUxvYWRlZCgpO1xuICAgIH1cbiAgICAvLyBGb3JjZSBsb2FkIHRoZSBpbWFnZVxuICAgIGVsc2Uge1xuICAgICAgLy8gZml4IGZvciBJRS4gU2VlIGh0dHBzOi8vY3NzLXRyaWNrcy5jb20vc25pcHBldHMvanF1ZXJ5L2ZpeGluZy1sb2FkLWluLWllLWZvci1jYWNoZWQtaW1hZ2VzL1xuICAgICAgdmFyIHNyYyA9ICQodGhpcykuYXR0cignc3JjJyk7XG4gICAgICAkKHRoaXMpLmF0dHIoJ3NyYycsIHNyYyArIChzcmMuaW5kZXhPZignPycpID49IDAgPyAnJicgOiAnPycpICsgKG5ldyBEYXRlKCkuZ2V0VGltZSgpKSk7XG4gICAgICAkKHRoaXMpLm9uZSgnbG9hZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzaW5nbGVJbWFnZUxvYWRlZCgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICBmdW5jdGlvbiBzaW5nbGVJbWFnZUxvYWRlZCgpIHtcbiAgICB1bmxvYWRlZC0tO1xuICAgIGlmICh1bmxvYWRlZCA9PT0gMCkge1xuICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG4gIH1cbn1cblxuRm91bmRhdGlvbi5UaW1lciA9IFRpbWVyO1xuRm91bmRhdGlvbi5vbkltYWdlc0xvYWRlZCA9IG9uSW1hZ2VzTG9hZGVkO1xuXG59KGpRdWVyeSk7XG4iLCIvLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vLyoqV29yayBpbnNwaXJlZCBieSBtdWx0aXBsZSBqcXVlcnkgc3dpcGUgcGx1Z2lucyoqXG4vLyoqRG9uZSBieSBZb2hhaSBBcmFyYXQgKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4oZnVuY3Rpb24oJCkge1xuXG4gICQuc3BvdFN3aXBlID0ge1xuICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgZW5hYmxlZDogJ29udG91Y2hzdGFydCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LFxuICAgIHByZXZlbnREZWZhdWx0OiBmYWxzZSxcbiAgICBtb3ZlVGhyZXNob2xkOiA3NSxcbiAgICB0aW1lVGhyZXNob2xkOiAyMDBcbiAgfTtcblxuICB2YXIgICBzdGFydFBvc1gsXG4gICAgICAgIHN0YXJ0UG9zWSxcbiAgICAgICAgc3RhcnRUaW1lLFxuICAgICAgICBlbGFwc2VkVGltZSxcbiAgICAgICAgaXNNb3ZpbmcgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBvblRvdWNoRW5kKCkge1xuICAgIC8vICBhbGVydCh0aGlzKTtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIG9uVG91Y2hNb3ZlKTtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgb25Ub3VjaEVuZCk7XG4gICAgaXNNb3ZpbmcgPSBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uVG91Y2hNb3ZlKGUpIHtcbiAgICBpZiAoJC5zcG90U3dpcGUucHJldmVudERlZmF1bHQpIHsgZS5wcmV2ZW50RGVmYXVsdCgpOyB9XG4gICAgaWYoaXNNb3ZpbmcpIHtcbiAgICAgIHZhciB4ID0gZS50b3VjaGVzWzBdLnBhZ2VYO1xuICAgICAgdmFyIHkgPSBlLnRvdWNoZXNbMF0ucGFnZVk7XG4gICAgICB2YXIgZHggPSBzdGFydFBvc1ggLSB4O1xuICAgICAgdmFyIGR5ID0gc3RhcnRQb3NZIC0geTtcbiAgICAgIHZhciBkaXI7XG4gICAgICBlbGFwc2VkVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc3RhcnRUaW1lO1xuICAgICAgaWYoTWF0aC5hYnMoZHgpID49ICQuc3BvdFN3aXBlLm1vdmVUaHJlc2hvbGQgJiYgZWxhcHNlZFRpbWUgPD0gJC5zcG90U3dpcGUudGltZVRocmVzaG9sZCkge1xuICAgICAgICBkaXIgPSBkeCA+IDAgPyAnbGVmdCcgOiAncmlnaHQnO1xuICAgICAgfVxuICAgICAgLy8gZWxzZSBpZihNYXRoLmFicyhkeSkgPj0gJC5zcG90U3dpcGUubW92ZVRocmVzaG9sZCAmJiBlbGFwc2VkVGltZSA8PSAkLnNwb3RTd2lwZS50aW1lVGhyZXNob2xkKSB7XG4gICAgICAvLyAgIGRpciA9IGR5ID4gMCA/ICdkb3duJyA6ICd1cCc7XG4gICAgICAvLyB9XG4gICAgICBpZihkaXIpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBvblRvdWNoRW5kLmNhbGwodGhpcyk7XG4gICAgICAgICQodGhpcykudHJpZ2dlcignc3dpcGUnLCBkaXIpLnRyaWdnZXIoYHN3aXBlJHtkaXJ9YCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gb25Ub3VjaFN0YXJ0KGUpIHtcbiAgICBpZiAoZS50b3VjaGVzLmxlbmd0aCA9PSAxKSB7XG4gICAgICBzdGFydFBvc1ggPSBlLnRvdWNoZXNbMF0ucGFnZVg7XG4gICAgICBzdGFydFBvc1kgPSBlLnRvdWNoZXNbMF0ucGFnZVk7XG4gICAgICBpc01vdmluZyA9IHRydWU7XG4gICAgICBzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgb25Ub3VjaE1vdmUsIGZhbHNlKTtcbiAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCBvblRvdWNoRW5kLCBmYWxzZSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIgJiYgdGhpcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0Jywgb25Ub3VjaFN0YXJ0LCBmYWxzZSk7XG4gIH1cblxuICBmdW5jdGlvbiB0ZWFyZG93bigpIHtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBvblRvdWNoU3RhcnQpO1xuICB9XG5cbiAgJC5ldmVudC5zcGVjaWFsLnN3aXBlID0geyBzZXR1cDogaW5pdCB9O1xuXG4gICQuZWFjaChbJ2xlZnQnLCAndXAnLCAnZG93bicsICdyaWdodCddLCBmdW5jdGlvbiAoKSB7XG4gICAgJC5ldmVudC5zcGVjaWFsW2Bzd2lwZSR7dGhpc31gXSA9IHsgc2V0dXA6IGZ1bmN0aW9uKCl7XG4gICAgICAkKHRoaXMpLm9uKCdzd2lwZScsICQubm9vcCk7XG4gICAgfSB9O1xuICB9KTtcbn0pKGpRdWVyeSk7XG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogTWV0aG9kIGZvciBhZGRpbmcgcHN1ZWRvIGRyYWcgZXZlbnRzIHRvIGVsZW1lbnRzICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4hZnVuY3Rpb24oJCl7XG4gICQuZm4uYWRkVG91Y2ggPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuZWFjaChmdW5jdGlvbihpLGVsKXtcbiAgICAgICQoZWwpLmJpbmQoJ3RvdWNoc3RhcnQgdG91Y2htb3ZlIHRvdWNoZW5kIHRvdWNoY2FuY2VsJyxmdW5jdGlvbigpe1xuICAgICAgICAvL3dlIHBhc3MgdGhlIG9yaWdpbmFsIGV2ZW50IG9iamVjdCBiZWNhdXNlIHRoZSBqUXVlcnkgZXZlbnRcbiAgICAgICAgLy9vYmplY3QgaXMgbm9ybWFsaXplZCB0byB3M2Mgc3BlY3MgYW5kIGRvZXMgbm90IHByb3ZpZGUgdGhlIFRvdWNoTGlzdFxuICAgICAgICBoYW5kbGVUb3VjaChldmVudCk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHZhciBoYW5kbGVUb3VjaCA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgIHZhciB0b3VjaGVzID0gZXZlbnQuY2hhbmdlZFRvdWNoZXMsXG4gICAgICAgICAgZmlyc3QgPSB0b3VjaGVzWzBdLFxuICAgICAgICAgIGV2ZW50VHlwZXMgPSB7XG4gICAgICAgICAgICB0b3VjaHN0YXJ0OiAnbW91c2Vkb3duJyxcbiAgICAgICAgICAgIHRvdWNobW92ZTogJ21vdXNlbW92ZScsXG4gICAgICAgICAgICB0b3VjaGVuZDogJ21vdXNldXAnXG4gICAgICAgICAgfSxcbiAgICAgICAgICB0eXBlID0gZXZlbnRUeXBlc1tldmVudC50eXBlXSxcbiAgICAgICAgICBzaW11bGF0ZWRFdmVudFxuICAgICAgICA7XG5cbiAgICAgIGlmKCdNb3VzZUV2ZW50JyBpbiB3aW5kb3cgJiYgdHlwZW9mIHdpbmRvdy5Nb3VzZUV2ZW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHNpbXVsYXRlZEV2ZW50ID0gbmV3IHdpbmRvdy5Nb3VzZUV2ZW50KHR5cGUsIHtcbiAgICAgICAgICAnYnViYmxlcyc6IHRydWUsXG4gICAgICAgICAgJ2NhbmNlbGFibGUnOiB0cnVlLFxuICAgICAgICAgICdzY3JlZW5YJzogZmlyc3Quc2NyZWVuWCxcbiAgICAgICAgICAnc2NyZWVuWSc6IGZpcnN0LnNjcmVlblksXG4gICAgICAgICAgJ2NsaWVudFgnOiBmaXJzdC5jbGllbnRYLFxuICAgICAgICAgICdjbGllbnRZJzogZmlyc3QuY2xpZW50WVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNpbXVsYXRlZEV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ01vdXNlRXZlbnQnKTtcbiAgICAgICAgc2ltdWxhdGVkRXZlbnQuaW5pdE1vdXNlRXZlbnQodHlwZSwgdHJ1ZSwgdHJ1ZSwgd2luZG93LCAxLCBmaXJzdC5zY3JlZW5YLCBmaXJzdC5zY3JlZW5ZLCBmaXJzdC5jbGllbnRYLCBmaXJzdC5jbGllbnRZLCBmYWxzZSwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgMC8qbGVmdCovLCBudWxsKTtcbiAgICAgIH1cbiAgICAgIGZpcnN0LnRhcmdldC5kaXNwYXRjaEV2ZW50KHNpbXVsYXRlZEV2ZW50KTtcbiAgICB9O1xuICB9O1xufShqUXVlcnkpO1xuXG5cbi8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy8qKkZyb20gdGhlIGpRdWVyeSBNb2JpbGUgTGlicmFyeSoqXG4vLyoqbmVlZCB0byByZWNyZWF0ZSBmdW5jdGlvbmFsaXR5Kipcbi8vKiphbmQgdHJ5IHRvIGltcHJvdmUgaWYgcG9zc2libGUqKlxuLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbi8qIFJlbW92aW5nIHRoZSBqUXVlcnkgZnVuY3Rpb24gKioqKlxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbihmdW5jdGlvbiggJCwgd2luZG93LCB1bmRlZmluZWQgKSB7XG5cblx0dmFyICRkb2N1bWVudCA9ICQoIGRvY3VtZW50ICksXG5cdFx0Ly8gc3VwcG9ydFRvdWNoID0gJC5tb2JpbGUuc3VwcG9ydC50b3VjaCxcblx0XHR0b3VjaFN0YXJ0RXZlbnQgPSAndG91Y2hzdGFydCcvL3N1cHBvcnRUb3VjaCA/IFwidG91Y2hzdGFydFwiIDogXCJtb3VzZWRvd25cIixcblx0XHR0b3VjaFN0b3BFdmVudCA9ICd0b3VjaGVuZCcvL3N1cHBvcnRUb3VjaCA/IFwidG91Y2hlbmRcIiA6IFwibW91c2V1cFwiLFxuXHRcdHRvdWNoTW92ZUV2ZW50ID0gJ3RvdWNobW92ZScvL3N1cHBvcnRUb3VjaCA/IFwidG91Y2htb3ZlXCIgOiBcIm1vdXNlbW92ZVwiO1xuXG5cdC8vIHNldHVwIG5ldyBldmVudCBzaG9ydGN1dHNcblx0JC5lYWNoKCAoIFwidG91Y2hzdGFydCB0b3VjaG1vdmUgdG91Y2hlbmQgXCIgK1xuXHRcdFwic3dpcGUgc3dpcGVsZWZ0IHN3aXBlcmlnaHRcIiApLnNwbGl0KCBcIiBcIiApLCBmdW5jdGlvbiggaSwgbmFtZSApIHtcblxuXHRcdCQuZm5bIG5hbWUgXSA9IGZ1bmN0aW9uKCBmbiApIHtcblx0XHRcdHJldHVybiBmbiA/IHRoaXMuYmluZCggbmFtZSwgZm4gKSA6IHRoaXMudHJpZ2dlciggbmFtZSApO1xuXHRcdH07XG5cblx0XHQvLyBqUXVlcnkgPCAxLjhcblx0XHRpZiAoICQuYXR0ckZuICkge1xuXHRcdFx0JC5hdHRyRm5bIG5hbWUgXSA9IHRydWU7XG5cdFx0fVxuXHR9KTtcblxuXHRmdW5jdGlvbiB0cmlnZ2VyQ3VzdG9tRXZlbnQoIG9iaiwgZXZlbnRUeXBlLCBldmVudCwgYnViYmxlICkge1xuXHRcdHZhciBvcmlnaW5hbFR5cGUgPSBldmVudC50eXBlO1xuXHRcdGV2ZW50LnR5cGUgPSBldmVudFR5cGU7XG5cdFx0aWYgKCBidWJibGUgKSB7XG5cdFx0XHQkLmV2ZW50LnRyaWdnZXIoIGV2ZW50LCB1bmRlZmluZWQsIG9iaiApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkLmV2ZW50LmRpc3BhdGNoLmNhbGwoIG9iaiwgZXZlbnQgKTtcblx0XHR9XG5cdFx0ZXZlbnQudHlwZSA9IG9yaWdpbmFsVHlwZTtcblx0fVxuXG5cdC8vIGFsc28gaGFuZGxlcyB0YXBob2xkXG5cblx0Ly8gQWxzbyBoYW5kbGVzIHN3aXBlbGVmdCwgc3dpcGVyaWdodFxuXHQkLmV2ZW50LnNwZWNpYWwuc3dpcGUgPSB7XG5cblx0XHQvLyBNb3JlIHRoYW4gdGhpcyBob3Jpem9udGFsIGRpc3BsYWNlbWVudCwgYW5kIHdlIHdpbGwgc3VwcHJlc3Mgc2Nyb2xsaW5nLlxuXHRcdHNjcm9sbFN1cHJlc3Npb25UaHJlc2hvbGQ6IDMwLFxuXG5cdFx0Ly8gTW9yZSB0aW1lIHRoYW4gdGhpcywgYW5kIGl0IGlzbid0IGEgc3dpcGUuXG5cdFx0ZHVyYXRpb25UaHJlc2hvbGQ6IDEwMDAsXG5cblx0XHQvLyBTd2lwZSBob3Jpem9udGFsIGRpc3BsYWNlbWVudCBtdXN0IGJlIG1vcmUgdGhhbiB0aGlzLlxuXHRcdGhvcml6b250YWxEaXN0YW5jZVRocmVzaG9sZDogd2luZG93LmRldmljZVBpeGVsUmF0aW8gPj0gMiA/IDE1IDogMzAsXG5cblx0XHQvLyBTd2lwZSB2ZXJ0aWNhbCBkaXNwbGFjZW1lbnQgbXVzdCBiZSBsZXNzIHRoYW4gdGhpcy5cblx0XHR2ZXJ0aWNhbERpc3RhbmNlVGhyZXNob2xkOiB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyA+PSAyID8gMTUgOiAzMCxcblxuXHRcdGdldExvY2F0aW9uOiBmdW5jdGlvbiAoIGV2ZW50ICkge1xuXHRcdFx0dmFyIHdpblBhZ2VYID0gd2luZG93LnBhZ2VYT2Zmc2V0LFxuXHRcdFx0XHR3aW5QYWdlWSA9IHdpbmRvdy5wYWdlWU9mZnNldCxcblx0XHRcdFx0eCA9IGV2ZW50LmNsaWVudFgsXG5cdFx0XHRcdHkgPSBldmVudC5jbGllbnRZO1xuXG5cdFx0XHRpZiAoIGV2ZW50LnBhZ2VZID09PSAwICYmIE1hdGguZmxvb3IoIHkgKSA+IE1hdGguZmxvb3IoIGV2ZW50LnBhZ2VZICkgfHxcblx0XHRcdFx0ZXZlbnQucGFnZVggPT09IDAgJiYgTWF0aC5mbG9vciggeCApID4gTWF0aC5mbG9vciggZXZlbnQucGFnZVggKSApIHtcblxuXHRcdFx0XHQvLyBpT1M0IGNsaWVudFgvY2xpZW50WSBoYXZlIHRoZSB2YWx1ZSB0aGF0IHNob3VsZCBoYXZlIGJlZW5cblx0XHRcdFx0Ly8gaW4gcGFnZVgvcGFnZVkuIFdoaWxlIHBhZ2VYL3BhZ2UvIGhhdmUgdGhlIHZhbHVlIDBcblx0XHRcdFx0eCA9IHggLSB3aW5QYWdlWDtcblx0XHRcdFx0eSA9IHkgLSB3aW5QYWdlWTtcblx0XHRcdH0gZWxzZSBpZiAoIHkgPCAoIGV2ZW50LnBhZ2VZIC0gd2luUGFnZVkpIHx8IHggPCAoIGV2ZW50LnBhZ2VYIC0gd2luUGFnZVggKSApIHtcblxuXHRcdFx0XHQvLyBTb21lIEFuZHJvaWQgYnJvd3NlcnMgaGF2ZSB0b3RhbGx5IGJvZ3VzIHZhbHVlcyBmb3IgY2xpZW50WC9ZXG5cdFx0XHRcdC8vIHdoZW4gc2Nyb2xsaW5nL3pvb21pbmcgYSBwYWdlLiBEZXRlY3RhYmxlIHNpbmNlIGNsaWVudFgvY2xpZW50WVxuXHRcdFx0XHQvLyBzaG91bGQgbmV2ZXIgYmUgc21hbGxlciB0aGFuIHBhZ2VYL3BhZ2VZIG1pbnVzIHBhZ2Ugc2Nyb2xsXG5cdFx0XHRcdHggPSBldmVudC5wYWdlWCAtIHdpblBhZ2VYO1xuXHRcdFx0XHR5ID0gZXZlbnQucGFnZVkgLSB3aW5QYWdlWTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0eDogeCxcblx0XHRcdFx0eTogeVxuXHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0c3RhcnQ6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciBkYXRhID0gZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzID9cblx0XHRcdFx0XHRldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXNbIDAgXSA6IGV2ZW50LFxuXHRcdFx0XHRsb2NhdGlvbiA9ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5nZXRMb2NhdGlvbiggZGF0YSApO1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdHRpbWU6ICggbmV3IERhdGUoKSApLmdldFRpbWUoKSxcblx0XHRcdFx0XHRcdGNvb3JkczogWyBsb2NhdGlvbi54LCBsb2NhdGlvbi55IF0sXG5cdFx0XHRcdFx0XHRvcmlnaW46ICQoIGV2ZW50LnRhcmdldCApXG5cdFx0XHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0c3RvcDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIGRhdGEgPSBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXMgP1xuXHRcdFx0XHRcdGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlc1sgMCBdIDogZXZlbnQsXG5cdFx0XHRcdGxvY2F0aW9uID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLmdldExvY2F0aW9uKCBkYXRhICk7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0dGltZTogKCBuZXcgRGF0ZSgpICkuZ2V0VGltZSgpLFxuXHRcdFx0XHRcdFx0Y29vcmRzOiBbIGxvY2F0aW9uLngsIGxvY2F0aW9uLnkgXVxuXHRcdFx0XHRcdH07XG5cdFx0fSxcblxuXHRcdGhhbmRsZVN3aXBlOiBmdW5jdGlvbiggc3RhcnQsIHN0b3AsIHRoaXNPYmplY3QsIG9yaWdUYXJnZXQgKSB7XG5cdFx0XHRpZiAoIHN0b3AudGltZSAtIHN0YXJ0LnRpbWUgPCAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZHVyYXRpb25UaHJlc2hvbGQgJiZcblx0XHRcdFx0TWF0aC5hYnMoIHN0YXJ0LmNvb3Jkc1sgMCBdIC0gc3RvcC5jb29yZHNbIDAgXSApID4gJC5ldmVudC5zcGVjaWFsLnN3aXBlLmhvcml6b250YWxEaXN0YW5jZVRocmVzaG9sZCAmJlxuXHRcdFx0XHRNYXRoLmFicyggc3RhcnQuY29vcmRzWyAxIF0gLSBzdG9wLmNvb3Jkc1sgMSBdICkgPCAkLmV2ZW50LnNwZWNpYWwuc3dpcGUudmVydGljYWxEaXN0YW5jZVRocmVzaG9sZCApIHtcblx0XHRcdFx0dmFyIGRpcmVjdGlvbiA9IHN0YXJ0LmNvb3Jkc1swXSA+IHN0b3AuY29vcmRzWyAwIF0gPyBcInN3aXBlbGVmdFwiIDogXCJzd2lwZXJpZ2h0XCI7XG5cblx0XHRcdFx0dHJpZ2dlckN1c3RvbUV2ZW50KCB0aGlzT2JqZWN0LCBcInN3aXBlXCIsICQuRXZlbnQoIFwic3dpcGVcIiwgeyB0YXJnZXQ6IG9yaWdUYXJnZXQsIHN3aXBlc3RhcnQ6IHN0YXJ0LCBzd2lwZXN0b3A6IHN0b3AgfSksIHRydWUgKTtcblx0XHRcdFx0dHJpZ2dlckN1c3RvbUV2ZW50KCB0aGlzT2JqZWN0LCBkaXJlY3Rpb24sJC5FdmVudCggZGlyZWN0aW9uLCB7IHRhcmdldDogb3JpZ1RhcmdldCwgc3dpcGVzdGFydDogc3RhcnQsIHN3aXBlc3RvcDogc3RvcCB9ICksIHRydWUgKTtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cblx0XHR9LFxuXG5cdFx0Ly8gVGhpcyBzZXJ2ZXMgYXMgYSBmbGFnIHRvIGVuc3VyZSB0aGF0IGF0IG1vc3Qgb25lIHN3aXBlIGV2ZW50IGV2ZW50IGlzXG5cdFx0Ly8gaW4gd29yayBhdCBhbnkgZ2l2ZW4gdGltZVxuXHRcdGV2ZW50SW5Qcm9ncmVzczogZmFsc2UsXG5cblx0XHRzZXR1cDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZXZlbnRzLFxuXHRcdFx0XHR0aGlzT2JqZWN0ID0gdGhpcyxcblx0XHRcdFx0JHRoaXMgPSAkKCB0aGlzT2JqZWN0ICksXG5cdFx0XHRcdGNvbnRleHQgPSB7fTtcblxuXHRcdFx0Ly8gUmV0cmlldmUgdGhlIGV2ZW50cyBkYXRhIGZvciB0aGlzIGVsZW1lbnQgYW5kIGFkZCB0aGUgc3dpcGUgY29udGV4dFxuXHRcdFx0ZXZlbnRzID0gJC5kYXRhKCB0aGlzLCBcIm1vYmlsZS1ldmVudHNcIiApO1xuXHRcdFx0aWYgKCAhZXZlbnRzICkge1xuXHRcdFx0XHRldmVudHMgPSB7IGxlbmd0aDogMCB9O1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsIFwibW9iaWxlLWV2ZW50c1wiLCBldmVudHMgKTtcblx0XHRcdH1cblx0XHRcdGV2ZW50cy5sZW5ndGgrKztcblx0XHRcdGV2ZW50cy5zd2lwZSA9IGNvbnRleHQ7XG5cblx0XHRcdGNvbnRleHQuc3RhcnQgPSBmdW5jdGlvbiggZXZlbnQgKSB7XG5cblx0XHRcdFx0Ly8gQmFpbCBpZiB3ZSdyZSBhbHJlYWR5IHdvcmtpbmcgb24gYSBzd2lwZSBldmVudFxuXHRcdFx0XHRpZiAoICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgPSB0cnVlO1xuXG5cdFx0XHRcdHZhciBzdG9wLFxuXHRcdFx0XHRcdHN0YXJ0ID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLnN0YXJ0KCBldmVudCApLFxuXHRcdFx0XHRcdG9yaWdUYXJnZXQgPSBldmVudC50YXJnZXQsXG5cdFx0XHRcdFx0ZW1pdHRlZCA9IGZhbHNlO1xuXG5cdFx0XHRcdGNvbnRleHQubW92ZSA9IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0XHRpZiAoICFzdGFydCB8fCBldmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSApIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRzdG9wID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLnN0b3AoIGV2ZW50ICk7XG5cdFx0XHRcdFx0aWYgKCAhZW1pdHRlZCApIHtcblx0XHRcdFx0XHRcdGVtaXR0ZWQgPSAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuaGFuZGxlU3dpcGUoIHN0YXJ0LCBzdG9wLCB0aGlzT2JqZWN0LCBvcmlnVGFyZ2V0ICk7XG5cdFx0XHRcdFx0XHRpZiAoIGVtaXR0ZWQgKSB7XG5cblx0XHRcdFx0XHRcdFx0Ly8gUmVzZXQgdGhlIGNvbnRleHQgdG8gbWFrZSB3YXkgZm9yIHRoZSBuZXh0IHN3aXBlIGV2ZW50XG5cdFx0XHRcdFx0XHRcdCQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgPSBmYWxzZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly8gcHJldmVudCBzY3JvbGxpbmdcblx0XHRcdFx0XHRpZiAoIE1hdGguYWJzKCBzdGFydC5jb29yZHNbIDAgXSAtIHN0b3AuY29vcmRzWyAwIF0gKSA+ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5zY3JvbGxTdXByZXNzaW9uVGhyZXNob2xkICkge1xuXHRcdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0Y29udGV4dC5zdG9wID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRlbWl0dGVkID0gdHJ1ZTtcblxuXHRcdFx0XHRcdFx0Ly8gUmVzZXQgdGhlIGNvbnRleHQgdG8gbWFrZSB3YXkgZm9yIHRoZSBuZXh0IHN3aXBlIGV2ZW50XG5cdFx0XHRcdFx0XHQkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZXZlbnRJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHRcdFx0XHQkZG9jdW1lbnQub2ZmKCB0b3VjaE1vdmVFdmVudCwgY29udGV4dC5tb3ZlICk7XG5cdFx0XHRcdFx0XHRjb250ZXh0Lm1vdmUgPSBudWxsO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCRkb2N1bWVudC5vbiggdG91Y2hNb3ZlRXZlbnQsIGNvbnRleHQubW92ZSApXG5cdFx0XHRcdFx0Lm9uZSggdG91Y2hTdG9wRXZlbnQsIGNvbnRleHQuc3RvcCApO1xuXHRcdFx0fTtcblx0XHRcdCR0aGlzLm9uKCB0b3VjaFN0YXJ0RXZlbnQsIGNvbnRleHQuc3RhcnQgKTtcblx0XHR9LFxuXG5cdFx0dGVhcmRvd246IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGV2ZW50cywgY29udGV4dDtcblxuXHRcdFx0ZXZlbnRzID0gJC5kYXRhKCB0aGlzLCBcIm1vYmlsZS1ldmVudHNcIiApO1xuXHRcdFx0aWYgKCBldmVudHMgKSB7XG5cdFx0XHRcdGNvbnRleHQgPSBldmVudHMuc3dpcGU7XG5cdFx0XHRcdGRlbGV0ZSBldmVudHMuc3dpcGU7XG5cdFx0XHRcdGV2ZW50cy5sZW5ndGgtLTtcblx0XHRcdFx0aWYgKCBldmVudHMubGVuZ3RoID09PSAwICkge1xuXHRcdFx0XHRcdCQucmVtb3ZlRGF0YSggdGhpcywgXCJtb2JpbGUtZXZlbnRzXCIgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIGNvbnRleHQgKSB7XG5cdFx0XHRcdGlmICggY29udGV4dC5zdGFydCApIHtcblx0XHRcdFx0XHQkKCB0aGlzICkub2ZmKCB0b3VjaFN0YXJ0RXZlbnQsIGNvbnRleHQuc3RhcnQgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoIGNvbnRleHQubW92ZSApIHtcblx0XHRcdFx0XHQkZG9jdW1lbnQub2ZmKCB0b3VjaE1vdmVFdmVudCwgY29udGV4dC5tb3ZlICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCBjb250ZXh0LnN0b3AgKSB7XG5cdFx0XHRcdFx0JGRvY3VtZW50Lm9mZiggdG91Y2hTdG9wRXZlbnQsIGNvbnRleHQuc3RvcCApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXHQkLmVhY2goe1xuXHRcdHN3aXBlbGVmdDogXCJzd2lwZS5sZWZ0XCIsXG5cdFx0c3dpcGVyaWdodDogXCJzd2lwZS5yaWdodFwiXG5cdH0sIGZ1bmN0aW9uKCBldmVudCwgc291cmNlRXZlbnQgKSB7XG5cblx0XHQkLmV2ZW50LnNwZWNpYWxbIGV2ZW50IF0gPSB7XG5cdFx0XHRzZXR1cDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQoIHRoaXMgKS5iaW5kKCBzb3VyY2VFdmVudCwgJC5ub29wICk7XG5cdFx0XHR9LFxuXHRcdFx0dGVhcmRvd246IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCB0aGlzICkudW5iaW5kKCBzb3VyY2VFdmVudCApO1xuXHRcdFx0fVxuXHRcdH07XG5cdH0pO1xufSkoIGpRdWVyeSwgdGhpcyApO1xuKi9cbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuY29uc3QgTXV0YXRpb25PYnNlcnZlciA9IChmdW5jdGlvbiAoKSB7XG4gIHZhciBwcmVmaXhlcyA9IFsnV2ViS2l0JywgJ01veicsICdPJywgJ01zJywgJyddO1xuICBmb3IgKHZhciBpPTA7IGkgPCBwcmVmaXhlcy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChgJHtwcmVmaXhlc1tpXX1NdXRhdGlvbk9ic2VydmVyYCBpbiB3aW5kb3cpIHtcbiAgICAgIHJldHVybiB3aW5kb3dbYCR7cHJlZml4ZXNbaV19TXV0YXRpb25PYnNlcnZlcmBdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59KCkpO1xuXG5jb25zdCB0cmlnZ2VycyA9IChlbCwgdHlwZSkgPT4ge1xuICBlbC5kYXRhKHR5cGUpLnNwbGl0KCcgJykuZm9yRWFjaChpZCA9PiB7XG4gICAgJChgIyR7aWR9YClbIHR5cGUgPT09ICdjbG9zZScgPyAndHJpZ2dlcicgOiAndHJpZ2dlckhhbmRsZXInXShgJHt0eXBlfS56Zi50cmlnZ2VyYCwgW2VsXSk7XG4gIH0pO1xufTtcbi8vIEVsZW1lbnRzIHdpdGggW2RhdGEtb3Blbl0gd2lsbCByZXZlYWwgYSBwbHVnaW4gdGhhdCBzdXBwb3J0cyBpdCB3aGVuIGNsaWNrZWQuXG4kKGRvY3VtZW50KS5vbignY2xpY2suemYudHJpZ2dlcicsICdbZGF0YS1vcGVuXScsIGZ1bmN0aW9uKCkge1xuICB0cmlnZ2VycygkKHRoaXMpLCAnb3BlbicpO1xufSk7XG5cbi8vIEVsZW1lbnRzIHdpdGggW2RhdGEtY2xvc2VdIHdpbGwgY2xvc2UgYSBwbHVnaW4gdGhhdCBzdXBwb3J0cyBpdCB3aGVuIGNsaWNrZWQuXG4vLyBJZiB1c2VkIHdpdGhvdXQgYSB2YWx1ZSBvbiBbZGF0YS1jbG9zZV0sIHRoZSBldmVudCB3aWxsIGJ1YmJsZSwgYWxsb3dpbmcgaXQgdG8gY2xvc2UgYSBwYXJlbnQgY29tcG9uZW50LlxuJChkb2N1bWVudCkub24oJ2NsaWNrLnpmLnRyaWdnZXInLCAnW2RhdGEtY2xvc2VdJywgZnVuY3Rpb24oKSB7XG4gIGxldCBpZCA9ICQodGhpcykuZGF0YSgnY2xvc2UnKTtcbiAgaWYgKGlkKSB7XG4gICAgdHJpZ2dlcnMoJCh0aGlzKSwgJ2Nsb3NlJyk7XG4gIH1cbiAgZWxzZSB7XG4gICAgJCh0aGlzKS50cmlnZ2VyKCdjbG9zZS56Zi50cmlnZ2VyJyk7XG4gIH1cbn0pO1xuXG4vLyBFbGVtZW50cyB3aXRoIFtkYXRhLXRvZ2dsZV0gd2lsbCB0b2dnbGUgYSBwbHVnaW4gdGhhdCBzdXBwb3J0cyBpdCB3aGVuIGNsaWNrZWQuXG4kKGRvY3VtZW50KS5vbignY2xpY2suemYudHJpZ2dlcicsICdbZGF0YS10b2dnbGVdJywgZnVuY3Rpb24oKSB7XG4gIGxldCBpZCA9ICQodGhpcykuZGF0YSgndG9nZ2xlJyk7XG4gIGlmIChpZCkge1xuICAgIHRyaWdnZXJzKCQodGhpcyksICd0b2dnbGUnKTtcbiAgfSBlbHNlIHtcbiAgICAkKHRoaXMpLnRyaWdnZXIoJ3RvZ2dsZS56Zi50cmlnZ2VyJyk7XG4gIH1cbn0pO1xuXG4vLyBFbGVtZW50cyB3aXRoIFtkYXRhLWNsb3NhYmxlXSB3aWxsIHJlc3BvbmQgdG8gY2xvc2UuemYudHJpZ2dlciBldmVudHMuXG4kKGRvY3VtZW50KS5vbignY2xvc2UuemYudHJpZ2dlcicsICdbZGF0YS1jbG9zYWJsZV0nLCBmdW5jdGlvbihlKXtcbiAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgbGV0IGFuaW1hdGlvbiA9ICQodGhpcykuZGF0YSgnY2xvc2FibGUnKTtcblxuICBpZihhbmltYXRpb24gIT09ICcnKXtcbiAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlT3V0KCQodGhpcyksIGFuaW1hdGlvbiwgZnVuY3Rpb24oKSB7XG4gICAgICAkKHRoaXMpLnRyaWdnZXIoJ2Nsb3NlZC56ZicpO1xuICAgIH0pO1xuICB9ZWxzZXtcbiAgICAkKHRoaXMpLmZhZGVPdXQoKS50cmlnZ2VyKCdjbG9zZWQuemYnKTtcbiAgfVxufSk7XG5cbiQoZG9jdW1lbnQpLm9uKCdmb2N1cy56Zi50cmlnZ2VyIGJsdXIuemYudHJpZ2dlcicsICdbZGF0YS10b2dnbGUtZm9jdXNdJywgZnVuY3Rpb24oKSB7XG4gIGxldCBpZCA9ICQodGhpcykuZGF0YSgndG9nZ2xlLWZvY3VzJyk7XG4gICQoYCMke2lkfWApLnRyaWdnZXJIYW5kbGVyKCd0b2dnbGUuemYudHJpZ2dlcicsIFskKHRoaXMpXSk7XG59KTtcblxuLyoqXG4qIEZpcmVzIG9uY2UgYWZ0ZXIgYWxsIG90aGVyIHNjcmlwdHMgaGF2ZSBsb2FkZWRcbiogQGZ1bmN0aW9uXG4qIEBwcml2YXRlXG4qL1xuJCh3aW5kb3cpLm9uKCdsb2FkJywgKCkgPT4ge1xuICBjaGVja0xpc3RlbmVycygpO1xufSk7XG5cbmZ1bmN0aW9uIGNoZWNrTGlzdGVuZXJzKCkge1xuICBldmVudHNMaXN0ZW5lcigpO1xuICByZXNpemVMaXN0ZW5lcigpO1xuICBzY3JvbGxMaXN0ZW5lcigpO1xuICBjbG9zZW1lTGlzdGVuZXIoKTtcbn1cblxuLy8qKioqKioqKiBvbmx5IGZpcmVzIHRoaXMgZnVuY3Rpb24gb25jZSBvbiBsb2FkLCBpZiB0aGVyZSdzIHNvbWV0aGluZyB0byB3YXRjaCAqKioqKioqKlxuZnVuY3Rpb24gY2xvc2VtZUxpc3RlbmVyKHBsdWdpbk5hbWUpIHtcbiAgdmFyIHlldGlCb3hlcyA9ICQoJ1tkYXRhLXlldGktYm94XScpLFxuICAgICAgcGx1Z05hbWVzID0gWydkcm9wZG93bicsICd0b29sdGlwJywgJ3JldmVhbCddO1xuXG4gIGlmKHBsdWdpbk5hbWUpe1xuICAgIGlmKHR5cGVvZiBwbHVnaW5OYW1lID09PSAnc3RyaW5nJyl7XG4gICAgICBwbHVnTmFtZXMucHVzaChwbHVnaW5OYW1lKTtcbiAgICB9ZWxzZSBpZih0eXBlb2YgcGx1Z2luTmFtZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHBsdWdpbk5hbWVbMF0gPT09ICdzdHJpbmcnKXtcbiAgICAgIHBsdWdOYW1lcy5jb25jYXQocGx1Z2luTmFtZSk7XG4gICAgfWVsc2V7XG4gICAgICBjb25zb2xlLmVycm9yKCdQbHVnaW4gbmFtZXMgbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfVxuICB9XG4gIGlmKHlldGlCb3hlcy5sZW5ndGgpe1xuICAgIGxldCBsaXN0ZW5lcnMgPSBwbHVnTmFtZXMubWFwKChuYW1lKSA9PiB7XG4gICAgICByZXR1cm4gYGNsb3NlbWUuemYuJHtuYW1lfWA7XG4gICAgfSkuam9pbignICcpO1xuXG4gICAgJCh3aW5kb3cpLm9mZihsaXN0ZW5lcnMpLm9uKGxpc3RlbmVycywgZnVuY3Rpb24oZSwgcGx1Z2luSWQpe1xuICAgICAgbGV0IHBsdWdpbiA9IGUubmFtZXNwYWNlLnNwbGl0KCcuJylbMF07XG4gICAgICBsZXQgcGx1Z2lucyA9ICQoYFtkYXRhLSR7cGx1Z2lufV1gKS5ub3QoYFtkYXRhLXlldGktYm94PVwiJHtwbHVnaW5JZH1cIl1gKTtcblxuICAgICAgcGx1Z2lucy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgIGxldCBfdGhpcyA9ICQodGhpcyk7XG5cbiAgICAgICAgX3RoaXMudHJpZ2dlckhhbmRsZXIoJ2Nsb3NlLnpmLnRyaWdnZXInLCBbX3RoaXNdKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlc2l6ZUxpc3RlbmVyKGRlYm91bmNlKXtcbiAgbGV0IHRpbWVyLFxuICAgICAgJG5vZGVzID0gJCgnW2RhdGEtcmVzaXplXScpO1xuICBpZigkbm9kZXMubGVuZ3RoKXtcbiAgICAkKHdpbmRvdykub2ZmKCdyZXNpemUuemYudHJpZ2dlcicpXG4gICAgLm9uKCdyZXNpemUuemYudHJpZ2dlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIGlmICh0aW1lcikgeyBjbGVhclRpbWVvdXQodGltZXIpOyB9XG5cbiAgICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuXG4gICAgICAgIGlmKCFNdXRhdGlvbk9ic2VydmVyKXsvL2ZhbGxiYWNrIGZvciBJRSA5XG4gICAgICAgICAgJG5vZGVzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICQodGhpcykudHJpZ2dlckhhbmRsZXIoJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvL3RyaWdnZXIgYWxsIGxpc3RlbmluZyBlbGVtZW50cyBhbmQgc2lnbmFsIGEgcmVzaXplIGV2ZW50XG4gICAgICAgICRub2Rlcy5hdHRyKCdkYXRhLWV2ZW50cycsIFwicmVzaXplXCIpO1xuICAgICAgfSwgZGVib3VuY2UgfHwgMTApOy8vZGVmYXVsdCB0aW1lIHRvIGVtaXQgcmVzaXplIGV2ZW50XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2Nyb2xsTGlzdGVuZXIoZGVib3VuY2Upe1xuICBsZXQgdGltZXIsXG4gICAgICAkbm9kZXMgPSAkKCdbZGF0YS1zY3JvbGxdJyk7XG4gIGlmKCRub2Rlcy5sZW5ndGgpe1xuICAgICQod2luZG93KS5vZmYoJ3Njcm9sbC56Zi50cmlnZ2VyJylcbiAgICAub24oJ3Njcm9sbC56Zi50cmlnZ2VyJywgZnVuY3Rpb24oZSl7XG4gICAgICBpZih0aW1lcil7IGNsZWFyVGltZW91dCh0aW1lcik7IH1cblxuICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cbiAgICAgICAgaWYoIU11dGF0aW9uT2JzZXJ2ZXIpey8vZmFsbGJhY2sgZm9yIElFIDlcbiAgICAgICAgICAkbm9kZXMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VySGFuZGxlcignc2Nyb2xsbWUuemYudHJpZ2dlcicpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vdHJpZ2dlciBhbGwgbGlzdGVuaW5nIGVsZW1lbnRzIGFuZCBzaWduYWwgYSBzY3JvbGwgZXZlbnRcbiAgICAgICAgJG5vZGVzLmF0dHIoJ2RhdGEtZXZlbnRzJywgXCJzY3JvbGxcIik7XG4gICAgICB9LCBkZWJvdW5jZSB8fCAxMCk7Ly9kZWZhdWx0IHRpbWUgdG8gZW1pdCBzY3JvbGwgZXZlbnRcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBldmVudHNMaXN0ZW5lcigpIHtcbiAgaWYoIU11dGF0aW9uT2JzZXJ2ZXIpeyByZXR1cm4gZmFsc2U7IH1cbiAgbGV0IG5vZGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtcmVzaXplXSwgW2RhdGEtc2Nyb2xsXSwgW2RhdGEtbXV0YXRlXScpO1xuXG4gIC8vZWxlbWVudCBjYWxsYmFja1xuICB2YXIgbGlzdGVuaW5nRWxlbWVudHNNdXRhdGlvbiA9IGZ1bmN0aW9uIChtdXRhdGlvblJlY29yZHNMaXN0KSB7XG4gICAgICB2YXIgJHRhcmdldCA9ICQobXV0YXRpb25SZWNvcmRzTGlzdFswXS50YXJnZXQpO1xuXG5cdCAgLy90cmlnZ2VyIHRoZSBldmVudCBoYW5kbGVyIGZvciB0aGUgZWxlbWVudCBkZXBlbmRpbmcgb24gdHlwZVxuICAgICAgc3dpdGNoIChtdXRhdGlvblJlY29yZHNMaXN0WzBdLnR5cGUpIHtcblxuICAgICAgICBjYXNlIFwiYXR0cmlidXRlc1wiOlxuICAgICAgICAgIGlmICgkdGFyZ2V0LmF0dHIoXCJkYXRhLWV2ZW50c1wiKSA9PT0gXCJzY3JvbGxcIiAmJiBtdXRhdGlvblJlY29yZHNMaXN0WzBdLmF0dHJpYnV0ZU5hbWUgPT09IFwiZGF0YS1ldmVudHNcIikge1xuXHRcdCAgXHQkdGFyZ2V0LnRyaWdnZXJIYW5kbGVyKCdzY3JvbGxtZS56Zi50cmlnZ2VyJywgWyR0YXJnZXQsIHdpbmRvdy5wYWdlWU9mZnNldF0pO1xuXHRcdCAgfVxuXHRcdCAgaWYgKCR0YXJnZXQuYXR0cihcImRhdGEtZXZlbnRzXCIpID09PSBcInJlc2l6ZVwiICYmIG11dGF0aW9uUmVjb3Jkc0xpc3RbMF0uYXR0cmlidXRlTmFtZSA9PT0gXCJkYXRhLWV2ZW50c1wiKSB7XG5cdFx0ICBcdCR0YXJnZXQudHJpZ2dlckhhbmRsZXIoJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInLCBbJHRhcmdldF0pO1xuXHRcdCAgIH1cblx0XHQgIGlmIChtdXRhdGlvblJlY29yZHNMaXN0WzBdLmF0dHJpYnV0ZU5hbWUgPT09IFwic3R5bGVcIikge1xuXHRcdFx0ICAkdGFyZ2V0LmNsb3Nlc3QoXCJbZGF0YS1tdXRhdGVdXCIpLmF0dHIoXCJkYXRhLWV2ZW50c1wiLFwibXV0YXRlXCIpO1xuXHRcdFx0ICAkdGFyZ2V0LmNsb3Nlc3QoXCJbZGF0YS1tdXRhdGVdXCIpLnRyaWdnZXJIYW5kbGVyKCdtdXRhdGVtZS56Zi50cmlnZ2VyJywgWyR0YXJnZXQuY2xvc2VzdChcIltkYXRhLW11dGF0ZV1cIildKTtcblx0XHQgIH1cblx0XHQgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgXCJjaGlsZExpc3RcIjpcblx0XHQgICR0YXJnZXQuY2xvc2VzdChcIltkYXRhLW11dGF0ZV1cIikuYXR0cihcImRhdGEtZXZlbnRzXCIsXCJtdXRhdGVcIik7XG5cdFx0ICAkdGFyZ2V0LmNsb3Nlc3QoXCJbZGF0YS1tdXRhdGVdXCIpLnRyaWdnZXJIYW5kbGVyKCdtdXRhdGVtZS56Zi50cmlnZ2VyJywgWyR0YXJnZXQuY2xvc2VzdChcIltkYXRhLW11dGF0ZV1cIildKTtcbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgLy9ub3RoaW5nXG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmIChub2Rlcy5sZW5ndGgpIHtcbiAgICAgIC8vZm9yIGVhY2ggZWxlbWVudCB0aGF0IG5lZWRzIHRvIGxpc3RlbiBmb3IgcmVzaXppbmcsIHNjcm9sbGluZywgb3IgbXV0YXRpb24gYWRkIGEgc2luZ2xlIG9ic2VydmVyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8PSBub2Rlcy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgdmFyIGVsZW1lbnRPYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGxpc3RlbmluZ0VsZW1lbnRzTXV0YXRpb24pO1xuICAgICAgICBlbGVtZW50T2JzZXJ2ZXIub2JzZXJ2ZShub2Rlc1tpXSwgeyBhdHRyaWJ1dGVzOiB0cnVlLCBjaGlsZExpc3Q6IHRydWUsIGNoYXJhY3RlckRhdGE6IGZhbHNlLCBzdWJ0cmVlOiB0cnVlLCBhdHRyaWJ1dGVGaWx0ZXI6IFtcImRhdGEtZXZlbnRzXCIsIFwic3R5bGVcIl0gfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBbUEhdXG4vLyBGb3VuZGF0aW9uLkNoZWNrV2F0Y2hlcnMgPSBjaGVja1dhdGNoZXJzO1xuRm91bmRhdGlvbi5JSGVhcllvdSA9IGNoZWNrTGlzdGVuZXJzO1xuLy8gRm91bmRhdGlvbi5JU2VlWW91ID0gc2Nyb2xsTGlzdGVuZXI7XG4vLyBGb3VuZGF0aW9uLklGZWVsWW91ID0gY2xvc2VtZUxpc3RlbmVyO1xuXG59KGpRdWVyeSk7XG4iLCIvKlxuICAgICBfIF8gICAgICBfICAgICAgIF9cbiBfX198IChfKSBfX198IHwgX18gIChfKV9fX1xuLyBfX3wgfCB8LyBfX3wgfC8gLyAgfCAvIF9ffFxuXFxfXyBcXCB8IHwgKF9ffCAgIDwgXyB8IFxcX18gXFxcbnxfX18vX3xffFxcX19ffF98XFxfKF8pLyB8X19fL1xuICAgICAgICAgICAgICAgICAgIHxfXy9cblxuIFZlcnNpb246IDEuOC4xXG4gIEF1dGhvcjogS2VuIFdoZWVsZXJcbiBXZWJzaXRlOiBodHRwOi8va2Vud2hlZWxlci5naXRodWIuaW9cbiAgICBEb2NzOiBodHRwOi8va2Vud2hlZWxlci5naXRodWIuaW8vc2xpY2tcbiAgICBSZXBvOiBodHRwOi8vZ2l0aHViLmNvbS9rZW53aGVlbGVyL3NsaWNrXG4gIElzc3VlczogaHR0cDovL2dpdGh1Yi5jb20va2Vud2hlZWxlci9zbGljay9pc3N1ZXNcblxuICovXG4vKiBnbG9iYWwgd2luZG93LCBkb2N1bWVudCwgZGVmaW5lLCBqUXVlcnksIHNldEludGVydmFsLCBjbGVhckludGVydmFsICovXG47KGZ1bmN0aW9uKGZhY3RvcnkpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICBkZWZpbmUoWydqcXVlcnknXSwgZmFjdG9yeSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJ2pxdWVyeScpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmYWN0b3J5KGpRdWVyeSk7XG4gICAgfVxuXG59KGZ1bmN0aW9uKCQpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgdmFyIFNsaWNrID0gd2luZG93LlNsaWNrIHx8IHt9O1xuXG4gICAgU2xpY2sgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIGluc3RhbmNlVWlkID0gMDtcblxuICAgICAgICBmdW5jdGlvbiBTbGljayhlbGVtZW50LCBzZXR0aW5ncykge1xuXG4gICAgICAgICAgICB2YXIgXyA9IHRoaXMsIGRhdGFTZXR0aW5ncztcblxuICAgICAgICAgICAgXy5kZWZhdWx0cyA9IHtcbiAgICAgICAgICAgICAgICBhY2Nlc3NpYmlsaXR5OiB0cnVlLFxuICAgICAgICAgICAgICAgIGFkYXB0aXZlSGVpZ2h0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhcHBlbmRBcnJvd3M6ICQoZWxlbWVudCksXG4gICAgICAgICAgICAgICAgYXBwZW5kRG90czogJChlbGVtZW50KSxcbiAgICAgICAgICAgICAgICBhcnJvd3M6IHRydWUsXG4gICAgICAgICAgICAgICAgYXNOYXZGb3I6IG51bGwsXG4gICAgICAgICAgICAgICAgcHJldkFycm93OiAnPGJ1dHRvbiBjbGFzcz1cInNsaWNrLXByZXZcIiBhcmlhLWxhYmVsPVwiUHJldmlvdXNcIiB0eXBlPVwiYnV0dG9uXCI+UHJldmlvdXM8L2J1dHRvbj4nLFxuICAgICAgICAgICAgICAgIG5leHRBcnJvdzogJzxidXR0b24gY2xhc3M9XCJzbGljay1uZXh0XCIgYXJpYS1sYWJlbD1cIk5leHRcIiB0eXBlPVwiYnV0dG9uXCI+TmV4dDwvYnV0dG9uPicsXG4gICAgICAgICAgICAgICAgYXV0b3BsYXk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGF1dG9wbGF5U3BlZWQ6IDMwMDAsXG4gICAgICAgICAgICAgICAgY2VudGVyTW9kZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgY2VudGVyUGFkZGluZzogJzUwcHgnLFxuICAgICAgICAgICAgICAgIGNzc0Vhc2U6ICdlYXNlJyxcbiAgICAgICAgICAgICAgICBjdXN0b21QYWdpbmc6IGZ1bmN0aW9uKHNsaWRlciwgaSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJCgnPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgLz4nKS50ZXh0KGkgKyAxKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRvdHM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGRvdHNDbGFzczogJ3NsaWNrLWRvdHMnLFxuICAgICAgICAgICAgICAgIGRyYWdnYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBlYXNpbmc6ICdsaW5lYXInLFxuICAgICAgICAgICAgICAgIGVkZ2VGcmljdGlvbjogMC4zNSxcbiAgICAgICAgICAgICAgICBmYWRlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBmb2N1c09uU2VsZWN0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBmb2N1c09uQ2hhbmdlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBpbmZpbml0ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBpbml0aWFsU2xpZGU6IDAsXG4gICAgICAgICAgICAgICAgbGF6eUxvYWQ6ICdvbmRlbWFuZCcsXG4gICAgICAgICAgICAgICAgbW9iaWxlRmlyc3Q6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHBhdXNlT25Ib3ZlcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBwYXVzZU9uRm9jdXM6IHRydWUsXG4gICAgICAgICAgICAgICAgcGF1c2VPbkRvdHNIb3ZlcjogZmFsc2UsXG4gICAgICAgICAgICAgICAgcmVzcG9uZFRvOiAnd2luZG93JyxcbiAgICAgICAgICAgICAgICByZXNwb25zaXZlOiBudWxsLFxuICAgICAgICAgICAgICAgIHJvd3M6IDEsXG4gICAgICAgICAgICAgICAgcnRsOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzbGlkZTogJycsXG4gICAgICAgICAgICAgICAgc2xpZGVzUGVyUm93OiAxLFxuICAgICAgICAgICAgICAgIHNsaWRlc1RvU2hvdzogMSxcbiAgICAgICAgICAgICAgICBzbGlkZXNUb1Njcm9sbDogMSxcbiAgICAgICAgICAgICAgICBzcGVlZDogNTAwLFxuICAgICAgICAgICAgICAgIHN3aXBlOiB0cnVlLFxuICAgICAgICAgICAgICAgIHN3aXBlVG9TbGlkZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgdG91Y2hNb3ZlOiB0cnVlLFxuICAgICAgICAgICAgICAgIHRvdWNoVGhyZXNob2xkOiA1LFxuICAgICAgICAgICAgICAgIHVzZUNTUzogdHJ1ZSxcbiAgICAgICAgICAgICAgICB1c2VUcmFuc2Zvcm06IHRydWUsXG4gICAgICAgICAgICAgICAgdmFyaWFibGVXaWR0aDogZmFsc2UsXG4gICAgICAgICAgICAgICAgdmVydGljYWw6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHZlcnRpY2FsU3dpcGluZzogZmFsc2UsXG4gICAgICAgICAgICAgICAgd2FpdEZvckFuaW1hdGU6IHRydWUsXG4gICAgICAgICAgICAgICAgekluZGV4OiAxMDAwXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBfLmluaXRpYWxzID0ge1xuICAgICAgICAgICAgICAgIGFuaW1hdGluZzogZmFsc2UsXG4gICAgICAgICAgICAgICAgZHJhZ2dpbmc6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGF1dG9QbGF5VGltZXI6IG51bGwsXG4gICAgICAgICAgICAgICAgY3VycmVudERpcmVjdGlvbjogMCxcbiAgICAgICAgICAgICAgICBjdXJyZW50TGVmdDogbnVsbCxcbiAgICAgICAgICAgICAgICBjdXJyZW50U2xpZGU6IDAsXG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uOiAxLFxuICAgICAgICAgICAgICAgICRkb3RzOiBudWxsLFxuICAgICAgICAgICAgICAgIGxpc3RXaWR0aDogbnVsbCxcbiAgICAgICAgICAgICAgICBsaXN0SGVpZ2h0OiBudWxsLFxuICAgICAgICAgICAgICAgIGxvYWRJbmRleDogMCxcbiAgICAgICAgICAgICAgICAkbmV4dEFycm93OiBudWxsLFxuICAgICAgICAgICAgICAgICRwcmV2QXJyb3c6IG51bGwsXG4gICAgICAgICAgICAgICAgc2Nyb2xsaW5nOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzbGlkZUNvdW50OiBudWxsLFxuICAgICAgICAgICAgICAgIHNsaWRlV2lkdGg6IG51bGwsXG4gICAgICAgICAgICAgICAgJHNsaWRlVHJhY2s6IG51bGwsXG4gICAgICAgICAgICAgICAgJHNsaWRlczogbnVsbCxcbiAgICAgICAgICAgICAgICBzbGlkaW5nOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzbGlkZU9mZnNldDogMCxcbiAgICAgICAgICAgICAgICBzd2lwZUxlZnQ6IG51bGwsXG4gICAgICAgICAgICAgICAgc3dpcGluZzogZmFsc2UsXG4gICAgICAgICAgICAgICAgJGxpc3Q6IG51bGwsXG4gICAgICAgICAgICAgICAgdG91Y2hPYmplY3Q6IHt9LFxuICAgICAgICAgICAgICAgIHRyYW5zZm9ybXNFbmFibGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB1bnNsaWNrZWQ6IGZhbHNlXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkLmV4dGVuZChfLCBfLmluaXRpYWxzKTtcblxuICAgICAgICAgICAgXy5hY3RpdmVCcmVha3BvaW50ID0gbnVsbDtcbiAgICAgICAgICAgIF8uYW5pbVR5cGUgPSBudWxsO1xuICAgICAgICAgICAgXy5hbmltUHJvcCA9IG51bGw7XG4gICAgICAgICAgICBfLmJyZWFrcG9pbnRzID0gW107XG4gICAgICAgICAgICBfLmJyZWFrcG9pbnRTZXR0aW5ncyA9IFtdO1xuICAgICAgICAgICAgXy5jc3NUcmFuc2l0aW9ucyA9IGZhbHNlO1xuICAgICAgICAgICAgXy5mb2N1c3NlZCA9IGZhbHNlO1xuICAgICAgICAgICAgXy5pbnRlcnJ1cHRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgXy5oaWRkZW4gPSAnaGlkZGVuJztcbiAgICAgICAgICAgIF8ucGF1c2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIF8ucG9zaXRpb25Qcm9wID0gbnVsbDtcbiAgICAgICAgICAgIF8ucmVzcG9uZFRvID0gbnVsbDtcbiAgICAgICAgICAgIF8ucm93Q291bnQgPSAxO1xuICAgICAgICAgICAgXy5zaG91bGRDbGljayA9IHRydWU7XG4gICAgICAgICAgICBfLiRzbGlkZXIgPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgXy4kc2xpZGVzQ2FjaGUgPSBudWxsO1xuICAgICAgICAgICAgXy50cmFuc2Zvcm1UeXBlID0gbnVsbDtcbiAgICAgICAgICAgIF8udHJhbnNpdGlvblR5cGUgPSBudWxsO1xuICAgICAgICAgICAgXy52aXNpYmlsaXR5Q2hhbmdlID0gJ3Zpc2liaWxpdHljaGFuZ2UnO1xuICAgICAgICAgICAgXy53aW5kb3dXaWR0aCA9IDA7XG4gICAgICAgICAgICBfLndpbmRvd1RpbWVyID0gbnVsbDtcblxuICAgICAgICAgICAgZGF0YVNldHRpbmdzID0gJChlbGVtZW50KS5kYXRhKCdzbGljaycpIHx8IHt9O1xuXG4gICAgICAgICAgICBfLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgXy5kZWZhdWx0cywgc2V0dGluZ3MsIGRhdGFTZXR0aW5ncyk7XG5cbiAgICAgICAgICAgIF8uY3VycmVudFNsaWRlID0gXy5vcHRpb25zLmluaXRpYWxTbGlkZTtcblxuICAgICAgICAgICAgXy5vcmlnaW5hbFNldHRpbmdzID0gXy5vcHRpb25zO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGRvY3VtZW50Lm1vekhpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBfLmhpZGRlbiA9ICdtb3pIaWRkZW4nO1xuICAgICAgICAgICAgICAgIF8udmlzaWJpbGl0eUNoYW5nZSA9ICdtb3p2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50LndlYmtpdEhpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBfLmhpZGRlbiA9ICd3ZWJraXRIaWRkZW4nO1xuICAgICAgICAgICAgICAgIF8udmlzaWJpbGl0eUNoYW5nZSA9ICd3ZWJraXR2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgXy5hdXRvUGxheSA9ICQucHJveHkoXy5hdXRvUGxheSwgXyk7XG4gICAgICAgICAgICBfLmF1dG9QbGF5Q2xlYXIgPSAkLnByb3h5KF8uYXV0b1BsYXlDbGVhciwgXyk7XG4gICAgICAgICAgICBfLmF1dG9QbGF5SXRlcmF0b3IgPSAkLnByb3h5KF8uYXV0b1BsYXlJdGVyYXRvciwgXyk7XG4gICAgICAgICAgICBfLmNoYW5nZVNsaWRlID0gJC5wcm94eShfLmNoYW5nZVNsaWRlLCBfKTtcbiAgICAgICAgICAgIF8uY2xpY2tIYW5kbGVyID0gJC5wcm94eShfLmNsaWNrSGFuZGxlciwgXyk7XG4gICAgICAgICAgICBfLnNlbGVjdEhhbmRsZXIgPSAkLnByb3h5KF8uc2VsZWN0SGFuZGxlciwgXyk7XG4gICAgICAgICAgICBfLnNldFBvc2l0aW9uID0gJC5wcm94eShfLnNldFBvc2l0aW9uLCBfKTtcbiAgICAgICAgICAgIF8uc3dpcGVIYW5kbGVyID0gJC5wcm94eShfLnN3aXBlSGFuZGxlciwgXyk7XG4gICAgICAgICAgICBfLmRyYWdIYW5kbGVyID0gJC5wcm94eShfLmRyYWdIYW5kbGVyLCBfKTtcbiAgICAgICAgICAgIF8ua2V5SGFuZGxlciA9ICQucHJveHkoXy5rZXlIYW5kbGVyLCBfKTtcblxuICAgICAgICAgICAgXy5pbnN0YW5jZVVpZCA9IGluc3RhbmNlVWlkKys7XG5cbiAgICAgICAgICAgIC8vIEEgc2ltcGxlIHdheSB0byBjaGVjayBmb3IgSFRNTCBzdHJpbmdzXG4gICAgICAgICAgICAvLyBTdHJpY3QgSFRNTCByZWNvZ25pdGlvbiAobXVzdCBzdGFydCB3aXRoIDwpXG4gICAgICAgICAgICAvLyBFeHRyYWN0ZWQgZnJvbSBqUXVlcnkgdjEuMTEgc291cmNlXG4gICAgICAgICAgICBfLmh0bWxFeHByID0gL14oPzpcXHMqKDxbXFx3XFxXXSs+KVtePl0qKSQvO1xuXG5cbiAgICAgICAgICAgIF8ucmVnaXN0ZXJCcmVha3BvaW50cygpO1xuICAgICAgICAgICAgXy5pbml0KHRydWUpO1xuXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gU2xpY2s7XG5cbiAgICB9KCkpO1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmFjdGl2YXRlQURBID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBfLiRzbGlkZVRyYWNrLmZpbmQoJy5zbGljay1hY3RpdmUnKS5hdHRyKHtcbiAgICAgICAgICAgICdhcmlhLWhpZGRlbic6ICdmYWxzZSdcbiAgICAgICAgfSkuZmluZCgnYSwgaW5wdXQsIGJ1dHRvbiwgc2VsZWN0JykuYXR0cih7XG4gICAgICAgICAgICAndGFiaW5kZXgnOiAnMCdcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmFkZFNsaWRlID0gU2xpY2sucHJvdG90eXBlLnNsaWNrQWRkID0gZnVuY3Rpb24obWFya3VwLCBpbmRleCwgYWRkQmVmb3JlKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIGlmICh0eXBlb2YoaW5kZXgpID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIGFkZEJlZm9yZSA9IGluZGV4O1xuICAgICAgICAgICAgaW5kZXggPSBudWxsO1xuICAgICAgICB9IGVsc2UgaWYgKGluZGV4IDwgMCB8fCAoaW5kZXggPj0gXy5zbGlkZUNvdW50KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgXy51bmxvYWQoKTtcblxuICAgICAgICBpZiAodHlwZW9mKGluZGV4KSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIGlmIChpbmRleCA9PT0gMCAmJiBfLiRzbGlkZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgJChtYXJrdXApLmFwcGVuZFRvKF8uJHNsaWRlVHJhY2spO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChhZGRCZWZvcmUpIHtcbiAgICAgICAgICAgICAgICAkKG1hcmt1cCkuaW5zZXJ0QmVmb3JlKF8uJHNsaWRlcy5lcShpbmRleCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKG1hcmt1cCkuaW5zZXJ0QWZ0ZXIoXy4kc2xpZGVzLmVxKGluZGV4KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoYWRkQmVmb3JlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgJChtYXJrdXApLnByZXBlbmRUbyhfLiRzbGlkZVRyYWNrKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJChtYXJrdXApLmFwcGVuZFRvKF8uJHNsaWRlVHJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgXy4kc2xpZGVzID0gXy4kc2xpZGVUcmFjay5jaGlsZHJlbih0aGlzLm9wdGlvbnMuc2xpZGUpO1xuXG4gICAgICAgIF8uJHNsaWRlVHJhY2suY2hpbGRyZW4odGhpcy5vcHRpb25zLnNsaWRlKS5kZXRhY2goKTtcblxuICAgICAgICBfLiRzbGlkZVRyYWNrLmFwcGVuZChfLiRzbGlkZXMpO1xuXG4gICAgICAgIF8uJHNsaWRlcy5lYWNoKGZ1bmN0aW9uKGluZGV4LCBlbGVtZW50KSB7XG4gICAgICAgICAgICAkKGVsZW1lbnQpLmF0dHIoJ2RhdGEtc2xpY2staW5kZXgnLCBpbmRleCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIF8uJHNsaWRlc0NhY2hlID0gXy4kc2xpZGVzO1xuXG4gICAgICAgIF8ucmVpbml0KCk7XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmFuaW1hdGVIZWlnaHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuICAgICAgICBpZiAoXy5vcHRpb25zLnNsaWRlc1RvU2hvdyA9PT0gMSAmJiBfLm9wdGlvbnMuYWRhcHRpdmVIZWlnaHQgPT09IHRydWUgJiYgXy5vcHRpb25zLnZlcnRpY2FsID09PSBmYWxzZSkge1xuICAgICAgICAgICAgdmFyIHRhcmdldEhlaWdodCA9IF8uJHNsaWRlcy5lcShfLmN1cnJlbnRTbGlkZSkub3V0ZXJIZWlnaHQodHJ1ZSk7XG4gICAgICAgICAgICBfLiRsaXN0LmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIGhlaWdodDogdGFyZ2V0SGVpZ2h0XG4gICAgICAgICAgICB9LCBfLm9wdGlvbnMuc3BlZWQpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5hbmltYXRlU2xpZGUgPSBmdW5jdGlvbih0YXJnZXRMZWZ0LCBjYWxsYmFjaykge1xuXG4gICAgICAgIHZhciBhbmltUHJvcHMgPSB7fSxcbiAgICAgICAgICAgIF8gPSB0aGlzO1xuXG4gICAgICAgIF8uYW5pbWF0ZUhlaWdodCgpO1xuXG4gICAgICAgIGlmIChfLm9wdGlvbnMucnRsID09PSB0cnVlICYmIF8ub3B0aW9ucy52ZXJ0aWNhbCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRhcmdldExlZnQgPSAtdGFyZ2V0TGVmdDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoXy50cmFuc2Zvcm1zRW5hYmxlZCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGlmIChfLm9wdGlvbnMudmVydGljYWwgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgXy4kc2xpZGVUcmFjay5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogdGFyZ2V0TGVmdFxuICAgICAgICAgICAgICAgIH0sIF8ub3B0aW9ucy5zcGVlZCwgXy5vcHRpb25zLmVhc2luZywgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBfLiRzbGlkZVRyYWNrLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgICAgICB0b3A6IHRhcmdldExlZnRcbiAgICAgICAgICAgICAgICB9LCBfLm9wdGlvbnMuc3BlZWQsIF8ub3B0aW9ucy5lYXNpbmcsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICBpZiAoXy5jc3NUcmFuc2l0aW9ucyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5vcHRpb25zLnJ0bCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBfLmN1cnJlbnRMZWZ0ID0gLShfLmN1cnJlbnRMZWZ0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJCh7XG4gICAgICAgICAgICAgICAgICAgIGFuaW1TdGFydDogXy5jdXJyZW50TGVmdFxuICAgICAgICAgICAgICAgIH0pLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgICAgICBhbmltU3RhcnQ6IHRhcmdldExlZnRcbiAgICAgICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiBfLm9wdGlvbnMuc3BlZWQsXG4gICAgICAgICAgICAgICAgICAgIGVhc2luZzogXy5vcHRpb25zLmVhc2luZyxcbiAgICAgICAgICAgICAgICAgICAgc3RlcDogZnVuY3Rpb24obm93KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub3cgPSBNYXRoLmNlaWwobm93KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfLm9wdGlvbnMudmVydGljYWwgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5pbVByb3BzW18uYW5pbVR5cGVdID0gJ3RyYW5zbGF0ZSgnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm93ICsgJ3B4LCAwcHgpJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLiRzbGlkZVRyYWNrLmNzcyhhbmltUHJvcHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmltUHJvcHNbXy5hbmltVHlwZV0gPSAndHJhbnNsYXRlKDBweCwnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm93ICsgJ3B4KSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXy4kc2xpZGVUcmFjay5jc3MoYW5pbVByb3BzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgY29tcGxldGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICBfLmFwcGx5VHJhbnNpdGlvbigpO1xuICAgICAgICAgICAgICAgIHRhcmdldExlZnQgPSBNYXRoLmNlaWwodGFyZ2V0TGVmdCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoXy5vcHRpb25zLnZlcnRpY2FsID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICBhbmltUHJvcHNbXy5hbmltVHlwZV0gPSAndHJhbnNsYXRlM2QoJyArIHRhcmdldExlZnQgKyAncHgsIDBweCwgMHB4KSc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYW5pbVByb3BzW18uYW5pbVR5cGVdID0gJ3RyYW5zbGF0ZTNkKDBweCwnICsgdGFyZ2V0TGVmdCArICdweCwgMHB4KSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF8uJHNsaWRlVHJhY2suY3NzKGFuaW1Qcm9wcyk7XG5cbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgXy5kaXNhYmxlVHJhbnNpdGlvbigpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIF8ub3B0aW9ucy5zcGVlZCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5nZXROYXZUYXJnZXQgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXMsXG4gICAgICAgICAgICBhc05hdkZvciA9IF8ub3B0aW9ucy5hc05hdkZvcjtcblxuICAgICAgICBpZiAoIGFzTmF2Rm9yICYmIGFzTmF2Rm9yICE9PSBudWxsICkge1xuICAgICAgICAgICAgYXNOYXZGb3IgPSAkKGFzTmF2Rm9yKS5ub3QoXy4kc2xpZGVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhc05hdkZvcjtcblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuYXNOYXZGb3IgPSBmdW5jdGlvbihpbmRleCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcyxcbiAgICAgICAgICAgIGFzTmF2Rm9yID0gXy5nZXROYXZUYXJnZXQoKTtcblxuICAgICAgICBpZiAoIGFzTmF2Rm9yICE9PSBudWxsICYmIHR5cGVvZiBhc05hdkZvciA9PT0gJ29iamVjdCcgKSB7XG4gICAgICAgICAgICBhc05hdkZvci5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXQgPSAkKHRoaXMpLnNsaWNrKCdnZXRTbGljaycpO1xuICAgICAgICAgICAgICAgIGlmKCF0YXJnZXQudW5zbGlja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldC5zbGlkZUhhbmRsZXIoaW5kZXgsIHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmFwcGx5VHJhbnNpdGlvbiA9IGZ1bmN0aW9uKHNsaWRlKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzLFxuICAgICAgICAgICAgdHJhbnNpdGlvbiA9IHt9O1xuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuZmFkZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRyYW5zaXRpb25bXy50cmFuc2l0aW9uVHlwZV0gPSBfLnRyYW5zZm9ybVR5cGUgKyAnICcgKyBfLm9wdGlvbnMuc3BlZWQgKyAnbXMgJyArIF8ub3B0aW9ucy5jc3NFYXNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdHJhbnNpdGlvbltfLnRyYW5zaXRpb25UeXBlXSA9ICdvcGFjaXR5ICcgKyBfLm9wdGlvbnMuc3BlZWQgKyAnbXMgJyArIF8ub3B0aW9ucy5jc3NFYXNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5mYWRlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgXy4kc2xpZGVUcmFjay5jc3ModHJhbnNpdGlvbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBfLiRzbGlkZXMuZXEoc2xpZGUpLmNzcyh0cmFuc2l0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5hdXRvUGxheSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBfLmF1dG9QbGF5Q2xlYXIoKTtcblxuICAgICAgICBpZiAoIF8uc2xpZGVDb3VudCA+IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgKSB7XG4gICAgICAgICAgICBfLmF1dG9QbGF5VGltZXIgPSBzZXRJbnRlcnZhbCggXy5hdXRvUGxheUl0ZXJhdG9yLCBfLm9wdGlvbnMuYXV0b3BsYXlTcGVlZCApO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmF1dG9QbGF5Q2xlYXIgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgaWYgKF8uYXV0b1BsYXlUaW1lcikge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChfLmF1dG9QbGF5VGltZXIpO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmF1dG9QbGF5SXRlcmF0b3IgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXMsXG4gICAgICAgICAgICBzbGlkZVRvID0gXy5jdXJyZW50U2xpZGUgKyBfLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGw7XG5cbiAgICAgICAgaWYgKCAhXy5wYXVzZWQgJiYgIV8uaW50ZXJydXB0ZWQgJiYgIV8uZm9jdXNzZWQgKSB7XG5cbiAgICAgICAgICAgIGlmICggXy5vcHRpb25zLmluZmluaXRlID09PSBmYWxzZSApIHtcblxuICAgICAgICAgICAgICAgIGlmICggXy5kaXJlY3Rpb24gPT09IDEgJiYgKCBfLmN1cnJlbnRTbGlkZSArIDEgKSA9PT0gKCBfLnNsaWRlQ291bnQgLSAxICkpIHtcbiAgICAgICAgICAgICAgICAgICAgXy5kaXJlY3Rpb24gPSAwO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKCBfLmRpcmVjdGlvbiA9PT0gMCApIHtcblxuICAgICAgICAgICAgICAgICAgICBzbGlkZVRvID0gXy5jdXJyZW50U2xpZGUgLSBfLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGw7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCBfLmN1cnJlbnRTbGlkZSAtIDEgPT09IDAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfLmRpcmVjdGlvbiA9IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBfLnNsaWRlSGFuZGxlciggc2xpZGVUbyApO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuYnVpbGRBcnJvd3MgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5hcnJvd3MgPT09IHRydWUgKSB7XG5cbiAgICAgICAgICAgIF8uJHByZXZBcnJvdyA9ICQoXy5vcHRpb25zLnByZXZBcnJvdykuYWRkQ2xhc3MoJ3NsaWNrLWFycm93Jyk7XG4gICAgICAgICAgICBfLiRuZXh0QXJyb3cgPSAkKF8ub3B0aW9ucy5uZXh0QXJyb3cpLmFkZENsYXNzKCdzbGljay1hcnJvdycpO1xuXG4gICAgICAgICAgICBpZiggXy5zbGlkZUNvdW50ID4gXy5vcHRpb25zLnNsaWRlc1RvU2hvdyApIHtcblxuICAgICAgICAgICAgICAgIF8uJHByZXZBcnJvdy5yZW1vdmVDbGFzcygnc2xpY2staGlkZGVuJykucmVtb3ZlQXR0cignYXJpYS1oaWRkZW4gdGFiaW5kZXgnKTtcbiAgICAgICAgICAgICAgICBfLiRuZXh0QXJyb3cucmVtb3ZlQ2xhc3MoJ3NsaWNrLWhpZGRlbicpLnJlbW92ZUF0dHIoJ2FyaWEtaGlkZGVuIHRhYmluZGV4Jyk7XG5cbiAgICAgICAgICAgICAgICBpZiAoXy5odG1sRXhwci50ZXN0KF8ub3B0aW9ucy5wcmV2QXJyb3cpKSB7XG4gICAgICAgICAgICAgICAgICAgIF8uJHByZXZBcnJvdy5wcmVwZW5kVG8oXy5vcHRpb25zLmFwcGVuZEFycm93cyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKF8uaHRtbEV4cHIudGVzdChfLm9wdGlvbnMubmV4dEFycm93KSkge1xuICAgICAgICAgICAgICAgICAgICBfLiRuZXh0QXJyb3cuYXBwZW5kVG8oXy5vcHRpb25zLmFwcGVuZEFycm93cyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKF8ub3B0aW9ucy5pbmZpbml0ZSAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBfLiRwcmV2QXJyb3dcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnc2xpY2stZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2FyaWEtZGlzYWJsZWQnLCAndHJ1ZScpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgIF8uJHByZXZBcnJvdy5hZGQoIF8uJG5leHRBcnJvdyApXG5cbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdzbGljay1oaWRkZW4nKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAgICAgICAgICAgICAnYXJpYS1kaXNhYmxlZCc6ICd0cnVlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICd0YWJpbmRleCc6ICctMSdcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmJ1aWxkRG90cyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcyxcbiAgICAgICAgICAgIGksIGRvdDtcblxuICAgICAgICBpZiAoXy5vcHRpb25zLmRvdHMgPT09IHRydWUgJiYgXy5zbGlkZUNvdW50ID4gXy5vcHRpb25zLnNsaWRlc1RvU2hvdykge1xuXG4gICAgICAgICAgICBfLiRzbGlkZXIuYWRkQ2xhc3MoJ3NsaWNrLWRvdHRlZCcpO1xuXG4gICAgICAgICAgICBkb3QgPSAkKCc8dWwgLz4nKS5hZGRDbGFzcyhfLm9wdGlvbnMuZG90c0NsYXNzKTtcblxuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8PSBfLmdldERvdENvdW50KCk7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgIGRvdC5hcHBlbmQoJCgnPGxpIC8+JykuYXBwZW5kKF8ub3B0aW9ucy5jdXN0b21QYWdpbmcuY2FsbCh0aGlzLCBfLCBpKSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBfLiRkb3RzID0gZG90LmFwcGVuZFRvKF8ub3B0aW9ucy5hcHBlbmREb3RzKTtcblxuICAgICAgICAgICAgXy4kZG90cy5maW5kKCdsaScpLmZpcnN0KCkuYWRkQ2xhc3MoJ3NsaWNrLWFjdGl2ZScpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuYnVpbGRPdXQgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgXy4kc2xpZGVzID1cbiAgICAgICAgICAgIF8uJHNsaWRlclxuICAgICAgICAgICAgICAgIC5jaGlsZHJlbiggXy5vcHRpb25zLnNsaWRlICsgJzpub3QoLnNsaWNrLWNsb25lZCknKVxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnc2xpY2stc2xpZGUnKTtcblxuICAgICAgICBfLnNsaWRlQ291bnQgPSBfLiRzbGlkZXMubGVuZ3RoO1xuXG4gICAgICAgIF8uJHNsaWRlcy5lYWNoKGZ1bmN0aW9uKGluZGV4LCBlbGVtZW50KSB7XG4gICAgICAgICAgICAkKGVsZW1lbnQpXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtc2xpY2staW5kZXgnLCBpbmRleClcbiAgICAgICAgICAgICAgICAuZGF0YSgnb3JpZ2luYWxTdHlsaW5nJywgJChlbGVtZW50KS5hdHRyKCdzdHlsZScpIHx8ICcnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgXy4kc2xpZGVyLmFkZENsYXNzKCdzbGljay1zbGlkZXInKTtcblxuICAgICAgICBfLiRzbGlkZVRyYWNrID0gKF8uc2xpZGVDb3VudCA9PT0gMCkgP1xuICAgICAgICAgICAgJCgnPGRpdiBjbGFzcz1cInNsaWNrLXRyYWNrXCIvPicpLmFwcGVuZFRvKF8uJHNsaWRlcikgOlxuICAgICAgICAgICAgXy4kc2xpZGVzLndyYXBBbGwoJzxkaXYgY2xhc3M9XCJzbGljay10cmFja1wiLz4nKS5wYXJlbnQoKTtcblxuICAgICAgICBfLiRsaXN0ID0gXy4kc2xpZGVUcmFjay53cmFwKFxuICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJzbGljay1saXN0XCIvPicpLnBhcmVudCgpO1xuICAgICAgICBfLiRzbGlkZVRyYWNrLmNzcygnb3BhY2l0eScsIDApO1xuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuY2VudGVyTW9kZSA9PT0gdHJ1ZSB8fCBfLm9wdGlvbnMuc3dpcGVUb1NsaWRlID09PSB0cnVlKSB7XG4gICAgICAgICAgICBfLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwgPSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgJCgnaW1nW2RhdGEtbGF6eV0nLCBfLiRzbGlkZXIpLm5vdCgnW3NyY10nKS5hZGRDbGFzcygnc2xpY2stbG9hZGluZycpO1xuXG4gICAgICAgIF8uc2V0dXBJbmZpbml0ZSgpO1xuXG4gICAgICAgIF8uYnVpbGRBcnJvd3MoKTtcblxuICAgICAgICBfLmJ1aWxkRG90cygpO1xuXG4gICAgICAgIF8udXBkYXRlRG90cygpO1xuXG5cbiAgICAgICAgXy5zZXRTbGlkZUNsYXNzZXModHlwZW9mIF8uY3VycmVudFNsaWRlID09PSAnbnVtYmVyJyA/IF8uY3VycmVudFNsaWRlIDogMCk7XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5kcmFnZ2FibGUgPT09IHRydWUpIHtcbiAgICAgICAgICAgIF8uJGxpc3QuYWRkQ2xhc3MoJ2RyYWdnYWJsZScpO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmJ1aWxkUm93cyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcywgYSwgYiwgYywgbmV3U2xpZGVzLCBudW1PZlNsaWRlcywgb3JpZ2luYWxTbGlkZXMsc2xpZGVzUGVyU2VjdGlvbjtcblxuICAgICAgICBuZXdTbGlkZXMgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgIG9yaWdpbmFsU2xpZGVzID0gXy4kc2xpZGVyLmNoaWxkcmVuKCk7XG5cbiAgICAgICAgaWYoXy5vcHRpb25zLnJvd3MgPiAwKSB7XG5cbiAgICAgICAgICAgIHNsaWRlc1BlclNlY3Rpb24gPSBfLm9wdGlvbnMuc2xpZGVzUGVyUm93ICogXy5vcHRpb25zLnJvd3M7XG4gICAgICAgICAgICBudW1PZlNsaWRlcyA9IE1hdGguY2VpbChcbiAgICAgICAgICAgICAgICBvcmlnaW5hbFNsaWRlcy5sZW5ndGggLyBzbGlkZXNQZXJTZWN0aW9uXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICBmb3IoYSA9IDA7IGEgPCBudW1PZlNsaWRlczsgYSsrKXtcbiAgICAgICAgICAgICAgICB2YXIgc2xpZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICBmb3IoYiA9IDA7IGIgPCBfLm9wdGlvbnMucm93czsgYisrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICAgICAgZm9yKGMgPSAwOyBjIDwgXy5vcHRpb25zLnNsaWRlc1BlclJvdzsgYysrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0ID0gKGEgKiBzbGlkZXNQZXJTZWN0aW9uICsgKChiICogXy5vcHRpb25zLnNsaWRlc1BlclJvdykgKyBjKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob3JpZ2luYWxTbGlkZXMuZ2V0KHRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3cuYXBwZW5kQ2hpbGQob3JpZ2luYWxTbGlkZXMuZ2V0KHRhcmdldCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHNsaWRlLmFwcGVuZENoaWxkKHJvdyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG5ld1NsaWRlcy5hcHBlbmRDaGlsZChzbGlkZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF8uJHNsaWRlci5lbXB0eSgpLmFwcGVuZChuZXdTbGlkZXMpO1xuICAgICAgICAgICAgXy4kc2xpZGVyLmNoaWxkcmVuKCkuY2hpbGRyZW4oKS5jaGlsZHJlbigpXG4gICAgICAgICAgICAgICAgLmNzcyh7XG4gICAgICAgICAgICAgICAgICAgICd3aWR0aCc6KDEwMCAvIF8ub3B0aW9ucy5zbGlkZXNQZXJSb3cpICsgJyUnLFxuICAgICAgICAgICAgICAgICAgICAnZGlzcGxheSc6ICdpbmxpbmUtYmxvY2snXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5jaGVja1Jlc3BvbnNpdmUgPSBmdW5jdGlvbihpbml0aWFsLCBmb3JjZVVwZGF0ZSkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcyxcbiAgICAgICAgICAgIGJyZWFrcG9pbnQsIHRhcmdldEJyZWFrcG9pbnQsIHJlc3BvbmRUb1dpZHRoLCB0cmlnZ2VyQnJlYWtwb2ludCA9IGZhbHNlO1xuICAgICAgICB2YXIgc2xpZGVyV2lkdGggPSBfLiRzbGlkZXIud2lkdGgoKTtcbiAgICAgICAgdmFyIHdpbmRvd1dpZHRoID0gd2luZG93LmlubmVyV2lkdGggfHwgJCh3aW5kb3cpLndpZHRoKCk7XG5cbiAgICAgICAgaWYgKF8ucmVzcG9uZFRvID09PSAnd2luZG93Jykge1xuICAgICAgICAgICAgcmVzcG9uZFRvV2lkdGggPSB3aW5kb3dXaWR0aDtcbiAgICAgICAgfSBlbHNlIGlmIChfLnJlc3BvbmRUbyA9PT0gJ3NsaWRlcicpIHtcbiAgICAgICAgICAgIHJlc3BvbmRUb1dpZHRoID0gc2xpZGVyV2lkdGg7XG4gICAgICAgIH0gZWxzZSBpZiAoXy5yZXNwb25kVG8gPT09ICdtaW4nKSB7XG4gICAgICAgICAgICByZXNwb25kVG9XaWR0aCA9IE1hdGgubWluKHdpbmRvd1dpZHRoLCBzbGlkZXJXaWR0aCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIF8ub3B0aW9ucy5yZXNwb25zaXZlICYmXG4gICAgICAgICAgICBfLm9wdGlvbnMucmVzcG9uc2l2ZS5sZW5ndGggJiZcbiAgICAgICAgICAgIF8ub3B0aW9ucy5yZXNwb25zaXZlICE9PSBudWxsKSB7XG5cbiAgICAgICAgICAgIHRhcmdldEJyZWFrcG9pbnQgPSBudWxsO1xuXG4gICAgICAgICAgICBmb3IgKGJyZWFrcG9pbnQgaW4gXy5icmVha3BvaW50cykge1xuICAgICAgICAgICAgICAgIGlmIChfLmJyZWFrcG9pbnRzLmhhc093blByb3BlcnR5KGJyZWFrcG9pbnQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChfLm9yaWdpbmFsU2V0dGluZ3MubW9iaWxlRmlyc3QgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uZFRvV2lkdGggPCBfLmJyZWFrcG9pbnRzW2JyZWFrcG9pbnRdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0QnJlYWtwb2ludCA9IF8uYnJlYWtwb2ludHNbYnJlYWtwb2ludF07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uZFRvV2lkdGggPiBfLmJyZWFrcG9pbnRzW2JyZWFrcG9pbnRdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0QnJlYWtwb2ludCA9IF8uYnJlYWtwb2ludHNbYnJlYWtwb2ludF07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0YXJnZXRCcmVha3BvaW50ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uYWN0aXZlQnJlYWtwb2ludCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGFyZ2V0QnJlYWtwb2ludCAhPT0gXy5hY3RpdmVCcmVha3BvaW50IHx8IGZvcmNlVXBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfLmFjdGl2ZUJyZWFrcG9pbnQgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldEJyZWFrcG9pbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoXy5icmVha3BvaW50U2V0dGluZ3NbdGFyZ2V0QnJlYWtwb2ludF0gPT09ICd1bnNsaWNrJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8udW5zbGljayh0YXJnZXRCcmVha3BvaW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5vcHRpb25zID0gJC5leHRlbmQoe30sIF8ub3JpZ2luYWxTZXR0aW5ncyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5icmVha3BvaW50U2V0dGluZ3NbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRCcmVha3BvaW50XSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluaXRpYWwgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5jdXJyZW50U2xpZGUgPSBfLm9wdGlvbnMuaW5pdGlhbFNsaWRlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLnJlZnJlc2goaW5pdGlhbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmlnZ2VyQnJlYWtwb2ludCA9IHRhcmdldEJyZWFrcG9pbnQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBfLmFjdGl2ZUJyZWFrcG9pbnQgPSB0YXJnZXRCcmVha3BvaW50O1xuICAgICAgICAgICAgICAgICAgICBpZiAoXy5icmVha3BvaW50U2V0dGluZ3NbdGFyZ2V0QnJlYWtwb2ludF0gPT09ICd1bnNsaWNrJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy51bnNsaWNrKHRhcmdldEJyZWFrcG9pbnQpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5vcHRpb25zID0gJC5leHRlbmQoe30sIF8ub3JpZ2luYWxTZXR0aW5ncyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmJyZWFrcG9pbnRTZXR0aW5nc1tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0QnJlYWtwb2ludF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluaXRpYWwgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmN1cnJlbnRTbGlkZSA9IF8ub3B0aW9ucy5pbml0aWFsU2xpZGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBfLnJlZnJlc2goaW5pdGlhbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdHJpZ2dlckJyZWFrcG9pbnQgPSB0YXJnZXRCcmVha3BvaW50O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uYWN0aXZlQnJlYWtwb2ludCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBfLmFjdGl2ZUJyZWFrcG9pbnQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBfLm9wdGlvbnMgPSBfLm9yaWdpbmFsU2V0dGluZ3M7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbml0aWFsID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfLmN1cnJlbnRTbGlkZSA9IF8ub3B0aW9ucy5pbml0aWFsU2xpZGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXy5yZWZyZXNoKGluaXRpYWwpO1xuICAgICAgICAgICAgICAgICAgICB0cmlnZ2VyQnJlYWtwb2ludCA9IHRhcmdldEJyZWFrcG9pbnQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBvbmx5IHRyaWdnZXIgYnJlYWtwb2ludHMgZHVyaW5nIGFuIGFjdHVhbCBicmVhay4gbm90IG9uIGluaXRpYWxpemUuXG4gICAgICAgICAgICBpZiggIWluaXRpYWwgJiYgdHJpZ2dlckJyZWFrcG9pbnQgIT09IGZhbHNlICkge1xuICAgICAgICAgICAgICAgIF8uJHNsaWRlci50cmlnZ2VyKCdicmVha3BvaW50JywgW18sIHRyaWdnZXJCcmVha3BvaW50XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuY2hhbmdlU2xpZGUgPSBmdW5jdGlvbihldmVudCwgZG9udEFuaW1hdGUpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXMsXG4gICAgICAgICAgICAkdGFyZ2V0ID0gJChldmVudC5jdXJyZW50VGFyZ2V0KSxcbiAgICAgICAgICAgIGluZGV4T2Zmc2V0LCBzbGlkZU9mZnNldCwgdW5ldmVuT2Zmc2V0O1xuXG4gICAgICAgIC8vIElmIHRhcmdldCBpcyBhIGxpbmssIHByZXZlbnQgZGVmYXVsdCBhY3Rpb24uXG4gICAgICAgIGlmKCR0YXJnZXQuaXMoJ2EnKSkge1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHRhcmdldCBpcyBub3QgdGhlIDxsaT4gZWxlbWVudCAoaWU6IGEgY2hpbGQpLCBmaW5kIHRoZSA8bGk+LlxuICAgICAgICBpZighJHRhcmdldC5pcygnbGknKSkge1xuICAgICAgICAgICAgJHRhcmdldCA9ICR0YXJnZXQuY2xvc2VzdCgnbGknKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHVuZXZlbk9mZnNldCA9IChfLnNsaWRlQ291bnQgJSBfLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwgIT09IDApO1xuICAgICAgICBpbmRleE9mZnNldCA9IHVuZXZlbk9mZnNldCA/IDAgOiAoXy5zbGlkZUNvdW50IC0gXy5jdXJyZW50U2xpZGUpICUgXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsO1xuXG4gICAgICAgIHN3aXRjaCAoZXZlbnQuZGF0YS5tZXNzYWdlKSB7XG5cbiAgICAgICAgICAgIGNhc2UgJ3ByZXZpb3VzJzpcbiAgICAgICAgICAgICAgICBzbGlkZU9mZnNldCA9IGluZGV4T2Zmc2V0ID09PSAwID8gXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsIDogXy5vcHRpb25zLnNsaWRlc1RvU2hvdyAtIGluZGV4T2Zmc2V0O1xuICAgICAgICAgICAgICAgIGlmIChfLnNsaWRlQ291bnQgPiBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSB7XG4gICAgICAgICAgICAgICAgICAgIF8uc2xpZGVIYW5kbGVyKF8uY3VycmVudFNsaWRlIC0gc2xpZGVPZmZzZXQsIGZhbHNlLCBkb250QW5pbWF0ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICduZXh0JzpcbiAgICAgICAgICAgICAgICBzbGlkZU9mZnNldCA9IGluZGV4T2Zmc2V0ID09PSAwID8gXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsIDogaW5kZXhPZmZzZXQ7XG4gICAgICAgICAgICAgICAgaWYgKF8uc2xpZGVDb3VudCA+IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpIHtcbiAgICAgICAgICAgICAgICAgICAgXy5zbGlkZUhhbmRsZXIoXy5jdXJyZW50U2xpZGUgKyBzbGlkZU9mZnNldCwgZmFsc2UsIGRvbnRBbmltYXRlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ2luZGV4JzpcbiAgICAgICAgICAgICAgICB2YXIgaW5kZXggPSBldmVudC5kYXRhLmluZGV4ID09PSAwID8gMCA6XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LmRhdGEuaW5kZXggfHwgJHRhcmdldC5pbmRleCgpICogXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsO1xuXG4gICAgICAgICAgICAgICAgXy5zbGlkZUhhbmRsZXIoXy5jaGVja05hdmlnYWJsZShpbmRleCksIGZhbHNlLCBkb250QW5pbWF0ZSk7XG4gICAgICAgICAgICAgICAgJHRhcmdldC5jaGlsZHJlbigpLnRyaWdnZXIoJ2ZvY3VzJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmNoZWNrTmF2aWdhYmxlID0gZnVuY3Rpb24oaW5kZXgpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXMsXG4gICAgICAgICAgICBuYXZpZ2FibGVzLCBwcmV2TmF2aWdhYmxlO1xuXG4gICAgICAgIG5hdmlnYWJsZXMgPSBfLmdldE5hdmlnYWJsZUluZGV4ZXMoKTtcbiAgICAgICAgcHJldk5hdmlnYWJsZSA9IDA7XG4gICAgICAgIGlmIChpbmRleCA+IG5hdmlnYWJsZXNbbmF2aWdhYmxlcy5sZW5ndGggLSAxXSkge1xuICAgICAgICAgICAgaW5kZXggPSBuYXZpZ2FibGVzW25hdmlnYWJsZXMubGVuZ3RoIC0gMV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBuIGluIG5hdmlnYWJsZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPCBuYXZpZ2FibGVzW25dKSB7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ID0gcHJldk5hdmlnYWJsZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHByZXZOYXZpZ2FibGUgPSBuYXZpZ2FibGVzW25dO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGluZGV4O1xuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuY2xlYW5VcEV2ZW50cyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBpZiAoXy5vcHRpb25zLmRvdHMgJiYgXy4kZG90cyAhPT0gbnVsbCkge1xuXG4gICAgICAgICAgICAkKCdsaScsIF8uJGRvdHMpXG4gICAgICAgICAgICAgICAgLm9mZignY2xpY2suc2xpY2snLCBfLmNoYW5nZVNsaWRlKVxuICAgICAgICAgICAgICAgIC5vZmYoJ21vdXNlZW50ZXIuc2xpY2snLCAkLnByb3h5KF8uaW50ZXJydXB0LCBfLCB0cnVlKSlcbiAgICAgICAgICAgICAgICAub2ZmKCdtb3VzZWxlYXZlLnNsaWNrJywgJC5wcm94eShfLmludGVycnVwdCwgXywgZmFsc2UpKTtcblxuICAgICAgICAgICAgaWYgKF8ub3B0aW9ucy5hY2Nlc3NpYmlsaXR5ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgXy4kZG90cy5vZmYoJ2tleWRvd24uc2xpY2snLCBfLmtleUhhbmRsZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgXy4kc2xpZGVyLm9mZignZm9jdXMuc2xpY2sgYmx1ci5zbGljaycpO1xuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuYXJyb3dzID09PSB0cnVlICYmIF8uc2xpZGVDb3VudCA+IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpIHtcbiAgICAgICAgICAgIF8uJHByZXZBcnJvdyAmJiBfLiRwcmV2QXJyb3cub2ZmKCdjbGljay5zbGljaycsIF8uY2hhbmdlU2xpZGUpO1xuICAgICAgICAgICAgXy4kbmV4dEFycm93ICYmIF8uJG5leHRBcnJvdy5vZmYoJ2NsaWNrLnNsaWNrJywgXy5jaGFuZ2VTbGlkZSk7XG5cbiAgICAgICAgICAgIGlmIChfLm9wdGlvbnMuYWNjZXNzaWJpbGl0eSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIF8uJHByZXZBcnJvdyAmJiBfLiRwcmV2QXJyb3cub2ZmKCdrZXlkb3duLnNsaWNrJywgXy5rZXlIYW5kbGVyKTtcbiAgICAgICAgICAgICAgICBfLiRuZXh0QXJyb3cgJiYgXy4kbmV4dEFycm93Lm9mZigna2V5ZG93bi5zbGljaycsIF8ua2V5SGFuZGxlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBfLiRsaXN0Lm9mZigndG91Y2hzdGFydC5zbGljayBtb3VzZWRvd24uc2xpY2snLCBfLnN3aXBlSGFuZGxlcik7XG4gICAgICAgIF8uJGxpc3Qub2ZmKCd0b3VjaG1vdmUuc2xpY2sgbW91c2Vtb3ZlLnNsaWNrJywgXy5zd2lwZUhhbmRsZXIpO1xuICAgICAgICBfLiRsaXN0Lm9mZigndG91Y2hlbmQuc2xpY2sgbW91c2V1cC5zbGljaycsIF8uc3dpcGVIYW5kbGVyKTtcbiAgICAgICAgXy4kbGlzdC5vZmYoJ3RvdWNoY2FuY2VsLnNsaWNrIG1vdXNlbGVhdmUuc2xpY2snLCBfLnN3aXBlSGFuZGxlcik7XG5cbiAgICAgICAgXy4kbGlzdC5vZmYoJ2NsaWNrLnNsaWNrJywgXy5jbGlja0hhbmRsZXIpO1xuXG4gICAgICAgICQoZG9jdW1lbnQpLm9mZihfLnZpc2liaWxpdHlDaGFuZ2UsIF8udmlzaWJpbGl0eSk7XG5cbiAgICAgICAgXy5jbGVhblVwU2xpZGVFdmVudHMoKTtcblxuICAgICAgICBpZiAoXy5vcHRpb25zLmFjY2Vzc2liaWxpdHkgPT09IHRydWUpIHtcbiAgICAgICAgICAgIF8uJGxpc3Qub2ZmKCdrZXlkb3duLnNsaWNrJywgXy5rZXlIYW5kbGVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuZm9jdXNPblNlbGVjdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgJChfLiRzbGlkZVRyYWNrKS5jaGlsZHJlbigpLm9mZignY2xpY2suc2xpY2snLCBfLnNlbGVjdEhhbmRsZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgJCh3aW5kb3cpLm9mZignb3JpZW50YXRpb25jaGFuZ2Uuc2xpY2suc2xpY2stJyArIF8uaW5zdGFuY2VVaWQsIF8ub3JpZW50YXRpb25DaGFuZ2UpO1xuXG4gICAgICAgICQod2luZG93KS5vZmYoJ3Jlc2l6ZS5zbGljay5zbGljay0nICsgXy5pbnN0YW5jZVVpZCwgXy5yZXNpemUpO1xuXG4gICAgICAgICQoJ1tkcmFnZ2FibGUhPXRydWVdJywgXy4kc2xpZGVUcmFjaykub2ZmKCdkcmFnc3RhcnQnLCBfLnByZXZlbnREZWZhdWx0KTtcblxuICAgICAgICAkKHdpbmRvdykub2ZmKCdsb2FkLnNsaWNrLnNsaWNrLScgKyBfLmluc3RhbmNlVWlkLCBfLnNldFBvc2l0aW9uKTtcblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuY2xlYW5VcFNsaWRlRXZlbnRzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIF8uJGxpc3Qub2ZmKCdtb3VzZWVudGVyLnNsaWNrJywgJC5wcm94eShfLmludGVycnVwdCwgXywgdHJ1ZSkpO1xuICAgICAgICBfLiRsaXN0Lm9mZignbW91c2VsZWF2ZS5zbGljaycsICQucHJveHkoXy5pbnRlcnJ1cHQsIF8sIGZhbHNlKSk7XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmNsZWFuVXBSb3dzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzLCBvcmlnaW5hbFNsaWRlcztcblxuICAgICAgICBpZihfLm9wdGlvbnMucm93cyA+IDApIHtcbiAgICAgICAgICAgIG9yaWdpbmFsU2xpZGVzID0gXy4kc2xpZGVzLmNoaWxkcmVuKCkuY2hpbGRyZW4oKTtcbiAgICAgICAgICAgIG9yaWdpbmFsU2xpZGVzLnJlbW92ZUF0dHIoJ3N0eWxlJyk7XG4gICAgICAgICAgICBfLiRzbGlkZXIuZW1wdHkoKS5hcHBlbmQob3JpZ2luYWxTbGlkZXMpO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmNsaWNrSGFuZGxlciA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIGlmIChfLnNob3VsZENsaWNrID09PSBmYWxzZSkge1xuICAgICAgICAgICAgZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKHJlZnJlc2gpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgXy5hdXRvUGxheUNsZWFyKCk7XG5cbiAgICAgICAgXy50b3VjaE9iamVjdCA9IHt9O1xuXG4gICAgICAgIF8uY2xlYW5VcEV2ZW50cygpO1xuXG4gICAgICAgICQoJy5zbGljay1jbG9uZWQnLCBfLiRzbGlkZXIpLmRldGFjaCgpO1xuXG4gICAgICAgIGlmIChfLiRkb3RzKSB7XG4gICAgICAgICAgICBfLiRkb3RzLnJlbW92ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCBfLiRwcmV2QXJyb3cgJiYgXy4kcHJldkFycm93Lmxlbmd0aCApIHtcblxuICAgICAgICAgICAgXy4kcHJldkFycm93XG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdzbGljay1kaXNhYmxlZCBzbGljay1hcnJvdyBzbGljay1oaWRkZW4nKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdhcmlhLWhpZGRlbiBhcmlhLWRpc2FibGVkIHRhYmluZGV4JylcbiAgICAgICAgICAgICAgICAuY3NzKCdkaXNwbGF5JywnJyk7XG5cbiAgICAgICAgICAgIGlmICggXy5odG1sRXhwci50ZXN0KCBfLm9wdGlvbnMucHJldkFycm93ICkpIHtcbiAgICAgICAgICAgICAgICBfLiRwcmV2QXJyb3cucmVtb3ZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIF8uJG5leHRBcnJvdyAmJiBfLiRuZXh0QXJyb3cubGVuZ3RoICkge1xuXG4gICAgICAgICAgICBfLiRuZXh0QXJyb3dcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3NsaWNrLWRpc2FibGVkIHNsaWNrLWFycm93IHNsaWNrLWhpZGRlbicpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2FyaWEtaGlkZGVuIGFyaWEtZGlzYWJsZWQgdGFiaW5kZXgnKVxuICAgICAgICAgICAgICAgIC5jc3MoJ2Rpc3BsYXknLCcnKTtcblxuICAgICAgICAgICAgaWYgKCBfLmh0bWxFeHByLnRlc3QoIF8ub3B0aW9ucy5uZXh0QXJyb3cgKSkge1xuICAgICAgICAgICAgICAgIF8uJG5leHRBcnJvdy5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG5cbiAgICAgICAgaWYgKF8uJHNsaWRlcykge1xuXG4gICAgICAgICAgICBfLiRzbGlkZXNcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3NsaWNrLXNsaWRlIHNsaWNrLWFjdGl2ZSBzbGljay1jZW50ZXIgc2xpY2stdmlzaWJsZSBzbGljay1jdXJyZW50JylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignYXJpYS1oaWRkZW4nKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXNsaWNrLWluZGV4JylcbiAgICAgICAgICAgICAgICAuZWFjaChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmF0dHIoJ3N0eWxlJywgJCh0aGlzKS5kYXRhKCdvcmlnaW5hbFN0eWxpbmcnKSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIF8uJHNsaWRlVHJhY2suY2hpbGRyZW4odGhpcy5vcHRpb25zLnNsaWRlKS5kZXRhY2goKTtcblxuICAgICAgICAgICAgXy4kc2xpZGVUcmFjay5kZXRhY2goKTtcblxuICAgICAgICAgICAgXy4kbGlzdC5kZXRhY2goKTtcblxuICAgICAgICAgICAgXy4kc2xpZGVyLmFwcGVuZChfLiRzbGlkZXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgXy5jbGVhblVwUm93cygpO1xuXG4gICAgICAgIF8uJHNsaWRlci5yZW1vdmVDbGFzcygnc2xpY2stc2xpZGVyJyk7XG4gICAgICAgIF8uJHNsaWRlci5yZW1vdmVDbGFzcygnc2xpY2staW5pdGlhbGl6ZWQnKTtcbiAgICAgICAgXy4kc2xpZGVyLnJlbW92ZUNsYXNzKCdzbGljay1kb3R0ZWQnKTtcblxuICAgICAgICBfLnVuc2xpY2tlZCA9IHRydWU7XG5cbiAgICAgICAgaWYoIXJlZnJlc2gpIHtcbiAgICAgICAgICAgIF8uJHNsaWRlci50cmlnZ2VyKCdkZXN0cm95JywgW19dKTtcbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5kaXNhYmxlVHJhbnNpdGlvbiA9IGZ1bmN0aW9uKHNsaWRlKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzLFxuICAgICAgICAgICAgdHJhbnNpdGlvbiA9IHt9O1xuXG4gICAgICAgIHRyYW5zaXRpb25bXy50cmFuc2l0aW9uVHlwZV0gPSAnJztcblxuICAgICAgICBpZiAoXy5vcHRpb25zLmZhZGUgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBfLiRzbGlkZVRyYWNrLmNzcyh0cmFuc2l0aW9uKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIF8uJHNsaWRlcy5lcShzbGlkZSkuY3NzKHRyYW5zaXRpb24pO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmZhZGVTbGlkZSA9IGZ1bmN0aW9uKHNsaWRlSW5kZXgsIGNhbGxiYWNrKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIGlmIChfLmNzc1RyYW5zaXRpb25zID09PSBmYWxzZSkge1xuXG4gICAgICAgICAgICBfLiRzbGlkZXMuZXEoc2xpZGVJbmRleCkuY3NzKHtcbiAgICAgICAgICAgICAgICB6SW5kZXg6IF8ub3B0aW9ucy56SW5kZXhcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBfLiRzbGlkZXMuZXEoc2xpZGVJbmRleCkuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMVxuICAgICAgICAgICAgfSwgXy5vcHRpb25zLnNwZWVkLCBfLm9wdGlvbnMuZWFzaW5nLCBjYWxsYmFjayk7XG5cbiAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgXy5hcHBseVRyYW5zaXRpb24oc2xpZGVJbmRleCk7XG5cbiAgICAgICAgICAgIF8uJHNsaWRlcy5lcShzbGlkZUluZGV4KS5jc3Moe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgICAgICAgekluZGV4OiBfLm9wdGlvbnMuekluZGV4XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgICAgICAgICBfLmRpc2FibGVUcmFuc2l0aW9uKHNsaWRlSW5kZXgpO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwoKTtcbiAgICAgICAgICAgICAgICB9LCBfLm9wdGlvbnMuc3BlZWQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuZmFkZVNsaWRlT3V0ID0gZnVuY3Rpb24oc2xpZGVJbmRleCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBpZiAoXy5jc3NUcmFuc2l0aW9ucyA9PT0gZmFsc2UpIHtcblxuICAgICAgICAgICAgXy4kc2xpZGVzLmVxKHNsaWRlSW5kZXgpLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6IDAsXG4gICAgICAgICAgICAgICAgekluZGV4OiBfLm9wdGlvbnMuekluZGV4IC0gMlxuICAgICAgICAgICAgfSwgXy5vcHRpb25zLnNwZWVkLCBfLm9wdGlvbnMuZWFzaW5nKTtcblxuICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICBfLmFwcGx5VHJhbnNpdGlvbihzbGlkZUluZGV4KTtcblxuICAgICAgICAgICAgXy4kc2xpZGVzLmVxKHNsaWRlSW5kZXgpLmNzcyh7XG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMCxcbiAgICAgICAgICAgICAgICB6SW5kZXg6IF8ub3B0aW9ucy56SW5kZXggLSAyXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmZpbHRlclNsaWRlcyA9IFNsaWNrLnByb3RvdHlwZS5zbGlja0ZpbHRlciA9IGZ1bmN0aW9uKGZpbHRlcikge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBpZiAoZmlsdGVyICE9PSBudWxsKSB7XG5cbiAgICAgICAgICAgIF8uJHNsaWRlc0NhY2hlID0gXy4kc2xpZGVzO1xuXG4gICAgICAgICAgICBfLnVubG9hZCgpO1xuXG4gICAgICAgICAgICBfLiRzbGlkZVRyYWNrLmNoaWxkcmVuKHRoaXMub3B0aW9ucy5zbGlkZSkuZGV0YWNoKCk7XG5cbiAgICAgICAgICAgIF8uJHNsaWRlc0NhY2hlLmZpbHRlcihmaWx0ZXIpLmFwcGVuZFRvKF8uJHNsaWRlVHJhY2spO1xuXG4gICAgICAgICAgICBfLnJlaW5pdCgpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuZm9jdXNIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIF8uJHNsaWRlclxuICAgICAgICAgICAgLm9mZignZm9jdXMuc2xpY2sgYmx1ci5zbGljaycpXG4gICAgICAgICAgICAub24oJ2ZvY3VzLnNsaWNrIGJsdXIuc2xpY2snLCAnKicsIGZ1bmN0aW9uKGV2ZW50KSB7XG5cbiAgICAgICAgICAgIGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgdmFyICRzZiA9ICQodGhpcyk7XG5cbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgICAgICBpZiggXy5vcHRpb25zLnBhdXNlT25Gb2N1cyApIHtcbiAgICAgICAgICAgICAgICAgICAgXy5mb2N1c3NlZCA9ICRzZi5pcygnOmZvY3VzJyk7XG4gICAgICAgICAgICAgICAgICAgIF8uYXV0b1BsYXkoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0sIDApO1xuXG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuZ2V0Q3VycmVudCA9IFNsaWNrLnByb3RvdHlwZS5zbGlja0N1cnJlbnRTbGlkZSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcbiAgICAgICAgcmV0dXJuIF8uY3VycmVudFNsaWRlO1xuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5nZXREb3RDb3VudCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICB2YXIgYnJlYWtQb2ludCA9IDA7XG4gICAgICAgIHZhciBjb3VudGVyID0gMDtcbiAgICAgICAgdmFyIHBhZ2VyUXR5ID0gMDtcblxuICAgICAgICBpZiAoXy5vcHRpb25zLmluZmluaXRlID09PSB0cnVlKSB7XG4gICAgICAgICAgICBpZiAoXy5zbGlkZUNvdW50IDw9IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpIHtcbiAgICAgICAgICAgICAgICAgKytwYWdlclF0eTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGJyZWFrUG9pbnQgPCBfLnNsaWRlQ291bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgKytwYWdlclF0eTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWtQb2ludCA9IGNvdW50ZXIgKyBfLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGw7XG4gICAgICAgICAgICAgICAgICAgIGNvdW50ZXIgKz0gXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsIDw9IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgPyBfLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwgOiBfLm9wdGlvbnMuc2xpZGVzVG9TaG93O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChfLm9wdGlvbnMuY2VudGVyTW9kZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgcGFnZXJRdHkgPSBfLnNsaWRlQ291bnQ7XG4gICAgICAgIH0gZWxzZSBpZighXy5vcHRpb25zLmFzTmF2Rm9yKSB7XG4gICAgICAgICAgICBwYWdlclF0eSA9IDEgKyBNYXRoLmNlaWwoKF8uc2xpZGVDb3VudCAtIF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpIC8gXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsKTtcbiAgICAgICAgfWVsc2Uge1xuICAgICAgICAgICAgd2hpbGUgKGJyZWFrUG9pbnQgPCBfLnNsaWRlQ291bnQpIHtcbiAgICAgICAgICAgICAgICArK3BhZ2VyUXR5O1xuICAgICAgICAgICAgICAgIGJyZWFrUG9pbnQgPSBjb3VudGVyICsgXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsO1xuICAgICAgICAgICAgICAgIGNvdW50ZXIgKz0gXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsIDw9IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgPyBfLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwgOiBfLm9wdGlvbnMuc2xpZGVzVG9TaG93O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHBhZ2VyUXR5IC0gMTtcblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuZ2V0TGVmdCA9IGZ1bmN0aW9uKHNsaWRlSW5kZXgpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXMsXG4gICAgICAgICAgICB0YXJnZXRMZWZ0LFxuICAgICAgICAgICAgdmVydGljYWxIZWlnaHQsXG4gICAgICAgICAgICB2ZXJ0aWNhbE9mZnNldCA9IDAsXG4gICAgICAgICAgICB0YXJnZXRTbGlkZSxcbiAgICAgICAgICAgIGNvZWY7XG5cbiAgICAgICAgXy5zbGlkZU9mZnNldCA9IDA7XG4gICAgICAgIHZlcnRpY2FsSGVpZ2h0ID0gXy4kc2xpZGVzLmZpcnN0KCkub3V0ZXJIZWlnaHQodHJ1ZSk7XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5pbmZpbml0ZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgaWYgKF8uc2xpZGVDb3VudCA+IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpIHtcbiAgICAgICAgICAgICAgICBfLnNsaWRlT2Zmc2V0ID0gKF8uc2xpZGVXaWR0aCAqIF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpICogLTE7XG4gICAgICAgICAgICAgICAgY29lZiA9IC0xXG5cbiAgICAgICAgICAgICAgICBpZiAoXy5vcHRpb25zLnZlcnRpY2FsID09PSB0cnVlICYmIF8ub3B0aW9ucy5jZW50ZXJNb2RlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChfLm9wdGlvbnMuc2xpZGVzVG9TaG93ID09PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2VmID0gLTEuNTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChfLm9wdGlvbnMuc2xpZGVzVG9TaG93ID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2VmID0gLTJcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2ZXJ0aWNhbE9mZnNldCA9ICh2ZXJ0aWNhbEhlaWdodCAqIF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpICogY29lZjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChfLnNsaWRlQ291bnQgJSBfLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwgIT09IDApIHtcbiAgICAgICAgICAgICAgICBpZiAoc2xpZGVJbmRleCArIF8ub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCA+IF8uc2xpZGVDb3VudCAmJiBfLnNsaWRlQ291bnQgPiBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzbGlkZUluZGV4ID4gXy5zbGlkZUNvdW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfLnNsaWRlT2Zmc2V0ID0gKChfLm9wdGlvbnMuc2xpZGVzVG9TaG93IC0gKHNsaWRlSW5kZXggLSBfLnNsaWRlQ291bnQpKSAqIF8uc2xpZGVXaWR0aCkgKiAtMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRpY2FsT2Zmc2V0ID0gKChfLm9wdGlvbnMuc2xpZGVzVG9TaG93IC0gKHNsaWRlSW5kZXggLSBfLnNsaWRlQ291bnQpKSAqIHZlcnRpY2FsSGVpZ2h0KSAqIC0xO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5zbGlkZU9mZnNldCA9ICgoXy5zbGlkZUNvdW50ICUgXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsKSAqIF8uc2xpZGVXaWR0aCkgKiAtMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRpY2FsT2Zmc2V0ID0gKChfLnNsaWRlQ291bnQgJSBfLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwpICogdmVydGljYWxIZWlnaHQpICogLTE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoc2xpZGVJbmRleCArIF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgPiBfLnNsaWRlQ291bnQpIHtcbiAgICAgICAgICAgICAgICBfLnNsaWRlT2Zmc2V0ID0gKChzbGlkZUluZGV4ICsgXy5vcHRpb25zLnNsaWRlc1RvU2hvdykgLSBfLnNsaWRlQ291bnQpICogXy5zbGlkZVdpZHRoO1xuICAgICAgICAgICAgICAgIHZlcnRpY2FsT2Zmc2V0ID0gKChzbGlkZUluZGV4ICsgXy5vcHRpb25zLnNsaWRlc1RvU2hvdykgLSBfLnNsaWRlQ291bnQpICogdmVydGljYWxIZWlnaHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXy5zbGlkZUNvdW50IDw9IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpIHtcbiAgICAgICAgICAgIF8uc2xpZGVPZmZzZXQgPSAwO1xuICAgICAgICAgICAgdmVydGljYWxPZmZzZXQgPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5jZW50ZXJNb2RlID09PSB0cnVlICYmIF8uc2xpZGVDb3VudCA8PSBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSB7XG4gICAgICAgICAgICBfLnNsaWRlT2Zmc2V0ID0gKChfLnNsaWRlV2lkdGggKiBNYXRoLmZsb29yKF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpKSAvIDIpIC0gKChfLnNsaWRlV2lkdGggKiBfLnNsaWRlQ291bnQpIC8gMik7XG4gICAgICAgIH0gZWxzZSBpZiAoXy5vcHRpb25zLmNlbnRlck1vZGUgPT09IHRydWUgJiYgXy5vcHRpb25zLmluZmluaXRlID09PSB0cnVlKSB7XG4gICAgICAgICAgICBfLnNsaWRlT2Zmc2V0ICs9IF8uc2xpZGVXaWR0aCAqIE1hdGguZmxvb3IoXy5vcHRpb25zLnNsaWRlc1RvU2hvdyAvIDIpIC0gXy5zbGlkZVdpZHRoO1xuICAgICAgICB9IGVsc2UgaWYgKF8ub3B0aW9ucy5jZW50ZXJNb2RlID09PSB0cnVlKSB7XG4gICAgICAgICAgICBfLnNsaWRlT2Zmc2V0ID0gMDtcbiAgICAgICAgICAgIF8uc2xpZGVPZmZzZXQgKz0gXy5zbGlkZVdpZHRoICogTWF0aC5mbG9vcihfLm9wdGlvbnMuc2xpZGVzVG9TaG93IC8gMik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXy5vcHRpb25zLnZlcnRpY2FsID09PSBmYWxzZSkge1xuICAgICAgICAgICAgdGFyZ2V0TGVmdCA9ICgoc2xpZGVJbmRleCAqIF8uc2xpZGVXaWR0aCkgKiAtMSkgKyBfLnNsaWRlT2Zmc2V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGFyZ2V0TGVmdCA9ICgoc2xpZGVJbmRleCAqIHZlcnRpY2FsSGVpZ2h0KSAqIC0xKSArIHZlcnRpY2FsT2Zmc2V0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy52YXJpYWJsZVdpZHRoID09PSB0cnVlKSB7XG5cbiAgICAgICAgICAgIGlmIChfLnNsaWRlQ291bnQgPD0gXy5vcHRpb25zLnNsaWRlc1RvU2hvdyB8fCBfLm9wdGlvbnMuaW5maW5pdGUgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0U2xpZGUgPSBfLiRzbGlkZVRyYWNrLmNoaWxkcmVuKCcuc2xpY2stc2xpZGUnKS5lcShzbGlkZUluZGV4KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0U2xpZGUgPSBfLiRzbGlkZVRyYWNrLmNoaWxkcmVuKCcuc2xpY2stc2xpZGUnKS5lcShzbGlkZUluZGV4ICsgXy5vcHRpb25zLnNsaWRlc1RvU2hvdyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChfLm9wdGlvbnMucnRsID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldFNsaWRlWzBdKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldExlZnQgPSAoXy4kc2xpZGVUcmFjay53aWR0aCgpIC0gdGFyZ2V0U2xpZGVbMF0ub2Zmc2V0TGVmdCAtIHRhcmdldFNsaWRlLndpZHRoKCkpICogLTE7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0TGVmdCA9ICAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0TGVmdCA9IHRhcmdldFNsaWRlWzBdID8gdGFyZ2V0U2xpZGVbMF0ub2Zmc2V0TGVmdCAqIC0xIDogMDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKF8ub3B0aW9ucy5jZW50ZXJNb2RlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uc2xpZGVDb3VudCA8PSBfLm9wdGlvbnMuc2xpZGVzVG9TaG93IHx8IF8ub3B0aW9ucy5pbmZpbml0ZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0U2xpZGUgPSBfLiRzbGlkZVRyYWNrLmNoaWxkcmVuKCcuc2xpY2stc2xpZGUnKS5lcShzbGlkZUluZGV4KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXRTbGlkZSA9IF8uJHNsaWRlVHJhY2suY2hpbGRyZW4oJy5zbGljay1zbGlkZScpLmVxKHNsaWRlSW5kZXggKyBfLm9wdGlvbnMuc2xpZGVzVG9TaG93ICsgMSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKF8ub3B0aW9ucy5ydGwgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRhcmdldFNsaWRlWzBdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRMZWZ0ID0gKF8uJHNsaWRlVHJhY2sud2lkdGgoKSAtIHRhcmdldFNsaWRlWzBdLm9mZnNldExlZnQgLSB0YXJnZXRTbGlkZS53aWR0aCgpKSAqIC0xO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0TGVmdCA9ICAwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0TGVmdCA9IHRhcmdldFNsaWRlWzBdID8gdGFyZ2V0U2xpZGVbMF0ub2Zmc2V0TGVmdCAqIC0xIDogMDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0YXJnZXRMZWZ0ICs9IChfLiRsaXN0LndpZHRoKCkgLSB0YXJnZXRTbGlkZS5vdXRlcldpZHRoKCkpIC8gMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0YXJnZXRMZWZ0O1xuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5nZXRPcHRpb24gPSBTbGljay5wcm90b3R5cGUuc2xpY2tHZXRPcHRpb24gPSBmdW5jdGlvbihvcHRpb24pIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIF8ub3B0aW9uc1tvcHRpb25dO1xuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5nZXROYXZpZ2FibGVJbmRleGVzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzLFxuICAgICAgICAgICAgYnJlYWtQb2ludCA9IDAsXG4gICAgICAgICAgICBjb3VudGVyID0gMCxcbiAgICAgICAgICAgIGluZGV4ZXMgPSBbXSxcbiAgICAgICAgICAgIG1heDtcblxuICAgICAgICBpZiAoXy5vcHRpb25zLmluZmluaXRlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgbWF4ID0gXy5zbGlkZUNvdW50O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYnJlYWtQb2ludCA9IF8ub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCAqIC0xO1xuICAgICAgICAgICAgY291bnRlciA9IF8ub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCAqIC0xO1xuICAgICAgICAgICAgbWF4ID0gXy5zbGlkZUNvdW50ICogMjtcbiAgICAgICAgfVxuXG4gICAgICAgIHdoaWxlIChicmVha1BvaW50IDwgbWF4KSB7XG4gICAgICAgICAgICBpbmRleGVzLnB1c2goYnJlYWtQb2ludCk7XG4gICAgICAgICAgICBicmVha1BvaW50ID0gY291bnRlciArIF8ub3B0aW9ucy5zbGlkZXNUb1Njcm9sbDtcbiAgICAgICAgICAgIGNvdW50ZXIgKz0gXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsIDw9IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgPyBfLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwgOiBfLm9wdGlvbnMuc2xpZGVzVG9TaG93O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGluZGV4ZXM7XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmdldFNsaWNrID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmdldFNsaWRlQ291bnQgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXMsXG4gICAgICAgICAgICBzbGlkZXNUcmF2ZXJzZWQsIHN3aXBlZFNsaWRlLCBjZW50ZXJPZmZzZXQ7XG5cbiAgICAgICAgY2VudGVyT2Zmc2V0ID0gXy5vcHRpb25zLmNlbnRlck1vZGUgPT09IHRydWUgPyBfLnNsaWRlV2lkdGggKiBNYXRoLmZsb29yKF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgLyAyKSA6IDA7XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5zd2lwZVRvU2xpZGUgPT09IHRydWUpIHtcbiAgICAgICAgICAgIF8uJHNsaWRlVHJhY2suZmluZCgnLnNsaWNrLXNsaWRlJykuZWFjaChmdW5jdGlvbihpbmRleCwgc2xpZGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2xpZGUub2Zmc2V0TGVmdCAtIGNlbnRlck9mZnNldCArICgkKHNsaWRlKS5vdXRlcldpZHRoKCkgLyAyKSA+IChfLnN3aXBlTGVmdCAqIC0xKSkge1xuICAgICAgICAgICAgICAgICAgICBzd2lwZWRTbGlkZSA9IHNsaWRlO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHNsaWRlc1RyYXZlcnNlZCA9IE1hdGguYWJzKCQoc3dpcGVkU2xpZGUpLmF0dHIoJ2RhdGEtc2xpY2staW5kZXgnKSAtIF8uY3VycmVudFNsaWRlKSB8fCAxO1xuXG4gICAgICAgICAgICByZXR1cm4gc2xpZGVzVHJhdmVyc2VkO1xuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmdvVG8gPSBTbGljay5wcm90b3R5cGUuc2xpY2tHb1RvID0gZnVuY3Rpb24oc2xpZGUsIGRvbnRBbmltYXRlKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIF8uY2hhbmdlU2xpZGUoe1xuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdpbmRleCcsXG4gICAgICAgICAgICAgICAgaW5kZXg6IHBhcnNlSW50KHNsaWRlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCBkb250QW5pbWF0ZSk7XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbihjcmVhdGlvbikge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBpZiAoISQoXy4kc2xpZGVyKS5oYXNDbGFzcygnc2xpY2staW5pdGlhbGl6ZWQnKSkge1xuXG4gICAgICAgICAgICAkKF8uJHNsaWRlcikuYWRkQ2xhc3MoJ3NsaWNrLWluaXRpYWxpemVkJyk7XG5cbiAgICAgICAgICAgIF8uYnVpbGRSb3dzKCk7XG4gICAgICAgICAgICBfLmJ1aWxkT3V0KCk7XG4gICAgICAgICAgICBfLnNldFByb3BzKCk7XG4gICAgICAgICAgICBfLnN0YXJ0TG9hZCgpO1xuICAgICAgICAgICAgXy5sb2FkU2xpZGVyKCk7XG4gICAgICAgICAgICBfLmluaXRpYWxpemVFdmVudHMoKTtcbiAgICAgICAgICAgIF8udXBkYXRlQXJyb3dzKCk7XG4gICAgICAgICAgICBfLnVwZGF0ZURvdHMoKTtcbiAgICAgICAgICAgIF8uY2hlY2tSZXNwb25zaXZlKHRydWUpO1xuICAgICAgICAgICAgXy5mb2N1c0hhbmRsZXIoKTtcblxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNyZWF0aW9uKSB7XG4gICAgICAgICAgICBfLiRzbGlkZXIudHJpZ2dlcignaW5pdCcsIFtfXSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXy5vcHRpb25zLmFjY2Vzc2liaWxpdHkgPT09IHRydWUpIHtcbiAgICAgICAgICAgIF8uaW5pdEFEQSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCBfLm9wdGlvbnMuYXV0b3BsYXkgKSB7XG5cbiAgICAgICAgICAgIF8ucGF1c2VkID0gZmFsc2U7XG4gICAgICAgICAgICBfLmF1dG9QbGF5KCk7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5pbml0QURBID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBfID0gdGhpcyxcbiAgICAgICAgICAgICAgICBudW1Eb3RHcm91cHMgPSBNYXRoLmNlaWwoXy5zbGlkZUNvdW50IC8gXy5vcHRpb25zLnNsaWRlc1RvU2hvdyksXG4gICAgICAgICAgICAgICAgdGFiQ29udHJvbEluZGV4ZXMgPSBfLmdldE5hdmlnYWJsZUluZGV4ZXMoKS5maWx0ZXIoZnVuY3Rpb24odmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAodmFsID49IDApICYmICh2YWwgPCBfLnNsaWRlQ291bnQpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIF8uJHNsaWRlcy5hZGQoXy4kc2xpZGVUcmFjay5maW5kKCcuc2xpY2stY2xvbmVkJykpLmF0dHIoe1xuICAgICAgICAgICAgJ2FyaWEtaGlkZGVuJzogJ3RydWUnLFxuICAgICAgICAgICAgJ3RhYmluZGV4JzogJy0xJ1xuICAgICAgICB9KS5maW5kKCdhLCBpbnB1dCwgYnV0dG9uLCBzZWxlY3QnKS5hdHRyKHtcbiAgICAgICAgICAgICd0YWJpbmRleCc6ICctMSdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKF8uJGRvdHMgIT09IG51bGwpIHtcbiAgICAgICAgICAgIF8uJHNsaWRlcy5ub3QoXy4kc2xpZGVUcmFjay5maW5kKCcuc2xpY2stY2xvbmVkJykpLmVhY2goZnVuY3Rpb24oaSkge1xuICAgICAgICAgICAgICAgIHZhciBzbGlkZUNvbnRyb2xJbmRleCA9IHRhYkNvbnRyb2xJbmRleGVzLmluZGV4T2YoaSk7XG5cbiAgICAgICAgICAgICAgICAkKHRoaXMpLmF0dHIoe1xuICAgICAgICAgICAgICAgICAgICAncm9sZSc6ICd0YWJwYW5lbCcsXG4gICAgICAgICAgICAgICAgICAgICdpZCc6ICdzbGljay1zbGlkZScgKyBfLmluc3RhbmNlVWlkICsgaSxcbiAgICAgICAgICAgICAgICAgICAgJ3RhYmluZGV4JzogLTFcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGlmIChzbGlkZUNvbnRyb2xJbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICB2YXIgYXJpYUJ1dHRvbkNvbnRyb2wgPSAnc2xpY2stc2xpZGUtY29udHJvbCcgKyBfLmluc3RhbmNlVWlkICsgc2xpZGVDb250cm9sSW5kZXhcbiAgICAgICAgICAgICAgICAgICBpZiAoJCgnIycgKyBhcmlhQnV0dG9uQ29udHJvbCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmF0dHIoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICdhcmlhLWRlc2NyaWJlZGJ5JzogYXJpYUJ1dHRvbkNvbnRyb2xcbiAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgXy4kZG90cy5hdHRyKCdyb2xlJywgJ3RhYmxpc3QnKS5maW5kKCdsaScpLmVhY2goZnVuY3Rpb24oaSkge1xuICAgICAgICAgICAgICAgIHZhciBtYXBwZWRTbGlkZUluZGV4ID0gdGFiQ29udHJvbEluZGV4ZXNbaV07XG5cbiAgICAgICAgICAgICAgICAkKHRoaXMpLmF0dHIoe1xuICAgICAgICAgICAgICAgICAgICAncm9sZSc6ICdwcmVzZW50YXRpb24nXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAkKHRoaXMpLmZpbmQoJ2J1dHRvbicpLmZpcnN0KCkuYXR0cih7XG4gICAgICAgICAgICAgICAgICAgICdyb2xlJzogJ3RhYicsXG4gICAgICAgICAgICAgICAgICAgICdpZCc6ICdzbGljay1zbGlkZS1jb250cm9sJyArIF8uaW5zdGFuY2VVaWQgKyBpLFxuICAgICAgICAgICAgICAgICAgICAnYXJpYS1jb250cm9scyc6ICdzbGljay1zbGlkZScgKyBfLmluc3RhbmNlVWlkICsgbWFwcGVkU2xpZGVJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgJ2FyaWEtbGFiZWwnOiAoaSArIDEpICsgJyBvZiAnICsgbnVtRG90R3JvdXBzLFxuICAgICAgICAgICAgICAgICAgICAnYXJpYS1zZWxlY3RlZCc6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICd0YWJpbmRleCc6ICctMSdcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgfSkuZXEoXy5jdXJyZW50U2xpZGUpLmZpbmQoJ2J1dHRvbicpLmF0dHIoe1xuICAgICAgICAgICAgICAgICdhcmlhLXNlbGVjdGVkJzogJ3RydWUnLFxuICAgICAgICAgICAgICAgICd0YWJpbmRleCc6ICcwJ1xuICAgICAgICAgICAgfSkuZW5kKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciBpPV8uY3VycmVudFNsaWRlLCBtYXg9aStfLm9wdGlvbnMuc2xpZGVzVG9TaG93OyBpIDwgbWF4OyBpKyspIHtcbiAgICAgICAgICBpZiAoXy5vcHRpb25zLmZvY3VzT25DaGFuZ2UpIHtcbiAgICAgICAgICAgIF8uJHNsaWRlcy5lcShpKS5hdHRyKHsndGFiaW5kZXgnOiAnMCd9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgXy4kc2xpZGVzLmVxKGkpLnJlbW92ZUF0dHIoJ3RhYmluZGV4Jyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgXy5hY3RpdmF0ZUFEQSgpO1xuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5pbml0QXJyb3dFdmVudHMgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5hcnJvd3MgPT09IHRydWUgJiYgXy5zbGlkZUNvdW50ID4gXy5vcHRpb25zLnNsaWRlc1RvU2hvdykge1xuICAgICAgICAgICAgXy4kcHJldkFycm93XG4gICAgICAgICAgICAgICAub2ZmKCdjbGljay5zbGljaycpXG4gICAgICAgICAgICAgICAub24oJ2NsaWNrLnNsaWNrJywge1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAncHJldmlvdXMnXG4gICAgICAgICAgICAgICB9LCBfLmNoYW5nZVNsaWRlKTtcbiAgICAgICAgICAgIF8uJG5leHRBcnJvd1xuICAgICAgICAgICAgICAgLm9mZignY2xpY2suc2xpY2snKVxuICAgICAgICAgICAgICAgLm9uKCdjbGljay5zbGljaycsIHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ25leHQnXG4gICAgICAgICAgICAgICB9LCBfLmNoYW5nZVNsaWRlKTtcblxuICAgICAgICAgICAgaWYgKF8ub3B0aW9ucy5hY2Nlc3NpYmlsaXR5ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgXy4kcHJldkFycm93Lm9uKCdrZXlkb3duLnNsaWNrJywgXy5rZXlIYW5kbGVyKTtcbiAgICAgICAgICAgICAgICBfLiRuZXh0QXJyb3cub24oJ2tleWRvd24uc2xpY2snLCBfLmtleUhhbmRsZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmluaXREb3RFdmVudHMgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5kb3RzID09PSB0cnVlICYmIF8uc2xpZGVDb3VudCA+IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpIHtcbiAgICAgICAgICAgICQoJ2xpJywgXy4kZG90cykub24oJ2NsaWNrLnNsaWNrJywge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdpbmRleCdcbiAgICAgICAgICAgIH0sIF8uY2hhbmdlU2xpZGUpO1xuXG4gICAgICAgICAgICBpZiAoXy5vcHRpb25zLmFjY2Vzc2liaWxpdHkgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBfLiRkb3RzLm9uKCdrZXlkb3duLnNsaWNrJywgXy5rZXlIYW5kbGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuZG90cyA9PT0gdHJ1ZSAmJiBfLm9wdGlvbnMucGF1c2VPbkRvdHNIb3ZlciA9PT0gdHJ1ZSAmJiBfLnNsaWRlQ291bnQgPiBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSB7XG5cbiAgICAgICAgICAgICQoJ2xpJywgXy4kZG90cylcbiAgICAgICAgICAgICAgICAub24oJ21vdXNlZW50ZXIuc2xpY2snLCAkLnByb3h5KF8uaW50ZXJydXB0LCBfLCB0cnVlKSlcbiAgICAgICAgICAgICAgICAub24oJ21vdXNlbGVhdmUuc2xpY2snLCAkLnByb3h5KF8uaW50ZXJydXB0LCBfLCBmYWxzZSkpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuaW5pdFNsaWRlRXZlbnRzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIGlmICggXy5vcHRpb25zLnBhdXNlT25Ib3ZlciApIHtcblxuICAgICAgICAgICAgXy4kbGlzdC5vbignbW91c2VlbnRlci5zbGljaycsICQucHJveHkoXy5pbnRlcnJ1cHQsIF8sIHRydWUpKTtcbiAgICAgICAgICAgIF8uJGxpc3Qub24oJ21vdXNlbGVhdmUuc2xpY2snLCAkLnByb3h5KF8uaW50ZXJydXB0LCBfLCBmYWxzZSkpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuaW5pdGlhbGl6ZUV2ZW50cyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBfLmluaXRBcnJvd0V2ZW50cygpO1xuXG4gICAgICAgIF8uaW5pdERvdEV2ZW50cygpO1xuICAgICAgICBfLmluaXRTbGlkZUV2ZW50cygpO1xuXG4gICAgICAgIF8uJGxpc3Qub24oJ3RvdWNoc3RhcnQuc2xpY2sgbW91c2Vkb3duLnNsaWNrJywge1xuICAgICAgICAgICAgYWN0aW9uOiAnc3RhcnQnXG4gICAgICAgIH0sIF8uc3dpcGVIYW5kbGVyKTtcbiAgICAgICAgXy4kbGlzdC5vbigndG91Y2htb3ZlLnNsaWNrIG1vdXNlbW92ZS5zbGljaycsIHtcbiAgICAgICAgICAgIGFjdGlvbjogJ21vdmUnXG4gICAgICAgIH0sIF8uc3dpcGVIYW5kbGVyKTtcbiAgICAgICAgXy4kbGlzdC5vbigndG91Y2hlbmQuc2xpY2sgbW91c2V1cC5zbGljaycsIHtcbiAgICAgICAgICAgIGFjdGlvbjogJ2VuZCdcbiAgICAgICAgfSwgXy5zd2lwZUhhbmRsZXIpO1xuICAgICAgICBfLiRsaXN0Lm9uKCd0b3VjaGNhbmNlbC5zbGljayBtb3VzZWxlYXZlLnNsaWNrJywge1xuICAgICAgICAgICAgYWN0aW9uOiAnZW5kJ1xuICAgICAgICB9LCBfLnN3aXBlSGFuZGxlcik7XG5cbiAgICAgICAgXy4kbGlzdC5vbignY2xpY2suc2xpY2snLCBfLmNsaWNrSGFuZGxlcik7XG5cbiAgICAgICAgJChkb2N1bWVudCkub24oXy52aXNpYmlsaXR5Q2hhbmdlLCAkLnByb3h5KF8udmlzaWJpbGl0eSwgXykpO1xuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuYWNjZXNzaWJpbGl0eSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgXy4kbGlzdC5vbigna2V5ZG93bi5zbGljaycsIF8ua2V5SGFuZGxlcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXy5vcHRpb25zLmZvY3VzT25TZWxlY3QgPT09IHRydWUpIHtcbiAgICAgICAgICAgICQoXy4kc2xpZGVUcmFjaykuY2hpbGRyZW4oKS5vbignY2xpY2suc2xpY2snLCBfLnNlbGVjdEhhbmRsZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgJCh3aW5kb3cpLm9uKCdvcmllbnRhdGlvbmNoYW5nZS5zbGljay5zbGljay0nICsgXy5pbnN0YW5jZVVpZCwgJC5wcm94eShfLm9yaWVudGF0aW9uQ2hhbmdlLCBfKSk7XG5cbiAgICAgICAgJCh3aW5kb3cpLm9uKCdyZXNpemUuc2xpY2suc2xpY2stJyArIF8uaW5zdGFuY2VVaWQsICQucHJveHkoXy5yZXNpemUsIF8pKTtcblxuICAgICAgICAkKCdbZHJhZ2dhYmxlIT10cnVlXScsIF8uJHNsaWRlVHJhY2spLm9uKCdkcmFnc3RhcnQnLCBfLnByZXZlbnREZWZhdWx0KTtcblxuICAgICAgICAkKHdpbmRvdykub24oJ2xvYWQuc2xpY2suc2xpY2stJyArIF8uaW5zdGFuY2VVaWQsIF8uc2V0UG9zaXRpb24pO1xuICAgICAgICAkKF8uc2V0UG9zaXRpb24pO1xuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5pbml0VUkgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5hcnJvd3MgPT09IHRydWUgJiYgXy5zbGlkZUNvdW50ID4gXy5vcHRpb25zLnNsaWRlc1RvU2hvdykge1xuXG4gICAgICAgICAgICBfLiRwcmV2QXJyb3cuc2hvdygpO1xuICAgICAgICAgICAgXy4kbmV4dEFycm93LnNob3coKTtcblxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5kb3RzID09PSB0cnVlICYmIF8uc2xpZGVDb3VudCA+IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpIHtcblxuICAgICAgICAgICAgXy4kZG90cy5zaG93KCk7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5rZXlIYW5kbGVyID0gZnVuY3Rpb24oZXZlbnQpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG4gICAgICAgICAvL0RvbnQgc2xpZGUgaWYgdGhlIGN1cnNvciBpcyBpbnNpZGUgdGhlIGZvcm0gZmllbGRzIGFuZCBhcnJvdyBrZXlzIGFyZSBwcmVzc2VkXG4gICAgICAgIGlmKCFldmVudC50YXJnZXQudGFnTmFtZS5tYXRjaCgnVEVYVEFSRUF8SU5QVVR8U0VMRUNUJykpIHtcbiAgICAgICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAzNyAmJiBfLm9wdGlvbnMuYWNjZXNzaWJpbGl0eSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIF8uY2hhbmdlU2xpZGUoe1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBfLm9wdGlvbnMucnRsID09PSB0cnVlID8gJ25leHQnIDogICdwcmV2aW91cydcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChldmVudC5rZXlDb2RlID09PSAzOSAmJiBfLm9wdGlvbnMuYWNjZXNzaWJpbGl0eSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIF8uY2hhbmdlU2xpZGUoe1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBfLm9wdGlvbnMucnRsID09PSB0cnVlID8gJ3ByZXZpb3VzJyA6ICduZXh0J1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUubGF6eUxvYWQgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXMsXG4gICAgICAgICAgICBsb2FkUmFuZ2UsIGNsb25lUmFuZ2UsIHJhbmdlU3RhcnQsIHJhbmdlRW5kO1xuXG4gICAgICAgIGZ1bmN0aW9uIGxvYWRJbWFnZXMoaW1hZ2VzU2NvcGUpIHtcblxuICAgICAgICAgICAgJCgnaW1nW2RhdGEtbGF6eV0nLCBpbWFnZXNTY29wZSkuZWFjaChmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgICAgIHZhciBpbWFnZSA9ICQodGhpcyksXG4gICAgICAgICAgICAgICAgICAgIGltYWdlU291cmNlID0gJCh0aGlzKS5hdHRyKCdkYXRhLWxhenknKSxcbiAgICAgICAgICAgICAgICAgICAgaW1hZ2VTcmNTZXQgPSAkKHRoaXMpLmF0dHIoJ2RhdGEtc3Jjc2V0JyksXG4gICAgICAgICAgICAgICAgICAgIGltYWdlU2l6ZXMgID0gJCh0aGlzKS5hdHRyKCdkYXRhLXNpemVzJykgfHwgXy4kc2xpZGVyLmF0dHIoJ2RhdGEtc2l6ZXMnKSxcbiAgICAgICAgICAgICAgICAgICAgaW1hZ2VUb0xvYWQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcblxuICAgICAgICAgICAgICAgIGltYWdlVG9Mb2FkLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAgICAgICAgIGltYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICAuYW5pbWF0ZSh7IG9wYWNpdHk6IDAgfSwgMTAwLCBmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbWFnZVNyY1NldCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbWFnZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ3NyY3NldCcsIGltYWdlU3JjU2V0ICk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGltYWdlU2l6ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGltYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ3NpemVzJywgaW1hZ2VTaXplcyApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1hZ2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ3NyYycsIGltYWdlU291cmNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYW5pbWF0ZSh7IG9wYWNpdHk6IDEgfSwgMjAwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGltYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtbGF6eSBkYXRhLXNyY3NldCBkYXRhLXNpemVzJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3NsaWNrLWxvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXy4kc2xpZGVyLnRyaWdnZXIoJ2xhenlMb2FkZWQnLCBbXywgaW1hZ2UsIGltYWdlU291cmNlXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBpbWFnZVRvTG9hZC5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaW1hZ2VcbiAgICAgICAgICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCAnZGF0YS1sYXp5JyApXG4gICAgICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoICdzbGljay1sb2FkaW5nJyApXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoICdzbGljay1sYXp5bG9hZC1lcnJvcicgKTtcblxuICAgICAgICAgICAgICAgICAgICBfLiRzbGlkZXIudHJpZ2dlcignbGF6eUxvYWRFcnJvcicsIFsgXywgaW1hZ2UsIGltYWdlU291cmNlIF0pO1xuXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGltYWdlVG9Mb2FkLnNyYyA9IGltYWdlU291cmNlO1xuXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5jZW50ZXJNb2RlID09PSB0cnVlKSB7XG4gICAgICAgICAgICBpZiAoXy5vcHRpb25zLmluZmluaXRlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmFuZ2VTdGFydCA9IF8uY3VycmVudFNsaWRlICsgKF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgLyAyICsgMSk7XG4gICAgICAgICAgICAgICAgcmFuZ2VFbmQgPSByYW5nZVN0YXJ0ICsgXy5vcHRpb25zLnNsaWRlc1RvU2hvdyArIDI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJhbmdlU3RhcnQgPSBNYXRoLm1heCgwLCBfLmN1cnJlbnRTbGlkZSAtIChfLm9wdGlvbnMuc2xpZGVzVG9TaG93IC8gMiArIDEpKTtcbiAgICAgICAgICAgICAgICByYW5nZUVuZCA9IDIgKyAoXy5vcHRpb25zLnNsaWRlc1RvU2hvdyAvIDIgKyAxKSArIF8uY3VycmVudFNsaWRlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmFuZ2VTdGFydCA9IF8ub3B0aW9ucy5pbmZpbml0ZSA/IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgKyBfLmN1cnJlbnRTbGlkZSA6IF8uY3VycmVudFNsaWRlO1xuICAgICAgICAgICAgcmFuZ2VFbmQgPSBNYXRoLmNlaWwocmFuZ2VTdGFydCArIF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpO1xuICAgICAgICAgICAgaWYgKF8ub3B0aW9ucy5mYWRlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJhbmdlU3RhcnQgPiAwKSByYW5nZVN0YXJ0LS07XG4gICAgICAgICAgICAgICAgaWYgKHJhbmdlRW5kIDw9IF8uc2xpZGVDb3VudCkgcmFuZ2VFbmQrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGxvYWRSYW5nZSA9IF8uJHNsaWRlci5maW5kKCcuc2xpY2stc2xpZGUnKS5zbGljZShyYW5nZVN0YXJ0LCByYW5nZUVuZCk7XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5sYXp5TG9hZCA9PT0gJ2FudGljaXBhdGVkJykge1xuICAgICAgICAgICAgdmFyIHByZXZTbGlkZSA9IHJhbmdlU3RhcnQgLSAxLFxuICAgICAgICAgICAgICAgIG5leHRTbGlkZSA9IHJhbmdlRW5kLFxuICAgICAgICAgICAgICAgICRzbGlkZXMgPSBfLiRzbGlkZXIuZmluZCgnLnNsaWNrLXNsaWRlJyk7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAocHJldlNsaWRlIDwgMCkgcHJldlNsaWRlID0gXy5zbGlkZUNvdW50IC0gMTtcbiAgICAgICAgICAgICAgICBsb2FkUmFuZ2UgPSBsb2FkUmFuZ2UuYWRkKCRzbGlkZXMuZXEocHJldlNsaWRlKSk7XG4gICAgICAgICAgICAgICAgbG9hZFJhbmdlID0gbG9hZFJhbmdlLmFkZCgkc2xpZGVzLmVxKG5leHRTbGlkZSkpO1xuICAgICAgICAgICAgICAgIHByZXZTbGlkZS0tO1xuICAgICAgICAgICAgICAgIG5leHRTbGlkZSsrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbG9hZEltYWdlcyhsb2FkUmFuZ2UpO1xuXG4gICAgICAgIGlmIChfLnNsaWRlQ291bnQgPD0gXy5vcHRpb25zLnNsaWRlc1RvU2hvdykge1xuICAgICAgICAgICAgY2xvbmVSYW5nZSA9IF8uJHNsaWRlci5maW5kKCcuc2xpY2stc2xpZGUnKTtcbiAgICAgICAgICAgIGxvYWRJbWFnZXMoY2xvbmVSYW5nZSk7XG4gICAgICAgIH0gZWxzZVxuICAgICAgICBpZiAoXy5jdXJyZW50U2xpZGUgPj0gXy5zbGlkZUNvdW50IC0gXy5vcHRpb25zLnNsaWRlc1RvU2hvdykge1xuICAgICAgICAgICAgY2xvbmVSYW5nZSA9IF8uJHNsaWRlci5maW5kKCcuc2xpY2stY2xvbmVkJykuc2xpY2UoMCwgXy5vcHRpb25zLnNsaWRlc1RvU2hvdyk7XG4gICAgICAgICAgICBsb2FkSW1hZ2VzKGNsb25lUmFuZ2UpO1xuICAgICAgICB9IGVsc2UgaWYgKF8uY3VycmVudFNsaWRlID09PSAwKSB7XG4gICAgICAgICAgICBjbG9uZVJhbmdlID0gXy4kc2xpZGVyLmZpbmQoJy5zbGljay1jbG9uZWQnKS5zbGljZShfLm9wdGlvbnMuc2xpZGVzVG9TaG93ICogLTEpO1xuICAgICAgICAgICAgbG9hZEltYWdlcyhjbG9uZVJhbmdlKTtcbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5sb2FkU2xpZGVyID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIF8uc2V0UG9zaXRpb24oKTtcblxuICAgICAgICBfLiRzbGlkZVRyYWNrLmNzcyh7XG4gICAgICAgICAgICBvcGFjaXR5OiAxXG4gICAgICAgIH0pO1xuXG4gICAgICAgIF8uJHNsaWRlci5yZW1vdmVDbGFzcygnc2xpY2stbG9hZGluZycpO1xuXG4gICAgICAgIF8uaW5pdFVJKCk7XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5sYXp5TG9hZCA9PT0gJ3Byb2dyZXNzaXZlJykge1xuICAgICAgICAgICAgXy5wcm9ncmVzc2l2ZUxhenlMb2FkKCk7XG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUubmV4dCA9IFNsaWNrLnByb3RvdHlwZS5zbGlja05leHQgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgXy5jaGFuZ2VTbGlkZSh7XG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ25leHQnXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5vcmllbnRhdGlvbkNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBfLmNoZWNrUmVzcG9uc2l2ZSgpO1xuICAgICAgICBfLnNldFBvc2l0aW9uKCk7XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnBhdXNlID0gU2xpY2sucHJvdG90eXBlLnNsaWNrUGF1c2UgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgXy5hdXRvUGxheUNsZWFyKCk7XG4gICAgICAgIF8ucGF1c2VkID0gdHJ1ZTtcblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUucGxheSA9IFNsaWNrLnByb3RvdHlwZS5zbGlja1BsYXkgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgXy5hdXRvUGxheSgpO1xuICAgICAgICBfLm9wdGlvbnMuYXV0b3BsYXkgPSB0cnVlO1xuICAgICAgICBfLnBhdXNlZCA9IGZhbHNlO1xuICAgICAgICBfLmZvY3Vzc2VkID0gZmFsc2U7XG4gICAgICAgIF8uaW50ZXJydXB0ZWQgPSBmYWxzZTtcblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUucG9zdFNsaWRlID0gZnVuY3Rpb24oaW5kZXgpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgaWYoICFfLnVuc2xpY2tlZCApIHtcblxuICAgICAgICAgICAgXy4kc2xpZGVyLnRyaWdnZXIoJ2FmdGVyQ2hhbmdlJywgW18sIGluZGV4XSk7XG5cbiAgICAgICAgICAgIF8uYW5pbWF0aW5nID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGlmIChfLnNsaWRlQ291bnQgPiBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSB7XG4gICAgICAgICAgICAgICAgXy5zZXRQb3NpdGlvbigpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBfLnN3aXBlTGVmdCA9IG51bGw7XG5cbiAgICAgICAgICAgIGlmICggXy5vcHRpb25zLmF1dG9wbGF5ICkge1xuICAgICAgICAgICAgICAgIF8uYXV0b1BsYXkoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKF8ub3B0aW9ucy5hY2Nlc3NpYmlsaXR5ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgXy5pbml0QURBKCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoXy5vcHRpb25zLmZvY3VzT25DaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyICRjdXJyZW50U2xpZGUgPSAkKF8uJHNsaWRlcy5nZXQoXy5jdXJyZW50U2xpZGUpKTtcbiAgICAgICAgICAgICAgICAgICAgJGN1cnJlbnRTbGlkZS5hdHRyKCd0YWJpbmRleCcsIDApLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUucHJldiA9IFNsaWNrLnByb3RvdHlwZS5zbGlja1ByZXYgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgXy5jaGFuZ2VTbGlkZSh7XG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ3ByZXZpb3VzJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUucHJldmVudERlZmF1bHQgPSBmdW5jdGlvbihldmVudCkge1xuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnByb2dyZXNzaXZlTGF6eUxvYWQgPSBmdW5jdGlvbiggdHJ5Q291bnQgKSB7XG5cbiAgICAgICAgdHJ5Q291bnQgPSB0cnlDb3VudCB8fCAxO1xuXG4gICAgICAgIHZhciBfID0gdGhpcyxcbiAgICAgICAgICAgICRpbWdzVG9Mb2FkID0gJCggJ2ltZ1tkYXRhLWxhenldJywgXy4kc2xpZGVyICksXG4gICAgICAgICAgICBpbWFnZSxcbiAgICAgICAgICAgIGltYWdlU291cmNlLFxuICAgICAgICAgICAgaW1hZ2VTcmNTZXQsXG4gICAgICAgICAgICBpbWFnZVNpemVzLFxuICAgICAgICAgICAgaW1hZ2VUb0xvYWQ7XG5cbiAgICAgICAgaWYgKCAkaW1nc1RvTG9hZC5sZW5ndGggKSB7XG5cbiAgICAgICAgICAgIGltYWdlID0gJGltZ3NUb0xvYWQuZmlyc3QoKTtcbiAgICAgICAgICAgIGltYWdlU291cmNlID0gaW1hZ2UuYXR0cignZGF0YS1sYXp5Jyk7XG4gICAgICAgICAgICBpbWFnZVNyY1NldCA9IGltYWdlLmF0dHIoJ2RhdGEtc3Jjc2V0Jyk7XG4gICAgICAgICAgICBpbWFnZVNpemVzICA9IGltYWdlLmF0dHIoJ2RhdGEtc2l6ZXMnKSB8fCBfLiRzbGlkZXIuYXR0cignZGF0YS1zaXplcycpO1xuICAgICAgICAgICAgaW1hZ2VUb0xvYWQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcblxuICAgICAgICAgICAgaW1hZ2VUb0xvYWQub25sb2FkID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgICAgICBpZiAoaW1hZ2VTcmNTZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgaW1hZ2VcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKCdzcmNzZXQnLCBpbWFnZVNyY1NldCApO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbWFnZVNpemVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbWFnZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKCdzaXplcycsIGltYWdlU2l6ZXMgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGltYWdlXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCAnc3JjJywgaW1hZ2VTb3VyY2UgKVxuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS1sYXp5IGRhdGEtc3Jjc2V0IGRhdGEtc2l6ZXMnKVxuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3NsaWNrLWxvYWRpbmcnKTtcblxuICAgICAgICAgICAgICAgIGlmICggXy5vcHRpb25zLmFkYXB0aXZlSGVpZ2h0ID09PSB0cnVlICkge1xuICAgICAgICAgICAgICAgICAgICBfLnNldFBvc2l0aW9uKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgXy4kc2xpZGVyLnRyaWdnZXIoJ2xhenlMb2FkZWQnLCBbIF8sIGltYWdlLCBpbWFnZVNvdXJjZSBdKTtcbiAgICAgICAgICAgICAgICBfLnByb2dyZXNzaXZlTGF6eUxvYWQoKTtcblxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaW1hZ2VUb0xvYWQub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAgICAgaWYgKCB0cnlDb3VudCA8IDMgKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICAgICAqIHRyeSB0byBsb2FkIHRoZSBpbWFnZSAzIHRpbWVzLFxuICAgICAgICAgICAgICAgICAgICAgKiBsZWF2ZSBhIHNsaWdodCBkZWxheSBzbyB3ZSBkb24ndCBnZXRcbiAgICAgICAgICAgICAgICAgICAgICogc2VydmVycyBibG9ja2luZyB0aGUgcmVxdWVzdC5cbiAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5wcm9ncmVzc2l2ZUxhenlMb2FkKCB0cnlDb3VudCArIDEgKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgNTAwICk7XG5cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgICAgIGltYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQXR0ciggJ2RhdGEtbGF6eScgKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCAnc2xpY2stbG9hZGluZycgKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCAnc2xpY2stbGF6eWxvYWQtZXJyb3InICk7XG5cbiAgICAgICAgICAgICAgICAgICAgXy4kc2xpZGVyLnRyaWdnZXIoJ2xhenlMb2FkRXJyb3InLCBbIF8sIGltYWdlLCBpbWFnZVNvdXJjZSBdKTtcblxuICAgICAgICAgICAgICAgICAgICBfLnByb2dyZXNzaXZlTGF6eUxvYWQoKTtcblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaW1hZ2VUb0xvYWQuc3JjID0gaW1hZ2VTb3VyY2U7XG5cbiAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgXy4kc2xpZGVyLnRyaWdnZXIoJ2FsbEltYWdlc0xvYWRlZCcsIFsgXyBdKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnJlZnJlc2ggPSBmdW5jdGlvbiggaW5pdGlhbGl6aW5nICkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcywgY3VycmVudFNsaWRlLCBsYXN0VmlzaWJsZUluZGV4O1xuXG4gICAgICAgIGxhc3RWaXNpYmxlSW5kZXggPSBfLnNsaWRlQ291bnQgLSBfLm9wdGlvbnMuc2xpZGVzVG9TaG93O1xuXG4gICAgICAgIC8vIGluIG5vbi1pbmZpbml0ZSBzbGlkZXJzLCB3ZSBkb24ndCB3YW50IHRvIGdvIHBhc3QgdGhlXG4gICAgICAgIC8vIGxhc3QgdmlzaWJsZSBpbmRleC5cbiAgICAgICAgaWYoICFfLm9wdGlvbnMuaW5maW5pdGUgJiYgKCBfLmN1cnJlbnRTbGlkZSA+IGxhc3RWaXNpYmxlSW5kZXggKSkge1xuICAgICAgICAgICAgXy5jdXJyZW50U2xpZGUgPSBsYXN0VmlzaWJsZUluZGV4O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgbGVzcyBzbGlkZXMgdGhhbiB0byBzaG93LCBnbyB0byBzdGFydC5cbiAgICAgICAgaWYgKCBfLnNsaWRlQ291bnQgPD0gXy5vcHRpb25zLnNsaWRlc1RvU2hvdyApIHtcbiAgICAgICAgICAgIF8uY3VycmVudFNsaWRlID0gMDtcblxuICAgICAgICB9XG5cbiAgICAgICAgY3VycmVudFNsaWRlID0gXy5jdXJyZW50U2xpZGU7XG5cbiAgICAgICAgXy5kZXN0cm95KHRydWUpO1xuXG4gICAgICAgICQuZXh0ZW5kKF8sIF8uaW5pdGlhbHMsIHsgY3VycmVudFNsaWRlOiBjdXJyZW50U2xpZGUgfSk7XG5cbiAgICAgICAgXy5pbml0KCk7XG5cbiAgICAgICAgaWYoICFpbml0aWFsaXppbmcgKSB7XG5cbiAgICAgICAgICAgIF8uY2hhbmdlU2xpZGUoe1xuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ2luZGV4JyxcbiAgICAgICAgICAgICAgICAgICAgaW5kZXg6IGN1cnJlbnRTbGlkZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIGZhbHNlKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnJlZ2lzdGVyQnJlYWtwb2ludHMgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXMsIGJyZWFrcG9pbnQsIGN1cnJlbnRCcmVha3BvaW50LCBsLFxuICAgICAgICAgICAgcmVzcG9uc2l2ZVNldHRpbmdzID0gXy5vcHRpb25zLnJlc3BvbnNpdmUgfHwgbnVsbDtcblxuICAgICAgICBpZiAoICQudHlwZShyZXNwb25zaXZlU2V0dGluZ3MpID09PSAnYXJyYXknICYmIHJlc3BvbnNpdmVTZXR0aW5ncy5sZW5ndGggKSB7XG5cbiAgICAgICAgICAgIF8ucmVzcG9uZFRvID0gXy5vcHRpb25zLnJlc3BvbmRUbyB8fCAnd2luZG93JztcblxuICAgICAgICAgICAgZm9yICggYnJlYWtwb2ludCBpbiByZXNwb25zaXZlU2V0dGluZ3MgKSB7XG5cbiAgICAgICAgICAgICAgICBsID0gXy5icmVha3BvaW50cy5sZW5ndGgtMTtcblxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zaXZlU2V0dGluZ3MuaGFzT3duUHJvcGVydHkoYnJlYWtwb2ludCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudEJyZWFrcG9pbnQgPSByZXNwb25zaXZlU2V0dGluZ3NbYnJlYWtwb2ludF0uYnJlYWtwb2ludDtcblxuICAgICAgICAgICAgICAgICAgICAvLyBsb29wIHRocm91Z2ggdGhlIGJyZWFrcG9pbnRzIGFuZCBjdXQgb3V0IGFueSBleGlzdGluZ1xuICAgICAgICAgICAgICAgICAgICAvLyBvbmVzIHdpdGggdGhlIHNhbWUgYnJlYWtwb2ludCBudW1iZXIsIHdlIGRvbid0IHdhbnQgZHVwZXMuXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlKCBsID49IDAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiggXy5icmVha3BvaW50c1tsXSAmJiBfLmJyZWFrcG9pbnRzW2xdID09PSBjdXJyZW50QnJlYWtwb2ludCApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmJyZWFrcG9pbnRzLnNwbGljZShsLDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbC0tO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgXy5icmVha3BvaW50cy5wdXNoKGN1cnJlbnRCcmVha3BvaW50KTtcbiAgICAgICAgICAgICAgICAgICAgXy5icmVha3BvaW50U2V0dGluZ3NbY3VycmVudEJyZWFrcG9pbnRdID0gcmVzcG9uc2l2ZVNldHRpbmdzW2JyZWFrcG9pbnRdLnNldHRpbmdzO1xuXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF8uYnJlYWtwb2ludHMuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICggXy5vcHRpb25zLm1vYmlsZUZpcnN0ICkgPyBhLWIgOiBiLWE7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnJlaW5pdCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBfLiRzbGlkZXMgPVxuICAgICAgICAgICAgXy4kc2xpZGVUcmFja1xuICAgICAgICAgICAgICAgIC5jaGlsZHJlbihfLm9wdGlvbnMuc2xpZGUpXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKCdzbGljay1zbGlkZScpO1xuXG4gICAgICAgIF8uc2xpZGVDb3VudCA9IF8uJHNsaWRlcy5sZW5ndGg7XG5cbiAgICAgICAgaWYgKF8uY3VycmVudFNsaWRlID49IF8uc2xpZGVDb3VudCAmJiBfLmN1cnJlbnRTbGlkZSAhPT0gMCkge1xuICAgICAgICAgICAgXy5jdXJyZW50U2xpZGUgPSBfLmN1cnJlbnRTbGlkZSAtIF8ub3B0aW9ucy5zbGlkZXNUb1Njcm9sbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLnNsaWRlQ291bnQgPD0gXy5vcHRpb25zLnNsaWRlc1RvU2hvdykge1xuICAgICAgICAgICAgXy5jdXJyZW50U2xpZGUgPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgXy5yZWdpc3RlckJyZWFrcG9pbnRzKCk7XG5cbiAgICAgICAgXy5zZXRQcm9wcygpO1xuICAgICAgICBfLnNldHVwSW5maW5pdGUoKTtcbiAgICAgICAgXy5idWlsZEFycm93cygpO1xuICAgICAgICBfLnVwZGF0ZUFycm93cygpO1xuICAgICAgICBfLmluaXRBcnJvd0V2ZW50cygpO1xuICAgICAgICBfLmJ1aWxkRG90cygpO1xuICAgICAgICBfLnVwZGF0ZURvdHMoKTtcbiAgICAgICAgXy5pbml0RG90RXZlbnRzKCk7XG4gICAgICAgIF8uY2xlYW5VcFNsaWRlRXZlbnRzKCk7XG4gICAgICAgIF8uaW5pdFNsaWRlRXZlbnRzKCk7XG5cbiAgICAgICAgXy5jaGVja1Jlc3BvbnNpdmUoZmFsc2UsIHRydWUpO1xuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuZm9jdXNPblNlbGVjdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgJChfLiRzbGlkZVRyYWNrKS5jaGlsZHJlbigpLm9uKCdjbGljay5zbGljaycsIF8uc2VsZWN0SGFuZGxlcik7XG4gICAgICAgIH1cblxuICAgICAgICBfLnNldFNsaWRlQ2xhc3Nlcyh0eXBlb2YgXy5jdXJyZW50U2xpZGUgPT09ICdudW1iZXInID8gXy5jdXJyZW50U2xpZGUgOiAwKTtcblxuICAgICAgICBfLnNldFBvc2l0aW9uKCk7XG4gICAgICAgIF8uZm9jdXNIYW5kbGVyKCk7XG5cbiAgICAgICAgXy5wYXVzZWQgPSAhXy5vcHRpb25zLmF1dG9wbGF5O1xuICAgICAgICBfLmF1dG9QbGF5KCk7XG5cbiAgICAgICAgXy4kc2xpZGVyLnRyaWdnZXIoJ3JlSW5pdCcsIFtfXSk7XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnJlc2l6ZSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBpZiAoJCh3aW5kb3cpLndpZHRoKCkgIT09IF8ud2luZG93V2lkdGgpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChfLndpbmRvd0RlbGF5KTtcbiAgICAgICAgICAgIF8ud2luZG93RGVsYXkgPSB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBfLndpbmRvd1dpZHRoID0gJCh3aW5kb3cpLndpZHRoKCk7XG4gICAgICAgICAgICAgICAgXy5jaGVja1Jlc3BvbnNpdmUoKTtcbiAgICAgICAgICAgICAgICBpZiggIV8udW5zbGlja2VkICkgeyBfLnNldFBvc2l0aW9uKCk7IH1cbiAgICAgICAgICAgIH0sIDUwKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUucmVtb3ZlU2xpZGUgPSBTbGljay5wcm90b3R5cGUuc2xpY2tSZW1vdmUgPSBmdW5jdGlvbihpbmRleCwgcmVtb3ZlQmVmb3JlLCByZW1vdmVBbGwpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgaWYgKHR5cGVvZihpbmRleCkgPT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgcmVtb3ZlQmVmb3JlID0gaW5kZXg7XG4gICAgICAgICAgICBpbmRleCA9IHJlbW92ZUJlZm9yZSA9PT0gdHJ1ZSA/IDAgOiBfLnNsaWRlQ291bnQgLSAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW5kZXggPSByZW1vdmVCZWZvcmUgPT09IHRydWUgPyAtLWluZGV4IDogaW5kZXg7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXy5zbGlkZUNvdW50IDwgMSB8fCBpbmRleCA8IDAgfHwgaW5kZXggPiBfLnNsaWRlQ291bnQgLSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBfLnVubG9hZCgpO1xuXG4gICAgICAgIGlmIChyZW1vdmVBbGwgPT09IHRydWUpIHtcbiAgICAgICAgICAgIF8uJHNsaWRlVHJhY2suY2hpbGRyZW4oKS5yZW1vdmUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIF8uJHNsaWRlVHJhY2suY2hpbGRyZW4odGhpcy5vcHRpb25zLnNsaWRlKS5lcShpbmRleCkucmVtb3ZlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBfLiRzbGlkZXMgPSBfLiRzbGlkZVRyYWNrLmNoaWxkcmVuKHRoaXMub3B0aW9ucy5zbGlkZSk7XG5cbiAgICAgICAgXy4kc2xpZGVUcmFjay5jaGlsZHJlbih0aGlzLm9wdGlvbnMuc2xpZGUpLmRldGFjaCgpO1xuXG4gICAgICAgIF8uJHNsaWRlVHJhY2suYXBwZW5kKF8uJHNsaWRlcyk7XG5cbiAgICAgICAgXy4kc2xpZGVzQ2FjaGUgPSBfLiRzbGlkZXM7XG5cbiAgICAgICAgXy5yZWluaXQoKTtcblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuc2V0Q1NTID0gZnVuY3Rpb24ocG9zaXRpb24pIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXMsXG4gICAgICAgICAgICBwb3NpdGlvblByb3BzID0ge30sXG4gICAgICAgICAgICB4LCB5O1xuXG4gICAgICAgIGlmIChfLm9wdGlvbnMucnRsID09PSB0cnVlKSB7XG4gICAgICAgICAgICBwb3NpdGlvbiA9IC1wb3NpdGlvbjtcbiAgICAgICAgfVxuICAgICAgICB4ID0gXy5wb3NpdGlvblByb3AgPT0gJ2xlZnQnID8gTWF0aC5jZWlsKHBvc2l0aW9uKSArICdweCcgOiAnMHB4JztcbiAgICAgICAgeSA9IF8ucG9zaXRpb25Qcm9wID09ICd0b3AnID8gTWF0aC5jZWlsKHBvc2l0aW9uKSArICdweCcgOiAnMHB4JztcblxuICAgICAgICBwb3NpdGlvblByb3BzW18ucG9zaXRpb25Qcm9wXSA9IHBvc2l0aW9uO1xuXG4gICAgICAgIGlmIChfLnRyYW5zZm9ybXNFbmFibGVkID09PSBmYWxzZSkge1xuICAgICAgICAgICAgXy4kc2xpZGVUcmFjay5jc3MocG9zaXRpb25Qcm9wcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwb3NpdGlvblByb3BzID0ge307XG4gICAgICAgICAgICBpZiAoXy5jc3NUcmFuc2l0aW9ucyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICBwb3NpdGlvblByb3BzW18uYW5pbVR5cGVdID0gJ3RyYW5zbGF0ZSgnICsgeCArICcsICcgKyB5ICsgJyknO1xuICAgICAgICAgICAgICAgIF8uJHNsaWRlVHJhY2suY3NzKHBvc2l0aW9uUHJvcHMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwb3NpdGlvblByb3BzW18uYW5pbVR5cGVdID0gJ3RyYW5zbGF0ZTNkKCcgKyB4ICsgJywgJyArIHkgKyAnLCAwcHgpJztcbiAgICAgICAgICAgICAgICBfLiRzbGlkZVRyYWNrLmNzcyhwb3NpdGlvblByb3BzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5zZXREaW1lbnNpb25zID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIGlmIChfLm9wdGlvbnMudmVydGljYWwgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBpZiAoXy5vcHRpb25zLmNlbnRlck1vZGUgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBfLiRsaXN0LmNzcyh7XG4gICAgICAgICAgICAgICAgICAgIHBhZGRpbmc6ICgnMHB4ICcgKyBfLm9wdGlvbnMuY2VudGVyUGFkZGluZylcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIF8uJGxpc3QuaGVpZ2h0KF8uJHNsaWRlcy5maXJzdCgpLm91dGVySGVpZ2h0KHRydWUpICogXy5vcHRpb25zLnNsaWRlc1RvU2hvdyk7XG4gICAgICAgICAgICBpZiAoXy5vcHRpb25zLmNlbnRlck1vZGUgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBfLiRsaXN0LmNzcyh7XG4gICAgICAgICAgICAgICAgICAgIHBhZGRpbmc6IChfLm9wdGlvbnMuY2VudGVyUGFkZGluZyArICcgMHB4JylcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIF8ubGlzdFdpZHRoID0gXy4kbGlzdC53aWR0aCgpO1xuICAgICAgICBfLmxpc3RIZWlnaHQgPSBfLiRsaXN0LmhlaWdodCgpO1xuXG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy52ZXJ0aWNhbCA9PT0gZmFsc2UgJiYgXy5vcHRpb25zLnZhcmlhYmxlV2lkdGggPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBfLnNsaWRlV2lkdGggPSBNYXRoLmNlaWwoXy5saXN0V2lkdGggLyBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KTtcbiAgICAgICAgICAgIF8uJHNsaWRlVHJhY2sud2lkdGgoTWF0aC5jZWlsKChfLnNsaWRlV2lkdGggKiBfLiRzbGlkZVRyYWNrLmNoaWxkcmVuKCcuc2xpY2stc2xpZGUnKS5sZW5ndGgpKSk7XG5cbiAgICAgICAgfSBlbHNlIGlmIChfLm9wdGlvbnMudmFyaWFibGVXaWR0aCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgXy4kc2xpZGVUcmFjay53aWR0aCg1MDAwICogXy5zbGlkZUNvdW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIF8uc2xpZGVXaWR0aCA9IE1hdGguY2VpbChfLmxpc3RXaWR0aCk7XG4gICAgICAgICAgICBfLiRzbGlkZVRyYWNrLmhlaWdodChNYXRoLmNlaWwoKF8uJHNsaWRlcy5maXJzdCgpLm91dGVySGVpZ2h0KHRydWUpICogXy4kc2xpZGVUcmFjay5jaGlsZHJlbignLnNsaWNrLXNsaWRlJykubGVuZ3RoKSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG9mZnNldCA9IF8uJHNsaWRlcy5maXJzdCgpLm91dGVyV2lkdGgodHJ1ZSkgLSBfLiRzbGlkZXMuZmlyc3QoKS53aWR0aCgpO1xuICAgICAgICBpZiAoXy5vcHRpb25zLnZhcmlhYmxlV2lkdGggPT09IGZhbHNlKSBfLiRzbGlkZVRyYWNrLmNoaWxkcmVuKCcuc2xpY2stc2xpZGUnKS53aWR0aChfLnNsaWRlV2lkdGggLSBvZmZzZXQpO1xuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5zZXRGYWRlID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzLFxuICAgICAgICAgICAgdGFyZ2V0TGVmdDtcblxuICAgICAgICBfLiRzbGlkZXMuZWFjaChmdW5jdGlvbihpbmRleCwgZWxlbWVudCkge1xuICAgICAgICAgICAgdGFyZ2V0TGVmdCA9IChfLnNsaWRlV2lkdGggKiBpbmRleCkgKiAtMTtcbiAgICAgICAgICAgIGlmIChfLm9wdGlvbnMucnRsID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgJChlbGVtZW50KS5jc3Moe1xuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3JlbGF0aXZlJyxcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IHRhcmdldExlZnQsXG4gICAgICAgICAgICAgICAgICAgIHRvcDogMCxcbiAgICAgICAgICAgICAgICAgICAgekluZGV4OiBfLm9wdGlvbnMuekluZGV4IC0gMixcbiAgICAgICAgICAgICAgICAgICAgb3BhY2l0eTogMFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKGVsZW1lbnQpLmNzcyh7XG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAncmVsYXRpdmUnLFxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiB0YXJnZXRMZWZ0LFxuICAgICAgICAgICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICAgICAgICAgIHpJbmRleDogXy5vcHRpb25zLnpJbmRleCAtIDIsXG4gICAgICAgICAgICAgICAgICAgIG9wYWNpdHk6IDBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgXy4kc2xpZGVzLmVxKF8uY3VycmVudFNsaWRlKS5jc3Moe1xuICAgICAgICAgICAgekluZGV4OiBfLm9wdGlvbnMuekluZGV4IC0gMSxcbiAgICAgICAgICAgIG9wYWNpdHk6IDFcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnNldEhlaWdodCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBpZiAoXy5vcHRpb25zLnNsaWRlc1RvU2hvdyA9PT0gMSAmJiBfLm9wdGlvbnMuYWRhcHRpdmVIZWlnaHQgPT09IHRydWUgJiYgXy5vcHRpb25zLnZlcnRpY2FsID09PSBmYWxzZSkge1xuICAgICAgICAgICAgdmFyIHRhcmdldEhlaWdodCA9IF8uJHNsaWRlcy5lcShfLmN1cnJlbnRTbGlkZSkub3V0ZXJIZWlnaHQodHJ1ZSk7XG4gICAgICAgICAgICBfLiRsaXN0LmNzcygnaGVpZ2h0JywgdGFyZ2V0SGVpZ2h0KTtcbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5zZXRPcHRpb24gPVxuICAgIFNsaWNrLnByb3RvdHlwZS5zbGlja1NldE9wdGlvbiA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBhY2NlcHRzIGFyZ3VtZW50cyBpbiBmb3JtYXQgb2Y6XG4gICAgICAgICAqXG4gICAgICAgICAqICAtIGZvciBjaGFuZ2luZyBhIHNpbmdsZSBvcHRpb24ncyB2YWx1ZTpcbiAgICAgICAgICogICAgIC5zbGljayhcInNldE9wdGlvblwiLCBvcHRpb24sIHZhbHVlLCByZWZyZXNoIClcbiAgICAgICAgICpcbiAgICAgICAgICogIC0gZm9yIGNoYW5naW5nIGEgc2V0IG9mIHJlc3BvbnNpdmUgb3B0aW9uczpcbiAgICAgICAgICogICAgIC5zbGljayhcInNldE9wdGlvblwiLCAncmVzcG9uc2l2ZScsIFt7fSwgLi4uXSwgcmVmcmVzaCApXG4gICAgICAgICAqXG4gICAgICAgICAqICAtIGZvciB1cGRhdGluZyBtdWx0aXBsZSB2YWx1ZXMgYXQgb25jZSAobm90IHJlc3BvbnNpdmUpXG4gICAgICAgICAqICAgICAuc2xpY2soXCJzZXRPcHRpb25cIiwgeyAnb3B0aW9uJzogdmFsdWUsIC4uLiB9LCByZWZyZXNoIClcbiAgICAgICAgICovXG5cbiAgICAgICAgdmFyIF8gPSB0aGlzLCBsLCBpdGVtLCBvcHRpb24sIHZhbHVlLCByZWZyZXNoID0gZmFsc2UsIHR5cGU7XG5cbiAgICAgICAgaWYoICQudHlwZSggYXJndW1lbnRzWzBdICkgPT09ICdvYmplY3QnICkge1xuXG4gICAgICAgICAgICBvcHRpb24gPSAgYXJndW1lbnRzWzBdO1xuICAgICAgICAgICAgcmVmcmVzaCA9IGFyZ3VtZW50c1sxXTtcbiAgICAgICAgICAgIHR5cGUgPSAnbXVsdGlwbGUnO1xuXG4gICAgICAgIH0gZWxzZSBpZiAoICQudHlwZSggYXJndW1lbnRzWzBdICkgPT09ICdzdHJpbmcnICkge1xuXG4gICAgICAgICAgICBvcHRpb24gPSAgYXJndW1lbnRzWzBdO1xuICAgICAgICAgICAgdmFsdWUgPSBhcmd1bWVudHNbMV07XG4gICAgICAgICAgICByZWZyZXNoID0gYXJndW1lbnRzWzJdO1xuXG4gICAgICAgICAgICBpZiAoIGFyZ3VtZW50c1swXSA9PT0gJ3Jlc3BvbnNpdmUnICYmICQudHlwZSggYXJndW1lbnRzWzFdICkgPT09ICdhcnJheScgKSB7XG5cbiAgICAgICAgICAgICAgICB0eXBlID0gJ3Jlc3BvbnNpdmUnO1xuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKCB0eXBlb2YgYXJndW1lbnRzWzFdICE9PSAndW5kZWZpbmVkJyApIHtcblxuICAgICAgICAgICAgICAgIHR5cGUgPSAnc2luZ2xlJztcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIHR5cGUgPT09ICdzaW5nbGUnICkge1xuXG4gICAgICAgICAgICBfLm9wdGlvbnNbb3B0aW9uXSA9IHZhbHVlO1xuXG5cbiAgICAgICAgfSBlbHNlIGlmICggdHlwZSA9PT0gJ211bHRpcGxlJyApIHtcblxuICAgICAgICAgICAgJC5lYWNoKCBvcHRpb24gLCBmdW5jdGlvbiggb3B0LCB2YWwgKSB7XG5cbiAgICAgICAgICAgICAgICBfLm9wdGlvbnNbb3B0XSA9IHZhbDtcblxuICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICB9IGVsc2UgaWYgKCB0eXBlID09PSAncmVzcG9uc2l2ZScgKSB7XG5cbiAgICAgICAgICAgIGZvciAoIGl0ZW0gaW4gdmFsdWUgKSB7XG5cbiAgICAgICAgICAgICAgICBpZiggJC50eXBlKCBfLm9wdGlvbnMucmVzcG9uc2l2ZSApICE9PSAnYXJyYXknICkge1xuXG4gICAgICAgICAgICAgICAgICAgIF8ub3B0aW9ucy5yZXNwb25zaXZlID0gWyB2YWx1ZVtpdGVtXSBdO1xuXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgICAgICBsID0gXy5vcHRpb25zLnJlc3BvbnNpdmUubGVuZ3RoLTE7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gbG9vcCB0aHJvdWdoIHRoZSByZXNwb25zaXZlIG9iamVjdCBhbmQgc3BsaWNlIG91dCBkdXBsaWNhdGVzLlxuICAgICAgICAgICAgICAgICAgICB3aGlsZSggbCA+PSAwICkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiggXy5vcHRpb25zLnJlc3BvbnNpdmVbbF0uYnJlYWtwb2ludCA9PT0gdmFsdWVbaXRlbV0uYnJlYWtwb2ludCApIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8ub3B0aW9ucy5yZXNwb25zaXZlLnNwbGljZShsLDEpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGwtLTtcblxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgXy5vcHRpb25zLnJlc3BvbnNpdmUucHVzaCggdmFsdWVbaXRlbV0gKTtcblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIHJlZnJlc2ggKSB7XG5cbiAgICAgICAgICAgIF8udW5sb2FkKCk7XG4gICAgICAgICAgICBfLnJlaW5pdCgpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuc2V0UG9zaXRpb24gPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgXy5zZXREaW1lbnNpb25zKCk7XG5cbiAgICAgICAgXy5zZXRIZWlnaHQoKTtcblxuICAgICAgICBpZiAoXy5vcHRpb25zLmZhZGUgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBfLnNldENTUyhfLmdldExlZnQoXy5jdXJyZW50U2xpZGUpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIF8uc2V0RmFkZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgXy4kc2xpZGVyLnRyaWdnZXIoJ3NldFBvc2l0aW9uJywgW19dKTtcblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuc2V0UHJvcHMgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXMsXG4gICAgICAgICAgICBib2R5U3R5bGUgPSBkb2N1bWVudC5ib2R5LnN0eWxlO1xuXG4gICAgICAgIF8ucG9zaXRpb25Qcm9wID0gXy5vcHRpb25zLnZlcnRpY2FsID09PSB0cnVlID8gJ3RvcCcgOiAnbGVmdCc7XG5cbiAgICAgICAgaWYgKF8ucG9zaXRpb25Qcm9wID09PSAndG9wJykge1xuICAgICAgICAgICAgXy4kc2xpZGVyLmFkZENsYXNzKCdzbGljay12ZXJ0aWNhbCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgXy4kc2xpZGVyLnJlbW92ZUNsYXNzKCdzbGljay12ZXJ0aWNhbCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGJvZHlTdHlsZS5XZWJraXRUcmFuc2l0aW9uICE9PSB1bmRlZmluZWQgfHxcbiAgICAgICAgICAgIGJvZHlTdHlsZS5Nb3pUcmFuc2l0aW9uICE9PSB1bmRlZmluZWQgfHxcbiAgICAgICAgICAgIGJvZHlTdHlsZS5tc1RyYW5zaXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgaWYgKF8ub3B0aW9ucy51c2VDU1MgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBfLmNzc1RyYW5zaXRpb25zID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICggXy5vcHRpb25zLmZhZGUgKSB7XG4gICAgICAgICAgICBpZiAoIHR5cGVvZiBfLm9wdGlvbnMuekluZGV4ID09PSAnbnVtYmVyJyApIHtcbiAgICAgICAgICAgICAgICBpZiggXy5vcHRpb25zLnpJbmRleCA8IDMgKSB7XG4gICAgICAgICAgICAgICAgICAgIF8ub3B0aW9ucy56SW5kZXggPSAzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgXy5vcHRpb25zLnpJbmRleCA9IF8uZGVmYXVsdHMuekluZGV4O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGJvZHlTdHlsZS5PVHJhbnNmb3JtICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIF8uYW5pbVR5cGUgPSAnT1RyYW5zZm9ybSc7XG4gICAgICAgICAgICBfLnRyYW5zZm9ybVR5cGUgPSAnLW8tdHJhbnNmb3JtJztcbiAgICAgICAgICAgIF8udHJhbnNpdGlvblR5cGUgPSAnT1RyYW5zaXRpb24nO1xuICAgICAgICAgICAgaWYgKGJvZHlTdHlsZS5wZXJzcGVjdGl2ZVByb3BlcnR5ID09PSB1bmRlZmluZWQgJiYgYm9keVN0eWxlLndlYmtpdFBlcnNwZWN0aXZlID09PSB1bmRlZmluZWQpIF8uYW5pbVR5cGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYm9keVN0eWxlLk1velRyYW5zZm9ybSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBfLmFuaW1UeXBlID0gJ01velRyYW5zZm9ybSc7XG4gICAgICAgICAgICBfLnRyYW5zZm9ybVR5cGUgPSAnLW1vei10cmFuc2Zvcm0nO1xuICAgICAgICAgICAgXy50cmFuc2l0aW9uVHlwZSA9ICdNb3pUcmFuc2l0aW9uJztcbiAgICAgICAgICAgIGlmIChib2R5U3R5bGUucGVyc3BlY3RpdmVQcm9wZXJ0eSA9PT0gdW5kZWZpbmVkICYmIGJvZHlTdHlsZS5Nb3pQZXJzcGVjdGl2ZSA9PT0gdW5kZWZpbmVkKSBfLmFuaW1UeXBlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJvZHlTdHlsZS53ZWJraXRUcmFuc2Zvcm0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgXy5hbmltVHlwZSA9ICd3ZWJraXRUcmFuc2Zvcm0nO1xuICAgICAgICAgICAgXy50cmFuc2Zvcm1UeXBlID0gJy13ZWJraXQtdHJhbnNmb3JtJztcbiAgICAgICAgICAgIF8udHJhbnNpdGlvblR5cGUgPSAnd2Via2l0VHJhbnNpdGlvbic7XG4gICAgICAgICAgICBpZiAoYm9keVN0eWxlLnBlcnNwZWN0aXZlUHJvcGVydHkgPT09IHVuZGVmaW5lZCAmJiBib2R5U3R5bGUud2Via2l0UGVyc3BlY3RpdmUgPT09IHVuZGVmaW5lZCkgXy5hbmltVHlwZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChib2R5U3R5bGUubXNUcmFuc2Zvcm0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgXy5hbmltVHlwZSA9ICdtc1RyYW5zZm9ybSc7XG4gICAgICAgICAgICBfLnRyYW5zZm9ybVR5cGUgPSAnLW1zLXRyYW5zZm9ybSc7XG4gICAgICAgICAgICBfLnRyYW5zaXRpb25UeXBlID0gJ21zVHJhbnNpdGlvbic7XG4gICAgICAgICAgICBpZiAoYm9keVN0eWxlLm1zVHJhbnNmb3JtID09PSB1bmRlZmluZWQpIF8uYW5pbVR5cGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYm9keVN0eWxlLnRyYW5zZm9ybSAhPT0gdW5kZWZpbmVkICYmIF8uYW5pbVR5cGUgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBfLmFuaW1UeXBlID0gJ3RyYW5zZm9ybSc7XG4gICAgICAgICAgICBfLnRyYW5zZm9ybVR5cGUgPSAndHJhbnNmb3JtJztcbiAgICAgICAgICAgIF8udHJhbnNpdGlvblR5cGUgPSAndHJhbnNpdGlvbic7XG4gICAgICAgIH1cbiAgICAgICAgXy50cmFuc2Zvcm1zRW5hYmxlZCA9IF8ub3B0aW9ucy51c2VUcmFuc2Zvcm0gJiYgKF8uYW5pbVR5cGUgIT09IG51bGwgJiYgXy5hbmltVHlwZSAhPT0gZmFsc2UpO1xuICAgIH07XG5cblxuICAgIFNsaWNrLnByb3RvdHlwZS5zZXRTbGlkZUNsYXNzZXMgPSBmdW5jdGlvbihpbmRleCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcyxcbiAgICAgICAgICAgIGNlbnRlck9mZnNldCwgYWxsU2xpZGVzLCBpbmRleE9mZnNldCwgcmVtYWluZGVyO1xuXG4gICAgICAgIGFsbFNsaWRlcyA9IF8uJHNsaWRlclxuICAgICAgICAgICAgLmZpbmQoJy5zbGljay1zbGlkZScpXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3NsaWNrLWFjdGl2ZSBzbGljay1jZW50ZXIgc2xpY2stY3VycmVudCcpXG4gICAgICAgICAgICAuYXR0cignYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuXG4gICAgICAgIF8uJHNsaWRlc1xuICAgICAgICAgICAgLmVxKGluZGV4KVxuICAgICAgICAgICAgLmFkZENsYXNzKCdzbGljay1jdXJyZW50Jyk7XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5jZW50ZXJNb2RlID09PSB0cnVlKSB7XG5cbiAgICAgICAgICAgIHZhciBldmVuQ29lZiA9IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgJSAyID09PSAwID8gMSA6IDA7XG5cbiAgICAgICAgICAgIGNlbnRlck9mZnNldCA9IE1hdGguZmxvb3IoXy5vcHRpb25zLnNsaWRlc1RvU2hvdyAvIDIpO1xuXG4gICAgICAgICAgICBpZiAoXy5vcHRpb25zLmluZmluaXRlID09PSB0cnVlKSB7XG5cbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gY2VudGVyT2Zmc2V0ICYmIGluZGV4IDw9IChfLnNsaWRlQ291bnQgLSAxKSAtIGNlbnRlck9mZnNldCkge1xuICAgICAgICAgICAgICAgICAgICBfLiRzbGlkZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zbGljZShpbmRleCAtIGNlbnRlck9mZnNldCArIGV2ZW5Db2VmLCBpbmRleCArIGNlbnRlck9mZnNldCArIDEpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3NsaWNrLWFjdGl2ZScpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYXR0cignYXJpYS1oaWRkZW4nLCAnZmFsc2UnKTtcblxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaW5kZXhPZmZzZXQgPSBfLm9wdGlvbnMuc2xpZGVzVG9TaG93ICsgaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGFsbFNsaWRlc1xuICAgICAgICAgICAgICAgICAgICAgICAgLnNsaWNlKGluZGV4T2Zmc2V0IC0gY2VudGVyT2Zmc2V0ICsgMSArIGV2ZW5Db2VmLCBpbmRleE9mZnNldCArIGNlbnRlck9mZnNldCArIDIpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3NsaWNrLWFjdGl2ZScpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYXR0cignYXJpYS1oaWRkZW4nLCAnZmFsc2UnKTtcblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gMCkge1xuXG4gICAgICAgICAgICAgICAgICAgIGFsbFNsaWRlc1xuICAgICAgICAgICAgICAgICAgICAgICAgLmVxKGFsbFNsaWRlcy5sZW5ndGggLSAxIC0gXy5vcHRpb25zLnNsaWRlc1RvU2hvdylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnc2xpY2stY2VudGVyJyk7XG5cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGluZGV4ID09PSBfLnNsaWRlQ291bnQgLSAxKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgYWxsU2xpZGVzXG4gICAgICAgICAgICAgICAgICAgICAgICAuZXEoXy5vcHRpb25zLnNsaWRlc1RvU2hvdylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnc2xpY2stY2VudGVyJyk7XG5cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgXy4kc2xpZGVzXG4gICAgICAgICAgICAgICAgLmVxKGluZGV4KVxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnc2xpY2stY2VudGVyJyk7XG5cbiAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgaWYgKGluZGV4ID49IDAgJiYgaW5kZXggPD0gKF8uc2xpZGVDb3VudCAtIF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpKSB7XG5cbiAgICAgICAgICAgICAgICBfLiRzbGlkZXNcbiAgICAgICAgICAgICAgICAgICAgLnNsaWNlKGluZGV4LCBpbmRleCArIF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnc2xpY2stYWN0aXZlJylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2FyaWEtaGlkZGVuJywgJ2ZhbHNlJyk7XG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYWxsU2xpZGVzLmxlbmd0aCA8PSBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSB7XG5cbiAgICAgICAgICAgICAgICBhbGxTbGlkZXNcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdzbGljay1hY3RpdmUnKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cignYXJpYS1oaWRkZW4nLCAnZmFsc2UnKTtcblxuICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgIHJlbWFpbmRlciA9IF8uc2xpZGVDb3VudCAlIF8ub3B0aW9ucy5zbGlkZXNUb1Nob3c7XG4gICAgICAgICAgICAgICAgaW5kZXhPZmZzZXQgPSBfLm9wdGlvbnMuaW5maW5pdGUgPT09IHRydWUgPyBfLm9wdGlvbnMuc2xpZGVzVG9TaG93ICsgaW5kZXggOiBpbmRleDtcblxuICAgICAgICAgICAgICAgIGlmIChfLm9wdGlvbnMuc2xpZGVzVG9TaG93ID09IF8ub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCAmJiAoXy5zbGlkZUNvdW50IC0gaW5kZXgpIDwgXy5vcHRpb25zLnNsaWRlc1RvU2hvdykge1xuXG4gICAgICAgICAgICAgICAgICAgIGFsbFNsaWRlc1xuICAgICAgICAgICAgICAgICAgICAgICAgLnNsaWNlKGluZGV4T2Zmc2V0IC0gKF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgLSByZW1haW5kZXIpLCBpbmRleE9mZnNldCArIHJlbWFpbmRlcilcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnc2xpY2stYWN0aXZlJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKCdhcmlhLWhpZGRlbicsICdmYWxzZScpO1xuXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgICAgICBhbGxTbGlkZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zbGljZShpbmRleE9mZnNldCwgaW5kZXhPZmZzZXQgKyBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdzbGljay1hY3RpdmUnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2FyaWEtaGlkZGVuJywgJ2ZhbHNlJyk7XG5cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5sYXp5TG9hZCA9PT0gJ29uZGVtYW5kJyB8fCBfLm9wdGlvbnMubGF6eUxvYWQgPT09ICdhbnRpY2lwYXRlZCcpIHtcbiAgICAgICAgICAgIF8ubGF6eUxvYWQoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuc2V0dXBJbmZpbml0ZSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcyxcbiAgICAgICAgICAgIGksIHNsaWRlSW5kZXgsIGluZmluaXRlQ291bnQ7XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5mYWRlID09PSB0cnVlKSB7XG4gICAgICAgICAgICBfLm9wdGlvbnMuY2VudGVyTW9kZSA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5pbmZpbml0ZSA9PT0gdHJ1ZSAmJiBfLm9wdGlvbnMuZmFkZSA9PT0gZmFsc2UpIHtcblxuICAgICAgICAgICAgc2xpZGVJbmRleCA9IG51bGw7XG5cbiAgICAgICAgICAgIGlmIChfLnNsaWRlQ291bnQgPiBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSB7XG5cbiAgICAgICAgICAgICAgICBpZiAoXy5vcHRpb25zLmNlbnRlck1vZGUgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5maW5pdGVDb3VudCA9IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgKyAxO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGluZmluaXRlQ291bnQgPSBfLm9wdGlvbnMuc2xpZGVzVG9TaG93O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZvciAoaSA9IF8uc2xpZGVDb3VudDsgaSA+IChfLnNsaWRlQ291bnQgLVxuICAgICAgICAgICAgICAgICAgICAgICAgaW5maW5pdGVDb3VudCk7IGkgLT0gMSkge1xuICAgICAgICAgICAgICAgICAgICBzbGlkZUluZGV4ID0gaSAtIDE7XG4gICAgICAgICAgICAgICAgICAgICQoXy4kc2xpZGVzW3NsaWRlSW5kZXhdKS5jbG9uZSh0cnVlKS5hdHRyKCdpZCcsICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtc2xpY2staW5kZXgnLCBzbGlkZUluZGV4IC0gXy5zbGlkZUNvdW50KVxuICAgICAgICAgICAgICAgICAgICAgICAgLnByZXBlbmRUbyhfLiRzbGlkZVRyYWNrKS5hZGRDbGFzcygnc2xpY2stY2xvbmVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBpbmZpbml0ZUNvdW50ICArIF8uc2xpZGVDb3VudDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHNsaWRlSW5kZXggPSBpO1xuICAgICAgICAgICAgICAgICAgICAkKF8uJHNsaWRlc1tzbGlkZUluZGV4XSkuY2xvbmUodHJ1ZSkuYXR0cignaWQnLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXNsaWNrLWluZGV4Jywgc2xpZGVJbmRleCArIF8uc2xpZGVDb3VudClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmRUbyhfLiRzbGlkZVRyYWNrKS5hZGRDbGFzcygnc2xpY2stY2xvbmVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF8uJHNsaWRlVHJhY2suZmluZCgnLnNsaWNrLWNsb25lZCcpLmZpbmQoJ1tpZF0nKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmF0dHIoJ2lkJywgJycpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5pbnRlcnJ1cHQgPSBmdW5jdGlvbiggdG9nZ2xlICkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBpZiggIXRvZ2dsZSApIHtcbiAgICAgICAgICAgIF8uYXV0b1BsYXkoKTtcbiAgICAgICAgfVxuICAgICAgICBfLmludGVycnVwdGVkID0gdG9nZ2xlO1xuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5zZWxlY3RIYW5kbGVyID0gZnVuY3Rpb24oZXZlbnQpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgdmFyIHRhcmdldEVsZW1lbnQgPVxuICAgICAgICAgICAgJChldmVudC50YXJnZXQpLmlzKCcuc2xpY2stc2xpZGUnKSA/XG4gICAgICAgICAgICAgICAgJChldmVudC50YXJnZXQpIDpcbiAgICAgICAgICAgICAgICAkKGV2ZW50LnRhcmdldCkucGFyZW50cygnLnNsaWNrLXNsaWRlJyk7XG5cbiAgICAgICAgdmFyIGluZGV4ID0gcGFyc2VJbnQodGFyZ2V0RWxlbWVudC5hdHRyKCdkYXRhLXNsaWNrLWluZGV4JykpO1xuXG4gICAgICAgIGlmICghaW5kZXgpIGluZGV4ID0gMDtcblxuICAgICAgICBpZiAoXy5zbGlkZUNvdW50IDw9IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpIHtcblxuICAgICAgICAgICAgXy5zbGlkZUhhbmRsZXIoaW5kZXgsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICB9XG5cbiAgICAgICAgXy5zbGlkZUhhbmRsZXIoaW5kZXgpO1xuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5zbGlkZUhhbmRsZXIgPSBmdW5jdGlvbihpbmRleCwgc3luYywgZG9udEFuaW1hdGUpIHtcblxuICAgICAgICB2YXIgdGFyZ2V0U2xpZGUsIGFuaW1TbGlkZSwgb2xkU2xpZGUsIHNsaWRlTGVmdCwgdGFyZ2V0TGVmdCA9IG51bGwsXG4gICAgICAgICAgICBfID0gdGhpcywgbmF2VGFyZ2V0O1xuXG4gICAgICAgIHN5bmMgPSBzeW5jIHx8IGZhbHNlO1xuXG4gICAgICAgIGlmIChfLmFuaW1hdGluZyA9PT0gdHJ1ZSAmJiBfLm9wdGlvbnMud2FpdEZvckFuaW1hdGUgPT09IHRydWUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuZmFkZSA9PT0gdHJ1ZSAmJiBfLmN1cnJlbnRTbGlkZSA9PT0gaW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzeW5jID09PSBmYWxzZSkge1xuICAgICAgICAgICAgXy5hc05hdkZvcihpbmRleCk7XG4gICAgICAgIH1cblxuICAgICAgICB0YXJnZXRTbGlkZSA9IGluZGV4O1xuICAgICAgICB0YXJnZXRMZWZ0ID0gXy5nZXRMZWZ0KHRhcmdldFNsaWRlKTtcbiAgICAgICAgc2xpZGVMZWZ0ID0gXy5nZXRMZWZ0KF8uY3VycmVudFNsaWRlKTtcblxuICAgICAgICBfLmN1cnJlbnRMZWZ0ID0gXy5zd2lwZUxlZnQgPT09IG51bGwgPyBzbGlkZUxlZnQgOiBfLnN3aXBlTGVmdDtcblxuICAgICAgICBpZiAoXy5vcHRpb25zLmluZmluaXRlID09PSBmYWxzZSAmJiBfLm9wdGlvbnMuY2VudGVyTW9kZSA9PT0gZmFsc2UgJiYgKGluZGV4IDwgMCB8fCBpbmRleCA+IF8uZ2V0RG90Q291bnQoKSAqIF8ub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCkpIHtcbiAgICAgICAgICAgIGlmIChfLm9wdGlvbnMuZmFkZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRTbGlkZSA9IF8uY3VycmVudFNsaWRlO1xuICAgICAgICAgICAgICAgIGlmIChkb250QW5pbWF0ZSAhPT0gdHJ1ZSAmJiBfLnNsaWRlQ291bnQgPiBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSB7XG4gICAgICAgICAgICAgICAgICAgIF8uYW5pbWF0ZVNsaWRlKHNsaWRlTGVmdCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfLnBvc3RTbGlkZSh0YXJnZXRTbGlkZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIF8ucG9zdFNsaWRlKHRhcmdldFNsaWRlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSBpZiAoXy5vcHRpb25zLmluZmluaXRlID09PSBmYWxzZSAmJiBfLm9wdGlvbnMuY2VudGVyTW9kZSA9PT0gdHJ1ZSAmJiAoaW5kZXggPCAwIHx8IGluZGV4ID4gKF8uc2xpZGVDb3VudCAtIF8ub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCkpKSB7XG4gICAgICAgICAgICBpZiAoXy5vcHRpb25zLmZhZGUgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0U2xpZGUgPSBfLmN1cnJlbnRTbGlkZTtcbiAgICAgICAgICAgICAgICBpZiAoZG9udEFuaW1hdGUgIT09IHRydWUgJiYgXy5zbGlkZUNvdW50ID4gXy5vcHRpb25zLnNsaWRlc1RvU2hvdykge1xuICAgICAgICAgICAgICAgICAgICBfLmFuaW1hdGVTbGlkZShzbGlkZUxlZnQsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5wb3N0U2xpZGUodGFyZ2V0U2xpZGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBfLnBvc3RTbGlkZSh0YXJnZXRTbGlkZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCBfLm9wdGlvbnMuYXV0b3BsYXkgKSB7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKF8uYXV0b1BsYXlUaW1lcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGFyZ2V0U2xpZGUgPCAwKSB7XG4gICAgICAgICAgICBpZiAoXy5zbGlkZUNvdW50ICUgXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgYW5pbVNsaWRlID0gXy5zbGlkZUNvdW50IC0gKF8uc2xpZGVDb3VudCAlIF8ub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFuaW1TbGlkZSA9IF8uc2xpZGVDb3VudCArIHRhcmdldFNsaWRlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHRhcmdldFNsaWRlID49IF8uc2xpZGVDb3VudCkge1xuICAgICAgICAgICAgaWYgKF8uc2xpZGVDb3VudCAlIF8ub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGFuaW1TbGlkZSA9IDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFuaW1TbGlkZSA9IHRhcmdldFNsaWRlIC0gXy5zbGlkZUNvdW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYW5pbVNsaWRlID0gdGFyZ2V0U2xpZGU7XG4gICAgICAgIH1cblxuICAgICAgICBfLmFuaW1hdGluZyA9IHRydWU7XG5cbiAgICAgICAgXy4kc2xpZGVyLnRyaWdnZXIoJ2JlZm9yZUNoYW5nZScsIFtfLCBfLmN1cnJlbnRTbGlkZSwgYW5pbVNsaWRlXSk7XG5cbiAgICAgICAgb2xkU2xpZGUgPSBfLmN1cnJlbnRTbGlkZTtcbiAgICAgICAgXy5jdXJyZW50U2xpZGUgPSBhbmltU2xpZGU7XG5cbiAgICAgICAgXy5zZXRTbGlkZUNsYXNzZXMoXy5jdXJyZW50U2xpZGUpO1xuXG4gICAgICAgIGlmICggXy5vcHRpb25zLmFzTmF2Rm9yICkge1xuXG4gICAgICAgICAgICBuYXZUYXJnZXQgPSBfLmdldE5hdlRhcmdldCgpO1xuICAgICAgICAgICAgbmF2VGFyZ2V0ID0gbmF2VGFyZ2V0LnNsaWNrKCdnZXRTbGljaycpO1xuXG4gICAgICAgICAgICBpZiAoIG5hdlRhcmdldC5zbGlkZUNvdW50IDw9IG5hdlRhcmdldC5vcHRpb25zLnNsaWRlc1RvU2hvdyApIHtcbiAgICAgICAgICAgICAgICBuYXZUYXJnZXQuc2V0U2xpZGVDbGFzc2VzKF8uY3VycmVudFNsaWRlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG5cbiAgICAgICAgXy51cGRhdGVEb3RzKCk7XG4gICAgICAgIF8udXBkYXRlQXJyb3dzKCk7XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5mYWRlID09PSB0cnVlKSB7XG4gICAgICAgICAgICBpZiAoZG9udEFuaW1hdGUgIT09IHRydWUpIHtcblxuICAgICAgICAgICAgICAgIF8uZmFkZVNsaWRlT3V0KG9sZFNsaWRlKTtcblxuICAgICAgICAgICAgICAgIF8uZmFkZVNsaWRlKGFuaW1TbGlkZSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIF8ucG9zdFNsaWRlKGFuaW1TbGlkZSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgXy5wb3N0U2xpZGUoYW5pbVNsaWRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF8uYW5pbWF0ZUhlaWdodCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRvbnRBbmltYXRlICE9PSB0cnVlICYmIF8uc2xpZGVDb3VudCA+IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpIHtcbiAgICAgICAgICAgIF8uYW5pbWF0ZVNsaWRlKHRhcmdldExlZnQsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIF8ucG9zdFNsaWRlKGFuaW1TbGlkZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIF8ucG9zdFNsaWRlKGFuaW1TbGlkZSk7XG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuc3RhcnRMb2FkID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuYXJyb3dzID09PSB0cnVlICYmIF8uc2xpZGVDb3VudCA+IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpIHtcblxuICAgICAgICAgICAgXy4kcHJldkFycm93LmhpZGUoKTtcbiAgICAgICAgICAgIF8uJG5leHRBcnJvdy5oaWRlKCk7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuZG90cyA9PT0gdHJ1ZSAmJiBfLnNsaWRlQ291bnQgPiBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSB7XG5cbiAgICAgICAgICAgIF8uJGRvdHMuaGlkZSgpO1xuXG4gICAgICAgIH1cblxuICAgICAgICBfLiRzbGlkZXIuYWRkQ2xhc3MoJ3NsaWNrLWxvYWRpbmcnKTtcblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuc3dpcGVEaXJlY3Rpb24gPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgeERpc3QsIHlEaXN0LCByLCBzd2lwZUFuZ2xlLCBfID0gdGhpcztcblxuICAgICAgICB4RGlzdCA9IF8udG91Y2hPYmplY3Quc3RhcnRYIC0gXy50b3VjaE9iamVjdC5jdXJYO1xuICAgICAgICB5RGlzdCA9IF8udG91Y2hPYmplY3Quc3RhcnRZIC0gXy50b3VjaE9iamVjdC5jdXJZO1xuICAgICAgICByID0gTWF0aC5hdGFuMih5RGlzdCwgeERpc3QpO1xuXG4gICAgICAgIHN3aXBlQW5nbGUgPSBNYXRoLnJvdW5kKHIgKiAxODAgLyBNYXRoLlBJKTtcbiAgICAgICAgaWYgKHN3aXBlQW5nbGUgPCAwKSB7XG4gICAgICAgICAgICBzd2lwZUFuZ2xlID0gMzYwIC0gTWF0aC5hYnMoc3dpcGVBbmdsZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoKHN3aXBlQW5nbGUgPD0gNDUpICYmIChzd2lwZUFuZ2xlID49IDApKSB7XG4gICAgICAgICAgICByZXR1cm4gKF8ub3B0aW9ucy5ydGwgPT09IGZhbHNlID8gJ2xlZnQnIDogJ3JpZ2h0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKChzd2lwZUFuZ2xlIDw9IDM2MCkgJiYgKHN3aXBlQW5nbGUgPj0gMzE1KSkge1xuICAgICAgICAgICAgcmV0dXJuIChfLm9wdGlvbnMucnRsID09PSBmYWxzZSA/ICdsZWZ0JyA6ICdyaWdodCcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICgoc3dpcGVBbmdsZSA+PSAxMzUpICYmIChzd2lwZUFuZ2xlIDw9IDIyNSkpIHtcbiAgICAgICAgICAgIHJldHVybiAoXy5vcHRpb25zLnJ0bCA9PT0gZmFsc2UgPyAncmlnaHQnIDogJ2xlZnQnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoXy5vcHRpb25zLnZlcnRpY2FsU3dpcGluZyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgaWYgKChzd2lwZUFuZ2xlID49IDM1KSAmJiAoc3dpcGVBbmdsZSA8PSAxMzUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdkb3duJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd1cCc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gJ3ZlcnRpY2FsJztcblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuc3dpcGVFbmQgPSBmdW5jdGlvbihldmVudCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcyxcbiAgICAgICAgICAgIHNsaWRlQ291bnQsXG4gICAgICAgICAgICBkaXJlY3Rpb247XG5cbiAgICAgICAgXy5kcmFnZ2luZyA9IGZhbHNlO1xuICAgICAgICBfLnN3aXBpbmcgPSBmYWxzZTtcblxuICAgICAgICBpZiAoXy5zY3JvbGxpbmcpIHtcbiAgICAgICAgICAgIF8uc2Nyb2xsaW5nID0gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBfLmludGVycnVwdGVkID0gZmFsc2U7XG4gICAgICAgIF8uc2hvdWxkQ2xpY2sgPSAoIF8udG91Y2hPYmplY3Quc3dpcGVMZW5ndGggPiAxMCApID8gZmFsc2UgOiB0cnVlO1xuXG4gICAgICAgIGlmICggXy50b3VjaE9iamVjdC5jdXJYID09PSB1bmRlZmluZWQgKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIF8udG91Y2hPYmplY3QuZWRnZUhpdCA9PT0gdHJ1ZSApIHtcbiAgICAgICAgICAgIF8uJHNsaWRlci50cmlnZ2VyKCdlZGdlJywgW18sIF8uc3dpcGVEaXJlY3Rpb24oKSBdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICggXy50b3VjaE9iamVjdC5zd2lwZUxlbmd0aCA+PSBfLnRvdWNoT2JqZWN0Lm1pblN3aXBlICkge1xuXG4gICAgICAgICAgICBkaXJlY3Rpb24gPSBfLnN3aXBlRGlyZWN0aW9uKCk7XG5cbiAgICAgICAgICAgIHN3aXRjaCAoIGRpcmVjdGlvbiApIHtcblxuICAgICAgICAgICAgICAgIGNhc2UgJ2xlZnQnOlxuICAgICAgICAgICAgICAgIGNhc2UgJ2Rvd24nOlxuXG4gICAgICAgICAgICAgICAgICAgIHNsaWRlQ291bnQgPVxuICAgICAgICAgICAgICAgICAgICAgICAgXy5vcHRpb25zLnN3aXBlVG9TbGlkZSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5jaGVja05hdmlnYWJsZSggXy5jdXJyZW50U2xpZGUgKyBfLmdldFNsaWRlQ291bnQoKSApIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmN1cnJlbnRTbGlkZSArIF8uZ2V0U2xpZGVDb3VudCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIF8uY3VycmVudERpcmVjdGlvbiA9IDA7XG5cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlICdyaWdodCc6XG4gICAgICAgICAgICAgICAgY2FzZSAndXAnOlxuXG4gICAgICAgICAgICAgICAgICAgIHNsaWRlQ291bnQgPVxuICAgICAgICAgICAgICAgICAgICAgICAgXy5vcHRpb25zLnN3aXBlVG9TbGlkZSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5jaGVja05hdmlnYWJsZSggXy5jdXJyZW50U2xpZGUgLSBfLmdldFNsaWRlQ291bnQoKSApIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmN1cnJlbnRTbGlkZSAtIF8uZ2V0U2xpZGVDb3VudCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIF8uY3VycmVudERpcmVjdGlvbiA9IDE7XG5cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuXG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYoIGRpcmVjdGlvbiAhPSAndmVydGljYWwnICkge1xuXG4gICAgICAgICAgICAgICAgXy5zbGlkZUhhbmRsZXIoIHNsaWRlQ291bnQgKTtcbiAgICAgICAgICAgICAgICBfLnRvdWNoT2JqZWN0ID0ge307XG4gICAgICAgICAgICAgICAgXy4kc2xpZGVyLnRyaWdnZXIoJ3N3aXBlJywgW18sIGRpcmVjdGlvbiBdKTtcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgIGlmICggXy50b3VjaE9iamVjdC5zdGFydFggIT09IF8udG91Y2hPYmplY3QuY3VyWCApIHtcblxuICAgICAgICAgICAgICAgIF8uc2xpZGVIYW5kbGVyKCBfLmN1cnJlbnRTbGlkZSApO1xuICAgICAgICAgICAgICAgIF8udG91Y2hPYmplY3QgPSB7fTtcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuc3dpcGVIYW5kbGVyID0gZnVuY3Rpb24oZXZlbnQpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgaWYgKChfLm9wdGlvbnMuc3dpcGUgPT09IGZhbHNlKSB8fCAoJ29udG91Y2hlbmQnIGluIGRvY3VtZW50ICYmIF8ub3B0aW9ucy5zd2lwZSA9PT0gZmFsc2UpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSBpZiAoXy5vcHRpb25zLmRyYWdnYWJsZSA9PT0gZmFsc2UgJiYgZXZlbnQudHlwZS5pbmRleE9mKCdtb3VzZScpICE9PSAtMSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgXy50b3VjaE9iamVjdC5maW5nZXJDb3VudCA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQgJiYgZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzICE9PSB1bmRlZmluZWQgP1xuICAgICAgICAgICAgZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzLmxlbmd0aCA6IDE7XG5cbiAgICAgICAgXy50b3VjaE9iamVjdC5taW5Td2lwZSA9IF8ubGlzdFdpZHRoIC8gXy5vcHRpb25zXG4gICAgICAgICAgICAudG91Y2hUaHJlc2hvbGQ7XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy52ZXJ0aWNhbFN3aXBpbmcgPT09IHRydWUpIHtcbiAgICAgICAgICAgIF8udG91Y2hPYmplY3QubWluU3dpcGUgPSBfLmxpc3RIZWlnaHQgLyBfLm9wdGlvbnNcbiAgICAgICAgICAgICAgICAudG91Y2hUaHJlc2hvbGQ7XG4gICAgICAgIH1cblxuICAgICAgICBzd2l0Y2ggKGV2ZW50LmRhdGEuYWN0aW9uKSB7XG5cbiAgICAgICAgICAgIGNhc2UgJ3N0YXJ0JzpcbiAgICAgICAgICAgICAgICBfLnN3aXBlU3RhcnQoZXZlbnQpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdtb3ZlJzpcbiAgICAgICAgICAgICAgICBfLnN3aXBlTW92ZShldmVudCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ2VuZCc6XG4gICAgICAgICAgICAgICAgXy5zd2lwZUVuZChldmVudCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5zd2lwZU1vdmUgPSBmdW5jdGlvbihldmVudCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcyxcbiAgICAgICAgICAgIGVkZ2VXYXNIaXQgPSBmYWxzZSxcbiAgICAgICAgICAgIGN1ckxlZnQsIHN3aXBlRGlyZWN0aW9uLCBzd2lwZUxlbmd0aCwgcG9zaXRpb25PZmZzZXQsIHRvdWNoZXMsIHZlcnRpY2FsU3dpcGVMZW5ndGg7XG5cbiAgICAgICAgdG91Y2hlcyA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQgIT09IHVuZGVmaW5lZCA/IGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlcyA6IG51bGw7XG5cbiAgICAgICAgaWYgKCFfLmRyYWdnaW5nIHx8IF8uc2Nyb2xsaW5nIHx8IHRvdWNoZXMgJiYgdG91Y2hlcy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGN1ckxlZnQgPSBfLmdldExlZnQoXy5jdXJyZW50U2xpZGUpO1xuXG4gICAgICAgIF8udG91Y2hPYmplY3QuY3VyWCA9IHRvdWNoZXMgIT09IHVuZGVmaW5lZCA/IHRvdWNoZXNbMF0ucGFnZVggOiBldmVudC5jbGllbnRYO1xuICAgICAgICBfLnRvdWNoT2JqZWN0LmN1clkgPSB0b3VjaGVzICE9PSB1bmRlZmluZWQgPyB0b3VjaGVzWzBdLnBhZ2VZIDogZXZlbnQuY2xpZW50WTtcblxuICAgICAgICBfLnRvdWNoT2JqZWN0LnN3aXBlTGVuZ3RoID0gTWF0aC5yb3VuZChNYXRoLnNxcnQoXG4gICAgICAgICAgICBNYXRoLnBvdyhfLnRvdWNoT2JqZWN0LmN1clggLSBfLnRvdWNoT2JqZWN0LnN0YXJ0WCwgMikpKTtcblxuICAgICAgICB2ZXJ0aWNhbFN3aXBlTGVuZ3RoID0gTWF0aC5yb3VuZChNYXRoLnNxcnQoXG4gICAgICAgICAgICBNYXRoLnBvdyhfLnRvdWNoT2JqZWN0LmN1clkgLSBfLnRvdWNoT2JqZWN0LnN0YXJ0WSwgMikpKTtcblxuICAgICAgICBpZiAoIV8ub3B0aW9ucy52ZXJ0aWNhbFN3aXBpbmcgJiYgIV8uc3dpcGluZyAmJiB2ZXJ0aWNhbFN3aXBlTGVuZ3RoID4gNCkge1xuICAgICAgICAgICAgXy5zY3JvbGxpbmcgPSB0cnVlO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy52ZXJ0aWNhbFN3aXBpbmcgPT09IHRydWUpIHtcbiAgICAgICAgICAgIF8udG91Y2hPYmplY3Quc3dpcGVMZW5ndGggPSB2ZXJ0aWNhbFN3aXBlTGVuZ3RoO1xuICAgICAgICB9XG5cbiAgICAgICAgc3dpcGVEaXJlY3Rpb24gPSBfLnN3aXBlRGlyZWN0aW9uKCk7XG5cbiAgICAgICAgaWYgKGV2ZW50Lm9yaWdpbmFsRXZlbnQgIT09IHVuZGVmaW5lZCAmJiBfLnRvdWNoT2JqZWN0LnN3aXBlTGVuZ3RoID4gNCkge1xuICAgICAgICAgICAgXy5zd2lwaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cblxuICAgICAgICBwb3NpdGlvbk9mZnNldCA9IChfLm9wdGlvbnMucnRsID09PSBmYWxzZSA/IDEgOiAtMSkgKiAoXy50b3VjaE9iamVjdC5jdXJYID4gXy50b3VjaE9iamVjdC5zdGFydFggPyAxIDogLTEpO1xuICAgICAgICBpZiAoXy5vcHRpb25zLnZlcnRpY2FsU3dpcGluZyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgcG9zaXRpb25PZmZzZXQgPSBfLnRvdWNoT2JqZWN0LmN1clkgPiBfLnRvdWNoT2JqZWN0LnN0YXJ0WSA/IDEgOiAtMTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgc3dpcGVMZW5ndGggPSBfLnRvdWNoT2JqZWN0LnN3aXBlTGVuZ3RoO1xuXG4gICAgICAgIF8udG91Y2hPYmplY3QuZWRnZUhpdCA9IGZhbHNlO1xuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuaW5maW5pdGUgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBpZiAoKF8uY3VycmVudFNsaWRlID09PSAwICYmIHN3aXBlRGlyZWN0aW9uID09PSAncmlnaHQnKSB8fCAoXy5jdXJyZW50U2xpZGUgPj0gXy5nZXREb3RDb3VudCgpICYmIHN3aXBlRGlyZWN0aW9uID09PSAnbGVmdCcpKSB7XG4gICAgICAgICAgICAgICAgc3dpcGVMZW5ndGggPSBfLnRvdWNoT2JqZWN0LnN3aXBlTGVuZ3RoICogXy5vcHRpb25zLmVkZ2VGcmljdGlvbjtcbiAgICAgICAgICAgICAgICBfLnRvdWNoT2JqZWN0LmVkZ2VIaXQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy52ZXJ0aWNhbCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIF8uc3dpcGVMZWZ0ID0gY3VyTGVmdCArIHN3aXBlTGVuZ3RoICogcG9zaXRpb25PZmZzZXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBfLnN3aXBlTGVmdCA9IGN1ckxlZnQgKyAoc3dpcGVMZW5ndGggKiAoXy4kbGlzdC5oZWlnaHQoKSAvIF8ubGlzdFdpZHRoKSkgKiBwb3NpdGlvbk9mZnNldDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoXy5vcHRpb25zLnZlcnRpY2FsU3dpcGluZyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgXy5zd2lwZUxlZnQgPSBjdXJMZWZ0ICsgc3dpcGVMZW5ndGggKiBwb3NpdGlvbk9mZnNldDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuZmFkZSA9PT0gdHJ1ZSB8fCBfLm9wdGlvbnMudG91Y2hNb3ZlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8uYW5pbWF0aW5nID09PSB0cnVlKSB7XG4gICAgICAgICAgICBfLnN3aXBlTGVmdCA9IG51bGw7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBfLnNldENTUyhfLnN3aXBlTGVmdCk7XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnN3aXBlU3RhcnQgPSBmdW5jdGlvbihldmVudCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcyxcbiAgICAgICAgICAgIHRvdWNoZXM7XG5cbiAgICAgICAgXy5pbnRlcnJ1cHRlZCA9IHRydWU7XG5cbiAgICAgICAgaWYgKF8udG91Y2hPYmplY3QuZmluZ2VyQ291bnQgIT09IDEgfHwgXy5zbGlkZUNvdW50IDw9IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpIHtcbiAgICAgICAgICAgIF8udG91Y2hPYmplY3QgPSB7fTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChldmVudC5vcmlnaW5hbEV2ZW50ICE9PSB1bmRlZmluZWQgJiYgZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRvdWNoZXMgPSBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXNbMF07XG4gICAgICAgIH1cblxuICAgICAgICBfLnRvdWNoT2JqZWN0LnN0YXJ0WCA9IF8udG91Y2hPYmplY3QuY3VyWCA9IHRvdWNoZXMgIT09IHVuZGVmaW5lZCA/IHRvdWNoZXMucGFnZVggOiBldmVudC5jbGllbnRYO1xuICAgICAgICBfLnRvdWNoT2JqZWN0LnN0YXJ0WSA9IF8udG91Y2hPYmplY3QuY3VyWSA9IHRvdWNoZXMgIT09IHVuZGVmaW5lZCA/IHRvdWNoZXMucGFnZVkgOiBldmVudC5jbGllbnRZO1xuXG4gICAgICAgIF8uZHJhZ2dpbmcgPSB0cnVlO1xuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS51bmZpbHRlclNsaWRlcyA9IFNsaWNrLnByb3RvdHlwZS5zbGlja1VuZmlsdGVyID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIGlmIChfLiRzbGlkZXNDYWNoZSAhPT0gbnVsbCkge1xuXG4gICAgICAgICAgICBfLnVubG9hZCgpO1xuXG4gICAgICAgICAgICBfLiRzbGlkZVRyYWNrLmNoaWxkcmVuKHRoaXMub3B0aW9ucy5zbGlkZSkuZGV0YWNoKCk7XG5cbiAgICAgICAgICAgIF8uJHNsaWRlc0NhY2hlLmFwcGVuZFRvKF8uJHNsaWRlVHJhY2spO1xuXG4gICAgICAgICAgICBfLnJlaW5pdCgpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUudW5sb2FkID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgICQoJy5zbGljay1jbG9uZWQnLCBfLiRzbGlkZXIpLnJlbW92ZSgpO1xuXG4gICAgICAgIGlmIChfLiRkb3RzKSB7XG4gICAgICAgICAgICBfLiRkb3RzLnJlbW92ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8uJHByZXZBcnJvdyAmJiBfLmh0bWxFeHByLnRlc3QoXy5vcHRpb25zLnByZXZBcnJvdykpIHtcbiAgICAgICAgICAgIF8uJHByZXZBcnJvdy5yZW1vdmUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLiRuZXh0QXJyb3cgJiYgXy5odG1sRXhwci50ZXN0KF8ub3B0aW9ucy5uZXh0QXJyb3cpKSB7XG4gICAgICAgICAgICBfLiRuZXh0QXJyb3cucmVtb3ZlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBfLiRzbGlkZXNcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnc2xpY2stc2xpZGUgc2xpY2stYWN0aXZlIHNsaWNrLXZpc2libGUgc2xpY2stY3VycmVudCcpXG4gICAgICAgICAgICAuYXR0cignYXJpYS1oaWRkZW4nLCAndHJ1ZScpXG4gICAgICAgICAgICAuY3NzKCd3aWR0aCcsICcnKTtcblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUudW5zbGljayA9IGZ1bmN0aW9uKGZyb21CcmVha3BvaW50KSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuICAgICAgICBfLiRzbGlkZXIudHJpZ2dlcigndW5zbGljaycsIFtfLCBmcm9tQnJlYWtwb2ludF0pO1xuICAgICAgICBfLmRlc3Ryb3koKTtcblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUudXBkYXRlQXJyb3dzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzLFxuICAgICAgICAgICAgY2VudGVyT2Zmc2V0O1xuXG4gICAgICAgIGNlbnRlck9mZnNldCA9IE1hdGguZmxvb3IoXy5vcHRpb25zLnNsaWRlc1RvU2hvdyAvIDIpO1xuXG4gICAgICAgIGlmICggXy5vcHRpb25zLmFycm93cyA9PT0gdHJ1ZSAmJlxuICAgICAgICAgICAgXy5zbGlkZUNvdW50ID4gXy5vcHRpb25zLnNsaWRlc1RvU2hvdyAmJlxuICAgICAgICAgICAgIV8ub3B0aW9ucy5pbmZpbml0ZSApIHtcblxuICAgICAgICAgICAgXy4kcHJldkFycm93LnJlbW92ZUNsYXNzKCdzbGljay1kaXNhYmxlZCcpLmF0dHIoJ2FyaWEtZGlzYWJsZWQnLCAnZmFsc2UnKTtcbiAgICAgICAgICAgIF8uJG5leHRBcnJvdy5yZW1vdmVDbGFzcygnc2xpY2stZGlzYWJsZWQnKS5hdHRyKCdhcmlhLWRpc2FibGVkJywgJ2ZhbHNlJyk7XG5cbiAgICAgICAgICAgIGlmIChfLmN1cnJlbnRTbGlkZSA9PT0gMCkge1xuXG4gICAgICAgICAgICAgICAgXy4kcHJldkFycm93LmFkZENsYXNzKCdzbGljay1kaXNhYmxlZCcpLmF0dHIoJ2FyaWEtZGlzYWJsZWQnLCAndHJ1ZScpO1xuICAgICAgICAgICAgICAgIF8uJG5leHRBcnJvdy5yZW1vdmVDbGFzcygnc2xpY2stZGlzYWJsZWQnKS5hdHRyKCdhcmlhLWRpc2FibGVkJywgJ2ZhbHNlJyk7XG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5jdXJyZW50U2xpZGUgPj0gXy5zbGlkZUNvdW50IC0gXy5vcHRpb25zLnNsaWRlc1RvU2hvdyAmJiBfLm9wdGlvbnMuY2VudGVyTW9kZSA9PT0gZmFsc2UpIHtcblxuICAgICAgICAgICAgICAgIF8uJG5leHRBcnJvdy5hZGRDbGFzcygnc2xpY2stZGlzYWJsZWQnKS5hdHRyKCdhcmlhLWRpc2FibGVkJywgJ3RydWUnKTtcbiAgICAgICAgICAgICAgICBfLiRwcmV2QXJyb3cucmVtb3ZlQ2xhc3MoJ3NsaWNrLWRpc2FibGVkJykuYXR0cignYXJpYS1kaXNhYmxlZCcsICdmYWxzZScpO1xuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKF8uY3VycmVudFNsaWRlID49IF8uc2xpZGVDb3VudCAtIDEgJiYgXy5vcHRpb25zLmNlbnRlck1vZGUgPT09IHRydWUpIHtcblxuICAgICAgICAgICAgICAgIF8uJG5leHRBcnJvdy5hZGRDbGFzcygnc2xpY2stZGlzYWJsZWQnKS5hdHRyKCdhcmlhLWRpc2FibGVkJywgJ3RydWUnKTtcbiAgICAgICAgICAgICAgICBfLiRwcmV2QXJyb3cucmVtb3ZlQ2xhc3MoJ3NsaWNrLWRpc2FibGVkJykuYXR0cignYXJpYS1kaXNhYmxlZCcsICdmYWxzZScpO1xuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS51cGRhdGVEb3RzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIGlmIChfLiRkb3RzICE9PSBudWxsKSB7XG5cbiAgICAgICAgICAgIF8uJGRvdHNcbiAgICAgICAgICAgICAgICAuZmluZCgnbGknKVxuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3NsaWNrLWFjdGl2ZScpXG4gICAgICAgICAgICAgICAgICAgIC5lbmQoKTtcblxuICAgICAgICAgICAgXy4kZG90c1xuICAgICAgICAgICAgICAgIC5maW5kKCdsaScpXG4gICAgICAgICAgICAgICAgLmVxKE1hdGguZmxvb3IoXy5jdXJyZW50U2xpZGUgLyBfLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwpKVxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnc2xpY2stYWN0aXZlJyk7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS52aXNpYmlsaXR5ID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIGlmICggXy5vcHRpb25zLmF1dG9wbGF5ICkge1xuXG4gICAgICAgICAgICBpZiAoIGRvY3VtZW50W18uaGlkZGVuXSApIHtcblxuICAgICAgICAgICAgICAgIF8uaW50ZXJydXB0ZWQgPSB0cnVlO1xuXG4gICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgXy5pbnRlcnJ1cHRlZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgICQuZm4uc2xpY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIF8gPSB0aGlzLFxuICAgICAgICAgICAgb3B0ID0gYXJndW1lbnRzWzBdLFxuICAgICAgICAgICAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSksXG4gICAgICAgICAgICBsID0gXy5sZW5ndGgsXG4gICAgICAgICAgICBpLFxuICAgICAgICAgICAgcmV0O1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdCA9PSAnb2JqZWN0JyB8fCB0eXBlb2Ygb3B0ID09ICd1bmRlZmluZWQnKVxuICAgICAgICAgICAgICAgIF9baV0uc2xpY2sgPSBuZXcgU2xpY2soX1tpXSwgb3B0KTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICByZXQgPSBfW2ldLnNsaWNrW29wdF0uYXBwbHkoX1tpXS5zbGljaywgYXJncyk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJldCAhPSAndW5kZWZpbmVkJykgcmV0dXJuIHJldDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gXztcbiAgICB9O1xuXG59KSk7XG4iLCIoZnVuY3Rpb24oJCkge1xuICB2YXIgc2xpZGVycyA9IHtcblxuICAgIGhlcm86IGZ1bmN0aW9uKHNsaWRlcikge1xuICAgICAgc2xpZGVyLnNsaWNrKHtcbiAgICAgICAgaW5maW5pdGU6IHRydWUsXG4gICAgICAgIGF1dG9wbGF5OiB0cnVlLFxuICAgICAgICBhdXRvcGxheVNwZWVkOiA4MDAwLFxuICAgICAgICBhcnJvd3M6IHRydWUsXG4gICAgICAgIGRvdHM6IHRydWUsXG4gICAgICAgIGZhZGU6IGZhbHNlXG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgaW1hZ2VzOiBmdW5jdGlvbihzbGlkZXIpIHtcbiAgICAgIHNsaWRlci5zbGljayh7XG4gICAgICAgIGluZmluaXRlOiB0cnVlLFxuICAgICAgICBzbGlkZXNUb1Nob3c6IDMsXG4gICAgICAgIHNsaWRlc1RvU2Nyb2xsOiAzLFxuICAgICAgICBhcnJvd3M6IGZhbHNlLFxuICAgICAgICBkb3RzOiB0cnVlLFxuICAgICAgICByZXNwb25zaXZlOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgYnJlYWtwb2ludDogMTAyNCxcbiAgICAgICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgICAgIHNsaWRlc1RvU2hvdzogMyxcbiAgICAgICAgICAgICAgc2xpZGVzVG9TY3JvbGw6IDNcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LHtcbiAgICAgICAgICAgIGJyZWFrcG9pbnQ6IDY0MCxcbiAgICAgICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgICAgIHNsaWRlc1RvU2hvdzogMSxcbiAgICAgICAgICAgICAgc2xpZGVzVG9TY3JvbGw6IDFcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBwcm9kdWN0czogZnVuY3Rpb24oc2xpZGVyKSB7XG4gICAgICBzbGlkZXIuc2xpY2soe1xuICAgICAgICBpbmZpbml0ZTogdHJ1ZSxcbiAgICAgICAgc2xpZGVzVG9TaG93OiA0LFxuICAgICAgICBzbGlkZXNUb1Njcm9sbDogNCxcbiAgICAgICAgYXJyb3dzOiBmYWxzZSxcbiAgICAgICAgZG90czogdHJ1ZSxcbiAgICAgICAgcmVzcG9uc2l2ZTogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGJyZWFrcG9pbnQ6IDEwMjQsXG4gICAgICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgICAgICBzbGlkZXNUb1Nob3c6IDMsXG4gICAgICAgICAgICAgIHNsaWRlc1RvU2Nyb2xsOiAzXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSx7XG4gICAgICAgICAgICBicmVha3BvaW50OiA2NDAsXG4gICAgICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgICAgICBzbGlkZXNUb1Nob3c6IDEsXG4gICAgICAgICAgICAgIHNsaWRlc1RvU2Nyb2xsOiAxXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgaW5pdDogZnVuY3Rpb24oKSB7IFxuICAgICAgc2xpZGVycy5oZXJvKCQoJy5oZXJvLmNhcm91c2VsJykpO1xuICAgICAgc2xpZGVycy5pbWFnZXMoJCgnLmltYWdlcy5jYXJvdXNlbCcpKTtcbiAgICAgIHNsaWRlcnMucHJvZHVjdHMoJCgnLnByb2R1Y3RzLmNhcm91c2VsJykpO1xuICAgIH1cbiAgfTtcblxuICAkKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcbiAgICBzbGlkZXJzLmluaXQoKTtcbiAgfSk7XG59KShqUXVlcnkpOyIsIi8vIFVzZSB0aGUgYmVsb3cgc3RydWN0dXJlIHRvIHN0YXJ0IG91dCB5b3VyIGN1c3RvbSBqUXVlcnkgZnVuY3Rpb25zXG5cbi8vIChmdW5jdGlvbigkKXtcbi8vICAgICB2YXIgX19wbGFjZWhvbGRlcl9fID0ge1xuLy8gICAgICAgICBpbml0IDogZnVuY3Rpb24oKXtcbi8vICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdoZWxsbyB3b3JsZCcpO1xuLy8gICAgICAgICB9XG4vLyAgICAgfTtcbi8vXG4vLyAgICAgJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKSB7XG4vLyAgICAgICAgIF9fcGxhY2Vob2xkZXJfXy5pbml0KCk7XG4vLyAgICAgfSk7XG4vLyB9KShqUXVlcnkpOyIsIihmdW5jdGlvbigkKXtcbiAgdmFyIGZpeGVkID0ge1xuICAgIGhlYWRlciA6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGNvbnRhaW5lciA9ICQoJy5tYXgtY29udGFpbmVyJyksXG4gICAgICAgICAgaGVhZGVyID0gJCgnaGVhZGVyLmhlYWRlci1ib3R0b20nKSxcbiAgICAgICAgICBvZmZzZXQgPSBoZWFkZXIub2Zmc2V0KCkudG9wLFxuICAgICAgICAgIGZpeGVkID0gJ2hlYWRlci1maXhlZCc7XG5cbiAgICAgICQod2luZG93KS5zY3JvbGwoZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNjcm9sbCA9ICQod2luZG93KS5zY3JvbGxUb3AoKTtcbiAgICAgIFxuICAgICAgICBpZiAoc2Nyb2xsID49IG9mZnNldCkge1xuICAgICAgICAgIGhlYWRlci5hZGRDbGFzcyhmaXhlZCk7XG4gICAgICAgICAgY29udGFpbmVyLmFkZENsYXNzKGZpeGVkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBoZWFkZXIucmVtb3ZlQ2xhc3MoZml4ZWQpO1xuICAgICAgICAgIGNvbnRhaW5lci5yZW1vdmVDbGFzcyhmaXhlZCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBpbml0IDogZnVuY3Rpb24oKXtcbiAgICAgIGZpeGVkLmhlYWRlcigpO1xuICAgIH1cbiAgfTtcblxuICAkKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcbiAgICBmaXhlZC5pbml0KCk7XG4gIH0pO1xufSkoalF1ZXJ5KTsiLCJqUXVlcnkoZG9jdW1lbnQpLmZvdW5kYXRpb24oKTtcbiIsIihmdW5jdGlvbigkKXtcbiAgdmFyIG1lbnUgPSB7XG4gICAgbW9iaWxlIDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaGVhZGVyTWVudSA9ICQoJy5oZWFkZXItbWVudScpLFxuICAgICAgICAgIHRvZ2dsZSA9ICQoJyNtb2JpbGUtbWVudS10b2dnbGUnKSxcbiAgICAgICAgICBpY29ucyA9ICQoJyNtb2JpbGUtbWVudS10b2dnbGUgc3ZnJyksXG4gICAgICAgICAgb3BlbiA9ICdpcy1vcGVuJztcblxuICAgICAgdG9nZ2xlLmNsaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgICBpY29ucy50b2dnbGUoKTtcbiAgICAgICAgaGVhZGVyTWVudS50b2dnbGVDbGFzcyhvcGVuKTtcbiAgICAgICAgbWVudS5tb2RhbCgpO1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIG1vZGFsIDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYm9keSA9ICQoJ2JvZHknKSxcbiAgICAgICAgICBtb2RhbCA9ICQoJy5tb2RhbC1iZycpLFxuICAgICAgICAgIG9wZW4gPSAnbW9kYWwtb3Blbic7XG5cbiAgICAgIG1vZGFsLmZhZGVUb2dnbGUoMjUwKTtcbiAgICAgIGJvZHkudG9nZ2xlQ2xhc3Mob3Blbik7XG4gICAgfSxcblxuICAgIGluaXQgOiBmdW5jdGlvbigpe1xuICAgICAgbWVudS5tb2JpbGUoKTtcbiAgICB9XG4gIH07XG5cbiAgJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKSB7XG4gICAgbWVudS5pbml0KCk7XG4gIH0pO1xufSkoalF1ZXJ5KTsiLCIkKCdhW2hyZWYqPVwiI1wiXScpLm5vdCgnW2hyZWY9XCIjXCJdJykubm90KCdbaHJlZj1cIiMwXCJdJykuY2xpY2soZnVuY3Rpb24gKGV2ZW50KSB7XG4gIGlmIChcbiAgICBsb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywgJycpID09IHRoaXMucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sICcnKSAmJlxuICAgIGxvY2F0aW9uLmhvc3RuYW1lID09IHRoaXMuaG9zdG5hbWVcbiAgKSB7XG4gICAgdmFyIHRhcmdldCA9ICQodGhpcy5oYXNoKTtcbiAgICB0YXJnZXQgPSB0YXJnZXQubGVuZ3RoID8gdGFyZ2V0IDogJCgnW25hbWU9JyArIHRoaXMuaGFzaC5zbGljZSgxKSArICddJyk7XG4gICAgaWYgKHRhcmdldC5sZW5ndGgpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAkKCdodG1sLCBib2R5JykuYW5pbWF0ZSh7XG4gICAgICAgIHNjcm9sbFRvcDogdGFyZ2V0Lm9mZnNldCgpLnRvcFxuICAgICAgfSwgNTAwLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciAkdGFyZ2V0ID0gJCh0YXJnZXQpO1xuICAgICAgICAkdGFyZ2V0LmZvY3VzKCk7XG4gICAgICAgIGlmICgkdGFyZ2V0LmlzKFwiOmZvY3VzXCIpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICR0YXJnZXQuYXR0cigndGFiaW5kZXgnLCAnLTEnKTtcbiAgICAgICAgICAkdGFyZ2V0LmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufSk7Il19
=======
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZvdW5kYXRpb24uY29yZS5qcyIsImZvdW5kYXRpb24udXRpbC5ib3guanMiLCJmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmQuanMiLCJmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeS5qcyIsImZvdW5kYXRpb24udXRpbC5tb3Rpb24uanMiLCJmb3VuZGF0aW9uLnV0aWwubmVzdC5qcyIsImZvdW5kYXRpb24udXRpbC50aW1lckFuZEltYWdlTG9hZGVyLmpzIiwiZm91bmRhdGlvbi51dGlsLnRvdWNoLmpzIiwiZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzLmpzIiwic2xpY2suanMiLCJjYXJvdXNlbC5qcyIsImV4YW1wbGUtZmlsZS5qcyIsImZpbHRlci5qcyIsImZpeGVkLmpzIiwiaW5pdC1mb3VuZGF0aW9uLmpzIiwibWVudS5qcyIsInNtb290aC1zY3JvbGwuanMiXSwibmFtZXMiOlsiJCIsIkZPVU5EQVRJT05fVkVSU0lPTiIsIkZvdW5kYXRpb24iLCJ2ZXJzaW9uIiwiX3BsdWdpbnMiLCJfdXVpZHMiLCJydGwiLCJhdHRyIiwicGx1Z2luIiwibmFtZSIsImNsYXNzTmFtZSIsImZ1bmN0aW9uTmFtZSIsImF0dHJOYW1lIiwiaHlwaGVuYXRlIiwicmVnaXN0ZXJQbHVnaW4iLCJwbHVnaW5OYW1lIiwiY29uc3RydWN0b3IiLCJ0b0xvd2VyQ2FzZSIsInV1aWQiLCJHZXRZb0RpZ2l0cyIsIiRlbGVtZW50IiwiZGF0YSIsInRyaWdnZXIiLCJwdXNoIiwidW5yZWdpc3RlclBsdWdpbiIsInNwbGljZSIsImluZGV4T2YiLCJyZW1vdmVBdHRyIiwicmVtb3ZlRGF0YSIsInByb3AiLCJyZUluaXQiLCJwbHVnaW5zIiwiaXNKUSIsImVhY2giLCJfaW5pdCIsInR5cGUiLCJfdGhpcyIsImZucyIsInBsZ3MiLCJmb3JFYWNoIiwicCIsImZvdW5kYXRpb24iLCJPYmplY3QiLCJrZXlzIiwiZXJyIiwiY29uc29sZSIsImVycm9yIiwibGVuZ3RoIiwibmFtZXNwYWNlIiwiTWF0aCIsInJvdW5kIiwicG93IiwicmFuZG9tIiwidG9TdHJpbmciLCJzbGljZSIsInJlZmxvdyIsImVsZW0iLCJpIiwiJGVsZW0iLCJmaW5kIiwiYWRkQmFjayIsIiRlbCIsIm9wdHMiLCJ3YXJuIiwidGhpbmciLCJzcGxpdCIsImUiLCJvcHQiLCJtYXAiLCJlbCIsInRyaW0iLCJwYXJzZVZhbHVlIiwiZXIiLCJnZXRGbk5hbWUiLCJ0cmFuc2l0aW9uZW5kIiwidHJhbnNpdGlvbnMiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJlbmQiLCJ0Iiwic3R5bGUiLCJzZXRUaW1lb3V0IiwidHJpZ2dlckhhbmRsZXIiLCJ1dGlsIiwidGhyb3R0bGUiLCJmdW5jIiwiZGVsYXkiLCJ0aW1lciIsImNvbnRleHQiLCJhcmdzIiwiYXJndW1lbnRzIiwiYXBwbHkiLCJtZXRob2QiLCIkbWV0YSIsIiRub0pTIiwiYXBwZW5kVG8iLCJoZWFkIiwicmVtb3ZlQ2xhc3MiLCJNZWRpYVF1ZXJ5IiwiQXJyYXkiLCJwcm90b3R5cGUiLCJjYWxsIiwicGx1Z0NsYXNzIiwidW5kZWZpbmVkIiwiUmVmZXJlbmNlRXJyb3IiLCJUeXBlRXJyb3IiLCJ3aW5kb3ciLCJmbiIsIkRhdGUiLCJub3ciLCJnZXRUaW1lIiwidmVuZG9ycyIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsInZwIiwiY2FuY2VsQW5pbWF0aW9uRnJhbWUiLCJ0ZXN0IiwibmF2aWdhdG9yIiwidXNlckFnZW50IiwibGFzdFRpbWUiLCJjYWxsYmFjayIsIm5leHRUaW1lIiwibWF4IiwiY2xlYXJUaW1lb3V0IiwicGVyZm9ybWFuY2UiLCJzdGFydCIsIkZ1bmN0aW9uIiwiYmluZCIsIm9UaGlzIiwiYUFyZ3MiLCJmVG9CaW5kIiwiZk5PUCIsImZCb3VuZCIsImNvbmNhdCIsImZ1bmNOYW1lUmVnZXgiLCJyZXN1bHRzIiwiZXhlYyIsInN0ciIsImlzTmFOIiwicGFyc2VGbG9hdCIsInJlcGxhY2UiLCJqUXVlcnkiLCJCb3giLCJJbU5vdFRvdWNoaW5nWW91IiwiR2V0RGltZW5zaW9ucyIsIkdldE9mZnNldHMiLCJlbGVtZW50IiwicGFyZW50IiwibHJPbmx5IiwidGJPbmx5IiwiZWxlRGltcyIsInRvcCIsImJvdHRvbSIsImxlZnQiLCJyaWdodCIsInBhckRpbXMiLCJvZmZzZXQiLCJoZWlnaHQiLCJ3aWR0aCIsIndpbmRvd0RpbXMiLCJhbGxEaXJzIiwiRXJyb3IiLCJyZWN0IiwiZ2V0Qm91bmRpbmdDbGllbnRSZWN0IiwicGFyUmVjdCIsInBhcmVudE5vZGUiLCJ3aW5SZWN0IiwiYm9keSIsIndpblkiLCJwYWdlWU9mZnNldCIsIndpblgiLCJwYWdlWE9mZnNldCIsInBhcmVudERpbXMiLCJhbmNob3IiLCJwb3NpdGlvbiIsInZPZmZzZXQiLCJoT2Zmc2V0IiwiaXNPdmVyZmxvdyIsIiRlbGVEaW1zIiwiJGFuY2hvckRpbXMiLCJrZXlDb2RlcyIsImNvbW1hbmRzIiwiS2V5Ym9hcmQiLCJnZXRLZXlDb2RlcyIsInBhcnNlS2V5IiwiZXZlbnQiLCJrZXkiLCJ3aGljaCIsImtleUNvZGUiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJ0b1VwcGVyQ2FzZSIsInNoaWZ0S2V5IiwiY3RybEtleSIsImFsdEtleSIsImhhbmRsZUtleSIsImNvbXBvbmVudCIsImZ1bmN0aW9ucyIsImNvbW1hbmRMaXN0IiwiY21kcyIsImNvbW1hbmQiLCJsdHIiLCJleHRlbmQiLCJyZXR1cm5WYWx1ZSIsImhhbmRsZWQiLCJ1bmhhbmRsZWQiLCJmaW5kRm9jdXNhYmxlIiwiZmlsdGVyIiwiaXMiLCJyZWdpc3RlciIsImNvbXBvbmVudE5hbWUiLCJ0cmFwRm9jdXMiLCIkZm9jdXNhYmxlIiwiJGZpcnN0Rm9jdXNhYmxlIiwiZXEiLCIkbGFzdEZvY3VzYWJsZSIsIm9uIiwidGFyZ2V0IiwicHJldmVudERlZmF1bHQiLCJmb2N1cyIsInJlbGVhc2VGb2N1cyIsIm9mZiIsImtjcyIsImsiLCJrYyIsImRlZmF1bHRRdWVyaWVzIiwibGFuZHNjYXBlIiwicG9ydHJhaXQiLCJyZXRpbmEiLCJxdWVyaWVzIiwiY3VycmVudCIsInNlbGYiLCJleHRyYWN0ZWRTdHlsZXMiLCJjc3MiLCJuYW1lZFF1ZXJpZXMiLCJwYXJzZVN0eWxlVG9PYmplY3QiLCJoYXNPd25Qcm9wZXJ0eSIsInZhbHVlIiwiX2dldEN1cnJlbnRTaXplIiwiX3dhdGNoZXIiLCJhdExlYXN0Iiwic2l6ZSIsInF1ZXJ5IiwiZ2V0IiwibWF0Y2hNZWRpYSIsIm1hdGNoZXMiLCJtYXRjaGVkIiwibmV3U2l6ZSIsImN1cnJlbnRTaXplIiwic3R5bGVNZWRpYSIsIm1lZGlhIiwic2NyaXB0IiwiZ2V0RWxlbWVudHNCeVRhZ05hbWUiLCJpbmZvIiwiaWQiLCJpbnNlcnRCZWZvcmUiLCJnZXRDb21wdXRlZFN0eWxlIiwiY3VycmVudFN0eWxlIiwibWF0Y2hNZWRpdW0iLCJ0ZXh0Iiwic3R5bGVTaGVldCIsImNzc1RleHQiLCJ0ZXh0Q29udGVudCIsInN0eWxlT2JqZWN0IiwicmVkdWNlIiwicmV0IiwicGFyYW0iLCJwYXJ0cyIsInZhbCIsImRlY29kZVVSSUNvbXBvbmVudCIsImlzQXJyYXkiLCJpbml0Q2xhc3NlcyIsImFjdGl2ZUNsYXNzZXMiLCJNb3Rpb24iLCJhbmltYXRlSW4iLCJhbmltYXRpb24iLCJjYiIsImFuaW1hdGUiLCJhbmltYXRlT3V0IiwiTW92ZSIsImR1cmF0aW9uIiwiYW5pbSIsInByb2ciLCJtb3ZlIiwidHMiLCJpc0luIiwiaW5pdENsYXNzIiwiYWN0aXZlQ2xhc3MiLCJyZXNldCIsImFkZENsYXNzIiwic2hvdyIsIm9mZnNldFdpZHRoIiwib25lIiwiZmluaXNoIiwiaGlkZSIsInRyYW5zaXRpb25EdXJhdGlvbiIsIk5lc3QiLCJGZWF0aGVyIiwibWVudSIsIml0ZW1zIiwic3ViTWVudUNsYXNzIiwic3ViSXRlbUNsYXNzIiwiaGFzU3ViQ2xhc3MiLCIkaXRlbSIsIiRzdWIiLCJjaGlsZHJlbiIsIkJ1cm4iLCJUaW1lciIsIm9wdGlvbnMiLCJuYW1lU3BhY2UiLCJyZW1haW4iLCJpc1BhdXNlZCIsInJlc3RhcnQiLCJpbmZpbml0ZSIsInBhdXNlIiwib25JbWFnZXNMb2FkZWQiLCJpbWFnZXMiLCJ1bmxvYWRlZCIsImNvbXBsZXRlIiwicmVhZHlTdGF0ZSIsInNpbmdsZUltYWdlTG9hZGVkIiwic3JjIiwic3BvdFN3aXBlIiwiZW5hYmxlZCIsImRvY3VtZW50RWxlbWVudCIsIm1vdmVUaHJlc2hvbGQiLCJ0aW1lVGhyZXNob2xkIiwic3RhcnRQb3NYIiwic3RhcnRQb3NZIiwic3RhcnRUaW1lIiwiZWxhcHNlZFRpbWUiLCJpc01vdmluZyIsIm9uVG91Y2hFbmQiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwib25Ub3VjaE1vdmUiLCJ4IiwidG91Y2hlcyIsInBhZ2VYIiwieSIsInBhZ2VZIiwiZHgiLCJkeSIsImRpciIsImFicyIsIm9uVG91Y2hTdGFydCIsImFkZEV2ZW50TGlzdGVuZXIiLCJpbml0IiwidGVhcmRvd24iLCJzcGVjaWFsIiwic3dpcGUiLCJzZXR1cCIsIm5vb3AiLCJhZGRUb3VjaCIsImhhbmRsZVRvdWNoIiwiY2hhbmdlZFRvdWNoZXMiLCJmaXJzdCIsImV2ZW50VHlwZXMiLCJ0b3VjaHN0YXJ0IiwidG91Y2htb3ZlIiwidG91Y2hlbmQiLCJzaW11bGF0ZWRFdmVudCIsIk1vdXNlRXZlbnQiLCJzY3JlZW5YIiwic2NyZWVuWSIsImNsaWVudFgiLCJjbGllbnRZIiwiY3JlYXRlRXZlbnQiLCJpbml0TW91c2VFdmVudCIsImRpc3BhdGNoRXZlbnQiLCJNdXRhdGlvbk9ic2VydmVyIiwicHJlZml4ZXMiLCJ0cmlnZ2VycyIsInN0b3BQcm9wYWdhdGlvbiIsImZhZGVPdXQiLCJjaGVja0xpc3RlbmVycyIsImV2ZW50c0xpc3RlbmVyIiwicmVzaXplTGlzdGVuZXIiLCJzY3JvbGxMaXN0ZW5lciIsImNsb3NlbWVMaXN0ZW5lciIsInlldGlCb3hlcyIsInBsdWdOYW1lcyIsImxpc3RlbmVycyIsImpvaW4iLCJwbHVnaW5JZCIsIm5vdCIsImRlYm91bmNlIiwiJG5vZGVzIiwibm9kZXMiLCJxdWVyeVNlbGVjdG9yQWxsIiwibGlzdGVuaW5nRWxlbWVudHNNdXRhdGlvbiIsIm11dGF0aW9uUmVjb3Jkc0xpc3QiLCIkdGFyZ2V0IiwiYXR0cmlidXRlTmFtZSIsImNsb3Nlc3QiLCJlbGVtZW50T2JzZXJ2ZXIiLCJvYnNlcnZlIiwiYXR0cmlidXRlcyIsImNoaWxkTGlzdCIsImNoYXJhY3RlckRhdGEiLCJzdWJ0cmVlIiwiYXR0cmlidXRlRmlsdGVyIiwiSUhlYXJZb3UiLCJmYWN0b3J5IiwiZGVmaW5lIiwiYW1kIiwiZXhwb3J0cyIsIm1vZHVsZSIsInJlcXVpcmUiLCJTbGljayIsImluc3RhbmNlVWlkIiwic2V0dGluZ3MiLCJfIiwiZGF0YVNldHRpbmdzIiwiZGVmYXVsdHMiLCJhY2Nlc3NpYmlsaXR5IiwiYWRhcHRpdmVIZWlnaHQiLCJhcHBlbmRBcnJvd3MiLCJhcHBlbmREb3RzIiwiYXJyb3dzIiwiYXNOYXZGb3IiLCJwcmV2QXJyb3ciLCJuZXh0QXJyb3ciLCJhdXRvcGxheSIsImF1dG9wbGF5U3BlZWQiLCJjZW50ZXJNb2RlIiwiY2VudGVyUGFkZGluZyIsImNzc0Vhc2UiLCJjdXN0b21QYWdpbmciLCJzbGlkZXIiLCJkb3RzIiwiZG90c0NsYXNzIiwiZHJhZ2dhYmxlIiwiZWFzaW5nIiwiZWRnZUZyaWN0aW9uIiwiZmFkZSIsImZvY3VzT25TZWxlY3QiLCJmb2N1c09uQ2hhbmdlIiwiaW5pdGlhbFNsaWRlIiwibGF6eUxvYWQiLCJtb2JpbGVGaXJzdCIsInBhdXNlT25Ib3ZlciIsInBhdXNlT25Gb2N1cyIsInBhdXNlT25Eb3RzSG92ZXIiLCJyZXNwb25kVG8iLCJyZXNwb25zaXZlIiwicm93cyIsInNsaWRlIiwic2xpZGVzUGVyUm93Iiwic2xpZGVzVG9TaG93Iiwic2xpZGVzVG9TY3JvbGwiLCJzcGVlZCIsInN3aXBlVG9TbGlkZSIsInRvdWNoTW92ZSIsInRvdWNoVGhyZXNob2xkIiwidXNlQ1NTIiwidXNlVHJhbnNmb3JtIiwidmFyaWFibGVXaWR0aCIsInZlcnRpY2FsIiwidmVydGljYWxTd2lwaW5nIiwid2FpdEZvckFuaW1hdGUiLCJ6SW5kZXgiLCJpbml0aWFscyIsImFuaW1hdGluZyIsImRyYWdnaW5nIiwiYXV0b1BsYXlUaW1lciIsImN1cnJlbnREaXJlY3Rpb24iLCJjdXJyZW50TGVmdCIsImN1cnJlbnRTbGlkZSIsImRpcmVjdGlvbiIsIiRkb3RzIiwibGlzdFdpZHRoIiwibGlzdEhlaWdodCIsImxvYWRJbmRleCIsIiRuZXh0QXJyb3ciLCIkcHJldkFycm93Iiwic2Nyb2xsaW5nIiwic2xpZGVDb3VudCIsInNsaWRlV2lkdGgiLCIkc2xpZGVUcmFjayIsIiRzbGlkZXMiLCJzbGlkaW5nIiwic2xpZGVPZmZzZXQiLCJzd2lwZUxlZnQiLCJzd2lwaW5nIiwiJGxpc3QiLCJ0b3VjaE9iamVjdCIsInRyYW5zZm9ybXNFbmFibGVkIiwidW5zbGlja2VkIiwiYWN0aXZlQnJlYWtwb2ludCIsImFuaW1UeXBlIiwiYW5pbVByb3AiLCJicmVha3BvaW50cyIsImJyZWFrcG9pbnRTZXR0aW5ncyIsImNzc1RyYW5zaXRpb25zIiwiZm9jdXNzZWQiLCJpbnRlcnJ1cHRlZCIsImhpZGRlbiIsInBhdXNlZCIsInBvc2l0aW9uUHJvcCIsInJvd0NvdW50Iiwic2hvdWxkQ2xpY2siLCIkc2xpZGVyIiwiJHNsaWRlc0NhY2hlIiwidHJhbnNmb3JtVHlwZSIsInRyYW5zaXRpb25UeXBlIiwidmlzaWJpbGl0eUNoYW5nZSIsIndpbmRvd1dpZHRoIiwid2luZG93VGltZXIiLCJvcmlnaW5hbFNldHRpbmdzIiwibW96SGlkZGVuIiwid2Via2l0SGlkZGVuIiwiYXV0b1BsYXkiLCJwcm94eSIsImF1dG9QbGF5Q2xlYXIiLCJhdXRvUGxheUl0ZXJhdG9yIiwiY2hhbmdlU2xpZGUiLCJjbGlja0hhbmRsZXIiLCJzZWxlY3RIYW5kbGVyIiwic2V0UG9zaXRpb24iLCJzd2lwZUhhbmRsZXIiLCJkcmFnSGFuZGxlciIsImtleUhhbmRsZXIiLCJodG1sRXhwciIsInJlZ2lzdGVyQnJlYWtwb2ludHMiLCJhY3RpdmF0ZUFEQSIsImFkZFNsaWRlIiwic2xpY2tBZGQiLCJtYXJrdXAiLCJpbmRleCIsImFkZEJlZm9yZSIsInVubG9hZCIsImluc2VydEFmdGVyIiwicHJlcGVuZFRvIiwiZGV0YWNoIiwiYXBwZW5kIiwicmVpbml0IiwiYW5pbWF0ZUhlaWdodCIsInRhcmdldEhlaWdodCIsIm91dGVySGVpZ2h0IiwiYW5pbWF0ZVNsaWRlIiwidGFyZ2V0TGVmdCIsImFuaW1Qcm9wcyIsImFuaW1TdGFydCIsInN0ZXAiLCJjZWlsIiwiYXBwbHlUcmFuc2l0aW9uIiwiZGlzYWJsZVRyYW5zaXRpb24iLCJnZXROYXZUYXJnZXQiLCJzbGljayIsInNsaWRlSGFuZGxlciIsInRyYW5zaXRpb24iLCJzZXRJbnRlcnZhbCIsImNsZWFySW50ZXJ2YWwiLCJzbGlkZVRvIiwiYnVpbGRBcnJvd3MiLCJhZGQiLCJidWlsZERvdHMiLCJkb3QiLCJnZXREb3RDb3VudCIsImJ1aWxkT3V0Iiwid3JhcEFsbCIsIndyYXAiLCJzZXR1cEluZmluaXRlIiwidXBkYXRlRG90cyIsInNldFNsaWRlQ2xhc3NlcyIsImJ1aWxkUm93cyIsImEiLCJiIiwiYyIsIm5ld1NsaWRlcyIsIm51bU9mU2xpZGVzIiwib3JpZ2luYWxTbGlkZXMiLCJzbGlkZXNQZXJTZWN0aW9uIiwiY3JlYXRlRG9jdW1lbnRGcmFnbWVudCIsInJvdyIsImFwcGVuZENoaWxkIiwiZW1wdHkiLCJjaGVja1Jlc3BvbnNpdmUiLCJpbml0aWFsIiwiZm9yY2VVcGRhdGUiLCJicmVha3BvaW50IiwidGFyZ2V0QnJlYWtwb2ludCIsInJlc3BvbmRUb1dpZHRoIiwidHJpZ2dlckJyZWFrcG9pbnQiLCJzbGlkZXJXaWR0aCIsImlubmVyV2lkdGgiLCJtaW4iLCJ1bnNsaWNrIiwicmVmcmVzaCIsImRvbnRBbmltYXRlIiwiY3VycmVudFRhcmdldCIsImluZGV4T2Zmc2V0IiwidW5ldmVuT2Zmc2V0IiwibWVzc2FnZSIsImNoZWNrTmF2aWdhYmxlIiwibmF2aWdhYmxlcyIsInByZXZOYXZpZ2FibGUiLCJnZXROYXZpZ2FibGVJbmRleGVzIiwibiIsImNsZWFuVXBFdmVudHMiLCJpbnRlcnJ1cHQiLCJ2aXNpYmlsaXR5IiwiY2xlYW5VcFNsaWRlRXZlbnRzIiwib3JpZW50YXRpb25DaGFuZ2UiLCJyZXNpemUiLCJjbGVhblVwUm93cyIsInN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbiIsImRlc3Ryb3kiLCJyZW1vdmUiLCJmYWRlU2xpZGUiLCJzbGlkZUluZGV4Iiwib3BhY2l0eSIsImZhZGVTbGlkZU91dCIsImZpbHRlclNsaWRlcyIsInNsaWNrRmlsdGVyIiwiZm9jdXNIYW5kbGVyIiwiJHNmIiwiZ2V0Q3VycmVudCIsInNsaWNrQ3VycmVudFNsaWRlIiwiYnJlYWtQb2ludCIsImNvdW50ZXIiLCJwYWdlclF0eSIsImdldExlZnQiLCJ2ZXJ0aWNhbEhlaWdodCIsInZlcnRpY2FsT2Zmc2V0IiwidGFyZ2V0U2xpZGUiLCJjb2VmIiwiZmxvb3IiLCJvZmZzZXRMZWZ0Iiwib3V0ZXJXaWR0aCIsImdldE9wdGlvbiIsInNsaWNrR2V0T3B0aW9uIiwib3B0aW9uIiwiaW5kZXhlcyIsImdldFNsaWNrIiwiZ2V0U2xpZGVDb3VudCIsInNsaWRlc1RyYXZlcnNlZCIsInN3aXBlZFNsaWRlIiwiY2VudGVyT2Zmc2V0IiwiZ29UbyIsInNsaWNrR29UbyIsInBhcnNlSW50IiwiY3JlYXRpb24iLCJoYXNDbGFzcyIsInNldFByb3BzIiwic3RhcnRMb2FkIiwibG9hZFNsaWRlciIsImluaXRpYWxpemVFdmVudHMiLCJ1cGRhdGVBcnJvd3MiLCJpbml0QURBIiwibnVtRG90R3JvdXBzIiwidGFiQ29udHJvbEluZGV4ZXMiLCJzbGlkZUNvbnRyb2xJbmRleCIsImFyaWFCdXR0b25Db250cm9sIiwibWFwcGVkU2xpZGVJbmRleCIsImluaXRBcnJvd0V2ZW50cyIsImluaXREb3RFdmVudHMiLCJpbml0U2xpZGVFdmVudHMiLCJhY3Rpb24iLCJpbml0VUkiLCJ0YWdOYW1lIiwibWF0Y2giLCJsb2FkUmFuZ2UiLCJjbG9uZVJhbmdlIiwicmFuZ2VTdGFydCIsInJhbmdlRW5kIiwibG9hZEltYWdlcyIsImltYWdlc1Njb3BlIiwiaW1hZ2UiLCJpbWFnZVNvdXJjZSIsImltYWdlU3JjU2V0IiwiaW1hZ2VTaXplcyIsImltYWdlVG9Mb2FkIiwib25sb2FkIiwib25lcnJvciIsInByZXZTbGlkZSIsIm5leHRTbGlkZSIsInByb2dyZXNzaXZlTGF6eUxvYWQiLCJuZXh0Iiwic2xpY2tOZXh0Iiwic2xpY2tQYXVzZSIsInBsYXkiLCJzbGlja1BsYXkiLCJwb3N0U2xpZGUiLCIkY3VycmVudFNsaWRlIiwicHJldiIsInNsaWNrUHJldiIsInRyeUNvdW50IiwiJGltZ3NUb0xvYWQiLCJpbml0aWFsaXppbmciLCJsYXN0VmlzaWJsZUluZGV4IiwiY3VycmVudEJyZWFrcG9pbnQiLCJsIiwicmVzcG9uc2l2ZVNldHRpbmdzIiwic29ydCIsIndpbmRvd0RlbGF5IiwicmVtb3ZlU2xpZGUiLCJzbGlja1JlbW92ZSIsInJlbW92ZUJlZm9yZSIsInJlbW92ZUFsbCIsInNldENTUyIsInBvc2l0aW9uUHJvcHMiLCJzZXREaW1lbnNpb25zIiwicGFkZGluZyIsInNldEZhZGUiLCJzZXRIZWlnaHQiLCJzZXRPcHRpb24iLCJzbGlja1NldE9wdGlvbiIsIml0ZW0iLCJib2R5U3R5bGUiLCJXZWJraXRUcmFuc2l0aW9uIiwiTW96VHJhbnNpdGlvbiIsIm1zVHJhbnNpdGlvbiIsIk9UcmFuc2Zvcm0iLCJwZXJzcGVjdGl2ZVByb3BlcnR5Iiwid2Via2l0UGVyc3BlY3RpdmUiLCJNb3pUcmFuc2Zvcm0iLCJNb3pQZXJzcGVjdGl2ZSIsIndlYmtpdFRyYW5zZm9ybSIsIm1zVHJhbnNmb3JtIiwidHJhbnNmb3JtIiwiYWxsU2xpZGVzIiwicmVtYWluZGVyIiwiZXZlbkNvZWYiLCJpbmZpbml0ZUNvdW50IiwiY2xvbmUiLCJ0b2dnbGUiLCJ0YXJnZXRFbGVtZW50IiwicGFyZW50cyIsInN5bmMiLCJhbmltU2xpZGUiLCJvbGRTbGlkZSIsInNsaWRlTGVmdCIsIm5hdlRhcmdldCIsInN3aXBlRGlyZWN0aW9uIiwieERpc3QiLCJ5RGlzdCIsInIiLCJzd2lwZUFuZ2xlIiwic3RhcnRYIiwiY3VyWCIsInN0YXJ0WSIsImN1clkiLCJhdGFuMiIsIlBJIiwic3dpcGVFbmQiLCJzd2lwZUxlbmd0aCIsImVkZ2VIaXQiLCJtaW5Td2lwZSIsImZpbmdlckNvdW50Iiwib3JpZ2luYWxFdmVudCIsInN3aXBlU3RhcnQiLCJzd2lwZU1vdmUiLCJlZGdlV2FzSGl0IiwiY3VyTGVmdCIsInBvc2l0aW9uT2Zmc2V0IiwidmVydGljYWxTd2lwZUxlbmd0aCIsInNxcnQiLCJ1bmZpbHRlclNsaWRlcyIsInNsaWNrVW5maWx0ZXIiLCJmcm9tQnJlYWtwb2ludCIsInNsaWRlcnMiLCJoZXJvIiwicHJvZHVjdHMiLCJyZWFkeSIsIl9fcGxhY2Vob2xkZXJfXyIsImxvZyIsImZpeGVkIiwiaGVhZGVyIiwiY29udGFpbmVyIiwic2Nyb2xsIiwic2Nyb2xsVG9wIiwic2lkZWJhciIsIm1vYmlsZSIsImhlYWRlck1lbnUiLCJpY29ucyIsIm9wZW4iLCJjbGljayIsInRvZ2dsZUNsYXNzIiwibW9kYWwiLCJmYWRlVG9nZ2xlIiwibG9jYXRpb24iLCJwYXRobmFtZSIsImhvc3RuYW1lIiwiaGFzaCJdLCJtYXBwaW5ncyI6Ijs7QUFBQSxDQUFDLFVBQVNBLENBQVQsRUFBWTs7QUFFYjs7QUFFQSxNQUFJQyxxQkFBcUIsT0FBekI7O0FBRUE7QUFDQTtBQUNBLE1BQUlDLGFBQWE7QUFDZkMsYUFBU0Ysa0JBRE07O0FBR2Y7OztBQUdBRyxjQUFVLEVBTks7O0FBUWY7OztBQUdBQyxZQUFRLEVBWE87O0FBYWY7OztBQUdBQyxTQUFLLFlBQVU7QUFDYixhQUFPTixFQUFFLE1BQUYsRUFBVU8sSUFBVixDQUFlLEtBQWYsTUFBMEIsS0FBakM7QUFDRCxLQWxCYztBQW1CZjs7OztBQUlBQyxZQUFRLFVBQVNBLE1BQVQsRUFBaUJDLElBQWpCLEVBQXVCO0FBQzdCO0FBQ0E7QUFDQSxVQUFJQyxZQUFhRCxR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S0FBMUIsRUFBaUMsRUFBakMsS0FBd0MsS0FBS2tvQixRQUFMLENBQWNsb0IsT0FBZCxDQUFzQixLQUF0QixFQUE2QixFQUE3QixDQUF4QyxJQUNBaW9CLFNBQVNFLFFBQVQsSUFBcUIsS0FBS0EsUUFGNUIsRUFHRTtBQUNBLFFBQUl0akIsU0FBU3hOLEVBQUUsS0FBSyt3QixJQUFQLENBQWI7QUFDQXZqQixhQUFTQSxPQUFPekssTUFBUCxHQUFnQnlLLE1BQWhCLEdBQXlCeE4sRUFBRSxXQUFXLEtBQUsrd0IsSUFBTCxDQUFVenRCLEtBQVYsQ0FBZ0IsQ0FBaEIsQ0FBWCxHQUFnQyxHQUFsQyxDQUFsQztBQUNBLFFBQUlrSyxPQUFPekssTUFBWCxFQUFtQjtBQUNqQnlJLFlBQU1pQyxjQUFOO0FBQ0F6TixRQUFFLFlBQUYsRUFBZ0JvUixPQUFoQixDQUF3QjtBQUN0QjhlLG1CQUFXMWlCLE9BQU83RCxNQUFQLEdBQWdCTDtBQURMLE9BQXhCLEVBRUcsR0FGSCxFQUVRLFlBQVk7QUFDbEIsWUFBSWdQLFVBQVV0WSxFQUFFd04sTUFBRixDQUFkO0FBQ0E4SyxnQkFBUTVLLEtBQVI7QUFDQSxZQUFJNEssUUFBUXZMLEVBQVIsQ0FBVyxRQUFYLENBQUosRUFBMEI7QUFDeEIsaUJBQU8sS0FBUDtBQUNELFNBRkQsTUFFTztBQUNMdUwsa0JBQVEvWCxJQUFSLENBQWEsVUFBYixFQUF5QixJQUF6QjtBQUNBK1gsa0JBQVE1SyxLQUFSO0FBQ0Q7QUFDRixPQVhEO0FBWUQ7QUFDRjtBQUNGLENBdkJEIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIhZnVuY3Rpb24oJCkge1xuXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIEZPVU5EQVRJT05fVkVSU0lPTiA9ICc2LjMuMSc7XG5cbi8vIEdsb2JhbCBGb3VuZGF0aW9uIG9iamVjdFxuLy8gVGhpcyBpcyBhdHRhY2hlZCB0byB0aGUgd2luZG93LCBvciB1c2VkIGFzIGEgbW9kdWxlIGZvciBBTUQvQnJvd3NlcmlmeVxudmFyIEZvdW5kYXRpb24gPSB7XG4gIHZlcnNpb246IEZPVU5EQVRJT05fVkVSU0lPTixcblxuICAvKipcbiAgICogU3RvcmVzIGluaXRpYWxpemVkIHBsdWdpbnMuXG4gICAqL1xuICBfcGx1Z2luczoge30sXG5cbiAgLyoqXG4gICAqIFN0b3JlcyBnZW5lcmF0ZWQgdW5pcXVlIGlkcyBmb3IgcGx1Z2luIGluc3RhbmNlc1xuICAgKi9cbiAgX3V1aWRzOiBbXSxcblxuICAvKipcbiAgICogUmV0dXJucyBhIGJvb2xlYW4gZm9yIFJUTCBzdXBwb3J0XG4gICAqL1xuICBydGw6IGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuICQoJ2h0bWwnKS5hdHRyKCdkaXInKSA9PT0gJ3J0bCc7XG4gIH0sXG4gIC8qKlxuICAgKiBEZWZpbmVzIGEgRm91bmRhdGlvbiBwbHVnaW4sIGFkZGluZyBpdCB0byB0aGUgYEZvdW5kYXRpb25gIG5hbWVzcGFjZSBhbmQgdGhlIGxpc3Qgb2YgcGx1Z2lucyB0byBpbml0aWFsaXplIHdoZW4gcmVmbG93aW5nLlxuICAgKiBAcGFyYW0ge09iamVjdH0gcGx1Z2luIC0gVGhlIGNvbnN0cnVjdG9yIG9mIHRoZSBwbHVnaW4uXG4gICAqL1xuICBwbHVnaW46IGZ1bmN0aW9uKHBsdWdpbiwgbmFtZSkge1xuICAgIC8vIE9iamVjdCBrZXkgdG8gdXNlIHdoZW4gYWRkaW5nIHRvIGdsb2JhbCBGb3VuZGF0aW9uIG9iamVjdFxuICAgIC8vIEV4YW1wbGVzOiBGb3VuZGF0aW9uLlJldmVhbCwgRm91bmRhdGlvbi5PZmZDYW52YXNcbiAgICB2YXIgY2xhc3NOYW1lID0gKG5hbWUgfHwgZnVuY3Rpb25OYW1lKHBsdWdpbikpO1xuICAgIC8vIE9iamVjdCBrZXkgdG8gdXNlIHdoZW4gc3RvcmluZyB0aGUgcGx1Z2luLCBhbHNvIHVzZWQgdG8gY3JlYXRlIHRoZSBpZGVudGlmeWluZyBkYXRhIGF0dHJpYnV0ZSBmb3IgdGhlIHBsdWdpblxuICAgIC8vIEV4YW1wbGVzOiBkYXRhLXJldmVhbCwgZGF0YS1vZmYtY2FudmFzXG4gICAgdmFyIGF0dHJOYW1lICA9IGh5cGhlbmF0ZShjbGFzc05hbWUpO1xuXG4gICAgLy8gQWRkIHRvIHRoZSBGb3VuZGF0aW9uIG9iamVjdCBhbmQgdGhlIHBsdWdpbnMgbGlzdCAoZm9yIHJlZmxvd2luZylcbiAgICB0aGlzLl9wbHVnaW5zW2F0dHJOYW1lXSA9IHRoaXNbY2xhc3NOYW1lXSA9IHBsdWdpbjtcbiAgfSxcbiAgLyoqXG4gICAqIEBmdW5jdGlvblxuICAgKiBQb3B1bGF0ZXMgdGhlIF91dWlkcyBhcnJheSB3aXRoIHBvaW50ZXJzIHRvIGVhY2ggaW5kaXZpZHVhbCBwbHVnaW4gaW5zdGFuY2UuXG4gICAqIEFkZHMgdGhlIGB6ZlBsdWdpbmAgZGF0YS1hdHRyaWJ1dGUgdG8gcHJvZ3JhbW1hdGljYWxseSBjcmVhdGVkIHBsdWdpbnMgdG8gYWxsb3cgdXNlIG9mICQoc2VsZWN0b3IpLmZvdW5kYXRpb24obWV0aG9kKSBjYWxscy5cbiAgICogQWxzbyBmaXJlcyB0aGUgaW5pdGlhbGl6YXRpb24gZXZlbnQgZm9yIGVhY2ggcGx1Z2luLCBjb25zb2xpZGF0aW5nIHJlcGV0aXRpdmUgY29kZS5cbiAgICogQHBhcmFtIHtPYmplY3R9IHBsdWdpbiAtIGFuIGluc3RhbmNlIG9mIGEgcGx1Z2luLCB1c3VhbGx5IGB0aGlzYCBpbiBjb250ZXh0LlxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSAtIHRoZSBuYW1lIG9mIHRoZSBwbHVnaW4sIHBhc3NlZCBhcyBhIGNhbWVsQ2FzZWQgc3RyaW5nLlxuICAgKiBAZmlyZXMgUGx1Z2luI2luaXRcbiAgICovXG4gIHJlZ2lzdGVyUGx1Z2luOiBmdW5jdGlvbihwbHVnaW4sIG5hbWUpe1xuICAgIHZhciBwbHVnaW5OYW1lID0gbmFtZSA/IGh5cGhlbmF0ZShuYW1lKSA6IGZ1bmN0aW9uTmFtZShwbHVnaW4uY29uc3RydWN0b3IpLnRvTG93ZXJDYXNlKCk7XG4gICAgcGx1Z2luLnV1aWQgPSB0aGlzLkdldFlvRGlnaXRzKDYsIHBsdWdpbk5hbWUpO1xuXG4gICAgaWYoIXBsdWdpbi4kZWxlbWVudC5hdHRyKGBkYXRhLSR7cGx1Z2luTmFtZX1gKSl7IHBsdWdpbi4kZWxlbWVudC5hdHRyKGBkYXRhLSR7cGx1Z2luTmFtZX1gLCBwbHVnaW4udXVpZCk7IH1cbiAgICBpZighcGx1Z2luLiRlbGVtZW50LmRhdGEoJ3pmUGx1Z2luJykpeyBwbHVnaW4uJGVsZW1lbnQuZGF0YSgnemZQbHVnaW4nLCBwbHVnaW4pOyB9XG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgcGx1Z2luIGhhcyBpbml0aWFsaXplZC5cbiAgICAgICAgICAgKiBAZXZlbnQgUGx1Z2luI2luaXRcbiAgICAgICAgICAgKi9cbiAgICBwbHVnaW4uJGVsZW1lbnQudHJpZ2dlcihgaW5pdC56Zi4ke3BsdWdpbk5hbWV9YCk7XG5cbiAgICB0aGlzLl91dWlkcy5wdXNoKHBsdWdpbi51dWlkKTtcblxuICAgIHJldHVybjtcbiAgfSxcbiAgLyoqXG4gICAqIEBmdW5jdGlvblxuICAgKiBSZW1vdmVzIHRoZSBwbHVnaW5zIHV1aWQgZnJvbSB0aGUgX3V1aWRzIGFycmF5LlxuICAgKiBSZW1vdmVzIHRoZSB6ZlBsdWdpbiBkYXRhIGF0dHJpYnV0ZSwgYXMgd2VsbCBhcyB0aGUgZGF0YS1wbHVnaW4tbmFtZSBhdHRyaWJ1dGUuXG4gICAqIEFsc28gZmlyZXMgdGhlIGRlc3Ryb3llZCBldmVudCBmb3IgdGhlIHBsdWdpbiwgY29uc29saWRhdGluZyByZXBldGl0aXZlIGNvZGUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBwbHVnaW4gLSBhbiBpbnN0YW5jZSBvZiBhIHBsdWdpbiwgdXN1YWxseSBgdGhpc2AgaW4gY29udGV4dC5cbiAgICogQGZpcmVzIFBsdWdpbiNkZXN0cm95ZWRcbiAgICovXG4gIHVucmVnaXN0ZXJQbHVnaW46IGZ1bmN0aW9uKHBsdWdpbil7XG4gICAgdmFyIHBsdWdpbk5hbWUgPSBoeXBoZW5hdGUoZnVuY3Rpb25OYW1lKHBsdWdpbi4kZWxlbWVudC5kYXRhKCd6ZlBsdWdpbicpLmNvbnN0cnVjdG9yKSk7XG5cbiAgICB0aGlzLl91dWlkcy5zcGxpY2UodGhpcy5fdXVpZHMuaW5kZXhPZihwbHVnaW4udXVpZCksIDEpO1xuICAgIHBsdWdpbi4kZWxlbWVudC5yZW1vdmVBdHRyKGBkYXRhLSR7cGx1Z2luTmFtZX1gKS5yZW1vdmVEYXRhKCd6ZlBsdWdpbicpXG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgcGx1Z2luIGhhcyBiZWVuIGRlc3Ryb3llZC5cbiAgICAgICAgICAgKiBAZXZlbnQgUGx1Z2luI2Rlc3Ryb3llZFxuICAgICAgICAgICAqL1xuICAgICAgICAgIC50cmlnZ2VyKGBkZXN0cm95ZWQuemYuJHtwbHVnaW5OYW1lfWApO1xuICAgIGZvcih2YXIgcHJvcCBpbiBwbHVnaW4pe1xuICAgICAgcGx1Z2luW3Byb3BdID0gbnVsbDsvL2NsZWFuIHVwIHNjcmlwdCB0byBwcmVwIGZvciBnYXJiYWdlIGNvbGxlY3Rpb24uXG4gICAgfVxuICAgIHJldHVybjtcbiAgfSxcblxuICAvKipcbiAgICogQGZ1bmN0aW9uXG4gICAqIENhdXNlcyBvbmUgb3IgbW9yZSBhY3RpdmUgcGx1Z2lucyB0byByZS1pbml0aWFsaXplLCByZXNldHRpbmcgZXZlbnQgbGlzdGVuZXJzLCByZWNhbGN1bGF0aW5nIHBvc2l0aW9ucywgZXRjLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGx1Z2lucyAtIG9wdGlvbmFsIHN0cmluZyBvZiBhbiBpbmRpdmlkdWFsIHBsdWdpbiBrZXksIGF0dGFpbmVkIGJ5IGNhbGxpbmcgYCQoZWxlbWVudCkuZGF0YSgncGx1Z2luTmFtZScpYCwgb3Igc3RyaW5nIG9mIGEgcGx1Z2luIGNsYXNzIGkuZS4gYCdkcm9wZG93bidgXG4gICAqIEBkZWZhdWx0IElmIG5vIGFyZ3VtZW50IGlzIHBhc3NlZCwgcmVmbG93IGFsbCBjdXJyZW50bHkgYWN0aXZlIHBsdWdpbnMuXG4gICAqL1xuICAgcmVJbml0OiBmdW5jdGlvbihwbHVnaW5zKXtcbiAgICAgdmFyIGlzSlEgPSBwbHVnaW5zIGluc3RhbmNlb2YgJDtcbiAgICAgdHJ5e1xuICAgICAgIGlmKGlzSlEpe1xuICAgICAgICAgcGx1Z2lucy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICQodGhpcykuZGF0YSgnemZQbHVnaW4nKS5faW5pdCgpO1xuICAgICAgICAgfSk7XG4gICAgICAgfWVsc2V7XG4gICAgICAgICB2YXIgdHlwZSA9IHR5cGVvZiBwbHVnaW5zLFxuICAgICAgICAgX3RoaXMgPSB0aGlzLFxuICAgICAgICAgZm5zID0ge1xuICAgICAgICAgICAnb2JqZWN0JzogZnVuY3Rpb24ocGxncyl7XG4gICAgICAgICAgICAgcGxncy5mb3JFYWNoKGZ1bmN0aW9uKHApe1xuICAgICAgICAgICAgICAgcCA9IGh5cGhlbmF0ZShwKTtcbiAgICAgICAgICAgICAgICQoJ1tkYXRhLScrIHAgKyddJykuZm91bmRhdGlvbignX2luaXQnKTtcbiAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgfSxcbiAgICAgICAgICAgJ3N0cmluZyc6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgcGx1Z2lucyA9IGh5cGhlbmF0ZShwbHVnaW5zKTtcbiAgICAgICAgICAgICAkKCdbZGF0YS0nKyBwbHVnaW5zICsnXScpLmZvdW5kYXRpb24oJ19pbml0Jyk7XG4gICAgICAgICAgIH0sXG4gICAgICAgICAgICd1bmRlZmluZWQnOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgIHRoaXNbJ29iamVjdCddKE9iamVjdC5rZXlzKF90aGlzLl9wbHVnaW5zKSk7XG4gICAgICAgICAgIH1cbiAgICAgICAgIH07XG4gICAgICAgICBmbnNbdHlwZV0ocGx1Z2lucyk7XG4gICAgICAgfVxuICAgICB9Y2F0Y2goZXJyKXtcbiAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgIH1maW5hbGx5e1xuICAgICAgIHJldHVybiBwbHVnaW5zO1xuICAgICB9XG4gICB9LFxuXG4gIC8qKlxuICAgKiByZXR1cm5zIGEgcmFuZG9tIGJhc2UtMzYgdWlkIHdpdGggbmFtZXNwYWNpbmdcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBsZW5ndGggLSBudW1iZXIgb2YgcmFuZG9tIGJhc2UtMzYgZGlnaXRzIGRlc2lyZWQuIEluY3JlYXNlIGZvciBtb3JlIHJhbmRvbSBzdHJpbmdzLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlIC0gbmFtZSBvZiBwbHVnaW4gdG8gYmUgaW5jb3Jwb3JhdGVkIGluIHVpZCwgb3B0aW9uYWwuXG4gICAqIEBkZWZhdWx0IHtTdHJpbmd9ICcnIC0gaWYgbm8gcGx1Z2luIG5hbWUgaXMgcHJvdmlkZWQsIG5vdGhpbmcgaXMgYXBwZW5kZWQgdG8gdGhlIHVpZC5cbiAgICogQHJldHVybnMge1N0cmluZ30gLSB1bmlxdWUgaWRcbiAgICovXG4gIEdldFlvRGlnaXRzOiBmdW5jdGlvbihsZW5ndGgsIG5hbWVzcGFjZSl7XG4gICAgbGVuZ3RoID0gbGVuZ3RoIHx8IDY7XG4gICAgcmV0dXJuIE1hdGgucm91bmQoKE1hdGgucG93KDM2LCBsZW5ndGggKyAxKSAtIE1hdGgucmFuZG9tKCkgKiBNYXRoLnBvdygzNiwgbGVuZ3RoKSkpLnRvU3RyaW5nKDM2KS5zbGljZSgxKSArIChuYW1lc3BhY2UgPyBgLSR7bmFtZXNwYWNlfWAgOiAnJyk7XG4gIH0sXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIHBsdWdpbnMgb24gYW55IGVsZW1lbnRzIHdpdGhpbiBgZWxlbWAgKGFuZCBgZWxlbWAgaXRzZWxmKSB0aGF0IGFyZW4ndCBhbHJlYWR5IGluaXRpYWxpemVkLlxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbSAtIGpRdWVyeSBvYmplY3QgY29udGFpbmluZyB0aGUgZWxlbWVudCB0byBjaGVjayBpbnNpZGUuIEFsc28gY2hlY2tzIHRoZSBlbGVtZW50IGl0c2VsZiwgdW5sZXNzIGl0J3MgdGhlIGBkb2N1bWVudGAgb2JqZWN0LlxuICAgKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gcGx1Z2lucyAtIEEgbGlzdCBvZiBwbHVnaW5zIHRvIGluaXRpYWxpemUuIExlYXZlIHRoaXMgb3V0IHRvIGluaXRpYWxpemUgZXZlcnl0aGluZy5cbiAgICovXG4gIHJlZmxvdzogZnVuY3Rpb24oZWxlbSwgcGx1Z2lucykge1xuXG4gICAgLy8gSWYgcGx1Z2lucyBpcyB1bmRlZmluZWQsIGp1c3QgZ3JhYiBldmVyeXRoaW5nXG4gICAgaWYgKHR5cGVvZiBwbHVnaW5zID09PSAndW5kZWZpbmVkJykge1xuICAgICAgcGx1Z2lucyA9IE9iamVjdC5rZXlzKHRoaXMuX3BsdWdpbnMpO1xuICAgIH1cbiAgICAvLyBJZiBwbHVnaW5zIGlzIGEgc3RyaW5nLCBjb252ZXJ0IGl0IHRvIGFuIGFycmF5IHdpdGggb25lIGl0ZW1cbiAgICBlbHNlIGlmICh0eXBlb2YgcGx1Z2lucyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHBsdWdpbnMgPSBbcGx1Z2luc107XG4gICAgfVxuXG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBlYWNoIHBsdWdpblxuICAgICQuZWFjaChwbHVnaW5zLCBmdW5jdGlvbihpLCBuYW1lKSB7XG4gICAgICAvLyBHZXQgdGhlIGN1cnJlbnQgcGx1Z2luXG4gICAgICB2YXIgcGx1Z2luID0gX3RoaXMuX3BsdWdpbnNbbmFtZV07XG5cbiAgICAgIC8vIExvY2FsaXplIHRoZSBzZWFyY2ggdG8gYWxsIGVsZW1lbnRzIGluc2lkZSBlbGVtLCBhcyB3ZWxsIGFzIGVsZW0gaXRzZWxmLCB1bmxlc3MgZWxlbSA9PT0gZG9jdW1lbnRcbiAgICAgIHZhciAkZWxlbSA9ICQoZWxlbSkuZmluZCgnW2RhdGEtJytuYW1lKyddJykuYWRkQmFjaygnW2RhdGEtJytuYW1lKyddJyk7XG5cbiAgICAgIC8vIEZvciBlYWNoIHBsdWdpbiBmb3VuZCwgaW5pdGlhbGl6ZSBpdFxuICAgICAgJGVsZW0uZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyICRlbCA9ICQodGhpcyksXG4gICAgICAgICAgICBvcHRzID0ge307XG4gICAgICAgIC8vIERvbid0IGRvdWJsZS1kaXAgb24gcGx1Z2luc1xuICAgICAgICBpZiAoJGVsLmRhdGEoJ3pmUGx1Z2luJykpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oXCJUcmllZCB0byBpbml0aWFsaXplIFwiK25hbWUrXCIgb24gYW4gZWxlbWVudCB0aGF0IGFscmVhZHkgaGFzIGEgRm91bmRhdGlvbiBwbHVnaW4uXCIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKCRlbC5hdHRyKCdkYXRhLW9wdGlvbnMnKSl7XG4gICAgICAgICAgdmFyIHRoaW5nID0gJGVsLmF0dHIoJ2RhdGEtb3B0aW9ucycpLnNwbGl0KCc7JykuZm9yRWFjaChmdW5jdGlvbihlLCBpKXtcbiAgICAgICAgICAgIHZhciBvcHQgPSBlLnNwbGl0KCc6JykubWFwKGZ1bmN0aW9uKGVsKXsgcmV0dXJuIGVsLnRyaW0oKTsgfSk7XG4gICAgICAgICAgICBpZihvcHRbMF0pIG9wdHNbb3B0WzBdXSA9IHBhcnNlVmFsdWUob3B0WzFdKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB0cnl7XG4gICAgICAgICAgJGVsLmRhdGEoJ3pmUGx1Z2luJywgbmV3IHBsdWdpbigkKHRoaXMpLCBvcHRzKSk7XG4gICAgICAgIH1jYXRjaChlcil7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihlcik7XG4gICAgICAgIH1maW5hbGx5e1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG4gIGdldEZuTmFtZTogZnVuY3Rpb25OYW1lLFxuICB0cmFuc2l0aW9uZW5kOiBmdW5jdGlvbigkZWxlbSl7XG4gICAgdmFyIHRyYW5zaXRpb25zID0ge1xuICAgICAgJ3RyYW5zaXRpb24nOiAndHJhbnNpdGlvbmVuZCcsXG4gICAgICAnV2Via2l0VHJhbnNpdGlvbic6ICd3ZWJraXRUcmFuc2l0aW9uRW5kJyxcbiAgICAgICdNb3pUcmFuc2l0aW9uJzogJ3RyYW5zaXRpb25lbmQnLFxuICAgICAgJ09UcmFuc2l0aW9uJzogJ290cmFuc2l0aW9uZW5kJ1xuICAgIH07XG4gICAgdmFyIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSxcbiAgICAgICAgZW5kO1xuXG4gICAgZm9yICh2YXIgdCBpbiB0cmFuc2l0aW9ucyl7XG4gICAgICBpZiAodHlwZW9mIGVsZW0uc3R5bGVbdF0gIT09ICd1bmRlZmluZWQnKXtcbiAgICAgICAgZW5kID0gdHJhbnNpdGlvbnNbdF07XG4gICAgICB9XG4gICAgfVxuICAgIGlmKGVuZCl7XG4gICAgICByZXR1cm4gZW5kO1xuICAgIH1lbHNle1xuICAgICAgZW5kID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAkZWxlbS50cmlnZ2VySGFuZGxlcigndHJhbnNpdGlvbmVuZCcsIFskZWxlbV0pO1xuICAgICAgfSwgMSk7XG4gICAgICByZXR1cm4gJ3RyYW5zaXRpb25lbmQnO1xuICAgIH1cbiAgfVxufTtcblxuRm91bmRhdGlvbi51dGlsID0ge1xuICAvKipcbiAgICogRnVuY3Rpb24gZm9yIGFwcGx5aW5nIGEgZGVib3VuY2UgZWZmZWN0IHRvIGEgZnVuY3Rpb24gY2FsbC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgLSBGdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgZW5kIG9mIHRpbWVvdXQuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBkZWxheSAtIFRpbWUgaW4gbXMgdG8gZGVsYXkgdGhlIGNhbGwgb2YgYGZ1bmNgLlxuICAgKiBAcmV0dXJucyBmdW5jdGlvblxuICAgKi9cbiAgdGhyb3R0bGU6IGZ1bmN0aW9uIChmdW5jLCBkZWxheSkge1xuICAgIHZhciB0aW1lciA9IG51bGw7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLCBhcmdzID0gYXJndW1lbnRzO1xuXG4gICAgICBpZiAodGltZXIgPT09IG51bGwpIHtcbiAgICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICAgIHRpbWVyID0gbnVsbDtcbiAgICAgICAgfSwgZGVsYXkpO1xuICAgICAgfVxuICAgIH07XG4gIH1cbn07XG5cbi8vIFRPRE86IGNvbnNpZGVyIG5vdCBtYWtpbmcgdGhpcyBhIGpRdWVyeSBmdW5jdGlvblxuLy8gVE9ETzogbmVlZCB3YXkgdG8gcmVmbG93IHZzLiByZS1pbml0aWFsaXplXG4vKipcbiAqIFRoZSBGb3VuZGF0aW9uIGpRdWVyeSBtZXRob2QuXG4gKiBAcGFyYW0ge1N0cmluZ3xBcnJheX0gbWV0aG9kIC0gQW4gYWN0aW9uIHRvIHBlcmZvcm0gb24gdGhlIGN1cnJlbnQgalF1ZXJ5IG9iamVjdC5cbiAqL1xudmFyIGZvdW5kYXRpb24gPSBmdW5jdGlvbihtZXRob2QpIHtcbiAgdmFyIHR5cGUgPSB0eXBlb2YgbWV0aG9kLFxuICAgICAgJG1ldGEgPSAkKCdtZXRhLmZvdW5kYXRpb24tbXEnKSxcbiAgICAgICRub0pTID0gJCgnLm5vLWpzJyk7XG5cbiAgaWYoISRtZXRhLmxlbmd0aCl7XG4gICAgJCgnPG1ldGEgY2xhc3M9XCJmb3VuZGF0aW9uLW1xXCI+JykuYXBwZW5kVG8oZG9jdW1lbnQuaGVhZCk7XG4gIH1cbiAgaWYoJG5vSlMubGVuZ3RoKXtcbiAgICAkbm9KUy5yZW1vdmVDbGFzcygnbm8tanMnKTtcbiAgfVxuXG4gIGlmKHR5cGUgPT09ICd1bmRlZmluZWQnKXsvL25lZWRzIHRvIGluaXRpYWxpemUgdGhlIEZvdW5kYXRpb24gb2JqZWN0LCBvciBhbiBpbmRpdmlkdWFsIHBsdWdpbi5cbiAgICBGb3VuZGF0aW9uLk1lZGlhUXVlcnkuX2luaXQoKTtcbiAgICBGb3VuZGF0aW9uLnJlZmxvdyh0aGlzKTtcbiAgfWVsc2UgaWYodHlwZSA9PT0gJ3N0cmluZycpey8vYW4gaW5kaXZpZHVhbCBtZXRob2QgdG8gaW52b2tlIG9uIGEgcGx1Z2luIG9yIGdyb3VwIG9mIHBsdWdpbnNcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7Ly9jb2xsZWN0IGFsbCB0aGUgYXJndW1lbnRzLCBpZiBuZWNlc3NhcnlcbiAgICB2YXIgcGx1Z0NsYXNzID0gdGhpcy5kYXRhKCd6ZlBsdWdpbicpOy8vZGV0ZXJtaW5lIHRoZSBjbGFzcyBvZiBwbHVnaW5cblxuICAgIGlmKHBsdWdDbGFzcyAhPT0gdW5kZWZpbmVkICYmIHBsdWdDbGFzc1ttZXRob2RdICE9PSB1bmRlZmluZWQpey8vbWFrZSBzdXJlIGJvdGggdGhlIGNsYXNzIGFuZCBtZXRob2QgZXhpc3RcbiAgICAgIGlmKHRoaXMubGVuZ3RoID09PSAxKXsvL2lmIHRoZXJlJ3Mgb25seSBvbmUsIGNhbGwgaXQgZGlyZWN0bHkuXG4gICAgICAgICAgcGx1Z0NsYXNzW21ldGhvZF0uYXBwbHkocGx1Z0NsYXNzLCBhcmdzKTtcbiAgICAgIH1lbHNle1xuICAgICAgICB0aGlzLmVhY2goZnVuY3Rpb24oaSwgZWwpey8vb3RoZXJ3aXNlIGxvb3AgdGhyb3VnaCB0aGUgalF1ZXJ5IGNvbGxlY3Rpb24gYW5kIGludm9rZSB0aGUgbWV0aG9kIG9uIGVhY2hcbiAgICAgICAgICBwbHVnQ2xhc3NbbWV0aG9kXS5hcHBseSgkKGVsKS5kYXRhKCd6ZlBsdWdpbicpLCBhcmdzKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfWVsc2V7Ly9lcnJvciBmb3Igbm8gY2xhc3Mgb3Igbm8gbWV0aG9kXG4gICAgICB0aHJvdyBuZXcgUmVmZXJlbmNlRXJyb3IoXCJXZSdyZSBzb3JyeSwgJ1wiICsgbWV0aG9kICsgXCInIGlzIG5vdCBhbiBhdmFpbGFibGUgbWV0aG9kIGZvciBcIiArIChwbHVnQ2xhc3MgPyBmdW5jdGlvbk5hbWUocGx1Z0NsYXNzKSA6ICd0aGlzIGVsZW1lbnQnKSArICcuJyk7XG4gICAgfVxuICB9ZWxzZXsvL2Vycm9yIGZvciBpbnZhbGlkIGFyZ3VtZW50IHR5cGVcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBXZSdyZSBzb3JyeSwgJHt0eXBlfSBpcyBub3QgYSB2YWxpZCBwYXJhbWV0ZXIuIFlvdSBtdXN0IHVzZSBhIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIG1ldGhvZCB5b3Ugd2lzaCB0byBpbnZva2UuYCk7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG53aW5kb3cuRm91bmRhdGlvbiA9IEZvdW5kYXRpb247XG4kLmZuLmZvdW5kYXRpb24gPSBmb3VuZGF0aW9uO1xuXG4vLyBQb2x5ZmlsbCBmb3IgcmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4oZnVuY3Rpb24oKSB7XG4gIGlmICghRGF0ZS5ub3cgfHwgIXdpbmRvdy5EYXRlLm5vdylcbiAgICB3aW5kb3cuRGF0ZS5ub3cgPSBEYXRlLm5vdyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7IH07XG5cbiAgdmFyIHZlbmRvcnMgPSBbJ3dlYmtpdCcsICdtb3onXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZW5kb3JzLmxlbmd0aCAmJiAhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZTsgKytpKSB7XG4gICAgICB2YXIgdnAgPSB2ZW5kb3JzW2ldO1xuICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2cCsnUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ107XG4gICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSAod2luZG93W3ZwKydDYW5jZWxBbmltYXRpb25GcmFtZSddXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCB3aW5kb3dbdnArJ0NhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSddKTtcbiAgfVxuICBpZiAoL2lQKGFkfGhvbmV8b2QpLipPUyA2Ly50ZXN0KHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50KVxuICAgIHx8ICF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8ICF3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUpIHtcbiAgICB2YXIgbGFzdFRpbWUgPSAwO1xuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgdmFyIG5leHRUaW1lID0gTWF0aC5tYXgobGFzdFRpbWUgKyAxNiwgbm93KTtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IGNhbGxiYWNrKGxhc3RUaW1lID0gbmV4dFRpbWUpOyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICBuZXh0VGltZSAtIG5vdyk7XG4gICAgfTtcbiAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBjbGVhclRpbWVvdXQ7XG4gIH1cbiAgLyoqXG4gICAqIFBvbHlmaWxsIGZvciBwZXJmb3JtYW5jZS5ub3csIHJlcXVpcmVkIGJ5IHJBRlxuICAgKi9cbiAgaWYoIXdpbmRvdy5wZXJmb3JtYW5jZSB8fCAhd2luZG93LnBlcmZvcm1hbmNlLm5vdyl7XG4gICAgd2luZG93LnBlcmZvcm1hbmNlID0ge1xuICAgICAgc3RhcnQ6IERhdGUubm93KCksXG4gICAgICBub3c6IGZ1bmN0aW9uKCl7IHJldHVybiBEYXRlLm5vdygpIC0gdGhpcy5zdGFydDsgfVxuICAgIH07XG4gIH1cbn0pKCk7XG5pZiAoIUZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kKSB7XG4gIEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kID0gZnVuY3Rpb24ob1RoaXMpIHtcbiAgICBpZiAodHlwZW9mIHRoaXMgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIGNsb3Nlc3QgdGhpbmcgcG9zc2libGUgdG8gdGhlIEVDTUFTY3JpcHQgNVxuICAgICAgLy8gaW50ZXJuYWwgSXNDYWxsYWJsZSBmdW5jdGlvblxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgLSB3aGF0IGlzIHRyeWluZyB0byBiZSBib3VuZCBpcyBub3QgY2FsbGFibGUnKTtcbiAgICB9XG5cbiAgICB2YXIgYUFyZ3MgICA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSksXG4gICAgICAgIGZUb0JpbmQgPSB0aGlzLFxuICAgICAgICBmTk9QICAgID0gZnVuY3Rpb24oKSB7fSxcbiAgICAgICAgZkJvdW5kICA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBmVG9CaW5kLmFwcGx5KHRoaXMgaW5zdGFuY2VvZiBmTk9QXG4gICAgICAgICAgICAgICAgID8gdGhpc1xuICAgICAgICAgICAgICAgICA6IG9UaGlzLFxuICAgICAgICAgICAgICAgICBhQXJncy5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgICAgICB9O1xuXG4gICAgaWYgKHRoaXMucHJvdG90eXBlKSB7XG4gICAgICAvLyBuYXRpdmUgZnVuY3Rpb25zIGRvbid0IGhhdmUgYSBwcm90b3R5cGVcbiAgICAgIGZOT1AucHJvdG90eXBlID0gdGhpcy5wcm90b3R5cGU7XG4gICAgfVxuICAgIGZCb3VuZC5wcm90b3R5cGUgPSBuZXcgZk5PUCgpO1xuXG4gICAgcmV0dXJuIGZCb3VuZDtcbiAgfTtcbn1cbi8vIFBvbHlmaWxsIHRvIGdldCB0aGUgbmFtZSBvZiBhIGZ1bmN0aW9uIGluIElFOVxuZnVuY3Rpb24gZnVuY3Rpb25OYW1lKGZuKSB7XG4gIGlmIChGdW5jdGlvbi5wcm90b3R5cGUubmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdmFyIGZ1bmNOYW1lUmVnZXggPSAvZnVuY3Rpb25cXHMoW14oXXsxLH0pXFwoLztcbiAgICB2YXIgcmVzdWx0cyA9IChmdW5jTmFtZVJlZ2V4KS5leGVjKChmbikudG9TdHJpbmcoKSk7XG4gICAgcmV0dXJuIChyZXN1bHRzICYmIHJlc3VsdHMubGVuZ3RoID4gMSkgPyByZXN1bHRzWzFdLnRyaW0oKSA6IFwiXCI7XG4gIH1cbiAgZWxzZSBpZiAoZm4ucHJvdG90eXBlID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gZm4uY29uc3RydWN0b3IubmFtZTtcbiAgfVxuICBlbHNlIHtcbiAgICByZXR1cm4gZm4ucHJvdG90eXBlLmNvbnN0cnVjdG9yLm5hbWU7XG4gIH1cbn1cbmZ1bmN0aW9uIHBhcnNlVmFsdWUoc3RyKXtcbiAgaWYgKCd0cnVlJyA9PT0gc3RyKSByZXR1cm4gdHJ1ZTtcbiAgZWxzZSBpZiAoJ2ZhbHNlJyA9PT0gc3RyKSByZXR1cm4gZmFsc2U7XG4gIGVsc2UgaWYgKCFpc05hTihzdHIgKiAxKSkgcmV0dXJuIHBhcnNlRmxvYXQoc3RyKTtcbiAgcmV0dXJuIHN0cjtcbn1cbi8vIENvbnZlcnQgUGFzY2FsQ2FzZSB0byBrZWJhYi1jYXNlXG4vLyBUaGFuayB5b3U6IGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzg5NTU1ODBcbmZ1bmN0aW9uIGh5cGhlbmF0ZShzdHIpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC8oW2Etel0pKFtBLVpdKS9nLCAnJDEtJDInKS50b0xvd2VyQ2FzZSgpO1xufVxuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbkZvdW5kYXRpb24uQm94ID0ge1xuICBJbU5vdFRvdWNoaW5nWW91OiBJbU5vdFRvdWNoaW5nWW91LFxuICBHZXREaW1lbnNpb25zOiBHZXREaW1lbnNpb25zLFxuICBHZXRPZmZzZXRzOiBHZXRPZmZzZXRzXG59XG5cbi8qKlxuICogQ29tcGFyZXMgdGhlIGRpbWVuc2lvbnMgb2YgYW4gZWxlbWVudCB0byBhIGNvbnRhaW5lciBhbmQgZGV0ZXJtaW5lcyBjb2xsaXNpb24gZXZlbnRzIHdpdGggY29udGFpbmVyLlxuICogQGZ1bmN0aW9uXG4gKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gdGVzdCBmb3IgY29sbGlzaW9ucy5cbiAqIEBwYXJhbSB7alF1ZXJ5fSBwYXJlbnQgLSBqUXVlcnkgb2JqZWN0IHRvIHVzZSBhcyBib3VuZGluZyBjb250YWluZXIuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGxyT25seSAtIHNldCB0byB0cnVlIHRvIGNoZWNrIGxlZnQgYW5kIHJpZ2h0IHZhbHVlcyBvbmx5LlxuICogQHBhcmFtIHtCb29sZWFufSB0Yk9ubHkgLSBzZXQgdG8gdHJ1ZSB0byBjaGVjayB0b3AgYW5kIGJvdHRvbSB2YWx1ZXMgb25seS5cbiAqIEBkZWZhdWx0IGlmIG5vIHBhcmVudCBvYmplY3QgcGFzc2VkLCBkZXRlY3RzIGNvbGxpc2lvbnMgd2l0aCBgd2luZG93YC5cbiAqIEByZXR1cm5zIHtCb29sZWFufSAtIHRydWUgaWYgY29sbGlzaW9uIGZyZWUsIGZhbHNlIGlmIGEgY29sbGlzaW9uIGluIGFueSBkaXJlY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIEltTm90VG91Y2hpbmdZb3UoZWxlbWVudCwgcGFyZW50LCBsck9ubHksIHRiT25seSkge1xuICB2YXIgZWxlRGltcyA9IEdldERpbWVuc2lvbnMoZWxlbWVudCksXG4gICAgICB0b3AsIGJvdHRvbSwgbGVmdCwgcmlnaHQ7XG5cbiAgaWYgKHBhcmVudCkge1xuICAgIHZhciBwYXJEaW1zID0gR2V0RGltZW5zaW9ucyhwYXJlbnQpO1xuXG4gICAgYm90dG9tID0gKGVsZURpbXMub2Zmc2V0LnRvcCArIGVsZURpbXMuaGVpZ2h0IDw9IHBhckRpbXMuaGVpZ2h0ICsgcGFyRGltcy5vZmZzZXQudG9wKTtcbiAgICB0b3AgICAgPSAoZWxlRGltcy5vZmZzZXQudG9wID49IHBhckRpbXMub2Zmc2V0LnRvcCk7XG4gICAgbGVmdCAgID0gKGVsZURpbXMub2Zmc2V0LmxlZnQgPj0gcGFyRGltcy5vZmZzZXQubGVmdCk7XG4gICAgcmlnaHQgID0gKGVsZURpbXMub2Zmc2V0LmxlZnQgKyBlbGVEaW1zLndpZHRoIDw9IHBhckRpbXMud2lkdGggKyBwYXJEaW1zLm9mZnNldC5sZWZ0KTtcbiAgfVxuICBlbHNlIHtcbiAgICBib3R0b20gPSAoZWxlRGltcy5vZmZzZXQudG9wICsgZWxlRGltcy5oZWlnaHQgPD0gZWxlRGltcy53aW5kb3dEaW1zLmhlaWdodCArIGVsZURpbXMud2luZG93RGltcy5vZmZzZXQudG9wKTtcbiAgICB0b3AgICAgPSAoZWxlRGltcy5vZmZzZXQudG9wID49IGVsZURpbXMud2luZG93RGltcy5vZmZzZXQudG9wKTtcbiAgICBsZWZ0ICAgPSAoZWxlRGltcy5vZmZzZXQubGVmdCA+PSBlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LmxlZnQpO1xuICAgIHJpZ2h0ICA9IChlbGVEaW1zLm9mZnNldC5sZWZ0ICsgZWxlRGltcy53aWR0aCA8PSBlbGVEaW1zLndpbmRvd0RpbXMud2lkdGgpO1xuICB9XG5cbiAgdmFyIGFsbERpcnMgPSBbYm90dG9tLCB0b3AsIGxlZnQsIHJpZ2h0XTtcblxuICBpZiAobHJPbmx5KSB7XG4gICAgcmV0dXJuIGxlZnQgPT09IHJpZ2h0ID09PSB0cnVlO1xuICB9XG5cbiAgaWYgKHRiT25seSkge1xuICAgIHJldHVybiB0b3AgPT09IGJvdHRvbSA9PT0gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBhbGxEaXJzLmluZGV4T2YoZmFsc2UpID09PSAtMTtcbn07XG5cbi8qKlxuICogVXNlcyBuYXRpdmUgbWV0aG9kcyB0byByZXR1cm4gYW4gb2JqZWN0IG9mIGRpbWVuc2lvbiB2YWx1ZXMuXG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7alF1ZXJ5IHx8IEhUTUx9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IG9yIERPTSBlbGVtZW50IGZvciB3aGljaCB0byBnZXQgdGhlIGRpbWVuc2lvbnMuIENhbiBiZSBhbnkgZWxlbWVudCBvdGhlciB0aGF0IGRvY3VtZW50IG9yIHdpbmRvdy5cbiAqIEByZXR1cm5zIHtPYmplY3R9IC0gbmVzdGVkIG9iamVjdCBvZiBpbnRlZ2VyIHBpeGVsIHZhbHVlc1xuICogVE9ETyAtIGlmIGVsZW1lbnQgaXMgd2luZG93LCByZXR1cm4gb25seSB0aG9zZSB2YWx1ZXMuXG4gKi9cbmZ1bmN0aW9uIEdldERpbWVuc2lvbnMoZWxlbSwgdGVzdCl7XG4gIGVsZW0gPSBlbGVtLmxlbmd0aCA/IGVsZW1bMF0gOiBlbGVtO1xuXG4gIGlmIChlbGVtID09PSB3aW5kb3cgfHwgZWxlbSA9PT0gZG9jdW1lbnQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJJJ20gc29ycnksIERhdmUuIEknbSBhZnJhaWQgSSBjYW4ndCBkbyB0aGF0LlwiKTtcbiAgfVxuXG4gIHZhciByZWN0ID0gZWxlbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgIHBhclJlY3QgPSBlbGVtLnBhcmVudE5vZGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICB3aW5SZWN0ID0gZG9jdW1lbnQuYm9keS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgIHdpblkgPSB3aW5kb3cucGFnZVlPZmZzZXQsXG4gICAgICB3aW5YID0gd2luZG93LnBhZ2VYT2Zmc2V0O1xuXG4gIHJldHVybiB7XG4gICAgd2lkdGg6IHJlY3Qud2lkdGgsXG4gICAgaGVpZ2h0OiByZWN0LmhlaWdodCxcbiAgICBvZmZzZXQ6IHtcbiAgICAgIHRvcDogcmVjdC50b3AgKyB3aW5ZLFxuICAgICAgbGVmdDogcmVjdC5sZWZ0ICsgd2luWFxuICAgIH0sXG4gICAgcGFyZW50RGltczoge1xuICAgICAgd2lkdGg6IHBhclJlY3Qud2lkdGgsXG4gICAgICBoZWlnaHQ6IHBhclJlY3QuaGVpZ2h0LFxuICAgICAgb2Zmc2V0OiB7XG4gICAgICAgIHRvcDogcGFyUmVjdC50b3AgKyB3aW5ZLFxuICAgICAgICBsZWZ0OiBwYXJSZWN0LmxlZnQgKyB3aW5YXG4gICAgICB9XG4gICAgfSxcbiAgICB3aW5kb3dEaW1zOiB7XG4gICAgICB3aWR0aDogd2luUmVjdC53aWR0aCxcbiAgICAgIGhlaWdodDogd2luUmVjdC5oZWlnaHQsXG4gICAgICBvZmZzZXQ6IHtcbiAgICAgICAgdG9wOiB3aW5ZLFxuICAgICAgICBsZWZ0OiB3aW5YXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyBhbiBvYmplY3Qgb2YgdG9wIGFuZCBsZWZ0IGludGVnZXIgcGl4ZWwgdmFsdWVzIGZvciBkeW5hbWljYWxseSByZW5kZXJlZCBlbGVtZW50cyxcbiAqIHN1Y2ggYXM6IFRvb2x0aXAsIFJldmVhbCwgYW5kIERyb3Bkb3duXG4gKiBAZnVuY3Rpb25cbiAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCBmb3IgdGhlIGVsZW1lbnQgYmVpbmcgcG9zaXRpb25lZC5cbiAqIEBwYXJhbSB7alF1ZXJ5fSBhbmNob3IgLSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZWxlbWVudCdzIGFuY2hvciBwb2ludC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBwb3NpdGlvbiAtIGEgc3RyaW5nIHJlbGF0aW5nIHRvIHRoZSBkZXNpcmVkIHBvc2l0aW9uIG9mIHRoZSBlbGVtZW50LCByZWxhdGl2ZSB0byBpdCdzIGFuY2hvclxuICogQHBhcmFtIHtOdW1iZXJ9IHZPZmZzZXQgLSBpbnRlZ2VyIHBpeGVsIHZhbHVlIG9mIGRlc2lyZWQgdmVydGljYWwgc2VwYXJhdGlvbiBiZXR3ZWVuIGFuY2hvciBhbmQgZWxlbWVudC5cbiAqIEBwYXJhbSB7TnVtYmVyfSBoT2Zmc2V0IC0gaW50ZWdlciBwaXhlbCB2YWx1ZSBvZiBkZXNpcmVkIGhvcml6b250YWwgc2VwYXJhdGlvbiBiZXR3ZWVuIGFuY2hvciBhbmQgZWxlbWVudC5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNPdmVyZmxvdyAtIGlmIGEgY29sbGlzaW9uIGV2ZW50IGlzIGRldGVjdGVkLCBzZXRzIHRvIHRydWUgdG8gZGVmYXVsdCB0aGUgZWxlbWVudCB0byBmdWxsIHdpZHRoIC0gYW55IGRlc2lyZWQgb2Zmc2V0LlxuICogVE9ETyBhbHRlci9yZXdyaXRlIHRvIHdvcmsgd2l0aCBgZW1gIHZhbHVlcyBhcyB3ZWxsL2luc3RlYWQgb2YgcGl4ZWxzXG4gKi9cbmZ1bmN0aW9uIEdldE9mZnNldHMoZWxlbWVudCwgYW5jaG9yLCBwb3NpdGlvbiwgdk9mZnNldCwgaE9mZnNldCwgaXNPdmVyZmxvdykge1xuICB2YXIgJGVsZURpbXMgPSBHZXREaW1lbnNpb25zKGVsZW1lbnQpLFxuICAgICAgJGFuY2hvckRpbXMgPSBhbmNob3IgPyBHZXREaW1lbnNpb25zKGFuY2hvcikgOiBudWxsO1xuXG4gIHN3aXRjaCAocG9zaXRpb24pIHtcbiAgICBjYXNlICd0b3AnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogKEZvdW5kYXRpb24ucnRsKCkgPyAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCAtICRlbGVEaW1zLndpZHRoICsgJGFuY2hvckRpbXMud2lkdGggOiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCksXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcCAtICgkZWxlRGltcy5oZWlnaHQgKyB2T2Zmc2V0KVxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnbGVmdCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCAtICgkZWxlRGltcy53aWR0aCArIGhPZmZzZXQpLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3BcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3JpZ2h0JzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0ICsgJGFuY2hvckRpbXMud2lkdGggKyBoT2Zmc2V0LFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3BcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2NlbnRlciB0b3AnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogKCRhbmNob3JEaW1zLm9mZnNldC5sZWZ0ICsgKCRhbmNob3JEaW1zLndpZHRoIC8gMikpIC0gKCRlbGVEaW1zLndpZHRoIC8gMiksXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcCAtICgkZWxlRGltcy5oZWlnaHQgKyB2T2Zmc2V0KVxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2VudGVyIGJvdHRvbSc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiBpc092ZXJmbG93ID8gaE9mZnNldCA6ICgoJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAoJGFuY2hvckRpbXMud2lkdGggLyAyKSkgLSAoJGVsZURpbXMud2lkdGggLyAyKSksXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICRhbmNob3JEaW1zLmhlaWdodCArIHZPZmZzZXRcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2NlbnRlciBsZWZ0JzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0IC0gKCRlbGVEaW1zLndpZHRoICsgaE9mZnNldCksXG4gICAgICAgIHRvcDogKCRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAoJGFuY2hvckRpbXMuaGVpZ2h0IC8gMikpIC0gKCRlbGVEaW1zLmhlaWdodCAvIDIpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjZW50ZXIgcmlnaHQnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAkYW5jaG9yRGltcy53aWR0aCArIGhPZmZzZXQgKyAxLFxuICAgICAgICB0b3A6ICgkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgKCRhbmNob3JEaW1zLmhlaWdodCAvIDIpKSAtICgkZWxlRGltcy5oZWlnaHQgLyAyKVxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2VudGVyJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICgkZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC5sZWZ0ICsgKCRlbGVEaW1zLndpbmRvd0RpbXMud2lkdGggLyAyKSkgLSAoJGVsZURpbXMud2lkdGggLyAyKSxcbiAgICAgICAgdG9wOiAoJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQudG9wICsgKCRlbGVEaW1zLndpbmRvd0RpbXMuaGVpZ2h0IC8gMikpIC0gKCRlbGVEaW1zLmhlaWdodCAvIDIpXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdyZXZlYWwnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogKCRlbGVEaW1zLndpbmRvd0RpbXMud2lkdGggLSAkZWxlRGltcy53aWR0aCkgLyAyLFxuICAgICAgICB0b3A6ICRlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LnRvcCArIHZPZmZzZXRcbiAgICAgIH1cbiAgICBjYXNlICdyZXZlYWwgZnVsbCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC5sZWZ0LFxuICAgICAgICB0b3A6ICRlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LnRvcFxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnbGVmdCBib3R0b20nOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQsXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICRhbmNob3JEaW1zLmhlaWdodCArIHZPZmZzZXRcbiAgICAgIH07XG4gICAgICBicmVhaztcbiAgICBjYXNlICdyaWdodCBib3R0b20nOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgKyAkYW5jaG9yRGltcy53aWR0aCArIGhPZmZzZXQgLSAkZWxlRGltcy53aWR0aCxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgJGFuY2hvckRpbXMuaGVpZ2h0ICsgdk9mZnNldFxuICAgICAgfTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoRm91bmRhdGlvbi5ydGwoKSA/ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0IC0gJGVsZURpbXMud2lkdGggKyAkYW5jaG9yRGltcy53aWR0aCA6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0ICsgaE9mZnNldCksXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICRhbmNob3JEaW1zLmhlaWdodCArIHZPZmZzZXRcbiAgICAgIH1cbiAgfVxufVxuXG59KGpRdWVyeSk7XG4iLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqIFRoaXMgdXRpbCB3YXMgY3JlYXRlZCBieSBNYXJpdXMgT2xiZXJ0eiAqXG4gKiBQbGVhc2UgdGhhbmsgTWFyaXVzIG9uIEdpdEh1YiAvb3dsYmVydHogKlxuICogb3IgdGhlIHdlYiBodHRwOi8vd3d3Lm1hcml1c29sYmVydHouZGUvICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4ndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbmNvbnN0IGtleUNvZGVzID0ge1xuICA5OiAnVEFCJyxcbiAgMTM6ICdFTlRFUicsXG4gIDI3OiAnRVNDQVBFJyxcbiAgMzI6ICdTUEFDRScsXG4gIDM3OiAnQVJST1dfTEVGVCcsXG4gIDM4OiAnQVJST1dfVVAnLFxuICAzOTogJ0FSUk9XX1JJR0hUJyxcbiAgNDA6ICdBUlJPV19ET1dOJ1xufVxuXG52YXIgY29tbWFuZHMgPSB7fVxuXG52YXIgS2V5Ym9hcmQgPSB7XG4gIGtleXM6IGdldEtleUNvZGVzKGtleUNvZGVzKSxcblxuICAvKipcbiAgICogUGFyc2VzIHRoZSAoa2V5Ym9hcmQpIGV2ZW50IGFuZCByZXR1cm5zIGEgU3RyaW5nIHRoYXQgcmVwcmVzZW50cyBpdHMga2V5XG4gICAqIENhbiBiZSB1c2VkIGxpa2UgRm91bmRhdGlvbi5wYXJzZUtleShldmVudCkgPT09IEZvdW5kYXRpb24ua2V5cy5TUEFDRVxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCAtIHRoZSBldmVudCBnZW5lcmF0ZWQgYnkgdGhlIGV2ZW50IGhhbmRsZXJcbiAgICogQHJldHVybiBTdHJpbmcga2V5IC0gU3RyaW5nIHRoYXQgcmVwcmVzZW50cyB0aGUga2V5IHByZXNzZWRcbiAgICovXG4gIHBhcnNlS2V5KGV2ZW50KSB7XG4gICAgdmFyIGtleSA9IGtleUNvZGVzW2V2ZW50LndoaWNoIHx8IGV2ZW50LmtleUNvZGVdIHx8IFN0cmluZy5mcm9tQ2hhckNvZGUoZXZlbnQud2hpY2gpLnRvVXBwZXJDYXNlKCk7XG5cbiAgICAvLyBSZW1vdmUgdW4tcHJpbnRhYmxlIGNoYXJhY3RlcnMsIGUuZy4gZm9yIGBmcm9tQ2hhckNvZGVgIGNhbGxzIGZvciBDVFJMIG9ubHkgZXZlbnRzXG4gICAga2V5ID0ga2V5LnJlcGxhY2UoL1xcVysvLCAnJyk7XG5cbiAgICBpZiAoZXZlbnQuc2hpZnRLZXkpIGtleSA9IGBTSElGVF8ke2tleX1gO1xuICAgIGlmIChldmVudC5jdHJsS2V5KSBrZXkgPSBgQ1RSTF8ke2tleX1gO1xuICAgIGlmIChldmVudC5hbHRLZXkpIGtleSA9IGBBTFRfJHtrZXl9YDtcblxuICAgIC8vIFJlbW92ZSB0cmFpbGluZyB1bmRlcnNjb3JlLCBpbiBjYXNlIG9ubHkgbW9kaWZpZXJzIHdlcmUgdXNlZCAoZS5nLiBvbmx5IGBDVFJMX0FMVGApXG4gICAga2V5ID0ga2V5LnJlcGxhY2UoL18kLywgJycpO1xuXG4gICAgcmV0dXJuIGtleTtcbiAgfSxcblxuICAvKipcbiAgICogSGFuZGxlcyB0aGUgZ2l2ZW4gKGtleWJvYXJkKSBldmVudFxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudCAtIHRoZSBldmVudCBnZW5lcmF0ZWQgYnkgdGhlIGV2ZW50IGhhbmRsZXJcbiAgICogQHBhcmFtIHtTdHJpbmd9IGNvbXBvbmVudCAtIEZvdW5kYXRpb24gY29tcG9uZW50J3MgbmFtZSwgZS5nLiBTbGlkZXIgb3IgUmV2ZWFsXG4gICAqIEBwYXJhbSB7T2JqZWN0c30gZnVuY3Rpb25zIC0gY29sbGVjdGlvbiBvZiBmdW5jdGlvbnMgdGhhdCBhcmUgdG8gYmUgZXhlY3V0ZWRcbiAgICovXG4gIGhhbmRsZUtleShldmVudCwgY29tcG9uZW50LCBmdW5jdGlvbnMpIHtcbiAgICB2YXIgY29tbWFuZExpc3QgPSBjb21tYW5kc1tjb21wb25lbnRdLFxuICAgICAga2V5Q29kZSA9IHRoaXMucGFyc2VLZXkoZXZlbnQpLFxuICAgICAgY21kcyxcbiAgICAgIGNvbW1hbmQsXG4gICAgICBmbjtcblxuICAgIGlmICghY29tbWFuZExpc3QpIHJldHVybiBjb25zb2xlLndhcm4oJ0NvbXBvbmVudCBub3QgZGVmaW5lZCEnKTtcblxuICAgIGlmICh0eXBlb2YgY29tbWFuZExpc3QubHRyID09PSAndW5kZWZpbmVkJykgeyAvLyB0aGlzIGNvbXBvbmVudCBkb2VzIG5vdCBkaWZmZXJlbnRpYXRlIGJldHdlZW4gbHRyIGFuZCBydGxcbiAgICAgICAgY21kcyA9IGNvbW1hbmRMaXN0OyAvLyB1c2UgcGxhaW4gbGlzdFxuICAgIH0gZWxzZSB7IC8vIG1lcmdlIGx0ciBhbmQgcnRsOiBpZiBkb2N1bWVudCBpcyBydGwsIHJ0bCBvdmVyd3JpdGVzIGx0ciBhbmQgdmljZSB2ZXJzYVxuICAgICAgICBpZiAoRm91bmRhdGlvbi5ydGwoKSkgY21kcyA9ICQuZXh0ZW5kKHt9LCBjb21tYW5kTGlzdC5sdHIsIGNvbW1hbmRMaXN0LnJ0bCk7XG5cbiAgICAgICAgZWxzZSBjbWRzID0gJC5leHRlbmQoe30sIGNvbW1hbmRMaXN0LnJ0bCwgY29tbWFuZExpc3QubHRyKTtcbiAgICB9XG4gICAgY29tbWFuZCA9IGNtZHNba2V5Q29kZV07XG5cbiAgICBmbiA9IGZ1bmN0aW9uc1tjb21tYW5kXTtcbiAgICBpZiAoZm4gJiYgdHlwZW9mIGZuID09PSAnZnVuY3Rpb24nKSB7IC8vIGV4ZWN1dGUgZnVuY3Rpb24gIGlmIGV4aXN0c1xuICAgICAgdmFyIHJldHVyblZhbHVlID0gZm4uYXBwbHkoKTtcbiAgICAgIGlmIChmdW5jdGlvbnMuaGFuZGxlZCB8fCB0eXBlb2YgZnVuY3Rpb25zLmhhbmRsZWQgPT09ICdmdW5jdGlvbicpIHsgLy8gZXhlY3V0ZSBmdW5jdGlvbiB3aGVuIGV2ZW50IHdhcyBoYW5kbGVkXG4gICAgICAgICAgZnVuY3Rpb25zLmhhbmRsZWQocmV0dXJuVmFsdWUpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoZnVuY3Rpb25zLnVuaGFuZGxlZCB8fCB0eXBlb2YgZnVuY3Rpb25zLnVuaGFuZGxlZCA9PT0gJ2Z1bmN0aW9uJykgeyAvLyBleGVjdXRlIGZ1bmN0aW9uIHdoZW4gZXZlbnQgd2FzIG5vdCBoYW5kbGVkXG4gICAgICAgICAgZnVuY3Rpb25zLnVuaGFuZGxlZCgpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogRmluZHMgYWxsIGZvY3VzYWJsZSBlbGVtZW50cyB3aXRoaW4gdGhlIGdpdmVuIGAkZWxlbWVudGBcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBzZWFyY2ggd2l0aGluXG4gICAqIEByZXR1cm4ge2pRdWVyeX0gJGZvY3VzYWJsZSAtIGFsbCBmb2N1c2FibGUgZWxlbWVudHMgd2l0aGluIGAkZWxlbWVudGBcbiAgICovXG4gIGZpbmRGb2N1c2FibGUoJGVsZW1lbnQpIHtcbiAgICBpZighJGVsZW1lbnQpIHtyZXR1cm4gZmFsc2U7IH1cbiAgICByZXR1cm4gJGVsZW1lbnQuZmluZCgnYVtocmVmXSwgYXJlYVtocmVmXSwgaW5wdXQ6bm90KFtkaXNhYmxlZF0pLCBzZWxlY3Q6bm90KFtkaXNhYmxlZF0pLCB0ZXh0YXJlYTpub3QoW2Rpc2FibGVkXSksIGJ1dHRvbjpub3QoW2Rpc2FibGVkXSksIGlmcmFtZSwgb2JqZWN0LCBlbWJlZCwgKlt0YWJpbmRleF0sICpbY29udGVudGVkaXRhYmxlXScpLmZpbHRlcihmdW5jdGlvbigpIHtcbiAgICAgIGlmICghJCh0aGlzKS5pcygnOnZpc2libGUnKSB8fCAkKHRoaXMpLmF0dHIoJ3RhYmluZGV4JykgPCAwKSB7IHJldHVybiBmYWxzZTsgfSAvL29ubHkgaGF2ZSB2aXNpYmxlIGVsZW1lbnRzIGFuZCB0aG9zZSB0aGF0IGhhdmUgYSB0YWJpbmRleCBncmVhdGVyIG9yIGVxdWFsIDBcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBjb21wb25lbnQgbmFtZSBuYW1lXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBjb21wb25lbnQgLSBGb3VuZGF0aW9uIGNvbXBvbmVudCwgZS5nLiBTbGlkZXIgb3IgUmV2ZWFsXG4gICAqIEByZXR1cm4gU3RyaW5nIGNvbXBvbmVudE5hbWVcbiAgICovXG5cbiAgcmVnaXN0ZXIoY29tcG9uZW50TmFtZSwgY21kcykge1xuICAgIGNvbW1hbmRzW2NvbXBvbmVudE5hbWVdID0gY21kcztcbiAgfSwgIFxuXG4gIC8qKlxuICAgKiBUcmFwcyB0aGUgZm9jdXMgaW4gdGhlIGdpdmVuIGVsZW1lbnQuXG4gICAqIEBwYXJhbSAge2pRdWVyeX0gJGVsZW1lbnQgIGpRdWVyeSBvYmplY3QgdG8gdHJhcCB0aGUgZm91Y3MgaW50by5cbiAgICovXG4gIHRyYXBGb2N1cygkZWxlbWVudCkge1xuICAgIHZhciAkZm9jdXNhYmxlID0gRm91bmRhdGlvbi5LZXlib2FyZC5maW5kRm9jdXNhYmxlKCRlbGVtZW50KSxcbiAgICAgICAgJGZpcnN0Rm9jdXNhYmxlID0gJGZvY3VzYWJsZS5lcSgwKSxcbiAgICAgICAgJGxhc3RGb2N1c2FibGUgPSAkZm9jdXNhYmxlLmVxKC0xKTtcblxuICAgICRlbGVtZW50Lm9uKCdrZXlkb3duLnpmLnRyYXBmb2N1cycsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICBpZiAoZXZlbnQudGFyZ2V0ID09PSAkbGFzdEZvY3VzYWJsZVswXSAmJiBGb3VuZGF0aW9uLktleWJvYXJkLnBhcnNlS2V5KGV2ZW50KSA9PT0gJ1RBQicpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgJGZpcnN0Rm9jdXNhYmxlLmZvY3VzKCk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChldmVudC50YXJnZXQgPT09ICRmaXJzdEZvY3VzYWJsZVswXSAmJiBGb3VuZGF0aW9uLktleWJvYXJkLnBhcnNlS2V5KGV2ZW50KSA9PT0gJ1NISUZUX1RBQicpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgJGxhc3RGb2N1c2FibGUuZm9jdXMoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgLyoqXG4gICAqIFJlbGVhc2VzIHRoZSB0cmFwcGVkIGZvY3VzIGZyb20gdGhlIGdpdmVuIGVsZW1lbnQuXG4gICAqIEBwYXJhbSAge2pRdWVyeX0gJGVsZW1lbnQgIGpRdWVyeSBvYmplY3QgdG8gcmVsZWFzZSB0aGUgZm9jdXMgZm9yLlxuICAgKi9cbiAgcmVsZWFzZUZvY3VzKCRlbGVtZW50KSB7XG4gICAgJGVsZW1lbnQub2ZmKCdrZXlkb3duLnpmLnRyYXBmb2N1cycpO1xuICB9XG59XG5cbi8qXG4gKiBDb25zdGFudHMgZm9yIGVhc2llciBjb21wYXJpbmcuXG4gKiBDYW4gYmUgdXNlZCBsaWtlIEZvdW5kYXRpb24ucGFyc2VLZXkoZXZlbnQpID09PSBGb3VuZGF0aW9uLmtleXMuU1BBQ0VcbiAqL1xuZnVuY3Rpb24gZ2V0S2V5Q29kZXMoa2NzKSB7XG4gIHZhciBrID0ge307XG4gIGZvciAodmFyIGtjIGluIGtjcykga1trY3Nba2NdXSA9IGtjc1trY107XG4gIHJldHVybiBrO1xufVxuXG5Gb3VuZGF0aW9uLktleWJvYXJkID0gS2V5Ym9hcmQ7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLy8gRGVmYXVsdCBzZXQgb2YgbWVkaWEgcXVlcmllc1xuY29uc3QgZGVmYXVsdFF1ZXJpZXMgPSB7XG4gICdkZWZhdWx0JyA6ICdvbmx5IHNjcmVlbicsXG4gIGxhbmRzY2FwZSA6ICdvbmx5IHNjcmVlbiBhbmQgKG9yaWVudGF0aW9uOiBsYW5kc2NhcGUpJyxcbiAgcG9ydHJhaXQgOiAnb25seSBzY3JlZW4gYW5kIChvcmllbnRhdGlvbjogcG9ydHJhaXQpJyxcbiAgcmV0aW5hIDogJ29ubHkgc2NyZWVuIGFuZCAoLXdlYmtpdC1taW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwnICtcbiAgICAnb25seSBzY3JlZW4gYW5kIChtaW4tLW1vei1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCcgK1xuICAgICdvbmx5IHNjcmVlbiBhbmQgKC1vLW1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIvMSksJyArXG4gICAgJ29ubHkgc2NyZWVuIGFuZCAobWluLWRldmljZS1waXhlbC1yYXRpbzogMiksJyArXG4gICAgJ29ubHkgc2NyZWVuIGFuZCAobWluLXJlc29sdXRpb246IDE5MmRwaSksJyArXG4gICAgJ29ubHkgc2NyZWVuIGFuZCAobWluLXJlc29sdXRpb246IDJkcHB4KSdcbn07XG5cbnZhciBNZWRpYVF1ZXJ5ID0ge1xuICBxdWVyaWVzOiBbXSxcblxuICBjdXJyZW50OiAnJyxcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIG1lZGlhIHF1ZXJ5IGhlbHBlciwgYnkgZXh0cmFjdGluZyB0aGUgYnJlYWtwb2ludCBsaXN0IGZyb20gdGhlIENTUyBhbmQgYWN0aXZhdGluZyB0aGUgYnJlYWtwb2ludCB3YXRjaGVyLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZXh0cmFjdGVkU3R5bGVzID0gJCgnLmZvdW5kYXRpb24tbXEnKS5jc3MoJ2ZvbnQtZmFtaWx5Jyk7XG4gICAgdmFyIG5hbWVkUXVlcmllcztcblxuICAgIG5hbWVkUXVlcmllcyA9IHBhcnNlU3R5bGVUb09iamVjdChleHRyYWN0ZWRTdHlsZXMpO1xuXG4gICAgZm9yICh2YXIga2V5IGluIG5hbWVkUXVlcmllcykge1xuICAgICAgaWYobmFtZWRRdWVyaWVzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgc2VsZi5xdWVyaWVzLnB1c2goe1xuICAgICAgICAgIG5hbWU6IGtleSxcbiAgICAgICAgICB2YWx1ZTogYG9ubHkgc2NyZWVuIGFuZCAobWluLXdpZHRoOiAke25hbWVkUXVlcmllc1trZXldfSlgXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY3VycmVudCA9IHRoaXMuX2dldEN1cnJlbnRTaXplKCk7XG5cbiAgICB0aGlzLl93YXRjaGVyKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGUgc2NyZWVuIGlzIGF0IGxlYXN0IGFzIHdpZGUgYXMgYSBicmVha3BvaW50LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtTdHJpbmd9IHNpemUgLSBOYW1lIG9mIHRoZSBicmVha3BvaW50IHRvIGNoZWNrLlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gYHRydWVgIGlmIHRoZSBicmVha3BvaW50IG1hdGNoZXMsIGBmYWxzZWAgaWYgaXQncyBzbWFsbGVyLlxuICAgKi9cbiAgYXRMZWFzdChzaXplKSB7XG4gICAgdmFyIHF1ZXJ5ID0gdGhpcy5nZXQoc2l6ZSk7XG5cbiAgICBpZiAocXVlcnkpIHtcbiAgICAgIHJldHVybiB3aW5kb3cubWF0Y2hNZWRpYShxdWVyeSkubWF0Y2hlcztcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGUgc2NyZWVuIG1hdGNoZXMgdG8gYSBicmVha3BvaW50LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtTdHJpbmd9IHNpemUgLSBOYW1lIG9mIHRoZSBicmVha3BvaW50IHRvIGNoZWNrLCBlaXRoZXIgJ3NtYWxsIG9ubHknIG9yICdzbWFsbCcuIE9taXR0aW5nICdvbmx5JyBmYWxscyBiYWNrIHRvIHVzaW5nIGF0TGVhc3QoKSBtZXRob2QuXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBgdHJ1ZWAgaWYgdGhlIGJyZWFrcG9pbnQgbWF0Y2hlcywgYGZhbHNlYCBpZiBpdCBkb2VzIG5vdC5cbiAgICovXG4gIGlzKHNpemUpIHtcbiAgICBzaXplID0gc2l6ZS50cmltKCkuc3BsaXQoJyAnKTtcbiAgICBpZihzaXplLmxlbmd0aCA+IDEgJiYgc2l6ZVsxXSA9PT0gJ29ubHknKSB7XG4gICAgICBpZihzaXplWzBdID09PSB0aGlzLl9nZXRDdXJyZW50U2l6ZSgpKSByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuYXRMZWFzdChzaXplWzBdKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBtZWRpYSBxdWVyeSBvZiBhIGJyZWFrcG9pbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2l6ZSAtIE5hbWUgb2YgdGhlIGJyZWFrcG9pbnQgdG8gZ2V0LlxuICAgKiBAcmV0dXJucyB7U3RyaW5nfG51bGx9IC0gVGhlIG1lZGlhIHF1ZXJ5IG9mIHRoZSBicmVha3BvaW50LCBvciBgbnVsbGAgaWYgdGhlIGJyZWFrcG9pbnQgZG9lc24ndCBleGlzdC5cbiAgICovXG4gIGdldChzaXplKSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLnF1ZXJpZXMpIHtcbiAgICAgIGlmKHRoaXMucXVlcmllcy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICB2YXIgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbaV07XG4gICAgICAgIGlmIChzaXplID09PSBxdWVyeS5uYW1lKSByZXR1cm4gcXVlcnkudmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGN1cnJlbnQgYnJlYWtwb2ludCBuYW1lIGJ5IHRlc3RpbmcgZXZlcnkgYnJlYWtwb2ludCBhbmQgcmV0dXJuaW5nIHRoZSBsYXN0IG9uZSB0byBtYXRjaCAodGhlIGJpZ2dlc3Qgb25lKS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGN1cnJlbnQgYnJlYWtwb2ludC5cbiAgICovXG4gIF9nZXRDdXJyZW50U2l6ZSgpIHtcbiAgICB2YXIgbWF0Y2hlZDtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5xdWVyaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbaV07XG5cbiAgICAgIGlmICh3aW5kb3cubWF0Y2hNZWRpYShxdWVyeS52YWx1ZSkubWF0Y2hlcykge1xuICAgICAgICBtYXRjaGVkID0gcXVlcnk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBtYXRjaGVkID09PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIG1hdGNoZWQubmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG1hdGNoZWQ7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBBY3RpdmF0ZXMgdGhlIGJyZWFrcG9pbnQgd2F0Y2hlciwgd2hpY2ggZmlyZXMgYW4gZXZlbnQgb24gdGhlIHdpbmRvdyB3aGVuZXZlciB0aGUgYnJlYWtwb2ludCBjaGFuZ2VzLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF93YXRjaGVyKCkge1xuICAgICQod2luZG93KS5vbigncmVzaXplLnpmLm1lZGlhcXVlcnknLCAoKSA9PiB7XG4gICAgICB2YXIgbmV3U2l6ZSA9IHRoaXMuX2dldEN1cnJlbnRTaXplKCksIGN1cnJlbnRTaXplID0gdGhpcy5jdXJyZW50O1xuXG4gICAgICBpZiAobmV3U2l6ZSAhPT0gY3VycmVudFNpemUpIHtcbiAgICAgICAgLy8gQ2hhbmdlIHRoZSBjdXJyZW50IG1lZGlhIHF1ZXJ5XG4gICAgICAgIHRoaXMuY3VycmVudCA9IG5ld1NpemU7XG5cbiAgICAgICAgLy8gQnJvYWRjYXN0IHRoZSBtZWRpYSBxdWVyeSBjaGFuZ2Ugb24gdGhlIHdpbmRvd1xuICAgICAgICAkKHdpbmRvdykudHJpZ2dlcignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgW25ld1NpemUsIGN1cnJlbnRTaXplXSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn07XG5cbkZvdW5kYXRpb24uTWVkaWFRdWVyeSA9IE1lZGlhUXVlcnk7XG5cbi8vIG1hdGNoTWVkaWEoKSBwb2x5ZmlsbCAtIFRlc3QgYSBDU1MgbWVkaWEgdHlwZS9xdWVyeSBpbiBKUy5cbi8vIEF1dGhvcnMgJiBjb3B5cmlnaHQgKGMpIDIwMTI6IFNjb3R0IEplaGwsIFBhdWwgSXJpc2gsIE5pY2hvbGFzIFpha2FzLCBEYXZpZCBLbmlnaHQuIER1YWwgTUlUL0JTRCBsaWNlbnNlXG53aW5kb3cubWF0Y2hNZWRpYSB8fCAod2luZG93Lm1hdGNoTWVkaWEgPSBmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8vIEZvciBicm93c2VycyB0aGF0IHN1cHBvcnQgbWF0Y2hNZWRpdW0gYXBpIHN1Y2ggYXMgSUUgOSBhbmQgd2Via2l0XG4gIHZhciBzdHlsZU1lZGlhID0gKHdpbmRvdy5zdHlsZU1lZGlhIHx8IHdpbmRvdy5tZWRpYSk7XG5cbiAgLy8gRm9yIHRob3NlIHRoYXQgZG9uJ3Qgc3VwcG9ydCBtYXRjaE1lZGl1bVxuICBpZiAoIXN0eWxlTWVkaWEpIHtcbiAgICB2YXIgc3R5bGUgICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyksXG4gICAgc2NyaXB0ICAgICAgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0JylbMF0sXG4gICAgaW5mbyAgICAgICAgPSBudWxsO1xuXG4gICAgc3R5bGUudHlwZSAgPSAndGV4dC9jc3MnO1xuICAgIHN0eWxlLmlkICAgID0gJ21hdGNobWVkaWFqcy10ZXN0JztcblxuICAgIHNjcmlwdCAmJiBzY3JpcHQucGFyZW50Tm9kZSAmJiBzY3JpcHQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoc3R5bGUsIHNjcmlwdCk7XG5cbiAgICAvLyAnc3R5bGUuY3VycmVudFN0eWxlJyBpcyB1c2VkIGJ5IElFIDw9IDggYW5kICd3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZScgZm9yIGFsbCBvdGhlciBicm93c2Vyc1xuICAgIGluZm8gPSAoJ2dldENvbXB1dGVkU3R5bGUnIGluIHdpbmRvdykgJiYgd2luZG93LmdldENvbXB1dGVkU3R5bGUoc3R5bGUsIG51bGwpIHx8IHN0eWxlLmN1cnJlbnRTdHlsZTtcblxuICAgIHN0eWxlTWVkaWEgPSB7XG4gICAgICBtYXRjaE1lZGl1bShtZWRpYSkge1xuICAgICAgICB2YXIgdGV4dCA9IGBAbWVkaWEgJHttZWRpYX17ICNtYXRjaG1lZGlhanMtdGVzdCB7IHdpZHRoOiAxcHg7IH0gfWA7XG5cbiAgICAgICAgLy8gJ3N0eWxlLnN0eWxlU2hlZXQnIGlzIHVzZWQgYnkgSUUgPD0gOCBhbmQgJ3N0eWxlLnRleHRDb250ZW50JyBmb3IgYWxsIG90aGVyIGJyb3dzZXJzXG4gICAgICAgIGlmIChzdHlsZS5zdHlsZVNoZWV0KSB7XG4gICAgICAgICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gdGV4dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHlsZS50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUZXN0IGlmIG1lZGlhIHF1ZXJ5IGlzIHRydWUgb3IgZmFsc2VcbiAgICAgICAgcmV0dXJuIGluZm8ud2lkdGggPT09ICcxcHgnO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbihtZWRpYSkge1xuICAgIHJldHVybiB7XG4gICAgICBtYXRjaGVzOiBzdHlsZU1lZGlhLm1hdGNoTWVkaXVtKG1lZGlhIHx8ICdhbGwnKSxcbiAgICAgIG1lZGlhOiBtZWRpYSB8fCAnYWxsJ1xuICAgIH07XG4gIH1cbn0oKSk7XG5cbi8vIFRoYW5rIHlvdTogaHR0cHM6Ly9naXRodWIuY29tL3NpbmRyZXNvcmh1cy9xdWVyeS1zdHJpbmdcbmZ1bmN0aW9uIHBhcnNlU3R5bGVUb09iamVjdChzdHIpIHtcbiAgdmFyIHN0eWxlT2JqZWN0ID0ge307XG5cbiAgaWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHN0eWxlT2JqZWN0O1xuICB9XG5cbiAgc3RyID0gc3RyLnRyaW0oKS5zbGljZSgxLCAtMSk7IC8vIGJyb3dzZXJzIHJlLXF1b3RlIHN0cmluZyBzdHlsZSB2YWx1ZXNcblxuICBpZiAoIXN0cikge1xuICAgIHJldHVybiBzdHlsZU9iamVjdDtcbiAgfVxuXG4gIHN0eWxlT2JqZWN0ID0gc3RyLnNwbGl0KCcmJykucmVkdWNlKGZ1bmN0aW9uKHJldCwgcGFyYW0pIHtcbiAgICB2YXIgcGFydHMgPSBwYXJhbS5yZXBsYWNlKC9cXCsvZywgJyAnKS5zcGxpdCgnPScpO1xuICAgIHZhciBrZXkgPSBwYXJ0c1swXTtcbiAgICB2YXIgdmFsID0gcGFydHNbMV07XG4gICAga2V5ID0gZGVjb2RlVVJJQ29tcG9uZW50KGtleSk7XG5cbiAgICAvLyBtaXNzaW5nIGA9YCBzaG91bGQgYmUgYG51bGxgOlxuICAgIC8vIGh0dHA6Ly93My5vcmcvVFIvMjAxMi9XRC11cmwtMjAxMjA1MjQvI2NvbGxlY3QtdXJsLXBhcmFtZXRlcnNcbiAgICB2YWwgPSB2YWwgPT09IHVuZGVmaW5lZCA/IG51bGwgOiBkZWNvZGVVUklDb21wb25lbnQodmFsKTtcblxuICAgIGlmICghcmV0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgIHJldFtrZXldID0gdmFsO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShyZXRba2V5XSkpIHtcbiAgICAgIHJldFtrZXldLnB1c2godmFsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0W2tleV0gPSBbcmV0W2tleV0sIHZhbF07XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH0sIHt9KTtcblxuICByZXR1cm4gc3R5bGVPYmplY3Q7XG59XG5cbkZvdW5kYXRpb24uTWVkaWFRdWVyeSA9IE1lZGlhUXVlcnk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBNb3Rpb24gbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLm1vdGlvblxuICovXG5cbmNvbnN0IGluaXRDbGFzc2VzICAgPSBbJ211aS1lbnRlcicsICdtdWktbGVhdmUnXTtcbmNvbnN0IGFjdGl2ZUNsYXNzZXMgPSBbJ211aS1lbnRlci1hY3RpdmUnLCAnbXVpLWxlYXZlLWFjdGl2ZSddO1xuXG5jb25zdCBNb3Rpb24gPSB7XG4gIGFuaW1hdGVJbjogZnVuY3Rpb24oZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICAgIGFuaW1hdGUodHJ1ZSwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYik7XG4gIH0sXG5cbiAgYW5pbWF0ZU91dDogZnVuY3Rpb24oZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICAgIGFuaW1hdGUoZmFsc2UsIGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpO1xuICB9XG59XG5cbmZ1bmN0aW9uIE1vdmUoZHVyYXRpb24sIGVsZW0sIGZuKXtcbiAgdmFyIGFuaW0sIHByb2csIHN0YXJ0ID0gbnVsbDtcbiAgLy8gY29uc29sZS5sb2coJ2NhbGxlZCcpO1xuXG4gIGlmIChkdXJhdGlvbiA9PT0gMCkge1xuICAgIGZuLmFwcGx5KGVsZW0pO1xuICAgIGVsZW0udHJpZ2dlcignZmluaXNoZWQuemYuYW5pbWF0ZScsIFtlbGVtXSkudHJpZ2dlckhhbmRsZXIoJ2ZpbmlzaGVkLnpmLmFuaW1hdGUnLCBbZWxlbV0pO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1vdmUodHMpe1xuICAgIGlmKCFzdGFydCkgc3RhcnQgPSB0cztcbiAgICAvLyBjb25zb2xlLmxvZyhzdGFydCwgdHMpO1xuICAgIHByb2cgPSB0cyAtIHN0YXJ0O1xuICAgIGZuLmFwcGx5KGVsZW0pO1xuXG4gICAgaWYocHJvZyA8IGR1cmF0aW9uKXsgYW5pbSA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUobW92ZSwgZWxlbSk7IH1cbiAgICBlbHNle1xuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKGFuaW0pO1xuICAgICAgZWxlbS50cmlnZ2VyKCdmaW5pc2hlZC56Zi5hbmltYXRlJywgW2VsZW1dKS50cmlnZ2VySGFuZGxlcignZmluaXNoZWQuemYuYW5pbWF0ZScsIFtlbGVtXSk7XG4gICAgfVxuICB9XG4gIGFuaW0gPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKG1vdmUpO1xufVxuXG4vKipcbiAqIEFuaW1hdGVzIGFuIGVsZW1lbnQgaW4gb3Igb3V0IHVzaW5nIGEgQ1NTIHRyYW5zaXRpb24gY2xhc3MuXG4gKiBAZnVuY3Rpb25cbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGlzSW4gLSBEZWZpbmVzIGlmIHRoZSBhbmltYXRpb24gaXMgaW4gb3Igb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb3IgSFRNTCBvYmplY3QgdG8gYW5pbWF0ZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBhbmltYXRpb24gLSBDU1MgY2xhc3MgdG8gdXNlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBDYWxsYmFjayB0byBydW4gd2hlbiBhbmltYXRpb24gaXMgZmluaXNoZWQuXG4gKi9cbmZ1bmN0aW9uIGFuaW1hdGUoaXNJbiwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICBlbGVtZW50ID0gJChlbGVtZW50KS5lcSgwKTtcblxuICBpZiAoIWVsZW1lbnQubGVuZ3RoKSByZXR1cm47XG5cbiAgdmFyIGluaXRDbGFzcyA9IGlzSW4gPyBpbml0Q2xhc3Nlc1swXSA6IGluaXRDbGFzc2VzWzFdO1xuICB2YXIgYWN0aXZlQ2xhc3MgPSBpc0luID8gYWN0aXZlQ2xhc3Nlc1swXSA6IGFjdGl2ZUNsYXNzZXNbMV07XG5cbiAgLy8gU2V0IHVwIHRoZSBhbmltYXRpb25cbiAgcmVzZXQoKTtcblxuICBlbGVtZW50XG4gICAgLmFkZENsYXNzKGFuaW1hdGlvbilcbiAgICAuY3NzKCd0cmFuc2l0aW9uJywgJ25vbmUnKTtcblxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgIGVsZW1lbnQuYWRkQ2xhc3MoaW5pdENsYXNzKTtcbiAgICBpZiAoaXNJbikgZWxlbWVudC5zaG93KCk7XG4gIH0pO1xuXG4gIC8vIFN0YXJ0IHRoZSBhbmltYXRpb25cbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICBlbGVtZW50WzBdLm9mZnNldFdpZHRoO1xuICAgIGVsZW1lbnRcbiAgICAgIC5jc3MoJ3RyYW5zaXRpb24nLCAnJylcbiAgICAgIC5hZGRDbGFzcyhhY3RpdmVDbGFzcyk7XG4gIH0pO1xuXG4gIC8vIENsZWFuIHVwIHRoZSBhbmltYXRpb24gd2hlbiBpdCBmaW5pc2hlc1xuICBlbGVtZW50Lm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoZWxlbWVudCksIGZpbmlzaCk7XG5cbiAgLy8gSGlkZXMgdGhlIGVsZW1lbnQgKGZvciBvdXQgYW5pbWF0aW9ucyksIHJlc2V0cyB0aGUgZWxlbWVudCwgYW5kIHJ1bnMgYSBjYWxsYmFja1xuICBmdW5jdGlvbiBmaW5pc2goKSB7XG4gICAgaWYgKCFpc0luKSBlbGVtZW50LmhpZGUoKTtcbiAgICByZXNldCgpO1xuICAgIGlmIChjYikgY2IuYXBwbHkoZWxlbWVudCk7XG4gIH1cblxuICAvLyBSZXNldHMgdHJhbnNpdGlvbnMgYW5kIHJlbW92ZXMgbW90aW9uLXNwZWNpZmljIGNsYXNzZXNcbiAgZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgZWxlbWVudFswXS5zdHlsZS50cmFuc2l0aW9uRHVyYXRpb24gPSAwO1xuICAgIGVsZW1lbnQucmVtb3ZlQ2xhc3MoYCR7aW5pdENsYXNzfSAke2FjdGl2ZUNsYXNzfSAke2FuaW1hdGlvbn1gKTtcbiAgfVxufVxuXG5Gb3VuZGF0aW9uLk1vdmUgPSBNb3ZlO1xuRm91bmRhdGlvbi5Nb3Rpb24gPSBNb3Rpb247XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuY29uc3QgTmVzdCA9IHtcbiAgRmVhdGhlcihtZW51LCB0eXBlID0gJ3pmJykge1xuICAgIG1lbnUuYXR0cigncm9sZScsICdtZW51YmFyJyk7XG5cbiAgICB2YXIgaXRlbXMgPSBtZW51LmZpbmQoJ2xpJykuYXR0cih7J3JvbGUnOiAnbWVudWl0ZW0nfSksXG4gICAgICAgIHN1Yk1lbnVDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnVgLFxuICAgICAgICBzdWJJdGVtQ2xhc3MgPSBgJHtzdWJNZW51Q2xhc3N9LWl0ZW1gLFxuICAgICAgICBoYXNTdWJDbGFzcyA9IGBpcy0ke3R5cGV9LXN1Ym1lbnUtcGFyZW50YDtcblxuICAgIGl0ZW1zLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgJGl0ZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICRzdWIgPSAkaXRlbS5jaGlsZHJlbigndWwnKTtcblxuICAgICAgaWYgKCRzdWIubGVuZ3RoKSB7XG4gICAgICAgICRpdGVtXG4gICAgICAgICAgLmFkZENsYXNzKGhhc1N1YkNsYXNzKVxuICAgICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICdhcmlhLWhhc3BvcHVwJzogdHJ1ZSxcbiAgICAgICAgICAgICdhcmlhLWxhYmVsJzogJGl0ZW0uY2hpbGRyZW4oJ2E6Zmlyc3QnKS50ZXh0KClcbiAgICAgICAgICB9KTtcbiAgICAgICAgICAvLyBOb3RlOiAgRHJpbGxkb3ducyBiZWhhdmUgZGlmZmVyZW50bHkgaW4gaG93IHRoZXkgaGlkZSwgYW5kIHNvIG5lZWRcbiAgICAgICAgICAvLyBhZGRpdGlvbmFsIGF0dHJpYnV0ZXMuICBXZSBzaG91bGQgbG9vayBpZiB0aGlzIHBvc3NpYmx5IG92ZXItZ2VuZXJhbGl6ZWRcbiAgICAgICAgICAvLyB1dGlsaXR5IChOZXN0KSBpcyBhcHByb3ByaWF0ZSB3aGVuIHdlIHJld29yayBtZW51cyBpbiA2LjRcbiAgICAgICAgICBpZih0eXBlID09PSAnZHJpbGxkb3duJykge1xuICAgICAgICAgICAgJGl0ZW0uYXR0cih7J2FyaWEtZXhwYW5kZWQnOiBmYWxzZX0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAkc3ViXG4gICAgICAgICAgLmFkZENsYXNzKGBzdWJtZW51ICR7c3ViTWVudUNsYXNzfWApXG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ2RhdGEtc3VibWVudSc6ICcnLFxuICAgICAgICAgICAgJ3JvbGUnOiAnbWVudSdcbiAgICAgICAgICB9KTtcbiAgICAgICAgaWYodHlwZSA9PT0gJ2RyaWxsZG93bicpIHtcbiAgICAgICAgICAkc3ViLmF0dHIoeydhcmlhLWhpZGRlbic6IHRydWV9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoJGl0ZW0ucGFyZW50KCdbZGF0YS1zdWJtZW51XScpLmxlbmd0aCkge1xuICAgICAgICAkaXRlbS5hZGRDbGFzcyhgaXMtc3VibWVudS1pdGVtICR7c3ViSXRlbUNsYXNzfWApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuO1xuICB9LFxuXG4gIEJ1cm4obWVudSwgdHlwZSkge1xuICAgIHZhciAvL2l0ZW1zID0gbWVudS5maW5kKCdsaScpLFxuICAgICAgICBzdWJNZW51Q2xhc3MgPSBgaXMtJHt0eXBlfS1zdWJtZW51YCxcbiAgICAgICAgc3ViSXRlbUNsYXNzID0gYCR7c3ViTWVudUNsYXNzfS1pdGVtYCxcbiAgICAgICAgaGFzU3ViQ2xhc3MgPSBgaXMtJHt0eXBlfS1zdWJtZW51LXBhcmVudGA7XG5cbiAgICBtZW51XG4gICAgICAuZmluZCgnPmxpLCAubWVudSwgLm1lbnUgPiBsaScpXG4gICAgICAucmVtb3ZlQ2xhc3MoYCR7c3ViTWVudUNsYXNzfSAke3N1Ykl0ZW1DbGFzc30gJHtoYXNTdWJDbGFzc30gaXMtc3VibWVudS1pdGVtIHN1Ym1lbnUgaXMtYWN0aXZlYClcbiAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXN1Ym1lbnUnKS5jc3MoJ2Rpc3BsYXknLCAnJyk7XG5cbiAgICAvLyBjb25zb2xlLmxvZyggICAgICBtZW51LmZpbmQoJy4nICsgc3ViTWVudUNsYXNzICsgJywgLicgKyBzdWJJdGVtQ2xhc3MgKyAnLCAuaGFzLXN1Ym1lbnUsIC5pcy1zdWJtZW51LWl0ZW0sIC5zdWJtZW51LCBbZGF0YS1zdWJtZW51XScpXG4gICAgLy8gICAgICAgICAgIC5yZW1vdmVDbGFzcyhzdWJNZW51Q2xhc3MgKyAnICcgKyBzdWJJdGVtQ2xhc3MgKyAnIGhhcy1zdWJtZW51IGlzLXN1Ym1lbnUtaXRlbSBzdWJtZW51JylcbiAgICAvLyAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtc3VibWVudScpKTtcbiAgICAvLyBpdGVtcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgLy8gICB2YXIgJGl0ZW0gPSAkKHRoaXMpLFxuICAgIC8vICAgICAgICRzdWIgPSAkaXRlbS5jaGlsZHJlbigndWwnKTtcbiAgICAvLyAgIGlmKCRpdGVtLnBhcmVudCgnW2RhdGEtc3VibWVudV0nKS5sZW5ndGgpe1xuICAgIC8vICAgICAkaXRlbS5yZW1vdmVDbGFzcygnaXMtc3VibWVudS1pdGVtICcgKyBzdWJJdGVtQ2xhc3MpO1xuICAgIC8vICAgfVxuICAgIC8vICAgaWYoJHN1Yi5sZW5ndGgpe1xuICAgIC8vICAgICAkaXRlbS5yZW1vdmVDbGFzcygnaGFzLXN1Ym1lbnUnKTtcbiAgICAvLyAgICAgJHN1Yi5yZW1vdmVDbGFzcygnc3VibWVudSAnICsgc3ViTWVudUNsYXNzKS5yZW1vdmVBdHRyKCdkYXRhLXN1Ym1lbnUnKTtcbiAgICAvLyAgIH1cbiAgICAvLyB9KTtcbiAgfVxufVxuXG5Gb3VuZGF0aW9uLk5lc3QgPSBOZXN0O1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbmZ1bmN0aW9uIFRpbWVyKGVsZW0sIG9wdGlvbnMsIGNiKSB7XG4gIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICBkdXJhdGlvbiA9IG9wdGlvbnMuZHVyYXRpb24sLy9vcHRpb25zIGlzIGFuIG9iamVjdCBmb3IgZWFzaWx5IGFkZGluZyBmZWF0dXJlcyBsYXRlci5cbiAgICAgIG5hbWVTcGFjZSA9IE9iamVjdC5rZXlzKGVsZW0uZGF0YSgpKVswXSB8fCAndGltZXInLFxuICAgICAgcmVtYWluID0gLTEsXG4gICAgICBzdGFydCxcbiAgICAgIHRpbWVyO1xuXG4gIHRoaXMuaXNQYXVzZWQgPSBmYWxzZTtcblxuICB0aGlzLnJlc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICByZW1haW4gPSAtMTtcbiAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgIHRoaXMuc3RhcnQoKTtcbiAgfVxuXG4gIHRoaXMuc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmlzUGF1c2VkID0gZmFsc2U7XG4gICAgLy8gaWYoIWVsZW0uZGF0YSgncGF1c2VkJykpeyByZXR1cm4gZmFsc2U7IH0vL21heWJlIGltcGxlbWVudCB0aGlzIHNhbml0eSBjaGVjayBpZiB1c2VkIGZvciBvdGhlciB0aGluZ3MuXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICByZW1haW4gPSByZW1haW4gPD0gMCA/IGR1cmF0aW9uIDogcmVtYWluO1xuICAgIGVsZW0uZGF0YSgncGF1c2VkJywgZmFsc2UpO1xuICAgIHN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIGlmKG9wdGlvbnMuaW5maW5pdGUpe1xuICAgICAgICBfdGhpcy5yZXN0YXJ0KCk7Ly9yZXJ1biB0aGUgdGltZXIuXG4gICAgICB9XG4gICAgICBpZiAoY2IgJiYgdHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSB7IGNiKCk7IH1cbiAgICB9LCByZW1haW4pO1xuICAgIGVsZW0udHJpZ2dlcihgdGltZXJzdGFydC56Zi4ke25hbWVTcGFjZX1gKTtcbiAgfVxuXG4gIHRoaXMucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmlzUGF1c2VkID0gdHJ1ZTtcbiAgICAvL2lmKGVsZW0uZGF0YSgncGF1c2VkJykpeyByZXR1cm4gZmFsc2U7IH0vL21heWJlIGltcGxlbWVudCB0aGlzIHNhbml0eSBjaGVjayBpZiB1c2VkIGZvciBvdGhlciB0aGluZ3MuXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICBlbGVtLmRhdGEoJ3BhdXNlZCcsIHRydWUpO1xuICAgIHZhciBlbmQgPSBEYXRlLm5vdygpO1xuICAgIHJlbWFpbiA9IHJlbWFpbiAtIChlbmQgLSBzdGFydCk7XG4gICAgZWxlbS50cmlnZ2VyKGB0aW1lcnBhdXNlZC56Zi4ke25hbWVTcGFjZX1gKTtcbiAgfVxufVxuXG4vKipcbiAqIFJ1bnMgYSBjYWxsYmFjayBmdW5jdGlvbiB3aGVuIGltYWdlcyBhcmUgZnVsbHkgbG9hZGVkLlxuICogQHBhcmFtIHtPYmplY3R9IGltYWdlcyAtIEltYWdlKHMpIHRvIGNoZWNrIGlmIGxvYWRlZC5cbiAqIEBwYXJhbSB7RnVuY30gY2FsbGJhY2sgLSBGdW5jdGlvbiB0byBleGVjdXRlIHdoZW4gaW1hZ2UgaXMgZnVsbHkgbG9hZGVkLlxuICovXG5mdW5jdGlvbiBvbkltYWdlc0xvYWRlZChpbWFnZXMsIGNhbGxiYWNrKXtcbiAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgdW5sb2FkZWQgPSBpbWFnZXMubGVuZ3RoO1xuXG4gIGlmICh1bmxvYWRlZCA9PT0gMCkge1xuICAgIGNhbGxiYWNrKCk7XG4gIH1cblxuICBpbWFnZXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAvLyBDaGVjayBpZiBpbWFnZSBpcyBsb2FkZWRcbiAgICBpZiAodGhpcy5jb21wbGV0ZSB8fCAodGhpcy5yZWFkeVN0YXRlID09PSA0KSB8fCAodGhpcy5yZWFkeVN0YXRlID09PSAnY29tcGxldGUnKSkge1xuICAgICAgc2luZ2xlSW1hZ2VMb2FkZWQoKTtcbiAgICB9XG4gICAgLy8gRm9yY2UgbG9hZCB0aGUgaW1hZ2VcbiAgICBlbHNlIHtcbiAgICAgIC8vIGZpeCBmb3IgSUUuIFNlZSBodHRwczovL2Nzcy10cmlja3MuY29tL3NuaXBwZXRzL2pxdWVyeS9maXhpbmctbG9hZC1pbi1pZS1mb3ItY2FjaGVkLWltYWdlcy9cbiAgICAgIHZhciBzcmMgPSAkKHRoaXMpLmF0dHIoJ3NyYycpO1xuICAgICAgJCh0aGlzKS5hdHRyKCdzcmMnLCBzcmMgKyAoc3JjLmluZGV4T2YoJz8nKSA+PSAwID8gJyYnIDogJz8nKSArIChuZXcgRGF0ZSgpLmdldFRpbWUoKSkpO1xuICAgICAgJCh0aGlzKS5vbmUoJ2xvYWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc2luZ2xlSW1hZ2VMb2FkZWQoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgZnVuY3Rpb24gc2luZ2xlSW1hZ2VMb2FkZWQoKSB7XG4gICAgdW5sb2FkZWQtLTtcbiAgICBpZiAodW5sb2FkZWQgPT09IDApIHtcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgfVxuICB9XG59XG5cbkZvdW5kYXRpb24uVGltZXIgPSBUaW1lcjtcbkZvdW5kYXRpb24ub25JbWFnZXNMb2FkZWQgPSBvbkltYWdlc0xvYWRlZDtcblxufShqUXVlcnkpO1xuIiwiLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy8qKldvcmsgaW5zcGlyZWQgYnkgbXVsdGlwbGUganF1ZXJ5IHN3aXBlIHBsdWdpbnMqKlxuLy8qKkRvbmUgYnkgWW9oYWkgQXJhcmF0ICoqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuKGZ1bmN0aW9uKCQpIHtcblxuICAkLnNwb3RTd2lwZSA9IHtcbiAgICB2ZXJzaW9uOiAnMS4wLjAnLFxuICAgIGVuYWJsZWQ6ICdvbnRvdWNoc3RhcnQnIGluIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCxcbiAgICBwcmV2ZW50RGVmYXVsdDogZmFsc2UsXG4gICAgbW92ZVRocmVzaG9sZDogNzUsXG4gICAgdGltZVRocmVzaG9sZDogMjAwXG4gIH07XG5cbiAgdmFyICAgc3RhcnRQb3NYLFxuICAgICAgICBzdGFydFBvc1ksXG4gICAgICAgIHN0YXJ0VGltZSxcbiAgICAgICAgZWxhcHNlZFRpbWUsXG4gICAgICAgIGlzTW92aW5nID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gb25Ub3VjaEVuZCgpIHtcbiAgICAvLyAgYWxlcnQodGhpcyk7XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBvblRvdWNoTW92ZSk7XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIG9uVG91Y2hFbmQpO1xuICAgIGlzTW92aW5nID0gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiBvblRvdWNoTW92ZShlKSB7XG4gICAgaWYgKCQuc3BvdFN3aXBlLnByZXZlbnREZWZhdWx0KSB7IGUucHJldmVudERlZmF1bHQoKTsgfVxuICAgIGlmKGlzTW92aW5nKSB7XG4gICAgICB2YXIgeCA9IGUudG91Y2hlc1swXS5wYWdlWDtcbiAgICAgIHZhciB5ID0gZS50b3VjaGVzWzBdLnBhZ2VZO1xuICAgICAgdmFyIGR4ID0gc3RhcnRQb3NYIC0geDtcbiAgICAgIHZhciBkeSA9IHN0YXJ0UG9zWSAtIHk7XG4gICAgICB2YXIgZGlyO1xuICAgICAgZWxhcHNlZFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHN0YXJ0VGltZTtcbiAgICAgIGlmKE1hdGguYWJzKGR4KSA+PSAkLnNwb3RTd2lwZS5tb3ZlVGhyZXNob2xkICYmIGVsYXBzZWRUaW1lIDw9ICQuc3BvdFN3aXBlLnRpbWVUaHJlc2hvbGQpIHtcbiAgICAgICAgZGlyID0gZHggPiAwID8gJ2xlZnQnIDogJ3JpZ2h0JztcbiAgICAgIH1cbiAgICAgIC8vIGVsc2UgaWYoTWF0aC5hYnMoZHkpID49ICQuc3BvdFN3aXBlLm1vdmVUaHJlc2hvbGQgJiYgZWxhcHNlZFRpbWUgPD0gJC5zcG90U3dpcGUudGltZVRocmVzaG9sZCkge1xuICAgICAgLy8gICBkaXIgPSBkeSA+IDAgPyAnZG93bicgOiAndXAnO1xuICAgICAgLy8gfVxuICAgICAgaWYoZGlyKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgb25Ub3VjaEVuZC5jYWxsKHRoaXMpO1xuICAgICAgICAkKHRoaXMpLnRyaWdnZXIoJ3N3aXBlJywgZGlyKS50cmlnZ2VyKGBzd2lwZSR7ZGlyfWApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG9uVG91Y2hTdGFydChlKSB7XG4gICAgaWYgKGUudG91Y2hlcy5sZW5ndGggPT0gMSkge1xuICAgICAgc3RhcnRQb3NYID0gZS50b3VjaGVzWzBdLnBhZ2VYO1xuICAgICAgc3RhcnRQb3NZID0gZS50b3VjaGVzWzBdLnBhZ2VZO1xuICAgICAgaXNNb3ZpbmcgPSB0cnVlO1xuICAgICAgc3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIG9uVG91Y2hNb3ZlLCBmYWxzZSk7XG4gICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgb25Ub3VjaEVuZCwgZmFsc2UpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyICYmIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIG9uVG91Y2hTdGFydCwgZmFsc2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gdGVhcmRvd24oKSB7XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0Jywgb25Ub3VjaFN0YXJ0KTtcbiAgfVxuXG4gICQuZXZlbnQuc3BlY2lhbC5zd2lwZSA9IHsgc2V0dXA6IGluaXQgfTtcblxuICAkLmVhY2goWydsZWZ0JywgJ3VwJywgJ2Rvd24nLCAncmlnaHQnXSwgZnVuY3Rpb24gKCkge1xuICAgICQuZXZlbnQuc3BlY2lhbFtgc3dpcGUke3RoaXN9YF0gPSB7IHNldHVwOiBmdW5jdGlvbigpe1xuICAgICAgJCh0aGlzKS5vbignc3dpcGUnLCAkLm5vb3ApO1xuICAgIH0gfTtcbiAgfSk7XG59KShqUXVlcnkpO1xuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqIE1ldGhvZCBmb3IgYWRkaW5nIHBzdWVkbyBkcmFnIGV2ZW50cyB0byBlbGVtZW50cyAqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuIWZ1bmN0aW9uKCQpe1xuICAkLmZuLmFkZFRvdWNoID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLmVhY2goZnVuY3Rpb24oaSxlbCl7XG4gICAgICAkKGVsKS5iaW5kKCd0b3VjaHN0YXJ0IHRvdWNobW92ZSB0b3VjaGVuZCB0b3VjaGNhbmNlbCcsZnVuY3Rpb24oKXtcbiAgICAgICAgLy93ZSBwYXNzIHRoZSBvcmlnaW5hbCBldmVudCBvYmplY3QgYmVjYXVzZSB0aGUgalF1ZXJ5IGV2ZW50XG4gICAgICAgIC8vb2JqZWN0IGlzIG5vcm1hbGl6ZWQgdG8gdzNjIHNwZWNzIGFuZCBkb2VzIG5vdCBwcm92aWRlIHRoZSBUb3VjaExpc3RcbiAgICAgICAgaGFuZGxlVG91Y2goZXZlbnQpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB2YXIgaGFuZGxlVG91Y2ggPSBmdW5jdGlvbihldmVudCl7XG4gICAgICB2YXIgdG91Y2hlcyA9IGV2ZW50LmNoYW5nZWRUb3VjaGVzLFxuICAgICAgICAgIGZpcnN0ID0gdG91Y2hlc1swXSxcbiAgICAgICAgICBldmVudFR5cGVzID0ge1xuICAgICAgICAgICAgdG91Y2hzdGFydDogJ21vdXNlZG93bicsXG4gICAgICAgICAgICB0b3VjaG1vdmU6ICdtb3VzZW1vdmUnLFxuICAgICAgICAgICAgdG91Y2hlbmQ6ICdtb3VzZXVwJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAgdHlwZSA9IGV2ZW50VHlwZXNbZXZlbnQudHlwZV0sXG4gICAgICAgICAgc2ltdWxhdGVkRXZlbnRcbiAgICAgICAgO1xuXG4gICAgICBpZignTW91c2VFdmVudCcgaW4gd2luZG93ICYmIHR5cGVvZiB3aW5kb3cuTW91c2VFdmVudCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBzaW11bGF0ZWRFdmVudCA9IG5ldyB3aW5kb3cuTW91c2VFdmVudCh0eXBlLCB7XG4gICAgICAgICAgJ2J1YmJsZXMnOiB0cnVlLFxuICAgICAgICAgICdjYW5jZWxhYmxlJzogdHJ1ZSxcbiAgICAgICAgICAnc2NyZWVuWCc6IGZpcnN0LnNjcmVlblgsXG4gICAgICAgICAgJ3NjcmVlblknOiBmaXJzdC5zY3JlZW5ZLFxuICAgICAgICAgICdjbGllbnRYJzogZmlyc3QuY2xpZW50WCxcbiAgICAgICAgICAnY2xpZW50WSc6IGZpcnN0LmNsaWVudFlcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzaW11bGF0ZWRFdmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdNb3VzZUV2ZW50Jyk7XG4gICAgICAgIHNpbXVsYXRlZEV2ZW50LmluaXRNb3VzZUV2ZW50KHR5cGUsIHRydWUsIHRydWUsIHdpbmRvdywgMSwgZmlyc3Quc2NyZWVuWCwgZmlyc3Quc2NyZWVuWSwgZmlyc3QuY2xpZW50WCwgZmlyc3QuY2xpZW50WSwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgZmFsc2UsIDAvKmxlZnQqLywgbnVsbCk7XG4gICAgICB9XG4gICAgICBmaXJzdC50YXJnZXQuZGlzcGF0Y2hFdmVudChzaW11bGF0ZWRFdmVudCk7XG4gICAgfTtcbiAgfTtcbn0oalF1ZXJ5KTtcblxuXG4vLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbi8vKipGcm9tIHRoZSBqUXVlcnkgTW9iaWxlIExpYnJhcnkqKlxuLy8qKm5lZWQgdG8gcmVjcmVhdGUgZnVuY3Rpb25hbGl0eSoqXG4vLyoqYW5kIHRyeSB0byBpbXByb3ZlIGlmIHBvc3NpYmxlKipcbi8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4vKiBSZW1vdmluZyB0aGUgalF1ZXJ5IGZ1bmN0aW9uICoqKipcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4oZnVuY3Rpb24oICQsIHdpbmRvdywgdW5kZWZpbmVkICkge1xuXG5cdHZhciAkZG9jdW1lbnQgPSAkKCBkb2N1bWVudCApLFxuXHRcdC8vIHN1cHBvcnRUb3VjaCA9ICQubW9iaWxlLnN1cHBvcnQudG91Y2gsXG5cdFx0dG91Y2hTdGFydEV2ZW50ID0gJ3RvdWNoc3RhcnQnLy9zdXBwb3J0VG91Y2ggPyBcInRvdWNoc3RhcnRcIiA6IFwibW91c2Vkb3duXCIsXG5cdFx0dG91Y2hTdG9wRXZlbnQgPSAndG91Y2hlbmQnLy9zdXBwb3J0VG91Y2ggPyBcInRvdWNoZW5kXCIgOiBcIm1vdXNldXBcIixcblx0XHR0b3VjaE1vdmVFdmVudCA9ICd0b3VjaG1vdmUnLy9zdXBwb3J0VG91Y2ggPyBcInRvdWNobW92ZVwiIDogXCJtb3VzZW1vdmVcIjtcblxuXHQvLyBzZXR1cCBuZXcgZXZlbnQgc2hvcnRjdXRzXG5cdCQuZWFjaCggKCBcInRvdWNoc3RhcnQgdG91Y2htb3ZlIHRvdWNoZW5kIFwiICtcblx0XHRcInN3aXBlIHN3aXBlbGVmdCBzd2lwZXJpZ2h0XCIgKS5zcGxpdCggXCIgXCIgKSwgZnVuY3Rpb24oIGksIG5hbWUgKSB7XG5cblx0XHQkLmZuWyBuYW1lIF0gPSBmdW5jdGlvbiggZm4gKSB7XG5cdFx0XHRyZXR1cm4gZm4gPyB0aGlzLmJpbmQoIG5hbWUsIGZuICkgOiB0aGlzLnRyaWdnZXIoIG5hbWUgKTtcblx0XHR9O1xuXG5cdFx0Ly8galF1ZXJ5IDwgMS44XG5cdFx0aWYgKCAkLmF0dHJGbiApIHtcblx0XHRcdCQuYXR0ckZuWyBuYW1lIF0gPSB0cnVlO1xuXHRcdH1cblx0fSk7XG5cblx0ZnVuY3Rpb24gdHJpZ2dlckN1c3RvbUV2ZW50KCBvYmosIGV2ZW50VHlwZSwgZXZlbnQsIGJ1YmJsZSApIHtcblx0XHR2YXIgb3JpZ2luYWxUeXBlID0gZXZlbnQudHlwZTtcblx0XHRldmVudC50eXBlID0gZXZlbnRUeXBlO1xuXHRcdGlmICggYnViYmxlICkge1xuXHRcdFx0JC5ldmVudC50cmlnZ2VyKCBldmVudCwgdW5kZWZpbmVkLCBvYmogKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JC5ldmVudC5kaXNwYXRjaC5jYWxsKCBvYmosIGV2ZW50ICk7XG5cdFx0fVxuXHRcdGV2ZW50LnR5cGUgPSBvcmlnaW5hbFR5cGU7XG5cdH1cblxuXHQvLyBhbHNvIGhhbmRsZXMgdGFwaG9sZFxuXG5cdC8vIEFsc28gaGFuZGxlcyBzd2lwZWxlZnQsIHN3aXBlcmlnaHRcblx0JC5ldmVudC5zcGVjaWFsLnN3aXBlID0ge1xuXG5cdFx0Ly8gTW9yZSB0aGFuIHRoaXMgaG9yaXpvbnRhbCBkaXNwbGFjZW1lbnQsIGFuZCB3ZSB3aWxsIHN1cHByZXNzIHNjcm9sbGluZy5cblx0XHRzY3JvbGxTdXByZXNzaW9uVGhyZXNob2xkOiAzMCxcblxuXHRcdC8vIE1vcmUgdGltZSB0aGFuIHRoaXMsIGFuZCBpdCBpc24ndCBhIHN3aXBlLlxuXHRcdGR1cmF0aW9uVGhyZXNob2xkOiAxMDAwLFxuXG5cdFx0Ly8gU3dpcGUgaG9yaXpvbnRhbCBkaXNwbGFjZW1lbnQgbXVzdCBiZSBtb3JlIHRoYW4gdGhpcy5cblx0XHRob3Jpem9udGFsRGlzdGFuY2VUaHJlc2hvbGQ6IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvID49IDIgPyAxNSA6IDMwLFxuXG5cdFx0Ly8gU3dpcGUgdmVydGljYWwgZGlzcGxhY2VtZW50IG11c3QgYmUgbGVzcyB0aGFuIHRoaXMuXG5cdFx0dmVydGljYWxEaXN0YW5jZVRocmVzaG9sZDogd2luZG93LmRldmljZVBpeGVsUmF0aW8gPj0gMiA/IDE1IDogMzAsXG5cblx0XHRnZXRMb2NhdGlvbjogZnVuY3Rpb24gKCBldmVudCApIHtcblx0XHRcdHZhciB3aW5QYWdlWCA9IHdpbmRvdy5wYWdlWE9mZnNldCxcblx0XHRcdFx0d2luUGFnZVkgPSB3aW5kb3cucGFnZVlPZmZzZXQsXG5cdFx0XHRcdHggPSBldmVudC5jbGllbnRYLFxuXHRcdFx0XHR5ID0gZXZlbnQuY2xpZW50WTtcblxuXHRcdFx0aWYgKCBldmVudC5wYWdlWSA9PT0gMCAmJiBNYXRoLmZsb29yKCB5ICkgPiBNYXRoLmZsb29yKCBldmVudC5wYWdlWSApIHx8XG5cdFx0XHRcdGV2ZW50LnBhZ2VYID09PSAwICYmIE1hdGguZmxvb3IoIHggKSA+IE1hdGguZmxvb3IoIGV2ZW50LnBhZ2VYICkgKSB7XG5cblx0XHRcdFx0Ly8gaU9TNCBjbGllbnRYL2NsaWVudFkgaGF2ZSB0aGUgdmFsdWUgdGhhdCBzaG91bGQgaGF2ZSBiZWVuXG5cdFx0XHRcdC8vIGluIHBhZ2VYL3BhZ2VZLiBXaGlsZSBwYWdlWC9wYWdlLyBoYXZlIHRoZSB2YWx1ZSAwXG5cdFx0XHRcdHggPSB4IC0gd2luUGFnZVg7XG5cdFx0XHRcdHkgPSB5IC0gd2luUGFnZVk7XG5cdFx0XHR9IGVsc2UgaWYgKCB5IDwgKCBldmVudC5wYWdlWSAtIHdpblBhZ2VZKSB8fCB4IDwgKCBldmVudC5wYWdlWCAtIHdpblBhZ2VYICkgKSB7XG5cblx0XHRcdFx0Ly8gU29tZSBBbmRyb2lkIGJyb3dzZXJzIGhhdmUgdG90YWxseSBib2d1cyB2YWx1ZXMgZm9yIGNsaWVudFgvWVxuXHRcdFx0XHQvLyB3aGVuIHNjcm9sbGluZy96b29taW5nIGEgcGFnZS4gRGV0ZWN0YWJsZSBzaW5jZSBjbGllbnRYL2NsaWVudFlcblx0XHRcdFx0Ly8gc2hvdWxkIG5ldmVyIGJlIHNtYWxsZXIgdGhhbiBwYWdlWC9wYWdlWSBtaW51cyBwYWdlIHNjcm9sbFxuXHRcdFx0XHR4ID0gZXZlbnQucGFnZVggLSB3aW5QYWdlWDtcblx0XHRcdFx0eSA9IGV2ZW50LnBhZ2VZIC0gd2luUGFnZVk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHg6IHgsXG5cdFx0XHRcdHk6IHlcblx0XHRcdH07XG5cdFx0fSxcblxuXHRcdHN0YXJ0OiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgZGF0YSA9IGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlcyA/XG5cdFx0XHRcdFx0ZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzWyAwIF0gOiBldmVudCxcblx0XHRcdFx0bG9jYXRpb24gPSAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZ2V0TG9jYXRpb24oIGRhdGEgKTtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHR0aW1lOiAoIG5ldyBEYXRlKCkgKS5nZXRUaW1lKCksXG5cdFx0XHRcdFx0XHRjb29yZHM6IFsgbG9jYXRpb24ueCwgbG9jYXRpb24ueSBdLFxuXHRcdFx0XHRcdFx0b3JpZ2luOiAkKCBldmVudC50YXJnZXQgKVxuXHRcdFx0XHRcdH07XG5cdFx0fSxcblxuXHRcdHN0b3A6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciBkYXRhID0gZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzID9cblx0XHRcdFx0XHRldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXNbIDAgXSA6IGV2ZW50LFxuXHRcdFx0XHRsb2NhdGlvbiA9ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5nZXRMb2NhdGlvbiggZGF0YSApO1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdHRpbWU6ICggbmV3IERhdGUoKSApLmdldFRpbWUoKSxcblx0XHRcdFx0XHRcdGNvb3JkczogWyBsb2NhdGlvbi54LCBsb2NhdGlvbi55IF1cblx0XHRcdFx0XHR9O1xuXHRcdH0sXG5cblx0XHRoYW5kbGVTd2lwZTogZnVuY3Rpb24oIHN0YXJ0LCBzdG9wLCB0aGlzT2JqZWN0LCBvcmlnVGFyZ2V0ICkge1xuXHRcdFx0aWYgKCBzdG9wLnRpbWUgLSBzdGFydC50aW1lIDwgJC5ldmVudC5zcGVjaWFsLnN3aXBlLmR1cmF0aW9uVGhyZXNob2xkICYmXG5cdFx0XHRcdE1hdGguYWJzKCBzdGFydC5jb29yZHNbIDAgXSAtIHN0b3AuY29vcmRzWyAwIF0gKSA+ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ob3Jpem9udGFsRGlzdGFuY2VUaHJlc2hvbGQgJiZcblx0XHRcdFx0TWF0aC5hYnMoIHN0YXJ0LmNvb3Jkc1sgMSBdIC0gc3RvcC5jb29yZHNbIDEgXSApIDwgJC5ldmVudC5zcGVjaWFsLnN3aXBlLnZlcnRpY2FsRGlzdGFuY2VUaHJlc2hvbGQgKSB7XG5cdFx0XHRcdHZhciBkaXJlY3Rpb24gPSBzdGFydC5jb29yZHNbMF0gPiBzdG9wLmNvb3Jkc1sgMCBdID8gXCJzd2lwZWxlZnRcIiA6IFwic3dpcGVyaWdodFwiO1xuXG5cdFx0XHRcdHRyaWdnZXJDdXN0b21FdmVudCggdGhpc09iamVjdCwgXCJzd2lwZVwiLCAkLkV2ZW50KCBcInN3aXBlXCIsIHsgdGFyZ2V0OiBvcmlnVGFyZ2V0LCBzd2lwZXN0YXJ0OiBzdGFydCwgc3dpcGVzdG9wOiBzdG9wIH0pLCB0cnVlICk7XG5cdFx0XHRcdHRyaWdnZXJDdXN0b21FdmVudCggdGhpc09iamVjdCwgZGlyZWN0aW9uLCQuRXZlbnQoIGRpcmVjdGlvbiwgeyB0YXJnZXQ6IG9yaWdUYXJnZXQsIHN3aXBlc3RhcnQ6IHN0YXJ0LCBzd2lwZXN0b3A6IHN0b3AgfSApLCB0cnVlICk7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXG5cdFx0fSxcblxuXHRcdC8vIFRoaXMgc2VydmVzIGFzIGEgZmxhZyB0byBlbnN1cmUgdGhhdCBhdCBtb3N0IG9uZSBzd2lwZSBldmVudCBldmVudCBpc1xuXHRcdC8vIGluIHdvcmsgYXQgYW55IGdpdmVuIHRpbWVcblx0XHRldmVudEluUHJvZ3Jlc3M6IGZhbHNlLFxuXG5cdFx0c2V0dXA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGV2ZW50cyxcblx0XHRcdFx0dGhpc09iamVjdCA9IHRoaXMsXG5cdFx0XHRcdCR0aGlzID0gJCggdGhpc09iamVjdCApLFxuXHRcdFx0XHRjb250ZXh0ID0ge307XG5cblx0XHRcdC8vIFJldHJpZXZlIHRoZSBldmVudHMgZGF0YSBmb3IgdGhpcyBlbGVtZW50IGFuZCBhZGQgdGhlIHN3aXBlIGNvbnRleHRcblx0XHRcdGV2ZW50cyA9ICQuZGF0YSggdGhpcywgXCJtb2JpbGUtZXZlbnRzXCIgKTtcblx0XHRcdGlmICggIWV2ZW50cyApIHtcblx0XHRcdFx0ZXZlbnRzID0geyBsZW5ndGg6IDAgfTtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCBcIm1vYmlsZS1ldmVudHNcIiwgZXZlbnRzICk7XG5cdFx0XHR9XG5cdFx0XHRldmVudHMubGVuZ3RoKys7XG5cdFx0XHRldmVudHMuc3dpcGUgPSBjb250ZXh0O1xuXG5cdFx0XHRjb250ZXh0LnN0YXJ0ID0gZnVuY3Rpb24oIGV2ZW50ICkge1xuXG5cdFx0XHRcdC8vIEJhaWwgaWYgd2UncmUgYWxyZWFkeSB3b3JraW5nIG9uIGEgc3dpcGUgZXZlbnRcblx0XHRcdFx0aWYgKCAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZXZlbnRJblByb2dyZXNzICkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHQkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZXZlbnRJblByb2dyZXNzID0gdHJ1ZTtcblxuXHRcdFx0XHR2YXIgc3RvcCxcblx0XHRcdFx0XHRzdGFydCA9ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5zdGFydCggZXZlbnQgKSxcblx0XHRcdFx0XHRvcmlnVGFyZ2V0ID0gZXZlbnQudGFyZ2V0LFxuXHRcdFx0XHRcdGVtaXR0ZWQgPSBmYWxzZTtcblxuXHRcdFx0XHRjb250ZXh0Lm1vdmUgPSBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdFx0aWYgKCAhc3RhcnQgfHwgZXZlbnQuaXNEZWZhdWx0UHJldmVudGVkKCkgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0c3RvcCA9ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5zdG9wKCBldmVudCApO1xuXHRcdFx0XHRcdGlmICggIWVtaXR0ZWQgKSB7XG5cdFx0XHRcdFx0XHRlbWl0dGVkID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLmhhbmRsZVN3aXBlKCBzdGFydCwgc3RvcCwgdGhpc09iamVjdCwgb3JpZ1RhcmdldCApO1xuXHRcdFx0XHRcdFx0aWYgKCBlbWl0dGVkICkge1xuXG5cdFx0XHRcdFx0XHRcdC8vIFJlc2V0IHRoZSBjb250ZXh0IHRvIG1ha2Ugd2F5IGZvciB0aGUgbmV4dCBzd2lwZSBldmVudFxuXHRcdFx0XHRcdFx0XHQkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZXZlbnRJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vIHByZXZlbnQgc2Nyb2xsaW5nXG5cdFx0XHRcdFx0aWYgKCBNYXRoLmFicyggc3RhcnQuY29vcmRzWyAwIF0gLSBzdG9wLmNvb3Jkc1sgMCBdICkgPiAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuc2Nyb2xsU3VwcmVzc2lvblRocmVzaG9sZCApIHtcblx0XHRcdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGNvbnRleHQuc3RvcCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0ZW1pdHRlZCA9IHRydWU7XG5cblx0XHRcdFx0XHRcdC8vIFJlc2V0IHRoZSBjb250ZXh0IHRvIG1ha2Ugd2F5IGZvciB0aGUgbmV4dCBzd2lwZSBldmVudFxuXHRcdFx0XHRcdFx0JC5ldmVudC5zcGVjaWFsLnN3aXBlLmV2ZW50SW5Qcm9ncmVzcyA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0JGRvY3VtZW50Lm9mZiggdG91Y2hNb3ZlRXZlbnQsIGNvbnRleHQubW92ZSApO1xuXHRcdFx0XHRcdFx0Y29udGV4dC5tb3ZlID0gbnVsbDtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkZG9jdW1lbnQub24oIHRvdWNoTW92ZUV2ZW50LCBjb250ZXh0Lm1vdmUgKVxuXHRcdFx0XHRcdC5vbmUoIHRvdWNoU3RvcEV2ZW50LCBjb250ZXh0LnN0b3AgKTtcblx0XHRcdH07XG5cdFx0XHQkdGhpcy5vbiggdG91Y2hTdGFydEV2ZW50LCBjb250ZXh0LnN0YXJ0ICk7XG5cdFx0fSxcblxuXHRcdHRlYXJkb3duOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBldmVudHMsIGNvbnRleHQ7XG5cblx0XHRcdGV2ZW50cyA9ICQuZGF0YSggdGhpcywgXCJtb2JpbGUtZXZlbnRzXCIgKTtcblx0XHRcdGlmICggZXZlbnRzICkge1xuXHRcdFx0XHRjb250ZXh0ID0gZXZlbnRzLnN3aXBlO1xuXHRcdFx0XHRkZWxldGUgZXZlbnRzLnN3aXBlO1xuXHRcdFx0XHRldmVudHMubGVuZ3RoLS07XG5cdFx0XHRcdGlmICggZXZlbnRzLmxlbmd0aCA9PT0gMCApIHtcblx0XHRcdFx0XHQkLnJlbW92ZURhdGEoIHRoaXMsIFwibW9iaWxlLWV2ZW50c1wiICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKCBjb250ZXh0ICkge1xuXHRcdFx0XHRpZiAoIGNvbnRleHQuc3RhcnQgKSB7XG5cdFx0XHRcdFx0JCggdGhpcyApLm9mZiggdG91Y2hTdGFydEV2ZW50LCBjb250ZXh0LnN0YXJ0ICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCBjb250ZXh0Lm1vdmUgKSB7XG5cdFx0XHRcdFx0JGRvY3VtZW50Lm9mZiggdG91Y2hNb3ZlRXZlbnQsIGNvbnRleHQubW92ZSApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggY29udGV4dC5zdG9wICkge1xuXHRcdFx0XHRcdCRkb2N1bWVudC5vZmYoIHRvdWNoU3RvcEV2ZW50LCBjb250ZXh0LnN0b3AgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fTtcblx0JC5lYWNoKHtcblx0XHRzd2lwZWxlZnQ6IFwic3dpcGUubGVmdFwiLFxuXHRcdHN3aXBlcmlnaHQ6IFwic3dpcGUucmlnaHRcIlxuXHR9LCBmdW5jdGlvbiggZXZlbnQsIHNvdXJjZUV2ZW50ICkge1xuXG5cdFx0JC5ldmVudC5zcGVjaWFsWyBldmVudCBdID0ge1xuXHRcdFx0c2V0dXA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCB0aGlzICkuYmluZCggc291cmNlRXZlbnQsICQubm9vcCApO1xuXHRcdFx0fSxcblx0XHRcdHRlYXJkb3duOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0JCggdGhpcyApLnVuYmluZCggc291cmNlRXZlbnQgKTtcblx0XHRcdH1cblx0XHR9O1xuXHR9KTtcbn0pKCBqUXVlcnksIHRoaXMgKTtcbiovXG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbmNvbnN0IE11dGF0aW9uT2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgcHJlZml4ZXMgPSBbJ1dlYktpdCcsICdNb3onLCAnTycsICdNcycsICcnXTtcbiAgZm9yICh2YXIgaT0wOyBpIDwgcHJlZml4ZXMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoYCR7cHJlZml4ZXNbaV19TXV0YXRpb25PYnNlcnZlcmAgaW4gd2luZG93KSB7XG4gICAgICByZXR1cm4gd2luZG93W2Ake3ByZWZpeGVzW2ldfU11dGF0aW9uT2JzZXJ2ZXJgXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufSgpKTtcblxuY29uc3QgdHJpZ2dlcnMgPSAoZWwsIHR5cGUpID0+IHtcbiAgZWwuZGF0YSh0eXBlKS5zcGxpdCgnICcpLmZvckVhY2goaWQgPT4ge1xuICAgICQoYCMke2lkfWApWyB0eXBlID09PSAnY2xvc2UnID8gJ3RyaWdnZXInIDogJ3RyaWdnZXJIYW5kbGVyJ10oYCR7dHlwZX0uemYudHJpZ2dlcmAsIFtlbF0pO1xuICB9KTtcbn07XG4vLyBFbGVtZW50cyB3aXRoIFtkYXRhLW9wZW5dIHdpbGwgcmV2ZWFsIGEgcGx1Z2luIHRoYXQgc3VwcG9ydHMgaXQgd2hlbiBjbGlja2VkLlxuJChkb2N1bWVudCkub24oJ2NsaWNrLnpmLnRyaWdnZXInLCAnW2RhdGEtb3Blbl0nLCBmdW5jdGlvbigpIHtcbiAgdHJpZ2dlcnMoJCh0aGlzKSwgJ29wZW4nKTtcbn0pO1xuXG4vLyBFbGVtZW50cyB3aXRoIFtkYXRhLWNsb3NlXSB3aWxsIGNsb3NlIGEgcGx1Z2luIHRoYXQgc3VwcG9ydHMgaXQgd2hlbiBjbGlja2VkLlxuLy8gSWYgdXNlZCB3aXRob3V0IGEgdmFsdWUgb24gW2RhdGEtY2xvc2VdLCB0aGUgZXZlbnQgd2lsbCBidWJibGUsIGFsbG93aW5nIGl0IHRvIGNsb3NlIGEgcGFyZW50IGNvbXBvbmVudC5cbiQoZG9jdW1lbnQpLm9uKCdjbGljay56Zi50cmlnZ2VyJywgJ1tkYXRhLWNsb3NlXScsIGZ1bmN0aW9uKCkge1xuICBsZXQgaWQgPSAkKHRoaXMpLmRhdGEoJ2Nsb3NlJyk7XG4gIGlmIChpZCkge1xuICAgIHRyaWdnZXJzKCQodGhpcyksICdjbG9zZScpO1xuICB9XG4gIGVsc2Uge1xuICAgICQodGhpcykudHJpZ2dlcignY2xvc2UuemYudHJpZ2dlcicpO1xuICB9XG59KTtcblxuLy8gRWxlbWVudHMgd2l0aCBbZGF0YS10b2dnbGVdIHdpbGwgdG9nZ2xlIGEgcGx1Z2luIHRoYXQgc3VwcG9ydHMgaXQgd2hlbiBjbGlja2VkLlxuJChkb2N1bWVudCkub24oJ2NsaWNrLnpmLnRyaWdnZXInLCAnW2RhdGEtdG9nZ2xlXScsIGZ1bmN0aW9uKCkge1xuICBsZXQgaWQgPSAkKHRoaXMpLmRhdGEoJ3RvZ2dsZScpO1xuICBpZiAoaWQpIHtcbiAgICB0cmlnZ2VycygkKHRoaXMpLCAndG9nZ2xlJyk7XG4gIH0gZWxzZSB7XG4gICAgJCh0aGlzKS50cmlnZ2VyKCd0b2dnbGUuemYudHJpZ2dlcicpO1xuICB9XG59KTtcblxuLy8gRWxlbWVudHMgd2l0aCBbZGF0YS1jbG9zYWJsZV0gd2lsbCByZXNwb25kIHRvIGNsb3NlLnpmLnRyaWdnZXIgZXZlbnRzLlxuJChkb2N1bWVudCkub24oJ2Nsb3NlLnpmLnRyaWdnZXInLCAnW2RhdGEtY2xvc2FibGVdJywgZnVuY3Rpb24oZSl7XG4gIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gIGxldCBhbmltYXRpb24gPSAkKHRoaXMpLmRhdGEoJ2Nsb3NhYmxlJyk7XG5cbiAgaWYoYW5pbWF0aW9uICE9PSAnJyl7XG4gICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZU91dCgkKHRoaXMpLCBhbmltYXRpb24sIGZ1bmN0aW9uKCkge1xuICAgICAgJCh0aGlzKS50cmlnZ2VyKCdjbG9zZWQuemYnKTtcbiAgICB9KTtcbiAgfWVsc2V7XG4gICAgJCh0aGlzKS5mYWRlT3V0KCkudHJpZ2dlcignY2xvc2VkLnpmJyk7XG4gIH1cbn0pO1xuXG4kKGRvY3VtZW50KS5vbignZm9jdXMuemYudHJpZ2dlciBibHVyLnpmLnRyaWdnZXInLCAnW2RhdGEtdG9nZ2xlLWZvY3VzXScsIGZ1bmN0aW9uKCkge1xuICBsZXQgaWQgPSAkKHRoaXMpLmRhdGEoJ3RvZ2dsZS1mb2N1cycpO1xuICAkKGAjJHtpZH1gKS50cmlnZ2VySGFuZGxlcigndG9nZ2xlLnpmLnRyaWdnZXInLCBbJCh0aGlzKV0pO1xufSk7XG5cbi8qKlxuKiBGaXJlcyBvbmNlIGFmdGVyIGFsbCBvdGhlciBzY3JpcHRzIGhhdmUgbG9hZGVkXG4qIEBmdW5jdGlvblxuKiBAcHJpdmF0ZVxuKi9cbiQod2luZG93KS5vbignbG9hZCcsICgpID0+IHtcbiAgY2hlY2tMaXN0ZW5lcnMoKTtcbn0pO1xuXG5mdW5jdGlvbiBjaGVja0xpc3RlbmVycygpIHtcbiAgZXZlbnRzTGlzdGVuZXIoKTtcbiAgcmVzaXplTGlzdGVuZXIoKTtcbiAgc2Nyb2xsTGlzdGVuZXIoKTtcbiAgY2xvc2VtZUxpc3RlbmVyKCk7XG59XG5cbi8vKioqKioqKiogb25seSBmaXJlcyB0aGlzIGZ1bmN0aW9uIG9uY2Ugb24gbG9hZCwgaWYgdGhlcmUncyBzb21ldGhpbmcgdG8gd2F0Y2ggKioqKioqKipcbmZ1bmN0aW9uIGNsb3NlbWVMaXN0ZW5lcihwbHVnaW5OYW1lKSB7XG4gIHZhciB5ZXRpQm94ZXMgPSAkKCdbZGF0YS15ZXRpLWJveF0nKSxcbiAgICAgIHBsdWdOYW1lcyA9IFsnZHJvcGRvd24nLCAndG9vbHRpcCcsICdyZXZlYWwnXTtcblxuICBpZihwbHVnaW5OYW1lKXtcbiAgICBpZih0eXBlb2YgcGx1Z2luTmFtZSA9PT0gJ3N0cmluZycpe1xuICAgICAgcGx1Z05hbWVzLnB1c2gocGx1Z2luTmFtZSk7XG4gICAgfWVsc2UgaWYodHlwZW9mIHBsdWdpbk5hbWUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBwbHVnaW5OYW1lWzBdID09PSAnc3RyaW5nJyl7XG4gICAgICBwbHVnTmFtZXMuY29uY2F0KHBsdWdpbk5hbWUpO1xuICAgIH1lbHNle1xuICAgICAgY29uc29sZS5lcnJvcignUGx1Z2luIG5hbWVzIG11c3QgYmUgc3RyaW5ncycpO1xuICAgIH1cbiAgfVxuICBpZih5ZXRpQm94ZXMubGVuZ3RoKXtcbiAgICBsZXQgbGlzdGVuZXJzID0gcGx1Z05hbWVzLm1hcCgobmFtZSkgPT4ge1xuICAgICAgcmV0dXJuIGBjbG9zZW1lLnpmLiR7bmFtZX1gO1xuICAgIH0pLmpvaW4oJyAnKTtcblxuICAgICQod2luZG93KS5vZmYobGlzdGVuZXJzKS5vbihsaXN0ZW5lcnMsIGZ1bmN0aW9uKGUsIHBsdWdpbklkKXtcbiAgICAgIGxldCBwbHVnaW4gPSBlLm5hbWVzcGFjZS5zcGxpdCgnLicpWzBdO1xuICAgICAgbGV0IHBsdWdpbnMgPSAkKGBbZGF0YS0ke3BsdWdpbn1dYCkubm90KGBbZGF0YS15ZXRpLWJveD1cIiR7cGx1Z2luSWR9XCJdYCk7XG5cbiAgICAgIHBsdWdpbnMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgICBsZXQgX3RoaXMgPSAkKHRoaXMpO1xuXG4gICAgICAgIF90aGlzLnRyaWdnZXJIYW5kbGVyKCdjbG9zZS56Zi50cmlnZ2VyJywgW190aGlzXSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZXNpemVMaXN0ZW5lcihkZWJvdW5jZSl7XG4gIGxldCB0aW1lcixcbiAgICAgICRub2RlcyA9ICQoJ1tkYXRhLXJlc2l6ZV0nKTtcbiAgaWYoJG5vZGVzLmxlbmd0aCl7XG4gICAgJCh3aW5kb3cpLm9mZigncmVzaXplLnpmLnRyaWdnZXInKVxuICAgIC5vbigncmVzaXplLnpmLnRyaWdnZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICBpZiAodGltZXIpIHsgY2xlYXJUaW1lb3V0KHRpbWVyKTsgfVxuXG4gICAgICB0aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblxuICAgICAgICBpZighTXV0YXRpb25PYnNlcnZlcil7Ly9mYWxsYmFjayBmb3IgSUUgOVxuICAgICAgICAgICRub2Rlcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkKHRoaXMpLnRyaWdnZXJIYW5kbGVyKCdyZXNpemVtZS56Zi50cmlnZ2VyJyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy90cmlnZ2VyIGFsbCBsaXN0ZW5pbmcgZWxlbWVudHMgYW5kIHNpZ25hbCBhIHJlc2l6ZSBldmVudFxuICAgICAgICAkbm9kZXMuYXR0cignZGF0YS1ldmVudHMnLCBcInJlc2l6ZVwiKTtcbiAgICAgIH0sIGRlYm91bmNlIHx8IDEwKTsvL2RlZmF1bHQgdGltZSB0byBlbWl0IHJlc2l6ZSBldmVudFxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNjcm9sbExpc3RlbmVyKGRlYm91bmNlKXtcbiAgbGV0IHRpbWVyLFxuICAgICAgJG5vZGVzID0gJCgnW2RhdGEtc2Nyb2xsXScpO1xuICBpZigkbm9kZXMubGVuZ3RoKXtcbiAgICAkKHdpbmRvdykub2ZmKCdzY3JvbGwuemYudHJpZ2dlcicpXG4gICAgLm9uKCdzY3JvbGwuemYudHJpZ2dlcicsIGZ1bmN0aW9uKGUpe1xuICAgICAgaWYodGltZXIpeyBjbGVhclRpbWVvdXQodGltZXIpOyB9XG5cbiAgICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuXG4gICAgICAgIGlmKCFNdXRhdGlvbk9ic2VydmVyKXsvL2ZhbGxiYWNrIGZvciBJRSA5XG4gICAgICAgICAgJG5vZGVzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICQodGhpcykudHJpZ2dlckhhbmRsZXIoJ3Njcm9sbG1lLnpmLnRyaWdnZXInKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvL3RyaWdnZXIgYWxsIGxpc3RlbmluZyBlbGVtZW50cyBhbmQgc2lnbmFsIGEgc2Nyb2xsIGV2ZW50XG4gICAgICAgICRub2Rlcy5hdHRyKCdkYXRhLWV2ZW50cycsIFwic2Nyb2xsXCIpO1xuICAgICAgfSwgZGVib3VuY2UgfHwgMTApOy8vZGVmYXVsdCB0aW1lIHRvIGVtaXQgc2Nyb2xsIGV2ZW50XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZXZlbnRzTGlzdGVuZXIoKSB7XG4gIGlmKCFNdXRhdGlvbk9ic2VydmVyKXsgcmV0dXJuIGZhbHNlOyB9XG4gIGxldCBub2RlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLXJlc2l6ZV0sIFtkYXRhLXNjcm9sbF0sIFtkYXRhLW11dGF0ZV0nKTtcblxuICAvL2VsZW1lbnQgY2FsbGJhY2tcbiAgdmFyIGxpc3RlbmluZ0VsZW1lbnRzTXV0YXRpb24gPSBmdW5jdGlvbiAobXV0YXRpb25SZWNvcmRzTGlzdCkge1xuICAgICAgdmFyICR0YXJnZXQgPSAkKG11dGF0aW9uUmVjb3Jkc0xpc3RbMF0udGFyZ2V0KTtcblxuXHQgIC8vdHJpZ2dlciB0aGUgZXZlbnQgaGFuZGxlciBmb3IgdGhlIGVsZW1lbnQgZGVwZW5kaW5nIG9uIHR5cGVcbiAgICAgIHN3aXRjaCAobXV0YXRpb25SZWNvcmRzTGlzdFswXS50eXBlKSB7XG5cbiAgICAgICAgY2FzZSBcImF0dHJpYnV0ZXNcIjpcbiAgICAgICAgICBpZiAoJHRhcmdldC5hdHRyKFwiZGF0YS1ldmVudHNcIikgPT09IFwic2Nyb2xsXCIgJiYgbXV0YXRpb25SZWNvcmRzTGlzdFswXS5hdHRyaWJ1dGVOYW1lID09PSBcImRhdGEtZXZlbnRzXCIpIHtcblx0XHQgIFx0JHRhcmdldC50cmlnZ2VySGFuZGxlcignc2Nyb2xsbWUuemYudHJpZ2dlcicsIFskdGFyZ2V0LCB3aW5kb3cucGFnZVlPZmZzZXRdKTtcblx0XHQgIH1cblx0XHQgIGlmICgkdGFyZ2V0LmF0dHIoXCJkYXRhLWV2ZW50c1wiKSA9PT0gXCJyZXNpemVcIiAmJiBtdXRhdGlvblJlY29yZHNMaXN0WzBdLmF0dHJpYnV0ZU5hbWUgPT09IFwiZGF0YS1ldmVudHNcIikge1xuXHRcdCAgXHQkdGFyZ2V0LnRyaWdnZXJIYW5kbGVyKCdyZXNpemVtZS56Zi50cmlnZ2VyJywgWyR0YXJnZXRdKTtcblx0XHQgICB9XG5cdFx0ICBpZiAobXV0YXRpb25SZWNvcmRzTGlzdFswXS5hdHRyaWJ1dGVOYW1lID09PSBcInN0eWxlXCIpIHtcblx0XHRcdCAgJHRhcmdldC5jbG9zZXN0KFwiW2RhdGEtbXV0YXRlXVwiKS5hdHRyKFwiZGF0YS1ldmVudHNcIixcIm11dGF0ZVwiKTtcblx0XHRcdCAgJHRhcmdldC5jbG9zZXN0KFwiW2RhdGEtbXV0YXRlXVwiKS50cmlnZ2VySGFuZGxlcignbXV0YXRlbWUuemYudHJpZ2dlcicsIFskdGFyZ2V0LmNsb3Nlc3QoXCJbZGF0YS1tdXRhdGVdXCIpXSk7XG5cdFx0ICB9XG5cdFx0ICBicmVhaztcblxuICAgICAgICBjYXNlIFwiY2hpbGRMaXN0XCI6XG5cdFx0ICAkdGFyZ2V0LmNsb3Nlc3QoXCJbZGF0YS1tdXRhdGVdXCIpLmF0dHIoXCJkYXRhLWV2ZW50c1wiLFwibXV0YXRlXCIpO1xuXHRcdCAgJHRhcmdldC5jbG9zZXN0KFwiW2RhdGEtbXV0YXRlXVwiKS50cmlnZ2VySGFuZGxlcignbXV0YXRlbWUuemYudHJpZ2dlcicsIFskdGFyZ2V0LmNsb3Nlc3QoXCJbZGF0YS1tdXRhdGVdXCIpXSk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIC8vbm90aGluZ1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAobm9kZXMubGVuZ3RoKSB7XG4gICAgICAvL2ZvciBlYWNoIGVsZW1lbnQgdGhhdCBuZWVkcyB0byBsaXN0ZW4gZm9yIHJlc2l6aW5nLCBzY3JvbGxpbmcsIG9yIG11dGF0aW9uIGFkZCBhIHNpbmdsZSBvYnNlcnZlclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPD0gbm9kZXMubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgIHZhciBlbGVtZW50T2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihsaXN0ZW5pbmdFbGVtZW50c011dGF0aW9uKTtcbiAgICAgICAgZWxlbWVudE9ic2VydmVyLm9ic2VydmUobm9kZXNbaV0sIHsgYXR0cmlidXRlczogdHJ1ZSwgY2hpbGRMaXN0OiB0cnVlLCBjaGFyYWN0ZXJEYXRhOiBmYWxzZSwgc3VidHJlZTogdHJ1ZSwgYXR0cmlidXRlRmlsdGVyOiBbXCJkYXRhLWV2ZW50c1wiLCBcInN0eWxlXCJdIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gW1BIXVxuLy8gRm91bmRhdGlvbi5DaGVja1dhdGNoZXJzID0gY2hlY2tXYXRjaGVycztcbkZvdW5kYXRpb24uSUhlYXJZb3UgPSBjaGVja0xpc3RlbmVycztcbi8vIEZvdW5kYXRpb24uSVNlZVlvdSA9IHNjcm9sbExpc3RlbmVyO1xuLy8gRm91bmRhdGlvbi5JRmVlbFlvdSA9IGNsb3NlbWVMaXN0ZW5lcjtcblxufShqUXVlcnkpO1xuIiwiLypcbiAgICAgXyBfICAgICAgXyAgICAgICBfXG4gX19ffCAoXykgX19ffCB8IF9fICAoXylfX19cbi8gX198IHwgfC8gX198IHwvIC8gIHwgLyBfX3xcblxcX18gXFwgfCB8IChfX3wgICA8IF8gfCBcXF9fIFxcXG58X19fL198X3xcXF9fX3xffFxcXyhfKS8gfF9fXy9cbiAgICAgICAgICAgICAgICAgICB8X18vXG5cbiBWZXJzaW9uOiAxLjguMVxuICBBdXRob3I6IEtlbiBXaGVlbGVyXG4gV2Vic2l0ZTogaHR0cDovL2tlbndoZWVsZXIuZ2l0aHViLmlvXG4gICAgRG9jczogaHR0cDovL2tlbndoZWVsZXIuZ2l0aHViLmlvL3NsaWNrXG4gICAgUmVwbzogaHR0cDovL2dpdGh1Yi5jb20va2Vud2hlZWxlci9zbGlja1xuICBJc3N1ZXM6IGh0dHA6Ly9naXRodWIuY29tL2tlbndoZWVsZXIvc2xpY2svaXNzdWVzXG5cbiAqL1xuLyogZ2xvYmFsIHdpbmRvdywgZG9jdW1lbnQsIGRlZmluZSwgalF1ZXJ5LCBzZXRJbnRlcnZhbCwgY2xlYXJJbnRlcnZhbCAqL1xuOyhmdW5jdGlvbihmYWN0b3J5KSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKFsnanF1ZXJ5J10sIGZhY3RvcnkpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCdqcXVlcnknKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZmFjdG9yeShqUXVlcnkpO1xuICAgIH1cblxufShmdW5jdGlvbigkKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIHZhciBTbGljayA9IHdpbmRvdy5TbGljayB8fCB7fTtcblxuICAgIFNsaWNrID0gKGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBpbnN0YW5jZVVpZCA9IDA7XG5cbiAgICAgICAgZnVuY3Rpb24gU2xpY2soZWxlbWVudCwgc2V0dGluZ3MpIHtcblxuICAgICAgICAgICAgdmFyIF8gPSB0aGlzLCBkYXRhU2V0dGluZ3M7XG5cbiAgICAgICAgICAgIF8uZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICAgICAgYWNjZXNzaWJpbGl0eTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhZGFwdGl2ZUhlaWdodDogZmFsc2UsXG4gICAgICAgICAgICAgICAgYXBwZW5kQXJyb3dzOiAkKGVsZW1lbnQpLFxuICAgICAgICAgICAgICAgIGFwcGVuZERvdHM6ICQoZWxlbWVudCksXG4gICAgICAgICAgICAgICAgYXJyb3dzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGFzTmF2Rm9yOiBudWxsLFxuICAgICAgICAgICAgICAgIHByZXZBcnJvdzogJzxidXR0b24gY2xhc3M9XCJzbGljay1wcmV2XCIgYXJpYS1sYWJlbD1cIlByZXZpb3VzXCIgdHlwZT1cImJ1dHRvblwiPlByZXZpb3VzPC9idXR0b24+JyxcbiAgICAgICAgICAgICAgICBuZXh0QXJyb3c6ICc8YnV0dG9uIGNsYXNzPVwic2xpY2stbmV4dFwiIGFyaWEtbGFiZWw9XCJOZXh0XCIgdHlwZT1cImJ1dHRvblwiPk5leHQ8L2J1dHRvbj4nLFxuICAgICAgICAgICAgICAgIGF1dG9wbGF5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhdXRvcGxheVNwZWVkOiAzMDAwLFxuICAgICAgICAgICAgICAgIGNlbnRlck1vZGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGNlbnRlclBhZGRpbmc6ICc1MHB4JyxcbiAgICAgICAgICAgICAgICBjc3NFYXNlOiAnZWFzZScsXG4gICAgICAgICAgICAgICAgY3VzdG9tUGFnaW5nOiBmdW5jdGlvbihzbGlkZXIsIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICQoJzxidXR0b24gdHlwZT1cImJ1dHRvblwiIC8+JykudGV4dChpICsgMSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkb3RzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkb3RzQ2xhc3M6ICdzbGljay1kb3RzJyxcbiAgICAgICAgICAgICAgICBkcmFnZ2FibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgZWFzaW5nOiAnbGluZWFyJyxcbiAgICAgICAgICAgICAgICBlZGdlRnJpY3Rpb246IDAuMzUsXG4gICAgICAgICAgICAgICAgZmFkZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgZm9jdXNPblNlbGVjdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgZm9jdXNPbkNoYW5nZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgaW5maW5pdGU6IHRydWUsXG4gICAgICAgICAgICAgICAgaW5pdGlhbFNsaWRlOiAwLFxuICAgICAgICAgICAgICAgIGxhenlMb2FkOiAnb25kZW1hbmQnLFxuICAgICAgICAgICAgICAgIG1vYmlsZUZpcnN0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBwYXVzZU9uSG92ZXI6IHRydWUsXG4gICAgICAgICAgICAgICAgcGF1c2VPbkZvY3VzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHBhdXNlT25Eb3RzSG92ZXI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHJlc3BvbmRUbzogJ3dpbmRvdycsXG4gICAgICAgICAgICAgICAgcmVzcG9uc2l2ZTogbnVsbCxcbiAgICAgICAgICAgICAgICByb3dzOiAxLFxuICAgICAgICAgICAgICAgIHJ0bDogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2xpZGU6ICcnLFxuICAgICAgICAgICAgICAgIHNsaWRlc1BlclJvdzogMSxcbiAgICAgICAgICAgICAgICBzbGlkZXNUb1Nob3c6IDEsXG4gICAgICAgICAgICAgICAgc2xpZGVzVG9TY3JvbGw6IDEsXG4gICAgICAgICAgICAgICAgc3BlZWQ6IDUwMCxcbiAgICAgICAgICAgICAgICBzd2lwZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzd2lwZVRvU2xpZGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHRvdWNoTW92ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB0b3VjaFRocmVzaG9sZDogNSxcbiAgICAgICAgICAgICAgICB1c2VDU1M6IHRydWUsXG4gICAgICAgICAgICAgICAgdXNlVHJhbnNmb3JtOiB0cnVlLFxuICAgICAgICAgICAgICAgIHZhcmlhYmxlV2lkdGg6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHZlcnRpY2FsOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB2ZXJ0aWNhbFN3aXBpbmc6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHdhaXRGb3JBbmltYXRlOiB0cnVlLFxuICAgICAgICAgICAgICAgIHpJbmRleDogMTAwMFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgXy5pbml0aWFscyA9IHtcbiAgICAgICAgICAgICAgICBhbmltYXRpbmc6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGRyYWdnaW5nOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhdXRvUGxheVRpbWVyOiBudWxsLFxuICAgICAgICAgICAgICAgIGN1cnJlbnREaXJlY3Rpb246IDAsXG4gICAgICAgICAgICAgICAgY3VycmVudExlZnQ6IG51bGwsXG4gICAgICAgICAgICAgICAgY3VycmVudFNsaWRlOiAwLFxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbjogMSxcbiAgICAgICAgICAgICAgICAkZG90czogbnVsbCxcbiAgICAgICAgICAgICAgICBsaXN0V2lkdGg6IG51bGwsXG4gICAgICAgICAgICAgICAgbGlzdEhlaWdodDogbnVsbCxcbiAgICAgICAgICAgICAgICBsb2FkSW5kZXg6IDAsXG4gICAgICAgICAgICAgICAgJG5leHRBcnJvdzogbnVsbCxcbiAgICAgICAgICAgICAgICAkcHJldkFycm93OiBudWxsLFxuICAgICAgICAgICAgICAgIHNjcm9sbGluZzogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2xpZGVDb3VudDogbnVsbCxcbiAgICAgICAgICAgICAgICBzbGlkZVdpZHRoOiBudWxsLFxuICAgICAgICAgICAgICAgICRzbGlkZVRyYWNrOiBudWxsLFxuICAgICAgICAgICAgICAgICRzbGlkZXM6IG51bGwsXG4gICAgICAgICAgICAgICAgc2xpZGluZzogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2xpZGVPZmZzZXQ6IDAsXG4gICAgICAgICAgICAgICAgc3dpcGVMZWZ0OiBudWxsLFxuICAgICAgICAgICAgICAgIHN3aXBpbmc6IGZhbHNlLFxuICAgICAgICAgICAgICAgICRsaXN0OiBudWxsLFxuICAgICAgICAgICAgICAgIHRvdWNoT2JqZWN0OiB7fSxcbiAgICAgICAgICAgICAgICB0cmFuc2Zvcm1zRW5hYmxlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgdW5zbGlja2VkOiBmYWxzZVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgJC5leHRlbmQoXywgXy5pbml0aWFscyk7XG5cbiAgICAgICAgICAgIF8uYWN0aXZlQnJlYWtwb2ludCA9IG51bGw7XG4gICAgICAgICAgICBfLmFuaW1UeXBlID0gbnVsbDtcbiAgICAgICAgICAgIF8uYW5pbVByb3AgPSBudWxsO1xuICAgICAgICAgICAgXy5icmVha3BvaW50cyA9IFtdO1xuICAgICAgICAgICAgXy5icmVha3BvaW50U2V0dGluZ3MgPSBbXTtcbiAgICAgICAgICAgIF8uY3NzVHJhbnNpdGlvbnMgPSBmYWxzZTtcbiAgICAgICAgICAgIF8uZm9jdXNzZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIF8uaW50ZXJydXB0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIF8uaGlkZGVuID0gJ2hpZGRlbic7XG4gICAgICAgICAgICBfLnBhdXNlZCA9IHRydWU7XG4gICAgICAgICAgICBfLnBvc2l0aW9uUHJvcCA9IG51bGw7XG4gICAgICAgICAgICBfLnJlc3BvbmRUbyA9IG51bGw7XG4gICAgICAgICAgICBfLnJvd0NvdW50ID0gMTtcbiAgICAgICAgICAgIF8uc2hvdWxkQ2xpY2sgPSB0cnVlO1xuICAgICAgICAgICAgXy4kc2xpZGVyID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIF8uJHNsaWRlc0NhY2hlID0gbnVsbDtcbiAgICAgICAgICAgIF8udHJhbnNmb3JtVHlwZSA9IG51bGw7XG4gICAgICAgICAgICBfLnRyYW5zaXRpb25UeXBlID0gbnVsbDtcbiAgICAgICAgICAgIF8udmlzaWJpbGl0eUNoYW5nZSA9ICd2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICAgICAgICAgIF8ud2luZG93V2lkdGggPSAwO1xuICAgICAgICAgICAgXy53aW5kb3dUaW1lciA9IG51bGw7XG5cbiAgICAgICAgICAgIGRhdGFTZXR0aW5ncyA9ICQoZWxlbWVudCkuZGF0YSgnc2xpY2snKSB8fCB7fTtcblxuICAgICAgICAgICAgXy5vcHRpb25zID0gJC5leHRlbmQoe30sIF8uZGVmYXVsdHMsIHNldHRpbmdzLCBkYXRhU2V0dGluZ3MpO1xuXG4gICAgICAgICAgICBfLmN1cnJlbnRTbGlkZSA9IF8ub3B0aW9ucy5pbml0aWFsU2xpZGU7XG5cbiAgICAgICAgICAgIF8ub3JpZ2luYWxTZXR0aW5ncyA9IF8ub3B0aW9ucztcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBkb2N1bWVudC5tb3pIaWRkZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgXy5oaWRkZW4gPSAnbW96SGlkZGVuJztcbiAgICAgICAgICAgICAgICBfLnZpc2liaWxpdHlDaGFuZ2UgPSAnbW96dmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC53ZWJraXRIaWRkZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgXy5oaWRkZW4gPSAnd2Via2l0SGlkZGVuJztcbiAgICAgICAgICAgICAgICBfLnZpc2liaWxpdHlDaGFuZ2UgPSAnd2Via2l0dmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF8uYXV0b1BsYXkgPSAkLnByb3h5KF8uYXV0b1BsYXksIF8pO1xuICAgICAgICAgICAgXy5hdXRvUGxheUNsZWFyID0gJC5wcm94eShfLmF1dG9QbGF5Q2xlYXIsIF8pO1xuICAgICAgICAgICAgXy5hdXRvUGxheUl0ZXJhdG9yID0gJC5wcm94eShfLmF1dG9QbGF5SXRlcmF0b3IsIF8pO1xuICAgICAgICAgICAgXy5jaGFuZ2VTbGlkZSA9ICQucHJveHkoXy5jaGFuZ2VTbGlkZSwgXyk7XG4gICAgICAgICAgICBfLmNsaWNrSGFuZGxlciA9ICQucHJveHkoXy5jbGlja0hhbmRsZXIsIF8pO1xuICAgICAgICAgICAgXy5zZWxlY3RIYW5kbGVyID0gJC5wcm94eShfLnNlbGVjdEhhbmRsZXIsIF8pO1xuICAgICAgICAgICAgXy5zZXRQb3NpdGlvbiA9ICQucHJveHkoXy5zZXRQb3NpdGlvbiwgXyk7XG4gICAgICAgICAgICBfLnN3aXBlSGFuZGxlciA9ICQucHJveHkoXy5zd2lwZUhhbmRsZXIsIF8pO1xuICAgICAgICAgICAgXy5kcmFnSGFuZGxlciA9ICQucHJveHkoXy5kcmFnSGFuZGxlciwgXyk7XG4gICAgICAgICAgICBfLmtleUhhbmRsZXIgPSAkLnByb3h5KF8ua2V5SGFuZGxlciwgXyk7XG5cbiAgICAgICAgICAgIF8uaW5zdGFuY2VVaWQgPSBpbnN0YW5jZVVpZCsrO1xuXG4gICAgICAgICAgICAvLyBBIHNpbXBsZSB3YXkgdG8gY2hlY2sgZm9yIEhUTUwgc3RyaW5nc1xuICAgICAgICAgICAgLy8gU3RyaWN0IEhUTUwgcmVjb2duaXRpb24gKG11c3Qgc3RhcnQgd2l0aCA8KVxuICAgICAgICAgICAgLy8gRXh0cmFjdGVkIGZyb20galF1ZXJ5IHYxLjExIHNvdXJjZVxuICAgICAgICAgICAgXy5odG1sRXhwciA9IC9eKD86XFxzKig8W1xcd1xcV10rPilbXj5dKikkLztcblxuXG4gICAgICAgICAgICBfLnJlZ2lzdGVyQnJlYWtwb2ludHMoKTtcbiAgICAgICAgICAgIF8uaW5pdCh0cnVlKTtcblxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFNsaWNrO1xuXG4gICAgfSgpKTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5hY3RpdmF0ZUFEQSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgXy4kc2xpZGVUcmFjay5maW5kKCcuc2xpY2stYWN0aXZlJykuYXR0cih7XG4gICAgICAgICAgICAnYXJpYS1oaWRkZW4nOiAnZmFsc2UnXG4gICAgICAgIH0pLmZpbmQoJ2EsIGlucHV0LCBidXR0b24sIHNlbGVjdCcpLmF0dHIoe1xuICAgICAgICAgICAgJ3RhYmluZGV4JzogJzAnXG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5hZGRTbGlkZSA9IFNsaWNrLnByb3RvdHlwZS5zbGlja0FkZCA9IGZ1bmN0aW9uKG1hcmt1cCwgaW5kZXgsIGFkZEJlZm9yZSkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBpZiAodHlwZW9mKGluZGV4KSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICBhZGRCZWZvcmUgPSBpbmRleDtcbiAgICAgICAgICAgIGluZGV4ID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIGlmIChpbmRleCA8IDAgfHwgKGluZGV4ID49IF8uc2xpZGVDb3VudCkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIF8udW5sb2FkKCk7XG5cbiAgICAgICAgaWYgKHR5cGVvZihpbmRleCkgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBpZiAoaW5kZXggPT09IDAgJiYgXy4kc2xpZGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICQobWFya3VwKS5hcHBlbmRUbyhfLiRzbGlkZVRyYWNrKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYWRkQmVmb3JlKSB7XG4gICAgICAgICAgICAgICAgJChtYXJrdXApLmluc2VydEJlZm9yZShfLiRzbGlkZXMuZXEoaW5kZXgpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJChtYXJrdXApLmluc2VydEFmdGVyKF8uJHNsaWRlcy5lcShpbmRleCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGFkZEJlZm9yZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICQobWFya3VwKS5wcmVwZW5kVG8oXy4kc2xpZGVUcmFjayk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQobWFya3VwKS5hcHBlbmRUbyhfLiRzbGlkZVRyYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIF8uJHNsaWRlcyA9IF8uJHNsaWRlVHJhY2suY2hpbGRyZW4odGhpcy5vcHRpb25zLnNsaWRlKTtcblxuICAgICAgICBfLiRzbGlkZVRyYWNrLmNoaWxkcmVuKHRoaXMub3B0aW9ucy5zbGlkZSkuZGV0YWNoKCk7XG5cbiAgICAgICAgXy4kc2xpZGVUcmFjay5hcHBlbmQoXy4kc2xpZGVzKTtcblxuICAgICAgICBfLiRzbGlkZXMuZWFjaChmdW5jdGlvbihpbmRleCwgZWxlbWVudCkge1xuICAgICAgICAgICAgJChlbGVtZW50KS5hdHRyKCdkYXRhLXNsaWNrLWluZGV4JywgaW5kZXgpO1xuICAgICAgICB9KTtcblxuICAgICAgICBfLiRzbGlkZXNDYWNoZSA9IF8uJHNsaWRlcztcblxuICAgICAgICBfLnJlaW5pdCgpO1xuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5hbmltYXRlSGVpZ2h0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBfID0gdGhpcztcbiAgICAgICAgaWYgKF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgPT09IDEgJiYgXy5vcHRpb25zLmFkYXB0aXZlSGVpZ2h0ID09PSB0cnVlICYmIF8ub3B0aW9ucy52ZXJ0aWNhbCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHZhciB0YXJnZXRIZWlnaHQgPSBfLiRzbGlkZXMuZXEoXy5jdXJyZW50U2xpZGUpLm91dGVySGVpZ2h0KHRydWUpO1xuICAgICAgICAgICAgXy4kbGlzdC5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IHRhcmdldEhlaWdodFxuICAgICAgICAgICAgfSwgXy5vcHRpb25zLnNwZWVkKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuYW5pbWF0ZVNsaWRlID0gZnVuY3Rpb24odGFyZ2V0TGVmdCwgY2FsbGJhY2spIHtcblxuICAgICAgICB2YXIgYW5pbVByb3BzID0ge30sXG4gICAgICAgICAgICBfID0gdGhpcztcblxuICAgICAgICBfLmFuaW1hdGVIZWlnaHQoKTtcblxuICAgICAgICBpZiAoXy5vcHRpb25zLnJ0bCA9PT0gdHJ1ZSAmJiBfLm9wdGlvbnMudmVydGljYWwgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICB0YXJnZXRMZWZ0ID0gLXRhcmdldExlZnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKF8udHJhbnNmb3Jtc0VuYWJsZWQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBpZiAoXy5vcHRpb25zLnZlcnRpY2FsID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIF8uJHNsaWRlVHJhY2suYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IHRhcmdldExlZnRcbiAgICAgICAgICAgICAgICB9LCBfLm9wdGlvbnMuc3BlZWQsIF8ub3B0aW9ucy5lYXNpbmcsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgXy4kc2xpZGVUcmFjay5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgdG9wOiB0YXJnZXRMZWZ0XG4gICAgICAgICAgICAgICAgfSwgXy5vcHRpb25zLnNwZWVkLCBfLm9wdGlvbnMuZWFzaW5nLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgaWYgKF8uY3NzVHJhbnNpdGlvbnMgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8ub3B0aW9ucy5ydGwgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgXy5jdXJyZW50TGVmdCA9IC0oXy5jdXJyZW50TGVmdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoe1xuICAgICAgICAgICAgICAgICAgICBhbmltU3RhcnQ6IF8uY3VycmVudExlZnRcbiAgICAgICAgICAgICAgICB9KS5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgYW5pbVN0YXJ0OiB0YXJnZXRMZWZ0XG4gICAgICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbjogXy5vcHRpb25zLnNwZWVkLFxuICAgICAgICAgICAgICAgICAgICBlYXNpbmc6IF8ub3B0aW9ucy5lYXNpbmcsXG4gICAgICAgICAgICAgICAgICAgIHN0ZXA6IGZ1bmN0aW9uKG5vdykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm93ID0gTWF0aC5jZWlsKG5vdyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoXy5vcHRpb25zLnZlcnRpY2FsID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuaW1Qcm9wc1tfLmFuaW1UeXBlXSA9ICd0cmFuc2xhdGUoJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vdyArICdweCwgMHB4KSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXy4kc2xpZGVUcmFjay5jc3MoYW5pbVByb3BzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5pbVByb3BzW18uYW5pbVR5cGVdID0gJ3RyYW5zbGF0ZSgwcHgsJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vdyArICdweCknO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8uJHNsaWRlVHJhY2suY3NzKGFuaW1Qcm9wcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgXy5hcHBseVRyYW5zaXRpb24oKTtcbiAgICAgICAgICAgICAgICB0YXJnZXRMZWZ0ID0gTWF0aC5jZWlsKHRhcmdldExlZnQpO1xuXG4gICAgICAgICAgICAgICAgaWYgKF8ub3B0aW9ucy52ZXJ0aWNhbCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgYW5pbVByb3BzW18uYW5pbVR5cGVdID0gJ3RyYW5zbGF0ZTNkKCcgKyB0YXJnZXRMZWZ0ICsgJ3B4LCAwcHgsIDBweCknO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGFuaW1Qcm9wc1tfLmFuaW1UeXBlXSA9ICd0cmFuc2xhdGUzZCgwcHgsJyArIHRhcmdldExlZnQgKyAncHgsIDBweCknO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBfLiRzbGlkZVRyYWNrLmNzcyhhbmltUHJvcHMpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIF8uZGlzYWJsZVRyYW5zaXRpb24oKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbCgpO1xuICAgICAgICAgICAgICAgICAgICB9LCBfLm9wdGlvbnMuc3BlZWQpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuZ2V0TmF2VGFyZ2V0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzLFxuICAgICAgICAgICAgYXNOYXZGb3IgPSBfLm9wdGlvbnMuYXNOYXZGb3I7XG5cbiAgICAgICAgaWYgKCBhc05hdkZvciAmJiBhc05hdkZvciAhPT0gbnVsbCApIHtcbiAgICAgICAgICAgIGFzTmF2Rm9yID0gJChhc05hdkZvcikubm90KF8uJHNsaWRlcik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYXNOYXZGb3I7XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmFzTmF2Rm9yID0gZnVuY3Rpb24oaW5kZXgpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXMsXG4gICAgICAgICAgICBhc05hdkZvciA9IF8uZ2V0TmF2VGFyZ2V0KCk7XG5cbiAgICAgICAgaWYgKCBhc05hdkZvciAhPT0gbnVsbCAmJiB0eXBlb2YgYXNOYXZGb3IgPT09ICdvYmplY3QnICkge1xuICAgICAgICAgICAgYXNOYXZGb3IuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0ID0gJCh0aGlzKS5zbGljaygnZ2V0U2xpY2snKTtcbiAgICAgICAgICAgICAgICBpZighdGFyZ2V0LnVuc2xpY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQuc2xpZGVIYW5kbGVyKGluZGV4LCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5hcHBseVRyYW5zaXRpb24gPSBmdW5jdGlvbihzbGlkZSkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcyxcbiAgICAgICAgICAgIHRyYW5zaXRpb24gPSB7fTtcblxuICAgICAgICBpZiAoXy5vcHRpb25zLmZhZGUgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICB0cmFuc2l0aW9uW18udHJhbnNpdGlvblR5cGVdID0gXy50cmFuc2Zvcm1UeXBlICsgJyAnICsgXy5vcHRpb25zLnNwZWVkICsgJ21zICcgKyBfLm9wdGlvbnMuY3NzRWFzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRyYW5zaXRpb25bXy50cmFuc2l0aW9uVHlwZV0gPSAnb3BhY2l0eSAnICsgXy5vcHRpb25zLnNwZWVkICsgJ21zICcgKyBfLm9wdGlvbnMuY3NzRWFzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuZmFkZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIF8uJHNsaWRlVHJhY2suY3NzKHRyYW5zaXRpb24pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgXy4kc2xpZGVzLmVxKHNsaWRlKS5jc3ModHJhbnNpdGlvbik7XG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuYXV0b1BsYXkgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgXy5hdXRvUGxheUNsZWFyKCk7XG5cbiAgICAgICAgaWYgKCBfLnNsaWRlQ291bnQgPiBfLm9wdGlvbnMuc2xpZGVzVG9TaG93ICkge1xuICAgICAgICAgICAgXy5hdXRvUGxheVRpbWVyID0gc2V0SW50ZXJ2YWwoIF8uYXV0b1BsYXlJdGVyYXRvciwgXy5vcHRpb25zLmF1dG9wbGF5U3BlZWQgKTtcbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5hdXRvUGxheUNsZWFyID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIGlmIChfLmF1dG9QbGF5VGltZXIpIHtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoXy5hdXRvUGxheVRpbWVyKTtcbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5hdXRvUGxheUl0ZXJhdG9yID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzLFxuICAgICAgICAgICAgc2xpZGVUbyA9IF8uY3VycmVudFNsaWRlICsgXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsO1xuXG4gICAgICAgIGlmICggIV8ucGF1c2VkICYmICFfLmludGVycnVwdGVkICYmICFfLmZvY3Vzc2VkICkge1xuXG4gICAgICAgICAgICBpZiAoIF8ub3B0aW9ucy5pbmZpbml0ZSA9PT0gZmFsc2UgKSB7XG5cbiAgICAgICAgICAgICAgICBpZiAoIF8uZGlyZWN0aW9uID09PSAxICYmICggXy5jdXJyZW50U2xpZGUgKyAxICkgPT09ICggXy5zbGlkZUNvdW50IC0gMSApKSB7XG4gICAgICAgICAgICAgICAgICAgIF8uZGlyZWN0aW9uID0gMDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBlbHNlIGlmICggXy5kaXJlY3Rpb24gPT09IDAgKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgc2xpZGVUbyA9IF8uY3VycmVudFNsaWRlIC0gXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICggXy5jdXJyZW50U2xpZGUgLSAxID09PSAwICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5kaXJlY3Rpb24gPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgXy5zbGlkZUhhbmRsZXIoIHNsaWRlVG8gKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmJ1aWxkQXJyb3dzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuYXJyb3dzID09PSB0cnVlICkge1xuXG4gICAgICAgICAgICBfLiRwcmV2QXJyb3cgPSAkKF8ub3B0aW9ucy5wcmV2QXJyb3cpLmFkZENsYXNzKCdzbGljay1hcnJvdycpO1xuICAgICAgICAgICAgXy4kbmV4dEFycm93ID0gJChfLm9wdGlvbnMubmV4dEFycm93KS5hZGRDbGFzcygnc2xpY2stYXJyb3cnKTtcblxuICAgICAgICAgICAgaWYoIF8uc2xpZGVDb3VudCA+IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgKSB7XG5cbiAgICAgICAgICAgICAgICBfLiRwcmV2QXJyb3cucmVtb3ZlQ2xhc3MoJ3NsaWNrLWhpZGRlbicpLnJlbW92ZUF0dHIoJ2FyaWEtaGlkZGVuIHRhYmluZGV4Jyk7XG4gICAgICAgICAgICAgICAgXy4kbmV4dEFycm93LnJlbW92ZUNsYXNzKCdzbGljay1oaWRkZW4nKS5yZW1vdmVBdHRyKCdhcmlhLWhpZGRlbiB0YWJpbmRleCcpO1xuXG4gICAgICAgICAgICAgICAgaWYgKF8uaHRtbEV4cHIudGVzdChfLm9wdGlvbnMucHJldkFycm93KSkge1xuICAgICAgICAgICAgICAgICAgICBfLiRwcmV2QXJyb3cucHJlcGVuZFRvKF8ub3B0aW9ucy5hcHBlbmRBcnJvd3MpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChfLmh0bWxFeHByLnRlc3QoXy5vcHRpb25zLm5leHRBcnJvdykpIHtcbiAgICAgICAgICAgICAgICAgICAgXy4kbmV4dEFycm93LmFwcGVuZFRvKF8ub3B0aW9ucy5hcHBlbmRBcnJvd3MpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChfLm9wdGlvbnMuaW5maW5pdGUgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgXy4kcHJldkFycm93XG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3NsaWNrLWRpc2FibGVkJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKCdhcmlhLWRpc2FibGVkJywgJ3RydWUnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICBfLiRwcmV2QXJyb3cuYWRkKCBfLiRuZXh0QXJyb3cgKVxuXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnc2xpY2staGlkZGVuJylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2FyaWEtZGlzYWJsZWQnOiAndHJ1ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAndGFiaW5kZXgnOiAnLTEnXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5idWlsZERvdHMgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXMsXG4gICAgICAgICAgICBpLCBkb3Q7XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5kb3RzID09PSB0cnVlICYmIF8uc2xpZGVDb3VudCA+IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpIHtcblxuICAgICAgICAgICAgXy4kc2xpZGVyLmFkZENsYXNzKCdzbGljay1kb3R0ZWQnKTtcblxuICAgICAgICAgICAgZG90ID0gJCgnPHVsIC8+JykuYWRkQ2xhc3MoXy5vcHRpb25zLmRvdHNDbGFzcyk7XG5cbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPD0gXy5nZXREb3RDb3VudCgpOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICBkb3QuYXBwZW5kKCQoJzxsaSAvPicpLmFwcGVuZChfLm9wdGlvbnMuY3VzdG9tUGFnaW5nLmNhbGwodGhpcywgXywgaSkpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgXy4kZG90cyA9IGRvdC5hcHBlbmRUbyhfLm9wdGlvbnMuYXBwZW5kRG90cyk7XG5cbiAgICAgICAgICAgIF8uJGRvdHMuZmluZCgnbGknKS5maXJzdCgpLmFkZENsYXNzKCdzbGljay1hY3RpdmUnKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmJ1aWxkT3V0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIF8uJHNsaWRlcyA9XG4gICAgICAgICAgICBfLiRzbGlkZXJcbiAgICAgICAgICAgICAgICAuY2hpbGRyZW4oIF8ub3B0aW9ucy5zbGlkZSArICc6bm90KC5zbGljay1jbG9uZWQpJylcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3NsaWNrLXNsaWRlJyk7XG5cbiAgICAgICAgXy5zbGlkZUNvdW50ID0gXy4kc2xpZGVzLmxlbmd0aDtcblxuICAgICAgICBfLiRzbGlkZXMuZWFjaChmdW5jdGlvbihpbmRleCwgZWxlbWVudCkge1xuICAgICAgICAgICAgJChlbGVtZW50KVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXNsaWNrLWluZGV4JywgaW5kZXgpXG4gICAgICAgICAgICAgICAgLmRhdGEoJ29yaWdpbmFsU3R5bGluZycsICQoZWxlbWVudCkuYXR0cignc3R5bGUnKSB8fCAnJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIF8uJHNsaWRlci5hZGRDbGFzcygnc2xpY2stc2xpZGVyJyk7XG5cbiAgICAgICAgXy4kc2xpZGVUcmFjayA9IChfLnNsaWRlQ291bnQgPT09IDApID9cbiAgICAgICAgICAgICQoJzxkaXYgY2xhc3M9XCJzbGljay10cmFja1wiLz4nKS5hcHBlbmRUbyhfLiRzbGlkZXIpIDpcbiAgICAgICAgICAgIF8uJHNsaWRlcy53cmFwQWxsKCc8ZGl2IGNsYXNzPVwic2xpY2stdHJhY2tcIi8+JykucGFyZW50KCk7XG5cbiAgICAgICAgXy4kbGlzdCA9IF8uJHNsaWRlVHJhY2sud3JhcChcbiAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwic2xpY2stbGlzdFwiLz4nKS5wYXJlbnQoKTtcbiAgICAgICAgXy4kc2xpZGVUcmFjay5jc3MoJ29wYWNpdHknLCAwKTtcblxuICAgICAgICBpZiAoXy5vcHRpb25zLmNlbnRlck1vZGUgPT09IHRydWUgfHwgXy5vcHRpb25zLnN3aXBlVG9TbGlkZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsID0gMTtcbiAgICAgICAgfVxuXG4gICAgICAgICQoJ2ltZ1tkYXRhLWxhenldJywgXy4kc2xpZGVyKS5ub3QoJ1tzcmNdJykuYWRkQ2xhc3MoJ3NsaWNrLWxvYWRpbmcnKTtcblxuICAgICAgICBfLnNldHVwSW5maW5pdGUoKTtcblxuICAgICAgICBfLmJ1aWxkQXJyb3dzKCk7XG5cbiAgICAgICAgXy5idWlsZERvdHMoKTtcblxuICAgICAgICBfLnVwZGF0ZURvdHMoKTtcblxuXG4gICAgICAgIF8uc2V0U2xpZGVDbGFzc2VzKHR5cGVvZiBfLmN1cnJlbnRTbGlkZSA9PT0gJ251bWJlcicgPyBfLmN1cnJlbnRTbGlkZSA6IDApO1xuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuZHJhZ2dhYmxlID09PSB0cnVlKSB7XG4gICAgICAgICAgICBfLiRsaXN0LmFkZENsYXNzKCdkcmFnZ2FibGUnKTtcbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5idWlsZFJvd3MgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXMsIGEsIGIsIGMsIG5ld1NsaWRlcywgbnVtT2ZTbGlkZXMsIG9yaWdpbmFsU2xpZGVzLHNsaWRlc1BlclNlY3Rpb247XG5cbiAgICAgICAgbmV3U2xpZGVzID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICBvcmlnaW5hbFNsaWRlcyA9IF8uJHNsaWRlci5jaGlsZHJlbigpO1xuXG4gICAgICAgIGlmKF8ub3B0aW9ucy5yb3dzID4gMCkge1xuXG4gICAgICAgICAgICBzbGlkZXNQZXJTZWN0aW9uID0gXy5vcHRpb25zLnNsaWRlc1BlclJvdyAqIF8ub3B0aW9ucy5yb3dzO1xuICAgICAgICAgICAgbnVtT2ZTbGlkZXMgPSBNYXRoLmNlaWwoXG4gICAgICAgICAgICAgICAgb3JpZ2luYWxTbGlkZXMubGVuZ3RoIC8gc2xpZGVzUGVyU2VjdGlvblxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgZm9yKGEgPSAwOyBhIDwgbnVtT2ZTbGlkZXM7IGErKyl7XG4gICAgICAgICAgICAgICAgdmFyIHNsaWRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICAgICAgZm9yKGIgPSAwOyBiIDwgXy5vcHRpb25zLnJvd3M7IGIrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICAgICAgICAgIGZvcihjID0gMDsgYyA8IF8ub3B0aW9ucy5zbGlkZXNQZXJSb3c7IGMrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRhcmdldCA9IChhICogc2xpZGVzUGVyU2VjdGlvbiArICgoYiAqIF8ub3B0aW9ucy5zbGlkZXNQZXJSb3cpICsgYykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9yaWdpbmFsU2xpZGVzLmdldCh0YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcm93LmFwcGVuZENoaWxkKG9yaWdpbmFsU2xpZGVzLmdldCh0YXJnZXQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzbGlkZS5hcHBlbmRDaGlsZChyb3cpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBuZXdTbGlkZXMuYXBwZW5kQ2hpbGQoc2xpZGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBfLiRzbGlkZXIuZW1wdHkoKS5hcHBlbmQobmV3U2xpZGVzKTtcbiAgICAgICAgICAgIF8uJHNsaWRlci5jaGlsZHJlbigpLmNoaWxkcmVuKCkuY2hpbGRyZW4oKVxuICAgICAgICAgICAgICAgIC5jc3Moe1xuICAgICAgICAgICAgICAgICAgICAnd2lkdGgnOigxMDAgLyBfLm9wdGlvbnMuc2xpZGVzUGVyUm93KSArICclJyxcbiAgICAgICAgICAgICAgICAgICAgJ2Rpc3BsYXknOiAnaW5saW5lLWJsb2NrJ1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuY2hlY2tSZXNwb25zaXZlID0gZnVuY3Rpb24oaW5pdGlhbCwgZm9yY2VVcGRhdGUpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXMsXG4gICAgICAgICAgICBicmVha3BvaW50LCB0YXJnZXRCcmVha3BvaW50LCByZXNwb25kVG9XaWR0aCwgdHJpZ2dlckJyZWFrcG9pbnQgPSBmYWxzZTtcbiAgICAgICAgdmFyIHNsaWRlcldpZHRoID0gXy4kc2xpZGVyLndpZHRoKCk7XG4gICAgICAgIHZhciB3aW5kb3dXaWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoIHx8ICQod2luZG93KS53aWR0aCgpO1xuXG4gICAgICAgIGlmIChfLnJlc3BvbmRUbyA9PT0gJ3dpbmRvdycpIHtcbiAgICAgICAgICAgIHJlc3BvbmRUb1dpZHRoID0gd2luZG93V2lkdGg7XG4gICAgICAgIH0gZWxzZSBpZiAoXy5yZXNwb25kVG8gPT09ICdzbGlkZXInKSB7XG4gICAgICAgICAgICByZXNwb25kVG9XaWR0aCA9IHNsaWRlcldpZHRoO1xuICAgICAgICB9IGVsc2UgaWYgKF8ucmVzcG9uZFRvID09PSAnbWluJykge1xuICAgICAgICAgICAgcmVzcG9uZFRvV2lkdGggPSBNYXRoLm1pbih3aW5kb3dXaWR0aCwgc2xpZGVyV2lkdGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCBfLm9wdGlvbnMucmVzcG9uc2l2ZSAmJlxuICAgICAgICAgICAgXy5vcHRpb25zLnJlc3BvbnNpdmUubGVuZ3RoICYmXG4gICAgICAgICAgICBfLm9wdGlvbnMucmVzcG9uc2l2ZSAhPT0gbnVsbCkge1xuXG4gICAgICAgICAgICB0YXJnZXRCcmVha3BvaW50ID0gbnVsbDtcblxuICAgICAgICAgICAgZm9yIChicmVha3BvaW50IGluIF8uYnJlYWtwb2ludHMpIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5icmVha3BvaW50cy5oYXNPd25Qcm9wZXJ0eShicmVha3BvaW50KSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoXy5vcmlnaW5hbFNldHRpbmdzLm1vYmlsZUZpcnN0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbmRUb1dpZHRoIDwgXy5icmVha3BvaW50c1ticmVha3BvaW50XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldEJyZWFrcG9pbnQgPSBfLmJyZWFrcG9pbnRzW2JyZWFrcG9pbnRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbmRUb1dpZHRoID4gXy5icmVha3BvaW50c1ticmVha3BvaW50XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldEJyZWFrcG9pbnQgPSBfLmJyZWFrcG9pbnRzW2JyZWFrcG9pbnRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGFyZ2V0QnJlYWtwb2ludCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmIChfLmFjdGl2ZUJyZWFrcG9pbnQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRhcmdldEJyZWFrcG9pbnQgIT09IF8uYWN0aXZlQnJlYWtwb2ludCB8fCBmb3JjZVVwZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5hY3RpdmVCcmVha3BvaW50ID1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRCcmVha3BvaW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF8uYnJlYWtwb2ludFNldHRpbmdzW3RhcmdldEJyZWFrcG9pbnRdID09PSAndW5zbGljaycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLnVuc2xpY2sodGFyZ2V0QnJlYWtwb2ludCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8ub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBfLm9yaWdpbmFsU2V0dGluZ3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8uYnJlYWtwb2ludFNldHRpbmdzW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0QnJlYWtwb2ludF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbml0aWFsID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8uY3VycmVudFNsaWRlID0gXy5vcHRpb25zLmluaXRpYWxTbGlkZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5yZWZyZXNoKGluaXRpYWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdHJpZ2dlckJyZWFrcG9pbnQgPSB0YXJnZXRCcmVha3BvaW50O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgXy5hY3RpdmVCcmVha3BvaW50ID0gdGFyZ2V0QnJlYWtwb2ludDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKF8uYnJlYWtwb2ludFNldHRpbmdzW3RhcmdldEJyZWFrcG9pbnRdID09PSAndW5zbGljaycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF8udW5zbGljayh0YXJnZXRCcmVha3BvaW50KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF8ub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBfLm9yaWdpbmFsU2V0dGluZ3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5icmVha3BvaW50U2V0dGluZ3NbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldEJyZWFrcG9pbnRdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbml0aWFsID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5jdXJyZW50U2xpZGUgPSBfLm9wdGlvbnMuaW5pdGlhbFNsaWRlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXy5yZWZyZXNoKGluaXRpYWwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRyaWdnZXJCcmVha3BvaW50ID0gdGFyZ2V0QnJlYWtwb2ludDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChfLmFjdGl2ZUJyZWFrcG9pbnQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgXy5hY3RpdmVCcmVha3BvaW50ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgXy5vcHRpb25zID0gXy5vcmlnaW5hbFNldHRpbmdzO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5pdGlhbCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5jdXJyZW50U2xpZGUgPSBfLm9wdGlvbnMuaW5pdGlhbFNsaWRlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIF8ucmVmcmVzaChpbml0aWFsKTtcbiAgICAgICAgICAgICAgICAgICAgdHJpZ2dlckJyZWFrcG9pbnQgPSB0YXJnZXRCcmVha3BvaW50O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gb25seSB0cmlnZ2VyIGJyZWFrcG9pbnRzIGR1cmluZyBhbiBhY3R1YWwgYnJlYWsuIG5vdCBvbiBpbml0aWFsaXplLlxuICAgICAgICAgICAgaWYoICFpbml0aWFsICYmIHRyaWdnZXJCcmVha3BvaW50ICE9PSBmYWxzZSApIHtcbiAgICAgICAgICAgICAgICBfLiRzbGlkZXIudHJpZ2dlcignYnJlYWtwb2ludCcsIFtfLCB0cmlnZ2VyQnJlYWtwb2ludF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmNoYW5nZVNsaWRlID0gZnVuY3Rpb24oZXZlbnQsIGRvbnRBbmltYXRlKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzLFxuICAgICAgICAgICAgJHRhcmdldCA9ICQoZXZlbnQuY3VycmVudFRhcmdldCksXG4gICAgICAgICAgICBpbmRleE9mZnNldCwgc2xpZGVPZmZzZXQsIHVuZXZlbk9mZnNldDtcblxuICAgICAgICAvLyBJZiB0YXJnZXQgaXMgYSBsaW5rLCBwcmV2ZW50IGRlZmF1bHQgYWN0aW9uLlxuICAgICAgICBpZigkdGFyZ2V0LmlzKCdhJykpIHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiB0YXJnZXQgaXMgbm90IHRoZSA8bGk+IGVsZW1lbnQgKGllOiBhIGNoaWxkKSwgZmluZCB0aGUgPGxpPi5cbiAgICAgICAgaWYoISR0YXJnZXQuaXMoJ2xpJykpIHtcbiAgICAgICAgICAgICR0YXJnZXQgPSAkdGFyZ2V0LmNsb3Nlc3QoJ2xpJyk7XG4gICAgICAgIH1cblxuICAgICAgICB1bmV2ZW5PZmZzZXQgPSAoXy5zbGlkZUNvdW50ICUgXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsICE9PSAwKTtcbiAgICAgICAgaW5kZXhPZmZzZXQgPSB1bmV2ZW5PZmZzZXQgPyAwIDogKF8uc2xpZGVDb3VudCAtIF8uY3VycmVudFNsaWRlKSAlIF8ub3B0aW9ucy5zbGlkZXNUb1Njcm9sbDtcblxuICAgICAgICBzd2l0Y2ggKGV2ZW50LmRhdGEubWVzc2FnZSkge1xuXG4gICAgICAgICAgICBjYXNlICdwcmV2aW91cyc6XG4gICAgICAgICAgICAgICAgc2xpZGVPZmZzZXQgPSBpbmRleE9mZnNldCA9PT0gMCA/IF8ub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCA6IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgLSBpbmRleE9mZnNldDtcbiAgICAgICAgICAgICAgICBpZiAoXy5zbGlkZUNvdW50ID4gXy5vcHRpb25zLnNsaWRlc1RvU2hvdykge1xuICAgICAgICAgICAgICAgICAgICBfLnNsaWRlSGFuZGxlcihfLmN1cnJlbnRTbGlkZSAtIHNsaWRlT2Zmc2V0LCBmYWxzZSwgZG9udEFuaW1hdGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnbmV4dCc6XG4gICAgICAgICAgICAgICAgc2xpZGVPZmZzZXQgPSBpbmRleE9mZnNldCA9PT0gMCA/IF8ub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCA6IGluZGV4T2Zmc2V0O1xuICAgICAgICAgICAgICAgIGlmIChfLnNsaWRlQ291bnQgPiBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSB7XG4gICAgICAgICAgICAgICAgICAgIF8uc2xpZGVIYW5kbGVyKF8uY3VycmVudFNsaWRlICsgc2xpZGVPZmZzZXQsIGZhbHNlLCBkb250QW5pbWF0ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdpbmRleCc6XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4ID0gZXZlbnQuZGF0YS5pbmRleCA9PT0gMCA/IDAgOlxuICAgICAgICAgICAgICAgICAgICBldmVudC5kYXRhLmluZGV4IHx8ICR0YXJnZXQuaW5kZXgoKSAqIF8ub3B0aW9ucy5zbGlkZXNUb1Njcm9sbDtcblxuICAgICAgICAgICAgICAgIF8uc2xpZGVIYW5kbGVyKF8uY2hlY2tOYXZpZ2FibGUoaW5kZXgpLCBmYWxzZSwgZG9udEFuaW1hdGUpO1xuICAgICAgICAgICAgICAgICR0YXJnZXQuY2hpbGRyZW4oKS50cmlnZ2VyKCdmb2N1cycpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5jaGVja05hdmlnYWJsZSA9IGZ1bmN0aW9uKGluZGV4KSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzLFxuICAgICAgICAgICAgbmF2aWdhYmxlcywgcHJldk5hdmlnYWJsZTtcblxuICAgICAgICBuYXZpZ2FibGVzID0gXy5nZXROYXZpZ2FibGVJbmRleGVzKCk7XG4gICAgICAgIHByZXZOYXZpZ2FibGUgPSAwO1xuICAgICAgICBpZiAoaW5kZXggPiBuYXZpZ2FibGVzW25hdmlnYWJsZXMubGVuZ3RoIC0gMV0pIHtcbiAgICAgICAgICAgIGluZGV4ID0gbmF2aWdhYmxlc1tuYXZpZ2FibGVzLmxlbmd0aCAtIDFdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIgbiBpbiBuYXZpZ2FibGVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4IDwgbmF2aWdhYmxlc1tuXSkge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCA9IHByZXZOYXZpZ2FibGU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwcmV2TmF2aWdhYmxlID0gbmF2aWdhYmxlc1tuXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpbmRleDtcbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmNsZWFuVXBFdmVudHMgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5kb3RzICYmIF8uJGRvdHMgIT09IG51bGwpIHtcblxuICAgICAgICAgICAgJCgnbGknLCBfLiRkb3RzKVxuICAgICAgICAgICAgICAgIC5vZmYoJ2NsaWNrLnNsaWNrJywgXy5jaGFuZ2VTbGlkZSlcbiAgICAgICAgICAgICAgICAub2ZmKCdtb3VzZWVudGVyLnNsaWNrJywgJC5wcm94eShfLmludGVycnVwdCwgXywgdHJ1ZSkpXG4gICAgICAgICAgICAgICAgLm9mZignbW91c2VsZWF2ZS5zbGljaycsICQucHJveHkoXy5pbnRlcnJ1cHQsIF8sIGZhbHNlKSk7XG5cbiAgICAgICAgICAgIGlmIChfLm9wdGlvbnMuYWNjZXNzaWJpbGl0eSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIF8uJGRvdHMub2ZmKCdrZXlkb3duLnNsaWNrJywgXy5rZXlIYW5kbGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIF8uJHNsaWRlci5vZmYoJ2ZvY3VzLnNsaWNrIGJsdXIuc2xpY2snKTtcblxuICAgICAgICBpZiAoXy5vcHRpb25zLmFycm93cyA9PT0gdHJ1ZSAmJiBfLnNsaWRlQ291bnQgPiBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSB7XG4gICAgICAgICAgICBfLiRwcmV2QXJyb3cgJiYgXy4kcHJldkFycm93Lm9mZignY2xpY2suc2xpY2snLCBfLmNoYW5nZVNsaWRlKTtcbiAgICAgICAgICAgIF8uJG5leHRBcnJvdyAmJiBfLiRuZXh0QXJyb3cub2ZmKCdjbGljay5zbGljaycsIF8uY2hhbmdlU2xpZGUpO1xuXG4gICAgICAgICAgICBpZiAoXy5vcHRpb25zLmFjY2Vzc2liaWxpdHkgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBfLiRwcmV2QXJyb3cgJiYgXy4kcHJldkFycm93Lm9mZigna2V5ZG93bi5zbGljaycsIF8ua2V5SGFuZGxlcik7XG4gICAgICAgICAgICAgICAgXy4kbmV4dEFycm93ICYmIF8uJG5leHRBcnJvdy5vZmYoJ2tleWRvd24uc2xpY2snLCBfLmtleUhhbmRsZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgXy4kbGlzdC5vZmYoJ3RvdWNoc3RhcnQuc2xpY2sgbW91c2Vkb3duLnNsaWNrJywgXy5zd2lwZUhhbmRsZXIpO1xuICAgICAgICBfLiRsaXN0Lm9mZigndG91Y2htb3ZlLnNsaWNrIG1vdXNlbW92ZS5zbGljaycsIF8uc3dpcGVIYW5kbGVyKTtcbiAgICAgICAgXy4kbGlzdC5vZmYoJ3RvdWNoZW5kLnNsaWNrIG1vdXNldXAuc2xpY2snLCBfLnN3aXBlSGFuZGxlcik7XG4gICAgICAgIF8uJGxpc3Qub2ZmKCd0b3VjaGNhbmNlbC5zbGljayBtb3VzZWxlYXZlLnNsaWNrJywgXy5zd2lwZUhhbmRsZXIpO1xuXG4gICAgICAgIF8uJGxpc3Qub2ZmKCdjbGljay5zbGljaycsIF8uY2xpY2tIYW5kbGVyKTtcblxuICAgICAgICAkKGRvY3VtZW50KS5vZmYoXy52aXNpYmlsaXR5Q2hhbmdlLCBfLnZpc2liaWxpdHkpO1xuXG4gICAgICAgIF8uY2xlYW5VcFNsaWRlRXZlbnRzKCk7XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5hY2Nlc3NpYmlsaXR5ID09PSB0cnVlKSB7XG4gICAgICAgICAgICBfLiRsaXN0Lm9mZigna2V5ZG93bi5zbGljaycsIF8ua2V5SGFuZGxlcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXy5vcHRpb25zLmZvY3VzT25TZWxlY3QgPT09IHRydWUpIHtcbiAgICAgICAgICAgICQoXy4kc2xpZGVUcmFjaykuY2hpbGRyZW4oKS5vZmYoJ2NsaWNrLnNsaWNrJywgXy5zZWxlY3RIYW5kbGVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgICQod2luZG93KS5vZmYoJ29yaWVudGF0aW9uY2hhbmdlLnNsaWNrLnNsaWNrLScgKyBfLmluc3RhbmNlVWlkLCBfLm9yaWVudGF0aW9uQ2hhbmdlKTtcblxuICAgICAgICAkKHdpbmRvdykub2ZmKCdyZXNpemUuc2xpY2suc2xpY2stJyArIF8uaW5zdGFuY2VVaWQsIF8ucmVzaXplKTtcblxuICAgICAgICAkKCdbZHJhZ2dhYmxlIT10cnVlXScsIF8uJHNsaWRlVHJhY2spLm9mZignZHJhZ3N0YXJ0JywgXy5wcmV2ZW50RGVmYXVsdCk7XG5cbiAgICAgICAgJCh3aW5kb3cpLm9mZignbG9hZC5zbGljay5zbGljay0nICsgXy5pbnN0YW5jZVVpZCwgXy5zZXRQb3NpdGlvbik7XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmNsZWFuVXBTbGlkZUV2ZW50cyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBfLiRsaXN0Lm9mZignbW91c2VlbnRlci5zbGljaycsICQucHJveHkoXy5pbnRlcnJ1cHQsIF8sIHRydWUpKTtcbiAgICAgICAgXy4kbGlzdC5vZmYoJ21vdXNlbGVhdmUuc2xpY2snLCAkLnByb3h5KF8uaW50ZXJydXB0LCBfLCBmYWxzZSkpO1xuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5jbGVhblVwUm93cyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcywgb3JpZ2luYWxTbGlkZXM7XG5cbiAgICAgICAgaWYoXy5vcHRpb25zLnJvd3MgPiAwKSB7XG4gICAgICAgICAgICBvcmlnaW5hbFNsaWRlcyA9IF8uJHNsaWRlcy5jaGlsZHJlbigpLmNoaWxkcmVuKCk7XG4gICAgICAgICAgICBvcmlnaW5hbFNsaWRlcy5yZW1vdmVBdHRyKCdzdHlsZScpO1xuICAgICAgICAgICAgXy4kc2xpZGVyLmVtcHR5KCkuYXBwZW5kKG9yaWdpbmFsU2xpZGVzKTtcbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5jbGlja0hhbmRsZXIgPSBmdW5jdGlvbihldmVudCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBpZiAoXy5zaG91bGRDbGljayA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbihyZWZyZXNoKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIF8uYXV0b1BsYXlDbGVhcigpO1xuXG4gICAgICAgIF8udG91Y2hPYmplY3QgPSB7fTtcblxuICAgICAgICBfLmNsZWFuVXBFdmVudHMoKTtcblxuICAgICAgICAkKCcuc2xpY2stY2xvbmVkJywgXy4kc2xpZGVyKS5kZXRhY2goKTtcblxuICAgICAgICBpZiAoXy4kZG90cykge1xuICAgICAgICAgICAgXy4kZG90cy5yZW1vdmUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICggXy4kcHJldkFycm93ICYmIF8uJHByZXZBcnJvdy5sZW5ndGggKSB7XG5cbiAgICAgICAgICAgIF8uJHByZXZBcnJvd1xuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnc2xpY2stZGlzYWJsZWQgc2xpY2stYXJyb3cgc2xpY2staGlkZGVuJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignYXJpYS1oaWRkZW4gYXJpYS1kaXNhYmxlZCB0YWJpbmRleCcpXG4gICAgICAgICAgICAgICAgLmNzcygnZGlzcGxheScsJycpO1xuXG4gICAgICAgICAgICBpZiAoIF8uaHRtbEV4cHIudGVzdCggXy5vcHRpb25zLnByZXZBcnJvdyApKSB7XG4gICAgICAgICAgICAgICAgXy4kcHJldkFycm93LnJlbW92ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCBfLiRuZXh0QXJyb3cgJiYgXy4kbmV4dEFycm93Lmxlbmd0aCApIHtcblxuICAgICAgICAgICAgXy4kbmV4dEFycm93XG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdzbGljay1kaXNhYmxlZCBzbGljay1hcnJvdyBzbGljay1oaWRkZW4nKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdhcmlhLWhpZGRlbiBhcmlhLWRpc2FibGVkIHRhYmluZGV4JylcbiAgICAgICAgICAgICAgICAuY3NzKCdkaXNwbGF5JywnJyk7XG5cbiAgICAgICAgICAgIGlmICggXy5odG1sRXhwci50ZXN0KCBfLm9wdGlvbnMubmV4dEFycm93ICkpIHtcbiAgICAgICAgICAgICAgICBfLiRuZXh0QXJyb3cucmVtb3ZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuXG4gICAgICAgIGlmIChfLiRzbGlkZXMpIHtcblxuICAgICAgICAgICAgXy4kc2xpZGVzXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdzbGljay1zbGlkZSBzbGljay1hY3RpdmUgc2xpY2stY2VudGVyIHNsaWNrLXZpc2libGUgc2xpY2stY3VycmVudCcpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2FyaWEtaGlkZGVuJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQXR0cignZGF0YS1zbGljay1pbmRleCcpXG4gICAgICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5hdHRyKCdzdHlsZScsICQodGhpcykuZGF0YSgnb3JpZ2luYWxTdHlsaW5nJykpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBfLiRzbGlkZVRyYWNrLmNoaWxkcmVuKHRoaXMub3B0aW9ucy5zbGlkZSkuZGV0YWNoKCk7XG5cbiAgICAgICAgICAgIF8uJHNsaWRlVHJhY2suZGV0YWNoKCk7XG5cbiAgICAgICAgICAgIF8uJGxpc3QuZGV0YWNoKCk7XG5cbiAgICAgICAgICAgIF8uJHNsaWRlci5hcHBlbmQoXy4kc2xpZGVzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIF8uY2xlYW5VcFJvd3MoKTtcblxuICAgICAgICBfLiRzbGlkZXIucmVtb3ZlQ2xhc3MoJ3NsaWNrLXNsaWRlcicpO1xuICAgICAgICBfLiRzbGlkZXIucmVtb3ZlQ2xhc3MoJ3NsaWNrLWluaXRpYWxpemVkJyk7XG4gICAgICAgIF8uJHNsaWRlci5yZW1vdmVDbGFzcygnc2xpY2stZG90dGVkJyk7XG5cbiAgICAgICAgXy51bnNsaWNrZWQgPSB0cnVlO1xuXG4gICAgICAgIGlmKCFyZWZyZXNoKSB7XG4gICAgICAgICAgICBfLiRzbGlkZXIudHJpZ2dlcignZGVzdHJveScsIFtfXSk7XG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuZGlzYWJsZVRyYW5zaXRpb24gPSBmdW5jdGlvbihzbGlkZSkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcyxcbiAgICAgICAgICAgIHRyYW5zaXRpb24gPSB7fTtcblxuICAgICAgICB0cmFuc2l0aW9uW18udHJhbnNpdGlvblR5cGVdID0gJyc7XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5mYWRlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgXy4kc2xpZGVUcmFjay5jc3ModHJhbnNpdGlvbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBfLiRzbGlkZXMuZXEoc2xpZGUpLmNzcyh0cmFuc2l0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5mYWRlU2xpZGUgPSBmdW5jdGlvbihzbGlkZUluZGV4LCBjYWxsYmFjaykge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBpZiAoXy5jc3NUcmFuc2l0aW9ucyA9PT0gZmFsc2UpIHtcblxuICAgICAgICAgICAgXy4kc2xpZGVzLmVxKHNsaWRlSW5kZXgpLmNzcyh7XG4gICAgICAgICAgICAgICAgekluZGV4OiBfLm9wdGlvbnMuekluZGV4XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgXy4kc2xpZGVzLmVxKHNsaWRlSW5kZXgpLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6IDFcbiAgICAgICAgICAgIH0sIF8ub3B0aW9ucy5zcGVlZCwgXy5vcHRpb25zLmVhc2luZywgY2FsbGJhY2spO1xuXG4gICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgIF8uYXBwbHlUcmFuc2l0aW9uKHNsaWRlSW5kZXgpO1xuXG4gICAgICAgICAgICBfLiRzbGlkZXMuZXEoc2xpZGVJbmRleCkuY3NzKHtcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgICAgIHpJbmRleDogXy5vcHRpb25zLnpJbmRleFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgXy5kaXNhYmxlVHJhbnNpdGlvbihzbGlkZUluZGV4KTtcblxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsKCk7XG4gICAgICAgICAgICAgICAgfSwgXy5vcHRpb25zLnNwZWVkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmZhZGVTbGlkZU91dCA9IGZ1bmN0aW9uKHNsaWRlSW5kZXgpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgaWYgKF8uY3NzVHJhbnNpdGlvbnMgPT09IGZhbHNlKSB7XG5cbiAgICAgICAgICAgIF8uJHNsaWRlcy5lcShzbGlkZUluZGV4KS5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAwLFxuICAgICAgICAgICAgICAgIHpJbmRleDogXy5vcHRpb25zLnpJbmRleCAtIDJcbiAgICAgICAgICAgIH0sIF8ub3B0aW9ucy5zcGVlZCwgXy5vcHRpb25zLmVhc2luZyk7XG5cbiAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgXy5hcHBseVRyYW5zaXRpb24oc2xpZGVJbmRleCk7XG5cbiAgICAgICAgICAgIF8uJHNsaWRlcy5lcShzbGlkZUluZGV4KS5jc3Moe1xuICAgICAgICAgICAgICAgIG9wYWNpdHk6IDAsXG4gICAgICAgICAgICAgICAgekluZGV4OiBfLm9wdGlvbnMuekluZGV4IC0gMlxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5maWx0ZXJTbGlkZXMgPSBTbGljay5wcm90b3R5cGUuc2xpY2tGaWx0ZXIgPSBmdW5jdGlvbihmaWx0ZXIpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgaWYgKGZpbHRlciAhPT0gbnVsbCkge1xuXG4gICAgICAgICAgICBfLiRzbGlkZXNDYWNoZSA9IF8uJHNsaWRlcztcblxuICAgICAgICAgICAgXy51bmxvYWQoKTtcblxuICAgICAgICAgICAgXy4kc2xpZGVUcmFjay5jaGlsZHJlbih0aGlzLm9wdGlvbnMuc2xpZGUpLmRldGFjaCgpO1xuXG4gICAgICAgICAgICBfLiRzbGlkZXNDYWNoZS5maWx0ZXIoZmlsdGVyKS5hcHBlbmRUbyhfLiRzbGlkZVRyYWNrKTtcblxuICAgICAgICAgICAgXy5yZWluaXQoKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmZvY3VzSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBfLiRzbGlkZXJcbiAgICAgICAgICAgIC5vZmYoJ2ZvY3VzLnNsaWNrIGJsdXIuc2xpY2snKVxuICAgICAgICAgICAgLm9uKCdmb2N1cy5zbGljayBibHVyLnNsaWNrJywgJyonLCBmdW5jdGlvbihldmVudCkge1xuXG4gICAgICAgICAgICBldmVudC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIHZhciAkc2YgPSAkKHRoaXMpO1xuXG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAgICAgaWYoIF8ub3B0aW9ucy5wYXVzZU9uRm9jdXMgKSB7XG4gICAgICAgICAgICAgICAgICAgIF8uZm9jdXNzZWQgPSAkc2YuaXMoJzpmb2N1cycpO1xuICAgICAgICAgICAgICAgICAgICBfLmF1dG9QbGF5KCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9LCAwKTtcblxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmdldEN1cnJlbnQgPSBTbGljay5wcm90b3R5cGUuc2xpY2tDdXJyZW50U2xpZGUgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG4gICAgICAgIHJldHVybiBfLmN1cnJlbnRTbGlkZTtcblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuZ2V0RG90Q291bnQgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgdmFyIGJyZWFrUG9pbnQgPSAwO1xuICAgICAgICB2YXIgY291bnRlciA9IDA7XG4gICAgICAgIHZhciBwYWdlclF0eSA9IDA7XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5pbmZpbml0ZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgaWYgKF8uc2xpZGVDb3VudCA8PSBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSB7XG4gICAgICAgICAgICAgICAgICsrcGFnZXJRdHk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHdoaWxlIChicmVha1BvaW50IDwgXy5zbGlkZUNvdW50KSB7XG4gICAgICAgICAgICAgICAgICAgICsrcGFnZXJRdHk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrUG9pbnQgPSBjb3VudGVyICsgXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsO1xuICAgICAgICAgICAgICAgICAgICBjb3VudGVyICs9IF8ub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCA8PSBfLm9wdGlvbnMuc2xpZGVzVG9TaG93ID8gXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsIDogXy5vcHRpb25zLnNsaWRlc1RvU2hvdztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoXy5vcHRpb25zLmNlbnRlck1vZGUgPT09IHRydWUpIHtcbiAgICAgICAgICAgIHBhZ2VyUXR5ID0gXy5zbGlkZUNvdW50O1xuICAgICAgICB9IGVsc2UgaWYoIV8ub3B0aW9ucy5hc05hdkZvcikge1xuICAgICAgICAgICAgcGFnZXJRdHkgPSAxICsgTWF0aC5jZWlsKChfLnNsaWRlQ291bnQgLSBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSAvIF8ub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCk7XG4gICAgICAgIH1lbHNlIHtcbiAgICAgICAgICAgIHdoaWxlIChicmVha1BvaW50IDwgXy5zbGlkZUNvdW50KSB7XG4gICAgICAgICAgICAgICAgKytwYWdlclF0eTtcbiAgICAgICAgICAgICAgICBicmVha1BvaW50ID0gY291bnRlciArIF8ub3B0aW9ucy5zbGlkZXNUb1Njcm9sbDtcbiAgICAgICAgICAgICAgICBjb3VudGVyICs9IF8ub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCA8PSBfLm9wdGlvbnMuc2xpZGVzVG9TaG93ID8gXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsIDogXy5vcHRpb25zLnNsaWRlc1RvU2hvdztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwYWdlclF0eSAtIDE7XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmdldExlZnQgPSBmdW5jdGlvbihzbGlkZUluZGV4KSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzLFxuICAgICAgICAgICAgdGFyZ2V0TGVmdCxcbiAgICAgICAgICAgIHZlcnRpY2FsSGVpZ2h0LFxuICAgICAgICAgICAgdmVydGljYWxPZmZzZXQgPSAwLFxuICAgICAgICAgICAgdGFyZ2V0U2xpZGUsXG4gICAgICAgICAgICBjb2VmO1xuXG4gICAgICAgIF8uc2xpZGVPZmZzZXQgPSAwO1xuICAgICAgICB2ZXJ0aWNhbEhlaWdodCA9IF8uJHNsaWRlcy5maXJzdCgpLm91dGVySGVpZ2h0KHRydWUpO1xuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuaW5maW5pdGUgPT09IHRydWUpIHtcbiAgICAgICAgICAgIGlmIChfLnNsaWRlQ291bnQgPiBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSB7XG4gICAgICAgICAgICAgICAgXy5zbGlkZU9mZnNldCA9IChfLnNsaWRlV2lkdGggKiBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSAqIC0xO1xuICAgICAgICAgICAgICAgIGNvZWYgPSAtMVxuXG4gICAgICAgICAgICAgICAgaWYgKF8ub3B0aW9ucy52ZXJ0aWNhbCA9PT0gdHJ1ZSAmJiBfLm9wdGlvbnMuY2VudGVyTW9kZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoXy5vcHRpb25zLnNsaWRlc1RvU2hvdyA9PT0gMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29lZiA9IC0xLjU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5vcHRpb25zLnNsaWRlc1RvU2hvdyA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29lZiA9IC0yXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmVydGljYWxPZmZzZXQgPSAodmVydGljYWxIZWlnaHQgKiBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSAqIGNvZWY7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoXy5zbGlkZUNvdW50ICUgXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNsaWRlSW5kZXggKyBfLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwgPiBfLnNsaWRlQ291bnQgJiYgXy5zbGlkZUNvdW50ID4gXy5vcHRpb25zLnNsaWRlc1RvU2hvdykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2xpZGVJbmRleCA+IF8uc2xpZGVDb3VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5zbGlkZU9mZnNldCA9ICgoXy5vcHRpb25zLnNsaWRlc1RvU2hvdyAtIChzbGlkZUluZGV4IC0gXy5zbGlkZUNvdW50KSkgKiBfLnNsaWRlV2lkdGgpICogLTE7XG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJ0aWNhbE9mZnNldCA9ICgoXy5vcHRpb25zLnNsaWRlc1RvU2hvdyAtIChzbGlkZUluZGV4IC0gXy5zbGlkZUNvdW50KSkgKiB2ZXJ0aWNhbEhlaWdodCkgKiAtMTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF8uc2xpZGVPZmZzZXQgPSAoKF8uc2xpZGVDb3VudCAlIF8ub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCkgKiBfLnNsaWRlV2lkdGgpICogLTE7XG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJ0aWNhbE9mZnNldCA9ICgoXy5zbGlkZUNvdW50ICUgXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsKSAqIHZlcnRpY2FsSGVpZ2h0KSAqIC0xO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHNsaWRlSW5kZXggKyBfLm9wdGlvbnMuc2xpZGVzVG9TaG93ID4gXy5zbGlkZUNvdW50KSB7XG4gICAgICAgICAgICAgICAgXy5zbGlkZU9mZnNldCA9ICgoc2xpZGVJbmRleCArIF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpIC0gXy5zbGlkZUNvdW50KSAqIF8uc2xpZGVXaWR0aDtcbiAgICAgICAgICAgICAgICB2ZXJ0aWNhbE9mZnNldCA9ICgoc2xpZGVJbmRleCArIF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpIC0gXy5zbGlkZUNvdW50KSAqIHZlcnRpY2FsSGVpZ2h0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8uc2xpZGVDb3VudCA8PSBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSB7XG4gICAgICAgICAgICBfLnNsaWRlT2Zmc2V0ID0gMDtcbiAgICAgICAgICAgIHZlcnRpY2FsT2Zmc2V0ID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuY2VudGVyTW9kZSA9PT0gdHJ1ZSAmJiBfLnNsaWRlQ291bnQgPD0gXy5vcHRpb25zLnNsaWRlc1RvU2hvdykge1xuICAgICAgICAgICAgXy5zbGlkZU9mZnNldCA9ICgoXy5zbGlkZVdpZHRoICogTWF0aC5mbG9vcihfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSkgLyAyKSAtICgoXy5zbGlkZVdpZHRoICogXy5zbGlkZUNvdW50KSAvIDIpO1xuICAgICAgICB9IGVsc2UgaWYgKF8ub3B0aW9ucy5jZW50ZXJNb2RlID09PSB0cnVlICYmIF8ub3B0aW9ucy5pbmZpbml0ZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgXy5zbGlkZU9mZnNldCArPSBfLnNsaWRlV2lkdGggKiBNYXRoLmZsb29yKF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgLyAyKSAtIF8uc2xpZGVXaWR0aDtcbiAgICAgICAgfSBlbHNlIGlmIChfLm9wdGlvbnMuY2VudGVyTW9kZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgXy5zbGlkZU9mZnNldCA9IDA7XG4gICAgICAgICAgICBfLnNsaWRlT2Zmc2V0ICs9IF8uc2xpZGVXaWR0aCAqIE1hdGguZmxvb3IoXy5vcHRpb25zLnNsaWRlc1RvU2hvdyAvIDIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy52ZXJ0aWNhbCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRhcmdldExlZnQgPSAoKHNsaWRlSW5kZXggKiBfLnNsaWRlV2lkdGgpICogLTEpICsgXy5zbGlkZU9mZnNldDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRhcmdldExlZnQgPSAoKHNsaWRlSW5kZXggKiB2ZXJ0aWNhbEhlaWdodCkgKiAtMSkgKyB2ZXJ0aWNhbE9mZnNldDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLm9wdGlvbnMudmFyaWFibGVXaWR0aCA9PT0gdHJ1ZSkge1xuXG4gICAgICAgICAgICBpZiAoXy5zbGlkZUNvdW50IDw9IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgfHwgXy5vcHRpb25zLmluZmluaXRlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHRhcmdldFNsaWRlID0gXy4kc2xpZGVUcmFjay5jaGlsZHJlbignLnNsaWNrLXNsaWRlJykuZXEoc2xpZGVJbmRleCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRhcmdldFNsaWRlID0gXy4kc2xpZGVUcmFjay5jaGlsZHJlbignLnNsaWNrLXNsaWRlJykuZXEoc2xpZGVJbmRleCArIF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoXy5vcHRpb25zLnJ0bCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGlmICh0YXJnZXRTbGlkZVswXSkge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXRMZWZ0ID0gKF8uJHNsaWRlVHJhY2sud2lkdGgoKSAtIHRhcmdldFNsaWRlWzBdLm9mZnNldExlZnQgLSB0YXJnZXRTbGlkZS53aWR0aCgpKSAqIC0xO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldExlZnQgPSAgMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRhcmdldExlZnQgPSB0YXJnZXRTbGlkZVswXSA/IHRhcmdldFNsaWRlWzBdLm9mZnNldExlZnQgKiAtMSA6IDA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChfLm9wdGlvbnMuY2VudGVyTW9kZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChfLnNsaWRlQ291bnQgPD0gXy5vcHRpb25zLnNsaWRlc1RvU2hvdyB8fCBfLm9wdGlvbnMuaW5maW5pdGUgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldFNsaWRlID0gXy4kc2xpZGVUcmFjay5jaGlsZHJlbignLnNsaWNrLXNsaWRlJykuZXEoc2xpZGVJbmRleCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0U2xpZGUgPSBfLiRzbGlkZVRyYWNrLmNoaWxkcmVuKCcuc2xpY2stc2xpZGUnKS5lcShzbGlkZUluZGV4ICsgXy5vcHRpb25zLnNsaWRlc1RvU2hvdyArIDEpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChfLm9wdGlvbnMucnRsID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXJnZXRTbGlkZVswXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0TGVmdCA9IChfLiRzbGlkZVRyYWNrLndpZHRoKCkgLSB0YXJnZXRTbGlkZVswXS5vZmZzZXRMZWZ0IC0gdGFyZ2V0U2xpZGUud2lkdGgoKSkgKiAtMTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldExlZnQgPSAgMDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldExlZnQgPSB0YXJnZXRTbGlkZVswXSA/IHRhcmdldFNsaWRlWzBdLm9mZnNldExlZnQgKiAtMSA6IDA7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGFyZ2V0TGVmdCArPSAoXy4kbGlzdC53aWR0aCgpIC0gdGFyZ2V0U2xpZGUub3V0ZXJXaWR0aCgpKSAvIDI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGFyZ2V0TGVmdDtcblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuZ2V0T3B0aW9uID0gU2xpY2sucHJvdG90eXBlLnNsaWNrR2V0T3B0aW9uID0gZnVuY3Rpb24ob3B0aW9uKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBfLm9wdGlvbnNbb3B0aW9uXTtcblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuZ2V0TmF2aWdhYmxlSW5kZXhlcyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcyxcbiAgICAgICAgICAgIGJyZWFrUG9pbnQgPSAwLFxuICAgICAgICAgICAgY291bnRlciA9IDAsXG4gICAgICAgICAgICBpbmRleGVzID0gW10sXG4gICAgICAgICAgICBtYXg7XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5pbmZpbml0ZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIG1heCA9IF8uc2xpZGVDb3VudDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJyZWFrUG9pbnQgPSBfLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwgKiAtMTtcbiAgICAgICAgICAgIGNvdW50ZXIgPSBfLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwgKiAtMTtcbiAgICAgICAgICAgIG1heCA9IF8uc2xpZGVDb3VudCAqIDI7XG4gICAgICAgIH1cblxuICAgICAgICB3aGlsZSAoYnJlYWtQb2ludCA8IG1heCkge1xuICAgICAgICAgICAgaW5kZXhlcy5wdXNoKGJyZWFrUG9pbnQpO1xuICAgICAgICAgICAgYnJlYWtQb2ludCA9IGNvdW50ZXIgKyBfLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGw7XG4gICAgICAgICAgICBjb3VudGVyICs9IF8ub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCA8PSBfLm9wdGlvbnMuc2xpZGVzVG9TaG93ID8gXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsIDogXy5vcHRpb25zLnNsaWRlc1RvU2hvdztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpbmRleGVzO1xuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5nZXRTbGljayA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5nZXRTbGlkZUNvdW50ID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzLFxuICAgICAgICAgICAgc2xpZGVzVHJhdmVyc2VkLCBzd2lwZWRTbGlkZSwgY2VudGVyT2Zmc2V0O1xuXG4gICAgICAgIGNlbnRlck9mZnNldCA9IF8ub3B0aW9ucy5jZW50ZXJNb2RlID09PSB0cnVlID8gXy5zbGlkZVdpZHRoICogTWF0aC5mbG9vcihfLm9wdGlvbnMuc2xpZGVzVG9TaG93IC8gMikgOiAwO1xuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuc3dpcGVUb1NsaWRlID09PSB0cnVlKSB7XG4gICAgICAgICAgICBfLiRzbGlkZVRyYWNrLmZpbmQoJy5zbGljay1zbGlkZScpLmVhY2goZnVuY3Rpb24oaW5kZXgsIHNsaWRlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNsaWRlLm9mZnNldExlZnQgLSBjZW50ZXJPZmZzZXQgKyAoJChzbGlkZSkub3V0ZXJXaWR0aCgpIC8gMikgPiAoXy5zd2lwZUxlZnQgKiAtMSkpIHtcbiAgICAgICAgICAgICAgICAgICAgc3dpcGVkU2xpZGUgPSBzbGlkZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBzbGlkZXNUcmF2ZXJzZWQgPSBNYXRoLmFicygkKHN3aXBlZFNsaWRlKS5hdHRyKCdkYXRhLXNsaWNrLWluZGV4JykgLSBfLmN1cnJlbnRTbGlkZSkgfHwgMTtcblxuICAgICAgICAgICAgcmV0dXJuIHNsaWRlc1RyYXZlcnNlZDtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIF8ub3B0aW9ucy5zbGlkZXNUb1Njcm9sbDtcbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5nb1RvID0gU2xpY2sucHJvdG90eXBlLnNsaWNrR29UbyA9IGZ1bmN0aW9uKHNsaWRlLCBkb250QW5pbWF0ZSkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBfLmNoYW5nZVNsaWRlKHtcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnaW5kZXgnLFxuICAgICAgICAgICAgICAgIGluZGV4OiBwYXJzZUludChzbGlkZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgZG9udEFuaW1hdGUpO1xuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24oY3JlYXRpb24pIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgaWYgKCEkKF8uJHNsaWRlcikuaGFzQ2xhc3MoJ3NsaWNrLWluaXRpYWxpemVkJykpIHtcblxuICAgICAgICAgICAgJChfLiRzbGlkZXIpLmFkZENsYXNzKCdzbGljay1pbml0aWFsaXplZCcpO1xuXG4gICAgICAgICAgICBfLmJ1aWxkUm93cygpO1xuICAgICAgICAgICAgXy5idWlsZE91dCgpO1xuICAgICAgICAgICAgXy5zZXRQcm9wcygpO1xuICAgICAgICAgICAgXy5zdGFydExvYWQoKTtcbiAgICAgICAgICAgIF8ubG9hZFNsaWRlcigpO1xuICAgICAgICAgICAgXy5pbml0aWFsaXplRXZlbnRzKCk7XG4gICAgICAgICAgICBfLnVwZGF0ZUFycm93cygpO1xuICAgICAgICAgICAgXy51cGRhdGVEb3RzKCk7XG4gICAgICAgICAgICBfLmNoZWNrUmVzcG9uc2l2ZSh0cnVlKTtcbiAgICAgICAgICAgIF8uZm9jdXNIYW5kbGVyKCk7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjcmVhdGlvbikge1xuICAgICAgICAgICAgXy4kc2xpZGVyLnRyaWdnZXIoJ2luaXQnLCBbX10pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5hY2Nlc3NpYmlsaXR5ID09PSB0cnVlKSB7XG4gICAgICAgICAgICBfLmluaXRBREEoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICggXy5vcHRpb25zLmF1dG9wbGF5ICkge1xuXG4gICAgICAgICAgICBfLnBhdXNlZCA9IGZhbHNlO1xuICAgICAgICAgICAgXy5hdXRvUGxheSgpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuaW5pdEFEQSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgXyA9IHRoaXMsXG4gICAgICAgICAgICAgICAgbnVtRG90R3JvdXBzID0gTWF0aC5jZWlsKF8uc2xpZGVDb3VudCAvIF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpLFxuICAgICAgICAgICAgICAgIHRhYkNvbnRyb2xJbmRleGVzID0gXy5nZXROYXZpZ2FibGVJbmRleGVzKCkuZmlsdGVyKGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKHZhbCA+PSAwKSAmJiAodmFsIDwgXy5zbGlkZUNvdW50KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICBfLiRzbGlkZXMuYWRkKF8uJHNsaWRlVHJhY2suZmluZCgnLnNsaWNrLWNsb25lZCcpKS5hdHRyKHtcbiAgICAgICAgICAgICdhcmlhLWhpZGRlbic6ICd0cnVlJyxcbiAgICAgICAgICAgICd0YWJpbmRleCc6ICctMSdcbiAgICAgICAgfSkuZmluZCgnYSwgaW5wdXQsIGJ1dHRvbiwgc2VsZWN0JykuYXR0cih7XG4gICAgICAgICAgICAndGFiaW5kZXgnOiAnLTEnXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChfLiRkb3RzICE9PSBudWxsKSB7XG4gICAgICAgICAgICBfLiRzbGlkZXMubm90KF8uJHNsaWRlVHJhY2suZmluZCgnLnNsaWNrLWNsb25lZCcpKS5lYWNoKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2xpZGVDb250cm9sSW5kZXggPSB0YWJDb250cm9sSW5kZXhlcy5pbmRleE9mKGkpO1xuXG4gICAgICAgICAgICAgICAgJCh0aGlzKS5hdHRyKHtcbiAgICAgICAgICAgICAgICAgICAgJ3JvbGUnOiAndGFicGFuZWwnLFxuICAgICAgICAgICAgICAgICAgICAnaWQnOiAnc2xpY2stc2xpZGUnICsgXy5pbnN0YW5jZVVpZCArIGksXG4gICAgICAgICAgICAgICAgICAgICd0YWJpbmRleCc6IC0xXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoc2xpZGVDb250cm9sSW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgdmFyIGFyaWFCdXR0b25Db250cm9sID0gJ3NsaWNrLXNsaWRlLWNvbnRyb2wnICsgXy5pbnN0YW5jZVVpZCArIHNsaWRlQ29udHJvbEluZGV4XG4gICAgICAgICAgICAgICAgICAgaWYgKCQoJyMnICsgYXJpYUJ1dHRvbkNvbnRyb2wpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5hdHRyKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAnYXJpYS1kZXNjcmliZWRieSc6IGFyaWFCdXR0b25Db250cm9sXG4gICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIF8uJGRvdHMuYXR0cigncm9sZScsICd0YWJsaXN0JykuZmluZCgnbGknKS5lYWNoKGZ1bmN0aW9uKGkpIHtcbiAgICAgICAgICAgICAgICB2YXIgbWFwcGVkU2xpZGVJbmRleCA9IHRhYkNvbnRyb2xJbmRleGVzW2ldO1xuXG4gICAgICAgICAgICAgICAgJCh0aGlzKS5hdHRyKHtcbiAgICAgICAgICAgICAgICAgICAgJ3JvbGUnOiAncHJlc2VudGF0aW9uJ1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgJCh0aGlzKS5maW5kKCdidXR0b24nKS5maXJzdCgpLmF0dHIoe1xuICAgICAgICAgICAgICAgICAgICAncm9sZSc6ICd0YWInLFxuICAgICAgICAgICAgICAgICAgICAnaWQnOiAnc2xpY2stc2xpZGUtY29udHJvbCcgKyBfLmluc3RhbmNlVWlkICsgaSxcbiAgICAgICAgICAgICAgICAgICAgJ2FyaWEtY29udHJvbHMnOiAnc2xpY2stc2xpZGUnICsgXy5pbnN0YW5jZVVpZCArIG1hcHBlZFNsaWRlSW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICdhcmlhLWxhYmVsJzogKGkgKyAxKSArICcgb2YgJyArIG51bURvdEdyb3VwcyxcbiAgICAgICAgICAgICAgICAgICAgJ2FyaWEtc2VsZWN0ZWQnOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICAndGFiaW5kZXgnOiAnLTEnXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIH0pLmVxKF8uY3VycmVudFNsaWRlKS5maW5kKCdidXR0b24nKS5hdHRyKHtcbiAgICAgICAgICAgICAgICAnYXJpYS1zZWxlY3RlZCc6ICd0cnVlJyxcbiAgICAgICAgICAgICAgICAndGFiaW5kZXgnOiAnMCdcbiAgICAgICAgICAgIH0pLmVuZCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2YXIgaT1fLmN1cnJlbnRTbGlkZSwgbWF4PWkrXy5vcHRpb25zLnNsaWRlc1RvU2hvdzsgaSA8IG1heDsgaSsrKSB7XG4gICAgICAgICAgaWYgKF8ub3B0aW9ucy5mb2N1c09uQ2hhbmdlKSB7XG4gICAgICAgICAgICBfLiRzbGlkZXMuZXEoaSkuYXR0cih7J3RhYmluZGV4JzogJzAnfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIF8uJHNsaWRlcy5lcShpKS5yZW1vdmVBdHRyKCd0YWJpbmRleCcpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIF8uYWN0aXZhdGVBREEoKTtcblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuaW5pdEFycm93RXZlbnRzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuYXJyb3dzID09PSB0cnVlICYmIF8uc2xpZGVDb3VudCA+IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpIHtcbiAgICAgICAgICAgIF8uJHByZXZBcnJvd1xuICAgICAgICAgICAgICAgLm9mZignY2xpY2suc2xpY2snKVxuICAgICAgICAgICAgICAgLm9uKCdjbGljay5zbGljaycsIHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ3ByZXZpb3VzJ1xuICAgICAgICAgICAgICAgfSwgXy5jaGFuZ2VTbGlkZSk7XG4gICAgICAgICAgICBfLiRuZXh0QXJyb3dcbiAgICAgICAgICAgICAgIC5vZmYoJ2NsaWNrLnNsaWNrJylcbiAgICAgICAgICAgICAgIC5vbignY2xpY2suc2xpY2snLCB7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICduZXh0J1xuICAgICAgICAgICAgICAgfSwgXy5jaGFuZ2VTbGlkZSk7XG5cbiAgICAgICAgICAgIGlmIChfLm9wdGlvbnMuYWNjZXNzaWJpbGl0eSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIF8uJHByZXZBcnJvdy5vbigna2V5ZG93bi5zbGljaycsIF8ua2V5SGFuZGxlcik7XG4gICAgICAgICAgICAgICAgXy4kbmV4dEFycm93Lm9uKCdrZXlkb3duLnNsaWNrJywgXy5rZXlIYW5kbGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5pbml0RG90RXZlbnRzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuZG90cyA9PT0gdHJ1ZSAmJiBfLnNsaWRlQ291bnQgPiBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSB7XG4gICAgICAgICAgICAkKCdsaScsIF8uJGRvdHMpLm9uKCdjbGljay5zbGljaycsIHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnaW5kZXgnXG4gICAgICAgICAgICB9LCBfLmNoYW5nZVNsaWRlKTtcblxuICAgICAgICAgICAgaWYgKF8ub3B0aW9ucy5hY2Nlc3NpYmlsaXR5ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgXy4kZG90cy5vbigna2V5ZG93bi5zbGljaycsIF8ua2V5SGFuZGxlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXy5vcHRpb25zLmRvdHMgPT09IHRydWUgJiYgXy5vcHRpb25zLnBhdXNlT25Eb3RzSG92ZXIgPT09IHRydWUgJiYgXy5zbGlkZUNvdW50ID4gXy5vcHRpb25zLnNsaWRlc1RvU2hvdykge1xuXG4gICAgICAgICAgICAkKCdsaScsIF8uJGRvdHMpXG4gICAgICAgICAgICAgICAgLm9uKCdtb3VzZWVudGVyLnNsaWNrJywgJC5wcm94eShfLmludGVycnVwdCwgXywgdHJ1ZSkpXG4gICAgICAgICAgICAgICAgLm9uKCdtb3VzZWxlYXZlLnNsaWNrJywgJC5wcm94eShfLmludGVycnVwdCwgXywgZmFsc2UpKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmluaXRTbGlkZUV2ZW50cyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBpZiAoIF8ub3B0aW9ucy5wYXVzZU9uSG92ZXIgKSB7XG5cbiAgICAgICAgICAgIF8uJGxpc3Qub24oJ21vdXNlZW50ZXIuc2xpY2snLCAkLnByb3h5KF8uaW50ZXJydXB0LCBfLCB0cnVlKSk7XG4gICAgICAgICAgICBfLiRsaXN0Lm9uKCdtb3VzZWxlYXZlLnNsaWNrJywgJC5wcm94eShfLmludGVycnVwdCwgXywgZmFsc2UpKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmluaXRpYWxpemVFdmVudHMgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgXy5pbml0QXJyb3dFdmVudHMoKTtcblxuICAgICAgICBfLmluaXREb3RFdmVudHMoKTtcbiAgICAgICAgXy5pbml0U2xpZGVFdmVudHMoKTtcblxuICAgICAgICBfLiRsaXN0Lm9uKCd0b3VjaHN0YXJ0LnNsaWNrIG1vdXNlZG93bi5zbGljaycsIHtcbiAgICAgICAgICAgIGFjdGlvbjogJ3N0YXJ0J1xuICAgICAgICB9LCBfLnN3aXBlSGFuZGxlcik7XG4gICAgICAgIF8uJGxpc3Qub24oJ3RvdWNobW92ZS5zbGljayBtb3VzZW1vdmUuc2xpY2snLCB7XG4gICAgICAgICAgICBhY3Rpb246ICdtb3ZlJ1xuICAgICAgICB9LCBfLnN3aXBlSGFuZGxlcik7XG4gICAgICAgIF8uJGxpc3Qub24oJ3RvdWNoZW5kLnNsaWNrIG1vdXNldXAuc2xpY2snLCB7XG4gICAgICAgICAgICBhY3Rpb246ICdlbmQnXG4gICAgICAgIH0sIF8uc3dpcGVIYW5kbGVyKTtcbiAgICAgICAgXy4kbGlzdC5vbigndG91Y2hjYW5jZWwuc2xpY2sgbW91c2VsZWF2ZS5zbGljaycsIHtcbiAgICAgICAgICAgIGFjdGlvbjogJ2VuZCdcbiAgICAgICAgfSwgXy5zd2lwZUhhbmRsZXIpO1xuXG4gICAgICAgIF8uJGxpc3Qub24oJ2NsaWNrLnNsaWNrJywgXy5jbGlja0hhbmRsZXIpO1xuXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKF8udmlzaWJpbGl0eUNoYW5nZSwgJC5wcm94eShfLnZpc2liaWxpdHksIF8pKTtcblxuICAgICAgICBpZiAoXy5vcHRpb25zLmFjY2Vzc2liaWxpdHkgPT09IHRydWUpIHtcbiAgICAgICAgICAgIF8uJGxpc3Qub24oJ2tleWRvd24uc2xpY2snLCBfLmtleUhhbmRsZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5mb2N1c09uU2VsZWN0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAkKF8uJHNsaWRlVHJhY2spLmNoaWxkcmVuKCkub24oJ2NsaWNrLnNsaWNrJywgXy5zZWxlY3RIYW5kbGVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgICQod2luZG93KS5vbignb3JpZW50YXRpb25jaGFuZ2Uuc2xpY2suc2xpY2stJyArIF8uaW5zdGFuY2VVaWQsICQucHJveHkoXy5vcmllbnRhdGlvbkNoYW5nZSwgXykpO1xuXG4gICAgICAgICQod2luZG93KS5vbigncmVzaXplLnNsaWNrLnNsaWNrLScgKyBfLmluc3RhbmNlVWlkLCAkLnByb3h5KF8ucmVzaXplLCBfKSk7XG5cbiAgICAgICAgJCgnW2RyYWdnYWJsZSE9dHJ1ZV0nLCBfLiRzbGlkZVRyYWNrKS5vbignZHJhZ3N0YXJ0JywgXy5wcmV2ZW50RGVmYXVsdCk7XG5cbiAgICAgICAgJCh3aW5kb3cpLm9uKCdsb2FkLnNsaWNrLnNsaWNrLScgKyBfLmluc3RhbmNlVWlkLCBfLnNldFBvc2l0aW9uKTtcbiAgICAgICAgJChfLnNldFBvc2l0aW9uKTtcblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuaW5pdFVJID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuYXJyb3dzID09PSB0cnVlICYmIF8uc2xpZGVDb3VudCA+IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpIHtcblxuICAgICAgICAgICAgXy4kcHJldkFycm93LnNob3coKTtcbiAgICAgICAgICAgIF8uJG5leHRBcnJvdy5zaG93KCk7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuZG90cyA9PT0gdHJ1ZSAmJiBfLnNsaWRlQ291bnQgPiBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSB7XG5cbiAgICAgICAgICAgIF8uJGRvdHMuc2hvdygpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUua2V5SGFuZGxlciA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuICAgICAgICAgLy9Eb250IHNsaWRlIGlmIHRoZSBjdXJzb3IgaXMgaW5zaWRlIHRoZSBmb3JtIGZpZWxkcyBhbmQgYXJyb3cga2V5cyBhcmUgcHJlc3NlZFxuICAgICAgICBpZighZXZlbnQudGFyZ2V0LnRhZ05hbWUubWF0Y2goJ1RFWFRBUkVBfElOUFVUfFNFTEVDVCcpKSB7XG4gICAgICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMzcgJiYgXy5vcHRpb25zLmFjY2Vzc2liaWxpdHkgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBfLmNoYW5nZVNsaWRlKHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogXy5vcHRpb25zLnJ0bCA9PT0gdHJ1ZSA/ICduZXh0JyA6ICAncHJldmlvdXMnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMzkgJiYgXy5vcHRpb25zLmFjY2Vzc2liaWxpdHkgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBfLmNoYW5nZVNsaWRlKHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogXy5vcHRpb25zLnJ0bCA9PT0gdHJ1ZSA/ICdwcmV2aW91cycgOiAnbmV4dCdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLmxhenlMb2FkID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzLFxuICAgICAgICAgICAgbG9hZFJhbmdlLCBjbG9uZVJhbmdlLCByYW5nZVN0YXJ0LCByYW5nZUVuZDtcblxuICAgICAgICBmdW5jdGlvbiBsb2FkSW1hZ2VzKGltYWdlc1Njb3BlKSB7XG5cbiAgICAgICAgICAgICQoJ2ltZ1tkYXRhLWxhenldJywgaW1hZ2VzU2NvcGUpLmVhY2goZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgICAgICB2YXIgaW1hZ2UgPSAkKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICBpbWFnZVNvdXJjZSA9ICQodGhpcykuYXR0cignZGF0YS1sYXp5JyksXG4gICAgICAgICAgICAgICAgICAgIGltYWdlU3JjU2V0ID0gJCh0aGlzKS5hdHRyKCdkYXRhLXNyY3NldCcpLFxuICAgICAgICAgICAgICAgICAgICBpbWFnZVNpemVzICA9ICQodGhpcykuYXR0cignZGF0YS1zaXplcycpIHx8IF8uJHNsaWRlci5hdHRyKCdkYXRhLXNpemVzJyksXG4gICAgICAgICAgICAgICAgICAgIGltYWdlVG9Mb2FkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG5cbiAgICAgICAgICAgICAgICBpbWFnZVRvTG9hZC5vbmxvYWQgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgICAgICAgICBpbWFnZVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFuaW1hdGUoeyBvcGFjaXR5OiAwIH0sIDEwMCwgZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW1hZ2VTcmNTZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1hZ2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKCdzcmNzZXQnLCBpbWFnZVNyY1NldCApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbWFnZVNpemVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbWFnZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKCdzaXplcycsIGltYWdlU2l6ZXMgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGltYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKCdzcmMnLCBpbWFnZVNvdXJjZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmFuaW1hdGUoeyBvcGFjaXR5OiAxIH0sIDIwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbWFnZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLWxhenkgZGF0YS1zcmNzZXQgZGF0YS1zaXplcycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdzbGljay1sb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8uJHNsaWRlci50cmlnZ2VyKCdsYXp5TG9hZGVkJywgW18sIGltYWdlLCBpbWFnZVNvdXJjZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgaW1hZ2VUb0xvYWQub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAgICAgICAgIGltYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQXR0ciggJ2RhdGEtbGF6eScgKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCAnc2xpY2stbG9hZGluZycgKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCAnc2xpY2stbGF6eWxvYWQtZXJyb3InICk7XG5cbiAgICAgICAgICAgICAgICAgICAgXy4kc2xpZGVyLnRyaWdnZXIoJ2xhenlMb2FkRXJyb3InLCBbIF8sIGltYWdlLCBpbWFnZVNvdXJjZSBdKTtcblxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBpbWFnZVRvTG9hZC5zcmMgPSBpbWFnZVNvdXJjZTtcblxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuY2VudGVyTW9kZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgaWYgKF8ub3B0aW9ucy5pbmZpbml0ZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJhbmdlU3RhcnQgPSBfLmN1cnJlbnRTbGlkZSArIChfLm9wdGlvbnMuc2xpZGVzVG9TaG93IC8gMiArIDEpO1xuICAgICAgICAgICAgICAgIHJhbmdlRW5kID0gcmFuZ2VTdGFydCArIF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgKyAyO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByYW5nZVN0YXJ0ID0gTWF0aC5tYXgoMCwgXy5jdXJyZW50U2xpZGUgLSAoXy5vcHRpb25zLnNsaWRlc1RvU2hvdyAvIDIgKyAxKSk7XG4gICAgICAgICAgICAgICAgcmFuZ2VFbmQgPSAyICsgKF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgLyAyICsgMSkgKyBfLmN1cnJlbnRTbGlkZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJhbmdlU3RhcnQgPSBfLm9wdGlvbnMuaW5maW5pdGUgPyBfLm9wdGlvbnMuc2xpZGVzVG9TaG93ICsgXy5jdXJyZW50U2xpZGUgOiBfLmN1cnJlbnRTbGlkZTtcbiAgICAgICAgICAgIHJhbmdlRW5kID0gTWF0aC5jZWlsKHJhbmdlU3RhcnQgKyBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KTtcbiAgICAgICAgICAgIGlmIChfLm9wdGlvbnMuZmFkZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChyYW5nZVN0YXJ0ID4gMCkgcmFuZ2VTdGFydC0tO1xuICAgICAgICAgICAgICAgIGlmIChyYW5nZUVuZCA8PSBfLnNsaWRlQ291bnQpIHJhbmdlRW5kKys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBsb2FkUmFuZ2UgPSBfLiRzbGlkZXIuZmluZCgnLnNsaWNrLXNsaWRlJykuc2xpY2UocmFuZ2VTdGFydCwgcmFuZ2VFbmQpO1xuXG4gICAgICAgIGlmIChfLm9wdGlvbnMubGF6eUxvYWQgPT09ICdhbnRpY2lwYXRlZCcpIHtcbiAgICAgICAgICAgIHZhciBwcmV2U2xpZGUgPSByYW5nZVN0YXJ0IC0gMSxcbiAgICAgICAgICAgICAgICBuZXh0U2xpZGUgPSByYW5nZUVuZCxcbiAgICAgICAgICAgICAgICAkc2xpZGVzID0gXy4kc2xpZGVyLmZpbmQoJy5zbGljay1zbGlkZScpO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IF8ub3B0aW9ucy5zbGlkZXNUb1Njcm9sbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHByZXZTbGlkZSA8IDApIHByZXZTbGlkZSA9IF8uc2xpZGVDb3VudCAtIDE7XG4gICAgICAgICAgICAgICAgbG9hZFJhbmdlID0gbG9hZFJhbmdlLmFkZCgkc2xpZGVzLmVxKHByZXZTbGlkZSkpO1xuICAgICAgICAgICAgICAgIGxvYWRSYW5nZSA9IGxvYWRSYW5nZS5hZGQoJHNsaWRlcy5lcShuZXh0U2xpZGUpKTtcbiAgICAgICAgICAgICAgICBwcmV2U2xpZGUtLTtcbiAgICAgICAgICAgICAgICBuZXh0U2xpZGUrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGxvYWRJbWFnZXMobG9hZFJhbmdlKTtcblxuICAgICAgICBpZiAoXy5zbGlkZUNvdW50IDw9IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpIHtcbiAgICAgICAgICAgIGNsb25lUmFuZ2UgPSBfLiRzbGlkZXIuZmluZCgnLnNsaWNrLXNsaWRlJyk7XG4gICAgICAgICAgICBsb2FkSW1hZ2VzKGNsb25lUmFuZ2UpO1xuICAgICAgICB9IGVsc2VcbiAgICAgICAgaWYgKF8uY3VycmVudFNsaWRlID49IF8uc2xpZGVDb3VudCAtIF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpIHtcbiAgICAgICAgICAgIGNsb25lUmFuZ2UgPSBfLiRzbGlkZXIuZmluZCgnLnNsaWNrLWNsb25lZCcpLnNsaWNlKDAsIF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpO1xuICAgICAgICAgICAgbG9hZEltYWdlcyhjbG9uZVJhbmdlKTtcbiAgICAgICAgfSBlbHNlIGlmIChfLmN1cnJlbnRTbGlkZSA9PT0gMCkge1xuICAgICAgICAgICAgY2xvbmVSYW5nZSA9IF8uJHNsaWRlci5maW5kKCcuc2xpY2stY2xvbmVkJykuc2xpY2UoXy5vcHRpb25zLnNsaWRlc1RvU2hvdyAqIC0xKTtcbiAgICAgICAgICAgIGxvYWRJbWFnZXMoY2xvbmVSYW5nZSk7XG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUubG9hZFNsaWRlciA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBfLnNldFBvc2l0aW9uKCk7XG5cbiAgICAgICAgXy4kc2xpZGVUcmFjay5jc3Moe1xuICAgICAgICAgICAgb3BhY2l0eTogMVxuICAgICAgICB9KTtcblxuICAgICAgICBfLiRzbGlkZXIucmVtb3ZlQ2xhc3MoJ3NsaWNrLWxvYWRpbmcnKTtcblxuICAgICAgICBfLmluaXRVSSgpO1xuXG4gICAgICAgIGlmIChfLm9wdGlvbnMubGF6eUxvYWQgPT09ICdwcm9ncmVzc2l2ZScpIHtcbiAgICAgICAgICAgIF8ucHJvZ3Jlc3NpdmVMYXp5TG9hZCgpO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLm5leHQgPSBTbGljay5wcm90b3R5cGUuc2xpY2tOZXh0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIF8uY2hhbmdlU2xpZGUoe1xuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICduZXh0J1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUub3JpZW50YXRpb25DaGFuZ2UgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgXy5jaGVja1Jlc3BvbnNpdmUoKTtcbiAgICAgICAgXy5zZXRQb3NpdGlvbigpO1xuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5wYXVzZSA9IFNsaWNrLnByb3RvdHlwZS5zbGlja1BhdXNlID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIF8uYXV0b1BsYXlDbGVhcigpO1xuICAgICAgICBfLnBhdXNlZCA9IHRydWU7XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnBsYXkgPSBTbGljay5wcm90b3R5cGUuc2xpY2tQbGF5ID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIF8uYXV0b1BsYXkoKTtcbiAgICAgICAgXy5vcHRpb25zLmF1dG9wbGF5ID0gdHJ1ZTtcbiAgICAgICAgXy5wYXVzZWQgPSBmYWxzZTtcbiAgICAgICAgXy5mb2N1c3NlZCA9IGZhbHNlO1xuICAgICAgICBfLmludGVycnVwdGVkID0gZmFsc2U7XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnBvc3RTbGlkZSA9IGZ1bmN0aW9uKGluZGV4KSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIGlmKCAhXy51bnNsaWNrZWQgKSB7XG5cbiAgICAgICAgICAgIF8uJHNsaWRlci50cmlnZ2VyKCdhZnRlckNoYW5nZScsIFtfLCBpbmRleF0pO1xuXG4gICAgICAgICAgICBfLmFuaW1hdGluZyA9IGZhbHNlO1xuXG4gICAgICAgICAgICBpZiAoXy5zbGlkZUNvdW50ID4gXy5vcHRpb25zLnNsaWRlc1RvU2hvdykge1xuICAgICAgICAgICAgICAgIF8uc2V0UG9zaXRpb24oKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgXy5zd2lwZUxlZnQgPSBudWxsO1xuXG4gICAgICAgICAgICBpZiAoIF8ub3B0aW9ucy5hdXRvcGxheSApIHtcbiAgICAgICAgICAgICAgICBfLmF1dG9QbGF5KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChfLm9wdGlvbnMuYWNjZXNzaWJpbGl0eSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIF8uaW5pdEFEQSgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKF8ub3B0aW9ucy5mb2N1c09uQ2hhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciAkY3VycmVudFNsaWRlID0gJChfLiRzbGlkZXMuZ2V0KF8uY3VycmVudFNsaWRlKSk7XG4gICAgICAgICAgICAgICAgICAgICRjdXJyZW50U2xpZGUuYXR0cigndGFiaW5kZXgnLCAwKS5mb2N1cygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnByZXYgPSBTbGljay5wcm90b3R5cGUuc2xpY2tQcmV2ID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIF8uY2hhbmdlU2xpZGUoe1xuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdwcmV2aW91cydcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnByZXZlbnREZWZhdWx0ID0gZnVuY3Rpb24oZXZlbnQpIHtcblxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5wcm9ncmVzc2l2ZUxhenlMb2FkID0gZnVuY3Rpb24oIHRyeUNvdW50ICkge1xuXG4gICAgICAgIHRyeUNvdW50ID0gdHJ5Q291bnQgfHwgMTtcblxuICAgICAgICB2YXIgXyA9IHRoaXMsXG4gICAgICAgICAgICAkaW1nc1RvTG9hZCA9ICQoICdpbWdbZGF0YS1sYXp5XScsIF8uJHNsaWRlciApLFxuICAgICAgICAgICAgaW1hZ2UsXG4gICAgICAgICAgICBpbWFnZVNvdXJjZSxcbiAgICAgICAgICAgIGltYWdlU3JjU2V0LFxuICAgICAgICAgICAgaW1hZ2VTaXplcyxcbiAgICAgICAgICAgIGltYWdlVG9Mb2FkO1xuXG4gICAgICAgIGlmICggJGltZ3NUb0xvYWQubGVuZ3RoICkge1xuXG4gICAgICAgICAgICBpbWFnZSA9ICRpbWdzVG9Mb2FkLmZpcnN0KCk7XG4gICAgICAgICAgICBpbWFnZVNvdXJjZSA9IGltYWdlLmF0dHIoJ2RhdGEtbGF6eScpO1xuICAgICAgICAgICAgaW1hZ2VTcmNTZXQgPSBpbWFnZS5hdHRyKCdkYXRhLXNyY3NldCcpO1xuICAgICAgICAgICAgaW1hZ2VTaXplcyAgPSBpbWFnZS5hdHRyKCdkYXRhLXNpemVzJykgfHwgXy4kc2xpZGVyLmF0dHIoJ2RhdGEtc2l6ZXMnKTtcbiAgICAgICAgICAgIGltYWdlVG9Mb2FkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG5cbiAgICAgICAgICAgIGltYWdlVG9Mb2FkLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAgICAgaWYgKGltYWdlU3JjU2V0KSB7XG4gICAgICAgICAgICAgICAgICAgIGltYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICAuYXR0cignc3Jjc2V0JywgaW1hZ2VTcmNTZXQgKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoaW1hZ2VTaXplcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW1hZ2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYXR0cignc2l6ZXMnLCBpbWFnZVNpemVzICk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpbWFnZVxuICAgICAgICAgICAgICAgICAgICAuYXR0ciggJ3NyYycsIGltYWdlU291cmNlIClcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoJ2RhdGEtbGF6eSBkYXRhLXNyY3NldCBkYXRhLXNpemVzJylcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdzbGljay1sb2FkaW5nJyk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIF8ub3B0aW9ucy5hZGFwdGl2ZUhlaWdodCA9PT0gdHJ1ZSApIHtcbiAgICAgICAgICAgICAgICAgICAgXy5zZXRQb3NpdGlvbigpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIF8uJHNsaWRlci50cmlnZ2VyKCdsYXp5TG9hZGVkJywgWyBfLCBpbWFnZSwgaW1hZ2VTb3VyY2UgXSk7XG4gICAgICAgICAgICAgICAgXy5wcm9ncmVzc2l2ZUxhenlMb2FkKCk7XG5cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGltYWdlVG9Mb2FkLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgICAgIGlmICggdHJ5Q291bnQgPCAzICkge1xuXG4gICAgICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAgICAgKiB0cnkgdG8gbG9hZCB0aGUgaW1hZ2UgMyB0aW1lcyxcbiAgICAgICAgICAgICAgICAgICAgICogbGVhdmUgYSBzbGlnaHQgZGVsYXkgc28gd2UgZG9uJ3QgZ2V0XG4gICAgICAgICAgICAgICAgICAgICAqIHNlcnZlcnMgYmxvY2tpbmcgdGhlIHJlcXVlc3QuXG4gICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF8ucHJvZ3Jlc3NpdmVMYXp5TG9hZCggdHJ5Q291bnQgKyAxICk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDUwMCApO1xuXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgICAgICBpbWFnZVxuICAgICAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUF0dHIoICdkYXRhLWxhenknIClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcyggJ3NsaWNrLWxvYWRpbmcnIClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcyggJ3NsaWNrLWxhenlsb2FkLWVycm9yJyApO1xuXG4gICAgICAgICAgICAgICAgICAgIF8uJHNsaWRlci50cmlnZ2VyKCdsYXp5TG9hZEVycm9yJywgWyBfLCBpbWFnZSwgaW1hZ2VTb3VyY2UgXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgXy5wcm9ncmVzc2l2ZUxhenlMb2FkKCk7XG5cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGltYWdlVG9Mb2FkLnNyYyA9IGltYWdlU291cmNlO1xuXG4gICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgIF8uJHNsaWRlci50cmlnZ2VyKCdhbGxJbWFnZXNMb2FkZWQnLCBbIF8gXSk7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5yZWZyZXNoID0gZnVuY3Rpb24oIGluaXRpYWxpemluZyApIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXMsIGN1cnJlbnRTbGlkZSwgbGFzdFZpc2libGVJbmRleDtcblxuICAgICAgICBsYXN0VmlzaWJsZUluZGV4ID0gXy5zbGlkZUNvdW50IC0gXy5vcHRpb25zLnNsaWRlc1RvU2hvdztcblxuICAgICAgICAvLyBpbiBub24taW5maW5pdGUgc2xpZGVycywgd2UgZG9uJ3Qgd2FudCB0byBnbyBwYXN0IHRoZVxuICAgICAgICAvLyBsYXN0IHZpc2libGUgaW5kZXguXG4gICAgICAgIGlmKCAhXy5vcHRpb25zLmluZmluaXRlICYmICggXy5jdXJyZW50U2xpZGUgPiBsYXN0VmlzaWJsZUluZGV4ICkpIHtcbiAgICAgICAgICAgIF8uY3VycmVudFNsaWRlID0gbGFzdFZpc2libGVJbmRleDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlmIGxlc3Mgc2xpZGVzIHRoYW4gdG8gc2hvdywgZ28gdG8gc3RhcnQuXG4gICAgICAgIGlmICggXy5zbGlkZUNvdW50IDw9IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgKSB7XG4gICAgICAgICAgICBfLmN1cnJlbnRTbGlkZSA9IDA7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIGN1cnJlbnRTbGlkZSA9IF8uY3VycmVudFNsaWRlO1xuXG4gICAgICAgIF8uZGVzdHJveSh0cnVlKTtcblxuICAgICAgICAkLmV4dGVuZChfLCBfLmluaXRpYWxzLCB7IGN1cnJlbnRTbGlkZTogY3VycmVudFNsaWRlIH0pO1xuXG4gICAgICAgIF8uaW5pdCgpO1xuXG4gICAgICAgIGlmKCAhaW5pdGlhbGl6aW5nICkge1xuXG4gICAgICAgICAgICBfLmNoYW5nZVNsaWRlKHtcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdpbmRleCcsXG4gICAgICAgICAgICAgICAgICAgIGluZGV4OiBjdXJyZW50U2xpZGVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBmYWxzZSk7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5yZWdpc3RlckJyZWFrcG9pbnRzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzLCBicmVha3BvaW50LCBjdXJyZW50QnJlYWtwb2ludCwgbCxcbiAgICAgICAgICAgIHJlc3BvbnNpdmVTZXR0aW5ncyA9IF8ub3B0aW9ucy5yZXNwb25zaXZlIHx8IG51bGw7XG5cbiAgICAgICAgaWYgKCAkLnR5cGUocmVzcG9uc2l2ZVNldHRpbmdzKSA9PT0gJ2FycmF5JyAmJiByZXNwb25zaXZlU2V0dGluZ3MubGVuZ3RoICkge1xuXG4gICAgICAgICAgICBfLnJlc3BvbmRUbyA9IF8ub3B0aW9ucy5yZXNwb25kVG8gfHwgJ3dpbmRvdyc7XG5cbiAgICAgICAgICAgIGZvciAoIGJyZWFrcG9pbnQgaW4gcmVzcG9uc2l2ZVNldHRpbmdzICkge1xuXG4gICAgICAgICAgICAgICAgbCA9IF8uYnJlYWtwb2ludHMubGVuZ3RoLTE7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2l2ZVNldHRpbmdzLmhhc093blByb3BlcnR5KGJyZWFrcG9pbnQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRCcmVha3BvaW50ID0gcmVzcG9uc2l2ZVNldHRpbmdzW2JyZWFrcG9pbnRdLmJyZWFrcG9pbnQ7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gbG9vcCB0aHJvdWdoIHRoZSBicmVha3BvaW50cyBhbmQgY3V0IG91dCBhbnkgZXhpc3RpbmdcbiAgICAgICAgICAgICAgICAgICAgLy8gb25lcyB3aXRoIHRoZSBzYW1lIGJyZWFrcG9pbnQgbnVtYmVyLCB3ZSBkb24ndCB3YW50IGR1cGVzLlxuICAgICAgICAgICAgICAgICAgICB3aGlsZSggbCA+PSAwICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoIF8uYnJlYWtwb2ludHNbbF0gJiYgXy5icmVha3BvaW50c1tsXSA9PT0gY3VycmVudEJyZWFrcG9pbnQgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5icmVha3BvaW50cy5zcGxpY2UobCwxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGwtLTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIF8uYnJlYWtwb2ludHMucHVzaChjdXJyZW50QnJlYWtwb2ludCk7XG4gICAgICAgICAgICAgICAgICAgIF8uYnJlYWtwb2ludFNldHRpbmdzW2N1cnJlbnRCcmVha3BvaW50XSA9IHJlc3BvbnNpdmVTZXR0aW5nc1ticmVha3BvaW50XS5zZXR0aW5ncztcblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBfLmJyZWFrcG9pbnRzLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgICAgICAgICAgICAgIHJldHVybiAoIF8ub3B0aW9ucy5tb2JpbGVGaXJzdCApID8gYS1iIDogYi1hO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5yZWluaXQgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgXy4kc2xpZGVzID1cbiAgICAgICAgICAgIF8uJHNsaWRlVHJhY2tcbiAgICAgICAgICAgICAgICAuY2hpbGRyZW4oXy5vcHRpb25zLnNsaWRlKVxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnc2xpY2stc2xpZGUnKTtcblxuICAgICAgICBfLnNsaWRlQ291bnQgPSBfLiRzbGlkZXMubGVuZ3RoO1xuXG4gICAgICAgIGlmIChfLmN1cnJlbnRTbGlkZSA+PSBfLnNsaWRlQ291bnQgJiYgXy5jdXJyZW50U2xpZGUgIT09IDApIHtcbiAgICAgICAgICAgIF8uY3VycmVudFNsaWRlID0gXy5jdXJyZW50U2xpZGUgLSBfLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXy5zbGlkZUNvdW50IDw9IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpIHtcbiAgICAgICAgICAgIF8uY3VycmVudFNsaWRlID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIF8ucmVnaXN0ZXJCcmVha3BvaW50cygpO1xuXG4gICAgICAgIF8uc2V0UHJvcHMoKTtcbiAgICAgICAgXy5zZXR1cEluZmluaXRlKCk7XG4gICAgICAgIF8uYnVpbGRBcnJvd3MoKTtcbiAgICAgICAgXy51cGRhdGVBcnJvd3MoKTtcbiAgICAgICAgXy5pbml0QXJyb3dFdmVudHMoKTtcbiAgICAgICAgXy5idWlsZERvdHMoKTtcbiAgICAgICAgXy51cGRhdGVEb3RzKCk7XG4gICAgICAgIF8uaW5pdERvdEV2ZW50cygpO1xuICAgICAgICBfLmNsZWFuVXBTbGlkZUV2ZW50cygpO1xuICAgICAgICBfLmluaXRTbGlkZUV2ZW50cygpO1xuXG4gICAgICAgIF8uY2hlY2tSZXNwb25zaXZlKGZhbHNlLCB0cnVlKTtcblxuICAgICAgICBpZiAoXy5vcHRpb25zLmZvY3VzT25TZWxlY3QgPT09IHRydWUpIHtcbiAgICAgICAgICAgICQoXy4kc2xpZGVUcmFjaykuY2hpbGRyZW4oKS5vbignY2xpY2suc2xpY2snLCBfLnNlbGVjdEhhbmRsZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgXy5zZXRTbGlkZUNsYXNzZXModHlwZW9mIF8uY3VycmVudFNsaWRlID09PSAnbnVtYmVyJyA/IF8uY3VycmVudFNsaWRlIDogMCk7XG5cbiAgICAgICAgXy5zZXRQb3NpdGlvbigpO1xuICAgICAgICBfLmZvY3VzSGFuZGxlcigpO1xuXG4gICAgICAgIF8ucGF1c2VkID0gIV8ub3B0aW9ucy5hdXRvcGxheTtcbiAgICAgICAgXy5hdXRvUGxheSgpO1xuXG4gICAgICAgIF8uJHNsaWRlci50cmlnZ2VyKCdyZUluaXQnLCBbX10pO1xuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5yZXNpemUgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgaWYgKCQod2luZG93KS53aWR0aCgpICE9PSBfLndpbmRvd1dpZHRoKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoXy53aW5kb3dEZWxheSk7XG4gICAgICAgICAgICBfLndpbmRvd0RlbGF5ID0gd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgXy53aW5kb3dXaWR0aCA9ICQod2luZG93KS53aWR0aCgpO1xuICAgICAgICAgICAgICAgIF8uY2hlY2tSZXNwb25zaXZlKCk7XG4gICAgICAgICAgICAgICAgaWYoICFfLnVuc2xpY2tlZCApIHsgXy5zZXRQb3NpdGlvbigpOyB9XG4gICAgICAgICAgICB9LCA1MCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnJlbW92ZVNsaWRlID0gU2xpY2sucHJvdG90eXBlLnNsaWNrUmVtb3ZlID0gZnVuY3Rpb24oaW5kZXgsIHJlbW92ZUJlZm9yZSwgcmVtb3ZlQWxsKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIGlmICh0eXBlb2YoaW5kZXgpID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIHJlbW92ZUJlZm9yZSA9IGluZGV4O1xuICAgICAgICAgICAgaW5kZXggPSByZW1vdmVCZWZvcmUgPT09IHRydWUgPyAwIDogXy5zbGlkZUNvdW50IC0gMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGluZGV4ID0gcmVtb3ZlQmVmb3JlID09PSB0cnVlID8gLS1pbmRleCA6IGluZGV4O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8uc2xpZGVDb3VudCA8IDEgfHwgaW5kZXggPCAwIHx8IGluZGV4ID4gXy5zbGlkZUNvdW50IC0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgXy51bmxvYWQoKTtcblxuICAgICAgICBpZiAocmVtb3ZlQWxsID09PSB0cnVlKSB7XG4gICAgICAgICAgICBfLiRzbGlkZVRyYWNrLmNoaWxkcmVuKCkucmVtb3ZlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBfLiRzbGlkZVRyYWNrLmNoaWxkcmVuKHRoaXMub3B0aW9ucy5zbGlkZSkuZXEoaW5kZXgpLnJlbW92ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgXy4kc2xpZGVzID0gXy4kc2xpZGVUcmFjay5jaGlsZHJlbih0aGlzLm9wdGlvbnMuc2xpZGUpO1xuXG4gICAgICAgIF8uJHNsaWRlVHJhY2suY2hpbGRyZW4odGhpcy5vcHRpb25zLnNsaWRlKS5kZXRhY2goKTtcblxuICAgICAgICBfLiRzbGlkZVRyYWNrLmFwcGVuZChfLiRzbGlkZXMpO1xuXG4gICAgICAgIF8uJHNsaWRlc0NhY2hlID0gXy4kc2xpZGVzO1xuXG4gICAgICAgIF8ucmVpbml0KCk7XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnNldENTUyA9IGZ1bmN0aW9uKHBvc2l0aW9uKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzLFxuICAgICAgICAgICAgcG9zaXRpb25Qcm9wcyA9IHt9LFxuICAgICAgICAgICAgeCwgeTtcblxuICAgICAgICBpZiAoXy5vcHRpb25zLnJ0bCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgcG9zaXRpb24gPSAtcG9zaXRpb247XG4gICAgICAgIH1cbiAgICAgICAgeCA9IF8ucG9zaXRpb25Qcm9wID09ICdsZWZ0JyA/IE1hdGguY2VpbChwb3NpdGlvbikgKyAncHgnIDogJzBweCc7XG4gICAgICAgIHkgPSBfLnBvc2l0aW9uUHJvcCA9PSAndG9wJyA/IE1hdGguY2VpbChwb3NpdGlvbikgKyAncHgnIDogJzBweCc7XG5cbiAgICAgICAgcG9zaXRpb25Qcm9wc1tfLnBvc2l0aW9uUHJvcF0gPSBwb3NpdGlvbjtcblxuICAgICAgICBpZiAoXy50cmFuc2Zvcm1zRW5hYmxlZCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIF8uJHNsaWRlVHJhY2suY3NzKHBvc2l0aW9uUHJvcHMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcG9zaXRpb25Qcm9wcyA9IHt9O1xuICAgICAgICAgICAgaWYgKF8uY3NzVHJhbnNpdGlvbnMgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgcG9zaXRpb25Qcm9wc1tfLmFuaW1UeXBlXSA9ICd0cmFuc2xhdGUoJyArIHggKyAnLCAnICsgeSArICcpJztcbiAgICAgICAgICAgICAgICBfLiRzbGlkZVRyYWNrLmNzcyhwb3NpdGlvblByb3BzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcG9zaXRpb25Qcm9wc1tfLmFuaW1UeXBlXSA9ICd0cmFuc2xhdGUzZCgnICsgeCArICcsICcgKyB5ICsgJywgMHB4KSc7XG4gICAgICAgICAgICAgICAgXy4kc2xpZGVUcmFjay5jc3MocG9zaXRpb25Qcm9wcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuc2V0RGltZW5zaW9ucyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBpZiAoXy5vcHRpb25zLnZlcnRpY2FsID09PSBmYWxzZSkge1xuICAgICAgICAgICAgaWYgKF8ub3B0aW9ucy5jZW50ZXJNb2RlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgXy4kbGlzdC5jc3Moe1xuICAgICAgICAgICAgICAgICAgICBwYWRkaW5nOiAoJzBweCAnICsgXy5vcHRpb25zLmNlbnRlclBhZGRpbmcpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBfLiRsaXN0LmhlaWdodChfLiRzbGlkZXMuZmlyc3QoKS5vdXRlckhlaWdodCh0cnVlKSAqIF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpO1xuICAgICAgICAgICAgaWYgKF8ub3B0aW9ucy5jZW50ZXJNb2RlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgXy4kbGlzdC5jc3Moe1xuICAgICAgICAgICAgICAgICAgICBwYWRkaW5nOiAoXy5vcHRpb25zLmNlbnRlclBhZGRpbmcgKyAnIDBweCcpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBfLmxpc3RXaWR0aCA9IF8uJGxpc3Qud2lkdGgoKTtcbiAgICAgICAgXy5saXN0SGVpZ2h0ID0gXy4kbGlzdC5oZWlnaHQoKTtcblxuXG4gICAgICAgIGlmIChfLm9wdGlvbnMudmVydGljYWwgPT09IGZhbHNlICYmIF8ub3B0aW9ucy52YXJpYWJsZVdpZHRoID09PSBmYWxzZSkge1xuICAgICAgICAgICAgXy5zbGlkZVdpZHRoID0gTWF0aC5jZWlsKF8ubGlzdFdpZHRoIC8gXy5vcHRpb25zLnNsaWRlc1RvU2hvdyk7XG4gICAgICAgICAgICBfLiRzbGlkZVRyYWNrLndpZHRoKE1hdGguY2VpbCgoXy5zbGlkZVdpZHRoICogXy4kc2xpZGVUcmFjay5jaGlsZHJlbignLnNsaWNrLXNsaWRlJykubGVuZ3RoKSkpO1xuXG4gICAgICAgIH0gZWxzZSBpZiAoXy5vcHRpb25zLnZhcmlhYmxlV2lkdGggPT09IHRydWUpIHtcbiAgICAgICAgICAgIF8uJHNsaWRlVHJhY2sud2lkdGgoNTAwMCAqIF8uc2xpZGVDb3VudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBfLnNsaWRlV2lkdGggPSBNYXRoLmNlaWwoXy5saXN0V2lkdGgpO1xuICAgICAgICAgICAgXy4kc2xpZGVUcmFjay5oZWlnaHQoTWF0aC5jZWlsKChfLiRzbGlkZXMuZmlyc3QoKS5vdXRlckhlaWdodCh0cnVlKSAqIF8uJHNsaWRlVHJhY2suY2hpbGRyZW4oJy5zbGljay1zbGlkZScpLmxlbmd0aCkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBvZmZzZXQgPSBfLiRzbGlkZXMuZmlyc3QoKS5vdXRlcldpZHRoKHRydWUpIC0gXy4kc2xpZGVzLmZpcnN0KCkud2lkdGgoKTtcbiAgICAgICAgaWYgKF8ub3B0aW9ucy52YXJpYWJsZVdpZHRoID09PSBmYWxzZSkgXy4kc2xpZGVUcmFjay5jaGlsZHJlbignLnNsaWNrLXNsaWRlJykud2lkdGgoXy5zbGlkZVdpZHRoIC0gb2Zmc2V0KTtcblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuc2V0RmFkZSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcyxcbiAgICAgICAgICAgIHRhcmdldExlZnQ7XG5cbiAgICAgICAgXy4kc2xpZGVzLmVhY2goZnVuY3Rpb24oaW5kZXgsIGVsZW1lbnQpIHtcbiAgICAgICAgICAgIHRhcmdldExlZnQgPSAoXy5zbGlkZVdpZHRoICogaW5kZXgpICogLTE7XG4gICAgICAgICAgICBpZiAoXy5vcHRpb25zLnJ0bCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICQoZWxlbWVudCkuY3NzKHtcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICdyZWxhdGl2ZScsXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiB0YXJnZXRMZWZ0LFxuICAgICAgICAgICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICAgICAgICAgIHpJbmRleDogXy5vcHRpb25zLnpJbmRleCAtIDIsXG4gICAgICAgICAgICAgICAgICAgIG9wYWNpdHk6IDBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJChlbGVtZW50KS5jc3Moe1xuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3JlbGF0aXZlJyxcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogdGFyZ2V0TGVmdCxcbiAgICAgICAgICAgICAgICAgICAgdG9wOiAwLFxuICAgICAgICAgICAgICAgICAgICB6SW5kZXg6IF8ub3B0aW9ucy56SW5kZXggLSAyLFxuICAgICAgICAgICAgICAgICAgICBvcGFjaXR5OiAwXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIF8uJHNsaWRlcy5lcShfLmN1cnJlbnRTbGlkZSkuY3NzKHtcbiAgICAgICAgICAgIHpJbmRleDogXy5vcHRpb25zLnpJbmRleCAtIDEsXG4gICAgICAgICAgICBvcGFjaXR5OiAxXG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5zZXRIZWlnaHQgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgPT09IDEgJiYgXy5vcHRpb25zLmFkYXB0aXZlSGVpZ2h0ID09PSB0cnVlICYmIF8ub3B0aW9ucy52ZXJ0aWNhbCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHZhciB0YXJnZXRIZWlnaHQgPSBfLiRzbGlkZXMuZXEoXy5jdXJyZW50U2xpZGUpLm91dGVySGVpZ2h0KHRydWUpO1xuICAgICAgICAgICAgXy4kbGlzdC5jc3MoJ2hlaWdodCcsIHRhcmdldEhlaWdodCk7XG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuc2V0T3B0aW9uID1cbiAgICBTbGljay5wcm90b3R5cGUuc2xpY2tTZXRPcHRpb24gPSBmdW5jdGlvbigpIHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogYWNjZXB0cyBhcmd1bWVudHMgaW4gZm9ybWF0IG9mOlxuICAgICAgICAgKlxuICAgICAgICAgKiAgLSBmb3IgY2hhbmdpbmcgYSBzaW5nbGUgb3B0aW9uJ3MgdmFsdWU6XG4gICAgICAgICAqICAgICAuc2xpY2soXCJzZXRPcHRpb25cIiwgb3B0aW9uLCB2YWx1ZSwgcmVmcmVzaCApXG4gICAgICAgICAqXG4gICAgICAgICAqICAtIGZvciBjaGFuZ2luZyBhIHNldCBvZiByZXNwb25zaXZlIG9wdGlvbnM6XG4gICAgICAgICAqICAgICAuc2xpY2soXCJzZXRPcHRpb25cIiwgJ3Jlc3BvbnNpdmUnLCBbe30sIC4uLl0sIHJlZnJlc2ggKVxuICAgICAgICAgKlxuICAgICAgICAgKiAgLSBmb3IgdXBkYXRpbmcgbXVsdGlwbGUgdmFsdWVzIGF0IG9uY2UgKG5vdCByZXNwb25zaXZlKVxuICAgICAgICAgKiAgICAgLnNsaWNrKFwic2V0T3B0aW9uXCIsIHsgJ29wdGlvbic6IHZhbHVlLCAuLi4gfSwgcmVmcmVzaCApXG4gICAgICAgICAqL1xuXG4gICAgICAgIHZhciBfID0gdGhpcywgbCwgaXRlbSwgb3B0aW9uLCB2YWx1ZSwgcmVmcmVzaCA9IGZhbHNlLCB0eXBlO1xuXG4gICAgICAgIGlmKCAkLnR5cGUoIGFyZ3VtZW50c1swXSApID09PSAnb2JqZWN0JyApIHtcblxuICAgICAgICAgICAgb3B0aW9uID0gIGFyZ3VtZW50c1swXTtcbiAgICAgICAgICAgIHJlZnJlc2ggPSBhcmd1bWVudHNbMV07XG4gICAgICAgICAgICB0eXBlID0gJ211bHRpcGxlJztcblxuICAgICAgICB9IGVsc2UgaWYgKCAkLnR5cGUoIGFyZ3VtZW50c1swXSApID09PSAnc3RyaW5nJyApIHtcblxuICAgICAgICAgICAgb3B0aW9uID0gIGFyZ3VtZW50c1swXTtcbiAgICAgICAgICAgIHZhbHVlID0gYXJndW1lbnRzWzFdO1xuICAgICAgICAgICAgcmVmcmVzaCA9IGFyZ3VtZW50c1syXTtcblxuICAgICAgICAgICAgaWYgKCBhcmd1bWVudHNbMF0gPT09ICdyZXNwb25zaXZlJyAmJiAkLnR5cGUoIGFyZ3VtZW50c1sxXSApID09PSAnYXJyYXknICkge1xuXG4gICAgICAgICAgICAgICAgdHlwZSA9ICdyZXNwb25zaXZlJztcblxuICAgICAgICAgICAgfSBlbHNlIGlmICggdHlwZW9mIGFyZ3VtZW50c1sxXSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cbiAgICAgICAgICAgICAgICB0eXBlID0gJ3NpbmdsZSc7XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCB0eXBlID09PSAnc2luZ2xlJyApIHtcblxuICAgICAgICAgICAgXy5vcHRpb25zW29wdGlvbl0gPSB2YWx1ZTtcblxuXG4gICAgICAgIH0gZWxzZSBpZiAoIHR5cGUgPT09ICdtdWx0aXBsZScgKSB7XG5cbiAgICAgICAgICAgICQuZWFjaCggb3B0aW9uICwgZnVuY3Rpb24oIG9wdCwgdmFsICkge1xuXG4gICAgICAgICAgICAgICAgXy5vcHRpb25zW29wdF0gPSB2YWw7XG5cbiAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgfSBlbHNlIGlmICggdHlwZSA9PT0gJ3Jlc3BvbnNpdmUnICkge1xuXG4gICAgICAgICAgICBmb3IgKCBpdGVtIGluIHZhbHVlICkge1xuXG4gICAgICAgICAgICAgICAgaWYoICQudHlwZSggXy5vcHRpb25zLnJlc3BvbnNpdmUgKSAhPT0gJ2FycmF5JyApIHtcblxuICAgICAgICAgICAgICAgICAgICBfLm9wdGlvbnMucmVzcG9uc2l2ZSA9IFsgdmFsdWVbaXRlbV0gXTtcblxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICAgICAgbCA9IF8ub3B0aW9ucy5yZXNwb25zaXZlLmxlbmd0aC0xO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGxvb3AgdGhyb3VnaCB0aGUgcmVzcG9uc2l2ZSBvYmplY3QgYW5kIHNwbGljZSBvdXQgZHVwbGljYXRlcy5cbiAgICAgICAgICAgICAgICAgICAgd2hpbGUoIGwgPj0gMCApIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoIF8ub3B0aW9ucy5yZXNwb25zaXZlW2xdLmJyZWFrcG9pbnQgPT09IHZhbHVlW2l0ZW1dLmJyZWFrcG9pbnQgKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLm9wdGlvbnMucmVzcG9uc2l2ZS5zcGxpY2UobCwxKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBsLS07XG5cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIF8ub3B0aW9ucy5yZXNwb25zaXZlLnB1c2goIHZhbHVlW2l0ZW1dICk7XG5cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCByZWZyZXNoICkge1xuXG4gICAgICAgICAgICBfLnVubG9hZCgpO1xuICAgICAgICAgICAgXy5yZWluaXQoKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnNldFBvc2l0aW9uID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIF8uc2V0RGltZW5zaW9ucygpO1xuXG4gICAgICAgIF8uc2V0SGVpZ2h0KCk7XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5mYWRlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgXy5zZXRDU1MoXy5nZXRMZWZ0KF8uY3VycmVudFNsaWRlKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBfLnNldEZhZGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIF8uJHNsaWRlci50cmlnZ2VyKCdzZXRQb3NpdGlvbicsIFtfXSk7XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnNldFByb3BzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzLFxuICAgICAgICAgICAgYm9keVN0eWxlID0gZG9jdW1lbnQuYm9keS5zdHlsZTtcblxuICAgICAgICBfLnBvc2l0aW9uUHJvcCA9IF8ub3B0aW9ucy52ZXJ0aWNhbCA9PT0gdHJ1ZSA/ICd0b3AnIDogJ2xlZnQnO1xuXG4gICAgICAgIGlmIChfLnBvc2l0aW9uUHJvcCA9PT0gJ3RvcCcpIHtcbiAgICAgICAgICAgIF8uJHNsaWRlci5hZGRDbGFzcygnc2xpY2stdmVydGljYWwnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIF8uJHNsaWRlci5yZW1vdmVDbGFzcygnc2xpY2stdmVydGljYWwnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChib2R5U3R5bGUuV2Via2l0VHJhbnNpdGlvbiAhPT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICAgICBib2R5U3R5bGUuTW96VHJhbnNpdGlvbiAhPT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICAgICBib2R5U3R5bGUubXNUcmFuc2l0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGlmIChfLm9wdGlvbnMudXNlQ1NTID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgXy5jc3NUcmFuc2l0aW9ucyA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIF8ub3B0aW9ucy5mYWRlICkge1xuICAgICAgICAgICAgaWYgKCB0eXBlb2YgXy5vcHRpb25zLnpJbmRleCA9PT0gJ251bWJlcicgKSB7XG4gICAgICAgICAgICAgICAgaWYoIF8ub3B0aW9ucy56SW5kZXggPCAzICkge1xuICAgICAgICAgICAgICAgICAgICBfLm9wdGlvbnMuekluZGV4ID0gMztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIF8ub3B0aW9ucy56SW5kZXggPSBfLmRlZmF1bHRzLnpJbmRleDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChib2R5U3R5bGUuT1RyYW5zZm9ybSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBfLmFuaW1UeXBlID0gJ09UcmFuc2Zvcm0nO1xuICAgICAgICAgICAgXy50cmFuc2Zvcm1UeXBlID0gJy1vLXRyYW5zZm9ybSc7XG4gICAgICAgICAgICBfLnRyYW5zaXRpb25UeXBlID0gJ09UcmFuc2l0aW9uJztcbiAgICAgICAgICAgIGlmIChib2R5U3R5bGUucGVyc3BlY3RpdmVQcm9wZXJ0eSA9PT0gdW5kZWZpbmVkICYmIGJvZHlTdHlsZS53ZWJraXRQZXJzcGVjdGl2ZSA9PT0gdW5kZWZpbmVkKSBfLmFuaW1UeXBlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJvZHlTdHlsZS5Nb3pUcmFuc2Zvcm0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgXy5hbmltVHlwZSA9ICdNb3pUcmFuc2Zvcm0nO1xuICAgICAgICAgICAgXy50cmFuc2Zvcm1UeXBlID0gJy1tb3otdHJhbnNmb3JtJztcbiAgICAgICAgICAgIF8udHJhbnNpdGlvblR5cGUgPSAnTW96VHJhbnNpdGlvbic7XG4gICAgICAgICAgICBpZiAoYm9keVN0eWxlLnBlcnNwZWN0aXZlUHJvcGVydHkgPT09IHVuZGVmaW5lZCAmJiBib2R5U3R5bGUuTW96UGVyc3BlY3RpdmUgPT09IHVuZGVmaW5lZCkgXy5hbmltVHlwZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChib2R5U3R5bGUud2Via2l0VHJhbnNmb3JtICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIF8uYW5pbVR5cGUgPSAnd2Via2l0VHJhbnNmb3JtJztcbiAgICAgICAgICAgIF8udHJhbnNmb3JtVHlwZSA9ICctd2Via2l0LXRyYW5zZm9ybSc7XG4gICAgICAgICAgICBfLnRyYW5zaXRpb25UeXBlID0gJ3dlYmtpdFRyYW5zaXRpb24nO1xuICAgICAgICAgICAgaWYgKGJvZHlTdHlsZS5wZXJzcGVjdGl2ZVByb3BlcnR5ID09PSB1bmRlZmluZWQgJiYgYm9keVN0eWxlLndlYmtpdFBlcnNwZWN0aXZlID09PSB1bmRlZmluZWQpIF8uYW5pbVR5cGUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYm9keVN0eWxlLm1zVHJhbnNmb3JtICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIF8uYW5pbVR5cGUgPSAnbXNUcmFuc2Zvcm0nO1xuICAgICAgICAgICAgXy50cmFuc2Zvcm1UeXBlID0gJy1tcy10cmFuc2Zvcm0nO1xuICAgICAgICAgICAgXy50cmFuc2l0aW9uVHlwZSA9ICdtc1RyYW5zaXRpb24nO1xuICAgICAgICAgICAgaWYgKGJvZHlTdHlsZS5tc1RyYW5zZm9ybSA9PT0gdW5kZWZpbmVkKSBfLmFuaW1UeXBlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJvZHlTdHlsZS50cmFuc2Zvcm0gIT09IHVuZGVmaW5lZCAmJiBfLmFuaW1UeXBlICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgXy5hbmltVHlwZSA9ICd0cmFuc2Zvcm0nO1xuICAgICAgICAgICAgXy50cmFuc2Zvcm1UeXBlID0gJ3RyYW5zZm9ybSc7XG4gICAgICAgICAgICBfLnRyYW5zaXRpb25UeXBlID0gJ3RyYW5zaXRpb24nO1xuICAgICAgICB9XG4gICAgICAgIF8udHJhbnNmb3Jtc0VuYWJsZWQgPSBfLm9wdGlvbnMudXNlVHJhbnNmb3JtICYmIChfLmFuaW1UeXBlICE9PSBudWxsICYmIF8uYW5pbVR5cGUgIT09IGZhbHNlKTtcbiAgICB9O1xuXG5cbiAgICBTbGljay5wcm90b3R5cGUuc2V0U2xpZGVDbGFzc2VzID0gZnVuY3Rpb24oaW5kZXgpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXMsXG4gICAgICAgICAgICBjZW50ZXJPZmZzZXQsIGFsbFNsaWRlcywgaW5kZXhPZmZzZXQsIHJlbWFpbmRlcjtcblxuICAgICAgICBhbGxTbGlkZXMgPSBfLiRzbGlkZXJcbiAgICAgICAgICAgIC5maW5kKCcuc2xpY2stc2xpZGUnKVxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdzbGljay1hY3RpdmUgc2xpY2stY2VudGVyIHNsaWNrLWN1cnJlbnQnKVxuICAgICAgICAgICAgLmF0dHIoJ2FyaWEtaGlkZGVuJywgJ3RydWUnKTtcblxuICAgICAgICBfLiRzbGlkZXNcbiAgICAgICAgICAgIC5lcShpbmRleClcbiAgICAgICAgICAgIC5hZGRDbGFzcygnc2xpY2stY3VycmVudCcpO1xuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuY2VudGVyTW9kZSA9PT0gdHJ1ZSkge1xuXG4gICAgICAgICAgICB2YXIgZXZlbkNvZWYgPSBfLm9wdGlvbnMuc2xpZGVzVG9TaG93ICUgMiA9PT0gMCA/IDEgOiAwO1xuXG4gICAgICAgICAgICBjZW50ZXJPZmZzZXQgPSBNYXRoLmZsb29yKF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgLyAyKTtcblxuICAgICAgICAgICAgaWYgKF8ub3B0aW9ucy5pbmZpbml0ZSA9PT0gdHJ1ZSkge1xuXG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGNlbnRlck9mZnNldCAmJiBpbmRleCA8PSAoXy5zbGlkZUNvdW50IC0gMSkgLSBjZW50ZXJPZmZzZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgXy4kc2xpZGVzXG4gICAgICAgICAgICAgICAgICAgICAgICAuc2xpY2UoaW5kZXggLSBjZW50ZXJPZmZzZXQgKyBldmVuQ29lZiwgaW5kZXggKyBjZW50ZXJPZmZzZXQgKyAxKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdzbGljay1hY3RpdmUnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2FyaWEtaGlkZGVuJywgJ2ZhbHNlJyk7XG5cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgICAgIGluZGV4T2Zmc2V0ID0gXy5vcHRpb25zLnNsaWRlc1RvU2hvdyArIGluZGV4O1xuICAgICAgICAgICAgICAgICAgICBhbGxTbGlkZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zbGljZShpbmRleE9mZnNldCAtIGNlbnRlck9mZnNldCArIDEgKyBldmVuQ29lZiwgaW5kZXhPZmZzZXQgKyBjZW50ZXJPZmZzZXQgKyAyKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdzbGljay1hY3RpdmUnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2FyaWEtaGlkZGVuJywgJ2ZhbHNlJyk7XG5cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09IDApIHtcblxuICAgICAgICAgICAgICAgICAgICBhbGxTbGlkZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIC5lcShhbGxTbGlkZXMubGVuZ3RoIC0gMSAtIF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3NsaWNrLWNlbnRlcicpO1xuXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpbmRleCA9PT0gXy5zbGlkZUNvdW50IC0gMSkge1xuXG4gICAgICAgICAgICAgICAgICAgIGFsbFNsaWRlc1xuICAgICAgICAgICAgICAgICAgICAgICAgLmVxKF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3NsaWNrLWNlbnRlcicpO1xuXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF8uJHNsaWRlc1xuICAgICAgICAgICAgICAgIC5lcShpbmRleClcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3NsaWNrLWNlbnRlcicpO1xuXG4gICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgIGlmIChpbmRleCA+PSAwICYmIGluZGV4IDw9IChfLnNsaWRlQ291bnQgLSBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSkge1xuXG4gICAgICAgICAgICAgICAgXy4kc2xpZGVzXG4gICAgICAgICAgICAgICAgICAgIC5zbGljZShpbmRleCwgaW5kZXggKyBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3NsaWNrLWFjdGl2ZScpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCdhcmlhLWhpZGRlbicsICdmYWxzZScpO1xuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGFsbFNsaWRlcy5sZW5ndGggPD0gXy5vcHRpb25zLnNsaWRlc1RvU2hvdykge1xuXG4gICAgICAgICAgICAgICAgYWxsU2xpZGVzXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnc2xpY2stYWN0aXZlJylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2FyaWEtaGlkZGVuJywgJ2ZhbHNlJyk7XG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICByZW1haW5kZXIgPSBfLnNsaWRlQ291bnQgJSBfLm9wdGlvbnMuc2xpZGVzVG9TaG93O1xuICAgICAgICAgICAgICAgIGluZGV4T2Zmc2V0ID0gXy5vcHRpb25zLmluZmluaXRlID09PSB0cnVlID8gXy5vcHRpb25zLnNsaWRlc1RvU2hvdyArIGluZGV4IDogaW5kZXg7XG5cbiAgICAgICAgICAgICAgICBpZiAoXy5vcHRpb25zLnNsaWRlc1RvU2hvdyA9PSBfLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwgJiYgKF8uc2xpZGVDb3VudCAtIGluZGV4KSA8IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpIHtcblxuICAgICAgICAgICAgICAgICAgICBhbGxTbGlkZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zbGljZShpbmRleE9mZnNldCAtIChfLm9wdGlvbnMuc2xpZGVzVG9TaG93IC0gcmVtYWluZGVyKSwgaW5kZXhPZmZzZXQgKyByZW1haW5kZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3NsaWNrLWFjdGl2ZScpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYXR0cignYXJpYS1oaWRkZW4nLCAnZmFsc2UnKTtcblxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICAgICAgYWxsU2xpZGVzXG4gICAgICAgICAgICAgICAgICAgICAgICAuc2xpY2UoaW5kZXhPZmZzZXQsIGluZGV4T2Zmc2V0ICsgXy5vcHRpb25zLnNsaWRlc1RvU2hvdylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnc2xpY2stYWN0aXZlJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKCdhcmlhLWhpZGRlbicsICdmYWxzZScpO1xuXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLm9wdGlvbnMubGF6eUxvYWQgPT09ICdvbmRlbWFuZCcgfHwgXy5vcHRpb25zLmxhenlMb2FkID09PSAnYW50aWNpcGF0ZWQnKSB7XG4gICAgICAgICAgICBfLmxhenlMb2FkKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnNldHVwSW5maW5pdGUgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXMsXG4gICAgICAgICAgICBpLCBzbGlkZUluZGV4LCBpbmZpbml0ZUNvdW50O1xuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuZmFkZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgXy5vcHRpb25zLmNlbnRlck1vZGUgPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuaW5maW5pdGUgPT09IHRydWUgJiYgXy5vcHRpb25zLmZhZGUgPT09IGZhbHNlKSB7XG5cbiAgICAgICAgICAgIHNsaWRlSW5kZXggPSBudWxsO1xuXG4gICAgICAgICAgICBpZiAoXy5zbGlkZUNvdW50ID4gXy5vcHRpb25zLnNsaWRlc1RvU2hvdykge1xuXG4gICAgICAgICAgICAgICAgaWYgKF8ub3B0aW9ucy5jZW50ZXJNb2RlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGluZmluaXRlQ291bnQgPSBfLm9wdGlvbnMuc2xpZGVzVG9TaG93ICsgMTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpbmZpbml0ZUNvdW50ID0gXy5vcHRpb25zLnNsaWRlc1RvU2hvdztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmb3IgKGkgPSBfLnNsaWRlQ291bnQ7IGkgPiAoXy5zbGlkZUNvdW50IC1cbiAgICAgICAgICAgICAgICAgICAgICAgIGluZmluaXRlQ291bnQpOyBpIC09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgc2xpZGVJbmRleCA9IGkgLSAxO1xuICAgICAgICAgICAgICAgICAgICAkKF8uJHNsaWRlc1tzbGlkZUluZGV4XSkuY2xvbmUodHJ1ZSkuYXR0cignaWQnLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXNsaWNrLWluZGV4Jywgc2xpZGVJbmRleCAtIF8uc2xpZGVDb3VudClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5wcmVwZW5kVG8oXy4kc2xpZGVUcmFjaykuYWRkQ2xhc3MoJ3NsaWNrLWNsb25lZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgaW5maW5pdGVDb3VudCAgKyBfLnNsaWRlQ291bnQ7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICBzbGlkZUluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICAgICAgJChfLiRzbGlkZXNbc2xpZGVJbmRleF0pLmNsb25lKHRydWUpLmF0dHIoJ2lkJywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYXR0cignZGF0YS1zbGljay1pbmRleCcsIHNsaWRlSW5kZXggKyBfLnNsaWRlQ291bnQpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYXBwZW5kVG8oXy4kc2xpZGVUcmFjaykuYWRkQ2xhc3MoJ3NsaWNrLWNsb25lZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBfLiRzbGlkZVRyYWNrLmZpbmQoJy5zbGljay1jbG9uZWQnKS5maW5kKCdbaWRdJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5hdHRyKCdpZCcsICcnKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuaW50ZXJydXB0ID0gZnVuY3Rpb24oIHRvZ2dsZSApIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXM7XG5cbiAgICAgICAgaWYoICF0b2dnbGUgKSB7XG4gICAgICAgICAgICBfLmF1dG9QbGF5KCk7XG4gICAgICAgIH1cbiAgICAgICAgXy5pbnRlcnJ1cHRlZCA9IHRvZ2dsZTtcblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuc2VsZWN0SGFuZGxlciA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIHZhciB0YXJnZXRFbGVtZW50ID1cbiAgICAgICAgICAgICQoZXZlbnQudGFyZ2V0KS5pcygnLnNsaWNrLXNsaWRlJykgP1xuICAgICAgICAgICAgICAgICQoZXZlbnQudGFyZ2V0KSA6XG4gICAgICAgICAgICAgICAgJChldmVudC50YXJnZXQpLnBhcmVudHMoJy5zbGljay1zbGlkZScpO1xuXG4gICAgICAgIHZhciBpbmRleCA9IHBhcnNlSW50KHRhcmdldEVsZW1lbnQuYXR0cignZGF0YS1zbGljay1pbmRleCcpKTtcblxuICAgICAgICBpZiAoIWluZGV4KSBpbmRleCA9IDA7XG5cbiAgICAgICAgaWYgKF8uc2xpZGVDb3VudCA8PSBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSB7XG5cbiAgICAgICAgICAgIF8uc2xpZGVIYW5kbGVyKGluZGV4LCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgfVxuXG4gICAgICAgIF8uc2xpZGVIYW5kbGVyKGluZGV4KTtcblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuc2xpZGVIYW5kbGVyID0gZnVuY3Rpb24oaW5kZXgsIHN5bmMsIGRvbnRBbmltYXRlKSB7XG5cbiAgICAgICAgdmFyIHRhcmdldFNsaWRlLCBhbmltU2xpZGUsIG9sZFNsaWRlLCBzbGlkZUxlZnQsIHRhcmdldExlZnQgPSBudWxsLFxuICAgICAgICAgICAgXyA9IHRoaXMsIG5hdlRhcmdldDtcblxuICAgICAgICBzeW5jID0gc3luYyB8fCBmYWxzZTtcblxuICAgICAgICBpZiAoXy5hbmltYXRpbmcgPT09IHRydWUgJiYgXy5vcHRpb25zLndhaXRGb3JBbmltYXRlID09PSB0cnVlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXy5vcHRpb25zLmZhZGUgPT09IHRydWUgJiYgXy5jdXJyZW50U2xpZGUgPT09IGluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3luYyA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIF8uYXNOYXZGb3IoaW5kZXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGFyZ2V0U2xpZGUgPSBpbmRleDtcbiAgICAgICAgdGFyZ2V0TGVmdCA9IF8uZ2V0TGVmdCh0YXJnZXRTbGlkZSk7XG4gICAgICAgIHNsaWRlTGVmdCA9IF8uZ2V0TGVmdChfLmN1cnJlbnRTbGlkZSk7XG5cbiAgICAgICAgXy5jdXJyZW50TGVmdCA9IF8uc3dpcGVMZWZ0ID09PSBudWxsID8gc2xpZGVMZWZ0IDogXy5zd2lwZUxlZnQ7XG5cbiAgICAgICAgaWYgKF8ub3B0aW9ucy5pbmZpbml0ZSA9PT0gZmFsc2UgJiYgXy5vcHRpb25zLmNlbnRlck1vZGUgPT09IGZhbHNlICYmIChpbmRleCA8IDAgfHwgaW5kZXggPiBfLmdldERvdENvdW50KCkgKiBfLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwpKSB7XG4gICAgICAgICAgICBpZiAoXy5vcHRpb25zLmZhZGUgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0U2xpZGUgPSBfLmN1cnJlbnRTbGlkZTtcbiAgICAgICAgICAgICAgICBpZiAoZG9udEFuaW1hdGUgIT09IHRydWUgJiYgXy5zbGlkZUNvdW50ID4gXy5vcHRpb25zLnNsaWRlc1RvU2hvdykge1xuICAgICAgICAgICAgICAgICAgICBfLmFuaW1hdGVTbGlkZShzbGlkZUxlZnQsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5wb3N0U2xpZGUodGFyZ2V0U2xpZGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBfLnBvc3RTbGlkZSh0YXJnZXRTbGlkZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2UgaWYgKF8ub3B0aW9ucy5pbmZpbml0ZSA9PT0gZmFsc2UgJiYgXy5vcHRpb25zLmNlbnRlck1vZGUgPT09IHRydWUgJiYgKGluZGV4IDwgMCB8fCBpbmRleCA+IChfLnNsaWRlQ291bnQgLSBfLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwpKSkge1xuICAgICAgICAgICAgaWYgKF8ub3B0aW9ucy5mYWRlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHRhcmdldFNsaWRlID0gXy5jdXJyZW50U2xpZGU7XG4gICAgICAgICAgICAgICAgaWYgKGRvbnRBbmltYXRlICE9PSB0cnVlICYmIF8uc2xpZGVDb3VudCA+IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cpIHtcbiAgICAgICAgICAgICAgICAgICAgXy5hbmltYXRlU2xpZGUoc2xpZGVMZWZ0LCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF8ucG9zdFNsaWRlKHRhcmdldFNsaWRlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgXy5wb3N0U2xpZGUodGFyZ2V0U2xpZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICggXy5vcHRpb25zLmF1dG9wbGF5ICkge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChfLmF1dG9QbGF5VGltZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRhcmdldFNsaWRlIDwgMCkge1xuICAgICAgICAgICAgaWYgKF8uc2xpZGVDb3VudCAlIF8ub3B0aW9ucy5zbGlkZXNUb1Njcm9sbCAhPT0gMCkge1xuICAgICAgICAgICAgICAgIGFuaW1TbGlkZSA9IF8uc2xpZGVDb3VudCAtIChfLnNsaWRlQ291bnQgJSBfLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhbmltU2xpZGUgPSBfLnNsaWRlQ291bnQgKyB0YXJnZXRTbGlkZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0YXJnZXRTbGlkZSA+PSBfLnNsaWRlQ291bnQpIHtcbiAgICAgICAgICAgIGlmIChfLnNsaWRlQ291bnQgJSBfLm9wdGlvbnMuc2xpZGVzVG9TY3JvbGwgIT09IDApIHtcbiAgICAgICAgICAgICAgICBhbmltU2xpZGUgPSAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhbmltU2xpZGUgPSB0YXJnZXRTbGlkZSAtIF8uc2xpZGVDb3VudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFuaW1TbGlkZSA9IHRhcmdldFNsaWRlO1xuICAgICAgICB9XG5cbiAgICAgICAgXy5hbmltYXRpbmcgPSB0cnVlO1xuXG4gICAgICAgIF8uJHNsaWRlci50cmlnZ2VyKCdiZWZvcmVDaGFuZ2UnLCBbXywgXy5jdXJyZW50U2xpZGUsIGFuaW1TbGlkZV0pO1xuXG4gICAgICAgIG9sZFNsaWRlID0gXy5jdXJyZW50U2xpZGU7XG4gICAgICAgIF8uY3VycmVudFNsaWRlID0gYW5pbVNsaWRlO1xuXG4gICAgICAgIF8uc2V0U2xpZGVDbGFzc2VzKF8uY3VycmVudFNsaWRlKTtcblxuICAgICAgICBpZiAoIF8ub3B0aW9ucy5hc05hdkZvciApIHtcblxuICAgICAgICAgICAgbmF2VGFyZ2V0ID0gXy5nZXROYXZUYXJnZXQoKTtcbiAgICAgICAgICAgIG5hdlRhcmdldCA9IG5hdlRhcmdldC5zbGljaygnZ2V0U2xpY2snKTtcblxuICAgICAgICAgICAgaWYgKCBuYXZUYXJnZXQuc2xpZGVDb3VudCA8PSBuYXZUYXJnZXQub3B0aW9ucy5zbGlkZXNUb1Nob3cgKSB7XG4gICAgICAgICAgICAgICAgbmF2VGFyZ2V0LnNldFNsaWRlQ2xhc3NlcyhfLmN1cnJlbnRTbGlkZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuXG4gICAgICAgIF8udXBkYXRlRG90cygpO1xuICAgICAgICBfLnVwZGF0ZUFycm93cygpO1xuXG4gICAgICAgIGlmIChfLm9wdGlvbnMuZmFkZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgaWYgKGRvbnRBbmltYXRlICE9PSB0cnVlKSB7XG5cbiAgICAgICAgICAgICAgICBfLmZhZGVTbGlkZU91dChvbGRTbGlkZSk7XG5cbiAgICAgICAgICAgICAgICBfLmZhZGVTbGlkZShhbmltU2xpZGUsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBfLnBvc3RTbGlkZShhbmltU2xpZGUpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIF8ucG9zdFNsaWRlKGFuaW1TbGlkZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfLmFuaW1hdGVIZWlnaHQoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkb250QW5pbWF0ZSAhPT0gdHJ1ZSAmJiBfLnNsaWRlQ291bnQgPiBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSB7XG4gICAgICAgICAgICBfLmFuaW1hdGVTbGlkZSh0YXJnZXRMZWZ0LCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBfLnBvc3RTbGlkZShhbmltU2xpZGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBfLnBvc3RTbGlkZShhbmltU2xpZGUpO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnN0YXJ0TG9hZCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBpZiAoXy5vcHRpb25zLmFycm93cyA9PT0gdHJ1ZSAmJiBfLnNsaWRlQ291bnQgPiBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSB7XG5cbiAgICAgICAgICAgIF8uJHByZXZBcnJvdy5oaWRlKCk7XG4gICAgICAgICAgICBfLiRuZXh0QXJyb3cuaGlkZSgpO1xuXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXy5vcHRpb25zLmRvdHMgPT09IHRydWUgJiYgXy5zbGlkZUNvdW50ID4gXy5vcHRpb25zLnNsaWRlc1RvU2hvdykge1xuXG4gICAgICAgICAgICBfLiRkb3RzLmhpZGUoKTtcblxuICAgICAgICB9XG5cbiAgICAgICAgXy4kc2xpZGVyLmFkZENsYXNzKCdzbGljay1sb2FkaW5nJyk7XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnN3aXBlRGlyZWN0aW9uID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIHhEaXN0LCB5RGlzdCwgciwgc3dpcGVBbmdsZSwgXyA9IHRoaXM7XG5cbiAgICAgICAgeERpc3QgPSBfLnRvdWNoT2JqZWN0LnN0YXJ0WCAtIF8udG91Y2hPYmplY3QuY3VyWDtcbiAgICAgICAgeURpc3QgPSBfLnRvdWNoT2JqZWN0LnN0YXJ0WSAtIF8udG91Y2hPYmplY3QuY3VyWTtcbiAgICAgICAgciA9IE1hdGguYXRhbjIoeURpc3QsIHhEaXN0KTtcblxuICAgICAgICBzd2lwZUFuZ2xlID0gTWF0aC5yb3VuZChyICogMTgwIC8gTWF0aC5QSSk7XG4gICAgICAgIGlmIChzd2lwZUFuZ2xlIDwgMCkge1xuICAgICAgICAgICAgc3dpcGVBbmdsZSA9IDM2MCAtIE1hdGguYWJzKHN3aXBlQW5nbGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKChzd2lwZUFuZ2xlIDw9IDQ1KSAmJiAoc3dpcGVBbmdsZSA+PSAwKSkge1xuICAgICAgICAgICAgcmV0dXJuIChfLm9wdGlvbnMucnRsID09PSBmYWxzZSA/ICdsZWZ0JyA6ICdyaWdodCcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICgoc3dpcGVBbmdsZSA8PSAzNjApICYmIChzd2lwZUFuZ2xlID49IDMxNSkpIHtcbiAgICAgICAgICAgIHJldHVybiAoXy5vcHRpb25zLnJ0bCA9PT0gZmFsc2UgPyAnbGVmdCcgOiAncmlnaHQnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoKHN3aXBlQW5nbGUgPj0gMTM1KSAmJiAoc3dpcGVBbmdsZSA8PSAyMjUpKSB7XG4gICAgICAgICAgICByZXR1cm4gKF8ub3B0aW9ucy5ydGwgPT09IGZhbHNlID8gJ3JpZ2h0JyA6ICdsZWZ0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKF8ub3B0aW9ucy52ZXJ0aWNhbFN3aXBpbmcgPT09IHRydWUpIHtcbiAgICAgICAgICAgIGlmICgoc3dpcGVBbmdsZSA+PSAzNSkgJiYgKHN3aXBlQW5nbGUgPD0gMTM1KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAnZG93bic7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAndXAnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuICd2ZXJ0aWNhbCc7XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnN3aXBlRW5kID0gZnVuY3Rpb24oZXZlbnQpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXMsXG4gICAgICAgICAgICBzbGlkZUNvdW50LFxuICAgICAgICAgICAgZGlyZWN0aW9uO1xuXG4gICAgICAgIF8uZHJhZ2dpbmcgPSBmYWxzZTtcbiAgICAgICAgXy5zd2lwaW5nID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKF8uc2Nyb2xsaW5nKSB7XG4gICAgICAgICAgICBfLnNjcm9sbGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgXy5pbnRlcnJ1cHRlZCA9IGZhbHNlO1xuICAgICAgICBfLnNob3VsZENsaWNrID0gKCBfLnRvdWNoT2JqZWN0LnN3aXBlTGVuZ3RoID4gMTAgKSA/IGZhbHNlIDogdHJ1ZTtcblxuICAgICAgICBpZiAoIF8udG91Y2hPYmplY3QuY3VyWCA9PT0gdW5kZWZpbmVkICkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCBfLnRvdWNoT2JqZWN0LmVkZ2VIaXQgPT09IHRydWUgKSB7XG4gICAgICAgICAgICBfLiRzbGlkZXIudHJpZ2dlcignZWRnZScsIFtfLCBfLnN3aXBlRGlyZWN0aW9uKCkgXSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIF8udG91Y2hPYmplY3Quc3dpcGVMZW5ndGggPj0gXy50b3VjaE9iamVjdC5taW5Td2lwZSApIHtcblxuICAgICAgICAgICAgZGlyZWN0aW9uID0gXy5zd2lwZURpcmVjdGlvbigpO1xuXG4gICAgICAgICAgICBzd2l0Y2ggKCBkaXJlY3Rpb24gKSB7XG5cbiAgICAgICAgICAgICAgICBjYXNlICdsZWZ0JzpcbiAgICAgICAgICAgICAgICBjYXNlICdkb3duJzpcblxuICAgICAgICAgICAgICAgICAgICBzbGlkZUNvdW50ID1cbiAgICAgICAgICAgICAgICAgICAgICAgIF8ub3B0aW9ucy5zd2lwZVRvU2xpZGUgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8uY2hlY2tOYXZpZ2FibGUoIF8uY3VycmVudFNsaWRlICsgXy5nZXRTbGlkZUNvdW50KCkgKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5jdXJyZW50U2xpZGUgKyBfLmdldFNsaWRlQ291bnQoKTtcblxuICAgICAgICAgICAgICAgICAgICBfLmN1cnJlbnREaXJlY3Rpb24gPSAwO1xuXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSAncmlnaHQnOlxuICAgICAgICAgICAgICAgIGNhc2UgJ3VwJzpcblxuICAgICAgICAgICAgICAgICAgICBzbGlkZUNvdW50ID1cbiAgICAgICAgICAgICAgICAgICAgICAgIF8ub3B0aW9ucy5zd2lwZVRvU2xpZGUgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8uY2hlY2tOYXZpZ2FibGUoIF8uY3VycmVudFNsaWRlIC0gXy5nZXRTbGlkZUNvdW50KCkgKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5jdXJyZW50U2xpZGUgLSBfLmdldFNsaWRlQ291bnQoKTtcblxuICAgICAgICAgICAgICAgICAgICBfLmN1cnJlbnREaXJlY3Rpb24gPSAxO1xuXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcblxuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKCBkaXJlY3Rpb24gIT0gJ3ZlcnRpY2FsJyApIHtcblxuICAgICAgICAgICAgICAgIF8uc2xpZGVIYW5kbGVyKCBzbGlkZUNvdW50ICk7XG4gICAgICAgICAgICAgICAgXy50b3VjaE9iamVjdCA9IHt9O1xuICAgICAgICAgICAgICAgIF8uJHNsaWRlci50cmlnZ2VyKCdzd2lwZScsIFtfLCBkaXJlY3Rpb24gXSk7XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICBpZiAoIF8udG91Y2hPYmplY3Quc3RhcnRYICE9PSBfLnRvdWNoT2JqZWN0LmN1clggKSB7XG5cbiAgICAgICAgICAgICAgICBfLnNsaWRlSGFuZGxlciggXy5jdXJyZW50U2xpZGUgKTtcbiAgICAgICAgICAgICAgICBfLnRvdWNoT2JqZWN0ID0ge307XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnN3aXBlSGFuZGxlciA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cbiAgICAgICAgdmFyIF8gPSB0aGlzO1xuXG4gICAgICAgIGlmICgoXy5vcHRpb25zLnN3aXBlID09PSBmYWxzZSkgfHwgKCdvbnRvdWNoZW5kJyBpbiBkb2N1bWVudCAmJiBfLm9wdGlvbnMuc3dpcGUgPT09IGZhbHNlKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2UgaWYgKF8ub3B0aW9ucy5kcmFnZ2FibGUgPT09IGZhbHNlICYmIGV2ZW50LnR5cGUuaW5kZXhPZignbW91c2UnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIF8udG91Y2hPYmplY3QuZmluZ2VyQ291bnQgPSBldmVudC5vcmlnaW5hbEV2ZW50ICYmIGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlcyAhPT0gdW5kZWZpbmVkID9cbiAgICAgICAgICAgIGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlcy5sZW5ndGggOiAxO1xuXG4gICAgICAgIF8udG91Y2hPYmplY3QubWluU3dpcGUgPSBfLmxpc3RXaWR0aCAvIF8ub3B0aW9uc1xuICAgICAgICAgICAgLnRvdWNoVGhyZXNob2xkO1xuXG4gICAgICAgIGlmIChfLm9wdGlvbnMudmVydGljYWxTd2lwaW5nID09PSB0cnVlKSB7XG4gICAgICAgICAgICBfLnRvdWNoT2JqZWN0Lm1pblN3aXBlID0gXy5saXN0SGVpZ2h0IC8gXy5vcHRpb25zXG4gICAgICAgICAgICAgICAgLnRvdWNoVGhyZXNob2xkO1xuICAgICAgICB9XG5cbiAgICAgICAgc3dpdGNoIChldmVudC5kYXRhLmFjdGlvbikge1xuXG4gICAgICAgICAgICBjYXNlICdzdGFydCc6XG4gICAgICAgICAgICAgICAgXy5zd2lwZVN0YXJ0KGV2ZW50KTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnbW92ZSc6XG4gICAgICAgICAgICAgICAgXy5zd2lwZU1vdmUoZXZlbnQpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdlbmQnOlxuICAgICAgICAgICAgICAgIF8uc3dpcGVFbmQoZXZlbnQpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUuc3dpcGVNb3ZlID0gZnVuY3Rpb24oZXZlbnQpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXMsXG4gICAgICAgICAgICBlZGdlV2FzSGl0ID0gZmFsc2UsXG4gICAgICAgICAgICBjdXJMZWZ0LCBzd2lwZURpcmVjdGlvbiwgc3dpcGVMZW5ndGgsIHBvc2l0aW9uT2Zmc2V0LCB0b3VjaGVzLCB2ZXJ0aWNhbFN3aXBlTGVuZ3RoO1xuXG4gICAgICAgIHRvdWNoZXMgPSBldmVudC5vcmlnaW5hbEV2ZW50ICE9PSB1bmRlZmluZWQgPyBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXMgOiBudWxsO1xuXG4gICAgICAgIGlmICghXy5kcmFnZ2luZyB8fCBfLnNjcm9sbGluZyB8fCB0b3VjaGVzICYmIHRvdWNoZXMubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBjdXJMZWZ0ID0gXy5nZXRMZWZ0KF8uY3VycmVudFNsaWRlKTtcblxuICAgICAgICBfLnRvdWNoT2JqZWN0LmN1clggPSB0b3VjaGVzICE9PSB1bmRlZmluZWQgPyB0b3VjaGVzWzBdLnBhZ2VYIDogZXZlbnQuY2xpZW50WDtcbiAgICAgICAgXy50b3VjaE9iamVjdC5jdXJZID0gdG91Y2hlcyAhPT0gdW5kZWZpbmVkID8gdG91Y2hlc1swXS5wYWdlWSA6IGV2ZW50LmNsaWVudFk7XG5cbiAgICAgICAgXy50b3VjaE9iamVjdC5zd2lwZUxlbmd0aCA9IE1hdGgucm91bmQoTWF0aC5zcXJ0KFxuICAgICAgICAgICAgTWF0aC5wb3coXy50b3VjaE9iamVjdC5jdXJYIC0gXy50b3VjaE9iamVjdC5zdGFydFgsIDIpKSk7XG5cbiAgICAgICAgdmVydGljYWxTd2lwZUxlbmd0aCA9IE1hdGgucm91bmQoTWF0aC5zcXJ0KFxuICAgICAgICAgICAgTWF0aC5wb3coXy50b3VjaE9iamVjdC5jdXJZIC0gXy50b3VjaE9iamVjdC5zdGFydFksIDIpKSk7XG5cbiAgICAgICAgaWYgKCFfLm9wdGlvbnMudmVydGljYWxTd2lwaW5nICYmICFfLnN3aXBpbmcgJiYgdmVydGljYWxTd2lwZUxlbmd0aCA+IDQpIHtcbiAgICAgICAgICAgIF8uc2Nyb2xsaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLm9wdGlvbnMudmVydGljYWxTd2lwaW5nID09PSB0cnVlKSB7XG4gICAgICAgICAgICBfLnRvdWNoT2JqZWN0LnN3aXBlTGVuZ3RoID0gdmVydGljYWxTd2lwZUxlbmd0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIHN3aXBlRGlyZWN0aW9uID0gXy5zd2lwZURpcmVjdGlvbigpO1xuXG4gICAgICAgIGlmIChldmVudC5vcmlnaW5hbEV2ZW50ICE9PSB1bmRlZmluZWQgJiYgXy50b3VjaE9iamVjdC5zd2lwZUxlbmd0aCA+IDQpIHtcbiAgICAgICAgICAgIF8uc3dpcGluZyA9IHRydWU7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcG9zaXRpb25PZmZzZXQgPSAoXy5vcHRpb25zLnJ0bCA9PT0gZmFsc2UgPyAxIDogLTEpICogKF8udG91Y2hPYmplY3QuY3VyWCA+IF8udG91Y2hPYmplY3Quc3RhcnRYID8gMSA6IC0xKTtcbiAgICAgICAgaWYgKF8ub3B0aW9ucy52ZXJ0aWNhbFN3aXBpbmcgPT09IHRydWUpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uT2Zmc2V0ID0gXy50b3VjaE9iamVjdC5jdXJZID4gXy50b3VjaE9iamVjdC5zdGFydFkgPyAxIDogLTE7XG4gICAgICAgIH1cblxuXG4gICAgICAgIHN3aXBlTGVuZ3RoID0gXy50b3VjaE9iamVjdC5zd2lwZUxlbmd0aDtcblxuICAgICAgICBfLnRvdWNoT2JqZWN0LmVkZ2VIaXQgPSBmYWxzZTtcblxuICAgICAgICBpZiAoXy5vcHRpb25zLmluZmluaXRlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgaWYgKChfLmN1cnJlbnRTbGlkZSA9PT0gMCAmJiBzd2lwZURpcmVjdGlvbiA9PT0gJ3JpZ2h0JykgfHwgKF8uY3VycmVudFNsaWRlID49IF8uZ2V0RG90Q291bnQoKSAmJiBzd2lwZURpcmVjdGlvbiA9PT0gJ2xlZnQnKSkge1xuICAgICAgICAgICAgICAgIHN3aXBlTGVuZ3RoID0gXy50b3VjaE9iamVjdC5zd2lwZUxlbmd0aCAqIF8ub3B0aW9ucy5lZGdlRnJpY3Rpb247XG4gICAgICAgICAgICAgICAgXy50b3VjaE9iamVjdC5lZGdlSGl0ID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLm9wdGlvbnMudmVydGljYWwgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBfLnN3aXBlTGVmdCA9IGN1ckxlZnQgKyBzd2lwZUxlbmd0aCAqIHBvc2l0aW9uT2Zmc2V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgXy5zd2lwZUxlZnQgPSBjdXJMZWZ0ICsgKHN3aXBlTGVuZ3RoICogKF8uJGxpc3QuaGVpZ2h0KCkgLyBfLmxpc3RXaWR0aCkpICogcG9zaXRpb25PZmZzZXQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKF8ub3B0aW9ucy52ZXJ0aWNhbFN3aXBpbmcgPT09IHRydWUpIHtcbiAgICAgICAgICAgIF8uc3dpcGVMZWZ0ID0gY3VyTGVmdCArIHN3aXBlTGVuZ3RoICogcG9zaXRpb25PZmZzZXQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXy5vcHRpb25zLmZhZGUgPT09IHRydWUgfHwgXy5vcHRpb25zLnRvdWNoTW92ZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLmFuaW1hdGluZyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgXy5zd2lwZUxlZnQgPSBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgXy5zZXRDU1MoXy5zd2lwZUxlZnQpO1xuXG4gICAgfTtcblxuICAgIFNsaWNrLnByb3RvdHlwZS5zd2lwZVN0YXJ0ID0gZnVuY3Rpb24oZXZlbnQpIHtcblxuICAgICAgICB2YXIgXyA9IHRoaXMsXG4gICAgICAgICAgICB0b3VjaGVzO1xuXG4gICAgICAgIF8uaW50ZXJydXB0ZWQgPSB0cnVlO1xuXG4gICAgICAgIGlmIChfLnRvdWNoT2JqZWN0LmZpbmdlckNvdW50ICE9PSAxIHx8IF8uc2xpZGVDb3VudCA8PSBfLm9wdGlvbnMuc2xpZGVzVG9TaG93KSB7XG4gICAgICAgICAgICBfLnRvdWNoT2JqZWN0ID0ge307XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZXZlbnQub3JpZ2luYWxFdmVudCAhPT0gdW5kZWZpbmVkICYmIGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0b3VjaGVzID0gZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzWzBdO1xuICAgICAgICB9XG5cbiAgICAgICAgXy50b3VjaE9iamVjdC5zdGFydFggPSBfLnRvdWNoT2JqZWN0LmN1clggPSB0b3VjaGVzICE9PSB1bmRlZmluZWQgPyB0b3VjaGVzLnBhZ2VYIDogZXZlbnQuY2xpZW50WDtcbiAgICAgICAgXy50b3VjaE9iamVjdC5zdGFydFkgPSBfLnRvdWNoT2JqZWN0LmN1clkgPSB0b3VjaGVzICE9PSB1bmRlZmluZWQgPyB0b3VjaGVzLnBhZ2VZIDogZXZlbnQuY2xpZW50WTtcblxuICAgICAgICBfLmRyYWdnaW5nID0gdHJ1ZTtcblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUudW5maWx0ZXJTbGlkZXMgPSBTbGljay5wcm90b3R5cGUuc2xpY2tVbmZpbHRlciA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBpZiAoXy4kc2xpZGVzQ2FjaGUgIT09IG51bGwpIHtcblxuICAgICAgICAgICAgXy51bmxvYWQoKTtcblxuICAgICAgICAgICAgXy4kc2xpZGVUcmFjay5jaGlsZHJlbih0aGlzLm9wdGlvbnMuc2xpZGUpLmRldGFjaCgpO1xuXG4gICAgICAgICAgICBfLiRzbGlkZXNDYWNoZS5hcHBlbmRUbyhfLiRzbGlkZVRyYWNrKTtcblxuICAgICAgICAgICAgXy5yZWluaXQoKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnVubG9hZCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICAkKCcuc2xpY2stY2xvbmVkJywgXy4kc2xpZGVyKS5yZW1vdmUoKTtcblxuICAgICAgICBpZiAoXy4kZG90cykge1xuICAgICAgICAgICAgXy4kZG90cy5yZW1vdmUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLiRwcmV2QXJyb3cgJiYgXy5odG1sRXhwci50ZXN0KF8ub3B0aW9ucy5wcmV2QXJyb3cpKSB7XG4gICAgICAgICAgICBfLiRwcmV2QXJyb3cucmVtb3ZlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXy4kbmV4dEFycm93ICYmIF8uaHRtbEV4cHIudGVzdChfLm9wdGlvbnMubmV4dEFycm93KSkge1xuICAgICAgICAgICAgXy4kbmV4dEFycm93LnJlbW92ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgXy4kc2xpZGVzXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3NsaWNrLXNsaWRlIHNsaWNrLWFjdGl2ZSBzbGljay12aXNpYmxlIHNsaWNrLWN1cnJlbnQnKVxuICAgICAgICAgICAgLmF0dHIoJ2FyaWEtaGlkZGVuJywgJ3RydWUnKVxuICAgICAgICAgICAgLmNzcygnd2lkdGgnLCAnJyk7XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnVuc2xpY2sgPSBmdW5jdGlvbihmcm9tQnJlYWtwb2ludCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcbiAgICAgICAgXy4kc2xpZGVyLnRyaWdnZXIoJ3Vuc2xpY2snLCBbXywgZnJvbUJyZWFrcG9pbnRdKTtcbiAgICAgICAgXy5kZXN0cm95KCk7XG5cbiAgICB9O1xuXG4gICAgU2xpY2sucHJvdG90eXBlLnVwZGF0ZUFycm93cyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcyxcbiAgICAgICAgICAgIGNlbnRlck9mZnNldDtcblxuICAgICAgICBjZW50ZXJPZmZzZXQgPSBNYXRoLmZsb29yKF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgLyAyKTtcblxuICAgICAgICBpZiAoIF8ub3B0aW9ucy5hcnJvd3MgPT09IHRydWUgJiZcbiAgICAgICAgICAgIF8uc2xpZGVDb3VudCA+IF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgJiZcbiAgICAgICAgICAgICFfLm9wdGlvbnMuaW5maW5pdGUgKSB7XG5cbiAgICAgICAgICAgIF8uJHByZXZBcnJvdy5yZW1vdmVDbGFzcygnc2xpY2stZGlzYWJsZWQnKS5hdHRyKCdhcmlhLWRpc2FibGVkJywgJ2ZhbHNlJyk7XG4gICAgICAgICAgICBfLiRuZXh0QXJyb3cucmVtb3ZlQ2xhc3MoJ3NsaWNrLWRpc2FibGVkJykuYXR0cignYXJpYS1kaXNhYmxlZCcsICdmYWxzZScpO1xuXG4gICAgICAgICAgICBpZiAoXy5jdXJyZW50U2xpZGUgPT09IDApIHtcblxuICAgICAgICAgICAgICAgIF8uJHByZXZBcnJvdy5hZGRDbGFzcygnc2xpY2stZGlzYWJsZWQnKS5hdHRyKCdhcmlhLWRpc2FibGVkJywgJ3RydWUnKTtcbiAgICAgICAgICAgICAgICBfLiRuZXh0QXJyb3cucmVtb3ZlQ2xhc3MoJ3NsaWNrLWRpc2FibGVkJykuYXR0cignYXJpYS1kaXNhYmxlZCcsICdmYWxzZScpO1xuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKF8uY3VycmVudFNsaWRlID49IF8uc2xpZGVDb3VudCAtIF8ub3B0aW9ucy5zbGlkZXNUb1Nob3cgJiYgXy5vcHRpb25zLmNlbnRlck1vZGUgPT09IGZhbHNlKSB7XG5cbiAgICAgICAgICAgICAgICBfLiRuZXh0QXJyb3cuYWRkQ2xhc3MoJ3NsaWNrLWRpc2FibGVkJykuYXR0cignYXJpYS1kaXNhYmxlZCcsICd0cnVlJyk7XG4gICAgICAgICAgICAgICAgXy4kcHJldkFycm93LnJlbW92ZUNsYXNzKCdzbGljay1kaXNhYmxlZCcpLmF0dHIoJ2FyaWEtZGlzYWJsZWQnLCAnZmFsc2UnKTtcblxuICAgICAgICAgICAgfSBlbHNlIGlmIChfLmN1cnJlbnRTbGlkZSA+PSBfLnNsaWRlQ291bnQgLSAxICYmIF8ub3B0aW9ucy5jZW50ZXJNb2RlID09PSB0cnVlKSB7XG5cbiAgICAgICAgICAgICAgICBfLiRuZXh0QXJyb3cuYWRkQ2xhc3MoJ3NsaWNrLWRpc2FibGVkJykuYXR0cignYXJpYS1kaXNhYmxlZCcsICd0cnVlJyk7XG4gICAgICAgICAgICAgICAgXy4kcHJldkFycm93LnJlbW92ZUNsYXNzKCdzbGljay1kaXNhYmxlZCcpLmF0dHIoJ2FyaWEtZGlzYWJsZWQnLCAnZmFsc2UnKTtcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUudXBkYXRlRG90cyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBpZiAoXy4kZG90cyAhPT0gbnVsbCkge1xuXG4gICAgICAgICAgICBfLiRkb3RzXG4gICAgICAgICAgICAgICAgLmZpbmQoJ2xpJylcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdzbGljay1hY3RpdmUnKVxuICAgICAgICAgICAgICAgICAgICAuZW5kKCk7XG5cbiAgICAgICAgICAgIF8uJGRvdHNcbiAgICAgICAgICAgICAgICAuZmluZCgnbGknKVxuICAgICAgICAgICAgICAgIC5lcShNYXRoLmZsb29yKF8uY3VycmVudFNsaWRlIC8gXy5vcHRpb25zLnNsaWRlc1RvU2Nyb2xsKSlcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3NsaWNrLWFjdGl2ZScpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBTbGljay5wcm90b3R5cGUudmlzaWJpbGl0eSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHZhciBfID0gdGhpcztcblxuICAgICAgICBpZiAoIF8ub3B0aW9ucy5hdXRvcGxheSApIHtcblxuICAgICAgICAgICAgaWYgKCBkb2N1bWVudFtfLmhpZGRlbl0gKSB7XG5cbiAgICAgICAgICAgICAgICBfLmludGVycnVwdGVkID0gdHJ1ZTtcblxuICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgIF8uaW50ZXJydXB0ZWQgPSBmYWxzZTtcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICAkLmZuLnNsaWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBfID0gdGhpcyxcbiAgICAgICAgICAgIG9wdCA9IGFyZ3VtZW50c1swXSxcbiAgICAgICAgICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLFxuICAgICAgICAgICAgbCA9IF8ubGVuZ3RoLFxuICAgICAgICAgICAgaSxcbiAgICAgICAgICAgIHJldDtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHQgPT0gJ29iamVjdCcgfHwgdHlwZW9mIG9wdCA9PSAndW5kZWZpbmVkJylcbiAgICAgICAgICAgICAgICBfW2ldLnNsaWNrID0gbmV3IFNsaWNrKF9baV0sIG9wdCk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgcmV0ID0gX1tpXS5zbGlja1tvcHRdLmFwcGx5KF9baV0uc2xpY2ssIGFyZ3MpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXQgIT0gJ3VuZGVmaW5lZCcpIHJldHVybiByZXQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIF87XG4gICAgfTtcblxufSkpO1xuIiwiKGZ1bmN0aW9uKCQpIHtcbiAgdmFyIHNsaWRlcnMgPSB7XG5cbiAgICBoZXJvOiBmdW5jdGlvbihzbGlkZXIpIHtcbiAgICAgIHNsaWRlci5zbGljayh7XG4gICAgICAgIGluZmluaXRlOiB0cnVlLFxuICAgICAgICBhdXRvcGxheTogdHJ1ZSxcbiAgICAgICAgYXV0b3BsYXlTcGVlZDogODAwMCxcbiAgICAgICAgYXJyb3dzOiB0cnVlLFxuICAgICAgICBkb3RzOiB0cnVlLFxuICAgICAgICBmYWRlOiBmYWxzZVxuICAgICAgfSk7XG4gICAgfSxcblxuICAgIGltYWdlczogZnVuY3Rpb24oc2xpZGVyKSB7XG4gICAgICBzbGlkZXIuc2xpY2soe1xuICAgICAgICBpbmZpbml0ZTogdHJ1ZSxcbiAgICAgICAgc2xpZGVzVG9TaG93OiAzLFxuICAgICAgICBzbGlkZXNUb1Njcm9sbDogMyxcbiAgICAgICAgYXJyb3dzOiBmYWxzZSxcbiAgICAgICAgZG90czogdHJ1ZSxcbiAgICAgICAgcmVzcG9uc2l2ZTogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGJyZWFrcG9pbnQ6IDEwMjQsXG4gICAgICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgICAgICBzbGlkZXNUb1Nob3c6IDMsXG4gICAgICAgICAgICAgIHNsaWRlc1RvU2Nyb2xsOiAzXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSx7XG4gICAgICAgICAgICBicmVha3BvaW50OiA2NDAsXG4gICAgICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgICAgICBzbGlkZXNUb1Nob3c6IDEsXG4gICAgICAgICAgICAgIHNsaWRlc1RvU2Nyb2xsOiAxXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgcHJvZHVjdHM6IGZ1bmN0aW9uKHNsaWRlcikge1xuICAgICAgc2xpZGVyLnNsaWNrKHtcbiAgICAgICAgaW5maW5pdGU6IHRydWUsXG4gICAgICAgIHNsaWRlc1RvU2hvdzogNCxcbiAgICAgICAgc2xpZGVzVG9TY3JvbGw6IDQsXG4gICAgICAgIGFycm93czogZmFsc2UsXG4gICAgICAgIGRvdHM6IHRydWUsXG4gICAgICAgIHJlc3BvbnNpdmU6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBicmVha3BvaW50OiAxMDI0LFxuICAgICAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgc2xpZGVzVG9TaG93OiAzLFxuICAgICAgICAgICAgICBzbGlkZXNUb1Njcm9sbDogM1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0se1xuICAgICAgICAgICAgYnJlYWtwb2ludDogNjQwLFxuICAgICAgICAgICAgc2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgc2xpZGVzVG9TaG93OiAxLFxuICAgICAgICAgICAgICBzbGlkZXNUb1Njcm9sbDogMVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfSk7XG4gICAgfSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uKCkgeyBcbiAgICAgIHNsaWRlcnMuaGVybygkKCcuaGVyby5jYXJvdXNlbCcpKTtcbiAgICAgIHNsaWRlcnMuaW1hZ2VzKCQoJy5pbWFnZXMuY2Fyb3VzZWwnKSk7XG4gICAgICBzbGlkZXJzLnByb2R1Y3RzKCQoJy5wcm9kdWN0cy5jYXJvdXNlbCcpKTtcbiAgICB9XG4gIH07XG5cbiAgJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKSB7XG4gICAgc2xpZGVycy5pbml0KCk7XG4gIH0pO1xufSkoalF1ZXJ5KTsiLCIvLyBVc2UgdGhlIGJlbG93IHN0cnVjdHVyZSB0byBzdGFydCBvdXQgeW91ciBjdXN0b20galF1ZXJ5IGZ1bmN0aW9uc1xuXG4vLyAoZnVuY3Rpb24oJCl7XG4vLyAgICAgdmFyIF9fcGxhY2Vob2xkZXJfXyA9IHtcbi8vICAgICAgICAgaW5pdCA6IGZ1bmN0aW9uKCl7XG4vLyAgICAgICAgICAgICBjb25zb2xlLmxvZygnaGVsbG8gd29ybGQnKTtcbi8vICAgICAgICAgfVxuLy8gICAgIH07XG4vL1xuLy8gICAgICQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCkge1xuLy8gICAgICAgICBfX3BsYWNlaG9sZGVyX18uaW5pdCgpO1xuLy8gICAgIH0pO1xuLy8gfSkoalF1ZXJ5KTsiLCIoZnVuY3Rpb24oJCl7XG4gICAgdmFyIF9fcGxhY2Vob2xkZXJfXyA9IHtcbiAgICAgICAgaW5pdCA6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnaGVsbG8gd29ybGQnKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAkKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcbiAgICAgICAgX19wbGFjZWhvbGRlcl9fLmluaXQoKTtcbiAgICB9KTtcbn0pKGpRdWVyeSk7IiwiKGZ1bmN0aW9uKCQpe1xuICB2YXIgZml4ZWQgPSB7XG4gICAgaGVhZGVyIDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY29udGFpbmVyID0gJCgnLm1heC1jb250YWluZXInKSxcbiAgICAgICAgICBoZWFkZXIgPSAkKCdoZWFkZXIuaGVhZGVyLWJvdHRvbScpLFxuICAgICAgICAgIG9mZnNldCA9IGhlYWRlci5vZmZzZXQoKS50b3AsXG4gICAgICAgICAgZml4ZWQgPSAnaGVhZGVyLWZpeGVkJztcblxuICAgICAgJCh3aW5kb3cpLnNjcm9sbChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHNjcm9sbCA9ICQod2luZG93KS5zY3JvbGxUb3AoKTtcbiAgICAgIFxuICAgICAgICBpZiAoc2Nyb2xsID49IG9mZnNldCkge1xuICAgICAgICAgIGhlYWRlci5hZGRDbGFzcyhmaXhlZCk7XG4gICAgICAgICAgY29udGFpbmVyLmFkZENsYXNzKGZpeGVkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBoZWFkZXIucmVtb3ZlQ2xhc3MoZml4ZWQpO1xuICAgICAgICAgIGNvbnRhaW5lci5yZW1vdmVDbGFzcyhmaXhlZCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBzaWRlYmFyIDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc2lkZWJhciA9ICQoJy5zaWRlYmFyJyksXG4gICAgICAgICAgb2Zmc2V0ID0gc2lkZWJhci5vZmZzZXQoKS50b3AsXG4gICAgICAgICAgZml4ZWQgPSAnc2lkZWJhci1maXhlZCc7XG4gICAgICBcbiAgICAgICQod2luZG93KS5zY3JvbGwoZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzY3JvbGwgPSAkKHdpbmRvdykuc2Nyb2xsVG9wKCk7XG5cbiAgICAgICAgaWYoc2Nyb2xsID49IG9mZnNldCkge1xuICAgICAgICAgIHNpZGViYXIuYWRkQ2xhc3MoZml4ZWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNpZGViYXIucmVtb3ZlQ2xhc3MoZml4ZWQpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgaW5pdCA6IGZ1bmN0aW9uKCl7XG4gICAgICBmaXhlZC5oZWFkZXIoKTtcbiAgICAgIC8vIGZpeGVkLnNpZGViYXIoKTtcbiAgICB9XG4gIH07XG5cbiAgJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKSB7XG4gICAgZml4ZWQuaW5pdCgpO1xuICB9KTtcbn0pKGpRdWVyeSk7IiwialF1ZXJ5KGRvY3VtZW50KS5mb3VuZGF0aW9uKCk7XG4iLCIoZnVuY3Rpb24oJCl7XG4gIHZhciBtZW51ID0ge1xuICAgIG1vYmlsZSA6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGhlYWRlck1lbnUgPSAkKCcuaGVhZGVyLW1lbnUnKSxcbiAgICAgICAgICB0b2dnbGUgPSAkKCcjbW9iaWxlLW1lbnUtdG9nZ2xlJyksXG4gICAgICAgICAgaWNvbnMgPSAkKCcjbW9iaWxlLW1lbnUtdG9nZ2xlIHN2ZycpLFxuICAgICAgICAgIG9wZW4gPSAnaXMtb3Blbic7XG5cbiAgICAgIHRvZ2dsZS5jbGljayhmdW5jdGlvbigpIHtcbiAgICAgICAgaWNvbnMudG9nZ2xlKCk7XG4gICAgICAgIGhlYWRlck1lbnUudG9nZ2xlQ2xhc3Mob3Blbik7XG4gICAgICAgIG1lbnUubW9kYWwoKTtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBtb2RhbCA6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGJvZHkgPSAkKCdib2R5JyksXG4gICAgICAgICAgbW9kYWwgPSAkKCcubW9kYWwtYmcnKSxcbiAgICAgICAgICBvcGVuID0gJ21vZGFsLW9wZW4nO1xuXG4gICAgICBtb2RhbC5mYWRlVG9nZ2xlKDI1MCk7XG4gICAgICBib2R5LnRvZ2dsZUNsYXNzKG9wZW4pO1xuICAgIH0sXG5cbiAgICBpbml0IDogZnVuY3Rpb24oKXtcbiAgICAgIG1lbnUubW9iaWxlKCk7XG4gICAgfVxuICB9O1xuXG4gICQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCkge1xuICAgIG1lbnUuaW5pdCgpO1xuICB9KTtcbn0pKGpRdWVyeSk7IiwiJCgnYVtocmVmKj1cIiNcIl0nKS5ub3QoJ1tocmVmPVwiI1wiXScpLm5vdCgnW2hyZWY9XCIjMFwiXScpLmNsaWNrKGZ1bmN0aW9uIChldmVudCkge1xuICBpZiAoXG4gICAgbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sICcnKSA9PSB0aGlzLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCAnJykgJiZcbiAgICBsb2NhdGlvbi5ob3N0bmFtZSA9PSB0aGlzLmhvc3RuYW1lXG4gICkge1xuICAgIHZhciB0YXJnZXQgPSAkKHRoaXMuaGFzaCk7XG4gICAgdGFyZ2V0ID0gdGFyZ2V0Lmxlbmd0aCA/IHRhcmdldCA6ICQoJ1tuYW1lPScgKyB0aGlzLmhhc2guc2xpY2UoMSkgKyAnXScpO1xuICAgIGlmICh0YXJnZXQubGVuZ3RoKSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgJCgnaHRtbCwgYm9keScpLmFuaW1hdGUoe1xuICAgICAgICBzY3JvbGxUb3A6IHRhcmdldC5vZmZzZXQoKS50b3BcbiAgICAgIH0sIDUwMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgJHRhcmdldCA9ICQodGFyZ2V0KTtcbiAgICAgICAgJHRhcmdldC5mb2N1cygpO1xuICAgICAgICBpZiAoJHRhcmdldC5pcyhcIjpmb2N1c1wiKSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkdGFyZ2V0LmF0dHIoJ3RhYmluZGV4JywgJy0xJyk7XG4gICAgICAgICAgJHRhcmdldC5mb2N1cygpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn0pOyJdfQ==
>>>>>>> develop
