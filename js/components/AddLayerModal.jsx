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
import Dialog from 'material-ui/Dialog';
import Snackbar from 'material-ui/Snackbar';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import pureRender from 'pure-render-decorator';
import TextField from 'material-ui/TextField';
import Button from './Button.jsx';
import {List, ListItem} from 'material-ui/List';
import FolderIcon from 'material-ui/svg-icons/file/folder-open';
import LayerIcon from 'material-ui/svg-icons/maps/layers';
import URL from 'url-parse';
import RESTService from '../services/RESTService.js';
import WMSService from '../services/WMSService.js';
import WFSService from '../services/WFSService.js';
import classNames from 'classnames';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import './AddLayerModal.css';

const messages = defineMessages({
  title: {
    id: 'addwmslayermodal.title',
    description: 'Title for the modal Add layer dialog',
    defaultMessage: 'Add Layer from OGC:{serviceType}'
  },
  nolayertitle: {
    id: 'addwmslayermodal.nolayertitle',
    description: 'Title to show if layer has no title',
    defaultMessage: 'No Title'
  },
  errormsg: {
    id: 'addwmslayermodal.errormsg',
    description: 'Error message to show the user when an XHR request fails',
    defaultMessage: 'Error. {msg}'
  },
  corserror: {
    id: 'addwmslayermodal.corserror',
    description: 'Error message to show the user when an XHR request fails because of CORS or offline',
    defaultMessage: 'Could not connect to GeoServer. Please verify that the server is online and CORS is enabled.'
  },
  inputfieldlabel: {
    id: 'addwmslayermodal.inputfieldlabel',
    description: 'Label for input field',
    defaultMessage: '{serviceType} URL'
  },
  connectbutton: {
    id: 'addwmslayermodal.connectbutton',
    description: 'Text for connect button',
    defaultMessage: 'Connect'
  },
  closebutton: {
    id: 'addwmslayermodal.closebutton',
    description: 'Text for close button',
    defaultMessage: 'Close'
  }
});

const geojsonFormat = new ol.format.GeoJSON();

/**
 * Modal window to add layers from a WMS or WFS service.
 */
