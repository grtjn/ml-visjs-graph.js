# ml-visjs-graph.js
Graph visualization for triples stored in MarkLogic, based on the VisJS Network library

Note: WORK IN PROGRESS!

## Usage

Pull latest version from npm:

- `npm install --save ml-visjs-graph`

Import in your UI project to start making use of it:

- `var mlvisjs = require('ml-visjs-graph');` or `import * as mlvisjs from 'ml-visjs-graph';`

Grab hold of a DOM element to use as container, initialize a Graph, and apply your data and options:

(taken from Vue code:)

    var self = this;
    
    if (!mlvisjs) {
      throw 'Error: mlvisjs not found, required by mlVisjsGraph directive';
    }
    
    new mlvisjs.Graph(self.$el, null, null, function done(graph) {
      self.graph = graph;
      if (self.nodes.length || self.edges.length) {
        self.graph.network.setData(self.cleanNodes, null, self.cleanEdges, null);
      }
      if (self.options) {
        self.graph.network.setOptions(self.cleanOptions);
      }
      if (self.layout) {
        self.graph.network.setLayout(self.layout);
      }
    }, function fail(failure) {
      throw failure;
    });

Optionally watch properties for (deep) changes to data and options, and re-apply setData, setOptions, setLayout to get the graph updated.

Note: you can also pull it from bower, and use this code in the browser directly. See docs/index.html for an example using AngularJS.

## Vue.js

Important notes related to usage within Vue.js:

- Don't add this.graph to the `data` properties of a component. The observer wrappers will mess up the `vis` code embedded inside. Just assign to `this` without pre-declaring it. That is a valid and approved way to have properties that are not 'observed'.
- You need to unwrap nodes and edges, and likely also options, before passing them through. Here an example to do so. You can use computed properties to apply this efficiently:

        function observerClean (obj) {
          if (Array.isArray(obj)) {
            return obj.map(item => this.observerClean(item));
          } else if ( (typeof obj === "object") && (obj !== null) ) {
            return Object.keys(obj).reduce(
              (res, e) => Object.assign(res, { [e]: this.observerClean(obj[e]) }),
              {}
            );
          } else {
            return obj;
          }
        }

- Don't use v-show on containers wrapping the graph, or use an extra v-if to re-insert the graph as soon as it gets exposed. Adding visjs graphs to hidden containers causes their canvas to malfunction.

## Development

Please read [CONTRIBUTING.md] if you like to contribute to this project. Any help appreciated!

Pre-requisites:

- node
- npm
- bower
- gulp

To setup:

- npm install
- bower install

To build docs and dist:

- gulp

To test docs:

- cd docs
- python -m SimpleHTTPServer 7777
- http://localhost:7777
