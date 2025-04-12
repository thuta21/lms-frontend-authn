import React, {
  useEffect, useMemo, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { getConfig } from '@edx/frontend-platform';
import { sendPageEvent, sendTrackEvent } from '@edx/frontend-platform/analytics';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Form, Spinner, StatefulButton } from '@openedx/paragon';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import Skeleton from 'react-loading-skeleton';

import ConfigurableRegistrationForm from './components/ConfigurableRegistrationForm';
import RegistrationFailure from './components/RegistrationFailure';
import {
  backupRegistrationFormBegin,
  clearRegistrationBackendError,
  registerNewUser,
  setEmailSuggestionInStore,
  setUserPipelineDataLoaded,
} from './data/actions';
import {
  FORM_SUBMISSION_ERROR,
  TPA_AUTHENTICATION_FAILURE,
} from './data/constants';
import getBackendValidations from './data/selectors';
import {
  isFormValid, prepareRegistrationPayload,
} from './data/utils';
import messages from './messages';
import { EmailField, NameField, UsernameField } from './RegistrationFields';
import {
  InstitutionLogistration,
  PasswordField,
  RedirectLogistration,
  ThirdPartyAuthAlert,
} from '../common-components';
import { getThirdPartyAuthContext as getRegistrationDataFromBackend } from '../common-components/data/actions';
import EnterpriseSSO from '../common-components/EnterpriseSSO';
import {
  COMPLETE_STATE, LOGIN_PAGE, PENDING_STATE, REGISTER_PAGE,
} from '../data/constants';
import {
  getAllPossibleQueryParams, getTpaHint, getTpaProvider, isHostAvailableInQueryParams, setCookie,
} from '../data/utils';

/**
 * Main Registration Page component
 */
