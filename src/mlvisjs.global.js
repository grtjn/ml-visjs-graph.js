
/* globals mlvisjsTpls, require */
/* jshint unused:false */

var vis = vis || require('vis');

var mlvisjs = (function () {

  'use strict';

  // globals
  var allEvents = [
    'afterDrawing',
    'animationFinished',
    'beforeDrawing',
    'blurEdge',
    'blurNode',
    'click',
    'configChange',
    'deselectEdge',
    'deselectNode',
    'doubleClick',
    'dragEnd',
    'dragging',
    'dragStart',
    'hidePopup',
    'hold',
    'hoverEdge',
    'hoverNode',
    'initRedraw',
    'oncontext',
    'release',
    'resize',
    'select',
    'selectEdge',
    'selectNode',
    'showPopup',
    'stabilizationIterationsDone',
    'stabilizationProgress',
    'stabilized',
    'startStabilizing',
    'zoom'
  ];

  var allTimelineEvents = [
    'currentTimeTick',
    'click',
    'contextmenu',
    'doubleClick',
    'drop',
    'mouseOver',
    'mouseDown',
    'mouseUp',
    'mouseMove',
    'groupDragged',
    'changed',
    'rangechange',
    'rangechanged',
    'select',
    'itemover',
    'itemout',
    'timechange',
    'timechanged'
  ];

  // static defaults
  var initialPhysics = true;
  var initialSolver = 'forceAtlas2Based';
  var initialLayout = 'standard';

  var initialOptions = {
    layout: {
      hierarchical: false,
      randomSeed: 2
    },
    manipulation: {
      enabled: false// ,
//       addNode: false,
//       addEdge: false,
//       editEdge: false
    },
    interaction: {
      navigationButtons: true
    },
    height: '500px',
    nodes: {
      size: 30,
      borderWidth: 2,
      shadow: true,
      borderWidthSelected: 6,
      color: {
        background: 'white'
      },
      font: {
        size: 12
      },
    },
    physics: {
      enabled: initialPhysics,
      solver: initialSolver,
      // built-in default
      // forceAtlas2Based: {
      //   gravitationalConstant: -50,
      //   centralGravity: 0.01,
      //   springLength: 100,
      //   springConstant: 0.08,
      //   damping: 0.4,
      //   avoidOverlap: 0
      // },
      // GJo tweaks
      forceAtlas2Based: {
        gravitationalConstant: -200,
        centralGravity: 0.01,
        springLength: 100,
        springConstant: 0.08,
        damping: 0.4,
        avoidOverlap: 0
      },
      maxVelocity: 150, // default 50
      minVelocity: 6, // default 0.1
      stabilization: {
        enabled: true,
        iterations: 1000,
        updateInterval: 100,
        onlyDynamicEdges: false,
        fit: false
      },
      timestep: 0.5,
      adaptiveTimestep: true
    },
    edges: {
      width: 2,
      shadow: true,
      arrows: {
        to: {
          enabled: true,
          scaleFactor: 0.75
        }
      },
      font: {
        size: 10,
        align: 'top'
      },
      smooth: {
        type: 'curvedCW',
        roundness: 0.1
      }
    }
  };

  var initialTimelineOptions = {};

  var initialOrbColors = {
    // light colors for the odd positions
    NW: '#848484', // light grey
    NE: '#428484', // light blue(ish)
    SW: '#844284', // purple
    SE: '#848442', // mustard

    // dark colors for the straight positions
    N:  '#424284', // dark blue(ish)
    E:  '#428442', // green
    S:  '#844242', // brown
    W:  '#424242'  // dark grey
  };

  // applied Module and Prototype pattern as described in
  // https://scotch.io/bar-talk/4-javascript-design-patterns-you-should-know

  var NetworkManager = function(container) {
    var self = this;

    // assert visjs is loaded and available
    if (!vis || !vis.DataSet || !vis.Network) {
      throw 'Error: vis.DataSet and vis.Network not found, required by mlvisjs';
    }

    // store arguments as is
    self.container = container;

    // dynamic defaults
    var nodes = new vis.DataSet();
    var edges = new vis.DataSet();

    var initialData = {
      nodes: nodes,
      edges: edges
    };

    self.nodes = nodes;
    self.edges = edges;
    self.options = clone(initialOptions);
    self.orbColors = clone(initialOrbColors);
    self.physics = initialPhysics;
    self.solver = initialSolver;

    // initialize visjs Network
    self.network = new vis.Network(self.container, initialData, clone(self.options));

    // apply defaults
    self.setEvents();
    self.setLayout();
    self.setPhysics();
    self.setSolver();
  };

  NetworkManager.prototype = (function() {
    var setData = function(nodes, nodeOptions, edges, edgeOptions) {
      var self = this;
      var existingIds, newIds, missingIds;

      if (arguments.length > 0) {
        if (self.nodes && nodes) {
          // flush what has disappeared
          existingIds = self.nodes.getIds();
          newIds = nodes.map(function(node) {
            return node.id;
          });
          missingIds = existingIds.filter(function(id) {
            return !newIds.includes(id);
          });
          self.nodes.remove(missingIds);

          // add new, and update existing
          self.nodes.update(nodes);
          if (nodeOptions) {
            self.nodes.setOptions(clone(nodeOptions));
          }
        } else if (nodes) {
          throw 'Error: nodes DataSet not initialized';
        }

        if (self.edges && edges) {
          // flush what has disappeared
          existingIds = self.edges.getIds();
          newIds = edges.map(function(edge) {
            return edge.id;
          });
          missingIds = existingIds.filter(function(id) {
            return !newIds.includes(id);
          });
          self.edges.remove(missingIds);

          // add new, and update existing
          self.edges.update(edges);
          if (edgeOptions) {
            self.edges.setOptions(clone(edgeOptions));
          }
        } else if (edges) {
          throw 'Error: edges DataSet not initialized';
        }
      } else {
        nodes = new vis.DataSet();
        edges = new vis.DataSet();

        var initialData = {
          nodes: nodes,
          edges: edges
        };

        self.nodes = nodes;
        self.edges = edges;

        if (nodeOptions) {
          self.nodes.setOptions(clone(nodeOptions));
        }
        if (edgeOptions) {
          self.edges.setOptions(clone(edgeOptions));
        }

        if (self.network) {
          self.network.setData(initialData);
          self.network.fit();
        }
      }
    };

    var setEvents = function(events) {
      var self = this;
      var doubleclick;

      if (self.network) {
        if (arguments.length === 0) {
          allEvents.forEach(function(event) {
            self.network.off(event);
          });
        }

        events = events || {};

        // provide default for stabilized
        events.stabilized = events.stabilized || function() {
          //self.network.fit();
        };

        // afterDrawing is used to paint orbs and coronas
        events.afterDrawing = events.afterDrawing || function() {};

        forEach(events, function(callback, event) {
          if (isFunction(callback)) {

            // decorate provided event callbacks with built-in extras
            switch (String(event)) {
              case 'click':
                self.network.on(event, function(arg) {
                  doubleclick = false;
                  window.setTimeout(function() {
                    if (! doubleclick) {
                      callback.call(self, arg);
                    }
                  }, 300);
                });
                break;

              case 'doubleClick':
                self.network.on(event, function(arg) {
                  doubleclick = true;
                  callback.call(self, arg);
                });
                break;

              case 'afterDrawing':
                self.network.on(event, function(arg) {
                  var ctx = arg;
                  var nodePositions = self.network.getPositions();
                  self.nodes.forEach(function(node) {
                    var nodePosition = nodePositions[node.id];

                    if (nodePosition) {
                      node.orbs = node.orbs || {};

                      // Backwards compatibility
                      var edgeCount = node.edgeCount || node.linkCount;
                      if (edgeCount && (edgeCount > 0) && !node.orbs.NW) {
                        node.orbs.NW = {
                          label: ''+edgeCount
                        };
                      }

                      forEach(node.orbs, function(orb, key) {
                        var x = nodePosition.x;
                        var y = nodePosition.y;

                        if (key.match(/W/)) {
                          x = x - (key.match(/[NS]/) ? 22 : 30);
                        } else if (key.match(/E/)) {
                          x = x + (key.match(/[NS]/) ? 22 : 30);
                        }
                        if (key.match(/N/)) {
                          y = y - (key.match(/[WE]/) ? 22 : 30);
                        } else if (key.match(/S/)) {
                          y = y + (key.match(/[WE]/) ? 22 : 30);
                        }

                        var label = orb.label;
                        var font = orb.font || '10px Ludica';
                        var measure = (label && getMeasureOfText(label, font)) ||
                          {
                            width: orb.width || 10,
                            height: orb.height || 10
                          };
                        var radius = Math.round(
                          (orb.width ||
                            Math.max(measure.width, measure.height) ||
                              10
                          ) / 2
                        ) + 2;

                        var lineStyle = orb.lineStyle || 'white';
                        var background = orb.background || self.orbColors[key];
                        var lineWidth = orb.lineWidth || 1;
                        var textColor = orb.textColor || 'white';

                        // Circle
                        ctx.strokeStyle = lineStyle;
                        ctx.fillStyle = background;
                        ctx.lineWidth = lineWidth;
                        ctx.circle(x, y, Math.max(radius, 10));
                        ctx.fill();
                        ctx.stroke();

                        // Text info
                        if (label) {
                          ctx.font = font;
                          ctx.fillStyle = textColor;
                          ctx.fillText(
                            label,
                            x,
                            y - (measure.height / 3)
                          );
                        } else if (orb.image) {
                          var img = new Image();
                          img.src = orb.image;
                          ctx.drawImage(
                            img,
                            x - (measure.width / 2),
                            y - (measure.height / 2),
                            measure.width,
                            measure.height
                          );
                        }
                      });
                    }
                  });
                  callback.call(self, arg);
                });
                break; // case 'afterDrawing'

              case 'onload':
                callback(self);
                break;

              default:
                self.network.on(event, callback);
            } // switch

          }
        }); // forEach(events)
      }
    }; // setEvents

    var setOptions = function(networkOptions) {
      var self = this;

      if (networkOptions !== undefined) {
        self.options = self.options || clone(initialOptions);

        // merge options (crude method)
        Object.keys(networkOptions).forEach(function(key) {
          var option = networkOptions[key];

          if ((typeof option === 'object') && (option !== null) && !Array.isArray(option) ) {
            self.options[key] = self.options[key] || {};

            Object.keys(option).forEach(function(subkey) {
              var suboption = option[subkey];
              self.options[key][subkey] = clone(suboption);
            });

          } else {
            self.options[key] = option;
          }
        });
      } else {
        self.options = clone(initialOptions);
      }

      if (self.network) {
        self.network.setOptions(clone(self.options));
      }
    };

    var setOrbColors = function(colors) {
      var self = this;
      if (colors !== undefined) {
        forEach(colors, function(color, key) {
          self.orbColors[key] = color;
        });
      } else {
        self.orbColors = clone(initialOrbColors);
      }
      if (self.network) {
        self.network.redraw();
      }
    };

    var setPhysics = function(physics) {
      var self = this;

      if (physics !== undefined) {
        self.physics = physics;
      } else {
        self.physics = initialPhysics;
      }

      if (self.network) {
        // keep a shadow
        self.options.physics = self.options.physics || {};
        self.options.physics.enabled = self.physics;
        // only set diff
        self.network.setOptions({
          physics: {
            enabled: self.physics
          }
        });
        if (self.physics) {
          self.network.stabilize();
        }
      }
    };

    var setSolver = function(solver) {
      var self = this;

      if (solver !== undefined) {
        self.solver = solver;
      } else {
        self.solver = initialSolver;
      }

      // keep shadow
      self.options.physics = self.options.physics || {};
      self.options.physics.solver = self.solver;

      self.options.layout = self.options.layout || {};
      self.options.layout.hierarchical = self.options.layout.hierarchical || {};
      self.options.layout.hierarchical.enabled = (self.solver === 'hierarchicalRepulsion');

      if (self.network) {
        // only set diff
        self.network.setOptions({
          physics: {
            solver: self.solver
          },
          layout: {
            hierarchical: {
              enabled: (self.solver === 'hierarchicalRepulsion')
            }
          }
        });
        self.network.stabilize();
      }
    };

    var setLayout = function(layout) {
      var self = this;

      if (layout !== undefined) {
        self.layout = layout;
      } else {
        self.layout = initialLayout;
      }

      // keep shadow
      self.options.layout = self.options.layout || {};
      self.options.layout.hierarchical = self.options.layout.hierarchical || {};
      if (self.layout === 'standard') {
        self.options.layout.hierarchical.enabled = false;
      }
      else if (self.layout === 'hierarchyTop') {
        self.solver = 'hierarchicalRepulsion';
        self.options.layout.hierarchical = {
          enabled: true,
          direction: 'UD',
          sortMethod: 'directed'
        };
        if (self.options.edges && self.options.edges.smooth && self.options.edges.smooth.type === 'vertical') {
          self.options.edges.smooth.type = 'horizontal';
        }
      }
      else if (self.layout === 'hierarchyBottom') {
        self.solver = 'hierarchicalRepulsion';
        self.options.layout.hierarchical = {
          enabled: true,
          direction: 'DU',
          sortMethod: 'directed'
        };
        if (self.options.edges && self.options.edges.smooth && self.options.edges.smooth.type === 'vertical') {
          self.options.edges.smooth.type = 'horizontal';
        }
      }
      else if (self.layout === 'hierarchyLeft') {
        self.solver = 'hierarchicalRepulsion';
        self.options.layout.hierarchical = {
          enabled: true,
          direction: 'LR',
          sortMethod: 'directed'
        };
        if (self.options.edges && self.options.edges.smooth && self.options.edges.smooth.type === 'horizontal') {
          self.options.edges.smooth.type = 'vertical';
        }
      }
      else if (self.layout === 'hierarchyRight') {
        self.solver = 'hierarchicalRepulsion';
        self.options.layout.hierarchical = {
          enabled: true,
          direction: 'RL',
          sortMethod: 'directed'
        };
        if (self.options.edges && self.options.edges.smooth && self.options.edges.smooth.type === 'horizontal') {
          self.options.edges.smooth.type = 'vertical';
        }
      }

      self.options.physics = self.options.physics || {};
      self.options.physics.solver = self.solver;

      if (self.network) {
        // only set diff
        self.network.setOptions({
          physics: {
            solver: self.solver
          },
          layout: {
            hierarchical: clone(self.options.layout.hierarchical)
          },
          edges: {
            smooth: clone(self.options.edges.smooth)
          }
        });
        self.network.stabilize();
      }
    };

    return {
      setData: setData,
      setEvents: setEvents,
      setOptions: setOptions,
      setOrbColors: setOrbColors,
      setPhysics: setPhysics,
      setSolver: setSolver,
      setLayout: setLayout
    };
  })();

  var GraphManager = function(container, templateUri, templateCache, done, fail) {
    var self = this;
    self.container = container;
    self.templateUri = templateUri || 'ml-visjs-graph.js/mlvisjs-graph.html';
    self.templateCache = templateCache;

    var initContainer = function(container, template) {
      // insert the template
      container.innerHTML = template;

      // hook up visjs network
      var network = container.getElementsByTagName('vis-network');
      if (network.length === 1) {
        self.network = new NetworkManager(network[0]);

        // hook up user interaction
        var physics = container.querySelectorAll('input[name="physicsEnabled"]');
        if (physics.length === 1) {
          physics[0].checked = self.network.physics;
          physics[0].onchange = function(event) {
            event.preventDefault();
            self.network.setPhysics(physics[0].checked);
          };
        } else if (physics.length > 1) {
          fail('Only one physicsEnabled input supported in the graph template');
        } else {
          fail('No physicsEnabled input found in the graph template');
        }

        var layout = container.querySelectorAll('select[name="layout"]');
        if (layout.length === 1) {
          layout[0].value = self.network.layout;
          layout[0].onchange = function(event) {
            event.preventDefault();
            self.network.setLayout(layout[0].value);
          };
        } else if (layout.length > 1) {
          fail('Only one layout selector supported in the graph template');
        } else {
          fail('No layout selector found in the graph template');
        }

        done(self);
      } else if (network.length > 1) {
        fail('Only one vis-network supported in the graph template');
      } else {
        fail('No vis-network found in the graph template');
      }
    };

    self.template = templateCache && templateCache.get(self.templateUri);

    if (!self.template) {
      if (self.templateUri === 'ml-visjs-graph.js/mlvisjs-graph.html') {
        self.template = mlvisjsTpls['ml-visjs-graph.js/mlvisjs-graph.html'];
        if (self.templateCache) {
          self.templateCache.put(self.templateUri, self.template);
        }
        initContainer(self.container, self.template);
      } else {
        httpGetAsync(self.templateUri, function(response) {
          self.template = response;
          if (self.templateCache) {
            self.templateCache.put(self.templateUri, self.template);
          }
          initContainer(self.container, self.template);
        }, function(failure) {
          fail(failure);
        });
      }
    } else {
      initContainer(self.container, self.template);
    }
  };

  GraphManager.prototype = (function() {
    var setPhysics = function(physics) {
      var self = this;

      var elem = self.container.querySelectorAll('input[name="physicsEnabled"]');
      if (elem.length === 1) {
        elem[0].checked = physics;

        if (self.network) {
          self.network.setPhysics(physics);
        }
      }
    };

    var setLayout = function(layout) {
      var self = this;

      var elem = self.container.querySelectorAll('select[name="layout"]');
      if (elem.length === 1) {
        elem[0].value = layout;

        if (self.network) {
          self.network.setLayout(layout);
        }
      }
    };

    var setStyling = function(styling) {
      var self = this;

      self.styling = styling;

      var root = self.container.firstElementChild;

      root.className = root.className.split(' ').filter(function(c) {
        return c.indexOf('-style') < 0;
      }).join(' ') + ' ' + styling + '-style';
    };

    return {
      setPhysics: setPhysics,
      setLayout: setLayout,
      setStyling: setStyling
    };
  })();

  var TimelineManager = function(container) {
    var self = this;

    // assert visjs is loaded and available
    if (!vis || !vis.DataSet || !vis.Timeline) {
      throw 'Error: vis.DataSet and vis.Timeline not found, required by mlvisjs';
    }

    // store arguments as is
    self.container = container;

    // dynamic defaults
    var items = new vis.DataSet();
    var groups = new vis.DataSet();

    self.items = items;
    self.groups = groups;
    self.options = clone(initialTimelineOptions);

    // initialize visjs Timeline
    self.timeline = new vis.Timeline(self.container, self.items, self.groups, clone(self.options));

    // apply defaults
    self.setEvents();
    self.setLayout();
    self.setPhysics();
    self.setSolver();
  };

  TimelineManager.prototype = (function() {
    var setData = function(items, itemOptions, groups, groupOptions) {
      var self = this;
      var existingIds, newIds, missingIds;

      if (arguments.length > 0) {
        if (self.items && items) {
          // flush what has disappeared
          existingIds = self.items.getIds();
          newIds = items.map(function(item) {
            return item.id;
          });
          missingIds = existingIds.filter(function(id) {
            return !newIds.includes(id);
          });
          self.items.remove(missingIds);

          // add new, and update existing
          self.items.update(items);
          if (itemOptions) {
            self.items.setOptions(clone(itemOptions));
          }
        } else if (items) {
          throw 'Error: items DataSet not initialized';
        }

        if (self.groups && groups) {
          // flush what has disappeared
          existingIds = self.groups.getIds();
          newIds = groups.map(function(group) {
            return group.id;
          });
          missingIds = existingIds.filter(function(id) {
            return !newIds.includes(id);
          });
          self.groups.remove(missingIds);

          // add new, and update existing
          self.groups.update(groups);
          if (groupOptions) {
            self.groups.setOptions(clone(groupOptions));
          }
        } else if (groups) {
          throw 'Error: groups DataSet not initialized';
        }
      } else {
        items = new vis.DataSet();
        groups = new vis.DataSet();

        var initialData = {
          items: items,
          groups: groups
        };

        self.items = items;
        self.groups = groups;

        if (itemOptions) {
          self.items.setOptions(clone(itemOptions));
        }
        if (groupOptions) {
          self.groups.setOptions(clone(groupOptions));
        }

        if (self.timeline) {
          self.timeline.setData(initialData);
          self.timeline.fit();
        }
      }
    };

    var setEvents = function(events) {
      var self = this;
      var doubleclick;

      if (self.timeline) {
        if (arguments.length === 0) {
          allTimelineEvents.forEach(function(event) {
            self.timeline.off(event);
          });
        }

        events = events || {};

        forEach(events, function(callback, event) {
          if (isFunction(callback)) {

            // decorate provided event callbacks with built-in extras
            switch (String(event)) {
              case 'click':
                self.timeline.on(event, function(arg) {
                  doubleclick = false;
                  window.setTimeout(function() {
                    if (! doubleclick) {
                      callback.call(self, arg);
                    }
                  }, 300);
                });
                break;

              case 'doubleClick':
                self.timeline.on(event, function(arg) {
                  doubleclick = true;
                  callback.call(self, arg);
                });
                break;

              case 'onload':
                callback(self);
                break;

              default:
                self.timeline.on(event, callback);
            } // switch

          }
        }); // forEach(events)
      }
    }; // setEvents

    var setOptions = function(timelineOptions) {
      var self = this;

      if (timelineOptions !== undefined) {
        self.options = self.options || clone(initialTimelineOptions);

        // merge options (crude method)
        Object.keys(timelineOptions).forEach(function(key) {
          var option = timelineOptions[key];

          if ((typeof option === 'object') && (option !== null) && !Array.isArray(option) ) {
            self.options[key] = self.options[key] || {};

            Object.keys(option).forEach(function(subkey) {
              var suboption = option[subkey];
              self.options[key][subkey] = clone(suboption);
            });

          } else {
            self.options[key] = option;
          }
        });
      } else {
        self.options = clone(initialTimelineOptions);
      }

      if (self.timeline) {
        self.timeline.setOptions(clone(self.options));
      }
    };

    return {
      setData: setData,
      setEvents: setEvents,
      setOptions: setOptions
    };
  })();

  return {
    Network: NetworkManager,
    Graph: GraphManager,
    Timeline: TimelineManager
  };

  /* HELPER FUNCTIONS */

  // derived from angular
  function forEach(obj, iterator, context) {
    var key;
    if (obj) {
      for (key in obj) {
        if (obj.hasOwnProperty(key)) {
          iterator.call(context, obj[key], key, obj);
        }
      }
    }
    return obj;
  }

  // https://stackoverflow.com/questions/2057682/determine-pixel-length-of-string-in-javascript-jquery
  function getMeasureOfText(txt, font) {
    if (getMeasureOfText.e === undefined) {
      getMeasureOfText.e = document.createElement('span');
      //getMeasureOfText.e.style.display = 'hidden';
    }
    getMeasureOfText.e.style.font = font;
    getMeasureOfText.e.innerText = txt;
    document.body.appendChild(getMeasureOfText.e);
    var measure = {
      width: getMeasureOfText.e.offsetWidth,
      height: getMeasureOfText.e.offsetHeight
    };
    document.body.removeChild(getMeasureOfText.e);
    return measure;
  }

  // https://stackoverflow.com/questions/247483/http-get-request-in-javascript
  function httpGetAsync(url, callback, fail) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open('GET', url, true); // true for asynchronous
    xmlHttp.onreadystatechange = function() {
      if (xmlHttp.readyState === 4) {
        if (xmlHttp.status >= 200 && xmlHttp.status < 400) {
          callback(xmlHttp.responseText);
        } else {
          fail(xmlHttp.responseText);
        }
      }
    };
    xmlHttp.send(null);
  }

  // copied from angular
  function isFunction(value) {
    return typeof value === 'function';
  }

  function clone(obj) {
    if (Array.isArray(obj)) {
      return obj.map(function(item) {
        return clone(item);
      });
    } else if ( (typeof obj === 'object') && (obj !== null) ) {
      return Object.keys(obj).reduce(
        function(res, e) {
          res[e] = clone(obj[e]);
          return res;
        },
        {}
      );
    } else {
      return obj;
    }
  }
})();
