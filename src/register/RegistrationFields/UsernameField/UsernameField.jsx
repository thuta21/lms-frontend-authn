import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { useIntl } from '@edx/frontend-platform/i18n';
import PropTypes from 'prop-types';

import validateUsername from './validator';
import { FormGroup } from '../../../common-components';
import {
  clearRegistrationBackendError,
  clearUsernameSuggestions,
  fetchRealtimeValidations,
} from '../../data/actions';

/**
 * Username field wrapper. It accepts following handlers
 * - handleChange for setting value change and
 * - handleErrorChange for setting error
 *
 * It is responsible for
 * - Rendering username suggestions
 * - Setting and clearing username suggestions
 * - Performing username field validations
 * - clearing error on focus
 * - setting value on change
 */
const UsernameField = (props) => {
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();

  const {
    value,
    handleChange,
    handleErrorChange,
  } = props;

  const usernameSuggestions = useSelector(state => state.register.usernameSuggestions);
  const validationApiRateLimited = useSelector(state => state.register.validationApiRateLimited);

  /**
   * We need to remove the placeholder from the field, adding a space will do that.
   * This is needed because we are placing the username suggestions on top of the field.
   */
  useEffect(() => {
    if (usernameSuggestions.length && !value) {
      handleChange({ target: { name: 'username', value: ' ' } });
    }
  }, [handleChange, usernameSuggestions, value]);

  const handleOnBlur = (event) => {
    const { value: username } = event.target;
    const fieldError = validateUsername(username, formatMessage);
    if (fieldError) {
      handleErrorChange('username', fieldError);
    } else if (!validationApiRateLimited) {
      dispatch(fetchRealtimeValidations({ username }));
    }
  };

  const handleOnChange = (event) => {
    let username = event.target.value;
    if (username.length > 30) {
      return;
    }
    if (event.target.value.startsWith(' ')) {
      username = username.trim();
    }
    handleChange({ target: { name: 'username', value: username } });
  };

  const handleOnFocus = (event) => {
    const username = event.target.value;
    dispatch(clearUsernameSuggestions());
    // If we added a space character to username field to display the suggestion
    // remove it before user enters the input. This is to ensure user doesn't
    // have a space prefixed to the username.
    if (username === ' ') {
      handleChange({ target: { name: 'username', value: '' } });
    }
    handleErrorChange('username', '');
    dispatch(clearRegistrationBackendError('username'));
  };

  return (
    <FormGroup
      {...props}
      handleChange={handleOnChange}
      handleFocus={handleOnFocus}
      handleBlur={handleOnBlur}
    />
  );
};

UsernameField.defaultProps = {
  errorMessage: '',
  autoComplete: null,
};

UsernameField.propTypes = {
  handleChange: PropTypes.func.isRequired,
  handleErrorChange: PropTypes.func.isRequired,
  errorMessage: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  autoComplete: PropTypes.string,
};

export default UsernameField;
