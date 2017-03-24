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
import AppDispatcher from '../dispatchers/AppDispatcher';
import ToolUtil from '../toolutil';
import RaisedButton from './Button';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import classNames from 'classnames';
import getMuiTheme from 'material-ui/styles/getMuiTheme';

const messages = defineMessages({
  buttontext: {
    id: 'navigation.buttontext',
    description: 'Text of the Navigation button',
    defaultMessage: 'Navigation'
  },
  buttontitle: {
    id: 'navigation.buttontitle',
    description: 'Title of the Navigation button',
    defaultMessage: 'Switch to map navigation (pan and zoom)'
  }
});

/**
 * Navigation button that allows to get the map back into navigation (zoom, pan, info popup) mode.
 *
 * ```xml
 * <Navigation secondary={true} toggleGroup='navigation' />
 * ```
 *
 * ![Navigation](../Navigation.png)
 * ![Navigation Active](../NavigationActive.png)
 */
class Navigation extends React.PureComponent {
  static propTypes = {
    /**
     * Should the button have the secondary state initially (pressed)?
     */
    secondary: React.PropTypes.bool,
    /**
     * The toggleGroup to use. When this tool is activated, all other tools in the same toggleGroup will be deactivated.
     */
    toggleGroup: React.PropTypes.string,
    /**
     * Identifier to use for this tool. Can be used to group tools together.
     */
    toolId: React.PropTypes.string,
    /**
     * Css class name to apply on the root element of this component.
     */
    className: React.PropTypes.string,
    /**
     * @ignore
     */
    intl: intlShape.isRequired
  };

  static defaultProps = {
    toolId: 'nav'
  };

  static contextTypes = {
    muiTheme: React.PropTypes.object
  };

  static childContextTypes = {
    muiTheme: React.PropTypes.object.isRequired
  };

  constructor(props, context) {
    super(props);
    this._muiTheme = context.muiTheme || getMuiTheme();
    this._dispatchToken = ToolUtil.register(this);
    this.state = {
      secondary: props.secondary !== undefined ? props.secondary : false
    };
  }
  getChildContext() {
    return {muiTheme: this._muiTheme};
  }
  componentWillUnmount() {
    AppDispatcher.unregister(this._dispatchToken);
  }
  activate() {
    ToolUtil.activate(this, []);
    this.setState({secondary: true});
  }
  deactivate() {
    ToolUtil.deactivate(this);
    this.setState({secondary: false});
  }
  _onClick() {
    if (!this.state.secondary) {
      this.activate();
    }
  }
  render() {
    const {formatMessage} = this.props.intl;
    return (
      <RaisedButton {...this.props} className={classNames('sdk-component navigation', this.props.className)} secondary={this.state.secondary} onTouchTap={this._onClick.bind(this)} label={formatMessage(messages.buttontext)} tooltip={formatMessage(messages.buttontitle)} />
    );
  }
}

export default injectIntl(Navigation);
