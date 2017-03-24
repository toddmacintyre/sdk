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
import MuiDialog from 'material-ui/Dialog';
import Paper from 'material-ui/Paper';
import {Toolbar, ToolbarGroup} from 'material-ui/Toolbar';
import AppBar from 'material-ui/AppBar';
import NavigationClose from 'material-ui/svg-icons/navigation/close';
import IconButton from 'material-ui/IconButton';

export default class Dialog extends React.PureComponent {
  static propTypes = {
    className: React.PropTypes.string,
    inline: React.PropTypes.bool,
    onRequestClose: React.PropTypes.func,
    title: React.PropTypes.string,
    autoScrollBodyContent: React.PropTypes.bool,
    actions: React.PropTypes.node,
    children: React.PropTypes.node,
    bodyStyle: React.PropTypes.object
  };

  static defaultProps = {
    inline: false,
    open: false,
    bodyStyle: {}
  };

  render() {
    if (this.props.inline) {
      const style = {
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: '100%',
        zIndex : 10,
        display: this.props.open ? 'block' : 'none'
      };
      const bodyStyle = Object.assign(this.props.bodyStyle, {
        overflow: this.props.autoScrollBodyContent ? 'auto' : 'visible',
        height: 'calc(100% - 120px)'
      });
      return (<Paper className={this.props.className} style={style} zDepth={0}><AppBar showMenuIconButton={false} iconElementRight={<IconButton onTouchTap={this.props.onRequestClose}><NavigationClose /></IconButton>} title={this.props.title}/><Paper zDepth={0} style={bodyStyle}>{this.props.children}</Paper><Toolbar><ToolbarGroup style={{width: '100%', justifyContent: 'flex-end'}}>{React.Children.toArray(this.props.actions)}</ToolbarGroup></Toolbar></Paper>);
    } else {
      return (<MuiDialog {...this.props} />);
    }
  }
}
