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

import React from 'react';
import ol from 'openlayers';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import classNames from 'classnames';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import LayerConstants from '../constants/LayerConstants';
import AppDispatcher from '../dispatchers/AppDispatcher';
import LayerSelector from './LayerSelector';
import FeatureStore from '../stores/FeatureStore';
import ToolUtil from '../toolutil';
import RaisedButton from './Button';
import DrawIcon from 'material-ui/svg-icons/image/brush';
import EditIcon from 'material-ui/svg-icons/editor/mode-edit';
import Snackbar from 'material-ui/Snackbar';
import {Toolbar, ToolbarGroup} from 'material-ui/Toolbar';
import EditForm from './EditForm';
import WFSService from '../services/WFSService';
import Paper from 'material-ui/Paper';

var SelectFeature = function(handleEvent, scope) {
  this._scope = scope;
  ol.interaction.Interaction.call(this, {
    handleEvent: handleEvent
  });
};
ol.inherits(SelectFeature, ol.interaction.Interaction);

const messages = defineMessages({
  nodatamsg: {
    id: 'wfst.nodatamsg',
    description: 'Message to display if there are no layers with data',
    defaultMessage: 'You haven\’t loaded any layers with feature data yet, so there is no data to edit. First add a layer with feature data.'
  },
  layerlabel: {
    id: 'wfst.layerlabel',
    description: 'Label for the layer combo box',
    defaultMessage: 'Layer'
  },
  drawfeature: {
    id: 'wfst.drawfeature',
    description: 'Button text for draw new feature',
    defaultMessage: 'Draw'
  },
  drawfeaturetitle: {
    id: 'wfst.drawfeaturetitle',
    description: 'Button help text for draw new feature',
    defaultMessage: 'Draw a new feature on the map'
  },
  modifyfeature: {
    id: 'wfst.modifyfeature',
    description: 'Button text for modify / select existing feature',
    defaultMessage: 'Select'
  },
  modifyfeaturetitle: {
    id: 'wfst.modifyfeaturetitle',
    description: 'Button title for modify / select existing feature',
    defaultMessage: 'Modify an existing feature or select before Delete'
  },
  updatemsg: {
    id: 'wfst.updatemsg',
    description: 'Message to show that geometry or attribute change succeeded',
    defaultMessage: 'Geometry and/or attribute(s) change saved successfully.'
  },
  deletesuccessmsg: {
    id: 'wfst.deletesuccessmsg',
    description: 'Message to show that feature was deleted successfully',
    defaultMessage: 'Feature deleted succcesfully.'
  },
  errormsg: {
    id: 'wfst.errormsg',
    description: 'Error message to show the user when a request fails',
    defaultMessage: 'Error saving this feature (modification) to GeoServer. {msg}'
  },
  deletemsg: {
    id: 'wfst.deletemsg',
    description: 'Error message to show when delete fails',
    defaultMessage: 'There was an issue deleting the feature.'
  }
});

/**
 * Allows users to make changes to WFS-T layers. This can be drawing new
 * features and deleting or modifying existing features. Only geometry
 * changes are currently supported, no attribute changes.
 * This depends on ol.layer.Vector with ol.source.Vector. The layer
 * needs to have isWFST set to true. Also a wfsInfo object needs to be
 * configured on the layer with the following properties:
 * - featureNS: the namespace of the WFS typename
 * - featureType: the name (without prefix) of the underlying WFS typename
 * - geometryType: the type of geometry (e.g. MultiPolygon)
 * - geometryName: the name of the geometry attribute
 * - url: the online resource of the WFS endpoint
 *
 * ```xml
 * <WFST map={map} />
 * ```
 */
class WFST extends React.PureComponent {
  static propTypes = {
    /**
     * The ol3 map whose layers can be used for the WFS-T tool.
     */
    map: React.PropTypes.instanceOf(ol.Map).isRequired,
    /**
     * The toggleGroup to use. When this tool is activated, all other tools in the same toggleGroup will be deactivated.
     */
    toggleGroup: React.PropTypes.string,
    /**
     * Identifier to use for this tool. Can be used to group tools together.
     */
    toolId: React.PropTypes.string,
    /**
     * Show a layer selector for the user to choose from?
     */
    layerSelector: React.PropTypes.bool,
    /**
     * Should this component be visible from the start?
     */
    visible: React.PropTypes.bool,
    /**
     * Buffer to put around clicked point to find the feature clicked. This is in the units of the coordinate reference system of the map.
     */
    pointBuffer: React.PropTypes.number,
    /**
     * Should we display an edit form for editing feature attributes on select?
     */
    showEditForm: React.PropTypes.bool,
    /**
     * Css class name to apply on the root element of this component.
     */
    className: React.PropTypes.string,
    /**
     * @ignore
     */
    intl: intlShape.isRequired
  };

