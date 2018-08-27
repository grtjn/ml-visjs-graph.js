# ml-visjs-graph.js
Graph visualization for triples stored in MarkLogic, based on the VisJS Network library

## Usage

Pull latest version from npm:

- `npm install --save ml-visjs-graph`

Import in your UI project to start making use of it:

- `var mlvisjs = require('ml-visjs-graph');` or `import * as mlvisjs from 'ml-visjs-graph';`

Also link or import css of vis.js, and css or less from ml-visjs-graph:

- add `<link rel="stylesheet" href="/bower_components/vis/dist/vis.css" />` in your index.html
- and `@import "../../node_modules/ml-visjs-graph/less/ml-visjs-graph.js.less";` in some less file inside your project

or add the following in your JavaScript component when using something like webpack:

- `import 'vis/dist/vis.css';`
- `import 'ml-visjs-graph/less/ml-visjs-graph.js.less';`

Inside your JavaScript component, grab hold of a DOM element to use as container, initialize a Graph, and apply your data and options:

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
- You need to unwrap nodes and edges, and likely also options, when passed in via component properties, before passing them through. Here an example how to do so. You can use computed properties to apply this efficiently:

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

- Don't use v-show but v-if to hide containers wrapping the graph, or use an extra v-if to re-insert the graph as soon as it gets exposed. Adding visjs graphs to hidden containers causes their canvas to malfunction.

## Development

Please read [CONTRIBUTING.md] if you like to contribute to this project. Any help appreciated!

Pre-requisites:

- node (v8+)
- npm (v5+)
- bower
- gulp-cli (v4+). Run `npm install --global gulp-cli`. See https://github.com/gulpjs/gulp/blob/master/docs/getting-started/1-quick-start.md for details.

To setup:

- npm install
- bower install

To build docs and dist:

- gulp

To test docs:

- cd docs
- python -m SimpleHTTPServer 7777
- http://localhost:7777
