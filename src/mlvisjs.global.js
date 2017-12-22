
/* globals vis, mlvisjsTpls */
/* jshint unused:false */

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

  // static defaults
  var initialPhysics = true;
  var initialSolver = 'forceAtlas2Based';

  var initialOptions = {
    layout: {
      hierarchical: false,
      randomSeed: 2
    },
    manipulation: {
      enabled: true// ,
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
      shape: 'circularImage',
      image: 'dist/images/generic.png',
      color: {
        background: 'white',
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
    self.options = initialOptions;
    self.orbColors = initialOrbColors;
    self.physics = initialPhysics;
    self.solver = initialSolver;

    // initialize visjs Network
    self.network = new vis.Network(container, initialData, initialOptions);

    // apply default events
    self.setEvents();
  };

  NetworkManager.prototype = (function() {
    var setData = function(nodes, nodeOptions, edges, edgeOptions) {
      var self = this;

      if (arguments.length > 0) {
        if (self.nodes && nodes) {
          self.nodes.update(nodes);
          if (nodeOptions) {
            self.nodes.setOptions(nodeOptions);
          }
        } else if (nodes) {
          throw 'Error: nodes DataSet not initialized';
        }

        if (self.edges && edges) {
          self.edges.update(edges);
          if (edgeOptions) {
            self.edges.setOptions(edgeOptions);
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
        // TODO: check if network exists?
        self.network.setData(initialData);
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
                self.network.on(event, function() {
                  doubleclick = false;
                  window.setTimeout(function() {
                    if (! doubleclick) {
                      callback.apply(self, arguments);
                    }
                  }, 300);
                });
                break;

              case 'doubleclick':
                self.network.on(event, function() {
                  doubleclick = true;
                  callback.apply(self, arguments);
                });
                break;

              case 'afterDrawing':
                self.network.on(event, function(ctx) {
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
                  callback.apply(self, arguments);
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

      if (self.network) {
        if (networkOptions) {
          self.network.setOptions(networkOptions);
        } else {
          self.network.setOptions(initialOptions);
        }
      }
    };

    var setOrbColors = function(colors) {
      var self = this;
      if (colors !== undefined) {
        forEach(colors, function(color, key) {
          self.orbColors[key] = color;
        });
      } else {
        self.orbColors = initialOrbColors;
      }
      // TODO: should nodes get repainted to get new orb colors applied?
    };

    var setPhysics = function(physics) {
      var self = this;
      if (physics !== undefined) {
        self.physics = physics;
      } else {
        self.physics = initialPhysics;
      }
      // TODO: check if network exists?
      self.network.setOptions({
        physics: {
          enabled: self.physics
        }
      });
      if (self.physics) {
        self.network.stabilize();
      }
    };

    var setSolver = function(solver) {
      var self = this;
      var options = {};

      if (solver !== undefined) {
        self.solver = solver;
      } else {
        self.solver = initialSolver;
      }

      options.physics = { solver: self.solver };

      if (self.solver !== 'hierarchicalRepulsion') {
        options.layout = { hierarchical: false };
      }

      self.network.setOptions(options);
      self.network.stabilize();
    };

    var setLayout = function(layout) {
      var self = this;
      var options = {
        edges: {
          smooth: {
            type: 'curvedCW',
            roundness: 0.1
          }
        }
      };

      if ((layout === undefined) || (layout === 'standard')) {
        options.layout = { hierarchical: false };
      }
      else if (layout === 'hierarchyTop') {
        self.solver = 'hierarchicalRepulsion';
        options.layout = {
          hierarchical: {
            direction: 'UD',
            sortMethod: 'directed'
          }
        };
      }
      else if (layout === 'hierarchyBottom') {
        self.solver = 'hierarchicalRepulsion';
        options.layout = {
          hierarchical: {
            direction: 'DU',
            sortMethod: 'directed'
          }
        };
      }
      else if (layout === 'hierarchyLeft') {
        self.solver = 'hierarchicalRepulsion';
        options.layout = {
          hierarchical: {
            direction: 'LR',
            sortMethod: 'directed'
          }
        };
      }
      else if (layout === 'hierarchyRight') {
        self.solver = 'hierarchicalRepulsion';
        options.layout = {
          hierarchical: {
            direction: 'RL',
            sortMethod: 'directed'
          }
        };
      }

      options.physics = { solver: self.solver };

      self.network.setOptions(options);
      self.network.stabilize();
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
          self.network.setPhysics(physics[0].checked);
          physics[0].onchange = function() {
            self.network.setPhysics(physics[0].checked);
          };
        } else if (physics.length > 1) {
          fail('Only one physicsEnabled input supported in the graph template');
        } else {
          fail('No physicsEnabled input found in the graph template');
        }

        var layout = container.querySelectorAll('select[name="layout"]');
        if (layout.length === 1) {
          self.network.setLayout(layout[0].value);
          layout[0].onchange = function() {
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

  return {
    Network: NetworkManager,
    Graph: GraphManager
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

})();
