import React, { Component } from "react";
import PropTypes from "prop-types";

class PgnInput extends Component<{ onSubmit: (string) => void }> {
  state = {
    value: "",
  };

  static propTypes = { onSubmit: PropTypes.func };

  handleChange(event) {
    this.setState({ value: event.target.value });
  }

  onSubmit() {
    this.props.onSubmit(this.state.value);
  }

  render() {
    return (
      <div>
        <label>
          Name:
          <input
            type="text"
            value={this.state.value}
            onChange={this.handleChange.bind(this)}
          />
        </label>
        <button type="submit" value="Submit" onClick={this.onSubmit.bind(this)}>
          Submit
        </button>
      </div>
    );
  }
}

export default PgnInput;
