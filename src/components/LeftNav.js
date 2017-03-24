import React from 'react';
import Drawer from 'material-ui/Drawer';
import {MenuItem, Menu, Tabs, Popover, AppBar}from 'material-ui';
// import NavigationArrowBack from 'material-ui/svg-icons/navigation/arrow-back';
import NavigationArrowDropDown from 'material-ui/svg-icons/navigation/arrow-drop-down';
import NavigationArrowBack from 'material-ui/svg-icons/navigation/arrow-back';
import IconButton from 'material-ui/IconButton';

/**
 * Drawer to use for left nav
 *
 * ```xml
 * <LeftNav  />
 * ```
 */
class LeftNav extends React.PureComponent {
    static propTypes = {
      /**
       * Override width of left nav
       */
      width: React.PropTypes.number,
      /**
       * Contents of the Drawer
       */
      children: React.PropTypes.node,
      /**
       * tab components to be added to Tabs
       */
      tabs: React.PropTypes.node,
      /**
       * If true drawer is opened
       */
      open: React.PropTypes.bool

    };
    constructor(props, context) {
      super(props);
    }
    componentWillMounnt(){
      if (this.props.tabs) {
        this.setState({menuText: this.props.tabs[0].props.label});
      }
    }
    static childContextTypes = {
      muiTheme: React.PropTypes.object.isRequired
    };
    state = {
      menuOpen: false
    };

    handleToggle = () => {
      this.setState({
        menuOpen: !this.state.open
      });
    };
    handleMenuTouchTap = (event) => {
      // This prevents ghost click.
      event.preventDefault();
      this.setState({
        menuOpen: true,
        anchorEl: event.currentTarget
      });
    };
    handleMenuRequestClose = () => {
      this.setState({
        menuOpen: false
      });
    };
    handleMenuChange = (event, value) => {
      this.setState({
        selectedIndex: value.props.value,
        menuOpen: false,
        menuText: value.props.primaryText
      });
    };
    static defaultProps = {
      open: true,
      menuOpen: false,
      width: 396
    };

    render() {
      const iconStyles = {
        color: '#fff'
      };
      var tabs;
      var noDisplayStyle = {
        display: 'none'
      };
      var menuItems;
      if (this.props.tabs) {
        tabs = (<Tabs children = { this.props.tabs } tabItemContainerStyle = { noDisplayStyle } inkBarStyle = { noDisplayStyle } value = { this.state.selectedIndex }
          />
        );
        menuItems = this.props.tabs.map(function(tab) {
          return (<MenuItem primaryText = { tab.props.label } value = { tab.props.value }/>);
        });
      }

      return (<Drawer width = { this.props.width } open = { this.props.open } >
        <AppBar title = { <span><span onTouchTap = { this.handleMenuTouchTap }> {this.state.menuText} <NavigationArrowDropDown style = { iconStyles }/></span>
          <Popover
              open = { this.state.menuOpen }
              anchorEl = { this.state.anchorEl }
              anchorOrigin = {{horizontal: 'left', vertical: 'bottom'}}
              targetOrigin = {{horizontal: 'left', vertical: 'top'}}
              onRequestClose = {this.handleMenuRequestClose} >
                  <Menu onItemTouchTap = { this.handleMenuChange } children={menuItems}/>
               </Popover></span>}
            iconElementLeft = { <IconButton> <NavigationArrowBack/> </IconButton>}
            iconClassNameRight = "muidocs-icon-navigation-expand-more" />
              { tabs }
              { this.props.children }
              </Drawer>
            );
    }
}

export default LeftNav;
