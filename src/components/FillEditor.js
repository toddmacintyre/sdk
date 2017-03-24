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
import classNames from 'classnames';
import ColorPicker from './ColorPicker';
import {ListItem} from 'material-ui/List';
import Checkbox from 'material-ui/Checkbox';
import {intlShape, defineMessages, injectIntl} from 'react-intl';

const messages = defineMessages({
  filllabel: {
    id: 'filleditor.filllabel',
    description: 'Label for fill color picker',
    defaultMessage: 'Fill'
  }
});

/**
 * Style editor for fill color.
 *
 * ```xml
 * <FillEditor onChange={this._onChange.bind(this)} initialFillColor={{rgb: {r: 0, g: 255, b: 0, a: 0.5}, hex: '#00FF00'}}/>
 * ```
 */
class FillEditor extends React.PureComponent {
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
     * Initial fill color.
     */
    initialFillColor: React.PropTypes.object,
    /**
     * Initial value for hasFill.
     */
    initialHasFill: React.PropTypes.bool,
    /**
     * @ignore
     */
    intl: intlShape.isRequired
  };

  static defaultProps = {
    disabled: false,
    initialFillColor: {
      rgb: {
        r: 255,
        g: 0,
        b: 0,
        a: 0.5
      },
      hex: '#FF0000'
    },
    initialHasFill: true
  };

  constructor(props) {
    super(props);
    this.state = {
      fillColor: this.props.initialFillColor,
      hasFill: this.props.initialHasFill
    };
  }
  componentWillMount() {
    this.props.onChange(this.state);
  }
  _onChangeFill(color) {
    this.setState({fillColor: color});
    this.props.onChange(this.state);
  }
  _onFillCheck(evt) {
    this.setState({hasFill: evt.target.checked}, function() {
      this.props.onChange(this.state);
    });
  }
  render() {
    const boxStyle = {
      marginLeft: 0
    };
    const {formatMessage} = this.props.intl;
    return (
      <Paper zDepth={0} className={classNames('sdk-component fill-editor', this.props.className)}>
        <ListItem disabled={this.props.disabled} innerDivStyle={ boxStyle } primaryText={<Checkbox onCheck={this._onFillCheck.bind(this)} checked={this.state.hasFill} label={formatMessage(messages.filllabel)} />} rightIconButton={ <ColorPicker onChange={this._onChangeFill.bind(this)} initialColor={this.state.fillColor} /> } />
      </Paper>
    );
  }
}

export default injectIntl(FillEditor);