const RegistrationPage = (props) => {
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();

  const registrationEmbedded = isHostAvailableInQueryParams();
  const platformName = getConfig().SITE_NAME;
  const flags = {
    showConfigurableEdxFields: getConfig().SHOW_CONFIGURABLE_EDX_FIELDS,
    showConfigurableRegistrationFields: getConfig().ENABLE_DYNAMIC_REGISTRATION_FIELDS,
    showMarketingEmailOptInCheckbox: getConfig().MARKETING_EMAILS_OPT_IN,
    autoGeneratedUsernameEnabled: getConfig().ENABLE_AUTO_GENERATED_USERNAME,
  };
  const {
    handleOnSelect,
    institutionLogin,
  } = props;

  const backedUpFormData = useSelector(state => state.register.registrationFormData);
  const registrationError = useSelector(state => state.register.registrationError);
  const registrationErrorCode = registrationError?.errorCode;
  const registrationResult = useSelector(state => state.register.registrationResult);
  const shouldBackupState = useSelector(state => state.register.shouldBackupState);
  const userPipelineDataLoaded = useSelector(state => state.register.userPipelineDataLoaded);
  const submitState = useSelector(state => state.register.submitState);

  const fieldDescriptions = useSelector(state => state.commonComponents.fieldDescriptions);
  const optionalFields = useSelector(state => state.commonComponents.optionalFields);
  const thirdPartyAuthApiStatus = useSelector(state => state.commonComponents.thirdPartyAuthApiStatus);
  const autoSubmitRegForm = useSelector(state => state.commonComponents.thirdPartyAuthContext.autoSubmitRegForm);
  const thirdPartyAuthErrorMessage = useSelector(state => state.commonComponents.thirdPartyAuthContext.errorMessage);
  const finishAuthUrl = useSelector(state => state.commonComponents.thirdPartyAuthContext.finishAuthUrl);
  const currentProvider = useSelector(state => state.commonComponents.thirdPartyAuthContext.currentProvider);
  const providers = useSelector(state => state.commonComponents.thirdPartyAuthContext.providers);
  const secondaryProviders = useSelector(state => state.commonComponents.thirdPartyAuthContext.secondaryProviders);
  const pipelineUserDetails = useSelector(state => state.commonComponents.thirdPartyAuthContext.pipelineUserDetails);

  const backendValidations = useSelector(getBackendValidations);
  const queryParams = useMemo(() => getAllPossibleQueryParams(), []);
  const tpaHint = useMemo(() => getTpaHint(), []);

  const [formFields, setFormFields] = useState({ ...backedUpFormData.formFields });
  const [configurableFormFields, setConfigurableFormFields] = useState({ ...backedUpFormData.configurableFormFields });
  const [errors, setErrors] = useState({ ...backedUpFormData.errors });
  const [errorCode, setErrorCode] = useState({
    type: '',
    count: 0,
  });
  const [formStartTime, setFormStartTime] = useState(null);
  // temporary error state for embedded experience because we don't want to show errors on blur
  const [temporaryErrors, setTemporaryErrors] = useState({ ...backedUpFormData.errors });

  const {
    cta,
    host,
  } = queryParams;
  const buttonLabel = cta
    ? formatMessage(messages['create.account.cta.button'], { label: cta })
    : formatMessage(messages['create.account.for.free.button']);

  /**
   * Set the userPipelineDetails data in formFields for only first time
   */
  useEffect(() => {
    if (!userPipelineDataLoaded && thirdPartyAuthApiStatus === COMPLETE_STATE) {
      if (thirdPartyAuthErrorMessage) {
        setErrorCode(prevState => ({
          type: TPA_AUTHENTICATION_FAILURE,
          count: prevState.count + 1,
        }));
      }
      if (pipelineUserDetails && Object.keys(pipelineUserDetails).length !== 0) {
        const {
          name = '',
          username = '',
          email = '',
        } = pipelineUserDetails;
        setFormFields(prevState => ({
          ...prevState,
          name,
          username,
          email,
        }));
        dispatch(setUserPipelineDataLoaded(true));
      }
    }
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    thirdPartyAuthApiStatus,
    thirdPartyAuthErrorMessage,
    pipelineUserDetails,
    userPipelineDataLoaded,
  ]);

  useEffect(() => {
    if (!formStartTime) {
      sendPageEvent('login_and_registration', 'register');
      const payload = {
        ...queryParams,
        is_register_page: true,
      };
      if (tpaHint) {
        payload.tpa_hint = tpaHint;
      }
      dispatch(getRegistrationDataFromBackend(payload));
      setFormStartTime(Date.now());
    }
  }, [dispatch, formStartTime, queryParams, tpaHint]);

  /**
   * Backup the registration form in redux when register page is toggled.
   */
  useEffect(() => {
    if (shouldBackupState) {
      dispatch(backupRegistrationFormBegin({
        ...backedUpFormData,
        configurableFormFields: { ...configurableFormFields },
        formFields: { ...formFields },
        errors: { ...errors },
      }));
    }
  }, [shouldBackupState, configurableFormFields, formFields, errors, dispatch, backedUpFormData]);

  useEffect(() => {
    if (backendValidations) {
      if (registrationEmbedded) {
        setTemporaryErrors(prevErrors => ({ ...prevErrors, ...backendValidations }));
      } else {
        setErrors(prevErrors => ({ ...prevErrors, ...backendValidations }));
      }
    }
  }, [backendValidations, registrationEmbedded]);

  useEffect(() => {
    if (registrationErrorCode) {
      setErrorCode(prevState => ({
        type: registrationErrorCode,
        count: prevState.count + 1,
      }));
    }
  }, [registrationErrorCode]);

  useEffect(() => {
    if (registrationResult.success) {
      // This event is used by GTM
      sendTrackEvent('edx.bi.user.account.registered.client', {});

      // This is used by the "User Retention Rate Event" on GTM
      setCookie(getConfig().USER_RETENTION_COOKIE_NAME, true);
    }
  }, [registrationResult]);

  const handleOnChange = (event) => {
    const { name } = event.target;
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    if (registrationError[name]) {
      dispatch(clearRegistrationBackendError(name));
    }
    setErrors(prevErrors => ({
      ...prevErrors,
      [name]: '',
    }));
    setFormFields(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleErrorChange = (fieldName, error) => {
    if (registrationEmbedded) {
      setTemporaryErrors(prevErrors => ({
        ...prevErrors,
        [fieldName]: error,
      }));
      if (error === '' && errors[fieldName] !== '') {
        setErrors(prevErrors => ({
          ...prevErrors,
          [fieldName]: error,
        }));
      }
    } else {
      setErrors(prevErrors => ({
        ...prevErrors,
        [fieldName]: error,
      }));
    }
  };

  const registerUser = () => {
    const totalRegistrationTime = (Date.now() - formStartTime) / 1000;
    let payload = { ...formFields };

    if (currentProvider) {
      delete payload.password;
      payload.social_auth_provider = currentProvider;
    }
    if (flags.autoGeneratedUsernameEnabled) {
      delete payload.username;
    }

    // Validating form data before submitting
    const {
      isValid,
      fieldErrors,
      emailSuggestion,
    } = isFormValid(
      payload,
      registrationEmbedded ? temporaryErrors : errors,
      configurableFormFields,
      fieldDescriptions,
      formatMessage,
    );
    setErrors({ ...fieldErrors });
    dispatch(setEmailSuggestionInStore(emailSuggestion));

    // returning if not valid
    if (!isValid) {
      setErrorCode(prevState => ({
        type: FORM_SUBMISSION_ERROR,
        count: prevState.count + 1,
      }));
      return;
    }

    // Preparing payload for submission
    payload = prepareRegistrationPayload(
      payload,
      configurableFormFields,
      flags.showMarketingEmailOptInCheckbox,
      totalRegistrationTime,
      queryParams);

    // making register call
    dispatch(registerNewUser(payload));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    registerUser();
  };

  useEffect(() => {
    if (autoSubmitRegForm && userPipelineDataLoaded) {
      registerUser();
    }
  }, [autoSubmitRegForm, userPipelineDataLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderForm = () => {
    if (institutionLogin) {
      return (
        <InstitutionLogistration
          secondaryProviders={secondaryProviders}
          headingTitle={formatMessage(messages['register.institution.login.page.title'])}
        />
      );
    }
    return (
      <>
        <div className="d-flex justify-content-center">
          <title
            className="d-inline font-weight-bold h1"
          >{formatMessage(messages['register.page.title'])}
          </title>
        </div>
        <RedirectLogistration
          host={host}
          authenticatedUser={registrationResult.authenticatedUser}
          success={registrationResult.success}
          redirectUrl={registrationResult.redirectUrl}
          finishAuthUrl={finishAuthUrl}
          optionalFields={optionalFields}
          registrationEmbedded={registrationEmbedded}
          redirectToProgressiveProfilingPage={
            getConfig().ENABLE_PROGRESSIVE_PROFILING_ON_AUTHN && !!Object.keys(optionalFields.fields).length
          }
        />
        {autoSubmitRegForm && !errorCode.type ? (
          <div className="mw-xs mt-5 text-center">
            <Spinner animation="border" variant="primary" id="tpa-spinner" />
          </div>
        ) : (
          <div
            className={classNames(
              'mw-xs mt-3',
              { 'w-100 m-auto pt-4 main-content': registrationEmbedded },
            )}
          >
            <ThirdPartyAuthAlert
              currentProvider={currentProvider}
              platformName={platformName}
              referrer={REGISTER_PAGE}
            />
            <RegistrationFailure
              errorCode={errorCode.type}
              failureCount={errorCode.count}
              context={{
                provider: currentProvider,
                errorMessage: thirdPartyAuthErrorMessage,
              }}
            />
            <Form id="registration-form" name="registration-form">
              <NameField
                name="name"
                value={formFields.name}
                shouldFetchUsernameSuggestions={!formFields.username.trim()}
                handleChange={handleOnChange}
                handleErrorChange={handleErrorChange}
                errorMessage={errors.name}
                helpText={[formatMessage(messages['help.text.name'])]}
                floatingLabel={formatMessage(messages['registration.fullname.label'])}
              />
              <EmailField
                name="email"
                value={formFields.email}
                confirmEmailValue={configurableFormFields?.confirm_email}
                handleErrorChange={handleErrorChange}
                handleChange={handleOnChange}
                errorMessage={errors.email}
                helpText={[formatMessage(messages['help.text.email'])]}
                floatingLabel={formatMessage(messages['registration.email.label'])}
              />
              {!flags.autoGeneratedUsernameEnabled && (
                <UsernameField
                  name="username"
                  spellCheck="false"
                  value={formFields.username}
                  handleChange={handleOnChange}
                  handleErrorChange={handleErrorChange}
                  errorMessage={errors.username}
                  helpText={[formatMessage(messages['help.text.username.1']), formatMessage(messages['help.text.username.2'])]}
                  floatingLabel={formatMessage(messages['registration.username.label'])}
                />
              )}
              {!currentProvider && (
                <PasswordField
                  name="password"
                  value={formFields.password}
                  handleChange={handleOnChange}
                  handleErrorChange={handleErrorChange}
                  errorMessage={errors.password}
                  floatingLabel={formatMessage(messages['registration.password.label'])}
                />
              )}
              <ConfigurableRegistrationForm
                email={formFields.email}
                fieldErrors={errors}
                formFields={configurableFormFields}
                setFieldErrors={registrationEmbedded ? setTemporaryErrors : setErrors}
                setFormFields={setConfigurableFormFields}
                autoSubmitRegisterForm={autoSubmitRegForm}
                fieldDescriptions={fieldDescriptions}
              />
              <StatefulButton
                id="register-user"
                name="register-user"
                type="submit"
                variant="brand"
                className="login-button"
                state={submitState}
                labels={{
                  default: buttonLabel,
                  pending: '',
                }}
                onClick={handleSubmit}
                onMouseDown={(e) => e.preventDefault()}
              />
            </Form>
            <div className="mt-3 d-flex align-items-center flex-column justify-content-center">
              <span className="tx-secondary">Don’t have an account?
                <button type="button" className="link-button" onClick={() => handleOnSelect(LOGIN_PAGE, REGISTER_PAGE)}>Log in</button>
              </span>
            </div>
            <div className="mt-5 d-flex align-items-center flex-column justify-content-center">
              <span className="tx-secondary">By continuing you agree to Medcenter’s</span>
              <button type="button" className="link-button">Terms and Privacy’s Policy</button>
            </div>
          </div>
        )}

      </>
    );
  };

  if (tpaHint) {
    if (thirdPartyAuthApiStatus === PENDING_STATE) {
      return <Skeleton height={36} />;
    }
    const {
      provider,
      skipHintedLogin,
    } = getTpaProvider(tpaHint, providers, secondaryProviders);
    if (skipHintedLogin) {
      window.location.href = getConfig().LMS_BASE_URL + provider.registerUrl;
      return null;
    }
    return provider ? <EnterpriseSSO provider={provider} /> : renderForm();
  }
  return (
    renderForm()
  );
};

RegistrationPage.propTypes = {
  institutionLogin: PropTypes.bool,
  // Actions
  handleOnSelect: PropTypes.func,
};

RegistrationPage.defaultProps = {
  handleOnSelect: null,
  institutionLogin: false,
};

export default RegistrationPage;
