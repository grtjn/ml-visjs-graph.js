/* global describe, beforeEach, module, it, expect, inject */

describe('mlvisjs', function () {
  'use strict';

  var factory, $httpBackend, $q, $location;

  beforeEach(module('mlvisjs'));

  beforeEach(inject(function ($injector) {
    $q = $injector.get('$q');
    $httpBackend = $injector.get('$httpBackend');
    $location = $injector.get('$location');

    factory = $injector.get('mlvisjs', $q, $httpBackend);
  }));


});
