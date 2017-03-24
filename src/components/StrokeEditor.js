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
import Paper from 'material-ui/Paper';
import ColorPicker from './ColorPicker'
import {ListItem} from 'material-ui/List';
import Checkbox from 'material-ui/Checkbox';
import classNames from 'classnames';
import {intlShape, defineMessages, injectIntl} from 'react-intl';
import TextField from 'material-ui/TextField';

const messages = defineMessages({
  strokewidthlabel: {
    id: 'strokeeditor.strokewidthlabel',
    description: 'Label for the stroke width input',
    defaultMessage: 'Stroke width'
  },
  strokelabel: {
    id: 'strokeeditor.strokelabel',
    description: 'Label for stroke color picker',
    defaultMessage: 'Stroke'
  }
});

/**
 * Style editor for stroke properties (color and width).
 *
 * ```xml
 * <StrokeEditor onChange={this.props.onChange} initialStrokeColor={this.props.initialState.strokeColor} initialStrokeWidth={5} />
 * ```
 */
class StrokeEditor extends React.PureComponent {
  static propTypes = {
    /**
     * Callback that is called when a change is made.
     */
    onChange: React.PropTypes.func.isRequired,
    /**
     * Css class name to apply on the root element of this component.
     */
    className: React.PropTypes.string,
    /*
     * If true, the element will not be clickable and will not display hover effects.
     */
    disabled: React.PropTypes.bool,
    /**
     * Initial value for hasStroke.
     */
    initialHasStroke: React.PropTypes.bool,
    /**
     * Initial stroke color.
     */
    initialStrokeColor: React.PropTypes.object,
    /**
     * Initial stroke width.
     */
    initialStrokeWidth: React.PropTypes.number,
    /**
     * @ignore
     */
    intl: intlShape.isRequired
  };

  static childContextTypes = {
    muiTheme: React.PropTypes.object.isRequired
  };

  static defaultProps = {
    disabled: false,
    initialStrokeColor: {
      rgb: {
        r: 0,
        g: 0,
        b: 0,
        a: 1
      },
      hex: '#000000'
    },
    initialHasStroke: true,
    initialStrokeWidth: 1
  };

  constructor(props) {
    super(props);
    this.state = {
      strokeColor: this.props.initialStrokeColor,
      strokeWidth: this.props.initialStrokeWidth,
      hasStroke: this.props.initialHasStroke
    };
  }
  componentWillMount() {
    this.props.onChange(this.state);
  }
  _onChangeStrokeWidth(evt) {
    this.setState({strokeWidth: parseFloat(evt.target.value)}, function() {
      this.props.onChange(this.state);
    });
  }
  _onChangeStroke(color) {
    this.setState({strokeColor: color}, function() {
      this.props.onChange(this.state);
    });
  }
  _onStrokeCheck(evt) {
    this.setState({hasStroke: evt.target.checked}, function() {
      this.props.onChange(this.state);
    });
  }
  render() {
    const {formatMessage} = this.props.intl;
    const listStyle = {
      padding: '0px 16px',
      marginLeft: 0
    };
    const boxStyle = {
      marginLeft: 0
    };
    return (
      <Paper zDepth={0} className={classNames('sdk-component stroke-editor', this.props.className)}>
        <ListItem disabled={this.props.disabled} innerDivStyle={ boxStyle } primaryText={<Checkbox onCheck={this._onStrokeCheck.bind(this)} checked={this.state.hasStroke} label={formatMessage(messages.strokelabel)} />} rightIconButton={ <ColorPicker onChange={this._onChangeStroke.bind(this)} initialColor={this.state.strokeColor} /> } />
        <ListItem disabled={this.props.disabled} innerDivStyle={ listStyle }>
          <TextField defaultValue={this.state.strokeWidth} onChange={this._onChangeStrokeWidth.bind(this)} hintText={formatMessage(messages.strokewidthlabel)} floatingLabelText={formatMessage(messages.strokewidthlabel)} floatingLabelFixed={true} fullWidth={true} />
        </ListItem>
      </Paper>
    );
  }
}

export default injectIntl(StrokeEditor);
