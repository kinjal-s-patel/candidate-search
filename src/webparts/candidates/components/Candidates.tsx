import * as React from "react";
import { HashRouter as Router } from "react-router-dom";
import AppRouter from "./Approuter"; // ensure exact filename case
import { ICandidatesProps } from "./ICandidatesProps";

const Home: React.FC<ICandidatesProps> = (props) => {
  return (
    <Router>
      <AppRouter
        context={props.context}
        description={props.description}
        isDarkTheme={props.isDarkTheme}
        environmentMessage={props.environmentMessage}
        hasTeamsContext={props.hasTeamsContext}
        userDisplayName={props.userDisplayName}
      />
    </Router>
  );
};

export default Home;
