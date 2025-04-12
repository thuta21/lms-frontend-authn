import React from 'react';

import { getConfig } from '@edx/frontend-platform';
import { Image } from '@openedx/paragon';
import PropTypes from 'prop-types';

const BaseContainer = ({ children }) => (
  <>
    <div className="layout">
      <div className="col-md-12 py-4.5 px-6">
        <Image className="company-logo" alt={getConfig().SITE_NAME} src={getConfig().LOGO_WHITE_URL} />
      </div>
      <div className="d-flex justify-content-center align-items-center h-100">
        {children}
      </div>
    </div>
  </>
);

BaseContainer.propTypes = {
  children: PropTypes.node.isRequired,
};

export default BaseContainer;
