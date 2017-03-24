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
import ReactDOM from 'react-dom';
import LayerStore from '../stores/LayerStore';
import ol from 'openlayers';
import classNames from 'classnames';
import AppDispatcher from '../dispatchers/AppDispatcher';
import ToolUtil from '../toolutil';
import ToolConstants from '../constants/ToolConstants';
import WMSService from '../services/WMSService';
import WMTSService from '../services/WMTSService';
import ArcGISRestService from '../services/ArcGISRestService';
import {Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn} from 'material-ui/Table';
import Button from './Button';
import CloserIcon from 'material-ui/svg-icons/navigation/close';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import './BasePopup.css';
import './InfoPopup.css';

const messages = defineMessages({
  nofeatures: {
    id: 'infopopup.nofeatures',
    description: 'Text to show if no features were found',
    defaultMessage: 'No features at this location'
  },
  nulltext: {
    id: 'infopopup.nulltext',
    description: 'Text to show if attribute has no value',
    defaultMessage: 'NULL'
  },
  nametext: {
    id: 'infopopup.nametext',
    description: 'Text to show for the name column',
    defaultMessage: 'Name'
  },
  valuetext: {
    id: 'infopopup.valuetext',
    description: 'Text to show for the value column',
    defaultMessage: 'Value'
  }
});

const ALL_ATTRS = '#AllAttributes';

/**
 * Popup to show feature info. This can be through WMS / WMTS GetFeatureInfo or local vector data.
 *
 * ```xml
 * <InfoPopup toggleGroup='navigation' map={map} />
 * ```
 *
 * ![Info Popup](../InfoPopup.png)
 */
class InfoPopup extends React.Component {
  static propTypes = {
    /**
     * The ol3 map to register for singleClick.
     */
    map: React.PropTypes.instanceOf(ol.Map).isRequired,
    /**
     * Should we show feature info on hover instead of on click?
     */
    hover: React.PropTypes.bool,
    /**
     * Identifier to use for this tool. Can be used to group tools together.
     */
    toolId: React.PropTypes.string,
    /**
     * Format to use for WMS GetFeatureInfo requests.
     */
    infoFormat: React.PropTypes.string,
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
    proxy: React.PropTypes.string,
    requestHeaders: React.PropTypes.object,
    muiTheme: React.PropTypes.object
  };

  static childContextTypes = {
    muiTheme: React.PropTypes.object.isRequired
  };

  static defaultProps = {
    hover: false,
    toolId: 'nav',
    infoFormat: 'text/plain'
  };

