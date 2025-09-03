import * as React from 'react';
import { Routes, Route } from 'react-router-dom';
import CsvSearchForm from './searchform';

import { ICandidatesProps } from './ICandidatesProps';

const AppRouter: React.FC<ICandidatesProps> = ({ context }) => {
  return (
    <Routes>
      <Route path="/" element={<CsvSearchForm context={context} />} />
    </Routes>
  );
};

export default AppRouter;
