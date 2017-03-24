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
import Dialog from 'material-ui/Dialog';
import classNames from 'classnames';
import TextField from 'material-ui/TextField';
import Button from './Button';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import LoginActions from '../actions/LoginActions';
import getMuiTheme from 'material-ui/styles/getMuiTheme';

const messages = defineMessages({
  title: {
    id: 'loginmodal.title',
    description: 'Title for the modal Login dialog',
    defaultMessage: 'Login'
  },
  usernamelabel: {
    id: 'loginmodal.userlabel',
    description: 'Label for the username field',
    defaultMessage: 'User name'
  },
  passwordlabel: {
    id: 'loginmodal.passwordlabel',
    description: 'Label for the password field',
    defaultMessage: 'Password'
  },
  loginbutton: {
    id: 'loginmodal.loginbutton',
    description: 'Text for the login button',
    defaultMessage: 'Login'
  },
  invalidcredentialsmsg: {
    id: 'loginmodal.invalidcredentialsmsg',
    description: 'Error message to show the user when a login request fails',
    defaultMessage: 'Invalid credentials'
  },
  errormsg: {
    id: 'loginmodal.errormsg',
    description: 'Error message to show if communication with GeoServer fails',
    defaultMessage: 'There was an error communicating with GeoServer, details: {details}'
  }
});

/**
 * Modal window for login to GeoServer. Used by the Login component.
 *
 * ![LoginModal](../LoginModal.png)
 */
class LoginModal extends React.PureComponent {
  static propTypes = {
    /**
     * Css class name to apply on the root element of this component.
     */
    className: React.PropTypes.string,
    /**
     * Function to call when the login button is pressed. Will be passed username and password.
     */
    login: React.PropTypes.func,
    /**
     * Function to call when the close button is pressed.
     */
    close: React.PropTypes.func,
    /**
     * @ignore
     */
    intl: intlShape.isRequired
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
    this.state = {
      open: this.props.open
    };
  }
  componentWillReceiveProps(nextProps) {
    if (this.state.open !== nextProps.open) {
      this.setState({open: nextProps.open});
    }
  }
  getChildContext() {
    return {muiTheme: this._muiTheme};
  }
  _onEnter(evt) {
    if (evt.keyCode === 13) {
      this._doLogin();
    }
  }
  _doLogin() {
    var username = this.refs.username.getValue();
    var pwd = this.refs.password.getValue();
    if (this.props.login) {
      this.props.login.call(this, username, pwd);
    } else {
      LoginActions.login(username, pwd, this.failureCb, this);
    }
  }
  failureCb(xmlhttp) {
    const {formatMessage} = this.props.intl;
    var msg;
    if (xmlhttp.status === 401) {
      msg = formatMessage(messages.invalidcredentialsmsg);
    } else {
      msg = formatMessage(messages.errormsg, {details: xmlhttp.status + ' ' + xmlhttp.statusText});
    }
    this.setState({errorMsg: msg});
  }
  close() {
    if (this.props.close) {
      this.props.close.call(this);
    }
  }
  render() {
    const {formatMessage} = this.props.intl;
    var actions = [
      <Button buttonType='Flat' primary={true} label={formatMessage(messages.loginbutton)} onTouchTap={this._doLogin.bind(this)} />
    ];
    return (
      <Dialog contentStyle={{width: 500}} className={classNames('sdk-component login-modal', this.props.className)} actions={actions} title={formatMessage(messages.title)} open={this.state.open} onRequestClose={this.close.bind(this)}>
        <TextField style={{width: 450}} floatingLabelText={formatMessage(messages.usernamelabel)} ref='username' /><br/>
        <TextField errorText={this.state.errorMsg} style={{width: 450}} onKeyDown={this._onEnter.bind(this)} type="password" floatingLabelText={formatMessage(messages.passwordlabel)} ref='password' />
      </Dialog>
    );
  }
}

export default injectIntl(LoginModal);