@pureRender
class AddLayerModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: false,
      errorOpen: false,
      open: false,
      layerInfo: null
    };
  }
  componentWillUnmount() {
    if (this._request) {
      this._request.abort();
    }
  }
  getChildContext() {
    return {muiTheme: getMuiTheme()};
  }
  _getCaps(url) {
    var me = this;
    const {formatMessage} = this.props.intl;
    var failureCb = function(xmlhttp) {
      delete me._request;
      if (xmlhttp.status === 0) {
        me._setError(formatMessage(messages.corserror));
      } else {
        me._setError(xmlhttp.status + ' ' + xmlhttp.statusText);
      }
    };
    var successCb = function(layerInfo) {
      delete me._request;
      me.setState({layerInfo: layerInfo});
    };
    if (this.props.asVector) {
      me._request = WFSService.getCapabilities(url, successCb, failureCb);
    } else {
      me._request = WMSService.getCapabilities(url, successCb, failureCb);
    }
  }
  _setError(msg) {
    this.setState({
      errorOpen: true,
      error: true,
      layerInfo: null,
      msg: msg
    });
  }
  _getStyleName(olLayer) {
    var url = this._getUrl();
    RESTService.getStyleName(url, olLayer, function(styleName) {
      olLayer.set('styleName', styleName);
    }, function() {
    });
  }
  _getWfsInfo(layer, olLayer, success, scope) {
    var me = this;
    // do a WFS DescribeFeatureType request to get wfsInfo
    WFSService.describeFeatureType(me._getUrl(), layer.Name, function(wfsInfo) {
      olLayer.set('wfsInfo', wfsInfo);
      success.call(scope);
    }, function() {
      olLayer.set('isSelectable', false);
      olLayer.set('wfsInfo', undefined);
      me.close();
    });
  }
  _getLayerTitle(layer) {
    const {formatMessage} = this.props.intl;
    if (layer.Title === '') {
      return {empty: true, title: formatMessage(messages.nolayertitle)};
    } else {
      return {empty: false, title: layer.Title};
    }
  }
  _getDimensionInfo(layer) {
    if (layer.Dimension) {
      for (var i = 0, ii = layer.Dimension.length; i < ii; ++i) {
        var dimension = layer.Dimension[i];
        if (dimension.name === 'time') {
          return dimension.values;
        }
      }
    }
  }
  _getLegendUrl(layer) {
    if (layer.Style && layer.Style.length === 1) {
      if (layer.Style[0].LegendURL && layer.Style[0].LegendURL.length >= 1) {
        return layer.Style[0].LegendURL[0].OnlineResource;
      }
    }
  }
  _onLayerClick(layer) {
    var map = this.props.map;
    var EX_GeographicBoundingBox = layer.EX_GeographicBoundingBox;
    var olLayer, titleObj = this._getLayerTitle(layer);
    var timeInfo = this._getDimensionInfo(layer);
    if (this.props.asVector) {
      var me = this;
      olLayer = new ol.layer.Vector({
        title: titleObj.title,
        emptyTitle: titleObj.empty,
        id: layer.Name,
        name: layer.Name,
        isWFST: true,
        timeInfo: timeInfo,
        isRemovable: true,
        isSelectable: true,
        popupInfo: '#AllAttributes',
        source: new ol.source.Vector({
          wrapX: false,
          url: function(extent) {
            var urlObj = new URL(me._getUrl().replace('wms', 'wfs'));
            urlObj.set('query', {
              service: 'WFS',
              request: 'GetFeature',
              version: '1.1.0',
              typename: layer.Name,
              outputFormat: 'application/json',
              srsname: 'EPSG:3857',
              bbox: extent.join(',') + ',EPSG:3857'
            });
            return urlObj.toString();
          },
          format: geojsonFormat,
          strategy: ol.loadingstrategy.tile(ol.tilegrid.createXYZ({
            maxZoom: 19
          }))
        })
      });
    } else {
      olLayer = new ol.layer.Tile({
        title: titleObj.title,
        emptyTitle: titleObj.empty,
        id: layer.Name,
        name: layer.Name,
        legendUrl: this._getLegendUrl(layer),
        isRemovable: true,
        isSelectable: true,
        isWFST: true,
        timeInfo: timeInfo,
        type: layer.Layer ? 'base' : undefined,
        EX_GeographicBoundingBox: EX_GeographicBoundingBox,
        popupInfo: '#AllAttributes',
        source: new ol.source.TileWMS({
          url: this._getUrl(),
          wrapX: layer.Layer ? true : false,
          params: {
            LAYERS: layer.Name
          },
          serverType: 'geoserver'
        })
      });
    }
    this._getStyleName.call(this, olLayer);
    this._getWfsInfo.call(this, layer, olLayer, this.close, this);
    if (olLayer.get('type') === 'base') {
      var foundGroup = false;
      map.getLayers().forEach(function(lyr) {
        if (foundGroup === false && lyr.get('type') === 'base-group') {
          foundGroup = true;
          lyr.getLayers().forEach(function(child) {
            child.setVisible(false);
          });
          lyr.getLayers().push(olLayer);
        }
      });
      if (foundGroup === false) {
        map.addLayer(olLayer);
      }
    } else {
      map.addLayer(olLayer);
    }
  }
  _getUrl() {
    var url;
    if (this.refs.url) {
      url = this.refs.url.getValue();
    } else {
      url = this.props.url;
    }
    var urlObj = new URL(url);
    return urlObj.toString();
  }
  _connect() {
    var url = this.refs.url.getValue();
    this._getCaps(url);
  }
  _getLayersMarkup(layer) {
    var childList;
    if (layer.Layer) {
      var children = layer.Layer.map(function(child) {
        return this._getLayersMarkup(child);
      }, this);
      childList = children;
    }
    var onTouchTap;
    if (layer.Name) {
      onTouchTap = this._onLayerClick.bind(this, layer);
    }
    var leftIcon;
    if (layer.Layer) {
      leftIcon = <FolderIcon />;
    } else if (layer.Name) {
      leftIcon = <LayerIcon />;
    }
    var layerTitle = this._getLayerTitle(layer);
    var primaryText;
    if (layerTitle.empty) {
      primaryText = (<div className='layer-title-empty'>{layerTitle.title}</div>);
    } else {
      primaryText = layerTitle.title;
    }
    return (
      <ListItem onTouchTap={onTouchTap} leftIcon={leftIcon} initiallyOpen={true} key={layer.Name} primaryText={primaryText} secondaryText={layer.Name} nestedItems={childList} disableTouchRipple={true}/>
    );
  }
  open() {
    this._getCaps(this.props.url);
    this.setState({open: true});
  }
  close() {
    this.setState({open: false});
  }
  _handleRequestClose() {
    this.setState({
      errorOpen: false
    });
  }
  render() {
    const {formatMessage} = this.props.intl;
    var layers;
    if (this.state.layerInfo) {
      var layerInfo = this._getLayersMarkup(this.state.layerInfo);
      layers = <List>{layerInfo}</List>;
    }
    var error;
    if (this.state.error === true) {
      error = (<Snackbar
        autoHideDuration={5000}
        style={{transitionProperty : 'none'}}
        bodyStyle={{lineHeight: '24px', height: 'auto'}}
        open={this.state.errorOpen}
        message={formatMessage(messages.errormsg, {msg: this.state.msg})}
        onRequestClose={this._handleRequestClose.bind(this)}
      />);
    }
    var input;
    var serviceType = this.props.asVector ? 'WFS' : 'WMS';
    if (this.props.allowUserInput) {
      input = (
        <div>
          <TextField style={{width: '512px'}} floatingLabelText={formatMessage(messages.inputfieldlabel, {serviceType: serviceType})} defaultValue={this.props.url} ref='url' />
          <Button style={{position: 'absolute', 'top': -14, right: -190}} label={formatMessage(messages.connectbutton)} onTouchTap={this._connect.bind(this)} disableTouchRipple={true}/>
        </div>
      );
    }
    var actions = [
      <Button buttonType='Flat' label={formatMessage(messages.closebutton)} onTouchTap={this.close.bind(this)} />
    ];
    return (
      <Dialog className={classNames('sdk-component add-layer-modal', this.props.className)}  actions={actions} autoScrollBodyContent={true} modal={true} title={formatMessage(messages.title, {serviceType: serviceType})} open={this.state.open} onRequestClose={this.close.bind(this)}>
        {input}
        {layers}
        {error}
      </Dialog>
    );
  }
}

AddLayerModal.propTypes = {
  /**
   * The ol3 map to upload to.
   */
  map: React.PropTypes.instanceOf(ol.Map).isRequired,
  /**
   * Css class name to apply on the dialog.
   */
  className: React.PropTypes.string,
  /**
   * url that will be used to retrieve layers from (WMS or WFS).
   */
  url: React.PropTypes.string.isRequired,
  /**
   * Should we add layers as vector? Will use WFS GetCapabilities.
   */
  asVector: React.PropTypes.bool,
  /**
   * Should be user be able to provide their own url?
   */
  allowUserInput: React.PropTypes.bool,
  /**
   * The srs name that the map's view is in.
   */
  srsName: React.PropTypes.string,
  /**
   * i18n message strings. Provided through the application through context.
   */
  intl: intlShape.isRequired
};

AddLayerModal.defaultProps = {
  asVector: false,
  allowUserInput: false
};

AddLayerModal.childContextTypes = {
  muiTheme: React.PropTypes.object.isRequired
};

export default injectIntl(AddLayerModal, {withRef: true});
