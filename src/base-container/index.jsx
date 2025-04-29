import React from 'react';

import { getConfig } from '@edx/frontend-platform';
import { Hyperlink, Image } from '@openedx/paragon';
import PropTypes from 'prop-types';

const BaseContainer = ({ children }) => (
  <div className="layout">
    <Hyperlink destination={getConfig().MARKETING_SITE_BASE_URL} className="col-md-12 py-5 px-4 pt-md-5 pb-md-2 px-md-6 pt-lg-5 pb-lg-2 px-lg-6">
      <Image className="company-logo" alt={getConfig().SITE_NAME} src={getConfig().LOGO_WHITE_URL} />
    </Hyperlink>
    <div className="d-flex ali justify-content-center align-items-lg-start align-items-md-center align-items-lg-center h-100">
      {children}
    </div>

  </div>
);

BaseContainer.propTypes = {
  children: PropTypes.node.isRequired,
};

export default BaseContainer;
