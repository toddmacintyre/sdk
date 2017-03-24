/* global beforeEach, afterEach, describe, it */

import React from 'react';
import ReactDOM from 'react-dom';
import {assert} from 'chai';
import raf from 'raf';
import ol from 'openlayers';
import intl from '../mock-i18n';
import injectTapEventPlugin from 'react-tap-event-plugin';
import AddLayerModal from '../../src/components/AddLayerModal';

raf.polyfill();
injectTapEventPlugin();

describe('AddLayerModal', function() {

  var target, map;
  var width = 360;
  var height = 180;

  beforeEach(function(done) {
    target = document.createElement('div');
    var style = target.style;
    style.position = 'absolute';
    style.left = '-1000px';
    style.top = '-1000px';
    style.width = width + 'px';
    style.height = height + 'px';
    document.body.appendChild(target);
    map = new ol.Map({
      target: target,
      view: new ol.View({
        center: [0, 0],
        zoom: 1
      })
    });
    map.once('postrender', function() {
      done();
    });
  });

  afterEach(function() {
    map.setTarget(null);
    document.body.removeChild(target);
  });

  it('clears layerInfo on error', function(done) {
    var container = document.createElement('div');
    var url = 'http://localhost:8080/geoserver/wms';
    var modal = ReactDOM.render((
      <AddLayerModal map={map} allowUserInput={true} sources={[{url: url, type: 'WMS', title: 'My WMS'}]} intl={intl} />
    ), container);
    modal._setError('Error');
    assert.equal(modal.state.layerInfo, null);
    window.setTimeout(function() {
      ReactDOM.unmountComponentAtNode(container);
      done();
    }, 500);
  });

  it('generates correct layer title info', function(done) {
    var container = document.createElement('div');
    var url = 'http://localhost:8080/geoserver/wms';
    var modal = ReactDOM.render((
      <AddLayerModal map={map} allowUserInput={true} sources={[{url: url, type: 'WMS', title: 'My WMS'}]} intl={intl} />
    ), container);
    var title = modal._getLayerTitle({Title: ''});
    assert.equal(title.empty, true);
    title = modal._getLayerTitle({Title: 'My Layer'});
    assert.equal(title.empty, false);
    assert.equal(title.title, 'My Layer');
    window.setTimeout(function() {
      ReactDOM.unmountComponentAtNode(container);
      done();
    }, 500);
  });

  it('returns the correct url if no url input field', function(done) {
    var container = document.createElement('div');
    var url = 'http://localhost:8080/geoserver/wms';
    var modal = ReactDOM.render((
      <AddLayerModal map={map} allowUserInput={false} sources={[{url: url, type: 'WMS', title: 'My WMS'}]} intl={intl} />
    ), container);
    modal.setState({source: 0}, function() {
      var result = modal.state.sources[modal.state.source].url;
      assert.equal(result, url);
      window.setTimeout(function() {
        ReactDOM.unmountComponentAtNode(container);
        done();
      }, 500);
    });
  });

});