  constructor(props, context) {
    super(props);
    this._proxy = context.proxy;
    this._requestHeaders = context.requestHeaders;
    this._muiTheme = context.muiTheme || getMuiTheme();
    this._dispatchToken = ToolUtil.register(this);
    LayerStore.bindMap(this.props.map);
    if (this.props.hover === true) {
      this.props.map.on('pointermove', this._onMapClick, this);
    } else {
      this.props.map.on('singleclick', this._onMapClick, this);
    }
    this.active = true;
    this._count = 0;
    this.state = {
      popupTexts: []
    };
  }
  getChildContext() {
    return {muiTheme: this._muiTheme};
  }
  componentDidMount() {
    this.overlayPopup = new ol.Overlay({
      autoPan: true,
      element: ReactDOM.findDOMNode(this).parentNode
    });
    this.props.map.addOverlay(this.overlayPopup);
    var me = this;
    this._dispatchToken2 = AppDispatcher.register((payload) => {
      let action = payload.action;
      switch (action.type) {
        case ToolConstants.SHOW_POPUP:
          me.setState({
            popupTexts: me._createSimpleTable({features: [action.feature], layer: action.layer}),
            contentAsObject: true
          });
          me.setVisible(true);
          me.overlayPopup.setPosition(action.feature.getGeometry().getInteriorPoint().getCoordinates());
          break;
        default:
          break;
      }
    });
  }
  componentWillUnmount() {
    AppDispatcher.unregister(this._dispatchToken);
    AppDispatcher.unregister(this._dispatchToken2);
  }
  activate(interactions) {
    this.active = true;
    // it is intentional not to call activate on ToolUtil here
  }
  deactivate() {
    this.active = false;
    // it is intentional not to call deactivate on ToolUtil here
  }
  _getLayers() {
    var state = LayerStore.getState();
    var layers = [];
    for (var i = 0, ii = state.flatLayers.length; i < ii; ++i) {
      var layer = state.flatLayers[i];
      if (layer instanceof ol.layer.Tile && layer.getVisible() && (layer.getSource() instanceof ol.source.TileArcGISRest || layer.getSource() instanceof ol.source.TileWMS || layer.getSource() instanceof ol.source.WMTS) && layer.get('popupInfo') && layer.get('popupInfo') !== '') {
        layers.push(layer);
      }
    }
    return layers;
  }
  _createSimpleTable(response) {
    var features = response.features;
    var layer = response.layer;
    this._count++;
    const {formatMessage} = this.props.intl;
    var fid;
    var rows = [];
    for (var i = 0, ii = features.length; i < ii; ++i) {
      var feature = features[i];
      fid = feature.getId();
      var keys = feature.getKeys();
      var geom = feature.getGeometryName();
      var style = {wordWrap: 'break-word', whiteSpace: 'normal'};
      for (var j = 0, jj = keys.length; j < jj; ++j) {
        var key = keys[j];
        if (key !== geom && key !== 'boundedBy') {
          rows.push(<TableRow key={key}><TableRowColumn style={style}>{key}</TableRowColumn><TableRowColumn style={style}>{feature.get(key)}</TableRowColumn></TableRow>);
        }
      }
    }
    return (<Table key={this._count}>
      <TableHeader className='popup-table-header' style={{'backgroundColor':'white'}} displaySelectAll={false} adjustForCheckbox={false}>
        <TableRow style={{'backgroundColor':'white'}}>
          <TableHeaderColumn colSpan="2" tooltip={fid} style={{overflowWrap: 'break-word', wordWrap: 'break-word', wordBreak: 'break-word', whiteSpace: 'normal', paddingRight: 48, fontSize: 14, color: 'rgba(0, 0, 0, 0.87)', textAlign: 'center'}}>
            {layer.get('title')}
          </TableHeaderColumn>
        </TableRow>
        <TableRow style={{'backgroundColor':'white'}}>
          <TableHeaderColumn style={{fontWeight: 'bold', color: 'rgba(0, 0, 0, 0.87)'}}>{formatMessage(messages.nametext)}</TableHeaderColumn>
          <TableHeaderColumn style={{fontWeight: 'bold', color: 'rgba(0, 0, 0, 0.87)'}}>{formatMessage(messages.valuetext)}</TableHeaderColumn>
        </TableRow>
      </TableHeader>
      <TableBody className='popup-table-body' displayRowCheckbox={false}>
        <TableRow className='popup-table-headerpadding' />
        {rows}
      </TableBody>
    </Table>);
  }
  _fetchData(evt, popupTexts, cb) {
    var map = this.props.map;
    this._cursor = map.getTarget().style.cursor;
    var me = this;
    map.getTarget().style.cursor = 'wait';
    var allLayers = this._getLayers();
    var len = allLayers.length;
    var finishedQueries = 0;
    var finishedQuery = function() {
      finishedQueries++;
      if (len === finishedQueries) {
        map.getTarget().style.cursor = me._cursor;
        cb();
      }
    };
    var onReadyAll = function(response) {
      if (response !== false && response.text) {
        popupTexts.push(response.text);
      }
      finishedQuery();
    };
    const {formatMessage} = this.props.intl;
    var popupDef;
    this._noFeaturesFound = false;
    var onReady = function(response) {
      var features = response.features;
      if (features.length) {
        var popupContent;
        if (popupDef === ALL_ATTRS) {
          me._contentAsObject = true;
          popupContent = me._createSimpleTable(response);
        } else {
          for (var j = 0, jj = features.length; j < jj; ++j) {
            popupContent = popupDef;
            var feature = features[j];
            var values = feature.getProperties();
            for (var key in values) {
              var value = values[key];
              if (value) {
                popupContent = popupContent.replace('[' + key + ']', value);
              } else {
                popupContent = popupContent.replace('[' + key + ']', formatMessage(messages.nulltext));
              }
            }
          }
        }
        popupTexts.push(popupContent);
      } else {
        me._noFeaturesFound = true;
      }
      finishedQuery();
    };
    var called = false;
    for (var i = 0; i < len; i++) {
      var layer = allLayers[i];
      popupDef = layer.get('popupInfo');
      var source = layer.getSource();
      var service;
      if (source instanceof ol.source.TileWMS) {
        service = WMSService;
      } else if (source instanceof ol.source.TileArcGISRest) {
        service = ArcGISRestService;
      } else {
        service = WMTSService;
      }
      if (popupDef === ALL_ATTRS) {
        called = true;
        var infoFormat = this.props.infoFormat;
        var callback = (infoFormat === 'text/plain' || infoFormat === 'text/html') ? onReadyAll : onReady;
        service.getFeatureInfo(layer, evt.coordinate, map, infoFormat, callback, function() {
          map.getTarget().style.cursor = me._cursor;
        }, this._proxy, this._requestHeaders);
      } else if (popupDef) {
        called = true;
        service.getFeatureInfo(layer, evt.coordinate, map, 'application/json', onReady, undefined, this._proxy, this.requestHeaders);
      }
    }
    if (called === false) {
      map.getTarget().style.cursor = me._cursor;
      cb();
    }
  }
  _onMapClick(evt) {
    if (this.active) {
      const {formatMessage} = this.props.intl;
      var map = this.props.map;
      var pixel = map.getEventPixel(evt.originalEvent);
      var coord = evt.coordinate;
      var popupTexts = [];
      this._contentAsObject = false;
      var me = this;
      map.forEachFeatureAtPixel(pixel, function(feature, layer) {
        if (feature && layer !== null) {
          var cluster = false;
          if (feature.get('features')) {
            if (feature.get('features').length === 1) {
              feature = feature.get('features')[0];
            } else {
              cluster = true;
            }
          }
          var popupDef = layer.get('popupInfo');
          if (popupDef === ALL_ATTRS) {
            me._contentAsObject = true;
            popupTexts.push(me._createSimpleTable({features: [feature], layer: layer}));
          } else if (popupDef && !cluster) {
            var featureKeys = feature.getKeys();
            for (var i = 0, ii = featureKeys.length; i < ii; i++) {
              var value = feature.get(featureKeys[i]);
              if (value) {
                popupDef = popupDef.replace('[' + featureKeys[i] + ']', feature.get(featureKeys[i]));
              } else {
                popupDef = popupDef.replace('[' + featureKeys[i] + ']', formatMessage(messages.nulltext));
              }
            }
            popupTexts.push(popupDef);
          }
        }
      });
      this._fetchData(evt, popupTexts, function() {
        if (popupTexts.length || me._noFeaturesFound) {
          me.setState({
            popupTexts: popupTexts,
            contentAsObject: me._contentAsObject
          });
          me.setVisible(true);
          me.overlayPopup.setPosition(coord);
        } else {
          me.setVisible(false);
        }
      });
    }
  }
  _updateScroll(evt) {
    var el = evt.target;
    var scrollPosition = el.getBoundingClientRect().top;

    var headers = el.querySelectorAll('.popup-table-header');
    var bodys = el.querySelectorAll('.popup-table-headerpadding');
    for (var i = 1; i < headers.length; i++) {
      var position = bodys[i].getBoundingClientRect().bottom;
      if (position < scrollPosition) {
        headers[i].classList.add('popup-header-fixed');
        bodys[i].classList.add('popup-body-noheader');
      } else {
        headers[i].classList.remove('popup-header-fixed');
        bodys[i].classList.remove('popup-body-noheader');
      }
    }
  }
  setVisible(visible) {
    ReactDOM.findDOMNode(this).parentNode.style.display = visible ? 'block' : 'none';
    var me = this;
    // regular jsx onClick does not work when stopEvent is true
    var closer = ReactDOM.findDOMNode(this.refs.popupCloser);
    if (closer.onclick === null) {
      closer.onclick = function() {
        me.setVisible(false);
        return false;
      };
    }
  }
  render() {
    var contentDiv;
    const {formatMessage} = this.props.intl;
    if (this.state.popupTexts.length == 0) {
      var nofeatures = formatMessage(messages.nofeatures);
      contentDiv = (<div className='popup-content auto' ref='content'><div style={{'lineHeight': '58px'}}>{nofeatures}</div></div>)
    } else if (this.state.contentAsObject) {
      contentDiv = (<div className='popup-content' ref='content'><div className='popup-header'/><div className='popup-body' onScroll={this._updateScroll.bind(this)}>{this.state.popupTexts}</div></div>);
    } else {
      var content = this.state.popupTexts.join('<hr>');
      contentDiv = (<div className='popup-content auto' ref='content' dangerouslySetInnerHTML={{__html: content}}></div>);
    }
    return (
      <div className={classNames('sdk-component info-popup', this.props.className)}>
        <Button buttonType='Icon' buttonStyle={{float: 'right'}} style={{'position':'absolute', 'right':'10px', 'top':'10px', 'zIndex':'1000'}} ref="popupCloser" onTouchTap={this.setVisible.bind(this, false)}><CloserIcon /></Button>
        {contentDiv}
      </div>
    );
  }
}

export default injectIntl(InfoPopup);
