/*
 * Copyright 2015-present Boundless Spatial Inc., http://boundlessgeo.com
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and limitations under the License.
 */

/* global document */

import {EventEmitter} from 'events';
import ol from 'openlayers';
import SelectConstants from '../constants/SelectConstants';
import LayerConstants from '../constants/LayerConstants';
import AppDispatcher from '../dispatchers/AppDispatcher';
import LayerStore from './LayerStore';
import WFSService from '../services/WFSService';
import ArcGISRestService from '../services/ArcGISRestService';

class FeatureStore extends EventEmitter {
  constructor() {
    super();
    this._pageInfo = {};
    this._createDefaultSelectStyleFunction = function() {
      var styles = {};
      var width = 3;
      var white = [255, 255, 255, 1];
      var yellow = [255, 255, 0, 1];
      styles.Polygon = [
        new ol.style.Style({
          fill: new ol.style.Fill({
            color: [255, 255, 0, 0.5]
          })
        })
      ];
      styles.MultiPolygon = styles.Polygon;
      styles.LineString = [
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: white,
            width: width + 2
          })
        }),
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: yellow,
            width: width
          })
        })
      ];
      styles.MultiLineString = styles.LineString;
      styles.Circle = styles.Polygon.concat(styles.LineString);
      styles.Point = [
        new ol.style.Style({
          image: new ol.style.Circle({
            radius: width * 2,
            fill: new ol.style.Fill({
              color: yellow
            }),
            stroke: new ol.style.Stroke({
              color: white,
              width: width / 2
            })
          }),
          zIndex: Infinity
        })
      ];
      styles.MultiPoint = styles.Point;
      styles.GeometryCollection = styles.Polygon.concat(styles.LineString, styles.Point);
      styles.Polygon.push.apply(styles.Polygon, styles.LineString);
      styles.GeometryCollection.push.apply(styles.GeometryCollection, styles.LineString);
      return function(feature, resolution) {
        return styles[feature.getGeometry().getType()];
      };
    };
    this._regexes = {
      url: /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/,
      file: /.*[\\\\/].*\..*/
    };
    this._layers = {};
    this._schema = {};
    this._config = {};
  }
  _getLayer(feature) {
    for (var key in this._config) {
      for (var i = 0, ii = this._config[key].features.length; i < ii; ++i) {
        if (this._config[key].features[i] === feature) {
          return this._layers[key];
        }
      }
    }
  }
  bindMap(map, opt_proxy) {
    if (this._map !== map) {
      this._map = map;
      var me = this;
      var defaultStyle = this._createDefaultSelectStyleFunction();
      this._select = new ol.interaction.Select({
        wrapX: false,
        style: function(feature, resolution) {
          var layer = me._getLayer(feature);
          var selectedStyle;
          if (layer) {
            selectedStyle = layer.get('selectedStyle');
          }
          if (selectedStyle) {
            if (selectedStyle instanceof ol.style.Style || Array.isArray(selectedStyle)) {
              return selectedStyle;
            } else {
              return selectedStyle.call(this, feature, resolution);
            }
          } else {
            return defaultStyle.call(this, feature, resolution);
          }
        }
      });
      this._select.handleEvent = function(mapBrowserEvent) {
        return true;
      };
      this._map.addInteraction(this._select);
      LayerStore.bindMap(map);
      var layers = LayerStore.getState().flatLayers;
      for (var i = 0, ii = layers.length; i < ii; ++i) {
        if (layers[i] instanceof ol.layer.Vector) {
          this.addLayer(layers[i], opt_proxy);
        }
      }
    }
  }
  setSelectOnClick(active) {
    this.active = active;
  }
  addFeature(layer, feature) {
    var id = layer.get('id');
    this._config[id].features.addFeature(feature);
    this.emitChange();
  }
  removeFeature(layer, feature) {
    var id = layer.get('id');
    var idx = this._config[id].selected.indexOf(feature);
    if (idx !== -1) {
      this._config[id].selected.splice(idx, 1);
      this._updateSelect();
    }
    idx = this._config[id].filter.indexOf(feature);
    if (idx !== -1) {
      this._config[id].filter.splice(idx, 1);
    }
    this._config[id].features.removeFeature(feature);
    this.emitChange();
  }
  removeLayer(layer) {
    var id = layer.get('id');
    delete this._layers[id];
    delete this._schema[id];
    delete this._config[id];
    this.emitChange();
  }
  getFeaturesPerPage(layer, page, pageSize) {
    var id = layer.get('id');
    var features = this._config[id].features.getFeatures();
    return features.slice(page * pageSize, page * pageSize + pageSize);
  }
  addLayer(layer, filter, opt_proxy, opt_requestHeaders) {
    var id = layer.get('id');
    if (!this._config[id]) {
      this._config[id] = {
        features: new ol.source.Vector({useSpatialIndex: false}),
        selected: [],
        filter: []
      };
    }
    if (layer instanceof ol.layer.Tile) {
      if (!layer.get('numberOfFeatures') && !layer.get('loading')) {
        layer.set('loading', true);
        if (layer.getSource() instanceof ol.source.TileArcGISRest) {
          ArcGISRestService.getNumberOfFeatures(layer, function(count) {
            layer.set('numberOfFeatures', count);
            layer.set('loading', false);
          });
        } else {
          WFSService.getNumberOfFeatures(layer, function(count) {
            layer.set('numberOfFeatures', count);
            layer.set('loading', false);
          }, opt_proxy, opt_requestHeaders);
        }
      }
    }
    if (!this._layers[id]) {
      this._layers[id] = layer;
      this.bindLayer(layer);
    }
    if (filter === true) {
      this.setSelectedAsFilter(layer);
    } else {
      this.restoreOriginalFeatures(layer);
    }
  }
  appendFeatures(layer, features) {
    if (features.length > 0) {
      var id = layer.get('id');
      this._config[id].features.addFeatures(features);
    }
  }
  _setFeatures(layer, features) {
    var id = layer.get('id');
    this._config[id].features.clear();
    this._config[id].features.addFeatures(features);
  }
  loadFeatures(layer, startIndex, pageSize, sortingInfo, onSuccess, onFailure, scope, opt_proxy, opt_requestHeaders) {
    var srsName = this._map.getView().getProjection().getCode();
    var me = this;
    var success = function(features) {
      me.appendFeatures(layer, features);
      me.emitChange();
      if (onSuccess) {
        onSuccess.call(scope);
      }
    };
    var failure = function(xmlhttp, exception) {
      me.appendFeatures(layer, []);
      me.emitChange();
      if (onFailure) {
        onFailure.call(scope, xmlhttp, exception);
      }
    };
    if (layer.getSource() instanceof ol.source.TileArcGISRest) {
      ArcGISRestService.loadFeatures(layer, startIndex, pageSize, sortingInfo, srsName, success, failure);
    } else {
      WFSService.loadFeatures(layer, startIndex, pageSize, sortingInfo, srsName, success, failure, opt_proxy, opt_requestHeaders);
    }
  }
  bindLayer(layer) {
    var source = layer.getSource();
    if (source instanceof ol.source.Cluster) {
      source = source.getSource();
    }
    if (source instanceof ol.source.Vector) {
      source.on('change', function(evt) {
        if (!this._ignoreSourceChange) {
          if (evt.target.getState() === 'ready') {
            var features = evt.target.getFeatures();
            this._setFeatures(layer, features);
            delete this._schema[layer.get('id')];
            this.emitChange();
          }
        }
      }, this);
      this._setFeatures(layer, source.getFeatures());
      delete this._schema[layer.get('id')];
    }
  }
  _determineType(value) {
    var type = 'string';
    if (this._regexes.url.test(value) || this._regexes.file.test(value)) {
      type = 'link';
    }
    return type;
  }
  clearSelection(layer, filter) {
    var id = layer.get('id');
    if (!this._config[id]) {
      this._config[id] = {};
    }
    this._config[id].selected = [];
    this._updateSelect();
    if (filter === true) {
      this.setSelectedAsFilter(layer);
    } else {
      this.emitChange();
    }
  }
  selectFeaturesInCurrentSelection(layer, features) {
    var id = layer.get('id'), i, ii;
    var selected = this._config[id].selected;
    var remove = [];
    for (i = 0, ii = selected.length; i < ii; ++i) {
      if (features.indexOf(selected[i]) === -1) {
        remove.push(selected[i]);
      }
    }
    for (i = 0, ii = remove.length; i < ii; ++i) {
      var idx = selected.indexOf(remove[i]);
      if (idx > -1) {
        selected.splice(idx, 1);
      }
    }
    if (remove.length > 0) {
      this._updateSelect();
    }
    this.emitChange();
    return selected.length;
  }
  _updateSelect() {
    var selectedFeatures = this._select.getFeatures();
    if (selectedFeatures.getLength() > 0) {
      selectedFeatures.clear();
    }
    var state = this._config;
    for (var key in state) {
      for (var i = 0, ii = state[key].selected.length; i < ii; ++i) {
        selectedFeatures.push(state[key].selected[i]);
      }
    }
  }
  toggleFeature(layer, feature) {
    this.clearOnInvisible(layer);
    // special handling for cluster features
    if (layer instanceof ol.layer.Vector && layer.getSource() instanceof ol.source.Cluster) {
      feature.selected = !feature.selected;
      this._ignoreSourceChange = true;
      feature.changed();
      this._ignoreSourceChange = false;
    }
    var id = layer.get('id'), idx = this._config[id].selected.indexOf(feature);
    if (idx === -1) {
      this._config[id].selected.push(feature);
    } else {
      this._config[id].selected.splice(idx, 1);
    }
    this._updateSelect();
    this.emitChange();
  }
  _clearIfCluster(layer, features) {
    // special handling for clusters
    // if a cluster has children selected, it should not show up as well
    if (layer instanceof ol.layer.Vector && layer.getSource() instanceof ol.source.Cluster) {
      var dirty = [];
      var f = layer.getSource().getFeatures();
      for (var i = 0, ii = f.length; i < ii; ++i) {
        var children = f[i].get('features');
        for (var j = 0, jj = children.length; j < jj; ++j) {
          if (features.indexOf(children[j]) === -1) {
            if (children[j].selected) {
              if (dirty.indexOf(f[i]) === -1) {
                dirty.push(f[i]);
              }
            }
            children[j].selected = false;
          }
        }
      }
      for (var d = 0, dd = dirty.length; d < dd; ++d) {
        dirty[d].changed();
      }
    }
  }
  clearOnInvisible(layer) {
    var id = layer.get('id');
    layer.once('change:visible', function(evt) {
      this._config[id].selected = [];
      this._clearIfCluster(layer, []);
      this.emitChange();
      this._updateSelect();
    }, this);
  }
  setSelection(layer, features, clear) {
    var id = layer.get('id');
    this.clearOnInvisible(layer);
    if (clear) {
      this._clearIfCluster(layer, features);
    }
    if (!this._config[id]) {
      this._config[id] = {};
    }
    var filter = this._config[id].selected === this._config[id].filter;
    if (clear === true) {
      this._config[id].selected = features;
      this._updateSelect();
      if (filter === true) {
        this._config[id].filter = features;
      }
    } else {
      var needChange = false;
      for (var i = 0, ii = features.length; i < ii; ++i) {
        if (this._config[id].selected.indexOf(features[i]) === -1) {
          needChange = true;
          this._config[id].selected.push(features[i]);
        }
      }
      if (needChange) {
        this._updateSelect();
      }
    }
    // cluster layers need to get redrawn
    if (layer instanceof ol.layer.Vector && layer.getSource() instanceof ol.source.Cluster) {
      layer.getSource().changed();
    }
    this.emitChange();
  }
  setFilter(layer, filter) {
    var id = layer.get('id');
    this._config[id].filter = filter;
    this.emitChange();
  }
  setSelectedAsFilter(layer) {
    var id = layer.get('id');
    this.setFilter(layer, this._config[id].selected);
  }
  restoreOriginalFeatures(layer) {
    var id = layer.get('id');
    this._config[id].filter = [];
    this.emitChange();
  }
  getSchema(layer) {
    var id = layer.get('id');
    if (!this._schema[id] && this._config[id] && this._config[id].features.getFeatures().length > 0) {
      var schema = {};
      var feature = this._config[id].features.getFeatures()[0];
      if (!feature) {
        var wfsInfo = layer.get('wfsInfo');
        for (var i = 0, ii = wfsInfo.attributes.length; i < ii; ++i) {
          schema[wfsInfo.attributes[i]] = 'string';
        }
      } else {
        var geom = feature.getGeometryName();
        var values = feature.getProperties();
        for (var key in values) {
          if (key !== geom && key !== 'boundedBy') {
            schema[key] = this._determineType(values[key]);
          }
        }
      }
      this._schema[id] = schema;
    }
    return this._schema[id];
  }
  getState(layer) {
    if (layer) {
      return this._config[layer.get('id')];
    } else {
      return this._config;
    }
  }
  emitChange() {
    this.emit('CHANGE');
  }
  addChangeListener(cb) {
    this.on('CHANGE', cb);
  }
  removeChangeListener(cb) {
    this.removeListener('CHANGE', cb);
  }
}

let _FeatureStore = new FeatureStore();

AppDispatcher.register((payload) => {
  let action = payload.action;
  switch (action.type) {
    case SelectConstants.CLEAR:
      _FeatureStore.clearSelection(action.layer, action.filter);
      break;
    case SelectConstants.SELECT_FEATURES:
      _FeatureStore.setSelection(action.layer, action.features, action.clear);
      break;
    case SelectConstants.TOGGLE_FEATURE:
      if (action.feature) {
        _FeatureStore.toggleFeature(action.layer, action.feature);
      }
      break;
    case LayerConstants.REMOVE_LAYER:
      _FeatureStore.removeLayer(action.layer);
      break;
    default:
      break;
  }
});

export default _FeatureStore;