  static contextTypes = {
    muiTheme: React.PropTypes.object,
    proxy: React.PropTypes.string,
    requestHeaders: React.PropTypes.object
  };

  static childContextTypes = {
    muiTheme: React.PropTypes.object.isRequired
  };

  static defaultProps = {
    showEditForm: false,
    layerSelector: true,
    visible: true,
    pointBuffer: 0.5
  };

  constructor(props, context) {
    super(props);
    this._proxy = context.proxy;
    this._requestHeaders = context.requestHeaders;
    this._dispatchToken2 = ToolUtil.register(this);
    var me = this;
    FeatureStore.bindMap(this.props.map, this._proxy);
    this._dispatchToken = AppDispatcher.register((payload) => {
      let action = payload.action;
      switch (action.type) {
        case LayerConstants.REMOVE_LAYER:
          me._onLayerSelectChange(null);
          break;
        case LayerConstants.EDIT_LAYER:
          me._toggleLayer(action.layer);
          break;
        default:
          break;
      }
    });
    this.state = {
      active: false,
      muiTheme: context.muiTheme || getMuiTheme(),
      modifySecondary: false,
      drawSecondary: false,
      disabled: false,
      error: false,
      open: false,
      visible: this.props.visible
    };
    this._interactions = {};
    var features = WFST.select.getFeatures();
    this._modify = new ol.interaction.Modify({
      features: features,
      wrapX: false
    });
    this._modify.on('modifystart', this._onModifyStart, this);
    features.on('add', this._onSelectAdd, this);
    features.on('remove', this._onSelectRemove, this);
    this._selectfeature = new SelectFeature(this._selectWMS, this);
    this._dirty = {};
  }
  getChildContext() {
    return {muiTheme: this.state.muiTheme};
  }
  componentWillUnmount() {
    AppDispatcher.unregister(this._dispatchToken);
    AppDispatcher.unregister(this._dispatchToken2);
    if (this._request) {
      this._request.abort();
    }
    this.deactivate();
  }
  static select = new ol.interaction.Select({wrapX: false});
  activate(interactions) {
    ToolUtil.activate(this, interactions);
    var hasSelect = false;
    for (var i = 0, ii = interactions.length; i < ii; ++i) {
      if (interactions[i] instanceof ol.interaction.Select) {
        hasSelect = true;
        break;
      }
    }
    if (hasSelect) {
      this.setState({modifySecondary: true, drawSecondary: false});
    } else {
      this.setState({modifySecondary: false, drawSecondary: true});
    }
  }
  deactivate() {
    ToolUtil.deactivate(this);
    WFST.select.getFeatures().clear();
    this.setState({feature: null, modifySecondary: false, drawSecondary: false});
  }
  _onModifyStart(evt) {
    if (!this._geom) {
      this._geom = evt.features.item(0).getGeometry().clone();
    }
  }
  _onLayerSelectChange(layer) {
    WFST.select.getFeatures().clear();
    if (layer !== null) {
      this._setLayer(layer);
    } else {
      this.deactivate();
      this.setState({feature: null, layer: null});
    }
  }
  _toggleLayer(layer) {
    if (layer === this.state.layer) {
      // toggle visibility
      var newVis = !this.state.visible;
      this.setState({visible: newVis});
      if (newVis === false) {
        this.deactivate();
      }
    } else {
      this.setState({visible: true, layer: layer});
    }
  }
  _setError(msg) {
    this.setState({
      error: true,
      open: true,
      msg: msg
    });
  }
  _setLayer(layer) {
    var source = layer.getSource();
    if (source instanceof ol.source.Vector && source.getFeatures().length > 0) {
      this.props.map.getView().fit(
        source.getExtent(),
        this.props.map.getSize()
      );
    }
    this.setState({feature: null, layer: layer});
  }
  _selectWMS(evt) {
    if (evt.type === 'singleclick') {
      var me = this._scope;
      var coord = evt.coordinate;
      var buffer = me.props.pointBuffer;
      var extent = [coord[0] - buffer, coord[1] - buffer, coord[0] + buffer, coord[1] + buffer];
      var state = FeatureStore.getState(me.state.layer);
      var found = false;
      WFST.select.getFeatures().clear();
      if (state) {
        var features = state.features.getFeatures();
        for (var i = 0, ii = features.length; i < ii; ++i) {
          var geom = features[i].getGeometry();
          if (geom.intersectsExtent(extent)) {
            found = true;
            me.setState({feature: features[i]});
            WFST.select.getFeatures().push(features[i]);
            break;
          }
        }
      }
      if (found === false) {
        this._request = WFSService.distanceWithin(me.state.layer, me.props.map.getView(), coord, function(feature) {
          WFST.select.getFeatures().push(feature);
          me.setState({feature: feature});
          delete me._request;
        }, function() {
          delete me._request;
        }, this._proxy, this._requestHeaders);
      }
      return !found;
    } else {
      return true;
    }
  }
  _modifyFeature() {
    if (!this.state.modifySecondary) {
      this.deactivate();
      var layer = this.state.layer;
      if (layer) {
        var interactions = [WFST.select, this._modify];
        if (!(layer.getSource() instanceof ol.source.Vector)) {
          interactions.push(this._selectfeature);
        }
        this.activate(interactions);
      }
    }
  }
  _filterLayerList(lyr) {
    return lyr.get('isWFST') && lyr.get('wfsInfo') !== undefined;
  }
  _onSelectAdd(evt) {
    var feature = evt.element;
    feature.on('change', function(evt) {
      this._dirty[evt.target.getId()] = true;
    }, this);
    this.setState({feature: feature});
  }
  _onGeomUpdate() {
    if (!(this.state.layer.getSource() instanceof ol.source.Vector)) {
      this._redraw();
    }
    delete this._dirty[this.state.feature.getId()];
  }
  _onSuccess() {
    const {formatMessage} = this.props.intl;
    this.setState({error: false, info: true, open: true, msg: formatMessage(messages.updatemsg)});
  }
  _onSelectRemove(evt) {
    const {formatMessage} = this.props.intl;
    var feature = evt.element;
    var fid = feature.getId();
    if (this._dirty[fid]) {
      var me = this;
      this._request = WFSService.updateFeature(this.state.layer, this.props.map.getView(), feature, null, function(result) {
        delete me._request;
        if (result && result.transactionSummary.totalUpdated === 1) {
          delete me._dirty[fid];
          me.setState({error: false, info: true, open: true, msg: formatMessage(messages.updatemsg)});
        } else {
          feature.setGeometry(me._geom);
          delete me._geom;
          me._setError('');
        }
        if (!(me.state.layer.getSource() instanceof ol.source.Vector)) {
          me._redraw();
        }
      }, function(xmlhttp, msg) {
        delete me._request;
        feature.setGeometry(me._geom);
        delete me._geom;
        me._setError(msg || (xmlhttp.status + ' ' + xmlhttp.statusText));
      }, this._proxy, this._requestHeaders);
    }
  }
  _onDrawEnd(evt) {
    var me = this;
    this._request = WFSService.insertFeature(this.state.layer, this.props.map.getView(), evt.feature, function(insertId) {
      delete me._request;
      if (insertId == 'new0') {
        // reload data if we're dealing with a shapefile store
        var source = me.state.layer.getSource();
        if (source instanceof ol.source.Vector) {
          source.clear();
        } else {
          me._redraw();
        }
      } else {
        evt.feature.setId(insertId);
        FeatureStore.addFeature(this.state.layer, evt.feature);
      }
    }, function(xmlhttp, msg) {
      delete me._request;
      me.deactivate();
      me._setError(msg || (xmlhttp.status + ' ' + xmlhttp.statusText));
    }, this._proxy, this._requestHeaders);
  }
  _redraw() {
    this.state.layer.getSource().updateParams({'_olSalt': Math.random()});
  }
  _drawFeature() {
    var layer = this.state.layer;
    var layerId = layer.get('id');
    var wfsInfo = layer.get('wfsInfo');
    var source;
    if (layer.getSource() instanceof ol.source.Vector) {
      source = layer.getSource();
    }
    if (!this._interactions[layerId]) {
      this._interactions[layerId] = {
        draw:  new ol.interaction.Draw({
          source: source,
          type: wfsInfo.geometryType,
          geometryName: wfsInfo.geometryName
        })
      };
      this._interactions[layerId].draw.on('drawend', this._onDrawEnd, this);
    }
    var draw = this._interactions[layerId].draw;
    this.deactivate();
    this.activate([draw]);
  }
  _handleRequestClose() {
    this.setState({
      open: false
    });
  }
  disable() {
    this.setState({disabled: true});
  }
  enable() {
    this.setState({disabled: false});
  }
  _onDeleteSuccess() {
    const {formatMessage} = this.props.intl;
    WFST.select.getFeatures().clear();
    var source = this.state.layer.getSource();
    if (source instanceof ol.source.Vector) {
      source.removeFeature(this.state.feature);
    } else {
      FeatureStore.removeFeature(this.state.layer, this.state.feature);
      this._redraw();
    }
    this.setState({error: false, info: true, open: true, msg: formatMessage(messages.deletesuccessmsg), feature: null});
  }
  _handleRequestCloseActive() {
    this.setState({
      active: false
    });
  }
  setActive(active) {
    this.setState({active: active});
  }
  render() {
    if (!this.state.visible) {
      return (<article />);
    } else {
      const {formatMessage} = this.props.intl;
      var error;
      if (this.state.error === true || this.state.info === true) {
        error = (<Snackbar
          open={this.state.open}
          message={this.state.error ? formatMessage(messages.errormsg, {msg: this.state.msg}) : this.state.msg}
          autoHideDuration={2000}
          onRequestClose={this._handleRequestClose.bind(this)}
        />);
      }
      var layerSelector;
      if (this.props.layerSelector) {
        var id;
        if (this.state.layer) {
          id = this.state.layer.get('id');
        }
        layerSelector = (
          <LayerSelector value={id} disabled={this.state.disabled || !this.state.layer} style={{marginLeft: '36px'}} {...this.props} onChange={this._onLayerSelectChange.bind(this)} id='layerSelector' ref='layerSelector' filter={this._filterLayerList} map={this.props.map} />
        );
      } else if (this.state.layer) {
        var label = formatMessage(messages.layerlabel) + ': ' + this.state.layer.get('title');
        layerSelector = (<div>{label}</div>);
      }
      var editForm;
      if (this.props.showEditForm && this.state.feature) {
        editForm = (<EditForm map={this.props.map} onGeometryUpdate={this._onGeomUpdate.bind(this)} onSuccess={this._onSuccess.bind(this)} onDeleteSuccess={this._onDeleteSuccess.bind(this)} feature={this.state.feature} layer={this.state.layer} />);
      }
      return (
        <Paper zDepth={0} className={classNames('sdk-component wfst', this.props.className)}>
          <Snackbar
            autoHideDuration={5000}
            open={!this.state.layer && this.state.active}
            bodyStyle={{lineHeight: '24px', height: 'auto'}}
            style={{bottom: 'auto', top: 0, position: 'absolute'}}
            message={formatMessage(messages.nodatamsg)}
            onRequestClose={this._handleRequestCloseActive.bind(this)}
          />
          {layerSelector}
          <Toolbar>
            <ToolbarGroup firstChild={true}>
              <RaisedButton secondary={this.state.drawSecondary} tooltip={formatMessage(messages.drawfeaturetitle)} label={formatMessage(messages.drawfeature)} disabled={this.state.disabled || !this.state.layer} onTouchTap={this._drawFeature.bind(this)} icon={<DrawIcon />} />
            </ToolbarGroup>
            <ToolbarGroup lastChild={true}>
              <RaisedButton secondary={this.state.modifySecondary} tooltip={formatMessage(messages.modifyfeaturetitle)} label={formatMessage(messages.modifyfeature)} disabled={this.state.disabled || !this.state.layer} onTouchTap={this._modifyFeature.bind(this)} icon={<EditIcon />} />
            </ToolbarGroup>
          </Toolbar>
          {error}
          {editForm}
        </Paper>
      );
    }
  }
}

export default injectIntl(WFST, {withRef: true});
