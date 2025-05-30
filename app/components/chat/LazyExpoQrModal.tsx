import React, { lazy } from 'react';

// ExpoQrModal is a named export from its module.
const LazyLoadedExpoQrModal = lazy(() =>
  import('~/components/workbench/ExpoQrModal').then(module => ({ default: module.ExpoQrModal }))
);

export default LazyLoadedExpoQrModal;
